// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@pythnetwork/IPyth.sol";
import "@pythnetwork/PythStructs.sol";

/**
 * @title PancakePredictionV2Pyth
 * @notice Prediction market using Pyth Network oracle with Chainlink Time-Based Automation
 */
contract PancakePredictionV2Pyth is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IPyth public pyth;
    bytes32 public priceId; // Pyth price feed ID for ETH/USD

    bool public genesisLockOnce = false;
    bool public genesisStartOnce = false;

    address public adminAddress;
    address public operatorAddress;

    uint256 public bufferSeconds;
    uint256 public intervalSeconds;

    uint256 public minBetAmount;
    uint256 public treasuryFee;
    uint256 public treasuryAmount;

    uint256 public currentEpoch;

    uint256 public oracleLatestTimestamp; // Track last oracle update time (Pyth publishTime)
    uint256 public oracleUpdateAllowance; // Max seconds for oracle staleness

    uint256 public constant MAX_TREASURY_FEE = 1000; // 10%

    mapping(uint256 => mapping(address => BetInfo)) public ledger;
    mapping(uint256 => Round) public rounds;
    mapping(address => uint256[]) public userRounds;

    enum Position {
        Bull,
        Bear
    }

    struct Round {
        uint256 epoch;
        uint256 startTimestamp;
        uint256 lockTimestamp;
        uint256 closeTimestamp;
        int256 lockPrice;
        int256 closePrice;
        uint256 lockOracleTimestamp;   // Pyth publishTime at lock
        uint256 closeOracleTimestamp;  // Pyth publishTime at close
        uint256 totalAmount;
        uint256 bullAmount;
        uint256 bearAmount;
        uint256 rewardBaseCalAmount;
        uint256 rewardAmount;
        bool oracleCalled;
    }

    struct BetInfo {
        Position position;
        uint256 amount;
        bool claimed;
    }

    event BetBear(address indexed sender, uint256 indexed epoch, uint256 amount);
    event BetBull(address indexed sender, uint256 indexed epoch, uint256 amount);
    event Claim(address indexed sender, uint256 indexed epoch, uint256 amount);
    event EndRound(uint256 indexed epoch, uint256 indexed oracleTimestamp, int256 price);
    event LockRound(uint256 indexed epoch, uint256 indexed oracleTimestamp, int256 price);
    event NewAdminAddress(address admin);
    event NewBufferAndIntervalSeconds(uint256 bufferSeconds, uint256 intervalSeconds);
    event NewMinBetAmount(uint256 indexed epoch, uint256 minBetAmount);
    event NewTreasuryFee(uint256 indexed epoch, uint256 treasuryFee);
    event NewOperatorAddress(address operator);
    event NewPythOracle(address pyth);
    event NewPriceId(bytes32 priceId);
    event NewOracleUpdateAllowance(uint256 oracleUpdateAllowance);
    event Pause(uint256 indexed epoch);
    event RewardsCalculated(
        uint256 indexed epoch,
        uint256 rewardBaseCalAmount,
        uint256 rewardAmount,
        uint256 treasuryAmount
    );
    event StartRound(uint256 indexed epoch);
    event TokenRecovery(address indexed token, uint256 amount);
    event TreasuryClaim(uint256 amount);
    event Unpause(uint256 indexed epoch);

    modifier onlyAdmin() {
        require(msg.sender == adminAddress, "Not admin");
        _;
    }

    modifier onlyAdminOrOperator() {
        require(msg.sender == adminAddress || msg.sender == operatorAddress, "Not operator/admin");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operatorAddress, "Not operator");
        _;
    }

    modifier notContract() {
        require(!_isContract(msg.sender), "Contract not allowed");
        require(msg.sender == tx.origin, "Proxy contract not allowed");
        _;
    }

    /**
     * @notice Constructor
     * @param _pythContract: Pyth oracle contract address
     * @param _priceId: Pyth price feed ID
     * @param _adminAddress: admin address
     * @param _operatorAddress: operator address
     * @param _intervalSeconds: interval in seconds between rounds
     * @param _bufferSeconds: buffer seconds for valid execution
     * @param _minBetAmount: minimum bet amount (in wei)
     * @param _oracleUpdateAllowance: oracle update allowance in seconds
     * @param _treasuryFee: treasury fee (e.g., 300 = 3%)
     */
    constructor(
        address _pythContract,
        bytes32 _priceId,
        address _adminAddress,
        address _operatorAddress,
        uint256 _intervalSeconds,
        uint256 _bufferSeconds,
        uint256 _minBetAmount,
        uint256 _oracleUpdateAllowance,
        uint256 _treasuryFee
    ) Ownable(_adminAddress) {
        require(_treasuryFee <= MAX_TREASURY_FEE, "Treasury fee too high");

        pyth = IPyth(_pythContract);
        priceId = _priceId;
        adminAddress = _adminAddress;
        operatorAddress = _operatorAddress;
        intervalSeconds = _intervalSeconds;
        bufferSeconds = _bufferSeconds;
        minBetAmount = _minBetAmount;
        oracleUpdateAllowance = _oracleUpdateAllowance;
        treasuryFee = _treasuryFee;
    }

    /**
     * @notice Bet bear position
     * @param epoch: epoch
     */
    function betBear(uint256 epoch) external payable whenNotPaused nonReentrant notContract {
        require(epoch == currentEpoch, "Bet is too early/late");
        require(_bettable(epoch), "Round not bettable");
        require(msg.value >= minBetAmount, "Bet amount must be greater than minBetAmount");
        require(ledger[epoch][msg.sender].amount == 0, "Can only bet once per round");

        uint256 amount = msg.value;
        Round storage round = rounds[epoch];
        round.totalAmount = round.totalAmount + amount;
        round.bearAmount = round.bearAmount + amount;

        BetInfo storage betInfo = ledger[epoch][msg.sender];
        betInfo.position = Position.Bear;
        betInfo.amount = amount;
        userRounds[msg.sender].push(epoch);

        emit BetBear(msg.sender, epoch, amount);
    }

    /**
     * @notice Bet bull position
     * @param epoch: epoch
     */
    function betBull(uint256 epoch) external payable whenNotPaused nonReentrant notContract {
        require(epoch == currentEpoch, "Bet is too early/late");
        require(_bettable(epoch), "Round not bettable");
        require(msg.value >= minBetAmount, "Bet amount must be greater than minBetAmount");
        require(ledger[epoch][msg.sender].amount == 0, "Can only bet once per round");

        uint256 amount = msg.value;
        Round storage round = rounds[epoch];
        round.totalAmount = round.totalAmount + amount;
        round.bullAmount = round.bullAmount + amount;

        BetInfo storage betInfo = ledger[epoch][msg.sender];
        betInfo.position = Position.Bull;
        betInfo.amount = amount;
        userRounds[msg.sender].push(epoch);

        emit BetBull(msg.sender, epoch, amount);
    }

    /**
     * @notice Claim rewards for an array of epochs
     * @param epochs: array of epochs
     */
    function claim(uint256[] calldata epochs) external nonReentrant notContract {
        uint256 reward;

        for (uint256 i = 0; i < epochs.length; i++) {
            require(rounds[epochs[i]].startTimestamp != 0, "Round has not started");
            require(block.timestamp > rounds[epochs[i]].closeTimestamp, "Round has not ended");

            uint256 addedReward = 0;

            if (rounds[epochs[i]].oracleCalled) {
                require(claimable(epochs[i], msg.sender), "Not eligible for claim");
                Round memory round = rounds[epochs[i]];
                addedReward = (ledger[epochs[i]][msg.sender].amount * round.rewardAmount) / round.rewardBaseCalAmount;
            } else {
                require(refundable(epochs[i], msg.sender), "Not eligible for refund");
                addedReward = ledger[epochs[i]][msg.sender].amount;
            }

            ledger[epochs[i]][msg.sender].claimed = true;
            reward += addedReward;

            emit Claim(msg.sender, epochs[i], addedReward);
        }

        if (reward > 0) {
            _safeTransferETH(address(msg.sender), reward);
        }
    }

    /**
     * @notice Start the next round n, lock price for round n-1, end round n-2
     * @dev Callable by operator (manual backup)
     */
    function executeRound() external whenNotPaused onlyOperator {
        require(
            genesisStartOnce && genesisLockOnce,
            "Can only run after genesisStartRound and genesisLockRound is triggered"
        );

        (uint256 currentOracleTimestamp, int256 currentPrice) = _getPriceFromPyth();

        oracleLatestTimestamp = currentOracleTimestamp;

        // CurrentEpoch refers to previous round (n-1)
        _safeLockRound(currentEpoch, currentOracleTimestamp, currentPrice);
        _safeEndRound(currentEpoch - 1, currentOracleTimestamp, currentPrice);
        _calculateRewards(currentEpoch - 1);

        // Increment currentEpoch to current round (n)
        currentEpoch = currentEpoch + 1;
        _safeStartRound(currentEpoch);
    }

    /**
     * @notice Lock genesis round
     * @dev Callable by operator
     */
    function genesisLockRound() external whenNotPaused onlyOperator {
        require(genesisStartOnce, "Can only run after genesisStartRound is triggered");
        require(!genesisLockOnce, "Can only run genesisLockRound once");

        (uint256 currentOracleTimestamp, int256 currentPrice) = _getPriceFromPyth();

        oracleLatestTimestamp = currentOracleTimestamp;

        _safeLockRound(currentEpoch, currentOracleTimestamp, currentPrice);

        currentEpoch = currentEpoch + 1;
        _startRound(currentEpoch);
        genesisLockOnce = true;
    }

    /**
     * @notice Start genesis round
     * @dev Callable by operator
     */
    function genesisStartRound() external whenNotPaused onlyOperator {
        require(!genesisStartOnce, "Can only run genesisStartRound once");

        currentEpoch = currentEpoch + 1;
        _startRound(currentEpoch);
        genesisStartOnce = true;
    }

    /**
     * @notice Pause contract
     * @dev Callable by admin or operator
     */
    function pause() external whenNotPaused onlyAdminOrOperator {
        _pause();

        emit Pause(currentEpoch);
    }

    /**
     * @notice Claim all rewards in treasury
     * @dev Callable by admin
     */
    function claimTreasury() external nonReentrant onlyAdmin {
        uint256 currentTreasuryAmount = treasuryAmount;
        treasuryAmount = 0;
        _safeTransferETH(adminAddress, currentTreasuryAmount);

        emit TreasuryClaim(currentTreasuryAmount);
    }

    /**
     * @notice Unpause contract
     * @dev Callable by admin. Reset genesis state once paused.
     */
    function unpause() external whenPaused onlyAdmin {
        genesisStartOnce = false;
        genesisLockOnce = false;
        _unpause();

        emit Unpause(currentEpoch);
    }

    /**
     * @notice Chainlink Time-Based Automation perform upkeep
     * @dev Called by Chainlink Automation on CRON schedule (e.g., every minute)
     * Automatically handles genesis rounds if not completed
     */
    function performUpkeep(bytes calldata /* performData */) external {
        require(!paused(), "Contract is paused");

        // Handle genesis rounds automatically
        if (!genesisStartOnce) {
            // First execution: Start genesis
            currentEpoch = currentEpoch + 1;
            _startRound(currentEpoch);
            genesisStartOnce = true;
            return;
        }

        if (!genesisLockOnce) {
            // Second execution: Lock genesis
            require(block.timestamp >= rounds[currentEpoch].lockTimestamp, "Too early for genesis lock");
            require(block.timestamp <= rounds[currentEpoch].lockTimestamp + bufferSeconds, "Too late for genesis lock");

            (uint256 oracleTimestamp, int256 price) = _getPriceFromPyth();
            oracleLatestTimestamp = oracleTimestamp;

            _safeLockRound(currentEpoch, oracleTimestamp, price);

            currentEpoch = currentEpoch + 1;
            _startRound(currentEpoch);
            genesisLockOnce = true;
            return;
        }

        // Normal execution: Both genesis rounds completed
        require(currentEpoch > 0, "No active epoch");
        require(block.timestamp >= rounds[currentEpoch].closeTimestamp, "Too early to execute");

        (uint256 currentOracleTimestamp, int256 currentPrice) = _getPriceFromPyth();
        oracleLatestTimestamp = currentOracleTimestamp;

        // Execute the round logic
        _safeLockRound(currentEpoch, currentOracleTimestamp, currentPrice);
        _safeEndRound(currentEpoch - 1, currentOracleTimestamp, currentPrice);
        _calculateRewards(currentEpoch - 1);

        // Increment currentEpoch to current round (n)
        currentEpoch = currentEpoch + 1;
        _safeStartRound(currentEpoch);
    }

    /**
     * @notice Set buffer and interval (in seconds)
     * @dev Callable by admin
     */
    function setBufferAndIntervalSeconds(uint256 _bufferSeconds, uint256 _intervalSeconds)
        external
        whenPaused
        onlyAdmin
    {
        require(_bufferSeconds < _intervalSeconds, "bufferSeconds must be inferior to intervalSeconds");
        bufferSeconds = _bufferSeconds;
        intervalSeconds = _intervalSeconds;

        emit NewBufferAndIntervalSeconds(_bufferSeconds, _intervalSeconds);
    }

    /**
     * @notice Set minimum bet amount
     * @dev Callable by admin
     */
    function setMinBetAmount(uint256 _minBetAmount) external whenPaused onlyAdmin {
        require(_minBetAmount != 0, "Must be superior to 0");
        minBetAmount = _minBetAmount;

        emit NewMinBetAmount(currentEpoch, _minBetAmount);
    }

    /**
     * @notice Set operator address
     * @dev Callable by admin
     */
    function setOperator(address _operatorAddress) external onlyAdmin {
        require(_operatorAddress != address(0), "Cannot be zero address");
        operatorAddress = _operatorAddress;

        emit NewOperatorAddress(_operatorAddress);
    }

    /**
     * @notice Set Pyth oracle address
     * @dev Callable by admin
     */
    function setPyth(address _pyth) external whenPaused onlyAdmin {
        require(_pyth != address(0), "Cannot be zero address");
        oracleLatestTimestamp = 0; // Reset oracle tracking
        pyth = IPyth(_pyth);

        emit NewPythOracle(_pyth);
    }

    /**
     * @notice Set Pyth price feed ID
     * @dev Callable by admin
     */
    function setPriceId(bytes32 _priceId) external whenPaused onlyAdmin {
        require(_priceId != bytes32(0), "Cannot be zero");
        oracleLatestTimestamp = 0; // Reset oracle tracking
        priceId = _priceId;

        emit NewPriceId(_priceId);
    }

    /**
     * @notice Set oracle update allowance (max staleness in seconds)
     * @dev Callable by admin
     */
    function setOracleUpdateAllowance(uint256 _oracleUpdateAllowance) external whenPaused onlyAdmin {
        oracleUpdateAllowance = _oracleUpdateAllowance;

        emit NewOracleUpdateAllowance(_oracleUpdateAllowance);
    }

    /**
     * @notice Set treasury fee
     * @dev Callable by admin
     */
    function setTreasuryFee(uint256 _treasuryFee) external whenPaused onlyAdmin {
        require(_treasuryFee <= MAX_TREASURY_FEE, "Treasury fee too high");
        treasuryFee = _treasuryFee;

        emit NewTreasuryFee(currentEpoch, _treasuryFee);
    }

    /**
     * @notice Set admin address
     * @dev Callable by owner
     */
    function setAdmin(address _adminAddress) external onlyOwner {
        require(_adminAddress != address(0), "Cannot be zero address");
        adminAddress = _adminAddress;

        emit NewAdminAddress(_adminAddress);
    }

    /**
     * @notice Recover tokens sent to contract by mistake
     * @dev Cannot recover native ETH (used for bets). Only ERC20 tokens.
     * @param _token: token address
     * @param _amount: token amount
     */
    function recoverToken(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(msg.sender, _amount);

        emit TokenRecovery(_token, _amount);
    }

    /**
     * @notice Get user rounds and bet information
     * @param user: user address
     * @param cursor: cursor position
     * @param size: number of rounds to return
     */
    function getUserRounds(
        address user,
        uint256 cursor,
        uint256 size
    )
        external
        view
        returns (
            uint256[] memory,
            BetInfo[] memory,
            uint256
        )
    {
        uint256 length = size;

        if (length > userRounds[user].length - cursor) {
            length = userRounds[user].length - cursor;
        }

        uint256[] memory values = new uint256[](length);
        BetInfo[] memory betInfo = new BetInfo[](length);

        for (uint256 i = 0; i < length; i++) {
            values[i] = userRounds[user][cursor + i];
            betInfo[i] = ledger[values[i]][user];
        }

        return (values, betInfo, cursor + length);
    }

    /**
     * @notice Get user rounds length
     * @param user: user address
     */
    function getUserRoundsLength(address user) external view returns (uint256) {
        return userRounds[user].length;
    }

    /**
     * @notice Check if user is eligible to claim for an epoch
     * @param epoch: epoch
     * @param user: user address
     */
    function claimable(uint256 epoch, address user) public view returns (bool) {
        BetInfo memory betInfo = ledger[epoch][user];
        Round memory round = rounds[epoch];
        if (round.lockPrice == round.closePrice) {
            return false;
        }
        return
            round.oracleCalled &&
            betInfo.amount != 0 &&
            !betInfo.claimed &&
            ((round.closePrice > round.lockPrice && betInfo.position == Position.Bull) ||
                (round.closePrice < round.lockPrice && betInfo.position == Position.Bear));
    }

    /**
     * @notice Check if user is eligible for refund for an epoch
     * @param epoch: epoch
     * @param user: user address
     */
    function refundable(uint256 epoch, address user) public view returns (bool) {
        BetInfo memory betInfo = ledger[epoch][user];
        Round memory round = rounds[epoch];
        return
            !round.oracleCalled &&
            !betInfo.claimed &&
            block.timestamp > round.closeTimestamp + bufferSeconds &&
            betInfo.amount != 0;
    }

    /**
     * @notice Calculate rewards for round
     * @param epoch: epoch
     */
    function _calculateRewards(uint256 epoch) internal {
        require(rounds[epoch].rewardBaseCalAmount == 0 && rounds[epoch].rewardAmount == 0, "Rewards calculated");
        Round storage round = rounds[epoch];
        uint256 rewardBaseCalAmount;
        uint256 treasuryAmt;
        uint256 rewardAmount;

        // Bull wins
        if (round.closePrice > round.lockPrice) {
            rewardBaseCalAmount = round.bullAmount;
            treasuryAmt = (round.totalAmount * treasuryFee) / 10000;
            rewardAmount = round.totalAmount - treasuryAmt;
        }
        // Bear wins
        else if (round.closePrice < round.lockPrice) {
            rewardBaseCalAmount = round.bearAmount;
            treasuryAmt = (round.totalAmount * treasuryFee) / 10000;
            rewardAmount = round.totalAmount - treasuryAmt;
        }
        // House wins (tie)
        else {
            rewardBaseCalAmount = 0;
            rewardAmount = 0;
            treasuryAmt = round.totalAmount;
        }
        round.rewardBaseCalAmount = rewardBaseCalAmount;
        round.rewardAmount = rewardAmount;

        treasuryAmount += treasuryAmt;

        emit RewardsCalculated(epoch, rewardBaseCalAmount, rewardAmount, treasuryAmt);
    }

    /**
     * @notice End round
     * @param epoch: epoch
     * @param oracleTimestamp: Pyth publishTime
     * @param price: price
     */
    function _safeEndRound(
        uint256 epoch,
        uint256 oracleTimestamp,
        int256 price
    ) internal {
        require(rounds[epoch].lockTimestamp != 0, "Can only end round after round has locked");
        require(block.timestamp >= rounds[epoch].closeTimestamp, "Can only end round after closeTimestamp");
        require(
            block.timestamp <= rounds[epoch].closeTimestamp + bufferSeconds,
            "Can only end round within bufferSeconds"
        );
        Round storage round = rounds[epoch];
        round.closePrice = price;
        round.closeOracleTimestamp = oracleTimestamp;
        round.oracleCalled = true;

        emit EndRound(epoch, oracleTimestamp, price);
    }

    /**
     * @notice Lock round
     * @param epoch: epoch
     * @param oracleTimestamp: Pyth publishTime
     * @param price: price
     */
    function _safeLockRound(
        uint256 epoch,
        uint256 oracleTimestamp,
        int256 price
    ) internal {
        require(rounds[epoch].startTimestamp != 0, "Can only lock round after round has started");
        require(block.timestamp >= rounds[epoch].lockTimestamp, "Can only lock round after lockTimestamp");
        require(
            block.timestamp <= rounds[epoch].lockTimestamp + bufferSeconds,
            "Can only lock round within bufferSeconds"
        );
        Round storage round = rounds[epoch];
        round.closeTimestamp = block.timestamp + intervalSeconds;
        round.lockPrice = price;
        round.lockOracleTimestamp = oracleTimestamp;

        emit LockRound(epoch, oracleTimestamp, price);
    }

    /**
     * @notice Start round (with validation)
     * @param epoch: epoch
     */
    function _safeStartRound(uint256 epoch) internal {
        require(genesisStartOnce, "Can only run after genesisStartRound is triggered");
        require(rounds[epoch - 2].closeTimestamp != 0, "Can only start round after round n-2 has ended");
        require(
            block.timestamp >= rounds[epoch - 2].closeTimestamp,
            "Can only start new round after round n-2 closeTimestamp"
        );
        _startRound(epoch);
    }

    /**
     * @notice Start round
     * @param epoch: epoch
     */
    function _startRound(uint256 epoch) internal {
        Round storage round = rounds[epoch];
        round.startTimestamp = block.timestamp;
        round.lockTimestamp = block.timestamp + intervalSeconds;
        round.closeTimestamp = block.timestamp + (2 * intervalSeconds);
        round.epoch = epoch;
        round.totalAmount = 0;

        emit StartRound(epoch);
    }

    /**
     * @notice Transfer ETH safely
     * @param to: recipient address
     * @param value: amount to transfer
     */
    function _safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}("");
        require(success, "TransferHelper: ETH_TRANSFER_FAILED");
    }

    /**
     * @notice Check if round is bettable
     * @param epoch: epoch
     */
    function _bettable(uint256 epoch) internal view returns (bool) {
        return
            rounds[epoch].startTimestamp != 0 &&
            rounds[epoch].lockTimestamp != 0 &&
            block.timestamp > rounds[epoch].startTimestamp &&
            block.timestamp < rounds[epoch].lockTimestamp;
    }

    /**
     * @notice Get latest price from Pyth oracle with validation
     * @return oracleTimestamp Pyth publishTime
     * @return price Normalized price (8 decimals)
     */
    function _getPriceFromPyth() internal view returns (uint256, int256) {
        PythStructs.Price memory pythPrice = pyth.getPriceUnsafe(priceId);

        // Validate price is fresh (not too far in the future)
        require(
            pythPrice.publishTime <= block.timestamp + oracleUpdateAllowance,
            "Oracle update exceeded max timestamp allowance"
        );

        // Validate price is newer than last used price (prevents replay)
        require(
            pythPrice.publishTime > oracleLatestTimestamp,
            "Oracle update timestamp must be larger than oracleLatestTimestamp"
        );

        // Convert Pyth price to 8 decimals (same as Chainlink)
        // Pyth price has expo which is negative, e.g., price=200000000000, expo=-8 means $2000.00000000
        int256 price = int256(pythPrice.price);
        int32 expo = pythPrice.expo;

        // Normalize to 8 decimals
        if (expo > -8) {
            // If expo is, for example, -6, multiply by 10^2 to get to 8 decimals
            price = price * int256(10 ** uint32(int32(-8) - expo));
        } else if (expo < -8) {
            // If expo is, for example, -10, divide by 10^2 to get to 8 decimals
            price = price / int256(10 ** uint32(expo - int32(-8)));
        }

        require(price > 0, "Invalid price from Pyth");

        return (pythPrice.publishTime, price);
    }

    /**
     * @notice Check if address is a contract
     * @param account: address to check
     */
    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    receive() external payable {}
}

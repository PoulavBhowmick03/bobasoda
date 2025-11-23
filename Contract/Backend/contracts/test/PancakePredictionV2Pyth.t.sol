// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/contracts/PancakePredictionV2Pyth.sol";
import {MockPyth} from "@pythnetwork/MockPyth.sol";

/**
 * @title PancakePredictionV2PythTest
 * @notice Comprehensive test suite for PancakePredictionV2Pyth based on PancakeSwap v3 tests
 * @dev Tests adapted for Native ETH betting and Pyth oracle
 */
contract PancakePredictionV2PythTest is Test {
    PancakePredictionV2Pyth public prediction;
    MockPyth public pythOracle;

    // Test constants
    bytes32 public constant PRICE_ID = bytes32(uint256(1));
    uint256 public constant INTERVAL_SECONDS = 20;
    uint256 public constant BUFFER_SECONDS = 5;
    uint256 public constant MIN_BET_AMOUNT = 0.001 ether;
    uint256 public constant ORACLE_UPDATE_ALLOWANCE = 300;
    uint256 public constant TREASURY_FEE = 1000; // 10%
    int64 public constant INITIAL_PRICE = 100e8;

    int32 public constant PRICE_EXPO = -8;
    uint64 public constant PRICE_CONF = 10;

    // Test accounts
    address public owner;
    address public admin;
    address public operator;
    address public bullUser1;
    address public bullUser2;
    address public bearUser1;
    address public bearUser2;

    function setUp() public {
        // Setup test accounts
        owner = address(this);
        admin = makeAddr("admin");
        operator = makeAddr("operator");
        bullUser1 = makeAddr("bullUser1");
        bullUser2 = makeAddr("bullUser2");
        bearUser1 = makeAddr("bearUser1");
        bearUser2 = makeAddr("bearUser2");

        // Fund accounts
        vm.deal(owner, 100 ether);
        vm.deal(bullUser1, 100 ether);
        vm.deal(bullUser2, 100 ether);
        vm.deal(bearUser1, 100 ether);
        vm.deal(bearUser2, 100 ether);

        // Deploy MockPyth
        pythOracle = new MockPyth(60, 1);

        // Set initial price
        _updatePythPrice(INITIAL_PRICE);

        // Deploy prediction contract
        prediction = new PancakePredictionV2Pyth(
            address(pythOracle),
            PRICE_ID,
            admin,
            operator,
            INTERVAL_SECONDS,
            BUFFER_SECONDS,
            MIN_BET_AMOUNT,
            ORACLE_UPDATE_ALLOWANCE,
            TREASURY_FEE
        );
    }

    function _updatePythPrice(int64 price) internal {
        bytes[] memory updateData = new bytes[](1);
        updateData[0] = pythOracle.createPriceFeedUpdateData(
            PRICE_ID,
            price,
            PRICE_CONF,
            PRICE_EXPO,
            price,
            PRICE_CONF,
            uint64(block.timestamp)
        );

        uint256 fee = pythOracle.getUpdateFee(updateData);
        pythOracle.updatePriceFeeds{value: fee}(updateData);
    }

    function _nextEpoch() internal {
        vm.warp(block.timestamp + INTERVAL_SECONDS);
    }

    receive() external payable {}

    // ============ Basic Tests ============

    function test_Initialize() public view {
        assertEq(prediction.currentEpoch(), 0);
        assertEq(prediction.intervalSeconds(), INTERVAL_SECONDS);
        assertEq(prediction.bufferSeconds(), BUFFER_SECONDS);
        assertEq(prediction.adminAddress(), admin);
        assertEq(prediction.operatorAddress(), operator);
        assertEq(prediction.treasuryAmount(), 0);
        assertEq(prediction.minBetAmount(), MIN_BET_AMOUNT);
        assertEq(prediction.oracleUpdateAllowance(), ORACLE_UPDATE_ALLOWANCE);
        assertFalse(prediction.genesisStartOnce());
        assertFalse(prediction.genesisLockOnce());
        assertFalse(prediction.paused());
    }

    function test_GenesisStartRound() public {
        uint256 currentTimestamp = block.timestamp;

        vm.prank(operator);
        prediction.genesisStartRound();

        assertEq(prediction.currentEpoch(), 1);
        assertTrue(prediction.genesisStartOnce());
        assertFalse(prediction.genesisLockOnce());

        (
            uint256 epoch,
            uint256 startTimestamp,
            uint256 lockTimestamp,
            uint256 closeTimestamp,
            ,,,,,,,,,
        ) = prediction.rounds(1);

        assertEq(epoch, 1);
        assertEq(startTimestamp, currentTimestamp);
        assertEq(lockTimestamp, currentTimestamp + INTERVAL_SECONDS);
        assertEq(closeTimestamp, currentTimestamp + (INTERVAL_SECONDS * 2));
    }

    function test_GenesisLockRound() public {
        vm.startPrank(operator);
        prediction.genesisStartRound();

        _nextEpoch();
        int64 price120 = 120e8;
        _updatePythPrice(price120);

        prediction.genesisLockRound();
        vm.stopPrank();

        assertEq(prediction.currentEpoch(), 2);
        assertTrue(prediction.genesisStartOnce());
        assertTrue(prediction.genesisLockOnce());

        (,,,,int256 lockPrice,,,,,,,,,) = prediction.rounds(1);
        assertEq(lockPrice, int256(price120));
    }

    function test_ExecuteRound() public {
        vm.startPrank(operator);

        prediction.genesisStartRound();
        _nextEpoch();
        _updatePythPrice(120e8);
        prediction.genesisLockRound();

        _nextEpoch();
        _updatePythPrice(130e8);
        prediction.executeRound();

        vm.stopPrank();

        assertEq(prediction.currentEpoch(), 3);

        (,,,,,int256 closePrice,,,,,,,,bool oracleCalled) = prediction.rounds(1);
        assertEq(closePrice, 130e8);
        assertTrue(oracleCalled);
    }

    function test_BetBull() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        uint256 betAmount = 1 ether;

        vm.prank(bullUser1);
        prediction.betBull{value: betAmount}(1);

        (PancakePredictionV2Pyth.Position position, uint256 amount, bool claimed) = prediction.ledger(1, bullUser1);
        assertEq(uint256(position), 0);
        assertEq(amount, betAmount);
        assertFalse(claimed);

        (,,,,,,,,uint256 totalAmount, uint256 bullAmount,,,,) = prediction.rounds(1);
        assertEq(totalAmount, betAmount);
        assertEq(bullAmount, betAmount);
    }

    function test_BetBear() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        uint256 betAmount = 1 ether;

        vm.prank(bearUser1);
        prediction.betBear{value: betAmount}(1);

        (PancakePredictionV2Pyth.Position position, uint256 amount, bool claimed) = prediction.ledger(1, bearUser1);
        assertEq(uint256(position), 1);
        assertEq(amount, betAmount);
        assertFalse(claimed);

        (,,,,,,,,uint256 totalAmount,, uint256 bearAmount,,,) = prediction.rounds(1);
        assertEq(totalAmount, betAmount);
        assertEq(bearAmount, betAmount);
    }

    function test_RevertIf_BetTwiceInSameRound() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        vm.startPrank(bullUser1);
        prediction.betBull{value: 1 ether}(1);

        vm.expectRevert("Can only bet once per round");
        prediction.betBull{value: 1 ether}(1);

        vm.expectRevert("Can only bet once per round");
        prediction.betBear{value: 1 ether}(1);
        vm.stopPrank();
    }

    function test_RevertIf_BetBelowMinimum() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        vm.prank(bullUser1);
        vm.expectRevert("Bet amount must be greater than minBetAmount");
        prediction.betBull{value: MIN_BET_AMOUNT - 1}(1);
    }

    function test_CalculateRewards_BullWins() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        vm.prank(bullUser1);
        prediction.betBull{value: 1 ether}(1);

        vm.prank(bullUser2);
        prediction.betBull{value: 2 ether}(1);

        vm.prank(bearUser1);
        prediction.betBear{value: 4 ether}(1);

        _nextEpoch();
        _updatePythPrice(120e8);
        vm.prank(operator);
        prediction.genesisLockRound();

        _nextEpoch();
        _updatePythPrice(130e8);
        vm.prank(operator);
        prediction.executeRound();

        (,,,,,,,,,,,uint256 rewardBaseCalAmount, uint256 rewardAmount,) = prediction.rounds(1);

        uint256 totalAmount = 7 ether;
        uint256 expectedTreasury = (totalAmount * TREASURY_FEE) / 10000;
        uint256 expectedReward = totalAmount - expectedTreasury;

        assertEq(rewardBaseCalAmount, 3 ether);
        assertEq(rewardAmount, expectedReward);
        assertEq(prediction.treasuryAmount(), expectedTreasury);
    }

    function test_CalculateRewards_BearWins() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        vm.prank(bullUser1);
        prediction.betBull{value: 3 ether}(1);

        vm.prank(bearUser1);
        prediction.betBear{value: 2 ether}(1);

        _nextEpoch();
        _updatePythPrice(120e8);
        vm.prank(operator);
        prediction.genesisLockRound();

        _nextEpoch();
        _updatePythPrice(100e8);
        vm.prank(operator);
        prediction.executeRound();

        (,,,,,,,,,,,uint256 rewardBaseCalAmount, uint256 rewardAmount,) = prediction.rounds(1);

        uint256 totalAmount = 5 ether;
        uint256 expectedTreasury = (totalAmount * TREASURY_FEE) / 10000;
        uint256 expectedReward = totalAmount - expectedTreasury;

        assertEq(rewardBaseCalAmount, 2 ether);
        assertEq(rewardAmount, expectedReward);
        assertEq(prediction.treasuryAmount(), expectedTreasury);
    }

    function test_CalculateRewards_HouseWins() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        vm.prank(bullUser1);
        prediction.betBull{value: 3 ether}(1);

        vm.prank(bearUser1);
        prediction.betBear{value: 2 ether}(1);

        _nextEpoch();
        _updatePythPrice(120e8);
        vm.prank(operator);
        prediction.genesisLockRound();

        _nextEpoch();
        _updatePythPrice(120e8);
        vm.prank(operator);
        prediction.executeRound();

        (,,,,,,,,,,,uint256 rewardBaseCalAmount, uint256 rewardAmount,) = prediction.rounds(1);

        assertEq(rewardBaseCalAmount, 0);
        assertEq(rewardAmount, 0);
        assertEq(prediction.treasuryAmount(), 5 ether);
    }

    function test_ClaimRewards() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        vm.prank(bullUser1);
        prediction.betBull{value: 1 ether}(1);

        vm.prank(bullUser2);
        prediction.betBull{value: 2 ether}(1);

        vm.prank(bearUser1);
        prediction.betBear{value: 4 ether}(1);

        _nextEpoch();
        _updatePythPrice(120e8);
        vm.prank(operator);
        prediction.genesisLockRound();

        _nextEpoch();
        _updatePythPrice(130e8);
        vm.prank(operator);
        prediction.executeRound();

        uint256[] memory epochs = new uint256[](1);
        epochs[0] = 1;

        uint256 balanceBefore = bullUser1.balance;

        vm.prank(bullUser1);
        prediction.claim(epochs);

        uint256 balanceAfter = bullUser1.balance;

        // Bull user1 gets: (1 / 3) * (7 * 0.9) = 2.1 ether
        uint256 expectedReward = (1 ether * (7 ether * 9000 / 10000)) / 3 ether;
        assertEq(balanceAfter - balanceBefore, expectedReward);

        (,, bool claimed) = prediction.ledger(1, bullUser1);
        assertTrue(claimed);
    }

    function test_ClaimTreasury() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        vm.prank(bullUser1);
        prediction.betBull{value: 3 ether}(1);

        _nextEpoch();
        _updatePythPrice(120e8);
        vm.prank(operator);
        prediction.genesisLockRound();

        _nextEpoch();
        _updatePythPrice(130e8);
        vm.prank(operator);
        prediction.executeRound();

        uint256 treasuryAmount = prediction.treasuryAmount();
        assertGt(treasuryAmount, 0);

        uint256 adminBalanceBefore = admin.balance;

        vm.prank(admin);
        prediction.claimTreasury();

        uint256 adminBalanceAfter = admin.balance;
        assertEq(adminBalanceAfter - adminBalanceBefore, treasuryAmount);
        assertEq(prediction.treasuryAmount(), 0);
    }

    function test_PerformUpkeep_AutoGenesis() public {
        bytes memory performData = "";

        // First call - starts genesis
        prediction.performUpkeep(performData);
        assertEq(prediction.currentEpoch(), 1);
        assertTrue(prediction.genesisStartOnce());

        // Second call - locks genesis
        _nextEpoch();
        _updatePythPrice(120e8);
        prediction.performUpkeep(performData);
        assertEq(prediction.currentEpoch(), 2);
        assertTrue(prediction.genesisLockOnce());

        // Third call - normal execution
        _nextEpoch();
        _updatePythPrice(130e8);
        prediction.performUpkeep(performData);
        assertEq(prediction.currentEpoch(), 3);
    }

    function test_OracleValidation_StalePrice() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        _nextEpoch();
        _updatePythPrice(120e8);
        vm.prank(operator);
        prediction.genesisLockRound();

        _nextEpoch();
        // Don't update price - same timestamp

        vm.prank(operator);
        vm.expectRevert("Oracle update timestamp must be larger than oracleLatestTimestamp");
        prediction.executeRound();
    }

    function test_Pause() public {
        vm.prank(admin);
        prediction.pause();
        assertTrue(prediction.paused());
    }

    function test_Unpause() public {
        vm.prank(admin);
        prediction.pause();

        vm.prank(admin);
        prediction.unpause();

        assertFalse(prediction.paused());
        assertFalse(prediction.genesisStartOnce());
        assertFalse(prediction.genesisLockOnce());
    }

    function test_SetAdmin() public {
        address newAdmin = makeAddr("newAdmin");
        prediction.setAdmin(newAdmin);
        assertEq(prediction.adminAddress(), newAdmin);
    }

    function test_SetPyth() public {
        address newPyth = makeAddr("newPyth");

        vm.prank(admin);
        prediction.pause();

        vm.prank(admin);
        prediction.setPyth(newPyth);

        assertEq(address(prediction.pyth()), newPyth);
        assertEq(prediction.oracleLatestTimestamp(), 0);
    }

    function test_SetPriceId() public {
        bytes32 newPriceId = bytes32(uint256(999));

        vm.prank(admin);
        prediction.pause();

        vm.prank(admin);
        prediction.setPriceId(newPriceId);

        assertEq(prediction.priceId(), newPriceId);
        assertEq(prediction.oracleLatestTimestamp(), 0);
    }

    function test_SetOracleUpdateAllowance() public {
        uint256 newAllowance = 600; // 10 minutes

        vm.prank(admin);
        prediction.pause();

        vm.prank(admin);
        prediction.setOracleUpdateAllowance(newAllowance);

        assertEq(prediction.oracleUpdateAllowance(), newAllowance);
    }
}

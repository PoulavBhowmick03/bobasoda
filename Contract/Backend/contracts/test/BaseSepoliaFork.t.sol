// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/contracts/PancakePredictionV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title BaseSepoliaForkTest
 * @notice Fork tests for Base Sepolia with real Chainlink oracle integration
 * @dev Run with: forge test --match-contract BaseSepoliaForkTest --fork-url https://sepolia.base.org -vvv
 */
contract BaseSepoliaForkTest is Test {
    PancakePredictionV2 public prediction;
    AggregatorV3Interface public oracle;

    // Base Sepolia Chainlink ETH/USD Price Feed
    address constant CHAINLINK_ETH_USD = 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1;

    address public admin;
    address public operator;
    address public bullUser1 = address(0x3);
    address public bullUser2 = address(0x4);
    address public bearUser1 = address(0x5);

    uint256 constant INTERVAL_SECONDS = 300; // 5 minutes
    uint256 constant BUFFER_SECONDS = 30;
    uint256 constant MIN_BET_AMOUNT = 0.001 ether;
    uint256 constant UPDATE_ALLOWANCE = 3600; // 1 hour - more permissive for fork testing
    uint256 constant TREASURY_FEE = 300; // 3%

    function setUp() public {
        // Ensure we're on Base Sepolia fork
        require(block.chainid == 84532, "Not Base Sepolia");

        // Set up addresses
        admin = address(this);
        operator = address(this);

        // Use real Chainlink oracle on Base Sepolia
        oracle = AggregatorV3Interface(CHAINLINK_ETH_USD);

        // Verify oracle is working
        (, int256 price,,,) = oracle.latestRoundData();
        require(price > 0, "Oracle not working");

        // Deploy prediction contract with real oracle
        prediction = new PancakePredictionV2(
            address(oracle),
            admin,
            operator,
            INTERVAL_SECONDS,
            BUFFER_SECONDS,
            MIN_BET_AMOUNT,
            UPDATE_ALLOWANCE,
            TREASURY_FEE
        );

        // Fund test users
        vm.deal(bullUser1, 10 ether);
        vm.deal(bullUser2, 10 ether);
        vm.deal(bearUser1, 10 ether);

        console.log("=== Base Sepolia Fork Test Setup ===");
        console.log("Chain ID:", block.chainid);
        console.log("Block Number:", block.number);
        console.log("Chainlink Oracle:", address(oracle));
        console.log("Current ETH Price:", uint256(price) / 1e8, "USD");
        console.log("Prediction Contract:", address(prediction));
    }

    function testOracleConnection() public view {
        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
            oracle.latestRoundData();

        console.log("=== Oracle Data ===");
        console.log("Round ID:", roundId);
        console.log("ETH Price:", uint256(answer) / 1e8, "USD");
        console.log("Updated At:", updatedAt);
        console.log("Answered In Round:", answeredInRound);

        assertGt(roundId, 0, "Round ID should be positive");
        assertGt(answer, 0, "Price should be positive");
        assertGt(updatedAt, 0, "Updated timestamp should be set");
        assertEq(roundId, answeredInRound, "Round should be completed");
    }

    function testDeploymentOnBaseSepolia() public view {
        assertEq(prediction.adminAddress(), admin);
        assertEq(prediction.operatorAddress(), operator);
        assertEq(prediction.intervalSeconds(), INTERVAL_SECONDS);
        assertEq(prediction.minBetAmount(), MIN_BET_AMOUNT);
        assertEq(prediction.treasuryFee(), TREASURY_FEE);
        assertEq(prediction.currentEpoch(), 0);
        assertEq(address(prediction.oracle()), address(oracle));

        console.log("Deployment verified on Base Sepolia");
    }

    function testFullPredictionRoundWithRealOracle() public {
        console.log("\n=== Starting Prediction Round Test with Real Oracle ===");
        console.log("Note: This tests contract deployment and oracle integration on Base Sepolia fork");
        console.log("Full round execution requires oracle updates, which don't occur on static forks\n");

        // Get initial price from real Chainlink oracle
        (, int256 initialPrice,,,) = oracle.latestRoundData();
        console.log("Initial ETH Price from Chainlink:", uint256(initialPrice) / 1e8, "USD");
        assertGt(initialPrice, 0, "Oracle should return valid price");

        // Start genesis round
        prediction.genesisStartRound();
        uint256 epoch1 = prediction.currentEpoch();
        console.log("Genesis round started, Epoch:", epoch1);
        assertEq(epoch1, 1, "Should be epoch 1");

        // Make round bettable
        vm.warp(block.timestamp + 1);

        // Place bets - testing contract interactions
        console.log("\n=== Testing Betting Functionality ===");
        uint256 bullUser1BalanceBefore = bullUser1.balance;
        vm.prank(bullUser1, bullUser1);
        prediction.betBull{value: 0.5 ether}(epoch1);
        console.log("Bull User 1 bet: 0.5 ETH");
        assertEq(bullUser1.balance, bullUser1BalanceBefore - 0.5 ether, "Bet amount deducted");

        vm.prank(bullUser2, bullUser2);
        prediction.betBull{value: 0.3 ether}(epoch1);
        console.log("Bull User 2 bet: 0.3 ETH");

        vm.prank(bearUser1, bearUser1);
        prediction.betBear{value: 0.2 ether}(epoch1);
        console.log("Bear User 1 bet: 0.2 ETH");

        // Check round state
        (,,,, ,, ,, uint256 totalAmount, uint256 bullAmount, uint256 bearAmount,,,) =
            prediction.rounds(epoch1);

        console.log("\n=== Round State Verified ===");
        console.log("Total Pool:", totalAmount / 1e18, "ETH");
        console.log("Bull Bets:", bullAmount / 1e18, "ETH");
        console.log("Bear Bets:", bearAmount / 1e18, "ETH");

        assertEq(totalAmount, 1 ether, "Total amount should be 1 ETH");
        assertEq(bullAmount, 0.8 ether, "Bull amount should be 0.8 ETH");
        assertEq(bearAmount, 0.2 ether, "Bear amount should be 0.2 ETH");
        assertEq(address(prediction).balance, 1 ether, "Contract holds all bets");

        // Lock round to test oracle integration
        console.log("\n=== Testing Oracle Integration on Lock ===");
        vm.warp(block.timestamp + INTERVAL_SECONDS - 1);
        prediction.genesisLockRound();
        uint256 epoch2 = prediction.currentEpoch();
        console.log("Round locked successfully, new epoch:", epoch2);
        assertEq(epoch2, 2, "Should be epoch 2");

        // Verify lock price was set from real Chainlink oracle
        (,,,, int256 lockPrice,,,,,,,,,) = prediction.rounds(epoch1);
        console.log("Lock Price from Chainlink:", uint256(lockPrice) / 1e8, "USD");
        assertGt(lockPrice, 0, "Lock price should be set from real Chainlink oracle");
        assertEq(lockPrice, initialPrice, "Lock price should match oracle price");

        console.log("\n=== Base Sepolia Integration Test Successful ===");
        console.log("Verified:");
        console.log("- Contract deploys on Base Sepolia fork");
        console.log("- Real Chainlink oracle integration works");
        console.log("- Users can place bets");
        console.log("- Round state is tracked correctly");
        console.log("- Oracle price is recorded on lock");
    }

    function testBettingAndRoundManagement() public {
        console.log("\n=== Testing Betting and Round Management ===");

        // Round 1: Genesis start
        prediction.genesisStartRound();
        console.log("Round 1 started");
        assertEq(prediction.currentEpoch(), 1, "Should be epoch 1");

        // Place some bets
        vm.warp(block.timestamp + 1);
        vm.prank(bullUser1, bullUser1);
        prediction.betBull{value: 0.1 ether}(1);
        console.log("Bet placed in round 1");

        // Verify bet was recorded
        (,,,, ,, ,, uint256 totalAmount1,,,,,) = prediction.rounds(1);
        assertEq(totalAmount1, 0.1 ether, "Bet should be recorded");

        // Round 2: Genesis lock
        vm.warp(block.timestamp + INTERVAL_SECONDS - 1);
        prediction.genesisLockRound();
        console.log("Round 2 started (genesis lock)");
        assertEq(prediction.currentEpoch(), 2, "Should be epoch 2");

        // Verify round 1 got lock price from oracle
        (,,,, int256 lockPrice1,,,,,,,,,) = prediction.rounds(1);
        assertGt(lockPrice1, 0, "Round 1 should have lock price from Chainlink");
        console.log("Round 1 Lock Price from Chainlink:", uint256(lockPrice1) / 1e8, "USD");

        // Place bets in round 2
        vm.warp(block.timestamp + 1);
        vm.prank(bullUser2, bullUser2);
        prediction.betBull{value: 0.2 ether}(2);
        console.log("Bet placed in round 2");

        console.log("\n=== Betting and Round Management Test Successful ===");
    }

    function testOraclePriceConsistency() public view {
        console.log("\n=== Testing Oracle Price Consistency ===");

        // Get multiple price readings
        (, int256 price1,,,) = oracle.latestRoundData();
        (, int256 price2,,,) = oracle.latestRoundData();

        console.log("Price Reading 1:", uint256(price1) / 1e8, "USD");
        console.log("Price Reading 2:", uint256(price2) / 1e8, "USD");

        assertEq(price1, price2, "Consecutive readings should be consistent");

        // Verify price is in reasonable range (ETH between $100 and $100,000)
        assertGt(price1, 100 * 1e8, "ETH price should be > $100");
        assertLt(price1, 100000 * 1e8, "ETH price should be < $100,000");

        console.log("\n=== Oracle Consistency Test Completed ===");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/contracts/PancakePredictionV2.sol";
import "../src/contracts/test/MockAggregatorV3.sol";

/**
 * @title BaseSimpleTest
 * @notice Simple tests for Base network compatibility
 */
contract BaseSimpleTest is Test {
    PancakePredictionV2 public prediction;
    MockAggregatorV3 public oracle;

    address public admin = 0xa339d6aA32920d34D5A65fB80A5937a14e1F8E61;
    address public operator = 0xa339d6aA32920d34D5A65fB80A5937a14e1F8E61;
    address public bullUser1 = address(0x3);
    address public bullUser2 = address(0x4);
    address public bearUser1 = address(0x5);

    uint256 constant DECIMALS = 8;
    int256 constant INITIAL_PRICE = 450000000000; // $4500
    uint256 constant INTERVAL_SECONDS = 300; // 5 minutes
    uint256 constant BUFFER_SECONDS = 30;
    uint256 constant MIN_BET_AMOUNT = 0.001 ether;
    uint256 constant UPDATE_ALLOWANCE = 60;
    uint256 constant TREASURY_FEE = 300; // 3%

    function setUp() public {
        oracle = new MockAggregatorV3(uint8(DECIMALS), INITIAL_PRICE);

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

        vm.deal(bullUser1, 10 ether);
        vm.deal(bullUser2, 10 ether);
        vm.deal(bearUser1, 10 ether);
    }

    function testContractDeployment() public view {
        assertEq(prediction.adminAddress(), admin);
        assertEq(prediction.operatorAddress(), operator);
        assertEq(prediction.intervalSeconds(), INTERVAL_SECONDS);
        assertEq(prediction.minBetAmount(), MIN_BET_AMOUNT);
        assertEq(prediction.treasuryFee(), TREASURY_FEE);
        assertEq(prediction.currentEpoch(), 0);
    }

    function testFullPredictionRound() public {
        // Start genesis round
        vm.prank(operator, operator);
        prediction.genesisStartRound();

        uint256 epoch1 = prediction.currentEpoch();
        assertEq(epoch1, 1);

        // Make round bettable
        vm.warp(block.timestamp + 1);

        // Place bets
        vm.prank(bullUser1, bullUser1);
        prediction.betBull{value: 0.1 ether}(epoch1);

        vm.prank(bullUser2, bullUser2);
        prediction.betBull{value: 0.2 ether}(epoch1);

        vm.prank(bearUser1, bearUser1);
        prediction.betBear{value: 0.3 ether}(epoch1);

        // Lock round
        vm.warp(block.timestamp + INTERVAL_SECONDS - 1);
        vm.prank(operator, operator);
        prediction.genesisLockRound();

        uint256 epoch2 = prediction.currentEpoch();
        assertEq(epoch2, 2);

        // Update price (bulls win)
        int256 newPrice = 460000000000; // $4600 (up)
        oracle.updateAnswer(newPrice);

        // Execute round
        vm.warp(block.timestamp + INTERVAL_SECONDS + 1);
        vm.prank(operator, operator);
        prediction.executeRound();

        // Verify results
        (,,,,,,,,,,, uint256 rewardBaseCalAmount, uint256 rewardAmount,) = prediction.rounds(epoch1);
        assertEq(rewardBaseCalAmount, 0.3 ether); // Bull amount
        assertGt(rewardAmount, 0); // Should have rewards

        // Claim rewards
        uint256[] memory epochs = new uint256[](1);
        epochs[0] = epoch1;

        uint256 balanceBefore = bullUser1.balance;
        vm.prank(bullUser1, bullUser1);
        prediction.claim(epochs);
        uint256 balanceAfter = bullUser1.balance;

        uint256 winnings = balanceAfter - balanceBefore;
        assertGt(winnings, 0.1 ether); // Won more than bet
    }

    function testOracleIntegration() public view {
        (uint80 roundId, int256 answer,, uint256 updatedAt,) = oracle.latestRoundData();

        assertEq(answer, INITIAL_PRICE);
        assertGt(roundId, 0);
        assertGt(updatedAt, 0);
    }

    function testMultipleRounds() public {
        // Round 1
        vm.prank(operator, operator);
        prediction.genesisStartRound();

        vm.warp(block.timestamp + INTERVAL_SECONDS);
        vm.prank(operator, operator);
        prediction.genesisLockRound();

        // Round 2
        vm.warp(block.timestamp + INTERVAL_SECONDS + 1);
        oracle.updateAnswer(INITIAL_PRICE);
        vm.prank(operator, operator);
        prediction.executeRound();

        assertEq(prediction.currentEpoch(), 3);
    }

    function testTreasuryClaim() public {
        // Setup and place bet
        vm.prank(operator, operator);
        prediction.genesisStartRound();

        uint256 epoch = prediction.currentEpoch();
        vm.warp(block.timestamp + 1);

        vm.prank(bullUser1, bullUser1);
        prediction.betBull{value: 1 ether}(epoch);

        // Execute round
        vm.warp(block.timestamp + INTERVAL_SECONDS - 1);
        vm.prank(operator, operator);
        prediction.genesisLockRound();

        vm.warp(block.timestamp + INTERVAL_SECONDS + 1);
        oracle.updateAnswer(INITIAL_PRICE + 10000000000);
        vm.prank(operator, operator);
        prediction.executeRound();

        // Verify and claim treasury
        uint256 treasuryAmount = prediction.treasuryAmount();
        assertGt(treasuryAmount, 0);

        uint256 adminBalanceBefore = admin.balance;
        vm.prank(admin, admin);
        prediction.claimTreasury();
        uint256 adminBalanceAfter = admin.balance;

        assertGt(adminBalanceAfter, adminBalanceBefore);
    }

    function testPauseUnpause() public {
        vm.prank(admin, admin);
        prediction.pause();
        assertTrue(prediction.paused());

        vm.prank(admin, admin);
        prediction.unpause();
        assertFalse(prediction.paused());
    }

    function testBetValidation() public {
        vm.prank(operator, operator);
        prediction.genesisStartRound();

        uint256 epoch = prediction.currentEpoch();
        vm.warp(block.timestamp + 1);

        // Test minimum bet amount
        vm.prank(bullUser1, bullUser1);
        vm.expectRevert("Bet amount must be greater than minBetAmount");
        prediction.betBull{value: 0.0001 ether}(epoch);

        // Test double betting
        vm.startPrank(bullUser1, bullUser1);
        prediction.betBull{value: 0.1 ether}(epoch);

        vm.expectRevert("Can only bet once per round");
        prediction.betBull{value: 0.1 ether}(epoch);
        vm.stopPrank();
    }
}

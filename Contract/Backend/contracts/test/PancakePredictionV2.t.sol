// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/contracts/PancakePredictionV2.sol";
import "../src/contracts/test/MockAggregatorV3.sol";

contract PancakePredictionV2Test is Test {
    PancakePredictionV2 public prediction;
    MockAggregatorV3 public oracle;

    address public owner = address(this);
    address public admin = address(0x1);
    address public operator = address(0x2);
    address public bullUser1 = address(0x3);
    address public bullUser2 = address(0x4);
    address public bearUser1 = address(0x5);

    uint256 constant DECIMALS = 8;
    int256 constant INITIAL_PRICE = 10000000000; // $100
    uint256 constant INTERVAL_SECONDS = 100;
    uint256 constant BUFFER_SECONDS = 25;
    uint256 constant MIN_BET_AMOUNT = 1 ether;
    uint256 constant UPDATE_ALLOWANCE = 150;
    uint256 constant TREASURY_FEE = 1000; // 10%

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

        // Fund test users
        vm.deal(bullUser1, 100 ether);
        vm.deal(bullUser2, 100 ether);
        vm.deal(bearUser1, 100 ether);
    }

    function testInitialize() public view {
        assertEq(address(prediction).balance, 0);
        assertEq(prediction.currentEpoch(), 0);
        assertEq(prediction.intervalSeconds(), INTERVAL_SECONDS);
        assertEq(prediction.adminAddress(), admin);
        assertEq(prediction.treasuryAmount(), 0);
        assertEq(prediction.minBetAmount(), MIN_BET_AMOUNT);
        assertEq(prediction.oracleUpdateAllowance(), UPDATE_ALLOWANCE);
        assertFalse(prediction.genesisStartOnce());
        assertFalse(prediction.genesisLockOnce());
        assertFalse(prediction.paused());
    }

    function testGenesisStartRound() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        assertTrue(prediction.genesisStartOnce());
        assertFalse(prediction.genesisLockOnce());
        assertEq(prediction.currentEpoch(), 1);
    }

    function testCannotStartGenesisRoundTwice() public {
        vm.startPrank(operator);
        prediction.genesisStartRound();

        vm.expectRevert("Can only run genesisStartRound once");
        prediction.genesisStartRound();
        vm.stopPrank();
    }

    function testGenesisLockRound() public {
        vm.startPrank(operator);
        prediction.genesisStartRound();

        vm.warp(block.timestamp + INTERVAL_SECONDS);

        prediction.genesisLockRound();
        vm.stopPrank();

        assertTrue(prediction.genesisLockOnce());
        assertEq(prediction.currentEpoch(), 2);
    }

    function testBetBull() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        uint256 currentEpoch = prediction.currentEpoch();

        // Move forward in time to make the round bettable (after startTimestamp)
        vm.warp(block.timestamp + 1);

        vm.prank(bullUser1, bullUser1);
        prediction.betBull{value: 1.1 ether}(currentEpoch);

        (PancakePredictionV2.Position position, uint256 amount, bool claimed) = prediction.ledger(currentEpoch, bullUser1);
        assertEq(uint8(position), uint8(PancakePredictionV2.Position.Bull));
        assertEq(amount, 1.1 ether);
        assertFalse(claimed);
    }

    function testBetBear() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        uint256 currentEpoch = prediction.currentEpoch();

        vm.warp(block.timestamp + 1);

        vm.prank(bearUser1, bearUser1);
        prediction.betBear{value: 1.4 ether}(currentEpoch);

        (PancakePredictionV2.Position position, uint256 amount, bool claimed) = prediction.ledger(currentEpoch, bearUser1);
        assertEq(uint8(position), uint8(PancakePredictionV2.Position.Bear));
        assertEq(amount, 1.4 ether);
        assertFalse(claimed);
    }

    function testCannotBetBelowMinimum() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        uint256 currentEpoch = prediction.currentEpoch();

        vm.warp(block.timestamp + 1);

        vm.prank(bullUser1, bullUser1);
        vm.expectRevert("Bet amount must be greater than minBetAmount");
        prediction.betBull{value: 0.5 ether}(currentEpoch);
    }

    function testCannotBetTwice() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        uint256 currentEpoch = prediction.currentEpoch();

        vm.warp(block.timestamp + 1);

        vm.startPrank(bullUser1, bullUser1);
        prediction.betBull{value: 1 ether}(currentEpoch);

        vm.expectRevert("Can only bet once per round");
        prediction.betBull{value: 1 ether}(currentEpoch);
        vm.stopPrank();
    }

    function testExecuteRound() public {
        vm.startPrank(operator);

        // Genesis start
        prediction.genesisStartRound();
        vm.warp(block.timestamp + INTERVAL_SECONDS);

        // Genesis lock
        prediction.genesisLockRound();
        vm.warp(block.timestamp + INTERVAL_SECONDS + 1);

        // Execute first round
        oracle.updateAnswer(INITIAL_PRICE);
        prediction.executeRound();

        vm.stopPrank();

        assertEq(prediction.currentEpoch(), 3);
    }

    function testRecordOraclePrice() public {
        vm.startPrank(operator);

        prediction.genesisStartRound();
        vm.warp(block.timestamp + INTERVAL_SECONDS);

        int256 price120 = 12000000000; // $120
        oracle.updateAnswer(price120);
        prediction.genesisLockRound();

        (,,,, int256 lockPrice,,,,,,,,,) = prediction.rounds(1);
        assertEq(lockPrice, price120);

        vm.stopPrank();
    }

    function testRewardCalculation() public {
        vm.startPrank(operator);
        prediction.genesisStartRound();
        vm.stopPrank();

        uint256 epoch1 = prediction.currentEpoch();

        vm.warp(block.timestamp + 1);

        // Place bets in round 1
        vm.prank(bullUser1, bullUser1);
        prediction.betBull{value: 1 ether}(epoch1);

        vm.prank(bullUser2, bullUser2);
        prediction.betBull{value: 2 ether}(epoch1);

        vm.prank(bearUser1, bearUser1);
        prediction.betBear{value: 4 ether}(epoch1);

        // Lock round 1
        vm.warp(block.timestamp + INTERVAL_SECONDS);
        vm.prank(operator);
        prediction.genesisLockRound();

        uint256 epoch2 = prediction.currentEpoch();

        vm.warp(block.timestamp + 1);

        // Place bets in round 2
        vm.prank(bullUser1, bullUser1);
        prediction.betBull{value: 21 ether}(epoch2);

        // Execute round (price went up, bulls win)
        vm.warp(block.timestamp + INTERVAL_SECONDS - 1);
        int256 price130 = 13000000000; // $130 (up from $100)
        oracle.updateAnswer(price130);

        vm.prank(operator);
        prediction.executeRound();

        // Check rewards calculated for round 1
        (,,,,,,,,,,, uint256 rewardBaseCalAmount, uint256 rewardAmount,) = prediction.rounds(epoch1);

        assertEq(rewardBaseCalAmount, 3 ether); // Bull amount
        assertEq(rewardAmount, 6.3 ether); // 7 ether total * 0.9 (90% after 10% fee)
    }

    function testClaimRewards() public {
        vm.startPrank(operator);
        prediction.genesisStartRound();
        vm.stopPrank();

        uint256 epoch1 = prediction.currentEpoch();

        vm.warp(block.timestamp + 1);

        // Place bets
        vm.prank(bullUser1, bullUser1);
        prediction.betBull{value: 1 ether}(epoch1);

        vm.prank(bullUser2, bullUser2);
        prediction.betBull{value: 2 ether}(epoch1);

        vm.prank(bearUser1, bearUser1);
        prediction.betBear{value: 4 ether}(epoch1);

        // Progress rounds
        vm.warp(block.timestamp + INTERVAL_SECONDS - 1);
        vm.prank(operator);
        prediction.genesisLockRound();

        vm.warp(block.timestamp + INTERVAL_SECONDS + 1);
        int256 price130 = 13000000000;
        oracle.updateAnswer(price130);
        vm.prank(operator);
        prediction.executeRound();

        // Claim rewards
        uint256[] memory epochs = new uint256[](1);
        epochs[0] = epoch1;

        uint256 balanceBefore = bullUser1.balance;
        vm.prank(bullUser1, bullUser1);
        prediction.claim(epochs);
        uint256 balanceAfter = bullUser1.balance;

        // Bull user should receive their share (1/3 of 6.3 ETH = 2.1 ETH)
        assertEq(balanceAfter - balanceBefore, 2.1 ether);
    }

    function testHouseWins() public {
        vm.startPrank(operator);
        prediction.genesisStartRound();
        vm.stopPrank();

        uint256 epoch1 = prediction.currentEpoch();

        vm.warp(block.timestamp + 1);

        // Place bets
        vm.prank(bullUser1, bullUser1);
        prediction.betBull{value: 1 ether}(epoch1);

        vm.prank(bearUser1, bearUser1);
        prediction.betBear{value: 4 ether}(epoch1);

        // Progress rounds
        vm.warp(block.timestamp + INTERVAL_SECONDS - 1);
        oracle.updateAnswer(INITIAL_PRICE); // Same price
        vm.prank(operator);
        prediction.genesisLockRound();

        vm.warp(block.timestamp + INTERVAL_SECONDS + 1);
        oracle.updateAnswer(INITIAL_PRICE); // Still same price - house wins
        vm.prank(operator);
        prediction.executeRound();

        // Treasury should get everything
        assertEq(prediction.treasuryAmount(), 5 ether);

        // Users should not be able to claim
        uint256[] memory epochs = new uint256[](1);
        epochs[0] = epoch1;

        vm.prank(bullUser1, bullUser1);
        vm.expectRevert("Not eligible for claim");
        prediction.claim(epochs);
    }

    function testClaimTreasury() public {
        vm.startPrank(operator);
        prediction.genesisStartRound();
        vm.stopPrank();

        uint256 epoch1 = prediction.currentEpoch();

        vm.warp(block.timestamp + 1);

        vm.prank(bullUser1, bullUser1);
        prediction.betBull{value: 1 ether}(epoch1);

        // Progress rounds
        vm.warp(block.timestamp + INTERVAL_SECONDS);
        oracle.updateAnswer(INITIAL_PRICE);
        vm.prank(operator);
        prediction.genesisLockRound();

        vm.warp(block.timestamp + INTERVAL_SECONDS + 1);
        int256 price130 = 13000000000;
        oracle.updateAnswer(price130);
        vm.prank(operator);
        prediction.executeRound();

        uint256 treasuryBefore = admin.balance;
        vm.prank(admin);
        prediction.claimTreasury();
        uint256 treasuryAfter = admin.balance;

        assertGt(treasuryAfter, treasuryBefore);
    }

    function testPauseUnpause() public {
        vm.prank(admin);
        prediction.pause();
        assertTrue(prediction.paused());

        vm.prank(admin);
        prediction.unpause();
        assertFalse(prediction.paused());
    }

    function testCannotBetWhenPaused() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        uint256 currentEpoch = prediction.currentEpoch();

        vm.prank(admin);
        prediction.pause();

        vm.prank(bullUser1);
        vm.expectRevert("Pausable: paused");
        prediction.betBull{value: 1 ether}(currentEpoch);
    }

    function testSetMinBetAmount() public {
        vm.prank(admin);
        prediction.pause();

        vm.prank(admin);
        prediction.setMinBetAmount(2 ether);

        assertEq(prediction.minBetAmount(), 2 ether);
    }

    function testSetTreasuryFee() public {
        vm.prank(admin);
        prediction.pause();

        vm.prank(admin);
        prediction.setTreasuryFee(500); // 5%

        assertEq(prediction.treasuryFee(), 500);
    }

    function testCannotSetTreasuryFeeTooHigh() public {
        vm.prank(admin);
        prediction.pause();

        vm.prank(admin);
        vm.expectRevert("Treasury fee too high");
        prediction.setTreasuryFee(1500); // 15% (over 10% max)
    }

    function testOnlyOperatorCanStartRounds() public {
        vm.prank(bullUser1);
        vm.expectRevert("Not operator");
        prediction.genesisStartRound();
    }

    function testOnlyAdminCanClaimTreasury() public {
        vm.prank(bullUser1);
        vm.expectRevert("Not admin");
        prediction.claimTreasury();
    }

    function testRefund() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        uint256 epoch1 = prediction.currentEpoch();

        vm.warp(block.timestamp + 1);

        vm.prank(bullUser1, bullUser1);
        prediction.betBull{value: 1 ether}(epoch1);

        // Lock round
        vm.warp(block.timestamp + INTERVAL_SECONDS);
        vm.prank(operator);
        prediction.genesisLockRound();

        // Skip past buffer time to make round invalid
        vm.warp(block.timestamp + INTERVAL_SECONDS + BUFFER_SECONDS + 1);

        // Check refundable
        assertTrue(prediction.refundable(epoch1, bullUser1));

        // Claim refund
        uint256[] memory epochs = new uint256[](1);
        epochs[0] = epoch1;

        uint256 balanceBefore = bullUser1.balance;
        vm.prank(bullUser1, bullUser1);
        prediction.claim(epochs);
        uint256 balanceAfter = bullUser1.balance;

        assertEq(balanceAfter - balanceBefore, 1 ether); // Full refund
    }

    function testGetUserRounds() public {
        vm.prank(operator);
        prediction.genesisStartRound();

        uint256 epoch1 = prediction.currentEpoch();

        vm.warp(block.timestamp + 1);

        vm.prank(bullUser1, bullUser1);
        prediction.betBull{value: 1 ether}(epoch1);

        assertEq(prediction.getUserRoundsLength(bullUser1), 1);

        (uint256[] memory rounds, , ) = prediction.getUserRounds(bullUser1, 0, 10);
        assertEq(rounds.length, 1);
        assertEq(rounds[0], epoch1);
    }
}

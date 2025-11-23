// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import "../src/contracts/PancakePredictionV2Pyth.sol";

/**
 * @title CheckPredictionMarket
 * @notice Script to monitor and check the status of the deployed prediction market
 * @dev Run with: forge script script/CheckPredictionMarket.s.sol:CheckPredictionMarket --rpc-url base_sepolia -vvv
 */
contract CheckPredictionMarket is Script {
    // Base Sepolia deployed contract
    address constant PREDICTION_CONTRACT = 0x38712B69D57293bb20627177Fed1BFc7707eCDb3;

    function run() external view {
        PancakePredictionV2Pyth prediction = PancakePredictionV2Pyth(payable(PREDICTION_CONTRACT));

        console.log("\n========================================");
        console.log("  PREDICTION MARKET STATUS CHECK");
        console.log("========================================\n");

        console.log("Contract Address:", PREDICTION_CONTRACT);
        console.log("Network: Base Sepolia Testnet");
        console.log("Timestamp:", block.timestamp);
        console.log("");

        // === CONTRACT STATE ===
        console.log("=== CONTRACT STATE ===");
        uint256 currentEpoch = prediction.currentEpoch();
        bool paused = prediction.paused();
        bool genesisStartOnce = prediction.genesisStartOnce();
        bool genesisLockOnce = prediction.genesisLockOnce();

        console.log("Current Epoch:", currentEpoch);
        console.log("Status:", paused ? "PAUSED" : "ACTIVE");
        console.log("Genesis Started:", genesisStartOnce ? "YES" : "NO");
        console.log("Genesis Locked:", genesisLockOnce ? "YES" : "NO");
        console.log("");

        // === CONFIGURATION ===
        console.log("=== CONFIGURATION ===");
        console.log("Interval (seconds):", prediction.intervalSeconds());
        console.log("Buffer (seconds):", prediction.bufferSeconds());
        console.log("Min Bet Amount (wei):", prediction.minBetAmount());
        console.log("Oracle Update Allowance (seconds):", prediction.oracleUpdateAllowance());
        console.log("Treasury Fee (bp):", prediction.treasuryFee());
        console.log("Treasury Balance (wei):", prediction.treasuryAmount());
        console.log("");

        // === ROLES ===
        console.log("=== ROLES ===");
        console.log("Owner:", prediction.owner());
        console.log("Admin:", prediction.adminAddress());
        console.log("Operator:", prediction.operatorAddress());
        console.log("");

        // === ORACLE INFO ===
        console.log("=== ORACLE INFO ===");
        console.log("Pyth Contract:", address(prediction.pyth()));
        console.log("Price ID:", vm.toString(prediction.priceId()));
        console.log("Latest Oracle Timestamp:", prediction.oracleLatestTimestamp());
        console.log("");

        if (currentEpoch == 0) {
            console.log("=== MARKET NOT STARTED ===");
            console.log("Waiting for genesis start...");
            console.log("This should happen automatically via Chainlink Automation.");
            console.log("");
            return;
        }

        // === CURRENT ROUND ===
        if (currentEpoch > 0) {
            console.log("=== CURRENT ROUND (Epoch", currentEpoch, ") ===");
            _displayRound(prediction, currentEpoch);
            console.log("");
        }

        // === PREVIOUS ROUND ===
        if (currentEpoch > 1) {
            console.log("=== PREVIOUS ROUND (Epoch", currentEpoch - 1, ") ===");
            _displayRound(prediction, currentEpoch - 1);
            console.log("");
        }

        // === ROUND BEFORE PREVIOUS ===
        if (currentEpoch > 2) {
            console.log("=== ROUND BEFORE PREVIOUS (Epoch", currentEpoch - 2, ") ===");
            _displayRound(prediction, currentEpoch - 2);
            console.log("");
        }

        // === HEALTH CHECK ===
        console.log("=== HEALTH CHECK ===");
        _performHealthCheck(prediction, currentEpoch);
        console.log("");
    }

    function _displayRound(PancakePredictionV2Pyth prediction, uint256 epoch) internal view {
        (
            ,
            uint256 startTimestamp,
            uint256 lockTimestamp,
            uint256 closeTimestamp,
            int256 lockPrice,
            int256 closePrice,
            uint256 lockOracleTimestamp,
            uint256 closeOracleTimestamp,
            uint256 totalAmount,
            uint256 bullAmount,
            uint256 bearAmount,
            uint256 rewardBaseCalAmount,
            uint256 rewardAmount,
            bool oracleCalled
        ) = prediction.rounds(epoch);

        console.log("Start Time:", startTimestamp, _formatTimestamp(startTimestamp));
        console.log("Lock Time:", lockTimestamp, _formatTimestamp(lockTimestamp));
        console.log("Close Time:", closeTimestamp, _formatTimestamp(closeTimestamp));
        console.log("");

        console.log("Lock Price:", _formatPrice(lockPrice));
        console.log("Close Price:", _formatPrice(closePrice));
        console.log("Lock Oracle Timestamp:", lockOracleTimestamp);
        console.log("Close Oracle Timestamp:", closeOracleTimestamp);
        console.log("");

        console.log("Total Bets:", totalAmount, "wei");
        console.log("Bull Bets:", bullAmount, "wei");
        console.log("Bear Bets:", bearAmount, "wei");
        console.log("");

        console.log("Reward Base:", rewardBaseCalAmount, "wei");
        console.log("Reward Amount:", rewardAmount, "wei");
        console.log("Oracle Called:", oracleCalled ? "YES" : "NO");
        console.log("");

        // Determine round state
        if (block.timestamp < lockTimestamp) {
            console.log("State: OPEN (Betting Phase)");
            console.log("Time until lock:", lockTimestamp - block.timestamp, "seconds");
        } else if (block.timestamp >= lockTimestamp && block.timestamp < closeTimestamp) {
            console.log("State: LOCKED (Waiting for close)");
            console.log("Time until close:", closeTimestamp - block.timestamp, "seconds");
        } else if (block.timestamp >= closeTimestamp && !oracleCalled) {
            console.log("State: AWAITING ORACLE (Ready to execute)");
        } else if (oracleCalled) {
            console.log("State: ENDED (Oracle called)");
            if (closePrice > lockPrice) {
                console.log("Result: BULL WINS");
            } else if (closePrice < lockPrice) {
                console.log("Result: BEAR WINS");
            } else {
                console.log("Result: HOUSE WINS (Tie)");
            }
        }
    }

    function _performHealthCheck(PancakePredictionV2Pyth prediction, uint256 currentEpoch) internal view {
        bool healthy = true;

        // Check 1: Contract not paused
        if (prediction.paused()) {
            console.log("WARNING: Contract is PAUSED");
            healthy = false;
        } else {
            console.log("OK: Contract is ACTIVE");
        }

        // Check 2: Genesis started
        if (!prediction.genesisStartOnce()) {
            console.log("WARNING: Genesis not started yet");
            healthy = false;
        } else {
            console.log("OK: Genesis started");
        }

        // Check 3: Genesis locked
        if (prediction.genesisStartOnce() && !prediction.genesisLockOnce()) {
            console.log("WARNING: Genesis started but not locked yet");
            healthy = false;
        } else if (prediction.genesisLockOnce()) {
            console.log("OK: Genesis locked");
        }

        // Check 4: Current epoch progress
        if (currentEpoch > 2) {
            (
                ,
                ,
                uint256 lockTimestamp,
                uint256 closeTimestamp,
                ,,,,,,,,,
                bool oracleCalled
            ) = prediction.rounds(currentEpoch - 1);

            if (block.timestamp > closeTimestamp && !oracleCalled) {
                console.log("WARNING: Previous round should have been executed");
                console.log("         Chainlink Automation may not be working");
                healthy = false;
            } else {
                console.log("OK: Rounds progressing normally");
            }
        }

        // Check 5: Oracle freshness
        if (prediction.oracleLatestTimestamp() > 0) {
            uint256 timeSinceLastOracle = block.timestamp - prediction.oracleLatestTimestamp();
            if (timeSinceLastOracle > prediction.oracleUpdateAllowance() * 2) {
                console.log("WARNING: Oracle data is stale");
                console.log("         Last update:", timeSinceLastOracle, "seconds ago");
                healthy = false;
            } else {
                console.log("OK: Oracle data is fresh");
            }
        }

        console.log("");
        if (healthy) {
            console.log("OVERALL STATUS: HEALTHY");
        } else {
            console.log("OVERALL STATUS: NEEDS ATTENTION");
        }
    }

    function _formatTimestamp(uint256 timestamp) internal pure returns (string memory) {
        if (timestamp == 0) return "(not set)";
        return "";
    }

    function _formatPrice(int256 price) internal pure returns (string memory) {
        if (price == 0) return "0 (not set)";
        return vm.toString(price);
    }
}

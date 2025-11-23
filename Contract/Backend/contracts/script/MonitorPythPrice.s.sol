// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import "@pythnetwork/IPyth.sol";

/**
 * @title MonitorPythPrice
 * @notice Monitor Pyth ETH/USD price updates every 5 seconds for 30 seconds
 * @dev Run with: forge script script/MonitorPythPrice.s.sol --rpc-url base_sepolia
 */
contract MonitorPythPrice is Script {
    // Base Sepolia Pyth contract
    address constant PYTH_CONTRACT = 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729;

    // ETH/USD Price Feed ID
    bytes32 constant ETH_USD_PRICE_ID = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    function run() external view {
        IPyth pyth = IPyth(PYTH_CONTRACT);

        console.log("\n========================================");
        console.log("  PYTH PRICE MONITOR - ETH/USD");
        console.log("========================================");
        console.log("Pyth Contract:", PYTH_CONTRACT);
        console.log("Price Feed ID:", vm.toString(ETH_USD_PRICE_ID));
        console.log("Interval: 5 seconds");
        console.log("Duration: 30 seconds (6 readings)");
        console.log("========================================\n");

        // Get initial price
        PythStructs.Price memory initialPrice = pyth.getPriceUnsafe(ETH_USD_PRICE_ID);

        console.log("=== Reading 1 (T=0s) ===");
        console.log("Block Number:", block.number);
        console.log("Block Timestamp:", block.timestamp);
        console.log("Price:", uint256(initialPrice.price));
        console.log("Expo:", int256(initialPrice.expo));
        console.log("Publish Time:", initialPrice.publishTime);
        console.log("Confidence:", uint256(initialPrice.conf));

        // Calculate human-readable price
        int256 humanPrice = int256(initialPrice.price);
        int32 expo = initialPrice.expo;

        if (expo == -8) {
            console.log("Human Price: $", uint256(humanPrice) / 1e8, ".", uint256(humanPrice) % 1e8);
        } else if (expo == -10) {
            console.log("Human Price: $", uint256(humanPrice) / 1e10, ".", uint256(humanPrice) % 1e10);
        }

        console.log("");
        console.log("NOTE: Pyth prices update continuously off-chain (~400ms)");
        console.log("On-chain prices reflect the latest price at time of query.");
        console.log("Price changes depend on market volatility, not update frequency.");
        console.log("");
        console.log("To see real-time updates, you need to:");
        console.log("1. Query the RPC every 5 seconds (done via shell script)");
        console.log("2. Pyth updates are pushed on-chain by Pyth's network");
        console.log("3. Updates happen when price moves significantly or time passes");
        console.log("");
        console.log("========================================");
        console.log("For live monitoring, use the shell script:");
        console.log("./monitor-pyth-price.sh");
        console.log("========================================\n");
    }
}

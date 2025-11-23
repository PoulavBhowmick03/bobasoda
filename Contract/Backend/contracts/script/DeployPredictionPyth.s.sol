// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import "../src/contracts/PancakePredictionV2Pyth.sol";

contract DeployPredictionPyth is Script {
    // Base Sepolia Pyth contract
    address constant PYTH_CONTRACT = 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729;

    // ETH/USD Price Feed ID on Pyth
    bytes32 constant ETH_USD_PRICE_ID = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    // Configuration - 60 SECOND INTERVALS WITH PYTH!
    uint256 constant INTERVAL_SECONDS = 60; // 1 minute - Pyth updates every 400ms!
    uint256 constant BUFFER_SECONDS = 120; // 120 seconds buffer (overlapping rounds need buffer > interval)
    uint256 constant MIN_BET_AMOUNT = 0.0001 ether; // 0.0001 ETH minimum bet
    uint256 constant ORACLE_UPDATE_ALLOWANCE = 300; // 5 minutes - max oracle staleness
    uint256 constant TREASURY_FEE = 300; // 3% (300 / 10000)

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("\n=== Deploying PancakePredictionV2Pyth to Base Sepolia ===");
        console.log("Deployer:", deployer);
        console.log("Pyth Contract:", PYTH_CONTRACT);
        console.log("ETH/USD Price ID:", vm.toString(ETH_USD_PRICE_ID));
        console.log("60-SECOND INTERVALS - Powered by Pyth Network!");
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        PancakePredictionV2Pyth prediction = new PancakePredictionV2Pyth(
            PYTH_CONTRACT,
            ETH_USD_PRICE_ID,
            deployer, // admin
            deployer, // operator
            INTERVAL_SECONDS,
            BUFFER_SECONDS,
            MIN_BET_AMOUNT,
            ORACLE_UPDATE_ALLOWANCE,
            TREASURY_FEE
        );

        vm.stopBroadcast();

        console.log("\n=== Deployment Successful ===");
        console.log("PancakePredictionV2Pyth deployed at:", address(prediction));
        console.log("");
        console.log("Configuration:");
        console.log("  - Admin:", deployer);
        console.log("  - Operator:", deployer);
        console.log("  - Pyth Contract:", PYTH_CONTRACT);
        console.log("  - Price Feed ID:", vm.toString(ETH_USD_PRICE_ID));
        console.log("  - Interval (seconds):", INTERVAL_SECONDS, "- FAST MODE WITH PYTH!");
        console.log("  - Buffer (seconds):", BUFFER_SECONDS);
        console.log("  - Min Bet (wei):", MIN_BET_AMOUNT);
        console.log("  - Oracle Update Allowance (seconds):", ORACLE_UPDATE_ALLOWANCE);
        console.log("  - Treasury Fee (bp):", TREASURY_FEE);
        console.log("");
        console.log("=== Contract Info for Frontend ===");
        console.log("  Contract Address:", address(prediction));
        console.log("  Network: Base Sepolia");
        console.log("  Chain ID: 84532");
        console.log("");
        console.log("=== Next Steps ===");
        console.log("  1. Start the first round: call genesisStartRound()");
        console.log("  2. Wait 60 seconds");
        console.log("  3. Lock the round: call genesisLockRound()");
        console.log("  4. Wait 60 seconds");
        console.log("  5. Execute rounds: call executeRound() every 60 seconds");
        console.log("");
    }
}

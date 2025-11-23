// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {PancakePredictionV2} from "../src/contracts/PancakePredictionV2.sol";

/**
 * @title DeployPredictionTest
 * @notice Deployment script for PancakePredictionV2 on Base Sepolia with SHORT intervals for testing
 * @dev Run with: forge script script/DeployPredictionTest.s.sol:DeployPredictionTest --rpc-url https://sepolia.base.org --broadcast -vvv
 */
contract DeployPredictionTest is Script {
    // Base Sepolia Chainlink ETH/USD Price Feed
    address constant CHAINLINK_ETH_USD = 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1;

    // Configuration - SHORT INTERVALS FOR TESTING
    uint256 constant INTERVAL_SECONDS = 300; // 5 minutes (matches oracle update frequency)
    uint256 constant BUFFER_SECONDS = 60; // 60 seconds buffer for easier manual testing
    uint256 constant MIN_BET_AMOUNT = 0.0001 ether; // 0.0001 ETH minimum bet
    uint256 constant ORACLE_UPDATE_ALLOWANCE = 3600; // 1 hour allowance
    uint256 constant TREASURY_FEE = 300; // 3% (300 / 10000)

    function run() public {
        // Get deployer address from private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("\n=== Deploying PancakePredictionV2 (TEST MODE) to Base Sepolia ===");
        console.log("Deployer:", deployer);
        console.log("Chainlink Oracle:", CHAINLINK_ETH_USD);
        console.log("TEST MODE: 60-second intervals for easier testing!");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy PancakePredictionV2
        PancakePredictionV2 prediction = new PancakePredictionV2(
            CHAINLINK_ETH_USD,      // Oracle address
            deployer,                // Admin address
            deployer,                // Operator address
            INTERVAL_SECONDS,
            BUFFER_SECONDS,
            MIN_BET_AMOUNT,
            ORACLE_UPDATE_ALLOWANCE,
            TREASURY_FEE
        );

        console.log("\n=== Deployment Successful ===");
        console.log("PancakePredictionV2 deployed at:", address(prediction));
        console.log("\nConfiguration:");
        console.log("- Admin:", prediction.adminAddress());
        console.log("- Operator:", prediction.operatorAddress());
        console.log("- Oracle:", address(prediction.oracle()));
        console.log("- Interval (seconds):", prediction.intervalSeconds(), "FAST MODE");
        console.log("- Buffer (seconds):", prediction.bufferSeconds());
        console.log("- Min Bet (wei):", prediction.minBetAmount());
        console.log("- Treasury Fee (bp):", prediction.treasuryFee());

        console.log("\n=== Contract Info for Frontend ===");
        console.log("Contract Address:", address(prediction));
        console.log("Network: Base Sepolia");
        console.log("Chain ID: 84532");

        console.log("\n=== Next Steps ===");
        console.log("1. Start the first round: call genesisStartRound()");
        console.log("2. Wait 20 seconds");
        console.log("3. Lock the round: call genesisLockRound()");
        console.log("4. Wait 20 seconds");
        console.log("5. Execute rounds: call executeRound() every 20 seconds");

        vm.stopBroadcast();

        // Save deployment info to file
        string memory deploymentInfo = string(
            abi.encodePacked(
                '{\n',
                '  "network": "Base Sepolia",\n',
                '  "chainId": 84532,\n',
                '  "mode": "TEST - 20 second intervals",\n',
                '  "contractAddress": "', vm.toString(address(prediction)), '",\n',
                '  "oracle": "', vm.toString(CHAINLINK_ETH_USD), '",\n',
                '  "admin": "', vm.toString(deployer), '",\n',
                '  "operator": "', vm.toString(deployer), '",\n',
                '  "intervalSeconds": ', vm.toString(INTERVAL_SECONDS), ',\n',
                '  "bufferSeconds": ', vm.toString(BUFFER_SECONDS), ',\n',
                '  "minBetAmount": "', vm.toString(MIN_BET_AMOUNT), '",\n',
                '  "treasuryFee": ', vm.toString(TREASURY_FEE), '\n',
                '}'
            )
        );

        vm.writeFile("deployments/base-sepolia-test.json", deploymentInfo);
        console.log("\nDeployment info saved to: deployments/base-sepolia-test.json");
    }
}

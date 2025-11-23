// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {PancakePredictionV2} from "../src/contracts/PancakePredictionV2.sol";

/**
 * @title DeployPrediction
 * @notice Deployment script for PancakePredictionV2 on Base Sepolia
 * @dev Run with: forge script script/DeployPrediction.s.sol:DeployPrediction --rpc-url base_sepolia --broadcast -vvv
 */
contract DeployPrediction is Script {
    // Base Sepolia Chainlink ETH/USD Price Feed
    address constant CHAINLINK_ETH_USD = 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1;

    // Configuration
    uint256 constant INTERVAL_SECONDS = 300; // 5 minutes
    uint256 constant BUFFER_SECONDS = 30;
    uint256 constant MIN_BET_AMOUNT = 0.001 ether; // 0.001 ETH minimum bet
    uint256 constant ORACLE_UPDATE_ALLOWANCE = 60; // 60 seconds
    uint256 constant TREASURY_FEE = 300; // 3% (300 / 10000)

    function run() public {
        // Get deployer address from private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("\n=== Deploying PancakePredictionV2 to Base Sepolia ===");
        console.log("Deployer:", deployer);
        console.log("Chainlink Oracle:", CHAINLINK_ETH_USD);

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
        console.log("- Interval (seconds):", prediction.intervalSeconds());
        console.log("- Buffer (seconds):", prediction.bufferSeconds());
        console.log("- Min Bet (wei):", prediction.minBetAmount());
        console.log("- Treasury Fee (bp):", prediction.treasuryFee());

        console.log("\n=== Contract Info for Frontend ===");
        console.log("Contract Address:", address(prediction));
        console.log("Network: Base Sepolia");
        console.log("Chain ID: 84532");

        console.log("\n=== Next Steps ===");
        console.log("1. Start the first round: call genesisStartRound()");
        console.log("2. Export ABI: forge inspect PancakePredictionV2 abi > abi/PancakePredictionV2.json");
        console.log("3. Update frontend with contract address:", address(prediction));

        vm.stopBroadcast();

        // Save deployment info to file
        string memory deploymentInfo = string(
            abi.encodePacked(
                '{\n',
                '  "network": "Base Sepolia",\n',
                '  "chainId": 84532,\n',
                '  "contractAddress": "', vm.toString(address(prediction)), '",\n',
                '  "oracle": "', vm.toString(CHAINLINK_ETH_USD), '",\n',
                '  "admin": "', vm.toString(deployer), '",\n',
                '  "operator": "', vm.toString(deployer), '",\n',
                '  "intervalSeconds": ', vm.toString(INTERVAL_SECONDS), ',\n',
                '  "minBetAmount": "', vm.toString(MIN_BET_AMOUNT), '",\n',
                '  "treasuryFee": ', vm.toString(TREASURY_FEE), '\n',
                '}'
            )
        );

        vm.writeFile("deployments/base-sepolia.json", deploymentInfo);
        console.log("\nDeployment info saved to: deployments/base-sepolia.json");
    }
}

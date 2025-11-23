// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/PredictionV3.sol";

contract DeployPredictionV3 is Script {
    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address pythContract = vm.envAddress("PYTH_CONTRACT");
        bytes32 priceId = vm.envBytes32("ETH_USD_PRICE_ID");
        address adminAddress = vm.envAddress("ADMIN_ADDRESS");
        address operatorAddress = vm.envAddress("OPERATOR_ADDRESS");
        uint256 intervalSeconds = vm.envUint("INTERVAL_SECONDS");
        uint256 bufferSeconds = vm.envUint("BUFFER_SECONDS");
        uint256 minBetAmount = vm.envUint("MIN_BET_AMOUNT");
        uint256 oracleUpdateAllowance = vm.envUint("ORACLE_UPDATE_ALLOWANCE");
        uint256 treasuryFee = vm.envUint("TREASURY_FEE");

        console.log("=== Deploying PredictionV3 to Base Sepolia ===");
        console.log("Pyth Contract:", pythContract);
        console.log("Price Feed ID:");
        console.logBytes32(priceId);
        console.log("Admin:", adminAddress);
        console.log("Operator:", operatorAddress);
        console.log("Interval:", intervalSeconds, "seconds");
        console.log("Buffer:", bufferSeconds, "seconds");
        console.log("Min Bet:", minBetAmount, "wei");
        console.log("Oracle Update Allowance:", oracleUpdateAllowance, "seconds");
        console.log("Treasury Fee:", treasuryFee, "(3% = 300)");

        vm.startBroadcast(deployerPrivateKey);

        PancakePredictionV2Pyth prediction = new PancakePredictionV2Pyth(
            pythContract,
            priceId,
            adminAddress,
            operatorAddress,
            intervalSeconds,
            bufferSeconds,
            minBetAmount,
            oracleUpdateAllowance,
            treasuryFee
        );

        vm.stopBroadcast();

        console.log("\n=== Deployment Successful! ===");
        console.log("Contract Address:", address(prediction));
        console.log("\nNext steps:");
        console.log("1. Verify contract on BaseScan");
        console.log("2. Call genesisStartRound() to initialize");
        console.log("3. Call genesisLockRound() after interval to start rounds");
    }
}

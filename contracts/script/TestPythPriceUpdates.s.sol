// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "@pythnetwork/IPyth.sol";
import "@pythnetwork/PythStructs.sol";

/**
 * @title TestPythPriceUpdates
 * @notice Minimalist script to test reading Pyth prices
 */
contract TestPythPriceUpdates is Script {
    IPyth public pyth = IPyth(0xA2aa501b19aff244D90cc15a4Cf739D2725B5729); // Base Sepolia

    function run() external {
        bytes32 priceFeedId = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace; // ETH/USD

        console.log("Reading ETH/USD price from Pyth on Base Sepolia");
        console.log("This will show the latest on-chain price\n");

        PythStructs.Price memory price = pyth.getPriceNoOlderThan(priceFeedId, 60);

        console.log("ETH/USD Price:");
        console.log("  Raw: %s", vm.toString(price.price));
        console.log("  Exponent: %s", vm.toString(price.expo));
        console.log("  Human: $%s.%s",
            uint256(int256(price.price)) / 1e8,
            (uint256(int256(price.price)) % 1e8) / 1e6
        );
        console.log("  Publish Time: %s", price.publishTime);
        console.log("  Confidence: %s", price.conf);
        console.log("  Age: %s seconds", block.timestamp - price.publishTime);
    }
}

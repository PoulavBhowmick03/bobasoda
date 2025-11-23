// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "@pythnetwork/IPyth.sol";
import "@pythnetwork/PythStructs.sol";

/**
 * @title MonitorPrice
 * @notice Script to monitor ETH/USD price changes from Pyth
 */
contract MonitorPrice is Script {
    IPyth public pyth = IPyth(0xA2aa501b19aff244D90cc15a4Cf739D2725B5729); // Base Sepolia
    bytes32 public priceFeedId = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace; // ETH/USD

    function run() external view {
        console.log("Reading ETH/USD price from Pyth on Base Sepolia");
        console.log("Timestamp: %s\n", block.timestamp);

        PythStructs.Price memory price = pyth.getPriceNoOlderThan(priceFeedId, 60);

        console.log("ETH/USD Price:");
        console.log("  Raw Price: %s", vm.toString(price.price));
        console.log("  Exponent: %s", vm.toString(price.expo));

        // Calculate human-readable price
        uint256 priceUint = uint256(int256(price.price));
        uint256 dollars = priceUint / 1e8;
        uint256 cents = (priceUint % 1e8) / 1e6;

        console.log("  Human Readable: $%s.%s", dollars, cents);
        console.log("  Publish Time: %s", price.publishTime);
        console.log("  Confidence: %s", price.conf);
        console.log("  Age: %s seconds\n", block.timestamp - price.publishTime);
    }
}

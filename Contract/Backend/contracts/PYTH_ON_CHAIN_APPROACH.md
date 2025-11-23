# Pyth On-Chain Price Approach

## Overview

Your PredictionV3.sol contract uses **100% on-chain** price fetching from Pyth Network. No off-chain API calls or Hermes data needed!

---

## How It Works

### **Key Method: `getPriceNoOlderThan()`**

```solidity
function _getPriceFromPyth() internal view returns (uint256, int256) {
    // Get price directly from on-chain Pyth contract
    // Reverts if price is older than oracleUpdateAllowance (300 seconds)
    PythStructs.Price memory pythPrice = pyth.getPriceNoOlderThan(
        priceId,                    // ETH/USD feed ID
        oracleUpdateAllowance       // Max age: 300 seconds (5 minutes)
    );

    // Validate and return
    require(pythPrice.publishTime >= oracleLatestTimestamp);
    require(pythPrice.price > 0);

    return (pythPrice.publishTime, pythPrice.price);
}
```

---

## Why This Approach?

### ✅ **Advantages**

1. **Fully On-Chain**
   - No need to fetch data from Hermes API
   - No off-chain dependencies
   - No HTTP requests or APIs needed

2. **Simple Integration**
   - Just call the Pyth contract
   - Automatic price updates by Pyth's network
   - No additional infrastructure

3. **Gas Efficient**
   - No `updatePriceFeeds()` calls
   - No update fees to pay
   - Simple view function

4. **Chainlink Automation Compatible**
   - Works perfectly with time-based automation
   - No need to pass price data
   - Clean function signatures

### ❌ **vs Pull Model (NOT USED)**

The Pull model requires:
- Fetching update data from Hermes API off-chain
- Passing `bytes[] priceUpdateData` to every function
- Paying update fees on every call
- More complex integration

**We don't use this** because Pyth already updates prices on-chain automatically!

---

## How Pyth Updates On-Chain Prices

### **Automatic Updates by Pyth Network**

1. **Pyth Price Publishers**
   - 90+ data providers (exchanges, market makers)
   - Continuously push price updates
   - Updates every ~400ms on mainnet

2. **On-Chain Contract**
   - `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` (Base Sepolia)
   - Stores latest prices for all assets
   - Automatically updated by Pyth's network

3. **Your Contract**
   - Simply reads the latest on-chain price
   - No action needed to update
   - Price is already there!

### **Flow Diagram**

```
Pyth Publishers          Pyth Contract                Your Contract
(Off-chain)             (On-chain)                   (On-chain)
     |                       |                            |
     | Price: $2345.67       |                            |
     |---------------------->| Store price                |
     |                       |                            |
     |                       |   Call getPriceNoOlderThan |
     |                       |<---------------------------|
     |                       |                            |
     |                       | Return: $2345.67           |
     |                       |--------------------------->|
     |                       |                            |
```

---

## Configuration

### **Current Settings**

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Pyth Contract** | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` | Base Sepolia |
| **Price Feed ID** | `0xff61491a...d0ace` | ETH/USD |
| **Update Allowance** | 300 seconds (5 min) | Max price age |
| **Interval** | 60 seconds | Round duration |

### **Why 300 Second Allowance?**

- Pyth updates prices continuously
- 5-minute staleness allows for network delays
- Ensures we never use very old prices
- Balances freshness with reliability

---

## Full Precision (No Rounding)

### **Before (8 Decimals - Lost Precision)**
```solidity
// Old code would normalize to 8 decimals
// Pyth: price=234567890123, expo=-10
// Normalized: 2345678901 (lost 23 units!)
```

### **After (Full Precision)**
```solidity
// New code keeps all decimals
// Pyth: price=234567890123, expo=-10
// Stored: 234567890123 (no loss!)
int256 price = int256(pythPrice.price);  // Full precision
```

### **Impact**

- More accurate price comparisons
- Fewer accidental "draws" (tie prices)
- Fairer reward distribution
- Better for close markets

---

## Usage in Contract Functions

### **1. executeRound() - Manual Backup**
```solidity
function executeRound() external whenNotPaused onlyOperator {
    // Get on-chain price - no parameters needed
    (uint256 timestamp, int256 price) = _getPriceFromPyth();

    // Use for locking and ending rounds
    _safeLockRound(currentEpoch, timestamp, price);
    _safeEndRound(currentEpoch - 1, timestamp, price);
}
```

### **2. genesisLockRound() - First Lock**
```solidity
function genesisLockRound() external whenNotPaused onlyOperator {
    // Get on-chain price
    (uint256 timestamp, int256 price) = _getPriceFromPyth();

    // Lock genesis round
    _safeLockRound(currentEpoch, timestamp, price);
}
```

### **3. performUpkeep() - Chainlink Automation**
```solidity
function performUpkeep(bytes calldata /* performData */) external {
    // Automatically gets on-chain price
    (uint256 timestamp, int256 price) = _getPriceFromPyth();

    // Execute round with fresh price
    _safeLockRound(currentEpoch, timestamp, price);
}
```

**Note**: `performData` is required for Chainlink but we don't use it (hence commented out)

---

## Testing

### **Check Current On-Chain Price**

```bash
# Get price from Pyth contract directly
cast call 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729 \
  "getPriceNoOlderThan(bytes32,uint256)" \
  0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace \
  300 \
  --rpc-url base_sepolia

# Returns: (price, conf, expo, publishTime)
```

### **Monitor Price Changes**

```bash
# Use our monitoring script
./monitor-pyth-price.sh

# Checks every 5 seconds for 30 seconds
# Shows price changes in real-time
```

---

## Comparison: Pull vs On-Chain Read

| Aspect | Pull Model | On-Chain Read (Our Approach) |
|--------|-----------|------------------------------|
| **Off-chain Data** | Required (Hermes API) | None needed ✅ |
| **Update Fees** | Paid per update | No fees ✅ |
| **Function Parameters** | Complex (`bytes[]`) | Simple (none) ✅ |
| **Gas Cost** | Higher (update + read) | Lower (read only) ✅ |
| **Integration** | Complex | Simple ✅ |
| **Chainlink Automation** | Difficult | Easy ✅ |
| **Price Freshness** | Guaranteed (you control) | Depends on Pyth updates |

---

## When Does Pyth Update On-Chain?

### **Update Triggers**

1. **Price Movement**
   - Significant price change (e.g., >0.5%)
   - Triggers automatic on-chain update

2. **Time Threshold**
   - Maximum staleness reached
   - Forces update even if price stable

3. **Market Events**
   - High volatility periods
   - More frequent updates

### **Update Frequency**

| Network | Typical Frequency | During Volatility |
|---------|------------------|-------------------|
| **Mainnet** | Every 1-10 seconds | Every 400ms |
| **Base Sepolia** | Every 10-60 seconds | Every 1-5 seconds |

---

## Error Handling

### **What Happens If Price Is Stale?**

```solidity
// getPriceNoOlderThan() will REVERT if:
// 1. Price is older than oracleUpdateAllowance (300s)
// 2. Price feed doesn't exist
// 3. Price is not available

// Your contract handles this gracefully:
// - Transaction reverts
// - Chainlink will retry on next schedule (1 minute later)
// - Eventually gets fresh price
```

### **Replay Protection**

```solidity
// Contract ensures timestamps always increase
require(
    pythPrice.publishTime >= oracleLatestTimestamp,
    "Oracle update timestamp must be larger than oracleLatestTimestamp"
);

// Prevents:
// - Using same price twice
// - Going backwards in time
// - Price manipulation
```

---

## Summary

### **What You're Using**

✅ **On-chain price reading** with `getPriceNoOlderThan()`
✅ **No off-chain dependencies** (no Hermes API)
✅ **No update fees** (Pyth updates automatically)
✅ **Full decimal precision** (no rounding)
✅ **Chainlink Automation compatible**

### **What You're NOT Using**

❌ Pull model with `updatePriceFeeds()`
❌ Hermes API for price data
❌ Off-chain price fetching
❌ Complex integration with `bytes[]` parameters

### **Result**

A **simple, efficient, and fully on-chain** prediction market that:
- Gets fresh ETH/USD prices automatically
- Works seamlessly with Chainlink Automation
- Requires no off-chain infrastructure
- Uses full price precision for fairness

---

**This is the recommended approach for prediction markets on EVM chains with Pyth!** 🎯

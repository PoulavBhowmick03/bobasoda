# Chainlink Time-Based Automation Setup Guide

## Overview

This guide documents the implementation of Chainlink Time-Based Automation for the PancakePredictionV2Pyth prediction market contract. Chainlink Automation will automatically execute rounds every 60 seconds without manual intervention.

## Contract Design

### Time-Based vs Custom Logic

**We use TIME-BASED automation (not Custom Logic):**
- ✅ CRON schedule: `* * * * *` (every minute)
- ✅ No `checkUpkeep()` function needed
- ✅ Chainlink calls `performUpkeep()` every minute automatically
- ✅ Contract handles genesis phases internally

### Overlapping Rounds Architecture

Following PancakeSwap V3's design, rounds overlap:

```
Round 1: [--OPEN--][--LOCKED--]CLOSE
Round 2:           [--OPEN--][--LOCKED--]CLOSE
Round 3:                     [--OPEN--][--LOCKED--]CLOSE
Time:    0:00      1:00      2:00      3:00      4:00
```

**Key Points:**
- Each round lasts 2 minutes (2 × interval)
- New round starts every minute
- Always 2-3 rounds active simultaneously

### Critical Timing Requirements

**Interval vs Buffer:**
```
Interval: 60 seconds (round frequency)
Buffer: 120 seconds (execution window)

Why buffer > interval?
Execution window = buffer - interval
                 = 120s - 60s = 60 seconds ✅
```

**Round Timeline:**
```
20:24:00 → Round starts
20:25:00 → Lock timestamp (can start executing)
20:26:00 → Close timestamp (must execute by now)
20:27:00 → Buffer expires (lockTimestamp + 120s)

Valid execution window: 20:26:00 to 20:27:00 (60 seconds)
```

**With buffer=60s:** Window would be 0 seconds ❌
**With buffer=120s:** Window is 60 seconds ✅

## Contract Implementation

### performUpkeep() Function

**Lines 330-373 in PancakePredictionV2Pyth.sol**

```solidity
function performUpkeep(bytes calldata /* performData */) external {
    require(!paused(), "Contract is paused");

    // Handle genesis rounds automatically
    if (!genesisStartOnce) {
        // First execution: Start genesis
        currentEpoch = currentEpoch + 1;
        _startRound(currentEpoch);
        genesisStartOnce = true;
        return;
    }

    if (!genesisLockOnce) {
        // Second execution: Lock genesis
        require(block.timestamp >= rounds[currentEpoch].lockTimestamp);
        require(block.timestamp <= rounds[currentEpoch].lockTimestamp + bufferSeconds);

        (uint256 oracleTimestamp, int256 price) = _getPriceFromPyth();
        _safeLockRound(currentEpoch, oracleTimestamp, price);

        currentEpoch = currentEpoch + 1;
        _startRound(currentEpoch);
        genesisLockOnce = true;
        return;
    }

    // Normal execution: Both genesis rounds completed
    require(currentEpoch > 0, "No active epoch");
    require(block.timestamp >= rounds[currentEpoch].closeTimestamp, "Too early to execute");

    (uint256 currentOracleTimestamp, int256 currentPrice) = _getPriceFromPyth();

    _safeLockRound(currentEpoch, currentOracleTimestamp, currentPrice);
    _safeEndRound(currentEpoch - 1, currentOracleTimestamp, currentPrice);
    _calculateRewards(currentEpoch - 1);

    currentEpoch = currentEpoch + 1;
    _safeStartRound(currentEpoch);
}
```

**Features:**
- ✅ Automatic genesis handling (no manual start needed!)
- ✅ Buffer window validation
- ✅ Pyth oracle integration with timestamp tracking
- ✅ Can be called by anyone (Chainlink nodes)

## Deployment Steps

### Prerequisites

1. Base Sepolia ETH for gas fees
2. LINK tokens for Chainlink Automation (5+ LINK recommended)
3. Private key set in `.env` file:
   ```bash
   PRIVATE_KEY=your_private_key_here
   ```

### Step 1: Deploy the Contract

```bash
# Navigate to contracts directory
cd Contract/Backend/contracts

# Deploy to Base Sepolia
forge script script/DeployPredictionPyth.s.sol:DeployPredictionPyth --rpc-url base_sepolia --broadcast --verify
```

**Current Configuration:**
- Interval: 60 seconds
- Buffer: 120 seconds
- Min Bet Amount: 0.0001 ETH
- Treasury Fee: 3%
- Oracle Update Allowance: 300 seconds

**Save the deployed contract address!**

### Step 2: Register Chainlink Time-Based Automation

**IMPORTANT:** Do this immediately after deployment!

1. **Visit**: https://automation.chain.link/

2. **Connect Wallet**:
   - Switch to Base Sepolia network
   - Connect your wallet

3. **Click**: "Register new Upkeep"

4. **Select Trigger**: "Time-based" (NOT Custom logic!)

5. **Fill in Details**:

   **Target contract address:**
   ```
   0xF521D33924dfF881193956Ad7c6e10AB2eA54a39
   ```

   **Contract ABI:**
   - Upload or paste from: `PancakePredictionV2Pyth-abi.json`

   **Target function:**
   - Select: `performUpkeep(bytes)`

   **Time schedule (CRON expression):**
   ```
   * * * * *
   ```
   (Every minute)

   **Function inputs:**
   ```
   0x
   ```
   (Empty bytes)

   **Upkeep name:**
   ```
   PancakePrediction Pyth - 1min rounds
   ```

   **Gas limit:**
   ```
   500000
   ```

   **Starting balance:**
   ```
   5 LINK (minimum)
   ```

   **Your email:** Your notification email

6. **Review & Confirm**:
   - Review all details
   - Sign the transaction
   - Wait for confirmation

7. **Monitor**:
   - Note your Upkeep ID
   - Watch the dashboard for first execution

## How It Works

### Automatic Execution Flow

```
Call 1 (0:00): performUpkeep()
  → Genesis Start (Epoch 1 created)
  → Round 1: start=0:00, lock=1:00, close=2:00

Call 2 (1:00): performUpkeep()
  → Genesis Lock (Round 1 locked)
  → Round 2 created: start=1:00, lock=2:00, close=3:00

Call 3 (2:00): performUpkeep()
  → Lock Round 2
  → End Round 1
  → Calculate Round 1 rewards
  → Start Round 3

Call 4 (3:00): performUpkeep()
  → Lock Round 3
  → End Round 2
  → Calculate Round 2 rewards
  → Start Round 4

...continues indefinitely every minute
```

### Why Chainlink Calls Work

**CRON triggers at:** `:00` every minute
**Round closes at:** Previous minute + 2:00

Example:
- Round 3 started: 20:25:00
- Round 3 closes: 20:27:00 (start + 120s)
- Chainlink triggers: 20:27:00 ✅
- Buffer window: 20:26:00 to 20:27:00 ✅

Perfect alignment with 60s CRON!

## Monitoring

### Use the Monitoring Script

```bash
cd Contract/Backend/contracts
./check-prediction.sh
```

**Shows:**
- Current epoch number
- Contract status (ACTIVE/PAUSED)
- Genesis completion status
- Lock and close prices for last 3 rounds
- Execution status

**Polls every 30 seconds automatically**

### Manual Checks

```bash
# Check current epoch
cast call 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39 "currentEpoch()(uint256)" --rpc-url base_sepolia

# Check if paused
cast call 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39 "paused()(bool)" --rpc-url base_sepolia

# Check genesis status
cast call 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39 "genesisStartOnce()(bool)" --rpc-url base_sepolia
cast call 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39 "genesisLockOnce()(bool)" --rpc-url base_sepolia

# Get round info
cast call 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39 "rounds(uint256)" <EPOCH> --rpc-url base_sepolia
```

### Chainlink Dashboard

Visit: https://automation.chain.link/

- View execution history
- Monitor LINK balance
- Check transaction logs
- View upkeep health

## Troubleshooting

### Market Stuck at Same Epoch

**Symptoms:** Epoch not increasing after 2+ minutes

**Possible Causes:**

1. **Chainlink not registered**
   - Solution: Register time-based upkeep immediately

2. **Out of LINK**
   - Check balance at automation.chain.link
   - Top up with 5+ LINK

3. **Contract paused**
   ```bash
   cast call 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39 "paused()" --rpc-url base_sepolia
   ```
   - If true, call `unpause()` as admin

4. **Buffer too small** (old deployments)
   - If buffer = 60s, redeploy with buffer = 120s
   - Current deployment has correct 120s buffer ✅

### Genesis Not Starting

**Check:**
```bash
cast call 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39 "genesisStartOnce()" --rpc-url base_sepolia
```

**If false:**
- Chainlink automation will start it automatically on first call
- Or manually call: `cast send 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39 "performUpkeep(bytes)" 0x --rpc-url base_sepolia --private-key $PRIVATE_KEY`

### Understanding Buffer Window Errors

**Error:** "Can only lock round within bufferSeconds"

**Cause:** Execution happened outside the buffer window

**Math:**
```
Must execute between:
  rounds[epoch].lockTimestamp
  and
  rounds[epoch].lockTimestamp + bufferSeconds
```

**Solution:** Ensure buffer ≥ 120s (already set correctly)

## Cost Estimates

### Deployment
- **Gas**: ~4M gas
- **Cost**: ~$0.50-$2 on Base Sepolia

### Per Round Execution
- **Gas**: ~200-400K gas per round
- **LINK**: ~0.001-0.002 LINK per execution

### Monthly Cost
- **Executions**: ~43,200 per month (every minute)
- **LINK needed**: ~50-100 LINK per month
- **Note:** Costs vary with LINK price and gas prices

## Security Considerations

### Access Control

- ✅ `performUpkeep()`: Can be called by anyone, but has strict validation
- ✅ Admin functions: Only admin can pause/unpause
- ✅ No operator needed: Chainlink handles all automation

### Validation in performUpkeep()

1. Contract must not be paused
2. Genesis phases handled automatically
3. Must be past closeTimestamp for normal execution
4. Buffer window enforced (120s after lockTimestamp)
5. Oracle validation (Pyth timestamp must advance)

## Configuration Reference

### Current Deployment

| Parameter | Value | Reason |
|-----------|-------|--------|
| **Contract** | `0xF521D33924dfF881193956Ad7c6e10AB2eA54a39` | Latest deployment |
| **Network** | Base Sepolia | Testnet |
| **Chain ID** | 84532 | Base Sepolia |
| **Interval** | 60 seconds | 1-minute rounds |
| **Buffer** | 120 seconds | 60s execution window (buffer - interval) |
| **Min Bet** | 0.0001 ETH | Minimum bet amount |
| **Treasury Fee** | 3% (300 bp) | Fee on rewards |
| **Oracle Allowance** | 300 seconds | Max oracle staleness |
| **Pyth Contract** | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` | Base Sepolia Pyth |
| **Price Feed** | ETH/USD | `0xff614...d0ace` |
| **CRON Schedule** | `* * * * *` | Every minute |

## References

- **Chainlink Time-Based Automation**: https://docs.chain.link/chainlink-automation/guides/job-scheduler
- **Chainlink Automation App**: https://automation.chain.link/
- **Base Sepolia Explorer**: https://sepolia.basescan.org/
- **Pyth Network Docs**: https://docs.pyth.network/
- **Contract Source**: `src/contracts/PancakePredictionV2Pyth.sol`

## Support

If you encounter issues:

1. **Check monitoring script output**
   ```bash
   ./check-prediction.sh
   ```

2. **Review Chainlink dashboard**
   - Execution history
   - LINK balance
   - Error logs

3. **Verify contract state**
   - Current epoch
   - Paused status
   - Genesis completion

4. **Check buffer configuration**
   - Must be 120s for reliable operation
   - Current deployment has correct value ✅

---

**Last Updated**: 2025-11-09
**Contract Version**: v2 with Time-Based Automation
**Status**: ✅ Production Ready

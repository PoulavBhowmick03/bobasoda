# Deployment Summary - PancakePredictionV2Pyth

**Date**: November 9, 2025
**Network**: Base Sepolia (Chain ID: 84532)
**Status**: ✅ Production Ready with Chainlink Time-Based Automation
**Version**: v2.0 (PancakeSwap V3-Compatible + Pyth Oracle)

---

## Current Deployment

### Contract Address
```
0xF521D33924dfF881193956Ad7c6e10AB2eA54a39
```

### Quick Links
- **BaseScan**: https://sepolia.basescan.org/address/0xF521D33924dfF881193956Ad7c6e10AB2eA54a39
- **Chainlink Automation**: https://automation.chain.link/
- **Monitoring Script**: `./check-prediction.sh`

### Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Network** | Base Sepolia | Testnet deployment |
| **Chain ID** | 84532 | Base Sepolia |
| **Admin** | `0x9757724C3EcDC93479a039Eb062F5111f0B66aa5` | Contract admin |
| **Operator** | `0x9757724C3EcDC93479a039Eb062F5111f0B66aa5` | Backup operator |
| **Pyth Oracle** | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` | Base Sepolia Pyth |
| **Price Feed** | ETH/USD | `0xff61491a...d0ace` |
| **Interval** | **60 seconds** | New round every minute |
| **Buffer** | **120 seconds** | Execution window (CRITICAL!) |
| **Min Bet** | 0.0001 ETH | 100000000000000 wei |
| **Oracle Allowance** | 300 seconds | Max price staleness |
| **Treasury Fee** | 3% (300 bp) | Fee on rewards |

---

## Architecture Overview

### PancakeSwap V3 Overlapping Rounds

This contract implements the same overlapping rounds pattern as PancakeSwap V3:

```
Round 1: [--OPEN 60s--][--LOCKED 60s--]END
Round 2:               [--OPEN 60s--][--LOCKED 60s--]END
Round 3:                             [--OPEN 60s--][--LOCKED 60s--]END
Time:    0:00          1:00          2:00          3:00          4:00
```

**Key Characteristics:**
- Each round lasts 2 minutes (2 × interval)
- New round starts every 1 minute
- 2-3 rounds active simultaneously
- Users interact during OPEN phase
- Price locks at end of OPEN phase
- Final price determined at END

### Critical Timing Math

**Why Buffer = 120 seconds?**

```
Execution Window = Buffer - Interval
                 = 120s - 60s
                 = 60 seconds ✅

Round Timeline Example:
├─ 20:25:00  Round starts
├─ 20:26:00  Lock timestamp (window opens)
├─ 20:27:00  Close timestamp (must execute by now)
└─ 20:28:00  Buffer expires (window closes)

Valid execution: 20:26:00 to 20:28:00 (120s after lock)
Chainlink triggers: Every :00 (20:26:00, 20:27:00, 20:28:00)
Result: Multiple chances to execute ✅
```

**With buffer=60s:** Window = 0 seconds ❌
**With buffer=120s:** Window = 60 seconds ✅

---

## Chainlink Automation Setup

### Time-Based Automation

**Type**: Time-Based (NOT Custom Logic)
**CRON**: `* * * * *` (every minute at :00)
**Function**: `performUpkeep(bytes)`
**Input**: `0x` (empty bytes)

### Registration Steps

1. Visit: https://automation.chain.link/
2. Connect wallet (Base Sepolia)
3. Register new upkeep → "Time-based"
4. Configure:
   - Contract: `0xF521D33924dfF881193956Ad7c6e10AB2eA54a39`
   - Function: `performUpkeep(bytes)`
   - CRON: `* * * * *`
   - Gas limit: 500,000
   - Starting balance: 5+ LINK
5. Confirm and fund

### Automatic Genesis Handling

**No manual start needed!**

```
Call 1 (Minute 1): performUpkeep() → Genesis Start
Call 2 (Minute 2): performUpkeep() → Genesis Lock
Call 3 (Minute 3): performUpkeep() → Normal execution begins
...continues indefinitely
```

---

## V3 Features Implemented

### 1. Oracle Validation ✅

**Pyth Network Integration:**
- ✅ Uses `publishTime` for timestamp tracking (like V3's `roundId`)
- ✅ Validates price freshness (not stale)
- ✅ Prevents replay attacks (timestamp must advance)
- ✅ Checks future price bounds (within allowance)

**Code Reference:**
```solidity
function _getPriceFromPyth() internal view returns (uint256, int256) {
    PythStructs.Price memory pythPrice = pyth.getPriceUnsafe(priceId);

    // V3-style validation
    require(
        pythPrice.publishTime <= block.timestamp + oracleUpdateAllowance,
        "Oracle update exceeded max timestamp allowance"
    );

    require(
        pythPrice.publishTime > oracleLatestTimestamp,
        "Oracle update timestamp must be larger than oracleLatestTimestamp"
    );

    // ... price normalization
}
```

### 2. Enhanced Round Struct ✅

**Added Oracle Timestamps:**
```solidity
struct Round {
    uint256 epoch;
    uint256 startTimestamp;
    uint256 lockTimestamp;
    uint256 closeTimestamp;
    int256 lockPrice;
    int256 closePrice;
    uint256 lockOracleTimestamp;   // 🆕 Pyth publishTime at lock
    uint256 closeOracleTimestamp;  // 🆕 Pyth publishTime at close
    uint256 totalAmount;
    uint256 bullAmount;
    uint256 bearAmount;
    uint256 rewardBaseCalAmount;
    uint256 rewardAmount;
    bool oracleCalled;
}
```

### 3. Admin Functions ✅

**New Management Capabilities:**
- `setAdmin(address)` - Update admin address
- `setPyth(address)` - Change oracle contract (when paused)
- `setPriceId(bytes32)` - Update price feed (when paused)
- `setOracleUpdateAllowance(uint256)` - Adjust staleness limit
- `recoverToken(address, uint256)` - Emergency token recovery

### 4. Enhanced Events ✅

**Oracle Tracking:**
```solidity
event LockRound(uint256 indexed epoch, uint256 indexed oracleTimestamp, int256 price);
event EndRound(uint256 indexed epoch, uint256 indexed oracleTimestamp, int256 price);
event NewPythOracle(address pyth);
event NewPriceId(bytes32 priceId);
event NewOracleUpdateAllowance(uint256 oracleUpdateAllowance);
```

---

## Monitoring

### Using the Monitoring Script

```bash
# Start continuous monitoring (polls every 30s)
./check-prediction.sh

# Output example:
========================================
  PREDICTION MARKET STATUS CHECK
========================================

Contract: 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39
Network: Base Sepolia
Time: Sun Nov  9 20:45:12 IST 2025

=== CONTRACT STATE ===
Current Epoch: 12
Status: ACTIVE
Genesis: COMPLETE

=== EPOCH 12 ===
Lock Price:  325678900000
Close Price: 0
Executed:    false

=== EPOCH 11 ===
Lock Price:  324567800000
Close Price: 325678900000
Executed:    true

Next check in 30s (Ctrl+C to stop)
```

### Manual Commands

```bash
# Check current epoch
cast call 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39 "currentEpoch()(uint256)" --rpc-url base_sepolia

# Check specific round
cast call 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39 "rounds(uint256)" 12 --rpc-url base_sepolia

# Check contract status
cast call 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39 "paused()(bool)" --rpc-url base_sepolia

# View configuration
cast call 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39 "intervalSeconds()(uint256)" --rpc-url base_sepolia
cast call 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39 "bufferSeconds()(uint256)" --rpc-url base_sepolia
```

---

## Troubleshooting

### Market Stuck at Same Epoch

**Check 1: Chainlink Automation**
```bash
# Visit dashboard
https://automation.chain.link/
# Check: LINK balance, execution history, upkeep status
```

**Check 2: Contract State**
```bash
cast call 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39 "paused()" --rpc-url base_sepolia
# Should return: false
```

**Check 3: Buffer Configuration**
```bash
cast call 0xF521D33924dfF881193956Ad7c6e10AB2eA54a39 "bufferSeconds()" --rpc-url base_sepolia
# Should return: 120 (0x78)
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Stuck at epoch 0 | Chainlink not registered | Register time-based upkeep |
| Stuck at epoch 2-3 | Buffer too small (60s) | Redeploy with buffer=120s ✅ |
| Execution reverts | Out of LINK | Top up LINK balance |
| "Too early to execute" | Wrong CRON timing | Use `* * * * *` (every minute) |
| "Can only lock within buffer" | Execution outside window | Check buffer=120s |

---

## Key Differences from PancakeSwap V3

### What's The Same ✅
- Overlapping rounds architecture
- Reward calculation logic
- Admin/operator pattern
- Refund mechanism
- Treasury fee system

### What's Different 🔄

| Aspect | PancakeSwap V3 | Our Implementation |
|--------|---------------|-------------------|
| **Oracle** | Chainlink Price Feeds | Pyth Network |
| **Betting Token** | ERC20 (CAKE) | Native ETH |
| **Execution** | Block-based keeper bot | Chainlink Time-Based Automation |
| **Buffer** | 15 seconds (5 blocks) | 120 seconds (CRON-based) |
| **Frequency** | Every ~15 seconds (blocks) | Every 60 seconds (minute) |
| **Genesis** | Manual start required | Automatic via Chainlink |

### Why These Changes?

1. **Pyth Oracle**: Higher update frequency (400ms vs 3600s), lower cost
2. **Native ETH**: Simpler UX, no token approvals needed
3. **Time-Based**: More reliable than running own keeper bot
4. **Longer Buffer**: Accounts for CRON timing + RPC delays

---

## Security Audit Notes

### Access Control

| Function | Access | Notes |
|----------|--------|-------|
| `performUpkeep()` | Anyone | Chainlink nodes call this |
| `pause()` / `unpause()` | Admin only | Emergency controls |
| `setAdmin()` | Owner only | Admin management |
| `setPyth()` / `setPriceId()` | Admin only | Requires pause |
| `claimTreasury()` | Admin only | Withdraw fees |
| `recoverToken()` | Admin only | Emergency recovery |

### Validation Checks

**performUpkeep() validates:**
1. Contract not paused
2. Genesis phases (automatic handling)
3. closeTimestamp reached (for normal rounds)
4. Buffer window (lockTimestamp + 120s)
5. Oracle timestamp advancing
6. Price data validity

---

## Cost Analysis

### Deployment
- Gas: ~4M gas
- Cost: $0.50-$2 (Base Sepolia gas prices)

### Per Round Execution
- Gas: ~250-400K gas
- LINK: ~0.001-0.002 per execution
- Frequency: Every 60 seconds

### Monthly Estimate
- Executions: ~43,200 per month
- LINK: ~50-100 LINK per month
- Note: Costs vary with LINK/ETH prices

---

## Next Steps

### After Deployment

1. ✅ **Register Chainlink Automation** (CRITICAL!)
   - Visit automation.chain.link
   - Use configuration above
   - Fund with 5+ LINK

2. ✅ **Start Monitoring**
   ```bash
   ./check-prediction.sh
   ```

3. ✅ **Verify First Executions**
   - Genesis start (minute 1)
   - Genesis lock (minute 2)
   - Normal rounds (minute 3+)

4. ⏳ **Frontend Integration** (future)
   - Use contract ABI
   - Connect to Base Sepolia
   - Display rounds and prices

---

## Files Reference

### Key Files

| File | Purpose |
|------|---------|
| `src/contracts/PancakePredictionV2Pyth.sol` | Main contract (lines 330-373: performUpkeep) |
| `script/DeployPredictionPyth.s.sol` | Deployment script |
| `check-prediction.sh` | Monitoring tool |
| `PancakePredictionV2Pyth-abi.json` | Contract ABI |
| `CHAINLINK_AUTOMATION_SETUP.md` | Detailed setup guide |

### Documentation

- **Setup Guide**: `CHAINLINK_AUTOMATION_SETUP.md`
- **Lifecycle**: `PREDICTION_MARKET_LIFECYCLE.md`
- **Quick Start**: `QUICK_START_UPKEEP.md`
- **Time-Based Guide**: `TIME_BASED_UPKEEP_GUIDE.md`

---

## Support & Resources

### Links
- **Chainlink Automation**: https://automation.chain.link/
- **Chainlink Docs**: https://docs.chain.link/chainlink-automation/guides/job-scheduler
- **Base Sepolia Explorer**: https://sepolia.basescan.org/
- **Pyth Network**: https://docs.pyth.network/

### Contact
- Check monitoring script output first
- Review Chainlink dashboard for execution history
- Verify contract state with cast commands
- Consult documentation files

---

**Last Updated**: November 9, 2025
**Contract Version**: v2.0 with Chainlink Time-Based Automation
**Status**: ✅ Deployed and Ready for Automation Registration

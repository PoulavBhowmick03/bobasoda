# Time-Based Upkeep Registration Guide

## Why Time-Based is Better

For your prediction market that executes **every 60 seconds**, a time-based trigger is more efficient than custom logic:
- ✅ Executes on a precise schedule (CRON expression)
- ✅ More predictable execution times
- ✅ Lower gas costs (no need to check conditions)
- ✅ Simpler to manage

---

## Registration Steps

### 1. Get LINK Tokens
Visit: https://faucets.chain.link/base-sepolia
- Request testnet LINK (free)
- You'll receive 1 LINK

### 2. Register Time-Based Upkeep

**Go to**: https://automation.chain.link/base-sepolia/new

#### Step 1: Select Trigger
- Choose: **"Time-based"**

#### Step 2: Target Contract
```
Contract Address: 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20
```

#### Step 3: Target Function
Select or enter the function to call:

**Option A: Use performUpkeep (Recommended)**
```
Function: performUpkeep(bytes)
Function Signature: performUpkeep(bytes)
```
**Arguments**: `0x` (empty bytes)

**Option B: Use executeRound (Alternative)**
```
Function: executeRound()
Function Signature: executeRound()
```
**Note**: If using this, you must set the Chainlink upkeep forwarder as operator (see below)

#### Step 4: CRON Expression

For **every 60 seconds (1 minute)**:
```
CRON: * * * * *
```

This means:
- `*` = every minute
- `*` = every hour
- `*` = every day
- `*` = every month
- `*` = every day of week

**CRON Schedule Preview**: Runs every minute

#### Step 5: Upkeep Details
```
Upkeep Name:          PancakePrediction Round Executor
Gas Limit:            500000
Starting Balance:     1 LINK (or more)
Your Email:           (your email)
```

#### Step 6: Review & Register
1. Review all details
2. Click **"Register Upkeep"**
3. **Approve LINK** in your wallet
4. **Confirm transaction**
5. Wait for confirmation

---

## CRON Expression Options

### Every 1 Minute (Current Setup)
```
* * * * *
```
**Executes**: Every minute, on the minute

### Every 2 Minutes
```
*/2 * * * *
```

### Every 5 Minutes
```
*/5 * * * *
```

### At Specific Seconds (if supported)
Some systems support:
```
*/60 * * * * *
```
**Executes**: Every 60 seconds exactly

---

## Important: Setting the Operator (If Using executeRound)

If you choose to call `executeRound()` instead of `performUpkeep()`, you need to set the Chainlink upkeep forwarder as the operator.

### Step 1: Get Your Upkeep Forwarder Address

After registration, you'll get an **Upkeep ID**. The forwarder address will be shown on your upkeep details page.

Alternatively, it follows this pattern:
- It's a contract address created specifically for your upkeep
- You can find it in the upkeep details

### Step 2: Set as Operator

```bash
# Replace <FORWARDER_ADDRESS> with your actual forwarder address
source .env && cast send 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 \
  "setOperator(address)" \
  <FORWARDER_ADDRESS> \
  --rpc-url base_sepolia \
  --private-key "$PRIVATE_KEY"
```

---

## Recommended Approach: Use performUpkeep()

**Why?**
- ✅ No need to change operator
- ✅ Can be called by anyone (including Chainlink)
- ✅ Still has all the safety checks
- ✅ Already implemented and tested

**Function to call**: `performUpkeep(bytes)`
**Arguments**: `0x` (empty bytes)

---

## Verification After Registration

### Check Upkeep Status
1. Visit: https://automation.chain.link/base-sepolia
2. Find your upkeep
3. Status should show: **Active** ✅

### Monitor First Execution
- Should execute at the **next minute mark** (e.g., if you register at 2:30:45 PM, it will execute at 2:31:00 PM)
- Check the "History" tab to see executions

### View Execution Details
```bash
# Check current epoch (should increment every minute)
cast call 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "currentEpoch()" --rpc-url base_sepolia
```

---

## Complete Registration Form

Here's exactly what to enter:

```
┌─────────────────────────────────────────────────────────┐
│ Register New Upkeep - Time-based                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Trigger Type:                                           │
│ ● Time-based    ○ Custom logic    ○ Log trigger        │
│                                                          │
│ Target contract address:                                │
│ 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20             │
│                                                          │
│ Target function (ABI):                                  │
│ performUpkeep(bytes)                                    │
│                                                          │
│ Function inputs:                                        │
│ performData (bytes): 0x                                 │
│                                                          │
│ CRON expression:                                        │
│ * * * * *                                               │
│ ↑ Runs every minute                                     │
│                                                          │
│ Upkeep name:                                            │
│ PancakePrediction Round Executor                        │
│                                                          │
│ Gas limit:                                              │
│ 500000                                                  │
│                                                          │
│ Starting balance (LINK):                                │
│ 1                                                       │
│                                                          │
│ Your email address:                                     │
│ your@email.com                                          │
│                                                          │
│                      [Register Upkeep]                  │
└─────────────────────────────────────────────────────────┘
```

---

## How It Works

```
Time: 2:00:00 PM  →  Chainlink calls performUpkeep(0x)  →  Round executes
Time: 2:01:00 PM  →  Chainlink calls performUpkeep(0x)  →  Round executes
Time: 2:02:00 PM  →  Chainlink calls performUpkeep(0x)  →  Round executes
... every minute ...
```

### Execution Flow
1. CRON expression matches (every minute)
2. Chainlink calls `performUpkeep(0x)` on your contract
3. Your contract:
   - Validates conditions (not paused, genesis complete, etc.)
   - Gets current price from Pyth
   - Locks current round
   - Ends previous round
   - Calculates rewards
   - Starts new round
4. Round complete! Wait 60 seconds, repeat.

---

## Troubleshooting

### Execution Failing?

**Check contract state:**
```bash
# Is contract paused?
cast call 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "paused()" --rpc-url base_sepolia

# Are genesis rounds complete?
cast call 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "genesisStartOnce()" --rpc-url base_sepolia
cast call 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "genesisLockOnce()" --rpc-url base_sepolia
```

**View failed transaction:**
- Go to your upkeep page on automation.chain.link
- Click "History" tab
- View failed transaction details

### Wrong CRON Expression?

You can **edit the upkeep** after registration:
1. Go to your upkeep page
2. Click "Edit upkeep"
3. Update CRON expression
4. Save changes

### Running Out of LINK?

Top up at any time:
1. Go to your upkeep page
2. Click "Add funds"
3. Enter amount and confirm

---

## Cost Estimates

### Per Execution
- Gas: ~200-300K
- LINK cost: ~$0.10-0.50 per execution

### Daily (1,440 executions)
- Executions: 1,440 (one per minute)
- LINK needed: ~$144-720 worth

### For Testing (1 LINK)
- Should last: 100-1000 executions
- Runtime: ~2-17 hours

---

## Advantages of Time-Based vs Custom Logic

| Feature | Time-Based | Custom Logic |
|---------|------------|--------------|
| Execution timing | ✅ Precise (on the minute) | ⚠️ Varies by block |
| Gas efficiency | ✅ Lower (no checkUpkeep) | ⚠️ Higher (checks every block) |
| Predictability | ✅ CRON schedule | ⚠️ Condition-based |
| Setup complexity | ✅ Simple | ⚠️ Need both functions |
| Use case | ✅ **Perfect for scheduled rounds** | Better for event-driven |

**For your 60-second prediction market**: Time-based is the **better choice** ✅

---

## Next Steps After Registration

1. **Get Upkeep ID**: Save it from the confirmation page
2. **Monitor**: Watch the History tab for executions
3. **Test**: Verify rounds are executing every minute
4. **Top up**: Add more LINK when balance gets low

---

## Summary

**For time-based upkeep registration:**

1. ✅ Get LINK from faucet
2. ✅ Go to automation.chain.link/base-sepolia/new
3. ✅ Select "Time-based" trigger
4. ✅ Enter contract: `0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20`
5. ✅ Function: `performUpkeep(bytes)`
6. ✅ Arguments: `0x`
7. ✅ CRON: `* * * * *` (every minute)
8. ✅ Fund with 1 LINK
9. ✅ Register!

**First execution**: Next minute mark after registration! ⏰

---

**Contract**: `0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20`
**Network**: Base Sepolia (84532)
**Schedule**: Every 60 seconds (CRON: `* * * * *`)
**Function**: `performUpkeep(bytes)` with argument `0x`

---

## Complete Setup Sequence (IMPORTANT!)

### The Problem: Timing Window

The contract has a **60-second buffer window** for locking rounds. If you miss this window, the round becomes stale and cannot be executed.

**Critical timing**:
- Genesis Start → creates round with lockTime = now + 60s
- Genesis Lock → MUST be called between lockTime and lockTime + 60s
- If you call it too early: Error "too early to lock"
- If you call it too late (>120s after start): Error "buffer seconds exceeded"

### Step-by-Step Initialization Sequence

#### Phase 1: Pause Everything (✅ You are here)
```bash
# 1. Pause Chainlink Upkeep (on automation.chain.link)
#    ✅ DONE - Your upkeep is paused
```

#### Phase 2: Reset Contract State
```bash
# 2. Pause the contract (resets genesis flags)
source .env && cast send 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "pause()" \
  --rpc-url base_sepolia --private-key "$PRIVATE_KEY"

# 3. Unpause the contract (ready for fresh genesis)
source .env && cast send 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "unpause()" \
  --rpc-url base_sepolia --private-key "$PRIVATE_KEY"
```

#### Phase 3: Execute Genesis Rounds (Critical Timing!)
```bash
# 4. Genesis Start Round
#    This starts epoch 4 and sets lockTime = now + 60 seconds
source .env && cast send 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "genesisStartRound()" \
  --rpc-url base_sepolia --private-key "$PRIVATE_KEY"

# 5. WAIT EXACTLY 60-65 SECONDS (not more than 120 seconds!)
sleep 62

# 6. Genesis Lock Round (MUST be within 60-120 seconds of step 4)
source .env && cast send 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "genesisLockRound()" \
  --rpc-url base_sepolia --private-key "$PRIVATE_KEY"
```

**What happens**:
- Genesis Start creates round 4 (lockTime = T+60s, closeTime = T+120s)
- Wait 60 seconds
- Genesis Lock locks round 4 and creates round 5
- Contract is now ready for automation

#### Phase 4: Enable Chainlink Automation
```bash
# 7. Unpause Chainlink Upkeep (on automation.chain.link)
#    Go to: https://automation.chain.link/base-sepolia/40059847407635190128982600523945531451737073879029535154779206351613220032157
#    Click "Unpause" or "Resume"
```

**What happens**:
- Chainlink will call `performUpkeep(0x)` at the next minute mark
- Round 5 will complete, round 6 will start
- Continues automatically every minute

---

## Complete Command Sequence (Copy-Paste Ready)

**Run these commands in order:**

```bash
# Step 1: Reset contract
source .env && \
cast send 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "pause()" \
  --rpc-url base_sepolia --private-key "$PRIVATE_KEY" && \
cast send 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "unpause()" \
  --rpc-url base_sepolia --private-key "$PRIVATE_KEY"

# Step 2: Genesis Start
source .env && \
cast send 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "genesisStartRound()" \
  --rpc-url base_sepolia --private-key "$PRIVATE_KEY"

# Step 3: Wait 62 seconds
echo "Waiting 62 seconds..." && sleep 62

# Step 4: Genesis Lock
source .env && \
cast send 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "genesisLockRound()" \
  --rpc-url base_sepolia --private-key "$PRIVATE_KEY"

# Step 5: Check epoch (should be 5)
cast call 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "currentEpoch()" \
  --rpc-url base_sepolia | xargs printf "%d\n"
```

**Then**: Go to https://automation.chain.link and unpause your upkeep!

---

## LINK Requirements

### Testnet (Base Sepolia)
- **Minimum**: 1 LINK
- **Recommended**: 2-5 LINK for extended testing
- **Duration with 1 LINK**: ~100-1000 executions (2-17 hours)

### Mainnet (Future)
- **Per execution**: ~$0.10-0.50 USD
- **Per day (1,440 executions)**: ~$144-720 USD
- **Per month**: ~$4,320-21,600 USD

**Cost factors**:
- Base network gas fees (very low)
- LINK price
- Execution gas usage (~200-300K per round)
- Network congestion

### Get Testnet LINK
Visit: https://faucets.chain.link/base-sepolia
- Free testnet LINK
- No wallet needed
- Instant delivery

---

## When to Unpause Chainlink Upkeep

**Unpause AFTER**:
1. ✅ Genesis Start Round executed
2. ✅ Genesis Lock Round executed
3. ✅ Contract status verified (see below)

**Verify before unpausing**:
```bash
# Should return 5 (or higher)
cast call 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "currentEpoch()" \
  --rpc-url base_sepolia | xargs printf "%d\n"

# Should return true
cast call 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "genesisStartOnce()" \
  --rpc-url base_sepolia

# Should return true
cast call 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "genesisLockOnce()" \
  --rpc-url base_sepolia

# Should return false
cast call 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "paused()" \
  --rpc-url base_sepolia
```

**If all checks pass**: Go unpause your Chainlink Upkeep!

**Upkeep URL**: https://automation.chain.link/base-sepolia/40059847407635190128982600523945531451737073879029535154779206351613220032157

---

## Monitoring After Unpause

### Watch Epoch Increment
```bash
# Check every 60 seconds
watch -n 60 'cast call 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "currentEpoch()" --rpc-url base_sepolia | xargs printf "%d\n"'
```

Expected: 5 → 6 → 7 → 8... (every minute)

### View Executions on Chainlink
- Visit: https://automation.chain.link/base-sepolia/40059847407635190128982600523945531451737073879029535154779206351613220032157
- Check "History" tab
- Should see new executions every ~60 seconds

### View Transactions on BaseScan
- Visit: https://sepolia.basescan.org/address/0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20
- Filter by "Method: performUpkeep"
- Should see green checkmarks (success) every minute

---

## Troubleshooting

### "Can only lock round within bufferSeconds"
**Problem**: You waited too long between genesis start and lock
**Solution**: Start over from Phase 2 (pause/unpause/genesis)

### Upkeep executing but failing
**Check contract state**:
```bash
# Is it paused?
cast call 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "paused()" --rpc-url base_sepolia

# Genesis complete?
cast call 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "genesisStartOnce()" --rpc-url base_sepolia
cast call 0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20 "genesisLockOnce()" --rpc-url base_sepolia
```

### Upkeep not executing at all
1. Check LINK balance (must be > 0)
2. Check upkeep is not paused
3. Check CRON expression is `* * * * *`
4. View upkeep logs for errors

---

## Your Upkeep Details

**Upkeep ID**: `40059847407635190128982600523945531451737073879029535154779206351613220032157`
**Contract**: `0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20`
**Network**: Base Sepolia
**Dashboard**: https://automation.chain.link/base-sepolia/40059847407635190128982600523945531451737073879029535154779206351613220032157

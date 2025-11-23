# Prediction Market Lifecycle

Complete guide to how the PancakePredictionV2Pyth prediction market works.

---

## Table of Contents

1. [Overview](#overview)
2. [Complete Lifecycle](#complete-lifecycle)
3. [Round States](#round-states)
4. [Betting Mechanics](#betting-mechanics)
5. [Reward Calculations](#reward-calculations)
6. [Chainlink Automation](#chainlink-automation)
7. [Examples](#examples)

---

## Overview

The prediction market allows users to bet on ETH/USD price movements in 60-second rounds. Users predict whether the price will go UP (Bull) or DOWN (Bear) from the lock price to the close price.

**Key Features:**
- ⏱️ **60-second rounds** (configurable)
- 💰 **Native ETH betting** (no token needed)
- 🔮 **Pyth Network oracle** for real-time prices
- 🤖 **Chainlink Time-Based Automation** (no cron jobs!)
- 💎 **90% rewards to winners** (10% treasury fee)

---

## Complete Lifecycle

### Phase 1: Deployment

```
┌─────────────────────────────────────────────────────────────┐
│ CONTRACT DEPLOYMENT                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Deploy contract with parameters:                         │
│    - Pyth Oracle: 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729│
│    - Price Feed: ETH/USD                                     │
│    - Interval: 60 seconds                                    │
│    - Buffer: 60 seconds                                      │
│    - Min Bet: 0.0001 ETH                                     │
│    - Treasury Fee: 3%                                        │
│                                                              │
│ 2. Register Chainlink Time-Based Upkeep:                    │
│    - CRON Schedule: * * * * * (every minute)                │
│    - Target Function: performUpkeep()                        │
│    - Fund with LINK tokens                                   │
│                                                              │
│ Status: ✅ Contract ready, waiting for first trigger        │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Genesis Start (Round 1)

```
┌─────────────────────────────────────────────────────────────┐
│ TIME: 00:00 (First minute boundary)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Trigger: Chainlink calls performUpkeep()                    │
│ Action:  genesisStartRound()                                 │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │  ROUND 1 CREATED                                      │   │
│ │  ───────────────                                      │   │
│ │  Epoch: 1                                             │   │
│ │  Start Time:  00:00                                   │   │
│ │  Lock Time:   01:00 (now + 60s)                       │   │
│ │  Close Time:  02:00 (now + 120s)                      │   │
│ │  Status: 🟢 BETTING OPEN                              │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ State Changes:                                               │
│   • genesisStartOnce = true                                  │
│   • currentEpoch = 1                                         │
│                                                              │
│ Users can now:                                               │
│   • betBull(1) - Bet price will go UP                        │
│   • betBear(1) - Bet price will go DOWN                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Example Bets (00:00 - 01:00):
┌──────────┬──────────┬──────────┬──────────┐
│ Time     │ User     │ Position │ Amount   │
├──────────┼──────────┼──────────┼──────────┤
│ 00:15    │ Alice    │ BULL     │ 1.0 ETH  │
│ 00:30    │ Bob      │ BEAR     │ 2.0 ETH  │
│ 00:45    │ Charlie  │ BULL     │ 0.5 ETH  │
└──────────┴──────────┴──────────┴──────────┘

Round 1 Pool: 3.5 ETH (1.5 BULL, 2.0 BEAR)
```

### Phase 3: Genesis Lock (Round 2)

```
┌─────────────────────────────────────────────────────────────┐
│ TIME: 01:00 (60 seconds later)                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Trigger: Chainlink calls performUpkeep()                    │
│ Action:  genesisLockRound()                                  │
│ Oracle:  Fetch ETH/USD price from Pyth → $2,000.00          │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │  ROUND 1 LOCKED                                       │   │
│ │  ──────────────                                       │   │
│ │  Epoch: 1                                             │   │
│ │  Lock Price:  $2,000.00 ⚡ (from Pyth)                │   │
│ │  Lock Time:   01:00                                   │   │
│ │  Close Time:  02:00                                   │   │
│ │  Status: 🔒 LOCKED (no more bets)                     │   │
│ │                                                        │   │
│ │  Waiting for close price at 02:00...                  │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │  ROUND 2 CREATED                                      │   │
│ │  ───────────────                                      │   │
│ │  Epoch: 2                                             │   │
│ │  Start Time:  01:00                                   │   │
│ │  Lock Time:   02:00                                   │   │
│ │  Close Time:  03:00                                   │   │
│ │  Status: 🟢 BETTING OPEN                              │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ State Changes:                                               │
│   • genesisLockOnce = true                                   │
│   • currentEpoch = 2                                         │
│   • oracleLatestTimestamp = 1699999999                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Now Running:
  Round 1: 🔒 Locked at $2,000 (waiting to close)
  Round 2: 🟢 Betting open
```

### Phase 4: Normal Execution (Every 60 seconds)

```
┌─────────────────────────────────────────────────────────────┐
│ TIME: 02:00 (and every 60s after)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Trigger: Chainlink calls performUpkeep()                    │
│ Action:  executeRound()                                      │
│ Oracle:  Fetch ETH/USD price from Pyth → $2,050.00          │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │  ROUND 1 ENDED ✅                                     │   │
│ │  ─────────────                                        │   │
│ │  Lock Price:   $2,000.00                              │   │
│ │  Close Price:  $2,050.00 ⚡ (from Pyth)               │   │
│ │  Result: BULL WINS! 🎉 (+$50 increase)                │   │
│ │                                                        │   │
│ │  Reward Calculation:                                  │   │
│ │  ├─ Total Pool: 3.5 ETH                               │   │
│ │  ├─ Treasury Fee (10%): 0.35 ETH                      │   │
│ │  └─ Reward Pool (90%): 3.15 ETH                       │   │
│ │                                                        │   │
│ │  Winners (BULL bettors):                              │   │
│ │  ├─ Alice: (1.0/1.5) * 3.15 = 2.10 ETH ✅             │   │
│ │  └─ Charlie: (0.5/1.5) * 3.15 = 1.05 ETH ✅           │   │
│ │                                                        │   │
│ │  Losers (BEAR bettors):                               │   │
│ │  └─ Bob: 0 ETH ❌ (lost 2.0 ETH)                      │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │  ROUND 2 LOCKED                                       │   │
│ │  ──────────────                                       │   │
│ │  Lock Price:  $2,050.00                               │   │
│ │  Status: 🔒 LOCKED (waiting for 03:00)                │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │  ROUND 3 CREATED                                      │   │
│ │  ───────────────                                      │   │
│ │  Status: 🟢 BETTING OPEN                              │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ State Changes:                                               │
│   • currentEpoch = 3                                         │
│   • treasuryAmount += 0.35 ETH                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘

This pattern repeats every 60 seconds forever!
```

### Phase 5: Claiming Rewards

```
┌─────────────────────────────────────────────────────────────┐
│ CLAIMING REWARDS (Anytime after round ends)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Alice (won Round 1):                                         │
│                                                              │
│ 1. Call: claim([1])                                          │
│                                                              │
│ 2. Contract checks:                                          │
│    ✅ Round 1 has ended                                      │
│    ✅ Alice bet on BULL                                      │
│    ✅ BULL won (close > lock)                                │
│    ✅ Alice hasn't claimed yet                               │
│                                                              │
│ 3. Reward calculation:                                       │
│    Alice's bet: 1.0 ETH                                      │
│    Total BULL: 1.5 ETH                                       │
│    Reward pool: 3.15 ETH                                     │
│    Alice's share: (1.0 / 1.5) * 3.15 = 2.10 ETH             │
│                                                              │
│ 4. Transfer 2.10 ETH to Alice                                │
│                                                              │
│ 5. Mark as claimed (can't claim again)                       │
│                                                              │
│ Alice's Profit: 2.10 - 1.0 = +1.10 ETH 💰                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Bob (lost Round 1):
┌─────────────────────────────────────────────────────────────┐
│ 1. Call: claim([1])                                          │
│ 2. Transaction REVERTS: "Not eligible for claim"            │
│                                                              │
│ Bob's Loss: -2.0 ETH ❌                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Round States

Every round goes through these states:

```
┌────────────┐      ┌────────────┐      ┌────────────┐
│   OPEN     │ ───► │   LOCKED   │ ───► │   ENDED    │
│  (60s)     │      │   (60s)    │      │ (permanent)│
└────────────┘      └────────────┘      └────────────┘
     │                    │                    │
     │                    │                    │
     ▼                    ▼                    ▼
 Users bet           Price locked        Winners claim
 betBull()           Wait for close      claim()
 betBear()           No more bets        Rewards paid
```

### State Details

| State | Duration | Actions Allowed | Description |
|-------|----------|----------------|-------------|
| **OPEN** | 60 seconds | `betBull()`, `betBear()` | Users can place bets |
| **LOCKED** | 60 seconds | None (waiting) | Price is locked, waiting for close price |
| **ENDED** | Permanent | `claim()` | Round finished, winners can claim |

---

## Betting Mechanics

### How to Bet

**Bet BULL (price will go UP):**
```solidity
// Bet 1 ETH that price will increase
prediction.betBull{value: 1 ether}(currentEpoch);
```

**Bet BEAR (price will go DOWN):**
```solidity
// Bet 1 ETH that price will decrease
prediction.betBear{value: 1 ether}(currentEpoch);
```

### Betting Rules

1. **Minimum Bet**: 0.0001 ETH (configurable)
2. **One Bet Per Round**: Cannot change or add to bet
3. **Must Bet Current Epoch**: Can't bet on past/future rounds
4. **During OPEN State Only**: Round must be open for betting
5. **No Contracts**: EOA (wallet) addresses only (security)

### What Happens to Your Bet

```
Your 1 ETH bet →  Added to pool  →  Round ends  →  Winner calculation
                      │
                      ├─ If you win:  Get share of pool * 90%
                      │
                      └─ If you lose: Bet goes to winners
```

---

## Reward Calculations

### Formula

```
Total Pool = Sum of all bets (Bull + Bear)
Treasury Fee = Total Pool × 10%
Reward Pool = Total Pool - Treasury Fee

Winner's Share = (Your Bet / Total Winning Side) × Reward Pool
```

### Example 1: Bull Wins

```
Round 100 Results:
─────────────────
Lock Price:   $2,000
Close Price:  $2,100  → BULL WINS! (+5% increase)

Bets:
  Bull: Alice (2 ETH) + Charlie (1 ETH) = 3 ETH
  Bear: Bob (4 ETH) = 4 ETH
  Total Pool: 7 ETH

Calculation:
  Treasury = 7 × 10% = 0.7 ETH
  Reward Pool = 7 - 0.7 = 6.3 ETH

  Alice: (2 / 3) × 6.3 = 4.2 ETH
  Charlie: (1 / 3) × 6.3 = 2.1 ETH
  Bob: 0 ETH

Profits:
  Alice: +2.2 ETH (110% return)
  Charlie: +1.1 ETH (110% return)
  Bob: -4.0 ETH (lost all)
```

### Example 2: Bear Wins

```
Round 101 Results:
─────────────────
Lock Price:   $2,100
Close Price:  $1,900  → BEAR WINS! (-9.5% decrease)

Bets:
  Bull: 5 ETH
  Bear: Diana (3 ETH) + Eve (2 ETH) = 5 ETH
  Total Pool: 10 ETH

Calculation:
  Treasury = 10 × 10% = 1.0 ETH
  Reward Pool = 10 - 1.0 = 9.0 ETH

  Diana: (3 / 5) × 9.0 = 5.4 ETH
  Eve: (2 / 5) × 9.0 = 3.6 ETH

Profits:
  Diana: +2.4 ETH (80% return)
  Eve: +1.6 ETH (80% return)
  Bull bettors: -5.0 ETH total
```

### Example 3: House Wins (Tie)

```
Round 102 Results:
─────────────────
Lock Price:   $2,000
Close Price:  $2,000  → HOUSE WINS! (no change)

Bets:
  Bull: 3 ETH
  Bear: 2 ETH
  Total Pool: 5 ETH

Calculation:
  Treasury = 5 ETH (ALL)
  Reward Pool = 0 ETH

  All bettors: 0 ETH

Result:
  🏦 Treasury gets entire pool
  ❌ All bettors lose their bets
  (This is rare but possible)
```

---

## Chainlink Automation

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                 CHAINLINK TIME-BASED UPKEEP                  │
└─────────────────────────────────────────────────────────────┘

Every minute (CRON: * * * * *):

  1. Chainlink Automation Network triggers
     ↓
  2. Calls performUpkeep(bytes calldata performData)
     ↓
  3. Contract checks state:
     ├─ If genesisStartOnce = false
     │  └─► genesisStartRound() → Start Round 1
     ├─ If genesisLockOnce = false
     │  └─► genesisLockRound() → Lock Round 1, Start Round 2
     └─ Else
        └─► executeRound() → End n-1, Lock n, Start n+1
     ↓
  4. Fetch price from Pyth Oracle
     ↓
  5. Update rounds, calculate rewards
     ↓
  6. Emit events (frontend updates)
     ↓
  7. Wait for next CRON trigger (60s)
```

### Configuration

**Upkeep Settings:**
```json
{
  "name": "PancakePrediction Upkeep",
  "contract": "0x71835250Af7b38Aac8aF32Ea607DE859ADB91c20",
  "network": "Base Sepolia",
  "trigger": "Time-based",
  "schedule": "* * * * *",
  "description": "Execute prediction rounds every 60 seconds",
  "gasLimit": 500000,
  "funding": "LINK tokens"
}
```

**CRON Schedule:**
- `* * * * *` = Every minute
- Executes at: 00:00, 01:00, 02:00, ... , 59:00
- 1440 executions per day

### Benefits vs Cron Jobs

| Feature | Chainlink Automation | Traditional Cron |
|---------|---------------------|------------------|
| **Reliability** | ✅ Decentralized network | ❌ Single server |
| **Uptime** | ✅ 99.9%+ | ⚠️ Depends on server |
| **Gas Management** | ✅ Automatic | ❌ Manual top-up |
| **Monitoring** | ✅ Built-in dashboard | ❌ Custom needed |
| **Maintenance** | ✅ Zero | ❌ Server maintenance |
| **Cost** | LINK tokens | Server costs |

---

## Examples

### Complete Round Example

```
═══════════════════════════════════════════════════════════════
ROUND 42: Complete Lifecycle
═══════════════════════════════════════════════════════════════

⏰ 14:00:00 - Round Opens
──────────────────────────
Chainlink triggers performUpkeep()
Round 42 starts, betting opens

Current ETH Price: $2,345.67 (informational only)

⏱️ 14:00:15 - Alice Bets
──────────────────────────
Alice calls betBull{value: 5 ether}(42)
✅ Bet recorded: 5 ETH on BULL

⏱️ 14:00:30 - Bob Bets
──────────────────────────
Bob calls betBear{value: 3 ether}(42)
✅ Bet recorded: 3 ETH on BEAR

⏱️ 14:00:45 - Charlie Bets
──────────────────────────
Charlie calls betBull{value: 2 ether}(42)
✅ Bet recorded: 2 ETH on BULL

Round 42 Pool:
├─ BULL: 7 ETH (Alice: 5, Charlie: 2)
└─ BEAR: 3 ETH (Bob: 3)
Total: 10 ETH

⏰ 14:01:00 - Round Locks
──────────────────────────
Chainlink triggers performUpkeep()
Pyth Oracle: $2,390.50

✅ Round 42 locked at $2,390.50
🚫 No more bets accepted
⏳ Waiting for close price...

⏰ 14:02:00 - Round Ends
──────────────────────────
Chainlink triggers performUpkeep()
Pyth Oracle: $2,410.25

✅ Round 42 ended at $2,410.25

📊 Results:
   Lock:  $2,390.50
   Close: $2,410.25
   Change: +$19.75 (+0.83%)

   🎉 BULL WINS!

💰 Reward Calculation:
   Total Pool: 10 ETH
   Treasury (10%): 1 ETH
   Reward Pool (90%): 9 ETH

   Winners (BULL = 7 ETH):
   ├─ Alice: (5/7) × 9 = 6.428 ETH (profit: +1.428 ETH)
   └─ Charlie: (2/7) × 9 = 2.571 ETH (profit: +0.571 ETH)

   Losers (BEAR):
   └─ Bob: 0 ETH (loss: -3 ETH)

⏰ 14:02:30 - Alice Claims
──────────────────────────
Alice calls claim([42])
✅ 6.428 ETH sent to Alice
💵 Alice's wallet: +6.428 ETH

⏰ 14:03:15 - Charlie Claims
──────────────────────────
Charlie calls claim([42])
✅ 2.571 ETH sent to Charlie
💵 Charlie's wallet: +2.571 ETH

⏰ 14:04:00 - Bob Tries to Claim
──────────────────────────
Bob calls claim([42])
❌ Transaction reverts: "Not eligible for claim"

Final Results:
├─ Alice:   +1.428 ETH profit ✅
├─ Charlie: +0.571 ETH profit ✅
├─ Bob:     -3.000 ETH loss ❌
└─ Treasury: +1.000 ETH fee 🏦

═══════════════════════════════════════════════════════════════
```

### Multi-Round Betting

```
User Strategy Example:
─────────────────────

🔵 Alice's Activity:

Round 10: Bet 2 ETH BULL → Won  → Claimed 3.6 ETH (+1.6 profit)
Round 11: Bet 1 ETH BEAR → Lost → 0 ETH (-1.0 loss)
Round 12: Bet 3 ETH BULL → Won  → Claimed 5.4 ETH (+2.4 profit)
Round 13: Bet 2 ETH BULL → Lost → 0 ETH (-2.0 loss)
Round 14: Bet 1 ETH BEAR → Won  → Claimed 1.8 ETH (+0.8 profit)

Total Bet: 9 ETH
Total Won: 10.8 ETH
Net Profit: +1.8 ETH (20% return)

Win Rate: 60% (3/5 rounds)
```

---

## Key Takeaways

✅ **Automated**: Chainlink handles all round progressions
✅ **Transparent**: All prices from Pyth oracle (on-chain)
✅ **Fair**: 90% rewards to winners, 10% treasury
✅ **Fast**: 60-second rounds for quick action
✅ **Simple**: Just bet ETH, no tokens needed
✅ **Secure**: Oracle validation prevents manipulation

🎯 **Win by predicting price direction correctly!**

---

## Contract Functions Reference

### User Functions

```solidity
// Betting
betBull(uint256 epoch) payable        // Bet price will increase
betBear(uint256 epoch) payable        // Bet price will decrease

// Claiming
claim(uint256[] epochs)                // Claim winnings from multiple rounds

// View Functions
claimable(uint256 epoch, address user) // Check if user can claim
refundable(uint256 epoch, address user) // Check if user can get refund
getUserRounds(address user, uint256 cursor, uint256 size) // Get user's betting history
```

### Operator Functions

```solidity
genesisStartRound()   // Start first round (manual backup)
genesisLockRound()    // Lock first round (manual backup)
executeRound()        // Execute round (manual backup)
```

### Automation Function

```solidity
performUpkeep(bytes calldata)  // Called by Chainlink every 60s
```

### Admin Functions

```solidity
pause()                        // Pause contract
unpause()                      // Unpause and reset
claimTreasury()               // Withdraw treasury fees
setAdmin(address)             // Change admin
setPyth(address)              // Update Pyth oracle
setPriceId(bytes32)           // Update price feed
setOracleUpdateAllowance(uint256) // Set staleness limit
setMinBetAmount(uint256)      // Change minimum bet
setTreasuryFee(uint256)       // Change fee (max 10%)
```

---

## Monitoring & Troubleshooting

### Check Contract State

```javascript
// Current round
const epoch = await prediction.currentEpoch();

// Round details
const round = await prediction.rounds(epoch);
console.log("Lock Price:", round.lockPrice);
console.log("Close Price:", round.closePrice);
console.log("Total Bets:", round.totalAmount);

// User's bet
const bet = await prediction.ledger(epoch, userAddress);
console.log("Position:", bet.position); // 0 = Bull, 1 = Bear
console.log("Amount:", bet.amount);
console.log("Claimed:", bet.claimed);
```

### Common Issues

**Issue**: Rounds not progressing
- ✅ Check Chainlink Upkeep is funded with LINK
- ✅ Verify upkeep is active on automation.chain.link
- ✅ Check contract is not paused

**Issue**: Can't bet
- ✅ Ensure round is in OPEN state
- ✅ Check bet amount >= minBetAmount
- ✅ Verify you haven't bet on this round already
- ✅ Confirm using EOA wallet (not contract)

**Issue**: Can't claim rewards
- ✅ Verify round has ended
- ✅ Check you bet on the winning side
- ✅ Ensure you haven't claimed already

---

**For more information**: See deployment docs and test files.

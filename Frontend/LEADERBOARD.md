# Leaderboard System with Filecoin Cloud Storage

This document explains how the BobaSoda leaderboard system works, using Synapse SDK from Filecoin Cloud for decentralized data storage.

## Overview

The leaderboard system tracks user predictions, wins, losses, and statistics, storing all data on **Filecoin** using the **Synapse SDK**. This provides:

- ✅ Decentralized storage (data isn't controlled by a single entity)
- ✅ Verifiable on-chain storage
- ✅ Persistent across sessions
- ✅ Tamper-resistant user statistics

## Architecture

### Components

1. **Synapse SDK Integration** (`lib/synapse-config.ts`)
   - Configuration for Filecoin Calibration testnet
   - RPC URLs and storage keys
   - Helper functions for storage operations

2. **Data Types** (`lib/types/leaderboard.ts`)
   - `UserStats` - Individual user statistics
   - `UserBet` - Single bet record
   - `LeaderboardEntry` - User ranking data
   - `LeaderboardData` - Full leaderboard state

3. **Storage Hooks** (`hooks/useSynapseStorage.ts`)
   - `useSynapseStorage()` - Low-level Synapse operations
   - `useUserStats()` - User stats with localStorage caching

4. **Bet Tracking** (`hooks/useBetTracking.ts`)
   - Track bets when placed
   - Update results when rounds end
   - Calculate streaks, win rate, profit/loss

5. **UI Component** (`components/leaderboard.tsx`)
   - Display rankings
   - Filter by profit, win rate, or streak
   - Real-time updates

## How It Works

### Data Flow

```
User Places Bet
      ↓
useBetTracking records bet
      ↓
UserStats updated (pending +1)
      ↓
Synapse uploads to Filecoin
      ↓
CID cached in localStorage
      ↓
Round Ends
      ↓
Bet result determined (win/loss)
      ↓
UserStats updated (wins/losses, streak, profit)
      ↓
Uploaded to Filecoin
      ↓
Leaderboard recalculated
```

### User Statistics Tracked

For each user, we track:

| Stat | Description |
|------|-------------|
| `totalBets` | Total number of predictions made |
| `wins` | Number of winning predictions |
| `losses` | Number of losing predictions |
| `pending` | Bets awaiting results |
| `totalWagered` | Total ETH wagered |
| `totalProfit` | Net profit/loss in ETH |
| `winRate` | Win percentage |
| `currentStreak` | Current win/loss streak |
| `bestStreak` | Best winning streak |
| `favoriteToken` | Most predicted token |
| `bets[]` | Full bet history |

### Bet Record Structure

Each bet contains:

```typescript
{
  epoch: 42,                    // Round number
  token: "ETH",                 // Token predicted
  direction: "bull",            // "bull" or "bear"
  amount: "0.1",                // ETH wagered
  timestamp: 1234567890,        // When bet was placed
  won: true,                    // null if pending
  payout: "0.18"                // null if pending or lost
}
```

## Setup Guide

### 1. Install Dependencies

Already installed:
```bash
npm install @filoz/synapse-sdk ethers@6 --legacy-peer-deps
```

### 2. Get Filecoin Test Tokens

For Calibration testnet, you need two types of tokens:

**tFIL (for gas fees):**
- Visit: https://faucet.calibration.fildev.network/
- Enter your wallet address
- Receive test FIL

**USDFC (for storage payments):**
- Visit: https://faucet.calibration.fildev.network/funds.html
- Enter your wallet address
- Receive test USDFC

### 3. Generate a Private Key

Create a new wallet for Synapse operations:

```bash
# Using ethers.js
node -e "const ethers = require('ethers'); const wallet = ethers.Wallet.createRandom(); console.log('Address:', wallet.address); console.log('Private Key:', wallet.privateKey);"
```

**Important:** This should be a dedicated wallet for storage operations, separate from your main wallet.

### 4. Configure Environment

Update `.env.local`:

```bash
NEXT_PUBLIC_SYNAPSE_PRIVATE_KEY=0xYourPrivateKeyHere
```

### 5. Fund Your Synapse Wallet

Send tFIL and USDFC to the address from step 3.

## Usage

### Recording a Bet

```typescript
import { useBetTracking } from '@/hooks/useBetTracking'

function BettingComponent() {
  const { recordBet } = useBetTracking(userAddress)

  const handlePlaceBet = async () => {
    await recordBet({
      epoch: 42,
      token: 'ETH',
      direction: 'bull',
      amount: '0.1'
    })
  }
}
```

### Updating Bet Result

```typescript
const { updateBetResult } = useBetTracking(userAddress)

// When round ends
await updateBetResult(
  42,           // epoch
  true,         // won
  '0.18'        // payout in ETH
)
```

### Accessing User Stats

```typescript
const { stats } = useBetTracking(userAddress)

console.log(`Win Rate: ${stats?.winRate}%`)
console.log(`Streak: ${stats?.currentStreak}`)
console.log(`Profit: ${stats?.totalProfit} ETH`)
```

### Viewing Leaderboard

The leaderboard is automatically available at the navigation:
1. Click the trophy icon in the bottom navigation
2. View rankings by profit, win rate, or streak
3. See detailed stats for each player

## Data Storage

### Filecoin Storage

All user stats and leaderboard data are stored on Filecoin using Synapse SDK:

- **Upload**: Data is uploaded as JSON, converted to bytes
- **Storage**: Stored on Filecoin with a unique Content Identifier (CID)
- **Caching**: CIDs are cached in localStorage for quick access
- **Download**: Data retrieved using CID when needed

### Storage Keys

```typescript
// User stats key format
`bobasoda_user_${address.toLowerCase()}`

// Leaderboard data key
`bobasoda_leaderboard`

// Global stats key
`bobasoda_global_stats`
```

### CID Caching

To reduce Filecoin reads and improve performance:

1. After uploading, CID is saved to localStorage
2. On load, check localStorage for cached CID
3. If found, download from Filecoin using CID
4. If not found or download fails, create new data

## Leaderboard Rankings

### Ranking Criteria

Users can be ranked by:

1. **Total Profit** (default)
   - Net ETH won/lost
   - Includes all completed bets

2. **Win Rate**
   - Percentage of winning bets
   - Minimum 10 bets required

3. **Streak**
   - Current consecutive wins
   - Negative for consecutive losses

4. **Volume**
   - Total ETH wagered
   - Activity-based ranking

### Updating the Leaderboard

The leaderboard is recalculated whenever:
- Any user updates their stats
- A round ends and results are settled
- Admin manually triggers refresh

## Integration with CDP Wallets

The leaderboard works seamlessly with CDP (Coinbase Developer Platform) wallets:

```typescript
import { useEvmAddress } from '@coinbase/cdp-react'

function MyComponent() {
  const { evmAddress } = useEvmAddress()
  const { stats } = useBetTracking(evmAddress)

  // Stats automatically load when wallet connects
}
```

## Security Considerations

### Private Key Management

**Never expose your Synapse private key:**
- ✅ Store in `.env.local` (gitignored)
- ✅ Use a dedicated wallet for storage
- ✅ Limit funds in the wallet
- ❌ Never commit to GitHub
- ❌ Never share publicly

### Data Integrity

- User stats are stored separately per address
- Each upload gets a unique CID
- Data cannot be modified once uploaded
- Historical CIDs provide audit trail

## Troubleshooting

### "Synapse SDK not configured"

**Issue:** `NEXT_PUBLIC_SYNAPSE_PRIVATE_KEY` not set

**Solution:**
1. Generate a private key (see Setup Guide)
2. Add to `.env.local`
3. Restart dev server

### "Failed to upload user stats"

**Possible causes:**
- Insufficient tFIL for gas
- Insufficient USDFC for storage
- Network connectivity issues

**Solutions:**
1. Check wallet balance on Filecoin Calibration
2. Get more test tokens from faucets
3. Verify RPC URL is accessible

### Leaderboard shows "No players yet"

**Causes:**
- No one has placed bets yet
- Leaderboard CID not cached
- Download from Filecoin failed

**Solutions:**
1. Place a bet to populate data
2. Check console for errors
3. Verify Synapse configuration

### Stats not persisting across sessions

**Issue:** localStorage cleared or Synapse not configured

**Solution:**
1. Ensure Synapse private key is set
2. Check browser doesn't block localStorage
3. Verify uploads are successful (check console logs)

## Cost Considerations

### Filecoin Calibration (Testnet)

- **Free** test tokens from faucets
- Perfect for development and testing
- No real costs

### Filecoin Mainnet (Production)

When deploying to production:
- Switch to mainnet RPC URL
- Use real FIL for gas fees
- Budget for storage costs
- Costs are very low compared to storing on Ethereum

## Roadmap

Future enhancements:

- [ ] **Global leaderboard aggregation** across all users
- [ ] **Time-based rankings** (daily, weekly, monthly)
- [ ] **Achievement system** stored on Filecoin
- [ ] **Social features** (following, challenges)
- [ ] **Historical snapshots** using multiple CIDs
- [ ] **IPFS gateway** for public leaderboard viewing
- [ ] **Mainnet deployment** for production

## Resources

- **Filecoin Cloud Docs**: https://docs.filecoin.cloud/
- **Synapse SDK GitHub**: https://github.com/FilOzone/synapse-sdk
- **Synapse SDK NPM**: https://www.npmjs.com/package/@filoz/synapse-sdk
- **Filecoin Faucet**: https://faucet.calibration.fildev.network/
- **Filecoin Explorer**: https://calibration.filfox.info/

## Support

For issues or questions:
- Check console logs for detailed error messages
- Verify Synapse configuration
- Ensure test tokens are available
- Review this documentation

---

**Built with:**
- Synapse SDK by FilOzone
- Filecoin Calibration Testnet
- Next.js 16 + React 19
- TypeScript
- CDP Wallets (Coinbase)

**Storage powered by Filecoin Cloud** ☁️

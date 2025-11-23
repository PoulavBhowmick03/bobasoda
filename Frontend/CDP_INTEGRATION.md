# Coinbase CDP Embedded Wallets Integration Guide

This document explains how to use Coinbase Developer Platform (CDP) embedded wallets in the BobaSoda prediction market application.

## Overview

BobaSoda now supports **Coinbase CDP embedded wallets**, providing users with a seamless web2-style onboarding experience while maintaining full crypto functionality. Users can sign in with just their email, and wallets are created automatically in under 500ms.

## Features

✨ **Email-based Authentication** - Users sign in with email OTP (no seed phrases needed)
🚀 **Instant Wallet Creation** - Wallets created in <500ms on first login
🔐 **True Self-Custody** - Device-specific cryptographic keys, never exposed to Coinbase
⚡ **Native Base Support** - Optimized for Base Sepolia testnet
💰 **Full Transaction Support** - Place bets, claim rewards, and manage funds
📱 **Multi-device Access** - Use the same wallet across up to 5 devices

## Setup Instructions

### 1. Get Your CDP Project ID

1. Visit [Coinbase Developer Portal](https://portal.cdp.coinbase.com/)
2. Create a new project or select an existing one
3. Copy your Project ID from the dashboard

### 2. Configure Environment Variables

Create or update `.env.local`:

```bash
# Coinbase CDP Configuration
NEXT_PUBLIC_CDP_PROJECT_ID=your_cdp_project_id_here
```

### 3. Run the Application

```bash
npm run dev
```

The app will automatically use CDP if `NEXT_PUBLIC_CDP_PROJECT_ID` is set.

## Architecture

### Core Components

#### 1. CDP Provider (`components/cdp-provider.tsx`)
Wraps the app with CDP functionality, providing embedded wallet context.

#### 2. CDP Config (`lib/cdp-config.ts`)
Centralized configuration for CDP including:
- Network settings (Base Sepolia)
- Authentication methods
- UI customization
- Wallet creation settings

#### 3. CDP Auth Button (`components/cdp-auth-button.tsx`)
Handles the complete authentication flow:
- Email input
- OTP verification
- Automatic wallet creation
- User session management

#### 4. CDP Profile (`components/cdp-profile.tsx`)
Displays user profile information:
- Wallet address
- ETH balance
- Email
- Sign out functionality

#### 5. CDP Transaction Hook (`hooks/useCDPTransaction.ts`)
Manages betting transactions:
- Place bull/bear bets
- Claim rewards
- Transaction status tracking

### Authentication Flow

```
1. User enters email → CDP sends OTP
2. User enters OTP code → CDP verifies
3. CDP creates wallet (if first time) → User authenticated
4. Wallet address available for transactions
```

### Transaction Flow

```
1. User selects bet amount and direction
2. useCDPTransaction.placeBet() called
3. Transaction prepared and sent via CDP
4. Transaction hash returned
5. UI updates based on transaction status
```

## Usage Examples

### Checking Authentication Status

```tsx
import { useCurrentUser, useEvmAddress, useIsInitialized } from '@coinbase/cdp-hooks'

function MyComponent() {
  const isInitialized = useIsInitialized()
  const { data: currentUser } = useCurrentUser()
  const { data: address } = useEvmAddress()

  if (!isInitialized) return <div>Loading...</div>
  if (!currentUser) return <div>Please sign in</div>

  return <div>Connected: {address}</div>
}
```

### Placing a Bet

```tsx
import { useCDPTransaction } from '@/hooks/useCDPTransaction'

function BettingComponent() {
  const { placeBet, isPending } = useCDPTransaction()

  const handleBet = async () => {
    const result = await placeBet({
      amount: '0.01', // 0.01 ETH
      direction: 'bull',
      contractAddress: '0x...',
      epoch: 123,
    })

    if (result.success) {
      console.log('Bet placed successfully!')
    }
  }

  return (
    <button onClick={handleBet} disabled={isPending}>
      {isPending ? 'Placing bet...' : 'Bet Bull'}
    </button>
  )
}
```

### Displaying User Balance

```tsx
import { useEvmAddress } from '@coinbase/cdp-hooks'
import { useEffect, useState } from 'react'
import { createPublicClient, formatEther } from 'viem'

function BalanceDisplay() {
  const { data: address } = useEvmAddress()
  const [balance, setBalance] = useState<string>('0')

  useEffect(() => {
    if (!address) return

    const fetchBalance = async () => {
      const client = createPublicClient({
        chain: baseSepoliaChain,
        transport: http('https://sepolia.base.org'),
      })

      const bal = await client.getBalance({ address })
      setBalance(formatEther(bal))
    }

    fetchBalance()
  }, [address])

  return <div>{balance} ETH</div>
}
```

## Network Configuration

### Base Sepolia Testnet

- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Explorer**: https://sepolia.basescan.org
- **Native Currency**: ETH
- **Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

### Contract Addresses

Update these in your app as needed:

```typescript
const PREDICTION_CONTRACT = '0x58Ccb2418E0b48D9d3b19a084395B69a1235DcAE'
const CHAINLINK_ETH_USD = '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1'
```

## Security Features

### Device-Specific Keys
- Cryptographic keys generated and stored locally on user's device
- Keys never exposed to Coinbase servers
- True self-custody maintained

### Key Export
Users can export their private keys anytime from:
- CDP portal
- Mobile app
- Web dashboard

### Multi-Device Support
- Users can access their wallet from up to 5 devices
- Each device has its own cryptographic keys
- Secure device management via CDP portal

## Troubleshooting

### "CDP not initialized" Error

**Problem**: CDP hooks return null or show "not initialized"

**Solution**:
1. Check that `NEXT_PUBLIC_CDP_PROJECT_ID` is set in `.env.local`
2. Restart the development server after adding environment variables
3. Verify the project ID is correct in CDP portal

### "Transaction Failed" Error

**Problem**: Transactions fail when placing bets

**Solution**:
1. Ensure user has sufficient ETH balance
2. Check that contract address is correct
3. Verify network is Base Sepolia (chain ID 84532)
4. Check BaseScan for detailed error messages

### Balance Not Updating

**Problem**: ETH balance shows 0 or doesn't update

**Solution**:
1. Request testnet ETH from Base Sepolia faucet
2. Check RPC connection to https://sepolia.base.org
3. Verify wallet address in BaseScan explorer

### Email OTP Not Received

**Problem**: OTP code doesn't arrive

**Solution**:
1. Check spam/junk folder
2. Verify email address is correct
3. Try resending the code
4. Check CDP portal for any service issues

## API Reference

### Hooks

#### `useIsInitialized()`
Returns boolean indicating if CDP is ready
```tsx
const isInitialized = useIsInitialized()
```

#### `useCurrentUser()`
Returns current authenticated user data
```tsx
const { data: user } = useCurrentUser()
// user.id, user.email, etc.
```

#### `useEvmAddress()`
Returns user's EVM wallet address
```tsx
const { data: address } = useEvmAddress()
// address: "0x..."
```

#### `useSignInWithEmail()`
Initiates email authentication
```tsx
const { mutate: signIn } = useSignInWithEmail()
signIn({ email: 'user@example.com' })
```

#### `useVerifyEmailOTP()`
Verifies OTP code
```tsx
const { mutate: verify } = useVerifyEmailOTP()
verify({ email: 'user@example.com', otp: '123456' })
```

#### `useSignOut()`
Signs out current user
```tsx
const { mutate: signOut } = useSignOut()
signOut()
```

#### `useSendTransaction()`
Sends a transaction
```tsx
const { mutate: sendTx } = useSendTransaction()
sendTx({ to: '0x...', value: parseEther('0.01') })
```

### Custom Hooks

#### `useCDPTransaction()`
Handles prediction market transactions
```tsx
const {
  address,           // User's wallet address
  placeBet,          // Place a bet function
  claimRewards,      // Claim rewards function
  isPending,         // Transaction in progress
  txHash,            // Transaction hash
  error,             // Error message if any
} = useCDPTransaction()
```

## Resources

- **CDP Documentation**: https://docs.cdp.coinbase.com/embedded-wallets/welcome
- **CDP Portal**: https://portal.cdp.coinbase.com/
- **Frontend SDK**: https://coinbase.github.io/cdp-web/
- **Base Network**: https://base.org/
- **BaseScan Explorer**: https://sepolia.basescan.org

## Support

For issues or questions:
1. Check this documentation first
2. Review CDP documentation at https://docs.cdp.coinbase.com
3. Check the [CDP GitHub](https://github.com/coinbase) for examples
4. Contact Coinbase Developer Support

---

**Built with Coinbase Developer Platform** | Base Network | Embedded Wallets

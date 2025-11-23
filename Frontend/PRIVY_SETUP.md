# Privy Wallet Integration Setup Guide

This guide explains how to set up Privy for email-based wallet creation on Celo Alfajores testnet.

## Overview

The app now uses **Privy** for wallet connection:
- Users enter their email
- Privy creates an embedded wallet automatically
- Wallet lives on **Celo Alfajores Testnet**
- No MetaMask or browser extension required

## Setup Steps

### 1. Create a Privy Account

1. Go to [https://dashboard.privy.io/](https://dashboard.privy.io/)
2. Sign up for a free account
3. Verify your email address

### 2. Create a New Privy App

1. In the Privy Dashboard, click **"Create App"** or **"New App"**
2. Give your app a name (e.g., "BobaSoda Wallet")
3. Your app will be created

### 3. Get Your App ID

1. In your app's dashboard, you'll see your **App ID**
2. Copy this App ID (it looks like: `clpqr123456789abcdef`)

### 4. Configure Login Methods

1. In the Privy Dashboard, go to **"Login Methods"** in the sidebar
2. Make sure **Email** is enabled
3. You can disable other login methods if you only want email authentication

### 5. Add App ID to Environment Variables

1. In your project root (`wallet-app/`), create a file called `.env.local`
2. Add your App ID:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=your-app-id-here
```

Replace `your-app-id-here` with the actual App ID you copied from the dashboard.

### 6. Restart Development Server

If your development server is running, restart it to load the new environment variable:

```bash
# Stop the server (Ctrl+C)
# Then restart it
npm run dev
```

## Testing the Integration

1. Open your app at [http://localhost:3000](http://localhost:3000)
2. You should see the Profile page with a **"Connect Wallet"** button
3. Click the button
4. Enter your email address in the Privy popup
5. Check your email for the verification code
6. Enter the code
7. Your embedded wallet will be created automatically!
8. The wallet address will appear on the Profile page (format: 0x1...78)

## Network Details

Your embedded wallet is configured to use:
- **Network**: Celo Alfajores Testnet
- **Chain ID**: 44787
- **RPC URL**: https://alfajores-forno.celo-testnet.org
- **Currency**: CELO
- **Block Explorer**: https://explorer.celo.org/alfajores

## Getting Testnet CELO

To get testnet CELO for testing:
1. Visit the [Celo Alfajores Faucet](https://faucet.celo.org/alfajores)
2. Enter your wallet address (from the Profile page)
3. Request testnet CELO
4. Wait a few moments for the tokens to arrive

## Troubleshooting

### "App ID is missing" error
- Make sure you created `.env.local` (not `.env`)
- Check that the variable name is exactly `NEXT_PUBLIC_PRIVY_APP_ID`
- Restart your development server after adding the variable

### Privy popup doesn't appear
- Check browser console for errors
- Make sure you have a stable internet connection
- Try clearing browser cache and cookies

### Email verification not working
- Check your spam/junk folder
- Make sure the email address is correct
- Try requesting a new verification code

## Next Steps

The wallet integration is complete! You can now:
- Connect and disconnect wallets
- See wallet addresses on the Profile page
- Add smart contract interactions (not included in this setup)

## Important Notes

- This integration is **frontend-only**
- No smart contract addresses are hardcoded
- Contract interactions should be added separately
- The wallet is **non-custodial** - Privy never has access to user funds
- All sensitive operations happen client-side

## Documentation

For more information about Privy:
- [Privy Documentation](https://docs.privy.io/)
- [Embedded Wallets Guide](https://docs.privy.io/guide/react/wallets/embedded/creation)
- [Celo Documentation](https://docs.celo.org/)
- [Celo Alfajores Testnet](https://docs.celo.org/network/alfajores)

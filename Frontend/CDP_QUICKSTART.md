# CDP Quick Start Guide 🚀

Get started with Coinbase embedded wallets in under 5 minutes!

## Step 1: Get Your Project ID

1. Go to [CDP Portal](https://portal.cdp.coinbase.com/)
2. Sign in or create an account
3. Create a new project
4. Copy your **Project ID**

## Step 2: Configure Your App

Create `.env.local` in the Frontend directory:

```bash
NEXT_PUBLIC_CDP_PROJECT_ID=your_project_id_here
```

## Step 3: Install & Run

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

## Step 4: Test It Out!

1. Open http://localhost:3000
2. Navigate to the profile page
3. Click "Sign In with Email"
4. Enter your email
5. Check your inbox for the OTP code
6. Enter the code
7. Your wallet is created! 🎉

## What You Get

✅ Instant wallet creation (< 500ms)
✅ Email-based authentication
✅ Auto-connected to Base Sepolia
✅ Ready to place bets
✅ ETH balance displayed
✅ Full transaction support

## Next Steps

### Get Test ETH

Visit the Base Sepolia faucet to get test ETH:
https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

### Place Your First Bet

1. Navigate to the markets page
2. Swipe left (bear) or right (bull)
3. Enter bet amount
4. Confirm transaction
5. Wait for the round to complete
6. Claim your rewards if you win!

### Customize

Edit `lib/cdp-config.ts` to:
- Change theme colors
- Enable social logins (Google, Apple, Facebook)
- Adjust network settings
- Modify authentication methods

## Troubleshooting

**Not receiving OTP emails?**
- Check spam folder
- Verify email address
- Try a different email provider

**Transaction failing?**
- Make sure you have test ETH
- Check contract address is correct
- Verify you're on Base Sepolia (chain ID 84532)

**Balance showing 0?**
- Get test ETH from faucet
- Wait a few seconds for balance to update
- Check address on BaseScan

## Support

- 📚 [Full Documentation](./CDP_INTEGRATION.md)
- 🌐 [CDP Docs](https://docs.cdp.coinbase.com/embedded-wallets/welcome)
- 🔧 [CDP Portal](https://portal.cdp.coinbase.com/)

---

**Ready to build? Let's go! 🎮**

# Synapse SDK Setup - Simplified Official Guide

Based on official documentation: https://docs.filecoin.cloud/

## ✅ What You Actually Need

According to the **official Filecoin Cloud docs**, Synapse SDK only requires:

1. **Private Key** - For signing transactions
2. **RPC URL** - For network connection (already configured)

**That's it!** No API keys, project IDs, or registry CIDs needed.

## 🚀 Complete Setup (3 Steps)

### Step 1: Generate a Synapse Wallet

Run this command to create a new wallet:

```bash
node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address, '\nPrivate Key:', w.privateKey);"
```

**Output:**
```
Address: 0x1234567890abcdef1234567890abcdef12345678
Private Key: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

### Step 2: Add Private Key to .env.local

Copy your private key and paste it:

```bash
NEXT_PUBLIC_SYNAPSE_PRIVATE_KEY=0xYourPrivateKeyHere
```

### Step 3: Get Test Tokens

Your wallet needs two types of test tokens:

#### A. tFIL (for gas fees)
- **Visit**: https://faucet.calibration.fildev.network/
- **Paste your address** from Step 1
- **Click "Send Funds"**

#### B. USDFC (for storage payments)
- **Visit**: https://faucet.calibration.fildev.network/funds.html
- **Paste your address** from Step 1
- **Click "Send Funds"**

**Done!** Restart your dev server and you're ready.

## 📝 Configuration Details

### Environment Variables (.env.local)

**Required:**
```bash
NEXT_PUBLIC_SYNAPSE_PRIVATE_KEY=0xYourPrivateKeyHere
```

**Optional (has sensible defaults):**
```bash
# Not needed - already configured in code
# NEXT_PUBLIC_SYNAPSE_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
```

### Code Configuration (lib/synapse-config.ts)

```typescript
export const SYNAPSE_CONFIG = {
  privateKey: process.env.NEXT_PUBLIC_SYNAPSE_PRIVATE_KEY || '',
  rpcURL: CURRENT_NETWORK.http, // Calibration testnet
} as const
```

### Initialization (hooks/useSynapseStorage.ts)

```typescript
const synapse = await Synapse.create({
  privateKey: SYNAPSE_CONFIG.privateKey,
  rpcURL: SYNAPSE_CONFIG.rpcURL,
})
```

## 🔍 How It Works

```
Upload Data Flow:
1. Convert data to bytes
2. Call synapse.storage.upload(bytes)
3. Receive PieceCID
4. Cache CID in localStorage
5. Use CID to download later

Download Data Flow:
1. Get CID from localStorage
2. Call synapse.storage.download(pieceCID)
3. Convert bytes back to data
4. Return to application
```

## ✅ Verification

### Check Configuration

After setup, check if Synapse is configured:

```bash
npm run dev
```

Open browser console and look for:
```
✅ Synapse SDK configured
```

### Check Token Balances

Visit: https://calibration.filfox.info/en/address/YOUR_ADDRESS

You should see:
- ✅ tFIL balance > 0
- ✅ USDFC balance > 0

### Test Upload

Place a bet and check console for:
```
📤 Uploading user stats for 0x1234...
✅ User stats uploaded successfully
   Piece CID: bafybeiabc123...
   Size: 1234 bytes
```

## 🔒 Security Best Practices

From the official docs:

> "Instead of hardcoding `privateKey` in the code, you should always consider to store and access it from `.env` files."

✅ **DO:**
- Store private key in `.env.local`
- Use a dedicated wallet for Synapse
- Keep `.env.local` in `.gitignore`
- Limit funds in the Synapse wallet

❌ **DON'T:**
- Hardcode private keys in code
- Commit `.env.local` to git
- Use your main wallet
- Share private keys

## 📊 Requirements

### System Requirements

- **Node.js 20+** (required by Synapse SDK)
- **npm, yarn, or pnpm** (package manager)
- **ethers v6** (peer dependency)

### Network Requirements

- **Filecoin Calibration** (testnet - free)
- Chain ID: 314159
- RPC: https://api.calibration.node.glif.io/rpc/v1

### Token Requirements

- **tFIL**: For transaction gas fees
- **USDFC**: For storage payments

Both available free from faucets!

## 🎯 Storage Specifications

According to the developer guide:

### Upload Limits
- **Minimum size**: 127 bytes
- **Maximum size**: 200 MiB
- **Supported formats**: Any binary data

### Metadata Limits
- **Dataset metadata**: Max 10 key-value pairs
- **Piece metadata**: Max 5 key-value pairs
- **Key length**: Max 32 characters
- **Value length**: Max 128 characters

### PieceCID Format
- **Format**: v2 CID
- **Prefix**: `bafkzcib`
- **Length**: 64-65 characters
- **Example**: `bafkzcibcaab...`

## 🐛 Troubleshooting

### "Synapse SDK not configured"

**Cause**: Private key not set in `.env.local`

**Fix**:
1. Add `NEXT_PUBLIC_SYNAPSE_PRIVATE_KEY=0x...` to `.env.local`
2. Restart dev server

### "Failed to upload user stats"

**Cause**: Insufficient tokens

**Fix**:
1. Check balances: https://calibration.filfox.info/en/address/YOUR_ADDRESS
2. Get more tFIL: https://faucet.calibration.fildev.network/
3. Get more USDFC: https://faucet.calibration.fildev.network/funds.html

### "Invalid private key"

**Cause**: Wrong format or missing `0x` prefix

**Fix**: Ensure private key:
- Starts with `0x`
- Is 66 characters long (including `0x`)
- Contains only hex characters (0-9, a-f)

## 📚 Official Resources

- **Getting Started**: https://docs.filecoin.cloud/getting-started/
- **Developer Guide**: https://docs.filecoin.cloud/developer-guides/
- **SDK GitHub**: https://github.com/FilOzone/synapse-sdk
- **SDK NPM**: https://www.npmjs.com/package/@filoz/synapse-sdk
- **Faucet (tFIL)**: https://faucet.calibration.fildev.network/
- **Faucet (USDFC)**: https://faucet.calibration.fildev.network/funds.html
- **Explorer**: https://calibration.filfox.info/

## 🎉 You're All Set!

Once you have:
1. ✅ Private key in `.env.local`
2. ✅ tFIL in your wallet
3. ✅ USDFC in your wallet

Your leaderboard will automatically store data on Filecoin! 🚀

---

**Questions?** Check the official docs or verify your setup using the steps above.

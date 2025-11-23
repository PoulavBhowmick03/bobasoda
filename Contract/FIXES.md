# Hydration and Wallet Connection Fixes

## Issues Fixed

### 1. Hydration Mismatch Error ✅
**Problem**: React was complaining about server/client HTML mismatch because we were accessing `window.ethereum` during server-side rendering.

**Solution**:
- Added a `mounted` state to the Web3Provider
- Component now waits for client-side mount before initializing Web3
- Returns a default context during SSR to prevent hydration mismatch

**Files Modified**:
- `Frontend/lib/web3/provider.tsx`

### 2. Wallet Connection Error Handling ✅
**Problem**: Wallet connection failures weren't providing clear feedback.

**Solution**:
- Added try-catch with user-friendly error messages
- Added alert when wallet connection fails
- Added console warning when contract address is not set

**Files Modified**:
- `Frontend/lib/web3/provider.tsx`

## How to Test

1. **Start the development server**:
   ```bash
   cd Frontend
   npm run dev
   ```
   Server is running at: http://localhost:3001

2. **Open in browser**:
   - Navigate to http://localhost:3001
   - You should see the connect wallet screen without any console errors

3. **Connect MetaMask**:
   - Click "Connect Wallet"
   - Approve in MetaMask
   - Should switch to Base Sepolia network automatically

4. **Check Console**:
   - You should see a warning: "Contract address not set. Please deploy the contract..."
   - This is expected until you deploy the contract

## Next Steps

### Before the app will fully work:

1. **Deploy the Smart Contract** (see INTEGRATION_GUIDE.md):
   ```bash
   cd Backend/contracts/v2
   # Update .env.local with your private key
   # Update config.ts with admin/operator addresses
   npx hardhat run scripts/deploy.ts --network testnet
   ```

2. **Update Contract Address**:
   - Copy the deployed contract address
   - Update `Frontend/lib/contracts/config.ts`:
     ```typescript
     export const CONTRACT_ADDRESSES = {
       baseSepolia: 'YOUR_DEPLOYED_CONTRACT_ADDRESS', // Replace this
     } as const;
     ```

3. **Initialize the Contract** (operator only):
   ```bash
   # Call genesisStartRound()
   # Wait 20 seconds
   # Call genesisLockRound()
   # Set up automated executeRound() calls
   ```

4. **Refresh the Frontend**:
   - The app should now load round data
   - You can place bets by swiping

## Known Warnings (Safe to Ignore)

1. **Solana Actions Content Script Error**:
   - This is from a browser extension (Solana wallet)
   - Not related to our app
   - Safe to ignore

2. **Contract Address Not Set**:
   - Expected until you deploy the contract
   - Will disappear after updating the contract address

## Changes Made to Fix Hydration

### Before:
```typescript
export function Web3Provider({ children }: Web3ProviderProps) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  // ... other state

  useEffect(() => {
    // This was accessing window.ethereum during SSR
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', ...);
    }
  }, []);

  // ...
}
```

### After:
```typescript
export function Web3Provider({ children }: Web3ProviderProps) {
  const [mounted, setMounted] = useState(false); // NEW
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  // ... other state

  // NEW: Wait for client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return; // NEW: Skip during SSR

    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', ...);
    }
  }, [mounted]);

  // NEW: Return default context during SSR
  if (!mounted) {
    return (
      <Web3Context.Provider value={/* default values */}>
        {children}
      </Web3Context.Provider>
    );
  }

  // ... rest of component
}
```

## Testing Checklist

- [x] Dev server starts without errors
- [x] No hydration mismatch warnings
- [ ] Wallet connects successfully (need MetaMask)
- [ ] Network switches to Base Sepolia (need MetaMask)
- [ ] Contract data loads (need deployed contract)
- [ ] Bets can be placed (need deployed & initialized contract)

## Development Mode

The app is currently in **development mode** because:
1. Contract address is set to zero address (0x0000...0000)
2. Contract hasn't been deployed yet
3. No rounds are active

Once you complete the deployment steps above, the app will be fully functional!

## Port Note

The dev server is running on **port 3001** instead of 3000 because port 3000 is already in use.

Access the app at: **http://localhost:3001**

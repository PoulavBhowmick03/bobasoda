# Deployment Guide for Base Sepolia

This guide will help you deploy the PancakePredictionV2 contract to Base Sepolia testnet.

## Prerequisites

1. **Install Foundry** (if not already installed):
   ```bash
   # On Windows, use WSL or Git Bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Get Base Sepolia ETH**:
   - Visit [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
   - Connect your MetaMask wallet (make sure you're on Base Sepolia network)
   - Request testnet ETH (you'll need ~0.01 ETH for deployment)

3. **Add Base Sepolia to MetaMask**:
   - Network Name: Base Sepolia
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia.basescan.org

## Step 1: Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   cd a:\bobasoda\Backend\contracts
   cp .env.example .env
   ```

2. Edit `.env` and add your private key:
   ```bash
   # Get your private key from MetaMask:
   # 1. Click on the 3 dots next to your account
   # 2. Account Details > Show Private Key
   # 3. Copy the private key

   PRIVATE_KEY=your_private_key_here_without_0x_prefix
   ```

   **⚠️ IMPORTANT**: Never commit your `.env` file to git! It's already in `.gitignore`.

## Step 2: Install Dependencies

```bash
cd a:\bobasoda\Backend\contracts
forge install
```

## Step 3: Deploy the Contract

Run the deployment script:

```bash
forge script script/DeployPrediction.s.sol:DeployPrediction \
  --rpc-url base_sepolia \
  --broadcast \
  -vvvv
```

**What this does:**
- Deploys PancakePredictionV2 contract to Base Sepolia
- Uses the Chainlink ETH/USD oracle at `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1`
- Sets you as admin and operator
- Configures:
  - 5-minute betting rounds
  - 0.001 ETH minimum bet
  - 3% treasury fee

The deployment script will output the contract address. Save this!

## Step 4: Verify the Contract (Optional but Recommended)

After deployment, verify the contract on BaseScan:

```bash
forge verify-contract \
  <CONTRACT_ADDRESS> \
  src/contracts/PancakePredictionV2.sol:PancakePredictionV2 \
  --chain base-sepolia \
  --constructor-args $(cast abi-encode "constructor(address,address,address,uint256,uint256,uint256,uint256,uint256)" \
    0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1 \
    <YOUR_WALLET_ADDRESS> \
    <YOUR_WALLET_ADDRESS> \
    300 \
    30 \
    1000000000000000 \
    60 \
    300) \
  --etherscan-api-key <YOUR_ETHERSCAN_API_KEY>
```

## Step 5: Start the First Round

After deployment, you need to initialize the prediction market:

```bash
# Start genesis round
cast send <CONTRACT_ADDRESS> "genesisStartRound()" \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY

# Wait ~5 minutes for the interval, then lock the genesis round
cast send <CONTRACT_ADDRESS> "genesisLockRound()" \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY
```

After this, the contract will be ready for users to place bets!

## Step 6: Set Up Automated Round Execution (Important!)

The contract requires someone to call `executeRound()` every 5 minutes to:
1. Lock the current round
2. End the previous round
3. Start a new round

**Option A: Manual Execution** (for testing):
```bash
# Run this every 5 minutes
cast send <CONTRACT_ADDRESS> "executeRound()" \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY
```

**Option B: Automated Bot** (recommended for production):
Create a simple Node.js script or use a cron job to call `executeRound()` automatically.

## Step 7: Update Frontend Configuration

1. Copy the deployed contract address
2. Update `Frontend/lib/contracts/config.ts`:
   ```typescript
   export const CONTRACT_ADDRESSES = {
     baseSepolia: '0xYOUR_DEPLOYED_CONTRACT_ADDRESS',
   } as const;
   ```

3. Restart your frontend dev server:
   ```bash
   cd a:\bobasoda\Frontend
   npm run dev
   ```

## Troubleshooting

### "Insufficient funds" error
- Make sure you have Base Sepolia ETH in your wallet
- Get more from the faucet

### "Nonce too high" error
- Reset your MetaMask account: Settings > Advanced > Clear Activity Tab Data

### "Contract not responding" in frontend
- Make sure you ran `genesisStartRound()` and `genesisLockRound()`
- Check that you're on Base Sepolia network in MetaMask
- Verify the contract address in the frontend config

### "Round not bettable"
- Make sure `executeRound()` is being called every 5 minutes
- Check the current round status on BaseScan

## Contract Addresses

- **Chainlink ETH/USD Oracle (Base Sepolia)**: `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1`
- **Your Deployed Contract**: (will be shown after deployment)

## Useful Commands

```bash
# Check current epoch
cast call <CONTRACT_ADDRESS> "currentEpoch()(uint256)" --rpc-url base_sepolia

# Check if genesis has started
cast call <CONTRACT_ADDRESS> "genesisStartOnce()(bool)" --rpc-url base_sepolia

# Check round data
cast call <CONTRACT_ADDRESS> "rounds(uint256)((uint256,uint256,uint256,uint256,int256,int256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool))" <EPOCH> --rpc-url base_sepolia

# Pause contract (admin only)
cast send <CONTRACT_ADDRESS> "pause()" --rpc-url base_sepolia --private-key $PRIVATE_KEY

# Unpause contract (admin only)
cast send <CONTRACT_ADDRESS> "unpause()" --rpc-url base_sepolia --private-key $PRIVATE_KEY
```

## Next Steps

1. Test betting functionality with small amounts
2. Monitor rounds and ensure `executeRound()` is called regularly
3. Set up a backend service to automate round execution
4. Test claiming rewards after rounds end

## Support

- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
- [Base Sepolia Explorer](https://sepolia.basescan.org)
- [Foundry Documentation](https://book.getfoundry.sh/)

# Prediction Contract Deployment Guide

## Deploy to Base Sepolia

Your prediction market needs a smart contract deployed on Base Sepolia testnet.

### Prerequisites

- [ ] Private key with Base Sepolia ETH (get from [Base Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))
- [ ] Contract source code
- [ ] BaseScan API key (get from [BaseScan](https://basescan.org/myapikey))

### Deployment Steps

#### Method 1: Using Foundry (Recommended)

```bash
# Install Foundry if not installed
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Navigate to contracts directory
cd Contract/Backend/contracts

# Create .env file
cat > .env << EOF
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASESCAN_API_KEY=your_api_key_here
EOF

# Deploy the contract
forge create \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  src/contracts/PredictionV3.sol:PredictionV3 \
  --constructor-args \
    0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1 \  # Chainlink ETH/USD Oracle (Base Sepolia)
    $(cast wallet address $PRIVATE_KEY) \            # Admin address (your wallet)
    $(cast wallet address $PRIVATE_KEY) \            # Operator address (your wallet)
    300 \                                            # Interval: 300 seconds (5 minutes)
    30 \                                             # Buffer: 30 seconds
    1000000000000000 \                               # Min bet: 0.001 ETH
    1800 \                                           # Oracle allowance: 1800 seconds (30 min)
    300                                              # Treasury fee: 300 = 3%

# Save the deployed contract address
# Update Frontend/.env.local with NEXT_PUBLIC_PREDICTION_CONTRACT=<address>
```

#### Method 2: Using Remix IDE (Easier)

1. **Open [Remix IDE](https://remix.ethereum.org/)**

2. **Upload Contract:**
   - Create new file: `PredictionV3.sol`
   - Paste your contract code
   - Upload any dependencies

3. **Compile:**
   - Click "Solidity Compiler" tab
   - Select compiler version (e.g., 0.8.20)
   - Click "Compile"

4. **Connect MetaMask:**
   - Switch to Base Sepolia network in MetaMask
   - Network details:
     - Network Name: Base Sepolia
     - RPC URL: https://sepolia.base.org
     - Chain ID: 84532
     - Currency Symbol: ETH
     - Block Explorer: https://sepolia.basescan.org

5. **Deploy:**
   - Click "Deploy & Run Transactions" tab
   - Environment: "Injected Provider - MetaMask"
   - Select your contract from dropdown
   - Fill constructor parameters:
     ```
     _oracle: 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1
     _adminAddress: <your-wallet-address>
     _operatorAddress: <your-wallet-address>
     _intervalSeconds: 300
     _bufferSeconds: 30
     _minBetAmount: 1000000000000000
     _oracleUpdateAllowance: 1800
     _treasuryFee: 300
     ```
   - Click "Deploy"
   - Confirm in MetaMask

6. **Verify Contract (Optional):**
   - Go to [BaseScan](https://sepolia.basescan.org)
   - Find your contract
   - Click "Verify and Publish"
   - Follow the verification steps

7. **Copy Contract Address:**
   - Copy the deployed contract address from Remix or BaseScan

### Update Frontend Configuration

After deploying, update your frontend:

```bash
# Edit Frontend/.env.local
NEXT_PUBLIC_PREDICTION_CONTRACT=<your-deployed-contract-address>
```

### Constructor Parameters Explained

| Parameter | Value | Description |
|-----------|-------|-------------|
| `_oracle` | `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1` | Chainlink ETH/USD price feed on Base Sepolia |
| `_adminAddress` | Your wallet address | Admin who can pause/unpause contract |
| `_operatorAddress` | Your wallet address | Operator who can execute rounds |
| `_intervalSeconds` | `300` (5 min) | Duration of each round |
| `_bufferSeconds` | `30` | Time window for executing rounds |
| `_minBetAmount` | `1000000000000000` (0.001 ETH) | Minimum bet amount |
| `_oracleUpdateAllowance` | `1800` (30 min) | How old oracle data can be |
| `_treasuryFee` | `300` (3%) | Fee percentage (basis points) |

### Initialize Contract

After deployment, initialize the prediction market:

```bash
# Using cast
cast send $CONTRACT_ADDRESS "genesisStartRound()" \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY

# Wait 5 minutes (interval duration)
sleep 300

# Lock genesis round
cast send $CONTRACT_ADDRESS "genesisLockRound()" \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY
```

### Verify Deployment

Check your contract on BaseScan:
```
https://sepolia.basescan.org/address/<your-contract-address>
```

Verify it's working:
```bash
# Check current epoch
cast call $CONTRACT_ADDRESS "currentEpoch()(uint256)" \
  --rpc-url https://sepolia.base.org

# Check interval
cast call $CONTRACT_ADDRESS "intervalSeconds()(uint256)" \
  --rpc-url https://sepolia.base.org
```

### Troubleshooting

**"Insufficient funds" error:**
- Get test ETH from [Base Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)

**"Contract creation failed":**
- Check constructor parameters are correct
- Ensure you're on Base Sepolia network (chain ID: 84532)
- Verify you have enough ETH for gas

**Contract not verified:**
- Make sure to use `--verify` flag with Foundry
- Or manually verify on BaseScan after deployment

### Resources

- **Base Sepolia RPC:** https://sepolia.base.org
- **Base Sepolia Explorer:** https://sepolia.basescan.org
- **Chainlink Oracle (ETH/USD):** 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1
- **Base Faucet:** https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **Remix IDE:** https://remix.ethereum.org/

---

After deployment, update `Frontend/.env.local` with your contract address and restart your dev server!

# ETH Price Prediction With Chainlink Oracle (Base Chain)

## Description

Price prediction market using Chainlink Oracle on Base chain. Users bet ETH on whether the ETH/USD price will be higher (Bull) or lower (Bear) at the end of each round.

## Documentation

## Oracle Price Feed (Chainlink)

- https://docs.chain.link/data-feeds/price-feeds/addresses?network=base
- https://docs.chain.link/data-feeds
- https://github.com/smartcontractkit/chainlink

### ETH/USD on Base

- Base Mainnet: 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70
- Base Sepolia (Testnet): 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1

## Deployment

### Prerequisites

1. Set your private keys in `.env` file:
```bash
KEY_MAINNET=your_mainnet_private_key
KEY_TESTNET=your_testnet_private_key
```

2. Update `config.ts` with your admin and operator addresses

3. Install dependencies:
```bash
yarn install
```

### Deploy to Base Sepolia (Testnet)

```bash
npx hardhat run scripts/deploy.ts --network testnet
```

### Deploy to Base Mainnet

```bash
npx hardhat run scripts/deploy.ts --network mainnet
```

### Operation

When a round is started, the round's `lockTimestamp` and `closeTimestamp` are set.

`lockTimestamp` = current timestamp + `intervalSeconds`

`closeTimestamp` = current timestamp + (`intervalSeconds` * 2)

**Note**: V2 uses timestamp-based timing (not block-based) which is ideal for Base chain.

## Kick-start Rounds

The rounds are always kick-started with:

```
startGenesisRound()
(wait for x blocks)
lockGenesisRound()
(wait for x blocks)
executeRound()
```

## Continue Running Rounds

```
executeRound()
(wait for x blocks)
executeRound()
(wait for x blocks)
```

## Resuming Rounds

After errors like missing `executeRound()` etc.

```
pause()
(Users can't bet, but still is able to withdraw)
unpause()
startGenesisRound()
(wait for x blocks)
lockGenesisRound()
(wait for x blocks)
executeRound()
```

## Common Errors

Refer to `test/prediction.test.js`

## Architecture Illustration

### Normal Operation

![normal](images/normal-round.png)

### Missing Round Operation

![missing](images/missing-round.png)

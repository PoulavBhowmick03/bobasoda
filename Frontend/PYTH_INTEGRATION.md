# Pyth Network Integration Guide (with Chainlink Fallback)

This document explains how the Pyth Network price feeds are integrated into the BobaSoda prediction market frontend for Base network, with Chainlink as a backup oracle.

## Overview

Pyth Network provides real-time price feeds for various cryptocurrencies and assets. This integration uses a **hybrid approach**:

- **Primary**: Pyth Network (faster updates, more tokens, sub-second data)
- **Fallback**: Chainlink (for ETH only, same oracle used by the smart contract)

This allows the frontend to display live prices for multiple token markets (ETH, BTC, SOL, etc.) without modifying the smart contracts, while maintaining reliability through redundancy.

## Architecture

### Components

1. **Pyth Configuration** (`lib/pyth-config.ts`)
   - Contains all price feed IDs for supported tokens
   - Pyth contract addresses for Base Mainnet and Base Sepolia
   - Token metadata (symbols, names, decimals)

2. **Price Hooks**
   - `hooks/usePythPrice.ts` - Core Pyth price fetching
     - `usePythPrice(tokenSymbol)` - Fetch price for a single token
     - `usePythPrices(tokenSymbols)` - Batch fetch prices for multiple tokens
   - `hooks/useEthPrice.ts` - Chainlink ETH price (backup)
   - `hooks/usePriceWithFallback.ts` - **Smart hybrid hook** (recommended)
     - Uses Pyth as primary source
     - Falls back to Chainlink for ETH if Pyth fails
     - Automatically handles source switching

3. **Market Components**
   - `market-card.tsx` - Displays price and chart for each token (uses hybrid hook)
   - `wallet-value.tsx` - Manages multiple token markets

## How It Works

### Pull-Based Oracle Model

Pyth uses a pull-based oracle model:
1. **Hermes API** - Fetches latest price updates from Pyth's off-chain Hermes service
2. **Frontend Display** - Prices are displayed in the UI in real-time
3. **Contract Integration** - For on-chain verification, price update data can be submitted to the Pyth contract

### Price Feed IDs

Each token has a universal price feed ID that works across all blockchains:

| Token | Price Feed ID | Network |
|-------|--------------|---------|
| ETH/USD | `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace` | All chains |
| BTC/USD | `0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43` | All chains |
| SOL/USD | `0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d` | All chains |

See `lib/pyth-config.ts` for the complete list.

### Base Network Addresses

- **Base Mainnet**: `0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a`
- **Base Sepolia**: `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729`

## Usage

### Smart Hybrid Hook (Recommended)

Use `usePriceWithFallback` for the best reliability:

```tsx
import { usePriceWithFallback } from '@/hooks/usePriceWithFallback'

function MyComponent() {
  const { price, source, isLoading, error } = usePriceWithFallback('ETH')

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <div>ETH Price: ${price?.toFixed(2)}</div>
      <div className="text-xs">Source: {source}</div> {/* 'pyth' or 'chainlink' */}
    </div>
  )
}
```

**How it works:**
1. **Tries Pyth first** - Faster updates, more accurate
2. **Falls back to Chainlink** - Only for ETH if Pyth fails
3. **Shows source** - Returns which oracle is being used

### Fetching a Single Token Price (Pyth Only)

```tsx
import { usePythPrice } from '@/hooks/usePythPrice'

function MyComponent() {
  const { price, confidence, isLoading, error } = usePythPrice('ETH')

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <div>ETH Price: ${price?.toFixed(2)}</div>
      <div className="text-xs">±${confidence?.toFixed(2)}</div>
    </div>
  )
}
```

### Fetching Multiple Token Prices

```tsx
import { usePythPrices } from '@/hooks/usePythPrice'

function MultiMarket() {
  const prices = usePythPrices(['ETH', 'BTC', 'SOL'])

  return (
    <div>
      <div>ETH: ${prices.ETH?.price?.toFixed(2)}</div>
      <div>BTC: ${prices.BTC?.price?.toFixed(2)}</div>
      <div>SOL: ${prices.SOL?.price?.toFixed(2)}</div>
    </div>
  )
}
```

### Adding a New Token

To add a new token market:

1. **Find the Price Feed ID**
   - Visit https://pyth.network/developers/price-feed-ids
   - Search for your token (e.g., "AVAX/USD")
   - Copy the price feed ID

2. **Update Configuration** (`lib/pyth-config.ts`)

```typescript
export const PYTH_PRICE_FEED_IDS = {
  // ... existing tokens
  AVAX_USD: '0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7',
} as const

export const SUPPORTED_TOKENS: Record<string, TokenConfig> = {
  // ... existing tokens
  AVAX: {
    symbol: 'AVAX',
    name: 'Avalanche',
    priceFeedId: PYTH_PRICE_FEED_IDS.AVAX_USD,
    decimals: 18,
  },
}
```

3. **Add to Markets** (`components/wallet-value.tsx`)

```typescript
const markets = ["ETH", "BTC", "SOL", "AVAX"] // Add your token here
```

## API Reference

### `usePythPrice(tokenSymbol)`

Fetches real-time price for a single token.

**Parameters:**
- `tokenSymbol: keyof typeof SUPPORTED_TOKENS` - Token symbol (e.g., 'ETH', 'BTC')

**Returns:**
```typescript
{
  price: number | null,           // Current price in USD
  confidence: number | null,      // Confidence interval (±)
  lastUpdated: Date | null,       // Last update timestamp
  isLoading: boolean,             // Loading state
  error: string | null            // Error message if any
}
```

**Features:**
- Auto-refreshes every 10 seconds
- Handles errors gracefully
- Converts Pyth's exponential price format to decimal

### `usePythPrices(tokenSymbols)`

Batch fetches prices for multiple tokens.

**Parameters:**
- `tokenSymbols: Array<keyof typeof SUPPORTED_TOKENS>` - Array of token symbols

**Returns:**
```typescript
Record<string, {
  price: number | null,
  confidence: number | null,
  lastUpdated: Date | null,
  isLoading: boolean,
  error: string | null
}>
```

**Benefits:**
- More efficient than multiple `usePythPrice` calls
- Single API request for all tokens
- Synchronized updates

## Hermes API

### Endpoint

```
https://hermes.pyth.network
```

**Production Note:** For production apps, consider using a private Hermes endpoint from Pyth's RPC providers for better reliability.

### API Methods

The Hermes client provides several methods:

```typescript
// Get latest prices
const prices = await hermesClient.getLatestPriceUpdates([priceFeedId])

// Search price feeds
const feeds = await hermesClient.getPriceFeeds({
  query: "btc",
  assetType: "crypto"
})

// Stream real-time updates (SSE)
const stream = await hermesClient.getPriceUpdatesStream([priceFeedId])
```

## Contract Integration (Future)

While the current implementation only displays prices in the frontend, you can integrate Pyth prices into your smart contracts:

1. **Install Pyth SDK in your contract:**
```solidity
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";

contract MyContract {
    IPyth pyth;

    constructor(address pythContract) {
        pyth = IPyth(pythContract);
    }
}
```

2. **Update prices on-chain:**
```solidity
function updatePrice(bytes[] calldata priceUpdateData) public payable {
    uint fee = pyth.getUpdateFee(priceUpdateData);
    pyth.updatePriceFeeds{value: fee}(priceUpdateData);
}
```

3. **Read prices:**
```solidity
function getPrice(bytes32 priceId) public view returns (int64) {
    PythStructs.Price memory price = pyth.getPrice(priceId);
    return price.price;
}
```

## Price Data Format

Pyth returns prices in a special format:

```typescript
{
  price: "180523",      // Raw price value
  conf: "150",          // Confidence interval
  expo: -2,             // Exponent
  publish_time: 1234567890
}
```

**Actual Price Calculation:**
```
actual_price = price × 10^expo
actual_price = 180523 × 10^(-2) = 1805.23
```

This is automatically handled by the `usePythPrice` hooks.

## Troubleshooting

### "No price data returned from Hermes"

**Cause:** Network issue or invalid price feed ID

**Solution:**
1. Check internet connection
2. Verify price feed ID at https://pyth.network/developers/price-feed-ids
3. Ensure Hermes endpoint is accessible
4. For ETH, the app will automatically fall back to Chainlink

### Why Keep Both Oracles?

**Redundancy**: If Pyth's Hermes API is down or rate-limited, Chainlink ensures ETH prices are still available.

**Contract Alignment**: The prediction contract uses Chainlink for ETH, so having it as a fallback ensures frontend prices can match contract prices.

**Best of Both Worlds**:
- **Pyth**: Sub-second updates, more tokens, lower latency
- **Chainlink**: Battle-tested, on-chain verification, contract consistency

**When Chainlink is Used**:
- Pyth API is unreachable
- Pyth returns an error
- Network connectivity issues with Hermes

You'll see a small badge showing "⚡ Pyth" or "🔗 Chainlink" on the market card to indicate which source is active.

### Prices not updating

**Cause:** Hermes API rate limiting or network issues

**Solution:**
1. Check browser console for errors
2. Consider using a private Hermes endpoint
3. Increase refresh interval if needed (edit `usePythPrice.ts`)

### "Unsupported token" error

**Cause:** Token not configured in `lib/pyth-config.ts`

**Solution:**
1. Add the token configuration following the steps above
2. Ensure price feed ID is correct

## Resources

- **Pyth Documentation**: https://docs.pyth.network/
- **Price Feed IDs**: https://pyth.network/developers/price-feed-ids
- **Base Integration Guide**: https://docs.base.org/learn/onchain-app-development/finance/access-real-time-asset-data-pyth-price-feeds
- **Hermes API Docs**: https://docs.pyth.network/price-feeds/api-instances-and-providers/hermes
- **Contract Addresses**: https://docs.pyth.network/price-feeds/core/contract-addresses/evm

## Performance Considerations

### Refresh Intervals

The hooks refresh prices every 10 seconds by default. You can adjust this in `hooks/usePythPrice.ts`:

```typescript
// Change 10000ms (10s) to desired interval
const interval = setInterval(fetchPrice, 10000)
```

### Batch Fetching

When displaying multiple markets, use `usePythPrices` instead of multiple `usePythPrice` calls:

```tsx
// ❌ Less efficient - multiple API calls
const ethPrice = usePythPrice('ETH')
const btcPrice = usePythPrice('BTC')
const solPrice = usePythPrice('SOL')

// ✅ More efficient - single batched API call
const prices = usePythPrices(['ETH', 'BTC', 'SOL'])
```

### Caching

The Hermes API has built-in caching. Multiple requests for the same price within a short time window will be served from cache.

## Security Notes

1. **Price Verification**: For production, always verify prices on-chain using the Pyth contract
2. **Confidence Intervals**: Check the confidence interval to ensure price accuracy
3. **Staleness**: Verify `publish_time` to ensure prices aren't stale
4. **Rate Limiting**: Implement rate limiting if making frequent API calls

## Migration from Chainlink

If migrating from Chainlink to Pyth:

1. **Old Chainlink Integration** (`hooks/useEthPrice.ts`):
```typescript
const chainlinkPrice = await publicClient.readContract({
  address: CHAINLINK_ETH_USD,
  abi: CHAINLINK_ABI,
  functionName: 'latestAnswer',
})
```

2. **New Pyth Integration** (`hooks/usePythPrice.ts`):
```typescript
const { price } = usePythPrice('ETH')
```

**Benefits of Pyth:**
- More frequent updates (sub-second)
- More tokens supported
- Pull-based model (lower gas costs)
- Universal price feed IDs across chains

---

**Need Help?**
- Pyth Discord: https://discord.gg/pythnetwork
- GitHub Issues: https://github.com/pyth-network/pyth-crosschain

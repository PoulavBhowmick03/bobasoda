#!/bin/bash

# Monitor Pyth ETH/USD price every 5 seconds for 30 seconds
# Usage: ./monitor-pyth-price.sh

PYTH_CONTRACT="0xA2aa501b19aff244D90cc15a4Cf739D2725B5729"
PRICE_FEED_ID="0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"
RPC_URL="https://sepolia.base.org"

echo ""
echo "========================================"
echo "  PYTH PRICE MONITOR - ETH/USD"
echo "========================================"
echo "Pyth Contract: $PYTH_CONTRACT"
echo "Price Feed ID: $PRICE_FEED_ID"
echo "Network: Base Sepolia"
echo "Interval: 5 seconds"
echo "Duration: 30 seconds (6 readings)"
echo "========================================"
echo ""

# Function to get price
get_price() {
    local reading=$1
    local timestamp=$(date +"%H:%M:%S")

    echo "=== Reading $reading (Time: $timestamp) ==="

    # Get price data from Pyth
    local result=$(cast call $PYTH_CONTRACT "getPriceUnsafe(bytes32)(int64,uint64,int32,uint256)" $PRICE_FEED_ID --rpc-url $RPC_URL 2>/dev/null)

    if [ $? -eq 0 ]; then
        # Parse the result (price, conf, expo, publishTime)
        local price=$(echo $result | awk '{print $1}')
        local conf=$(echo $result | awk '{print $2}')
        local expo=$(echo $result | awk '{print $3}')
        local publishTime=$(echo $result | awk '{print $4}')

        echo "  Raw Price: $price"
        echo "  Exponent: $expo"
        echo "  Confidence: $conf"
        echo "  Publish Time: $publishTime"

        # Convert to human readable (assuming expo is -8)
        if [ "$expo" == "-8" ]; then
            local dollars=$((price / 100000000))
            local cents=$((price % 100000000))
            printf "  Human Price: \$%d.%08d\n" $dollars $cents
        fi

        # Store price for change calculation
        echo "$price" > /tmp/pyth_price_$reading.tmp

        # Calculate change from previous reading
        if [ $reading -gt 1 ]; then
            local prev_reading=$((reading - 1))
            if [ -f /tmp/pyth_price_$prev_reading.tmp ]; then
                local prev_price=$(cat /tmp/pyth_price_$prev_reading.tmp)
                local change=$((price - prev_price))
                local abs_change=${change#-}

                if [ $change -gt 0 ]; then
                    printf "  Change: +%d (↑ UP)\n" $abs_change
                elif [ $change -lt 0 ]; then
                    printf "  Change: -%d (↓ DOWN)\n" $abs_change
                else
                    echo "  Change: 0 (→ NO CHANGE)"
                fi
            fi
        fi

        echo ""
    else
        echo "  ERROR: Failed to fetch price"
        echo ""
    fi
}

# Main monitoring loop
for i in {1..6}; do
    get_price $i

    # Sleep for 5 seconds unless it's the last iteration
    if [ $i -lt 6 ]; then
        sleep 5
    fi
done

# Cleanup temp files
rm -f /tmp/pyth_price_*.tmp

echo "========================================"
echo "  MONITORING COMPLETE"
echo "========================================"
echo ""
echo "Key Observations:"
echo "1. Pyth updates prices on-chain when:"
echo "   - Price moves significantly (beyond threshold)"
echo "   - Maximum staleness time reached"
echo "   - Market volatility is high"
echo ""
echo "2. On Base Sepolia (testnet):"
echo "   - Updates may be less frequent than mainnet"
echo "   - Typical update: every 1-10 seconds"
echo "   - Mainnet updates: every ~400ms possible"
echo ""
echo "3. Price changes depend on:"
echo "   - Market volatility"
echo "   - Trading activity"
echo "   - Time of day"
echo ""

#!/bin/bash

CONTRACT=0xbF13C347583a4116ebbcB6c189538203a56d8401
RPC=https://sepolia.base.org

echo "🔍 Starting Prediction Market Monitor"
echo "Contract: $CONTRACT"
echo "Checking every 10 seconds... (Ctrl+C to stop)"
echo ""

while true; do
    clear

    # Get current epoch
    EPOCH=$(cast call $CONTRACT "currentEpoch()(uint256)" --rpc-url $RPC)

    # Get round data
    ROUND_DATA=$(cast call $CONTRACT "rounds(uint256)" $EPOCH --rpc-url $RPC)

    # Parse hex data (skip 0x, each field is 64 hex chars)
    START_HEX=${ROUND_DATA:66:64}
    LOCK_HEX=${ROUND_DATA:130:64}
    CLOSE_HEX=${ROUND_DATA:194:64}
    TOTAL_HEX=${ROUND_DATA:514:64}
    BULL_HEX=${ROUND_DATA:578:64}
    BEAR_HEX=${ROUND_DATA:642:64}

    # Convert hex to decimal
    START=$((16#$START_HEX))
    LOCK=$((16#$LOCK_HEX))
    CLOSE=$((16#$CLOSE_HEX))
    TOTAL=$((16#$TOTAL_HEX))
    BULL=$((16#$BULL_HEX))
    BEAR=$((16#$BEAR_HEX))

    NOW=$(date +%s)

    echo "╔════════════════════════════════════════════════════════╗"
    echo "║     PREDICTION MARKET MONITOR - EPOCH $EPOCH"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
    echo "⏰ Current Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "📅 Round Schedule:"
    echo "   Start: $(date -r $START '+%H:%M:%S')"
    echo "   Lock:  $(date -r $LOCK '+%H:%M:%S')"
    echo "   Close: $(date -r $CLOSE '+%H:%M:%S')"
    echo ""

    # Check status
    if [ $NOW -ge $START ] && [ $NOW -lt $LOCK ]; then
        REMAINING=$((LOCK - NOW))
        MIN=$((REMAINING / 60))
        SEC=$((REMAINING % 60))

        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ BETTING IS OPEN! ✅"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "⏰ Time Remaining: ${MIN}m ${SEC}s"
        echo ""
        echo "💰 Current Bets:"

        # Convert wei to ETH (divide by 10^18)
        TOTAL_ETH=$(echo "scale=6; $TOTAL / 1000000000000000000" | bc)
        BULL_ETH=$(echo "scale=6; $BULL / 1000000000000000000" | bc)
        BEAR_ETH=$(echo "scale=6; $BEAR / 1000000000000000000" | bc)

        echo "   Total: $TOTAL_ETH ETH"
        echo "   🐂 Bull: $BULL_ETH ETH"
        echo "   🐻 Bear: $BEAR_ETH ETH"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📝 To place a bet (min 0.0001 ETH):"
        echo ""
        echo "Bull (Price UP):"
        echo "  cast send $CONTRACT 'betBull(uint256)' $EPOCH \\"
        echo "    --value 0.001ether --private-key \$PRIVATE_KEY --rpc-url $RPC"
        echo ""
        echo "Bear (Price DOWN):"
        echo "  cast send $CONTRACT 'betBear(uint256)' $EPOCH \\"
        echo "    --value 0.001ether --private-key \$PRIVATE_KEY --rpc-url $RPC"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    elif [ $NOW -lt $START ]; then
        WAIT=$((START - NOW))
        MIN=$((WAIT / 60))
        SEC=$((WAIT % 60))

        echo "⏳ Round Not Started Yet"
        echo "   Starts in: ${MIN}m ${SEC}s"

    else
        echo "❌ Betting Window CLOSED"

        if [ $NOW -lt $CLOSE ]; then
            UNTIL_CLOSE=$((CLOSE - NOW))
            echo "   Round closes in: ${UNTIL_CLOSE}s"
        else
            echo "   Waiting for next round to start..."
        fi
    fi

    echo ""
    echo "Next check in 10 seconds..."
    sleep 10
done

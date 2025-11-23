#!/bin/bash

# Prediction Market Status Checker
# Polls every 30 seconds to monitor market progression

CONTRACT="0xF521D33924dfF881193956Ad7c6e10AB2eA54a39"
RPC_URL="https://sepolia.base.org"
POLL_INTERVAL=30

# Trap Ctrl+C to exit gracefully
trap 'echo ""; echo "Monitoring stopped."; exit 0' INT

while true; do
    # Clear screen for clean display
    clear

    echo ""
    echo "========================================"
    echo "  PREDICTION MARKET STATUS CHECK"
    echo "========================================"
    echo ""
    echo "Contract: $CONTRACT"
    echo "Network: Base Sepolia"
    echo "Time: $(date)"
    echo ""

# Contract State
echo "=== CONTRACT STATE ==="
CURRENT_EPOCH=$(cast call $CONTRACT "currentEpoch()(uint256)" --rpc-url $RPC_URL 2>/dev/null)
PAUSED=$(cast call $CONTRACT "paused()(bool)" --rpc-url $RPC_URL 2>/dev/null)
GENESIS_START=$(cast call $CONTRACT "genesisStartOnce()(bool)" --rpc-url $RPC_URL 2>/dev/null)
GENESIS_LOCK=$(cast call $CONTRACT "genesisLockOnce()(bool)" --rpc-url $RPC_URL 2>/dev/null)

# Convert hex to decimal for epoch
CURRENT_EPOCH_DEC=$(cast --to-dec "$CURRENT_EPOCH" 2>/dev/null)

echo "Current Epoch: $CURRENT_EPOCH_DEC"
echo "Status: $([ "$PAUSED" == "true" ] && echo "PAUSED" || echo "ACTIVE")"
echo "Genesis: $([ "$GENESIS_LOCK" == "true" ] && echo "COMPLETE" || echo "INITIALIZING")"
echo ""


# Check if market has started
if [ "$CURRENT_EPOCH_DEC" == "0" ]; then
    echo "=== MARKET NOT STARTED ==="
    echo "❌ Waiting for genesis start..."
    echo "⏳ This should happen automatically via Chainlink Automation."
    echo ""
    echo "Status: Observing... no action needed from you."
    echo ""
    exit 0
fi

# Function to display round info
display_round() {
    local EPOCH=$1
    local LABEL=$2

    echo "=== $LABEL ==="

    # Get round data
    ROUND=$(cast call $CONTRACT "rounds(uint256)" $EPOCH --rpc-url $RPC_URL 2>/dev/null)

    # Parse the tuple response
    LOCK_PRICE=$(echo "$ROUND" | sed -n '5p' | tr -d ' ')
    CLOSE_PRICE=$(echo "$ROUND" | sed -n '6p' | tr -d ' ')
    ORACLE_CALLED=$(echo "$ROUND" | sed -n '14p' | tr -d ' ')

    echo "Lock Price:  $LOCK_PRICE"
    echo "Close Price: $CLOSE_PRICE"
    echo "Executed:    $ORACLE_CALLED"
    echo ""
}

# Display current round
if [ "$CURRENT_EPOCH_DEC" -gt "0" ]; then
    display_round $CURRENT_EPOCH_DEC "EPOCH $CURRENT_EPOCH_DEC"
fi

# Display previous round
if [ "$CURRENT_EPOCH_DEC" -gt "1" ]; then
    PREV_EPOCH=$((CURRENT_EPOCH_DEC - 1))
    display_round $PREV_EPOCH "EPOCH $PREV_EPOCH"
fi

# Display round before previous
if [ "$CURRENT_EPOCH_DEC" -gt "2" ]; then
    PREV_PREV_EPOCH=$((CURRENT_EPOCH_DEC - 2))
    display_round $PREV_PREV_EPOCH "EPOCH $PREV_PREV_EPOCH"
fi

echo ""
echo "Next check in ${POLL_INTERVAL}s (Ctrl+C to stop)"

# Sleep for poll interval
sleep $POLL_INTERVAL
done

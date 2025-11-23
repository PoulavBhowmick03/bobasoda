#!/bin/bash

# Configuration from .env.local
CONTRACT="0x0000000000000000000000000000000000000000" # TODO: Update with BSC deployment
RPC="https://data-seed-prebsc-1-s1.binance.org:8545"
PRIVATE_KEY="YOUR_PRIVATE_KEY_HERE" # TODO: Update with your private key
INTERVAL_SECONDS=30

# Use cast from PATH
CAST="cast"

echo "🚀 Starting ETH Prediction Game - Unlimited Rounds"
echo "📊 Contract: $CONTRACT"
echo "🔗 Network: BNB Chain Testnet"
echo "⏰ Interval: ${INTERVAL_SECONDS}s per round"
echo "🛑 Press Ctrl+C to stop"
echo ""

# Function to execute command and show result
execute_tx() {
    local description=$1
    local command=$2

    echo "[$description]"
    echo "🔄 Sending transaction..."

    result=$($command 2>&1)

    if echo "$result" | grep -q "status.*1"; then
        tx_hash=$(echo "$result" | grep "transactionHash" | awk '{print $2}')
        echo "✅ Success! TX: $tx_hash"
    else
        echo "⚠️  Error occurred:"
        echo "$result" | head -5
    fi
    echo ""
}

# Step 1: Genesis Start Round (creates Round 1)
echo "================================================"
echo "STEP 1: Initialize Genesis - Starting Round 1"
echo "================================================"
execute_tx "genesisStartRound" "$CAST send $CONTRACT \"genesisStartRound()\" --rpc-url $RPC --private-key $PRIVATE_KEY"

echo "⏳ Waiting ${INTERVAL_SECONDS} seconds for Round 1 to reach lockTimestamp..."
sleep $INTERVAL_SECONDS
echo ""

# Step 2: Genesis Lock Round (locks Round 1, starts Round 2)
echo "================================================"
echo "STEP 2: Lock Genesis - Locking Round 1, Starting Round 2"
echo "================================================"
execute_tx "genesisLockRound" "$CAST send $CONTRACT \"genesisLockRound()\" --rpc-url $RPC --private-key $PRIVATE_KEY"

echo "⏳ Waiting ${INTERVAL_SECONDS} seconds for Round 2 to reach lockTimestamp..."
sleep $INTERVAL_SECONDS
echo ""

# Step 3: Execute rounds infinitely
current_round=3
echo "================================================"
echo "🔄 Starting Unlimited Round Execution"
echo "================================================"
echo ""

while true; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] ================================================"
    echo "[$timestamp] EXECUTING ROUND $current_round"
    echo "[$timestamp] ================================================"
    echo "This will:"
    echo "  - Lock Round $((current_round - 1))"
    echo "  - End Round $((current_round - 2))"
    echo "  - Calculate rewards for Round $((current_round - 2))"
    echo "  - Start Round $current_round"
    echo ""

    execute_tx "executeRound #$current_round" "$CAST send $CONTRACT \"executeRound()\" --rpc-url $RPC --private-key $PRIVATE_KEY"

    echo "⏳ Waiting ${INTERVAL_SECONDS} seconds for next round..."
    echo ""
    sleep $INTERVAL_SECONDS

    current_round=$((current_round + 1))
done

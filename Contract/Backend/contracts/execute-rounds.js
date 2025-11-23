/**
 * Auto-execute rounds every 30 seconds for ETH Prediction Game
 *
 * This script automatically:
 * 1. Checks if contract is initialized
 * 2. Runs genesis if needed (genesisStartRound + genesisLockRound)
 * 3. Executes rounds continuously every 30 seconds
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const CONTRACT = '0x0000000000000000000000000000000000000000'; // TODO: Update with BSC deployment
const RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545';
const KEY = 'YOUR_PRIVATE_KEY_HERE'; // TODO: Update with your private key
const PYTH_CONTRACT = '0x5744Cbf430D99456a0A8771208b674F27f8EF0Fb'; // BSC Testnet Pyth
const ETH_USD_PRICE_ID = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace';

// Use cast from PATH
const CAST = 'cast';
const ROUND_INTERVAL = 30000; // 30 seconds
let roundStartTime = Date.now();
let currentRound = 3;
let lastEthPrice = 0;

console.log('🤖 ETH Prediction Game - Automated Round Manager');
console.log('📊 Contract:', CONTRACT);
console.log('🔗 Network: BNB Chain Testnet');
console.log('⏰ Interval: 30 seconds per round');
console.log('Press Ctrl+C to stop\n');

// Helper function to execute cast commands
async function executeCast(method, description) {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${description}...`);

    const cmd = `${CAST} send ${CONTRACT} "${method}" --rpc-url ${RPC} --private-key ${KEY}`;

    try {
        const { stdout, stderr } = await execAsync(cmd);
        if (stdout.includes('status') && stdout.includes('1')) {
            console.log(`✅ ${description} successful!`);
            return true;
        } else {
            console.log(`⚠️  ${description} failed`);
            console.log(stderr || stdout);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${description} error:`, error.message.split('\n')[0]);
        return false;
    }
}

// Check contract state
async function checkContractState() {
    try {
        const genesisStartCmd = `${CAST} call ${CONTRACT} "genesisStartOnce()(bool)" --rpc-url ${RPC}`;
        const genesisLockCmd = `${CAST} call ${CONTRACT} "genesisLockOnce()(bool)" --rpc-url ${RPC}`;

        const { stdout: startResult } = await execAsync(genesisStartCmd);
        const { stdout: lockResult } = await execAsync(genesisLockCmd);

        const genesisStartOnce = startResult.trim() === 'true';
        const genesisLockOnce = lockResult.trim() === 'true';

        return { genesisStartOnce, genesisLockOnce };
    } catch (error) {
        console.error('Error checking contract state:', error.message);
        return { genesisStartOnce: false, genesisLockOnce: false };
    }
}

// Wait helper
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch ETH price from Pyth oracle
async function fetchEthPrice() {
    try {
        // Call getPriceUnsafe on Pyth contract
        const cmd = `${CAST} call ${PYTH_CONTRACT} "getPriceUnsafe(bytes32)(int64,uint64,int32,uint)" ${ETH_USD_PRICE_ID} --rpc-url ${RPC}`;
        const { stdout } = await execAsync(cmd);

        // Parse the return values (price, conf, expo, publishTime)
        // Price is typically around 400000000000 with expo -8 = $4000
        const lines = stdout.trim().split('\n');
        if (lines.length >= 3) {
            // Parse price (int64) and expo (int32)
            const priceHex = lines[0].trim();
            const expoHex = lines[2].trim();

            // Convert to decimal
            const priceBigInt = BigInt(priceHex);
            const expoBigInt = BigInt(expoHex);

            // Handle signed integers
            const price = Number(priceBigInt);
            const expo = Number(expoBigInt);

            // Calculate actual price
            const formattedPrice = price * Math.pow(10, expo);

            lastEthPrice = formattedPrice;
            return formattedPrice;
        }
    } catch (error) {
        // Silently fail, price fetching is optional
    }
    return lastEthPrice;
}

// Initialize genesis if needed
async function initializeGenesis(skipStart = false) {
    console.log('\n════════════════════════════════════════');
    console.log('GENESIS INITIALIZATION');
    console.log('════════════════════════════════════════\n');

    // Step 1: Start genesis (creates Round 1) - skip if already started
    if (!skipStart) {
        const startSuccess = await executeCast('genesisStartRound()', 'Starting Round 1 (genesisStartRound)');
        if (!startSuccess) {
            console.error('Failed to start genesis. Exiting.');
            process.exit(1);
        }

        console.log('⏳ Waiting 30 seconds for Round 1 to reach lockTimestamp...\n');
        await wait(30000);
    } else {
        console.log('⏭️  Skipping genesisStartRound (already started)');
        console.log('⏳ Waiting 5 seconds before locking...\n');
        await wait(5000);
    }

    // Step 2: Lock genesis (locks Round 1, starts Round 2)
    const lockSuccess = await executeCast('genesisLockRound()', 'Locking Round 1, Starting Round 2 (genesisLockRound)');
    if (!lockSuccess) {
        console.log('⚠️  Failed to lock genesis - Round 1 likely exceeded buffer window');
        console.log('🔄 Resetting contract by pausing and unpausing...\n');

        // Pause contract
        await executeCast('pause()', 'Pausing contract');
        await wait(2000);

        // Unpause contract (resets genesis flags)
        await executeCast('unpause()', 'Unpausing contract (resets genesis)');
        await wait(2000);

        console.log('✅ Contract reset complete. Restarting genesis...\n');

        // Start fresh genesis
        return await initializeGenesis(false);
    }

    console.log('⏳ Waiting 30 seconds for Round 2 to reach lockTimestamp...\n');
    await wait(30000);

    console.log('✅ Genesis initialization complete!\n');
    roundStartTime = Date.now();
}

// Pause and unpause contract to recover from missed rounds
async function recoverContract() {
    console.log('\n⚠️  RECOVERY MODE: Missed buffer window, resetting contract...\n');

    // Pause the contract
    const pauseCmd = `${CAST} send ${CONTRACT} "pause()" --rpc-url ${RPC} --private-key ${KEY}`;
    try {
        await execAsync(pauseCmd);
        console.log('✅ Contract paused');
    } catch (error) {
        console.log('⚠️  Pause failed:', error.message.split('\n')[0]);
    }

    await wait(2000);

    // Unpause the contract (resets genesis flags)
    const unpauseCmd = `${CAST} send ${CONTRACT} "unpause()" --rpc-url ${RPC} --private-key ${KEY}`;
    try {
        await execAsync(unpauseCmd);
        console.log('✅ Contract unpaused (genesis reset)');
    } catch (error) {
        console.log('⚠️  Unpause failed:', error.message.split('\n')[0]);
    }

    console.log('\n🔄 Re-initializing from genesis...\n');
    await initializeGenesis();
    currentRound = 3;
}

// Execute a single round
async function executeRound() {
    const time = new Date().toLocaleTimeString();
    const elapsed = Math.floor((Date.now() - roundStartTime) / 1000);

    console.log(`\n[${time}] ════════════════════════════════════════`);
    console.log(`[${time}] EXECUTING ROUND ${currentRound}`);
    console.log(`[${time}] ════════════════════════════════════════`);
    console.log(`This will:`);
    console.log(`  - Lock Round ${currentRound - 1}`);
    console.log(`  - End Round ${currentRound - 2}`);
    console.log(`  - Calculate rewards for Round ${currentRound - 2}`);
    console.log(`  - Start Round ${currentRound}\n`);

    const cmd = `${CAST} send ${CONTRACT} "executeRound()" --rpc-url ${RPC} --private-key ${KEY}`;

    try {
        const { stdout, stderr } = await execAsync(cmd);
        if (stdout.includes('status') && stdout.includes('1')) {
            console.log(`✅ Round ${currentRound} executed successfully!`);
            const txHash = stdout.match(/transactionHash\s+(\S+)/)?.[1];
            if (txHash) console.log(`   TX: ${txHash}`);
            roundStartTime = Date.now();
            currentRound++;
        } else {
            console.log('⏭️  Execution failed, will retry next interval');
        }
    } catch (error) {
        const errorMsg = error.message;

        // Check if we missed the buffer window
        if (errorMsg.includes('bufferSeconds') || errorMsg.includes('Can only lock round within')) {
            console.log('❌ MISSED BUFFER WINDOW - Recovering...');
            await recoverContract();
        } else {
            console.log('⏭️  Waiting for next interval...');
            console.log('   Error:', errorMsg.split('\n')[0]);
        }
    }

    console.log('');
}

// Main execution loop
async function main() {
    console.log('🔍 Checking contract state...\n');

    const { genesisStartOnce, genesisLockOnce } = await checkContractState();

    console.log('Contract Status:');
    console.log(`  - Genesis Started: ${genesisStartOnce ? '✅' : '❌'}`);
    console.log(`  - Genesis Locked: ${genesisLockOnce ? '✅' : '❌'}\n`);

    // Initialize genesis if needed
    if (!genesisStartOnce || !genesisLockOnce) {
        // If genesis started but not locked, skip the start step
        const skipStart = genesisStartOnce && !genesisLockOnce;
        await initializeGenesis(skipStart);
    } else {
        console.log('✅ Contract already initialized. Starting round execution...\n');
    }

    // Start continuous round execution
    console.log('════════════════════════════════════════');
    console.log('🔄 CONTINUOUS ROUND EXECUTION');
    console.log('════════════════════════════════════════\n');

    // Wait a few seconds to align with round timing
    console.log('⏳ Waiting 5 seconds to align with blockchain timing...\n');
    await wait(5000);

    // Execute first round
    await executeRound();

    // Then execute every 30 seconds - use precise timing
    let executionCount = 1;
    const startTime = Date.now();

    setInterval(async () => {
        // Calculate when this execution should happen for precise timing
        const expectedTime = startTime + (executionCount * ROUND_INTERVAL);
        const now = Date.now();
        const drift = now - expectedTime;

        if (Math.abs(drift) > 2000) {
            console.log(`⚠️  Timing drift detected: ${drift}ms - adjusting...`);
        }

        await executeRound();
        executionCount++;
    }, ROUND_INTERVAL);

    // Status updates every 5 seconds (with ETH price)
    setInterval(async () => {
        const elapsed = Math.floor((Date.now() - roundStartTime) / 1000);
        if (elapsed < 30) {
            // Fetch current ETH price
            const ethPrice = await fetchEthPrice();
            const priceStr = ethPrice > 0 ? ` | 💵 ETH: $${ethPrice.toFixed(2)}` : '';

            const status = elapsed < 25
                ? `🟢 Betting active (${elapsed}/25s until lock)${priceStr}`
                : `🔒 Price locked (${elapsed}/30s until resolution)${priceStr}`;
            console.log(`[${new Date().toLocaleTimeString()}] ${status}`);
        }
    }, 5000);
}

// Run the script
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

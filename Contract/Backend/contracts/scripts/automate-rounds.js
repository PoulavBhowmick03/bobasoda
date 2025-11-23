#!/usr/bin/env node

/**
 * Automated Round Execution Script for PancakePredictionV2
 *
 * This script automatically calls executeRound() every 5 minutes to keep the prediction market running.
 *
 * Usage:
 *   node scripts/automate-rounds.js
 *
 * Environment Variables:
 *   PRIVATE_KEY - Private key of the operator account
 *   CONTRACT_ADDRESS - Address of the deployed PancakePredictionV2 contract
 *   RPC_URL - Base Sepolia RPC URL
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x059B713F5cd6E4339A3f6cc9C036a72D54F749A2';
const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

if (!PRIVATE_KEY) {
  console.error('❌ Error: PRIVATE_KEY environment variable not set');
  console.error('Usage: PRIVATE_KEY=0x... node scripts/automate-rounds.js');
  process.exit(1);
}

console.log('🤖 Prediction Market Round Automation Bot');
console.log('==========================================');
console.log(`Contract: ${CONTRACT_ADDRESS}`);
console.log(`RPC URL: ${RPC_URL}`);
console.log(`Interval: ${INTERVAL_MS / 1000} seconds`);
console.log('==========================================\n');

// Check if genesis rounds are done
async function checkGenesisStatus() {
  try {
    const { stdout } = await execAsync(
      `cast call ${CONTRACT_ADDRESS} "genesisStartOnce()(bool)" --rpc-url ${RPC_URL}`
    );
    const genesisStarted = stdout.trim() === 'true';

    if (!genesisStarted) {
      console.log('⚠️  Genesis not started yet. Starting genesis rounds...');
      await startGenesisRounds();
      return false;
    }

    const { stdout: lockStdout } = await execAsync(
      `cast call ${CONTRACT_ADDRESS} "genesisLockOnce()(bool)" --rpc-url ${RPC_URL}`
    );
    const genesisLocked = lockStdout.trim() === 'true';

    if (!genesisLocked) {
      console.log('⚠️  Genesis started but not locked yet. Will try to lock...');
      return false;
    }

    console.log('✅ Genesis rounds completed. Ready for automated execution.');
    return true;
  } catch (error) {
    console.error('Error checking genesis status:', error.message);
    return false;
  }
}

async function startGenesisRounds() {
  try {
    console.log('📍 Starting genesis round...');
    await execAsync(
      `cast send ${CONTRACT_ADDRESS} "genesisStartRound()" --rpc-url ${RPC_URL} --private-key ${PRIVATE_KEY}`
    );
    console.log('✅ Genesis start round complete!');

    console.log('⏳ Waiting 5 minutes before locking...');
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));

    console.log('🔒 Locking genesis round...');
    await execAsync(
      `cast send ${CONTRACT_ADDRESS} "genesisLockRound()" --rpc-url ${RPC_URL} --private-key ${PRIVATE_KEY}`
    );
    console.log('✅ Genesis lock round complete!');
    console.log('✅ Genesis rounds initialized successfully!\n');
  } catch (error) {
    console.error('❌ Error during genesis:', error.message);
    throw error;
  }
}

async function getCurrentEpoch() {
  try {
    const { stdout } = await execAsync(
      `cast call ${CONTRACT_ADDRESS} "currentEpoch()(uint256)" --rpc-url ${RPC_URL}`
    );
    return parseInt(stdout.trim());
  } catch (error) {
    console.error('Error getting current epoch:', error.message);
    return null;
  }
}

async function isPaused() {
  try {
    const { stdout } = await execAsync(
      `cast call ${CONTRACT_ADDRESS} "paused()(bool)" --rpc-url ${RPC_URL}`
    );
    return stdout.trim() === 'true';
  } catch (error) {
    console.error('Error checking paused status:', error.message);
    return false;
  }
}

async function executeRound() {
  try {
    const paused = await isPaused();
    if (paused) {
      console.log('⏸️  Contract is paused. Skipping execution.');
      return;
    }

    const epoch = await getCurrentEpoch();
    console.log(`\n🎲 Executing round for epoch ${epoch}...`);

    const { stdout, stderr } = await execAsync(
      `cast send ${CONTRACT_ADDRESS} "executeRound()" --rpc-url ${RPC_URL} --private-key ${PRIVATE_KEY}`
    );

    const newEpoch = await getCurrentEpoch();
    console.log(`✅ Round executed successfully! New epoch: ${newEpoch}`);
    console.log(`⏰ Next execution at: ${new Date(Date.now() + INTERVAL_MS).toLocaleString()}`);
  } catch (error) {
    console.error('❌ Error executing round:', error.message);
    if (error.stderr) {
      console.error('Details:', error.stderr);
    }
  }
}

async function main() {
  console.log('🔍 Checking genesis status...\n');

  const genesisReady = await checkGenesisStatus();

  if (!genesisReady) {
    console.log('\n⏳ Waiting for genesis rounds to complete...');
    // Wait a bit and check again
    setTimeout(async () => {
      const ready = await checkGenesisStatus();
      if (!ready) {
        console.log('⚠️  Genesis still not ready. Please check contract status manually.');
        console.log('You may need to call genesisLockRound() manually after 5 minutes.');
      }
    }, 60000); // Check again in 1 minute
  }

  console.log('\n🚀 Starting automated round execution...\n');

  // Execute immediately
  await executeRound();

  // Then execute every interval
  setInterval(executeRound, INTERVAL_MS);

  // Keep the script running
  console.log('\n✨ Bot is running. Press Ctrl+C to stop.\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down automation bot...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down automation bot...');
  process.exit(0);
});

// Start the bot
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

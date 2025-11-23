/**
 * Synapse SDK Configuration for Filecoin Cloud Storage
 *
 * Documentation: https://docs.filecoin.cloud/
 * GitHub: https://github.com/FilOzone/synapse-sdk
 *
 * This module handles decentralized storage of user stats and leaderboard data
 * on Filecoin using the Synapse SDK.
 */

// RPC URLs for Filecoin networks
export const FILECOIN_RPC_URLS = {
  calibration: {
    http: 'https://api.calibration.node.glif.io/rpc/v1',
    chainId: 314159,
  },
  mainnet: {
    http: 'https://api.node.glif.io/rpc/v1',
    chainId: 314,
  },
} as const

// Use calibration (testnet) for development
export const CURRENT_NETWORK = FILECOIN_RPC_URLS.calibration

// Storage keys for different data types
export const STORAGE_KEYS = {
  USER_STATS_PREFIX: 'bobasoda_user_',
  LEADERBOARD: 'bobasoda_leaderboard',
  GLOBAL_STATS: 'bobasoda_global_stats',
} as const

// Synapse configuration
// According to official docs, only privateKey and rpcURL are needed
export const SYNAPSE_CONFIG = {
  privateKey: process.env.NEXT_PUBLIC_SYNAPSE_PRIVATE_KEY || '',
  rpcURL: CURRENT_NETWORK.http, // Uses Filecoin Calibration testnet by default
} as const

// Faucet URLs for obtaining test tokens
export const FAUCET_URLS = {
  tFIL: 'https://faucet.calibration.fildev.network/',
  USDFC: 'https://faucet.calibration.fildev.network/funds.html',
} as const

/**
 * Check if Synapse SDK is properly configured
 */
export function isSynapseConfigured(): boolean {
  return !!SYNAPSE_CONFIG.privateKey && SYNAPSE_CONFIG.privateKey.length > 0
}

/**
 * Get user storage key
 */
export function getUserStorageKey(address: string): string {
  return `${STORAGE_KEYS.USER_STATS_PREFIX}${address.toLowerCase()}`
}

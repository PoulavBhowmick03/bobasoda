export default {
  Address: {
    Oracle: {
      // ETH/USD Price Feed on Base - Chainlink Oracle ✓ VERIFIED
      // Mainnet: Decimals: 8, Heartbeat: 1200s (20min), Deviation: 0.15%
      mainnet: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", // Base Mainnet ✓
      testnet: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1", // Base Sepolia ✓
    },
    Admin: {
      // TODO: Set your admin address before deployment
      mainnet: "0x0000000000000000000000000000000000000000",
      testnet: "0x0000000000000000000000000000000000000000",
    },
    Operator: {
      // TODO: Set your operator address before deployment
      mainnet: "0x0000000000000000000000000000000000000000",
      testnet: "0x0000000000000000000000000000000000000000",
    },
  },
  Block: {
    Interval: {
      // Interval in seconds (20 = 20 seconds per round phase)
      // Round flow: 20s betting -> 20s wait -> 20s resolution = 60s total (1 minute)
      mainnet: 20,
      testnet: 20,
    },
    Buffer: {
      // Buffer in seconds for execution window (15 = 15 seconds)
      mainnet: 15,
      testnet: 15,
    },
  },
  Treasury: {
    mainnet: 300, // 3%
    testnet: 1000, // 10%
  },
  BetAmount: {
    // Minimum bet in ETH
    mainnet: 0.001, // 0.001 ETH
    testnet: 0.001, // 0.001 ETH
  },
  OracleUpdateAllowance: {
    // Seconds - how stale oracle data can be
    // Oracle heartbeat is 1200s (20min), so allow 1800s (30min) for safety
    mainnet: 1800, // 30 minutes (oracle heartbeat is 20min)
    testnet: 1800, // 30 minutes
  },
};

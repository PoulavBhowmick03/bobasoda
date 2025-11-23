import type { HardhatUserConfig, NetworkUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-truffle5";
import "hardhat-abi-exporter";
import "hardhat-contract-sizer";
import "solidity-coverage";
import "dotenv/config";

const baseMainnet: NetworkUserConfig = {
  url: "https://mainnet.base.org",
  chainId: 8453,
  accounts: process.env.KEY_MAINNET ? [process.env.KEY_MAINNET] : [],
};

const baseSepolia: NetworkUserConfig = {
  url: "https://sepolia.base.org",
  chainId: 84532,
  accounts: process.env.KEY_TESTNET ? [process.env.KEY_TESTNET] : [],
};

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    mainnet: baseMainnet,
    testnet: baseSepolia,
  },
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 99999,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  abiExporter: {
    path: "./data/abi",
    clear: true,
    flat: false,
  },
};

export default config;

import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox-viem'
import '@nomicfoundation/hardhat-verify'
import { CONFIG } from './utils/config'

const config: HardhatUserConfig = {
  solidity: '0.8.24',
  defaultNetwork: 'hardhat',
  ignition: {
    requiredConfirmations: 1,
  },
  etherscan: {
    apiKey: {
      mainnet: CONFIG.ETHERSCAN_API_KEY,
      sepolia: CONFIG.ETHERSCAN_API_KEY,
    },
  },
  sourcify: {
    enabled: false,
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      chainId: 31337,
      url: 'http://127.0.0.1:8545',
    },
    sepolia: {
      chainId: 11155111,
      url: 'https://rpc.sepolia.org/',
      accounts: [CONFIG.DEPLOYER_KEY],
    },
    mainnet: {
      chainId: 1,
      url: `https://mainnet.infura.io/v3/${CONFIG.INFURA_API_KEY}`,
      accounts: [CONFIG.DEPLOYER_KEY],
    },
  },
}

export default config

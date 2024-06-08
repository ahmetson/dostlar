import { mainnet, sepolia } from 'viem/chains'
import { Chain, hardhat } from 'viem/chains'

let chains = [mainnet] as [Chain, ...Chain[]]

if (process.env.NODE_ENV !== 'production') chains.push(sepolia, hardhat)

export const ETH_CHAINS = chains

export const NETWORK_COLORS = {
  ethereum: {
    color: 'green',
    bgVariant: 'bg-green-600',
  },
  sepolia: {
    color: 'sky',
    bgVariant: 'bg-sky-600',
  },
}

export function GetNetworkColor(chain?: string, type: 'color' | 'bgVariant' = 'color') {
  chain = chain?.toLocaleLowerCase()
  if (chain === 'ethereum' || chain === 'mainnet') return NETWORK_COLORS.ethereum[type]
  return NETWORK_COLORS.sepolia[type]
}

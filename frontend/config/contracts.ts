import { Address } from 'viem'

const getEnvAddress = (envVar: string | undefined): Address => {
  if (!envVar || envVar === '0x0000000000000000000000000000000000000000') {
    return '0x0000000000000000000000000000000000000000'
  }
  return envVar as Address
}

export const contractAddresses = {
  nftMarketplace: {
    11155111: getEnvAddress(process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS),
  },
  collectionFactory: {
    11155111: getEnvAddress(process.env.NEXT_PUBLIC_COLLECTION_FACTORY_ADDRESS),
  },
} as const

export const supportedChains = [
  { id: 11155111, name: 'Sepolia', currency: 'ETH', rpcUrl: 'https://rpc.sepolia.org' },
] as const

export const MARKETPLACE_FEE_PERCENT = 1.5

export const getSupportedChain = (chainId: number) => {
  return supportedChains.find(chain => chain.id === chainId)
}

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

export const PINATA_GATEWAY = 'https://gateway.pinata.cloud'

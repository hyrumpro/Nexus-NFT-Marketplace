import { Address } from 'viem'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function isContractConfigured(address: string | undefined): boolean {
  return !!address && address !== ZERO_ADDRESS
}

export function getContractStatus(): {
  marketplace: boolean
  factory: boolean
  isFullyConfigured: boolean
} {
  const marketplace = isContractConfigured(process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS)
  const factory = isContractConfigured(process.env.NEXT_PUBLIC_COLLECTION_FACTORY_ADDRESS)

  return {
    marketplace,
    factory,
    isFullyConfigured: marketplace && factory,
  }
}

export function getMissingConfigMessage(): string | null {
  const status = getContractStatus()
  
  if (!status.marketplace && !status.factory) {
    return 'Contracts not deployed. Deploy contracts and update .env.local with addresses.'
  }
  
  if (!status.marketplace) {
    return 'Marketplace contract address not configured.'
  }
  
  if (!status.factory) {
    return 'Collection Factory contract address not configured.'
  }
  
  return null
}

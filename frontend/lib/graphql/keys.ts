export const queryKeys = {
  listings: {
    all: ['listings', 'all'] as const,
    byCollection: (address: string) => ['listings', 'collection', address.toLowerCase()] as const,
    bySeller: (address: string) => ['listings', 'seller', address.toLowerCase()] as const,
    byNFT: (contract: string, tokenId: string) => ['listings', 'nft', contract.toLowerCase(), tokenId] as const,
  },
  auctions: {
    all: ['auctions', 'all'] as const,
    active: ['auctions', 'active'] as const,
    byCollection: (address: string) => ['auctions', 'collection', address.toLowerCase()] as const,
    byNFT: (contract: string, tokenId: string) => ['auctions', 'nft', contract.toLowerCase(), tokenId] as const,
  },
  offers: {
    all: ['offers', 'all'] as const,
    byNFT: (contract: string, tokenId: string) => ['offers', 'nft', contract.toLowerCase(), tokenId] as const,
    byBuyer: (address: string) => ['offers', 'buyer', address.toLowerCase()] as const,
  },
  nft: {
    detail: (contract: string, tokenId: string) => ['nft', contract.toLowerCase(), tokenId] as const,
    byOwner: (address: string) => ['nfts', 'owner', address.toLowerCase()] as const,
    byCollection: (address: string) => ['nfts', 'collection', address.toLowerCase()] as const,
  },
  collection: {
    detail: (address: string) => ['collection', address.toLowerCase()] as const,
    all: ['collections', 'all'] as const,
    byCreator: (address: string) => ['collections', 'creator', address.toLowerCase()] as const,
  },
  user: {
    detail: (address: string) => ['user', address.toLowerCase()] as const,
    nftsOwned: (address: string) => ['nfts', 'owner', address.toLowerCase()] as const,
  },
  stats: ['marketplace', 'stats'] as const,
} as const

export const cacheConfig = {
  graph: {
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  contract: {
    staleTime: 5 * 1000,
    gcTime: 30 * 1000,
  },
  transaction: {
    staleTime: 0,
    gcTime: 0,
  },
} as const

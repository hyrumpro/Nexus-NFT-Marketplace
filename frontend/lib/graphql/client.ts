export interface GraphQLClientOptions {
  url?: string
  apiKey?: string
}

class GraphQLClient {
  isReady(): boolean {
    return true
  }

  async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch('/api/graph', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(err.error || `GraphQL request failed: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'GraphQL query failed')
    }

    return result.data as T
  }
}

export const graphClient = new GraphQLClient()

export const queryKeys = {
  listings: {
    all: 'listings-all',
    byCollection: (address: string) => `listings-collection-${address}`,
    bySeller: (address: string) => `listings-seller-${address}`,
  },
  auctions: {
    all: 'auctions-all',
    active: 'auctions-active',
    byCollection: (address: string) => `auctions-collection-${address}`,
  },
  nft: {
    detail: (contract: string, tokenId: string) => `nft-${contract}-${tokenId}`,
    byOwner: (address: string) => `nfts-owner-${address}`,
  },
  offers: {
    byNFT: (contract: string, tokenId: string) => `offers-${contract}-${tokenId}`,
    byUser: (address: string) => `offers-user-${address}`,
  },
  collection: {
    detail: (address: string) => `collection-${address}`,
    all: 'collections-all',
  },
  user: {
    detail: (address: string) => `user-${address}`,
    byAddress: (address: string) => `user-nfts-${address}`,
  },
  stats: 'marketplace-stats',
} as const

export const cacheConfig = {
  graph: {
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  },
}

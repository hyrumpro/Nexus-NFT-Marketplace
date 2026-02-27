'use client'

import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { Address, formatEther } from 'viem'
import { graphClient } from '@/lib/graphql/client'
import { queryKeys, cacheConfig } from '@/lib/graphql/keys'
import {
  GET_ALL_LISTINGS,
  GET_LISTINGS_BY_COLLECTION,
  GET_LISTINGS_BY_SELLER,
  GET_NFT_DETAIL,
  GET_COLLECTION_DETAIL,
  GET_OFFERS_FOR_NFT,
  GET_OFFERS_RECEIVED,
  GET_ACTIVE_AUCTIONS,
  GET_MARKETPLACE_STATS,
  GET_NFTS_BY_OWNER,
  GET_USER_PROFILE,
  GET_COLLECTIONS_BY_CREATOR,
  SEARCH_LISTINGS
} from '@/lib/graphql/queries'
import type { Listing, Auction, Offer, Collection, NFT, MarketplaceStats } from '@/types'

export interface UseListingsParams {
  first?: number
  skip?: number
  orderBy?: 'price' | 'createdAt' | 'endTime'
  orderDirection?: 'asc' | 'desc'
  collection?: Address
  seller?: Address
  listingType?: 'FixedPrice' | 'TimedAuction' | null
  minPrice?: string
  maxPrice?: string
}

function mapListing(l: any): Listing {
  return {
    id: l.id,
    nftContract: l.nft?.collection?.address as Address,
    tokenId: BigInt(l.nft?.tokenId || 0),
    seller: l.seller?.address as Address,
    price: l.price,
    formattedPrice: formatEther(BigInt(l.price)),
    currency: l.currency as Address,
    startTime: BigInt(l.startTime),
    endTime: l.endTime ? BigInt(l.endTime) : null,
    listingType: l.listingType === 'FixedPrice' ? 0 : 1,
    active: l.active,
    nft: l.nft ? {
      id: l.nft.id,
      tokenId: BigInt(l.nft.tokenId),
      tokenURI: l.nft.tokenURI,
      collection: l.nft.collection,
      owner: l.nft.owner?.address as Address,
    } : undefined,
  }
}

export function useListings(params: UseListingsParams = {}) {
  return useQuery({
    queryKey: ['listings', params],
    queryFn: async (): Promise<Listing[]> => {
      if (!graphClient.isReady()) {
        return []
      }

      if (params.seller) {
        const variables: Record<string, any> = {
          seller: params.seller.toLowerCase(),
          first: params.first || 20,
          skip: params.skip || 0,
        }
        const data = await graphClient.query<{ listings: any[] }>(GET_LISTINGS_BY_SELLER, variables)
        return data.listings.map(mapListing)
      }

      const where: Record<string, any> = { active: true }
      if (params.collection) where.collection = params.collection.toLowerCase()
      if (params.listingType) where.listingType = params.listingType
      if (params.minPrice) where.price_gte = params.minPrice
      if (params.maxPrice) where.price_lte = params.maxPrice

      const query = params.collection ? GET_LISTINGS_BY_COLLECTION : GET_ALL_LISTINGS
      const variables: Record<string, any> = {
        first: params.first || 20,
        skip: params.skip || 0,
        orderBy: params.orderBy || 'createdAt',
        orderDirection: params.orderDirection || 'desc',
        where,
      }

      const data = await graphClient.query<{ listings: any[] }>(query, variables)
      return data.listings.map(mapListing)
    },
    staleTime: cacheConfig.graph.staleTime,
    gcTime: cacheConfig.graph.gcTime,
    enabled: graphClient.isReady(),
  })
}

export interface InfiniteListingsParams {
  first?: number
  orderBy?: 'price' | 'createdAt' | 'endTime'
  orderDirection?: 'asc' | 'desc'
  collection?: Address
  listingType?: 'FixedPrice' | 'TimedAuction' | null
  minPrice?: string
  maxPrice?: string
  searchQuery?: string
}

export function useInfiniteListings(params: InfiniteListingsParams = {}) {
  const pageSize = params.first || 20

  return useInfiniteQuery({
    queryKey: ['listings', 'infinite', params],
    queryFn: async ({ pageParam = 0 }) => {
      if (!graphClient.isReady()) {
        return { listings: [], nextSkip: undefined }
      }

      if (params.searchQuery) {
        const data = await graphClient.query<{ listings: any[] }>(SEARCH_LISTINGS, {
          searchText: params.searchQuery,
          first: pageSize,
          skip: pageParam,
        })
        return {
          listings: data.listings.map(mapListing),
          nextSkip: data.listings.length === pageSize ? pageParam + pageSize : undefined,
        }
      }

      const where: Record<string, any> = { active: true }
      if (params.collection) where.collection = params.collection.toLowerCase()
      if (params.listingType) where.listingType = params.listingType
      if (params.minPrice) where.price_gte = params.minPrice
      if (params.maxPrice) where.price_lte = params.maxPrice

      const data = await graphClient.query<{ listings: any[] }>(GET_ALL_LISTINGS, {
        first: pageSize,
        skip: pageParam,
        orderBy: params.orderBy || 'createdAt',
        orderDirection: params.orderDirection || 'desc',
        where,
      })

      return {
        listings: data.listings.map(mapListing),
        nextSkip: data.listings.length === pageSize ? pageParam + pageSize : undefined,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextSkip,
    staleTime: cacheConfig.graph.staleTime,
    enabled: graphClient.isReady(),
  })
}

export function useAuctions(first: number = 20, skip: number = 0) {
  return useQuery({
    queryKey: queryKeys.auctions.active,
    queryFn: async (): Promise<Auction[]> => {
      const data = await graphClient.query<{ auctions: any[] }>(GET_ACTIVE_AUCTIONS, { first, skip })

      return data.auctions.map((a: any) => ({
        id: a.id,
        nftContract: a.nft?.collection?.address as Address,
        tokenId: BigInt(a.nft?.tokenId || 0),
        seller: a.seller?.address as Address,
        startingPrice: a.startingPrice,
        formattedStartingPrice: formatEther(BigInt(a.startingPrice)),
        reservePrice: a.reservePrice,
        highestBid: a.highestBid || '0',
        formattedHighestBid: formatEther(BigInt(a.highestBid || 0)),
        highestBidder: a.highestBidder?.address as Address | null,
        startTime: BigInt(a.startTime),
        endTime: BigInt(a.endTime),
        currency: a.currency as Address,
        status: a.status as 0 | 1 | 2 | 3,
        bids: (a.bids || []).map((b: any) => ({
          id: b.id,
          bidder: b.bidder?.address as Address,
          amount: b.amount,
          formattedAmount: formatEther(BigInt(b.amount)),
          timestamp: BigInt(b.timestamp),
        })),
      }))
    },
    staleTime: cacheConfig.graph.staleTime,
    enabled: graphClient.isReady(),
  })
}

export function useNFTDetail(nftContract: Address | undefined, tokenId: bigint | undefined) {
  return useQuery({
    queryKey: nftContract && tokenId !== undefined 
      ? queryKeys.nft.detail(nftContract, tokenId.toString())
      : ['nft', 'disabled'],
    queryFn: async (): Promise<any> => {
      if (!nftContract || tokenId === undefined) return null
      
      const nftId = `${nftContract.toLowerCase()}-${tokenId.toString()}`
      
      const data = await graphClient.query<{ nft: any }>(GET_NFT_DETAIL, { nftId })
      
      if (!data.nft) return null
      
      return {
        id: data.nft.id,
        tokenId: BigInt(data.nft.tokenId),
        tokenURI: data.nft.tokenURI,
        collection: {
          id: data.nft.collection.id,
          address: data.nft.collection.address as Address,
          name: data.nft.collection.name,
          symbol: data.nft.collection.symbol,
          totalSupply: BigInt(data.nft.collection.totalSupply || 0),
          maxSupply: BigInt(0),
          royaltyPercent: BigInt(data.nft.collection.royaltyPercent || 0),
          floorPrice: data.nft.collection.floorPrice,
          totalVolume: data.nft.collection.totalVolume || '0',
          verified: data.nft.collection.verified,
        },
        owner: data.nft.owner?.address as Address,
        creator: data.nft.creator?.address as Address,
        lastSalePrice: data.nft.lastSalePrice,
        lastSaleAt: data.nft.lastSaleAt ? BigInt(data.nft.lastSaleAt) : undefined,
        currentListing: data.nft.currentListing ? {
          id: data.nft.currentListing.id,
          price: data.nft.currentListing.price,
          seller: data.nft.currentListing.seller?.address as Address,
          startTime: data.nft.currentListing.startTime,
          endTime: data.nft.currentListing.endTime,
          listingType: data.nft.currentListing.listingType,
        } : undefined,
        currentAuction: data.nft.currentAuction ? {
          id: data.nft.currentAuction.id,
          startingPrice: data.nft.currentAuction.startingPrice,
          reservePrice: data.nft.currentAuction.reservePrice,
          highestBid: data.nft.currentAuction.highestBid,
          endTime: data.nft.currentAuction.endTime,
          status: data.nft.currentAuction.status,
          seller: data.nft.currentAuction.seller?.address as Address,
          highestBidder: data.nft.currentAuction.highestBidder?.address as Address,
        } : undefined,
      }
    },
    enabled: !!nftContract && tokenId !== undefined && graphClient.isReady(),
    staleTime: cacheConfig.graph.staleTime,
  })
}

export function useOffers(nftContract: Address | undefined, tokenId: bigint | undefined) {
  const nftId = nftContract && tokenId !== undefined 
    ? `${nftContract.toLowerCase()}-${tokenId}` 
    : ''

  return useQuery({
    queryKey: nftId ? queryKeys.offers.byNFT(nftContract!, tokenId!.toString()) : ['offers', 'disabled'],
    queryFn: async (): Promise<Offer[]> => {
      if (!nftId) return []
      
      const data = await graphClient.query<{ offers: any[] }>(GET_OFFERS_FOR_NFT, { 
        nftId,
        first: 10,
        skip: 0,
      })
      
      return data.offers.map((o: any) => ({
        id: o.id,
        nftContract: nftContract as Address,
        tokenId: tokenId!,
        buyer: o.buyer?.address as Address,
        price: o.price,
        formattedPrice: formatEther(BigInt(o.price)),
        currency: o.currency as Address,
        expiryTime: BigInt(o.expiryTime),
        active: o.active,
      }))
    },
    enabled: !!nftId && graphClient.isReady(),
    staleTime: cacheConfig.graph.staleTime,
  })
}

export function useOffersReceived(owner: Address | undefined, first = 20) {
  return useQuery({
    queryKey: ['offers', 'received', owner],
    queryFn: async () => {
      if (!owner) return []
      const data = await graphClient.query<{ offers: any[] }>(GET_OFFERS_RECEIVED, {
        owner: owner.toLowerCase(),
        first,
      })
      return data.offers.map((o: any) => ({
        id: o.id,
        price: o.price,
        formattedPrice: formatEther(BigInt(o.price)),
        expiryTime: BigInt(o.expiryTime || 0),
        buyer: o.buyer?.address as Address,
        nft: {
          tokenId: o.nft?.tokenId,
          tokenURI: o.nft?.tokenURI,
          collection: {
            address: o.nft?.collection?.address,
            name: o.nft?.collection?.name,
          },
        },
      }))
    },
    enabled: !!owner && graphClient.isReady(),
    staleTime: cacheConfig.graph.staleTime,
  })
}

export function useCollection(address: Address | undefined) {
  return useQuery({
    queryKey: address ? queryKeys.collection.detail(address) : ['collection', 'disabled'],
    queryFn: async (): Promise<Collection | null> => {
      if (!address) return null
      
      const data = await graphClient.query<{ collection: any }>(GET_COLLECTION_DETAIL, { 
        address: address.toLowerCase() 
      })
      
      if (!data.collection) return null
      
      return {
        id: data.collection.id,
        address: data.collection.address as Address,
        name: data.collection.name,
        symbol: data.collection.symbol,
        totalSupply: BigInt(data.collection.totalSupply || 0),
        maxSupply: BigInt(data.collection.maxSupply || 0),
        royaltyPercent: BigInt(data.collection.royaltyPercent || 0),
        floorPrice: data.collection.floorPrice,
        totalVolume: data.collection.totalVolume || '0',
        verified: data.collection.verified,
      }
    },
    enabled: !!address && graphClient.isReady(),
    staleTime: cacheConfig.graph.staleTime,
  })
}

export function useMarketplaceStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: async (): Promise<MarketplaceStats> => {
      const data = await graphClient.query<{ marketplaceStats: any }>(GET_MARKETPLACE_STATS)

      return {
        totalListings: data.marketplaceStats?.totalListings || '0',
        activeListings: data.marketplaceStats?.activeListings || '0',
        totalAuctions: data.marketplaceStats?.totalAuctions || '0',
        activeAuctions: data.marketplaceStats?.activeAuctions || '0',
        totalSales: data.marketplaceStats?.totalSales || '0',
        totalVolume: data.marketplaceStats?.totalVolume || '0',
        totalCollections: data.marketplaceStats?.totalCollections || '0',
        totalNFTs: data.marketplaceStats?.totalNFTs || '0',
        totalUsers: data.marketplaceStats?.totalUsers || '0',
      }
    },
    staleTime: cacheConfig.graph.staleTime,
    enabled: graphClient.isReady(),
  })
}

export function useRefetchAll() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['listings'] })
    queryClient.invalidateQueries({ queryKey: ['auctions'] })
    queryClient.invalidateQueries({ queryKey: ['offers'] })
    queryClient.invalidateQueries({ queryKey: ['nft'] })
    queryClient.invalidateQueries({ queryKey: ['user'] })
  }
}

export function useUserNFTs(ownerAddress: Address | undefined, first: number = 20, skip: number = 0) {
  return useQuery({
    queryKey: ownerAddress ? queryKeys.user.nftsOwned(ownerAddress) : ['user-nfts', 'disabled'],
    queryFn: async (): Promise<any[]> => {
      if (!ownerAddress) return []
      if (!graphClient.isReady()) return []

      const data = await graphClient.query<{ nfts: any[] }>(GET_NFTS_BY_OWNER, {
        owner: ownerAddress.toLowerCase(),
        first,
        skip,
      })

      return (data.nfts || []).map((nft: any) => ({
        id: nft.id,
        tokenId: BigInt(nft.tokenId ?? 0),
        tokenURI: nft.tokenURI,
        collection: nft.collection
          ? {
              id: nft.collection.id,
              address: nft.collection.address as Address,
              name: nft.collection.name,
              symbol: nft.collection.symbol,
            }
          : { id: '', address: '' as Address, name: 'Unknown', symbol: '?' },
        owner: ownerAddress,
        creator: ownerAddress,
        lastSalePrice: nft.lastSalePrice,
        currentListing: nft.currentListing
          ? {
              id: nft.currentListing.id,
              price: nft.currentListing.price,
              active: nft.currentListing.active,
            }
          : undefined,
      }))
    },
    enabled: !!ownerAddress && graphClient.isReady(),
    staleTime: cacheConfig.graph.staleTime,
  })
}

export function useUserProfile(address: Address | undefined) {
  return useQuery({
    queryKey: address ? queryKeys.user.detail(address) : ['user-profile', 'disabled'],
    queryFn: async () => {
      if (!address) return null
      if (!graphClient.isReady()) return null

      const data = await graphClient.query<{ user: any }>(GET_USER_PROFILE, {
        address: address.toLowerCase(),
      })

      if (!data.user) return null

      return {
        address: data.user.address as Address,
        totalPurchased: data.user.totalPurchased,
        totalSold: data.user.totalSold,
        totalSpent: data.user.totalSpent,
        totalEarned: data.user.totalEarned,
        nftsOwned: data.user.nftsOwned || [],
        listings: data.user.listings || [],
        offers: data.user.offers || [],
        autoRejectedOffers: data.user.autoRejectedOffers || [],
      }
    },
    enabled: !!address && graphClient.isReady(),
    staleTime: cacheConfig.graph.staleTime,
  })
}

export function useUserCollections(creatorAddress: Address | undefined, first: number = 20, skip: number = 0) {
  return useQuery({
    queryKey: creatorAddress ? ['user-collections', creatorAddress] : ['user-collections', 'disabled'],
    queryFn: async (): Promise<any[]> => {
      if (!creatorAddress) return []
      if (!graphClient.isReady()) return []

      const data = await graphClient.query<{ collections: any[] }>(GET_COLLECTIONS_BY_CREATOR, {
        creator: creatorAddress.toLowerCase(),
        first,
        skip,
      })

      return data.collections || []
    },
    enabled: !!creatorAddress && graphClient.isReady(),
    staleTime: cacheConfig.graph.staleTime,
  })
}

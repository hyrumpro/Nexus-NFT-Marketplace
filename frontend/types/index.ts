import { Address } from 'viem'

export type ListingType = 0 | 1
export type AuctionStatus = 0 | 1 | 2 | 3

export interface Listing {
  id: string
  nftContract: Address
  tokenId: bigint
  seller: Address
  price: string
  formattedPrice: string
  currency: Address
  startTime: bigint
  endTime: bigint | null
  listingType: ListingType
  active: boolean
  nft?: NFT
}

export interface Auction {
  id: string
  nftContract: Address
  tokenId: bigint
  seller: Address
  startingPrice: string
  formattedStartingPrice: string
  reservePrice: string
  highestBid: string
  formattedHighestBid: string
  highestBidder: Address | null
  startTime: bigint
  endTime: bigint
  currency: Address
  status: AuctionStatus
  bids: Bid[]
}

export interface Bid {
  id: string
  bidder: Address
  amount: string
  formattedAmount: string
  timestamp: bigint
}

export interface Offer {
  id: string
  nftContract: Address
  tokenId: bigint
  buyer: Address
  price: string
  formattedPrice: string
  currency: Address
  expiryTime: bigint
  active: boolean
}

export interface CollectionOffer {
  id: string
  nftContract: Address
  buyer: Address
  price: string
  formattedPrice: string
  currency: Address
  expiryTime: bigint
  active: boolean
}

export interface NFT {
  id: string
  tokenId: bigint
  tokenURI: string
  collection: Collection | any
  owner: Address
  creator?: Address
  lastSalePrice?: string
  lastSaleAt?: bigint
  currentListing?: Listing
}

export interface Collection {
  id: string
  address: Address
  name: string
  symbol: string
  totalSupply?: bigint
  maxSupply?: bigint
  royaltyPercent?: bigint
  floorPrice?: string
  totalVolume?: string
  verified?: boolean
}

export interface User {
  address: Address
  totalPurchased?: bigint
  totalSold?: bigint
  totalSpent?: string
  totalEarned?: string
}

export interface MarketplaceStats {
  totalListings: string
  activeListings?: string
  totalAuctions?: string
  activeAuctions?: string
  totalSales?: string
  totalVolume: string
  totalCollections?: string
  totalNFTs?: string
  totalUsers?: string
}

export type TransactionStatus = 
  | 'idle'
  | 'preparing'
  | 'awaiting_approval'
  | 'approving'
  | 'approval_confirming'
  | 'approved'
  | 'executing'
  | 'confirming'
  | 'success'
  | 'error'

export interface TransactionState {
  status: TransactionStatus
  hash?: string
  error?: string
  step: number
  totalSteps: number
  message: string
}

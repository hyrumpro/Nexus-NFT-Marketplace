import {
  ItemListed,
  ItemSold,
  ListingCancelled,
  ListingUpdated,
  AuctionCreated,
  BidPlaced,
  AuctionSettled,
  AuctionCancelled,
  OfferMade,
  OfferAccepted,
  OfferCancelled,
  CollectionOfferMade,
  CollectionOfferAccepted,
  CollectionOfferCancelled,
  FeesWithdrawn
} from "../generated/NexusMarketplace/NexusMarketplace"

import {
  Listing,
  Auction,
  Bid,
  Offer,
  CollectionOffer,
  NFT,
  User,
  Collection,
  MarketplaceStats,
  FeeWithdrawal
} from "../generated/schema"

import { BigInt, Bytes, log, Address } from "@graphprotocol/graph-ts"

const STATS_ID = "marketplace"

// Helper: Get or create marketplace stats
function getOrCreateStats(): MarketplaceStats {
  let stats = MarketplaceStats.load(STATS_ID)
  if (!stats) {
    stats = new MarketplaceStats(STATS_ID)
    stats.totalListings = BigInt.fromI32(0)
    stats.activeListings = BigInt.fromI32(0)
    stats.totalAuctions = BigInt.fromI32(0)
    stats.activeAuctions = BigInt.fromI32(0)
    stats.totalSales = BigInt.fromI32(0)
    stats.totalCollections = BigInt.fromI32(0)
    stats.totalNFTs = BigInt.fromI32(0)
    stats.totalUsers = BigInt.fromI32(0)
    stats.totalOffers = BigInt.fromI32(0)
    stats.activeOffers = BigInt.fromI32(0)
    stats.totalVolume = BigInt.fromI32(0)
    stats.totalFeesCollected = BigInt.fromI32(0)
    stats.updatedAt = BigInt.fromI32(0)
    stats.save()
  }
  return stats as MarketplaceStats
}

// Helper: Get or create user
function getOrCreateUser(address: Bytes, timestamp: BigInt): User {
  let user = User.load(address.toHexString())
  if (!user) {
    user = new User(address.toHexString())
    user.address = address
    user.totalPurchased = BigInt.fromI32(0)
    user.totalSold = BigInt.fromI32(0)
    user.totalSpent = BigInt.fromI32(0)
    user.totalEarned = BigInt.fromI32(0)
    user.createdAt = timestamp
    user.updatedAt = timestamp
    user.save()
    
    let stats = getOrCreateStats()
    stats.totalUsers = stats.totalUsers.plus(BigInt.fromI32(1))
    stats.updatedAt = timestamp
    stats.save()
  }
  return user as User
}

// Helper: Get or create NFT
function getOrCreateNFT(nftContract: Bytes, tokenId: BigInt, timestamp: BigInt): NFT {
  const id = nftContract.toHexString() + "-" + tokenId.toString()
  let nft = NFT.load(id)
  if (!nft) {
    nft = new NFT(id)
    nft.tokenId = tokenId
    nft.collection = nftContract.toHexString()
    const zeroUser = getOrCreateUser(Address.fromString("0x0000000000000000000000000000000000000000"), timestamp)
    nft.creator = zeroUser.id
    nft.owner = zeroUser.id
    nft.tokenURI = ""
    nft.offerBuyers = []
    nft.createdAt = timestamp
    nft.updatedAt = timestamp
    nft.save()

    let stats = getOrCreateStats()
    stats.totalNFTs = stats.totalNFTs.plus(BigInt.fromI32(1))
    stats.updatedAt = timestamp
    stats.save()
  }
  return nft as NFT
}

// Helper: Get listing type string
function getListingType(listingType: i32): string {
  return listingType === 0 ? "FixedPrice" : "TimedAuction"
}

// Helper: Get auction status string
function getAuctionStatus(status: i32): string {
  if (status === 0) return "Active"
  if (status === 1) return "Ended"
  if (status === 2) return "Cancelled"
  return "Sold"
}

// ============================================
// LISTING HANDLERS
// ============================================

export function handleItemListed(event: ItemListed): void {
  const nftContract = event.params.nftContract
  const tokenId = event.params.tokenId
  const seller = event.params.seller
  const price = event.params.price
  const currency = event.params.currency
  const endTime = event.params.endTime
  const listingType = event.params.listingType
  
  // Create listing ID
  const listingId = nftContract.toHexString() + "-" + tokenId.toString() + "-" + event.transaction.hash.toHexString()
  
  // Get or create entities
  const sellerUser = getOrCreateUser(seller, event.block.timestamp)
  const nft = getOrCreateNFT(nftContract, tokenId, event.block.timestamp)
  
  // Create listing
  const listing = new Listing(listingId)
  listing.nft = nft.id
  listing.collection = nftContract.toHexString()
  listing.seller = sellerUser.id
  listing.price = price
  listing.currency = currency
  listing.startTime = event.block.timestamp
  listing.endTime = endTime
  listing.active = true
  listing.listingType = getListingType(listingType)
  listing.transactionHash = event.transaction.hash
  listing.blockNumber = event.block.number
  listing.createdAt = event.block.timestamp
  listing.updatedAt = event.block.timestamp
  listing.save()
  
  // Update NFT
  nft.currentListing = listingId
  nft.updatedAt = event.block.timestamp
  nft.save()
  
  // Update collection stats
  let collection = Collection.load(nftContract.toHexString())
  if (collection) {
    collection.totalListings = collection.totalListings.plus(BigInt.fromI32(1))
    collection.updatedAt = event.block.timestamp
    collection.save()
  }
  
  // Update global stats
  const stats = getOrCreateStats()
  stats.totalListings = stats.totalListings.plus(BigInt.fromI32(1))
  stats.activeListings = stats.activeListings.plus(BigInt.fromI32(1))
  stats.updatedAt = event.block.timestamp
  stats.save()
}

export function handleItemSold(event: ItemSold): void {
  const nftContract = event.params.nftContract
  const tokenId = event.params.tokenId
  const seller = event.params.seller
  const buyer = event.params.buyer
  const price = event.params.price
  const currency = event.params.currency

  const nftId = nftContract.toHexString() + "-" + tokenId.toString()

  // Update NFT
  const nft = NFT.load(nftId)
  if (nft) {
    // Deactivate listing
    if (nft.currentListing) {
      const listing = Listing.load(nft.currentListing as string)
      if (listing) {
        listing.active = false
        listing.soldAt = event.block.timestamp
        listing.updatedAt = event.block.timestamp
        listing.save()
      }
    }

    // Auto-cancel all competing offers. The contract does NOT do this, so the
    // subgraph marks them as inactive here. Their ETH is still locked on-chain
    // until each buyer calls cancelOffer() — autoRejected=true signals the UI
    // to show a "Recover ETH" prompt.
    const buyers = nft.offerBuyers
    let cancelledCount = 0
    for (let i = 0; i < buyers.length; i++) {
      const offerId = nftContract.toHexString() + "-" + tokenId.toString() + "-" + buyers[i]
      const offer = Offer.load(offerId)
      if (offer && offer.active) {
        offer.active = false
        offer.autoRejected = true
        offer.cancelledAt = event.block.timestamp
        offer.updatedAt = event.block.timestamp
        offer.save()
        cancelledCount++
      }
    }
    nft.offerBuyers = []

    // Update NFT owner
    const buyerUser = getOrCreateUser(buyer, event.block.timestamp)
    nft.owner = buyerUser.id
    nft.currentListing = null
    nft.lastSalePrice = price
    nft.lastSaleCurrency = currency
    nft.lastSaleAt = event.block.timestamp
    nft.updatedAt = event.block.timestamp
    nft.save()

    // Adjust stats for auto-cancelled offers
    if (cancelledCount > 0) {
      const offerStats = getOrCreateStats()
      offerStats.activeOffers = offerStats.activeOffers.minus(BigInt.fromI32(cancelledCount))
      offerStats.updatedAt = event.block.timestamp
      offerStats.save()
    }
  }

  // Update seller stats
  const sellerUser = User.load(seller.toHexString())
  if (sellerUser) {
    sellerUser.totalSold = sellerUser.totalSold.plus(BigInt.fromI32(1))
    sellerUser.totalEarned = sellerUser.totalEarned.plus(price)
    sellerUser.updatedAt = event.block.timestamp
    sellerUser.save()
  }

  // Update buyer stats
  const buyerUser = getOrCreateUser(buyer, event.block.timestamp)
  buyerUser.totalPurchased = buyerUser.totalPurchased.plus(BigInt.fromI32(1))
  buyerUser.totalSpent = buyerUser.totalSpent.plus(price)
  buyerUser.updatedAt = event.block.timestamp
  buyerUser.save()

  // Update collection stats
  let collection = Collection.load(nftContract.toHexString())
  if (collection) {
    collection.totalVolume = collection.totalVolume.plus(price)
    collection.totalSales = collection.totalSales.plus(BigInt.fromI32(1))

    // Update floor price if needed
    if (!collection.floorPrice || price.lt(collection.floorPrice as BigInt)) {
      collection.floorPrice = price
    }
    collection.updatedAt = event.block.timestamp
    collection.save()
  }

  // Update global stats
  const stats = getOrCreateStats()
  stats.activeListings = stats.activeListings.minus(BigInt.fromI32(1))
  stats.totalSales = stats.totalSales.plus(BigInt.fromI32(1))
  stats.totalVolume = stats.totalVolume.plus(price)
  stats.updatedAt = event.block.timestamp
  stats.save()
}

export function handleListingCancelled(event: ListingCancelled): void {
  const nftContract = event.params.nftContract
  const tokenId = event.params.tokenId
  const nftId = nftContract.toHexString() + "-" + tokenId.toString()
  
  const nft = NFT.load(nftId)
  if (nft && nft.currentListing) {
    const listing = Listing.load(nft.currentListing as string)
    if (listing) {
      listing.active = false
      listing.cancelledAt = event.block.timestamp
      listing.updatedAt = event.block.timestamp
      listing.save()
    }
    
    nft.currentListing = null
    nft.updatedAt = event.block.timestamp
    nft.save()
  }
  
  // Update stats
  const stats = getOrCreateStats()
  stats.activeListings = stats.activeListings.minus(BigInt.fromI32(1))
  stats.updatedAt = event.block.timestamp
  stats.save()
}

export function handleListingUpdated(event: ListingUpdated): void {
  const nftContract = event.params.nftContract
  const tokenId = event.params.tokenId
  const newPrice = event.params.newPrice
  const nftId = nftContract.toHexString() + "-" + tokenId.toString()

  const nft = NFT.load(nftId)
  if (nft && nft.currentListing) {
    const listing = Listing.load(nft.currentListing as string)
    if (listing) {
      listing.price = newPrice
      listing.updatedAt = event.block.timestamp
      listing.save()
    }
  }

  const stats = getOrCreateStats()
  stats.updatedAt = event.block.timestamp
  stats.save()
}

// ============================================
// AUCTION HANDLERS
// ============================================

export function handleAuctionCreated(event: AuctionCreated): void {
  const nftContract = event.params.nftContract
  const tokenId = event.params.tokenId
  const seller = event.params.seller
  const startingPrice = event.params.startingPrice
  const reservePrice = event.params.reservePrice
  const endTime = event.params.endTime
  const currency = event.params.currency
  
  const auctionId = nftContract.toHexString() + "-" + tokenId.toString() + "-" + event.transaction.hash.toHexString()
  
  // Get or create entities
  const sellerUser = getOrCreateUser(seller, event.block.timestamp)
  const nft = getOrCreateNFT(nftContract, tokenId, event.block.timestamp)
  
  // Create auction
  const auction = new Auction(auctionId)
  auction.nft = nft.id
  auction.collection = nftContract.toHexString()
  auction.seller = sellerUser.id
  auction.startingPrice = startingPrice
  auction.reservePrice = reservePrice
  auction.highestBid = BigInt.fromI32(0)
  auction.startTime = event.block.timestamp
  auction.endTime = endTime
  auction.currency = currency
  auction.status = "Active"
  auction.transactionHash = event.transaction.hash
  auction.blockNumber = event.block.number
  auction.createdAt = event.block.timestamp
  auction.updatedAt = event.block.timestamp
  auction.save()
  
  // Update NFT
  nft.currentAuction = auctionId
  nft.updatedAt = event.block.timestamp
  nft.save()
  
  // Update global stats
  const stats = getOrCreateStats()
  stats.totalAuctions = stats.totalAuctions.plus(BigInt.fromI32(1))
  stats.activeAuctions = stats.activeAuctions.plus(BigInt.fromI32(1))
  stats.updatedAt = event.block.timestamp
  stats.save()
}

export function handleBidPlaced(event: BidPlaced): void {
  const nftContract = event.params.nftContract
  const tokenId = event.params.tokenId
  const bidder = event.params.bidder
  const amount = event.params.amount
  
  const nftId = nftContract.toHexString() + "-" + tokenId.toString()
  
  const nft = NFT.load(nftId)
  if (nft && nft.currentAuction) {
    const auction = Auction.load(nft.currentAuction as string)
    if (auction) {
      // Update auction
      const bidderUser = getOrCreateUser(bidder, event.block.timestamp)
      auction.highestBidder = bidderUser.id
      auction.highestBid = amount
      auction.updatedAt = event.block.timestamp
      auction.save()
      
      // Create bid record
      const bidId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
      const bid = new Bid(bidId)
      bid.auction = auction.id
      bid.bidder = bidderUser.id
      bid.amount = amount
      bid.transactionHash = event.transaction.hash
      bid.blockNumber = event.block.number
      bid.timestamp = event.block.timestamp
      bid.save()
    }
  }
}

export function handleAuctionSettled(event: AuctionSettled): void {
  const nftContract = event.params.nftContract
  const tokenId = event.params.tokenId
  const seller = event.params.seller
  const winner = event.params.winner
  const price = event.params.price
  const currency = event.params.currency
  
  const nftId = nftContract.toHexString() + "-" + tokenId.toString()
  
  const nft = NFT.load(nftId)
  if (nft && nft.currentAuction) {
    const auction = Auction.load(nft.currentAuction as string)
    if (auction) {
      auction.status = "Sold"
      auction.settledAt = event.block.timestamp
      auction.updatedAt = event.block.timestamp
      auction.save()
    }
    
    // Update NFT owner
    const winnerUser = getOrCreateUser(winner, event.block.timestamp)
    nft.owner = winnerUser.id
    nft.currentAuction = null
    nft.lastSalePrice = price
    nft.lastSaleCurrency = currency
    nft.lastSaleAt = event.block.timestamp
    nft.updatedAt = event.block.timestamp
    nft.save()
  }
  
  // Update seller stats
  const sellerUser = User.load(seller.toHexString())
  if (sellerUser) {
    sellerUser.totalSold = sellerUser.totalSold.plus(BigInt.fromI32(1))
    sellerUser.totalEarned = sellerUser.totalEarned.plus(price)
    sellerUser.updatedAt = event.block.timestamp
    sellerUser.save()
  }
  
  // Update winner stats
  const winnerUser = getOrCreateUser(winner, event.block.timestamp)
  winnerUser.totalPurchased = winnerUser.totalPurchased.plus(BigInt.fromI32(1))
  winnerUser.totalSpent = winnerUser.totalSpent.plus(price)
  winnerUser.updatedAt = event.block.timestamp
  winnerUser.save()
  
  // Update global stats
  const stats = getOrCreateStats()
  stats.activeAuctions = stats.activeAuctions.minus(BigInt.fromI32(1))
  stats.totalSales = stats.totalSales.plus(BigInt.fromI32(1))
  stats.totalVolume = stats.totalVolume.plus(price)
  stats.updatedAt = event.block.timestamp
  stats.save()

  // Update collection stats
  let collection = Collection.load(nftContract.toHexString())
  if (collection) {
    collection.totalVolume = collection.totalVolume.plus(price)
    collection.totalSales = collection.totalSales.plus(BigInt.fromI32(1))
    collection.updatedAt = event.block.timestamp
    collection.save()
  }
}

export function handleAuctionCancelled(event: AuctionCancelled): void {
  const nftContract = event.params.nftContract
  const tokenId = event.params.tokenId
  const nftId = nftContract.toHexString() + "-" + tokenId.toString()
  
  const nft = NFT.load(nftId)
  if (nft && nft.currentAuction) {
    const auction = Auction.load(nft.currentAuction as string)
    if (auction) {
      auction.status = "Cancelled"
      auction.cancelledAt = event.block.timestamp
      auction.updatedAt = event.block.timestamp
      auction.save()
    }
    
    nft.currentAuction = null
    nft.updatedAt = event.block.timestamp
    nft.save()
  }
  
  // Update stats
  const stats = getOrCreateStats()
  stats.activeAuctions = stats.activeAuctions.minus(BigInt.fromI32(1))
  stats.updatedAt = event.block.timestamp
  stats.save()
}

// ============================================
// OFFER HANDLERS
// ============================================

export function handleOfferMade(event: OfferMade): void {
  const nftContract = event.params.nftContract
  const tokenId = event.params.tokenId
  const buyer = event.params.buyer
  const price = event.params.price
  const expiryTime = event.params.expiryTime
  const currency = event.params.currency

  const offerId = nftContract.toHexString() + "-" + tokenId.toString() + "-" + buyer.toHexString()

  // Get or create entities
  const buyerUser = getOrCreateUser(buyer, event.block.timestamp)
  const nft = getOrCreateNFT(nftContract, tokenId, event.block.timestamp)

  // Check if this is an update to an existing offer from the same buyer.
  // Avoids double-counting in stats (same pattern as handleCollectionOfferMade).
  const existingOffer = Offer.load(offerId)
  const isNewOffer = !existingOffer || !existingOffer.active
  const originalCreatedAt = existingOffer ? existingOffer.createdAt : event.block.timestamp

  // Create/overwrite offer entity
  const offer = new Offer(offerId)
  offer.nft = nft.id
  offer.collection = nftContract.toHexString()
  offer.buyer = buyerUser.id
  offer.price = price
  offer.currency = currency
  offer.expiryTime = expiryTime
  offer.active = true
  offer.autoRejected = false
  offer.isCollectionOffer = false
  offer.transactionHash = event.transaction.hash
  offer.blockNumber = event.block.number
  offer.createdAt = originalCreatedAt
  offer.updatedAt = event.block.timestamp
  offer.save()

  // Track buyer in NFT's offerBuyers array (only when genuinely new)
  if (isNewOffer) {
    const buyerId = buyer.toHexString()
    const buyers = nft.offerBuyers
    if (!buyers.includes(buyerId)) {
      buyers.push(buyerId)
      nft.offerBuyers = buyers
      nft.updatedAt = event.block.timestamp
      nft.save()
    }

    const stats = getOrCreateStats()
    stats.totalOffers = stats.totalOffers.plus(BigInt.fromI32(1))
    stats.activeOffers = stats.activeOffers.plus(BigInt.fromI32(1))
    stats.updatedAt = event.block.timestamp
    stats.save()
  }
}

export function handleOfferAccepted(event: OfferAccepted): void {
  const nftContract = event.params.nftContract
  const tokenId = event.params.tokenId
  const seller = event.params.seller
  const buyer = event.params.buyer
  const price = event.params.price
  const currency = event.params.currency

  const offerId = nftContract.toHexString() + "-" + tokenId.toString() + "-" + buyer.toHexString()
  const nftId = nftContract.toHexString() + "-" + tokenId.toString()

  // Update the accepted offer
  const offer = Offer.load(offerId)
  if (offer) {
    offer.active = false
    offer.autoRejected = false
    offer.seller = getOrCreateUser(seller, event.block.timestamp).id
    offer.acceptedAt = event.block.timestamp
    offer.updatedAt = event.block.timestamp
    offer.save()
  }

  // Update NFT owner — also clear any active listing (contract deactivates it but
  // does NOT emit ListingCancelled, so the subgraph must handle it here)
  const nft = NFT.load(nftId)
  if (nft) {
    if (nft.currentListing) {
      const listing = Listing.load(nft.currentListing as string)
      if (listing && listing.active) {
        listing.active = false
        listing.soldAt = event.block.timestamp
        listing.updatedAt = event.block.timestamp
        listing.save()
        const lstStats = getOrCreateStats()
        lstStats.activeListings = lstStats.activeListings.minus(BigInt.fromI32(1))
        lstStats.updatedAt = event.block.timestamp
        lstStats.save()
      }
    }

    // Auto-cancel all competing offers (everyone except the accepted buyer).
    // The contract does NOT emit OfferCancelled for these — their ETH is locked
    // on-chain until they call cancelOffer(). autoRejected=true signals the UI.
    const buyers = nft.offerBuyers
    const acceptedBuyerId = buyer.toHexString()
    let cancelledCount = 0
    for (let i = 0; i < buyers.length; i++) {
      if (buyers[i] == acceptedBuyerId) continue
      const competingOfferId = nftContract.toHexString() + "-" + tokenId.toString() + "-" + buyers[i]
      const competingOffer = Offer.load(competingOfferId)
      if (competingOffer && competingOffer.active) {
        competingOffer.active = false
        competingOffer.autoRejected = true
        competingOffer.cancelledAt = event.block.timestamp
        competingOffer.updatedAt = event.block.timestamp
        competingOffer.save()
        cancelledCount++
      }
    }
    nft.offerBuyers = []

    const buyerUser = getOrCreateUser(buyer, event.block.timestamp)
    nft.owner = buyerUser.id
    nft.currentListing = null
    nft.lastSalePrice = price
    nft.lastSaleCurrency = currency
    nft.lastSaleAt = event.block.timestamp
    nft.updatedAt = event.block.timestamp
    nft.save()

    if (cancelledCount > 0) {
      const offerStats = getOrCreateStats()
      offerStats.activeOffers = offerStats.activeOffers.minus(BigInt.fromI32(cancelledCount))
      offerStats.updatedAt = event.block.timestamp
      offerStats.save()
    }
  }

  // Update seller stats
  const sellerUser = User.load(seller.toHexString())
  if (sellerUser) {
    sellerUser.totalSold = sellerUser.totalSold.plus(BigInt.fromI32(1))
    sellerUser.totalEarned = sellerUser.totalEarned.plus(price)
    sellerUser.updatedAt = event.block.timestamp
    sellerUser.save()
  }

  // Update buyer stats
  const buyerUser = getOrCreateUser(buyer, event.block.timestamp)
  buyerUser.totalPurchased = buyerUser.totalPurchased.plus(BigInt.fromI32(1))
  buyerUser.totalSpent = buyerUser.totalSpent.plus(price)
  buyerUser.updatedAt = event.block.timestamp
  buyerUser.save()

  // Update global stats
  const stats = getOrCreateStats()
  stats.activeOffers = stats.activeOffers.minus(BigInt.fromI32(1))
  stats.totalSales = stats.totalSales.plus(BigInt.fromI32(1))
  stats.totalVolume = stats.totalVolume.plus(price)
  stats.updatedAt = event.block.timestamp
  stats.save()

  // Update collection stats
  let collection = Collection.load(nftContract.toHexString())
  if (collection) {
    collection.totalVolume = collection.totalVolume.plus(price)
    collection.totalSales = collection.totalSales.plus(BigInt.fromI32(1))
    collection.updatedAt = event.block.timestamp
    collection.save()
  }
}

export function handleOfferCancelled(event: OfferCancelled): void {
  const nftContract = event.params.nftContract
  const tokenId = event.params.tokenId
  const buyer = event.params.buyer

  const offerId = nftContract.toHexString() + "-" + tokenId.toString() + "-" + buyer.toHexString()

  const offer = Offer.load(offerId)
  if (offer) {
    const wasActive = offer.active
    const wasAutoRejected = offer.autoRejected

    offer.active = false
    offer.autoRejected = false   // ETH has now been recovered on-chain
    offer.cancelledAt = event.block.timestamp
    offer.updatedAt = event.block.timestamp
    offer.save()

    // Remove buyer from NFT's offerBuyers tracking array
    const nftId = nftContract.toHexString() + "-" + tokenId.toString()
    const nft = NFT.load(nftId)
    if (nft) {
      const buyerId = buyer.toHexString()
      const buyers = nft.offerBuyers
      const filtered: string[] = []
      for (let i = 0; i < buyers.length; i++) {
        if (buyers[i] != buyerId) filtered.push(buyers[i])
      }
      nft.offerBuyers = filtered
      nft.updatedAt = event.block.timestamp
      nft.save()
    }

    // Only decrement activeOffers if the offer was still showing as active
    // in the subgraph. If autoRejected=true, we already decremented when the
    // NFT was sold — guard here prevents going negative.
    if (wasActive && !wasAutoRejected) {
      const stats = getOrCreateStats()
      stats.activeOffers = stats.activeOffers.minus(BigInt.fromI32(1))
      stats.updatedAt = event.block.timestamp
      stats.save()
    }
  }
}

// ============================================
// COLLECTION OFFER HANDLERS
// ============================================

export function handleCollectionOfferMade(event: CollectionOfferMade): void {
  const nftContract = event.params.nftContract
  const buyer = event.params.buyer
  const price = event.params.price
  const expiryTime = event.params.expiryTime
  const currency = event.params.currency

  const offerId = nftContract.toHexString() + "-" + buyer.toHexString()

  // Get or create entities
  const buyerUser = getOrCreateUser(buyer, event.block.timestamp)

  // Check if this is a replacement of an existing active offer (buyer updating their bid)
  const existingOffer = CollectionOffer.load(offerId)
  const isNewOffer = !existingOffer || !existingOffer.active
  const originalCreatedAt = existingOffer ? existingOffer.createdAt : event.block.timestamp

  // Create/overwrite collection offer
  const offer = new CollectionOffer(offerId)
  offer.collection = nftContract.toHexString()
  offer.buyer = buyerUser.id
  offer.price = price
  offer.currency = currency
  offer.expiryTime = expiryTime
  offer.active = true
  offer.transactionHash = event.transaction.hash
  offer.blockNumber = event.block.number
  offer.createdAt = originalCreatedAt
  offer.updatedAt = event.block.timestamp
  offer.save()

  // Only count new offers in stats — replacements keep the same slot
  const stats = getOrCreateStats()
  if (isNewOffer) {
    stats.totalOffers = stats.totalOffers.plus(BigInt.fromI32(1))
    stats.activeOffers = stats.activeOffers.plus(BigInt.fromI32(1))
  }
  stats.updatedAt = event.block.timestamp
  stats.save()
}

export function handleCollectionOfferAccepted(event: CollectionOfferAccepted): void {
  const nftContract = event.params.nftContract
  const buyer = event.params.buyer
  const seller = event.params.seller
  const tokenId = event.params.tokenId
  const price = event.params.price
  const currency = event.params.currency

  const offerId = nftContract.toHexString() + "-" + buyer.toHexString()
  const nftId = nftContract.toHexString() + "-" + tokenId.toString()

  // Update collection offer
  const offer = CollectionOffer.load(offerId)
  if (offer) {
    offer.active = false
    offer.acceptedAt = event.block.timestamp
    offer.updatedAt = event.block.timestamp
    offer.save()
  }

  // Update NFT owner — also clear any active listing (contract deactivates it but
  // does NOT emit ListingCancelled, so the subgraph must handle it here)
  const nft = NFT.load(nftId)
  if (nft) {
    if (nft.currentListing) {
      const listing = Listing.load(nft.currentListing as string)
      if (listing && listing.active) {
        listing.active = false
        listing.soldAt = event.block.timestamp
        listing.updatedAt = event.block.timestamp
        listing.save()
        const lstStats = getOrCreateStats()
        lstStats.activeListings = lstStats.activeListings.minus(BigInt.fromI32(1))
        lstStats.updatedAt = event.block.timestamp
        lstStats.save()
      }
    }
    const buyerUser = getOrCreateUser(buyer, event.block.timestamp)
    nft.owner = buyerUser.id
    nft.currentListing = null
    nft.lastSalePrice = price
    nft.lastSaleCurrency = currency
    nft.lastSaleAt = event.block.timestamp
    nft.updatedAt = event.block.timestamp
    nft.save()
  }

  // Update seller stats
  const sellerUser = User.load(seller.toHexString())
  if (sellerUser) {
    sellerUser.totalSold = sellerUser.totalSold.plus(BigInt.fromI32(1))
    sellerUser.totalEarned = sellerUser.totalEarned.plus(price)
    sellerUser.updatedAt = event.block.timestamp
    sellerUser.save()
  }

  // Update buyer stats
  const buyerUser = getOrCreateUser(buyer, event.block.timestamp)
  buyerUser.totalPurchased = buyerUser.totalPurchased.plus(BigInt.fromI32(1))
  buyerUser.totalSpent = buyerUser.totalSpent.plus(price)
  buyerUser.updatedAt = event.block.timestamp
  buyerUser.save()

  // Update global stats
  const stats = getOrCreateStats()
  stats.totalSales = stats.totalSales.plus(BigInt.fromI32(1))
  stats.totalVolume = stats.totalVolume.plus(price)
  stats.activeOffers = stats.activeOffers.minus(BigInt.fromI32(1))
  stats.updatedAt = event.block.timestamp
  stats.save()

  // Update collection stats
  let collection = Collection.load(nftContract.toHexString())
  if (collection) {
    collection.totalVolume = collection.totalVolume.plus(price)
    collection.totalSales = collection.totalSales.plus(BigInt.fromI32(1))
    collection.updatedAt = event.block.timestamp
    collection.save()
  }
}

export function handleCollectionOfferCancelled(event: CollectionOfferCancelled): void {
  const nftContract = event.params.nftContract
  const buyer = event.params.buyer
  
  const offerId = nftContract.toHexString() + "-" + buyer.toHexString()
  
  const offer = CollectionOffer.load(offerId)
  if (offer) {
    offer.active = false
    offer.cancelledAt = event.block.timestamp
    offer.updatedAt = event.block.timestamp
    offer.save()
  }

  // Update stats
  const stats = getOrCreateStats()
  stats.activeOffers = stats.activeOffers.minus(BigInt.fromI32(1))
  stats.updatedAt = event.block.timestamp
  stats.save()
}

// ============================================
// FEE HANDLERS
// ============================================

export function handleFeesWithdrawn(event: FeesWithdrawn): void {
  const recipient = event.params.recipient
  const amount = event.params.amount
  
  // Create withdrawal record
  const withdrawalId = event.transaction.hash.toHexString()
  const withdrawal = new FeeWithdrawal(withdrawalId)
  withdrawal.recipient = recipient
  withdrawal.amount = amount
  withdrawal.transactionHash = event.transaction.hash
  withdrawal.blockNumber = event.block.number
  withdrawal.timestamp = event.block.timestamp
  withdrawal.save()
  
  // Update stats
  const stats = getOrCreateStats()
  stats.totalFeesCollected = stats.totalFeesCollected.plus(amount)
  stats.updatedAt = event.block.timestamp
  stats.save()
}

import {
  CollectionCreated,
  CollectionVerified
} from "../generated/CollectionFactory/CollectionFactory"

import {
  Collection,
  User,
  MarketplaceStats
} from "../generated/schema"

import { NFTCollection } from "../generated/templates"

import { BigInt, Bytes, log } from "@graphprotocol/graph-ts"

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

export function handleCollectionCreated(event: CollectionCreated): void {
  const creator = event.params.creator
  const collectionAddress = event.params.collection
  const name = event.params.name
  const symbol = event.params.symbol
  const maxSupply = event.params.maxSupply
  const royaltyPercent = event.params.royaltyPercent
  
  // Get or create creator user
  const creatorUser = getOrCreateUser(creator, event.block.timestamp)
  
  // Create collection entity
  const collection = new Collection(collectionAddress.toHexString())
  collection.address = collectionAddress
  collection.name = name
  collection.symbol = symbol
  collection.creator = creatorUser.id
  collection.maxSupply = maxSupply
  collection.totalSupply = BigInt.fromI32(0)
  collection.royaltyPercent = royaltyPercent
  collection.royaltyRecipient = creator
  collection.mintPrice = BigInt.fromI32(0)
  collection.baseURI = ""
  collection.verified = false
  collection.totalVolume = BigInt.fromI32(0)
  collection.totalSales = BigInt.fromI32(0)
  collection.totalListings = BigInt.fromI32(0)
  collection.createdAt = event.block.timestamp
  collection.updatedAt = event.block.timestamp
  collection.save()
  
  // Start indexing the new collection dynamically
  NFTCollection.create(collectionAddress)
  
  // Update global stats
  const stats = getOrCreateStats()
  stats.totalCollections = stats.totalCollections.plus(BigInt.fromI32(1))
  stats.updatedAt = event.block.timestamp
  stats.save()
  
  log.info("Collection created: {} ({}) by {} at {}", [
    name,
    symbol,
    creator.toHexString(),
    collectionAddress.toHexString()
  ])
}

export function handleCollectionVerified(event: CollectionVerified): void {
  const collectionAddress = event.params.collection
  const verified = event.params.verified
  
  const collection = Collection.load(collectionAddress.toHexString())
  if (collection) {
    collection.verified = verified
    collection.updatedAt = event.block.timestamp
    collection.save()
    
    log.info("Collection {} verification: {}", [
      collectionAddress.toHexString(),
      verified ? "VERIFIED" : "UNVERIFIED"
    ])
  }
}

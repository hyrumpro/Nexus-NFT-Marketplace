import {
  NFTMinted,
  Transfer,
  RoyaltyUpdated,
  MintPriceUpdated
} from "../generated/templates/NFTCollection/NFTCollection"

import {
  NFT,
  Collection,
  User,
  Transfer as TransferEntity,
  MarketplaceStats
} from "../generated/schema"

import { BigInt, Bytes, log } from "@graphprotocol/graph-ts"

const ZERO_ADDRESS = Bytes.fromHexString("0x0000000000000000000000000000000000000000")
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

export function handleNFTMinted(event: NFTMinted): void {
  const collectionAddress = event.params.collection
  const minter = event.params.minter
  const tokenId = event.params.tokenId
  const uri = event.params.uri
  
  const nftId = collectionAddress.toHexString() + "-" + tokenId.toString()
  
  // Get or create NFT
  let nft = NFT.load(nftId)
  if (!nft) {
    nft = new NFT(nftId)
    nft.tokenId = tokenId
    nft.collection = collectionAddress.toHexString()
    nft.tokenURI = uri
    nft.offerBuyers = []
    nft.createdAt = event.block.timestamp
    
    // Update stats
    const stats = getOrCreateStats()
    stats.totalNFTs = stats.totalNFTs.plus(BigInt.fromI32(1))
    stats.updatedAt = event.block.timestamp
    stats.save()
  }
  
  // Set creator and owner
  const minterUser = getOrCreateUser(minter, event.block.timestamp)
  nft.creator = minterUser.id
  nft.owner = minterUser.id
  nft.tokenURI = uri
  nft.updatedAt = event.block.timestamp
  nft.save()
  
  // Update collection total supply
  const collection = Collection.load(collectionAddress.toHexString())
  if (collection) {
    collection.totalSupply = collection.totalSupply.plus(BigInt.fromI32(1))
    collection.updatedAt = event.block.timestamp
    collection.save()
  }
  
  log.info("NFT minted: token {} in collection {} by {}", [
    tokenId.toString(),
    collectionAddress.toHexString(),
    minter.toHexString()
  ])
}

export function handleTransfer(event: Transfer): void {
  const collectionAddress = event.address
  const from = event.params.from
  const to = event.params.to
  const tokenId = event.params.tokenId
  
  const nftId = collectionAddress.toHexString() + "-" + tokenId.toString()
  
  // Skip mint (from = 0x0) and burn (to = 0x0) events handled elsewhere
  if (from.equals(ZERO_ADDRESS) || to.equals(ZERO_ADDRESS)) {
    return
  }
  
  // Get users
  const fromUser = getOrCreateUser(from, event.block.timestamp)
  const toUser = getOrCreateUser(to, event.block.timestamp)
  
  // Update NFT owner
  const nft = NFT.load(nftId)
  if (nft) {
    nft.owner = toUser.id
    nft.updatedAt = event.block.timestamp
    nft.save()
  }
  
  // Create transfer record
  const transferId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  const transfer = new TransferEntity(transferId)
  transfer.nft = nftId
  transfer.from = fromUser.id
  transfer.to = toUser.id
  transfer.transactionHash = event.transaction.hash
  transfer.blockNumber = event.block.number
  transfer.timestamp = event.block.timestamp
  transfer.save()
  
  log.info("NFT transferred: token {} from {} to {} in collection {}", [
    tokenId.toString(),
    from.toHexString(),
    to.toHexString(),
    collectionAddress.toHexString()
  ])
}

export function handleRoyaltyUpdated(event: RoyaltyUpdated): void {
  const collectionAddress = event.address
  const recipient = event.params.recipient
  const percentage = event.params.percentage

  const collection = Collection.load(collectionAddress.toHexString())
  if (collection) {
    collection.royaltyRecipient = recipient
    collection.royaltyPercent = percentage
    collection.updatedAt = event.block.timestamp
    collection.save()

    log.info("Royalty updated for collection {}: {}% to {}", [
      collectionAddress.toHexString(),
      (percentage.toI32() / 100).toString(),
      recipient.toHexString()
    ])
  }
}

export function handleMintPriceUpdated(event: MintPriceUpdated): void {
  const collectionAddress = event.address
  const newPrice = event.params.newPrice

  const collection = Collection.load(collectionAddress.toHexString())
  if (collection) {
    collection.mintPrice = newPrice
    collection.updatedAt = event.block.timestamp
    collection.save()

    log.info("Mint price updated for collection {}: {}", [
      collectionAddress.toHexString(),
      newPrice.toString()
    ])
  }
}

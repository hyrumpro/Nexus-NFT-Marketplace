# NexusNFT Subgraph

The Graph subgraph for indexing NexusNFT Marketplace data.

## Overview

This subgraph indexes all events from:
- **NexusMarketplace** - Listings, auctions, bids, offers, sales
- **CollectionFactory** - Collection creation and verification
- **NFTCollection** (dynamic) - NFT minting, transfers, royalties

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Contract Addresses

Update `subgraph.yaml` with your deployed contract addresses:

```yaml
dataSources:
  - name: NexusMarketplace
    source:
      address: "0x..." # Your marketplace address
      startBlock: 12345 # Deployment block
  - name: CollectionFactory
    source:
      address: "0x..." # Your factory address
      startBlock: 12345 # Deployment block
```

### 3. Generate Types
```bash
npm run codegen
```

### 4. Build
```bash
npm run build
```

### 5. Deploy

**Hosted Service:**
```bash
graph auth --product hosted-service <ACCESS_TOKEN>
npm run deploy
```

**Graph Studio:**
```bash
graph auth --studio <DEPLOY_KEY>
npm run deploy:studio
```

## Schema

### Entities

| Entity | Description |
|--------|-------------|
| `Collection` | NFT collection with stats |
| `NFT` | Individual NFT token |
| `Listing` | Fixed-price or timed listing |
| `Auction` | Timed auction with bids |
| `Bid` | Individual bid on auction |
| `Offer` | Offer on specific NFT |
| `CollectionOffer` | Offer on any NFT in collection |
| `Transfer` | NFT transfer history |
| `User` | User profile and stats |
| `MarketplaceStats` | Global marketplace statistics |

## Example Queries

### Get Active Listings
```graphql
query GetListings($first: Int, $skip: Int) {
  listings(
    first: $first
    skip: $skip
    where: { active: true }
    orderBy: createdAt
    orderDirection: desc
  ) {
    id
    price
    nft {
      tokenId
      tokenURI
      collection {
        name
        symbol
        address
      }
    }
    seller {
      address
    }
    createdAt
  }
}
```

### Get Collection Floor Price
```graphql
query GetFloorPrice($collection: String!) {
  listings(
    first: 1
    where: { 
      collection: $collection,
      active: true 
    }
    orderBy: price
    orderDirection: asc
  ) {
    price
    nft {
      tokenId
    }
  }
}
```

### Get User Activity
```graphql
query GetUserActivity($address: String!) {
  user(id: $address) {
    address
    nftsOwned {
      tokenId
      collection {
        name
      }
    }
    totalPurchased
    totalSold
    totalSpent
    totalEarned
  }
}
```

### Get Active Auctions
```graphql
query GetActiveAuctions {
  auctions(
    where: { status: Active }
    orderBy: endTime
    orderDirection: asc
  ) {
    id
    nft {
      tokenId
      collection {
        name
      }
    }
    startingPrice
    highestBid
    endTime
    highestBidder {
      address
    }
  }
}
```

### Get Marketplace Stats
```graphql
query GetStats {
  marketplaceStats(id: "marketplace") {
    totalListings
    activeListings
    totalSales
    totalVolume
    totalCollections
    totalUsers
  }
}
```

## Networks

Configure the network in `subgraph.yaml`:

```yaml
network: sepolia  # or mainnet, polygon, arbitrum-one, etc.
```

## Development

### Local Testing

1. Start local Graph node:
```bash
docker-compose up
```

2. Create and deploy locally:
```bash
npm run create-local
npm run deploy-local
```

### File Structure

```
subgraph/
├── abis/                    # Contract ABIs
│   ├── NexusMarketplace.json
│   ├── NFTCollection.json
│   ├── CollectionFactory.json
│   ├── ERC721.json
│   └── ERC2981.json
├── src/
│   ├── marketplace.ts       # Marketplace event handlers
│   ├── factory.ts           # Factory event handlers
│   └── collection.ts        # Collection event handlers
├── schema.graphql           # GraphQL schema
├── subgraph.yaml           # Subgraph manifest
├── package.json
└── tsconfig.json
```

## Events Indexed

### NexusMarketplace
- `ItemListed` - New listing created
- `ItemSold` - NFT sold
- `ListingCancelled` - Listing cancelled
- `ListingUpdated` - Price updated
- `AuctionCreated` - New auction
- `BidPlaced` - Bid placed
- `AuctionSettled` - Auction ended
- `AuctionCancelled` - Auction cancelled
- `OfferMade` - New offer
- `OfferAccepted` - Offer accepted
- `OfferCancelled` - Offer cancelled
- `CollectionOfferMade` - Collection offer
- `CollectionOfferAccepted` - Collection offer accepted
- `CollectionOfferCancelled` - Collection offer cancelled
- `FeesWithdrawn` - Fees withdrawn

### CollectionFactory
- `CollectionCreated` - New collection deployed
- `CollectionVerified` - Collection verified/unverified

### NFTCollection
- `NFTMinted` - NFT minted
- `Transfer` - NFT transferred
- `RoyaltyUpdated` - Royalty changed

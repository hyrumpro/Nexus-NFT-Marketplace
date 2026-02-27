import { gql } from 'graphql-request'

export const GET_ALL_LISTINGS = gql`
  query GetListings(
    $first: Int,
    $skip: Int,
    $orderBy: Listing_orderBy,
    $orderDirection: OrderDirection,
    $where: Listing_filter
  ) {
    listings(
      first: $first
      skip: $skip
      where: $where
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      price
      currency
      startTime
      endTime
      listingType
      createdAt
      nft {
        id
        tokenId
        tokenURI
        lastSalePrice
        collection {
          id
          address
          name
          symbol
        }
        owner {
          address
        }
      }
      seller {
        address
      }
      transactionHash
    }
  }
`

export const GET_LISTINGS_BY_COLLECTION = gql`
  query GetListingsByCollection(
    $first: Int
    $skip: Int
    $orderBy: Listing_orderBy
    $orderDirection: OrderDirection
    $where: Listing_filter
  ) {
    listings(
      first: $first
      skip: $skip
      where: $where
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      price
      currency
      startTime
      endTime
      listingType
      nft {
        id
        tokenId
        tokenURI
        owner {
          address
        }
      }
      seller {
        address
      }
    }
  }
`

export const GET_LISTINGS_BY_SELLER = gql`
  query GetListingsBySeller(
    $seller: String!
    $first: Int
    $skip: Int
  ) {
    listings(
      first: $first
      skip: $skip
      where: {
        seller: $seller,
        active: true
      }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      price
      currency
      listingType
      startTime
      endTime
      active
      seller {
        address
      }
      nft {
        id
        tokenId
        tokenURI
        collection {
          id
          address
          name
          symbol
        }
      }
      createdAt
    }
  }
`

export const GET_ACTIVE_AUCTIONS = gql`
  query GetActiveAuctions($first: Int, $skip: Int) {
    auctions(
      first: $first
      skip: $skip
      where: { status: Active }
      orderBy: endTime
      orderDirection: asc
    ) {
      id
      startingPrice
      reservePrice
      highestBid
      startTime
      endTime
      currency
      status
      nft {
        id
        tokenId
        tokenURI
        collection {
          id
          name
          symbol
        }
      }
      seller {
        address
      }
      highestBidder {
        address
      }
      bids(first: 5, orderBy: timestamp, orderDirection: desc) {
        id
        amount
        bidder {
          address
        }
        timestamp
      }
    }
  }
`

export const GET_NFT_DETAIL = gql`
  query GetNFTDetail($nftId: String!) {
    nft(id: $nftId) {
      id
      tokenId
      tokenURI
      lastSalePrice
      lastSaleCurrency
      lastSaleAt
      createdAt
      collection {
        id
        address
        name
        symbol
        royaltyPercent
        royaltyRecipient
        verified
      }
      owner {
        address
      }
      creator {
        address
      }
      currentListing {
        id
        price
        currency
        seller {
          address
        }
        startTime
        endTime
        listingType
      }
      currentAuction {
        id
        startingPrice
        reservePrice
        highestBid
        endTime
        status
        seller {
          address
        }
        highestBidder {
          address
        }
      }
    }
  }
`

export const GET_OFFERS_FOR_NFT = gql`
  query GetOffersForNFT($nftId: String!, $first: Int, $skip: Int) {
    offers(
      first: $first
      skip: $skip
      where: { 
        nft: $nftId,
        active: true 
      }
      orderBy: price
      orderDirection: desc
    ) {
      id
      price
      currency
      expiryTime
      buyer {
        address
      }
      createdAt
    }
  }
`

export const GET_COLLECTION_DETAIL = gql`
  query GetCollectionDetail($address: String!) {
    collection(id: $address) {
      id
      address
      name
      symbol
      maxSupply
      totalSupply
      royaltyPercent
      royaltyRecipient
      mintPrice
      verified
      floorPrice
      totalVolume
      totalSales
      totalListings
      createdAt
      creator {
        address
      }
    }
  }
`

export const GET_ALL_COLLECTIONS = gql`
  query GetAllCollections($first: Int, $skip: Int) {
    collections(
      first: $first
      skip: $skip
      orderBy: totalVolume
      orderDirection: desc
    ) {
      id
      address
      name
      symbol
      totalSupply
      floorPrice
      totalVolume
      verified
    }
  }
`

export const GET_USER_PROFILE = gql`
  query GetUserProfile($address: String!) {
    user(id: $address) {
      address
      totalPurchased
      totalSold
      totalSpent
      totalEarned
      nftsOwned(first: 20) {
        id
        tokenId
        tokenURI
        collection {
          name
          symbol
          address
        }
        currentListing {
          id
          price
          active
        }
      }
      listings(first: 10, where: { active: true }) {
        id
        price
        nft {
          tokenId
          tokenURI
          collection {
            name
            address
          }
        }
      }
      offers(first: 10, where: { active: true }) {
        id
        price
        expiryTime
        nft {
          tokenId
          tokenURI
          collection {
            address
            name
          }
        }
      }
      autoRejectedOffers: offers(first: 10, where: { autoRejected: true }) {
        id
        price
        currency
        cancelledAt
        nft {
          id
          tokenId
          tokenURI
          collection {
            address
            name
          }
        }
      }
    }
  }
`

export const GET_NFTS_BY_OWNER = gql`
  query GetNFTsByOwner($owner: String!, $first: Int, $skip: Int) {
    nfts(
      first: $first
      skip: $skip
      where: { owner: $owner }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      tokenId
      tokenURI
      collection {
        id
        address
        name
        symbol
      }
      currentListing {
        id
        price
        active
      }
      lastSalePrice
    }
  }
`

export const GET_MARKETPLACE_STATS = gql`
  query GetMarketplaceStats {
    marketplaceStats(id: "marketplace") {
      totalListings
      activeListings
      totalAuctions
      activeAuctions
      totalSales
      totalVolume
      totalCollections
      totalNFTs
      totalUsers
    }
  }
`

export const GET_COLLECTIONS_BY_CREATOR = gql`
  query GetCollectionsByCreator($creator: String!, $first: Int, $skip: Int) {
    collections(
      first: $first
      skip: $skip
      where: { creator: $creator }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      address
      name
      symbol
      totalSupply
      maxSupply
      mintPrice
      floorPrice
      totalVolume
      totalSales
      verified
      createdAt
    }
  }
`

export const GET_OFFERS_RECEIVED = gql`
  query GetOffersReceived($owner: String!, $first: Int) {
    offers(
      first: $first
      where: {
        nft_: { owner: $owner }
        active: true
      }
      orderBy: price
      orderDirection: desc
    ) {
      id
      price
      expiryTime
      createdAt
      buyer {
        address
      }
      nft {
        tokenId
        tokenURI
        collection {
          address
          name
        }
      }
    }
  }
`

export const GET_AUTO_REJECTED_OFFERS = gql`
  query GetAutoRejectedOffers($buyer: String!, $first: Int) {
    offers(
      first: $first
      where: {
        buyer: $buyer
        autoRejected: true
      }
      orderBy: cancelledAt
      orderDirection: desc
    ) {
      id
      price
      currency
      cancelledAt
      nft {
        id
        tokenId
        tokenURI
        collection {
          address
          name
        }
      }
    }
  }
`

export const SEARCH_LISTINGS = gql`
  query SearchListings($searchText: String!, $first: Int, $skip: Int) {
    listings(
      first: $first
      skip: $skip
      where: { 
        active: true,
        or: [
          { collection_: { name_contains_nocase: $searchText } },
          { collection_: { symbol_contains_nocase: $searchText } }
        ]
      }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      price
      listingType
      nft {
        id
        tokenId
        tokenURI
        collection {
          id
          name
          address
        }
      }
      seller {
        address
      }
    }
  }
`

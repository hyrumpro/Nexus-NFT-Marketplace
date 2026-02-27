// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title INexusMarketplace
 * @dev Interface for Nexus NFT Marketplace
 * @notice Supports any ERC721 NFT (not just factory-created collections)
 */
interface INexusMarketplace {
    enum ListingType { FixedPrice, TimedAuction }
    enum AuctionStatus { Active, Ended, Cancelled, Sold }

    struct Listing {
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 price;
        uint256 startTime;
        uint256 endTime;
        address currency;
        bool active;
        ListingType listingType;
    }

    struct Auction {
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 startingPrice;
        uint256 reservePrice;
        uint256 startTime;
        uint256 endTime;
        address highestBidder;
        uint256 highestBid;
        address currency;
        AuctionStatus status;
    }

    struct Offer {
        address nftContract;
        uint256 tokenId;
        address buyer;
        uint256 price;
        uint256 expiryTime;
        address currency;
        bool active;
    }

    struct CollectionOffer {
        address nftContract;
        address buyer;
        uint256 price;
        uint256 expiryTime;
        address currency;
        bool active;
    }

    event ItemListed(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price,
        address currency,
        uint256 endTime,
        ListingType listingType
    );

    event ItemSold(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller,
        address buyer,
        uint256 price,
        address currency
    );

    event ListingCancelled(address indexed nftContract, uint256 indexed tokenId);

    event ListingUpdated(
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 newPrice
    );

    event AuctionCreated(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 startingPrice,
        uint256 reservePrice,
        uint256 endTime,
        address currency
    );

    event BidPlaced(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed bidder,
        uint256 amount
    );

    event AuctionSettled(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller,
        address winner,
        uint256 price,
        address currency
    );

    event AuctionCancelled(address indexed nftContract, uint256 indexed tokenId);

    event OfferMade(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 price,
        uint256 expiryTime,
        address currency
    );

    event CollectionOfferMade(
        address indexed nftContract,
        address indexed buyer,
        uint256 price,
        uint256 expiryTime,
        address currency
    );

    event CollectionOfferAccepted(
        address indexed nftContract,
        address indexed buyer,
        address indexed seller,
        uint256 tokenId,
        uint256 price,
        address currency
    );

    event CollectionOfferCancelled(
        address indexed nftContract,
        address indexed buyer
    );

    event OfferAccepted(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller,
        address buyer,
        uint256 price,
        address currency
    );

    event OfferCancelled(address indexed nftContract, uint256 indexed tokenId, address indexed buyer);

    event FeesWithdrawn(address indexed recipient, uint256 amount);

    function listItem(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        address currency
    ) external;

    function listItemWithExpiry(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        address currency,
        uint256 duration
    ) external;

    function updateListing(
        address nftContract,
        uint256 tokenId,
        uint256 newPrice
    ) external;

    function cancelListing(address nftContract, uint256 tokenId) external;

    function buyItem(address nftContract, uint256 tokenId) external payable;

    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 reservePrice,
        uint256 duration,
        address currency
    ) external;

    function placeBid(address nftContract, uint256 tokenId) external payable;

    function settleAuction(address nftContract, uint256 tokenId) external;

    function cancelAuction(address nftContract, uint256 tokenId) external;

    function makeOffer(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 expiryTime,
        address currency
    ) external payable;

    function makeCollectionOffer(
        address nftContract,
        uint256 price,
        uint256 expiryTime,
        address currency
    ) external payable;

    function acceptOffer(
        address nftContract,
        uint256 tokenId,
        address buyer
    ) external;

    function acceptCollectionOffer(
        address nftContract,
        uint256 tokenId,
        address buyer
    ) external;

    function cancelOffer(address nftContract, uint256 tokenId) external;

    function cancelCollectionOffer(address nftContract) external;

    function withdrawFees() external;

    function getListing(address nftContract, uint256 tokenId) external view returns (Listing memory);

    function getAuction(address nftContract, uint256 tokenId) external view returns (Auction memory);

    function getOffer(address nftContract, uint256 tokenId, address buyer) external view returns (Offer memory);

    function getCollectionOffer(address nftContract, address buyer) external view returns (CollectionOffer memory);

    function setMarketplaceFeePercent(uint256 newFeePercent) external;

    function pause() external;

    function unpause() external;

    function marketplaceFeePercent() external view returns (uint256);

    function feeRecipient() external view returns (address);

    function accumulatedFees() external view returns (uint256);
}

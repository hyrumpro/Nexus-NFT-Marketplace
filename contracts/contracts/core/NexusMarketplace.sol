// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "../interfaces/INexusMarketplace.sol";

/**
 * @title NexusMarketplace
 * @dev Main NFT marketplace contract for listings, auctions, and offers
 * @notice Supports any ERC721 NFT (not just factory-created collections)
 * @custom:security-contact security@nexusnft.io
 */
contract NexusMarketplace is
    INexusMarketplace,
    IERC721Receiver,
    ReentrancyGuard,
    Pausable,
    Ownable,
    EIP712
{
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MAX_MARKETPLACE_FEE = 500;
    uint256 public constant MIN_AUCTION_DURATION = 1 hours;
    uint256 public constant MAX_AUCTION_DURATION = 7 days;
    uint256 public constant MIN_OFFER_DURATION = 1 hours;
    uint256 public constant MAX_OFFER_DURATION = 30 days;

    uint256 public marketplaceFeePercent = 150;
    address public feeRecipient;

    uint256 public accumulatedFees;

    address public factory;

    mapping(bytes32 => Listing)         public listings;
    mapping(bytes32 => Auction)         public auctions;
    mapping(bytes32 => Offer)           public offers;
    mapping(bytes32 => CollectionOffer) public collectionOffers;

    mapping(bytes32 => mapping(address => uint256)) public bids;

    mapping(address => bool)    public supportedCurrencies;

    // Pull-payment for outbid refunds that couldn't be pushed directly
    mapping(address => uint256) public pendingRefunds;

    event MarketplaceFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event CurrencySupported(address currency, bool supported);
    event FactoryUpdated(address oldFactory, address newFactory);

    modifier validCurrency(address currency) {
        require(currency == address(0) || supportedCurrencies[currency], "Unsupported currency");
        _;
    }

    constructor(
        address feeRecipient_,
        address factory_
    ) Ownable(msg.sender) EIP712("NexusMarketplace", "1") {
        require(feeRecipient_ != address(0), "Invalid fee recipient");
        feeRecipient = feeRecipient_;
        factory = factory_;
        supportedCurrencies[address(0)] = true;
    }

    // ─── Key helpers ─────────────────────────────────────────────────────────

    function _getListingKey(address nftContract, uint256 tokenId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(nftContract, tokenId));
    }

    function _getOfferKey(
        address nftContract,
        uint256 tokenId,
        address buyer
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(nftContract, tokenId, buyer));
    }

    function _getCollectionOfferKey(
        address nftContract,
        address buyer
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(nftContract, buyer));
    }

    // ─── Royalty helpers ─────────────────────────────────────────────────────

    function _getRoyaltyInfo(
        address nftContract,
        uint256 tokenId,
        uint256 salePrice
    ) internal view returns (address recipient, uint256 royaltyAmount) {
        if (_supportsERC2981(nftContract)) {
            try ERC2981(nftContract).royaltyInfo(tokenId, salePrice) returns (
                address _recipient,
                uint256 _royaltyAmount
            ) {
                if (_royaltyAmount <= salePrice && _recipient != address(0)) {
                    return (_recipient, _royaltyAmount);
                }
            } catch {}
        }
        return (address(0), 0);
    }

    function _supportsERC2981(address nftContract) internal view returns (bool) {
        try IERC165(nftContract).supportsInterface(type(IERC2981).interfaceId) returns (bool supported) {
            return supported;
        } catch {
            return false;
        }
    }

    /**
     * @dev Compute payment splits, capping royalty so the sum of royalty +
     *      marketplace fee never exceeds the sale price.  This guards against
     *      malicious / erroneous ERC-2981 contracts that return royalty ≥ 100%.
     */
    function _computeSplits(
        uint256 totalPrice,
        uint256 royaltyAmount
    ) internal view returns (uint256 marketplaceFee, uint256 cappedRoyalty, uint256 sellerProceeds) {
        marketplaceFee = (totalPrice * marketplaceFeePercent) / FEE_DENOMINATOR;
        // Cap royalty so seller always receives ≥ 0
        uint256 maxRoyalty = totalPrice > marketplaceFee ? totalPrice - marketplaceFee : 0;
        cappedRoyalty = royaltyAmount > maxRoyalty ? maxRoyalty : royaltyAmount;
        sellerProceeds = totalPrice - cappedRoyalty - marketplaceFee;
    }

    // ─── Listings ────────────────────────────────────────────────────────────

    function listItem(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        address currency
    ) external override whenNotPaused nonReentrant validCurrency(currency) {
        _createListing(nftContract, tokenId, price, currency, 0, ListingType.FixedPrice);
    }

    function listItemWithExpiry(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        address currency,
        uint256 duration
    ) external override whenNotPaused nonReentrant validCurrency(currency) {
        require(duration > 0, "Duration zero");
        uint256 endTime = block.timestamp + duration;
        _createListing(nftContract, tokenId, price, currency, endTime, ListingType.FixedPrice);
    }

    function _createListing(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        address currency,
        uint256 endTime,
        ListingType listingType
    ) internal {
        require(price > 0, "Price zero");
        require(nftContract != address(0), "Invalid contract");

        address owner = IERC721(nftContract).ownerOf(tokenId);
        require(owner == msg.sender, "Not owner");
        require(
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)) ||
                IERC721(nftContract).getApproved(tokenId) == address(this),
            "Not approved"
        );

        bytes32 key = _getListingKey(nftContract, tokenId);
        require(!listings[key].active, "Already listed");
        require(auctions[key].seller == address(0), "In auction");

        IERC721(nftContract).safeTransferFrom(msg.sender, address(this), tokenId);

        listings[key] = Listing({
            nftContract: nftContract,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            startTime: block.timestamp,
            endTime: endTime,
            currency: currency,
            active: true,
            listingType: listingType
        });

        emit ItemListed(nftContract, tokenId, msg.sender, price, currency, endTime, listingType);
    }

    function updateListing(
        address nftContract,
        uint256 tokenId,
        uint256 newPrice
    ) external override whenNotPaused nonReentrant {
        bytes32 key = _getListingKey(nftContract, tokenId);
        Listing storage listing = listings[key];

        require(listing.active, "Not listed");
        require(listing.seller == msg.sender, "Not seller");
        require(newPrice > 0, "Price zero");

        listing.price = newPrice;
        emit ListingUpdated(nftContract, tokenId, newPrice);
    }

    function cancelListing(address nftContract, uint256 tokenId)
        external
        override
        whenNotPaused
        nonReentrant
    {
        bytes32 key = _getListingKey(nftContract, tokenId);
        Listing storage listing = listings[key];

        require(listing.active, "Not listed");
        require(listing.seller == msg.sender, "Not seller");

        listing.active = false;
        IERC721(nftContract).safeTransferFrom(address(this), msg.sender, tokenId);

        emit ListingCancelled(nftContract, tokenId);
    }

    function buyItem(address nftContract, uint256 tokenId)
        external
        payable
        override
        whenNotPaused
        nonReentrant
    {
        bytes32 key = _getListingKey(nftContract, tokenId);
        Listing storage listing = listings[key];

        require(listing.active, "Not listed");
        require(listing.seller != msg.sender, "Cannot buy own");
        require(
            listing.endTime == 0 || block.timestamp < listing.endTime,
            "Listing expired"
        );

        if (listing.currency == address(0)) {
            require(msg.value >= listing.price, "Insufficient payment");
        } else {
            require(msg.value == 0, "No ETH expected");
        }

        listing.active = false;
        _finalizeSale(listing, msg.sender, msg.value);

        emit ItemSold(nftContract, tokenId, listing.seller, msg.sender, listing.price, listing.currency);
    }

    function _finalizeSale(Listing storage listing, address buyer, uint256 msgValue) internal {
        uint256 totalPrice = listing.price;
        (address royaltyRecipient, uint256 royaltyAmount) = _getRoyaltyInfo(
            listing.nftContract,
            listing.tokenId,
            totalPrice
        );

        (uint256 marketplaceFee, uint256 cappedRoyalty, uint256 sellerProceeds) =
            _computeSplits(totalPrice, royaltyAmount);

        if (listing.currency == address(0)) {
            if (cappedRoyalty > 0 && royaltyRecipient != address(0)) {
                (bool royaltyOk, ) = payable(royaltyRecipient).call{value: cappedRoyalty}("");
                require(royaltyOk, "Royalty transfer failed");
            }

            accumulatedFees += marketplaceFee;

            (bool sellerOk, ) = payable(listing.seller).call{value: sellerProceeds}("");
            require(sellerOk, "Seller transfer failed");

            if (msgValue > totalPrice) {
                (bool refundOk, ) = payable(buyer).call{value: msgValue - totalPrice}("");
                require(refundOk, "Refund failed");
            }
        }

        IERC721(listing.nftContract).safeTransferFrom(address(this), buyer, listing.tokenId);
    }

    // ─── Auctions ────────────────────────────────────────────────────────────

    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 reservePrice,
        uint256 duration,
        address currency
    ) external override whenNotPaused nonReentrant validCurrency(currency) {
        require(startingPrice > 0, "Starting price zero");
        require(reservePrice >= startingPrice, "Reserve below start");
        require(
            duration >= MIN_AUCTION_DURATION && duration <= MAX_AUCTION_DURATION,
            "Invalid duration"
        );
        require(nftContract != address(0), "Invalid contract");

        address owner = IERC721(nftContract).ownerOf(tokenId);
        require(owner == msg.sender, "Not owner");
        require(
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)) ||
                IERC721(nftContract).getApproved(tokenId) == address(this),
            "Not approved"
        );

        bytes32 key = _getListingKey(nftContract, tokenId);
        require(!listings[key].active, "Already listed");

        IERC721(nftContract).safeTransferFrom(msg.sender, address(this), tokenId);

        auctions[key] = Auction({
            nftContract: nftContract,
            tokenId: tokenId,
            seller: msg.sender,
            startingPrice: startingPrice,
            reservePrice: reservePrice,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            highestBidder: address(0),
            highestBid: 0,
            currency: currency,
            status: AuctionStatus.Active
        });

        emit AuctionCreated(
            nftContract, tokenId, msg.sender,
            startingPrice, reservePrice,
            block.timestamp + duration, currency
        );
    }

    function placeBid(address nftContract, uint256 tokenId)
        external
        payable
        override
        whenNotPaused
        nonReentrant
    {
        bytes32 key = _getListingKey(nftContract, tokenId);
        Auction storage auction = auctions[key];

        require(auction.status == AuctionStatus.Active, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(auction.seller != msg.sender, "Cannot bid on own");
        require(msg.value >= auction.startingPrice, "Below starting price");
        require(auction.currency == address(0), "ETH auction only");

        if (auction.highestBid > 0) {
            require(msg.value > auction.highestBid, "Bid not higher");
        }

        // Capture previous bidder before state update
        address previousBidder = auction.highestBidder;
        uint256 previousBid    = auction.highestBid;

        // Update state BEFORE external call (CEI pattern)
        auction.highestBidder   = msg.sender;
        auction.highestBid      = msg.value;
        bids[key][msg.sender]   = msg.value;

        emit BidPlaced(nftContract, tokenId, msg.sender, msg.value);

        // Refund previous highest bidder. Use pull-payment if direct send fails
        // to prevent a malicious bidder contract from griefing the auction.
        if (previousBid > 0 && previousBidder != address(0)) {
            (bool refundOk, ) = payable(previousBidder).call{value: previousBid}("");
            if (!refundOk) {
                pendingRefunds[previousBidder] += previousBid;
            }
        }
    }

    function settleAuction(address nftContract, uint256 tokenId)
        external
        override
        whenNotPaused
        nonReentrant
    {
        bytes32 key = _getListingKey(nftContract, tokenId);
        Auction storage auction = auctions[key];

        require(auction.status == AuctionStatus.Active, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction not ended");
        require(auction.highestBidder != address(0), "No bids");
        require(auction.highestBid >= auction.reservePrice, "Reserve not met");

        auction.status = AuctionStatus.Sold;

        uint256 finalPrice = auction.highestBid;

        (address royaltyRecipient, uint256 royaltyAmount) = _getRoyaltyInfo(
            nftContract, tokenId, finalPrice
        );

        (uint256 marketplaceFee, uint256 cappedRoyalty, uint256 sellerProceeds) =
            _computeSplits(finalPrice, royaltyAmount);

        if (cappedRoyalty > 0 && royaltyRecipient != address(0)) {
            (bool royaltyOk, ) = payable(royaltyRecipient).call{value: cappedRoyalty}("");
            require(royaltyOk, "Royalty transfer failed");
        }

        accumulatedFees += marketplaceFee;

        (bool sellerOk, ) = payable(auction.seller).call{value: sellerProceeds}("");
        require(sellerOk, "Seller transfer failed");

        IERC721(nftContract).safeTransferFrom(address(this), auction.highestBidder, tokenId);

        emit AuctionSettled(
            nftContract, tokenId,
            auction.seller, auction.highestBidder,
            finalPrice, auction.currency
        );
    }

    function cancelAuction(address nftContract, uint256 tokenId)
        external
        override
        whenNotPaused
        nonReentrant
    {
        bytes32 key = _getListingKey(nftContract, tokenId);
        Auction storage auction = auctions[key];

        require(auction.status == AuctionStatus.Active, "Auction not active");
        require(auction.seller == msg.sender, "Not seller");

        if (auction.highestBid > 0) {
            // Seller may only cancel a bid-having auction once it has ended
            // AND the reserve was not met — prevents permanently locking
            // the bidder's ETH and the seller's NFT.
            bool auctionEnded  = block.timestamp >= auction.endTime;
            bool reserveNotMet = auction.highestBid < auction.reservePrice;
            require(auctionEnded && reserveNotMet, "Has bids");

            // Refund the highest bidder; fall back to pull-payment if needed
            (bool refundOk, ) = payable(auction.highestBidder).call{value: auction.highestBid}("");
            if (!refundOk) {
                pendingRefunds[auction.highestBidder] += auction.highestBid;
            }
        }

        auction.status = AuctionStatus.Cancelled;
        IERC721(nftContract).safeTransferFrom(address(this), msg.sender, tokenId);

        emit AuctionCancelled(nftContract, tokenId);
    }

    // ─── Offers ──────────────────────────────────────────────────────────────

    function makeOffer(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 expiryTime,
        address currency
    ) external payable override whenNotPaused nonReentrant validCurrency(currency) {
        require(price > 0, "Price zero");
        require(nftContract != address(0), "Invalid contract");
        require(
            expiryTime > block.timestamp + MIN_OFFER_DURATION &&
                expiryTime < block.timestamp + MAX_OFFER_DURATION,
            "Invalid expiry"
        );

        if (currency == address(0)) {
            require(msg.value == price, "Incorrect value");
        }

        bytes32 key = _getOfferKey(nftContract, tokenId, msg.sender);

        offers[key] = Offer({
            nftContract: nftContract,
            tokenId: tokenId,
            buyer: msg.sender,
            price: price,
            expiryTime: expiryTime,
            currency: currency,
            active: true
        });

        emit OfferMade(nftContract, tokenId, msg.sender, price, expiryTime, currency);
    }

    function makeCollectionOffer(
        address nftContract,
        uint256 price,
        uint256 expiryTime,
        address currency
    ) external payable override whenNotPaused nonReentrant validCurrency(currency) {
        require(price > 0, "Price zero");
        require(nftContract != address(0), "Invalid contract");
        require(
            expiryTime > block.timestamp + MIN_OFFER_DURATION &&
                expiryTime < block.timestamp + MAX_OFFER_DURATION,
            "Invalid expiry"
        );

        if (currency == address(0)) {
            require(msg.value == price, "Incorrect value");
        }

        bytes32 key = _getCollectionOfferKey(nftContract, msg.sender);

        // Capture any ETH owed from the old offer BEFORE overwriting state (CEI)
        uint256 oldRefund = 0;
        if (collectionOffers[key].active && collectionOffers[key].currency == address(0)) {
            oldRefund = collectionOffers[key].price;
        }

        // Update state BEFORE external call
        collectionOffers[key] = CollectionOffer({
            nftContract: nftContract,
            buyer: msg.sender,
            price: price,
            expiryTime: expiryTime,
            currency: currency,
            active: true
        });

        emit CollectionOfferMade(nftContract, msg.sender, price, expiryTime, currency);

        // Refund old ETH offer after state is settled
        if (oldRefund > 0) {
            (bool refundOk, ) = payable(msg.sender).call{value: oldRefund}("");
            require(refundOk, "Refund failed");
        }
    }

    function acceptOffer(
        address nftContract,
        uint256 tokenId,
        address buyer
    ) external override whenNotPaused nonReentrant {
        bytes32 key = _getOfferKey(nftContract, tokenId, buyer);
        Offer storage offer = offers[key];

        require(offer.active, "Offer not active");
        require(block.timestamp < offer.expiryTime, "Offer expired");
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not owner");
        require(
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)) ||
                IERC721(nftContract).getApproved(tokenId) == address(this),
            "Not approved"
        );

        offer.active = false;

        IERC721(nftContract).safeTransferFrom(msg.sender, buyer, tokenId);

        uint256 totalPrice = offer.price;
        (address royaltyRecipient, uint256 royaltyAmount) = _getRoyaltyInfo(
            nftContract, tokenId, totalPrice
        );

        (uint256 marketplaceFee, uint256 cappedRoyalty, uint256 sellerProceeds) =
            _computeSplits(totalPrice, royaltyAmount);

        if (offer.currency == address(0)) {
            if (cappedRoyalty > 0 && royaltyRecipient != address(0)) {
                (bool royaltyOk, ) = payable(royaltyRecipient).call{value: cappedRoyalty}("");
                require(royaltyOk, "Royalty transfer failed");
            }

            accumulatedFees += marketplaceFee;

            (bool sellerOk, ) = payable(msg.sender).call{value: sellerProceeds}("");
            require(sellerOk, "Seller transfer failed");
        }

        emit OfferAccepted(nftContract, tokenId, msg.sender, buyer, totalPrice, offer.currency);
    }

    function acceptCollectionOffer(
        address nftContract,
        uint256 tokenId,
        address buyer
    ) external whenNotPaused nonReentrant {
        bytes32 offerKey = _getCollectionOfferKey(nftContract, buyer);
        CollectionOffer storage offer = collectionOffers[offerKey];

        require(offer.active, "Offer not active");
        require(block.timestamp < offer.expiryTime, "Offer expired");
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not owner");
        require(
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)) ||
                IERC721(nftContract).getApproved(tokenId) == address(this),
            "Not approved"
        );

        offer.active = false;

        IERC721(nftContract).safeTransferFrom(msg.sender, buyer, tokenId);

        uint256 totalPrice = offer.price;
        (address royaltyRecipient, uint256 royaltyAmount) = _getRoyaltyInfo(
            nftContract, tokenId, totalPrice
        );

        (uint256 marketplaceFee, uint256 cappedRoyalty, uint256 sellerProceeds) =
            _computeSplits(totalPrice, royaltyAmount);

        if (offer.currency == address(0)) {
            if (cappedRoyalty > 0 && royaltyRecipient != address(0)) {
                (bool royaltyOk, ) = payable(royaltyRecipient).call{value: cappedRoyalty}("");
                require(royaltyOk, "Royalty transfer failed");
            }

            accumulatedFees += marketplaceFee;

            (bool sellerOk, ) = payable(msg.sender).call{value: sellerProceeds}("");
            require(sellerOk, "Seller transfer failed");
        }

        emit CollectionOfferAccepted(nftContract, buyer, msg.sender, tokenId, totalPrice, offer.currency);
    }

    function cancelOffer(address nftContract, uint256 tokenId)
        external
        override
        whenNotPaused
        nonReentrant
    {
        bytes32 key = _getOfferKey(nftContract, tokenId, msg.sender);
        Offer storage offer = offers[key];

        require(offer.active, "Offer not active");
        require(offer.buyer == msg.sender, "Not buyer");

        offer.active = false;

        if (offer.currency == address(0)) {
            (bool ok, ) = payable(msg.sender).call{value: offer.price}("");
            require(ok, "Refund failed");
        }

        emit OfferCancelled(nftContract, tokenId, msg.sender);
    }

    function cancelCollectionOffer(address nftContract) external whenNotPaused nonReentrant {
        bytes32 key = _getCollectionOfferKey(nftContract, msg.sender);
        CollectionOffer storage offer = collectionOffers[key];

        require(offer.active, "Offer not active");
        require(offer.buyer == msg.sender, "Not buyer");

        offer.active = false;

        if (offer.currency == address(0)) {
            (bool ok, ) = payable(msg.sender).call{value: offer.price}("");
            require(ok, "Refund failed");
        }

        emit CollectionOfferCancelled(nftContract, msg.sender);
    }

    // ─── Fee management ──────────────────────────────────────────────────────

    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");

        accumulatedFees = 0;

        (bool ok, ) = payable(feeRecipient).call{value: amount}("");
        require(ok, "Withdrawal failed");

        emit FeesWithdrawn(feeRecipient, amount);
    }

    /// @notice Withdraw a pending bid refund that couldn't be pushed automatically.
    ///         Bidders whose `receive()` reverted during outbid should call this.
    function withdrawBidRefund() external nonReentrant {
        uint256 amount = pendingRefunds[msg.sender];
        require(amount > 0, "No refund pending");
        pendingRefunds[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Refund failed");
    }

    // ─── View functions ──────────────────────────────────────────────────────

    function getListing(address nftContract, uint256 tokenId)
        external view override returns (Listing memory)
    {
        return listings[_getListingKey(nftContract, tokenId)];
    }

    function getAuction(address nftContract, uint256 tokenId)
        external view override returns (Auction memory)
    {
        return auctions[_getListingKey(nftContract, tokenId)];
    }

    function getOffer(address nftContract, uint256 tokenId, address buyer)
        external view override returns (Offer memory)
    {
        return offers[_getOfferKey(nftContract, tokenId, buyer)];
    }

    function getCollectionOffer(address nftContract, address buyer)
        external view override returns (CollectionOffer memory)
    {
        return collectionOffers[_getCollectionOfferKey(nftContract, buyer)];
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    function setMarketplaceFeePercent(uint256 newFeePercent) external override onlyOwner {
        require(newFeePercent <= MAX_MARKETPLACE_FEE, "Fee too high");
        uint256 oldFee = marketplaceFeePercent;
        marketplaceFeePercent = newFeePercent;
        emit MarketplaceFeeUpdated(oldFee, newFeePercent);
    }

    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        require(newFeeRecipient != address(0), "Invalid recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = newFeeRecipient;
        emit FeeRecipientUpdated(oldRecipient, newFeeRecipient);
    }

    function setSupportedCurrency(address currency, bool supported) external onlyOwner {
        supportedCurrencies[currency] = supported;
        emit CurrencySupported(currency, supported);
    }

    function setFactory(address newFactory) external onlyOwner {
        require(newFactory != address(0), "Invalid factory");
        address oldFactory = factory;
        factory = newFactory;
        emit FactoryUpdated(oldFactory, newFactory);
    }

    function pause() external override onlyOwner { _pause(); }

    function unpause() external override onlyOwner { _unpause(); }

    // ─── ERC721 receiver ─────────────────────────────────────────────────────

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    // ─── ERC165 ──────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public view
        returns (bool)
    {
        return
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    // ─── ETH receive ─────────────────────────────────────────────────────────

    receive() external payable {
        accumulatedFees += msg.value;
    }
}

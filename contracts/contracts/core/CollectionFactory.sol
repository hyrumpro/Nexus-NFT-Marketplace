// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/ICollectionFactory.sol";
import "./NFTCollection.sol";

/**
 * @title CollectionFactory
 * @dev Factory for deploying NFT collections
 */
contract CollectionFactory is ICollectionFactory, Ownable, Pausable, ReentrancyGuard {
    address public marketplace;

    mapping(address => bool) private _isCollection;
    mapping(address => bool) private _isVerified;
    mapping(address => address[]) private _creatorCollections;

    address[] private _allCollections;

    event MarketplaceUpdated(address indexed oldMarketplace, address indexed newMarketplace);

    constructor() Ownable(msg.sender) {}

    function createCollection(
        string calldata name,
        string calldata symbol,
        uint256 maxSupply,
        uint96 royaltyPercent,
        string calldata baseURI
    ) external override whenNotPaused nonReentrant returns (address) {
        return _createCollection(
            name,
            symbol,
            maxSupply,
            royaltyPercent,
            baseURI,
            msg.sender,
            0
        );
    }

    function createCollectionWithMintPrice(
        string calldata name,
        string calldata symbol,
        uint256 maxSupply,
        uint96 royaltyPercent,
        string calldata baseURI,
        uint256 mintPrice
    ) external override whenNotPaused nonReentrant returns (address) {
        return _createCollection(
            name,
            symbol,
            maxSupply,
            royaltyPercent,
            baseURI,
            msg.sender,
            mintPrice
        );
    }

    function _createCollection(
        string calldata name,
        string calldata symbol,
        uint256 maxSupply,
        uint96 royaltyPercent,
        string calldata baseURI,
        address creator_,
        uint256 mintPrice
    ) internal returns (address) {
        require(bytes(name).length > 0, "Name empty");
        require(bytes(symbol).length > 0, "Symbol empty");
        require(maxSupply > 0, "Max supply zero");
        require(royaltyPercent <= 1000, "Royalty too high");

        NFTCollection collection = new NFTCollection(
            name,
            symbol,
            maxSupply,
            creator_,
            royaltyPercent,
            baseURI,
            creator_,
            mintPrice
        );

        address collectionAddress = address(collection);

        _isCollection[collectionAddress] = true;
        _creatorCollections[creator_].push(collectionAddress);
        _allCollections.push(collectionAddress);

        emit CollectionCreated(
            creator_,
            collectionAddress,
            name,
            symbol,
            maxSupply,
            royaltyPercent
        );

        return collectionAddress;
    }

    function verifyCollection(address collection, bool verified)
        external
        override
        onlyOwner
    {
        require(_isCollection[collection], "Not a collection");
        _isVerified[collection] = verified;
        emit CollectionVerified(collection, verified);
    }

    function getCollectionsByCreator(address creator_)
        external
        view
        override
        returns (address[] memory)
    {
        return _creatorCollections[creator_];
    }

    function isCollection(address collection) external view override returns (bool) {
        return _isCollection[collection];
    }

    function isVerified(address collection) external view override returns (bool) {
        return _isVerified[collection];
    }

    function totalCollections() external view override returns (uint256) {
        return _allCollections.length;
    }

    function getCollectionAt(uint256 index) external view override returns (address) {
        require(index < _allCollections.length, "Index out of bounds");
        return _allCollections[index];
    }

    function setMarketplace(address newMarketplace) external onlyOwner {
        address oldMarketplace = marketplace;
        marketplace = newMarketplace;
        emit MarketplaceUpdated(oldMarketplace, newMarketplace);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}

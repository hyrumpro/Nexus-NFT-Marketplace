// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ICollectionFactory
 * @dev Interface for Collection Factory contract
 */
interface ICollectionFactory {
    event CollectionCreated(
        address indexed creator,
        address indexed collection,
        string name,
        string symbol,
        uint256 maxSupply,
        uint96 royaltyPercent
    );
    event CollectionVerified(address indexed collection, bool verified);
    event ImplementationUpdated(address newImplementation);

    function createCollection(
        string calldata name,
        string calldata symbol,
        uint256 maxSupply,
        uint96 royaltyPercent,
        string calldata baseURI
    ) external returns (address);

    function createCollectionWithMintPrice(
        string calldata name,
        string calldata symbol,
        uint256 maxSupply,
        uint96 royaltyPercent,
        string calldata baseURI,
        uint256 mintPrice
    ) external returns (address);

    function getCollectionsByCreator(address creator) external view returns (address[] memory);
    function verifyCollection(address collection, bool verified) external;
    function isCollection(address collection) external view returns (bool);
    function isVerified(address collection) external view returns (bool);

    function totalCollections() external view returns (uint256);
    function getCollectionAt(uint256 index) external view returns (address);
}

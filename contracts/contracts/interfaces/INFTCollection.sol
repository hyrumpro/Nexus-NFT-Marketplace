// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title INFTCollection
 * @dev Interface for NFT Collection contract - custom functions only
 */
interface INFTCollection {
    event NFTMinted(address indexed collection, address indexed minter, uint256 indexed tokenId, string uri);
    event RoyaltyUpdated(address indexed recipient, uint96 percentage);
    event MaxSupplyUpdated(uint256 newMaxSupply);
    event MintPriceUpdated(uint256 newPrice);
    event BaseURIUpdated(string newBaseURI);

    function mint(address to, uint256 tokenId, string calldata uri) external;
    function mintBatch(address to, uint256[] calldata tokenIds, string[] calldata uris) external;
    function lazyMint(bytes calldata signature, address creator, uint256 tokenId, string calldata uri) external;
    function setRoyalty(address recipient, uint96 percentage) external;
    function setMaxSupply(uint256 newMaxSupply) external;
    function setMintPrice(uint256 price) external;
    function setBaseURI(string calldata baseURI) external;

    function totalSupply() external view returns (uint256);
    function maxSupply() external view returns (uint256);
    function mintPrice() external view returns (uint256);
    function creator() external view returns (address);
    function factory() external view returns (address);
}

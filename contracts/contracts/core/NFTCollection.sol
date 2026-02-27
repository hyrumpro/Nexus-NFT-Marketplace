// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "../interfaces/INFTCollection.sol";

/**
 * @title NFTCollection
 * @dev ERC721 NFT Collection with royalties, lazy minting, and role-based access
 */
contract NFTCollection is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    ERC2981,
    AccessControl,
    Pausable,
    ReentrancyGuard,
    EIP712,
    INFTCollection
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    string private _baseTokenURI;

    uint256 private _totalSupply;
    uint256 public maxSupply;
    uint256 public mintPrice;

    address public factory;
    address public creator;

    mapping(uint256 => bool) private _mintedTokens;
    mapping(uint256 => uint256) public tokenNonce;

    bytes32 private constant LAZY_MINT_TYPEHASH = keccak256(
        "LazyMint(address to,uint256 tokenId,string uri,uint256 nonce)"
    );

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        address royaltyRecipient,
        uint96 royaltyPercent,
        string memory baseURI_,
        address creator_,
        uint256 mintPrice_
    ) ERC721(name_, symbol_) EIP712(name_, "1") {
        require(RoyaltyLib.validateRoyalty(royaltyPercent), "Royalty exceeds max");

        _grantRole(DEFAULT_ADMIN_ROLE, creator_);
        _grantRole(MINTER_ROLE, creator_);
        _grantRole(OPERATOR_ROLE, creator_);

        maxSupply = maxSupply_;
        _baseTokenURI = baseURI_;
        creator = creator_;
        factory = msg.sender;
        mintPrice = mintPrice_;

        _setDefaultRoyalty(royaltyRecipient, royaltyPercent);

        emit RoyaltyUpdated(royaltyRecipient, royaltyPercent);
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Only admin");
        _;
    }

    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, msg.sender), "Only minter");
        _;
    }

    function mint(address to, uint256 tokenId, string calldata uri)
        external
        override
        onlyMinter
        whenNotPaused
        nonReentrant
    {
        _processMint(to, tokenId, uri);
    }

    function mintBatch(
        address to,
        uint256[] calldata tokenIds,
        string[] calldata uris
    ) external onlyMinter whenNotPaused nonReentrant {
        require(tokenIds.length == uris.length, "Length mismatch");
        require(tokenIds.length <= 50, "Batch too large");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            _processMint(to, tokenIds[i], uris[i]);
        }
    }

    function mintWithPrice(address to, uint256 tokenId, string calldata uri)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        require(msg.value >= mintPrice, "Insufficient payment");
        require(!_mintedTokens[tokenId], "Already minted");

        _processMint(to, tokenId, uri);

        if (msg.value > mintPrice) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - mintPrice}("");
            require(refundSuccess, "Refund failed");
        }
    }

    function lazyMint(
        bytes calldata signature,
        address signer,
        uint256 tokenId,
        string calldata uri
    ) external whenNotPaused nonReentrant {
        require(hasRole(MINTER_ROLE, signer), "Invalid signer");
        require(!_mintedTokens[tokenId], "Already minted");

        bytes32 structHash = keccak256(
            abi.encode(
                LAZY_MINT_TYPEHASH,
                signer,
                tokenId,
                keccak256(bytes(uri)),
                tokenNonce[tokenId]
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(hash, signature);
        require(recovered == signer, "Invalid signature");

        tokenNonce[tokenId]++;
        _processMint(signer, tokenId, uri);
    }

    function _processMint(address to, uint256 tokenId, string calldata uri) internal {
        require(_totalSupply < maxSupply, "Max supply reached");
        require(!_mintedTokens[tokenId], "Token already minted");

        _mintedTokens[tokenId] = true;
        _totalSupply++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit NFTMinted(address(this), to, tokenId, uri);
    }

    function setRoyalty(address recipient, uint96 percentage)
        external
        override
        onlyAdmin
    {
        require(RoyaltyLib.validateRoyalty(percentage), "Royalty exceeds max");
        _setDefaultRoyalty(recipient, percentage);
        emit RoyaltyUpdated(recipient, percentage);
    }

    function setMaxSupply(uint256 newMaxSupply) external override onlyAdmin {
        require(newMaxSupply >= _totalSupply, "Below current supply");
        maxSupply = newMaxSupply;
        emit MaxSupplyUpdated(newMaxSupply);
    }

    function setMintPrice(uint256 price) external onlyAdmin {
        mintPrice = price;
        emit MintPriceUpdated(price);
    }

    function setBaseURI(string calldata baseURI_) external onlyAdmin {
        _baseTokenURI = baseURI_;
        emit BaseURIUpdated(baseURI_);
    }

    function pause() external onlyAdmin {
        _pause();
    }

    function unpause() external onlyAdmin {
        _unpause();
    }

    function grantMinterRole(address account) external onlyAdmin {
        grantRole(MINTER_ROLE, account);
    }

    function revokeMinterRole(address account) external onlyAdmin {
        revokeRole(MINTER_ROLE, account);
    }

    function withdraw() external onlyAdmin nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        (bool success, ) = payable(creator).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    function totalSupply() public view override(ERC721Enumerable, INFTCollection) returns (uint256) {
        return _totalSupply;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }
}

library RoyaltyLib {
    function validateRoyalty(uint96 percentage) internal pure returns (bool) {
        return percentage <= 1000;
    }
}

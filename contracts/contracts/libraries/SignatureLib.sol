// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SignatureLib
 * @dev Library for signature verification with EIP-712
 */
library SignatureLib {
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 private constant LAZY_MINT_TYPEHASH = keccak256(
        "LazyMint(address creator,uint256 tokenId,string uri,uint256 nonce,uint256 deadline)"
    );

    bytes32 private constant OFFER_TYPEHASH = keccak256(
        "Offer(address nftContract,uint256 tokenId,address buyer,uint256 price,uint256 nonce,uint256 deadline)"
    );

    struct EIP712Domain {
        string name;
        string version;
        uint256 chainId;
        address verifyingContract;
    }

    struct LazyMintData {
        address creator;
        uint256 tokenId;
        string uri;
        uint256 nonce;
        uint256 deadline;
    }

    struct OfferData {
        address nftContract;
        uint256 tokenId;
        address buyer;
        uint256 price;
        uint256 nonce;
        uint256 deadline;
    }

    function getDomainSeparator(
        string memory name,
        string memory version,
        address verifyingContract
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                block.chainid,
                verifyingContract
            )
        );
    }

    function hashLazyMint(LazyMintData calldata data) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                LAZY_MINT_TYPEHASH,
                data.creator,
                data.tokenId,
                keccak256(bytes(data.uri)),
                data.nonce,
                data.deadline
            )
        );
    }

    function hashOffer(OfferData calldata data) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                OFFER_TYPEHASH,
                data.nftContract,
                data.tokenId,
                data.buyer,
                data.price,
                data.nonce,
                data.deadline
            )
        );
    }

    function verifySignature(
        bytes32 domainSeparator,
        bytes32 structHash,
        address signer,
        bytes calldata signature
    ) internal pure returns (bool) {
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );

        bytes32 r;
        bytes32 s;
        uint8 v;

        if (signature.length == 65) {
            assembly {
                r := calldataload(signature.offset)
                s := calldataload(add(signature.offset, 32))
                v := byte(0, calldataload(add(signature.offset, 64)))
            }

            if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
                return false;
            }

            if (v != 27 && v != 28) {
                return false;
            }

            address recovered = ecrecover(digest, v, r, s);
            return recovered == signer;
        }

        return false;
    }

    function verifyLazyMint(
        bytes32 domainSeparator,
        LazyMintData calldata data,
        address signer,
        bytes calldata signature
    ) internal pure returns (bool) {
        return verifySignature(
            domainSeparator,
            hashLazyMint(data),
            signer,
            signature
        );
    }

    function verifyOffer(
        bytes32 domainSeparator,
        OfferData calldata data,
        address signer,
        bytes calldata signature
    ) internal pure returns (bool) {
        return verifySignature(
            domainSeparator,
            hashOffer(data),
            signer,
            signature
        );
    }
}

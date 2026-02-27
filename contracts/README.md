# NexusNFT Smart Contracts

Solidity contracts for the NexusNFT Marketplace, built with Hardhat 3 and deployed on Ethereum Sepolia.

## Contracts

| Contract | Description |
|---|---|
| `core/NexusMarketplace.sol` | Main marketplace — listings, auctions, offers, fees |
| `core/NFTCollection.sol` | ERC-721 collection with ERC-2981 royalties and role-based minting |
| `core/CollectionFactory.sol` | Factory for deploying new NFT collections |

## Setup

```bash
pnpm install
cp .env.example .env   # fill in PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY
```

## Commands

```bash
pnpm hardhat test                                          # run tests
pnpm hardhat run scripts/deploy.ts --network sepolia       # deploy
pnpm hardhat verify --network sepolia <address>            # verify on Etherscan
```

## Fee Structure

- Marketplace fee: **1.5%** (150 basis points, max 5%)
- Royalties: **ERC-2981** — paid to collection creator on every sale
- Custody model: NFTs are held by the marketplace contract while listed

## Key Error Messages

| Error | Cause |
|---|---|
| `Not owner` | Caller does not own the NFT |
| `Not approved` | Marketplace not approved via `setApprovalForAll` |
| `Not seller` | Only the original seller can cancel or update |
| `Cannot buy own` | Seller cannot buy their own listing |
| `Insufficient payment` | ETH sent does not match listing price |
| `Has bids` | Cannot cancel an auction that already has bids |
| `Reserve not met` | Auction highest bid is below reserve price |

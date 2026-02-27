# NexusNFT: Decentralized NFT Marketplace on Ethereum

[![Stars](https://img.shields.io/github/stars/hyrumpro/Nexus-NFT-Marketplace?style=social)](https://github.com/hyrumpro/Nexus-NFT-Marketplace/stargazers)
[![Fork](https://img.shields.io/github/forks/hyrumpro/Nexus-NFT-Marketplace?style=social)](https://github.com/hyrumpro/Nexus-NFT-Marketplace/network/members)
[![PRs](https://img.shields.io/badge/PRs-welcome-ff69b4.svg?style=shields)](https://github.com/hyrumpro/Nexus-NFT-Marketplace/pulls)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

<img src="https://img.shields.io/badge/-Next_JS-black?style=for-the-badge&logoColor=white&logo=nextdotjs&color=000000" alt="nextdotjs" />
<img src="https://img.shields.io/badge/-TypeScript-black?style=for-the-badge&logoColor=white&logo=typescript&color=3178C6" alt="typescript" />
<img src="https://img.shields.io/badge/-Tailwind_CSS-black?style=for-the-badge&logoColor=white&logo=tailwindcss&color=06B6D4" alt="tailwindcss" />
<img src="https://img.shields.io/badge/-Solidity-black?style=for-the-badge&logoColor=white&logo=solidity&color=363636" alt="solidity" />
<img src="https://img.shields.io/badge/-The_Graph-black?style=for-the-badge&logoColor=white&logo=thegraph&color=6747ED" alt="thegraph" />
<img src="https://img.shields.io/badge/-Hardhat-black?style=for-the-badge&logoColor=white&logo=hardhat&color=FFF100" alt="hardhat" />
<img src="https://img.shields.io/badge/-IPFS-black?style=for-the-badge&logoColor=white&logo=ipfs&color=65C2CB" alt="ipfs" />

---

## Overview

NexusNFT is a full-stack, decentralized NFT marketplace built on Ethereum Sepolia. It allows users to mint NFTs into custom collections, list them for sale at fixed prices, run on-chain auctions, make and accept offers, and track all activity through a real-time subgraph index — all without a centralized backend.

The marketplace uses a custody-based escrow model: NFTs are transferred to the marketplace contract on listing and returned to the seller on cancel or to the buyer on purchase.

---

## Demo

> Screenshot coming soon — deploy to a public URL and add it here.

---

## Features

- **Mint NFTs** — upload image + metadata (name, description, traits) to IPFS via Pinata, mint into any collection you own
- **Create Collections** — deploy ERC-721 collections on-chain with configurable royalties, max supply, and mint price
- **Fixed-price listings** — list, cancel, and update price; buy with automatic royalty and fee distribution
- **Auctions** — timed on-chain auctions with a reserve price, bid history, and automatic refunds on outbid
- **Offers** — make, cancel, and accept offers on any indexed NFT; offers auto-expire
- **User profile** — view owned NFTs, active listings, offers made, and offers received
- **Real-time indexing** — all contract events indexed by a Graph Protocol subgraph; no polling needed
- **Seller-safe UX** — sellers see a cancel button instead of buy/offer; contract enforces the same rule on-chain

---

## Architecture

```
nft-marketplace/
├── contracts/      Solidity — NexusMarketplace, NFTCollection, CollectionFactory
├── subgraph/       The Graph — AssemblyScript event handlers + GraphQL schema
└── frontend/       Next.js 14 App Router — wagmi, viem, TanStack Query, Tailwind
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.28, Hardhat, OpenZeppelin |
| Indexing | The Graph Protocol (AssemblyScript) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Web3 | wagmi v2, viem, RainbowKit |
| Storage | IPFS via Pinata |
| Data Fetching | TanStack Query, graphql-request |
| Network | Ethereum Sepolia |

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- A wallet private key (for contract deployment)
- Pinata API keys (for IPFS uploads)
- A Graph Studio account

### 1. Clone

```bash
git clone https://github.com/hyrumpro/Nexus-NFT-Marketplace.git
cd Nexus-NFT-Marketplace
```

### 2. Contracts

```bash
cd contracts
pnpm install
cp .env.example .env   # fill in PRIVATE_KEY and RPC_URL
pnpm hardhat run scripts/deploy.ts --network sepolia
```

### 3. Subgraph

```bash
cd subgraph
pnpm install
# Update subgraph.template.yaml with deployed contract addresses
graph codegen && graph build
graph deploy <your-subgraph-slug>
```

### 4. Frontend

```bash
cd frontend
pnpm install
cp .env.example .env.local   # fill in contract addresses, Graph URL, Pinata keys
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

### `frontend/.env.local`

```env
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_COLLECTION_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
GRAPH_API_URL=https://api.studio.thegraph.com/query/.../version/latest
PINATA_API_KEY=...
PINATA_API_SECRET=...
```

### `contracts/.env`

```env
PRIVATE_KEY=0x...
SEPOLIA_RPC_URL=https://...
ETHERSCAN_API_KEY=...
```

---

## Author

**Hyrum Perez**
- GitHub: [@hyrumpro](https://github.com/hyrumpro)
- Repository: [Nexus-NFT-Marketplace](https://github.com/hyrumpro/Nexus-NFT-Marketplace)

---

## License

MIT

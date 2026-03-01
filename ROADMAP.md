# NexusNFT — Roadmap

Items are grouped by area. Checked items are shipped; unchecked are planned or in progress.

---

## Marketplace & Listings

- [x] Fixed-price listings with optional expiry
- [x] Auction support (English auction, settle on-chain)
- [x] Offers on individual NFTs and whole collections
- [x] Bid refund withdrawal
- [x] Marketplace pause / unpause (admin)
- [ ] **External NFT support in "List Existing NFT"**
  - Use Alchemy NFT API (`getNFTsForOwner`) to surface any ERC-721 in the connected wallet, not just NFTs indexed by the subgraph.
  - The `NexusMarketplace` contract is already permissionless (no factory gate on `listItem`) so any standard ERC-721 can be listed today.
  - Implementation: new `/api/nfts` route (server-side, reuses existing Alchemy key from `SEPOLIA_RPC_URL`) + `useExternalNFTs` hook + split picker into "Your Collections" / "Other Wallet NFTs" sections.
  - Known edge case: external NFT images may come from unknown domains — use `unoptimized` on those `<Image>` elements.

---

## Create / Mint

- [x] Collection picker in Mint tab (shows owner's collections from subgraph)
- [x] Token ID auto-assigned from `totalSupply + 1` (no manual input)
- [x] Free minting via `mint()` for MINTER_ROLE holders (no ETH charge)
- [x] IPFS upload (image + metadata) via Pinata
- [ ] **NFT image upload preview**
  - Show the actual selected image (blob URL) inside the upload box before minting, instead of just the filename and file size.
  - Supports all browser-renderable formats: PNG, JPG, GIF, WebP, AVIF, SVG.

---

## Media & File Format Support

- [ ] **Full WebP support audit**
  - Verify Pinata preserves `image/webp` content-type on IPFS retrieval.
  - Confirm `next/image` with `unoptimized` renders WebP from Pinata gateway correctly on listing cards and the NFT detail page.
  - Test animated WebP in the image upload area and collection display.
  - Add `image/webp` to accepted MIME types hint where `accept="image/*"` is used (already included but worth explicit regression testing).

---

## Admin

- [x] Admin panel in navbar (owner-only, auto-detected via `owner()` read)
- [x] Accumulated fee display + one-click withdrawal
- [x] Marketplace pause / resume toggle
- [x] Fee percentage updater (basis points, 0–10%)
- [x] Fee recipient updater
- [ ] **Collection verification UI** — allow the admin to call `CollectionFactory.verifyCollection()` from the admin panel

---

## Profile & Discovery

- [x] User profile page (owned NFTs, created collections, stats)
- [x] Infinite-scroll explore page with filters and sorting
- [x] The Graph subgraph integration for all marketplace data
- [ ] **Collection detail page** — dedicated page per collection showing floor price, volume, all tokens, and verified badge
- [ ] **Trending / featured collections** on the home page (sourced from subgraph volume data)

---

## Infrastructure

- [x] Next.js 16 + Turbopack
- [x] React 19.2
- [x] wagmi v2 + viem v2
- [x] WalletConnect v2, MetaMask, Coinbase Wallet
- [ ] **Mainnet deployment** — add Ethereum mainnet and/or L2 (Base, Arbitrum) chain support alongside Sepolia

'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useNFTDetail, useOffers } from '@/hooks/useListings'
import { useNFTContract } from '@/hooks/useNFTContract'
import { useAccount } from 'wagmi'
import Image from 'next/image'
import { formatEther, Address } from 'viem'
import { Clock, Share2, Loader2, ExternalLink, X, Tag } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import {
  useBuyNFT, useMakeOffer, useAcceptOffer, useCancelOffer, useCancelListing,
  usePlaceBid, useSettleAuction, useCancelAuction, useUpdateListing,
  useListNFT,
} from '@/hooks/useTransactions'
import { ipfsToHttp, fetchNFTMetadata, NFTMetadata } from '@/lib/utils'
import { MARKETPLACE_FEE_PERCENT } from '@/config/contracts'

// ─── List for Sale Modal ────────────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { label: 'Forever', value: 0 },
  { label: '3 days',  value: 3 },
  { label: '7 days',  value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
]

function ListModal({
  nftContract,
  listHook,
  onList,
  onClose,
}: {
  nftContract: Address
  listHook: ReturnType<typeof useListNFT>
  onList: (price: string, durationDays: number) => void
  onClose: () => void
}) {
  const [price, setPrice] = useState('')
  const [durationDays, setDurationDays] = useState(0)

  const feeMultiplier = (100 - MARKETPLACE_FEE_PERCENT) / 100
  const sellerReceives =
    price && !isNaN(parseFloat(price))
      ? (parseFloat(price) * feeMultiplier).toFixed(4).replace(/\.?0+$/, '')
      : null

  const isBusy = listHook.isPending || listHook.isConfirming
  const isApprovalStep = ['awaiting_approval', 'approving'].includes(listHook.state.status)
  const isProcessing = ['executing', 'confirming', 'preparing'].includes(listHook.state.status)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50"
        onClick={!isBusy ? onClose : undefined}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4">
        <div className="card p-6 space-y-5 shadow-xl">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">List for Sale</h2>
            {!isBusy && (
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Approval banner */}
          {isApprovalStep && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div>
                <p className="font-medium text-sm">Marketplace approval required</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Approve the marketplace to manage your NFTs once per collection. You won't need to do this again.
                </p>
              </div>
              <button
                onClick={() => listHook.approve(nftContract)}
                disabled={listHook.isPending}
                className="btn-primary text-sm w-full"
              >
                {listHook.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Approving…</>
                  : 'Approve Marketplace'
                }
              </button>
            </div>
          )}

          {/* Price + duration inputs (shown when not deep in a tx) */}
          {!isApprovalStep && !isProcessing && (
            <>
              <div>
                <label className="text-sm font-medium block mb-1.5">Price</label>
                <div className="relative">
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    step="0.001"
                    min="0"
                    className="input w-full pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    ETH
                  </span>
                </div>
                {sellerReceives && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    You receive ~{sellerReceives} ETH after {MARKETPLACE_FEE_PERCENT}% marketplace fee
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDurationDays(opt.value)}
                      className={`py-2 px-3 rounded-lg text-sm border transition-colors ${
                        durationDays === opt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Progress message */}
          {listHook.state.message && !['idle', 'awaiting_approval'].includes(listHook.state.status) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
              {isBusy && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
              <span>{listHook.state.message}</span>
            </div>
          )}

          {/* Error */}
          {listHook.state.status === 'error' && (
            <p className="text-sm text-destructive">{listHook.state.message}</p>
          )}

          {/* Action buttons */}
          {!isApprovalStep && (
            <div className="flex gap-3">
              <button
                onClick={() => onList(price, durationDays)}
                disabled={!price || isBusy}
                className="btn-primary flex-1"
              >
                {isBusy
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{listHook.state.message || 'Processing…'}</>
                  : 'List for Sale'
                }
              </button>
              {!isBusy && (
                <button onClick={onClose} className="btn-outline">
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function NFTDetailPage() {
  const params = useParams()
  const nftContract = params.nftContract as Address
  const tokenId = BigInt(params.tokenId as string)
  const { address } = useAccount()

  const { data: nftData, isLoading: nftLoading } = useNFTDetail(nftContract, tokenId)
  const { data: offers } = useOffers(nftContract, tokenId)
  const { owner, tokenURI, isLoading: contractLoading } = useNFTContract(nftContract, tokenId)

  const [metadata, setMetadata] = useState<NFTMetadata | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'properties' | 'offers' | 'history'>('details')
  const [imageError, setImageError] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [bidAmount, setBidAmount] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [showUpdatePrice, setShowUpdatePrice] = useState(false)
  const [showListModal, setShowListModal] = useState(false)

  // Transaction hooks
  const buyHook          = useBuyNFT()
  const makeOfferHook    = useMakeOffer()
  const acceptOfferHook  = useAcceptOffer()
  const cancelOfferHook  = useCancelOffer()
  const cancelHook       = useCancelListing()
  const bidHook          = usePlaceBid()
  const settleHook       = useSettleAuction()
  const cancelAuctionHook = useCancelAuction()
  const updateListingHook = useUpdateListing()
  const listHook         = useListNFT()

  // Refs to carry data across async approval steps
  const pendingAcceptRef = useRef<Address | null>(null)
  const pendingListRef   = useRef<{ price: string; durationDays: number } | null>(null)

  // Accept-offer approval flow
  useEffect(() => {
    if (acceptOfferHook.state.status === 'approved' && pendingAcceptRef.current) {
      const buyer = pendingAcceptRef.current
      pendingAcceptRef.current = null
      acceptOfferHook.continueAfterApproval(nftContract, tokenId, buyer)
    }
  }, [acceptOfferHook.state.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // List-NFT approval flow: continue after approval tx confirms
  useEffect(() => {
    if (listHook.state.status === 'approved' && pendingListRef.current) {
      const { price, durationDays } = pendingListRef.current
      pendingListRef.current = null
      const duration = durationDays > 0 ? BigInt(durationDays * 24 * 60 * 60) : undefined
      listHook.continueAfterApproval(nftContract, tokenId, price, duration)
    }
  }, [listHook.state.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-close modal + reset on listing success
  useEffect(() => {
    if (listHook.state.status === 'success') {
      setShowListModal(false)
      listHook.resetState()
    }
  }, [listHook.state.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tokenURI) {
      fetchNFTMetadata(tokenURI).then(setMetadata).catch(() => {})
    }
  }, [tokenURI])

  const isLoading  = nftLoading || contractLoading
  const isOwner    = !!(address && owner && address.toLowerCase() === owner.toLowerCase())

  // Find the connected user's own active offer on this NFT (if any)
  const myActiveOffer = address
    ? offers?.find(o => o.buyer.toLowerCase() === address.toLowerCase())
    : undefined

  const currentListing  = nftData?.currentListing
  const currentAuction  = nftData?.currentAuction
  const isAuction       = !!currentAuction
  const isActiveListing = !!currentListing?.price && !isAuction
  const displayPrice    = isActiveListing ? formatEther(BigInt(currentListing!.price)) : null
  const displayImage    = ipfsToHttp(metadata?.image || tokenURI)

  // When listed, marketplace holds custody so on-chain owner ≠ seller wallet.
  // isSeller covers the case where the connected user is the active listing's seller.
  const isSeller = !!(address && currentListing?.seller && address.toLowerCase() === (currentListing.seller as string).toLowerCase())

  const auctionEnded        = currentAuction ? Number(currentAuction.endTime) < Math.floor(Date.now() / 1000) : false
  const auctionHighestBid   = currentAuction?.highestBid ? BigInt(currentAuction.highestBid) : 0n
  const auctionReservePrice = currentAuction?.reservePrice ? BigInt(currentAuction.reservePrice) : 0n
  const auctionHasNoBids    = auctionHighestBid === 0n
  const auctionReserveNotMet = auctionHighestBid < auctionReservePrice

  const canSettle = auctionEnded && !auctionHasNoBids && !auctionReserveNotMet
  const canCancelAuction = isOwner && (auctionHasNoBids || (auctionEnded && auctionReserveNotMet))

  const highestBidDisplay =
    currentAuction?.highestBid && BigInt(currentAuction.highestBid) > 0n
      ? formatEther(BigInt(currentAuction.highestBid))
      : currentAuction?.startingPrice
        ? formatEther(BigInt(currentAuction.startingPrice))
        : '0'

  const feeMultiplier = (100 - MARKETPLACE_FEE_PERCENT) / 100
  const sellerReceives = (priceEth: string): string => {
    const net = parseFloat(priceEth) * feeMultiplier
    return isNaN(net) ? '0' : net.toFixed(4).replace(/\.?0+$/, '')
  }

  const formatTimeLeft = (seconds: number) => {
    if (seconds <= 0) return 'Ended'
    const days  = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins  = Math.floor((seconds % 3600) / 60)
    if (days > 0)  return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleBuy = () => {
    if (!displayPrice) return
    buyHook.buy(nftContract, tokenId, displayPrice)
  }

  const handleMakeOffer = () => {
    if (!offerAmount) return
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60)
    makeOfferHook.makeOffer(nftContract, tokenId, offerAmount, expiry)
  }

  const handleAcceptOffer = async (buyer: Address) => {
    pendingAcceptRef.current = buyer
    const result = await acceptOfferHook.acceptOffer(nftContract, tokenId, buyer)
    if (!result?.needsApproval) {
      pendingAcceptRef.current = null
    } else {
      await acceptOfferHook.approve(nftContract)
    }
  }

  const handleList = async (price: string, durationDays: number) => {
    pendingListRef.current = { price, durationDays }
    const duration = durationDays > 0 ? BigInt(durationDays * 24 * 60 * 60) : undefined
    const result = await listHook.list(nftContract, tokenId, price, duration)
    if (!result?.needsApproval) {
      pendingListRef.current = null
    }
  }

  const closeListModal = () => {
    if (listHook.isPending || listHook.isConfirming) return
    setShowListModal(false)
    listHook.resetState()
    pendingListRef.current = null
  }

  // ─── Loading / Not found ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square skeleton rounded-lg" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 skeleton" />
            <div className="h-4 w-1/2 skeleton" />
            <div className="h-20 skeleton" />
            <div className="h-12 w-32 skeleton" />
          </div>
        </div>
      </div>
    )
  }

  if (!nftData) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-xl text-muted-foreground">NFT not found</p>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">

          {/* ── Left: Image ── */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
              {!imageError && displayImage ? (
                <Image
                  src={displayImage}
                  alt={metadata?.name || `NFT #${tokenId}`}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                  <span className="text-6xl">🖼️</span>
                </div>
              )}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href)}
              className="btn-outline w-full gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>

          {/* ── Right: Info + Actions ── */}
          <div className="space-y-6">

            {/* Title block */}
            <div>
              <p className="text-sm text-muted-foreground">
                {nftData.collection?.name || 'Unknown Collection'}
              </p>
              <h1 className="text-3xl font-bold mt-1">
                {metadata?.name || `#${tokenId.toString()}`}
              </h1>
              {metadata?.description && (
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{metadata.description}</p>
              )}
            </div>

            {/* Owner row */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Owner</p>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm font-medium">
                    {owner?.slice(0, 6)}…{owner?.slice(-4)}
                  </span>
                  {owner && (
                    <a
                      href={`https://sepolia.etherscan.io/address/${owner}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="View on Sepolia Etherscan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* ── Action Card ── */}
            <div className="card p-5 space-y-4">

              {/* Auction */}
              {isAuction && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    {auctionEnded ? 'Final Bid' : 'Current Bid'}
                  </p>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-primary">{highestBidDisplay}</span>
                    <span className="text-muted-foreground">ETH</span>
                  </div>
                  {!auctionEnded && currentAuction?.endTime && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Ends in {formatTimeLeft(Number(currentAuction.endTime) - Math.floor(Date.now() / 1000))}
                    </p>
                  )}
                  {auctionEnded && <p className="text-xs text-amber-500 font-medium">Auction ended</p>}

                  {/* Bid input — non-owner, active auction */}
                  {!isOwner && !auctionEnded && (
                    <div className="mt-3 space-y-2">
                      <label className="text-sm text-muted-foreground">
                        Your bid (ETH) — minimum {highestBidDisplay}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder={highestBidDisplay}
                          step="0.001"
                          min="0"
                          className="input flex-1"
                        />
                        <button
                          onClick={() => bidHook.placeBid(nftContract, tokenId, bidAmount)}
                          disabled={!bidAmount || bidHook.isPending || bidHook.isConfirming}
                          className="btn-primary"
                        >
                          {bidHook.isPending || bidHook.isConfirming
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : 'Place Bid'
                          }
                        </button>
                      </div>
                    </div>
                  )}

                  {canSettle && (
                    <button
                      onClick={() => settleHook.settle(nftContract, tokenId)}
                      disabled={settleHook.isPending || settleHook.isConfirming}
                      className="btn-primary w-full mt-3"
                    >
                      {settleHook.isPending || settleHook.isConfirming
                        ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Settling…</>
                        : 'Settle Auction'
                      }
                    </button>
                  )}

                  {auctionEnded && auctionReserveNotMet && !auctionHasNoBids && (
                    <p className="text-xs text-amber-500 mt-2">Reserve price not met — cannot be settled</p>
                  )}

                  {canCancelAuction && (
                    <button
                      onClick={() => cancelAuctionHook.cancelAuction(nftContract, tokenId)}
                      disabled={cancelAuctionHook.isPending || cancelAuctionHook.isConfirming}
                      className="btn-outline w-full mt-2 text-destructive hover:text-destructive"
                    >
                      {cancelAuctionHook.isPending || cancelAuctionHook.isConfirming
                        ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Cancelling…</>
                        : 'Cancel Auction'
                      }
                    </button>
                  )}
                </div>
              )}

              {/* Fixed-price listing */}
              {isActiveListing && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Price</p>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-bold text-primary">{displayPrice}</span>
                    <span className="text-muted-foreground">ETH</span>
                  </div>

                  {/* Buyer actions */}
                  {!isOwner && !isSeller && (
                    <>
                      <button
                        onClick={handleBuy}
                        disabled={buyHook.isPending || buyHook.isConfirming}
                        className="btn-primary w-full"
                      >
                        {buyHook.isPending || buyHook.isConfirming
                          ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{buyHook.state.message || 'Processing…'}</>
                          : `Buy for ${displayPrice} ETH`
                        }
                      </button>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        {MARKETPLACE_FEE_PERCENT}% marketplace fee — seller receives ~{sellerReceives(displayPrice!)} ETH
                      </p>
                    </>
                  )}

                  {/* Owner/seller actions */}
                  {(isOwner || isSeller) && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        You have this NFT listed for <span className="font-semibold text-foreground">{displayPrice} ETH</span>. Cancel to return it to your wallet.
                      </p>
                      <button
                        onClick={() => cancelHook.cancel(nftContract, tokenId)}
                        disabled={cancelHook.isPending || cancelHook.isConfirming}
                        className="btn-destructive w-full"
                      >
                        {cancelHook.isPending || cancelHook.isConfirming
                          ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Cancelling…</>
                          : 'Cancel Listing'
                        }
                      </button>

                      {!showUpdatePrice ? (
                        <button
                          onClick={() => setShowUpdatePrice(true)}
                          className="btn-outline w-full text-sm"
                        >
                          Update Price
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            placeholder="New price in ETH"
                            step="0.001"
                            min="0"
                            className="input flex-1"
                          />
                          <button
                            onClick={() => {
                              if (!newPrice) return
                              updateListingHook.updatePrice(nftContract, tokenId, newPrice)
                              setShowUpdatePrice(false)
                              setNewPrice('')
                            }}
                            disabled={!newPrice || updateListingHook.isPending || updateListingHook.isConfirming}
                            className="btn-primary"
                          >
                            {updateListingHook.isPending || updateListingHook.isConfirming
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : 'Save'
                            }
                          </button>
                          <button
                            onClick={() => { setShowUpdatePrice(false); setNewPrice('') }}
                            className="btn-outline"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Not listed */}
              {!isActiveListing && !isAuction && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="w-4 h-4" />
                    <span className="text-sm">Not listed for sale</span>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => setShowListModal(true)}
                      className="btn-primary w-full"
                    >
                      List for Sale
                    </button>
                  )}
                </div>
              )}

              {/* Make / manage offer — non-owner, non-seller only */}
              {!isOwner && !isSeller && (
                <div className="pt-4 border-t space-y-2">
                  {myActiveOffer ? (
                    <>
                      <p className="text-sm text-muted-foreground">Your active offer</p>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-semibold">{formatEther(BigInt(myActiveOffer.price))} ETH</p>
                          {myActiveOffer.expiryTime > 0n && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              Expires {new Date(Number(myActiveOffer.expiryTime) * 1000).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => cancelOfferHook.cancelOffer(nftContract, tokenId)}
                          disabled={cancelOfferHook.isPending || cancelOfferHook.isConfirming}
                          className="btn-outline text-sm text-destructive hover:text-destructive"
                        >
                          {cancelOfferHook.isPending || cancelOfferHook.isConfirming
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : 'Cancel Offer'
                          }
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="text-sm text-muted-foreground">Make an Offer (7-day expiry)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                          placeholder="Amount in ETH"
                          step="0.001"
                          min="0"
                          className="input flex-1"
                        />
                        <button
                          onClick={handleMakeOffer}
                          disabled={!offerAmount || makeOfferHook.isPending || makeOfferHook.isConfirming}
                          className="btn-outline"
                        >
                          {makeOfferHook.isPending || makeOfferHook.isConfirming
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : 'Offer'
                          }
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Tabs ── */}
            <div className="border-b">
              <div className="flex">
                {(['details', 'properties', 'offers', 'history'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'offers' && (() => {
                      const now = Math.floor(Date.now() / 1000)
                      const count = (offers ?? []).filter(o => Number(o.expiryTime) > now).length
                      return count > 0 ? (
                        <span className="ml-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                          {count}
                        </span>
                      ) : null
                    })()}
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-4">

              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {metadata?.description ||
                        `NFT #${tokenId.toString()} from ${nftData.collection?.name || 'Unknown Collection'}`}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Details</h3>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Contract</span>
                        <a
                          href={`https://sepolia.etherscan.io/address/${nftContract}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          {nftContract.slice(0, 6)}…{nftContract.slice(-4)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token ID</span>
                        <span className="font-mono">{tokenId.toString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token Standard</span>
                        <span>ERC-721</span>
                      </div>
                      {nftData.creator && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Creator</span>
                          <a
                            href={`https://sepolia.etherscan.io/address/${nftData.creator}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            {nftData.creator.slice(0, 6)}…{nftData.creator.slice(-4)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {nftData.lastSalePrice && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Sale</span>
                          <span className="font-medium">{formatEther(BigInt(nftData.lastSalePrice))} ETH</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'properties' && (
                <div>
                  {metadata?.attributes && metadata.attributes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {metadata.attributes.map((attr, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            {attr.trait_type}
                          </p>
                          <p className="font-medium mt-0.5">{String(attr.value)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No properties found</p>
                  )}
                </div>
              )}

              {activeTab === 'offers' && (
                <div className="space-y-3">
                  {/* Approval prompt for accept-offer flow */}
                  {acceptOfferHook.state.status === 'awaiting_approval' && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm space-y-2">
                      <p>Marketplace approval required to accept offers.</p>
                      <button
                        onClick={() => acceptOfferHook.approve(nftContract)}
                        disabled={acceptOfferHook.isPending}
                        className="btn-primary text-sm"
                      >
                        {acceptOfferHook.isPending
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : 'Approve Marketplace'
                        }
                      </button>
                    </div>
                  )}

                  {(() => {
                    const now = Math.floor(Date.now() / 1000)
                    // Only show offers that are active in the subgraph AND not yet expired on-chain.
                    // The subgraph already marks competing offers active=false when the NFT is sold
                    // (handleItemSold / handleOfferAccepted), so those never reach here.
                    // Expired offers can't be accepted by the contract either, so we hide them too.
                    const visibleOffers = (offers ?? []).filter(
                      o => Number(o.expiryTime) > now
                    )

                    if (visibleOffers.length === 0) {
                      return (
                        <p className="text-center text-muted-foreground py-4">No active offers</p>
                      )
                    }

                    return visibleOffers.map((offer) => {
                      const isOfferOwner = address?.toLowerCase() === offer.buyer?.toLowerCase()
                      const buyerAddr    = offer.buyer as string | undefined
                      const shortBuyer   = buyerAddr
                        ? `${buyerAddr.slice(0, 6)}…${buyerAddr.slice(-4)}`
                        : 'Unknown'
                      const expiryDate   = new Date(Number(offer.expiryTime) * 1000).toLocaleDateString()
                      const amountEth    = formatEther(BigInt(offer.price))

                      return (
                        <div
                          key={offer.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 gap-3"
                        >
                          {/* Left: amount + buyer info */}
                          <div className="min-w-0 space-y-0.5">
                            {/* Amount */}
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-lg font-bold">{amountEth}</span>
                              <span className="text-sm text-muted-foreground font-medium">ETH</span>
                            </div>

                            {/* Buyer address */}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>from</span>
                              <a
                                href={`https://sepolia.etherscan.io/address/${buyerAddr}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={buyerAddr}
                                className="font-mono hover:text-primary transition-colors flex items-center gap-0.5"
                              >
                                {shortBuyer}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <span>·</span>
                              <Link
                                href={`/profile/${buyerAddr}`}
                                className="hover:text-primary transition-colors"
                              >
                                Profile
                              </Link>
                            </div>

                            {/* Expiry */}
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Expires {expiryDate}
                            </p>

                            {/* Seller net proceeds */}
                            {isOwner && (
                              <p className="text-xs text-muted-foreground">
                                You receive ~{sellerReceives(amountEth)} ETH after fees
                              </p>
                            )}
                          </div>

                          {/* Right: actions */}
                          <div className="flex gap-2 flex-shrink-0">
                            {isOwner && (
                              <button
                                onClick={() => handleAcceptOffer(offer.buyer)}
                                disabled={acceptOfferHook.isPending || acceptOfferHook.isConfirming}
                                className="btn-primary text-sm"
                              >
                                {acceptOfferHook.isPending || acceptOfferHook.isConfirming
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : 'Accept'
                                }
                              </button>
                            )}
                            {isOfferOwner && (
                              <button
                                onClick={() => cancelOfferHook.cancelOffer(nftContract, tokenId)}
                                disabled={cancelOfferHook.isPending || cancelOfferHook.isConfirming}
                                className="btn-outline text-sm text-destructive hover:text-destructive"
                              >
                                {cancelOfferHook.isPending || cancelOfferHook.isConfirming
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : 'Cancel'
                                }
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )}

              {activeTab === 'history' && (
                <p className="text-center text-muted-foreground py-4">
                  No transaction history available
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── List for Sale Modal ── */}
      {showListModal && (
        <ListModal
          nftContract={nftContract}
          listHook={listHook}
          onList={handleList}
          onClose={closeListModal}
        />
      )}
    </div>
  )
}

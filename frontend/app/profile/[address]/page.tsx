'use client'

import { use, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { Address, formatEther } from 'viem'
import Image from 'next/image'
import Link from 'next/link'
import { useListings, useUserNFTs, useNFTsCreatedBy, useUserProfile, useUserCollections, useOffersReceived } from '@/hooks/useListings'
import { useCancelOffer, useCancelListing } from '@/hooks/useTransactions'
import { ipfsToHttp, fetchNFTMetadata, NFTMetadata, shortenAddress } from '@/lib/utils'
import { ExternalLink, Loader2, AlertTriangle, Layers, Clock, RotateCcw } from 'lucide-react'
import { graphClient } from '@/lib/graphql/client'

export default function ProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const resolvedParams = use(params)
  const profileAddress = resolvedParams.address as Address
  const { address: connectedAddress } = useAccount()
  const [activeTab, setActiveTab] = useState('portfolio')

  const isOwnProfile = connectedAddress?.toLowerCase() === profileAddress.toLowerCase()
  const isGraphConfigured = graphClient.isReady()

  const { data: userListings, isLoading: listingsLoading } = useListings({
    seller: profileAddress,
    first: 20,
  })

  const { data: ownedNFTs, isLoading: nftsLoading, isError: nftsError } = useUserNFTs(profileAddress, 20)
  const { data: createdNFTs, isLoading: createdLoading } = useNFTsCreatedBy(profileAddress, 20)
  const { data: userProfile, isLoading: profileLoading } = useUserProfile(profileAddress)
  const { data: userCollections, isLoading: collectionsLoading } = useUserCollections(profileAddress, 20)
  const { data: offersReceived, isLoading: offersReceivedLoading } = useOffersReceived(
    isOwnProfile ? profileAddress : undefined
  )
  const cancelOfferHook = useCancelOffer()
  const cancelListingHook = useCancelListing()

  // Merge owned and created NFTs, deduplicating by id
  const portfolioLoading = nftsLoading || createdLoading
  const portfolioNFTs = (() => {
    if (!ownedNFTs && !createdNFTs) return undefined
    const map = new Map<string, any>()
    for (const nft of ownedNFTs || []) map.set(nft.id, nft)
    for (const nft of createdNFTs || []) { if (!map.has(nft.id)) map.set(nft.id, nft) }
    return Array.from(map.values())
  })()

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-start gap-6">
            <div className="relative w-24 h-24 shrink-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-bold text-primary-foreground">
                {profileAddress.slice(2, 4).toUpperCase()}
              </div>
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent opacity-30 blur-md" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {isOwnProfile ? 'Your Profile' : 'User Profile'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="font-mono text-muted-foreground">
                  {shortenAddress(profileAddress, 6)}
                </p>
                <a
                  href={`https://sepolia.etherscan.io/address/${profileAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              
              {userProfile && (
                <div className="flex gap-6 mt-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Earned</p>
                    <p className="font-semibold">{formatEther(BigInt(userProfile.totalEarned || 0))} ETH</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Spent</p>
                    <p className="font-semibold">{formatEther(BigInt(userProfile.totalSpent || 0))} ETH</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">NFTs Owned</p>
                    <p className="font-semibold">{userProfile.nftsOwned?.length || 0}</p>
                  </div>
                </div>
              )}
              
              {isOwnProfile && (
                <div className="flex gap-3 mt-4">
                  <Link href="/create" className="btn-primary inline-flex">
                    Create NFT
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {!isGraphConfigured && (
          <div className="card p-8 text-center mb-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h3 className="font-semibold text-lg mb-2">Graph API Not Configured</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Set NEXT_PUBLIC_GRAPH_API_URL in your environment to view profile data.
            </p>
          </div>
        )}

        <div className="border-b mb-8">
          <div className="flex gap-8">
            {[
              { id: 'portfolio', label: 'Portfolio', count: portfolioNFTs?.length },
              { id: 'collections', label: 'Collections', count: userCollections?.length },
              { id: 'listings', label: 'Listings', count: userListings?.length },
              { id: 'offers_made', label: 'Offers Made', count: userProfile?.offers?.length || 0 },
              ...(isOwnProfile ? [{ id: 'offers_received', label: 'Offers Received', count: offersReceived?.length || 0 }] : []),
              ...(isOwnProfile && (userProfile?.autoRejectedOffers?.length || 0) > 0
                ? [{ id: 'offer_balance', label: 'Offer Balance', count: userProfile?.autoRejectedOffers?.length || 0 }]
                : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'portfolio' && isGraphConfigured && (
          <NFTGrid nfts={portfolioNFTs} isLoading={portfolioLoading} isError={nftsError} emptyMessage="No NFTs in portfolio" isOwnProfile={isOwnProfile} />
        )}

        {activeTab === 'collections' && isGraphConfigured && (
          <div>
            {collectionsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="card p-6 space-y-3">
                    <div className="h-5 w-2/3 skeleton" />
                    <div className="h-4 w-1/3 skeleton" />
                    <div className="h-4 w-full skeleton" />
                  </div>
                ))}
              </div>
            ) : userCollections && userCollections.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {userCollections.map((col: any) => (
                  <CollectionCard key={col.id} collection={col} isOwnProfile={isOwnProfile} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl text-muted-foreground">No collections created</p>
                {isOwnProfile && (
                  <Link href="/create" className="btn-primary mt-4 inline-flex">
                    Create a Collection
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'listings' && isGraphConfigured && (
          <div>
            {listingsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="card p-4 h-24 skeleton" />
                ))}
              </div>
            ) : userListings && userListings.length > 0 ? (
              <div className="space-y-3">
                {userListings.map((listing) => (
                  <ProfileListingRow
                    key={listing.id}
                    listing={listing}
                    isOwnProfile={isOwnProfile}
                    onCancel={() =>
                      cancelListingHook.cancel(listing.nftContract, listing.tokenId)
                    }
                    isCancelling={
                      (cancelListingHook.isPending || cancelListingHook.isConfirming) &&
                      cancelListingHook.state.status !== 'idle'
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="No active listings" isOwnProfile={isOwnProfile} />
            )}
          </div>
        )}

        {activeTab === 'offers_made' && isGraphConfigured && (
          <div>
            {userProfile?.offers && userProfile.offers.length > 0 ? (
              <div className="space-y-3">
                {userProfile.offers.map((offer: any) => {
                  const expiryDate = offer.expiryTime
                    ? new Date(Number(offer.expiryTime) * 1000).toLocaleDateString()
                    : null
                  return (
                    <div key={offer.id} className="card p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium">{formatEther(BigInt(offer.price))} ETH</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {offer.nft?.collection?.name
                            ? `${offer.nft.collection.name} #${offer.nft?.tokenId}`
                            : `Token #${offer.nft?.tokenId}`}
                        </p>
                        {expiryDate && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            Expires {expiryDate}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Link
                          href={`/nft/${offer.nft?.collection?.address}/${offer.nft?.tokenId}`}
                          className="btn-outline text-sm"
                        >
                          View
                        </Link>
                        {isOwnProfile && (
                          <button
                            onClick={() =>
                              cancelOfferHook.cancelOffer(
                                offer.nft?.collection?.address as Address,
                                BigInt(offer.nft?.tokenId || 0)
                              )
                            }
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
                })}
              </div>
            ) : (
              <EmptyState message="No offers made" isOwnProfile={isOwnProfile} />
            )}
          </div>
        )}

        {activeTab === 'offers_received' && isOwnProfile && isGraphConfigured && (
          <div>
            {offersReceivedLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="card p-4 h-20 skeleton" />
                ))}
              </div>
            ) : offersReceived && offersReceived.length > 0 ? (
              <div className="space-y-3">
                {offersReceived.map((offer) => {
                  const expiryDate = offer.expiryTime > 0n
                    ? new Date(Number(offer.expiryTime) * 1000).toLocaleDateString()
                    : null
                  return (
                    <div key={offer.id} className="card p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium">{offer.formattedPrice} ETH</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {offer.nft?.collection?.name
                            ? `${offer.nft.collection.name} #${offer.nft.tokenId}`
                            : `Token #${offer.nft?.tokenId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          from{' '}
                          <a
                            href={`https://sepolia.etherscan.io/address/${offer.buyer}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={offer.buyer}
                            className="font-mono hover:text-primary transition-colors"
                          >
                            {offer.buyer.slice(0, 6)}…{offer.buyer.slice(-4)}
                          </a>
                        </p>
                        {expiryDate && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            Expires {expiryDate}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/nft/${offer.nft?.collection?.address}/${offer.nft?.tokenId}`}
                        className="btn-primary text-sm flex-shrink-0"
                      >
                        View &amp; Accept
                      </Link>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState message="No offers received" isOwnProfile={isOwnProfile} />
            )}
          </div>
        )}

        {activeTab === 'offer_balance' && isOwnProfile && isGraphConfigured && (
          <div>
            <div className="card p-4 mb-4 border-amber-500/30 bg-amber-500/5">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600 dark:text-amber-400">ETH locked in the marketplace contract</p>
                  <p className="text-muted-foreground mt-0.5">
                    The NFTs below were sold to another buyer before your offer was accepted.
                    Your ETH is still held in the marketplace contract — click <strong>Recover ETH</strong> on
                    each offer to call <code className="text-xs bg-muted px-1 rounded">cancelOffer()</code> on-chain
                    and return the funds to your wallet.
                  </p>
                </div>
              </div>
            </div>
            {userProfile?.autoRejectedOffers && userProfile.autoRejectedOffers.length > 0 ? (
              <div className="space-y-3">
                {userProfile.autoRejectedOffers.map((offer: any) => (
                  <div key={offer.id} className="card p-4 flex items-center justify-between gap-4 border-amber-500/20">
                    <div className="min-w-0">
                      <p className="font-medium">{formatEther(BigInt(offer.price))} ETH</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {offer.nft?.collection?.name
                          ? `${offer.nft.collection.name} #${offer.nft?.tokenId}`
                          : `Token #${offer.nft?.tokenId}`}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                        Offer not accepted — NFT sold to another buyer
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link
                        href={`/nft/${offer.nft?.collection?.address}/${offer.nft?.tokenId}`}
                        className="btn-outline text-sm"
                      >
                        View NFT
                      </Link>
                      <button
                        onClick={() =>
                          cancelOfferHook.cancelOffer(
                            offer.nft?.collection?.address as Address,
                            BigInt(offer.nft?.tokenId || 0)
                          )
                        }
                        disabled={cancelOfferHook.isPending || cancelOfferHook.isConfirming}
                        className="btn-primary text-sm flex items-center gap-2 bg-amber-500 hover:bg-amber-600 border-amber-500"
                      >
                        {cancelOfferHook.isPending || cancelOfferHook.isConfirming
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <RotateCcw className="w-4 h-4" />
                        }
                        Recover ETH
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-xl text-muted-foreground">No ETH to recover</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function NFTGrid({ nfts, isLoading, isError, emptyMessage, isOwnProfile }: {
  nfts: any[] | undefined
  isLoading: boolean
  isError?: boolean
  emptyMessage: string
  isOwnProfile: boolean
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="aspect-square skeleton" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 skeleton" />
              <div className="h-3 w-1/2 skeleton" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-16 card p-8">
        <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-amber-500" />
        <p className="text-lg font-medium mb-1">Failed to load NFTs</p>
        <p className="text-sm text-muted-foreground">
          Could not fetch NFT data from the subgraph. The subgraph may still be syncing, or your NFTs may not be indexed yet.
        </p>
      </div>
    )
  }

  if (!nfts || nfts.length === 0) {
    return <EmptyState message={emptyMessage} isOwnProfile={isOwnProfile} />
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {nfts.map((nft) => (
        <NFTCard key={nft.id} nft={nft} />
      ))}
    </div>
  )
}

function NFTCard({ nft }: { nft: any }) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (nft.tokenURI) {
      fetchNFTMetadata(nft.tokenURI).then(setMetadata).catch(() => {})
    }
  }, [nft.tokenURI])

  const displayImage = ipfsToHttp(metadata?.image || nft.tokenURI)
  const displayName = metadata?.name || `#${nft.tokenId?.toString()}`
  const collectionAddress = nft.collection?.address || nft.nftContract

  return (
    <Link href={`/nft/${collectionAddress}/${nft.tokenId}`} className="group">
      <div className="card overflow-hidden transition-all duration-300 hover:shadow-lg">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {!imageError && displayImage ? (
            <Image
              src={displayImage}
              alt={displayName}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
              <span className="text-4xl">🖼️</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-foreground truncate">
            {nft.collection?.name || 'Unknown'}
          </p>
          <h3 className="font-semibold truncate">{displayName}</h3>
          {nft.currentListing?.price && (
            <p className="text-sm text-primary font-medium mt-1">
              {formatEther(BigInt(nft.currentListing.price))} ETH
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

function CollectionCard({ collection, isOwnProfile }: { collection: any; isOwnProfile: boolean }) {
  const floorEth = collection.floorPrice
    ? parseFloat(formatEther(BigInt(collection.floorPrice))).toFixed(4).replace(/\.?0+$/, '')
    : null
  const volumeEth = collection.totalVolume
    ? parseFloat(formatEther(BigInt(collection.totalVolume))).toFixed(4).replace(/\.?0+$/, '')
    : null
  const mintPriceEth = collection.mintPrice && collection.mintPrice !== '0'
    ? parseFloat(formatEther(BigInt(collection.mintPrice))).toFixed(4).replace(/\.?0+$/, '')
    : null

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg leading-tight">{collection.name}</h3>
            {collection.verified && (
              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Verified</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{collection.symbol}</p>
        </div>
        <a
          href={`https://sepolia.etherscan.io/address/${collection.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Supply</p>
          <p className="font-medium">
            {collection.totalSupply || 0}
            {collection.maxSupply && collection.maxSupply !== '0' ? ` / ${collection.maxSupply}` : ''}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Sales</p>
          <p className="font-medium">{collection.totalSales || 0}</p>
        </div>
        {floorEth && (
          <div>
            <p className="text-muted-foreground">Floor</p>
            <p className="font-medium">{floorEth} ETH</p>
          </div>
        )}
        {volumeEth && (
          <div>
            <p className="text-muted-foreground">Volume</p>
            <p className="font-medium">{volumeEth} ETH</p>
          </div>
        )}
        {mintPriceEth && (
          <div>
            <p className="text-muted-foreground">Mint Price</p>
            <p className="font-medium">{mintPriceEth} ETH</p>
          </div>
        )}
      </div>

      {isOwnProfile && (
        <Link
          href={`/create?collection=${collection.address}`}
          className="btn-outline text-sm text-center"
        >
          Mint NFT to this Collection
        </Link>
      )}
    </div>
  )
}

function EmptyState({ message, isOwnProfile }: { message: string; isOwnProfile: boolean }) {
  return (
    <div className="text-center py-16">
      <p className="text-xl text-muted-foreground">{message}</p>
      {isOwnProfile && (
        <Link href="/create" className="btn-primary mt-4 inline-flex">
          Create NFT
        </Link>
      )}
    </div>
  )
}

function ProfileListingRow({
  listing,
  isOwnProfile,
  onCancel,
  isCancelling,
}: {
  listing: any
  isOwnProfile: boolean
  onCancel: () => void
  isCancelling: boolean
}) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (listing.nft?.tokenURI) {
      fetchNFTMetadata(listing.nft.tokenURI).then(setMetadata).catch(() => {})
    }
  }, [listing.nft?.tokenURI])

  const displayImage = ipfsToHttp(metadata?.image || listing.nft?.tokenURI)
  const displayName = metadata?.name || `#${listing.tokenId?.toString()}`
  const collectionName = listing.nft?.collection?.name || 'Unknown Collection'
  const nftHref = `/nft/${listing.nftContract}/${listing.tokenId}`

  return (
    <div className="card p-4 flex items-center gap-4">
      {/* Thumbnail */}
      <Link href={nftHref} className="flex-shrink-0">
        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted border border-border/50">
          {!imageError && displayImage ? (
            <Image
              src={displayImage}
              alt={displayName}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
              <span className="text-lg opacity-30 select-none">◈</span>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{collectionName}</p>
        <Link href={nftHref} className="font-semibold truncate hover:text-primary transition-colors block">
          {displayName}
        </Link>
        <p className="text-sm font-medium text-primary mt-0.5">
          {listing.formattedPrice} ETH
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        <Link href={nftHref} className="btn-outline text-sm">
          View
        </Link>
        {isOwnProfile && (
          <button
            onClick={onCancel}
            disabled={isCancelling}
            className="btn-outline text-sm text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
          >
            {isCancelling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Cancel'
            )}
          </button>
        )}
      </div>
    </div>
  )
}

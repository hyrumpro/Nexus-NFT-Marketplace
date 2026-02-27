'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Listing } from '@/types'
import { formatEther } from 'viem'
import { Clock, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ipfsToHttp, fetchNFTMetadata, NFTMetadata } from '@/lib/utils'

interface ListingCardProps {
  listing: Listing
}

export function ListingCard({ listing }: ListingCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null)

  const endTime = listing.endTime ? Number(listing.endTime) : null
  const isAuction = listing.listingType === 1
  const timeLeft = endTime ? Math.max(0, endTime - Math.floor(Date.now() / 1000)) : 0

  useEffect(() => {
    if (listing.nft?.tokenURI) {
      fetchNFTMetadata(listing.nft.tokenURI).then(setMetadata)
    }
  }, [listing.nft?.tokenURI])

  const formatTimeLeft = (seconds: number) => {
    if (seconds <= 0) return 'Ended'
    const hours = Math.floor(seconds / 3600)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ${hours % 24}h`
    return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const displayImage = ipfsToHttp(metadata?.image || listing.nft?.tokenURI)
  const displayName = metadata?.name || `#${listing.tokenId.toString()}`
  const collectionName = listing.nft?.collection?.name || 'Unknown Collection'

  return (
    <Link href={`/nft/${listing.nftContract}/${listing.tokenId}`} className="group block">
      <div
        className={`relative rounded-xl overflow-hidden transition-all duration-300 bg-card ${
          isHovered
            ? 'border border-primary/40 shadow-[0_0_32px_rgba(0,230,200,0.08),0_8px_40px_rgba(0,0,0,0.5)]'
            : 'border border-border/50 shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Gradient shimmer line on hover */}
        <div
          className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent transition-opacity duration-300 z-10 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* NFT Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {!imageError && displayImage ? (
            <Image
              src={displayImage}
              alt={displayName}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/8 to-accent/8">
              <div className="text-5xl opacity-20 select-none">◈</div>
            </div>
          )}

          {/* Auction Live badge */}
          {isAuction && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm border border-accent/30 px-2 py-1 rounded-md text-xs font-medium text-accent z-10">
              <Zap className="w-3 h-3" />
              Live
            </div>
          )}

          {/* Time left badge */}
          {isAuction && timeLeft > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium z-10">
              <Clock className="w-3 h-3 text-primary" />
              <span className="text-primary">{formatTimeLeft(timeLeft)}</span>
            </div>
          )}

          {/* Hover overlay with CTA */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute bottom-3 left-3 right-3">
              <span className="btn-primary w-full text-center text-xs py-2 block rounded-lg">
                View Details
              </span>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4">
          <div className="mb-3">
            <p className="text-xs text-muted-foreground truncate mb-0.5">{collectionName}</p>
            <h3 className="font-semibold truncate text-foreground/90 text-sm">{displayName}</h3>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                {isAuction ? 'Current Bid' : 'Price'}
              </p>
              <p
                className={`font-bold text-base transition-colors duration-200 ${
                  isHovered ? 'text-primary' : 'text-foreground'
                }`}
              >
                {listing.formattedPrice || formatEther(BigInt(listing.price))}
                <span className="text-xs font-normal text-muted-foreground ml-1">ETH</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function ListingCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="aspect-square bg-muted animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-1/2 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-3/4 bg-muted rounded-lg animate-pulse" />
        <div className="h-5 w-1/3 bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  )
}

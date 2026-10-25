'use client'

import Link from 'next/link'
import { Listing } from '@/types'
import { formatEther } from 'viem'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'
import { Clock, Zap, ImageIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ipfsToHttp } from '@/lib/utils'
import { useNFTMetadata } from '@/hooks/useListings'
import { NftImage } from '@/components/NftImage'
import { CountdownTimer } from '@/components/CountdownTimer'

interface ListingCardProps {
  listing: Listing
}

export function ListingCard({ listing }: ListingCardProps) {
  const { data: metadata } = useNFTMetadata(listing.nft?.tokenURI)
  const reduceMotion = useReducedMotion()

  // Tilt + spotlight only make sense with a fine pointer (mouse) and motion
  const [finePointer, setFinePointer] = useState(false)
  useEffect(() => {
    setFinePointer(window.matchMedia('(pointer: fine)').matches)
  }, [])

  const rawRx = useMotionValue(0)
  const rawRy = useMotionValue(0)
  const rotateX = useSpring(rawRx, { stiffness: 160, damping: 18, mass: 0.4 })
  const rotateY = useSpring(rawRy, { stiffness: 160, damping: 18, mass: 0.4 })

  const interactive = finePointer && !reduceMotion

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    rawRy.set(px * 7)
    rawRx.set(-py * 7)
    e.currentTarget.style.setProperty('--x', `${(px + 0.5) * 100}%`)
    e.currentTarget.style.setProperty('--y', `${(py + 0.5) * 100}%`)
  }

  const onMouseLeave = () => {
    rawRx.set(0)
    rawRy.set(0)
  }

  const endTime = listing.endTime ? Number(listing.endTime) : null
  const isAuction = listing.listingType === 1
  const expired = endTime !== null && endTime <= Math.floor(Date.now() / 1000)

  // Only metadata's image is an actual media file — the tokenURI itself is a
  // JSON document, so it must never be used as an image source.
  const displayImage = metadata?.image ? ipfsToHttp(metadata.image) : ''
  const displayName = metadata?.name || `#${listing.tokenId.toString()}`
  const collectionName = listing.nft?.collection?.name || 'Unknown Collection'
  const price = listing.formattedPrice || formatEther(BigInt(listing.price))

  return (
    <Link
      href={`/nft/${listing.nftContract}/${listing.tokenId}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`${displayName} from ${collectionName} — ${price} ETH`}
    >
      <motion.div
        className="card-hover spotlight relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-[0_4px_20px_rgba(0,0,0,0.3)] will-change-transform"
        style={interactive ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {/* Gradient hairline on hover */}
        <div className="absolute top-0 left-0 right-0 z-10 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Media */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {displayImage ? (
            <NftImage
              src={displayImage}
              alt={displayName}
              sizes="(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw"
              fallback={
                <div
                  className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10"
                  aria-hidden
                >
                  <ImageIcon className="w-10 h-10 text-muted-foreground/40" strokeWidth={1.5} />
                </div>
              }
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10"
              aria-hidden
            >
              <ImageIcon className="w-10 h-10 text-muted-foreground/40" strokeWidth={1.5} />
            </div>
          )}

          {/* Auction badge */}
          {isAuction && (
            <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1 rounded-md border border-accent/30 bg-background/80 px-2 py-1 text-xs font-medium text-accent backdrop-blur-sm">
              <Zap className="w-3 h-3" />
              Live
            </div>
          )}

          {/* Time-left badge — live ticking countdown */}
          {endTime !== null && !expired && (
            <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1 rounded-md border border-border/50 bg-background/80 px-2 py-1 text-xs font-medium backdrop-blur-sm">
              <Clock className="w-3 h-3 text-primary" aria-hidden />
              <CountdownTimer to={endTime} className="text-primary" />
            </div>
          )}
          {endTime !== null && expired && (
            <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive backdrop-blur-sm">
              <Clock className="w-3 h-3" aria-hidden />
              Expired
            </div>
          )}

          {/* Hover overlay with CTA */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="absolute bottom-3 left-3 right-3">
              <span className="btn-primary w-full rounded-lg py-2 text-center text-xs">
                View Details
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-3.5 sm:p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="h-5 w-5 shrink-0 rounded-full border border-border/50 bg-gradient-to-br from-primary/70 to-accent/70"
              aria-hidden
            />
            <p className="truncate text-xs text-muted-foreground">{collectionName}</p>
          </div>
          <h3 className="truncate font-display text-sm font-semibold text-foreground/95">
            {displayName}
          </h3>

          <div className="mt-3 flex items-end justify-between border-t border-border/40 pt-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {isAuction ? 'Current Bid' : 'Price'}
              </p>
              <p className="font-display text-base font-bold tabular-nums text-foreground transition-colors duration-200 group-hover:text-primary">
                {price}
                <span className="ml-1 text-xs font-normal text-muted-foreground">ETH</span>
              </p>
            </div>
            {endTime !== null && !expired && (
              <CountdownTimer
                to={endTime}
                className="chip !py-0.5 tabular-nums transition-opacity duration-200 group-hover:opacity-0"
              />
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-l from-transparent via-background/40 to-transparent" />
      </div>
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/2 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-3/4 rounded-lg bg-muted animate-pulse" />
        <div className="h-5 w-1/3 rounded-lg bg-muted animate-pulse" />
      </div>
    </div>
  )
}

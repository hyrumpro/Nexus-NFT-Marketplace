'use client'

import { useListings, useMarketplaceStats, useNFTMetadata } from '@/hooks/useListings'
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard'
import LinkNext from 'next/link'
import { formatEther } from 'viem'
import { graphClient } from '@/lib/graphql/client'
import { ipfsToHttp } from '@/lib/utils'
import { NftImage } from '@/components/NftImage'
import { Reveal, Stagger, StaggerItem } from '@/components/Reveal'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  animate,
} from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Zap,
  Shield,
  Layers,
  Wallet,
  Tag,
  TrendingUp,
  Sparkles,
  Image as ImageIcon,
  Boxes,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Listing } from '@/types'
import { PortfolioModal } from '@/components/PortfolioModal'

export default function HomePage() {
  const { data: listings, isLoading, error } = useListings({ first: 8 })
  const { data: stats } = useMarketplaceStats()
  const isGraphConfigured = graphClient.isReady()

  const statsRows: { label: string; value: string; decimals: number; suffix: string; Icon: LucideIcon }[] = [
    {
      label: 'Total Volume',
      value: parseFloat(formatEther(BigInt(stats?.totalVolume || '0'))).toFixed(2),
      decimals: 2,
      suffix: ' ETH',
      Icon: TrendingUp,
    },
    {
      label: 'Active Listings',
      value: stats?.activeListings || '0',
      decimals: 0,
      suffix: '',
      Icon: Tag,
    },
    {
      label: 'Total NFTs',
      value: stats?.totalNFTs || '0',
      decimals: 0,
      suffix: '',
      Icon: ImageIcon,
    },
    {
      label: 'Collections',
      value: stats?.totalCollections || '0',
      decimals: 0,
      suffix: '',
      Icon: Boxes,
    },
  ]

  // Collection names for the marquee strip (deduped from live listings)
  const collectionNames = Array.from(
    new Set((listings ?? []).map((l) => l.nft?.collection?.name).filter(Boolean))
  ) as string[]

  const showcase = (listings ?? []).slice(0, 4)

  return (
    <div className="min-h-screen">
      <PortfolioModal />
      {/* ── Hero ── */}
      <HeroParallax showcase={showcase}>
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="chip animate-fade-in mb-8 !gap-2 !rounded-full !border-primary/30 !bg-primary/5 !px-4 !py-1.5 !text-sm text-primary">
              <Zap className="w-3.5 h-3.5" aria-hidden />
              Only 1.5% Marketplace Fee
            </div>

            {/* Headline */}
            <h1 className="animate-fade-in-up font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Discover &amp; Collect{' '}
              <span className="gradient-text">Extraordinary</span>{' '}
              Digital Assets
            </h1>

            <p className="animate-fade-in-up mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
              The decentralized NFT marketplace with the lowest fees. Buy, sell,
              and discover exclusive digital items with true blockchain ownership.
            </p>

            {/* CTAs */}
            <div className="animate-fade-in-up mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <LinkNext href="/explore" className="btn-primary gap-2 px-8 py-3 text-base">
                Explore NFTs
                <ArrowRight className="w-4 h-4" aria-hidden />
              </LinkNext>
              <LinkNext href="/create" className="btn-outline px-8 py-3 text-base">
                Create NFT
              </LinkNext>
            </div>
          </div>

          {/* Stats row — animated count-up */}
          <Stagger className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
            {statsRows.map(({ label, value, decimals, suffix, Icon }) => (
              <StaggerItem key={label}>
                <div className="rounded-xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/30">
                  <Icon className="mb-2 h-4 w-4 text-primary" aria-hidden />
                  <p className="gradient-text font-display text-2xl font-bold tabular-nums md:text-3xl">
                    {stats ? <AnimatedNumber value={value} decimals={decimals} suffix={suffix} /> : '—'}
                  </p>
                  <p className="mt-1.5 text-xs uppercase tracking-widest text-muted-foreground">
                    {label}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </HeroParallax>

      {/* ── Collection marquee ── */}
      {collectionNames.length > 0 && (
        <div className="marquee-hover mask-fade-x mt-16 overflow-hidden border-y border-border/30 bg-card/30 py-4">
          <div className="animate-marquee flex w-max items-center gap-10" style={{ ['--marquee-duration' as string]: '30s' }}>
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center gap-10" aria-hidden={copy === 1}>
                {collectionNames.map((name) => (
                  <span key={name} className="flex items-center gap-10">
                    <span className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                      {name}
                    </span>
                    <Sparkles className="h-3.5 w-3.5 text-primary/50" aria-hidden />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Trending NFTs ── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold md:text-3xl">Trending NFTs</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                The most recent listings on the marketplace
              </p>
            </div>
            <LinkNext href="/explore" className="btn-outline gap-2 text-sm">
              View All
              <ArrowRight className="w-4 h-4" aria-hidden />
            </LinkNext>
          </Reveal>

          {!isGraphConfigured && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 py-16 text-center">
              <p className="font-medium text-amber-400">Graph API Not Configured</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Set NEXT_PUBLIC_GRAPH_API_URL in your environment to view listings.
              </p>
            </div>
          )}

          {error && isGraphConfigured && (
            <div className="py-16 text-center">
              <p className="text-destructive">Failed to load listings. Please try again.</p>
            </div>
          )}

          {isGraphConfigured && (
            <Stagger className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)
              ) : listings && listings.length > 0 ? (
                listings.map((listing) => (
                  <StaggerItem key={listing.id}>
                    <ListingCard listing={listing} />
                  </StaggerItem>
                ))
              ) : !error ? (
                <div className="col-span-full py-16 text-center">
                  <ImageIcon className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" strokeWidth={1.5} aria-hidden />
                  <p className="text-muted-foreground">No listings found</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Be the first to list an NFT!
                  </p>
                  <LinkNext href="/create" className="btn-primary mt-6 inline-flex">
                    Create Your NFT
                  </LinkNext>
                </div>
              ) : null}
            </Stagger>
          )}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <Reveal className="mb-12 text-center">
            <h2 className="font-display text-2xl font-bold md:text-3xl">How It Works</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              From wallet to collection in three steps
            </p>
          </Reveal>

          <div className="relative mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {/* Connector line (desktop) */}
            <div
              className="absolute left-[16.6%] right-[16.6%] top-10 hidden h-px bg-gradient-to-r from-primary/40 via-accent/40 to-primary/40 md:block"
              aria-hidden
            />
            <Reveal delay={0}>
              <StepCard
                step="1"
                title="Connect Your Wallet"
                description="Link MetaMask, WalletConnect, or Coinbase Wallet — your keys, your assets."
                Icon={Wallet}
              />
            </Reveal>
            <Reveal delay={0.12}>
              <StepCard
                step="2"
                title="Mint or Buy"
                description="Mint your own collection, or browse live listings and auctions from creators."
                Icon={Tag}
              />
            </Reveal>
            <Reveal delay={0.24}>
              <StepCard
                step="3"
                title="Trade & Earn"
                description="Sell with fixed prices or timed auctions. Creators earn royalties on every resale."
                Icon={TrendingUp}
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Why NexusNFT ── */}
      <section className="relative overflow-hidden py-16 md:py-24">
        {/* Bottom ambient glow */}
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 h-[180px] w-[800px] -translate-x-1/2"
          aria-hidden
          style={{ background: 'hsl(var(--primary) / 0.04)', filter: 'blur(80px)' }}
        />

        <div className="container relative mx-auto px-4">
          <Reveal className="mb-12 text-center">
            <h2 className="font-display text-2xl font-bold md:text-3xl">Why NexusNFT?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Built for creators and collectors</p>
          </Reveal>

          <Stagger className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            <StaggerItem>
              <FeatureCard
                title="Low Fees"
                description="Only 1.5% marketplace fee — one of the lowest in the industry"
                Icon={Zap}
                color="primary"
              />
            </StaggerItem>
            <StaggerItem>
              <FeatureCard
                title="Any ERC721"
                description="List any ERC721 NFT, not just tokens from our factory collection"
                Icon={Layers}
                color="accent"
              />
            </StaggerItem>
            <StaggerItem>
              <FeatureCard
                title="Secure"
                description="Audited smart contracts with reentrancy protection and safe transfers"
                Icon={Shield}
                color="primary"
              />
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="gradient-border card relative mx-auto max-w-3xl overflow-hidden p-10 text-center md:p-14">
              <div
                className="pointer-events-none absolute -top-24 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-primary/10 blur-[80px]"
                aria-hidden
              />
              <h2 className="font-display relative text-2xl font-bold md:text-3xl">
                Start Collecting <span className="gradient-text">Today</span>
              </h2>
              <p className="relative mt-3 text-sm text-muted-foreground md:text-base">
                Join the marketplace where creators keep more and collectors pay less.
              </p>
              <div className="relative mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <LinkNext href="/explore" className="btn-primary px-8 py-3 text-base">
                  Browse Marketplace
                </LinkNext>
                <LinkNext href="/create" className="btn-outline px-8 py-3 text-base">
                  Mint Your First NFT
                </LinkNext>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}

// ─── Hero: ambient background + parallax floating NFT cards (desktop) ─────────

const FLOAT_POSITIONS = [
  { top: '16%', left: '3%', depth: 34, rotate: '-6deg' },
  { top: '54%', left: '9%', depth: 58, rotate: '4deg' },
  { top: '20%', right: '4%', depth: 46, rotate: '5deg' },
  { top: '58%', right: '10%', depth: 26, rotate: '-4deg' },
]

function HeroParallax({
  showcase,
  children,
}: {
  showcase: Listing[]
  children: React.ReactNode
}) {
  const reduceMotion = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 50, damping: 20 })
  const sy = useSpring(my, { stiffness: 50, damping: 20 })

  const onMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduceMotion) return
    const rect = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - rect.left) / rect.width - 0.5)
    my.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  return (
    <section
      className="relative overflow-hidden py-24 md:py-36"
      onMouseMove={onMouseMove}
    >
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-48 -top-48 h-[700px] w-[700px] rounded-full bg-primary/6 blur-[130px]" />
        <div className="absolute -bottom-48 -right-48 h-[700px] w-[700px] rounded-full bg-accent/6 blur-[130px]" />
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/4 blur-[80px]" />
      </div>

      {/* Subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(hsl(var(--border) / 0.6) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage:
            'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)',
        }}
      />

      {/* Floating showcase cards — only on very wide screens */}
      {!reduceMotion &&
        showcase.map((listing, i) => {
          const pos = FLOAT_POSITIONS[i % FLOAT_POSITIONS.length]
          return (
            <ParallaxCard
              key={listing.id}
              listing={listing}
              pos={pos}
              index={i}
              sx={sx}
              sy={sy}
            />
          )
        })}

      <div className="relative z-10">{children}</div>
    </section>
  )
}

function ParallaxCard({
  listing,
  pos,
  index,
  sx,
  sy,
}: {
  listing: Listing
  pos: (typeof FLOAT_POSITIONS)[number]
  index: number
  sx: ReturnType<typeof useSpring>
  sy: ReturnType<typeof useSpring>
}) {
  const { data: metadata } = useNFTMetadata(listing.nft?.tokenURI)
  const displayImage = metadata?.image ? ipfsToHttp(metadata.image) : ''
  const x = useTransform(sx, (v) => v * pos.depth)
  const y = useTransform(sy, (v) => v * pos.depth)

  if (!displayImage) return null

  return (
    <motion.div
      className="absolute z-0 hidden 2xl:block"
      style={{ top: pos.top, left: pos.left, right: pos.right, x, y }}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.35 + index * 0.15, ease: 'easeOut' }}
      >
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 4.5 + index, repeat: Infinity, ease: 'easeInOut', delay: index * 0.5 }}
        >
          <LinkNext
            href={`/nft/${listing.nftContract}/${listing.tokenId}`}
            className="group block w-44 rounded-2xl border border-border/60 bg-card/80 p-2 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-transform duration-300 hover:scale-105"
            style={{ transform: `rotate(${pos.rotate})` }}
            aria-label={metadata?.name || `NFT #${listing.tokenId.toString()}`}
          >
            <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
              <NftImage
                src={displayImage}
                alt={metadata?.name || `NFT #${listing.tokenId.toString()}`}
                sizes="176px"
                fallback={
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" aria-hidden />
                }
              />
            </div>
            <p className="truncate px-1 pb-1 pt-2 text-center font-display text-xs font-semibold text-foreground/80">
              {metadata?.name || `#${listing.tokenId.toString()}`}
            </p>
          </LinkNext>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

// ─── Animated count-up number ─────────────────────────────────────────────────

function AnimatedNumber({
  value,
  decimals = 0,
  suffix = '',
}: {
  value: string
  decimals?: number
  suffix?: string
}) {
  const target = parseFloat(value)
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    if (Number.isNaN(target)) return
    const controls = animate(prev.current, target, {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
      onComplete: () => {
        prev.current = target
      },
    })
    return () => controls.stop()
  }, [target])

  if (Number.isNaN(target)) {
    return (
      <>
        {value}
        {suffix}
      </>
    )
  }

  return (
    <>
      {display.toFixed(decimals)}
      {suffix}
    </>
  )
}

// ─── Section cards ────────────────────────────────────────────────────────────

function StepCard({
  step,
  title,
  description,
  Icon,
}: {
  step: string
  title: string
  description: string
  Icon: LucideIcon
}) {
  return (
    <div className="group relative text-center">
      <div className="relative z-10 mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-[0_0_24px_hsl(var(--primary)/0.15)]">
        <Icon className="h-7 w-7 text-primary" strokeWidth={1.75} aria-hidden />
        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary font-display text-xs font-bold text-primary-foreground">
          {step}
        </span>
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function FeatureCard({
  title,
  description,
  Icon,
  color,
}: {
  title: string
  description: string
  Icon: LucideIcon
  color: 'primary' | 'accent'
}) {
  return (
    <div className="card card-hover p-6 text-center">
      <div
        className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
          color === 'primary' ? 'bg-primary/10' : 'bg-accent/10'
        }`}
      >
        <Icon
          className={`w-6 h-6 ${color === 'primary' ? 'text-primary' : 'text-accent'}`}
          aria-hidden
        />
      </div>
      <h3 className="font-display mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

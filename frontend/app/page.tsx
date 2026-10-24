'use client'

import { useListings, useMarketplaceStats } from '@/hooks/useListings'
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard'
import LinkNext from 'next/link'
import { formatEther } from 'viem'
import { graphClient } from '@/lib/graphql/client'
import {
  ArrowRight,
  Zap,
  Shield,
  Layers,
  Wallet,
  Tag,
  TrendingUp,
  Image as ImageIcon,
  Boxes,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PortfolioModal } from '@/components/PortfolioModal'

export default function HomePage() {
  const { data: listings, isLoading, error } = useListings({ first: 8 })
  const { data: stats } = useMarketplaceStats()
  const isGraphConfigured = graphClient.isReady()

  const statsRows: { label: string; value: string; Icon: LucideIcon }[] = [
    {
      label: 'Total Volume',
      value: `${parseFloat(formatEther(BigInt(stats?.totalVolume || '0'))).toFixed(2)} ETH`,
      Icon: TrendingUp,
    },
    { label: 'Active Listings', value: stats?.activeListings || '0', Icon: Tag },
    { label: 'Total NFTs', value: stats?.totalNFTs || '0', Icon: ImageIcon },
    { label: 'Collections', value: stats?.totalCollections || '0', Icon: Boxes },
  ]

  return (
    <div className="min-h-screen">
      <PortfolioModal />
      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-24 md:py-36">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-48 -top-48 h-[700px] w-[700px] rounded-full bg-primary/6 blur-[130px]" />
          <div className="absolute -bottom-48 -right-48 h-[700px] w-[700px] rounded-full bg-accent/6 blur-[130px]" />
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/4 blur-[80px]" />
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

          {/* Stats row */}
          <div className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
            {statsRows.map(({ label, value, Icon }) => (
              <div
                key={label}
                className="rounded-xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/30"
              >
                <Icon className="mb-2 h-4 w-4 text-primary" aria-hidden />
                <p className="gradient-text font-display text-2xl font-bold tabular-nums md:text-3xl">
                  {value}
                </p>
                <p className="mt-1.5 text-xs uppercase tracking-widest text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trending NFTs ── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
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
          </div>

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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)
              ) : listings && listings.length > 0 ? (
                listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
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
            </div>
          )}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="font-display text-2xl font-bold md:text-3xl">How It Works</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              From wallet to collection in three steps
            </p>
          </div>

          <div className="relative mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {/* Connector line (desktop) */}
            <div
              className="absolute left-[16.6%] right-[16.6%] top-10 hidden h-px bg-gradient-to-r from-primary/40 via-accent/40 to-primary/40 md:block"
              aria-hidden
            />
            <StepCard
              step="1"
              title="Connect Your Wallet"
              description="Link MetaMask, WalletConnect, or Coinbase Wallet — your keys, your assets."
              Icon={Wallet}
            />
            <StepCard
              step="2"
              title="Mint or Buy"
              description="Mint your own collection, or browse live listings and auctions from creators."
              Icon={Tag}
            />
            <StepCard
              step="3"
              title="Trade & Earn"
              description="Sell with fixed prices or timed auctions. Creators earn royalties on every resale."
              Icon={TrendingUp}
            />
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
          <div className="mb-12 text-center">
            <h2 className="font-display text-2xl font-bold md:text-3xl">Why NexusNFT?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Built for creators and collectors</p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            <FeatureCard
              title="Low Fees"
              description="Only 1.5% marketplace fee — one of the lowest in the industry"
              Icon={Zap}
              color="primary"
            />
            <FeatureCard
              title="Any ERC721"
              description="List any ERC721 NFT, not just tokens from our factory collection"
              Icon={Layers}
              color="accent"
            />
            <FeatureCard
              title="Secure"
              description="Audited smart contracts with reentrancy protection and safe transfers"
              Icon={Shield}
              color="primary"
            />
          </div>
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
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
        </div>
      </section>
    </div>
  )
}

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
    <div className="relative text-center">
      <div className="relative z-10 mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card">
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

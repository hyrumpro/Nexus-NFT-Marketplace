'use client'

import { useListings, useMarketplaceStats } from '@/hooks/useListings'
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard'
import LinkNext from 'next/link'
import { formatEther } from 'viem'
import { graphClient } from '@/lib/graphql/client'
import { ArrowRight, Zap, Shield, Layers } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export default function HomePage() {
  const { data: listings, isLoading, error } = useListings({ first: 8 })
  const { data: stats } = useMarketplaceStats()
  const isGraphConfigured = graphClient.isReady()

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-24 md:py-36">
        {/* Ambient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-48 -left-48 w-[700px] h-[700px] rounded-full bg-primary/6 blur-[130px]" />
          <div className="absolute -bottom-48 -right-48 w-[700px] h-[700px] rounded-full bg-accent/6 blur-[130px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/4 blur-[80px]" />
        </div>

        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
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
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-8 animate-fade-in">
              <Zap className="w-3.5 h-3.5" />
              Only 1.5% Marketplace Fee
            </div>

            {/* Headline */}
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] animate-fade-in-up">
              Discover &amp; Collect{' '}
              <span className="gradient-text">Extraordinary</span>{' '}
              Digital Assets
            </h1>

            <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl mx-auto animate-fade-in-up">
              The leading decentralized NFT marketplace. Buy, sell, and discover exclusive
              digital items with true blockchain ownership.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up">
              <LinkNext href="/explore" className="btn-primary px-8 py-3 text-base gap-2">
                Explore NFTs
                <ArrowRight className="w-4 h-4" />
              </LinkNext>
              <LinkNext href="/create" className="btn-outline px-8 py-3 text-base">
                Create NFT
              </LinkNext>
            </div>
          </div>

          {/* Stats row */}
          {stats && (
            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <StatCard
                label="Total Volume"
                value={`${parseFloat(formatEther(BigInt(stats.totalVolume || '0'))).toFixed(2)} ETH`}
              />
              <StatCard label="Active Listings" value={stats.activeListings || '0'} />
              <StatCard label="Total NFTs" value={stats.totalNFTs || '0'} />
              <StatCard label="Collections" value={stats.totalCollections || '0'} />
            </div>
          )}
        </div>
      </section>

      {/* ── Trending NFTs ── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold">Trending NFTs</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                The most popular NFTs right now
              </p>
            </div>
            <LinkNext href="/explore" className="btn-outline gap-2 text-sm">
              View All
              <ArrowRight className="w-4 h-4" />
            </LinkNext>
          </div>

          {!isGraphConfigured && (
            <div className="text-center py-16 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <p className="text-amber-400 font-medium">Graph API Not Configured</p>
              <p className="text-sm text-muted-foreground mt-2">
                Set NEXT_PUBLIC_GRAPH_API_URL in your environment to view listings.
              </p>
            </div>
          )}

          {error && isGraphConfigured && (
            <div className="text-center py-16">
              <p className="text-destructive">Failed to load listings. Please try again.</p>
            </div>
          )}

          {isGraphConfigured && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)
              ) : listings && listings.length > 0 ? (
                listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))
              ) : !error ? (
                <div className="col-span-full text-center py-16">
                  <p className="text-muted-foreground">No listings found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Be the first to list an NFT!
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {/* ── Why NexusNFT ── */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Bottom ambient glow */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[180px] pointer-events-none"
          aria-hidden
          style={{ background: 'hsl(var(--primary) / 0.04)', filter: 'blur(80px)' }}
        />

        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold">Why NexusNFT?</h2>
            <p className="text-muted-foreground mt-2 text-sm">Built for creators and collectors</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
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
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="text-center p-5 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
      <p className="text-2xl md:text-3xl font-bold gradient-text">{value || '0'}</p>
      <p className="text-xs text-muted-foreground mt-1.5 uppercase tracking-widest">{label}</p>
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
    <div className="group card p-6 text-center hover:border-primary/30 transition-all duration-300">
      <div
        className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center transition-all duration-300 ${
          color === 'primary'
            ? 'bg-primary/10 group-hover:bg-primary/15'
            : 'bg-accent/10 group-hover:bg-accent/15'
        }`}
      >
        <Icon
          className={`w-6 h-6 ${
            color === 'primary' ? 'text-primary' : 'text-accent'
          }`}
        />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

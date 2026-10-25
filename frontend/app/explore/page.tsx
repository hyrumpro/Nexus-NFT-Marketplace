'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useInfiniteListings, useNFTMetadata } from '@/hooks/useListings'
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard'
import { NftImage } from '@/components/NftImage'
import { useInView } from 'react-intersection-observer'
import {
  Search,
  Filter,
  Grid,
  List,
  X,
  Loader2,
  AlertTriangle,
  LayoutGrid,
  Tag,
  Zap,
  SearchX,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react'
import Link from 'next/link'
import { formatEther } from 'viem'
import { graphClient } from '@/lib/graphql/client'
import { ipfsToHttp } from '@/lib/utils'
import type { Listing } from '@/types'

type SortOption = 'recent' | 'price_low' | 'price_high'
type ViewMode = 'grid' | 'list'
type ListingType = 'all' | 'fixed' | 'auction'

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ExplorePageInner />
    </Suspense>
  )
}

function ExplorePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sort, setSort] = useState<SortOption>('recent')
  const [searchQuery, setSearchQuery] = useState(() => searchParams?.get('q') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams?.get('q') ?? '')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [listingType, setListingType] = useState<ListingType>('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const isGraphConfigured = graphClient.isReady()
  const isSearching = searchQuery !== debouncedSearch

  // Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Sync search state when the URL ?q= param changes (e.g. navigating directly to /explore?q=X)
  useEffect(() => {
    const q = searchParams?.get('q') ?? ''
    setSearchQuery(q)
    setDebouncedSearch(q)
  }, [searchParams])

  // Keep URL in sync with the debounced search (enables shareable search links)
  useEffect(() => {
    const current = new URLSearchParams(window.location.search)
    if (debouncedSearch) {
      current.set('q', debouncedSearch)
    } else {
      current.delete('q')
    }
    const query = current.toString()
    router.replace(`/explore${query ? `?${query}` : ''}`, { scroll: false })
  }, [debouncedSearch])

  const orderBy = sort === 'price_low' ? 'price' : sort === 'price_high' ? 'price' : 'createdAt'
  const orderDirection = sort === 'price_low' ? 'asc' : sort === 'price_high' ? 'desc' : 'desc'

  const listingTypeFilter = listingType === 'fixed'
    ? 'FixedPrice'
    : listingType === 'auction'
    ? 'TimedAuction'
    : null

  const minPriceWei = minPrice ? (parseFloat(minPrice) * 1e18).toString() : undefined
  const maxPriceWei = maxPrice ? (parseFloat(maxPrice) * 1e18).toString() : undefined

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteListings({
    first: 20,
    orderBy,
    orderDirection,
    listingType: listingTypeFilter,
    minPrice: minPriceWei,
    maxPrice: maxPriceWei,
    searchQuery: debouncedSearch || undefined,
  })

  const { ref, inView } = useInView()

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const allListings = data?.pages.flatMap((page) => page.listings) ?? []

  const clearFilters = () => {
    setSearchQuery('')
    setDebouncedSearch('')
    setListingType('all')
    setMinPrice('')
    setMaxPrice('')
  }

  const hasActiveFilters = searchQuery || listingType !== 'all' || minPrice || maxPrice

  const typeOptions: { id: ListingType; label: string; Icon: typeof LayoutGrid }[] = [
    { id: 'all', label: 'All', Icon: LayoutGrid },
    { id: 'fixed', label: 'Buy Now', Icon: Tag },
    { id: 'auction', label: 'Live Auctions', Icon: Zap },
  ]

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">
            Explore <span className="gradient-text">NFTs</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Discover unique digital collectibles
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="text"
                aria-label="Search NFTs"
                placeholder="Search by collection name, symbol or token ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setDebouncedSearch('')
                  }}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Listing type — segmented control */}
              <div className="segmented" role="group" aria-label="Listing type">
                {typeOptions.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    className="segmented-item"
                    data-active={listingType === id}
                    onClick={() => setListingType(id)}
                    aria-pressed={listingType === id}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                aria-label="Sort listings"
                className="input min-w-[150px] max-w-[200px]"
              >
                <option value="recent">Recently Listed</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                aria-label="Toggle price filters"
                aria-expanded={showFilters}
                className={`btn-outline !px-3 ${showFilters ? '!border-primary/60 !text-primary' : ''}`}
              >
                <Filter className="w-4 h-4" aria-hidden />
              </button>

              <div className="flex overflow-hidden rounded-lg border border-border/50" role="group" aria-label="View mode">
                <button
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                  className={`p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                  className={`p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Price filter panel */}
          {showFilters && (
            <div className="card p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display font-semibold">Filters</h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="field-label text-muted-foreground">Price Range (ETH)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      aria-label="Minimum price in ETH"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="input text-sm"
                      step="0.01"
                      min="0"
                    />
                    <input
                      type="number"
                      aria-label="Maximum price in ETH"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="input text-sm"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Result meta */}
        {searchQuery && isSearching && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            <span>Searching…</span>
          </div>
        )}
        {hasActiveFilters && !isSearching && !isLoading && isGraphConfigured && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              Found {allListings.length} result{allListings.length !== 1 ? 's' : ''}
            </span>
            {minPrice && <span className="chip">Min {minPrice} ETH</span>}
            {maxPrice && <span className="chip">Max {maxPrice} ETH</span>}
            {searchQuery && <span className="chip">“{searchQuery}”</span>}
          </div>
        )}

        {/* Error / not configured */}
        {isError && isGraphConfigured && (
          <div className="card p-8 py-16 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-500" aria-hidden />
            <h3 className="font-display mb-2 text-lg font-semibold">Failed to load NFTs</h3>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              {(error as Error)?.message?.includes('not configured')
                ? 'Graph API not configured. Set GRAPH_API_URL in your .env.local file.'
                : ((error as Error)?.message || 'Could not connect to The Graph. Please try again.')}
            </p>
            <button onClick={() => refetch()} className="btn-primary mt-6">
              Retry
            </button>
          </div>
        )}

        {!isGraphConfigured && (
          <div className="card p-8 py-16 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-500" aria-hidden />
            <h3 className="font-display mb-2 text-lg font-semibold">Graph API Not Configured</h3>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Set NEXT_PUBLIC_GRAPH_API_URL in your environment to explore NFTs. See .env.example for instructions.
            </p>
          </div>
        )}

        {/* Results */}
        {isLoading && isGraphConfigured ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : allListings.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {allListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {allListings.map((listing) => (
                  <ListingRow key={listing.id} listing={listing} />
                ))}
              </div>
            )}

            <div ref={ref} className="flex justify-center py-8">
              {isFetchingNextPage && (
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
              )}
            </div>
          </>
        ) : isGraphConfigured && !isError && (
          <div className="py-20 text-center">
            <SearchX className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" strokeWidth={1.5} aria-hidden />
            <p className="font-display text-xl font-semibold text-muted-foreground">
              {hasActiveFilters ? 'No NFTs match your filters' : 'No NFTs listed yet'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {hasActiveFilters ? 'Try adjusting or clearing your filters' : 'Be the first to list an NFT!'}
            </p>
            {hasActiveFilters ? (
              <button onClick={clearFilters} className="btn-primary mt-6">
                Clear Filters
              </button>
            ) : (
              <Link href="/create" className="btn-primary mt-6 inline-flex">
                Create an NFT
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Compact horizontal row — list view */
function ListingRow({ listing }: { listing: Listing }) {
  const { data: metadata } = useNFTMetadata(listing.nft?.tokenURI)

  const isAuction = listing.listingType === 1
  const displayImage = metadata?.image ? ipfsToHttp(metadata.image) : ''
  const displayName = metadata?.name || `#${listing.tokenId.toString()}`
  const collectionName = listing.nft?.collection?.name || 'Unknown Collection'
  const price = listing.formattedPrice || formatEther(BigInt(listing.price))

  return (
    <Link
      href={`/nft/${listing.nftContract}/${listing.tokenId}`}
      className="group card card-hover flex items-center gap-4 p-3 pr-4 sm:gap-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${displayName} from ${collectionName} — ${price} ETH`}
    >
      {/* Thumbnail */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-20 sm:w-20">
        <NftImage
          src={displayImage}
          alt={displayName}
          sizes="80px"
          className="transition-transform duration-300 group-hover:scale-105"
          fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10" aria-hidden>
              <ImageIcon className="h-6 w-6 text-muted-foreground/40" strokeWidth={1.5} />
            </div>
          }
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-foreground">{collectionName}</p>
        <p className="truncate font-display font-semibold">{displayName}</p>
        <span className="chip mt-1.5 !px-2 !py-0.5">
          {isAuction ? (
            <>
              <Zap className="h-3 w-3 text-accent" aria-hidden />
              Auction
            </>
          ) : (
            <>
              <Tag className="h-3 w-3 text-primary" aria-hidden />
              Fixed Price
            </>
          )}
        </span>
      </div>

      {/* Price */}
      <div className="shrink-0 text-right">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {isAuction ? 'Current Bid' : 'Price'}
        </p>
        <p className="font-display font-bold tabular-nums group-hover:text-primary">
          {price}
          <span className="ml-1 text-xs font-normal text-muted-foreground">ETH</span>
        </p>
      </div>

      <ChevronRight className="hidden h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary sm:block" aria-hidden />
    </Link>
  )
}

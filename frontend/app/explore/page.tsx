'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useInfiniteListings } from '@/hooks/useListings'
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard'
import { useInView } from 'react-intersection-observer'
import { Search, Filter, Grid, List, X, Loader2, AlertTriangle } from 'lucide-react'
import { graphClient } from '@/lib/graphql/client'

type SortOption = 'recent' | 'price_low' | 'price_high'
type ViewMode = 'grid' | 'list'
type ListingType = 'all' | 'fixed' | 'auction'

export default function ExplorePage() {
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

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Explore <span className="gradient-text">NFTs</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Discover unique digital collectibles
          </p>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by collection name or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 pr-10 w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setDebouncedSearch('')
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="input min-w-[140px] max-w-[200px]"
              >
                <option value="recent">Recently Listed</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-outline ${showFilters ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <Filter className="w-4 h-4" />
              </button>

              <div className="flex border border-border/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Filters</h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-sm text-primary hover:underline">
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Price Range (ETH)</label>
                  <div className="flex gap-2 mt-1">
                    <input 
                      type="number" 
                      placeholder="Min" 
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="input text-sm" 
                      step="0.01"
                      min="0"
                    />
                    <input 
                      type="number" 
                      placeholder="Max" 
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="input text-sm" 
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Listing Type</label>
                  <select 
                    className="input mt-1 w-full max-w-[200px]"
                    value={listingType}
                    onChange={(e) => setListingType(e.target.value as ListingType)}
                  >
                    <option value="all">All</option>
                    <option value="fixed">Fixed Price</option>
                    <option value="auction">Auction</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {searchQuery && isSearching && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Searching...</span>
          </div>
        )}
        {hasActiveFilters && !isSearching && !isLoading && isGraphConfigured && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Found {allListings.length} result{allListings.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {isError && isGraphConfigured && (
          <div className="text-center py-16 card p-8">
            <AlertWarning
              title="Failed to load NFTs"
              message={
                (error as Error)?.message?.includes('not configured')
                  ? 'Graph API not configured. Set GRAPH_API_URL in your .env.local file.'
                  : ((error as Error)?.message || 'Could not connect to The Graph. Please try again.')
              }
            />
            <button onClick={() => refetch()} className="btn-primary mt-6">
              Retry
            </button>
          </div>
        )}

        {!isGraphConfigured && (
          <div className="text-center py-16 card p-8">
            <AlertWarning 
              title="Graph API Not Configured"
              message="Set NEXT_PUBLIC_GRAPH_API_URL in your environment to explore NFTs. See .env.example for instructions."
            />
          </div>
        )}

        {isLoading && isGraphConfigured ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : allListings.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {allListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            <div ref={ref} className="py-8 flex justify-center">
              {isFetchingNextPage && (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              )}
            </div>
          </>
        ) : isGraphConfigured && !isError && (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">
              {hasActiveFilters ? 'No NFTs match your filters' : 'No NFTs listed yet'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Be the first to list an NFT!'}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn-primary mt-4">
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AlertWarning({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center">
      <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
    </div>
  )
}

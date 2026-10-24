'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount, useDisconnect, useBalance, useChainId, useReadContract } from 'wagmi'
import { ChevronDown, Menu, X, User, Plus, LogOut, Zap, Shield } from 'lucide-react'
import { useState, useEffect } from 'react'
import { formatEther, type Abi, type Address } from 'viem'
import { ConnectButton } from './ConnectButton'
import { AdminPanel } from './AdminPanel'
import { getSupportedChain, contractAddresses } from '@/config/contracts'
import { NFT_MARKETPLACE_ABI } from '@/contracts/abis'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/create', label: 'Create' },
  { href: '/sell', label: 'Sell' },
]

export function Navbar() {
  const pathname = usePathname()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const chain = getSupportedChain(chainId)

  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { data: contractOwner } = useReadContract({
    address: marketplaceAddress,
    abi: NFT_MARKETPLACE_ABI as Abi,
    functionName: 'owner',
    query: { enabled: !!marketplaceAddress && isConnected },
  })

  const isOwner = !!(
    address &&
    contractOwner &&
    address.toLowerCase() === (contractOwner as string).toLowerCase()
  )

  // Defer wallet-dependent UI until after hydration.
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menus when navigating
  useEffect(() => {
    setMobileMenuOpen(false)
    setProfileOpen(false)
    setAdminOpen(false)
  }, [pathname])

  // Close menus with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setProfileOpen(false)
      setAdminOpen(false)
      setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'border-b border-border/50 bg-background/80 shadow-[0_1px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="container mx-auto flex h-16 items-center justify-between px-4" aria-label="Main">
        {/* Logo + Nav Links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5" aria-label="NexusNFT home">
            <div className="relative h-8 w-8 shrink-0">
              <div className="h-8 w-8 rotate-45 rounded-lg bg-gradient-to-br from-primary to-accent transition-transform duration-200 group-hover:scale-110" />
              <div className="absolute inset-0 h-8 w-8 rotate-45 rounded-lg bg-gradient-to-br from-primary to-accent opacity-40 blur-md transition-opacity duration-200 group-hover:opacity-70" />
            </div>
            <span className="font-display text-xl font-bold gradient-text">NexusNFT</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {mounted && isConnected ? (
            <>
              <Link href="/create" className="btn-primary hidden gap-2 text-sm sm:flex">
                <Plus className="w-4 h-4" />
                Create
              </Link>

              {/* Admin button — only visible to contract owner */}
              {isOwner && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setAdminOpen(!adminOpen)
                      setProfileOpen(false)
                    }}
                    title="Admin Panel"
                    aria-label="Admin panel"
                    aria-expanded={adminOpen}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      adminOpen
                        ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
                        : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-yellow-500/30 hover:bg-yellow-500/10 hover:text-yellow-400'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden text-sm font-medium sm:inline">Admin</span>
                  </button>
                  {adminOpen && (
                    <AdminPanel onClose={() => setAdminOpen(false)} />
                  )}
                </div>
              )}

              <div className="relative">
                <button
                  onClick={() => {
                    setProfileOpen(!profileOpen)
                    setAdminOpen(false)
                  }}
                  aria-label="Account menu"
                  aria-expanded={profileOpen}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:border-border hover:bg-muted/50"
                >
                  <span className="relative h-6 w-6" aria-hidden>
                    <span className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-accent" />
                    <span className="absolute inset-0 h-6 w-6 rounded-full bg-gradient-to-br from-primary to-accent opacity-40 blur-sm" />
                  </span>
                  <span className="hidden text-sm font-medium sm:inline">{formatAddress(address!)}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                      profileOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                  />
                </button>

                {profileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileOpen(false)}
                      aria-hidden
                    />
                    <div className="absolute right-0 z-50 mt-2 w-64 animate-scale-in overflow-hidden rounded-xl border border-border/50 bg-card/95 shadow-[0_8px_48px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                      {/* Profile header */}
                      <div className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5 px-4 py-3">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />
                          <p className="font-mono text-sm font-semibold">{formatAddress(address!)}</p>
                        </div>
                        {balance && (
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {parseFloat(formatEther(balance.value)).toFixed(4)}{' '}
                            <span className="text-primary/80">{balance.symbol}</span>
                          </p>
                        )}
                        {chain && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Zap className="w-3 h-3 text-primary" aria-hidden />
                            {chain.name}
                          </p>
                        )}
                      </div>

                      <div className="p-2">
                        <Link
                          href={`/profile/${address}`}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setProfileOpen(false)}
                        >
                          <User className="w-4 h-4 text-primary" aria-hidden />
                          My Profile
                        </Link>

                        <button
                          onClick={() => {
                            disconnect()
                            setProfileOpen(false)
                          }}
                          className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <LogOut className="w-4 h-4" aria-hidden />
                          Disconnect
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <ConnectButton />
          )}

          <button
            className="rounded-lg p-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="animate-fade-in border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount, useDisconnect, useBalance, useChainId } from 'wagmi'
import { ChevronDown, Menu, X, User, Plus, LogOut, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import { formatEther } from 'viem'
import { ConnectButton } from './ConnectButton'
import { getSupportedChain } from '@/config/contracts'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/create', label: 'Create' },
]

export function Navbar() {
  const pathname = usePathname()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const chain = getSupportedChain(chainId)

  // Defer wallet-dependent UI until after hydration.
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'border-b border-border/50 bg-background/80 backdrop-blur-xl shadow-[0_1px_24px_rgba(0,0,0,0.5)]'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo + Nav Links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent rotate-45 group-hover:scale-110 transition-transform duration-200" />
              <div className="absolute inset-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent opacity-40 blur-md group-hover:opacity-70 transition-opacity duration-200 rotate-45" />
            </div>
            <span className="text-xl font-bold gradient-text">NexusNFT</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0.5 left-4 right-4 h-px rounded-full bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {mounted && isConnected ? (
            <>
              <Link href="/create" className="hidden sm:flex btn-primary gap-2 text-sm">
                <Plus className="w-4 h-4" />
                Create
              </Link>

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-border px-3 py-2 transition-all duration-200"
                >
                  <div className="relative w-6 h-6">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent" />
                    <div className="absolute inset-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent opacity-40 blur-sm" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{formatAddress(address!)}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                      profileOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {profileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 z-50 overflow-hidden rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-[0_8px_48px_rgba(0,0,0,0.6)] animate-scale-in">
                      {/* Profile header */}
                      <div className="px-4 py-3 border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          <p className="text-sm font-semibold font-mono">{formatAddress(address!)}</p>
                        </div>
                        {balance && (
                          <p className="text-xs text-muted-foreground">
                            {parseFloat(formatEther(balance.value)).toFixed(4)}{' '}
                            <span className="text-primary/80">{balance.symbol}</span>
                          </p>
                        )}
                        {chain && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-primary" />
                            {chain.name}
                          </p>
                        )}
                      </div>

                      <div className="p-2">
                        <Link
                          href={`/profile/${address}`}
                          className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm rounded-lg hover:bg-muted/60 transition-colors"
                          onClick={() => setProfileOpen(false)}
                        >
                          <User className="w-4 h-4 text-primary" />
                          My Profile
                        </Link>

                        <button
                          onClick={() => {
                            disconnect()
                            setProfileOpen(false)
                          }}
                          className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm rounded-lg hover:bg-destructive/10 text-destructive transition-colors mt-0.5"
                        >
                          <LogOut className="w-4 h-4" />
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
            className="md:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl animate-fade-in">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
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

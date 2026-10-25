'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Home, Compass, PlusCircle, Tag, User, Wallet } from 'lucide-react'

// Mobile-only bottom navigation (desktop uses the top navbar). Max 5 items —
// Profile appears when connected, otherwise a Connect Wallet action.
export function BottomNav() {
  const pathname = usePathname()
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  const items = [
    { href: '/', label: 'Home', Icon: Home },
    { href: '/explore', label: 'Explore', Icon: Compass },
    { href: '/create', label: 'Create', Icon: PlusCircle },
    { href: '/sell', label: 'Sell', Icon: Tag },
  ]

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-background/90 backdrop-blur-xl md:hidden pb-safe"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {items.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive(href) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={isActive(href) ? 2.2 : 1.8} aria-hidden />
            {label}
          </Link>
        ))}

        {isConnected && address ? (
          <Link
            href={`/profile/${address}`}
            aria-current={isActive(`/profile/${address}`) ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              pathname.startsWith('/profile')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-5 w-5" strokeWidth={pathname.startsWith('/profile') ? 2.2 : 1.8} aria-hidden />
            Profile
          </Link>
        ) : (
          <button
            onClick={openConnectModal}
            className="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Wallet className="h-5 w-5" strokeWidth={1.8} aria-hidden />
            Wallet
          </button>
        )}
      </div>
    </nav>
  )
}

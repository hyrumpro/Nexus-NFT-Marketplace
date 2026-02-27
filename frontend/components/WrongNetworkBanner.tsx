'use client'

import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'

export function WrongNetworkBanner() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Wait for client mount to avoid hydration mismatch, and only show
  // when a wallet is connected on a chain other than Sepolia.
  if (!mounted || !isConnected || chainId === sepolia.id) return null

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            Wrong network — this marketplace runs on <strong>Sepolia</strong> testnet.
          </span>
        </div>
        <button
          onClick={() => switchChain({ chainId: sepolia.id })}
          disabled={isPending}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors flex-shrink-0 disabled:opacity-60"
        >
          {isPending
            ? <><Loader2 className="w-3 h-3 animate-spin" />Switching…</>
            : 'Switch to Sepolia'
          }
        </button>
      </div>
    </div>
  )
}

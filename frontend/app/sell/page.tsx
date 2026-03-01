'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Tag, Loader2 } from 'lucide-react'
import { ConnectButton } from '@/components/ConnectButton'

export default function SellPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()

  useEffect(() => {
    if (isConnected && address) {
      router.replace(`/profile/${address}`)
    }
  }, [isConnected, address, router])

  if (isConnected && address) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-10 text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-6">
          <Tag className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-3">Sell Your NFTs</h1>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          Connect your wallet to list your NFTs for sale on the marketplace.
        </p>
        <ConnectButton />
      </div>
    </div>
  )
}

'use client'

import { useConnect, useAccount } from 'wagmi'
import { Wallet, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { injected } from 'wagmi/connectors'

export function ConnectButton() {
  const { connect, isPending, connectors } = useConnect()
  const [showConnectors, setShowConnectors] = useState(false)

  const handleConnect = () => {
    const metamask = connectors.find(c => c.name.toLowerCase().includes('meta'))
    if (metamask) {
      connect({ connector: metamask })
    } else {
      setShowConnectors(true)
    }
  }

  if (showConnectors) {
    return (
      <div className="flex gap-2">
        {connectors.slice(0, 3).map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="btn-outline text-xs"
          >
            {connector.name}
          </button>
        ))}
      </div>
    )
  }

  return (
    <button 
      onClick={handleConnect} 
      disabled={isPending}
      className="btn-primary gap-2"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Wallet className="w-4 h-4" />
      )}
      Connect Wallet
    </button>
  )
}

export function SimpleConnectButton() {
  const { connect, isPending, connectors } = useConnect()

  return (
    <button 
      onClick={() => connect({ connector: connectors[0] })} 
      disabled={isPending}
      className="btn-outline"
    >
      {isPending ? 'Connecting...' : 'Connect'}
    </button>
  )
}

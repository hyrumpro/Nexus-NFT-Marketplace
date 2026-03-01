'use client'

import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Wallet } from 'lucide-react'

export function ConnectButton() {
  const { openConnectModal } = useConnectModal()

  return (
    <button
      onClick={openConnectModal}
      disabled={!openConnectModal}
      className="btn-primary gap-2"
    >
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </button>
  )
}

export function SimpleConnectButton() {
  const { openConnectModal } = useConnectModal()

  return (
    <button
      onClick={openConnectModal}
      disabled={!openConnectModal}
      className="btn-outline"
    >
      Connect
    </button>
  )
}

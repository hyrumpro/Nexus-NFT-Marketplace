import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia } from 'wagmi/chains'
import { http } from 'wagmi'

export const config = getDefaultConfig({
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'NexusNFT',
  // WalletConnect project ID — required for WalletConnect v2 and mobile wallets
  // Get a free project ID at https://cloud.walletconnect.com
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
  chains: [sepolia],
  // ssr: true prevents wagmi from accessing browser-only APIs during Next.js SSR
  ssr: true,
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || undefined),
  },
})

declare module 'wagmi' {
  export interface Register {
    config: typeof config
  }
}

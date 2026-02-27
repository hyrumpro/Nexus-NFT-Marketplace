import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || ''

export const config = createConfig({
  chains: [sepolia],
  // ssr: true prevents wagmi from accessing browser-only APIs (indexedDB, localStorage)
  // during Next.js server-side rendering, which causes "indexedDB is not defined" errors.
  ssr: true,
  connectors: [
    injected(),
    // Only include WalletConnect when a project ID is actually configured —
    // passing an empty string causes 400/403 errors from WalletConnect servers.
    ...(walletConnectProjectId
      ? [walletConnect({ projectId: walletConnectProjectId })]
      : []),
    coinbaseWallet({
      appName: process.env.NEXT_PUBLIC_APP_NAME || 'NexusNFT',
    }),
  ],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || undefined),
  },
})

declare module 'wagmi' {
  export interface Register {
    config: typeof config
  }
}

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'

// getDefaultConfig instantiates WalletConnect's EthereumProvider at module
// evaluation time, which accesses the browser-only indexedDB API. Next.js 16
// uses Turbopack for production builds (webpack() externals are ignored).
// Guard with typeof window so WalletConnect is only instantiated on the client;
// SSR receives a minimal Node.js-safe wagmi config instead.
export const config = (
  typeof window !== 'undefined'
    ? getDefaultConfig({
        appName: process.env.NEXT_PUBLIC_APP_NAME || 'NexusNFT',
        projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
        chains: [sepolia],
        ssr: true,
        transports: {
          [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || undefined),
        },
      })
    : createConfig({
        chains: [sepolia],
        transports: { [sepolia.id]: http() },
        ssr: true,
      })
) as ReturnType<typeof getDefaultConfig>

declare module 'wagmi' {
  export interface Register {
    config: typeof config
  }
}

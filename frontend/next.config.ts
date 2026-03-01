import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Pinata IPFS gateway — primary gateway for all NFT images/metadata
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        pathname: '/**',
      },
      // Public IPFS gateways — NFT metadata may already contain these URLs
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'nftstorage.link',
        pathname: '/**',
      },
    ],
  },

  turbopack: {
    resolveAlias: {
      // Stub out Node.js-only packages that WalletConnect and wagmi reference
      // but do not use in a browser environment. Equivalent of webpack false aliases.
      'pino-pretty': './lib/empty.ts',
      '@react-native-async-storage/async-storage': './lib/empty.ts',
    },
  },

  // WalletConnect's ethereum-provider accesses indexedDB at module-init time,
  // which crashes Next.js SSR. Marking these packages as externals prevents
  // them from being bundled into the server-side render output.
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
}

export default nextConfig

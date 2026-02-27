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

  webpack: (config) => {
    // Stub out optional Node/React-Native modules that WalletConnect and
    // MetaMask SDK reference but are not needed in a browser environment.
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': false,
      '@react-native-async-storage/async-storage': false,
    }
    return config
  },
}

export default nextConfig

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Navbar } from '@/components/Navbar'
import { WrongNetworkBanner } from '@/components/WrongNetworkBanner'
import { Footer } from '@/components/Footer'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'NexusNFT - Decentralized NFT Marketplace',
  description: 'Buy, sell, and discover rare digital assets on NexusNFT - a decentralized NFT marketplace with low fees.',
  keywords: ['NFT', 'marketplace', 'blockchain', 'crypto', 'digital art', 'collectibles'],
  authors: [{ name: 'NexusNFT' }],
  openGraph: {
    title: 'NexusNFT - Decentralized NFT Marketplace',
    description: 'Buy, sell, and discover rare digital assets',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <Providers>
          <Navbar />
          <WrongNetworkBanner />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

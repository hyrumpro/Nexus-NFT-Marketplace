import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Navbar } from '@/components/Navbar'
import { BottomNav } from '@/components/BottomNav'
import { WrongNetworkBanner } from '@/components/WrongNetworkBanner'
import { Footer } from '@/components/Footer'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Extends the webview under notches/gesture bars so pb-safe paddings work
  viewportFit: 'cover',
}

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
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <Providers>
          <Navbar />
          <WrongNetworkBanner />
          {/* Reserve space for the mobile bottom navigation */}
          <main className="flex-1 pb-safe-lg md:pb-0">
            {children}
          </main>
          <Footer />
          <BottomNav />
        </Providers>
      </body>
    </html>
  )
}

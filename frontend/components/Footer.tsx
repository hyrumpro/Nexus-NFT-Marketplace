import Link from 'next/link'
import { Twitter, Github, MessageCircle, Zap } from 'lucide-react'

export function Footer() {
  return (
    <footer className="relative mt-auto border-t border-border/40">
      {/* Gradient top accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <div className="relative w-8 h-8 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent rotate-45 group-hover:scale-110 transition-transform duration-200" />
                <div className="absolute inset-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent opacity-30 blur-md rotate-45" />
              </div>
              <span className="text-xl font-bold gradient-text">NexusNFT</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A decentralized NFT marketplace with low fees and true blockchain ownership.
            </p>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="font-semibold mb-4 text-xs uppercase tracking-widest text-muted-foreground">
              Marketplace
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/explore" className="text-muted-foreground hover:text-primary transition-colors">
                  Explore
                </Link>
              </li>
              <li>
                <Link href="/explore?sort=trending" className="text-muted-foreground hover:text-primary transition-colors">
                  Trending
                </Link>
              </li>
              <li>
                <Link href="/explore?sort=new" className="text-muted-foreground hover:text-primary transition-colors">
                  New Listings
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4 text-xs uppercase tracking-widest text-muted-foreground">
              Resources
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  API
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-semibold mb-4 text-xs uppercase tracking-widest text-muted-foreground">
              Community
            </h4>
            <div className="flex gap-2.5">
              <a
                href="#"
                className="w-9 h-9 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                aria-label="Discord"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} NexusNFT. All rights reserved.</p>
          <div className="flex items-center gap-1.5 text-xs">
            <Zap className="w-3 h-3 text-primary" />
            <span>Powered by Ethereum</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

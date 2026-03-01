'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { X, Github, MapPin, GraduationCap, Blocks, Database, Cpu, Globe } from 'lucide-react'

const STORAGE_KEY = 'portfolio_intro_seen'

const SKILL_GROUPS = [
  {
    label: 'Smart Contracts',
    icon: Blocks,
    skills: ['Solidity', 'ERC-721', 'Auctions', 'Royalties'],
  },
  {
    label: 'Indexing & API',
    icon: Database,
    skills: ['The Graph', 'GraphQL', 'Subgraph mapping'],
  },
  {
    label: 'Web3 Frontend',
    icon: Cpu,
    skills: ['wagmi', 'viem', 'RainbowKit', 'IPFS / Pinata'],
  },
  {
    label: 'Full Stack',
    icon: Globe,
    skills: ['Next.js 14', 'TanStack Query', 'TypeScript', 'Tailwind CSS'],
  },
]

function PortfolioModalInner() {
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('ref') === 'portfolio') {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpen(true)
      }
    }
  }, [searchParams])

  if (!open) return null

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-lg pointer-events-auto animate-scale-in">
          {/* Outer glow */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/50 via-transparent to-accent/50 blur-sm" />

          <div className="relative rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-[0_32px_80px_rgba(0,0,0,0.7)] overflow-hidden">
            {/* Rainbow top bar */}
            <div className="h-[3px] w-full bg-gradient-to-r from-primary via-accent to-primary" />

            {/* Header — avatar + name */}
            <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl font-bold text-white select-none">
                    HD
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent opacity-30 blur-md" />
                </div>
                <div>
                  <h2 className="font-bold text-base leading-snug">Hyrum David Perez Abanto</h2>
                  <p className="text-sm gradient-text font-semibold mt-0.5">Full Stack Developer</p>
                  <p className="text-xs text-muted-foreground mt-0.5">MERN · Next.js · Web3 &amp; AI</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Meta */}
            <div className="px-6 pb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-primary shrink-0" />
                Área metropolitana de Trujillo
              </span>
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-3 h-3 text-primary shrink-0" />
                Brigham Young University – Idaho
              </span>
            </div>

            <div className="px-6 pb-6">
              <div className="border-t border-border/40 mb-5" />

              {/* Pitch */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                This is a{' '}
                <span className="text-foreground font-medium">production-grade Web3 marketplace</span>{' '}
                built end-to-end — Solidity smart contracts on Sepolia, a custom subgraph for real-time
                indexing, and a polished Next.js frontend with full wallet integration.
              </p>

              {/* Skills grid */}
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Skills showcased in this project
              </p>

              <div className="grid grid-cols-2 gap-2">
                {SKILL_GROUPS.map(({ label, icon: Icon, skills }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground">{label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {skills.map((s) => (
                        <span
                          key={s}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-primary/8 border border-primary/15 text-primary/80"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-5">
                <a
                  href="https://github.com/HeyChriss"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary gap-2 flex-1 justify-center text-sm"
                >
                  <Github className="w-4 h-4" />
                  GitHub Profile
                </a>
                <button
                  onClick={handleClose}
                  className="btn-outline text-sm px-5"
                >
                  Explore Site
                </button>
              </div>

              <p className="text-[11px] text-muted-foreground text-center mt-3 opacity-60">
                This introduction appears once per visitor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export function PortfolioModal() {
  return (
    <Suspense fallback={null}>
      <PortfolioModalInner />
    </Suspense>
  )
}

import { NextRequest, NextResponse } from 'next/server'

// Server-side IPFS gateway proxy.
//
// Public gateways (ipfs.io, gateway.pinata.cloud, …) either send no
// Access-Control-Allow-Origin or set Cross-Origin-Resource-Policy: same-origin,
// so the browser blocks direct fetch() and <img> loads from another origin.
// Everything goes through this same-origin route instead: /api/ipfs/<cid>[/<path>].
// The two static upload routes (json/, file/) take precedence over this catch-all.
const GATEWAYS = [
  'https://ipfs.io',
  'https://dweb.link',
  'https://w3s.link',
  'https://gateway.pinata.cloud',
  'https://nftstorage.link',
  'https://4everland.io',
]

const GATEWAY_TIMEOUT_MS = 10_000
// Public gateways rate-limit aggressively (429). A second sweep after a short
// backoff usually gets through — gateway 429s respond fast, so this is cheap.
const RATE_LIMIT_RETRY_SWEEPS = 2
const RATE_LIMIT_BACKOFF_MS = 1_500

function extractIpfsPath(segments: string[]): string | null {
  const parts = segments
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s)
      } catch {
        return s
      }
    })

  // Allow an optional leading "ipfs" segment (/api/ipfs/ipfs/Qm…)
  if (parts.length > 0 && parts[0].toLowerCase() === 'ipfs') parts.shift()

  const joined = parts.join('/')
  if (!joined || joined.includes('..') || joined.includes('://')) return null
  return joined
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params
  const ipfsPath = extractIpfsPath(path ?? [])

  if (!ipfsPath) {
    return NextResponse.json({ error: 'Invalid IPFS path' }, { status: 400 })
  }

  for (let sweep = 0; sweep < RATE_LIMIT_RETRY_SWEEPS; sweep++) {
    if (sweep > 0) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_BACKOFF_MS))
    }

    for (const gateway of GATEWAYS) {
      try {
        const upstream = await fetch(`${gateway}/ipfs/${ipfsPath}`, {
          headers: { Accept: '*/*' },
          // Content is content-addressed, but gateways occasionally serve stale
          // or errored responses — don't cache failures upstream.
          cache: 'no-store',
          signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
        })

        if (!upstream.ok || !upstream.body) continue

        return new NextResponse(upstream.body, {
          status: 200,
          headers: {
            'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
            // Immutable CIDs — cache hard at the edge and in the browser
            'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800',
            'X-IPFS-Gateway': new URL(gateway).hostname,
          },
        })
      } catch {
        // Timeout or network error — fall through to the next gateway
      }
    }
  }

  return NextResponse.json(
    { error: 'Failed to fetch IPFS content from all gateways' },
    { status: 502 }
  )
}

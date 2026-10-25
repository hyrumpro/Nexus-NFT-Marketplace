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

// Per-gateway budget for response HEADERS. Gateways race in parallel, so this
// bounds latency by the fastest gateway rather than the sum of failures.
const GATEWAY_TIMEOUT_MS = 8_000
// Guard for draining the winner's body (large/slow images).
const BODY_TIMEOUT_MS = 12_000
// Total budget for finding content across sweeps. Public gateways rate-limit
// (429) in bursts; those fail fast, so quick extra sweeps usually get through.
const SWEEP_BACKOFF_MS = 1_000
const SWEEPS_DEADLINE_MS = 12_000

interface GatewayAttempt {
  res: Response
  ctl: AbortController
}

interface Resolved {
  body: ArrayBuffer
  contentType: string
}

// Concurrent requests for the same CID share one gateway race per instance.
const inflight = new Map<string, Promise<Resolved | null>>()

function attemptGateway(gateway: string, ipfsPath: string) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), GATEWAY_TIMEOUT_MS)
  const promise: Promise<GatewayAttempt | null> = (async () => {
    try {
      const res = await fetch(`${gateway}/ipfs/${ipfsPath}`, {
        headers: { Accept: '*/*' },
        // Content is content-addressed, but gateways occasionally serve stale
        // or errored responses — don't cache failures upstream.
        cache: 'no-store',
        signal: ctl.signal,
      })
      if (!res.ok || !res.body) return null
      return { res, ctl }
    } catch {
      return null
    } finally {
      // Headers arrived (or failed) — the body gets its own drain guard
      clearTimeout(timer)
    }
  })()
  return { promise, ctl }
}

// Resolves with the first non-null attempt, or null once all attempts fail.
function firstSuccessful<T>(attempts: Promise<T | null>[]): Promise<T | null> {
  return new Promise((resolve) => {
    if (attempts.length === 0) {
      resolve(null)
      return
    }
    let pending = attempts.length
    let done = false
    for (const attempt of attempts) {
      attempt
        .then((value) => {
          if (done) return
          if (value) {
            done = true
            resolve(value)
            return
          }
          if (--pending === 0) {
            done = true
            resolve(null)
          }
        })
        .catch(() => {
          if (done) return
          if (--pending === 0) {
            done = true
            resolve(null)
          }
        })
    }
  })
}

async function sweepGateways(ipfsPath: string): Promise<Resolved | null> {
  const deadline = Date.now() + SWEEPS_DEADLINE_MS

  while (Date.now() < deadline) {
    const attempts = GATEWAYS.map((g) => attemptGateway(g, ipfsPath))
    const winner = await firstSuccessful(attempts.map((a) => a.promise))

    if (winner) {
      // Stop the losing requests; the winner's controller must stay live
      // until its body is drained.
      for (const a of attempts) {
        if (a.ctl !== winner.ctl) a.ctl.abort()
      }

      const body = await Promise.race([
        winner.res.arrayBuffer(),
        new Promise<null>((r) => setTimeout(() => r(null), BODY_TIMEOUT_MS)),
      ])

      if (body) {
        return {
          body,
          contentType: winner.res.headers.get('content-type') ?? 'application/octet-stream',
        }
      }
      // Body stalled — kill it and let the next sweep try again
      winner.ctl.abort()
    }

    if (Date.now() + SWEEP_BACKOFF_MS >= deadline) break
    await new Promise((r) => setTimeout(r, SWEEP_BACKOFF_MS))
  }

  return null
}

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

  let pending = inflight.get(ipfsPath)
  if (!pending) {
    pending = sweepGateways(ipfsPath)
    inflight.set(ipfsPath, pending)
    void pending.then(
      () => inflight.delete(ipfsPath),
      () => inflight.delete(ipfsPath)
    )
  }
  const resolved = await pending

  if (!resolved) {
    return NextResponse.json(
      { error: 'Failed to fetch IPFS content from all gateways' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return new NextResponse(resolved.body, {
    status: 200,
    headers: {
      'Content-Type': resolved.contentType,
      // Immutable CIDs — cache hard at the edge and in the browser
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800',
    },
  })
}

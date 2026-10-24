// ─── IPFS gateway handling ─────────────────────────────────────────────────────
// Browsers cannot read most public IPFS gateways directly: ipfs.io sends no
// Access-Control-Allow-Origin and Cross-Origin-Resource-Policy: same-origin,
// which blocks both fetch() and <img> loads from other origins (the CORS +
// ERR_BLOCKED_BY_RESPONSE errors). All IPFS reads therefore resolve to our
// same-origin proxy at /api/ipfs/*, which fans out across public gateways.
const IPFS_PROXY_BASE = '/api/ipfs'

// Escape hatch for setups with a CORS-enabled dedicated gateway (e.g. a paid
// Pinata subdomain). When set, URLs point straight at it instead of the proxy.
const DIRECT_GATEWAY = process.env.NEXT_PUBLIC_IPFS_DIRECT_GATEWAY?.replace(/\/+$/, '')

// Gateway hostnames whose /ipfs/<path> URLs are safe to rewrite into the proxy
const KNOWN_GATEWAY_HOSTS = new Set([
  'ipfs.io',
  'dweb.link',
  'w3s.link',
  'gateway.pinata.cloud',
  'nftstorage.link',
  'cloudflare-ipfs.com',
  'cf-ipfs.com',
])

function ipfsUrl(path: string): string {
  return DIRECT_GATEWAY
    ? `${DIRECT_GATEWAY}/ipfs/${path}`
    : `${IPFS_PROXY_BASE}/${path}`
}

export function ipfsToHttp(uri: string | undefined): string {
  if (!uri) return ''

  // Idempotency guard: metadata image URLs may already have been normalized by
  // fetchNFTMetadata before a component applies ipfsToHttp again.
  if (uri.startsWith(`${IPFS_PROXY_BASE}/`)) return uri

  // ipfs://<cid>/<path> — the /ipfs/ segment is usually omitted in this scheme
  if (uri.startsWith('ipfs://')) {
    return ipfsUrl(uri.slice('ipfs://'.length).replace(/^ipfs\//, ''))
  }

  if (uri.startsWith('ipfs/')) {
    return ipfsUrl(uri.slice('ipfs/'.length))
  }

  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    try {
      const url = new URL(uri)
      const pathMatch = url.pathname.match(/^\/ipfs\/(.+)$/)
      if (pathMatch && KNOWN_GATEWAY_HOSTS.has(url.hostname)) {
        return ipfsUrl(pathMatch[1])
      }
      return uri
    } catch {
      return uri
    }
  }

  // Bare CID or CID/<path>
  return ipfsUrl(uri.replace(/^\/+/, ''))
}

export interface NFTMetadata {
  name?: string
  description?: string
  image?: string
  animation_url?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
    display_type?: string
  }>
  properties?: Record<string, any>
}

export async function fetchNFTMetadata(tokenURI: string): Promise<NFTMetadata | null> {
  try {
    const httpUrl = ipfsToHttp(tokenURI)
    if (!httpUrl) return null

    const response = await fetch(httpUrl)
    if (!response.ok) return null

    const metadata = await response.json()

    if (metadata.image) {
      metadata.image = ipfsToHttp(metadata.image)
    }
    if (metadata.animation_url) {
      metadata.animation_url = ipfsToHttp(metadata.animation_url)
    }

    return metadata
  } catch (error) {
    console.error('Failed to fetch NFT metadata:', error)
    return null
  }
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function formatPrice(price: string | bigint, decimals = 18): string {
  const priceBigInt = typeof price === 'string' ? BigInt(price) : price
  const divisor = BigInt(10 ** decimals)
  const whole = priceBigInt / divisor
  const remainder = priceBigInt % divisor
  const fractional = remainder.toString().padStart(decimals, '0').slice(0, 4)
  return `${whole}.${fractional}`.replace(/\.?0+$/, '') || '0'
}

export const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud'

export function ipfsToHttp(uri: string | undefined): string {
  if (!uri) return ''
  
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', `${PINATA_GATEWAY}/ipfs/`)
  }
  
  if (uri.startsWith('ipfs/')) {
    return uri.replace('ipfs/', `${PINATA_GATEWAY}/ipfs/`)
  }

  if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
    return `${PINATA_GATEWAY}/ipfs/${uri}`
  }
  
  return uri
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
    
    const response = await fetch(httpUrl, {
      next: { revalidate: 3600 }
    })
    
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

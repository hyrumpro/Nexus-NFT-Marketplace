'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

// The proxy can transiently 502 when public gateways rate-limit. Retry a
// couple of times with a cache-buster before falling back to the placeholder.
const MAX_RETRIES = 2

interface NftImageProps {
  /** Already-normalized URL (e.g. /api/ipfs/<cid>) — empty renders fallback */
  src: string
  alt: string
  sizes?: string
  /** Rendered when src is empty or every retry failed */
  fallback: React.ReactNode
  className?: string
}

/**
 * IPFS media with shimmer-on-load, fade-in, and automatic retries so images
 * recover from transient gateway failures instead of getting stuck. Must be
 * placed inside a `relative` container (renders with `fill`).
 */
export function NftImage({ src, alt, sizes, fallback, className = '' }: NftImageProps) {
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  // Reset when a different image is requested
  useEffect(() => {
    setAttempt(0)
    setLoaded(false)
    setFailed(false)
  }, [src])

  if (!src || failed) return <>{fallback}</>

  const retrySrc = attempt > 0 ? `${src}${src.includes('?') ? '&' : '?'}r=${attempt}` : src

  return (
    <>
      <Image
        key={retrySrc}
        src={retrySrc}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-cover transition-opacity duration-500 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (attempt < MAX_RETRIES) {
            setAttempt((a) => a + 1)
          } else {
            setFailed(true)
          }
        }}
        unoptimized
      />
      {!loaded && (
        <div
          className="absolute inset-0 animate-shimmer bg-gradient-to-l from-transparent via-muted/50 to-transparent"
          aria-hidden
        />
      )}
    </>
  )
}

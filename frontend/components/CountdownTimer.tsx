'use client'

import { useEffect, useState } from 'react'

// Live ticking countdown. Renders '—' for the first frame to avoid a
// server/client hydration mismatch on Date.now().
export function CountdownTimer({
  to,
  className = '',
}: {
  /** Expiry as epoch seconds */
  to: number
  className?: string
}) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000))
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  if (now === null) return <span className={className}>—</span>

  const seconds = Math.max(0, to - now)
  if (seconds === 0) return <span className={className}>Ended</span>

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  let text: string
  if (days > 0) text = `${days}d ${hours}h`
  else if (hours > 0) text = `${hours}h ${mins}m`
  else text = `${mins}m ${secs}s`

  return (
    <span className={className} role="timer" aria-label={`Time remaining: ${text}`}>
      {text}
    </span>
  )
}

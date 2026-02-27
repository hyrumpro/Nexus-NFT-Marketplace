import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Accept both names: GRAPH_API_URL (preferred, server-only) and
  // NEXT_PUBLIC_GRAPH_API_URL (fallback for existing .env files)
  const graphUrl = process.env.GRAPH_API_URL || process.env.NEXT_PUBLIC_GRAPH_API_URL
  const graphKey = process.env.GRAPH_API_KEY

  // Strip a leading '=' in case the .env line was written with double == by mistake
  const cleanUrl = graphUrl?.startsWith('=') ? graphUrl.slice(1) : graphUrl

  if (!cleanUrl || cleanUrl.includes('your-subgraph-id')) {
    return NextResponse.json(
      { error: 'Graph API not configured. Set GRAPH_API_URL in your environment.' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (graphKey) {
      headers['Authorization'] = `Bearer ${graphKey}`
    }

    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Graph API error: ${res.statusText}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'GraphQL query failed' },
      { status: 500 }
    )
  }
}

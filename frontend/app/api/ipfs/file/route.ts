import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const apiKey = process.env.PINATA_API_KEY
  const apiSecret = process.env.PINATA_API_SECRET

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'IPFS not configured. Set PINATA_API_KEY and PINATA_API_SECRET in your environment.' },
      { status: 503 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const pinataForm = new FormData()
    pinataForm.append('file', file)

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
      },
      body: pinataForm,
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Pinata error: ${res.statusText}`, detail: text },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json({ ipfsHash: data.IpfsHash })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'File upload failed' },
      { status: 500 }
    )
  }
}

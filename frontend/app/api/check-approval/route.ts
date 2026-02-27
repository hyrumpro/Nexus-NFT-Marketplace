import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { sepolia, mainnet, polygon, arbitrum, optimism, base } from 'viem/chains'
import { ERC721_ABI } from '@/contracts/abis'

const chains = {
  1: mainnet,
  11155111: sepolia,
  137: polygon,
  42161: arbitrum,
  10: optimism,
  8453: base,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nftContract, owner, operator, chainId = 11155111 } = body

    if (!nftContract || !owner || !operator) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const chain = chains[chainId as keyof typeof chains] || sepolia
    
    const client = createPublicClient({
      chain,
      transport: http(process.env[`${chain.name.toUpperCase()}_RPC_URL`] || process.env.SEPOLIA_RPC_URL),
    })

    const isApproved = await client.readContract({
      address: nftContract,
      abi: ERC721_ABI,
      functionName: 'isApprovedForAll',
      args: [owner, operator],
    })

    return NextResponse.json({ isApproved })
  } catch (error: any) {
    console.error('Approval check error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check approval' },
      { status: 500 }
    )
  }
}

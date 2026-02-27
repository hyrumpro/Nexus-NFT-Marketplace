'use client'

import { useReadContract } from 'wagmi'
import { Address } from 'viem'
import { ERC721_ABI } from '@/contracts/abis'

export function useNFTContract(nftContract: Address | undefined, tokenId: bigint | undefined) {
  const { data: owner, refetch: refetchOwner, isLoading: isLoadingOwner } = useReadContract({
    address: nftContract,
    abi: ERC721_ABI,
    functionName: 'ownerOf',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: !!nftContract && tokenId !== undefined,
    },
  })

  const { data: tokenURI, isLoading: isLoadingURI } = useReadContract({
    address: nftContract,
    abi: ERC721_ABI,
    functionName: 'tokenURI',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: !!nftContract && tokenId !== undefined,
    },
  })

  const { data: name, isLoading: isLoadingName } = useReadContract({
    address: nftContract,
    abi: ERC721_ABI,
    functionName: 'name',
    query: {
      enabled: !!nftContract,
    },
  })

  const { data: symbol, isLoading: isLoadingSymbol } = useReadContract({
    address: nftContract,
    abi: ERC721_ABI,
    functionName: 'symbol',
    query: {
      enabled: !!nftContract,
    },
  })

  const { data: isApprovedForAll } = useReadContract({
    address: nftContract,
    abi: ERC721_ABI,
    functionName: 'isApprovedForAll',
    args: undefined,
    query: {
      enabled: false,
    },
  })

  return {
    owner: owner as Address | undefined,
    tokenURI: tokenURI as string | undefined,
    name: name as string | undefined,
    symbol: symbol as string | undefined,
    isLoading: isLoadingOwner || isLoadingURI || isLoadingName || isLoadingSymbol,
    refetchOwner,
  }
}

export function useERC721Approval(
  nftContract: Address | undefined, 
  owner: Address | undefined, 
  operator: Address | undefined
) {
  const { data: isApproved, refetch, isLoading } = useReadContract({
    address: nftContract,
    abi: ERC721_ABI,
    functionName: 'isApprovedForAll',
    args: owner && operator ? [owner, operator] : undefined,
    query: {
      enabled: !!nftContract && !!owner && !!operator,
    },
  })

  return {
    isApproved: isApproved as boolean | undefined,
    refetch,
    isLoading,
  }
}

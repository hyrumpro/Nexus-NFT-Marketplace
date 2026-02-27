'use client'

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { parseEther, formatEther, Address } from 'viem'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { NFT_MARKETPLACE_ABI, ERC721_ABI, NFT_COLLECTION_ABI } from '@/contracts/abis'
import { contractAddresses } from '@/config/contracts'
import { queryKeys } from '@/lib/graphql/client'
import { sepolia } from 'wagmi/chains'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

export function useMarketplace() {
  const chainId = useChainId()
  const { address } = useAccount()
  const queryClient = useQueryClient()

  const isWrongChain = chainId !== sepolia.id

  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Returns the marketplace address after validating chain/deployment state.
  // TypeScript can now narrow the return type to Address (never undefined).
  const requireCorrectChain = (): Address => {
    if (isWrongChain) throw new Error('Please switch to Sepolia testnet to use this marketplace')
    if (!marketplaceAddress) throw new Error('Marketplace not deployed on this chain')
    return marketplaceAddress
  }

  const invalidateListings = () => {
    queryClient.invalidateQueries({ queryKey: ['listings'] })
  }

  const listItem = async (
    nftContract: Address,
    tokenId: bigint,
    price: string,
    currency: Address = ZERO_ADDRESS
  ) => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'listItem',
      args: [nftContract, tokenId, parseEther(price), currency],
    })
  }

  const listItemWithExpiry = async (
    nftContract: Address,
    tokenId: bigint,
    price: string,
    durationSeconds: bigint,
    currency: Address = ZERO_ADDRESS
  ) => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'listItemWithExpiry',
      args: [nftContract, tokenId, parseEther(price), currency, durationSeconds],
    })
  }

  const cancelListing = async (nftContract: Address, tokenId: bigint) => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'cancelListing',
      args: [nftContract, tokenId],
    })
  }

  const buyItem = async (nftContract: Address, tokenId: bigint, price: string) => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'buyItem',
      args: [nftContract, tokenId],
      value: parseEther(price),
    })
  }

  const createAuction = async (
    nftContract: Address,
    tokenId: bigint,
    startingPrice: string,
    reservePrice: string,
    durationSeconds: bigint,
    currency: Address = ZERO_ADDRESS
  ) => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'createAuction',
      args: [nftContract, tokenId, parseEther(startingPrice), parseEther(reservePrice), durationSeconds, currency],
    })
  }

  const placeBid = async (nftContract: Address, tokenId: bigint, amount: string) => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'placeBid',
      args: [nftContract, tokenId],
      value: parseEther(amount),
    })
  }

  const cancelAuction = async (nftContract: Address, tokenId: bigint) => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'cancelAuction',
      args: [nftContract, tokenId],
    })
  }

  const updateListing = async (nftContract: Address, tokenId: bigint, newPrice: string) => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'updateListing',
      args: [nftContract, tokenId, parseEther(newPrice)],
    })
  }

  const withdrawBidRefund = async () => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'withdrawBidRefund',
      args: [],
    })
  }

  const settleAuction = async (nftContract: Address, tokenId: bigint) => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'settleAuction',
      args: [nftContract, tokenId],
    })
  }

  const makeOffer = async (
    nftContract: Address,
    tokenId: bigint,
    price: string,
    expiryTimestamp: bigint,
    currency: Address = ZERO_ADDRESS
  ) => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'makeOffer',
      args: [nftContract, tokenId, parseEther(price), expiryTimestamp, currency],
      value: currency === ZERO_ADDRESS ? parseEther(price) : undefined,
    })
  }

  const makeCollectionOffer = async (
    nftContract: Address,
    price: string,
    expiryTimestamp: bigint,
    currency: Address = ZERO_ADDRESS
  ) => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'makeCollectionOffer',
      args: [nftContract, parseEther(price), expiryTimestamp, currency],
      value: currency === ZERO_ADDRESS ? parseEther(price) : undefined,
    })
  }

  const acceptOffer = async (nftContract: Address, tokenId: bigint, buyer: Address) => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'acceptOffer',
      args: [nftContract, tokenId, buyer],
    })
  }

  const acceptCollectionOffer = async (nftContract: Address, tokenId: bigint, buyer: Address) => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'acceptCollectionOffer',
      args: [nftContract, tokenId, buyer],
    })
  }

  const cancelOffer = async (nftContract: Address, tokenId: bigint) => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'cancelOffer',
      args: [nftContract, tokenId],
    })
  }

  const cancelCollectionOffer = async (nftContract: Address) => {
    const addr = requireCorrectChain()
    writeContract({
      address: addr,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'cancelCollectionOffer',
      args: [nftContract],
    })
  }

  return {
    marketplaceAddress,
    isWrongChain,
    listItem,
    listItemWithExpiry,
    cancelListing,
    buyItem,
    createAuction,
    cancelAuction,
    placeBid,
    settleAuction,
    updateListing,
    makeOffer,
    makeCollectionOffer,
    acceptOffer,
    acceptCollectionOffer,
    cancelOffer,
    cancelCollectionOffer,
    withdrawBidRefund,
    invalidateListings,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  }
}

export function useApproval(nftContract: Address | undefined) {
  const { address } = useAccount()
  const chainId = useChainId()
  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { data: isApproved, refetch } = useReadContract({
    address: nftContract,
    abi: ERC721_ABI,
    functionName: 'isApprovedForAll',
    args: address && marketplaceAddress ? [address, marketplaceAddress] : undefined,
    query: {
      enabled: !!nftContract && !!address && !!marketplaceAddress,
    },
  })

  const { writeContract, data: hash, isPending, isSuccess } = useWriteContract()

  const approveAll = async () => {
    if (!marketplaceAddress) throw new Error('Marketplace not deployed')
    if (!nftContract) throw new Error('NFT contract required')

    writeContract({
      address: nftContract,
      abi: ERC721_ABI,
      functionName: 'setApprovalForAll',
      args: [marketplaceAddress, true],
    })
  }

  return {
    isApproved: isApproved as boolean,
    approveAll,
    refetch,
    hash,
    isPending,
    isSuccess,
  }
}

export { useNFTContract } from './useNFTContract'

export function useContractListing(nftContract: Address | undefined, tokenId: bigint) {
  const chainId = useChainId()
  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { data, isLoading, refetch } = useReadContract({
    address: marketplaceAddress,
    abi: NFT_MARKETPLACE_ABI,
    functionName: 'getListing',
    args: [nftContract, tokenId],
    query: {
      enabled: !!marketplaceAddress && !!nftContract && tokenId !== undefined,
    },
  })

  const listing = data as {
    nftContract: Address
    tokenId: bigint
    seller: Address
    price: bigint
    startTime: bigint
    endTime: bigint
    currency: Address
    active: boolean
    listingType: number
  } | undefined

  return {
    listing,
    price: listing?.price ? formatEther(listing.price) : undefined,
    isLoading,
    refetch,
  }
}

export function useContractAuction(nftContract: Address | undefined, tokenId: bigint) {
  const chainId = useChainId()
  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { data, isLoading, refetch } = useReadContract({
    address: marketplaceAddress,
    abi: NFT_MARKETPLACE_ABI,
    functionName: 'getAuction',
    args: [nftContract, tokenId],
    query: {
      enabled: !!marketplaceAddress && !!nftContract && tokenId !== undefined,
    },
  })

  const auction = data as {
    nftContract: Address
    tokenId: bigint
    seller: Address
    startingPrice: bigint
    reservePrice: bigint
    startTime: bigint
    endTime: bigint
    highestBidder: Address
    highestBid: bigint
    currency: Address
    status: number
  } | undefined

  return {
    auction,
    highestBid: auction?.highestBid ? formatEther(auction.highestBid) : undefined,
    isLoading,
    refetch,
  }
}

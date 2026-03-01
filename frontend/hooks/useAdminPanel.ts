'use client'

import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { type Abi, type Address } from 'viem'
import { useEffect } from 'react'
import { NFT_MARKETPLACE_ABI } from '@/contracts/abis'
import { contractAddresses } from '@/config/contracts'
import { sepolia } from 'wagmi/chains'

const abi = NFT_MARKETPLACE_ABI as Abi

export function useAdminPanel() {
  const chainId = useChainId()
  const { address } = useAccount()

  const isWrongChain = chainId !== sepolia.id

  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const enabled = !!marketplaceAddress && !isWrongChain

  const { data, refetch } = useReadContracts({
    contracts: marketplaceAddress
      ? [
          { address: marketplaceAddress, abi, functionName: 'owner' },
          { address: marketplaceAddress, abi, functionName: 'accumulatedFees' },
          { address: marketplaceAddress, abi, functionName: 'marketplaceFeePercent' },
          { address: marketplaceAddress, abi, functionName: 'feeRecipient' },
          { address: marketplaceAddress, abi, functionName: 'paused' },
        ]
      : [],
    query: { enabled },
  })

  const owner = data?.[0]?.result as Address | undefined
  const accumulatedFees = data?.[1]?.result as bigint | undefined
  const marketplaceFeePercent = data?.[2]?.result as bigint | undefined
  const feeRecipient = data?.[3]?.result as Address | undefined
  const paused = data?.[4]?.result as boolean | undefined

  const isOwner = !!(
    address &&
    owner &&
    address.toLowerCase() === owner.toLowerCase()
  )

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Refetch on-chain state after each confirmed TX
  useEffect(() => {
    if (isSuccess) refetch()
  }, [isSuccess, refetch])

  const requireOwner = (): Address => {
    if (isWrongChain) throw new Error('Please switch to Sepolia testnet')
    if (!marketplaceAddress) throw new Error('Marketplace not deployed on this chain')
    if (!isOwner) throw new Error('Only the marketplace owner can perform this action')
    return marketplaceAddress
  }

  const withdrawFees = () => {
    const addr = requireOwner()
    writeContract({ address: addr, abi, functionName: 'withdrawFees', args: [] })
  }

  const setFeePercent = (basisPoints: bigint) => {
    const addr = requireOwner()
    writeContract({ address: addr, abi, functionName: 'setMarketplaceFeePercent', args: [basisPoints] })
  }

  const updateFeeRecipient = (newRecipient: Address) => {
    const addr = requireOwner()
    writeContract({ address: addr, abi, functionName: 'setFeeRecipient', args: [newRecipient] })
  }

  const togglePause = () => {
    const addr = requireOwner()
    writeContract({
      address: addr,
      abi,
      functionName: paused ? 'unpause' : 'pause',
      args: [],
    })
  }

  return {
    isOwner,
    owner,
    accumulatedFees,
    marketplaceFeePercent,
    feeRecipient,
    paused,
    withdrawFees,
    setFeePercent,
    updateFeeRecipient,
    togglePause,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  }
}

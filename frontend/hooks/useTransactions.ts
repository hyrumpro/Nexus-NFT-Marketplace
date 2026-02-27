'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { parseEther, Address } from 'viem'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { NFT_MARKETPLACE_ABI, ERC721_ABI } from '@/contracts/abis'
import { contractAddresses } from '@/config/contracts'
import type { TransactionState } from '@/types'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

const INITIAL_STATE: TransactionState = {
  status: 'idle',
  step: 0,
  totalSteps: 1,
  message: '',
}

function getExplorerTxUrl(hash: string): string {
  // Only Sepolia is supported — always return Sepolia Etherscan
  return `https://sepolia.etherscan.io/tx/${hash}`
}

// ─── useBuyNFT ─────────────────────────────────────────────────────────────────
// Buyer sends ETH — no approval needed. Seller approved at listing time.
export function useBuyNFT() {
  const [state, setState] = useState<TransactionState>(INITIAL_STATE)
  const chainId = useChainId()
  const queryClient = useQueryClient()

  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  })

  const buy = useCallback(async (nftContract: Address, tokenId: bigint, price: string) => {
    if (!marketplaceAddress) {
      const msg = 'Marketplace not deployed on this chain'
      setState({ status: 'error', step: 0, totalSteps: 1, message: msg, error: msg })
      toast.error(msg)
      return
    }
    setState({ status: 'executing', step: 1, totalSteps: 1, message: 'Confirm purchase in your wallet…' })
    writeContract({
      address: marketplaceAddress,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'buyItem',
      args: [nftContract, tokenId],
      value: parseEther(price),
    })
  }, [marketplaceAddress, writeContract])

  useEffect(() => {
    if (hash && isConfirming) {
      setState(prev => ({ ...prev, status: 'confirming', message: 'Waiting for confirmation…' }))
    }
  }, [hash, isConfirming])

  useEffect(() => {
    if (isSuccess && hash) {
      const explorerUrl = getExplorerTxUrl(hash)
      setState({ status: 'success', step: 1, totalSteps: 1, hash, message: 'Purchase successful!' })
      toast.success('Purchase successful!', {
        action: { label: 'View on Etherscan', onClick: () => window.open(explorerUrl, '_blank') },
      })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      queryClient.invalidateQueries({ queryKey: ['nft'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
    }
  }, [isSuccess, hash, chainId, queryClient])

  useEffect(() => {
    if (isError) {
      setState(prev => ({ ...prev, status: 'error', message: 'Purchase failed' }))
      toast.error('Purchase failed')
    }
  }, [isError])

  const resetState = useCallback(() => {
    setState(INITIAL_STATE)
    reset()
  }, [reset])

  return { buy, resetState, state, hash, isPending, isConfirming, isSuccess, isError }
}

// ─── useListNFT ────────────────────────────────────────────────────────────────
// Seller must approve the marketplace before listing. Tracks approval phase
// separately so the listing success toast only fires for the real list tx.
export function useListNFT() {
  const [state, setState] = useState<TransactionState>(INITIAL_STATE)
  const chainId = useChainId()
  const { address } = useAccount()
  const queryClient = useQueryClient()
  const approvalPhaseRef = useRef(false)

  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  })

  const checkApproval = useCallback(async (nftContract: Address, owner: Address): Promise<boolean> => {
    if (!marketplaceAddress) return false
    try {
      const response = await fetch('/api/check-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nftContract, owner, operator: marketplaceAddress, chainId }),
      })
      const result = await response.json()
      return result.isApproved
    } catch {
      return false
    }
  }, [marketplaceAddress, chainId])

  const approve = useCallback(async (nftContract: Address) => {
    if (!marketplaceAddress) throw new Error('Marketplace not deployed on this chain')
    approvalPhaseRef.current = true
    setState({ status: 'approving', step: 1, totalSteps: 3, message: 'Approving marketplace to manage your NFTs…' })
    writeContract({
      address: nftContract,
      abi: ERC721_ABI,
      functionName: 'setApprovalForAll',
      args: [marketplaceAddress, true],
    })
  }, [marketplaceAddress, writeContract])

  const list = useCallback(async (
    nftContract: Address,
    tokenId: bigint,
    price: string,
    durationSeconds?: bigint
  ) => {
    if (!marketplaceAddress) {
      const msg = 'Marketplace not deployed on this chain'
      setState({ status: 'error', step: 0, totalSteps: 1, message: msg, error: msg })
      return
    }
    if (!address) {
      const msg = 'Wallet not connected'
      setState({ status: 'error', step: 0, totalSteps: 1, message: msg, error: msg })
      return
    }
    setState({ status: 'preparing', step: 1, totalSteps: 2, message: 'Checking approval status…' })
    try {
      const isApproved = await checkApproval(nftContract, address)
      if (!isApproved) {
        setState({ status: 'awaiting_approval', step: 1, totalSteps: 3, message: 'Approval required. Click Approve to continue.' })
        return { needsApproval: true }
      }
      setState({ status: 'executing', step: 2, totalSteps: 2, message: 'Creating listing…' })
      if (durationSeconds) {
        writeContract({ address: marketplaceAddress, abi: NFT_MARKETPLACE_ABI, functionName: 'listItemWithExpiry', args: [nftContract, tokenId, parseEther(price), ZERO_ADDRESS, durationSeconds] })
      } else {
        writeContract({ address: marketplaceAddress, abi: NFT_MARKETPLACE_ABI, functionName: 'listItem', args: [nftContract, tokenId, parseEther(price), ZERO_ADDRESS] })
      }
      return { needsApproval: false }
    } catch (err: any) {
      setState({ status: 'error', step: 0, totalSteps: 1, message: err.message || 'Failed to list', error: err.message })
      return { needsApproval: false, error: err.message }
    }
  }, [marketplaceAddress, address, checkApproval, writeContract])

  const continueAfterApproval = useCallback((
    nftContract: Address,
    tokenId: bigint,
    price: string,
    durationSeconds?: bigint
  ) => {
    if (!marketplaceAddress) return
    setState({ status: 'executing', step: 3, totalSteps: 3, message: 'Creating listing…' })
    if (durationSeconds) {
      writeContract({ address: marketplaceAddress, abi: NFT_MARKETPLACE_ABI, functionName: 'listItemWithExpiry', args: [nftContract, tokenId, parseEther(price), ZERO_ADDRESS, durationSeconds] })
    } else {
      writeContract({ address: marketplaceAddress, abi: NFT_MARKETPLACE_ABI, functionName: 'listItem', args: [nftContract, tokenId, parseEther(price), ZERO_ADDRESS] })
    }
  }, [marketplaceAddress, writeContract])

  useEffect(() => {
    if (hash && isConfirming) {
      setState(prev => ({ ...prev, status: 'confirming', message: 'Waiting for confirmation…' }))
    }
  }, [hash, isConfirming])

  useEffect(() => {
    if (isSuccess && hash) {
      if (approvalPhaseRef.current) {
        // Approval tx confirmed — not the list tx yet
        approvalPhaseRef.current = false
        setState(prev => ({ ...prev, status: 'approved', message: 'Approved! Creating listing…' }))
      } else {
        const explorerUrl = getExplorerTxUrl(hash)
        setState({ status: 'success', step: 2, totalSteps: 2, hash, message: 'NFT listed successfully!' })
        toast.success('NFT listed successfully!', {
          action: explorerUrl
            ? { label: 'View on Explorer', onClick: () => window.open(explorerUrl, '_blank') }
            : undefined,
        })
        queryClient.invalidateQueries({ queryKey: ['listings'] })
        queryClient.invalidateQueries({ queryKey: ['nft'] })
        queryClient.invalidateQueries({ queryKey: ['user'] })
      }
    }
  }, [isSuccess, hash, chainId, queryClient])

  useEffect(() => {
    if (isError) {
      setState(prev => ({ ...prev, status: 'error', message: 'Transaction failed' }))
      toast.error(approvalPhaseRef.current ? 'Approval failed' : 'Listing failed')
      approvalPhaseRef.current = false
    }
  }, [isError])

  const resetState = useCallback(() => {
    setState(INITIAL_STATE)
    approvalPhaseRef.current = false
    reset()
  }, [reset])

  return { list, approve, continueAfterApproval, checkApproval, resetState, state, hash, isPending, isConfirming, isSuccess, isError }
}

// ─── useMakeOffer ──────────────────────────────────────────────────────────────
export function useMakeOffer() {
  const [state, setState] = useState<TransactionState>(INITIAL_STATE)
  const chainId = useChainId()
  const queryClient = useQueryClient()

  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  })

  const makeOffer = useCallback(async (
    nftContract: Address,
    tokenId: bigint,
    price: string,
    expiryTimestamp: bigint
  ) => {
    if (!marketplaceAddress) {
      const msg = 'Marketplace not deployed on this chain'
      setState({ status: 'error', step: 0, totalSteps: 1, message: msg, error: msg })
      toast.error(msg)
      return
    }
    setState({ status: 'executing', step: 1, totalSteps: 1, message: 'Creating offer…' })
    try {
      writeContract({
        address: marketplaceAddress,
        abi: NFT_MARKETPLACE_ABI,
        functionName: 'makeOffer',
        args: [nftContract, tokenId, parseEther(price), expiryTimestamp, ZERO_ADDRESS],
        value: parseEther(price),
      })
    } catch (err: any) {
      setState({ status: 'error', step: 0, totalSteps: 1, message: err.message, error: err.message })
      toast.error('Failed to create offer')
    }
  }, [marketplaceAddress, writeContract])

  useEffect(() => {
    if (hash && isConfirming) {
      setState(prev => ({ ...prev, status: 'confirming', message: 'Waiting for confirmation…' }))
    }
  }, [hash, isConfirming])

  useEffect(() => {
    if (isSuccess && hash) {
      const explorerUrl = getExplorerTxUrl(hash)
      setState({ status: 'success', step: 1, totalSteps: 1, hash, message: 'Offer created successfully!' })
      toast.success('Offer created!', {
        action: { label: 'View on Etherscan', onClick: () => window.open(explorerUrl, '_blank') },
      })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
    }
  }, [isSuccess, hash, chainId, queryClient])

  useEffect(() => {
    if (isError) {
      setState(prev => ({ ...prev, status: 'error', message: 'Offer failed' }))
      toast.error('Offer transaction failed')
    }
  }, [isError])

  const resetState = useCallback(() => {
    setState(INITIAL_STATE)
    reset()
  }, [reset])

  return { makeOffer, resetState, state, hash, isPending, isConfirming, isSuccess, isError }
}

// ─── useAcceptOffer ────────────────────────────────────────────────────────────
// Same approval-phase pattern as useListNFT: seller must approve marketplace
// before accepting. The approval tx should not show "offer accepted" toast.
export function useAcceptOffer() {
  const [state, setState] = useState<TransactionState>(INITIAL_STATE)
  const chainId = useChainId()
  const { address } = useAccount()
  const queryClient = useQueryClient()
  const approvalPhaseRef = useRef(false)

  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  })

  const checkApproval = useCallback(async (nftContract: Address, owner: Address): Promise<boolean> => {
    if (!marketplaceAddress) return false
    try {
      const response = await fetch('/api/check-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nftContract, owner, operator: marketplaceAddress, chainId }),
      })
      const result = await response.json()
      return result.isApproved
    } catch {
      return false
    }
  }, [marketplaceAddress, chainId])

  const approve = useCallback(async (nftContract: Address) => {
    if (!marketplaceAddress) throw new Error('Marketplace not deployed')
    approvalPhaseRef.current = true
    setState({ status: 'approving', step: 1, totalSteps: 3, message: 'Approving marketplace…' })
    writeContract({
      address: nftContract,
      abi: ERC721_ABI,
      functionName: 'setApprovalForAll',
      args: [marketplaceAddress, true],
    })
  }, [marketplaceAddress, writeContract])

  const acceptOffer = useCallback(async (nftContract: Address, tokenId: bigint, buyer: Address) => {
    if (!marketplaceAddress) {
      const msg = 'Marketplace not deployed on this chain'
      setState({ status: 'error', step: 0, totalSteps: 1, message: msg, error: msg })
      return
    }
    if (!address) {
      const msg = 'Wallet not connected'
      setState({ status: 'error', step: 0, totalSteps: 1, message: msg, error: msg })
      return
    }
    setState({ status: 'preparing', step: 1, totalSteps: 2, message: 'Checking approval…' })
    try {
      const isApproved = await checkApproval(nftContract, address)
      if (!isApproved) {
        setState({ status: 'awaiting_approval', step: 1, totalSteps: 3, message: 'Approval required' })
        return { needsApproval: true }
      }
      setState({ status: 'executing', step: 2, totalSteps: 2, message: 'Accepting offer…' })
      writeContract({
        address: marketplaceAddress,
        abi: NFT_MARKETPLACE_ABI,
        functionName: 'acceptOffer',
        args: [nftContract, tokenId, buyer],
      })
      return { needsApproval: false }
    } catch (err: any) {
      setState({ status: 'error', step: 0, totalSteps: 1, message: err.message, error: err.message })
      return { needsApproval: false, error: err.message }
    }
  }, [marketplaceAddress, address, checkApproval, writeContract])

  const continueAfterApproval = useCallback((nftContract: Address, tokenId: bigint, buyer: Address) => {
    if (!marketplaceAddress) return
    setState({ status: 'executing', step: 3, totalSteps: 3, message: 'Accepting offer…' })
    writeContract({
      address: marketplaceAddress,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'acceptOffer',
      args: [nftContract, tokenId, buyer],
    })
  }, [marketplaceAddress, writeContract])

  useEffect(() => {
    if (hash && isConfirming) {
      setState(prev => ({ ...prev, status: 'confirming', message: 'Waiting for confirmation…' }))
    }
  }, [hash, isConfirming])

  useEffect(() => {
    if (isSuccess && hash) {
      if (approvalPhaseRef.current) {
        approvalPhaseRef.current = false
        setState(prev => ({ ...prev, status: 'approved', message: 'Approved! Accepting offer…' }))
      } else {
        const explorerUrl = getExplorerTxUrl(hash)
        setState({ status: 'success', step: 2, totalSteps: 2, hash, message: 'Offer accepted! NFT sold.' })
        toast.success('Offer accepted! NFT sold.', {
          action: explorerUrl
            ? { label: 'View on Explorer', onClick: () => window.open(explorerUrl, '_blank') }
            : undefined,
        })
        queryClient.invalidateQueries({ queryKey: ['listings'] })
        queryClient.invalidateQueries({ queryKey: ['offers'] })
        queryClient.invalidateQueries({ queryKey: ['nft'] })
      }
    }
  }, [isSuccess, hash, chainId, queryClient])

  useEffect(() => {
    if (isError) {
      setState(prev => ({ ...prev, status: 'error', message: 'Transaction failed' }))
      toast.error(approvalPhaseRef.current ? 'Approval failed' : 'Failed to accept offer')
      approvalPhaseRef.current = false
    }
  }, [isError])

  const resetState = useCallback(() => {
    setState(INITIAL_STATE)
    approvalPhaseRef.current = false
    reset()
  }, [reset])

  return { acceptOffer, approve, continueAfterApproval, checkApproval, resetState, state, hash, isPending, isConfirming, isSuccess, isError }
}

// ─── useCancelAuction ──────────────────────────────────────────────────────────
export function useCancelAuction() {
  const [state, setState] = useState<TransactionState>(INITIAL_STATE)
  const chainId = useChainId()
  const queryClient = useQueryClient()

  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  })

  const cancelAuction = useCallback(async (nftContract: Address, tokenId: bigint) => {
    if (!marketplaceAddress) {
      const msg = 'Marketplace not deployed on this chain'
      setState({ status: 'error', step: 0, totalSteps: 1, message: msg, error: msg })
      toast.error(msg)
      return
    }
    setState({ status: 'executing', step: 1, totalSteps: 1, message: 'Cancelling auction…' })
    writeContract({
      address: marketplaceAddress,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'cancelAuction',
      args: [nftContract, tokenId],
    })
  }, [marketplaceAddress, writeContract])

  useEffect(() => {
    if (hash && isConfirming) {
      setState(prev => ({ ...prev, status: 'confirming', message: 'Waiting for confirmation…' }))
    }
  }, [hash, isConfirming])

  useEffect(() => {
    if (isSuccess && hash) {
      const explorerUrl = getExplorerTxUrl(hash)
      setState({ status: 'success', step: 1, totalSteps: 1, hash, message: 'Auction cancelled' })
      toast.success('Auction cancelled', {
        action: { label: 'View on Etherscan', onClick: () => window.open(explorerUrl, '_blank') },
      })
      queryClient.invalidateQueries({ queryKey: ['auctions'] })
      queryClient.invalidateQueries({ queryKey: ['nft'] })
    }
  }, [isSuccess, hash, chainId, queryClient])

  useEffect(() => {
    if (isError) {
      setState(prev => ({ ...prev, status: 'error', message: 'Cancel auction failed' }))
      toast.error('Failed to cancel auction')
    }
  }, [isError])

  const resetState = useCallback(() => { setState(INITIAL_STATE); reset() }, [reset])

  return { cancelAuction, resetState, state, hash, isPending, isConfirming, isSuccess, isError }
}

// ─── useUpdateListing ──────────────────────────────────────────────────────────
export function useUpdateListing() {
  const [state, setState] = useState<TransactionState>(INITIAL_STATE)
  const chainId = useChainId()
  const queryClient = useQueryClient()

  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  })

  const updatePrice = useCallback(async (nftContract: Address, tokenId: bigint, newPrice: string) => {
    if (!marketplaceAddress) {
      const msg = 'Marketplace not deployed on this chain'
      setState({ status: 'error', step: 0, totalSteps: 1, message: msg, error: msg })
      toast.error(msg)
      return
    }
    setState({ status: 'executing', step: 1, totalSteps: 1, message: 'Updating price…' })
    writeContract({
      address: marketplaceAddress,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'updateListing',
      args: [nftContract, tokenId, parseEther(newPrice)],
    })
  }, [marketplaceAddress, writeContract])

  useEffect(() => {
    if (hash && isConfirming) {
      setState(prev => ({ ...prev, status: 'confirming', message: 'Waiting for confirmation…' }))
    }
  }, [hash, isConfirming])

  useEffect(() => {
    if (isSuccess && hash) {
      const explorerUrl = getExplorerTxUrl(hash)
      setState({ status: 'success', step: 1, totalSteps: 1, hash, message: 'Price updated!' })
      toast.success('Price updated!', {
        action: { label: 'View on Etherscan', onClick: () => window.open(explorerUrl, '_blank') },
      })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      queryClient.invalidateQueries({ queryKey: ['nft'] })
    }
  }, [isSuccess, hash, chainId, queryClient])

  useEffect(() => {
    if (isError) {
      setState(prev => ({ ...prev, status: 'error', message: 'Update failed' }))
      toast.error('Failed to update price')
    }
  }, [isError])

  const resetState = useCallback(() => { setState(INITIAL_STATE); reset() }, [reset])

  return { updatePrice, resetState, state, hash, isPending, isConfirming, isSuccess, isError }
}

// ─── useWithdrawBidRefund ───────────────────────────────────────────────────────
export function useWithdrawBidRefund() {
  const [state, setState] = useState<TransactionState>(INITIAL_STATE)
  const chainId = useChainId()

  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  })

  const withdraw = useCallback(async () => {
    if (!marketplaceAddress) {
      const msg = 'Marketplace not deployed on this chain'
      setState({ status: 'error', step: 0, totalSteps: 1, message: msg, error: msg })
      toast.error(msg)
      return
    }
    setState({ status: 'executing', step: 1, totalSteps: 1, message: 'Withdrawing refund…' })
    writeContract({
      address: marketplaceAddress,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'withdrawBidRefund',
      args: [],
    })
  }, [marketplaceAddress, writeContract])

  useEffect(() => {
    if (hash && isConfirming) {
      setState(prev => ({ ...prev, status: 'confirming', message: 'Waiting for confirmation…' }))
    }
  }, [hash, isConfirming])

  useEffect(() => {
    if (isSuccess && hash) {
      const explorerUrl = getExplorerTxUrl(hash)
      setState({ status: 'success', step: 1, totalSteps: 1, hash, message: 'Refund withdrawn!' })
      toast.success('Refund withdrawn!', {
        action: { label: 'View on Etherscan', onClick: () => window.open(explorerUrl, '_blank') },
      })
    }
  }, [isSuccess, hash, chainId])

  useEffect(() => {
    if (isError) {
      setState(prev => ({ ...prev, status: 'error', message: 'Withdrawal failed' }))
      toast.error('Failed to withdraw refund')
    }
  }, [isError])

  const resetState = useCallback(() => { setState(INITIAL_STATE); reset() }, [reset])

  return { withdraw, resetState, state, hash, isPending, isConfirming, isSuccess, isError }
}


// ─── useCancelOffer ────────────────────────────────────────────────────────────
export function useCancelOffer() {
  const [state, setState] = useState<TransactionState>(INITIAL_STATE)
  const chainId = useChainId()
  const queryClient = useQueryClient()

  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  })

  const cancelOffer = useCallback(async (nftContract: Address, tokenId: bigint) => {
    if (!marketplaceAddress) {
      const msg = 'Marketplace not deployed on this chain'
      setState({ status: 'error', step: 0, totalSteps: 1, message: msg, error: msg })
      toast.error(msg)
      return
    }
    setState({ status: 'executing', step: 1, totalSteps: 1, message: 'Cancelling offer…' })
    writeContract({
      address: marketplaceAddress,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'cancelOffer',
      args: [nftContract, tokenId],
    })
  }, [marketplaceAddress, writeContract])

  useEffect(() => {
    if (hash && isConfirming) {
      setState(prev => ({ ...prev, status: 'confirming', message: 'Waiting for confirmation…' }))
    }
  }, [hash, isConfirming])

  useEffect(() => {
    if (isSuccess && hash) {
      const explorerUrl = getExplorerTxUrl(hash)
      setState({ status: 'success', step: 1, totalSteps: 1, hash, message: 'Offer cancelled' })
      toast.success('Offer cancelled', {
        action: { label: 'View on Etherscan', onClick: () => window.open(explorerUrl, '_blank') },
      })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
    }
  }, [isSuccess, hash, chainId, queryClient])

  useEffect(() => {
    if (isError) {
      setState(prev => ({ ...prev, status: 'error', message: 'Cancel offer failed' }))
      toast.error('Failed to cancel offer')
    }
  }, [isError])

  const resetState = useCallback(() => { setState(INITIAL_STATE); reset() }, [reset])

  return { cancelOffer, resetState, state, hash, isPending, isConfirming, isSuccess, isError }
}

export function useCancelListing() {
  const [state, setState] = useState<TransactionState>(INITIAL_STATE)
  const chainId = useChainId()
  const queryClient = useQueryClient()

  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  })

  const cancel = useCallback(async (nftContract: Address, tokenId: bigint) => {
    if (!marketplaceAddress) {
      const msg = 'Marketplace not deployed on this chain'
      setState({ status: 'error', step: 0, totalSteps: 1, message: msg, error: msg })
      toast.error(msg)
      return
    }
    setState({ status: 'executing', step: 1, totalSteps: 1, message: 'Cancelling listing…' })
    writeContract({
      address: marketplaceAddress,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'cancelListing',
      args: [nftContract, tokenId],
    })
  }, [marketplaceAddress, writeContract])

  useEffect(() => {
    if (hash && isConfirming) {
      setState(prev => ({ ...prev, status: 'confirming', message: 'Waiting for confirmation…' }))
    }
  }, [hash, isConfirming])

  useEffect(() => {
    if (isSuccess && hash) {
      const explorerUrl = getExplorerTxUrl(hash)
      setState({ status: 'success', step: 1, totalSteps: 1, hash, message: 'Listing cancelled' })
      toast.success('Listing cancelled', {
        action: { label: 'View on Etherscan', onClick: () => window.open(explorerUrl, '_blank') },
      })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      queryClient.invalidateQueries({ queryKey: ['nft'] })
    }
  }, [isSuccess, hash, chainId, queryClient])

  useEffect(() => {
    if (isError) {
      setState(prev => ({ ...prev, status: 'error', message: 'Cancel failed' }))
      toast.error('Failed to cancel listing')
    }
  }, [isError])

  const resetState = useCallback(() => {
    setState(INITIAL_STATE)
    reset()
  }, [reset])

  return { cancel, resetState, state, hash, isPending, isConfirming, isSuccess, isError }
}

// ─── usePlaceBid ───────────────────────────────────────────────────────────────
export function usePlaceBid() {
  const [state, setState] = useState<TransactionState>(INITIAL_STATE)
  const chainId = useChainId()
  const queryClient = useQueryClient()

  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  })

  const placeBid = useCallback(async (nftContract: Address, tokenId: bigint, amount: string) => {
    if (!marketplaceAddress) {
      const msg = 'Marketplace not deployed on this chain'
      setState({ status: 'error', step: 0, totalSteps: 1, message: msg, error: msg })
      toast.error(msg)
      return
    }
    setState({ status: 'executing', step: 1, totalSteps: 1, message: 'Placing bid…' })
    try {
      writeContract({
        address: marketplaceAddress,
        abi: NFT_MARKETPLACE_ABI,
        functionName: 'placeBid',
        args: [nftContract, tokenId],
        value: parseEther(amount),
      })
    } catch (err: any) {
      setState({ status: 'error', step: 0, totalSteps: 1, message: err.message, error: err.message })
      toast.error('Failed to place bid')
    }
  }, [marketplaceAddress, writeContract])

  useEffect(() => {
    if (hash && isConfirming) {
      setState(prev => ({ ...prev, status: 'confirming', message: 'Waiting for confirmation…' }))
    }
  }, [hash, isConfirming])

  useEffect(() => {
    if (isSuccess && hash) {
      const explorerUrl = getExplorerTxUrl(hash)
      setState({ status: 'success', step: 1, totalSteps: 1, hash, message: 'Bid placed successfully!' })
      toast.success('Bid placed!', {
        action: { label: 'View on Etherscan', onClick: () => window.open(explorerUrl, '_blank') },
      })
      queryClient.invalidateQueries({ queryKey: ['auctions'] })
      queryClient.invalidateQueries({ queryKey: ['nft'] })
    }
  }, [isSuccess, hash, chainId, queryClient])

  useEffect(() => {
    if (isError) {
      setState(prev => ({ ...prev, status: 'error', message: 'Bid failed' }))
      toast.error('Failed to place bid')
    }
  }, [isError])

  const resetState = useCallback(() => {
    setState(INITIAL_STATE)
    reset()
  }, [reset])

  return { placeBid, resetState, state, hash, isPending, isConfirming, isSuccess, isError }
}

// ─── useSettleAuction ──────────────────────────────────────────────────────────
export function useSettleAuction() {
  const [state, setState] = useState<TransactionState>(INITIAL_STATE)
  const chainId = useChainId()
  const queryClient = useQueryClient()

  const marketplaceAddress = chainId
    ? (contractAddresses.nftMarketplace as Record<number, Address>)[chainId]
    : undefined

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  })

  const settle = useCallback(async (nftContract: Address, tokenId: bigint) => {
    if (!marketplaceAddress) {
      const msg = 'Marketplace not deployed on this chain'
      setState({ status: 'error', step: 0, totalSteps: 1, message: msg, error: msg })
      toast.error(msg)
      return
    }
    setState({ status: 'executing', step: 1, totalSteps: 1, message: 'Settling auction…' })
    writeContract({
      address: marketplaceAddress,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'settleAuction',
      args: [nftContract, tokenId],
    })
  }, [marketplaceAddress, writeContract])

  useEffect(() => {
    if (hash && isConfirming) {
      setState(prev => ({ ...prev, status: 'confirming', message: 'Waiting for confirmation…' }))
    }
  }, [hash, isConfirming])

  useEffect(() => {
    if (isSuccess && hash) {
      const explorerUrl = getExplorerTxUrl(hash)
      setState({ status: 'success', step: 1, totalSteps: 1, hash, message: 'Auction settled!' })
      toast.success('Auction settled!', {
        action: { label: 'View on Etherscan', onClick: () => window.open(explorerUrl, '_blank') },
      })
      queryClient.invalidateQueries({ queryKey: ['auctions'] })
      queryClient.invalidateQueries({ queryKey: ['nft'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    }
  }, [isSuccess, hash, chainId, queryClient])

  useEffect(() => {
    if (isError) {
      setState(prev => ({ ...prev, status: 'error', message: 'Settle failed' }))
      toast.error('Failed to settle auction')
    }
  }, [isError])

  const resetState = useCallback(() => {
    setState(INITIAL_STATE)
    reset()
  }, [reset])

  return { settle, resetState, state, hash, isPending, isConfirming, isSuccess, isError }
}

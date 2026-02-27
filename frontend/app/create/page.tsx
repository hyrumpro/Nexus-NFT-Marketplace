'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useReadContract } from 'wagmi'
import { parseEther, isAddress, Address } from 'viem'
import { Upload, ImageIcon, Loader2, Tag, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { ConnectButton } from '@/components/ConnectButton'
import { useListNFT } from '@/hooks/useTransactions'
import { useUserNFTs } from '@/hooks/useListings'
import { NFT_COLLECTION_ABI, NFT_COLLECTION_FACTORY_ABI } from '@/contracts/abis'
import { contractAddresses } from '@/config/contracts'
import { ipfsToHttp, fetchNFTMetadata, NFTMetadata } from '@/lib/utils'

type CreateMode = 'mint' | 'list' | 'collection'

async function uploadFileToPinata(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/ipfs/file', { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'IPFS image upload failed')
  }
  const data = await res.json()
  return `ipfs://${data.ipfsHash}`
}

async function uploadJSONToPinata(json: object): Promise<string> {
  const res = await fetch('/api/ipfs/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(json),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'IPFS metadata upload failed')
  }
  const data = await res.json()
  return `ipfs://${data.ipfsHash}`
}

export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <CreatePageInner />
    </Suspense>
  )
}

function CreatePageInner() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<CreateMode>('mint')

  // ── List NFT ──────────────────────────────────────────────
  const [listContract, setListContract] = useState('')
  const [listTokenId, setListTokenId] = useState('')
  const [listPrice, setListPrice] = useState('')
  const [listDuration, setListDuration] = useState('')
  const [selectedNFT, setSelectedNFT] = useState<any>(null)

  const { data: userNFTs, isLoading: userNFTsLoading } = useUserNFTs(address)

  const { list, approve, continueAfterApproval, state: listState, resetState: resetList } = useListNFT()

  // Track listing params across the approval step so we can continue after approval confirms
  const pendingListRef = useRef<{ nftContract: Address; tokenId: bigint; price: string; durationSeconds?: bigint } | null>(null)

  useEffect(() => {
    if (listState.status === 'approved' && pendingListRef.current) {
      const p = pendingListRef.current
      pendingListRef.current = null
      continueAfterApproval(p.nftContract, p.tokenId, p.price, p.durationSeconds)
    }
  }, [listState.status, continueAfterApproval])

  useEffect(() => {
    if (listState.status === 'success') {
      // toast already fired by useListNFT with the explorer link — just reset form
      resetList()
      setListContract(''); setListTokenId(''); setListPrice(''); setListDuration('')
      setSelectedNFT(null)
    }
    // errors are also toasted by useListNFT — no duplicate needed
  }, [listState.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleList = async () => {
    if (!isAddress(listContract)) { toast.error('Invalid NFT contract address'); return }
    if (!listTokenId || isNaN(Number(listTokenId))) { toast.error('Invalid token ID'); return }
    if (!listPrice || parseFloat(listPrice) <= 0) { toast.error('Price must be greater than 0'); return }
    const durationSeconds = listDuration ? BigInt(Math.floor(parseFloat(listDuration) * 3600)) : undefined
    // Save params so the approval-continue effect can resume listing after approval confirms
    pendingListRef.current = { nftContract: listContract as Address, tokenId: BigInt(listTokenId), price: listPrice, durationSeconds }
    const result = await list(listContract as Address, BigInt(listTokenId), listPrice, durationSeconds)
    if (!result?.needsApproval) {
      pendingListRef.current = null
    } else {
      await approve(listContract as Address)
    }
  }

  const isListBusy = ['preparing', 'approving', 'approval_confirming', 'approved', 'executing', 'confirming'].includes(listState.status)

  // ── Create Collection ─────────────────────────────────────
  const [colName, setColName] = useState('')
  const [colSymbol, setColSymbol] = useState('')
  const [colMaxSupply, setColMaxSupply] = useState('10000')
  const [colRoyalty, setColRoyalty] = useState('500')
  const [colMintPrice, setColMintPrice] = useState('')

  const factoryAddress = chainId
    ? (contractAddresses.collectionFactory as Record<number, Address>)[chainId]
    : undefined

  const { writeContract: writeFactory, data: factoryHash, isPending: factoryPending } = useWriteContract()
  const { isSuccess: factorySuccess, isError: factoryIsError } = useWaitForTransactionReceipt({
    hash: factoryHash,
    query: { enabled: !!factoryHash },
  })

  useEffect(() => {
    if (factorySuccess && factoryHash) {
      const explorerUrl = `https://sepolia.etherscan.io/tx/${factoryHash}`
      toast.success('Collection created successfully!', {
        action: { label: 'View on Etherscan', onClick: () => window.open(explorerUrl, '_blank') },
      })
      setColName(''); setColSymbol(''); setColMaxSupply('10000'); setColRoyalty('500'); setColMintPrice('')
    }
  }, [factorySuccess, factoryHash])

  useEffect(() => {
    if (factoryIsError) toast.error('Failed to create collection. Check the console for details.')
  }, [factoryIsError])

  const handleCreateCollection = () => {
    if (!colName.trim()) { toast.error('Collection name is required'); return }
    if (!colSymbol.trim()) { toast.error('Symbol is required'); return }
    const maxSupply = parseInt(colMaxSupply)
    if (isNaN(maxSupply) || maxSupply <= 0) { toast.error('Max supply must be a positive number'); return }
    const royalty = parseInt(colRoyalty)
    if (isNaN(royalty) || royalty < 0 || royalty > 1000) {
      toast.error('Royalty must be 0–1000 basis points (max 10%)')
      return
    }
    if (!factoryAddress || factoryAddress === '0x0000000000000000000000000000000000000000') {
      toast.error('Collection factory not deployed on this chain. Set NEXT_PUBLIC_COLLECTION_FACTORY_ADDRESS in .env')
      return
    }

    if (colMintPrice && parseFloat(colMintPrice) > 0) {
      writeFactory({
        address: factoryAddress,
        abi: NFT_COLLECTION_FACTORY_ABI,
        functionName: 'createCollectionWithMintPrice',
        args: [colName, colSymbol, BigInt(maxSupply), BigInt(royalty), '', parseEther(colMintPrice)],
      })
    } else {
      writeFactory({
        address: factoryAddress,
        abi: NFT_COLLECTION_FACTORY_ABI,
        functionName: 'createCollection',
        args: [colName, colSymbol, BigInt(maxSupply), BigInt(royalty), ''],
      })
    }
  }

  // ── Mint NFT ──────────────────────────────────────────────
  const [mintImage, setMintImage] = useState<File | null>(null)
  const [mintName, setMintName] = useState('')
  const [mintDescription, setMintDescription] = useState('')
  const [mintCollection, setMintCollection] = useState('')
  const [mintTokenId, setMintTokenId] = useState('')
  const [mintAttributes, setMintAttributes] = useState<{ trait_type: string; value: string }[]>([])
  const [isMinting, setIsMinting] = useState(false)

  // Pre-fill collection address and switch to mint tab when ?collection= is in the URL
  useEffect(() => {
    const param = searchParams.get('collection')
    if (param && isAddress(param)) {
      setMintCollection(param)
      setMode('mint')
    }
  }, [searchParams])

  // Read the collection's mintPrice so we can send the correct ETH value
  const { data: collectionMintPrice } = useReadContract({
    address: isAddress(mintCollection) ? (mintCollection as Address) : undefined,
    abi: NFT_COLLECTION_ABI,
    functionName: 'mintPrice',
    query: { enabled: isAddress(mintCollection) },
  })

  // Read totalSupply to suggest the next token ID
  const { data: collectionTotalSupply } = useReadContract({
    address: isAddress(mintCollection) ? (mintCollection as Address) : undefined,
    abi: NFT_COLLECTION_ABI,
    functionName: 'totalSupply',
    query: { enabled: isAddress(mintCollection) },
  })

  // Read MINTER_ROLE bytes32 from the collection, then check if the current user has it
  const { data: minterRole } = useReadContract({
    address: isAddress(mintCollection) ? (mintCollection as Address) : undefined,
    abi: NFT_COLLECTION_ABI,
    functionName: 'MINTER_ROLE',
    query: { enabled: isAddress(mintCollection) },
  })

  const { data: hasMinterRole } = useReadContract({
    address: isAddress(mintCollection) ? (mintCollection as Address) : undefined,
    abi: NFT_COLLECTION_ABI,
    functionName: 'hasRole',
    args: minterRole && address ? [minterRole as `0x${string}`, address] : undefined,
    query: { enabled: isAddress(mintCollection) && !!minterRole && !!address },
  })

  // Auto-populate token ID when collection address is set and field is empty
  useEffect(() => {
    if (collectionTotalSupply !== undefined && mintTokenId === '') {
      setMintTokenId(((collectionTotalSupply as bigint) + 1n).toString())
    }
  }, [collectionTotalSupply, mintCollection]) // eslint-disable-line react-hooks/exhaustive-deps

  const { writeContract: writeMint, data: mintHash, isPending: mintPending } = useWriteContract()
  const { isSuccess: mintTxSuccess, isError: mintTxError } = useWaitForTransactionReceipt({
    hash: mintHash,
    query: { enabled: !!mintHash },
  })

  useEffect(() => {
    if (mintTxSuccess && mintHash) {
      const explorerUrl = `https://sepolia.etherscan.io/tx/${mintHash}`
      toast.success('NFT minted successfully!', {
        action: { label: 'View on Etherscan', onClick: () => window.open(explorerUrl, '_blank') },
      })
      setMintImage(null); setMintName(''); setMintDescription(''); setMintTokenId(''); setMintAttributes([])
      setIsMinting(false)
    }
  }, [mintTxSuccess, mintHash])

  useEffect(() => {
    if (mintTxError) { toast.error('Minting transaction failed'); setIsMinting(false) }
  }, [mintTxError])

  const handleMint = async () => {
    if (!mintImage) { toast.error('Please upload an image'); return }
    if (!mintName.trim()) { toast.error('NFT name is required'); return }
    if (!isAddress(mintCollection)) { toast.error('Invalid collection address'); return }
    if (!mintTokenId || isNaN(Number(mintTokenId))) { toast.error('Invalid token ID'); return }

    setIsMinting(true)
    const uploadToastId = 'mint-upload'
    try {
      toast.loading('Uploading image to IPFS…', { id: uploadToastId })
      const imageURI = await uploadFileToPinata(mintImage)

      toast.loading('Uploading metadata to IPFS…', { id: uploadToastId })
      const metadataURI = await uploadJSONToPinata({
        name: mintName,
        description: mintDescription,
        image: imageURI,
        ...(mintAttributes.length > 0 && { attributes: mintAttributes }),
      })

      toast.dismiss(uploadToastId)

      writeMint({
        address: mintCollection as Address,
        abi: NFT_COLLECTION_ABI,
        functionName: 'mintWithPrice',
        args: [address as Address, BigInt(mintTokenId), metadataURI],
        value: collectionMintPrice ? (collectionMintPrice as bigint) : 0n,
      })
    } catch (err: any) {
      toast.dismiss(uploadToastId)
      toast.error(err.message || 'Minting failed')
      setIsMinting(false)
    }
  }

  // ─────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-10 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-6">
            <Upload className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Connect Your Wallet</h1>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            You need to connect your wallet to mint NFTs, create collections, and list items for sale.
          </p>
          <ConnectButton />
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'mint' as const, label: 'Mint New NFT' },
    { id: 'list' as const, label: 'List Existing NFT' },
    { id: 'collection' as const, label: 'Create Collection' },
  ]

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">
          Create <span className="gradient-text">Something</span>
        </h1>
        <p className="text-muted-foreground mb-8">
          Mint new NFTs, list your existing NFTs, or create a new collection
        </p>

        <div className="flex gap-2 mb-8 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === tab.id
                  ? 'bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.3)]'
                  : 'border border-border/50 bg-muted/20 hover:bg-muted/50 hover:border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── MINT ── */}
        {mode === 'mint' && (
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-6">Mint New NFT</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium mb-2">Image *</label>
                <div className="aspect-square border-2 border-dashed border-border/50 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-primary/3 transition-all duration-200">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setMintImage(e.target.files?.[0] ?? null)}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer w-full h-full flex items-center justify-center">
                    {mintImage ? (
                      <div className="text-center p-4">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 text-primary" />
                        <p className="text-sm font-medium">{mintImage.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(mintImage.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 10MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <input
                    type="text"
                    value={mintName}
                    onChange={(e) => setMintName(e.target.value)}
                    placeholder="NFT Name"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={mintDescription}
                    onChange={(e) => setMintDescription(e.target.value)}
                    placeholder="Describe your NFT…"
                    className="input w-full min-h-[80px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Collection Address *</label>
                  <input
                    type="text"
                    value={mintCollection}
                    onChange={(e) => setMintCollection(e.target.value)}
                    placeholder="0x…"
                    className="input w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The NFTCollection contract where this token will be minted
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Token ID *</label>
                  <input
                    type="number"
                    value={mintTokenId}
                    onChange={(e) => setMintTokenId(e.target.value)}
                    placeholder="1"
                    min="0"
                    className="input w-full"
                  />
                  {collectionTotalSupply !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {(collectionTotalSupply as bigint) === 0n
                        ? 'No NFTs minted yet — token ID 1 suggested'
                        : `${(collectionTotalSupply as bigint).toString()} NFT(s) minted — next suggested: ${((collectionTotalSupply as bigint) + 1n).toString()}`
                      }
                    </p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Properties (optional)</label>
                    <button
                      type="button"
                      onClick={() => setMintAttributes(prev => [...prev, { trait_type: '', value: '' }])}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add trait
                    </button>
                  </div>
                  {mintAttributes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No traits added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {mintAttributes.map((attr, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={attr.trait_type}
                            onChange={(e) => setMintAttributes(prev => prev.map((a, idx) => idx === i ? { ...a, trait_type: e.target.value } : a))}
                            placeholder="Type (e.g. Background)"
                            className="input flex-1 text-sm"
                          />
                          <input
                            type="text"
                            value={attr.value}
                            onChange={(e) => setMintAttributes(prev => prev.map((a, idx) => idx === i ? { ...a, value: e.target.value } : a))}
                            placeholder="Value (e.g. Blue)"
                            className="input flex-1 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setMintAttributes(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isAddress(mintCollection) && hasMinterRole === false ? (
                  <p className="text-sm text-destructive mt-2 p-3 rounded-lg bg-destructive/10">
                    You don&apos;t have minting permissions for this collection.
                  </p>
                ) : (
                  <button
                    onClick={handleMint}
                    disabled={isMinting || mintPending || (isAddress(mintCollection) && hasMinterRole === undefined)}
                    className="btn-primary w-full mt-2"
                  >
                    {isMinting || mintPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2 inline" />Minting…</>
                    ) : (
                      'Mint NFT'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── LIST ── */}
        {mode === 'list' && (
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-2">List Existing NFT</h2>

            {!selectedNFT ? (
              /* ── Step 1: Pick an NFT ── */
              <>
                <p className="text-muted-foreground text-sm mb-6">
                  Select one of your NFTs to list it on the marketplace.
                </p>

                {/* Loading skeleton */}
                {userNFTsLoading && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="rounded-xl border border-border/50 bg-card overflow-hidden">
                        <div className="aspect-square bg-muted animate-pulse" />
                        <div className="p-3 space-y-2">
                          <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                          <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {!userNFTsLoading && (!userNFTs || userNFTs.length === 0) && (
                  <div className="py-20 text-center text-muted-foreground">
                    <div className="text-6xl mb-4 opacity-20 select-none">◈</div>
                    <p className="font-medium text-foreground/70">No NFTs found in your wallet</p>
                    <p className="text-sm mt-1 max-w-xs mx-auto">
                      Mint an NFT first, or check that the subgraph has indexed your tokens.
                    </p>
                  </div>
                )}

                {/* NFT selection grid */}
                {!userNFTsLoading && userNFTs && userNFTs.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {userNFTs.map((nft: any) => (
                      <SelectableNFTCard
                        key={nft.id}
                        nft={nft}
                        onSelect={() => {
                          setSelectedNFT(nft)
                          setListContract(nft.collection?.address || '')
                          setListTokenId(nft.tokenId.toString())
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* ── Step 2: Set price & duration ── */
              <div className="max-w-xl">
                <SelectedNFTPreview
                  nft={selectedNFT}
                  onChangeClick={() => {
                    setSelectedNFT(null)
                    setListContract('')
                    setListTokenId('')
                  }}
                />

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Price (ETH) *</label>
                    <input
                      type="number"
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      placeholder="0.01"
                      step="0.001"
                      min="0"
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Duration (hours) — leave empty for no expiry
                    </label>
                    <input
                      type="number"
                      value={listDuration}
                      onChange={(e) => setListDuration(e.target.value)}
                      placeholder="e.g. 72"
                      min="1"
                      className="input w-full"
                    />
                  </div>

                  {listState.status !== 'idle' && listState.status !== 'success' && listState.status !== 'error' && (
                    <div className="text-sm p-3 rounded-lg bg-primary/10 text-primary flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                      {listState.message}
                    </div>
                  )}

                  <button onClick={handleList} disabled={isListBusy} className="btn-primary w-full">
                    {isListBusy ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2 inline" />Processing…</>
                    ) : (
                      'List NFT'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── COLLECTION ── */}
        {mode === 'collection' && (
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-6">Create New Collection</h2>
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium mb-2">Collection Name *</label>
                <input
                  type="text"
                  value={colName}
                  onChange={(e) => setColName(e.target.value)}
                  placeholder="My NFT Collection"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Symbol *</label>
                <input
                  type="text"
                  value={colSymbol}
                  onChange={(e) => setColSymbol(e.target.value.toUpperCase())}
                  placeholder="MNFT"
                  maxLength={10}
                  className="input w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Max Supply</label>
                  <input
                    type="number"
                    value={colMaxSupply}
                    onChange={(e) => setColMaxSupply(e.target.value)}
                    placeholder="10000"
                    min="1"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Royalty (basis points)</label>
                  <input
                    type="number"
                    value={colRoyalty}
                    onChange={(e) => setColRoyalty(e.target.value)}
                    placeholder="500"
                    min="0"
                    max="1000"
                    className="input w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(parseInt(colRoyalty || '0') / 100).toFixed(1)}% — max 10% (1000)
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mint Price (ETH) — leave empty for free mint
                </label>
                <input
                  type="number"
                  value={colMintPrice}
                  onChange={(e) => setColMintPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.001"
                  min="0"
                  className="input w-full"
                />
              </div>
              <button
                onClick={handleCreateCollection}
                disabled={factoryPending}
                className="btn-primary w-full mt-4"
              >
                {factoryPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2 inline" />Creating…</>
                ) : (
                  'Create Collection'
                )}
              </button>
              <p className="text-xs text-muted-foreground text-center">
                Creating a collection requires a small gas fee
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helper components for the NFT picker ──────────────────────────────────────

function SelectableNFTCard({ nft, onSelect }: { nft: any; onSelect: () => void }) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null)
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (nft.tokenURI) {
      fetchNFTMetadata(nft.tokenURI).then(setMetadata).catch(() => {})
    }
  }, [nft.tokenURI])

  const displayImage = ipfsToHttp(metadata?.image || nft.tokenURI)
  const displayName = metadata?.name || `#${nft.tokenId?.toString()}`
  const isListed = nft.currentListing?.active

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 bg-card border ${
        isHovered
          ? 'border-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.12)]'
          : 'border-border/50 shadow-[0_4px_16px_rgba(0,0,0,0.25)]'
      }`}
    >
      {/* Shimmer line on hover */}
      <div
        className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent transition-opacity duration-300 z-10 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {!imageError && displayImage ? (
          <Image
            src={displayImage}
            alt={displayName}
            fill
            className="object-cover transition-transform duration-500"
            style={{ transform: isHovered ? 'scale(1.07)' : 'scale(1)' }}
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/8 to-accent/8">
            <div className="text-5xl opacity-20 select-none">◈</div>
          </div>
        )}

        {/* Already listed badge */}
        {isListed && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm border border-primary/30 px-2 py-1 rounded-md text-xs font-medium text-primary z-10">
            <Tag className="w-3 h-3" />
            Listed
          </div>
        )}

        {/* Hover overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent transition-opacity duration-200 flex items-end ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="w-full px-3 pb-3">
            <span className="btn-primary w-full text-center text-xs py-1.5 block rounded-lg">
              Select
            </span>
          </div>
        </div>
      </div>

      {/* Card info */}
      <div className="p-3">
        <p className="text-xs text-muted-foreground truncate">{nft.collection?.name || 'Unknown'}</p>
        <p className="font-semibold text-sm truncate">{displayName}</p>
      </div>
    </div>
  )
}

function SelectedNFTPreview({ nft, onChangeClick }: { nft: any; onChangeClick: () => void }) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (nft.tokenURI) {
      fetchNFTMetadata(nft.tokenURI).then(setMetadata).catch(() => {})
    }
  }, [nft.tokenURI])

  const displayImage = ipfsToHttp(metadata?.image || nft.tokenURI)
  const displayName = metadata?.name || `#${nft.tokenId?.toString()}`

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-muted/20 mb-6">
      {/* Thumbnail */}
      <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-muted border border-border/50">
        {!imageError && displayImage ? (
          <Image
            src={displayImage}
            alt={displayName}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
            <span className="text-xl opacity-30 select-none">◈</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">
          {nft.collection?.name || 'Unknown Collection'}
        </p>
        <p className="font-semibold truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
          {nft.collection?.address}
        </p>
      </div>

      {/* Change button */}
      <button
        onClick={onChangeClick}
        className="ml-auto flex-shrink-0 text-xs text-muted-foreground hover:text-foreground border border-border/50 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
      >
        Change
      </button>
    </div>
  )
}

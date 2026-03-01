'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useReadContract } from 'wagmi'
import { parseEther, isAddress, Address } from 'viem'
import { Upload, ImageIcon, Loader2, Plus, Trash2, Hash } from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { ConnectButton } from '@/components/ConnectButton'
import { useUserCollections } from '@/hooks/useListings'
import { NFT_COLLECTION_ABI, NFT_COLLECTION_FACTORY_ABI } from '@/contracts/abis'
import { contractAddresses } from '@/config/contracts'
import { ipfsToHttp, fetchNFTMetadata, NFTMetadata } from '@/lib/utils'

type CreateMode = 'mint' | 'collection'

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
  const { data: userCollections, isLoading: collectionsLoading } = useUserCollections(address)
  const [selectedCollectionData, setSelectedCollectionData] = useState<any>(null)
  const [mintImage, setMintImage] = useState<File | null>(null)
  const [mintName, setMintName] = useState('')
  const [mintDescription, setMintDescription] = useState('')
  const [mintCollection, setMintCollection] = useState('')
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
      setMintImage(null); setMintName(''); setMintDescription(''); setMintCollection(''); setMintAttributes([])
      setSelectedCollectionData(null)
      setIsMinting(false)
    }
  }, [mintTxSuccess, mintHash])

  useEffect(() => {
    if (mintTxError) { toast.error('Minting transaction failed'); setIsMinting(false) }
  }, [mintTxError])

  const handleMint = async () => {
    if (!mintImage) { toast.error('Please upload an image'); return }
    if (!mintName.trim()) { toast.error('NFT name is required'); return }
    if (!isAddress(mintCollection)) { toast.error('Please select a collection'); return }

    const nextTokenId = collectionTotalSupply !== undefined
      ? (collectionTotalSupply as bigint) + 1n
      : undefined
    if (nextTokenId === undefined) { toast.error('Could not read collection supply — try again'); return }

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
        functionName: 'mint',
        args: [address as Address, nextTokenId, metadataURI],
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

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">
          Create <span className="gradient-text">Something</span>
        </h1>
        <p className="text-muted-foreground mb-8">
          Mint new NFTs or create a new collection
        </p>

        <div className="flex gap-2 mb-8 flex-wrap">
          {[
            { id: 'mint' as const, label: 'Mint New NFT' },
            { id: 'collection' as const, label: 'Create Collection' },
          ].map((tab) => (
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
                  <label className="block text-sm font-medium mb-2">Collection *</label>

                  {isAddress(mintCollection) ? (
                    /* ── Selected state ─────────────────────── */
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-primary/40 bg-primary/5">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">
                          {selectedCollectionData?.name ?? mintCollection}
                          {selectedCollectionData?.symbol && (
                            <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                              ({selectedCollectionData.symbol})
                            </span>
                          )}
                        </p>
                        {selectedCollectionData && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {selectedCollectionData.totalSupply ?? 0} / {selectedCollectionData.maxSupply} minted
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/60 font-mono truncate mt-0.5">
                          {mintCollection}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setMintCollection('')
                          setSelectedCollectionData(null)
                        }}
                        className="shrink-0 text-xs text-muted-foreground hover:text-foreground border border-border/50 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    /* ── Picker state ────────────────────────── */
                    <div className="space-y-3">
                      {/* User's collections */}
                      {collectionsLoading && (
                        <div className="grid grid-cols-2 gap-2">
                          {[0, 1].map((i) => (
                            <div key={i} className="h-[4.5rem] rounded-xl border border-border/50 bg-muted animate-pulse" />
                          ))}
                        </div>
                      )}

                      {!collectionsLoading && userCollections && userCollections.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {userCollections.map((col: any) => (
                            <button
                              key={col.address}
                              type="button"
                              onClick={() => {
                                setMintCollection(col.address)
                                setSelectedCollectionData(col)
                              }}
                              className="text-left px-3 py-2.5 rounded-xl border border-border/50 hover:border-primary/60 hover:bg-primary/5 transition-all duration-150"
                            >
                              <p className="font-semibold text-sm truncate">{col.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {col.symbol} · {col.totalSupply ?? 0}/{col.maxSupply} minted
                              </p>
                            </button>
                          ))}
                        </div>
                      )}

                      {!collectionsLoading && (!userCollections || userCollections.length === 0) && (
                        <div className="py-5 text-center border border-dashed border-border/50 rounded-xl">
                          <p className="text-sm text-muted-foreground">No collections yet.</p>
                          <button
                            type="button"
                            onClick={() => setMode('collection')}
                            className="text-xs text-primary hover:text-primary/80 mt-1 transition-colors"
                          >
                            Create a collection first →
                          </button>
                        </div>
                      )}

                      {/* Manual address fallback */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">
                          Or enter a collection address manually
                        </p>
                        <input
                          type="text"
                          value={mintCollection}
                          onChange={(e) => {
                            setMintCollection(e.target.value)
                            setSelectedCollectionData(null)
                          }}
                          placeholder="0x…"
                          className="input w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
                {/* Token ID — auto-assigned, not editable */}
                {isAddress(mintCollection) && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/40 bg-muted/20">
                    <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Token ID (auto-assigned)</p>
                      {collectionTotalSupply !== undefined ? (
                        <p className="text-sm font-semibold">
                          #{((collectionTotalSupply as bigint) + 1n).toString()}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            ({(collectionTotalSupply as bigint).toString()} minted so far)
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                        </p>
                      )}
                    </div>
                  </div>
                )}
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
                  Public Mint Price (ETH){' '}
                  <span className="font-normal text-muted-foreground">— optional</span>
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
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for free. As the creator you always mint for free — this price is only charged when others call <span className="font-mono">mintWithPrice</span> on your contract.
                </p>
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

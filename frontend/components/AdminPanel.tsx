'use client'

import { useState, useEffect } from 'react'
import { formatEther, isAddress, type Address } from 'viem'
import { Shield, DollarSign, Pause, Play, Settings, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAdminPanel } from '@/hooks/useAdminPanel'

interface AdminPanelProps {
  onClose: () => void
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const {
    accumulatedFees,
    marketplaceFeePercent,
    feeRecipient,
    paused,
    withdrawFees,
    setFeePercent,
    updateFeeRecipient,
    togglePause,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  } = useAdminPanel()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [feeInput, setFeeInput] = useState('')
  const [recipientInput, setRecipientInput] = useState('')
  const [activeAction, setActiveAction] = useState<string | null>(null)

  const isBusy = isPending || isConfirming

  useEffect(() => {
    if (isSuccess) {
      toast.success('Transaction confirmed')
      setActiveAction(null)
      reset()
    }
  }, [isSuccess, reset])

  useEffect(() => {
    if (error) {
      const msg = error.message?.split('\n')[0] ?? 'Transaction failed'
      toast.error(msg)
      setActiveAction(null)
      reset()
    }
  }, [error, reset])

  const handleWithdraw = () => {
    setActiveAction('withdraw')
    withdrawFees()
  }

  const handleTogglePause = () => {
    setActiveAction('pause')
    togglePause()
  }

  const handleSetFee = () => {
    const val = parseFloat(feeInput)
    if (isNaN(val) || val < 0 || val > 10) {
      toast.error('Fee must be between 0% and 10%')
      return
    }
    setActiveAction('fee')
    setFeePercent(BigInt(Math.round(val * 100)))
    setFeeInput('')
  }

  const handleSetRecipient = () => {
    if (!isAddress(recipientInput)) {
      toast.error('Invalid Ethereum address')
      return
    }
    setActiveAction('recipient')
    updateFeeRecipient(recipientInput as Address)
    setRecipientInput('')
  }

  const feesEth =
    accumulatedFees !== undefined
      ? parseFloat(formatEther(accumulatedFees)).toFixed(4)
      : '—'

  const feePercentDisplay =
    marketplaceFeePercent !== undefined
      ? (Number(marketplaceFeePercent) / 100).toFixed(2) + '%'
      : '—'

  const recipientDisplay = feeRecipient
    ? `${feeRecipient.slice(0, 6)}…${feeRecipient.slice(-4)}`
    : '—'

  const hasNoFees = accumulatedFees === undefined || accumulatedFees === BigInt(0)

  return (
    <>
      {/* Click-outside overlay */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute right-0 mt-2 w-80 z-50 overflow-hidden rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-[0_8px_48px_rgba(0,0,0,0.6)] animate-scale-in">

        {/* Header */}
        <div className="px-4 py-3 border-b border-border/40 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 flex items-center gap-2">
          <Shield className="w-4 h-4 text-yellow-400" />
          <p className="text-sm font-semibold text-yellow-400">Admin Panel</p>
        </div>

        {/* Accumulated Fees */}
        <div className="px-4 py-3 border-b border-border/40">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Accumulated Fees</p>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground">
                {feesEth}
                <span className="text-sm font-normal text-muted-foreground ml-1">ETH</span>
              </p>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span>
                  Fee:{' '}
                  <span className="text-foreground font-medium">{feePercentDisplay}</span>
                </span>
                <span className="truncate">
                  To:{' '}
                  <span className="text-foreground font-medium font-mono">{recipientDisplay}</span>
                </span>
              </div>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={isBusy || hasNoFees}
              className="flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isBusy && activeAction === 'withdraw' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <DollarSign className="w-3.5 h-3.5" />
              )}
              Withdraw
            </button>
          </div>
        </div>

        {/* Marketplace Status */}
        <div className="px-4 py-3 border-b border-border/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Marketplace
              </p>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    paused === undefined
                      ? 'bg-muted-foreground'
                      : paused
                      ? 'bg-destructive'
                      : 'bg-green-500 animate-pulse'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    paused === undefined
                      ? 'text-muted-foreground'
                      : paused
                      ? 'text-destructive'
                      : 'text-green-400'
                  }`}
                >
                  {paused === undefined ? 'Loading…' : paused ? 'Paused' : 'Active'}
                </span>
              </div>
            </div>
            <button
              onClick={handleTogglePause}
              disabled={isBusy || paused === undefined}
              className={`flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                paused
                  ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                  : 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
              }`}
            >
              {isBusy && activeAction === 'pause' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : paused ? (
                <Play className="w-3.5 h-3.5" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
              {paused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>

        {/* Settings (collapsible) */}
        <div className="p-2">
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" />
              Settings
            </span>
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                settingsOpen ? 'rotate-90' : ''
              }`}
            />
          </button>

          {settingsOpen && (
            <div className="mt-2 space-y-3 px-1 pb-1">
              {/* Set fee % */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Marketplace fee (%) — current: {feePercentDisplay}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    placeholder="e.g. 2.00"
                    value={feeInput}
                    onChange={(e) => setFeeInput(e.target.value)}
                    className="flex-1 min-w-0 bg-muted/40 border border-border/60 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60"
                  />
                  <button
                    onClick={handleSetFee}
                    disabled={isBusy || !feeInput}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isBusy && activeAction === 'fee' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Set'
                    )}
                  </button>
                </div>
              </div>

              {/* Set fee recipient */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Fee recipient — current: {recipientDisplay}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="0x…"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    className="flex-1 min-w-0 bg-muted/40 border border-border/60 rounded-lg px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60"
                  />
                  <button
                    onClick={handleSetRecipient}
                    disabled={isBusy || !recipientInput}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isBusy && activeAction === 'recipient' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Set'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

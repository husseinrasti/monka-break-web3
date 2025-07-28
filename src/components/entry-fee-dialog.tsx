'use client'

import React, { useState, useEffect } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { smartContract, gameUtils, monadTestnet } from '@/lib/smart-contract'
import { formatMON } from '@/lib/utils'
import { Coins, Lock, AlertTriangle } from 'lucide-react'
import { Id } from '@/../convex/_generated/dataModel'

type EntryFeeDialogProps = {
  isOpen: boolean
  onClose: () => void
  roomId: Id<'rooms'>
  onSuccess: () => void
}

export const EntryFeeDialog: React.FC<EntryFeeDialogProps> = ({
  isOpen,
  onClose,
  roomId,
  onSuccess,
}) => {
  const { address, chain } = useAccount()
  const { switchChain } = useSwitchChain()
  const startGame = useMutation(api.rooms.startGame)
  const gameConfig = useQuery(api.gameConfig.getOrCreateGameConfig, {})

  const [entryFee, setEntryFee] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSwitchingChain, setIsSwitchingChain] = useState(false)

  // Set default entry fee from server config
  useEffect(() => {
    if (gameConfig && !entryFee) {
      // Fallback to 2 if entryFeeMinimum is undefined (for existing configs)
      const minFee = gameConfig.entryFeeMinimum || 2
      setEntryFee(minFee.toString())
    }
  }, [gameConfig, entryFee])

  // Check if user is on the correct chain
  const isCorrectChain = chain?.id === monadTestnet.id
  const minFee = gameConfig?.entryFeeMinimum || 2

  const handleSwitchChain = async () => {
    if (!switchChain) return
    
    setIsSwitchingChain(true)
    try {
      await switchChain({ chainId: monadTestnet.id })
    } catch (error) {
      console.error('Failed to switch chain:', error)
      alert('Failed to switch to Monad Testnet. Please switch manually in your wallet.')
    } finally {
      setIsSwitchingChain(false)
    }
  }

  const handleStartGame = async () => {
    if (!address || !gameConfig) {
      alert('Please connect your wallet first')
      return
    }

    const fee = parseFloat(entryFee)
    if (fee < minFee) {
      alert(`Minimum entry fee is ${minFee} MON`)
      return
    }

    // Check if user is on the correct chain
    if (!isCorrectChain) {
      alert('Please switch to Monad Testnet to start the game')
      return
    }

    setIsLoading(true)
    try {
      // Generate a unique game ID for the smart contract
      const gameId = Math.floor(Math.random() * 1000000) + Date.now()
      
      // Convert MON to wei
      const entryFeeWei = gameUtils.parseMonToWei(fee)
      
      // First create the game on the smart contract
      await smartContract.createGame(gameId)
      
      // Then start the game with entry fee
      await smartContract.startGame(gameId, entryFeeWei)
      
      // Update Convex with the game start
      await startGame({
        roomId,
        creatorAddress: address,
        entryFee: fee,
        gameId: gameId,
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to start game:', error)
      alert(`Failed to start game: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Set Entry Fee
          </DialogTitle>
          <DialogDescription>
            Set the entry fee for your game. This amount will be locked in the smart contract.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Chain Status */}
          {!isCorrectChain && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-amber-800 text-sm mb-2">
                <AlertTriangle className="h-4 w-4" />
                Wrong Network
              </div>
              <p className="text-amber-700 text-sm mb-3">
                You're connected to the wrong network. Please switch to Monad Testnet to continue.
              </p>
              <Button
                onClick={handleSwitchChain}
                disabled={isSwitchingChain}
                size="sm"
                variant="outline"
                className="w-full"
              >
                {isSwitchingChain ? 'Switching...' : 'Switch to Monad Testnet'}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="entryFee">Entry Fee (MON)</Label>
            <Input
              id="entryFee"
              type="number"
              min={minFee}
              step="0.1"
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
              placeholder={`Minimum ${minFee} MON`}
              disabled={isLoading || !isCorrectChain}
            />
            <p className="text-xs text-muted-foreground">
              Minimum: {minFee} MON • Higher fees create larger prize pools
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Lock className="h-4 w-4" />
              Smart Contract Lock
            </div>
            <p className="text-sm">
              This fee will be locked in the MonkaBreak smart contract at{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS?.slice(0, 6)}...{process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS?.slice(-4)}
              </code>
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartGame}
            disabled={isLoading || parseFloat(entryFee) < minFee || !gameConfig || !isCorrectChain}
            className="min-w-[120px]"
          >
            {isLoading ? (
              'Starting...'
            ) : !isCorrectChain ? (
              'Switch Network First'
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Lock {formatMON(parseFloat(entryFee) || 0)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useMutation } from 'convex/react'
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
import { smartContract, gameUtils } from '@/lib/smart-contract'
import { formatMON } from '@/lib/utils'
import { Coins, Lock } from 'lucide-react'
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
  const { address } = useAccount()
  const startGame = useMutation(api.rooms.startGame)

  const [entryFee, setEntryFee] = useState('2')
  const [isLoading, setIsLoading] = useState(false)
  const [minFee, setMinFee] = useState<number>(2)

  // Get minimum entry fee from contract
  useEffect(() => {
    const fetchMinFee = async () => {
      try {
        const minFeeWei = await smartContract.getMinEntryFee()
        const minFeeNumber = gameUtils.formatWeiToMon(minFeeWei)
        setMinFee(minFeeNumber)
        setEntryFee(minFeeNumber.toString())
      } catch (error) {
        console.error('Failed to fetch minimum fee:', error)
        // Fallback to 2 MON
        setMinFee(2)
        setEntryFee('2')
      }
    }

    if (isOpen) {
      fetchMinFee()
    }
  }, [isOpen])

  const handleStartGame = async () => {
    if (!address) {
      alert('Please connect your wallet first')
      return
    }

    const fee = parseFloat(entryFee)
    if (fee < minFee) {
      alert(`Minimum entry fee is ${minFee} MON`)
      return
    }

    setIsLoading(true)
    try {
      // Convert MON to wei
      const entryFeeWei = gameUtils.parseMonToWei(fee)
      
      // Call smart contract to lock entry fee
      const txHash = await smartContract.createGameWithFee(entryFeeWei)
      
      // Update Convex with entry fee and start game
      await startGame({
        roomId,
        creatorAddress: address,
        entryFee: fee,
        transactionHash: txHash,
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
              disabled={isLoading}
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
                0x8a78...B0D1
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
            disabled={isLoading || parseFloat(entryFee) < minFee}
            className="min-w-[120px]"
          >
            {isLoading ? (
              'Starting...'
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Lock {formatMON(parseFloat(entryFee))}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
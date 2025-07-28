'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useMutation } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { smartContract, gameUtils } from '@/lib/smart-contract'
import { formatMON } from '@/lib/utils'
import { AlertTriangle, Clock, Coins } from 'lucide-react'

import { Id } from '@/../convex/_generated/dataModel'

interface RefundDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  roomId: Id<'rooms'>
  gameId: number
  creatorAddress: string
}

interface RefundEligibility {
  isEligible: boolean
  reason?: string
  blocksRemaining?: number
  cooldownBlocks?: number
  currentBlock?: number
  startBlock?: number
  vault?: bigint
}

export const RefundDialog: React.FC<RefundDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  roomId,
  gameId,
  creatorAddress,
}) => {
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [eligibility, setEligibility] = useState<RefundEligibility | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refundGameMutation = useMutation(api.rooms.refundGame)

  // Check refund eligibility
  useEffect(() => {
    const checkEligibility = async () => {
      if (!isOpen || !address) return

      try {
        setError(null)
        
        // Get game data from contract
        let gameData
        try {
          gameData = await smartContract.getGame(gameId)
        } catch (error) {
          // Game doesn't exist on blockchain yet
          setEligibility({
            isEligible: false,
            reason: 'Game not found on blockchain. It may not have been created yet.',
            cooldownBlocks: 256, // Default value
            currentBlock: 0,
            startBlock: 0,
            vault: BigInt(0),
          })
          return
        }

        const cooldownBlocks = await smartContract.getCooldownBlocks()
        const currentBlock = await smartContract.getCurrentBlockNumber()

        // Check if game is started and not finalized
        if (!gameData.started) {
          setEligibility({
            isEligible: false,
            reason: 'Game has not been started yet',
            cooldownBlocks: Number(cooldownBlocks),
            currentBlock: Number(currentBlock),
            startBlock: Number(gameData.startBlock),
            vault: gameData.vault,
          })
          return
        }

        if (gameData.finalized) {
          setEligibility({
            isEligible: false,
            reason: 'Game has already been finalized',
            cooldownBlocks: Number(cooldownBlocks),
            currentBlock: Number(currentBlock),
            startBlock: Number(gameData.startBlock),
            vault: gameData.vault,
          })
          return
        }

        // Check if creator is the connected wallet
        if (gameData.creator.toLowerCase() !== address.toLowerCase()) {
          setEligibility({
            isEligible: false,
            reason: 'Only the game creator can refund the game',
            cooldownBlocks: Number(cooldownBlocks),
            currentBlock: Number(currentBlock),
            startBlock: Number(gameData.startBlock),
            vault: gameData.vault,
          })
          return
        }

        // Check cooldown period
        const blocksSinceStart = Number(currentBlock) - Number(gameData.startBlock)
        const blocksRemaining = Number(cooldownBlocks) - blocksSinceStart

        if (blocksRemaining > 0) {
          setEligibility({
            isEligible: false,
            reason: `Cooldown period not reached. ${blocksRemaining} blocks remaining.`,
            blocksRemaining,
            cooldownBlocks: Number(cooldownBlocks),
            currentBlock: Number(currentBlock),
            startBlock: Number(gameData.startBlock),
            vault: gameData.vault,
          })
          return
        }

        // All conditions met - eligible for refund
        setEligibility({
          isEligible: true,
          cooldownBlocks: Number(cooldownBlocks),
          currentBlock: Number(currentBlock),
          startBlock: Number(gameData.startBlock),
          vault: gameData.vault,
        })

              } catch (err) {
          console.error('Error checking refund eligibility:', err)
          if (err instanceof Error && err.message.includes('GameNotFound')) {
            setError('Game not found on blockchain. The game may not have been properly created or started.')
          } else {
            setError(err instanceof Error ? err.message : 'Failed to check refund eligibility')
          }
        }
    }

    checkEligibility()
  }, [isOpen, address, gameId])

  const handleRefund = async () => {
    if (!address || !eligibility?.isEligible) return

    setIsLoading(true)
    setError(null)

    try {
      // Call smart contract to refund
      await smartContract.refundGame(gameId)
      
      // Update Convex state
      await refundGameMutation({
        roomId,
        creatorAddress: address,
      })

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to refund game:', err)
      setError(err instanceof Error ? err.message : 'Failed to refund game')
    } finally {
      setIsLoading(false)
    }
  }

  const getTimeRemaining = () => {
    if (!eligibility?.blocksRemaining || eligibility.blocksRemaining <= 0) return null
    
    // Estimate time based on ~12 second block time
    const estimatedSeconds = eligibility.blocksRemaining * 12
    const minutes = Math.floor(estimatedSeconds / 60)
    const seconds = estimatedSeconds % 60
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Refund Stuck Game
          </DialogTitle>
          <DialogDescription>
            Refund the game vault if the game has become stuck and the cooldown period has passed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {eligibility && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Vault Amount:</span>
                  <div className="font-medium">
                    {eligibility.vault ? formatMON(gameUtils.formatWeiToMon(eligibility.vault)) : 'Loading...'}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Cooldown Blocks:</span>
                  <div className="font-medium">{eligibility.cooldownBlocks}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Start Block:</span>
                  <div className="font-medium">{eligibility.startBlock}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Current Block:</span>
                  <div className="font-medium">{eligibility.currentBlock}</div>
                </div>
              </div>

              {eligibility.isEligible ? (
                <Alert>
                  <AlertDescription>
                    ✅ This game is eligible for refund. The cooldown period has passed and you are the game creator.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    ❌ {eligibility.reason}
                    {eligibility.blocksRemaining && eligibility.blocksRemaining > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        Estimated time remaining: {getTimeRemaining()}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleRefund}
            disabled={!eligibility?.isEligible || isLoading}
            variant="destructive"
          >
            {isLoading ? 'Processing...' : 'Refund Game'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
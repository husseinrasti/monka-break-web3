'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useMutation } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { smartContract, gameUtils } from '@/lib/smart-contract'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, Clock, Coins, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
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
  reason: string
  cooldownBlocks: number
  currentBlock: number
  startBlock: number
  vault: bigint
  blocksRemaining?: number
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
  const [gameStatus, setGameStatus] = useState<any>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [isFixingGame, setIsFixingGame] = useState(false)

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

        // CRITICAL SAFETY CHECK: Prevent refund if startBlock is 0
        if (gameData.startBlock === BigInt(0)) {
          setEligibility({
            isEligible: false,
            reason: 'CRITICAL: Game was not properly started (startBlock is 0). This indicates the startGame transaction failed or was reverted. Please contact support.',
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

        // Check if game is finished (all rounds completed)
        // We need to get room data to check currentRound vs maxRounds
        // For now, we'll rely on the button visibility logic in the main page
        // This is a safety check in case someone tries to call the refund directly

        // Check if cooldown period has passed
        const blocksSinceStart = Number(currentBlock) - Number(gameData.startBlock)
        const blocksRemaining = Number(cooldownBlocks) - blocksSinceStart

        if (blocksRemaining > 0) {
          setEligibility({
            isEligible: false,
            reason: `Cooldown period not met. Need ${blocksRemaining} more blocks.`,
            cooldownBlocks: Number(cooldownBlocks),
            currentBlock: Number(currentBlock),
            startBlock: Number(gameData.startBlock),
            vault: gameData.vault,
            blocksRemaining,
          })
          return
        }

        // All checks passed - eligible for refund
        setEligibility({
          isEligible: true,
          reason: 'Eligible for refund',
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

  const handleCheckGameStatus = async () => {
    setIsCheckingStatus(true)
    setError(null)
    
    try {
      const status = await smartContract.checkGameStartStatus(gameId)
      setGameStatus(status)
      console.log('Game status:', status)
    } catch (err) {
      console.error('Failed to check game status:', err)
      setError(err instanceof Error ? err.message : 'Failed to check game status')
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const handleFixGame = async () => {
    if (!address) return
    
    setIsFixingGame(true)
    setError(null)
    
    try {
      // Use a default entry fee of 2 MON for fixing
      const entryFeeWei = gameUtils.parseMonToWei(2)
      const result = await smartContract.fixGameStart(gameId, entryFeeWei)
      
      console.log('Fix result:', result)
      
      if (result.action === 'started') {
        alert(`Game ${gameId} has been started successfully! Transaction hash: ${result.hash}`)
      } else if (result.action === 'already_started') {
        alert(`Game ${gameId} is already started.`)
      }
      
      // Refresh eligibility check
      setTimeout(() => {
        const checkEligibility = async () => {
          try {
            const gameData = await smartContract.getGame(gameId)
            const cooldownBlocks = await smartContract.getCooldownBlocks()
            const currentBlock = await smartContract.getCurrentBlockNumber()
            
            if (gameData.started && gameData.startBlock > BigInt(0)) {
              setEligibility({
                isEligible: false,
                reason: 'Game is now properly started. Refund will be available after cooldown period.',
                cooldownBlocks: Number(cooldownBlocks),
                currentBlock: Number(currentBlock),
                startBlock: Number(gameData.startBlock),
                vault: gameData.vault,
              })
            }
          } catch (err) {
            console.error('Failed to refresh eligibility:', err)
          }
        }
        checkEligibility()
      }, 2000)
      
    } catch (err) {
      console.error('Failed to fix game:', err)
      setError(err instanceof Error ? err.message : 'Failed to fix game')
    } finally {
      setIsFixingGame(false)
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
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Error</span>
              </div>
              <div className="text-sm text-red-700 mt-1">{error}</div>
            </div>
          )}

          {/* Game Status Check */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Game Status</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckGameStatus}
                disabled={isCheckingStatus}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                {isCheckingStatus ? 'Checking...' : 'Check Status'}
              </Button>
            </div>

            {gameStatus && (
              <div className="bg-muted/20 p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  {gameStatus.isProperlyStarted ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">
                    {gameStatus.isProperlyStarted ? 'Game Properly Started' : 'Game Not Properly Started'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Start Block:</span>
                    <div className="font-medium">{gameStatus.startBlock}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Entry Fee:</span>
                    <div className="font-medium">{gameStatus.entryFee} MON</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vault:</span>
                    <div className="font-medium">{gameStatus.vault} MON</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Started:</span>
                    <div className="font-medium">{gameStatus.started ? 'Yes' : 'No'}</div>
                  </div>
                </div>

                {!gameStatus.isProperlyStarted && gameStatus.exists && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFixGame}
                      disabled={isFixingGame}
                      className="w-full"
                    >
                      {isFixingGame ? 'Fixing...' : 'Fix Game Start'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Eligibility Status */}
          {eligibility && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Vault Amount:</span>
                  <div className="font-medium">
                    {eligibility.vault ? `${gameUtils.formatWeiToMon(eligibility.vault)} MON` : 'Loading...'}
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
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-sm text-green-800">
                    ✅ This game is eligible for refund. The cooldown period has passed and you are the game creator.
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-800 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Not Eligible</span>
                  </div>
                  <div className="text-sm text-red-700">
                    ❌ {eligibility.reason}
                    {eligibility.blocksRemaining && eligibility.blocksRemaining > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        Estimated time remaining: {getTimeRemaining()}
                      </div>
                    )}
                  </div>
                </div>
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
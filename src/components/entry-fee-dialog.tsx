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
import { createPublicClient, http } from 'viem'
import { formatMON } from '@/lib/utils'
import { Coins, Lock, AlertTriangle } from 'lucide-react'
import { Id } from '@/../convex/_generated/dataModel'

type EntryFeeDialogProps = {
  isOpen: boolean
  onClose: () => void
  roomId: Id<'rooms'>
  gameId: number
  onSuccess: () => void
}

export const EntryFeeDialog: React.FC<EntryFeeDialogProps> = ({
  isOpen,
  onClose,
  roomId,
  gameId,
  onSuccess,
}) => {
  const { address, chain } = useAccount()
  const { switchChain } = useSwitchChain()
  const startGame = useMutation(api.rooms.startGame)
  const gameConfig = useQuery(api.gameConfig.getOrCreateGameConfig, {})

  const [entryFee, setEntryFee] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSwitchingChain, setIsSwitchingChain] = useState(false)
  const [costEstimate, setCostEstimate] = useState<{
    entryFee: number
    gasCost: number
    totalCost: number
  } | null>(null)
  const [userBalance, setUserBalance] = useState<number | null>(null)

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

  // Estimate cost when entry fee changes
  useEffect(() => {
    const estimateCost = async () => {
      if (!entryFee || !address || !isCorrectChain || parseFloat(entryFee) < minFee) {
        setCostEstimate(null)
        return
      }

      try {
        const fee = parseFloat(entryFee)
        const entryFeeWei = gameUtils.parseMonToWei(fee)
        
        const estimate = await smartContract.estimateTotalCost(entryFeeWei, gameId)
        setCostEstimate({
          entryFee: gameUtils.formatWeiToMon(estimate.entryFee),
          gasCost: gameUtils.formatWeiToMon(estimate.gasCost),
          totalCost: gameUtils.formatWeiToMon(estimate.totalCost)
        })
      } catch (error) {
        console.error('Failed to estimate cost:', error)
        setCostEstimate(null)
      }
    }

    // Debounce the cost estimation
    const timeoutId = setTimeout(estimateCost, 500)
    return () => clearTimeout(timeoutId)
  }, [entryFee, address, isCorrectChain, minFee])

  // Get user balance
  useEffect(() => {
    const getBalance = async () => {
      if (!address || !isCorrectChain) {
        setUserBalance(null)
        return
      }

      try {
        const publicClient = createPublicClient({
          chain: monadTestnet,
          transport: http()
        })
        
        const balance = await publicClient.getBalance({ address })
        setUserBalance(gameUtils.formatWeiToMon(balance))
      } catch (error) {
        console.error('Failed to get balance:', error)
        setUserBalance(null)
      }
    }

    getBalance()
  }, [address, isCorrectChain])

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
      console.log('Starting game with gameId:', gameId)
      
      // Convert MON to wei
      const entryFeeWei = gameUtils.parseMonToWei(fee)
      
      // Check user's MON balance first
      console.log('Checking user balance...')
      const publicClient = createPublicClient({
        chain: monadTestnet,
        transport: http()
      })
      
      const balance = await publicClient.getBalance({ address })
      console.log('User balance:', balance.toString(), 'wei')
      console.log('Required entry fee:', entryFeeWei.toString(), 'wei')
      
      if (balance < entryFeeWei) {
        throw new Error(`Insufficient MON balance. You have ${gameUtils.formatWeiToMon(balance)} MON but need ${fee} MON for entry fee.`)
      }
      
      // Check minimum entry fee from contract
      console.log('Checking minimum entry fee from contract...')
      const minEntryFeeWei = await smartContract.getMinEntryFee()
      console.log('Contract minimum entry fee:', gameUtils.formatWeiToMon(minEntryFeeWei), 'MON')
      
      if (entryFeeWei < minEntryFeeWei) {
        throw new Error(`Entry fee too low. Contract requires minimum ${gameUtils.formatWeiToMon(minEntryFeeWei)} MON, but you're sending ${fee} MON.`)
      }
      
      // Start the game with entry fee (game already created)
      console.log('Starting game on blockchain with entry fee...')
      console.log('Entry fee in wei:', entryFeeWei.toString())
      
      let startHash: `0x${string}`
      let startResult: any
      let retryCount = 0
      const maxRetries = 2
      
      while (retryCount <= maxRetries) {
        try {
          startHash = await smartContract.startGame(gameId, entryFeeWei)
          console.log(`Game start attempt ${retryCount + 1} with hash:`, startHash)
          
          // Wait for start transaction to be mined
          console.log('Waiting for start transaction to be mined...')
          startResult = await smartContract.waitForTransaction(startHash)
          if (startResult.success) {
            console.log('✅ Game start transaction successful')
            break
          } else {
            throw new Error(`Game start failed: ${startResult.error}`)
          }
        } catch (error) {
          retryCount++
          console.error(`Start game attempt ${retryCount} failed:`, error)
          
          if (retryCount > maxRetries) {
            throw error
          }
          
          console.log(`Retrying start game (attempt ${retryCount + 1}/${maxRetries + 1})...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      
      // Verify the game was started correctly on-chain
      console.log('Verifying game state on blockchain...')
      const gameData = await smartContract.getGame(gameId)
      console.log('Game data from blockchain:', gameData)
      
      // Critical validation: Check if startBlock is set correctly
      if (gameData.startBlock === BigInt(0)) {
        throw new Error('CRITICAL: Game startBlock is 0. The startGame transaction may have failed or been reverted.')
      }
      
      if (!gameData.started) {
        throw new Error('CRITICAL: Game is not marked as started on blockchain.')
      }
      
      if (gameData.entryFee === BigInt(0)) {
        throw new Error('CRITICAL: Game entry fee is 0 on blockchain.')
      }
      
      console.log('✅ Game successfully started on blockchain with:', {
        startBlock: Number(gameData.startBlock),
        started: gameData.started,
        entryFee: gameUtils.formatWeiToMon(gameData.entryFee),
        vault: gameUtils.formatWeiToMon(gameData.vault)
      })
      
      // Update Convex with the game start
      console.log('Updating Convex with game start...')
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
      
      // Provide specific error messages for different failure scenarios
      let errorMessage = 'Failed to start game'
      if (error instanceof Error) {
        if (error.message.includes('CRITICAL:')) {
          errorMessage = error.message
        } else if (error.message.includes('insufficient funds') || error.message.includes('Insufficient MON balance')) {
          errorMessage = error.message
        } else if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user. Please try again.'
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (error.message.includes('execution reverted')) {
          if (error.message.includes('GameNotFound()')) {
            errorMessage = 'Game not found on blockchain. Please try creating the room again.'
          } else if (error.message.includes('GameAlreadyStarted()')) {
            errorMessage = 'Game is already started on blockchain.'
          } else if (error.message.includes('NotCreator()')) {
            errorMessage = 'Only the room creator can start the game.'
          } else if (error.message.includes('InsufficientEntryFee()')) {
            errorMessage = 'Entry fee is too low. Please increase the amount.'
          } else {
            errorMessage = `Smart contract error: ${error.message}`
          }
        } else if (error.message.includes('insufficient funds for gas')) {
          errorMessage = 'Insufficient funds for gas fees. Please ensure you have enough MON for both the entry fee and gas costs.'
        } else if (error.message.includes('nonce')) {
          errorMessage = 'Transaction nonce error. Please try again in a few moments.'
        } else if (error.message.includes('replacement transaction')) {
          errorMessage = 'Transaction replacement error. Please wait a moment and try again.'
        } else {
          errorMessage = error.message
        }
      }
      
      alert(errorMessage)
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
            
            {/* Cost Estimate */}
            {costEstimate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                <div className="text-sm font-medium text-blue-900 mb-1">Estimated Total Cost</div>
                <div className="space-y-1 text-xs text-blue-800">
                  <div className="flex justify-between">
                    <span>Entry Fee:</span>
                    <span>{costEstimate.entryFee.toFixed(6)} MON</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gas Fee:</span>
                    <span>{costEstimate.gasCost.toFixed(6)} MON</span>
                  </div>
                  <div className="flex justify-between font-medium border-t border-blue-300 pt-1">
                    <span>Total:</span>
                    <span>{costEstimate.totalCost.toFixed(6)} MON</span>
                  </div>
                </div>
                
                {/* Balance Check */}
                {userBalance !== null && (
                  <div className="mt-2 pt-2 border-t border-blue-300">
                    <div className="flex justify-between text-xs">
                      <span>Your Balance:</span>
                      <span>{userBalance.toFixed(6)} MON</span>
                    </div>
                    {userBalance < costEstimate.totalCost && (
                      <div className="text-xs text-red-600 mt-1 font-medium">
                        ⚠️ Insufficient balance for total cost
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
            disabled={
              isLoading || 
              parseFloat(entryFee) < minFee || 
              !gameConfig || 
              !isCorrectChain ||
              Boolean(costEstimate && userBalance !== null && userBalance < costEstimate.totalCost)
            }
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
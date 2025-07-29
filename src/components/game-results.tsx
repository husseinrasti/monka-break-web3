'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useAccount } from 'wagmi'
import { api } from '@/../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Crown, Coins, Users } from 'lucide-react'
import { smartContract, gameUtils } from '@/lib/smart-contract'
import { formatMON } from '@/lib/utils'
import { Id } from '@/../convex/_generated/dataModel'

interface GameResultsProps {
  roomId: Id<'rooms'>
  isCreator: boolean
  winningPath?: string
}

export const GameResults: React.FC<GameResultsProps> = ({ 
  roomId, 
  isCreator,
  winningPath 
}) => {
  const { address, isConnected } = useAccount()
  const [isFinalizing, setIsFinalizing] = useState(false)

  // Get game config for dynamic stage names
  const gameConfig = useQuery(api.gameConfig.getOrCreateGameConfig, {})
  const [contractData, setContractData] = useState<{
    vault: number
    entryFee: number
    finalized: boolean
  } | null>(null)
  const [isLoadingContractData, setIsLoadingContractData] = useState(false)
  const [contractDataError, setContractDataError] = useState<string | null>(null)
  const [finalizationSuccess, setFinalizationSuccess] = useState(false)

  const roomPlayers = useQuery(api.rooms.getRoomPlayers, { roomId })
  const roomData = useQuery(api.rooms.getRoomById, { roomId })
  const finalizeGame = useMutation(api.rooms.finalizeGame)

  // Reset finalization success state when room data changes
  useEffect(() => {
    setFinalizationSuccess(false)
  }, [roomId])

  // Fetch contract data
  useEffect(() => {
    const fetchContractData = async () => {
      if (!roomData?.gameId) {
        setContractData(null)
        setContractDataError(null)
        return
      }

      setIsLoadingContractData(true)
      setContractDataError(null)

      try {
        console.log('Fetching contract data for game ID:', roomData.gameId)
        const gameInfo = await smartContract.getGame(roomData.gameId)
        console.log('Contract data received:', gameInfo)
        
        setContractData({
          vault: gameUtils.formatWeiToMon(gameInfo.vault),
          entryFee: gameUtils.formatWeiToMon(gameInfo.entryFee),
          finalized: gameInfo.finalized,
        })
      } catch (error) {
        console.error('Failed to fetch contract data:', error)
        setContractDataError(error instanceof Error ? error.message : 'Failed to fetch contract data')
        setContractData(null)
      } finally {
        setIsLoadingContractData(false)
      }
    }

    fetchContractData()
  }, [roomData?.gameId])

  // Determine winners and game results
  const gameResults = {
    winningTeam: roomData?.winners && roomData.winners.length > 0 
      ? (roomPlayers?.find(p => p.address === roomData.winners![0])?.role === 'thief' ? 'thieves' : 'police')
      : (winningPath ? 'thieves' : 'police'),
    winners: roomData?.winners && roomData.winners.length > 0
      ? roomPlayers?.filter(p => roomData.winners!.includes(p.address)) || []
      : roomPlayers?.filter(p => 
          winningPath ? p.role === 'thief' : p.role === 'police'
        ).filter(p => !p.eliminated) || [],
    totalPrize: contractData?.vault || 0,
    isFinalized: contractData?.finalized || false, // Prioritize contract data over room data
  }

  // Check if current user can finalize the game
  const canFinalize = isCreator && 
    isConnected && 
    address && 
    roomData?.creator === address && 
    roomData?.gamePhase === 'finished' &&
    roomData?.winners && roomData.winners.length > 0 &&
    contractData && !contractData.finalized && !finalizationSuccess // Use contract data for finalization status

  // Debug logging for finalize button visibility
  console.log('Finalize button debug:', {
    roomId,
    isCreator,
    isConnected,
    address,
    creatorAddress: roomData?.creator,
    gamePhase: roomData?.gamePhase,
    winners: roomData?.winners,
    contractData,
    canFinalize,
    roomDataLoading: roomData === undefined,
    roomDataExists: roomData !== null
  })

  // Get winner addresses from roomData.winners if available, otherwise from gameResults
  const getWinnerAddresses = (): `0x${string}`[] => {
    // First try to use winners from roomData (if game was already finalized in database)
    if (roomData?.winners && roomData.winners.length > 0) {
      return roomData.winners as `0x${string}`[]
    }
    
    // Otherwise use calculated winners from current game state
    if (gameResults.winners.length > 0) {
      return gameResults.winners.map(w => w.address as `0x${string}`)
    }
    
    return []
  }

  const handleFinalizeGame = async () => {
    // Enhanced validation with specific error messages
    if (!isConnected) {
      alert('Please connect your wallet to finalize the game')
      return
    }

    if (!address) {
      alert('No wallet address detected. Please connect your wallet.')
      return
    }

    if (!roomData?.gameId) {
      alert('Game ID not found. Cannot finalize game.')
      return
    }

    if (roomData.creator !== address) {
      alert('Only the room creator can finalize the game')
      return
    }

    if (contractData?.finalized) {
      alert('Game has already been finalized on the blockchain')
      return
    }

    if (roomData.gamePhase !== 'finished') {
      alert('Game is not finished yet. Cannot finalize.')
      return
    }

    setIsFinalizing(true)
    try {
      // Get winner addresses
      const winnerAddresses = getWinnerAddresses()
      
      console.log('Finalizing game with:', {
        gameId: roomData.gameId,
        winnerAddresses,
        creator: address,
        totalPrize: gameResults.totalPrize
      })
      
      // Call smart contract to finalize and distribute rewards
      const txHash = await smartContract.finalizeGame(roomData.gameId, winnerAddresses)
      console.log('Smart contract finalizeGame transaction hash:', txHash)
      
      // Wait for transaction to be mined
      console.log('Waiting for transaction to be mined...')
      const txResult = await smartContract.waitForTransaction(txHash)
      
      if (!txResult.success) {
        throw new Error(`Transaction failed: ${txResult.error}`)
      }
      
      // Update Convex state
      await finalizeGame({
        roomId,
        creatorAddress: address,
        winners: winnerAddresses,
        vault: contractData?.vault || 0,
      })

      // Set success state immediately
      setFinalizationSuccess(true)

      // Refresh contract data to reflect the new finalized state
      console.log('Refreshing contract data after successful finalization...')
      
      // Add a small delay to ensure blockchain state is updated
      setTimeout(async () => {
        if (!roomData.gameId) {
          console.error('No game ID available for contract data refresh')
          return
        }
        
        try {
          const updatedGameInfo = await smartContract.getGame(roomData.gameId)
          console.log('Updated contract data:', updatedGameInfo)
          
          setContractData({
            vault: gameUtils.formatWeiToMon(updatedGameInfo.vault),
            entryFee: gameUtils.formatWeiToMon(updatedGameInfo.entryFee),
            finalized: updatedGameInfo.finalized,
          })
        } catch (error) {
          console.error('Failed to refresh contract data after finalization:', error)
          // Even if refresh fails, we know the transaction was successful
          // So we can manually update the finalized status
          setContractData(prev => prev ? { ...prev, finalized: true } : null)
        }
      }, 2000) // 2 second delay to ensure blockchain state is updated

      if (winnerAddresses.length > 0) {
        alert(`Game finalized! Rewards of ${formatMON(contractData?.vault || 0)} have been distributed to ${winnerAddresses.length} winners.`)
      } else {
        alert('Game finalized! No winners to distribute rewards to.')
      }
    } catch (error) {
      console.error('Failed to finalize game:', error)
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to finalize game'
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas fees'
        } else if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user'
        } else if (error.message.includes('GameAlreadyFinalized')) {
          errorMessage = 'Game has already been finalized on the blockchain'
        } else if (error.message.includes('OnlyCreatorCanCall')) {
          errorMessage = 'Only the game creator can finalize the game'
        } else if (error.message.includes('GameNotStarted')) {
          errorMessage = 'Game has not been started yet'
        } else {
          errorMessage = error.message
        }
      }
      
      alert(`Failed to finalize game: ${errorMessage}`)
    } finally {
      setIsFinalizing(false)
    }
  }

  // Show loading state if room data is still loading
  if (roomData === undefined) {
    return (
      <div className="space-y-6">
        <Card className="text-center">
          <CardContent className="py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <div className="text-lg font-medium">Loading game results...</div>
            <div className="text-sm text-muted-foreground">Please wait while we fetch the game data</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error state if room data failed to load
  if (roomData === null) {
    return (
      <div className="space-y-6">
        <Card className="text-center">
          <CardContent className="py-8">
            <div className="text-4xl mb-4">❌</div>
            <div className="text-lg font-medium">Game Not Found</div>
            <div className="text-sm text-muted-foreground">The game data could not be loaded</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Game Over Header */}
      <Card className="text-center">
        <CardHeader>
          <div className="text-6xl mb-4">
            {gameResults.winningTeam === 'thieves' ? '🥷' : '👮'}
          </div>
          <CardTitle className="text-3xl">
            {gameResults.winningTeam === 'thieves' ? 'Thieves Win!' : 'Police Win!'}
          </CardTitle>
          <CardDescription className="text-lg">
            {winningPath 
              ? `The thieves successfully escaped via ${winningPath}!`
              : 'The police successfully caught the thieves!'
            }
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Winners List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Winners ({gameResults.winners.length})
          </CardTitle>
          <CardDescription>
            These players will share the prize pool
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gameResults.winners.map((winner, index) => (
              <div 
                key={winner._id}
                className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {index === 0 ? '👑' : '🏆'}
                  </div>
                  <div>
                    <div className="font-medium">
                      {winner.nickname || `Player ${winner.address.slice(-4)}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {winner.address.slice(0, 6)}...{winner.address.slice(-4)}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-amber-600">
                  {gameResults.winners.length > 0 
                    ? formatMON(gameResults.totalPrize / gameResults.winners.length)
                    : '0 MON'
                  }
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prize Pool Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            Smart Contract Vault
          </CardTitle>
          <CardDescription>
            Prize pool locked in the smart contract
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingContractData ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <div className="text-sm text-muted-foreground">Loading contract data...</div>
            </div>
          ) : contractDataError ? (
            <div className="text-center py-4">
              <div className="text-red-600 mb-2">⚠️ Failed to load contract data</div>
              <div className="text-sm text-muted-foreground mb-3">{contractDataError}</div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setContractDataError(null)
                  // Trigger refetch by updating the dependency
                  const gameId = roomData?.gameId
                  if (gameId) {
                    setContractData(null)
                    setTimeout(() => {
                      const fetchContractData = async () => {
                        try {
                          const gameInfo = await smartContract.getGame(gameId)
                          setContractData({
                            vault: gameUtils.formatWeiToMon(gameInfo.vault),
                            entryFee: gameUtils.formatWeiToMon(gameInfo.entryFee),
                            finalized: gameInfo.finalized,
                          })
                        } catch (error) {
                          setContractDataError(error instanceof Error ? error.message : 'Failed to fetch contract data')
                        }
                      }
                      fetchContractData()
                    }, 100)
                  }
                }}
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-primary">
                    {formatMON(gameResults.totalPrize)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Vault</div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-accent">
                    {gameResults.winners.length > 0 
                      ? formatMON(gameResults.totalPrize / gameResults.winners.length)
                      : '0 MON'
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Per Winner</div>
                </div>
              </div>
              
              {contractData && (
                <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Entry Fee:</span>
                    <span>{formatMON(contractData.entryFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Players:</span>
                    <span>{roomPlayers?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={contractData.finalized ? 'text-green-600' : 'text-yellow-600'}>
                      {contractData.finalized ? 'Finalized' : 'Not Finalized'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* All Players Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Final Standings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Thieves */}
            <div className="space-y-2">
              <h4 className="font-medium text-primary">🥷 Thieves</h4>
              {roomPlayers?.filter(p => p.role === 'thief').map(player => (
                <div 
                  key={player._id}
                  className={`p-2 rounded text-sm ${
                    !player.eliminated && gameResults.winningTeam === 'thieves'
                      ? 'bg-primary/10 border border-primary/20'
                      : player.eliminated
                      ? 'bg-destructive/10 border border-destructive/20 opacity-60'
                      : 'bg-muted/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>
                      {player.nickname || `Player ${player.address.slice(-4)}`}
                    </span>
                    {player.eliminated ? (
                      <Badge variant="destructive" className="text-xs">Eliminated</Badge>
                    ) : gameResults.winningTeam === 'thieves' ? (
                      <Badge className="text-xs">Winner</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Runner-up</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Police */}
            <div className="space-y-2">
              <h4 className="font-medium text-accent">👮 Police</h4>
              {roomPlayers?.filter(p => p.role === 'police').map(player => (
                <div 
                  key={player._id}
                  className={`p-2 rounded text-sm ${
                    !player.eliminated && gameResults.winningTeam === 'police'
                      ? 'bg-accent/10 border border-accent/20'
                      : player.eliminated
                      ? 'bg-destructive/10 border border-destructive/20 opacity-60'
                      : 'bg-muted/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>
                      {player.nickname || `Player ${player.address.slice(-4)}`}
                    </span>
                    {player.eliminated ? (
                      <Badge variant="destructive" className="text-xs">Eliminated</Badge>
                    ) : gameResults.winningTeam === 'police' ? (
                      <Badge className="text-xs">Winner</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Runner-up</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finalize Game (Creator Only) */}
      {isCreator && (
        <Card>
          <CardHeader>
            <CardTitle>Finalize Game</CardTitle>
            <CardDescription>
              {canFinalize ? (
                `Trigger the smart contract to distribute ${formatMON(gameResults.totalPrize)} to ${roomData?.winners?.length || 0} winners`
              ) : (
                <div className="space-y-1">
                  {!isConnected && <div>• Please connect your wallet</div>}
                  {isConnected && !address && <div>• Wallet address not detected</div>}
                  {address && roomData?.creator !== address && <div>• Only the room creator can finalize the game</div>}
                  {contractData?.finalized && <div>• Game has already been finalized on the blockchain</div>}
                  {roomData?.gamePhase !== 'finished' && <div>• Game is not finished yet</div>}
                  {roomData?.gamePhase === 'finished' && (!roomData?.winners || roomData.winners.length === 0) && <div>• No winners to distribute rewards to</div>}
                  {!contractData && !isLoadingContractData && <div>• Contract data not available</div>}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleFinalizeGame}
              disabled={isFinalizing || !canFinalize}
              className="w-full"
              size="lg"
            >
              {isFinalizing ? (
                'Finalizing Game...'
              ) : finalizationSuccess ? (
                'Finalization Successful!'
              ) : !canFinalize ? (
                'Cannot Finalize'
              ) : (
                `Finalize & Distribute ${formatMON(gameResults.totalPrize)}`
              )}
            </Button>
            <div className="text-xs text-muted-foreground text-center mt-2">
              {finalizationSuccess 
                ? 'Game has been successfully finalized and rewards distributed!'
                : canFinalize 
                ? 'This will call the smart contract to distribute rewards to winners'
                : isLoadingContractData 
                ? 'Loading contract data...'
                : 'Connect your wallet as the room creator to finalize the game'
              }
            </div>
          </CardContent>
        </Card>
      )}

      {(contractData?.finalized || finalizationSuccess) && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="text-center py-6">
            <div className="text-green-600 font-medium mb-4">
              ✅ Game has been finalized and rewards distributed!
            </div>
            
            {/* Token Distribution Summary */}
            {roomData?.winners && roomData.winners.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-green-700">
                  <strong>Token Distribution:</strong>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-600">Total Distributed:</span>
                    <div className="font-medium">{formatMON(contractData?.vault || 0)}</div>
                  </div>
                  <div>
                    <span className="text-green-600">Per Winner:</span>
                    <div className="font-medium">
                      {formatMON((contractData?.vault || 0) / roomData.winners.length)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-green-600">
                  {roomData.winners.length} winner{roomData.winners.length !== 1 ? 's' : ''} received {formatMON((contractData?.vault || 0) / roomData.winners.length)} each
                </div>
              </div>
            ) : (
              <div className="text-sm text-green-700">
                <strong>Refund:</strong> The vault was returned to the game creator
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 
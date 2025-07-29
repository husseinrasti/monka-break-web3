'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { WalletConnect } from '@/components/wallet-connect'
import { EntryFeeDialog } from '@/components/entry-fee-dialog'
import { formatAddress, formatMON, getRoleColor, getRoleIcon } from '@/lib/utils'
import { ArrowLeft, Users, Clock, Play, Target, Coins, AlertTriangle, Loader2 } from 'lucide-react'
import { GameVoting } from '@/components/game-voting'
import { GameResults } from '@/components/game-results'
import { RefundDialog } from '@/components/refund-dialog'
import { RoundTimer } from '@/components/round-timer'

export default function GameRoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  
  const roomId = params.roomId as string
  const roomCode = searchParams.get('code')
  
  // Queries
  const roomData = useQuery(api.rooms.getRoomByCode, 
    roomCode ? { roomCode } : 'skip'
  )
  const roomPlayers = useQuery(api.rooms.getRoomPlayers,
    roomData ? { roomId: roomData._id } : 'skip'
  )
  const gameConfig = useQuery(api.gameConfig.getOrCreateGameConfig, {})

  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isEntryFeeDialogOpen, setIsEntryFeeDialogOpen] = useState(false)
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false)
  const [isPhaseActive, setIsPhaseActive] = useState(true)

  // Calculate time remaining for current phase and phase active state
  useEffect(() => {
    if (!roomData?.phaseEndTime) return

    const updateTimer = () => {
      const now = Date.now()
      const remaining = Math.max(0, roomData.phaseEndTime! - now)
      setTimeRemaining(remaining)
      
      // Update phase active state
      const isActive = remaining > 0 && roomData.gamePhase === 'voting'
      setIsPhaseActive(isActive)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [roomData?.phaseEndTime, roomData?.gamePhase])

  const handleStartGameClick = () => {
    if (!isConnected || !address || !roomData) return
    
    // Check if gameId exists (game was created on blockchain)
    if (!roomData.gameId) {
      alert('Game not properly created on blockchain. Please try creating the room again.')
      return
    }
    
    setIsEntryFeeDialogOpen(true)
  }

  const handleEntryFeeDialogClose = () => {
    setIsEntryFeeDialogOpen(false)
  }

  const handleGameStarted = () => {
    // The dialog will close automatically, and the game should refresh
    // No additional action needed as the queries will update automatically
  }

  const handleRefundDialogClose = () => {
    setIsRefundDialogOpen(false)
  }

  const handleRefundSuccess = () => {
    // The dialog will close automatically, and the game should refresh
    // No additional action needed as the queries will update automatically
  }

  const getPhaseDisplay = () => {
    if (!roomData || !gameConfig) return null

    const getStageName = (round: number) => {
      const stageIndex = round - 1
      if (gameConfig?.stageNames && gameConfig.stageNames.length === 4) {
        return gameConfig.stageNames[stageIndex] || `Stage ${round}`
      }
      return `Stage ${round}`
    }

    switch (roomData.gamePhase) {
      case 'waiting':
        return 'Waiting for players...'
      case 'voting':
        return `${getStageName(roomData.currentRound)}: Team Voting`
      case 'finished':
        return 'Game Finished!'
      default:
        return 'Unknown phase'
    }
  }

  const getTeamStats = () => {
    if (!roomPlayers) return { thieves: 0, police: 0 }
    return {
      thieves: roomPlayers.filter(p => p.role === 'thief' && !p.eliminated).length,
      police: roomPlayers.filter(p => p.role === 'police').length, // Police are never eliminated
    }
  }

  const canStartGame = () => {
    if (!roomData || !roomPlayers || !address || !gameConfig) return false
    if (roomData.creator !== address) return false
    if (roomData.started) return false
    
    const stats = getTeamStats()
    return stats.thieves >= gameConfig.minThieves && 
           stats.police >= gameConfig.minPolice &&
           roomPlayers.length >= gameConfig.minPlayersToStart
  }

  const getStartButtonText = () => {
    if (!isConnected) return 'Connect Wallet to Start'
    if (!gameConfig) return 'Loading...'
    
    const stats = getTeamStats()
    if (stats.thieves < gameConfig.minThieves) {
      return `Need ${gameConfig.minThieves}+ thieves`
    }
    if (stats.police < gameConfig.minPolice) {
      return `Need ${gameConfig.minPolice}+ police`
    }
    if (!roomPlayers || roomPlayers.length < gameConfig.minPlayersToStart) {
      return `Need ${gameConfig.minPlayersToStart}+ players total`
    }
    
    return null // Show normal start button
  }

  const currentPlayer = roomPlayers?.find(p => p.address === address)
  const teamStats = getTeamStats()

  // Determine if we're still loading the room data
  // roomData will be undefined while loading, but we need to distinguish between:
  // 1. Still loading (roomCode exists but roomData is undefined)
  // 2. Loaded but room not found (roomCode exists, roomData is null)
  const isLoadingRoom = roomCode && roomData === undefined
  const roomNotFound = roomCode && roomData === null

  // Show loading state while room data is being fetched
  if (isLoadingRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <CardTitle className="mb-2">Loading Room...</CardTitle>
            <CardDescription>
              Finding room {roomCode}...
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show room not found only after we've confirmed the room doesn't exist
  if (roomNotFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">❌</div>
            <CardTitle className="mb-2">Room Not Found</CardTitle>
            <CardDescription>
              The game room could not be found. Please check the room code.
            </CardDescription>
            <Button 
              onClick={() => router.push('/')} 
              className="mt-4"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // At this point, roomData should be defined (not null or undefined)
  if (!roomData) {
    return null // This should never happen, but TypeScript needs this check
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/')}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="text-2xl">🥷</div>
            <div>
              <h1 className="text-xl font-bold text-primary">Room {roomCode}</h1>
              <p className="text-sm text-muted-foreground">{getPhaseDisplay()}</p>
            </div>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Game Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Game Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entry Fee:</span>
                <span className="font-medium">{formatMON(roomData.entryFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Round:</span>
                <span className="font-medium">{roomData.currentRound}/{roomData.maxRounds}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phase:</span>
                <span className="font-medium">{getPhaseDisplay()}</span>
              </div>
              
              {timeRemaining > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Time Remaining:</span>
                    <span className="font-mono">{Math.ceil(timeRemaining / 1000)}s</span>
                  </div>
                  <Progress value={(timeRemaining / (gameConfig?.timings.voteDuration || 20) * 1000) * 100} />
                </div>
              )}

              {!roomData.started && roomData.creator === address && (
                <Button 
                  onClick={handleStartGameClick}
                  disabled={!canStartGame() || !isConnected}
                  className="w-full"
                  size="lg"
                >
                  {getStartButtonText() || (
                    <>
                      <Coins className="mr-2 h-4 w-4" />
                      Start Game
                    </>
                  )}
                </Button>
              )}

              {roomData.started && !roomData.finalized && roomData.creator === address && roomData.gameId && (
                <Button 
                  onClick={() => setIsRefundDialogOpen(true)}
                  variant="outline"
                  className="w-full"
                  size="lg"
                  title="Refund stuck game (only available after cooldown period)"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Refund Game
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Team Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Teams ({roomPlayers?.length || 0}/{gameConfig?.maxTotalPlayers || '...'})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-primary flex items-center gap-2">
                    🥷 Thieves ({teamStats.thieves})
                  </h4>
                  <div className="space-y-1">
                    {roomPlayers?.filter(p => p.role === 'thief').map(player => (
                      <div 
                        key={player._id} 
                        className={`text-sm p-2 rounded border ${
                          player.address === address ? 'bg-primary/10 border-primary/30' : 'bg-muted/20'
                        } ${player.eliminated ? 'opacity-50' : ''}`}
                      >
                        <div className="font-medium">
                          {player.nickname || formatAddress(player.address)}
                        </div>
                        {player.eliminated && (
                          <div className="text-xs text-accent">Eliminated</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-accent flex items-center gap-2">
                    👮 Police ({teamStats.police})
                  </h4>
                  <div className="space-y-1">
                    {roomPlayers?.filter(p => p.role === 'police').map(player => (
                      <div 
                        key={player._id} 
                        className={`text-sm p-2 rounded border ${
                          player.address === address ? 'bg-accent/10 border-accent/30' : 'bg-muted/20'
                        }`}
                      >
                        <div className="font-medium">
                          {player.nickname || formatAddress(player.address)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Game Phase Content */}
        {roomData.started && currentPlayer && (
          <div className="mt-6">
            {/* Round Timer */}
            <RoundTimer
              roomId={roomData._id}
              phaseEndTime={roomData.phaseEndTime}
              gamePhase={roomData.gamePhase}
              currentRound={roomData.currentRound}
              onPhaseEnd={() => {
                // Refresh data when phase ends
                window.location.reload()
              }}
            />
            
            {roomData.gamePhase === 'voting' && (
              <GameVoting
                roomId={roomData._id}
                currentRound={roomData.currentRound}
                playerRole={currentPlayer.role}
                playerAddress={address!}
                phaseEndTime={roomData.phaseEndTime}
                isPhaseActive={isPhaseActive}
                isEliminated={currentPlayer.eliminated}
              />
            )}
            
            {roomData.gamePhase === 'finished' && (
              <GameResults
                roomId={roomData._id}
                isCreator={roomData.creator === address}
                winningPath={roomData.winningPath}
              />
            )}
          </div>
        )}

        {/* Waiting Room Info */}
        {!roomData.started && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Waiting for Game to Start</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-lg">
                  Share this room code with other players:
                </div>
                <div className="text-3xl font-mono font-bold text-primary bg-primary/10 py-4 rounded-lg">
                  {roomCode}
                </div>
                <div className="text-sm text-muted-foreground">
                  {gameConfig ? (
                    `Minimum ${gameConfig.minThieves} thieves, ${gameConfig.minPolice} police (${gameConfig.minPlayersToStart} total) required to start`
                  ) : (
                    'Loading requirements...'
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Entry Fee Dialog */}
      {isEntryFeeDialogOpen && roomData && (
        <EntryFeeDialog
          isOpen={isEntryFeeDialogOpen}
          onClose={handleEntryFeeDialogClose}
          roomId={roomData._id}
          gameId={roomData.gameId || 0}
          onSuccess={handleGameStarted}
        />
      )}

      {roomData?._id && roomData.gameId && (
        <RefundDialog
          isOpen={isRefundDialogOpen}
          onClose={handleRefundDialogClose}
          onSuccess={handleRefundSuccess}
          roomId={roomData._id}
          gameId={roomData.gameId}
          creatorAddress={roomData.creator}
        />
      )}
    </div>
  )
} 
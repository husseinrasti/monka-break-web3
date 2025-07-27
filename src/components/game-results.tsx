'use client'

import React, { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Crown, Coins, Users } from 'lucide-react'

interface GameResultsProps {
  roomId: string
  isCreator: boolean
  winningPath?: string
}

export const GameResults: React.FC<GameResultsProps> = ({ 
  roomId, 
  isCreator,
  winningPath 
}) => {
  const [isFinalizing, setIsFinalizing] = useState(false)

  const roomPlayers = useQuery(api.rooms.getRoomPlayers, { roomId })
  const roomData = useQuery(api.rooms.getRoomByCode, 
    roomPlayers?.[0] ? { roomCode: 'dummy' } : 'skip'
  ) // We need a better way to get room data here

  // Mock data for now - in real implementation, this would come from smart contract
  const gameResults = {
    winningTeam: winningPath ? 'thieves' : 'police',
    winners: roomPlayers?.filter(p => 
      winningPath ? p.role === 'thief' : p.role === 'police'
    ).filter(p => !p.eliminated) || [],
    totalPrize: roomPlayers ? roomPlayers.length * 2 : 0, // Assuming 2 MON entry fee
  }

  const handleFinalizeGame = async () => {
    setIsFinalizing(true)
    try {
      // This would call the smart contract to distribute rewards
      alert('Game finalized! Rewards have been distributed.')
    } catch (error) {
      console.error('Failed to finalize game:', error)
      alert('Failed to finalize game. Please try again.')
    } finally {
      setIsFinalizing(false)
    }
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
                  {(gameResults.totalPrize / gameResults.winners.length).toFixed(2)} MON
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
            Prize Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">
                {gameResults.totalPrize} MON
              </div>
              <div className="text-sm text-muted-foreground">Total Prize</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-accent">
                {gameResults.winners.length > 0 
                  ? (gameResults.totalPrize / gameResults.winners.length).toFixed(2)
                  : '0'
                } MON
              </div>
              <div className="text-sm text-muted-foreground">Per Winner</div>
            </div>
          </div>
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
              Trigger the smart contract to distribute rewards to winners
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleFinalizeGame}
              disabled={isFinalizing}
              className="w-full"
              size="lg"
            >
              {isFinalizing ? (
                'Finalizing Game...'
              ) : (
                'Finalize & Distribute Rewards'
              )}
            </Button>
            <div className="text-xs text-muted-foreground text-center mt-2">
              This will call the smart contract to distribute {gameResults.totalPrize} MON to {gameResults.winners.length} winners
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 
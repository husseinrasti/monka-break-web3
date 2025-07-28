'use client'

import React, { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { Id } from '@/../convex/_generated/dataModel'

interface GameCommitProps {
  roomId: Id<'rooms'>
  currentRound: number
  playerAddress: string
}

export const GameCommit: React.FC<GameCommitProps> = ({ 
  roomId, 
  currentRound, 
  playerAddress 
}) => {
  const [isCommitting, setIsCommitting] = useState(false)

  // Get game config for dynamic stage names
  const gameConfig = useQuery(api.gameConfig.getOrCreateGameConfig, {})

  const commitVote = useMutation(api.votes.commitVote)
  
  const playerVote = useQuery(api.votes.getPlayerVote, {
    roomId,
    round: currentRound,
    address: playerAddress,
  })

  const handleCommit = async () => {
    if (!playerVote || playerVote.committed) return

    setIsCommitting(true)
    try {
      await commitVote({
        roomId,
        address: playerAddress,
      })
    } catch (error) {
      console.error('Failed to commit vote:', error)
      alert('Failed to commit vote to blockchain. Please try again.')
    } finally {
      setIsCommitting(false)
    }
  }

  if (!playerVote) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-accent mx-auto mb-4" />
          <CardTitle className="mb-2">No Vote Found</CardTitle>
          <CardDescription>
            You need to submit a vote first before committing to the blockchain.
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {gameConfig?.stageNames && gameConfig.stageNames.length === 4 
            ? gameConfig.stageNames[currentRound - 1] 
            : `Stage ${currentRound}`}: Blockchain Commit
        </CardTitle>
        <CardDescription>
          Commit your vote to the Monad blockchain to make it final
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Vote Summary */}
        <div className="bg-muted/20 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Your Vote:</span>
            <Badge variant="secondary">{playerVote.choice}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <div className="flex items-center gap-2">
              {playerVote.committed ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">Committed</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-500">Pending</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Commit Action */}
        {!playerVote.committed ? (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-lg font-medium">Ready to Commit?</div>
              <div className="text-sm text-muted-foreground">
                This action will send your vote to the Monad blockchain and cannot be undone.
              </div>
            </div>

            <Button
              onClick={handleCommit}
              disabled={isCommitting}
              className="w-full"
              size="lg"
            >
              {isCommitting ? (
                'Committing to Blockchain...'
              ) : (
                'Confirm Move on Blockchain'
              )}
            </Button>

            <div className="text-xs text-muted-foreground text-center">
              ⚠️ Make sure you have enough MON for gas fees
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="text-green-500">
              <CheckCircle className="h-16 w-16 mx-auto mb-4" />
              <div className="text-lg font-medium">Vote Committed!</div>
              <div className="text-sm text-muted-foreground">
                Your move has been successfully recorded on the blockchain.
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Waiting for other players to commit their moves...
            </div>
          </div>
        )}

        {/* Game Rules Reminder */}
        <Card className="bg-muted/10">
          <CardContent className="p-4">
            <div className="text-sm space-y-2">
              <div className="font-medium">Commit Phase Rules:</div>
              <ul className="text-muted-foreground space-y-1 text-xs">
                <li>• At least 2/3 of players per team must commit for the round to proceed</li>
                <li>• Votes become final once committed to blockchain</li>
                <li>• Players who don't commit may be eliminated</li>
                <li>• Gas fees are required for blockchain transactions</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
} 
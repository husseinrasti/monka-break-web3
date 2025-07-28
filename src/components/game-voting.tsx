'use client'

import React, { useState, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Vote, Users } from 'lucide-react'
import { Id } from '@/../convex/_generated/dataModel'

interface GameVotingProps {
  roomId: Id<'rooms'>
  currentRound: number
  playerRole: 'thief' | 'police'
  playerAddress: string
  phaseEndTime?: number
  isPhaseActive: boolean
}

export const GameVoting: React.FC<GameVotingProps> = ({ 
  roomId, 
  currentRound, 
  playerRole, 
  playerAddress,
  phaseEndTime,
  isPhaseActive
}) => {
  const [selectedPath, setSelectedPath] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitVote = useMutation(api.votes.submitVote)
  
  const playerVote = useQuery(api.votes.getPlayerVote, {
    roomId,
    round: currentRound,
    address: playerAddress,
  })
  
  const policeVotes = useQuery(api.votes.getPoliceVoteSummary, {
    roomId,
    round: currentRound,
  })

  // Set initial selection from existing vote
  useEffect(() => {
    if (playerVote && !selectedPath) {
      setSelectedPath(playerVote.choice)
    }
  }, [playerVote, selectedPath])

  const handleVoteSubmit = async () => {
    if (!selectedPath.trim()) return

    setIsSubmitting(true)
    try {
      await submitVote({
        roomId,
        address: playerAddress,
        choice: selectedPath.trim(),
      })
    } catch (error) {
      console.error('Failed to submit vote:', error)
      alert('Failed to submit vote. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get game config for dynamic paths
  const gameConfig = useQuery(api.gameConfig.getOrCreateGameConfig, {})
  
  // Calculate stage index (0-based)
  const stageIndex = currentRound - 1
  
  // Get paths for current stage
  const getStagePaths = () => {
    if (!gameConfig?.pathNames || gameConfig.pathNames.length !== 12) {
      console.warn('Invalid pathNames configuration, using fallback')
      return ['Path A', 'Path B', 'Path C']
    }
    
    const startIndex = stageIndex * 3
    const endIndex = startIndex + 3
    return gameConfig.pathNames.slice(startIndex, endIndex)
  }
  
  const pathOptions = getStagePaths()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vote className="h-5 w-5" />
          {gameConfig?.stageNames && gameConfig.stageNames.length === 4 
            ? gameConfig.stageNames[currentRound - 1] 
            : `Stage ${currentRound}`}: Team Voting
        </CardTitle>
        <CardDescription>
          {playerRole === 'thief' 
            ? 'Choose your individual path for this round'
            : 'Vote with your team on which path to block'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vote Options */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2">
            {pathOptions.map((path) => (
              <Button
                key={path}
                variant={selectedPath === path ? 'default' : 'outline'}
                onClick={() => setSelectedPath(path)}
                className="justify-start h-12"
              >
                {path}
                {playerRole === 'police' && policeVotes && (
                  <Badge variant="secondary" className="ml-auto">
                    {policeVotes.choices[path] || 0} votes
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Police Team Voting Summary */}
        {playerRole === 'police' && policeVotes && (
          <Card className="bg-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Votes ({policeVotes.totalVotes})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1 text-sm">
                {Object.entries(policeVotes.choices).map(([choice, count]) => (
                  <div key={choice} className="flex justify-between">
                    <span>{choice}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleVoteSubmit}
          disabled={
            isSubmitting || 
            !selectedPath ||
            !isPhaseActive
          }
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            'Submitting Vote...'
          ) : !isPhaseActive ? (
            'Voting Ended'
          ) : playerVote ? (
            'Update Vote'
          ) : (
            'Submit Vote'
          )}
        </Button>

        {playerVote && (
          <div className="text-center text-sm text-muted-foreground">
            Current vote: <span className="font-medium">{playerVote.choice}</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          {playerRole === 'thief' 
            ? 'Thieves vote individually. Your vote is private until the commit phase.'
            : 'Police vote as a team. You can see how your teammates are voting.'
          }
        </div>
      </CardContent>
    </Card>
  )
} 
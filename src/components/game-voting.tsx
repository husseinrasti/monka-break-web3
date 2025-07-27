'use client'

import React, { useState, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Vote, Users } from 'lucide-react'

interface GameVotingProps {
  roomId: string
  currentRound: number
  playerRole: 'thief' | 'police'
  playerAddress: string
}

export const GameVoting: React.FC<GameVotingProps> = ({ 
  roomId, 
  currentRound, 
  playerRole, 
  playerAddress 
}) => {
  const [selectedPath, setSelectedPath] = useState('')
  const [customPath, setCustomPath] = useState('')
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
    const finalChoice = selectedPath === 'custom' ? customPath : selectedPath
    if (!finalChoice.trim()) return

    setIsSubmitting(true)
    try {
      await submitVote({
        roomId,
        address: playerAddress,
        choice: finalChoice.trim(),
      })
    } catch (error) {
      console.error('Failed to submit vote:', error)
      alert('Failed to submit vote. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const pathOptions = ['Path A', 'Path B', 'Path C']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vote className="h-5 w-5" />
          Round {currentRound}: Team Voting
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
            
            {/* Custom Path Option */}
            <div className="space-y-2">
              <Button
                variant={selectedPath === 'custom' ? 'default' : 'outline'}
                onClick={() => setSelectedPath('custom')}
                className="justify-start h-12 w-full"
              >
                Custom Path
              </Button>
              
              {selectedPath === 'custom' && (
                <Input
                  placeholder="Enter your custom path name..."
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  maxLength={50}
                />
              )}
            </div>
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
            (selectedPath === 'custom' && !customPath.trim())
          }
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            'Submitting Vote...'
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
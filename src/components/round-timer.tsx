'use client'

import React, { useState, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Id } from '@/../convex/_generated/dataModel'

interface RoundTimerProps {
  roomId: Id<'rooms'>
  phaseEndTime?: number
  gamePhase: 'waiting' | 'voting' | 'finished'
  currentRound: number
  onPhaseEnd: () => void
}

export const RoundTimer: React.FC<RoundTimerProps> = ({
  roomId,
  phaseEndTime,
  gamePhase,
  currentRound,
  onPhaseEnd,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isPhaseEnded, setIsPhaseEnded] = useState(false)
  const [roundResult, setRoundResult] = useState<{
    winningPath: string
    eliminatedPlayers: number
    totalVotes: number
    policeChoice: string
  } | null>(null)

  const resolveRound = useMutation(api.rooms.resolveRound)
  const gameConfig = useQuery(api.gameConfig.getOrCreateGameConfig, {})

  // Timer effect
  useEffect(() => {
    if (!phaseEndTime) {
      setTimeRemaining(0)
      return
    }

    const updateTimer = () => {
      const now = Date.now()
      const remaining = Math.max(0, phaseEndTime - now)
      setTimeRemaining(remaining)

      // Check if phase has ended
      if (remaining <= 0 && !isPhaseEnded) {
        setIsPhaseEnded(true)
        handlePhaseEnd()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [phaseEndTime, isPhaseEnded])

  const handlePhaseEnd = async () => {
    if (gamePhase === 'voting') {
      try {
        const result = await resolveRound({ roomId })
        setRoundResult(result)
        onPhaseEnd()
      } catch (error) {
        console.error('Failed to resolve round:', error)
      }
    }
  }

  const getPhaseDisplay = () => {
    const stageIndex = currentRound - 1
    const stageName = gameConfig?.stageNames && gameConfig.stageNames.length === 4
      ? gameConfig.stageNames[stageIndex]
      : `Stage ${currentRound}`

    switch (gamePhase) {
      case 'voting':
        return `${stageName}: Team Voting`
      case 'finished':
        return 'Game Finished!'
      default:
        return 'Unknown phase'
    }
  }

  const getTimeDisplay = () => {
    if (timeRemaining <= 0) return '00:00'
    
    const minutes = Math.floor(timeRemaining / 60000)
    const seconds = Math.floor((timeRemaining % 60000) / 1000)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const isPhaseActive = () => {
    return timeRemaining > 0 && (gamePhase === 'voting')
  }

  if (gamePhase === 'finished') {
    return null
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          {getPhaseDisplay()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer Display */}
        <div className="text-center">
          <div className="text-3xl font-mono font-bold text-primary">
            {getTimeDisplay()}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {isPhaseActive() ? 'Time remaining' : 'Phase ended'}
          </div>
        </div>

        {/* Phase Status */}
        <div className="flex items-center justify-center gap-2">
          {isPhaseActive() ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-500">Phase Active</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-500">Phase Ended</span>
            </>
          )}
        </div>

        {/* Round Result Display */}
        {roundResult && (
          <div className="bg-muted/20 p-4 rounded-lg space-y-2">
            <div className="text-center font-medium">Round Results</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Winning Path:</span>
                <div className="font-medium text-green-600">{roundResult.winningPath}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Police Blocked:</span>
                <div className="font-medium text-blue-600">{roundResult.policeChoice}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total Votes:</span>
                <div className="font-medium">{roundResult.totalVotes}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Thieves Eliminated:</span>
                <div className="font-medium text-red-600">{roundResult.eliminatedPlayers}</div>
              </div>
            </div>
          </div>
        )}

        {/* Warning for ended phase */}
        {!isPhaseActive() && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Voting has ended</span>
            </div>
            <div className="text-xs text-amber-700 mt-1">
              Thieves who chose the path blocked by police have been eliminated. Police continue to the next round.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WalletConnect } from '@/components/wallet-connect'
import { ArrowLeft, Users } from 'lucide-react'

export default function JoinGamePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { address, isConnected } = useAccount()
  const joinRoom = useMutation(api.rooms.joinRoom)

  const [roomCode, setRoomCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [selectedRole, setSelectedRole] = useState<'thief' | 'police' | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Get room data when room code is entered
  const roomData = useQuery(
    api.rooms.getRoomByCode, 
    roomCode.length === 6 ? { roomCode: roomCode.toUpperCase() } : 'skip'
  )
  const roomPlayers = useQuery(
    api.rooms.getRoomPlayers,
    roomData ? { roomId: roomData._id } : 'skip'
  )
  const gameConfig = useQuery(api.gameConfig.getOrCreateGameConfig, {})

  // Pre-fill room code from URL if provided
  useEffect(() => {
    const urlRoomCode = searchParams.get('room')
    if (urlRoomCode) {
      setRoomCode(urlRoomCode.toUpperCase())
    }
  }, [searchParams])

  const handleJoinRoom = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }

    if (!selectedRole) {
      alert('Please select a role')
      return
    }

    if (roomCode.length !== 6) {
      alert('Please enter a valid 6-character room code')
      return
    }

    setIsLoading(true)
    try {
      const roomId = await joinRoom({
        roomCode: roomCode.toUpperCase(),
        address,
        nickname: nickname || undefined,
        role: selectedRole,
      })

      // Navigate to the game room
      router.push(`/game/${roomId}?code=${roomCode.toUpperCase()}`)
    } catch (error) {
      console.error('Failed to join room:', error)
      alert(`Failed to join room: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getTeamStats = () => {
    if (!roomPlayers) return { thieves: 0, police: 0 }
    return {
      thieves: roomPlayers.filter(p => p.role === 'thief').length,
      police: roomPlayers.filter(p => p.role === 'police').length,
    }
  }

  const getMaxPlayersPerTeam = () => {
    if (!gameConfig) return 5 // fallback
    return Math.floor(gameConfig.maxTotalPlayers / 2)
  }

  const isTeamFull = (role: 'thief' | 'police') => {
    if (!gameConfig) return false
    const stats = getTeamStats()
    const maxPerTeam = getMaxPlayersPerTeam()
    return role === 'thief' ? stats.thieves >= maxPerTeam : stats.police >= maxPerTeam
  }

  const teamStats = getTeamStats()
  const maxPerTeam = getMaxPlayersPerTeam()

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
            <h1 className="text-2xl font-bold text-primary">MonkaBreak</h1>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Join Game</h2>
          <p className="text-muted-foreground">
            Enter a room code to join an existing game
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Join Game Room</CardTitle>
            <CardDescription>
              Enter the 6-character room code to join
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Room Code */}
            <div className="space-y-2">
              <Label htmlFor="roomCode">Room Code</Label>
              <Input
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="text-center text-lg font-mono tracking-wider"
              />
            </div>

            {/* Room Info */}
            {roomData && (
              <Card className="bg-muted/20">
                <CardContent className="p-4">
                  <div className="text-center mb-3">
                    <div className="font-semibold">Room Found!</div>
                    <div className="text-sm text-muted-foreground">
                      Entry Fee: {roomData.entryFee} MON
                    </div>
                  </div>
                  
                  {roomData.started ? (
                    <div className="text-center text-accent">
                      ⚠️ Game already started
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>🥷 Thieves:</span>
                        <span>{teamStats.thieves}/{maxPerTeam}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>👮 Police:</span>
                        <span>{teamStats.police}/{maxPerTeam}</span>
                      </div>
                      {gameConfig && (
                        <div className="flex justify-between text-sm">
                          <span>Total:</span>
                          <span>{teamStats.thieves + teamStats.police}/{gameConfig.maxTotalPlayers}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Nickname */}
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname (Optional)</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your game nickname"
                maxLength={20}
              />
            </div>

            {/* Role Selection */}
            {roomData && !roomData.started && (
              <div className="space-y-3">
                <Label>Choose Your Role</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Card 
                    className={`cursor-pointer transition-colors ${
                      selectedRole === 'thief' 
                        ? 'border-primary bg-primary/10' 
                        : isTeamFull('thief')
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => !isTeamFull('thief') && setSelectedRole('thief')}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl mb-2">🥷</div>
                      <div className="font-medium">Thief</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {teamStats.thieves}/{maxPerTeam} players
                      </div>
                      {isTeamFull('thief') && (
                        <div className="text-xs text-accent mt-1">Full</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-colors ${
                      selectedRole === 'police' 
                        ? 'border-accent bg-accent/10' 
                        : isTeamFull('police')
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-accent/50'
                    }`}
                    onClick={() => !isTeamFull('police') && setSelectedRole('police')}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl mb-2">👮</div>
                      <div className="font-medium">Police</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {teamStats.police}/{maxPerTeam} players
                      </div>
                      {isTeamFull('police') && (
                        <div className="text-xs text-accent mt-1">Full</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Join Button */}
            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleJoinRoom}
              disabled={
                isLoading || 
                !isConnected || 
                !roomData || 
                roomData.started || 
                !selectedRole ||
                isTeamFull(selectedRole) ||
                (gameConfig && roomPlayers && roomPlayers.length >= gameConfig.maxTotalPlayers)
              }
            >
              {isLoading ? (
                'Joining Room...'
              ) : !isConnected ? (
                'Connect Wallet to Join'
              ) : !roomData ? (
                'Enter Room Code'
              ) : roomData.started ? (
                'Game Already Started'
              ) : !selectedRole ? (
                'Select a Role'
              ) : selectedRole && isTeamFull(selectedRole) ? (
                `${selectedRole === 'thief' ? 'Thieves' : 'Police'} Team Full`
              ) : gameConfig && roomPlayers && roomPlayers.length >= gameConfig.maxTotalPlayers ? (
                'Room Full'
              ) : (
                <>
                  <Users className="mr-2 h-5 w-5" />
                  Join as {selectedRole === 'thief' ? '🥷 Thief' : '👮 Police'}
                </>
              )}
            </Button>

            {!isConnected && (
              <div className="text-center">
                <WalletConnect />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 
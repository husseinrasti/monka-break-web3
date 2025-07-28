'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WalletConnect } from '@/components/wallet-connect'
import { formatMON } from '@/lib/utils'
import { Users, Clock, Shield, Target } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const activeRooms = useQuery(api.rooms.listActiveRooms)

  const handleCreateGame = () => {
    router.push('/create')
  }

  const handleJoinGame = () => {
    router.push('/join')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🥷</div>
            <h1 className="text-2xl font-bold text-primary">MonkaBreak</h1>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-5xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Strategic On-Chain Gaming
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Join the ultimate heist experience on Monad Testnet. Choose your side - Thieves or Police - 
            and compete in real-time strategic rounds for MON rewards.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              onClick={handleCreateGame}
              className="text-lg px-8 py-6 h-auto"
            >
              <Target className="mr-2 h-5 w-5" />
              Create Game
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleJoinGame}
              className="text-lg px-8 py-6 h-auto"
            >
              <Users className="mr-2 h-5 w-5" />
              Join Game
            </Button>
          </div>
        </div>

        {/* Game Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Choose Your Role
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Play as cunning Thieves planning the perfect heist, or strategic Police trying to catch them in the act.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Real-Time Rounds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Engage in fast-paced 4-round games with voting phases, strategic decision-making, and on-chain commits.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Earn MON Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Win games and earn MON tokens. Entry fees create prize pools distributed to winning players.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Active Rooms */}
        <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-6 text-center">Active Game Rooms</h3>
          
          {activeRooms === undefined ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activeRooms.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-4xl mb-4">🎮</div>
                <CardTitle className="mb-2">No Active Games</CardTitle>
                <CardDescription>
                  Be the first to create a game room and start playing!
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRooms.map((room) => (
                <Card key={room._id} className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="font-mono text-lg">{room.roomCode}</span>
                      <span className={`text-sm px-2 py-1 rounded ${
                        room.started ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'
                      }`}>
                        {room.started ? 'In Progress' : 'Waiting'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entry Fee:</span>
                        <span className="font-medium">{formatMON(room.entryFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Players:</span>
                        <span className="font-medium">{room.playerCount}/8</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 
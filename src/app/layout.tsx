import React from 'react'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ConvexProvider } from './providers/convex-provider'
import { WalletProvider } from './providers/wallet-provider'
import { MultisynqProvider } from '@/components/multisynq-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MonkaBreak - Strategic On-Chain Gaming',
  description: 'A strategic heist game built on Monad Testnet. Join as Thieves or Police and compete for rewards.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background`}>
        <ConvexProvider>
          <WalletProvider>
            <MultisynqProvider>
              <main className="min-h-screen">
                {children}
              </main>
            </MultisynqProvider>
          </WalletProvider>
        </ConvexProvider>
      </body>
    </html>
  )
} 
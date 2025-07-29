import React from 'react'
import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ConvexProvider } from './providers/convex-provider'
import { WalletProvider } from './providers/wallet-provider'
import { MultisynqProvider } from '@/components/multisynq-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MonkaBreak - Strategic On-Chain Gaming',
  description: 'A strategic heist game built on Monad Testnet. Join as Thieves or Police and compete for rewards.',
  keywords: ['blockchain', 'gaming', 'monad', 'web3', 'strategy', 'heist'],
  authors: [{ name: 'MonkaBreak Team' }],
  creator: 'MonkaBreak Team',
  publisher: 'MonkaBreak',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://monka-break-web3.vercel.app',
    title: 'MonkaBreak - Strategic On-Chain Gaming',
    description: 'A strategic heist game built on Monad Testnet. Join as Thieves or Police and compete for rewards.',
    siteName: 'MonkaBreak',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MonkaBreak - Strategic On-Chain Gaming',
    description: 'A strategic heist game built on Monad Testnet. Join as Thieves or Police and compete for rewards.',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#000000" />
      </head>
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
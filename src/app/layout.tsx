import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'Night League Scorer',
    template: '%s | Night League Scorer',
  },
  description: 'Professional cricket tournament management — live scoring, analytics, and stats for local leagues.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Night League',
  },
  openGraph: {
    type: 'website',
    siteName: 'Night League Scorer',
    title: 'Night League Scorer',
    description: 'Live cricket scoring for your local tournament',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0f0a',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0f0a] text-green-50">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}

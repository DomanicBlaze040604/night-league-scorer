'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Activity, Trophy, BarChart3, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/matches', label: 'Matches', icon: Activity },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/points-table', label: 'Points Table', icon: BarChart3 },
  { href: '/players', label: 'Players', icon: Users },
  { href: '/admin', label: 'Admin', icon: Settings },
]

export default function Navbar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Desktop top navbar */}
      <header className="hidden md:flex sticky top-0 z-50 w-full border-b border-green-900/40 bg-[#0a0f0a]/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mr-8">
            <span className="text-xl">🏏</span>
            <span className="gradient-text font-bold text-lg tracking-tight">Night League</span>
          </Link>

          {/* Desktop nav links */}
          <nav className="flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive(href)
                    ? 'text-green-400 bg-green-900/30'
                    : 'text-gray-400 hover:text-green-400 hover:bg-green-900/20'
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile top logo bar */}
      <header className="md:hidden sticky top-0 z-50 flex items-center justify-center h-12 border-b border-green-900/40 bg-[#0a0f0a]/90 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg">🏏</span>
          <span className="gradient-text font-bold text-base tracking-tight">Night League</span>
        </Link>
      </header>

      {/* Mobile bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-green-900/40 bg-[#0a0f0a]/95 backdrop-blur-md h-16 px-1">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-all duration-150',
              isActive(href)
                ? 'text-green-400'
                : 'text-gray-500 hover:text-green-400'
            )}
          >
            <Icon size={20} strokeWidth={isActive(href) ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Spacer so content isn't hidden behind the mobile bottom nav */}
      <div className="md:hidden h-16" aria-hidden="true" />
    </>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, Home, Sun, Moon, Flame, BarChart2, Calendar, MapPin, User, Settings, MessageSquare, HelpCircle, Mail, Bug, TrendingUp, LogOut, CreditCard } from 'lucide-react'
import { NotificationCenter } from './notifications/NotificationCenter'
import { useTheme } from '@/components/ThemeProvider'
import { supabase } from '@/lib/supabase'
import { resetAnalytics } from '@/lib/analytics'

const menuSections = [
  {
    label: 'Main',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Morning', href: '/morning', icon: Sun },
      { name: 'Evening', href: '/evening', icon: Moon },
      { name: 'Emergency', href: '/emergency', icon: Flame },
    ],
  },
  {
    label: 'Reflection',
    items: [
      { name: 'Weekly Insight', href: '/weekly', icon: BarChart2 },
      { name: 'Monthly Insight', href: '/monthly-insight', icon: Calendar },
      { name: 'Quarterly Trajectory', href: '/quarterly', icon: TrendingUp },
      { name: 'Daily History', href: '/history', icon: MapPin },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'Pricing', href: '/pricing', icon: CreditCard },
      { name: 'Profile', href: '/profile', icon: User },
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Feedback', href: '/feedback', icon: MessageSquare },
    ],
  },
  {
    label: 'Support',
    items: [
      { name: 'Help', href: '/about', icon: HelpCircle },
      { name: 'Contact', href: '/feedback', icon: Mail },
    ],
  },
]

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700 w-full text-gray-900 dark:text-gray-100 dark:text-white"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      {isDark ? 'Light mode' : 'Dark mode'}
    </button>
  )
}

export function AppHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    resetAnalytics()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (pathname === '/' || pathname === '/login' || pathname === '/countdown' || pathname?.startsWith('/auth')) return null

  return (
    <header
      className="app-header sticky top-0 left-0 right-0 border-b-2 bg-white dark:bg-gray-800 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:border-gray-700 px-4 py-3 flex items-center justify-between"
    >
      <Link href="/dashboard" className="text-lg font-medium text-gray-900 dark:text-gray-100 dark:text-white">
        Wheel of Founders
      </Link>

      <div ref={menuRef} className="relative flex items-center gap-2">
        <NotificationCenter />
        <Link
          href="/feedback"
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:text-[#ef725c] transition-colors"
          aria-label="Report a bug"
        >
          <Bug className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Report a bug</span>
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-none border-2 border-gray-200 dark:border-gray-700 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-gray-900 dark:text-gray-100 dark:text-white" />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-2 py-2 w-64 max-h-[80vh] overflow-y-auto border-2 border-gray-200 dark:border-gray-700 dark:border-gray-700 z-50 bg-white dark:bg-gray-800 dark:bg-gray-800"
          >
            {menuSections.map((section) => (
              <div key={section.label} className="py-2">
                <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  {section.label}
                </p>
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700 ${isActive ? 'text-[#ef725c] dark:text-[#f0886c]' : 'text-gray-900 dark:text-gray-100 dark:text-white'}`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            ))}
            <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <ThemeToggle />
            </div>
            <hr className="my-2 border-gray-200 dark:border-gray-700" />
            <button
              onClick={async () => {
                await handleSignOut()
                setMenuOpen(false)
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

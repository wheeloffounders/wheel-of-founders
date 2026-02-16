'use client'

import { useState, useEffect, useRef } from 'react'
import { Home, Sun, Flame, Moon, BarChart2, Calendar, MapPin, User, MessageSquare, Settings, DollarSign, BarChart3, FlaskConical, LogOut, Menu, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { resetAnalytics } from '@/lib/analytics'
import MobileSidebar from './MobileSidebar'

export type NavItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const insightsRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .maybeSingle()
        setIsAdmin(!!profile?.is_admin)
      } else {
        setIsAdmin(false)
      }
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
      if (session?.user?.id) {
        supabase.from('user_profiles').select('is_admin').eq('id', session.user.id).maybeSingle()
          .then(({ data }) => setIsAdmin(!!data?.is_admin))
      } else {
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (insightsRef.current && !insightsRef.current.contains(target)) {
        setInsightsOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('wof_theme')
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const initialTheme = stored === 'light' || stored === 'dark' ? (stored as 'light' | 'dark') : prefersDark ? 'dark' : 'light'
    setTheme(initialTheme)
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('wof_theme', next)
        document.documentElement.classList.toggle('dark', next === 'dark')
      }
      return next
    })
  }

  const handleSignOut = async () => {
    resetAnalytics()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const mainNavItems: NavItem[] = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Morning', href: '/morning', icon: Sun },
    { name: 'Emergency', href: '/emergency', icon: Flame },
    { name: 'Evening', href: '/evening', icon: Moon },
  ]

  const insightsItems: NavItem[] = [
    { name: 'Weekly', href: '/weekly', icon: Calendar },
    { name: 'Journey', href: '/history', icon: MapPin },
  ]

  const profileItems: NavItem[] = [
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Feedback', href: '/feedback', icon: MessageSquare },
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Pricing', href: '/pricing', icon: DollarSign },
  ]

  const adminItems: NavItem[] = [
    { name: 'Cross-User Analytics', href: '/admin/cross-user-analytics', icon: BarChart3 },
    { name: 'Experiments', href: '/admin/experiments', icon: FlaskConical },
  ]

  const navLinkBase =
    'flex items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 rounded-md text-sm font-medium transition-colors touch-manipulation'

  const isDark = theme === 'dark'

  const isInsightsActive = pathname === '/weekly' || pathname === '/history'
  const isProfileActive = pathname === '/profile' || pathname === '/feedback' || pathname === '/settings' || pathname === '/pricing' || pathname.startsWith('/admin')

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 overflow-visible transition-colors bg-[#152b50] text-white border-b border-[#152b50]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 py-0">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link
                href="/"
                className={`flex items-center focus:outline-none focus:ring-2 focus:ring-[#ef725c] focus:ring-offset-2 rounded ${isDark ? 'focus:ring-offset-[#152b50]' : 'focus:ring-offset-white'}`}
              >
                <Image src="/logo.jpg" alt="Wheel of Founders" width={180} height={76} className="w-[140px] md:w-[180px] h-auto object-contain object-left" priority unoptimized />
              </Link>
            </div>

            {/* Mobile: Hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className={`md:hidden p-2 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center ${isDark ? 'text-[#ef725c] hover:bg-gray-700' : 'text-[#ef725c] hover:bg-gray-100'}`}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Desktop: Nav links */}
            <div className="hidden md:flex flex-nowrap items-center gap-2">
              {mainNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${navLinkBase} ${isActive ? 'bg-[#ef725c] text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                  >
                    <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}

              {/* Insights dropdown */}
              <div ref={insightsRef} className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setInsightsOpen((o) => !o)
                    setProfileOpen(false)
                  }}
                  className={`${navLinkBase} ${isInsightsActive ? 'bg-[#ef725c] text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                  aria-expanded={insightsOpen}
                  aria-haspopup="true"
                >
                  <BarChart2 className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>Insights</span>
                  <ChevronDown className={`w-4 h-4 ml-1 flex-shrink-0 transition-transform ${insightsOpen ? 'rotate-180' : ''}`} />
                </button>
                {insightsOpen && (
                  <div
                    className="absolute left-0 top-full mt-1 py-1 w-40 rounded-lg bg-[#152b50] border border-white/20 shadow-lg z-[100] min-w-max"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {insightsItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link key={item.name} href={item.href} onClick={() => setInsightsOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-white/90 hover:bg-white/10">
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Profile dropdown */}
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setProfileOpen((o) => !o)
                    setInsightsOpen(false)
                  }}
                  className={`${navLinkBase} ${isProfileActive ? 'bg-[#ef725c] text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                >
                  <User className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>Profile</span>
                  <ChevronDown className={`w-4 h-4 ml-1 flex-shrink-0 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
                {profileOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 py-1 w-52 rounded-lg bg-[#152b50] border border-white/20 shadow-lg z-[100] min-w-max"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {profileItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link key={item.name} href={item.href} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-white/90 hover:bg-white/10">
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {item.name}
                        </Link>
                      )
                    })}
                    {isAdmin && adminItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link key={item.name} href={item.href} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-white/90 hover:bg-white/10">
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {item.name}
                        </Link>
                      )
                    })}
                    <div className="border-t border-white/20 my-1" />
                    {isLoggedIn && (
                      <button
                        onClick={() => { handleSignOut(); setProfileOpen(false) }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-200 hover:bg-red-900/30 text-left"
                      >
                        <LogOut className="w-4 h-4 flex-shrink-0" />
                        Logout
                      </button>
                    )}
                    {!isLoggedIn && (
                      <Link href="/login" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-white/90 hover:bg-white/10">
                        <LogOut className="w-4 h-4 flex-shrink-0" />
                        Log in
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Theme toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle dark / light mode"
                className={`${navLinkBase} ${isDark ? 'text-gray-200 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-[#152b50]'}`}
              >
                {isDark ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pathname={pathname}
        mainNavItems={mainNavItems}
        insightsItems={insightsItems}
        profileItems={profileItems}
        adminItems={isAdmin ? adminItems : []}
        isLoggedIn={isLoggedIn}
        onSignOut={handleSignOut}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </>
  )
}

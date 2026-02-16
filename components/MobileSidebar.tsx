'use client'

import { useEffect, useRef } from 'react'
import { LogOut, X, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export type NavItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

type MobileSidebarProps = {
  isOpen: boolean
  onClose: () => void
  pathname: string
  mainNavItems: NavItem[]
  insightsItems: NavItem[]
  profileItems: NavItem[]
  adminItems: NavItem[]
  isLoggedIn: boolean
  onSignOut: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export default function MobileSidebar({
  isOpen,
  onClose,
  pathname,
  mainNavItems,
  insightsItems,
  profileItems,
  adminItems,
  isLoggedIn,
  onSignOut,
  theme,
  onToggleTheme,
}: MobileSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null)
  const previousActiveRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only close on route change
  }, [pathname])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !sidebarRef.current) return
    const focusables = sidebarRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (first) {
      previousActiveRef.current = document.activeElement as HTMLElement | null
      first.focus()
    }
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', handleTab)
    return () => {
      document.removeEventListener('keydown', handleTab)
      previousActiveRef.current?.focus()
    }
  }, [isOpen])

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${
      isActive
        ? 'bg-[#ef725c] text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`

  const isDark = theme === 'dark'

  const renderLink = (item: NavItem) => {
    const Icon = item.icon
    const isActive = pathname === item.href
    return (
      <li key={item.name}>
        <Link href={item.href} onClick={onClose} className={linkClass(isActive)}>
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span>{item.name}</span>
        </Link>
      </li>
    )
  }

  return (
    <>
      <div
        role="presentation"
        aria-hidden={!isOpen}
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        ref={sidebarRef}
        aria-label="Mobile navigation"
        aria-hidden={!isOpen}
        className={`fixed top-0 left-0 h-full w-[280px] z-[70] flex flex-col shadow-xl transition-transform duration-300 ease-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDark ? 'bg-[#152b50] text-white' : 'bg-white text-[#152b50]'}`}
      >
        <div
          className={`flex items-center justify-between p-4 flex-shrink-0 border-b ${
            isDark ? 'border-white/10' : 'border-gray-200'
          }`}
        >
          <Link
            href="/"
            onClick={onClose}
            className={`flex items-center focus:outline-none focus:ring-2 focus:ring-[#ef725c] focus:ring-offset-2 rounded ${
              isDark ? 'focus:ring-offset-[#152b50]' : 'focus:ring-offset-white'
            }`}
          >
            <Image src="/logo.jpg" alt="Wheel of Founders" width={180} height={76} className="w-[160px] h-auto object-contain object-left" unoptimized />
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label="Toggle dark / light mode"
              className={`p-2 rounded-lg touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors ${
                isDark
                  ? 'text-gray-200 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-[#152b50]'
              }`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className={`p-2 rounded-lg touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors ${
                isDark
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-[#152b50]'
              }`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {mainNavItems.map(renderLink)}

            <li className={`pt-2 mt-2 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <span className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Insights</span>
            </li>
            {insightsItems.map(renderLink)}

            <li className={`pt-2 mt-2 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <span className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Profile</span>
            </li>
            {profileItems.map(renderLink)}
            {adminItems.map(renderLink)}

            <li className={`pt-2 mt-2 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`} />
            {isLoggedIn && (
              <li>
                <button
                  onClick={() => {
                    onSignOut()
                    onClose()
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-red-700 hover:text-white transition-colors touch-manipulation min-h-[44px]"
                  aria-label="Sign out"
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  <span>Logout</span>
                </button>
              </li>
            )}
          </ul>
        </nav>
      </aside>
    </>
  )
}

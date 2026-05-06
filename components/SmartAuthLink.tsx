'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type SmartAuthLinkProps = {
  className?: string
  loggedOutLabel?: string
  loggedInLabel?: string
  loggedOutHref?: string
  loggedInHref?: string
  onBeforeNavigate?: (ctx: { isLoggedIn: boolean; href: string }) => void
  children?: ReactNode
}

export function SmartAuthLink({
  className,
  loggedOutLabel = 'Log in',
  loggedInLabel = 'Dashboard',
  loggedOutHref = '/auth/login',
  loggedInHref = '/dashboard',
  onBeforeNavigate,
  children,
}: SmartAuthLinkProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    let cancelled = false
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) setIsLoggedIn(Boolean(session))
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session))
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const href = isLoggedIn ? loggedInHref : loggedOutHref

  return (
    <Link
      href={href}
      className={className}
      onClick={() => onBeforeNavigate?.({ isLoggedIn, href })}
    >
      {children ?? (isLoggedIn ? loggedInLabel : loggedOutLabel)}
    </Link>
  )
}

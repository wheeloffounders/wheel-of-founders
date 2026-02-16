'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initAnalytics, trackPageView, identifyUser, resetAnalytics } from '@/lib/analytics'
import { supabase } from '@/lib/supabase'

/**
 * Client component that initializes PostHog, tracks page views,
 * and identifies/resets on auth changes. Add to root layout.
 */
export default function PostHogProvider() {
  const pathname = usePathname()

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('tier, created_at')
          .eq('id', session.user.id)
          .maybeSingle()
        identifyUser(session.user.id, {
          tier: profile?.tier ?? 'beta',
          email: session.user.email ?? undefined,
          preferred_name: session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? undefined,
          created_at: profile?.created_at ?? undefined,
        })
      }
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        resetAnalytics()
      } else if (session?.user) {
        supabase
          .from('user_profiles')
          .select('tier, created_at')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            identifyUser(session.user.id, {
              tier: profile?.tier ?? 'beta',
              email: session.user.email ?? undefined,
              preferred_name: session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? undefined,
              created_at: profile?.created_at ?? undefined,
            })
          })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (pathname) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const tier = (session?.user as { tier?: string })?.tier
        trackPageView(pathname, tier)
      })
    }
  }, [pathname])

  return null
}

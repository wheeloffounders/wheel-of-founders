'use client'

import { supabase } from '@/lib/supabase'

export async function startGoogleCalendarOAuth(nextPath: string): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}&calendar_oauth=1`
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'custom:google-calendar' as any,
    options: {
      redirectTo,
      scopes: 'openid email profile https://www.googleapis.com/auth/calendar',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })
  if (error) throw error
}

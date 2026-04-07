'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isWhitelistAdminEmail } from '@/lib/admin-emails'

/**
 * Protect /admin: `user_profiles.is_admin` or team email allowlist (`lib/admin-emails`).
 * Uses client-side auth checks so the session (cookies) is available and
 * avoids "Auth session missing!" server-side errors.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.replace(`/auth/login?returnTo=${encodeURIComponent(pathname || '/admin')}`)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profileError) {
          router.replace(`/auth/login?returnTo=${encodeURIComponent(pathname || '/admin')}`)
          return
        }

        const allow =
          !!profile?.is_admin || isWhitelistAdminEmail(session.user.email ?? undefined)
        if (!allow) {
          router.replace('/')
          return
        }

        setIsAdmin(true)
      } catch (error) {
        console.error('[admin layout] Unexpected error:', error)
        router.replace('/auth/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAdmin()
  }, [pathname, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ef725c] mx-auto" />
          <p className="mt-4 text-gray-700 dark:text-gray-300 dark:text-gray-400">Checking access...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return <>{children}</>
}

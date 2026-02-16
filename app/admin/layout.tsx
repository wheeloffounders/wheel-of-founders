'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Protect all /admin routes - only allow users with is_admin = true.
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
          router.replace(`/login?returnTo=${encodeURIComponent(pathname || '/admin')}`)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profileError) {
          router.replace(`/login?returnTo=${encodeURIComponent(pathname || '/admin')}`)
          return
        }

        if (!profile?.is_admin) {
          router.replace('/')
          return
        }

        setIsAdmin(true)
      } catch (error) {
        console.error('[admin layout] Unexpected error:', error)
        router.replace('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAdmin()
  }, [pathname, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ef725c] mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking access...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return <>{children}</>
}

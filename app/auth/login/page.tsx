'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react'
import GoogleIcon from '@/components/icons/GoogleIcon'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  /** Internal paths only — avoids open redirects */
  const rawReturnTo = searchParams?.get('returnTo') || '/dashboard'
  const returnTo =
    rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/dashboard'
  const errorParam = searchParams?.get('error')
  const messageParam = searchParams?.get('message')

  // Redirect if already authenticated
  useEffect(() => {
    getUserSession()
      .then((session) => {
        if (session) {
          router.replace(returnTo)
          router.refresh()
        }
      })
      .finally(() => setCheckingSession(false))
  }, [returnTo, router])

  // Show error or message from URL (e.g. OAuth failure, password reset success)
  useEffect(() => {
    if (errorParam) setError(errorParam)
  }, [errorParam])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session) {
        throw new Error('Login succeeded but no session was established. Please try again.')
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[auth/login] Login successful, redirecting to', returnTo)
      }

      // Full-page navigation is most reliable after password login: cookies + middleware run
      // before the next document load, avoiding RSC "Failed to fetch" limbo on slow dev builds.
      window.location.assign(returnTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log in')
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setSocialLoading('google')
    setError(null)
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?next=${encodeURIComponent(returnTo)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (authError) throw authError
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
    } finally {
      setSocialLoading(null)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">Checking session...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Link href="/auth" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to login options
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/icon-192x192.png"
              alt="Wheel of Founders logo"
              width={56}
              height={56}
              className="rounded-2xl shadow-sm"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Log in to continue your founder journey
          </p>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || socialLoading !== null}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50 mb-6"
          >
            {socialLoading === 'google' ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <GoogleIcon />
            )}
            <span>Continue with Google</span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500">or</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            {messageParam && !error && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
                {messageParam}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d] disabled:opacity-50 font-medium"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/auth/forgot-password" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-400">
              Forgot password?
            </Link>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-[#ef725c] hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

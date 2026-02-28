'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { AlertCircle, LogIn, UserPlus } from 'lucide-react'
import GoogleIcon from '@/components/icons/GoogleIcon'

export default function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams?.get('returnTo') || '/dashboard'

  // Redirect if already authenticated (e.g. after OAuth callback, or direct /login visit)
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

  const handleAuth = async (isSignUp: boolean) => {
    setLoading(true)
    setError(null)

    try {
      let authError

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        authError = error
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        authError = error
      }

      if (authError) {
        setError(authError.message)
      } else {
        router.push(returnTo)
        router.refresh()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setSocialLoading('google')
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 
`${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) {
        setError(error.message)
        setSocialLoading(null)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
      setSocialLoading(null)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-800 flex items-center justify-center p-4">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">Checking session...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 dark:bg-gray-800 flex 
items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-lg p-8 
w-full max-w-md border-l-4 border-[#152b50]">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 dark:text-white 
mb-6 text-center">Welcome Founder</h1>
        <p className="text-center text-gray-700 dark:text-gray-300 dark:text-gray-300 
mb-8">Sign up or log in to manage your day.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 
rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-6">
          <p className="text-center text-sm text-gray-700 dark:text-gray-300 
dark:text-gray-300 mb-4">Continue with:</p>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || socialLoading !== null}
              className="w-full flex items-center justify-center gap-3 
py-3 px-4 border-2 border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg 
bg-white dark:bg-gray-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300 font-medium 
hover:bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 hover:border-gray-300 dark:border-gray-600 
disabled:opacity-70 disabled:cursor-not-allowed transition-all 
duration-200 hover:shadow-sm"
            >
              {socialLoading === 'google' ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <GoogleIcon />
              )}
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700 
dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 dark:bg-gray-800 
text-gray-500 dark:text-gray-500 dark:text-gray-400">or</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium 
text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              autoComplete="email"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 
dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#152b50] 
focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 
dark:bg-gray-800"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium 
text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 
dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#152b50] 
focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 
dark:bg-gray-800"
              disabled={loading}
            />
          </div>

          <button
            type="button"
            onClick={() => handleAuth(false)}
            className="w-full py-3 px-4 bg-[#ef725c] text-white 
font-semibold rounded-lg hover:bg-[#e8654d] disabled:opacity-70 
disabled:cursor-not-allowed transition flex items-center justify-center 
gap-2"
            disabled={loading || !email || !password}
          >
            {loading ? 'Logging in...' : <><LogIn className="w-5 h-5" /> 
Log In</>}
          </button>
          <button
            type="button"
            onClick={() => handleAuth(true)}
            className="w-full py-3 px-4 bg-[#152b50] text-white 
font-semibold rounded-lg hover:bg-[#1a3565] disabled:opacity-70 
disabled:cursor-not-allowed transition flex items-center justify-center 
gap-2"
            disabled={loading || !email || !password}
          >
            {loading ? 'Signing up...' : <><UserPlus className="w-5 h-5" 
/> Sign Up</>}
          </button>
        </div>

        <p className="text-center text-gray-500 dark:text-gray-500 dark:text-gray-400 text-sm 
mt-6">
          Need help? <Link href="#" className="text-[#ef725c] 
hover:underline">Contact support</Link>
        </p>
      </div>
    </div>
  )
}

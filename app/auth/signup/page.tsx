'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Mail, Lock, User, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react'
import {
  getWarmAuthMessage,
  parseMorningEntryContext,
} from '@/lib/morning-entry-nudge'
import { appendFunnelQuery, getAuthSocialProofBody } from '@/lib/blog-interactive-funnels'
import { applyBlogTrialGiftFromAuthClient } from '@/lib/blog-trial-gift-profile'

export default function SignUpPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPendingDecision, setHasPendingDecision] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const entryContext = parseMorningEntryContext(searchParams?.get('context'), null)
  const funnelParam = searchParams?.get('funnel')?.trim() || null
  const contextReturnTo = (() => {
    if (!entryContext) return '/dashboard'
    const q = new URLSearchParams()
    q.set('context', entryContext)
    if (funnelParam) q.set('funnel', funnelParam)
    return `/today?${q.toString()}`
  })()
  const rawReturnTo = searchParams?.get('returnTo') || contextReturnTo
  const returnTo =
    rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/dashboard'
  const fromParam = searchParams?.get('from')
  const warmMessage = getWarmAuthMessage(entryContext, 'signup')
  const socialProofBody = getAuthSocialProofBody(funnelParam, entryContext)
  const [blogFallbackHref, setBlogFallbackHref] = useState('/blog')

  useEffect(() => {
    const pending = localStorage.getItem('wof_pending_decision_parser')
    const hasPending = Boolean(pending)
    setHasPendingDecision(hasPending)
    if (hasPending || entryContext) {
      // One-time onboarding bypass for high-intent Decision Parser conversions.
      document.cookie = 'skip_initial_onboarding=true; Path=/; Max-Age=1800; SameSite=Lax'
    }
  }, [entryContext])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = sessionStorage.getItem('last_blog_post')?.trim() || ''
      if (stored.startsWith('/blog')) {
        setBlogFallbackHref(stored)
        return
      }
    } catch {
      // ignore storage errors
    }
    setBlogFallbackHref('/blog')
  }, [fromParam])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const base = blogFallbackHref.startsWith('/blog') ? blogFallbackHref : '/blog'
    const exitToBlog = () => {
      const u = new URL(base, window.location.origin)
      u.searchParams.set('auth_exit', '1')
      u.searchParams.set('t', String(Date.now()))
      window.location.replace(u.toString())
    }
    const onPopState = () => exitToBlog()
    window.history.pushState({ auth_back_exit: true }, '', window.location.href)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [blogFallbackHref])

  const clearLastBlogPost = () => {
    if (typeof window === 'undefined') return
    try {
      sessionStorage.removeItem('last_blog_post')
    } catch {
      // best effort
    }
  }

  const hardExitToBlog = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === 'undefined') return
    e.preventDefault()
    clearLastBlogPost()
    const base = blogFallbackHref.startsWith('/blog') ? blogFallbackHref : '/blog'
    const u = new URL(base, window.location.origin)
    u.searchParams.set('auth_exit', '1')
    u.searchParams.set('t', String(Date.now()))
    window.location.replace(u.toString())
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
        },
      })

      if (authError) throw authError

      if (!data.user) return

      // Email already registered
      if (data.user.identities?.length === 0) {
        setError('This email is already registered. Please log in instead.')
        return
      }

      // When email confirmation is disabled in Supabase, user is auto-confirmed and gets a session
      if (data.session || data.user.email_confirmed_at) {
        await applyBlogTrialGiftFromAuthClient(supabase)
        const pending = localStorage.getItem('wof_pending_decision_parser')
        if (entryContext) {
          const todayQs = new URLSearchParams()
          todayQs.set('context', entryContext)
          if (funnelParam) todayQs.set('funnel', funnelParam)
          window.location.href = `/today?${todayQs.toString()}`
          return
        }
        window.location.href = pending ? '/today?context=decision' : '/onboarding/goal'
        return
      }

      // Email confirmation required - show confirmation page
      router.push(
        `/auth/confirm?email=${encodeURIComponent(email)}&next=${encodeURIComponent(returnTo)}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="mb-6 flex items-center justify-between gap-4 text-sm">
          <a
            href={blogFallbackHref}
            rel="external"
            onClick={hardExitToBlog}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </a>
          <Link href="/auth" className="text-[#ef725c] hover:underline">
            Login options
          </Link>
        </div>

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
          <h1 className="text-2xl font-bold mb-2">Create your account</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start your founder journey with Mrs. Deer
          </p>
          {warmMessage ? (
            <div className="mb-6 rounded-lg border border-[#f3cfc6] bg-[#fff3ef] p-3 text-sm text-[#7e3f2f]">
              {warmMessage}
            </div>
          ) : null}
          {blogFallbackHref.startsWith('/blog') ? (
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
              Not ready yet?{' '}
              <a
                href={blogFallbackHref}
                rel="external"
                onClick={hardExitToBlog}
                className="text-[#ef725c] hover:underline"
              >
                Continue reading
              </a>
            </p>
          ) : null}
          {hasPendingDecision ? (
            <div className="mb-6 rounded-lg border border-[#f3cfc6] bg-[#fff3ef] p-3 text-sm text-[#7e3f2f]">
              Mrs. Deer has your decision saved. Finish signup to add it to your permanent Decision Log.
            </div>
          ) : null}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Chen"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  required
                />
              </div>
            </div>

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
                  minLength={6}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d] disabled:opacity-50 font-medium"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-5 rounded-lg border border-gray-200/80 bg-gray-50/70 p-4 text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/50 dark:text-gray-300 sm:p-3">
            <p className="inline-flex items-center gap-2 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#ef725c]" />
              Join 500+ founders clarifying their daily loops.
            </p>
            <p className="mt-3 text-sm leading-relaxed sm:mt-2 sm:text-xs">{socialProofBody}</p>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link
              href={appendFunnelQuery(
                entryContext
                  ? `/auth/login?context=${entryContext}&returnTo=${encodeURIComponent(returnTo)}${
                      blogFallbackHref.startsWith('/blog')
                        ? `&from=${encodeURIComponent(blogFallbackHref)}`
                        : ''
                    }`
                  : '/auth/login',
                funnelParam
              )}
              className="text-[#ef725c] hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

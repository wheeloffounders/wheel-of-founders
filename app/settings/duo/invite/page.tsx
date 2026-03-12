'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Send, CheckCircle, Info } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function DuoInvitePage() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Redirect non-duo-primary users to checkout (pay first, then invite)
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login?returnTo=/settings/duo/invite')
        setCheckingAccess(false)
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('plan_type')
        .eq('id', user.id)
        .maybeSingle()

      const isDuoPrimary = (profile as { plan_type?: string } | null)?.plan_type === 'duo_primary'

      // Also allow if they have an active duo relationship as primary
      const { data: duo } = await supabase
        .from('duo_relationships')
        .select('id')
        .eq('primary_user_id', user.id)
        .in('status', ['pending', 'active'])
        .maybeSingle()

      if (!isDuoPrimary && !duo) {
        router.replace('/checkout?plan=duo')
        return
      }

      setCheckingAccess(false)
    }
    checkAccess()
  }, [router])

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/duo/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      setSent(true)
      setTimeout(() => router.push('/settings/duo'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  if (checkingAccess) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Invite Sent! ✨</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          We&apos;ve sent an email to {email}. The invitation never expires.
        </p>
        <Link href="/settings/duo" className="text-[#ef725c] hover:underline">
          Back to Duo settings
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Link href="/settings/duo" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4 block">
        ← Back to Duo
      </Link>

      <h1 className="text-3xl font-bold mb-2">Invite a Partner</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Share your Duo plan with a co-founder, partner, or accountability buddy. Both accounts stay private and independent.
      </p>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <form onSubmit={sendInvite} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Their email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@example.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                They&apos;ll receive an email with a link to join your Duo plan.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || !email}
              className="w-full py-3 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending Invite...' : 'Send Invite'}
            </button>
          </form>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 h-fit">
          <h3 className="font-medium flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-[#ef725c]" />
            How Duo works
          </h3>
          <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              Two separate, private accounts
            </li>
            <li className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              Single bill (you&apos;ll be the primary)
            </li>
            <li className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              They keep their own data
            </li>
            <li className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              Invitation never expires
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function AcceptInvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const inviteId = searchParams?.get('invite')

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'accepted'>('loading')
  const [invite, setInvite] = useState<{ id: string; invited_email?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!inviteId) {
      setStatus('invalid')
      return
    }
    checkInvite()
  }, [inviteId])

  const checkInvite = async () => {
    try {
      const response = await fetch(`/api/duo/invite/${inviteId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid invitation')
      }

      setInvite(data.invite)
      setStatus('valid')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid invitation')
      setStatus('invalid')
    }
  }

  const acceptInvite = async () => {
    setStatus('loading')

    try {
      const response = await fetch(`/api/duo/invite/${inviteId}/accept`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.error?.includes('logged in')) {
          sessionStorage.setItem('pendingInvite', inviteId!)
          router.push(`/login?returnTo=/duo/accept?invite=${inviteId}`)
          return
        }
        throw new Error(data.error)
      }

      setStatus('accepted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite')
      setStatus('invalid')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#ef725c]" />
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="max-w-md mx-auto text-center py-12 px-4">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Invalid Invitation</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'This invitation link is no longer valid.'}</p>
        <Link href="/" className="text-[#ef725c] hover:underline">
          Go to Home
        </Link>
      </div>
    )
  }

  if (status === 'accepted') {
    return (
      <div className="max-w-md mx-auto text-center py-12 px-4">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Welcome to Duo! 🎉</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You&apos;re now part of a Duo plan. You have full access to all Pro features.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d]"
        >
          Go to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-2">Join Duo Plan</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        You&apos;ve been invited to join a Duo plan. This will give you full access to all Pro features.
      </p>

      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 mb-6">
        <h3 className="font-medium mb-3">What you&apos;ll get:</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Unlimited insights
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Full history access
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Advanced pattern detection
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Priority support
          </li>
        </ul>
      </div>

      <button
        onClick={acceptInvite}
        className="w-full py-3 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d]"
      >
        Accept Invitation
      </button>
    </div>
  )
}

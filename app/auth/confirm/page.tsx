'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Mail, CheckCircle, RefreshCw } from 'lucide-react'

export default function ConfirmPage() {
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || 'your email'
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  const handleResend = async () => {
    setResending(true)
    setResendError(null)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: decodeURIComponent(email),
        options: {
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
        },
      })
      if (error) throw error
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 5000)
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Failed to resend')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#ef725c]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-10 h-10 text-[#ef725c]" />
          </div>

          <h1 className="text-2xl font-bold mb-2">Check your email</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            We sent a confirmation link to
            <br />
            <strong className="text-[#ef725c]">{decodeURIComponent(email)}</strong>
          </p>
        </div>

        <div className="bg-[#f8f4f0] dark:bg-gray-700/50 rounded-lg p-5 mb-6">
          <h2 className="font-medium mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Next steps:
          </h2>
          <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex gap-2">
              <span className="w-5 h-5 bg-[#ef725c] text-white rounded-full flex items-center justify-center text-xs shrink-0">1</span>
              <span>Open your email inbox</span>
            </li>
            <li className="flex gap-2">
              <span className="w-5 h-5 bg-[#ef725c] text-white rounded-full flex items-center justify-center text-xs shrink-0">2</span>
              <span>Click the confirmation link from Wheel of Founders</span>
            </li>
            <li className="flex gap-2">
              <span className="w-5 h-5 bg-[#ef725c] text-white rounded-full flex items-center justify-center text-xs shrink-0">3</span>
              <span>Return here and log in to start your journey</span>
            </li>
          </ol>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full py-3 px-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'Sending...' : 'Resend confirmation email'}
          </button>

          {resendSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400 text-center">
              Confirmation email sent! Check your inbox.
            </p>
          )}

          {resendError && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {resendError}
            </p>
          )}

          <Link
            href="/auth/login"
            className="block w-full py-3 px-4 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d] transition text-center font-medium"
          >
            Go to login
          </Link>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          Didn&apos;t receive the email? Check your spam folder.
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bug, Zap } from 'lucide-react'
import { trackError } from '@/lib/error-tracker'

export default function TestErrorPage() {
  const [result, setResult] = useState<string | null>(null)

  const triggerClientError = () => {
    setResult(null)
    try {
      throw new Error('Code Scary test: Client-side error')
    } catch (e) {
      trackError(e as Error, {
        component: 'test-error-page',
        action: 'trigger_client_error',
        severity: 'low',
        metadata: { test: true },
      }).then(() => setResult('Error tracked (check console + Sentry + /admin/errors)'))
    }
  }

  const triggerUnhandled = () => {
    setResult(null)
    setTimeout(() => {
      throw new Error('Code Scary test: Unhandled error (window.onerror)')
    }, 100)
    setResult('Unhandled error thrown – check global handler')
  }

  const triggerRejection = () => {
    setResult(null)
    Promise.reject(new Error('Code Scary test: Unhandled promise rejection'))
    setResult('Promise rejected – check unhandledrejection handler')
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
        <Bug className="w-8 h-8 text-amber-500" />
        Code Scary – Test Errors
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Trigger test errors to verify error tracking. Only use in development.
      </p>

      <div className="space-y-4">
        <button
          type="button"
          onClick={triggerClientError}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
        >
          <Zap className="w-5 h-5" />
          Track error (trackError)
        </button>
        <button
          type="button"
          onClick={triggerUnhandled}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700"
        >
          <Zap className="w-5 h-5" />
          Throw unhandled (window.onerror)
        </button>
        <button
          type="button"
          onClick={triggerRejection}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700"
        >
          <Zap className="w-5 h-5" />
          Unhandled promise rejection
        </button>
      </div>

      {result && (
        <div className="mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200">
          {result}
        </div>
      )}

      <div className="mt-8 p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400">
        <p className="font-semibold mb-2">Verify:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Console: 🔥 CODE SCARY [DEV] in development</li>
          <li>Dashboard: <Link href="/admin/errors" className="underline">/admin/errors</Link></li>
          <li>Sentry: Issues tab (when DSN configured)</li>
        </ul>
      </div>
    </div>
  )
}

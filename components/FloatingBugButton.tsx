'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Bug } from 'lucide-react'
import { getUserSession } from '@/lib/auth'

export function FloatingBugButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [description, setDescription] = useState('')

  useEffect(() => {
    getUserSession().then((s) => setLoggedIn(!!s))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackType: 'bug',
          description: description.trim(),
          screenLocation: pathname || window?.location?.pathname || 'unknown',
        }),
      })

      if (res.ok) {
        setSubmitted(true)
        setDescription('')
        setTimeout(() => {
          setOpen(false)
          setSubmitted(false)
        }, 1500)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to submit')
      }
    } catch {
      alert('Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  if (!loggedIn) return null

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Report an issue"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#152b50] text-[#ef725c] shadow-lg transition-all hover:scale-105 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#ef725c] focus:ring-offset-2 dark:focus:ring-offset-[#0F1419]"
        style={{ opacity: 0.9 }}
      >
        <Bug className="h-5 w-5" />
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !submitted && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-title"
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-[#1A202C]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="report-title" className="mb-4 text-lg font-semibold text-gray-900 dark:text-[#E2E8F0]">
              Report an issue
            </h2>

            {submitted ? (
              <p className="text-gray-600 dark:text-gray-300">Thank you! Your report has been sent.</p>
            ) : (
              <form onSubmit={handleSubmit}>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  What happened?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={4}
                  required
                  className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-[#ef725c] focus:outline-none focus:ring-1 focus:ring-[#ef725c] dark:border-gray-600 dark:bg-[#0F1419] dark:text-[#E2E8F0]"
                />
                <input
                  type="hidden"
                  value={pathname || ''}
                  readOnly
                  aria-hidden
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !description.trim()}
                    className="flex-1 rounded-lg bg-[#152b50] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3a6b] disabled:opacity-50 dark:bg-[#ef725c] dark:hover:bg-[#f0886c]"
                  >
                    {submitting ? 'Sending...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

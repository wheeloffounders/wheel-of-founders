'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Send, ArrowLeft } from 'lucide-react'
import SpeechToTextInput from '@/components/SpeechToTextInput'
import Link from 'next/link'
import { getUserSession } from '@/lib/auth'

export default function FeedbackPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')
  const [whatsWorking, setWhatsWorking] = useState('')
  const [whatsConfusing, setWhatsConfusing] = useState('')
  const [featuresRequest, setFeaturesRequest] = useState('')
  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [otherThoughts, setOtherThoughts] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
        return
      }
      if (session.user.email) setEmail(session.user.email)
      setLoading(false)
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackType: 'long_form',
          description: 'Long form feedback',
          email: email || undefined,
          whatsWorking: whatsWorking.trim() || undefined,
          whatsConfusing: whatsConfusing.trim() || undefined,
          featuresRequest: featuresRequest.trim() || undefined,
          npsScore: npsScore || undefined,
          otherThoughts: otherThoughts.trim() || undefined,
        }),
      })

      if (res.ok) {
        setSubmitted(true)
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

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl bg-white p-8 shadow-md dark:bg-[#1A202C]">
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-[#E2E8F0]">Thank you!</h1>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            Your feedback helps make Wheel of Founders better for you and other founders.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#ef725c] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/profile"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-[#E2E8F0]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Profile
      </Link>

      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-[#E2E8F0]">
          <MessageSquare className="h-7 w-7 text-[#ef725c]" />
          Give Feedback
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Your thoughts shape what Wheel of Founders becomes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl bg-white p-6 shadow-md dark:bg-[#1A202C]">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email (optional — for follow-up)
          </label>
          <SpeechToTextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-[#ef725c] focus:outline-none focus:ring-1 focus:ring-[#ef725c] dark:border-gray-600 dark:bg-[#0F1419] dark:text-[#E2E8F0]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            1. What&apos;s working well for you?
          </label>
          <SpeechToTextInput
            as="textarea"
            value={whatsWorking}
            onChange={(e) => setWhatsWorking(e.target.value)}
            rows={3}
            placeholder="Share what you love..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-[#ef725c] focus:outline-none focus:ring-1 focus:ring-[#ef725c] dark:border-gray-600 dark:bg-[#0F1419] dark:text-[#E2E8F0]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            2. What&apos;s confusing or frustrating?
          </label>
          <SpeechToTextInput
            as="textarea"
            value={whatsConfusing}
            onChange={(e) => setWhatsConfusing(e.target.value)}
            rows={3}
            placeholder="Tell us what could be clearer..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-[#ef725c] focus:outline-none focus:ring-1 focus:ring-[#ef725c] dark:border-gray-600 dark:bg-[#0F1419] dark:text-[#E2E8F0]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            3. What features would you add or change?
          </label>
          <SpeechToTextInput
            as="textarea"
            value={featuresRequest}
            onChange={(e) => setFeaturesRequest(e.target.value)}
            rows={3}
            placeholder="Your ideas..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-[#ef725c] focus:outline-none focus:ring-1 focus:ring-[#ef725c] dark:border-gray-600 dark:bg-[#0F1419] dark:text-[#E2E8F0]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            4. How likely are you to recommend WoF to another founder?
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNpsScore(n)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition ${
                  npsScore === n
                    ? 'border-[#ef725c] bg-[#ef725c] text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-[#0F1419] dark:text-gray-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            1 = Not likely · 5 = Very likely
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            5. Any other thoughts?
          </label>
          <SpeechToTextInput
            as="textarea"
            value={otherThoughts}
            onChange={(e) => setOtherThoughts(e.target.value)}
            rows={3}
            placeholder="Anything else..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-[#ef725c] focus:outline-none focus:ring-1 focus:ring-[#ef725c] dark:border-gray-600 dark:bg-[#0F1419] dark:text-[#E2E8F0]"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#152b50] px-4 py-3 font-medium text-white hover:bg-[#1a3a6b] disabled:opacity-50 dark:bg-[#ef725c] dark:hover:bg-[#f0886c]"
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Sending...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  )
}

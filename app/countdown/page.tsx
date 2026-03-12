'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { format, nextTuesday } from 'date-fns'
import { Sun, Moon, BarChart2, Twitter, Linkedin } from 'lucide-react'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { trackEvent } from '@/lib/analytics'

const NAVY = '#152b50'
const CORAL = '#ef725c'

function getLaunchDate(): Date {
  const now = new Date()
  const tuesday = nextTuesday(now)
  return tuesday
}

function useCountdown(target: Date) {
  const [diff, setDiff] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const d = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000))
      setDiff({
        days: Math.floor(d / 86400),
        hours: Math.floor((d % 86400) / 3600),
        minutes: Math.floor((d % 3600) / 60),
        seconds: d % 60,
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])
  return diff
}

export default function CountdownPage() {
  const launchDate = getLaunchDate()
  const { days, hours, minutes, seconds } = useCountdown(launchDate)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    trackEvent('launch_page_view', { path: '/countdown' })
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/launch-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Signup failed')
      setStatus('success')
      trackEvent('launch_signup_success', {})
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      trackEvent('launch_signup_error', { error: String(err) })
    }
  }

  const dayName = format(launchDate, 'EEEE')
  const dateStr = format(launchDate, 'MMMM d')

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Minimal header */}
      <header className="sticky top-0 z-50 border-b-2 border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur px-4 py-3 flex items-center justify-between">
        <Link href="/countdown" className="text-lg font-semibold" style={{ color: NAVY }}>Wheel of Founders</Link>
        <div className="flex items-center gap-3">
          <Link href="/auth/login?returnTo=/dashboard" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-[#ef725c] transition">Log in</Link>
          <Link href="/auth/login?returnTo=/dashboard" className="px-4 py-2 rounded-lg font-medium text-white transition hover:opacity-90" style={{ backgroundColor: CORAL }}>Enter App</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        {/* Hero */}
        <section className="text-center mb-16 md:mb-24">
          <h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: NAVY }}>
            Wheel of Founders Launches {dayName}, {dateStr}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
            Your daily coaching companion, powered by Mrs. Deer, your AI companion
          </p>

          <div className="inline-flex gap-4 md:gap-6 p-6 rounded-2xl border-2 mb-12" style={{ borderColor: NAVY }}>
            <div className="text-center min-w-[70px] md:min-w-[90px]">
              <span className="block text-3xl md:text-5xl font-bold" style={{ color: CORAL }}>{String(days).padStart(2, '0')}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">days</span>
            </div>
            <div className="text-center min-w-[70px] md:min-w-[90px]">
              <span className="block text-3xl md:text-5xl font-bold" style={{ color: CORAL }}>{String(hours).padStart(2, '0')}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">hours</span>
            </div>
            <div className="text-center min-w-[70px] md:min-w-[90px]">
              <span className="block text-3xl md:text-5xl font-bold" style={{ color: CORAL }}>{String(minutes).padStart(2, '0')}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">min</span>
            </div>
            <div className="text-center min-w-[70px] md:min-w-[90px]">
              <span className="block text-3xl md:text-5xl font-bold" style={{ color: CORAL }}>{String(seconds).padStart(2, '0')}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">sec</span>
            </div>
          </div>

          {/* Mrs. Deer, your AI companion message */}
          <div className="flex justify-center mb-12">
            <div className="flex items-start gap-4 max-w-md">
              <MrsDeerAvatar expression="welcoming" size="large" className="flex-shrink-0" />
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-5 py-4 text-left border-2" style={{ borderColor: NAVY }}>
                <p className="text-gray-800 dark:text-gray-200">&quot;I&apos;ve been waiting to meet you. Just a few more days...&quot;</p>
              </div>
            </div>
          </div>

          {/* Slogan image */}
          <div className="relative w-full max-w-2xl mx-auto aspect-[4/3] mb-16 rounded-xl overflow-hidden border-2" style={{ borderColor: NAVY }}>
            <Image src="/launch/slogan.png" alt="Turn today's actions into tomorrow's better decisions" fill className="object-contain" priority />
          </div>
        </section>

        {/* Before/After */}
        <section className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4" style={{ color: NAVY }}>
            From scattered days to clear rhythm
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Join founders who&apos;ve moved from chaotic task lists to a focused 3-task system—with Mrs. Deer, your AI companion guiding the way.
          </p>
          <div className="relative w-full max-w-3xl mx-auto aspect-[16/10] rounded-xl overflow-hidden border-2" style={{ borderColor: NAVY }}>
            <Image src="/launch/before-after.png" alt="Before: Chaotic tasks. After: Focused 3-task system" fill className="object-contain" />
          </div>
        </section>

        {/* Feature cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="p-6 rounded-xl border-2 bg-white dark:bg-gray-800" style={{ borderColor: NAVY }}>
            <Sun className="w-10 h-10 mb-3" style={{ color: CORAL }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: NAVY }}>Morning Clarity</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Start each day with intention</p>
          </div>
          <div className="p-6 rounded-xl border-2 bg-white dark:bg-gray-800" style={{ borderColor: NAVY }}>
            <Moon className="w-10 h-10 mb-3" style={{ color: NAVY }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: NAVY }}>Evening Wisdom</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Reflect and learn</p>
          </div>
          <div className="p-6 rounded-xl border-2 bg-white dark:bg-gray-800" style={{ borderColor: NAVY }}>
            <BarChart2 className="w-10 h-10 mb-3" style={{ color: CORAL }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: NAVY }}>Founder Insights</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Patterns that matter</p>
          </div>
        </section>

        {/* Launch notification CTA */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-2" style={{ color: NAVY }}>Get a reminder when we launch</h2>
          <p className="text-center text-gray-600 dark:text-gray-400 text-sm mb-6">No spam, just one email on launch day</p>

          {status === 'success' ? (
            <div className="max-w-md mx-auto text-center">
              <p className="text-lg font-medium text-emerald-600 dark:text-emerald-400 mb-4">✅ We&apos;ll email you on launch day!</p>
              <div className="flex justify-center">
                <MrsDeerAvatar expression="welcoming" size="large" />
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-400 italic">&quot;See you Tuesday, founder.&quot;</p>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={status === 'loading'}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#ef725c] focus:border-transparent disabled:opacity-70"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-6 py-3 rounded-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
                style={{ backgroundColor: CORAL }}
              >
                {status === 'loading' ? '...' : 'Notify Me'}
              </button>
            </form>
          )}
          {status === 'error' && <p className="text-center text-red-600 dark:text-red-400 text-sm mt-2">{errorMsg}</p>}
        </section>

        {/* Social proof */}
        <section className="text-center mb-20">
          <p className="text-gray-600 dark:text-gray-400 mb-4">40+ founders already waiting</p>
          <div className="flex justify-center gap-4">
            <a
              href="https://twitter.com/intent/tweet?text=Counting%20down%20to%20%40WheelOfFounders%20launch%20%E2%80%94%20my%20daily%20coaching%20companion%20for%20founders"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-[#ef725c] transition"
              aria-label="Share on Twitter"
            >
              <Twitter className="w-6 h-6" style={{ color: NAVY }} />
            </a>
            <a
              href="https://www.linkedin.com/sharing/share-offsite/?url=https://wheeloffounders.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-[#ef725c] transition"
              aria-label="Share on LinkedIn"
            >
              <Linkedin className="w-6 h-6" style={{ color: NAVY }} />
            </a>
          </div>
        </section>

        {/* Main onboarding image */}
        <section className="mb-20">
          <div className="relative w-full max-w-3xl mx-auto aspect-[4/3] rounded-xl overflow-hidden border-2" style={{ borderColor: NAVY }}>
            <Image src="/launch/onboarding.png" alt="Wheel of Founders onboarding journey with Mrs. Deer, your AI companion" fill className="object-contain" />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-gray-200 dark:border-gray-700 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex gap-6">
            <Link href="/beta" className="hover:text-[#ef725c] transition">Beta</Link>
            <Link href="/feedback" className="hover:text-[#ef725c] transition">Contact</Link>
            <Link href="/about" className="hover:text-[#ef725c] transition">Privacy</Link>
          </div>
          <p>© {new Date().getFullYear()} Wheel of Founders</p>
        </div>
      </footer>
    </div>
  )
}

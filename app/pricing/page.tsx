'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, Zap, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { trackEvent } from '@/lib/analytics'
import Link from 'next/link'

interface PricingCardProps {
  name: string
  price: string
  period?: string
  yearlyPrice?: string
  yearlyTotal?: string
  /** Annual-first layout: anchor monthly above, hero annual price, savings pill. */
  annualFirstPricing?: {
    monthlyAnchor: string
    heroPrice: string
    heroSuffix: string
    subline: string
    savingsBadge: string
    /** Pro: emerald savings pill; Duo: slate to match “Best for teams” badge. */
    savingsBadgeTone?: 'emerald' | 'slate'
  }
  features: string[]
  cta: string
  popular?: boolean
  badge?: string
  href?: string
  isCurrentTier?: boolean
  /** Quiet tier: solid white surface (Duo) vs transparent (Free). */
  quietSurface?: 'transparent' | 'white'
}

function PricingCard({
  name,
  price,
  period,
  yearlyPrice,
  yearlyTotal,
  annualFirstPricing,
  features,
  cta,
  popular,
  badge,
  href,
  isCurrentTier,
  quietSurface = 'transparent',
}: PricingCardProps) {
  const popularCtaClass =
    'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm transition hover:brightness-110 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950'

  const duoSolidCtaClass =
    'bg-slate-900 text-white shadow-sm transition hover:bg-slate-950 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-slate-900 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-gray-950'

  const outlineGhostCtaClass =
    'border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800/40'

  const manageTierCtaClass =
    'border border-slate-400 bg-white text-slate-800 transition hover:bg-slate-50 dark:border-slate-500 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-slate-800/60'

  const ctaBaseLayout = 'flex min-h-[48px] w-full items-center justify-center rounded-lg px-6 py-3 text-center text-base font-semibold transition'

  const quietShellClass =
    quietSurface === 'white'
      ? 'border border-slate-200 bg-white shadow-none hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600'
      : 'border border-slate-200 bg-transparent shadow-none hover:border-slate-300 dark:border-slate-700 dark:bg-transparent dark:hover:border-slate-600'

  const savingsBadgeClass =
    annualFirstPricing?.savingsBadgeTone === 'slate'
      ? 'inline-flex shrink-0 items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-slate-600'
      : 'inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'

  const heroSuffixClass =
    annualFirstPricing && annualFirstPricing.heroSuffix.length > 6
      ? 'shrink-0 text-sm font-semibold leading-none text-slate-700 dark:text-slate-300'
      : 'shrink-0 text-base font-semibold leading-none text-slate-700 dark:text-slate-300'

  const hasTopBadges = Boolean(popular || (badge && !popular) || isCurrentTier)

  const content = (
    <div
      className={`relative flex h-full min-h-0 flex-col rounded-2xl p-8 transition-all ${
        popular
          ? 'scale-105 border-2 border-sky-400 bg-sky-50/50 shadow-[0_0_30px_rgba(14,165,233,0.3)] backdrop-blur-md dark:border-sky-400 dark:bg-sky-950/35 dark:shadow-[0_0_34px_rgba(56,189,248,0.35)]'
          : quietShellClass
      } ${isCurrentTier ? 'ring-2 ring-[#152b50] ring-offset-2' : ''}`}
    >
      {hasTopBadges ? (
        <div className="pointer-events-none absolute -top-4 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1.5">
          {popular ? (
            <span className="rounded-full bg-sky-500 px-4 py-1 text-xs font-semibold text-white shadow-sm dark:bg-sky-500">
              Most Popular
            </span>
          ) : null}
          {badge && !popular ? (
            <span className="rounded-full bg-slate-600 px-4 py-1 text-xs font-semibold text-white dark:bg-slate-500">
              {badge}
            </span>
          ) : null}
          {isCurrentTier ? (
            <span className="rounded-full bg-[#10b981] px-3 py-1 text-xs font-semibold text-white">
              Current
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col pt-1">
        <div className="mb-4 flex items-center gap-3">
          <div
            className={`rounded-lg p-2 ${
              popular ? 'bg-sky-100/80 dark:bg-sky-900/45' : 'bg-slate-50 dark:bg-slate-800/30'
            }`}
          >
            <div
              className={
                popular
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400'
              }
            >
              {name === 'Duo' ? <Users className="w-6 h-6" /> : name === 'Pro' ? <Sparkles className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
            </div>
          </div>
          <h2
            className={`text-2xl font-bold ${
              popular ? 'text-slate-900 dark:text-slate-50' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {name}
          </h2>
        </div>

      <div className="mb-6">
        {annualFirstPricing ? (
          <div className="flex h-[7.25rem] flex-col">
            <div className="flex h-[1.375rem] flex-none items-end">
              <p className="text-sm leading-5 text-slate-400 dark:text-slate-500">{annualFirstPricing.monthlyAnchor}</p>
            </div>
            <div className="flex min-h-0 flex-1 flex-nowrap items-center gap-x-2 gap-y-0 overflow-x-auto">
              <span className={savingsBadgeClass}>{annualFirstPricing.savingsBadge}</span>
              <span className="shrink-0 text-4xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
                {annualFirstPricing.heroPrice}
              </span>
              <span className={heroSuffixClass}>{annualFirstPricing.heroSuffix}</span>
            </div>
            <div className="flex h-[1.375rem] flex-none items-start pt-1">
              <p className="text-sm leading-5 text-slate-500 dark:text-slate-400">{annualFirstPricing.subline}</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[7.25rem] flex-col justify-center">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-4xl font-bold ${
                  popular ? 'text-slate-900 dark:text-slate-50' : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {price}
              </span>
              {period && (
                <span
                  className={`text-sm ${
                    popular ? 'text-slate-900 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  /{period}
                </span>
              )}
            </div>
            {yearlyPrice && (
              <p
                className={`mt-1 text-sm ${
                  popular ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {yearlyPrice}
              </p>
            )}
            {yearlyTotal && (
              <p
                className={`text-xs ${
                  popular ? 'text-slate-500 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {yearlyTotal}
              </p>
            )}
          </div>
        )}
      </div>

      <ul className="mb-0 min-h-0 flex-1 space-y-3">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <Check
              className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                popular ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'
              }`}
            />
            <span
              className={
                popular ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
              }
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto w-full shrink-0 pt-8">
        {href ? (
          <Link
            href={href}
            className={`${ctaBaseLayout} ${
              popular
                ? popularCtaClass
                : isCurrentTier && href
                  ? manageTierCtaClass
                  : isCurrentTier
                    ? 'cursor-default bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-500'
                    : name === 'Duo'
                      ? duoSolidCtaClass
                      : outlineGhostCtaClass
            }`}
          >
            {cta}
          </Link>
        ) : (
          <button
            disabled={isCurrentTier}
            className={`${ctaBaseLayout} ${
              popular
                ? popularCtaClass
                : isCurrentTier && href
                  ? manageTierCtaClass
                  : isCurrentTier
                    ? 'cursor-default bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-500'
                    : name === 'Duo'
                      ? duoSolidCtaClass
                      : outlineGhostCtaClass
            }`}
          >
            {isCurrentTier ? 'Current Plan' : cta}
          </button>
        )}
      </div>
      </div>
    </div>
  )

  return content
}

export default function PricingPage() {
  const router = useRouter()
  const [currentTier, setCurrentTier] = useState<string>('beta')
  const [hasDuo, setHasDuo] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      setCurrentTier(session.user.tier || 'beta')

      // Check if user has duo
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('plan_type')
        .eq('id', session.user.id)
        .maybeSingle()
      setHasDuo((profile as { plan_type?: string } | null)?.plan_type === 'duo_primary' || (profile as { plan_type?: string } | null)?.plan_type === 'duo_secondary')

      setLoading(false)
      trackEvent('pricing_page_view', { current_tier: session.user.tier || 'beta' })
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  const isPro = currentTier !== 'free' || hasDuo

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Choose Your Plan</h1>
      </div>

      <div className="grid max-w-5xl mx-auto grid-cols-1 items-stretch gap-6 md:grid-cols-3">
        <PricingCard
          name="Free"
          price="$0"
          features={['Daily insights', '3 tasks per day', '7-day history', 'Basic patterns']}
          cta="Start Free"
          isCurrentTier={!isPro}
        />

        <PricingCard
          name="Pro"
          price="$29"
          features={[
            'Unlimited insights',
            'Unlimited tasks',
            'Full history',
            'Advanced patterns',
            'Priority support',
          ]}
          annualFirstPricing={{
            monthlyAnchor: 'Billed monthly: $39',
            heroPrice: '$29',
            heroSuffix: '/mo',
            subline: 'billed annually ($348/year)',
            savingsBadge: 'SAVE 25%',
            savingsBadgeTone: 'emerald',
          }}
          cta="Upgrade to Pro"
          popular
          href="/checkout?plan=individual"
          isCurrentTier={isPro && !hasDuo}
        />

        <PricingCard
          name="Duo"
          price="$25"
          features={[
            'Two Pro accounts',
            'Separate private data',
            'Single bill',
            'Save up to 35% vs two individuals',
            'Perfect for co-founders',
          ]}
          annualFirstPricing={{
            monthlyAnchor: 'Billed monthly: $33',
            heroPrice: '$25',
            heroSuffix: '/mo per person',
            subline: 'billed annually ($600/year)',
            savingsBadge: 'SAVE 24%',
            savingsBadgeTone: 'slate',
          }}
          cta={hasDuo ? 'Manage Duo' : 'Start Duo'}
          badge="Best for teams"
          href={hasDuo ? '/settings/duo' : '/checkout?plan=duo'}
          isCurrentTier={hasDuo}
          quietSurface="white"
        />
      </div>

      <div className="mt-12 text-center">
        <Link href="/settings/duo" className="text-[#ef725c] hover:underline font-medium">
          Manage Duo plan →
        </Link>
      </div>
    </div>
  )
}

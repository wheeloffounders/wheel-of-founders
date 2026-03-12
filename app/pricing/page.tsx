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
  features: string[]
  cta: string
  popular?: boolean
  badge?: string
  href?: string
  isCurrentTier?: boolean
}

function PricingCard({
  name,
  price,
  period,
  yearlyPrice,
  yearlyTotal,
  features,
  cta,
  popular,
  badge,
  href,
  isCurrentTier,
}: PricingCardProps) {
  const content = (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border-2 transition-all ${
        popular ? 'border-[#ef725c] scale-105' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } ${isCurrentTier ? 'ring-2 ring-[#152b50] ring-offset-2' : ''}`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-[#ef725c] to-[#152b50] text-white px-4 py-1 rounded-full text-xs font-semibold">
            Most Popular
          </span>
        </div>
      )}
      {badge && !popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-[#152b50] text-white px-4 py-1 rounded-full text-xs font-semibold">
            {badge}
          </span>
        </div>
      )}
      {isCurrentTier && (
        <div className="absolute -top-2 -right-2">
          <span className="bg-[#10b981] text-white px-3 py-1 rounded-full text-xs font-semibold">
            Current
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${popular ? 'bg-[#ef725c]/10' : 'bg-gray-50 dark:bg-gray-900'}`}>
          <div className={popular ? 'text-[#ef725c]' : 'text-gray-700 dark:text-gray-300'}>
            {name === 'Duo' ? <Users className="w-6 h-6" /> : name === 'Pro' ? <Sparkles className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{name}</h2>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">{price}</span>
          {period && <span className="text-sm text-gray-500 dark:text-gray-400">/{period}</span>}
        </div>
        {yearlyPrice && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{yearlyPrice}</p>}
        {yearlyTotal && <p className="text-xs text-gray-500 dark:text-gray-400">{yearlyTotal}</p>}
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />
            <span className="text-gray-700 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>

      {href ? (
        <Link
          href={href}
          className={`block w-full py-3 px-6 rounded-lg font-semibold text-center transition ${
            popular
              ? 'bg-gradient-to-r from-[#ef725c] to-[#152b50] text-white hover:opacity-90'
              : isCurrentTier
              ? 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 cursor-default'
              : 'bg-[#152b50] text-white hover:bg-[#1a3565]'
          }`}
        >
          {cta}
        </Link>
      ) : (
        <button
          disabled={isCurrentTier}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition ${
            popular
              ? 'bg-gradient-to-r from-[#ef725c] to-[#152b50] text-white hover:opacity-90'
              : isCurrentTier
              ? 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 cursor-default'
              : 'bg-[#152b50] text-white hover:bg-[#1a3565]'
          }`}
        >
          {isCurrentTier ? 'Current Plan' : cta}
        </button>
      )}
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
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Choose Your Plan</h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-2">
          During beta, all users get <strong>Pro</strong> access free
        </p>
        {(currentTier === 'beta' || hasDuo) && (
          <p className="text-sm text-[#ef725c] font-medium">
            You&apos;re currently on {hasDuo ? 'Duo' : 'Beta'} (Pro features unlocked)
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <PricingCard
          name="Free"
          price="$0"
          features={['Daily insights', '3 tasks per day', '7-day history', 'Basic patterns']}
          cta="Start Free"
          isCurrentTier={!isPro}
        />

        <PricingCard
          name="Pro"
          price="$39"
          period="month"
          yearlyPrice="$29/mo"
          yearlyTotal="$348/year"
          features={[
            'Unlimited insights',
            'Unlimited tasks',
            'Full history',
            'Advanced patterns',
            'Priority support',
          ]}
          cta="Upgrade to Pro"
          popular
          href="/checkout?plan=individual"
          isCurrentTier={isPro && !hasDuo}
        />

        <PricingCard
          name="Duo"
          price="$33"
          period="month per person"
          yearlyPrice="$25/mo per person"
          yearlyTotal="$600/year total"
          features={[
            'Two Pro accounts',
            'Separate private data',
            'Single bill',
            'Save up to 35% vs two individuals',
            'Perfect for co-founders',
          ]}
          cta={hasDuo ? 'Manage Duo' : 'Start Duo'}
          badge="Best for teams"
          href={hasDuo ? '/settings/duo' : '/checkout?plan=duo'}
          isCurrentTier={hasDuo}
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

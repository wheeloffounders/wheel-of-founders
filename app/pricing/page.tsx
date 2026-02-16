'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, Zap, Video, TrendingUp, Users } from 'lucide-react'
import { getUserSession } from '@/lib/auth'
import { getTierDisplayName } from '@/lib/features'
import { trackEvent } from '@/lib/analytics'

interface PricingTier {
  name: string
  price: string
  billed?: string
  monthlyOption?: string
  features: string[]
  cta: string
  highlight?: boolean
  icon: React.ReactNode
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    features: [
      'Daily planning & journaling',
      'Basic stats',
      'Last 2 days history view',
      'Works on desktop & mobile',
    ],
    cta: 'Get Started',
    icon: <Users className="w-6 h-6" />,
  },
  {
    name: 'Pro',
    price: '$29/month',
    billed: 'paid annually ($348/year)',
    monthlyOption: '$39/month',
    features: [
      'Everything in Free',
      'Full Mrs. Deer coach (5 prompts)',
      'Smart Constraint insights',
      'Unlimited history + weekly/monthly views',
      'Weekly email digest',
      'Export full history (CSV/PDF)',
      'Yearly insight report',
    ],
    cta: 'Start Free Trial',
    highlight: true,
    icon: <Sparkles className="w-6 h-6" />,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [currentTier, setCurrentTier] = useState<string>('beta')
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual')

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
        return
      }
      setCurrentTier(session.user.tier || 'beta')
      setLoading(false)
      trackEvent('pricing_page_view', { current_tier: session.user.tier || 'beta' })
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
        <p className="text-xl text-gray-600 mb-2">
          During beta, all users get <strong>Pro</strong> access free
        </p>
        {currentTier === 'beta' && (
          <p className="text-sm text-[#ef725c] font-medium">
            You&apos;re currently on Beta (Pro features unlocked)
          </p>
        )}

        {/* Billing Period Toggle */}
        {currentTier !== 'beta' && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                billingPeriod === 'annual' ? 'bg-[#152b50]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingPeriod === 'annual' ? 'text-gray-900' : 'text-gray-500'}`}>
              Annual <span className="text-[#10b981]">(Save 20%)</span>
            </span>
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {pricingTiers.map((tier) => {
          const isCurrentTier =
            (tier.name === 'Free' && currentTier === 'free') ||
            (tier.name === 'Pro' && currentTier !== 'free')

          return (
            <div
              key={tier.name}
              className={`relative bg-white rounded-2xl shadow-lg p-8 border-2 transition-all ${
                tier.highlight
                  ? 'border-[#ef725c] scale-105'
                  : 'border-gray-200 hover:border-gray-300'
              } ${isCurrentTier ? 'ring-2 ring-[#152b50] ring-offset-2' : ''}`}
            >
              {tier.highlight && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-[#ef725c] to-[#152b50] text-white px-4 py-1 rounded-full text-xs font-semibold">
                    Most Popular
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
                <div className={`p-2 rounded-lg ${tier.highlight ? 'bg-[#ef725c]/10' : 'bg-gray-100'}`}>
                  <div className={tier.highlight ? 'text-[#ef725c]' : 'text-gray-600'}>
                    {tier.icon}
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{tier.name}</h2>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                  {tier.monthlyOption && (
                    <span className="text-sm text-gray-500">or {tier.monthlyOption}</span>
                  )}
                </div>
                {tier.billed && <p className="text-sm text-gray-500 mt-1">{tier.billed}</p>}
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  if (isCurrentTier) {
                    router.push('/settings')
                  } else {
                    trackEvent('upgrade_button_clicked', { target_tier: tier.name })
                    // In a real app, this would redirect to payment
                    alert('Payment integration coming soon! During beta, all features are free.')
                  }
                }}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition ${
                  tier.highlight
                    ? 'bg-gradient-to-r from-[#ef725c] to-[#152b50] text-white hover:opacity-90'
                    : isCurrentTier
                    ? 'bg-gray-100 text-gray-700 cursor-default'
                    : 'bg-[#152b50] text-white hover:bg-[#1a3565]'
                }`}
                disabled={isCurrentTier}
              >
                {isCurrentTier ? 'Current Plan' : tier.cta}
              </button>
            </div>
          )
        })}
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Is my data stored forever?</h3>
            <p className="text-gray-600 text-sm">
              Yes! All your data is stored forever, regardless of tier. Free users can view the last 2 days, but all
              historical data remains accessible when you upgrade.
            </p>
          </div>
          <div>
              <h3 className="font-semibold text-gray-900 mb-2">What happens during beta?</h3>
            <p className="text-gray-600 text-sm">
              During beta testing, all users automatically get Pro access free. This includes all features like Mrs.
              Deer prompts, unlimited history, and weekly/monthly insights.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Can I export my data?</h3>
              <p className="text-gray-600 text-sm">
                Yes! All tiers can export their data. Free users can export the last 2 days, while Pro users can export
                their full history.
              </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">What do I get with Pro?</h3>
            <p className="text-gray-600 text-sm">
              Pro unlocks full Mrs. Deer coaching (all 5 prompts), smart constraint insights, unlimited history with
              weekly/monthly loop views, exports, and yearly reports—everything you need to run your founder loop.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

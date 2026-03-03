'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronRight, Mail } from 'lucide-react'
import Link from 'next/link'
import { getUserSession } from '@/lib/auth'

type PlanType = 'individual' | 'duo'
type BillingPeriod = 'monthly' | 'yearly'

interface Plan {
  id: PlanType
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  features: string[]
}

const PLANS: Plan[] = [
  {
    id: 'individual',
    name: 'Individual',
    description: 'For solo founders',
    monthlyPrice: 39,
    yearlyPrice: 29,
    features: [
      'All Pro features',
      'Unlimited insights',
      'Full history',
      'Priority support',
    ],
  },
  {
    id: 'duo',
    name: 'Duo',
    description: 'For co-founders & partners',
    monthlyPrice: 33,
    yearlyPrice: 25,
    features: [
      'Two Pro accounts',
      'Separate private data',
      'Single bill',
      'Perfect for teams',
    ],
  },
]

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = searchParams?.get('plan') as PlanType | null

  const [selectedPlan, setSelectedPlan] = useState<PlanType>(planParam === 'duo' ? 'duo' : 'individual')
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login?returnTo=/checkout')
        return
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (planParam === 'duo') setSelectedPlan('duo')
  }, [planParam])

  const selectedPlanData = PLANS.find((p) => p.id === selectedPlan)!
  const pricePerPerson =
    billingPeriod === 'monthly'
      ? selectedPlanData.monthlyPrice
      : selectedPlanData.yearlyPrice
  const totalPrice =
    selectedPlan === 'duo' ? pricePerPerson * 2 : pricePerPerson
  const billingText = billingPeriod === 'monthly' ? 'month' : 'year'
  const annualTotal = billingPeriod === 'yearly' ? totalPrice * 12 : totalPrice

  const handleContinueToPayment = async () => {
    setCheckoutLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: selectedPlan,
          billingPeriod,
          partnerEmail: selectedPlan === 'duo' ? partnerEmail.trim() : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        setError('No checkout URL returned')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
        Checkout
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Step {step} of 2
      </p>

      {/* Progress Indicator */}
      <div className="flex items-center gap-2 mb-8">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 1 ? 'bg-[#ef725c] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
          }`}
        >
          1
        </div>
        <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded">
          <div
            className={`h-full bg-[#ef725c] transition-all rounded ${
              step >= 2 ? 'w-full' : 'w-0'
            }`}
          />
        </div>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 2 ? 'bg-[#ef725c] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
          }`}
        >
          2
        </div>
      </div>

      {step === 1 && (
        <>
          {/* Plan Selection */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`p-6 rounded-xl border-2 text-left transition-all ${
                  selectedPlan === plan.id
                    ? 'border-[#ef725c] bg-[#fef6f3] dark:bg-gray-800 dark:border-[#ef725c]'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <h3 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {plan.description}
                </p>
                <div className="space-y-2 mb-4">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <Check className="w-4 h-4 text-[#ef725c] shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Billing Period Toggle */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 mb-8">
            <h3 className="font-medium mb-4 text-gray-900 dark:text-white">
              Billing Period
            </h3>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setBillingPeriod('monthly')}
                className={`flex-1 p-4 rounded-lg border-2 transition ${
                  billingPeriod === 'monthly'
                    ? 'border-[#ef725c] bg-white dark:bg-gray-800'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  Monthly
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${selectedPlanData.monthlyPrice}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  per person
                </div>
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod('yearly')}
                className={`flex-1 p-4 rounded-lg border-2 transition relative ${
                  billingPeriod === 'yearly'
                    ? 'border-[#ef725c] bg-white dark:bg-gray-800'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ef725c] text-white text-xs px-2 py-1 rounded-full">
                  Save 35%
                </div>
                <div className="font-medium mt-2 text-gray-900 dark:text-white">
                  Yearly
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${selectedPlanData.yearlyPrice}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  per person
                </div>
              </button>
            </div>
          </div>

          {/* Partner Email (Duo only) */}
          {selectedPlan === 'duo' && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 mb-8">
              <h3 className="font-medium mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <Mail className="w-4 h-4" />
                Invite Your Partner
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                They&apos;ll receive an email to join after payment. Invitation
                never expires.
              </p>
              <input
                type="email"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="partner@example.com"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required={selectedPlan === 'duo'}
              />
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h3 className="font-medium mb-4 text-gray-900 dark:text-white">
              Order Summary
            </h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>
                  {selectedPlanData.name} Plan ({billingPeriod})
                </span>
                <span>
                  ${pricePerPerson} × {selectedPlan === 'duo' ? '2' : '1'}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">
                  ${billingPeriod === 'monthly' ? totalPrice : annualTotal}/
                  {billingPeriod === 'monthly' ? 'mo' : 'yr'}
                </span>
              </div>
              {billingPeriod === 'yearly' && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Billed ${annualTotal} annually
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleContinueToPayment}
              disabled={
                (selectedPlan === 'duo' && !partnerEmail.trim()) || checkoutLoading
              }
              className="w-full py-3 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d] disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
            >
              {checkoutLoading ? (
                'Redirecting...'
              ) : (
                <>
                  Continue to Payment
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400">
        <Link href="/pricing" className="text-[#ef725c] hover:underline">
          ← Back to pricing
        </Link>
      </p>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard, Calendar, CheckCircle, XCircle, Loader, ArrowLeft } from 'lucide-react'
import { getUserSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { format } from 'date-fns'

interface SubscriptionData {
  tier: string
  stripe_subscription_status: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  subscription_started_at: string | null
  subscription_ends_at: string | null
  subscription_canceled_at: string | null
}

export default function SubscriptionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [reactivating, setReactivating] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Check for success from Stripe checkout
      const success = searchParams.get('success')
      if (success) {
        // Refresh subscription data
        setTimeout(() => {
          fetchSubscription(session.user.id)
        }, 2000) // Wait for webhook to process
      } else {
        fetchSubscription(session.user.id)
      }
    }
    checkAuth()
  }, [router, searchParams])

  const fetchSubscription = async (userId: string) => {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select(
        'tier, stripe_subscription_status, stripe_subscription_id, stripe_price_id, subscription_started_at, subscription_ends_at, subscription_canceled_at'
      )
      .eq('id', userId)
      .single()

    if (profile) {
      setSubscription(profile as SubscriptionData)
    }
    setLoading(false)
  }

  const handleCancelSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return

    if (!confirm('Are you sure you want to cancel your subscription? You\'ll retain access until the end of your billing period.')) {
      return
    }

    setCanceling(true)
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.stripe_subscription_id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }

      // Refresh subscription data
      const session = await getUserSession()
      if (session) {
        await fetchSubscription(session.user.id)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to cancel subscription')
    } finally {
      setCanceling(false)
    }
  }

  const handleReactivateSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return

    setReactivating(true)
    try {
      const response = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.stripe_subscription_id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate subscription')
      }

      // Refresh subscription data
      const session = await getUserSession()
      if (session) {
        await fetchSubscription(session.user.id)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to reactivate subscription')
    } finally {
      setReactivating(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-[#152b50]" />
        </div>
      </div>
    )
  }

  const isActive = subscription?.stripe_subscription_status === 'active' || subscription?.tier === 'beta'
  const isCanceled = subscription?.subscription_canceled_at !== null
  const isTrialing = subscription?.stripe_subscription_status === 'trialing'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </Link>

      {/* Success Message */}
      {searchParams.get('success') && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <p>Subscription activated successfully! Your account has been upgraded.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
          <CreditCard className="w-8 h-8 text-[#ef725c]" />
          Subscription Management
        </h1>
        <p className="text-gray-600">Manage your subscription and billing</p>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Plan</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-semibold text-gray-900 capitalize">{subscription?.tier || 'Free'}</p>
              <p className="text-sm text-gray-600">
                {subscription?.tier === 'beta' && 'Beta access (all features unlocked)'}
                {subscription?.tier === 'pro' && 'Pro Plan'}
                {subscription?.tier === 'pro_plus' && 'Pro+ Plan'}
                {!subscription?.tier || subscription.tier === 'free' ? 'Free Plan' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isActive ? (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Active
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  Inactive
                </span>
              )}
            </div>
          </div>

          {/* Subscription Details */}
          {subscription?.stripe_subscription_id && (
            <>
              {subscription.subscription_started_at && (
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Started</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(subscription.subscription_started_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {subscription.subscription_ends_at && (
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">
                      {isCanceled ? 'Access until' : 'Renews on'}
                    </p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(subscription.subscription_ends_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {isTrialing && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Free Trial Active:</strong> Your subscription will begin after the trial period ends.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        {subscription?.tier === 'beta' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <p className="text-blue-800">
              <strong>Beta Access:</strong> You&apos;re currently on beta, which includes all Pro+ features free.
              When beta ends, you&apos;ll need to subscribe to continue using premium features.
            </p>
          </div>
        )}

        {subscription?.tier === 'free' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Upgrade Your Plan</h3>
            <p className="text-gray-600 mb-4">
              Unlock unlimited history, AI insights, and more with Pro or Pro+.
            </p>
            <Link
              href="/pricing"
              className="inline-block px-6 py-3 bg-[#152b50] text-white rounded-lg font-semibold hover:bg-[#1a3565] transition"
            >
              View Plans
            </Link>
          </div>
        )}

        {subscription?.stripe_subscription_id && isActive && !isCanceled && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Subscription</h3>
            <p className="text-gray-600 mb-4">
              Cancel your subscription at any time. You&apos;ll retain access until the end of your billing period.
            </p>
            <button
              onClick={handleCancelSubscription}
              disabled={canceling}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {canceling ? 'Canceling...' : 'Cancel Subscription'}
            </button>
          </div>
        )}

        {subscription?.stripe_subscription_id && isCanceled && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reactivate Subscription</h3>
            <p className="text-gray-600 mb-4">
              Your subscription is canceled but you still have access until{' '}
              {subscription.subscription_ends_at &&
                format(new Date(subscription.subscription_ends_at), 'MMMM d, yyyy')}
              . Reactivate to continue your subscription.
            </p>
            <button
              onClick={handleReactivateSubscription}
              disabled={reactivating}
              className="px-6 py-3 bg-[#152b50] text-white rounded-lg font-semibold hover:bg-[#1a3565] transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {reactivating ? 'Reactivating...' : 'Reactivate Subscription'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

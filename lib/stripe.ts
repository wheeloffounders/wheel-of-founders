import Stripe from 'stripe'

let stripeClient: Stripe | null = null

/**
 * Create a mock Stripe client for development when STRIPE_SECRET_KEY is not set.
 * Allows build to pass and returns mock responses for checkout/customers.
 */
function createMockStripe(): Stripe {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return new Proxy({} as Stripe, {
    get(_, prop) {
      if (prop === 'checkout') {
        return {
          sessions: {
            create: async () => {
              console.warn('⚠️ Stripe mock: checkout.sessions.create called - no actual Stripe request')
              return { id: 'mock_cs_' + Date.now(), url: `${baseUrl}/checkout?mock=1` } as Stripe.Checkout.Session
            },
          },
        }
      }
      if (prop === 'customers') {
        return {
          create: async () => {
            console.warn('⚠️ Stripe mock: customers.create called - no actual Stripe request')
            return { id: 'mock_cus_' + Date.now() } as Stripe.Customer
          },
        }
      }
      return new Proxy(() => {}, {
        apply: () => {
          console.warn(`⚠️ Stripe mock: ${String(prop)} called - no actual Stripe request`)
          return Promise.resolve({})
        },
      })
    },
  })
}

/**
 * Get Stripe client instance (lazy initialized).
 * Only creates the client when first called, not at module load.
 * In development without STRIPE_SECRET_KEY, returns a mock client.
 */
export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const apiKey = process.env.STRIPE_SECRET_KEY

    if (!apiKey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ STRIPE_SECRET_KEY is not set - Stripe functionality will be mocked')
        stripeClient = createMockStripe()
      } else {
        throw new Error('STRIPE_SECRET_KEY is not set')
      }
    } else {
      stripeClient = new Stripe(apiKey, {
        apiVersion: '2025-02-24.acacia',
        typescript: true,
      })
    }
  }
  return stripeClient
}

/** @deprecated Use getStripeClient(). Exported for backward compatibility. */
export function getStripe(): Stripe {
  return getStripeClient()
}

/** Lazy proxy - forwards to getStripeClient() when accessed. */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripeClient() as unknown as Record<string, unknown>)[prop as string]
  },
})

// Stripe Price IDs - Set these in your Stripe Dashboard
// These should match your actual Stripe product/price IDs
export const STRIPE_PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_pro_annual',
  pro_plus_monthly: process.env.STRIPE_PRO_PLUS_MONTHLY_PRICE_ID || 'price_pro_plus_monthly',
  pro_plus_annual: process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID || 'price_pro_plus_annual',
  duo_monthly: process.env.STRIPE_DUO_MONTHLY_PRICE_ID || 'price_duo_monthly',
  duo_annual: process.env.STRIPE_DUO_ANNUAL_PRICE_ID || 'price_duo_annual',
} as const

export type StripePriceId = typeof STRIPE_PRICE_IDS[keyof typeof STRIPE_PRICE_IDS]

// Map Stripe subscription status to app tier
export function getTierFromSubscriptionStatus(
  subscriptionStatus: string | null
): 'free' | 'pro' | 'pro_plus' | 'beta' {
  if (!subscriptionStatus) return 'free'
  
  const activeStatuses = ['active', 'trialing']
  if (!activeStatuses.includes(subscriptionStatus)) return 'free'
  
  // Tier is determined by price_id, not status
  // This will be set by webhook based on subscription price
  return 'free' // Default, webhook will update
}

// Map price ID to tier
export function getTierFromPriceId(priceId: string | null): 'pro' | 'pro_plus' | 'duo' | null {
  if (!priceId) return null

  if (
    priceId === STRIPE_PRICE_IDS.pro_monthly ||
    priceId === STRIPE_PRICE_IDS.pro_annual
  ) {
    return 'pro'
  }

  if (
    priceId === STRIPE_PRICE_IDS.pro_plus_monthly ||
    priceId === STRIPE_PRICE_IDS.pro_plus_annual
  ) {
    return 'pro_plus'
  }

  if (
    priceId === STRIPE_PRICE_IDS.duo_monthly ||
    priceId === STRIPE_PRICE_IDS.duo_annual
  ) {
    return 'duo'
  }

  return null
}

// Get billing period from price ID
export function getBillingPeriod(priceId: string): 'monthly' | 'annual' {
  if (priceId.includes('annual') || priceId.includes('year')) {
    return 'annual'
  }
  return 'monthly'
}

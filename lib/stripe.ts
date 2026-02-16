import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

// Stripe Price IDs - Set these in your Stripe Dashboard
// These should match your actual Stripe product/price IDs
export const STRIPE_PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_pro_annual',
  pro_plus_monthly: process.env.STRIPE_PRO_PLUS_MONTHLY_PRICE_ID || 'price_pro_plus_monthly',
  pro_plus_annual: process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID || 'price_pro_plus_annual',
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
export function getTierFromPriceId(priceId: string | null): 'pro' | 'pro_plus' | null {
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
  
  return null
}

// Get billing period from price ID
export function getBillingPeriod(priceId: string): 'monthly' | 'annual' {
  if (priceId.includes('annual') || priceId.includes('year')) {
    return 'annual'
  }
  return 'monthly'
}

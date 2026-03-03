import { NextRequest, NextResponse } from 'next/server'
import { getStripeClient, STRIPE_PRICE_IDS, getTierFromPriceId } from '@/lib/stripe'
import { getServerSupabase } from '@/lib/server-supabase'
import { getServerSessionFromRequest } from '@/lib/server-auth'

type PlanType = 'individual' | 'duo'
type BillingPeriod = 'monthly' | 'yearly'

function getPriceIdForPlan(planType: PlanType, billingPeriod: BillingPeriod): string {
  if (planType === 'duo') {
    return billingPeriod === 'monthly'
      ? STRIPE_PRICE_IDS.duo_monthly
      : STRIPE_PRICE_IDS.duo_annual
  }
  return billingPeriod === 'monthly'
    ? STRIPE_PRICE_IDS.pro_plus_monthly
    : STRIPE_PRICE_IDS.pro_plus_annual
}

/**
 * Create Stripe Checkout Session
 * POST /api/stripe/create-checkout
 * Body: { planType, billingPeriod, partnerEmail? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { planType, billingPeriod, partnerEmail } = body

    const plan = (planType === 'duo' ? 'duo' : 'individual') as PlanType
    const period = (billingPeriod === 'yearly' ? 'yearly' : 'monthly') as BillingPeriod

    const priceId = getPriceIdForPlan(plan, period)
    const tier = getTierFromPriceId(priceId)
    if (!tier) {
      return NextResponse.json(
        { error: 'Invalid plan configuration' },
        { status: 400 }
      )
    }

    // In development without Stripe key, return mock checkout URL
    if (process.env.NODE_ENV === 'development' && !process.env.STRIPE_SECRET_KEY) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      return NextResponse.json({
        sessionId: 'mock_' + Date.now(),
        url: `${baseUrl}/checkout/mock-success?plan=${plan}&period=${period}`,
      })
    }

    const stripe = getStripeClient()
    const db = getServerSupabase()

    // Get or create Stripe customer
    let customerId: string

    const { data: profile } = await db
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', session.user.id)
      .maybeSingle()

    const profileData = profile as { stripe_customer_id?: string } | null

    if (profileData?.stripe_customer_id) {
      customerId = profileData.stripe_customer_id
    } else {
      const customer = await stripe.customers.create({
        email: session.user.email ?? undefined,
        metadata: { userId: session.user.id },
      })
      customerId = customer.id

      await (db.from('user_profiles') as any)
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq('id', session.user.id)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    // For Duo: success goes to invite confirmation page; we'll store partnerEmail in metadata for webhook
    const successUrl =
      plan === 'duo'
        ? `${baseUrl}/settings/duo/invite?success=true&session_id={CHECKOUT_SESSION_ID}`
        : `${baseUrl}/settings/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: `${baseUrl}/checkout?canceled=true`,
      metadata: {
        userId: session.user.id,
        tier,
        planType: plan,
        billingPeriod: period,
        partnerEmail: plan === 'duo' && partnerEmail ? String(partnerEmail).trim() : '',
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          tier,
          planType: plan,
          partnerEmail: plan === 'duo' && partnerEmail ? String(partnerEmail).trim() : '',
        },
      },
    })

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error) {
    console.error('[Stripe create-checkout] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_PRICE_IDS, getTierFromPriceId } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'

/**
 * Create Stripe Checkout Session
 * POST /api/stripe/create-checkout
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { priceId, billingPeriod } = body

    // Validate price ID
    const validPriceIds = Object.values(STRIPE_PRICE_IDS)
    if (!priceId || !validPriceIds.includes(priceId as any)) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    let customerId: string

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', session.user.id)
      .single()

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: {
          userId: session.user.id,
        },
      })
      customerId = customer.id

      // Save customer ID to profile
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', session.user.id)
    }

    // Determine tier from price ID
    const tier = getTierFromPriceId(priceId)
    if (!tier) {
      return NextResponse.json(
        { error: 'Invalid price ID for tier' },
        { status: 400 }
      )
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      metadata: {
        userId: session.user.id,
        tier,
        billingPeriod: billingPeriod || 'monthly',
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          tier,
        },
      },
    })

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      },
      { status: 500 }
    )
  }
}

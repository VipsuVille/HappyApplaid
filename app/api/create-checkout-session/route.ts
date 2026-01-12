// app/api/create-checkout-session/route.ts - PÄIVITETTY

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { PRICING, BillingPeriod } from '@/lib/pricing';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia'
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { tier, billingPeriod = 'monthly' } = body as { 
      tier: 'basic' | 'premium'; 
      billingPeriod?: BillingPeriod 
    };

    if (!tier || (tier !== 'basic' && tier !== 'premium')) {
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      );
    }

    // ✅ HAE OIKEA PRICE ID
    const tierConfig = PRICING[tier];
    
    let priceId: string;
    
    if ('stripePriceId' in tierConfig && typeof tierConfig.stripePriceId === 'object') {
      if (billingPeriod === 'monthly') {
        priceId = tierConfig.stripePriceId.monthly;
      } else if (billingPeriod === 'sixMonths') {
        priceId = tierConfig.stripePriceId.sixMonths;
      } else if (billingPeriod === 'yearly') {
        priceId = tierConfig.stripePriceId.yearly;
      } else {
        return NextResponse.json(
          { error: 'Invalid billing period' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid tier configuration' },
        { status: 500 }
      );
    }

    if (!priceId) {
      console.error(`Missing price ID for ${tier} ${billingPeriod}`);
      return NextResponse.json(
        { error: 'Price ID not configured' },
        { status: 500 }
      );
    }

    // ✅ LUO CHECKOUT SESSION
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
      client_reference_id: userId,
      metadata: {
        userId,
        tier,
        billingPeriod,
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
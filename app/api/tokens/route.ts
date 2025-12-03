
// ========================================
// app/api/create-checkout-session/route.ts - KORJATTU
// ========================================
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { currentUser } from '@clerk/nextjs/server';
import { PRICING, Tier } from '@/lib/pricing';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia'
});

export async function POST(req: NextRequest) {
  try {
    // 1. TARKISTA AUTENTIKOINTI
    const user = await currentUser();
    
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Kirjaudu sisään ensin' },
        { status: 401 }
      );
    }
    
    // 2. HAE TIER
    const { tier } = await req.json();
    
    if (!tier || !PRICING[tier as Tier]) {
      return NextResponse.json(
        { error: 'Virheellinen tilaustyyppi' },
        { status: 400 }
      );
    }
    
    // 3. HAE STRIPE PRICE ID
    const tierData = PRICING[tier as Tier];
    
    if (!tierData.stripePriceId) {
      console.error(`❌ Missing Stripe Price ID for tier: ${tier}`);
      return NextResponse.json(
        { error: 'Hinnoittelukonfiguraatio puuttuu. Ota yhteyttä tukeen.' },
        { status: 500 }
      );
    }

    console.log(`🛒 Creating checkout for ${tier}:`, {
      userId: user.id,
      priceId: tierData.stripePriceId,
      tokens: tierData.tokens
    });
    
    // 4. LUO CHECKOUT-ISTUNTO
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: tierData.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        tier: tier,
        tokens: tierData.tokens.toString(),
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier: tier,
          tokens: tierData.tokens.toString(),
        }
      }
    });
    
    console.log('✅ Checkout session created:', session.id);
    
    return NextResponse.json({ 
      sessionId: session.id, 
      url: session.url 
    });
  } catch (error: any) {
    console.error('❌ Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Maksuprosessin aloittaminen epäonnistui' },
      { status: 500 }
    );
  }
}

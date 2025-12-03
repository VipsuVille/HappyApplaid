
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

// ========================================
// PRICING PAGE - Päivitetty Button-logiikka
// ========================================
/*
KORVAA pricing-sivun button-osuus tällä:

{Object.entries(PRICING).map(([tier, details]) => (
  <div key={tier}>
    {/* ... card content ... *\/}
    
    <form action={async () => {
      'use server';
      
      // Tarkista onko käyttäjä kirjautunut
      const user = await currentUser();
      if (!user?.id) {
        redirect('/sign-in?redirect=/pricing');
        return;
      }
      
      // Kutsu API
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier })
      });
      
      const data = await response.json();
      
      if (data.url) {
        redirect(data.url);
      } else {
        console.error('Checkout failed:', data.error);
      }
    }}>
      <Button type="submit">
        Valitse {details.name}
      </Button>
    </form>
  </div>
))}
*/

// TAI käytä client-side ratkaisua:
/*
'use client';

function PricingCard({ tier, details }) {
  const handleCheckout = async () => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier })
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Virhe: ' + data.error);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Maksuprosessi epäonnistui');
    }
  };
  
  return (
    <button onClick={handleCheckout}>
      Valitse {details.name}
    </button>
  );
}
*/
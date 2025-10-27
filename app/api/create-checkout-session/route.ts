// app/api/create-checkout-session/route.ts
// app/api/create-checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { currentUser } from '@clerk/nextjs/server';
import { PRICING } from '@/lib/pricing';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia'
});

export async function POST(req: NextRequest) {
  try {
    // Tarkista käyttäjän autentikointi Clerk:n kautta
    const user = await currentUser();
    
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Kirjaudu sisään ensin' },
        { status: 401 }
      );
    }
    
    // Lue pyynnön tiedot
    const { tier = 'basic' } = await req.json();
    
    // Tarkista, että annettu tier on olemassa
    if (!PRICING[tier as keyof typeof PRICING]) {
      return NextResponse.json(
        { error: 'Virheellinen tilaustyyppi' },
        { status: 400 }
      );
    }
    
    // Haetaan tier-tason hinta PRICING-objektista
    const price = PRICING[tier as keyof typeof PRICING].stripePriceId;
    
    // Luo checkout-istunto
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price,
          quantity: 1,
        },
      ],
      // Anna front-endille tarvittava URL, kun maksu on suoritettu
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      // Tärkeää! Käytä tätä käyttäjän tunnistamisessa webhookeissa
      client_reference_id: user.id,
      // Lisää metadata helpottamaan tunnistamista
      metadata: {
        userId: user.id,
        tier: tier
      },
      // Tallennetaan myös ostotilauksen yksityiskohtaista tietoa
      subscription_data: {
        metadata: {
          userId: user.id,
          tier: tier
        }
      }
    });
    
    // Palauta sekä istuntotunnus että URL vastausviestissä
    return NextResponse.json({ 
      sessionId: session.id, 
      url: session.url 
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Maksuprosessin aloittaminen epäonnistui' },
      { status: 500 }
    );
  }
}
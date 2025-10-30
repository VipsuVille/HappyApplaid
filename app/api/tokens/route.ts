// app/api/tokens/route.ts
import { currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PRICING } from '@/lib/pricing';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '@clerk/nextjs/server';

// Existing POST method for creating checkout sessions
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Kirjaudu sisään ensin' }, { status: 401 });
    }
    const { tier } = await req.json();
   
    // Tarkista, että annettu tier on olemassa
    if (!PRICING[tier as keyof typeof PRICING]) {
      return NextResponse.json(
        { error: 'Virheellinen tilaustyyppi' },
        { status: 400 }
      );
    }
    const price = PRICING[tier as keyof typeof PRICING].stripePriceId;
   
    // Luo checkout-sessio
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        tier,
      },
      client_reference_id: user.id, // Tärkeä - käytetään webhookissa yhdistämään käyttäjä tilaukseen
    });
    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Maksuprosessin aloittaminen epäonnistui' },
      { status: 500 }
    );
  }
}

// NEW GET method for retrieving token information
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Kirjaudu sisään ensin' }, { status: 401 });
    }
    
    const supabaseAdmin = await getSupabaseAdmin();
    
    // Get user's active subscription
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .single();
    
    if (subscriptionError && subscriptionError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching subscription:', subscriptionError);
      return NextResponse.json({ error: 'Failed to fetch subscription data' }, { status: 500 });
    }
    
    // For debugging, log the found subscription data
    console.log('User:', userId, 'Subscription data:', subscription);
    
    // Return token information
    return NextResponse.json({
      tokens: subscription?.tokens || 0,
      isActive: subscription?.is_active || false,
      plan: subscription?.plan || 'none'
    });
  } catch (error) {
    console.error('Error in /api/tokens GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
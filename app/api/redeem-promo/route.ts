// app/api/redeem-promo/route.ts - LOPULLINEN VERSIO
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ✅ PROMO-KOODIT (ei tietokannassa, vain koodissa)
const PROMO_CODES: Record<string, {
  tokens: number;
  durationDays: number;
  planType: 'basic' | 'premium';
  description: string;
}> = {
  'SEPPO': {
    tokens: 100000,
    durationDays: 10,
    planType: 'premium',
    description: 'Premium 10 päivää - Kiitos avustasi!'
  },
  'FRIEND50': {
    tokens: 10000,
    durationDays: 30,
    planType: 'basic',
    description: 'Basic 30 päivää'
  }
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Kirjaudu sisään' }, { status: 401 });
    }

    const { code } = await req.json();
    const promoCode = code?.toUpperCase().trim();
    
    if (!promoCode || !PROMO_CODES[promoCode]) {
      return NextResponse.json({ error: 'Virheellinen koodi' }, { status: 400 });
    }

    const promo = PROMO_CODES[promoCode];

    // ✅ Tarkista onko jo käytetty
    const { data: existing } = await supabaseAdmin
      .from('promo_code_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('promo_code', promoCode)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Koodi jo käytetty' }, { status: 400 });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + promo.durationDays);

    // ✅ LUO SUBSCRIPTION (VAIN plan_type kenttä!)
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_customer_id: `promo_${userId}`,
        stripe_subscription_id: `promo_sub_${userId}_${promoCode}`,
        status: 'active',
        current_period_end: expiresAt.toISOString(),
        plan_type: promo.planType, // ✅ AINOA tier-kenttä
        tokens: promo.tokens,
        is_active: true,
        auto_renew: false,
        promo_code_used: promoCode,
      }, { onConflict: 'user_id' });

    if (subError) {
      console.error('Subscription error:', subError);
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    // Merkitse käytetyksi
    await supabaseAdmin.from('promo_code_usage').insert({
      user_id: userId,
      promo_code: promoCode,
      redeemed_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: promo.description,
      subscription: {
        planType: promo.planType,
        tokens: promo.tokens,
        expiresAt: expiresAt.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Promo error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
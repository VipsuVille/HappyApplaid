// app/api/redeem-promo/route.ts - LOPULLINEN
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

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
    description: 'Premium 10 päivää - Kiitos!'
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

    // Tarkista onko jo käytetty
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

    console.log('Creating subscription:', {
      userId,
      planType: promo.planType,
      tokens: promo.tokens,
      expiresAt: expiresAt.toISOString()
    });

    // ✅ LUO SUBSCRIPTION (KAIKKI KENTÄT)
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_customer_id: `promo_${userId}`,
        stripe_subscription_id: `promo_sub_${userId}_${promoCode}`,
        status: 'active',
        current_period_end: expiresAt.toISOString(),
        plan_type: promo.planType,
        tokens: promo.tokens,
        is_active: true,
        auto_renew: false, // ✅ TÄRKEÄ
        promo_code_used: promoCode, // ✅ TÄRKEÄ
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (subError) {
      console.error('❌ Subscription error:', subError);
      return NextResponse.json({ 
        error: 'Tilauksen luonti epäonnistui',
        details: subError.message 
      }, { status: 500 });
    }

    // Merkitse käytetyksi
    await supabaseAdmin.from('promo_code_usage').insert({
      user_id: userId,
      promo_code: promoCode,
      redeemed_at: new Date().toISOString()
    });

    console.log('✅ Promo activated successfully');

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
    console.error('💥 Promo error:', error);
    return NextResponse.json({ 
      error: 'Virhe promo-koodin aktivoinnissa',
      details: error.message 
    }, { status: 500 });
  }
}
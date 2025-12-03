// app/api/redeem-promo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// PROMO-KOODIT
const PROMO_CODES: Record<string, {
  tokens: number;
  durationDays: number;
  tier: 'basic' | 'semi-pro' | 'pro';
  description: string;
  maxUses?: number;
}> = {
  'SEPPO': {
    tokens: 1000,
    durationDays: 10,
    tier: 'pro', // 👈 Määritä tier täällä
    description: 'Kiitos avustasi :)'
  },
  'FRIEND50': {
    tokens: 1000,
    durationDays: 30,
    tier: 'semi-pro',
    description: 'Ystävälle 1kk Semi-Pro'
  }
};

export async function POST(req: NextRequest) {
  try {
    const authData = await auth();
    const userId = authData.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Kirjaudu sisään ensin' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Anna promo-koodi' }, { status: 400 });
    }

    const promoCode = code.toUpperCase().trim();
    const promoDetails = PROMO_CODES[promoCode];

    if (!promoDetails) {
      return NextResponse.json({ error: 'Virheellinen promo-koodi' }, { status: 400 });
    }

    // Tarkista onko jo käytetty
    const { data: existingUse } = await supabaseAdmin
      .from('promo_code_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('promo_code', promoCode)
      .single();

    if (existingUse) {
      return NextResponse.json({ error: 'Olet jo käyttänyt tämän promo-koodin' }, { status: 400 });
    }

    // Laske voimassaoloaika
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + promoDetails.durationDays);

    console.log('💳 Creating promo subscription:', {
      userId,
      tier: promoDetails.tier,
      tokens: promoDetails.tokens,
      expiresAt: currentPeriodEnd.toISOString()
    });

    // LUO/PÄIVITÄ SUBSCRIPTION (KORJATTU)
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_customer_id: `promo_customer_${userId}`,
        stripe_subscription_id: `promo_sub_${userId}_${promoCode}`,
        status: 'active',
        current_period_end: currentPeriodEnd.toISOString(),
        plan: promoDetails.tier,        // 👈 Aseta molemmat
        plan_type: promoDetails.tier,   // 👈 kentät samaksi
        tokens: promoDetails.tokens,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (subError) {
      console.error('❌ Subscription creation failed:', subError);
      return NextResponse.json(
        { error: 'Tilauksen luonti epäonnistui', details: subError.message },
        { status: 500 }
      );
    }

    // Merkitse koodi käytetyksi
    await supabaseAdmin
      .from('promo_code_usage')
      .insert({
        user_id: userId,
        promo_code: promoCode,
        redeemed_at: new Date().toISOString()
      });

    console.log('✅ Promo code redeemed successfully');

    return NextResponse.json({
      success: true,
      message: `${promoDetails.description}`,
      subscription: {
        tier: promoDetails.tier,
        tokens: promoDetails.tokens,
        expiresAt: currentPeriodEnd.toISOString(),
        durationDays: promoDetails.durationDays
      }
    });

  } catch (error: any) {
    console.error('💥 Promo code redemption error:', error);
    return NextResponse.json(
      { error: 'Promo-koodin aktivointi epäonnistui', message: error.message },
      { status: 500 }
    );
  }
}
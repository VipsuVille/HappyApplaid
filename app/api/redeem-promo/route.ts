// app/api/redeem-promo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// PROMO-KOODIT: Lisää tähän haluamasi koodit
const PROMO_CODES: Record<string, {
  tokens: number;
  durationDays: number;
  maxUses?: number; // Valinnainen: kuinka monta kertaa koodi voidaan käyttää
  description: string;
}> = {
  'SEPPO': {
    tokens: 1000,
    durationDays: 10, // päivää
    description: 'Kiitos avustasi :)'
  },
  'FRIEND50': {
    tokens: 1000,
    durationDays: 30,
    description: 'Ystävälle 1kk ilmainen premium'
  },
  'LIFETIME': {
    tokens: 10000,
    durationDays: 3650, // 10 vuotta
    maxUses: 5,
    description: 'Lifetime premium (10v)'
  }
};

export async function POST(req: NextRequest) {
  try {
    // 1. TARKISTA AUTENTIKOINTI
    const authData = await auth();
    const userId = authData.userId;

    if (!userId) {
      return NextResponse.json(
        { error: 'Kirjaudu sisään ensin' },
        { status: 401 }
      );
    }

    // 2. HAE PROMO-KOODI
    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Anna promo-koodi' },
        { status: 400 }
      );
    }

    // 3. TARKISTA ONKO KOODI OLEMASSA
    const promoCode = code.toUpperCase().trim();
    const promoDetails = PROMO_CODES[promoCode];

    if (!promoDetails) {
      return NextResponse.json(
        { error: 'Virheellinen promo-koodi' },
        { status: 400 }
      );
    }

    // 4. TARKISTA ONKO KÄYTTÄJÄLLÄ JO AKTIIVINEN PREMIUM
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingSub?.is_active && existingSub?.plan_type === 'premium') {
      return NextResponse.json(
        { error: 'Sinulla on jo aktiivinen Premium-tilaus' },
        { status: 400 }
      );
    }

    // 5. TARKISTA ONKO KÄYTTÄJÄ JO KÄYTTÄNYT TÄMÄN KOODIN
    const { data: existingUse } = await supabaseAdmin
      .from('promo_code_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('promo_code', promoCode)
      .single();

    if (existingUse) {
      return NextResponse.json(
        { error: 'Olet jo käyttänyt tämän promo-koodin' },
        { status: 400 }
      );
    }

    // 6. TARKISTA KÄYTTÖKERRAT (jos määritetty)
    if (promoDetails.maxUses) {
      const { count } = await supabaseAdmin
        .from('promo_code_usage')
        .select('*', { count: 'exact', head: true })
        .eq('promo_code', promoCode);

      if (count && count >= promoDetails.maxUses) {
        return NextResponse.json(
          { error: 'Promo-koodi on loppunut' },
          { status: 400 }
        );
      }
    }

    // 7. LASKE VOIMASSAOLOAIKA
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + promoDetails.durationDays);

    // 8. LUO/PÄIVITÄ SUBSCRIPTION
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_customer_id: `promo_customer_${userId}`,
        stripe_subscription_id: `promo_sub_${userId}_${promoCode}`,
        status: 'active',
        current_period_end: currentPeriodEnd.toISOString(),
        plan: 'pro',
        tokens: promoDetails.tokens,
        plan_type: 'pro',
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

    // 9. MERKITSE KOODI KÄYTETYKSI
    const { error: usageError } = await supabaseAdmin
      .from('promo_code_usage')
      .insert({
        user_id: userId,
        promo_code: promoCode,
        redeemed_at: new Date().toISOString()
      });

    if (usageError) {
      console.error('⚠️ Usage tracking failed:', usageError);
      // Jatketaan silti, koska subscription on jo luotu
    }

    console.log('✅ Promo code redeemed:', {
      userId,
      code: promoCode,
      tokens: promoDetails.tokens,
      expiresAt: currentPeriodEnd.toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `${promoDetails.description}`,
      subscription: {
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

// GET-metodi: Tarkista promo-koodin tiedot (ei paljasta oikeita koodeja)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code')?.toUpperCase().trim();

    if (!code) {
      return NextResponse.json(
        { error: 'Anna promo-koodi' },
        { status: 400 }
      );
    }

    const promoDetails = PROMO_CODES[code];

    if (!promoDetails) {
      return NextResponse.json(
        { valid: false, error: 'Virheellinen promo-koodi' },
        { status: 404 }
      );
    }

    // Laske jäljellä olevat käyttökerrat
    let remainingUses = null;
    if (promoDetails.maxUses) {
      const { count } = await supabaseAdmin
        .from('promo_code_usage')
        .select('*', { count: 'exact', head: true })
        .eq('promo_code', code);

      remainingUses = promoDetails.maxUses - (count || 0);
    }

    return NextResponse.json({
      valid: true,
      description: promoDetails.description,
      tokens: promoDetails.tokens,
      durationDays: promoDetails.durationDays,
      remainingUses
    });

  } catch (error: any) {
    console.error('💥 Promo code check error:', error);
    return NextResponse.json(
      { error: 'Tarkistus epäonnistui', message: error.message },
      { status: 500 }
    );
  }
}
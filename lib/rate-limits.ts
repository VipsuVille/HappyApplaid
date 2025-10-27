// lib/rate-limits.ts
import { supabase } from './supabase';

//interface RateLimitEntry {
 // count: number;
 // last_reset: string; // ISO 8601 timestamp
// }

export async function checkCVGenerationLimit(userId: string, tier: 'basic' | 'premium') {
  const limit = tier === 'premium' ? 20 : 3;
  const now = new Date();
  
  // 1. Hae tai luo rate limit -entry Supabasesta
  const { data: entry, error: queryError } = await supabase
  .from('rate_limits')
  .select('*')
  .eq('user_id', userId)
  .single();

if (queryError && queryError.code !== 'PGRST116') { // PGRST116 = no rows found
  console.error('Failed to query rate limits:', queryError);
  throw queryError;
}

  // 2. Tarkista onko ensimmäinen käyttökerta tai yli 24h edellisestä
  if (!entry || new Date(entry.last_reset).getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
    await supabase
      .from('rate_limits')
      .upsert({
        user_id: userId,
        count: 1,
        last_reset: now.toISOString()
      });
    return;
  }

  // 3. Tarkista onko raja ylitetty
  if (entry.count >= limit) {
    throw new Error(
      tier === 'premium' 
        ? 'Päivittäinen CV-generointiraja täynnä (20kpl)' 
        : 'Päivittäinen CV-generointiraja täynnä (3kpl)'
    );
  }

  // 4. Päivitä laskuri
  await supabase
    .from('rate_limits')
    .update({
      count: entry.count + 1
    })
    .eq('user_id', userId);
}
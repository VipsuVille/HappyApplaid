// lib/utils/escapeTemplate.ts - KORJATTU VERSIO

/**
 * ✅ ESCAPETA AALTOSULUT LANGCHAIN-PROMPTEISSA
 * LangChain käyttää {variable} syntaksia.
 * 
 * TÄRKEÄÄ: Escapeta VAIN jos teksti menee suoraan promptiin.
 * ÄLÄ escapeta jos teksti menee formatMessages():iin parametrina!
 */

export function escapeTemplateString(text: string | undefined | null): string {
  if (!text) return '';
  
  // Muunna string (jos ei ole)
  const str = String(text);
  
  // ✅ Tarkista onko JO escapetettu (estä double-escape)
  if (str.includes('{{') && str.includes('}}')) {
    console.warn('⚠️ Text already escaped, returning as-is');
    return str;
  }
  
  // ✅ Escapeta vain kerran
  return str
    .replace(/\{/g, '{{')
    .replace(/\}/g, '}}');
}

export function unescapeTemplateString(text: string | undefined | null): string {
  if (!text) return '';
  
  return String(text)
    .replace(/\{\{/g, '{')
    .replace(/\}\}/g, '}');
}

/**
 * ✅ ÄLYKÄS VERSIO: Escapeta vain jos tarvitaan
 * Käytä tätä kun et ole varma pitääkö escapettaa
 */
export function smartEscape(text: string | undefined | null): string {
  if (!text) return '';
  
  const str = String(text);
  
  // Jos sisältää yksittäisiä { tai } (mutta ei pareja), escapeta
  const hasSingleBraces = /(?<!\{)\{(?!\{)|(?<!\})\}(?!\})/.test(str);
  
  if (hasSingleBraces) {
    return escapeTemplateString(str);
  }
  
  return str;
}

/**
 * ✅ GROUND TRUTH - Älä escapeta jos menee JSON:iin
 */
export function sanitizeGroundTruthForPrompt(groundTruth: any): string {
  const text = `
CRITICAL: IMMUTABLE FACTS - DO NOT DEVIATE:
- Years of Experience: ${groundTruth.yearsOfExperience || 'Not specified'}
- Core Personality: ${groundTruth.corePersonality?.primary || 'Not specified'}
- Skills: ${groundTruth.technicalSkills?.join(', ') || 'Not specified'}
- FORBIDDEN to claim: ${groundTruth.cannotClaim?.join(', ') || 'None'}
  `.trim();
  
  // ✅ Vain jos menee prompt-templateen
  return escapeTemplateString(text);
}

/**
 * ✅ SAFE VERSIO: Älä kaada jos input on outo
 */
export function safeEscape(text: any): string {
  try {
    if (text === null || text === undefined) return '';
    if (typeof text === 'object') return JSON.stringify(text);
    return escapeTemplateString(String(text));
  } catch (error) {
    console.error('Escape error:', error);
    return '';
  }
}
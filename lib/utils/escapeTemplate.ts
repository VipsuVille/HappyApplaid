// lib/utils/escapeTemplate.ts - UUSI TIEDOSTO
/**
 * ✅ ESCAPETA AALTOSULUT LANGCHAIN-PROMPTEISSA
 * LangChain käyttää {variable} syntaksia, joten meidän pitää escapeta {}.
 */

export function escapeTemplateString(text: string): string {
  if (!text) return '';
  
  // Korvaa { -> {{ ja } -> }}
  return text
    .replace(/\{/g, '{{')
    .replace(/\}/g, '}}');
}

export function unescapeTemplateString(text: string): string {
  if (!text) return '';
  
  // Palauta takaisin {{ -> { ja }} -> }
  return text
    .replace(/\{\{/g, '{')
    .replace(/\}\}/g, '}');
}

/**
 * ✅ KÄYTÄ TÄTÄ GROUND TRUTH WARNINGIIN
 */
export function sanitizeGroundTruthForPrompt(groundTruth: any): string {
  const text = `
    CRITICAL: IMMUTABLE FACTS - DO NOT DEVIATE:
    - Years of Experience: ${groundTruth.yearsOfExperience || 'Not specified'}
    - Core Personality: ${groundTruth.corePersonality?.primary || 'Not specified'}
    - Skills: ${groundTruth.technicalSkills?.join(', ') || 'Not specified'}
    - FORBIDDEN to claim: ${groundTruth.cannotClaim?.join(', ') || 'None'}
  `;
  
  // Escapeta kaikki {} promptia varten
  return escapeTemplateString(text);
}
// lib/utils/escapeTemplate.ts - LANGCHAIN TEMPLATE ESCAPE

/**
 * ✅ ESCAPETA AALTOSULUT LANGCHAIN-PROMPTEISSA
 * LangChain käyttää {variable} syntaksia, joten escapetaan {}
 */

export function escapeTemplateString(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\{/g, '{{')
    .replace(/\}/g, '}}');
}

export function unescapeTemplateString(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\{\{/g, '{')
    .replace(/\}\}/g, '}');
}

/**
 * ✅ KÄYTÄ GROUND TRUTH WARNINGIIN
 */
export function sanitizeGroundTruthForPrompt(groundTruth: any): string {
  const text = `
    CRITICAL: IMMUTABLE FACTS - DO NOT DEVIATE:
    - Years of Experience: ${groundTruth.yearsOfExperience || 'Not specified'}
    - Core Personality: ${groundTruth.corePersonality?.primary || 'Not specified'}
    - Skills: ${groundTruth.technicalSkills?.join(', ') || 'Not specified'}
    - FORBIDDEN to claim: ${groundTruth.cannotClaim?.join(', ') || 'None'}
  `;
  
  return escapeTemplateString(text);
}
// lib/langchain/languageDetector.ts - UNIVERSAALI KIELENTUNNISTUS

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  is_mixed: boolean;
  detected_languages?: string[];
  language_code?: string;
  script?: string;
}

const languageCache = new Map<string, LanguageDetectionResult>();

/**
 * ✅ UNIVERSAALI KIELENTUNNISTUS - 200+ KIELTÄ
 */
export async function detectLanguageWithAI(text: string): Promise<LanguageDetectionResult> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a universal language detection system supporting 200+ languages.

**PRINCIPLES - ZERO HARDCODING:**
- Detect ALL languages (not just common ones)
- No hardcoded language lists
- No regex patterns
- Use semantic understanding
- Handle code-switching (mixed languages)
- Understand dialects and informal speech

**DETECTION METHOD:**
1. Analyze character patterns (semantic, not hardcoded)
2. Recognize language structure through AI knowledge
3. Identify common patterns using world knowledge
4. Detect mixed language scenarios
5. Estimate confidence

**OUTPUT:**
{
  "language": "language_name in english",
  "confidence": 0.0-1.0,
  "is_mixed": false,
  "language_code": "ISO 639-1 code",
  "script": "Alphabet/script used"
}

If mixed:
{
  "language": "mixed",
  "is_mixed": true,
  "detected_languages": ["lang1", "lang2"],
  "confidence": 0.0-1.0,
  "language_code": "multi",
  "script": "Multiple"
}

Return JSON only.`],

    ["human", `Detect language in this text:

{text}

Return JSON.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      text: text.substring(0, 500)
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const detection: LanguageDetectionResult = JSON.parse(jsonMatch[0]);

    console.log(
      `🌍 Detected: ${detection.language} ` +
      `(confidence: ${(detection.confidence * 100).toFixed(0)}%)`
    );

    return detection;
  } catch (error) {
    console.error("Language detection failed:", error);

    return {
      language: "english",
      confidence: 0.5,
      is_mixed: false,
      language_code: "en",
      script: "Latin",
    };
  }
}

/**
 * ✅ CACHED VERSION - Performance
 */
export async function detectLanguageCached(text: string): Promise<string> {
  const cacheKey = text.substring(0, 100);
  
  if (languageCache.has(cacheKey)) {
    const cached = languageCache.get(cacheKey)!;
    console.log(`💾 Using cached language: ${cached.language}`);
    return cached.language;
  }

  const detection = await detectLanguageWithAI(text);
  languageCache.set(cacheKey, detection);

  return detection.language;
}

/**
 * ✅ BATCH PROCESSING
 */
export async function detectLanguagesBatch(
  texts: string[]
): Promise<LanguageDetectionResult[]> {
  return Promise.all(
    texts.map(text => detectLanguageWithAI(text))
  );
}

/**
 * ✅ GET LANGUAGE METADATA
 */
export async function getLanguageInfo(language: string): Promise<{
  native_name: string;
  english_name: string;
  iso_639_1: string;
  script: string;
  right_to_left: boolean;
  regional_variants: string[];
}> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `Return language metadata using AI knowledge. No hardcoding.

Return JSON only.`],
    ["human", `Get info about: {language}

Return:
{
  "native_name": "How it's called in that language",
  "english_name": "English name",
  "iso_639_1": "Two-letter code",
  "script": "Alphabet/script",
  "right_to_left": true/false,
  "regional_variants": ["variant1", "variant2"]
}`]
  ]);

  try {
    const formatted = await prompt.formatMessages({ language });
    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Language info failed:', error);
    return {
      native_name: language,
      english_name: language,
      iso_639_1: "xx",
      script: "Unknown",
      right_to_left: false,
      regional_variants: [],
    };
  }
}

/**
 * ✅ NORMALIZE LANGUAGE OUTPUT
 */
export async function normalizeLanguage(detectedLanguage: string): Promise<string> {
  const normalizations: Record<string, string> = {
    "finnish": "finnish",
    "suomi": "finnish",
    "fi": "finnish",
    "eng": "english",
    "english": "english",
    "en": "english",
    "us": "english",
    "gb": "english",
    "swedish": "swedish",
    "svenska": "swedish",
    "sv": "swedish",
  };

  const lower = detectedLanguage.toLowerCase();
  return normalizations[lower] || lower;
}
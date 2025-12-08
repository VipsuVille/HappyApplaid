// lib/knowledge/index.ts - 100% FLEXIBLE RAG SYSTEM

import { OpenAIEmbeddings } from '@langchain/openai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { supabaseAdmin } from '@/lib/supabase';
import { createHash } from 'crypto';
import { escapeTemplateString } from '../utils/escapeTemplate'; // ✅ LISÄÄ TÄMÄ

/**
 * ✅ ZERO HARDCODING KNOWLEDGE BASE
 * - No predefined industries
 * - No predefined languages
 * - No predefined experience levels
 * - AI infers everything dynamically
 */
export class KnowledgeBase {
  private vectorStore: SupabaseVectorStore | null = null;
  private embeddings: OpenAIEmbeddings;
  private cache: Map<string, { data: string; timestamp: number }>;
  private readonly TTL = 1000 * 60 * 60; // 1h

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: 'text-embedding-3-small',
    });
    this.cache = new Map();
  }

  async initialize() {
    if (this.vectorStore) return;

    try {
      this.vectorStore = await SupabaseVectorStore.fromExistingIndex(
        this.embeddings,
        {
          client: supabaseAdmin,
          tableName: 'cover_letter_knowledge',
          queryName: 'match_cover_letter_knowledge',
        }
      );
      console.log('✅ Knowledge base initialized');
    } catch (error) {
      console.error('❌ KB init failed:', error);
      throw error;
    }
  }

  /**
   * ✅ UNIVERSAL RETRIEVE (No Hardcoding)
   */
  async retrieve(input: {
    jobDescription: string;
    userProfile?: Record<string, any>; // Fully dynamic
    contentType: 'cover_letter' | 'cv'; // Filter by type
    maxResults?: number;
  }): Promise<string> {
    const cacheKey = this.createCacheKey(input);
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log('💾 Cache HIT');
      return cached;
    }

    await this.initialize();
    if (!this.vectorStore) {
      console.warn('⚠️ Vector store unavailable');
      return '';
    }

    // Build semantic query (AI infers context)
    const query = this.buildSemanticQuery(input);
    
    try {
      const results = await this.vectorStore.similaritySearch(
        query,
        input.maxResults || 5 // Get more results for prioritization
      );

      if (results.length === 0) {
        console.log('📭 No relevant documents');
        return '';
      }

      // ✅ PRIORITIZE by content_type and priority
      const prioritized = this.prioritizeResults(results, input.contentType);

      // Format with priority indicators
      const insights = prioritized
        .map((doc, i) => {
          const meta = doc.metadata || {};
          const isPriority = meta.priority === 'high';
          const isCorrectType = meta.content_type === input.contentType;
          
          return `
### ${isPriority ? '⭐ PRIORITY ' : ''}Insight ${i + 1} (${meta.source || 'Unknown'})
${meta.content_type ? `**Type:** ${meta.content_type}` : ''}
${meta.topics ? `**Topics:** ${meta.topics.join(', ')}` : ''}
${isPriority ? '**⚠️ Admin-marked as HIGH PRIORITY for this content type**' : ''}

${escapeTemplateString(doc.pageContent)} // ✅ KORJAUS TÄHÄN
          `.trim();
        })
        .join('\n\n---\n\n');

      this.setCached(cacheKey, insights);
      console.log(`✅ Retrieved ${prioritized.length} insights (${input.contentType})`);
      return insights;
    } catch (error) {
      console.error('❌ Retrieval failed:', error);
      return '';
    }
  }

  /**
   * ✅ PRIORITIZE RESULTS (content_type + priority)
   */
  private prioritizeResults(
    results: any[],
    contentType: 'cover_letter' | 'cv'
  ): any[] {
    return results
      .map(doc => ({
        doc,
        score: this.calculatePriorityScore(doc, contentType)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3) // Top 3 after prioritization
      .map(item => item.doc);
  }

  /**
   * ✅ CALCULATE PRIORITY SCORE (Zero Hardcoding)
   */
  private calculatePriorityScore(doc: any, contentType: string): number {
    const meta = doc.metadata || {};
    let score = 0;

    // 1. Content type match (highest priority)
    if (meta.content_type === contentType) {
      score += 100;
    }

    // 2. Admin-set priority
    if (meta.priority === 'high') {
      score += 50;
    } else if (meta.priority === 'medium') {
      score += 25;
    }

    // 3. Recency (newer = better)
    if (meta.createdAt) {
      const age = Date.now() - new Date(meta.createdAt).getTime();
      const daysSinceCreation = age / (1000 * 60 * 60 * 24);
      score += Math.max(0, 10 - daysSinceCreation / 30); // Decay over 30 days
    }

    return score;
  }

  /**
   * ✅ BUILD SEMANTIC QUERY (AI Infers Context)
   */
  private buildSemanticQuery(input: {
    jobDescription: string;
    userProfile?: Record<string, any>;
    contentType: string;
  }): string {
    // Let AI understand the context semantically
    // NO hardcoded assumptions
    
    const profile = input.userProfile || {};
    const profileContext = Object.entries(profile)
      .filter(([_, v]) => v && String(v).length > 0)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return `
Content Type Needed: ${input.contentType}

Job Context:
${input.jobDescription.substring(0, 500)}

Candidate Profile:
${profileContext || 'No profile provided'}

Find relevant insights that:
1. Match content type: ${input.contentType}
2. Are applicable to THIS specific context
3. Use semantic understanding (no keyword matching)
    `.trim();
  }

  /**
   * ✅ HONESTY GUIDELINES (Universal, No Hardcoding)
   */
  getHonestyGuidelines(): string {
    return `
# UNIVERSAL TRUTH ENFORCEMENT (All Languages, All Industries)

## Core Principle: Zero Fabrication
AI MUST verify EVERY claim against candidate's actual data.

## Rule 1: The Truth Test
> "Can candidate explain this in detail if asked?"
> If NO → Don't write it.

## Rule 2: Missing Skills Protocol
When job requires skill NOT in candidate profile:

**FORBIDDEN:**
- Write: "I am familiar with [missing skill]"
- Write: "I have experience with [missing skill]"
- Write: "I am aware of [missing skill]"

**REQUIRED:**
- Generate QUESTION: "Job mentions [skill]. Do you have experience?"
- OR use honest compensation: "While I haven't used [skill], I have [related skill]"
- OR skip mentioning it entirely

## Rule 3: Dangerous Phrases (Auto-Verify)
These phrases require PROOF in candidate data:
- "I am aware of..."
- "I am familiar with..."
- "I have knowledge of..."
- "I understand [concept]..."

Action: Check candidate's actual skills/experience FIRST.
If not found → STOP and ASK or SKIP.

## Rule 4: Question Generation (When Uncertain)
If AI cannot verify a claim:
1. STOP generation
2. Return question to user
3. Wait for answer
4. THEN continue with verified info

Example:
Job: "React experience required"
Profile: No React mentioned
→ QUESTION: "This job requires React. Do you have experience?"
→ WAIT for answer
→ If YES + details → Use them
→ If NO → Use honest compensation or skip

## Rule 5: Language Agnostic
This applies in ALL languages:
- Finnish: "Olen tietoinen..." = needs proof
- English: "I am aware of..." = needs proof
- Swedish: "Jag är medveten om..." = needs proof

## Rule 6: Industry Agnostic
This applies to ALL fields:
- Tech: Verify technical skills
- Healthcare: Verify medical background
- Retail: Verify customer service
- Creative: Verify portfolio work

NO assumptions based on industry stereotypes.
    `.trim();
  }

  // Cache helpers (unchanged)
  private createCacheKey(input: any): string {
    const hash = createHash('md5')
      .update(JSON.stringify({
        job: input.jobDescription.substring(0, 300),
        profile: input.userProfile,
        type: input.contentType
      }))
      .digest('hex');
    return hash.substring(0, 16);
  }

  private getCached(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCached(key: string, data: string): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

export const knowledgeBase = new KnowledgeBase();

/**
 * ✅ BUILD CONTEXT (with Type Filtering)
 */
export async function buildAIContext(input: {
  jobDescription: string;
  userProfile?: Record<string, any>;
  enableRAG: boolean;
  contentType: 'cover_letter' | 'cv';
}): Promise<string> {
  const coreGuidelines = knowledgeBase.getHonestyGuidelines();

  if (!input.enableRAG) {
    return `
# KNOWLEDGE BASE GUIDELINES

${coreGuidelines}

---
**Note:** Upgrade to PRO for expert insights.
    `.trim();
  }

  try {
    const dynamicInsights = await knowledgeBase.retrieve({
      jobDescription: input.jobDescription,
      userProfile: input.userProfile,
      contentType: input.contentType,
      maxResults: 5
    });

    if (!dynamicInsights) {
      return coreGuidelines;
    }

    return `
# KNOWLEDGE BASE GUIDELINES

## Core Truth Enforcement (ALWAYS ACTIVE)
${coreGuidelines}

## Expert Insights (PRO - Retrieved for ${input.contentType})
${dynamicInsights}

---
**Critical:** If insights suggest claiming skills candidate lacks, IGNORE and ASK user instead.
    `.trim();
  } catch (error) {
    console.error('RAG failed:', error);
    return coreGuidelines;
  }
}
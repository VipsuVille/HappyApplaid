// lib/knowledge/ingestion.ts - PRIORITY + TYPE SUPPORT

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * ✅ AI CONTENT ANALYSIS (Zero Hardcoding)
 */
async function analyzeContent(content: string): Promise<{
  insights: string[];
  topics: string[];
  relevantFor: string[];
  language: string;
  suggestedType: 'cover_letter' | 'cv' | 'both';
}> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.1,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a universal content analyzer for career materials.

**YOUR MISSION:**
Analyze content and extract insights WITHOUT hardcoded assumptions.

**EXTRACT:**
1. **Key Insights** (5-8 actionable takeaways)
2. **Topics** (semantic tags, not predefined list)
3. **Relevant For** (infer from content, no stereotypes)
4. **Language** (detect automatically)
5. **Content Type** (infer if cover letter, CV, or both applicable)

**CRITICAL:**
- NO assumptions about industries
- NO assumptions about experience levels
- NO predefined topic lists
- Use AI understanding ONLY

**OUTPUT:**
{
  "insights": ["Specific, actionable insight 1", "..."],
  "topics": ["topic1", "topic2"],
  "relevantFor": ["inferred audience"],
  "language": "detected_language",
  "suggestedType": "cover_letter|cv|both"
}

Return JSON only.`],

    ['human', `Analyze this content:

{content}

Determine if it's more relevant for:
- "cover_letter" (application letters, motivation)
- "cv" (resume, experience listing)
- "both" (general career advice)

Return JSON.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({ 
      content: content.substring(0, 4000) 
    });
    
    const result = await model.invoke(formatted);
    const jsonContent = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Analysis failed:', error);
    
    return {
      insights: ['Content added'],
      topics: ['general'],
      relevantFor: ['all'],
      language: 'unknown',
      suggestedType: 'both'
    };
  }
}

/**
 * ✅ INGEST WITH PRIORITY AND TYPE
 */
export async function ingestContent(input: {
  content: string;
  source: string;
  author?: string;
  url?: string;
  priority?: 'high' | 'medium' | 'low';
  content_type?: 'cover_letter' | 'cv' | 'both';
  language?: string;                 // ✅ UUSI: 'finnish' | 'english' (override auto-detect)
}): Promise<{
  success: boolean;
  chunksAdded: number;
  insights: string[];
  detectedType: string;
  message: string;
}> {
  console.log(`📥 Ingesting: ${input.source}`);

  // 1. AI Analysis
  const analysis = await analyzeContent(input.content);
  console.log(`✅ AI Analysis: ${analysis.insights.length} insights, type: ${analysis.suggestedType}`);

  // 2. Determine final type (admin override or AI suggestion)
  const finalType = input.content_type || analysis.suggestedType;

  // 3. Priority + ✅ kieli (käsin annettu voittaa auto-tunnistuksen)
  const priority = input.priority || 'medium';
  const finalLanguage = input.language || analysis.language;
  console.log(`📌 type: ${finalType}, priority: ${priority}, language: ${finalLanguage}`);

  // 4. Split into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitText(input.content);
  console.log(`📄 Split into ${chunks.length} chunks`);

  // 5. Create embeddings and store
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'text-embedding-3-small',
  });

  let addedCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    try {
      const chunk = chunks[i];
      const embedding = await embeddings.embedQuery(chunk);

      const { error } = await supabaseAdmin
        .from('cover_letter_knowledge')
        .insert({
          content: chunk,
          embedding: embedding,
          metadata: {
            source: input.source,
            author: input.author || 'Unknown',
            url: input.url || null,
            language: finalLanguage,          // ✅ käsin annettu / auto
            topics: analysis.topics,
            relevantFor: analysis.relevantFor,
            insights: analysis.insights,
            priority: priority,
            content_type: finalType,
            chunkIndex: i,
            totalChunks: chunks.length,
            createdAt: new Date().toISOString(),
          },
        });

      if (error) { console.error(`Failed chunk ${i}:`, error); continue; }
      addedCount++;
    } catch (error) {
      console.error(`Error chunk ${i}:`, error);
    }
  }

  console.log(`✅ Added ${addedCount}/${chunks.length} chunks`);

  return {
    success: addedCount > 0,
    chunksAdded: addedCount,
    insights: analysis.insights,
    detectedType: finalType,
    message: `Added ${addedCount} chunks (${finalType}, ${finalLanguage}, priority: ${priority})`,
  };
}

/**
 * ✅ LIST ARTICLES WITH METADATA
 */
export async function listArticles(): Promise<Array<{
  source: string;
  chunks: number;
  topics: string[];
  language: string;
  priority: string;
  content_type: string;
  createdAt: string;
}>> {
  const { data, error } = await supabaseAdmin
    .from('cover_letter_knowledge')
    .select('metadata')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('List failed:', error);
    return [];
  }

  const grouped = new Map<string, any>();
  
  for (const row of data || []) {
    const meta = row.metadata || {};
    const source = meta.source || 'Unknown';
    
    if (!grouped.has(source)) {
      grouped.set(source, {
        source,
        chunks: 0,
        topics: new Set(meta.topics || []),
        language: meta.language || 'unknown',
        priority: meta.priority || 'medium',
        content_type: meta.content_type || 'both',
        createdAt: meta.createdAt || 'unknown'
      });
    }
    
    const entry = grouped.get(source)!;
    entry.chunks++;
    if (meta.topics) {
      meta.topics.forEach((t: string) => entry.topics.add(t));
    }
  }

  return Array.from(grouped.values()).map(entry => ({
    ...entry,
    topics: Array.from(entry.topics)
  }));
}

/**
 * ✅ DELETE ARTICLE
 */
export async function deleteArticle(source: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('cover_letter_knowledge')
    .delete()
    .eq('metadata->>source', source);

  if (error) {
    console.error('Delete failed:', error);
    return false;
  }

  console.log(`✅ Deleted: ${source}`);
  return true;
}

/**
 * ✅ UPDATE PRIORITY (after adding)
 */
export async function updatePriority(
  source: string, 
  newPriority: 'high' | 'medium' | 'low'
): Promise<boolean> {
  try {
    // Get all rows for this source
    const { data: rows } = await supabaseAdmin
      .from('cover_letter_knowledge')
      .select('id, metadata')
      .eq('metadata->>source', source);

    if (!rows || rows.length === 0) {
      console.error('Source not found:', source);
      return false;
    }

    // Update each row
    for (const row of rows) {
      const updatedMetadata = {
        ...row.metadata,
        priority: newPriority
      };

      await supabaseAdmin
        .from('cover_letter_knowledge')
        .update({ metadata: updatedMetadata })
        .eq('id', row.id);
    }

    console.log(`✅ Updated priority for ${source}: ${newPriority}`);
    return true;
  } catch (error) {
    console.error('Priority update failed:', error);
    return false;
  }
}
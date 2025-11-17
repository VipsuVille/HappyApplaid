// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. app/api/insert-keyword-smart/route.ts - LISÄÄ CHECKPOINT 2
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { masterConsistencyCheck, GroundTruth } from '@/lib/ats/masterGuardian';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { keyword, currentContent, jobDescription, coverLetterId } = await req.json();

    if (!keyword || !currentContent) {
      return NextResponse.json(
        { error: 'Keyword and current content required' },
        { status: 400 }
      );
    }

    // ✅ 1. HAE GROUND TRUTH TIETOKANNASTA (jos coverLetterId annettu)
    let groundTruth: GroundTruth | null = null;
    
    if (coverLetterId) {
      const { data: coverLetter } = await supabaseAdmin
        .from('cover_letters')
        .select('ai_data')
        .eq('id', coverLetterId)
        .eq('user_id', userId)
        .single();

      if (coverLetter?.ai_data?.ground_truth) {
        groundTruth = coverLetter.ai_data.ground_truth;
        console.log('🛡️ Ground Truth loaded from database');
      }
    }

    // Jos ei Ground Truth:ia, hae profiilista
    if (!groundTruth) {
      console.warn('⚠️ No Ground Truth in database, fetching from profile...');
      const { data: userProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userProfile) {
        const { extractGroundTruth } = await import('@/lib/ats/masterGuardian');
        groundTruth = extractGroundTruth(userProfile);
      } else {
        console.error('❌ No profile found - cannot validate');
      }
    }

    // ✅ 2. TARKISTA ONKO KIELLETTY (jos Ground Truth löytyy)
    if (groundTruth) {
      const isForbidden = groundTruth.cannotClaim.some(forbidden => 
        keyword.toLowerCase().includes(forbidden.toLowerCase())
      );

      if (isForbidden) {
        console.warn(`🚫 Forbidden keyword rejected: "${keyword}"`);
        return NextResponse.json({
          error: 'FORBIDDEN_KEYWORD',
          message: `Et voi lisätä avainsanaa "${keyword}" - ei profiilissasi.`,
          suggestion: 'Lisää tämä taito profiiliisi ensin tai valitse toinen avainsana.'
        }, { status: 400 });
      }
    }

    // ✅ 3. AI LISÄÄ AVAINSANAN (RESTRICTED MODE)
    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini',
      temperature: 0.2, // Matala = vähemmän luovuutta
    });

    const systemPrompt = groundTruth 
      ? `You are a RESTRICTED keyword inserter. NO fact changes allowed.

GROUND TRUTH (IMMUTABLE):
- Years of Experience: ${groundTruth.yearsOfExperience || 'Not specified'}
- Core Personality: ${groundTruth.corePersonality.primary}
- Skills: ${groundTruth.technicalSkills.join(', ')}
- FORBIDDEN: ${groundTruth.cannotClaim.join(', ')}

RULES:
1. Insert ONLY the keyword "{keyword}" - nothing else
2. DO NOT change any numbers (years, percentages, quantities)
3. DO NOT add experience the user doesn't have
4. DO NOT inflate skills or qualifications
5. Keep insertion minimal and natural
6. If you cannot insert naturally WITHOUT changing facts → return "CANNOT_INSERT"

Return ONLY the improved cover letter text OR "CANNOT_INSERT".`
      : `You are an expert at naturally inserting keywords into cover letters.

RULES:
1. Insert the keyword "{keyword}" naturally
2. DO NOT change any other content significantly
3. If technical term, keep as-is
4. If soft skill, integrate naturally
5. Return ONLY the improved text

Return ONLY the improved cover letter text.`;

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', `Current cover letter:
{currentContent}

Keyword to insert:
{keyword}

Job context:
{jobDescription}

Insert "{keyword}" naturally and return improved text only.`]
    ]);

    const formatted = await prompt.formatMessages({
      keyword,
      currentContent,
      jobDescription: jobDescription || 'No context'
    });

    const result = await model.invoke(formatted);
    const improvedContent = typeof result.content === 'string' 
      ? result.content.trim()
      : '';

    // ✅ 4. TARKISTA "CANNOT_INSERT"
    if (improvedContent === 'CANNOT_INSERT' || improvedContent.includes('CANNOT_INSERT')) {
      return NextResponse.json({
        error: 'CANNOT_INSERT_NATURALLY',
        message: `AI ei pystynyt lisäämään avainsanaa "${keyword}" luonnollisesti ilman faktamuutoksia.`,
        suggestion: 'Lisää avainsana manuaalisesti tai valitse toinen paikka.'
      }, { status: 400 });
    }

    // ✅ 5. CHECKPOINT 2: MASTER GUARDIAN (jos Ground Truth löytyy)
    if (groundTruth) {
      console.log('🛡️ Running Guardian validation for keyword insertion...');
      const guardianCheck = await masterConsistencyCheck(
        improvedContent,
        groundTruth,
        'keyword_insertion'
      );

      // 🚨 HYLKÄÄ JOS DANGER
      if (guardianCheck.riskLevel === 'danger') {
        console.error('🚨 GUARDIAN BLOCKED INSERTION!');
        console.error('Keyword:', keyword);
        console.error('Violations:', guardianCheck.violations);
        
        return NextResponse.json({
          error: 'GUARDIAN_REJECTED',
          message: `AI yritti muuttaa faktoja lisätessään avainsanaa "${keyword}".`,
          violations: guardianCheck.violations,
          fixSuggestions: guardianCheck.fixSuggestions
        }, { status: 400 });
      }

      // ⚠️ VAROITA JOS WARNING
      if (guardianCheck.riskLevel === 'warning') {
        console.warn('⚠️ Guardian warning:', guardianCheck.violations);
        return NextResponse.json({
          improvedContent,
          insertedKeyword: keyword,
          warning: {
            show: true,
            message: guardianCheck.recommendation,
            violations: guardianCheck.violations,
            requiresConfirmation: true
          }
        });
      }

      console.log('✅ Guardian approved keyword insertion');
    } else {
      console.warn('⚠️ Skipping Guardian check - no Ground Truth available');
    }

    // ✅ OK - PALAUTA
    return NextResponse.json({
      improvedContent,
      insertedKeyword: keyword,
      validated: groundTruth !== null,
      guardianApproved: true
    });
  } catch (error) {
    console.error('Smart keyword insertion error:', error);
    return NextResponse.json(
      { 
        error: 'Insertion failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// app/api/generate-cover-letter/route.ts — checkLimit + logUsage + RAG-premium-portti + AI-tausta premium-only
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateGeneralCoverLetterSafely } from '@/lib/langchain/generalCoverLetterGenerator';
import { generateATSCoverLetterV1 } from '@/lib/langchain/coverLetterGenerator';
import { generateATSCoverLetterV2 } from '@/lib/langchain/coverLetterGeneratorV2';
import { analyzeExperienceGap } from '@/lib/ats/experienceGapAnalyzer';
import { normalizeBody } from '@/lib/cover-letter/normalize';
import { generateEnhancedBackgroundImage } from '@/lib/langchain/cvGenerator';
import { checkLimit, logUsage, limitMessage, planOf, canUseFeature } from '@/lib/limits'; // ✅ + planOf, canUseFeature

const BG_TEMPLATES = ['aurora', 'sidebar'];
// 🔧 VÄLIAIKAINEN: gap-analyysi pois RAG-debuggauksen ajaksi.
// Kytke takaisin vaihtamalla true:ksi kun rakennamme gap-modaalin.
const GAP_ANALYSIS_ENABLED = false;
type CoverLetterType = 'general' | 'ats-v1' | 'ats-v2';

interface BaseCoverLetterRequest {
  type: CoverLetterType;
  name?: string; email?: string; phone?: string; location?: string;
  language?: string; style?: 'professional' | 'casual' | 'creative';
  enableRAG?: boolean; templateStyle?: string; additionalNotes?: string;
  saveAdditionalNotes?: boolean; skipExperienceCheck?: boolean;
  followUpAnswers?: Record<string, string>;
}
interface GeneralCoverLetterRequest extends BaseCoverLetterRequest {
  type: 'general'; jobTitle?: string; companyName?: string; jobPosting?: string;
  companyMotivation?: string; companyAboutText?: string; workExperience?: string;
  education?: string; skills?: string; yearsOfExperience?: number;
  careerLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'expert';
  workingStyle?: string; problemSolving?: string; uniqueStrength?: string;
  superpower?: string; energySources?: string; learningStyle?: string;
  teamRole?: string; valuesExample?: string; careerGoals?: string;
  bestProjectExample?: string; failureLesson?: string;
}
interface ATSCoverLetterV1Request extends BaseCoverLetterRequest {
  type: 'ats-v1'; jobTitle: string; companyName: string; jobDescription: string;
  workExperience: string; education: string; skills: string; yearsOfExperience?: number;
  careerLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'expert'; companyResearch?: string; keywords?: string[];
}
interface ATSCoverLetterV2Request extends BaseCoverLetterRequest {
  type: 'ats-v2'; jobTitle: string; companyName: string; jobDescription: string;
  workExperience: string; education: string; skills: string; yearsOfExperience?: number;
  careerLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'expert'; keywords?: string[];
  companyResearch?: string; atsScore?: boolean; guardianValidation?: boolean;
}
type CoverLetterRequest = GeneralCoverLetterRequest | ATSCoverLetterV1Request | ATSCoverLetterV2Request;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body: CoverLetterRequest = await request.json();

    if (!body.type || !['general', 'ats-v1', 'ats-v2'].includes(body.type)) {
      return NextResponse.json({ error: 'Invalid type. Must be: general, ats-v1, or ats-v2' }, { status: 400 });
    }
    if (body.type === 'ats-v1' || body.type === 'ats-v2') {
      const atsBody = body as ATSCoverLetterV1Request | ATSCoverLetterV2Request;
      if (!atsBody.jobTitle || !atsBody.companyName || !atsBody.jobDescription) {
        return NextResponse.json({ error: 'ATS cover letters require: jobTitle, companyName, jobDescription' }, { status: 400 });
      }
    }

    // ── KULUHALLINTA + PLAN ────────────────────────────────────────
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_type')
      .eq('user_id', userId)
      .maybeSingle();

    const plan = planOf(subscription?.plan_type);
    const canAiBg = canUseFeature(plan, 'ai_background'); // AI-taustakuva: vain premium
    const ragOn = plan === 'premium' && body.enableRAG === true;

    // RAG: vain premium

    const limit = await checkLimit(userId, subscription?.plan_type);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'LIMIT_REACHED', message: limitMessage(limit), reason: limit.reason, upgrade: limit.plan === 'free' },
        { status: 429 }
      );
    }

    // ── EXPERIENCE GAP ANALYSIS (ei kirjaa käyttöä) ────────────────
    if (GAP_ANALYSIS_ENABLED && (body.type === 'ats-v1' || body.type === 'ats-v2') && !body.skipExperienceCheck) {
      const atsBody = body as ATSCoverLetterV1Request | ATSCoverLetterV2Request;
      try {
        let extractedKeywords = atsBody.keywords || [];
        if (extractedKeywords.length === 0) {
          const keywordResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/extract-keywords-ai`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobDescription: atsBody.jobDescription }),
          });
          if (keywordResponse.ok) {
            const keywordData = await keywordResponse.json();
            extractedKeywords = [...(keywordData.critical || []), ...(keywordData.important || [])];
          }
        }
        const experienceGap = await analyzeExperienceGap({
          jobDescription: atsBody.jobDescription,
          userProfile: {
            workExperience: atsBody.workExperience,
            education: atsBody.education, skills: atsBody.skills,
            yearsOfExperience: atsBody.yearsOfExperience, careerLevel: atsBody.careerLevel,
          },
          extractedKeywords: extractedKeywords.length > 0
            ? { critical: extractedKeywords.slice(0, 5), important: extractedKeywords.slice(5, 10), bonus: extractedKeywords.slice(10) }
            : undefined,
          followUpAnswers: body.followUpAnswers,
          language: body.language || 'finnish',
        });
        if (experienceGap.hasGap && experienceGap.severity !== 'none') {
          return NextResponse.json({ needsWarning: true, experienceGap, message: 'Experience gap detected' });
        }
      } catch (error) {
        console.error('⚠️ [ExperienceGap] Analysis failed:', error);
      }
    }

    // ── GENERATE ───────────────────────────────────────────────────
    let content: string; let title: string; let keyHighlights: string[] = [];
    let atsScore: number | undefined; let atsAnalysis: any;

    switch (body.type) {
      case 'general': {
        const b = body as GeneralCoverLetterRequest;
        const result = await generateGeneralCoverLetterSafely({
          name: b.name, email: b.email, phone: b.phone, location: b.location,
          jobTitle: b.jobTitle, companyName: b.companyName, jobPosting: b.jobPosting,
          companyMotivation: b.companyMotivation, companyAboutText: b.companyAboutText,
          workExperience: b.workExperience, education: b.education, skills: b.skills,
          workingStyle: b.workingStyle, problemSolving: b.problemSolving, uniqueStrength: b.uniqueStrength,
          superpower: b.superpower, energySources: b.energySources, learningStyle: b.learningStyle,
          teamRole: b.teamRole, valuesExample: b.valuesExample, careerGoals: b.careerGoals,
          bestProjectExample: b.bestProjectExample, failureLesson: b.failureLesson,
          additionalNotes: b.additionalNotes, language: b.language || 'finnish',
          style: b.style || 'professional', enableRAG: ragOn, // ✅ RAG premium-only
        });
        content = result.content; title = result.title; keyHighlights = result.keyHighlights || [];
        break;
      }
      case 'ats-v1': {
        const b = body as ATSCoverLetterV1Request;
        const result = await generateATSCoverLetterV1({
          jobDescription: b.jobDescription, name: b.name || 'Applicant', email: b.email, phone: b.phone, location: b.location,
          workExperience: b.workExperience, education: b.education, skills: b.skills,
          yearsOfExperience: b.yearsOfExperience, careerLevel: b.careerLevel, additionalNotes: b.additionalNotes,
          language: b.language || 'finnish', style: b.style || 'professional', enableRAG: ragOn, // ✅
          guardianValidation: true, userId, skipQuestions: false, followUpAnswers: b.followUpAnswers,
        });
        content = result.content; title = result.title; keyHighlights = result.keyHighlights || [];
        break;
      }
      case 'ats-v2': {
        const b = body as ATSCoverLetterV2Request;
        const result = await generateATSCoverLetterV2({
          jobDescription: b.jobDescription, name: b.name || 'Applicant', email: b.email, phone: b.phone, location: b.location,
          workExperience: b.workExperience, education: b.education, skills: b.skills,
          yearsOfExperience: b.yearsOfExperience, careerLevel: b.careerLevel, additionalNotes: b.additionalNotes,
          language: b.language || 'finnish', style: b.style || 'professional', enableRAG: ragOn, // ✅
          guardianValidation: b.guardianValidation ?? true, userId, skipQuestions: false, followUpAnswers: b.followUpAnswers,
        });
        content = result.content; title = result.title; keyHighlights = result.keyHighlights || [];
        atsScore = result.atsScore; atsAnalysis = result.atsAnalysis;
        break;
      }
      default: {
        const _exhaustive: never = body;
        throw new Error(`Unknown type: ${(body as BaseCoverLetterRequest).type}`);
      }
    }

    content = normalizeBody(content);
    const templateStyle = body.templateStyle || 'modern-top';

    // ── AI-TAUSTA: premium-only + persoona profiilista; muille gradientti ──
    let background: { mode: string; imageUrl?: string; opacity?: number } = { mode: 'color' };
    if (BG_TEMPLATES.includes(templateStyle)) {
      if (canAiBg) {
        try {
          const imageUrl = await generateEnhancedBackgroundImage({
            userId, cvId: `cl_${Date.now()}`,
            // ✅ persoona kuvaprompttiin (cover letter -bodyssä nämä kentät)
            hobbies: (body as any).hobbies,
            uniqueStrength: (body as any).uniqueStrength,
            energySources: (body as any).energySources,
            superpower: (body as any).superpower,
          } as any, undefined);
          if (imageUrl) background = { mode: 'generated', imageUrl, opacity: 0.9 };
        } catch (e) {
          console.error('⚠️ [BG] Background generation failed (jatketaan ilman):', e);
        }
      } else {
        // ✅ ei-premium: hillitty gradientti (Aurora-skin piirtää mode='gradient')
        background = { mode: 'gradient' };
      }
    }

    // ── SAVE ───────────────────────────────────────────────────────
    const coverLetterData = {
      user_id: userId, title, language: body.language || 'finnish',
      content: {
        body: content, signature: body.name || '',
        contactInfo: { name: body.name || '', email: body.email || '', phone: body.phone || '', location: body.location || '' },
        templateStyle, background,
      },
      ai_data: {
        style: body.style || 'professional', key_highlights: keyHighlights, type: body.type, templateStyle,
        original_inputs: {
          jobDescription: body.type !== 'general' ? (body as any).jobDescription : (body as any).jobPosting,
          profileData: {
            name: body.name, workExperience: (body as any).workExperience, education: (body as any).education,
            skills: (body as any).skills, workingStyle: (body as any).workingStyle, problemSolving: (body as any).problemSolving,
            uniqueStrength: (body as any).uniqueStrength, superpower: (body as any).superpower,
            energySources: (body as any).energySources, learningStyle: (body as any).learningStyle,
            teamRole: (body as any).teamRole, careerGoals: (body as any).careerGoals, bestProjectExample: (body as any).bestProjectExample,
          },
          language: body.language || 'finnish', style: body.style || 'professional', type: body.type,
          additionalNotes: body.additionalNotes || '',
        },
        iterations: [],
        ...(body.type !== 'general' && {
          job_title: (body as ATSCoverLetterV1Request).jobTitle, company_name: (body as ATSCoverLetterV1Request).companyName,
        }),
        ...(body.type === 'ats-v2' && atsScore && { ats_score: atsScore, ats_analysis: atsAnalysis }),
      },
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };

    const { data: savedLetter, error: saveError } = await supabaseAdmin
      .from('cover_letters').insert(coverLetterData).select().single();
    if (saveError) { console.error('❌ [DB] Save failed:', saveError); throw saveError; }

    // ── KIRJAA AI-LUONTI ───────────────────────────────────────────
    await logUsage(userId, 'cover_letter');

    // ── LISÄTIEDOT ─────────────────────────────────────────────────
    if (body.saveAdditionalNotes && body.additionalNotes && body.additionalNotes.trim()) {
      try {
        await supabaseAdmin.from('user_responses').insert({
          user_id: userId, question_text: 'Lisätiedot hakukirjeeseen', answer: body.additionalNotes.trim(),
          category: 'cover_letter', context: 'additional_notes',
          job_title: body.type !== 'general' ? (body as any).companyName : 'General', created_at: new Date().toISOString(),
        });
      } catch (error) { console.error('⚠️ [DB] Additional notes error:', error); }
    }

    return NextResponse.json({
      success: true, coverLetterId: savedLetter.id, title: savedLetter.title, templateStyle,
      hasBackground: background.mode !== 'color',
      aiRemaining: Math.max(0, limit.remaining - 1),
      message: `${body.type} cover letter generated successfully`,
      ...(atsScore && { atsScore, atsAnalysis }),
    });
  } catch (error) {
    console.error('❌ [API] Generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate cover letter', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
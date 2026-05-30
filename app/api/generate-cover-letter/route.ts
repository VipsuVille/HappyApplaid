// app/api/generate-cover-letter/route.ts
// ✅ ADDITIONAL NOTES + TEMPLATE STYLE + AI-TAUSTA (vain bannerillisille pohjille, vain luonnissa)

export const maxDuration = 60; // ✅ riittävä aika tekstille + taustalle

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateGeneralCoverLetterSafely } from '@/lib/langchain/generalCoverLetterGenerator';
import { generateATSCoverLetterV1 } from '@/lib/langchain/coverLetterGenerator';
import { generateATSCoverLetterV2 } from '@/lib/langchain/coverLetterGeneratorV2';
import { analyzeExperienceGap } from '@/lib/ats/experienceGapAnalyzer';
import { normalizeBody } from '@/lib/cover-letter/normalize';
import { generateEnhancedBackgroundImage } from '@/lib/langchain/cvGenerator'; // ✅ sama kuin CV

// ✅ Pohjat jotka käyttävät AI-taustaa → vain näille generoidaan kuva luonnissa
const BG_TEMPLATES = ['aurora, sidebar'];

type CoverLetterType = 'general' | 'ats-v1' | 'ats-v2';

interface BaseCoverLetterRequest {
  type: CoverLetterType;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  language?: string;
  style?: 'professional' | 'casual' | 'creative';
  enableRAG?: boolean;
  templateStyle?: string;
  additionalNotes?: string;
  saveAdditionalNotes?: boolean;
  skipExperienceCheck?: boolean;
  followUpAnswers?: Record<string, string>;
}

interface GeneralCoverLetterRequest extends BaseCoverLetterRequest {
  type: 'general';
  jobTitle?: string;
  companyName?: string;
  jobPosting?: string;
  companyMotivation?: string;
  companyAboutText?: string;
  workExperience?: string;
  education?: string;
  skills?: string;
  yearsOfExperience?: number;
  careerLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'expert';
  workingStyle?: string;
  problemSolving?: string;
  uniqueStrength?: string;
  superpower?: string;
  energySources?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  careerGoals?: string;
  bestProjectExample?: string;
  failureLesson?: string;
}

interface ATSCoverLetterV1Request extends BaseCoverLetterRequest {
  type: 'ats-v1';
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  workExperience: string;
  education: string;
  skills: string;
  yearsOfExperience?: number;
  careerLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'expert';
  companyResearch?: string;
  keywords?: string[];
}

interface ATSCoverLetterV2Request extends BaseCoverLetterRequest {
  type: 'ats-v2';
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  workExperience: string;
  education: string;
  skills: string;
  yearsOfExperience?: number;
  careerLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'expert';
  keywords?: string[];
  companyResearch?: string;
  atsScore?: boolean;
  guardianValidation?: boolean;
}

type CoverLetterRequest = GeneralCoverLetterRequest | ATSCoverLetterV1Request | ATSCoverLetterV2Request;

export async function POST(request: NextRequest) {
  console.log('📝 [API] Generate Cover Letter - START');

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CoverLetterRequest = await request.json();

    console.log('📋 [REQUEST] Type:', body.type);
    console.log('🎨 [REQUEST] Template style:', body.templateStyle || '(default)');
    console.log('💬 [REQUEST] Additional notes:', body.additionalNotes ? 'YES' : 'NO');

    if (!body.type || !['general', 'ats-v1', 'ats-v2'].includes(body.type)) {
      return NextResponse.json({ error: 'Invalid type. Must be: general, ats-v1, or ats-v2' }, { status: 400 });
    }

    if (body.type === 'ats-v1' || body.type === 'ats-v2') {
      const atsBody = body as ATSCoverLetterV1Request | ATSCoverLetterV2Request;
      if (!atsBody.jobTitle || !atsBody.companyName || !atsBody.jobDescription) {
        return NextResponse.json(
          { error: 'ATS cover letters require: jobTitle, companyName, jobDescription' },
          { status: 400 }
        );
      }
    }

    // ── EXPERIENCE GAP ANALYSIS ──
    if ((body.type === 'ats-v1' || body.type === 'ats-v2') && !body.skipExperienceCheck) {
      const atsBody = body as ATSCoverLetterV1Request | ATSCoverLetterV2Request;
      try {
        let extractedKeywords = atsBody.keywords || [];
        if (extractedKeywords.length === 0) {
          const keywordResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/extract-keywords-ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobDescription: atsBody.jobDescription })
          });
          if (keywordResponse.ok) {
            const keywordData = await keywordResponse.json();
            extractedKeywords = [...(keywordData.critical || []), ...(keywordData.important || [])];
          }
        }
        const experienceGap = await analyzeExperienceGap({
          jobDescription: atsBody.jobDescription,
          userProfile: {
            name: body.name || 'User',
            workExperience: atsBody.workExperience,
            education: atsBody.education,
            skills: atsBody.skills,
            yearsOfExperience: atsBody.yearsOfExperience,
            careerLevel: atsBody.careerLevel
          },
          extractedKeywords: extractedKeywords.length > 0 ? {
            critical: extractedKeywords.slice(0, 5),
            important: extractedKeywords.slice(5, 10),
            bonus: extractedKeywords.slice(10)
          } : undefined,
          followUpAnswers: body.followUpAnswers,
          language: body.language || 'finnish'
        });
        if (experienceGap.hasGap && experienceGap.severity !== 'none') {
          return NextResponse.json({ needsWarning: true, experienceGap, message: 'Experience gap detected' });
        }
      } catch (error) {
        console.error('⚠️ [ExperienceGap] Analysis failed:', error);
      }
    }

    // ── GENERATE COVER LETTER ──
    console.log(`🤖 [AI] Starting ${body.type} generation...`);

    let content: string;
    let title: string;
    let keyHighlights: string[] = [];
    let atsScore: number | undefined;
    let atsAnalysis: any;

    switch (body.type) {
      case 'general': {
        const generalBody = body as GeneralCoverLetterRequest;
        const result = await generateGeneralCoverLetterSafely({
          name: generalBody.name,
          email: generalBody.email,
          phone: generalBody.phone,
          location: generalBody.location,
          jobTitle: generalBody.jobTitle,
          companyName: generalBody.companyName,
          jobPosting: generalBody.jobPosting,
          companyMotivation: generalBody.companyMotivation,
          companyAboutText: generalBody.companyAboutText,
          workExperience: generalBody.workExperience,
          education: generalBody.education,
          skills: generalBody.skills,
          workingStyle: generalBody.workingStyle,
          problemSolving: generalBody.problemSolving,
          uniqueStrength: generalBody.uniqueStrength,
          superpower: generalBody.superpower,
          energySources: generalBody.energySources,
          learningStyle: generalBody.learningStyle,
          teamRole: generalBody.teamRole,
          valuesExample: generalBody.valuesExample,
          careerGoals: generalBody.careerGoals,
          bestProjectExample: generalBody.bestProjectExample,
          failureLesson: generalBody.failureLesson,
          additionalNotes: generalBody.additionalNotes,
          language: generalBody.language || 'finnish',
          style: generalBody.style || 'professional',
          enableRAG: generalBody.enableRAG ?? false, // ✅ pois päältä — nopeampi, ei timeoutia
        });
        content = result.content;
        title = result.title;
        keyHighlights = result.keyHighlights || [];
        break;
      }

      case 'ats-v1': {
        const atsV1Body = body as ATSCoverLetterV1Request;
        const result = await generateATSCoverLetterV1({
          jobDescription: atsV1Body.jobDescription,
          name: atsV1Body.name || 'Applicant',
          email: atsV1Body.email,
          phone: atsV1Body.phone,
          location: atsV1Body.location,
          workExperience: atsV1Body.workExperience,
          education: atsV1Body.education,
          skills: atsV1Body.skills,
          yearsOfExperience: atsV1Body.yearsOfExperience,
          careerLevel: atsV1Body.careerLevel,
          additionalNotes: atsV1Body.additionalNotes,
          language: atsV1Body.language || 'finnish',
          style: atsV1Body.style || 'professional',
          enableRAG: atsV1Body.enableRAG ?? false,
          guardianValidation: true,
          userId: userId,
          skipQuestions: false,
          followUpAnswers: atsV1Body.followUpAnswers
        });
        content = result.content;
        title = result.title;
        keyHighlights = result.keyHighlights || [];
        break;
      }

      case 'ats-v2': {
        const atsV2Body = body as ATSCoverLetterV2Request;
        const result = await generateATSCoverLetterV2({
          jobDescription: atsV2Body.jobDescription,
          name: atsV2Body.name || 'Applicant',
          email: atsV2Body.email,
          phone: atsV2Body.phone,
          location: atsV2Body.location,
          workExperience: atsV2Body.workExperience,
          education: atsV2Body.education,
          skills: atsV2Body.skills,
          yearsOfExperience: atsV2Body.yearsOfExperience,
          careerLevel: atsV2Body.careerLevel,
          additionalNotes: atsV2Body.additionalNotes,
          language: atsV2Body.language || 'finnish',
          style: atsV2Body.style || 'professional',
          enableRAG: atsV2Body.enableRAG ?? false,
          guardianValidation: atsV2Body.guardianValidation ?? true,
          userId: userId,
          skipQuestions: false,
          followUpAnswers: atsV2Body.followUpAnswers
        });
        content = result.content;
        title = result.title;
        keyHighlights = result.keyHighlights || [];
        atsScore = result.atsScore;
        atsAnalysis = result.atsAnalysis;
        break;
      }

      default: {
        const exhaustiveCheck: never = body;
        throw new Error(`Unknown type: ${(body as BaseCoverLetterRequest).type}`);
      }
    }

    console.log('✅ [AI] Generation complete');
    content = normalizeBody(content);

    const templateStyle = body.templateStyle || 'modern-top';

    // ── ✅ AI-TAUSTA: vain bannerillisille pohjille, vain tässä (luonnissa) ──
    let background: { mode: string; imageUrl?: string; opacity?: number } = { mode: 'color' };
    if (BG_TEMPLATES.includes(templateStyle)) {
      try {
        console.log('🎨 [BG] Generating AI background for', templateStyle);
        const imageUrl = await generateEnhancedBackgroundImage(
          { userId, cvId: `cl_${Date.now()}` } as any,
          undefined
        );
        if (imageUrl) {
          background = { mode: 'generated', imageUrl, opacity: 0.9 };
          console.log('✅ [BG] Background ready');
        }
      } catch (e) {
        console.error('⚠️ [BG] Background generation failed (jatketaan ilman):', e);
        // Ei kaadeta hakukirjettä — Aurora näyttää gradientin jos kuvaa ei ole
      }
    }

    // ── SAVE TO DATABASE ──
    console.log('💾 [DB] Saving to Supabase...');

    const coverLetterData = {
      user_id: userId,
      title,
      language: body.language || 'finnish',
      content: {
        body: content,
        signature: body.name || '',
        contactInfo: {
          name: body.name || '',
          email: body.email || '',
          phone: body.phone || '',
          location: body.location || '',
        },
        templateStyle,
        background, // ✅ tallennetaan tausta (color tai generated)
      },
      ai_data: {
        style: body.style || 'professional',
        key_highlights: keyHighlights,
        type: body.type,
        templateStyle,
        original_inputs: {
          jobDescription: body.type !== 'general' ? (body as any).jobDescription : (body as any).jobPosting,
          profileData: {
            name: body.name,
            workExperience: (body as any).workExperience,
            education: (body as any).education,
            skills: (body as any).skills,
            workingStyle: (body as any).workingStyle,
            problemSolving: (body as any).problemSolving,
            uniqueStrength: (body as any).uniqueStrength,
            superpower: (body as any).superpower,
            energySources: (body as any).energySources,
            learningStyle: (body as any).learningStyle,
            teamRole: (body as any).teamRole,
            careerGoals: (body as any).careerGoals,
            bestProjectExample: (body as any).bestProjectExample,
          },
          language: body.language || 'finnish',
          style: body.style || 'professional',
          type: body.type,
          additionalNotes: body.additionalNotes || '',
        },
        iterations: [],
        ...(body.type !== 'general' && {
          job_title: (body as ATSCoverLetterV1Request).jobTitle,
          company_name: (body as ATSCoverLetterV1Request).companyName,
        }),
        ...(body.type === 'ats-v2' && atsScore && {
          ats_score: atsScore,
          ats_analysis: atsAnalysis,
        }),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: savedLetter, error: saveError } = await supabaseAdmin
      .from('cover_letters')
      .insert(coverLetterData)
      .select()
      .single();

    if (saveError) {
      console.error('❌ [DB] Save failed:', saveError);
      throw saveError;
    }

    console.log('✅ [DB] Saved:', savedLetter.id);

    // ── SAVE ADDITIONAL NOTES ──
    if (body.saveAdditionalNotes && body.additionalNotes && body.additionalNotes.trim()) {
      try {
        await supabaseAdmin.from('user_responses').insert({
          user_id: userId,
          question_text: 'Lisätiedot hakukirjeeseen',
          answer: body.additionalNotes.trim(),
          category: 'cover_letter',
          context: 'additional_notes',
          job_title: body.type !== 'general' ? (body as any).companyName : 'General',
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('⚠️ [DB] Additional notes error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      coverLetterId: savedLetter.id,
      title: savedLetter.title,
      templateStyle,
      hasBackground: background.mode !== 'color',
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
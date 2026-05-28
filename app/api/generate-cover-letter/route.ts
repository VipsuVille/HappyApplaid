// app/api/generate-cover-letter/route.ts - ✅ WITH ADDITIONAL NOTES + TEMPLATE STYLE

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateGeneralCoverLetterSafely } from '@/lib/langchain/generalCoverLetterGenerator';
import { generateATSCoverLetterV1 } from '@/lib/langchain/coverLetterGenerator';
import { generateATSCoverLetterV2 } from '@/lib/langchain/coverLetterGeneratorV2';
import { analyzeExperienceGap } from '@/lib/ats/experienceGapAnalyzer';
import { normalizeBody } from '@/lib/cover-letter/normalize'; // ✅ kohta 4

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

type CoverLetterType = 'general' | 'ats-v1' | 'ats-v2';

interface BaseCoverLetterRequest {
  type: CoverLetterType;

  // Basic info
  name?: string;
  email?: string;
  phone?: string;
  location?: string;

  // Settings
  language?: string;
  style?: 'professional' | 'casual' | 'creative';
  enableRAG?: boolean;

  // ✅ VISUAALINEN POHJA (create-cover-letter valitsee, editori lukee)
  templateStyle?: string;

  // ✅ LISÄTIEDOT
  additionalNotes?: string;
  saveAdditionalNotes?: boolean;

  // Experience Gap kontrollit
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

// ════════════════════════════════════════════════════════════════
// API ROUTE HANDLER
// ════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  console.log('📝 [API] Generate Cover Letter - START');

  try {
    // STEP 1: Auth
    const { userId } = await auth();

    if (!userId) {
      console.log('❌ [AUTH] Unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // STEP 2: Parse request
    const body: CoverLetterRequest = await request.json();

    console.log('📋 [REQUEST] Type:', body.type);
    console.log('🎨 [REQUEST] Template style:', body.templateStyle || '(default)'); // ✅
    console.log('💬 [REQUEST] Additional notes:', body.additionalNotes ? 'YES' : 'NO');
    console.log('💾 [REQUEST] Save notes:', body.saveAdditionalNotes);

    // STEP 3: Validate
    if (!body.type || !['general', 'ats-v1', 'ats-v2'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: general, ats-v1, or ats-v2' },
        { status: 400 }
      );
    }

    // Validate ATS requests
    if (body.type === 'ats-v1' || body.type === 'ats-v2') {
      const atsBody = body as ATSCoverLetterV1Request | ATSCoverLetterV2Request;
      if (!atsBody.jobTitle || !atsBody.companyName || !atsBody.jobDescription) {
        return NextResponse.json(
          { error: 'ATS cover letters require: jobTitle, companyName, jobDescription' },
          { status: 400 }
        );
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3.5: EXPERIENCE GAP ANALYSIS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    if ((body.type === 'ats-v1' || body.type === 'ats-v2') && !body.skipExperienceCheck) {
      console.log('🔍 [ExperienceGap] Analyzing...');

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
            extractedKeywords = [
              ...(keywordData.critical || []),
              ...(keywordData.important || [])
            ];
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
          console.log('⚠️ [ExperienceGap] Returning warning');

          return NextResponse.json({
            needsWarning: true,
            experienceGap,
            message: 'Experience gap detected'
          });
        }

        console.log('✅ [ExperienceGap] No critical gaps');

      } catch (error) {
        console.error('⚠️ [ExperienceGap] Analysis failed:', error);
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: GENERATE COVER LETTER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
          additionalNotes: generalBody.additionalNotes, // ✅
          language: generalBody.language || 'finnish',
          style: generalBody.style || 'professional',
          enableRAG: generalBody.enableRAG ?? true,
        });

        content = result.content;
        title = result.title;
        keyHighlights = result.keyHighlights || [];

        console.log('✅ [AI] General cover letter generated');
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
          additionalNotes: atsV1Body.additionalNotes, // ✅
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

        console.log('✅ [AI] ATS-V1 cover letter generated');
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
          additionalNotes: atsV2Body.additionalNotes, // ✅
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

        console.log('✅ [AI] ATS-V2 cover letter generated');
        break;
      }

      default: {
        const exhaustiveCheck: never = body;
        throw new Error(`Unknown type: ${(body as BaseCoverLetterRequest).type}`);
      }
    }

    console.log('✅ [AI] Generation complete');

    // ✅ KOHTA 4: siisti kappalejako ennen tallennusta
    content = normalizeBody(content);

    // ✅ Visuaalinen pohja (turvallinen oletus)
    const templateStyle = body.templateStyle || 'modern-top';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 5: SAVE TO DATABASE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
        // ✅ POHJA TALLENNETAAN TÄHÄN — editori lukee juuri content.templateStyle
        templateStyle,
      },
      ai_data: {
        style: body.style || 'professional',
        key_highlights: keyHighlights,
        type: body.type,

        // ✅ myös ai_dataan varmuudeksi (helpottaa myöhempää lukua / debugia)
        templateStyle,

        // ✅ TALLENNA ORIGINAL INPUTS (iteraatiota varten!)
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
          additionalNotes: body.additionalNotes || '', // ✅ TALLENNA
        },

        // ✅ ALUSTA ITERATIONS
        iterations: [],

        // Job context
        ...(body.type !== 'general' && {
          job_title: (body as ATSCoverLetterV1Request).jobTitle,
          company_name: (body as ATSCoverLetterV1Request).companyName,
        }),

        // ATS-specific data
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 6: SAVE ADDITIONAL NOTES (if requested)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    if (body.saveAdditionalNotes && body.additionalNotes && body.additionalNotes.trim()) {
      console.log('💾 [DB] Saving additional notes to user-responses...');

      try {
        const { error: notesError } = await supabaseAdmin
          .from('user_responses')
          .insert({
            user_id: userId,
            question_text: 'Lisätiedot hakukirjeeseen',
            answer: body.additionalNotes.trim(),
            category: 'cover_letter',
            context: 'additional_notes',
            job_title: body.type !== 'general' ? (body as any).companyName : 'General',
            created_at: new Date().toISOString(),
          });

        if (notesError) {
          console.error('⚠️ [DB] Additional notes save failed:', notesError);
        } else {
          console.log('✅ [DB] Additional notes saved');
        }
      } catch (error) {
        console.error('⚠️ [DB] Additional notes error:', error);
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 7: RETURN SUCCESS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    return NextResponse.json({
      success: true,
      coverLetterId: savedLetter.id,
      title: savedLetter.title,
      templateStyle, // ✅ palautetaan myös vastauksessa
      message: `${body.type} cover letter generated successfully`,

      // Include ATS analysis if available
      ...(atsScore && {
        atsScore,
        atsAnalysis,
      }),
    });

  } catch (error) {
    console.error('❌ [API] Generation failed:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate cover letter',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
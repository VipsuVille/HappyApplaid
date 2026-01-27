// app/api/generate-cover-letter/route.ts - UNIFIED API (FINAL)
// Tukee: General, ATS-V1, ATS-V2 + Experience Gap Analysis

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateGeneralCoverLetterSafely } from '@/lib/langchain/generalCoverLetterGenerator';
import { generateATSCoverLetterV1 } from '@/lib/langchain/coverLetterGenerator'; // ✅ LISÄTTY
import { generateATSCoverLetterV2 } from '@/lib/langchain/coverLetterGeneratorV2'; // ✅ LISÄTTY
import { analyzeExperienceGap } from '@/lib/ats/experienceGapAnalyzer';

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

type CoverLetterType = 'general' | 'ats-v1' | 'ats-v2';

interface BaseCoverLetterRequest {
  type: CoverLetterType;
  
  // Basic info (NOT in generated text)
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  
  // Settings
  language?: string;
  style?: 'professional' | 'casual' | 'creative';
  enableRAG?: boolean;
  
  // Experience Gap kontrollit
  skipExperienceCheck?: boolean;
  followUpAnswers?: Record<string, string>;
}

interface GeneralCoverLetterRequest extends BaseCoverLetterRequest {
  type: 'general';
  
  // Job context (optional for general)
  jobTitle?: string;
  companyName?: string;
  jobPosting?: string;
  
  // Profile data
  workExperience?: string;
  education?: string;
  skills?: string;
  yearsOfExperience?: number;
  careerLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'expert';
  
  // Personality
  workingStyle?: string;
  problemSolving?: string;
  uniqueStrength?: string;
  superpower?: string;
  energySources?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  
  // Stories
  careerGoals?: string;
  bestProjectExample?: string;
  failureLesson?: string;
}

interface ATSCoverLetterV1Request extends BaseCoverLetterRequest {
  type: 'ats-v1';
  
  // Required for ATS
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  
  // Profile data
  workExperience: string;
  education: string;
  skills: string;
  yearsOfExperience?: number;
  careerLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'expert';
  
  // Optional
  companyResearch?: string;
  keywords?: string[];
}

interface ATSCoverLetterV2Request extends BaseCoverLetterRequest {
  type: 'ats-v2';
  
  // Required for ATS V2
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  
  // Profile data
  workExperience: string;
  education: string;
  skills: string;
  yearsOfExperience?: number;
  careerLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'expert';
  
  // ATS Optimization
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

    // STEP 3: Validate request based on type
    if (!body.type || !['general', 'ats-v1', 'ats-v2'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: general, ats-v1, or ats-v2' },
        { status: 400 }
      );
    }

    // Validate ATS requests have required fields
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
    // STEP 3.5: EXPERIENCE GAP ANALYSIS (jos ATS)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    if ((body.type === 'ats-v1' || body.type === 'ats-v2') && !body.skipExperienceCheck) {
      console.log('🔍 [ExperienceGap] Analyzing user experience...');
      
      const atsBody = body as ATSCoverLetterV1Request | ATSCoverLetterV2Request;
      
      try {
        // Ekstraktoi avainsanat jos ei vielä tehty
        let extractedKeywords = atsBody.keywords || [];
        
        if (extractedKeywords.length === 0) {
          console.log('🔍 [Keywords] Extracting from job description...');
          
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
            console.log(`✅ [Keywords] Extracted ${extractedKeywords.length} keywords`);
          }
        }

        // Analysoi kokemusaukkoja
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

        console.log(`📊 [ExperienceGap] Analysis:`, {
          hasGap: experienceGap.hasGap,
          severity: experienceGap.severity,
          passLikelihood: experienceGap.passLikelihood
        });

        // Jos aukkoja, palauta varoitus
        if (experienceGap.hasGap && experienceGap.severity !== 'none') {
          console.log('⚠️ [ExperienceGap] Returning warning');
          
          return NextResponse.json({
            needsWarning: true,
            experienceGap,
            message: 'Experience gap detected - user confirmation needed'
          });
        }

        console.log('✅ [ExperienceGap] No critical gaps');

      } catch (error) {
        console.error('⚠️ [ExperienceGap] Analysis failed:', error);
        // Jatka generointiin
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: Generate cover letter
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
          language: atsV1Body.language || 'finnish',
          style: atsV1Body.style || 'professional',
          enableRAG: atsV1Body.enableRAG ?? false,
          guardianValidation: true,
          userId: userId,
          skipQuestions: true,
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
          language: atsV2Body.language || 'finnish',
          style: atsV2Body.style || 'professional',
          enableRAG: atsV2Body.enableRAG ?? false,
          guardianValidation: atsV2Body.guardianValidation ?? true,
          userId: userId,
          skipQuestions: true,
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

    // STEP 5: Save to database
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
      },
      ai_data: {
        style: body.style || 'professional',
        key_highlights: keyHighlights,
        type: body.type,
        
        // Job context (if applicable)
        ...(body.type !== 'general' && {
          job_title: (body as ATSCoverLetterV1Request).jobTitle,
          company_name: (body as ATSCoverLetterV1Request).companyName,
        }),
        
        // ATS-specific data (if applicable)
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

    // STEP 6: Return success
    return NextResponse.json({
      success: true,
      coverLetterId: savedLetter.id,
      title: savedLetter.title,
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
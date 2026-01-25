// app/api/generate-cover-letter/route.ts - UNIFIED API ROUTE
// Tukee: General, ATS-V1, ATS-V2

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateGeneralCoverLetterSafely } from '@/lib/langchain/generalCoverLetterGenerator';
// TODO: Lisää kun valmiina:
// import { generateATSCoverLetterV1 } from '@/lib/langchain/atsCoverLetterV1Generator';
// import { generateATSCoverLetterV2 } from '@/lib/langchain/atsCoverLetterV2Generator';

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
}

interface GeneralCoverLetterRequest extends BaseCoverLetterRequest {
  type: 'general';
  
  // Job context (optional for general)
  jobTitle?: string;
  companyName?: string;
  jobPosting?: string;
  
  // Profile data (for AI context)
  workExperience?: string;
  education?: string;
  skills?: string;
  
  // Personality (CRITICAL for character-driven letter)
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
  
  // ATS Optimization
  keywords: string[];
  companyResearch?: string;
  atsScore?: boolean; // Return ATS compatibility score
  guardianValidation?: boolean; // Use Guardian AI for validation
}

type CoverLetterRequest = GeneralCoverLetterRequest | ATSCoverLetterV1Request | ATSCoverLetterV2Request;

// ════════════════════════════════════════════════════════════════
// GENERATOR RESULT TYPE
// ════════════════════════════════════════════════════════════════

interface GeneratorResult {
  content: string;
  title: string;
  keyHighlights: string[];
  atsScore?: number; // Only for ATS-V2
  atsAnalysis?: {
    keywordMatch: number;
    readability: number;
    formatting: number;
    overall: number;
  };
}

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
    console.log('📋 [REQUEST] Settings:', {
      language: body.language,
      style: body.style,
      enableRAG: body.enableRAG,
    });

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

    // STEP 4: Generate cover letter based on type
    console.log(`🤖 [AI] Starting ${body.type} generation...`);
    
    let result: GeneratorResult;
    
    switch (body.type) {
      case 'general': {
        const generalBody = body as GeneralCoverLetterRequest;
        result = await generateGeneralCoverLetterSafely({
          // Basic (NOT in text)
          name: generalBody.name,
          email: generalBody.email,
          phone: generalBody.phone,
          location: generalBody.location,
          
          // Job context
          jobTitle: generalBody.jobTitle,
          companyName: generalBody.companyName,
          jobPosting: generalBody.jobPosting,
          
          // Profile
          workExperience: generalBody.workExperience,
          education: generalBody.education,
          skills: generalBody.skills,
          
          // Personality (THE GOLD!)
          workingStyle: generalBody.workingStyle,
          problemSolving: generalBody.problemSolving,
          uniqueStrength: generalBody.uniqueStrength,
          superpower: generalBody.superpower,
          energySources: generalBody.energySources,
          learningStyle: generalBody.learningStyle,
          teamRole: generalBody.teamRole,
          valuesExample: generalBody.valuesExample,
          
          // Stories
          careerGoals: generalBody.careerGoals,
          bestProjectExample: generalBody.bestProjectExample,
          failureLesson: generalBody.failureLesson,
          
          // Settings
          language: generalBody.language || 'finnish',
          style: generalBody.style || 'professional',
          enableRAG: generalBody.enableRAG ?? true,
        });
        console.log('✅ [AI] General cover letter generated');
        break;
      }

      case 'ats-v1': {
        // TODO: Implement when atsCoverLetterV1Generator is ready
        const atsV1Body = body as ATSCoverLetterV1Request;
        
        // PLACEHOLDER - Replace with actual generator
        console.log('⚠️ [AI] ATS-V1 generator not yet implemented - using fallback');
        result = {
          content: `[ATS-V1 PLACEHOLDER]\n\nDear Hiring Manager at ${atsV1Body.companyName},\n\nI am writing to apply for the ${atsV1Body.jobTitle} position...\n\n[This will be replaced with actual ATS-V1 generator]`,
          title: `Application for ${atsV1Body.jobTitle} at ${atsV1Body.companyName}`,
          keyHighlights: [
            'Placeholder highlight 1',
            'Placeholder highlight 2',
            'Placeholder highlight 3'
          ]
        };
        
        // When ready:
        // result = await generateATSCoverLetterV1({
        //   jobTitle: atsV1Body.jobTitle,
        //   companyName: atsV1Body.companyName,
        //   jobDescription: atsV1Body.jobDescription,
        //   workExperience: atsV1Body.workExperience,
        //   education: atsV1Body.education,
        //   skills: atsV1Body.skills,
        //   companyResearch: atsV1Body.companyResearch,
        //   keywords: atsV1Body.keywords,
        //   language: atsV1Body.language || 'finnish',
        //   style: atsV1Body.style || 'professional',
        //   enableRAG: atsV1Body.enableRAG ?? true,
        // });
        break;
      }

      case 'ats-v2': {
        // TODO: Implement when atsCoverLetterV2Generator is ready
        const atsV2Body = body as ATSCoverLetterV2Request;
        
        // PLACEHOLDER - Replace with actual generator
        console.log('⚠️ [AI] ATS-V2 generator not yet implemented - using fallback');
        result = {
          content: `[ATS-V2 PLACEHOLDER]\n\nDear Hiring Manager at ${atsV2Body.companyName},\n\nI am excited to apply for the ${atsV2Body.jobTitle} position...\n\n[This will be replaced with actual ATS-V2 generator with Guardian validation]`,
          title: `Application for ${atsV2Body.jobTitle} at ${atsV2Body.companyName}`,
          keyHighlights: [
            'Placeholder highlight 1',
            'Placeholder highlight 2',
            'Placeholder highlight 3'
          ],
          atsScore: 85, // Placeholder
          atsAnalysis: {
            keywordMatch: 90,
            readability: 85,
            formatting: 80,
            overall: 85
          }
        };
        
        // When ready:
        // result = await generateATSCoverLetterV2({
        //   jobTitle: atsV2Body.jobTitle,
        //   companyName: atsV2Body.companyName,
        //   jobDescription: atsV2Body.jobDescription,
        //   workExperience: atsV2Body.workExperience,
        //   education: atsV2Body.education,
        //   skills: atsV2Body.skills,
        //   keywords: atsV2Body.keywords,
        //   companyResearch: atsV2Body.companyResearch,
        //   language: atsV2Body.language || 'finnish',
        //   style: atsV2Body.style || 'professional',
        //   enableRAG: atsV2Body.enableRAG ?? true,
        //   atsScore: atsV2Body.atsScore ?? true,
        //   guardianValidation: atsV2Body.guardianValidation ?? true,
        // });
        break;
      }

      default:
        throw new Error(`Unknown type: ${body}`);
    }

    console.log('✅ [AI] Generation complete');

    // STEP 5: Save to database
    console.log('💾 [DB] Saving to Supabase...');
    
    const coverLetterData = {
      user_id: userId,
      title: result.title,
      language: body.language || 'finnish',
      content: {
        body: result.content,
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
        key_highlights: result.keyHighlights,
        type: body.type,
        
        // Job context (if applicable)
        ...(body.type !== 'general' && {
          job_title: (body as ATSCoverLetterV1Request).jobTitle,
          company_name: (body as ATSCoverLetterV1Request).companyName,
        }),
        
        // ATS-specific data (if applicable)
        ...(body.type === 'ats-v2' && result.atsScore && {
          ats_score: result.atsScore,
          ats_analysis: result.atsAnalysis,
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
      coverLetter: savedLetter,
      message: `${body.type} cover letter generated successfully`,
      
      // Include ATS analysis in response if available
      ...(result.atsScore && {
        atsScore: result.atsScore,
        atsAnalysis: result.atsAnalysis,
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

// ════════════════════════════════════════════════════════════════
// METADATA
// ════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ════════════════════════════════════════════════════════════════
// API DOCUMENTATION (for reference)
// ════════════════════════════════════════════════════════════════

/*
POST /api/generate-cover-letter

EXAMPLES:

1. GENERAL COVER LETTER:
{
  "type": "general",
  "name": "Matti Meikäläinen",
  "email": "matti@example.com",
  "language": "finnish",
  "style": "professional",
  "workingStyle": "Rakastan oppimista tekemällä",
  "problemSolving": "Debuggaan systemaattisesti",
  "uniqueStrength": "Näen kokonaisuuksia",
  "superpower": "Teen monimutkaisen yksinkertaiseksi",
  "workExperience": "...",
  "education": "...",
  "skills": "..."
}

2. ATS-V1 COVER LETTER (Job-specific, basic):
{
  "type": "ats-v1",
  "name": "Matti Meikäläinen",
  "email": "matti@example.com",
  "jobTitle": "Senior Full-Stack Developer",
  "companyName": "TechCorp",
  "jobDescription": "We are looking for...",
  "workExperience": "...",
  "education": "...",
  "skills": "React, Node.js, AWS",
  "keywords": ["React", "Node.js", "AWS", "microservices"],
  "language": "finnish",
  "style": "professional"
}

3. ATS-V2 COVER LETTER (ATS-optimized, Guardian validated):
{
  "type": "ats-v2",
  "name": "Matti Meikäläinen",
  "email": "matti@example.com",
  "jobTitle": "Senior Full-Stack Developer",
  "companyName": "TechCorp",
  "jobDescription": "We are looking for...",
  "workExperience": "...",
  "education": "...",
  "skills": "React, Node.js, AWS",
  "keywords": ["React", "Node.js", "AWS", "microservices", "agile"],
  "companyResearch": "TechCorp focuses on fintech solutions...",
  "language": "finnish",
  "style": "professional",
  "atsScore": true,
  "guardianValidation": true
}

RESPONSE:
{
  "success": true,
  "coverLetter": {
    "id": "uuid",
    "title": "Application for...",
    "content": { ... },
    "ai_data": { 
      "type": "general" | "ats-v1" | "ats-v2",
      "key_highlights": [...],
      "ats_score": 85,  // Only for ats-v2
      "ats_analysis": { ... }  // Only for ats-v2
    }
  },
  "message": "Cover letter generated successfully",
  "atsScore": 85,  // Only for ats-v2
  "atsAnalysis": { ... }  // Only for ats-v2
}
*/
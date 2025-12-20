// app/api/generate-cv/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCVWithLangChain } from "@/lib/langchain/cvGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import {
  transformDBToLangChain,
  validateProfileForCVType,
  calculatePersonalityCompleteness,
  type LangChainCVInput,
} from "@/lib/profileDataTransform";
import { ACTION_COSTS, type TokenAction } from "@/lib/domain/tokens";
import { buildAIContext } from "@/lib/knowledge";

export const maxDuration = 60;

export async function POST(req: Request) {
  const startTime = Date.now();

  // 0️⃣ AUTH
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const cvType: "simple" | "technical" | "creative" = body.cvType || "simple";
  const forceGenerate = body.forceGenerate === true;
  const jobPosting: string | undefined = body.jobPosting;
  const enableRAG = body.enableRAG === true;

  // 1️⃣ MÄÄRITÄ ACTION (Frontend päättää tämän)
  const action: TokenAction = body.action || 
    (enableRAG ? 'cv_rag' : jobPosting ? 'cv_ats' : 'cv_basic');

  console.log(`📝 CV Request: ${action} (type: ${cvType})`);

  // 2️⃣ SUBSCRIPTION
  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("plan_type, tokens, status, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  // ---------------- FREE ----------------
  if (!subscription || subscription.plan_type === "free") {
    const { data: usage } = await supabaseAdmin
      .from("free_usage")
      .select("used_free_cv")
      .eq("user_id", userId)
      .maybeSingle();

    if (usage?.used_free_cv) {
      return NextResponse.json(
        { error: "FREE_CV_ALREADY_USED" },
        { status: 403 }
      );
    }

    await supabaseAdmin.from("free_usage").upsert({
      user_id: userId,
      used_free_cv: true,
    });
  }

  // ---------------- PAID ----------------
  let tier: "free" | "basic" | "semi-pro" | "pro" = "free";
  let required = 0;

  if (subscription && subscription.plan_type !== "free") {
    tier = subscription.plan_type as any;
    required = ACTION_COSTS[tier]?.[action] ?? 0;

    if (required === undefined) {
      return NextResponse.json(
        { error: "ACTION_NOT_ALLOWED", tier, action },
        { status: 403 }
      );
    }

    if (subscription.tokens < required) {
      return NextResponse.json(
        { error: "NOT_ENOUGH_TOKENS", required },
        { status: 403 }
      );
    }
  }

  // 3️⃣ FETCH PROFILE
  const { data: dbProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!dbProfile) {
    return NextResponse.json(
      { error: "PROFILE_REQUIRED", redirectTo: "/profile" },
      { status: 404 }
    );
  }

  // 4️⃣ TRANSFORM + VALIDATE
  const input: LangChainCVInput = transformDBToLangChain(dbProfile, cvType);

  if (cvType === "simple") {
    calculatePersonalityCompleteness(input);
  }

  const validation = validateProfileForCVType(input, cvType);
  if (!validation.isValid && !forceGenerate) {
    return NextResponse.json(
      {
        error: "DATA_VALIDATION_FAILED",
        missing: validation.missingCritical,
        suggestions: validation.suggestions,
      },
      { status: 422 }
    );
  }

  // 5️⃣ RAG CONTEXT (jos käytössä)
  let ragContext = '';
  if (enableRAG && tier === 'pro') {
    console.log('🔍 Fetching RAG context for CV...');
    ragContext = await buildAIContext({
      jobDescription: jobPosting || 'General CV',
      userProfile: dbProfile,
      enableRAG: true,
      contentType: 'cv' // ✅ VAIN CV-DOKUMENTIT
    });
    console.log(`✅ RAG context loaded: ${ragContext.length} chars`);
  }

  // 6️⃣ GENERATE CV
  const aiData = await generateCVWithLangChain({
    ...input,
      userId: userId, // ✅ LISÄÄ TÄMÄ
    jobPosting: (action === 'cv_ats' || action === 'cv_rag') ? jobPosting : undefined,
    ragContext: ragContext || undefined, // Lisää RAG context generointiin
  });

  // 7️⃣ SAVE CV
  const { data: saved } = await supabaseAdmin
    .from("cvs")
    .insert({
      user_id: userId,
      title: `${input.name || "My"} CV - ${cvType}`,
      content: { cv_data: input, ai_data: aiData },
      is_public: false,
      is_ats_optimized: action === 'cv_ats' || action === 'cv_rag',
      job_posting: (action === 'cv_ats' || action === 'cv_rag') ? jobPosting : null,
      metadata: {
        action: action,
        used_rag: enableRAG,
        tier: tier
      }
    })
    .select("id")
    .single();

  if (!saved) {
    throw new Error("Failed to save CV");
  }

  // 8️⃣ KULUTA TOKENIT (VASTA ONNISTUMISEN JÄLKEEN)
  if (tier !== "free" && required > 0) {
    await supabaseAdmin
      .from("subscriptions")
      .update({
        tokens: subscription!.tokens - required,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }

  return NextResponse.json({
    success: true,
    id: saved.id, // ✅ Tämä pitää olla "id" eikä "cvId"
    tokensUsed: required,
    tokensRemaining: tier !== "free" ? subscription!.tokens - required : 0,
    generationTime: Date.now() - startTime,
    features: {
      ats: action === 'cv_ats' || action === 'cv_rag',
      rag: action === 'cv_rag'
    }
  });
}
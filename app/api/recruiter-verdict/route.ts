// app/api/recruiter-verdict/route.ts
// Rekrytoijasimulaatio + ANONYYMI vertailu.
// ✅ LISÄTTY: feature-portti (vain maksulliset) + kuluhallinta (yksi katto).
import { auth } from "@clerk/nextjs/server";
import { ChatOpenAI } from "@langchain/openai";
import { quickRoleType, computeBenchmark, recordVerdictStat } from "@/lib/ats/benchmark";
import { supabaseAdmin } from "@/lib/supabase";
import { checkLimit, logUsage, limitMessage, canUseFeature, planOf } from "@/lib/limits";

const TONE_INSTRUCTIONS: Record<string, string> = {
  strict:
    "You are a demanding hiring manager with a huge stack of applications and little patience. You reject quickly. Be blunt about every weakness.",
  neutral:
    "You are an experienced, fair hiring manager. You are honest about weaknesses but also recognise genuine strengths.",
  benevolent:
    "You are a supportive hiring manager who wants to give the candidate a chance, but you are still honest \u2014 you do not invent strengths that aren't there.",
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { coverLetter, jobPosting, tone = "neutral" } = await req.json();
  if (!coverLetter?.trim() || !jobPosting?.trim()) {
    return Response.json({ error: "Anna sekä hakemus että työpaikkailmoitus." }, { status: 400 });
  }

  // ── PLAN + FEATURE-PORTTI (rekrytoijaverdikti = maksullinen ominaisuus) ──
  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("plan_type")
    .eq("user_id", userId)
    .maybeSingle();

  const plan = planOf(subscription?.plan_type);
  if (!canUseFeature(plan, "recruiter_verdict")) {
    return Response.json(
      { error: "FEATURE_LOCKED", message: "Rekrytoijan arvio on käytössä Pro- ja Premium-tilauksilla.", upgrade: true },
      { status: 403 }
    );
  }

  // ── KULUHALLINTA (yksi katto kaikille AI-toiminnoille) ──
  const limit = await checkLimit(userId, subscription?.plan_type);
  if (!limit.allowed) {
    return Response.json(
      { error: "LIMIT_REACHED", message: limitMessage(limit), reason: limit.reason, upgrade: limit.plan === "free" },
      { status: 429 }
    );
  }

  const toneLine = TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS.neutral;
  const system = `${toneLine}

You are reading ONE application against ONE job posting. Put yourself fully in the shoes of the person hiring for THIS role at THIS company. Judge whether this is the candidate they want.

Rules:
- Be honest, not flattering. If something is weak, say so plainly.
- Ground every concern and gap in a SPECIFIC requirement or signal from the job posting. Do not invent requirements.
- Answer in the SAME LANGUAGE as the application text.
- Respond with ONLY a valid JSON object, no markdown, no backticks, no preamble. Shape:
{
  "verdict": "interview" | "maybe" | "pass",
  "verdictLabel": short human phrase for the verdict, in the application's language,
  "firstImpression": "1-2 sentences: what the recruiter thinks after ~10 seconds",
  "strengths": ["concrete things that genuinely fit the posting"],
  "concerns": ["what makes the recruiter hesitate, tied to the posting"],
  "gaps": ["posting requirements the application does NOT address"],
  "questionsTheydAsk": ["questions this application would trigger in an interview"],
  "fitScore": 0-100,
  "oneLineToFix": "the single most important improvement"
}`;

  const user = `JOB POSTING:\n${jobPosting}\n\n---\n\nAPPLICATION:\n${coverLetter}`;

  try {
    const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.4 });
    const res = await model.invoke([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);

    let raw = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    raw = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);

    const result = {
      verdict: ["interview", "maybe", "pass"].includes(parsed.verdict) ? parsed.verdict : "maybe",
      verdictLabel: parsed.verdictLabel ?? "",
      firstImpression: parsed.firstImpression ?? "",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      questionsTheydAsk: Array.isArray(parsed.questionsTheydAsk) ? parsed.questionsTheydAsk : [],
      fitScore: Math.max(0, Math.min(100, Number(parsed.fitScore) || 0)),
      oneLineToFix: parsed.oneLineToFix ?? "",
    };

    // ── Anonyymi vertailu ──
    const roleType = quickRoleType(jobPosting);
    const benchmark = await computeBenchmark(roleType, result.fitScore);
    await recordVerdictStat(roleType, result.fitScore);

    // ── KIRJAA AI-TOIMINTO (vasta onnistuneen arvion jälkeen) ──
    await logUsage(userId, "recruiter_verdict");

    return Response.json({ ...result, roleType, benchmark, aiRemaining: Math.max(0, limit.remaining - 1) });
  } catch (e) {
    console.error("recruiter-verdict error:", e);
    return Response.json({ error: "Arvio epäonnistui. Yritä uudelleen." }, { status: 500 });
  }
}
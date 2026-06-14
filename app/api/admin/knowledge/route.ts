// app/api/admin/knowledge/route.ts — RAG-materiaalin hallinta (POST lisää, GET listaa, DELETE poistaa)
// SUOJATTU: vain admin (Clerk publicMetadata.role === 'admin').
import { NextRequest, NextResponse } from "next/server";
import { getAdminUserId } from "@/lib/admin";
import { ingestContent, listArticles, deleteArticle } from "@/lib/knowledge/ingestion";

// ── LISÄÄ materiaalia ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!(await getAdminUserId())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { content, source, language, contentType, priority, url, author } = await req.json();
    if (!content || typeof content !== "string" || content.trim().length < 50) {
      return NextResponse.json({ error: "content (väh. 50 merkkiä) vaaditaan" }, { status: 400 });
    }
    if (!source) return NextResponse.json({ error: "source vaaditaan" }, { status: 400 });

    const result = await ingestContent({
      content: content.trim(),
      source,
      author,
      url,
      language: language || "finnish",
      content_type: contentType || "cover_letter",
      priority: priority || "medium",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("ingest error:", e);
    return NextResponse.json({ error: e.message || "Ingest failed" }, { status: 500 });
  }
}

// ── LISTAA materiaalit ─────────────────────────────────────────
export async function GET() {
  if (!(await getAdminUserId())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const articles = await listArticles();
    return NextResponse.json({ ok: true, articles });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "List failed" }, { status: 500 });
  }
}

// ── POISTA materiaali (lähteen nimellä) ────────────────────────
export async function DELETE(req: NextRequest) {
  if (!(await getAdminUserId())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const source = new URL(req.url).searchParams.get("source");
    if (!source) return NextResponse.json({ error: "source vaaditaan" }, { status: 400 });
    const ok = await deleteArticle(source);
    return NextResponse.json({ ok });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Delete failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
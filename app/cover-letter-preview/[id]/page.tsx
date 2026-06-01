// app/cover-letter-preview/[id]/page.tsx
// ✅ KÄYTTÄÄ CoverLetterRenderer-engineä (sama kuin editori + kortit)
//    → PDF näyttää OIKEAN pohjan (templateStyle/background/regions säilyvät).

"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import CoverLetterContainer from "@/components/cover-letter/CoverLetterContainer";
import CoverLetterRenderer from "@/lib/cover-letter/Coverletterrenderer";

export default function CoverLetterPreviewPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const isPDFGeneration = searchParams?.get("pdf") === "true";

  const [raw, setRaw] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLetter = async () => {
      if (!id || typeof id !== "string") {
        setError("Letter ID puuttuu");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/cover-letters/${id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Load failed");
        }

        const { coverLetter: data } = await response.json();
        if (!data) throw new Error("Hakukirjettä ei löytynyt");

        // ✅ Anna engine-raakadata SELLAISENAAN — älä pudota kenttiä.
        //    content sisältää jo templateStyle, background, banner, band,
        //    image, regions, divider, contactInfo, body, fontSize, jne.
        setRaw({
          title: data.title || "Hakukirje",
          content: data.content || {},
          ai_data: data.ai_data || {},
        });
      } catch (err) {
        console.error("❌ Error loading letter:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadLetter();
  }, [id, isPDFGeneration]);

  // ── LOADING ──
  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#666", marginBottom: "10px" }}>Ladataan hakukirjettä...</div>
          <div style={{ width: "40px", height: "40px", border: "4px solid #f3f3f3", borderTop: "4px solid #3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  // ── ERROR ──
  if (error || !raw) {
    return (
      <div style={{ position: "fixed", inset: 0, backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "20px", maxWidth: "500px" }}>
          <div style={{ color: "#dc3545", fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>❌ Virhe</div>
          <div style={{ color: "#666", fontSize: "14px" }}>{error || "Hakukirjettä ei löytynyt"}</div>
        </div>
      </div>
    );
  }

  // ── RENDER ──
  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0 !important; padding: 0 !important; background-color: white !important; }
        html { margin: 0 !important; padding: 0 !important; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div style={{ margin: 0, padding: 0, backgroundColor: "white", minHeight: "100vh", width: "100%" }}>
        <CoverLetterContainer data-template-type="standard" className="mx-auto">
          <CoverLetterRenderer raw={raw} isEditing={false} />
        </CoverLetterContainer>
      </div>
    </>
  );
}
// app/cover-letter-preview/[id]/page.tsx - DEBUG VERSION

"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import CoverLetterContainer from "@/components/cover-letter/CoverLetterContainer";
import CoverLetterTemplate from "@/components/cover-letter/CoverLetterTemplate";

export default function CoverLetterPreviewPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const isPDFGeneration = searchParams?.get("pdf") === "true";

  const [letter, setLetter] = useState<any | null>(null);
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
        console.log("═══════════════════════════════════════════");
        console.log("🔍 LOADING COVER LETTER");
        console.log("═══════════════════════════════════════════");
        console.log("ID:", id);
        console.log("Mode:", isPDFGeneration ? "PDF" : "PREVIEW");
        console.log("URL:", `/api/cover-letters/${id}`);

        const response = await fetch(`/api/cover-letters/${id}`);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("❌ API ERROR:", errorData);
          throw new Error(errorData.error || "Load failed");
        }

        const { coverLetter: data } = await response.json();

        if (!data) {
          throw new Error("Cover letter not found");
        }

        console.log("═══════════════════════════════════════════");
        console.log("📦 RAW DATA FROM API:");
        console.log("═══════════════════════════════════════════");
        console.log("ID:", data.id);
        console.log("Title:", data.title);
        console.log("Has content?", !!data.content);
        console.log("Has ai_data?", !!data.ai_data);
        
        if (data.content) {
          console.log("─────────────────────────────────────────");
          console.log("CONTENT KEYS:", Object.keys(data.content));
          console.log("─────────────────────────────────────────");
          console.log("content.name:", data.content.name);
          console.log("content.email:", data.content.email);
          console.log("content.phone:", data.content.phone);
          console.log("content.body:", data.content.body?.substring(0, 100) + "...");
          console.log("content.job_title:", data.content.job_title);
          console.log("content.company_name:", data.content.company_name);
          console.log("content.contactInfo:", data.content.contactInfo);
        }
        
        if (data.ai_data) {
          console.log("─────────────────────────────────────────");
          console.log("AI_DATA KEYS:", Object.keys(data.ai_data));
          console.log("─────────────────────────────────────────");
          console.log("ai_data.name:", data.ai_data.name);
          console.log("ai_data.email:", data.ai_data.email);
          console.log("ai_data.phone:", data.ai_data.phone);
          console.log("ai_data.html?.content:", data.ai_data.html?.content?.substring(0, 100) + "...");
        }

        // ✅ BUILD FINAL DATA
        const coverLetterData = {
          name: data.content?.contactInfo?.name || 
                data.ai_data?.name || 
                data.content?.name || 
                "Hakija",
          
          email: data.content?.contactInfo?.email || 
                 data.ai_data?.email || 
                 data.content?.email || 
                 "",
          
          phone: data.content?.contactInfo?.phone || 
                 data.ai_data?.phone || 
                 data.content?.phone || 
                 "",
          
          location: data.content?.contactInfo?.location || 
                    data.ai_data?.location || 
                    data.content?.location || 
                    "",
          
          jobTitle: data.content?.job_title || 
                    data.ai_data?.job_title || 
                    "",
          
          companyName: data.content?.company_name || 
                       data.ai_data?.company_name || 
                       "",
          
          title: data.title || 'Hakukirje',
          
          content: data.content?.body || 
                   data.ai_data?.html?.content || 
                   '',
          
          keyHighlights: data.ai_data?.key_highlights || [],
          language: data.content?.language || 'finnish',
          style: (data.content?.style || 'professional') as 'professional' | 'casual' | 'creative',
        };

        console.log("═══════════════════════════════════════════");
        console.log("✅ FINAL PROCESSED DATA:");
        console.log("═══════════════════════════════════════════");
        console.log("name:", coverLetterData.name);
        console.log("email:", coverLetterData.email);
        console.log("phone:", coverLetterData.phone);
        console.log("location:", coverLetterData.location);
        console.log("jobTitle:", coverLetterData.jobTitle);
        console.log("companyName:", coverLetterData.companyName);
        console.log("content length:", coverLetterData.content.length);
        console.log("style:", coverLetterData.style);
        console.log("═══════════════════════════════════════════");

        setLetter(coverLetterData);

      } catch (error) {
        console.error("❌ LOAD ERROR:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadLetter();
  }, [id, isPDFGeneration]);

  if (loading) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div>Ladataan...</div>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div>
          <div style={{ color: "red", fontSize: "18px", fontWeight: "bold" }}>
            ❌ Virhe
          </div>
          <div>{error || "Letter not found"}</div>
        </div>
      </div>
    );
  }

  console.log("🎨 RENDERING TEMPLATE WITH DATA:", letter);

  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; }
        body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: white !important;
          font-family: 'Merriweather', serif !important;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div style={{
        margin: 0,
        padding: 0,
        backgroundColor: "white",
        minHeight: "100vh",
      }}>
        <CoverLetterContainer data-template-type="standard">
          <CoverLetterTemplate
            data={letter}
            isEditing={false}
            isPdfPreview={isPDFGeneration}
          />
        </CoverLetterContainer>
      </div>
    </>
  );
}
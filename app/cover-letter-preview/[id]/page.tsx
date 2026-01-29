// app/cover-letter-preview/[id]/page.tsx - ✅ FIXED (NO PLACEHOLDERS)

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
        console.log("🔍 LOADING COVER LETTER FOR PREVIEW/PDF");
        console.log("═══════════════════════════════════════════");
        console.log("ID:", id);
        console.log("Mode:", isPDFGeneration ? "PDF" : "PREVIEW");

        const response = await fetch(`/api/cover-letters/${id}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Load failed");
        }

        const { coverLetter: data } = await response.json();

        if (!data) {
          throw new Error("Hakukirjettä ei löytynyt");
        }

        console.log("✅ Raw data loaded:", {
          id: data.id,
          hasContent: !!data.content,
          hasAiData: !!data.ai_data,
        });

        // ✅ KORJAUS: CLEAN DATA EXTRACTION (EI PLACEHOLDEREITA!)
        const coverLetterData = {
          // ✅ Contact info (PUHDAS, ei hakasulkeita)
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
          
          // ✅ Job details (PUHDAS)
          jobTitle: data.content?.job_title || 
                    data.ai_data?.job_title || 
                    "",
          
          companyName: data.content?.company_name || 
                       data.ai_data?.company_name || 
                       "",
          
          // ✅ Content (TÄRKEINTÄ!)
          title: data.title || 'Hakukirje',
          
          content: data.content?.body || 
                   data.ai_data?.html?.content || 
                   '',
          
          // ✅ Styling
          keyHighlights: data.ai_data?.key_highlights || [],
          language: data.content?.language || 'finnish',
          style: (data.content?.style || 'professional') as 'professional' | 'casual' | 'creative',
          
          // ✅ Header settings
          headerColor: data.content?.headerColor || 'rgb(181, 152, 79)',
          headerLayout: (data.content?.headerLayout || 'top') as 'top' | 'left',
          sidebarContent: (data.content?.sidebarContent || 'contact') as 'contact' | 'highlights' | 'none',
        };

        console.log("═══════════════════════════════════════════");
        console.log("✅ PROCESSED DATA FOR TEMPLATE:");
        console.log("═══════════════════════════════════════════");
        console.log("name:", coverLetterData.name);
        console.log("email:", coverLetterData.email);
        console.log("phone:", coverLetterData.phone);
        console.log("content length:", coverLetterData.content.length);
        console.log("content preview:", coverLetterData.content.substring(0, 100));
        console.log("═══════════════════════════════════════════");

        setLetter(coverLetterData);

      } catch (error) {
        console.error("❌ Error loading letter:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadLetter();
  }, [id, isPDFGeneration]);

  // ════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ════════════════════════════════════════════════════════════════
  
  if (loading) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ 
            fontSize: "18px", 
            color: "#666",
            marginBottom: "10px" 
          }}>
            Ladataan hakukirjettä...
          </div>
          <div style={{
            width: "40px",
            height: "40px",
            border: "4px solid #f3f3f3",
            borderTop: "4px solid #3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto"
          }} />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ════════════════════════════════════════════════════════════════
  
  if (error || !letter) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ 
          textAlign: "center",
          padding: "20px",
          maxWidth: "500px"
        }}>
          <div style={{ 
            color: "#dc3545", 
            fontSize: "18px",
            fontWeight: "bold",
            marginBottom: "10px"
          }}>
            ❌ Virhe
          </div>
          <div style={{ 
            color: "#666", 
            fontSize: "14px" 
          }}>
            {error || "Hakukirjettä ei löytynyt"}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: white !important;
          font-family: 'Merriweather', serif !important;
        }

        html {
          margin: 0 !important;
          padding: 0 !important;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "white",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        <CoverLetterContainer data-template-type="standard" className="mx-auto">
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
// app/cover-letter-preview/[id]/page.tsx - ULTIMATE FIX
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import CoverLetterContainer from "@/components/cover-letter/CoverLetterContainer";
import CoverLetterTemplate from "@/components/cover-letter/CoverLetterTemplate";
import CoverLetterHeader from "@/components/cover-letter/CoverLetterHeader";
import { supabase } from "@/lib/supabase-client";

export default function CoverLetterPreviewPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const isPDFGeneration = searchParams?.get("pdf") === "true";

  const [letter, setLetter] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const convertImageForPDF = async (imageUrl: string): Promise<string> => {
    if (!isPDFGeneration || !imageUrl || imageUrl.startsWith("data:")) {
      return imageUrl;
    }

    try {
      const response = await fetch(
        `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
      );

      if (!response.ok) {
        return imageUrl;
      }

      const data = await response.json();
      
      if (data.base64) {
        return data.base64;
      }

      return imageUrl;
    } catch (error) {
      console.error("❌ Error converting image:", error);
      return imageUrl;
    }
  };

  useEffect(() => {
    const loadLetter = async () => {
      if (!id || typeof id !== "string") {
        setError("Letter ID puuttuu");
        setLoading(false);
        return;
      }

      try {
        console.log("🔍 Ladataan cover letter:", id, isPDFGeneration ? "(PDF)" : "(Normal)");

        const response = await fetch(`/api/cover-letters/${id}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Cover letterin lataus epäonnistui");
        }

        const { coverLetter: data } = await response.json();

        if (!data) {
          throw new Error("Cover letteriä ei löytynyt");
        }

        console.log("✅ Cover letter ladattu");

        let processedLetter = { ...data };

        if (!processedLetter.content) {
          processedLetter.content = {};
        }

        if (!processedLetter.ai_data) {
          processedLetter.ai_data = {};
        }

        // Profiilikuva käsittely
        if (data.content?.profile_image || data.ai_data?.profile_image) {
          let profileUrl = data.content?.profile_image || data.ai_data?.profile_image;

          if (profileUrl.startsWith("data:image")) {
            // Already base64
          } else if (profileUrl.startsWith("http")) {
            if (isPDFGeneration) {
              profileUrl = await convertImageForPDF(profileUrl);
            }
          } else {
            if (isPDFGeneration) {
              const { data: publicUrlData } = supabase.storage
                .from("cv_files")
                .getPublicUrl(profileUrl);

              if (publicUrlData?.publicUrl) {
                profileUrl = await convertImageForPDF(publicUrlData.publicUrl);
              }
            } else {
              try {
                const { data: signedUrlData } =
                  await supabase.storage.from("cv_files").createSignedUrl(
                    profileUrl,
                    7 * 24 * 60 * 60
                  );

                if (signedUrlData?.signedUrl) {
                  profileUrl = signedUrlData.signedUrl;
                }
              } catch (urlError) {
                console.warn("⚠️ URL:n haku epäonnistui:", urlError);
              }
            }
          }

          if (data.content?.profile_image) {
            processedLetter.content.profile_image = profileUrl;
          } else {
            processedLetter.ai_data.profile_image = profileUrl;
          }
        }

        setLetter(processedLetter);
      } catch (error) {
        console.error("❌ Virhe:", error);
        setError(error instanceof Error ? error.message : "Tuntematon virhe");
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
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#666", marginBottom: "10px" }}>
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

  if (error || !letter) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ textAlign: "center", padding: "20px", maxWidth: "500px" }}>
          <div style={{ color: "#dc3545", fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>
            ❌ Virhe
          </div>
          <div style={{ color: "#666", fontSize: "14px" }}>
            {error || "Hakukirjettä ei löytynyt"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ✅ GOOGLE FONTS - LADATAAN ENSIN */}
      <link
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Merriweather:wght@300;400;600;700&display=swap"
        rel="stylesheet"
      />

      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* ✅ PIILOTA KAIKKI NAVIGAATIO PDF:SSÄ */
        header, nav, [role="banner"], .no-print {
          display: none !important;
        }

        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: white !important;
          font-family: 'Merriweather', serif !important;
          width: 100%;
          height: 100%;
          overflow-x: hidden;
        }

        #__next {
          margin: 0 !important;
          padding: 0 !important;
        }

        /* ✅ PDF-SPESIFIT TYYLIT */
        @media print, screen {
          body {
            width: 210mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
          }

          /* ✅ PAKOTA VÄRIT NÄKYMÄÄN */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }

        @page {
          size: A4;
          margin: 0;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* ✅ PIENEMPI FONTTI = MAHTUU YHDELLE SIVULLE */
        .cover-letter-content {
          font-size: 10pt !important;
          line-height: 1.4 !important;
        }

        .cover-letter-content p {
          margin-bottom: 10px !important;
        }

        /* ✅ ALLEKIRJOITUS - PIENEMPI */
        .signature-section {
          margin-top: 20px !important;
        }

        .signature-text {
          font-size: 16pt !important;
        }
      `}</style>

      <div style={{
        margin: 0,
        padding: 0,
        backgroundColor: "white",
        width: "100%",
        minHeight: "100vh",
      }}>
        <CoverLetterContainer data-template-type="standard" className="mx-auto">
          <CoverLetterHeader
            applicantInfo={{
              name: letter.content?.applicant_info?.name || 
                    letter.content?.applicant_info?.full_name || 
                    'Hakija',
              full_name: letter.content?.applicant_info?.name || 
                        letter.content?.applicant_info?.full_name || 
                        'Hakija',
            }}
            date={letter.created_at ? 
              new Date(letter.created_at).toLocaleDateString('fi-FI') : 
              new Date().toLocaleDateString('fi-FI')
            }
            isEditing={false}
          />
          <CoverLetterTemplate
            data={{
              title: letter.title || 'Hakukirje',
              content: letter.content || {}
            }}
            ai_data={letter.ai_data || {
              html: { content: letter.content?.body || '' },
              styles: { main_style: '' }
            }}
            isEditing={false}
            isPdfPreview={isPDFGeneration}
          />
        </CoverLetterContainer>
      </div>
    </>
  );
}
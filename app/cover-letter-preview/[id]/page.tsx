// app/cover-letter-preview/[id]/page.tsx - KORJATTU (EI HEADERIA)
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import CoverLetterContainer from "@/components/cover-letter/CoverLetterContainer";
import CoverLetterTemplate from "@/components/cover-letter/CoverLetterTemplate";
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
        console.log(
          "🔍 Ladataan cover letter:",
          id,
          isPDFGeneration ? "(PDF mode)" : "(Normal mode)"
        );

        const response = await fetch(`/api/cover-letters/${id}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Cover letterin lataus epäonnistui");
        }

        const { coverLetter: data } = await response.json();

        if (!data) {
          throw new Error("Cover letteriä ei löytynyt");
        }

        let processedLetter = { ...data };

        if (!processedLetter.content) {
          processedLetter.content = {};
        }

        if (!processedLetter.ai_data) {
          processedLetter.ai_data = {};
        }

        if (data.content?.profile_image || data.ai_data?.profile_image) {
          let profileUrl = data.content?.profile_image || data.ai_data?.profile_image;

          if (profileUrl.startsWith("data:image")) {
            if (data.content?.profile_image) {
              processedLetter.content.profile_image = profileUrl;
            } else {
              processedLetter.ai_data.profile_image = profileUrl;
            }
          } else if (profileUrl.startsWith("http")) {
            if (isPDFGeneration) {
              profileUrl = await convertImageForPDF(profileUrl);
            }

            if (data.content?.profile_image) {
              processedLetter.content.profile_image = profileUrl;
            } else {
              processedLetter.ai_data.profile_image = profileUrl;
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
                const { data: signedUrlData, error: urlError } =
                  await supabase.storage.from("cv_files").createSignedUrl(
                    profileUrl,
                    7 * 24 * 60 * 60
                  );

                if (!urlError && signedUrlData?.signedUrl) {
                  profileUrl = signedUrlData.signedUrl;
                }
              } catch (urlError) {
                console.warn("⚠️ URL:n haku epäonnistui:", urlError);
              }
            }

            if (data.content?.profile_image) {
              processedLetter.content.profile_image = profileUrl;
            } else {
              processedLetter.ai_data.profile_image = profileUrl;
            }
          }
        }

        console.log("✅ Cover letter prosessoitu onnistuneesti");

        setLetter(processedLetter);
      } catch (error) {
        console.error("❌ Virhe cover letterin latauksessa:", error);
        setError(
          error instanceof Error ? error.message : "Tuntematon virhe"
        );
      } finally {
        setLoading(false);
      }
    };

    loadLetter();
  }, [id, isPDFGeneration]);

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
            ❌ Virhe hakukirjeen latauksessa
          </div>
          <div style={{ 
            color: "#666", 
            fontSize: "14px" 
          }}>
            {error || "Hakukirjettä ei löytynyt"}
          </div>
          <div style={{
            marginTop: "20px",
            fontSize: "12px",
            color: "#999"
          }}>
            Letter ID: {id}
          </div>
        </div>
      </div>
    );
  }

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
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        html {
          margin: 0 !important;
          padding: 0 !important;
        }

        #__next {
          margin: 0 !important;
          padding: 0 !important;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
        {/* ✅ EI HEADERIA - VAIN TEMPLATE */}
        <CoverLetterContainer data-template-type="standard" className="mx-auto">
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
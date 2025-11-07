// app/cv-preview/[cvId]/page.tsx - KORJATTU

"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { BaseCV } from "@/types";
import CVTemplate from "@/components/cv/CVSimpleTemplate";
import TechnicalCVTemplate from "@/components/cv/CVTemplateTechnical";
import CreativeCVTemplate from "@/components/cv/CVCreativeTemplate";
import CVContainer from "@/components/cv/CVContainer";
import { supabase } from "@/lib/supabase-client";

export default function CVPreviewPage() {
  const { cvId } = useParams();
  const searchParams = useSearchParams();
  const isPDFGeneration = searchParams?.get("pdf") === "true";

  const [cv, setCv] = useState<BaseCV | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Funktio kuvien muuntamiseen PDF:ää varten
 // Lisää tämä convertImageForPDF-funktioon
const convertImageForPDF = async (imageUrl: string): Promise<string> => {
  if (!isPDFGeneration || !imageUrl || imageUrl.startsWith("data:")) {
    console.log("⏭️ Skipping image conversion:", {
      isPDFGeneration,
      hasUrl: !!imageUrl,
      isBase64: imageUrl?.startsWith("data:")
    });
    return imageUrl;
  }

  try {
    console.log("🔄 Converting image for PDF:", imageUrl.substring(0, 100) + "...");

    const response = await fetch(
      `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
    );

    if (!response.ok) {
      console.error("❌ Image proxy failed:", response.statusText);
      return imageUrl; // Fallback alkuperäiseen
    }

    const data = await response.json();

    if (data.base64) {
      console.log("✅ Image converted to base64 successfully");
      return data.base64;
    }

    console.warn("⚠️ No base64 in response");
    return imageUrl;
  } catch (error) {
    console.error("❌ Error converting image for PDF:", error);
    return imageUrl; // Fallback alkuperäiseen
  }
};
  useEffect(() => {
    const loadCV = async () => {
      if (!cvId || typeof cvId !== "string") {
        setError("CV ID puuttuu");
        setLoading(false);
        return;
      }

      try {
        console.log(
          "🔍 Ladataan CV:",
          cvId,
          isPDFGeneration ? "(PDF mode)" : "(Normal mode)"
        );

        // ✅ KORJATTU: Käytä API routea (ei supabaseAdmin clientissa!)
        const response = await fetch(`/api/cv/${cvId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "CV:n lataus epäonnistui");
        }

        const { cv: data } = await response.json();

        if (!data) {
          throw new Error("CV:tä ei löytynyt");
        }

        console.log("✅ CV ladattu onnistuneesti:", {
          id: data.id,
          title: data.title,
          hasContent: !!data.content,
          hasCvData: !!data.content?.cv_data,
          hasAiData: !!data.content?.ai_data,
        });

        let processedCV = { ...data };

        // VARMISTA että content-rakenne on olemassa
        if (!processedCV.content) {
          console.warn("⚠️ Content puuttuu, luodaan tyhjä rakenne");
          processedCV.content = {
            cv_data: {},
            ai_data: {},
          };
        }

        if (!processedCV.content.cv_data) {
          processedCV.content.cv_data = {};
        }

        if (!processedCV.content.ai_data) {
          processedCV.content.ai_data = {};
        }

        // TAUSTAKUVA käsittely
        if (data.content?.ai_data?.background_image) {
          let backgroundUrl = "";

          // Jos on jo HTTP URL, käytä sitä
          if (data.content.ai_data.background_image.startsWith("http")) {
            backgroundUrl = data.content.ai_data.background_image;
          } else {
            // Muussa tapauksessa tee julkinen URL
            const { data: publicUrlData } = supabase.storage
              .from("cv_files")
              .getPublicUrl(data.content.ai_data.background_image);

            backgroundUrl = publicUrlData?.publicUrl || "";
          }

          console.log("🖼️ Taustakuva URL:", backgroundUrl.substring(0, 100) + "...");

          // PDF mode: Muunna base64:ksi
          if (isPDFGeneration && backgroundUrl) {
            backgroundUrl = await convertImageForPDF(backgroundUrl);
          }

          processedCV.content.ai_data.background_image = backgroundUrl;
        }

        // PROFIILIKUVA käsittely
        if (data.content?.cv_data?.profileImage) {
          let profileUrl = "";

          if (isPDFGeneration) {
            // PDF mode: Käytä julkista URL:ia ja muunna base64:ksi
            const { data: publicUrlData } = supabase.storage
              .from("cv_files")
              .getPublicUrl(data.content.cv_data.profileImage);

            if (publicUrlData?.publicUrl) {
              console.log("👤 Profiilikuva - muunnetaan PDF:lle");
              profileUrl = await convertImageForPDF(publicUrlData.publicUrl);
            }
          } else {
            // Normal mode: Käytä signed URL:ia (7 päivää)
            try {
              const { data: signedUrlData, error: urlError } =
                await supabase.storage.from("cv_files").createSignedUrl(
                  data.content.cv_data.profileImage,
                  7 * 24 * 60 * 60 // 7 päivää
                );

              if (!urlError && signedUrlData?.signedUrl) {
                console.log("👤 Profiilikuva - signed URL luotu (7 päivää)");
                profileUrl = signedUrlData.signedUrl;
              } else {
                console.warn("⚠️ Profiilikuvan signed URL epäonnistui:", urlError);
              }
            } catch (urlError) {
              console.warn("⚠️ Profiilikuvan URL:n haku epäonnistui:", urlError);
            }
          }

          if (profileUrl) {
            processedCV.content.cv_data.profileImage = profileUrl;
          }
        }

        console.log("✅ CV prosessoitu onnistuneesti");
        setCv(processedCV);
      } catch (error) {
        console.error("❌ Virhe CV:n latauksessa:", error);
        setError(
          error instanceof Error ? error.message : "Tuntematon virhe CV:n latauksessa"
        );
      } finally {
        setLoading(false);
      }
    };

    loadCV();
  }, [cvId, isPDFGeneration]);
  
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
            Ladataan CV:tä...
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

  if (error || !cv) {
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
            ❌ Virhe CV:n latauksessa
          </div>
          <div style={{ 
            color: "#666", 
            fontSize: "14px" 
          }}>
            {error || "CV:tä ei löytynyt tietokannasta"}
          </div>
          <div style={{
            marginTop: "20px",
            fontSize: "12px",
            color: "#999"
          }}>
            CV ID: {cvId}
          </div>
        </div>
      </div>
    );
  }

  const templateType = cv.content?.ai_data?.cvType || cv.content?.cv_data.cvType || "simple";

  let TemplateComponent;
  switch (templateType) {
    case "technical":
      TemplateComponent = TechnicalCVTemplate;
      break;
    case "creative":
      TemplateComponent = CreativeCVTemplate;
      break;
    default:
      TemplateComponent = CVTemplate;
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
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
            "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans",
            "Helvetica Neue", sans-serif !important;
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
        <CVContainer data-template-type={templateType} className="mx-auto">
          <TemplateComponent
            data={cv.content.cv_data}
            aiData={cv.content.ai_data}
            isEditing={false}
            editMode={"content"}
            showEditControls={false}
          />
        </CVContainer>
      </div>
    </>
  );
}
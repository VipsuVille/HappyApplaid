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

  // ✅ KUVAN URL-KÄSITTELY: Tunnista Base64, HTTP-URL tai tiedostonimi
  const getImageUrl = (imageData: string | null | undefined): string => {
    if (!imageData) return "";
    
    // ✅ Jos data alkaa "data:image", se on Base64 → käytä sellaisenaan
    if (imageData.startsWith('data:image')) {
      console.log("🖼️ Using Base64 image");
      return imageData;
    }
    
    // ✅ Jos alkaa "http", se on jo valmis URL → käytä sellaisenaan
    if (imageData.startsWith('http')) {
      console.log("🌐 Using existing HTTP URL");
      return imageData;
    }
    
    // ✅ Muuten oletetaan että se on tiedostonimi → rakenna Supabase PUBLIC URL
    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cv_files/${imageData}`;
    console.log("📁 Built public Storage URL:", publicUrl.substring(0, 100) + "...");
    return publicUrl;
  };

  // Funktio kuvien muuntamiseen PDF:ää varten
  const convertImageForPDF = async (imageUrl: string): Promise<string> => {
    if (!isPDFGeneration || !imageUrl || imageUrl.startsWith("data:")) {
      console.log("⏭️ Skipping conversion:", {
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

      console.log("📥 Proxy response status:", response.status);

      if (!response.ok) {
        console.error("❌ Proxy failed:", response.statusText);
        return imageUrl;
      }

      const data = await response.json();
      
      console.log("📦 Proxy response data:", {
        hasBase64: !!data.base64,
        base64Length: data.base64?.length || 0,
        base64Prefix: data.base64?.substring(0, 50) || 'N/A'
      });

      if (data.base64) {
        console.log("✅ Image converted successfully, length:", data.base64.length);
        return data.base64;
      }

      console.warn("⚠️ No base64 in response");
      return imageUrl;
    } catch (error) {
      console.error("❌ Error converting image:", error);
      return imageUrl;
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

        // Käytä API routea
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

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // TAUSTAKUVA KÄSITTELY
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        let backgroundUrl = data.content?.ai_data?.background_image || "";

        if (backgroundUrl) {
          console.log("🖼️ Taustakuva alkuperäinen:", backgroundUrl.substring(0, 100) + "...");

          // ✅ Käsittele getImageUrl-funktiolla
          backgroundUrl = getImageUrl(backgroundUrl);

          // ✅ PDF-mode: Muunna base64:ksi
          if (isPDFGeneration && backgroundUrl && !backgroundUrl.startsWith("data:")) {
            console.log("🖼️ 📄 PDF mode - muunnetaan base64:ksi");
            backgroundUrl = await convertImageForPDF(backgroundUrl);
          }

          processedCV.content.ai_data.background_image = backgroundUrl;
        } else {
          console.log("🖼️ ℹ️ Ei taustakuvaa");
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // PROFIILIKUVA KÄSITTELY
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        let profileUrl = data.content?.cv_data?.profileImage || "";

        if (profileUrl) {
          console.log("👤 Profiilikuva alkuperäinen:", profileUrl.substring(0, 100) + "...");

          // ✅ Käsittele getImageUrl-funktiolla
          profileUrl = getImageUrl(profileUrl);

          // ✅ PDF-mode: Muunna base64:ksi
          if (isPDFGeneration && profileUrl && !profileUrl.startsWith("data:")) {
            console.log("👤 📄 PDF mode - muunnetaan base64:ksi");
            profileUrl = await convertImageForPDF(profileUrl);
          }

          processedCV.content.cv_data.profileImage = profileUrl;
        } else {
          console.log("👤 ℹ️ Ei profiilikuvaa");
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // LOPULLINEN TARKISTUS
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        console.log("🎨 FINAL CV DATA:", {
          hasBackgroundImage: !!processedCV.content.ai_data.background_image,
          backgroundImagePrefix: processedCV.content.ai_data.background_image?.substring(0, 100) || "N/A",
          backgroundImageType: processedCV.content.ai_data.background_image?.startsWith('data:') ? 'Base64' : 'URL',
          hasProfileImage: !!processedCV.content.cv_data.profileImage,
          profileImagePrefix: processedCV.content.cv_data.profileImage?.substring(0, 100) || "N/A",
          profileImageType: processedCV.content.cv_data.profileImage?.startsWith('data:') ? 'Base64' : 'URL',
        });

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
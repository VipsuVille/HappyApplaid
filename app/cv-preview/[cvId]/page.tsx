"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { BaseCV, UserFormData, AIData } from "@/types";
import CVTemplate from "@/components/cv/CVSimpleTemplate";
import TechnicalCVTemplate from "@/components/cv/CVTemplateTechnical";
import CreativeCVTemplate from "@/components/cv/CVCreativeTemplate";
import CVContainer from "@/components/cv/CVContainer";

export default function CVPreviewPage() {
  const { cvId } = useParams();
  const searchParams = useSearchParams();
  const isPDFGeneration = searchParams?.get("pdf") === "true";

  const [cv, setCv] = useState<BaseCV | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ════════════════════════════════════════════════════════════════
  // KUVAN KÄSITTELY: Base64, HTTP URL tai Supabase path
  // ════════════════════════════════════════════════════════════════
  
  /**
   * ✅ KORJATTU: Muuntaa kuva-URL:n oikeaan muotoon
   * 
   * TUKEE:
   * 1. Base64 data URI
   * 2. HTTP/HTTPS URL (Supabase signed URL)
   * 3. Supabase file path (muunnetaan public URL)
   * 4. NULL/tyhjä → palauttaa tyhjän (ei virhettä)
   */
  const processImageUrl = (imageData: string | null | undefined): string => {
    // ✅ 1. NULL/UNDEFINED/TYHJÄ → Palauta tyhjä (ei virhettä!)
    if (!imageData || imageData.trim() === "") {
      console.log("⚠️ Image is null/empty/undefined");
      return "";
    }
    
    const trimmed = imageData.trim();
    
    // ✅ 2. BASE64 DATA URI → Palauta sellaisenaan
    if (trimmed.startsWith('data:image')) {
      // ❌ HYLKÄÄ SVG (backend ei pitäisi lähettää näitä!)
      if (trimmed.includes('data:image/svg+xml')) {
        console.warn("⚠️ SVG fallback detected, rejecting");
        return "";
      }
      
      // Validoi että Base64 on täydellinen
      const parts = trimmed.split(',');
      if (parts.length === 2 && parts[1].length > 100) {
        console.log("✅ Valid Base64 image");
        return trimmed;
      } else {
        console.error("❌ Invalid Base64 format");
        return "";
      }
    }
    
    // ✅ 3. HTTP/HTTPS URL → Palauta sellaisenaan
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      console.log("✅ HTTP URL detected");
      return trimmed;
    }
    
    // ✅ 4. Supabase file path → Rakenna PUBLIC URL
    if (trimmed.includes('/') && !trimmed.startsWith('data:') && !trimmed.startsWith('http')) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        console.error("❌ NEXT_PUBLIC_SUPABASE_URL not configured");
        return "";
      }
      
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/cv_files/${trimmed}`;
      console.log("✅ Built Supabase PUBLIC URL");
      return publicUrl;
    }
    
    // ❌ 5. Tuntematon muoto
    console.warn("⚠️ Unknown image format, rejecting:", trimmed.substring(0, 100));
    return "";
  };

  /**
   * Muuntaa HTTP URL Base64:ksi PDF:ää varten
   */
  const convertImageForPDF = async (imageUrl: string): Promise<string> => {
    if (!isPDFGeneration || !imageUrl || imageUrl.startsWith("data:")) {
      return imageUrl;
    }

    try {
      console.log("🔄 Converting image for PDF:", imageUrl.substring(0, 100));

      const response = await fetch(
        `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
      );

      if (!response.ok) {
        console.error("❌ Image proxy failed:", response.statusText);
        return imageUrl;
      }

      const data = await response.json();

      if (data.base64) {
        console.log("✅ Image converted to Base64, length:", data.base64.length);
        return data.base64;
      }

      return imageUrl;
    } catch (error) {
      console.error("❌ Error converting image:", error);
      return imageUrl;
    }
  };

  // ════════════════════════════════════════════════════════════════
  // CV LATAUS JA PROSESSOINTI
  // ════════════════════════════════════════════════════════════════

  useEffect(() => {
    const loadCV = async () => {
      if (!cvId || typeof cvId !== "string") {
        setError("CV ID puuttuu");
        setLoading(false);
        return;
      }

      try {
        console.log("═══════════════════════════════════════════");
        console.log("🔍 LOADING CV:", cvId);
        console.log("   Mode:", isPDFGeneration ? "PDF" : "PREVIEW");
        console.log("═══════════════════════════════════════════");

        const response = await fetch(`/api/cv/${cvId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "CV:n lataus epäonnistui");
        }

        const { cv: data } = await response.json();

        if (!data) {
          throw new Error("CV:tä ei löytynyt");
        }

        console.log("✅ CV loaded from API:", {
          id: data.id,
          title: data.title,
          hasContent: !!data.content,
          hasCvData: !!data.content?.cv_data,
          hasAiData: !!data.content?.ai_data,
        });

        // ════════════════════════════════════════════════════════════════
        // VARMISTA CONTENT-RAKENNE
        // ════════════════════════════════════════════════════════════════
        
        if (!data.content) {
          console.warn("⚠️ Content missing, creating empty structure");
          data.content = {
            cv_data: {},
            ai_data: {},
          };
        }

        if (!data.content.cv_data) {
          data.content.cv_data = {};
        }

        if (!data.content.ai_data) {
          data.content.ai_data = {};
        }

        // ════════════════════════════════════════════════════════════════
        // PROFIILIKUVAN KÄSITTELY (5 LÄHDETTÄ)
        // ════════════════════════════════════════════════════════════════
        
        console.log("👤 PROFILE IMAGE SOURCES:");
        
        // ✅ PRIORITEETTI (tärkeysjärjestyksessä):
        const profileImageSources = [
          { name: 'cv.profile_image', value: data.profile_image },
          { name: 'cv_data.profileImage', value: data.content.cv_data?.profileImage },
          { name: 'ai_data.profile_image', value: data.content.ai_data?.profile_image },
          { name: 'cv_data.photo', value: data.content.cv_data?.photo },
          { name: 'ai_data.html.profile_image', value: data.content.ai_data?.html?.profile_image }
        ];

        profileImageSources.forEach(src => {
          console.log(`   - ${src.name}:`, src.value?.substring(0, 80) || 'null');
        });

        // Etsi ensimmäinen ei-tyhjä arvo
        const rawProfileImage = profileImageSources.find(src => src.value && src.value.trim() !== '')?.value || "";

        let profileImage = "";

        if (rawProfileImage) {
          console.log("👤 Raw profile image found from:", profileImageSources.find(src => src.value === rawProfileImage)?.name);
          
          // ✅ PROSESSOI URL
          profileImage = processImageUrl(rawProfileImage);
          
          // PDF-mode: Muunna Base64:ksi jos HTTP URL
          if (isPDFGeneration && profileImage && !profileImage.startsWith("data:")) {
            console.log("👤 PDF mode: Converting to Base64...");
            profileImage = await convertImageForPDF(profileImage);
          }
          
          console.log("👤 Final profile image:", profileImage ? 'FOUND' : 'EMPTY');
        } else {
          console.log("👤 No valid profile image source found");
        }

        // ════════════════════════════════════════════════════════════════
        // TAUSTAKUVAN KÄSITTELY (5 LÄHDETTÄ)
        // ════════════════════════════════════════════════════════════════
        
        console.log("🌄 BACKGROUND IMAGE SOURCES:");
        
        const backgroundImageSources = [
          { name: 'cv.background_image', value: data.background_image },
          { name: 'cv_data.backgroundImage', value: data.content.cv_data?.backgroundImage },
          { name: 'ai_data.background_image', value: data.content.ai_data?.background_image },
          { name: 'ai_data.background_image_url', value: data.content.ai_data?.background_image_url },
          { name: 'ai_data.html.background_image', value: data.content.ai_data?.html?.background_image }
        ];

        backgroundImageSources.forEach(src => {
          console.log(`   - ${src.name}:`, src.value?.substring(0, 80) || 'null');
        });

        const rawBackgroundImage = backgroundImageSources.find(src => src.value && src.value.trim() !== '')?.value || "";

        let backgroundImage = "";

        if (rawBackgroundImage) {
          console.log("🌄 Raw background image found from:", backgroundImageSources.find(src => src.value === rawBackgroundImage)?.name);
          
          // ✅ PROSESSOI URL
          backgroundImage = processImageUrl(rawBackgroundImage);
          
          // PDF-mode: Muunna Base64:ksi jos HTTP URL
          if (isPDFGeneration && backgroundImage && !backgroundImage.startsWith("data:")) {
            console.log("🌄 PDF mode: Converting to Base64...");
            backgroundImage = await convertImageForPDF(backgroundImage);
          }
          
          console.log("🌄 Final background image:", backgroundImage ? 'FOUND' : 'EMPTY');
        } else {
          console.log("🌄 No valid background image source found");
        }

        // ════════════════════════════════════════════════════════════════
        // TALLENNA PROSESSOIDUT KUVAT KAIKKIIN PAIKKOIHIN
        // ════════════════════════════════════════════════════════════════
        
        // Profiilikuva → 3 paikkaan
        if (profileImage) {
          data.profile_image = profileImage;
          data.content.cv_data.profileImage = profileImage;
          data.content.ai_data.profile_image = profileImage;
          console.log("✅ Profile image saved to all locations");
        }

        // Taustakuva → 3 paikkaan
        if (backgroundImage) {
          data.background_image = backgroundImage;
          data.content.cv_data.backgroundImage = backgroundImage;
          data.content.ai_data.background_image = backgroundImage;
          console.log("✅ Background image saved to all locations");
        }

        // ════════════════════════════════════════════════════════════════
        // FINAL DEBUG
        // ════════════════════════════════════════════════════════════════
        
        console.log("═══════════════════════════════════════════");
        console.log("🎨 FINAL PROCESSED CV DATA:");
        console.log("═══════════════════════════════════════════");
        console.log("Profile Image:", profileImage ? 'YES' : 'NO');
        console.log("  - Type:", profileImage ? (profileImage.startsWith('data:') ? 'Base64' : 'HTTP URL') : 'None');
        console.log("  - Length:", profileImage?.length || 0);
        console.log("Background Image:", backgroundImage ? 'YES' : 'NO');
        console.log("  - Type:", backgroundImage ? (backgroundImage.startsWith('data:') ? 'Base64' : 'HTTP URL') : 'None');
        console.log("  - Length:", backgroundImage?.length || 0);
        console.log("═══════════════════════════════════════════");

        setCv(data);
      } catch (error) {
        console.error("❌ Error loading CV:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error loading CV"
        );
      } finally {
        setLoading(false);
      }
    };

    loadCV();
  }, [cvId, isPDFGeneration]);

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

  // ════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ════════════════════════════════════════════════════════════════
  
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

  // ════════════════════════════════════════════════════════════════
  // RENDER CV
  // ════════════════════════════════════════════════════════════════

const templateType =
  cv.metadata?.cv_type ||
  cv.content?.cv_data?.cvType ||
  "simple";

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

        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .cv-container {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
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
        <CVContainer data-template-type={templateType} className="mx-auto">
          <TemplateComponent
            data={cv.content.cv_data as UserFormData}
            aiData={cv.content.ai_data as AIData}
            isEditing={false}
            editMode={"content"}
            showEditControls={false}
          />
        </CVContainer>
      </div>
    </>
  );
}
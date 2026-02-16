"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { BaseCV, UserFormData, AIData } from "@/types";
import CVTemplate from "@/components/cv/CVSimpleTemplate";
import TechnicalCVTemplate from "@/components/cv/CVTemplateTechnical";
import CreativeCVTemplate from "@/components/cv/CVCreativeTemplate";
import CVContainer from "@/components/cv/CVContainer";

// ════════════════════════════════════════════════════════════════
// ✅ SHARED processCV — identical logic to my-cvs and edit-cv
// This ensures preview/PDF/my-cvs all render exactly the same
// ════════════════════════════════════════════════════════════════

function processCV(data: any): any {
  let cvData = data.cv_data;
  let aiData = data.ai_data;

  // Parse content if needed
  if (data.content) {
    try {
      const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
      const contentCvData = parsed.cv_data || {};
      const contentAiData = parsed.ai_data || {};
      if (Object.keys(contentCvData).length > 0) cvData = { ...(cvData || {}), ...contentCvData };
      if (Object.keys(contentAiData).length > 0) aiData = { ...(aiData || {}), ...contentAiData };
    } catch { /* ignore */ }
  }

  if (!cvData) cvData = {};
  if (!aiData) aiData = {};

  // Skills
  if (typeof cvData.skills === 'string') {
    try { cvData.skills = JSON.parse(cvData.skills); }
    catch { cvData.skills = cvData.skills.split(',').map((s: string) => s.trim()).filter(Boolean); }
  }
  if (!Array.isArray(cvData.skills)) cvData.skills = [];

  // Experience
  if (typeof cvData.experience === 'string') {
    try { cvData.experience = JSON.parse(cvData.experience); } catch { cvData.experience = []; }
  }
  if (!Array.isArray(cvData.experience)) cvData.experience = [];

  // Education
  if (typeof cvData.education === 'string') {
    try { cvData.education = JSON.parse(cvData.education); } catch { cvData.education = []; }
  }
  if (!Array.isArray(cvData.education)) cvData.education = [];

  // Images
  const processImageUrl = (url: string | null | undefined): string => {
    if (!url || url.trim() === "") return "";
    const trimmed = url.trim();
    if (trimmed.startsWith('data:image') || trimmed.startsWith('http')) return trimmed;
    if (trimmed.includes('/')) {
      return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cv_files/${trimmed}`;
    }
    return "";
  };

  const profileImage = processImageUrl(
    data.profile_image || cvData?.profileImage || aiData?.profile_image || cvData?.photo
  );
  const backgroundImage = processImageUrl(
    data.background_image || cvData?.backgroundImage || aiData?.background_image
  );

  cvData.profileImage = profileImage;
  cvData.backgroundImage = backgroundImage;
  if (aiData) {
    aiData.profile_image = profileImage;
    aiData.background_image = backgroundImage;
  }

  return {
    ...data,
    cv_data: cvData,
    ai_data: aiData,
    content: { cv_data: cvData, ai_data: aiData },
    profile_image: profileImage,
    background_image: backgroundImage,
  };
}

// ════════════════════════════════════════════════════════════════

export default function CVPreviewPage() {
  const { cvId } = useParams();
  const searchParams = useSearchParams();
  const isPDFGeneration = searchParams?.get("pdf") === "true";

  const [cv, setCv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const convertImageForPDF = async (imageUrl: string): Promise<string> => {
    if (!isPDFGeneration || !imageUrl || imageUrl.startsWith("data:")) return imageUrl;
    try {
      const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(imageUrl)}`);
      if (!response.ok) return imageUrl;
      const data = await response.json();
      return data.base64 || imageUrl;
    } catch { return imageUrl; }
  };

  useEffect(() => {
    const loadCV = async () => {
      if (!cvId || typeof cvId !== "string") {
        setError("CV ID puuttuu");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/cv/${cvId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "CV:n lataus epäonnistui");
        }

        const { cv: rawData } = await response.json();
        if (!rawData) throw new Error("CV:tä ei löytynyt");

        // ✅ FIX: Use same processCV as my-cvs and edit-cv
        const processed = processCV(rawData);

        // PDF mode: convert HTTP images to base64
        if (isPDFGeneration) {
          if (processed.cv_data.profileImage && !processed.cv_data.profileImage.startsWith("data:")) {
            const b64 = await convertImageForPDF(processed.cv_data.profileImage);
            processed.cv_data.profileImage = b64;
            if (processed.ai_data) processed.ai_data.profile_image = b64;
          }
          if (processed.cv_data.backgroundImage && !processed.cv_data.backgroundImage.startsWith("data:")) {
            const b64 = await convertImageForPDF(processed.cv_data.backgroundImage);
            processed.cv_data.backgroundImage = b64;
            if (processed.ai_data) processed.ai_data.background_image = b64;
          }
        }

        setCv(processed);
      } catch (error) {
        console.error("Error loading CV:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadCV();
  }, [cvId, isPDFGeneration]);

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#666", marginBottom: "10px" }}>Ladataan CV:tä...</div>
          <div style={{ width: "40px", height: "40px", border: "4px solid #f3f3f3", borderTop: "4px solid #3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  if (error || !cv) {
    return (
      <div style={{ position: "fixed", inset: 0, backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "20px", maxWidth: "500px" }}>
          <div style={{ color: "#dc3545", fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>❌ Virhe</div>
          <div style={{ color: "#666", fontSize: "14px" }}>{error || "CV:tä ei löytynyt"}</div>
          <div style={{ marginTop: "20px", fontSize: "12px", color: "#999" }}>CV ID: {cvId}</div>
        </div>
      </div>
    );
  }

  // ✅ FIX: Read fontScale/lineScale from saved cv_data
  const cvd = cv.cv_data || cv.content?.cv_data || {};
  const aid = cv.ai_data || cv.content?.ai_data || {};
  const fontScale = cvd.fontScale ?? 1.0;
  const lineScale = cvd.lineScale ?? 1.0;

  const templateType = cv.metadata?.cv_type || cvd.cvType || aid.cv_type || "simple";

  let TemplateComponent: any;
  switch (templateType) {
    case "technical": TemplateComponent = TechnicalCVTemplate; break;
    case "creative": TemplateComponent = CreativeCVTemplate; break;
    default: TemplateComponent = CVTemplate;
  }

  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0 !important; padding: 0 !important; background-color: white !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", sans-serif !important;
          -webkit-font-smoothing: antialiased; }
        html { margin: 0 !important; padding: 0 !important; }
        #__next { margin: 0 !important; padding: 0 !important; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; }
          .cv-container { width: 210mm !important; height: 297mm !important; max-height: 297mm !important; overflow: hidden !important; }
        }
      `}</style>

      <div style={{ margin: 0, padding: 0, backgroundColor: "white", minHeight: "100vh", width: "100%" }}>
        <CVContainer data-template-type={templateType} className="mx-auto">
          {/* ✅ FIX: Pass fontScale/lineScale from saved data */}
          <TemplateComponent
            data={cvd as UserFormData}
            aiData={aid as AIData}
            isEditing={false}
            editMode={"content"}
            showEditControls={false}
            fontScale={fontScale}
            lineScale={lineScale}
          />
        </CVContainer>
      </div>
    </>
  );
}
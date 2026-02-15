"use client";
import React from "react";
import { UserFormData, AIData, EditMode } from "@/types";

interface SimpleCVTemplateProps {
  data: UserFormData;
  aiData: AIData;
  isEditing: boolean;
  showEditControls: boolean;
  editMode: EditMode | null;
  onContentChange?: (field: keyof UserFormData, value: any) => void;
}

const SimpleCVTemplate: React.FC<SimpleCVTemplateProps> = ({
  data,
  aiData,
  isEditing,
  onContentChange,
}) => {
  console.log("🔥 RAW data", data);
console.log("🔥 RAW aiData", aiData);
  // ════════════════════════════════════════════════════════════════
  // IMAGE HANDLING: 5 SOURCES (priority order)
  // ════════════════════════════════════════════════════════════════
  
  /**
   * Get profile image from multiple sources
   * Priority: data.profileImage > data.photo > aiData.profile_image > aiData.html.profile_image
   */
  const isValidImage = (src?: string | null) => {
  if (!src) return false;
  const s = String(src).trim();
  return (
    s !== "" &&
    !s.includes("cv_files/default") &&
    (s.startsWith("http://") ||
      s.startsWith("https://") ||
      s.startsWith("data:image"))
  );
};

const getProfileImage = (): string | null => {
  console.log("🔍 Profile image sources:", {
    "data.profile_image": (data as any)?.profile_image?.substring(0, 80),
    "data.profileImage": data?.profileImage?.substring(0, 80),
    "data.photo": (data as any)?.photo?.substring(0, 80),
    "aiData.profile_image": aiData?.profile_image?.substring(0, 80),
    "aiData.html?.profile_image": (aiData?.html as any)?.profile_image?.substring(0, 80),
  });

  const sources = [
    (data as any)?.profile_image,
    data?.profileImage,
    (data as any)?.photo,
    aiData?.profile_image,
    (aiData?.html as any)?.profile_image,
  ];

  for (const src of sources) {
    if (!isValidImage(src)) continue;

    const srcStr = String(src).trim();

    // ❌ ESTÄ URL + BASE64 -YHDISTELMÄ
    if (
      srcStr.startsWith("http") &&
      srcStr.includes("data:image")
    ) {
      console.warn("❌ Invalid profile image (URL + base64 mixed)", srcStr.substring(0, 120));
      continue;
    }

    console.log("✅ Profile image selected:", srcStr.substring(0, 80));
    return srcStr;
  }

  console.warn("⚠️ No valid profile image found");
  return null;
};

  
  /**
   * Get background image from multiple sources
   * Priority: data.backgroundImage > aiData.background_image > aiData.background_image_url > aiData.html.background_image
   */
const getBackgroundImage = (): string | null => {
  console.log("🔍 Background image sources:", {
    "data.background_image": (data as any)?.background_image?.substring(0, 80),
    "data.backgroundImage": data?.backgroundImage?.substring(0, 80),
    "aiData.background_image": aiData?.background_image?.substring(0, 80),
    "aiData.background_image_url": aiData?.background_image_url?.substring(0, 80),
    "aiData.html?.background_image": (aiData?.html as any)?.background_image?.substring(0, 80),
  });

  const sources = [
    (data as any)?.background_image,
    data?.backgroundImage,
    aiData?.background_image,
    aiData?.background_image_url,
    (aiData?.html as any)?.background_image,
  ];

  for (const src of sources) {
    if (!isValidImage(src)) continue;

    const srcStr = String(src).trim();

    // ❌ ESTÄ URL + BASE64 -YHDISTELMÄ
    if (
      srcStr.startsWith("http") &&
      srcStr.includes("data:image")
    ) {
      console.warn("❌ Invalid background image (URL + base64 mixed)", srcStr.substring(0, 120));
      continue;
    }

    console.log("✅ Background image selected:", srcStr.substring(0, 80));
    return srcStr;
  }

  console.warn("⚠️ No valid background image found");
  return null;
};



  const profileImg = getProfileImage();
  const bgImage = getBackgroundImage();

  const name = data?.name || "Nimi";
  const title = data?.title || "Ammattinimike";

  // ════════════════════════════════════════════════════════════════
  // AI CONTENT HANDLING: 2 FORMATS (html.X or X)
  // ════════════════════════════════════════════════════════════════
  
  /**
   * Get AI-generated content from either format
   * Priority: aiData.field > aiData.html.field
   */
  const getAIContent = (field: keyof AIData): string => {
    // TRY: Direct access (new format)
    let content = aiData?.[field];
    
    // FALLBACK: html object (old format)
    if (!content && aiData?.html) {
      content = aiData.html[field as keyof typeof aiData.html];
    }
    
    if (typeof content === "string" && content.trim()) {
      // ❌ Hide error messages
      if (content.toLowerCase().includes("error generating")) {
        console.warn(`⚠️ Error message in '${field}', hiding`);
        return "";
      }
      
      // ❌ Hide too short content (< 20 chars)
      if (content.trim().length < 20) {
        console.warn(`⚠️ Content too short in '${field}'`);
        return "";
      }
      
      return content;
    }
    
    return "";
  };

  return (
    <div
      className="cv-paper bg-white mx-auto relative overflow-hidden shadow-2xl"
      style={{
        width: "210mm",
        minHeight: "297mm",
        maxHeight: "297mm",
        fontFamily: "'Inter', 'Helvetica', sans-serif",
        color: "#1a202c",
      }}
    >
      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 1. HEADER & BACKGROUND IMAGE */}
      {/* ════════════════════════════════════════════════════════════════ */}
      
      <div className="relative bg-indigo-900" style={{ height: "70mm" }}>
        {/* BACKGROUND IMAGE */}
        {bgImage ? (
          <img 
            src={bgImage} 
            className="absolute inset-0 w-full h-full object-cover" 
            alt=""
            onError={(e) => {
              console.error("❌ Background image failed to load:", bgImage.substring(0, 100));
              e.currentTarget.style.display = 'none';
            }}
            onLoad={() => {
              console.log("✅ Background image loaded successfully");
            }}
          />
        ) : (
          <div 
            className="absolute inset-0" 
            style={{ 
              background: "linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)" 
            }} 
          />
        )}
        
        {/* OVERLAY */}
        <div className="absolute inset-0 bg-black/20" />

        {/* NAME AND TITLE */}
        <div className="absolute bottom-10 left-12 text-white z-10">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                className="bg-white/20 border border-white/40 text-4xl font-bold px-2 py-1 rounded outline-none"
                value={data?.name || ""}
                onChange={(e) => onContentChange?.("name", e.target.value)}
                placeholder="Nimesi"
              />
              <input
                className="bg-white/20 border border-white/40 text-xl px-2 py-1 rounded outline-none"
                value={data?.title || ""}
                onChange={(e) => onContentChange?.("title", e.target.value)}
                placeholder="Ammattinimike"
              />
            </div>
          ) : (
            <>
              <h1 className="text-5xl font-extrabold tracking-tight drop-shadow-lg">
                {name}
              </h1>
              <p className="text-2xl opacity-95 mt-2 font-light">
                {title}
              </p>
            </>
          )}
        </div>

        {/* PROFILE IMAGE */}
        <div 
          className="absolute -bottom-10 right-12 z-20 w-[50mm] h-[50mm] rounded-full border-[6px] border-white overflow-hidden shadow-xl bg-gray-100"
        >
          {profileImg ? (
            <img 
              src={profileImg} 
              className="w-full h-full object-cover" 
              alt="Profiili"
              onError={(e) => {
                console.error("❌ Profile image failed to load:", profileImg.substring(0, 100));
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => {
                console.log("✅ Profile image loaded successfully");
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl font-bold bg-gray-200">
              {name.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 2. CONTACT INFORMATION BAR */}
      {/* ════════════════════════════════════════════════════════════════ */}
      
      <div className="bg-[#1a202c] text-white py-4 px-12 mt-0 flex items-center gap-8 text-sm">
        <div className="flex items-center gap-2">
          <span className="opacity-60 text-xs uppercase">Puh:</span>
          <span>{data?.phone || "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="opacity-60 text-xs uppercase">Email:</span>
          <span>{data?.email || "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="opacity-60 text-xs uppercase">Sijainti:</span>
          <span>{data?.location || "—"}</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 3. CONTENT AREA */}
      {/* ════════════════════════════════════════════════════════════════ */}
      
      <div className="px-12 py-16 grid grid-cols-12 gap-12">
        <div className="col-span-12 flex flex-col gap-10">
          
          {/* PROFILE DESCRIPTION */}
          {getAIContent("personal_description") && (
            <section>
              <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-4">
                Profiili
              </h2>
              {isEditing ? (
                <textarea
                  className="w-full p-3 border rounded text-gray-700 leading-relaxed"
                  rows={4}
                  value={aiData?.personal_description || ""}
                  onChange={(e) => onContentChange?.("personal_description" as any, e.target.value)}
                />
              ) : (
                <p className="text-gray-700 leading-relaxed text-lg italic border-l-4 border-blue-100 pl-6">
                  {getAIContent("personal_description")}
                </p>
              )}
            </section>
          )}

          <div className="grid grid-cols-1 gap-12">
            
            {/* WORK EXPERIENCE */}
            {getAIContent("experience_section") && (
              <section>
                <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-6 border-b pb-2">
                  Työkokemus
                </h2>
                <div 
                  className="prose prose-sm max-w-none text-gray-800"
                  dangerouslySetInnerHTML={{ __html: getAIContent("experience_section") }}
                />
              </section>
            )}

            <div className="grid grid-cols-2 gap-12">
              
              {/* EDUCATION */}
              {getAIContent("education_section") && (
                <section>
                  <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-6 border-b pb-2">
                    Koulutus
                  </h2>
                  <div 
                    className="prose prose-sm max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{ __html: getAIContent("education_section") }}
                  />
                </section>
              )}

              {/* SKILLS */}
              {getAIContent("skills_section") && (
                <section>
                  <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-6 border-b pb-2">
                    Osaaminen
                  </h2>
                  <div 
                    className="prose prose-sm max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{ __html: getAIContent("skills_section") }}
                  />
                </section>
              )}
            </div>

            {/* LANGUAGES */}
            {getAIContent("languages_section") && (
              <section>
                <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-6 border-b pb-2">
                  Kielet
                </h2>
                <div 
                  className="prose prose-sm max-w-none text-gray-800"
                  dangerouslySetInnerHTML={{ __html: getAIContent("languages_section") }}
                />
              </section>
            )}
          </div>

          {/* SIGNATURE */}
          <div className="mt-8 border-t pt-8">
            <p className="text-4xl text-blue-700 opacity-80" style={{ fontFamily: "'Brush Script MT', cursive" }}>
              {name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleCVTemplate;
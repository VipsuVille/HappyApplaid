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
  // ✅ KUVANSIIVOUS: Erottele base64 ja HTTP-URLit
  const cleanImageUrl = (rawUrl: string | undefined): string => {
    if (!rawUrl) return "";

    // Jos URL sisältää "data:image", pura se ulos
    const base64Match = rawUrl.match(/(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)/);
    if (base64Match) {
      console.log("🖼️ Base64-kuva löydetty ja puhdistettu");
      return base64Match[1];
    }

    // Jos on HTTP-URL (ei sisällä "data:image"), käytä sellaisenaan
    if (rawUrl.startsWith("http")) {
      console.log("🌐 HTTP-kuva:", rawUrl.substring(0, 80));
      return rawUrl;
    }

    console.warn("⚠️ Tuntematon kuvamuoto:", rawUrl.substring(0, 50));
    return "";
  };

  const profileImg = cleanImageUrl(
    data?.profileImage || 
    (data as any)?.photo || 
    aiData?.profile_image || 
    ""
  );

  const bgImg = cleanImageUrl(
    data?.backgroundImage || 
    aiData?.background_image || 
    aiData?.background_image_url || 
    ""
  );

  const name = data?.name || "Nimi";
  const title = data?.title || "Ammattinimike";

  // ✅ AI-SISÄLLÖN VARMISTUS
  const getAIContent = (field: keyof AIData): string => {
    const content = aiData?.[field];
    if (typeof content === "string" && content.trim()) {
      return content;
    }
    console.warn(`⚠️ AI-kenttä '${field}' on tyhjä tai virheellinen`);
    return "";
  };

  return (
    <div
      className="cv-paper bg-white mx-auto relative overflow-hidden shadow-2xl"
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily: "'Inter', 'Helvetica', sans-serif",
        color: "#1a202c",
      }}
    >
      {/* 1. HEADER & TAUSTAKUVA */}
      <div className="relative bg-indigo-900" style={{ height: "70mm" }}>
        {/* Käytetään img-tagia taustakuvalle CSS:n sijaan varmuuden vuoksi */}
        {bgImg ? (
          <img 
            src={bgImg} 
            className="absolute inset-0 w-full h-full object-cover" 
            alt=""
            crossOrigin="anonymous"
            onError={(e) => {
              console.error("❌ Taustakuva ei lataudu:", bgImg.substring(0, 100));
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div 
            className="absolute inset-0" 
            style={{ backgroundImage: "linear-gradient(135deg, #1e40af, #7e22ce)" }} 
          />
        )}
        
        <div className="absolute inset-0 bg-black/20" />

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

        {/* Profiilikuva - Varmista että URL on olemassa */}
        <div 
          className="absolute -bottom-10 right-12 z-20 w-[50mm] h-[50mm] rounded-full border-[6px] border-white overflow-hidden shadow-xl bg-gray-100"
        >
          {profileImg ? (
            <img 
              src={profileImg} 
              className="w-full h-full object-cover" 
              alt="Profiili"
              crossOrigin="anonymous"
              onError={(e) => {
                console.error("❌ Profiilikuva ei lataudu:", profileImg.substring(0, 100));
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl font-bold">
              {name.substring(0,1)}
            </div>
          )}
        </div>
      </div>

      {/* 2. YHTEYSTIEDOT */}
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

      {/* 3. SISÄLTÖALUE */}
      <div className="px-12 py-16 grid grid-cols-12 gap-12">
        <div className="col-span-12 flex flex-col gap-10">
          
          {/* PROFIILI */}
          <section>
            <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-4">Profiili</h2>
            {isEditing ? (
              <textarea
                className="w-full p-3 border rounded text-gray-700 leading-relaxed"
                rows={4}
                value={aiData?.personal_description || ""}
                onChange={(e) => onContentChange?.("personal_description" as any, e.target.value)}
              />
            ) : (
              <p className="text-gray-700 leading-relaxed text-lg italic border-l-4 border-blue-100 pl-6">
                {getAIContent("personal_description") || "Ei kuvausta saatavilla."}
              </p>
            )}
          </section>

          <div className="grid grid-cols-1 gap-12">
            {/* TYÖKOKEMUS */}
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
              {/* KOULUTUS */}
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

              {/* OSAAMINEN */}
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
          </div>

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
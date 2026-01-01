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
  // ✅ YKSINKERTAINEN: Älä muokkaa kuvia, ne tulevat jo valmiina CVPreviewPagesta
  // TypeScript-turvallisuus: Varmista että arvot ovat stringejä
  const profileImg = (data?.photo || data?.profileImage || "") as string;
  const bgImg = (data?.backgroundImage || aiData?.background_image || "") as string;

  const name = data?.name || "Nimi";
  const title = data?.title || "Ammattinimike";
const getBackgroundImage = () => {
  // ✅ 1. Tarkista ai_data.background_image (uusi)
  const bg = aiData?.background_image || aiData?.background_image_url;
  
  // ✅ 2. Tarkista data.backgroundImage (vanha)
  const dataBg = data?.backgroundImage;
  
  // ✅ 3. Palauta ensimmäinen validi URL
  const finalBg = bg || dataBg;
  
  if (finalBg && (finalBg.startsWith('http') || finalBg.startsWith('data:'))) {
    return finalBg;
  }
  
  return null;
};

const bgImage = getBackgroundImage();
  // ✅ AI-SISÄLLÖN VARMISTUS: Piilota virheviestit ja tyhjät kentät
 const getAIContent = (field: keyof AIData): string => {
  // ✅ YRI ENSIN: Suoraan juuresta (uusi muoto)
  let content = aiData?.[field];
  
  // ✅ JOS EI LÖYDY: Kokeile html-objektista (vanha muoto)
  if (!content && aiData?.html) {
    content = aiData.html[field as keyof typeof aiData.html];
  }
    
  if (typeof content === "string" && content.trim()) {
    // ❌ Piilota virheviestit
    if (content.toLowerCase().includes("error generating")) {
      console.warn(`⚠️ Virheviesti kentässä '${field}', piilotetaan`);
      return "";
    }
    
    // ❌ Piilota liian lyhyet tekstit (alle 20 merkkiä)
    if (content.trim().length < 20) {
      console.warn(`⚠️ Liian lyhyt sisältö kentässä '${field}'`);
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
        fontFamily: "'Inter', 'Helvetica', sans-serif",
        color: "#1a202c",
      }}
    >
      {/* 1. HEADER & TAUSTAKUVA */}
     <div
  className="relative bg-indigo-900"
  style={{
    height: "70mm",
    backgroundImage: bgImage ? `url(${bgImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }}
>
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

        {/* PROFIILIKUVA */}
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
                console.error("❌ Profiilikuva ei lataudu:", typeof profileImg === 'string' ? profileImg.substring(0, 100) : profileImg);
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
          
          {/* PROFIILI - Näytetään aina jos on sisältöä */}
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

            {/* KIELET */}
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

          {/* ALLEKIRJOITUS */}
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
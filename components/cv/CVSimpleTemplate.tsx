"use client";
import React from "react";
import { UserFormData, AIData, EditMode } from "@/types";

interface SimpleCVTemplateProps {
  data: UserFormData; // Pakollinen EditCV-sivulta
  aiData: AIData;     // Pakollinen EditCV-sivulta
  isEditing: boolean;
  showEditControls: boolean;
  editMode: EditMode | null;
  onContentChange?: (field: keyof UserFormData, value: any) => void;
}

const SimpleCVTemplate: React.FC<SimpleCVTemplateProps> = ({
  data,
  aiData,
  isEditing,
  showEditControls,
  onContentChange,
}) => {
  // --- KUVANLOGIIKKA: Priorisoi käyttäjän valitsema kuva (data), sitten AI:n luoma ---
  const profileImg = data?.profileImage || aiData?.profile_image || "";
  const bgImg = data?.backgroundImage || aiData?.background_image || aiData?.background_image_url || "";

  // Helper-funktio tekstimuutoksille
  const handleChange = (field: keyof UserFormData, value: string) => {
    if (onContentChange) onContentChange(field, value);
  };

  return (
    <div
      className="cv-paper bg-white mx-auto relative overflow-hidden"
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily: "'Inter', 'Helvetica', sans-serif",
        color: "#1a202c",
      }}
    >
      {/* 1. HEADER & TAUSTAKUVA */}
      <div
        className="relative"
        style={{
          height: "70mm",
          backgroundImage: bgImg ? `url(${bgImg})` : "linear-gradient(135deg, #1e40af, #7e22ce)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Tumma kerros, jotta teksti erottuu taustasta */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Nimi ja Titteli */}
        <div className="absolute bottom-10 left-12 text-white z-10">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                className="bg-white/20 border border-white/40 text-4xl font-bold px-2 py-1 rounded outline-none"
                value={data.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Nimesi"
              />
              <input
                className="bg-white/20 border border-white/40 text-xl px-2 py-1 rounded outline-none"
                value={data.title || ""}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Ammattinimike"
              />
            </div>
          ) : (
            <>
              <h1 className="text-5xl font-extrabold tracking-tight drop-shadow-lg">
                {data.name || "Nimesi tähän"}
              </h1>
              <p className="text-2xl opacity-95 mt-2 font-light">
                {data.title || "Ammattinimike"}
              </p>
            </>
          )}
        </div>

        {/* PROFIILIKUVA */}
        <div 
          className="absolute -bottom-10 right-12 z-20"
          style={{
            width: "50mm",
            height: "50mm",
            borderRadius: "50%",
            border: "6px solid white",
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            backgroundColor: "#f7fafc"
          }}
        >
          {profileImg ? (
            <img src={profileImg} alt="Profiili" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
               <span className="text-4xl font-bold">{data.name?.substring(0,2).toUpperCase() || "CV"}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. YHTEYSTIEDOT (Musta palkki) */}
      <div className="bg-[#1a202c] text-white py-4 px-12 mt-0 flex items-center gap-8 text-sm">
        <div className="flex items-center gap-2">
           <span className="opacity-60 text-xs">PUH:</span>
           <span>{data.phone || "Lisää numero"}</span>
        </div>
        <div className="flex items-center gap-2">
           <span className="opacity-60 text-xs">EMAIL:</span>
           <span>{data.email || "Lisää sähköposti"}</span>
        </div>
        <div className="flex items-center gap-2">
           <span className="opacity-60 text-xs">SIJAINTI:</span>
           <span>{data.location || "Paikkakunta"}</span>
        </div>
      </div>

      {/* 3. SISÄLTÖALUE */}
      <div className="px-12 py-16 grid grid-cols-12 gap-12">
        
        {/* VASEN SARAKE (Profiili ja Osaaminen) */}
        <div className="col-span-12 flex flex-col gap-10">
          
          {/* Profiiliteksti */}
          <section>
            <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-4">Profiili</h2>
            {isEditing ? (
              <textarea
                className="w-full p-3 border rounded text-gray-700 leading-relaxed"
                rows={4}
                value={aiData.personal_description || ""}
                onChange={(e) => onContentChange?.("personal_description" as any, e.target.value)}
              />
            ) : (
              <p className="text-gray-700 leading-relaxed text-lg italic border-l-4 border-blue-100 pl-6">
                {aiData.personal_description}
              </p>
            )}
          </section>

          {/* Kokemus / HTML osiot */}
          <div className="grid grid-cols-1 gap-12">
            
            {aiData.experience_section && (
              <section>
                <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-6 border-b pb-2">Työkokemus</h2>
                <div 
                  className="prose prose-sm max-w-none text-gray-800"
                  dangerouslySetInnerHTML={{ __html: aiData.experience_section }}
                />
              </section>
            )}

            <div className="grid grid-cols-2 gap-12">
              {aiData.education_section && (
                <section>
                  <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-6 border-b pb-2">Koulutus</h2>
                  <div 
                    className="prose prose-sm max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{ __html: aiData.education_section }}
                  />
                </section>
              )}

              {aiData.skills_section && (
                <section>
                  <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-6 border-b pb-2">Osaaminen</h2>
                  <div 
                    className="prose prose-sm max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{ __html: aiData.skills_section }}
                  />
                </section>
              )}
            </div>
          </div>

          {/* ALLEKIRJOITUS */}
          <div className="mt-8">
            <p className="text-4xl text-blue-700 opacity-80" style={{ fontFamily: "'Brush Script MT', cursive" }}>
              {data.name}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SimpleCVTemplate;
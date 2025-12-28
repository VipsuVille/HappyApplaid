"use client";
import React from "react";
import { UserFormData, AIData, EditMode } from "@/types";

interface SimpleCVTemplateProps {
  data: UserFormData; // Tämä on cv.content.cv_data
  aiData: AIData;     // Tämä on cv.content.ai_data
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
  // --- 1. PROFIILIKUVA (Synkronoitu CVPreviewPage:n kanssa) ---
  // CVPreviewPage tallentaa prosessoidun URL:n kohtaan cv.content.cv_data.profileImage
  const profileImg = data?.profileImage || "";

  // --- 2. TAUSTAKUVA (Synkronoitu CVPreviewPage:n kanssa) ---
  // CVPreviewPage tallentaa prosessoidun URL:n kohtaan cv.content.ai_data.background_image
  const bgImg = aiData?.background_image || "";

  const name = data?.name || "Nimi";
  const title = data?.title || "Ammattinimike";

  return (
    <div 
      className="cv-paper bg-white mx-auto relative overflow-hidden" 
      style={{ 
        width: "210mm", 
        minHeight: "297mm", 
        fontFamily: "'Inter', sans-serif",
        color: "#1a202c" 
      }}
    >
      {/* HEADER & TAUSTAKUVA */}
      <div
        className="relative bg-slate-200"
        style={{ height: "70mm" }}
      >
        {bgImg ? (
          <img 
            src={bgImg} 
            alt="Taustakuva" 
            className="absolute inset-0 w-full h-full object-cover"
            // Tärkeää PDF-generoinnin kannalta:
            crossOrigin="anonymous" 
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-800" />
        )}
        
        {/* Tummennuskerros */}
        <div className="absolute inset-0 bg-black/20" />

        <div className="absolute bottom-10 left-12 text-white z-10">
          <h1 className="text-5xl font-extrabold tracking-tight drop-shadow-md">{name}</h1>
          <p className="text-2xl opacity-90 mt-2 font-light">{title}</p>
        </div>

        {/* PROFIILIKUVA */}
        <div 
          className="absolute -bottom-10 right-12 z-20"
          style={{
            width: "50mm", height: "50mm", borderRadius: "50%",
            border: "6px solid white", overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)", backgroundColor: "#f3f4f6"
          }}
        >
          {profileImg ? (
            <img 
              src={profileImg} 
              alt="Profiili" 
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100">
               <span className="text-5xl font-bold">{name.substring(0,1)}</span>
            </div>
          )}
        </div>
      </div>

      {/* YHTEYSTIEDOT */}
      <div className="bg-[#1a202c] text-white py-4 px-12 mt-0 flex gap-8 text-sm uppercase tracking-wider">
        {data?.phone && <span>{data.phone}</span>}
        {data?.email && <span>{data.email}</span>}
        {data?.location && <span>{data.location}</span>}
      </div>

      {/* SISÄLTÖ */}
      <div className="px-12 py-16 grid grid-cols-1 gap-10">
        <section>
          <h2 className="text-blue-600 font-bold uppercase tracking-widest text-xs mb-4">Profiili</h2>
          <p className="text-gray-700 leading-relaxed text-lg italic border-l-4 border-blue-100 pl-6">
            {aiData?.personal_description || "Ei kuvausta."}
          </p>
        </section>

        <section>
          <h2 className="text-blue-600 font-bold uppercase tracking-widest text-xs mb-4">Työkokemus</h2>
          <div 
            className="prose prose-blue max-w-none text-gray-800"
            dangerouslySetInnerHTML={{ __html: aiData?.experience_section || "" }}
          />
        </section>
      </div>
    </div>
  );
};

export default SimpleCVTemplate;
"use client";
import { useEffect, useState } from "react";
import React from "react";
import {
  UserFormData,
  AIData,
  EditMode,
} from "@/types";

interface SimpleCVTemplateProps {
  data?: UserFormData;
  aiData?: AIData;
  showEditControls: boolean;
  isEditing: boolean;
  editMode: EditMode | null;
  onContentChange?: (field: keyof UserFormData, value: string) => void;
}

const SimpleCVTemplate: React.FC<SimpleCVTemplateProps> = ({
  data,
  aiData,
  showEditControls,
  isEditing,
  editMode,
  onContentChange,
}) => {
  const [descriptionTop, setDescriptionTop] = useState(30);

  if (!data) {
    return <div>Ladataan CV:tä...</div>;
  }

  const validData: UserFormData = data || ({} as UserFormData);
  const validAiData: AIData = aiData || ({} as AIData);

  const getBackgroundImageForCV = () => {
    if (!validAiData.background_image) {
      return null;
    }

    if (validAiData.background_image.startsWith("data:image")) {
      return validAiData.background_image;
    }

    if (validAiData.background_image.startsWith("http")) {
      return validAiData.background_image;
    }

    if (validAiData.background_image_url) {
      return validAiData.background_image_url;
    }

    return validAiData.background_image;
  };

  const getProfileDisplay = () => {
    if (validData.profileImage) {
      return (
        <img
          src={validData.profileImage}
          alt="Profiilikuva"
          className="w-full h-full object-cover"
        />
      );
    }
    if (validAiData.profile_image) {
      return (
        <img
          src={validAiData.profile_image}
          alt="Profiilikuva"
          className="w-full h-full object-cover"
        />
      );
    }
    if (validAiData.profile_initials) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-4xl font-bold">
          {validAiData.profile_initials}
        </div>
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 text-4xl font-bold">
        CV
      </div>
    );
  };

  const backgroundImageUrl = getBackgroundImageForCV();

  return (
    <div
      className="cv-template-wrapper bg-white"
      style={{
        width: "210mm",
        height: "297mm",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isEditing && editMode === "content" && showEditControls && (
        <div
          style={{
            position: "fixed",
            right: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            background: "white",
            padding: "10px",
            borderRadius: "10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          <button
            onClick={() => setDescriptionTop(Math.max(-20, descriptionTop - 5))}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-bold text-lg"
            title="Siirrä tekstiä ylös"
          >
            ↑
          </button>
          <div className="text-xs text-center text-gray-600">
            Siirrä<br/>tekstiä
          </div>
          <button
            onClick={() => setDescriptionTop(Math.min(40, descriptionTop + 5))}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-bold text-lg"
            title="Siirrä tekstiä alas"
          >
            ↓
          </button>
        </div>
      )}

      {/* ✅ KORJATTU: Header 70mm -> 65mm */}
      <div
        className="header-section relative"
        style={{
          height: "65mm",
          backgroundImage: backgroundImageUrl
            ? ` url(${backgroundImageUrl})`
            : "linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(147, 51, 234, 0.9))",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "5mm",
          paddingTop: "0mm",
        }}
      >
        {/* ✅ KORJATTU: Profile 65mm -> 55mm */}
        <div
          className="profile-image-container"
          style={{
            width: "55mm",
            height: "55mm",
            borderRadius: "50%",
            overflow: "hidden",
            border: "5px solid white",
            boxShadow: "0 12px 24px rgba(0,0,0,0.3)",
          }}
        >
          {getProfileDisplay()}
        </div>
      </div>

      {/* ✅ KORJATTU: Name overlay 25mm -> 20mm */}
      <div
        className="name-overlay"
        style={{
          position: "absolute",
          top: "20mm",
          left: "30%",
          transform: "translateX(-50%)",
          textAlign: "center",
          zIndex: 10,
        }}
      >
        {isEditing && editMode === "content" && showEditControls ? (
          <input
            type="text"
            value={validData.name || ""}
            onChange={(e) => onContentChange?.("name", e.target.value)}
            className="bg-white/90 backdrop-blur-sm border-2 border-blue-600 text-gray-800 text-5xl font-bold mb-2 px-6 py-3 rounded-lg shadow-xl text-center"
            placeholder="Nimi"
            style={{ minWidth: "300px" }}
          />
        ) : (
          <h1 className="text-5xl font-bold mb-2 text-white drop-shadow-2xl px-8 py-3 bg-gradient-to-r from-blue-600/80 to-purple-600/80 backdrop-blur-sm rounded-lg">
            {validData.name || "Nimi"}
          </h1>
        )}
      </div>

      {/* ✅ KORJATTU: Contact bar 15mm -> 12mm */}
      <div
        className={`contact-bar bg-blue-600 text-white ${
          isEditing && editMode === "content" && showEditControls
            ? "overflow-x-auto"
            : ""
        }`}
        style={{
          height: "12mm",
          display: "flex",
          alignItems: "center",
          justifyContent: isEditing && editMode === "content" && showEditControls
            ? "flex-start"
            : "space-around",
          padding: "0 20mm",
          gap: isEditing ? "10px" : "0",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <div className="flex items-center gap-2 flex-shrink-0">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.774a11.05 11.05 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.05 18 3 13.95 3 8V5z" />
          </svg>
          {isEditing && editMode === "content" && showEditControls ? (
            <input
              type="text"
              value={validData.phone || ""}
              onChange={(e) => onContentChange?.("phone", e.target.value)}
              className="bg-white/20 border border-white/30 text-white px-2 py-1 rounded text-sm min-w-[120px]"
              placeholder="Puhelin"
            />
          ) : (
            <span className="text-sm font-medium whitespace-nowrap">
              {validData.phone || "Puhelin"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 10.941l7.997-5.057A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 5.059-8-5.059V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
          {isEditing && editMode === "content" && showEditControls ? (
            <input
              type="text"
              value={validData.email || ""}
              onChange={(e) => onContentChange?.("email", e.target.value)}
              className="bg-white/20 border border-white/30 text-white px-2 py-1 rounded text-sm min-w-[150px]"
              placeholder="Sähköposti"
            />
          ) : (
            <span className="text-sm font-medium whitespace-nowrap">
              {validData.email || "Sähköposti"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clipRule="evenodd"
            />
          </svg>
          {isEditing && editMode === "content" && showEditControls ? (
            <input
              type="text"
              value={validData.location || ""}
              onChange={(e) => onContentChange?.("location", e.target.value)}
              className="bg-white/20 border border-white/30 text-white px-2 py-1 rounded text-sm min-w-[120px]"
              placeholder="Sijainti"
            />
          ) : (
            <span className="text-sm font-medium whitespace-nowrap">
              {validData.location || "Sijainti"}
            </span>
          )}
        </div>

        {(validData.title || (isEditing && editMode === "content" && showEditControls)) && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {isEditing && editMode === "content" && showEditControls ? (
              <input
                type="text"
                value={validData.title || ""}
                onChange={(e) => onContentChange?.("title", e.target.value)}
                className="bg-white/20 border border-white/30 text-white px-2 py-1 rounded text-sm min-w-[150px]"
                placeholder="Ammattinimike"
              />
            ) : (
              <span className="text-sm font-medium whitespace-nowrap">
                {validData.title}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ✅ KORJATTU: Main content top 95+30 -> 77+30, maxHeight 165 -> 185 */}
      <div
        className="main-content"
        style={{
          position: "absolute",
          top: `${77 + descriptionTop}mm`,
          left: "25mm",
          right: "25mm",
          maxHeight: "185mm",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {validAiData.personal_description && (
          <div className="personal-description-container w-full">
            {isEditing && editMode === "content" && showEditControls ? (
              <textarea
                value={validAiData.personal_description || ""}
                onChange={(e) =>
                  onContentChange?.("personalDescription", e.target.value)
                }
                className="w-full p-4 border-2 border-gray-300 rounded-xl text-base leading-relaxed shadow-lg"
                style={{
                  minHeight: "100mm",
                  maxHeight: "140mm",
                  resize: "vertical",
                }}
                placeholder="Henkilökohtainen esittely..."
              />
            ) : (
              <p
                className="text-base leading-relaxed text-gray-700 text-center"
                style={{
                  maxHeight: "140mm",
                  overflow: "hidden",
                }}
              >
                {validAiData.personal_description}
              </p>
            )}
{/* --- LISÄÄ TÄMÄ KOODI PERSONAL DESCRIPTIONIN JÄLKEEN --- */}

{/* Kokemus ja koulutus -osiot */}
<div className="sections-container w-full mt-8 space-y-8">
  {validAiData.experience_section && (
    <div className="cv-section">
      <h3 className="text-xl font-bold text-blue-600 border-b-2 border-blue-100 mb-3 pb-1 uppercase tracking-wider text-center">
        Työkokemus
      </h3>
      <div 
        className="prose prose-sm max-w-none text-gray-700"
        dangerouslySetInnerHTML={{ __html: validAiData.experience_section }}
      />
    </div>
  )}

  {validAiData.education_section && (
    <div className="cv-section">
      <h3 className="text-xl font-bold text-blue-600 border-b-2 border-blue-100 mb-3 pb-1 uppercase tracking-wider text-center">
        Koulutus
      </h3>
      <div 
        className="prose prose-sm max-w-none text-gray-700"
        dangerouslySetInnerHTML={{ __html: validAiData.education_section }}
      />
    </div>
  )}

  {validAiData.skills_section && (
    <div className="cv-section">
      <h3 className="text-xl font-bold text-blue-600 border-b-2 border-blue-100 mb-3 pb-1 uppercase tracking-wider text-center">
        Osaaminen
      </h3>
      <div 
        className="prose prose-sm max-w-none text-gray-700"
        dangerouslySetInnerHTML={{ __html: validAiData.skills_section }}
      />
    </div>
  )}
</div>
            {/* ✅ KORJATTU: Allekirjoitus padding */}
            <div 
              className="signature-container mt-6 text-center"
              style={{
                paddingBottom: "8mm",
              }}
            >
              {isEditing && editMode === "content" && showEditControls ? (
                <input
                  type="text"
                  value={validData.name || ""}
                  onChange={(e) => onContentChange?.("name", e.target.value)}
                  className="text-4xl font-bold text-blue-600 italic px-4 py-2 border-2 border-gray-300 rounded-lg shadow-lg"
                  style={{
                    fontFamily: "Brush Script MT, Dancing Script, cursive",
                    lineHeight: "1.4",
                  }}
                  placeholder="Allekirjoitus"
                />
              ) : (
                <div
                  className="text-4xl font-bold italic"
                  style={{
                    fontFamily: "Brush Script MT, Dancing Script, cursive",
                    background: "linear-gradient(to right, #2563eb, #9333ea)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    lineHeight: "1.5",
                    paddingBottom: "6px",
                  }}
                >
                  {validData.name || ""}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleCVTemplate;
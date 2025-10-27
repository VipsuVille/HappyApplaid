"use client";
import { useEffect, useState } from "react";
import React from "react";
import {
  UserFormData,
  AIData,
  EditMode,
} from "@/types";

interface TechnicalCVTemplateProps {
  data?: UserFormData;
  aiData?: AIData;
  showEditControls: boolean;
  isEditing: boolean;
  editMode: EditMode | null;
  onContentChange?: (field: keyof UserFormData, value: string) => void;
}

const TechnicalCVTemplate: React.FC<TechnicalCVTemplateProps> = ({
  data,
  aiData,
  showEditControls,
  isEditing,
  editMode,
  onContentChange,
}) => {
  const [skillsTop, setSkillsTop] = useState(0); // Taitojen sijainti (mm ylhäältä)

  if (!data) {
    return <div>Ladataan CV:tä...</div>;
  }

  const validData: UserFormData = data || ({} as UserFormData);
  const validAiData: AIData = aiData || ({} as AIData);

  // Haetaan taustakuva samalla logiikalla kuin SimpleCVssä
  const getBackgroundImageForCV = () => {
    if (!validAiData.background_image) return null;
    if (validAiData.background_image.startsWith("http")) {
      return validAiData.background_image;
    }
    if (validAiData.background_image_url) {
      return validAiData.background_image_url;
    }
    return null;
  };

  // Profiilikuvan tai initiaalien näyttäminen
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
        <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white text-4xl font-bold">
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
  const seinaImagePath = '/mock-images/seina.png';

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
      {/* ✅ KIINTEÄT PAINIKKEET (VAIN EDIT-TILASSA) */}
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
            onClick={() => setSkillsTop(Math.max(-20, skillsTop - 5))}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 font-bold text-lg"
            title="Siirrä taitoja ylös"
          >
            ↑
          </button>
          <div className="text-xs text-center text-gray-600">
            Siirrä<br/>taitoja
          </div>
          <button
            onClick={() => setSkillsTop(Math.min(40, skillsTop + 5))}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 font-bold text-lg"
            title="Siirrä taitoja alas"
          >
            ↓
          </button>
        </div>
      )}

      {/* VASEN SARAKE (70mm) */}
      <div
        style={{
          width: "70mm",
          position: "absolute",
          height: "297mm",
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Profiilikuva */}
        <div
          style={{
            width: "70mm",
            height: "99mm",
            overflow: "hidden",
          }}
        >
          {getProfileDisplay()}
        </div>

        {/* Seinäkuva ja taidot */}
        <div
          style={{
            position: "relative",
            width: "70mm",
            height: "198mm",
          }}
        >
          {/* Seinäkuva taustalla */}
          <img
            src={seinaImagePath}
            alt="Taustakuva"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />

          {/* Taidot seinän päällä */}
          <div
            style={{
              position: "absolute",
              top: `${skillsTop}mm`,
              left: 0,
              padding: "5mm",
              width: "100%",
              maxHeight: "190mm",
              color: "white",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <h2
              style={{
                fontSize: "18pt",
                fontWeight: "bold",
                marginBottom: "3mm",
                color: "white",
                borderBottom: "2px solid white",
                paddingBottom: "2mm",
              }}
            >
              Osaaminen
            </h2>
            {isEditing && editMode === "content" && showEditControls ? (
              <textarea
                value={validData.skills || ""}
                onChange={(e) => onContentChange?.("skills", e.target.value)}
                className="w-full bg-white/10 border border-white/30 text-white p-2 rounded text-sm"
                style={{
                  minHeight: "150mm",
                  resize: "vertical",
                }}
                placeholder="Taidot..."
              />
            ) : (
              <div
                className="text-sm leading-relaxed"
                style={{ color: "white" }}
                dangerouslySetInnerHTML={{
                  __html: validAiData?.html?.skills_section || validData.skills || "",
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* OIKEA SARAKE (140mm) */}
      <div
        style={{
          marginLeft: "70mm",
          width: "140mm",
          height: "297mm",
          position: "relative",
        }}
      >
        {/* Header taustakuvalla */}
        <div
          style={{
            width: "140mm",
            height: "99mm",
            position: "relative",
            backgroundImage: backgroundImageUrl
              ? `url(${backgroundImageUrl})`
              : "linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(139, 92, 246, 0.9))",
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10mm",
          }}
        >
          {/* Nimi ja yhteystiedot */}
          <div style={{ textAlign: "center", color: "white", zIndex: 10 }}>
            {isEditing && editMode === "content" && showEditControls ? (
              <input
                type="text"
                value={validData.name || ""}
                onChange={(e) => onContentChange?.("name", e.target.value)}
                className="bg-white/90 border-2 border-indigo-600 text-gray-800 text-4xl font-bold px-6 py-3 rounded-lg text-center"
                placeholder="Nimi"
                style={{ minWidth: "200px" }}
              />
            ) : (
              <h1
                className="text-4xl font-bold mb-3 text-white drop-shadow-2xl"
                style={{
                  textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                }}
              >
                {validData.name || "Nimi"}
              </h1>
            )}

            {/* Yhteystiedot */}
            <div className="flex flex-col gap-2 text-sm text-white">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 10.941l7.997-5.057A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 5.059-8-5.059V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                {isEditing && editMode === "content" && showEditControls ? (
                  <input
                    type="text"
                    value={validData.email || ""}
                    onChange={(e) => onContentChange?.("email", e.target.value)}
                    className="bg-white/20 border border-white/30 text-white px-2 py-1 rounded text-sm"
                    placeholder="Sähköposti"
                  />
                ) : (
                  <span>{validData.email || "sähköposti@example.com"}</span>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.774a11.05 11.05 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.05 18 3 13.95 3 8V5z" />
                </svg>
                {isEditing && editMode === "content" && showEditControls ? (
                  <input
                    type="text"
                    value={validData.phone || ""}
                    onChange={(e) => onContentChange?.("phone", e.target.value)}
                    className="bg-white/20 border border-white/30 text-white px-2 py-1 rounded text-sm"
                    placeholder="Puhelin"
                  />
                ) : (
                  <span>{validData.phone || "+358 12 3456789"}</span>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
                    className="bg-white/20 border border-white/30 text-white px-2 py-1 rounded text-sm"
                    placeholder="Sijainti"
                  />
                ) : (
                  <span>{validData.location || "Helsinki, Suomi"}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sisältöalue */}
        <div
          style={{
            padding: "10mm",
            maxHeight: "190mm",
            overflow: "hidden",
          }}
        >
          {/* Työkokemus */}
          <div className="mb-6">
            <h2
              style={{
                fontSize: "18pt",
                fontWeight: "bold",
                color: "#4f46e5",
                borderBottom: "2px solid #4f46e5",
                paddingBottom: "2mm",
                marginBottom: "3mm",
              }}
            >
              Työkokemus
            </h2>
            {isEditing && editMode === "content" && showEditControls ? (
              <textarea
                value={validData.workExperience || ""}
                onChange={(e) => onContentChange?.("workExperience", e.target.value)}
                className="w-full border-2 border-gray-300 rounded p-2 text-sm"
                style={{ minHeight: "40mm", resize: "vertical" }}
                placeholder="Työkokemus..."
              />
            ) : (
              <div
                className="text-sm leading-relaxed text-gray-700"
                dangerouslySetInnerHTML={{
                  __html: validAiData?.html?.experience_section || validData.workExperience || "",
                }}
              />
            )}
          </div>

          {/* Koulutus */}
          <div className="mb-6">
            <h2
              style={{
                fontSize: "18pt",
                fontWeight: "bold",
                color: "#4f46e5",
                borderBottom: "2px solid #4f46e5",
                paddingBottom: "2mm",
                marginBottom: "3mm",
              }}
            >
              Koulutus
            </h2>
            {isEditing && editMode === "content" && showEditControls ? (
              <textarea
                value={validData.education || ""}
                onChange={(e) => onContentChange?.("education", e.target.value)}
                className="w-full border-2 border-gray-300 rounded p-2 text-sm"
                style={{ minHeight: "30mm", resize: "vertical" }}
                placeholder="Koulutus..."
              />
            ) : (
              <div
                className="text-sm leading-relaxed text-gray-700"
                dangerouslySetInnerHTML={{
                  __html: validAiData?.html?.education_section || validData.education || "",
                }}
              />
            )}
          </div>

          {/* Kielet */}
          {(validData.languages || validAiData?.html?.languages_section) && (
            <div>
              <h2
                style={{
                  fontSize: "18pt",
                  fontWeight: "bold",
                  color: "#4f46e5",
                  borderBottom: "2px solid #4f46e5",
                  paddingBottom: "2mm",
                  marginBottom: "3mm",
                }}
              >
                Kielet
              </h2>
              {isEditing && editMode === "content" && showEditControls ? (
                <textarea
                  value={validData.languages || ""}
                  onChange={(e) => onContentChange?.("languages", e.target.value)}
                  className="w-full border-2 border-gray-300 rounded p-2 text-sm"
                  style={{ minHeight: "20mm", resize: "vertical" }}
                  placeholder="Kielet..."
                />
              ) : (
                <div
                  className="text-sm leading-relaxed text-gray-700"
                  dangerouslySetInnerHTML={{
                    __html: validAiData?.html?.languages_section || validData.languages || "",
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicalCVTemplate;
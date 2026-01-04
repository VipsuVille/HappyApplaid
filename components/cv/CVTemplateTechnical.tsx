"use client";
import React, { useState } from "react";
import { UserFormData, AIData, EditMode } from "@/types";

interface TechnicalCVTemplateProps {
  data: UserFormData;
  aiData: AIData;
  isEditing: boolean;
  showEditControls: boolean;
  editMode: EditMode | null;
  onContentChange?: (field: keyof UserFormData, value: any) => void;
}

const TechnicalCVTemplate: React.FC<TechnicalCVTemplateProps> = ({
  data,
  aiData,
  isEditing,
  showEditControls,
  editMode,
  onContentChange,
}) => {
  const [skillsTop, setSkillsTop] = useState(0);

  /* ============================================================
     IMAGE HANDLING – IDENTICAL LOGIC TO SimpleCVTemplate
  ============================================================ */

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
    const sources = [
      (data as any)?.profile_image,
      data?.profileImage,
      (data as any)?.photo,
      aiData?.profile_image,
      (aiData?.html as any)?.profile_image,
    ];

    for (const src of sources) {
      if (!isValidImage(src)) continue;
      return String(src).trim();
    }
    return null;
  };

  const getBackgroundImage = (): string | null => {
    const sources = [
      (data as any)?.background_image,
      data?.backgroundImage,
      aiData?.background_image,
      aiData?.background_image_url,
      (aiData?.html as any)?.background_image,
    ];

    for (const src of sources) {
      if (!isValidImage(src)) continue;
      return String(src).trim();
    }
    return null;
  };

  const profileImg = getProfileImage();
  const bgImage = getBackgroundImage();

  /* ============================================================
     AI CONTENT – IDENTICAL LOGIC TO SimpleCVTemplate
  ============================================================ */

  const getAIContent = (field: keyof AIData): string => {
    let content = aiData?.[field];

    if (!content && aiData?.html) {
      content = aiData.html[field as keyof typeof aiData.html];
    }

    if (typeof content === "string" && content.trim()) {
      if (content.toLowerCase().includes("error generating")) return "";
      if (content.trim().length < 20) return "";
      return content;
    }
    return "";
  };

  const name = data?.name || "Nimi";
  const title = data?.title || "Ammattinimike";

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div
      className="bg-white mx-auto relative overflow-hidden shadow-2xl"
      style={{
        width: "210mm",
        height: "297mm",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      {/* EDIT CONTROLS */}
      {isEditing && showEditControls && editMode === "content" && (
        <div
          className="fixed right-6 top-1/2 -translate-y-1/2 z-50 bg-white p-3 rounded-xl shadow-lg flex flex-col gap-2"
        >
          <button
            onClick={() => setSkillsTop((v) => Math.max(-20, v - 5))}
            className="px-3 py-1 bg-gray-800 text-white rounded"
          >
            ↑
          </button>
          <button
            onClick={() => setSkillsTop((v) => Math.min(40, v + 5))}
            className="px-3 py-1 bg-gray-800 text-white rounded"
          >
            ↓
          </button>
        </div>
      )}

      {/* LEFT COLUMN */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "70mm",
          height: "297mm",
          background: "#2f2b28",
          color: "white",
        }}
      >
        {/* PROFILE IMAGE */}
        <div style={{ width: "100%", height: "90mm", overflow: "hidden" }}>
          {profileImg ? (
            <img
              src={profileImg}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-bold bg-gray-600">
              {name.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* SKILLS */}
        {getAIContent("skills_section") && (
          <div
            style={{
              padding: "8mm",
              position: "relative",
              top: `${skillsTop}mm`,
            }}
          >
            <h2
              style={{
                fontSize: "14pt",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                borderBottom: "1px solid rgba(255,255,255,0.6)",
                paddingBottom: "4mm",
                marginBottom: "6mm",
              }}
            >
              Skills
            </h2>

            <div
              style={{
                fontSize: "10pt",
                lineHeight: 1.5,
              }}
              dangerouslySetInnerHTML={{
                __html: getAIContent("skills_section"),
              }}
            />
          </div>
        )}
      </div>

      {/* RIGHT COLUMN */}
      <div
        style={{
          marginLeft: "70mm",
          width: "140mm",
          height: "297mm",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            height: "90mm",
            position: "relative",
            backgroundImage: bgImage
              ? `url(${bgImage})`
              : "linear-gradient(135deg, #444, #111)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            color: "white",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 10,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "10mm",
            }}
          >
            <h1 style={{ fontSize: "32pt", fontWeight: "bold" }}>{name}</h1>
            <p style={{ fontSize: "14pt", marginTop: "4mm" }}>{title}</p>

            <div
              style={{
                marginTop: "6mm",
                fontSize: "9pt",
                opacity: 0.9,
                display: "flex",
                gap: "10mm",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <span>{data?.email}</span>
              <span>{data?.phone}</span>
              <span>{data?.location}</span>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ padding: "10mm" }}>
          {getAIContent("experience_section") && (
            <section style={{ marginBottom: "8mm" }}>
              <h2 className="text-sm font-bold uppercase border-b pb-1 mb-2">
                Experience
              </h2>
              <div
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: getAIContent("experience_section"),
                }}
              />
            </section>
          )}

          {getAIContent("education_section") && (
            <section style={{ marginBottom: "8mm" }}>
              <h2 className="text-sm font-bold uppercase border-b pb-1 mb-2">
                Education
              </h2>
              <div
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: getAIContent("education_section"),
                }}
              />
            </section>
          )}

          {getAIContent("languages_section") && (
            <section>
              <h2 className="text-sm font-bold uppercase border-b pb-1 mb-2">
                Languages
              </h2>
              <div
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: getAIContent("languages_section"),
                }}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicalCVTemplate;

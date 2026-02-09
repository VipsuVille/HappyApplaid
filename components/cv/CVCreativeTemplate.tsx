import React from 'react';
import { UserFormData, AIData, EditMode } from '@/types';

interface CreativeCVTemplateProps {
  data: UserFormData;
  aiData: AIData;
  isEditing: boolean;
  showEditControls?: boolean;
  editMode?: EditMode | null;
  onUpdate?: (field: string, value: any) => void;
  profileImage?: string;
  backgroundImage?: string;
}

const CreativeCVTemplate: React.FC<CreativeCVTemplateProps> = ({
  data,
  aiData,
  isEditing,
  onUpdate,
  profileImage,
  backgroundImage
}) => {
  
  // ✅ MUOKKAUSFUNKTIO
  const handleBlur = (path: string, e: React.FocusEvent<HTMLElement>) => {
    const newValue = e.currentTarget.innerText;
    if (onUpdate) {
      onUpdate(path, newValue);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // IMAGE HANDLING
  // ════════════════════════════════════════════════════════════════
  
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
      profileImage,
      (data as any)?.profile_image,
      data?.profileImage,
      (data as any)?.photo,
      aiData?.profile_image,
      (aiData?.html as any)?.profile_image,
    ];

    for (const src of sources) {
      if (!isValidImage(src)) continue;
      const srcStr = String(src).trim();
      if (srcStr.startsWith("http") && srcStr.includes("data:image")) continue;
      return srcStr;
    }
    return null;
  };

  const getBackgroundImage = (): string | null => {
    const sources = [
      backgroundImage,
      (data as any)?.background_image,
      data?.backgroundImage,
      aiData?.background_image,
      aiData?.background_image_url,
      (aiData?.html as any)?.background_image,
    ];

    for (const src of sources) {
      if (!isValidImage(src)) continue;
      const srcStr = String(src).trim();
      if (srcStr.startsWith("http") && srcStr.includes("data:image")) continue;
      return srcStr;
    }
    return null;
  };

  const profileImg = getProfileImage();
  const bgImage = getBackgroundImage();

  // ════════════════════════════════════════════════════════════════
  // AI CONTENT HANDLING
  // ════════════════════════════════════════════════════════════════
  
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

  const name = data?.name || "NIMI";
  const title = data?.title || "Ammattinimike";

  return (
    <div
      className="bg-white shadow-2xl"
      style={{
        width: '210mm',
        height: '297mm',
        display: 'flex',
        overflow: 'hidden',
        fontFamily: "'Arial', sans-serif",
      }}
    >
      {/* VASEN SIDEBAR (TUMMA) */}
      <div className="relative text-white" style={{ width: '80mm', backgroundColor: '#3d3d3d' }}>
        {bgImage && (
          <>
            <img src={bgImage} className="absolute inset-0 w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-black/60" />
          </>
        )}

        <div className="relative z-10 flex flex-col h-full">
          
          {/* PROFIILIKUVA + NIMI */}
          <div className="pt-12 pb-8 flex flex-col items-center border-b-4 border-white/20" style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)'}}>
            <div className="absolute top-0 left-0 w-full h-20 overflow-hidden">
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 transform rotate-45"></div>
            </div>

            {/* Profile Image */}
            <div className="w-32 h-32 rounded-full border-4 border-lime-400 overflow-hidden shadow-2xl mb-4 bg-gray-200">
              {profileImg ? (
                <img src={profileImg} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-600">
                  {name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Name */}
            <h1 
              contentEditable={isEditing}
              onBlur={(e) => handleBlur("name", e)}
              suppressContentEditableWarning
              className="text-white text-3xl font-bold tracking-wide text-center px-4"
            >
              {name.toUpperCase()}
            </h1>

            {/* Title */}
            <p 
              contentEditable={isEditing}
              onBlur={(e) => handleBlur("title", e)}
              suppressContentEditableWarning
              className="text-white/90 text-base mt-2 text-center px-4"
            >
              {title}
            </p>
          </div>

          {/* YHTEYSTIEDOT */}
          <div className="px-6 py-6 space-y-3 text-sm border-b border-white/10">
            <div className="flex items-start gap-3">
              <div className="text-lime-400 mt-0.5">📞</div>
              <div 
                contentEditable={isEditing}
                onBlur={(e) => handleBlur("phone", e)}
                suppressContentEditableWarning
                className="flex-1 text-white/90"
              >
                {data?.phone || '—'}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="text-lime-400 mt-0.5">✉️</div>
              <div 
                contentEditable={isEditing}
                onBlur={(e) => handleBlur("email", e)}
                suppressContentEditableWarning
                className="flex-1 break-all text-white/90 text-xs"
              >
                {data?.email || '—'}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="text-lime-400 mt-0.5">📍</div>
              <div 
                contentEditable={isEditing}
                onBlur={(e) => handleBlur("location", e)}
                suppressContentEditableWarning
                className="flex-1 text-white/90"
              >
                {data?.location || '—'}
              </div>
            </div>
          </div>

          {/* EDUCATION */}
          {getAIContent("education_section") && (
            <div className="px-6 py-6 border-b border-white/10">
              <h3 className="text-lime-400 font-bold uppercase text-xs tracking-wider mb-4 flex items-center gap-2">
                🎓 Education
              </h3>
              <div 
                className="text-white/80 text-xs leading-relaxed prose-invert prose-sm max-w-none"
                style={{fontSize: '11px'}}
                dangerouslySetInnerHTML={{ __html: getAIContent("education_section") }}
              />
            </div>
          )}

          {/* SKILLS */}
          {getAIContent("skills_section") && (
            <div className="px-6 py-6 flex-1 overflow-auto">
              <h3 className="text-lime-400 font-bold uppercase text-xs tracking-wider mb-4 flex items-center gap-2">
                🏆 Skills
              </h3>
              <div 
                className="text-white/80 text-xs leading-relaxed prose-invert prose-sm max-w-none"
                style={{fontSize: '11px'}}
                dangerouslySetInnerHTML={{ __html: getAIContent("skills_section") }}
              />
            </div>
          )}

          {/* LINKS */}
          <div className="px-6 py-4 border-t border-white/10 text-xs">
            <h3 className="text-lime-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              🔗 Links
            </h3>
            <div className="space-y-1 text-white/70">
              <div>📌 {name.toLowerCase().replace(/\s+/g, '-')}.com</div>
            </div>
          </div>
        </div>
      </div>

      {/* OIKEA PUOLI (VAALEA SISÄLTÖ) */}
      <div className="flex-1 bg-white text-gray-800 flex flex-col p-10">
        
        {/* PROFESSIONAL SUMMARY */}
        {getAIContent("personal_description") && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b-2 border-gray-300 flex items-center gap-2">
              📋 Professional summary
            </h2>
            <p 
              contentEditable={isEditing}
              onBlur={(e) => handleBlur("personal_description", e)}
              suppressContentEditableWarning
              className="text-gray-700 text-sm leading-relaxed"
            >
              {getAIContent("personal_description")}
            </p>
          </div>
        )}

        {/* EXPERIENCE */}
        {getAIContent("experience_section") && (
          <div className="mb-8 flex-1 overflow-auto">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 pb-2 border-b-2 border-gray-300 flex items-center gap-2">
              💼 Experience
            </h2>
            <div 
              className="text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none"
              style={{fontSize: '12px'}}
              dangerouslySetInnerHTML={{ __html: getAIContent("experience_section") }}
            />
          </div>
        )}

        {/* LANGUAGES */}
        {getAIContent("languages_section") && (
          <div className="mt-auto pt-6 border-t border-gray-200">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              🌍 Languages
            </h2>
            <div 
              className="text-gray-700 text-xs leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: getAIContent("languages_section") }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CreativeCVTemplate;
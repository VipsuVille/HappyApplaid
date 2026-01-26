// components/cover-letter/CoverLetterTemplate.tsx - ✨ KAUNIS VERSIO
"use client";
import React from "react";

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface CoverLetterData {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  jobTitle?: string;
  companyName?: string;
  content: string;
  title?: string;
  keyHighlights?: string[];
  language?: string;
  style?: 'professional' | 'casual' | 'creative';
}

interface CoverLetterTemplateProps {
  data: CoverLetterData;
  isEditing?: boolean;
  isPdfPreview?: boolean;
  onContentChange?: (field: keyof CoverLetterData, value: any) => void;
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

const CoverLetterTemplate: React.FC<CoverLetterTemplateProps> = ({
  data,
  isEditing = false,
  isPdfPreview = false,
  onContentChange,
}) => {
  const today = new Date().toLocaleDateString(
    data.language === 'english' ? 'en-US' : 'fi-FI',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  return (
    <div
      className="cover-letter-paper bg-white mx-auto relative"
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily: "'Merriweather', serif",
        color: "#1a202c",
        position: "relative",
      }}
    >
      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SININEN YLÄPALKKI (kuten CV:ssä) */}
      {/* ════════════════════════════════════════════════════════════════ */}
      
      <div 
        className="blue-bar"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "80px",
          background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      />

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* CONTENT WRAPPER */}
      {/* ════════════════════════════════════════════════════════════════ */}
      
      <div style={{ padding: "100px 50px 50px 50px", position: "relative", zIndex: 1 }}>
        
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* HEADER - Nimi ja yhteystiedot */}
        {/* ════════════════════════════════════════════════════════════════ */}
        
        <div className="mb-8">
          {/* Name */}
          {isEditing ? (
            <input
              className="text-4xl font-bold text-gray-900 w-full mb-3 px-2 py-1 border-b-2 border-gray-200 focus:border-blue-500 outline-none"
              value={data.name || ""}
              onChange={(e) => onContentChange?.("name", e.target.value)}
              placeholder="Your Name"
              style={{ fontFamily: "'Merriweather', serif" }}
            />
          ) : (
            <h1 
              className="text-4xl font-bold mb-3"
              style={{ 
                color: "#1e40af",
                fontFamily: "'Merriweather', serif",
              }}
            >
              {data.name}
            </h1>
          )}

          {/* Contact Details - Yksi rivi, kuten CV:ssä */}
          <div 
            className="flex flex-wrap gap-4 text-sm"
            style={{ 
              color: "#475569",
              fontFamily: "'Open Sans', sans-serif",
            }}
          >
            {data.email && (
              <div className="flex items-center gap-1.5">
                <span style={{ color: "#2563eb" }}>✉</span>
                {isEditing ? (
                  <input
                    className="px-1 border-b border-gray-300 outline-none bg-transparent"
                    value={data.email}
                    onChange={(e) => onContentChange?.("email", e.target.value)}
                  />
                ) : (
                  <span>{data.email}</span>
                )}
              </div>
            )}
            
            {data.phone && (
              <div className="flex items-center gap-1.5">
                <span style={{ color: "#2563eb" }}>☎</span>
                {isEditing ? (
                  <input
                    className="px-1 border-b border-gray-300 outline-none bg-transparent"
                    value={data.phone}
                    onChange={(e) => onContentChange?.("phone", e.target.value)}
                  />
                ) : (
                  <span>{data.phone}</span>
                )}
              </div>
            )}
            
            {data.location && (
              <div className="flex items-center gap-1.5">
                <span style={{ color: "#2563eb" }}>📍</span>
                {isEditing ? (
                  <input
                    className="px-1 border-b border-gray-300 outline-none bg-transparent"
                    value={data.location}
                    onChange={(e) => onContentChange?.("location", e.target.value)}
                  />
                ) : (
                  <span>{data.location}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Erotinviiva */}
        <div 
          className="mb-8"
          style={{
            height: "2px",
            background: "linear-gradient(to right, #2563eb, transparent)",
            opacity: 0.3,
          }}
        />

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* PÄIVÄMÄÄRÄ & VASTAANOTTAJA */}
        {/* ════════════════════════════════════════════════════════════════ */}
        
        <div className="mb-8" style={{ fontSize: "10pt", color: "#64748b" }}>
          <p className="mb-4">{today}</p>
          
          {data.companyName && (
            <div>
              {isEditing ? (
                <input
                  className="font-semibold text-gray-900 px-1 border-b border-gray-300 outline-none mb-1 w-full"
                  value={data.companyName}
                  onChange={(e) => onContentChange?.("companyName", e.target.value)}
                  placeholder="Company Name"
                />
              ) : (
                <p className="font-semibold" style={{ color: "#1e293b" }}>
                  {data.companyName}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* OTSIKKO (jos on) */}
        {/* ════════════════════════════════════════════════════════════════ */}
        
        {data.title && (
          <div className="mb-6">
            {isEditing ? (
              <input
                className="text-lg font-semibold text-gray-900 w-full px-2 py-1 border-b-2 border-gray-200 outline-none"
                value={data.title}
                onChange={(e) => onContentChange?.("title", e.target.value)}
                placeholder="Subject / Title"
              />
            ) : (
              <p 
                className="text-lg font-semibold"
                style={{ 
                  color: "#1e40af",
                  fontFamily: "'Merriweather', serif",
                }}
              >
                {data.title}
              </p>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* PÄÄSISÄLTÖ - Kirjeen teksti */}
        {/* ════════════════════════════════════════════════════════════════ */}
        
        <div className="mb-12">
          {isEditing ? (
            <textarea
              className="w-full min-h-[400px] p-4 border-2 border-gray-200 rounded-lg outline-none focus:border-blue-500"
              value={data.content || ""}
              onChange={(e) => onContentChange?.("content", e.target.value)}
              placeholder="Write your cover letter content here..."
              style={{
                lineHeight: "1.8",
                fontSize: "11pt",
                fontFamily: "'Merriweather', serif",
                color: "#334155",
              }}
            />
          ) : (
            <div 
              className="prose prose-lg max-w-none"
              style={{
                lineHeight: "1.8",
                fontSize: "11pt",
                fontFamily: "'Merriweather', serif",
                color: "#334155",
              }}
            >
              {data.content.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="mb-4" style={{ textAlign: "justify" }}>
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* AVAINOSAAMISET (jos on) */}
        {/* ════════════════════════════════════════════════════════════════ */}
        
        {data.keyHighlights && data.keyHighlights.length > 0 && !isEditing && (
          <div 
            className="mb-12 p-5 rounded-lg"
            style={{
              background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
              borderLeft: "4px solid #2563eb",
            }}
          >
            <h3 
              className="text-sm font-bold uppercase tracking-wide mb-3"
              style={{ 
                color: "#1e40af",
                fontFamily: "'Open Sans', sans-serif",
              }}
            >
              {data.language === 'english' ? 'Key Strengths' : 'Avainosaamisalueet'}
            </h3>
            <ul className="space-y-2">
              {data.keyHighlights.map((highlight, idx) => (
                <li 
                  key={idx} 
                  className="flex items-start gap-2 text-sm"
                  style={{ 
                    color: "#475569",
                    fontFamily: "'Merriweather', serif",
                  }}
                >
                  <span style={{ color: "#2563eb", fontWeight: "bold" }}>✓</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* ALLEKIRJOITUS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        
        <div className="mt-12">
          <p 
            className="mb-8"
            style={{ 
              color: "#475569",
              fontSize: "11pt",
              fontFamily: "'Merriweather', serif",
            }}
          >
            {data.language === 'english' ? 'Sincerely,' : 'Ystävällisin terveisin,'}
          </p>
          
          <p 
            className="text-3xl"
            style={{ 
              fontFamily: "'Brush Script MT', cursive",
              color: "#2563eb",
              opacity: 0.8,
            }}
          >
            {data.name}
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* FOOTER - Ohut sininen viiva */}
      {/* ════════════════════════════════════════════════════════════════ */}
      
      <div 
        style={{
          position: "absolute",
          bottom: "30px",
          left: "50px",
          right: "50px",
          height: "2px",
          background: "linear-gradient(to right, #2563eb, transparent)",
          opacity: 0.2,
        }}
      />

      {/* PDF Debug */}
      {isPdfPreview && process.env.NODE_ENV === 'development' && (
        <div 
          style={{
            position: "absolute",
            top: "5px",
            right: "5px",
            fontSize: "8px",
            color: "#94a3b8",
            background: "#fef3c7",
            padding: "2px 6px",
            borderRadius: "3px",
          }}
        >
          PDF Mode
        </div>
      )}
    </div>
  );
};

export default CoverLetterTemplate;
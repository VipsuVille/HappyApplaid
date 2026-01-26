// components/cover-letter/CoverLetterTemplate.tsx - ✨ KORJATTU VERSIO
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
  
  // ✅ UUSI: Layout & väri asetukset
  headerColor?: string; // Harmaan laatikon väri
  headerLayout?: 'top' | 'left'; // Ylhäällä vai vasemmalla
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

  const headerColor = data.headerColor || "#E8E6E1";
  const headerLayout = data.headerLayout || "top";

  // ✅ Tarkista onko general-letter (ei companyName)
  const isGeneral = !data.companyName;

  return (
    <div
      className="cover-letter-paper bg-white mx-auto relative"
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily: "'Merriweather', serif",
        color: "#1a202c",
      }}
    >
      {/* ════════════════════════════════════════════════════════════════ */}
      {/* HEADER - Top layout */}
      {/* ════════════════════════════════════════════════════════════════ */}
      
      {headerLayout === 'top' && (
        <div 
          className="header-box"
          style={{
            background: headerColor,
            padding: "40px 50px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          {/* Vasen: Nimi */}
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <input
                className="text-5xl font-bold w-full px-2 py-1 border-b-2 border-gray-400 focus:border-blue-500 outline-none bg-transparent"
                value={data.name || ""}
                onChange={(e) => onContentChange?.("name", e.target.value)}
                placeholder="Etunimi Sukunimi"
                style={{ 
                  fontFamily: "'Merriweather', serif",
                  color: "#2C3E50",
                }}
              />
            ) : (
              <h1 
                style={{ 
                  fontSize: "48px",
                  fontWeight: "bold",
                  color: "#2C3E50",
                  fontFamily: "'Merriweather', serif",
                  lineHeight: "1.2",
                  margin: 0,
                }}
              >
                {data.name.split(' ')[0]}<br />
                {data.name.split(' ').slice(1).join(' ')}
              </h1>
            )}
          </div>

          {/* Oikea: Yhteystiedot */}
          <div 
            style={{ 
              textAlign: "right",
              fontSize: "11pt",
              color: "#5A6C7D",
              fontFamily: "'Open Sans', sans-serif",
              lineHeight: "1.8",
            }}
          >
            {data.email && (
              <div style={{ marginBottom: "8px" }}>
                {isEditing ? (
                  <input
                    className="px-1 border-b border-gray-400 outline-none bg-transparent text-right"
                    value={data.email}
                    onChange={(e) => onContentChange?.("email", e.target.value)}
                    style={{ width: "200px" }}
                  />
                ) : (
                  <span>[{data.email}]</span>
                )}
              </div>
            )}
            
            {data.phone && (
              <div style={{ marginBottom: "8px" }}>
                {isEditing ? (
                  <input
                    className="px-1 border-b border-gray-400 outline-none bg-transparent text-right"
                    value={data.phone}
                    onChange={(e) => onContentChange?.("phone", e.target.value)}
                    style={{ width: "200px" }}
                  />
                ) : (
                  <span>[{data.phone}]</span>
                )}
              </div>
            )}
            
            {data.location && (
              <div style={{ marginBottom: "8px" }}>
                {isEditing ? (
                  <input
                    className="px-1 border-b border-gray-400 outline-none bg-transparent text-right"
                    value={data.location}
                    onChange={(e) => onContentChange?.("location", e.target.value)}
                    style={{ width: "200px" }}
                  />
                ) : (
                  <span>[{data.location}]</span>
                )}
              </div>
            )}
            
            {/* LinkedIn placeholder */}
            <div style={{ color: "#5A6C7D", fontStyle: "italic", fontSize: "9pt" }}>
              [Mahd. LinkedIn profiili]
            </div>
          </div>
        </div>
      )}

      {/* ✅ TODO: Left layout (tulevaisuudessa) */}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SISÄLTÖALUE */}
      {/* ════════════════════════════════════════════════════════════════ */}
      
      <div style={{ padding: "50px 50px" }}>
        
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TYÖNIMIKE (jos on) */}
        {/* ════════════════════════════════════════════════════════════════ */}
        
        {data.jobTitle && (
          <div 
            style={{ 
              fontStyle: "italic",
              fontSize: "11pt",
              color: "#5A6C7D",
              marginBottom: "24px",
            }}
          >
            {isEditing ? (
              <input
                className="w-full px-1 border-b border-gray-300 outline-none bg-transparent italic"
                value={data.jobTitle}
                onChange={(e) => onContentChange?.("jobTitle", e.target.value)}
                placeholder="Työnimike"
              />
            ) : (
              <span>Työnhakemus [{data.jobTitle}]</span>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* VASTAANOTTAJA - ✅ Vain jos EI general-letter */}
        {/* ════════════════════════════════════════════════════════════════ */}
        
        {!isGeneral && (
          <div 
            style={{ 
              marginBottom: "24px",
              fontSize: "11pt",
              fontStyle: "italic",
              color: "#5A6C7D",
            }}
          >
            {data.companyName ? (
              isEditing ? (
                <input
                  className="w-full px-1 border-b border-gray-300 outline-none bg-transparent italic"
                  value={data.companyName}
                  onChange={(e) => onContentChange?.("companyName", e.target.value)}
                  placeholder="Yritys"
                />
              ) : (
                <span>Hei [Teijo Työnantaja / {data.companyName}],</span>
              )
            ) : (
              <span style={{ fontStyle: "italic" }}>Hei [Teijo Työnantaja / Yritys Oy],</span>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* PÄÄSISÄLTÖ */}
        {/* ════════════════════════════════════════════════════════════════ */}
        
        <div style={{ marginBottom: "40px" }}>
          {isEditing ? (
            <textarea
              className="w-full min-h-[500px] p-4 border-2 border-gray-200 rounded-lg outline-none focus:border-blue-500"
              value={data.content || ""}
              onChange={(e) => onContentChange?.("content", e.target.value)}
              placeholder="Kirjoita hakukirjeen sisältö tähän..."
              style={{
                lineHeight: "1.8",
                fontSize: "11pt",
                fontFamily: "'Merriweather', serif",
                color: "#2C3E50",
              }}
            />
          ) : (
            <div 
              style={{
                lineHeight: "1.8",
                fontSize: "11pt",
                fontFamily: "'Merriweather', serif",
                color: "#2C3E50",
              }}
            >
              {data.content.split('\n\n').map((paragraph, idx) => (
                <p 
                  key={idx} 
                  style={{ 
                    marginBottom: "16px",
                    textAlign: "justify",
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* ✅ POISTETTU: Avainosaamisalueet osio */}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* ALLEKIRJOITUS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        
        <div style={{ marginTop: "48px" }}>
          <p 
            style={{ 
              marginBottom: "24px",
              fontSize: "11pt",
              color: "#5A6C7D",
              fontStyle: "italic",
            }}
          >
            Ystävällisin terveisin,
          </p>
          
          <p 
            style={{ 
              fontSize: "14pt",
              fontStyle: "italic",
              color: "#2C3E50",
              fontFamily: "'Merriweather', serif",
            }}
          >
            {data.name}
          </p>
        </div>
      </div>

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
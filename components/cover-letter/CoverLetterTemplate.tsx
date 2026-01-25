"use client";
import React from "react";

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface CoverLetterData {
  // Header info
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  
  // Job info
  jobTitle?: string;
  companyName?: string;
  
  // AI content
  content: string; // The main letter text
  title?: string;
  keyHighlights?: string[];
  
  // Settings
  language?: string;
  style?: 'professional' | 'casual' | 'creative';
}

interface CoverLetterTemplateProps {
  data: CoverLetterData;
  isEditing?: boolean;
  isPdfPreview?: boolean; // ✅ LISÄTTY
  onContentChange?: (field: keyof CoverLetterData, value: any) => void;
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

const CoverLetterTemplate: React.FC<CoverLetterTemplateProps> = ({
  data,
  isEditing = false,
  isPdfPreview = false, // ✅ LISÄTTY
  onContentChange,
}) => {
  const today = new Date().toLocaleDateString(
    data.language === 'english' ? 'en-US' : 'fi-FI',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  return (
    <div
      className="cover-letter-paper bg-white mx-auto relative shadow-2xl"
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily: "'Inter', 'Helvetica', sans-serif",
        color: "#1a202c",
        padding: "25mm 20mm",
      }}
    >
      {/* ════════════════════════════════════════════════════════════════ */}
      {/* HEADER - Contact Info */}
      {/* ════════════════════════════════════════════════════════════════ */}
      
      <div className="mb-12">
        {/* Name */}
        {isEditing ? (
          <input
            className="text-3xl font-bold text-gray-900 w-full mb-2 px-2 py-1 border-b-2 border-gray-200 focus:border-blue-500 outline-none"
            value={data.name || ""}
            onChange={(e) => onContentChange?.("name", e.target.value)}
            placeholder="Your Name"
          />
        ) : (
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {data.name}
          </h1>
        )}

        {/* Contact Details */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {data.email && (
            <div className="flex items-center gap-1">
              <span>📧</span>
              {isEditing ? (
                <input
                  className="px-1 border-b border-gray-300 outline-none"
                  value={data.email}
                  onChange={(e) => onContentChange?.("email", e.target.value)}
                />
              ) : (
                <span>{data.email}</span>
              )}
            </div>
          )}
          
          {data.phone && (
            <div className="flex items-center gap-1">
              <span>📞</span>
              {isEditing ? (
                <input
                  className="px-1 border-b border-gray-300 outline-none"
                  value={data.phone}
                  onChange={(e) => onContentChange?.("phone", e.target.value)}
                />
              ) : (
                <span>{data.phone}</span>
              )}
            </div>
          )}
          
          {data.location && (
            <div className="flex items-center gap-1">
              <span>📍</span>
              {isEditing ? (
                <input
                  className="px-1 border-b border-gray-300 outline-none"
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

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* DATE & RECIPIENT */}
      {/* ════════════════════════════════════════════════════════════════ */}
      
      <div className="mb-8 text-sm text-gray-600">
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
              <p className="font-semibold text-gray-900">{data.companyName}</p>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SUBJECT LINE */}
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
            <p className="text-lg font-semibold text-gray-900">
              {data.title}
            </p>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ════════════════════════════════════════════════════════════════ */}
      
      <div className="mb-12">
        {isEditing ? (
          <textarea
            className="w-full min-h-[400px] p-4 border-2 border-gray-200 rounded-lg text-gray-800 leading-relaxed text-base outline-none focus:border-blue-500"
            value={data.content || ""}
            onChange={(e) => onContentChange?.("content", e.target.value)}
            placeholder="Write your cover letter content here..."
            style={{
              lineHeight: "1.8",
              fontSize: "11pt",
            }}
          />
        ) : (
          <div 
            className="prose prose-lg max-w-none"
            style={{
              lineHeight: "1.8",
              fontSize: "11pt",
            }}
          >
            {data.content.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="mb-4 text-gray-800">
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* KEY HIGHLIGHTS (Optional) */}
      {/* ════════════════════════════════════════════════════════════════ */}
      
      {data.keyHighlights && data.keyHighlights.length > 0 && !isEditing && (
        <div className="mb-12 p-6 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
          <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-3">
            {data.language === 'english' ? 'Key Strengths' : 'Avainosaamisalueet'}
          </h3>
          <ul className="space-y-2">
            {data.keyHighlights.map((highlight, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-blue-500 mt-0.5">✓</span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SIGNATURE */}
      {/* ════════════════════════════════════════════════════════════════ */}
      
      <div className="mt-12">
        <p className="text-gray-800 mb-8">
          {data.language === 'english' ? 'Sincerely,' : 'Ystävällisin terveisin,'}
        </p>
        
        <p className="text-2xl text-blue-700 opacity-80" 
           style={{ fontFamily: "'Brush Script MT', cursive" }}>
          {data.name}
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* FOOTER - Optional style indicator */}
      {/* ════════════════════════════════════════════════════════════════ */}
      
      {isEditing && (
        <div className="absolute bottom-4 right-4 text-xs text-gray-400">
          Style: {data.style || 'professional'}
        </div>
      )}

      {/* ✅ PDF DEBUG INFO (vain kehityksessä) */}
      {isPdfPreview && process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 text-xs text-gray-400 bg-yellow-100 px-2 py-1 rounded">
          PDF Mode
        </div>
      )}
    </div>
  );
};

export default CoverLetterTemplate;
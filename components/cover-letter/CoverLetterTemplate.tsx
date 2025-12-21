// components/cover-letter/CoverLetterTemplate.tsx - YKSINKERTAISTETTU
import React from 'react';
import DOMPurify from 'dompurify';

interface CoverLetterTemplateProps {
  data: {
    title: string;
    content: {
      job_description?: string;
      cover_letter_content?: string;
      applicant_info?: any;
      signature?: string;
      body: string;
    };
  };
  ai_data: {
    html: {
      content: string;
    };
    styles: {
      main_style: string;
    };
    personality_analysis?: any;
  };
  isEditing?: boolean;
  isPdfPreview?: boolean;
  onContentChange?: (field: string, value: string) => void;
}

const CoverLetterTemplate: React.FC<CoverLetterTemplateProps> = ({
  data,
  ai_data,
  isEditing = false,
  isPdfPreview = false,
  onContentChange
}) => {
  const renderSignature = () => {
    const name = data.content?.applicant_info?.name || 
                 data.content?.applicant_info?.full_name || 
                 'Hakija';
    const closing = 'Ystävällisin terveisin';

    if (isEditing) {
      return (
        <div className="signature-editor mt-8">
          <input
            type="text"
            value={name}
            onChange={(e) => onContentChange?.('content.applicant_info.name', e.target.value)}
            className="w-full border border-gray-300 rounded p-2"
            placeholder="Nimi"
          />
        </div>
      );
    }

    return (
      <div style={{ marginTop: '30px' }}>
        <div style={{ 
          fontSize: '10pt',
          color: '#555',
          marginBottom: '15px'
        }}>
          {closing}
        </div>
        
        <div style={{ 
          borderBottom: '2px solid #3498db', 
          width: '180px', 
          marginBottom: '8px',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        } as React.CSSProperties}></div>
        
        <div style={{ 
          fontFamily: '"Dancing Script", cursive', 
          fontSize: '18pt',
          color: '#2c3e50',
          fontWeight: 600,
        }}>
          {name}
        </div>
      </div>
    );
  };

  const getJobTitle = () => {
    if (data.content?.job_description) {
      const firstLine = data.content.job_description.split('\n')[0];
      return firstLine.substring(0, 60).trim();
    }
    return data.title || 'Työhakemus';
  };

  const renderContent = () => {
    if (isEditing) {
      return (
        <textarea
          value={data.content.body || ''}
          onChange={(e) => onContentChange?.('content.cover_letter_content', e.target.value)}
          className="w-full border border-gray-300 rounded p-2"
          rows={15}
          placeholder="Kirjoita hakukirjeen sisältö tähän..."
        />
      );
    }

    const bodyContent = data.content.body || '';
    
    if (isPdfPreview || typeof window === 'undefined') {
      return (
        <div 
          style={{
            fontFamily: '"Merriweather", serif',
            fontSize: '10pt',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
          }}
          dangerouslySetInnerHTML={{ __html: bodyContent }} 
        />
      );
    }
    
    const cleanHtml = DOMPurify.sanitize(bodyContent);
    return (
      <div 
        style={{
          fontFamily: '"Merriweather", serif',
          fontSize: '10pt',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
        }}
        dangerouslySetInnerHTML={{ __html: cleanHtml }} 
      />
    );
  };

  return (
    <div style={{
      width: '210mm',
      height: '297mm',
      boxSizing: 'border-box',
      fontFamily: '"Merriweather", serif',
      backgroundColor: 'white',
      color: '#333',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ✅ FONTTIEN LATAUS */}
      <link
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Merriweather:wght@300;400;600&display=swap"
        rel="stylesheet"
      />

      {/* ✅ GLOBAL STYLES */}
      <style>
        {`
          @media print {
            body {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }

          .cover-letter-content p {
            margin-bottom: 12px;
            line-height: 1.5;
          }
        `}
      </style>

      {/* ✅ PADDING - Optimoitu tilankäyttö */}
      <div style={{ 
        padding: '18mm 20mm 15mm 20mm',
        height: '100%', 
        boxSizing: 'border-box'
      }}>
        {isEditing ? (
          <div>
            <h1>
              <input
                type="text"
                value={getJobTitle()}
                onChange={(e) => onContentChange?.('title', e.target.value)}
                className="w-full border-b-2 border-gray-300 focus:border-blue-500 outline-none text-xl font-bold mb-4"
                placeholder="Hakukirjeen otsikko"
              />
            </h1>
            {renderContent()}
            {renderSignature()}
          </div>
        ) : (
          <>
            {/* ✅ OTSIKKO */}
            <h1 style={{ 
              fontSize: '14pt', 
              fontWeight: '600', 
              marginBottom: '18px',
              color: '#2c3e50',
              borderBottom: '2px solid #3498db',
              paddingBottom: '8px',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            } as React.CSSProperties}>
              {getJobTitle()}
            </h1>
            
            {/* ✅ SISÄLTÖ */}
            <div className="cover-letter-content">
              {renderContent()}
            </div>
            
            {/* ✅ ALLEKIRJOITUS */}
            {renderSignature()}
          </>
        )}
      </div>
    </div>
  );
};

export default CoverLetterTemplate;
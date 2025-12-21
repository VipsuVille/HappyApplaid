// components/cover-letter/CoverLetterTemplate.tsx - KORJATTU RAKENNE
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
          fontSize: '11pt',
          color: '#555',
          marginBottom: '16px',
          fontFamily: '"Merriweather", serif',
        }}>
          {closing}
        </div>
        
        <div style={{ 
          borderBottom: '3px solid #3498db', 
          width: '180px', 
          marginBottom: '8px',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        } as React.CSSProperties}></div>
        
        <div style={{ 
          fontFamily: '"Dancing Script", cursive', 
          fontSize: '22pt',
          color: '#2c3e50',
          fontWeight: 700,
          letterSpacing: '0.5px',
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
            fontSize: '11pt',
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
            color: '#2c3e50',
            textAlign: 'justify',
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
          fontSize: '11pt',
          lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
          color: '#2c3e50',
          textAlign: 'justify',
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
      color: '#2c3e50',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ✅ FONTTIEN LATAUS */}
      <link
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Merriweather:wght@300;400;700&display=swap"
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
            margin-bottom: 16px;
            line-height: 1.65;
            text-indent: 0;
          }

          .cover-letter-content p:first-of-type {
            margin-top: 0;
          }

          .cover-letter-content p:last-of-type {
            margin-bottom: 0;
          }
        `}
      </style>

      {/* ✅ SISÄLTÖ - VAIN HAKUKIRJE */}
      <div style={{ 
        padding: '20mm 25mm 20mm 25mm',
        height: '100%', 
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
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
            {/* ✅ OTSIKKO - VAIN JOS ON OTSIKKO */}
            <h1 style={{ 
              fontSize: '16pt', 
              fontWeight: '700', 
              marginBottom: '20px',
              color: '#2c3e50',
              borderBottom: '3px solid #3498db',
              paddingBottom: '10px',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
              letterSpacing: '0.3px',
            } as React.CSSProperties}>
              {getJobTitle()}
            </h1>
            
            {/* ✅ SISÄLTÖ */}
            <div className="cover-letter-content" style={{ flex: 1, marginBottom: '20px' }}>
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
// components/cover-letter/CoverLetterTemplate.tsx
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
    personality_analysis?: {
      job_match_score?: number;
      personality_hooks?: string[];
      key_differentiators?: string[];
      data_quality?: {
        quality: string;
        score: number;
        personalityCompleteness: number;
      };
    };
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
  const pageStyle: React.CSSProperties = {
    width: '210mm',
    height: '297mm',
    boxSizing: 'border-box',
    fontFamily: '"Merriweather", serif',
    lineHeight: 1.5,
    backgroundColor: 'white',
    color: '#333',
    overflow: 'hidden',
    position: 'relative',
  };

  const contentStyle = ai_data?.styles?.main_style || '';

  const renderSignature = () => {
    const name = data.content?.applicant_info?.name || 'Hakija';
    const email = data.content?.applicant_info?.email || '';
    const closing = 'Ystävällisin terveisin';

    if (isEditing) {
      return (
        <div className="signature-editor mt-8">
          <h4 className="text-sm text-gray-600 mb-2">Allekirjoitus:</h4>
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
      <div className="signature-section" style={{ marginTop: '40px' }}>
        {/* Ystävällisin terveisin */}
        <div className="closing-text" style={{ 
          fontSize: '11pt',
          color: '#555',
          marginBottom: '20px', // ✅ Isompi väli ennen viivaa
          lineHeight: '1.2'
        }}>
          {closing}
        </div>
        
        {/* Allekirjoitusviiva */}
        <div className="signature-line" style={{ 
          borderBottom: '2px solid #3498db', 
          width: '230px', 
          marginBottom: '8px' // ✅ Pienempi väli viivan ja nimen välissä
        }}></div>
        
        {/* Allekirjoitus (kauniilla fontilla) */}
        <div className="signature-text" style={{ 
          fontFamily: '"Dancing Script", cursive', 
          fontSize: '22pt', // ✅ Hieman isompi
          color: '#2c3e50',
          marginBottom: '4px', // ✅ Pieni väli
          lineHeight: '1.2'
        }}>
          {name}
        </div>
        
        {/* Sähköposti (pienellä) */}
        {email && (
          <div style={{
            fontSize: '10pt',
            color: '#666',
            marginTop: '2px', // ✅ Hyvin pieni väli
            lineHeight: '1.2'
          }}>
            {email}
          </div>
        )}
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
    } else {
      const bodyContent = data.content.body || '';
      
      // ✅ PDF-TILASSA: EI SANITOIDA (luotetaan tietokantaan)
      if (isPdfPreview || typeof window === 'undefined') {
        return (
          <div 
            className="cover-letter-content" 
            dangerouslySetInnerHTML={{ __html: bodyContent }} 
          />
        );
      }
      
      // ✅ SELAIMESSA: SANITOIDAAN
      const cleanHtml = DOMPurify.sanitize(bodyContent);
      return (
        <div 
          className="cover-letter-content" 
          dangerouslySetInnerHTML={{ __html: cleanHtml }} 
        />
      );
    }
  };

  return (
    <div className="cover-letter-template" style={pageStyle} data-template-type="standard">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Merriweather:wght@300;400;700&display=swap');
          
          @media print {
            body, .cover-letter-template {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              page-break-after: avoid;
            }
            .no-print {
              display: none !important;
            }
          }
         
          .cover-letter-content {
            ${contentStyle}
            white-space: pre-wrap;
          }

          .cover-letter-template {
            position: relative;
            color: #333;
            background-image: linear-gradient(to bottom right, rgba(236, 240, 241, 0.1), rgba(255, 255, 255, 0.8));
          }

          .cover-letter-content h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 12px;
            margin-bottom: 30px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }

          .cover-letter-content p {
            margin-bottom: 16px;
            line-height: 1.7;
            letter-spacing: 0.2px;
          }

          .signature-section {
            margin-top: 50px;
            position: relative;
          }
          
          .signature-text {
            font-family: 'Dancing Script', cursive;
            font-size: 1.5rem;
            color: #2c3e50;
            font-weight: 600;
            text-shadow: 0 1px 1px rgba(0,0,0,0.1);
          }
          
          .cover-letter-content h1:after {
            content: '';
            display: block;
            width: 80px;
            height: 3px;
            background-color: #e74c3c;
            position: absolute;
            left: 0;
            margin-top: 12px;
          }
        `}
      </style>

      <div style={{ padding: '20mm', height: '100%', boxSizing: 'border-box' }}>
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
            <h1 className="text-2xl font-bold mb-6">{getJobTitle()}</h1>
            {renderContent()}
            {renderSignature()}
          </>
        )}
      </div>
    </div>
  );
};

export default CoverLetterTemplate;
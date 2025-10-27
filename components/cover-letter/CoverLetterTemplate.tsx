// components/cover-letter/CoverLetterTemplate.tsx - KORJATTU A4-KOKO
import React from 'react';
import DOMPurify from 'dompurify';
import { Sparkles, Target, Zap } from 'lucide-react';

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
  // ✅ KORJATTU: A4-koon maksimi (297mm miinus marginaalit)
  const pageStyle: React.CSSProperties = {
    width: '210mm',
    minHeight: '297mm',
    maxHeight: '297mm', // ✅ LISÄTTY: estää ylivuodon
    padding: '20mm',
    boxSizing: 'border-box',
    fontFamily: '"Merriweather", serif',
    lineHeight: 1.5,
    backgroundColor: 'white',
    color: '#333',
    overflow: 'hidden', // ✅ LISÄTTY: estää ylivuodon
  };

  const contentStyle = ai_data?.styles?.main_style || '';


  // ✅ KORJATTU: Allekirjoitus vain nimellä
  const renderSignature = () => {
    const name = data.content?.applicant_info?.name || 'Hakija';
    const closing = '';

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
      <div className="signature-section mt-10">
        <div className="closing-text mb-2" style={{ 
          fontSize: '1rem',
          color: '#555'
        }}>
          {closing}
        </div>
        <div className="signature-line mb-3" style={{ 
          borderBottom: '2px solid #3498db', 
          width: '230px', 
          marginBottom: '12px' 
        }}></div>
        <div className="signature-text" style={{ 
          fontFamily: '"Dancing Script", cursive', 
          fontSize: '1.5rem',
          color: '#2c3e50',
          marginBottom: '5px'
        }}>
          {name}
        </div>
      </div>
    );
  };

  // ✅ KORJATTU: Työpaikan otsikko jobDescriptionista
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
          style={{ maxHeight: '180mm' }} // ✅ Rajoita tekstikentän korkeus
        />
      );
    } else {
      const cleanHtml = DOMPurify.sanitize(data.content.body || '');
      return (
        <div 
          className="cover-letter-content" 
          style={{
            maxHeight: '200mm', // ✅ KORJATTU: Rajoita sisällön korkeus
            overflow: 'hidden', // ✅ Estä ylivuoto
          }}
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
              min-height: 297mm !important;
              max-height: 297mm !important;
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
            overflow: hidden;
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
  );
};

export default CoverLetterTemplate;
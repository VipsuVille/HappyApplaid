// components/cover-letter/CoverLetterTemplate.tsx
// ✅ FINAL: Sama renderöinti kuin edit-sivu, EI placeholdereita

'use client';

import React from 'react';

export interface CoverLetterData {
  name: string;
  email: string;
  phone: string;
  location: string;
  jobTitle?: string;
  companyName?: string;
  title?: string;
  content: string;
  keyHighlights?: string[];
  language?: string;
  style?: 'professional' | 'casual' | 'creative';
  headerColor?: string;
  headerLayout?: 'top' | 'left';
  sidebarContent?: 'contact' | 'highlights' | 'none';
}

interface CoverLetterTemplateProps {
  data: CoverLetterData;
  isPdfPreview?: boolean;
  isEditing?: boolean;
}

export default function CoverLetterTemplate({ 
  data, 
  isPdfPreview = false 
}: CoverLetterTemplateProps) {
  
  const headerColor = data.headerColor || 'rgb(181, 152, 79)';
  const headerLayout = data.headerLayout || 'top';
  const sidebarContent = data.sidebarContent || 'contact';
  
  const paragraphs = data.content?.split('\n\n').filter(p => p.trim()) || [];
  
  const today = new Date().toLocaleDateString('fi-FI', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const ContactInfo = ({ isTopLayout = false }: { isTopLayout?: boolean }) => (
    <div
      style={{
        textAlign: isTopLayout ? 'right' : 'left',
        fontSize: isTopLayout ? '11pt' : '9pt',
        color: '#5A6C7D',
        fontFamily: "'Open Sans', sans-serif",
        lineHeight: '1.8',
      }}
    >
      {data.email && (
        <div style={{ marginBottom: isTopLayout ? '8px' : '6px', wordBreak: 'break-word' }}>
          📧 {data.email}
        </div>
      )}
      {data.phone && (
        <div style={{ marginBottom: isTopLayout ? '8px' : '6px' }}>
          📞 {data.phone}
        </div>
      )}
    </div>
  );

  const KeyHighlights = ({ isTopLayout = false }: { isTopLayout?: boolean }) => {
    if (!data.keyHighlights || data.keyHighlights.length === 0) return null;
    
    return (
      <div style={{ width: '100%' }}>
        <h3
          style={{
            fontSize: isTopLayout ? '10pt' : '11pt',
            fontWeight: 'bold',
            color: '#2C3E50',
            marginBottom: '12px',
            textAlign: isTopLayout ? 'right' : 'center',
          }}
        >
          Vahvuudet
        </h3>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            fontSize: '9pt',
            color: '#5A6C7D',
            lineHeight: '1.6',
            textAlign: isTopLayout ? 'right' : 'left',
          }}
        >
          {data.keyHighlights.slice(0, 5).map((highlight, index) => (
            <li
              key={index}
              style={{
                marginBottom: '8px',
                display: 'flex',
                gap: '6px',
                justifyContent: isTopLayout ? 'flex-end' : 'flex-start',
              }}
            >
              {!isTopLayout && <span style={{ color: '#5A6C7D' }}>•</span>}
              <span style={{ flex: isTopLayout ? 0 : 1 }}>{highlight}</span>
              {isTopLayout && <span style={{ color: '#5A6C7D' }}>•</span>}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (headerLayout === 'top') {
    return (
      <div
        className="cover-letter-paper bg-white mx-auto relative"
        style={{
          width: '210mm',
          minHeight: '297mm',
          fontFamily: "'Merriweather', serif",
          color: '#1a202c',
        }}
      >
        <div
          className="header-box"
          style={{
            background: headerColor,
            padding: '40px 50px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#2C3E50',
                fontFamily: "'Merriweather', serif",
                lineHeight: '1.2',
                margin: 0,
              }}
            >
              {data.name.split(' ')[0]}
              <br />
              {data.name.split(' ').slice(1).join(' ')}
            </h1>
          </div>

          <div style={{ minWidth: '200px' }}>
            {sidebarContent === 'contact' && <ContactInfo isTopLayout={true} />}
            {sidebarContent === 'highlights' && <KeyHighlights isTopLayout={true} />}
          </div>
        </div>

        <div style={{ padding: '50px 50px' }}>
          <div
            style={{
              marginBottom: '24px',
              fontSize: '11pt',
              color: '#5A6C7D',
            }}
          >
            {today}
          </div>

          <div style={{ marginBottom: '40px' }}>
            <div
              style={{
                lineHeight: '1.8',
                fontSize: '11pt',
                fontFamily: "'Merriweather', serif",
                color: '#2C3E50',
              }}
            >
              {paragraphs.map((paragraph, idx) => (
                <p
                  key={idx}
                  style={{
                    marginBottom: '16px',
                    textAlign: 'justify',
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '48px' }}>
            <p
              style={{
                marginBottom: '24px',
                fontSize: '11pt',
                color: '#5A6C7D',
                fontStyle: 'italic',
              }}
            >
              Ystävällisin terveisin,
            </p>

            <p
              style={{
                fontSize: '14pt',
                fontStyle: 'italic',
                color: '#2C3E50',
                fontFamily: "'Merriweather', serif",
              }}
            >
              {data.name}
            </p>
          </div>
        </div>

        {isPdfPreview && process.env.NODE_ENV === 'development' && (
          <div
            style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              fontSize: '8px',
              color: '#94a3b8',
              background: '#fef3c7',
              padding: '2px 6px',
              borderRadius: '3px',
            }}
          >
            PDF Mode
          </div>
        )}
      </div>
    );
  }

  if (headerLayout === 'left') {
    return (
      <div
        className="cover-letter-paper bg-white mx-auto relative"
        style={{
          width: '210mm',
          height: '297mm',
          fontFamily: "'Merriweather', serif",
          color: '#1a202c',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '70mm',
            height: '100%',
            background: headerColor,
            padding: '40px 25px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#2C3E50',
                fontFamily: "'Merriweather', serif",
                lineHeight: '1.3',
                margin: 0,
              }}
            >
              {data.name}
            </h1>
          </div>

          {sidebarContent === 'contact' && (
            <div style={{ width: '100%', marginBottom: '30px' }}>
              <ContactInfo isTopLayout={false} />
            </div>
          )}
          
          {sidebarContent === 'highlights' && (
            <div style={{ width: '100%' }}>
              <KeyHighlights isTopLayout={false} />
            </div>
          )}
        </div>

        <div style={{ flex: 1, padding: '50px 40px', overflowY: 'auto' }}>
          <div
            style={{
              marginBottom: '24px',
              fontSize: '11pt',
              color: '#5A6C7D',
            }}
          >
            {today}
          </div>

          <div style={{ marginBottom: '40px' }}>
            <div
              style={{
                lineHeight: '1.8',
                fontSize: '11pt',
                fontFamily: "'Merriweather', serif",
                color: '#2C3E50',
              }}
            >
              {paragraphs.map((paragraph, idx) => (
                <p
                  key={idx}
                  style={{
                    marginBottom: '16px',
                    textAlign: 'justify',
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '48px' }}>
            <p
              style={{
                marginBottom: '24px',
                fontSize: '11pt',
                color: '#5A6C7D',
                fontStyle: 'italic',
              }}
            >
              Ystävällisin terveisin,
            </p>

            <p
              style={{
                fontSize: '14pt',
                fontStyle: 'italic',
                color: '#2C3E50',
                fontFamily: "'Merriweather', serif",
              }}
            >
              {data.name}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
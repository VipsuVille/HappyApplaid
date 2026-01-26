// components/cover-letter/CoverLetterTemplate.tsx
// ✅ FINAL: Valittavat vahvuudet/yhteystiedot + koko sivun mittainen left-layout

'use client';

import React from 'react';

export interface CoverLetterData {
  // Contact info
  name: string;
  email: string;
  phone: string;
  location: string;
  
  // Job details
  jobTitle?: string;
  companyName?: string;
  
  // Letter content
  title?: string;
  content: string;
  keyHighlights?: string[];
  
  // Styling
  language?: string;
  style?: 'professional' | 'casual' | 'creative';
  
  // ✅ HEADER CUSTOMIZATION
  headerColor?: string;
  headerLayout?: 'top' | 'left';
  
  // ✅ UUSI: Sidebar/header sisältö
  sidebarContent?: 'contact' | 'highlights' | 'none';
}

interface CoverLetterTemplateProps {
  data: CoverLetterData;
  isPdfPreview?: boolean;
  isEditing?: boolean;
}

export default function CoverLetterTemplate({ 
  data, 
  isPdfPreview = false,
  isEditing = false 
}: CoverLetterTemplateProps) {
  
  // ✅ DEFAULT VALUES
  const headerColor = data.headerColor || 'rgb(181, 152, 79)'; // Kultainen/pronssi
  const headerLayout = data.headerLayout || 'top';
  const sidebarContent = data.sidebarContent || 'contact'; // Oletus: yhteystiedot
  
  // Split content into paragraphs
  const paragraphs = data.content?.split('\n\n').filter(p => p.trim()) || [];
  
  // ✅ Tarkista onko general-letter (ei companyName)
  const isGeneral = !data.companyName;

  // ═══════════════════════════════════════════════════════════════
  // SHARED: Header/Sidebar sisältö komponentti
  // ═══════════════════════════════════════════════════════════════
  
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
          {isTopLayout ? `[${data.email}]` : data.email}
        </div>
      )}
      {data.phone && (
        <div style={{ marginBottom: isTopLayout ? '8px' : '6px' }}>
          {isTopLayout ? `[${data.phone}]` : data.phone}
        </div>
      )}
      {data.location && (
        <div style={{ marginBottom: isTopLayout ? '8px' : '6px' }}>
          {isTopLayout ? `[${data.location}]` : data.location}
        </div>
      )}
      {isTopLayout && (
        <div
          style={{
            color: '#5A6C7D',
            fontStyle: 'italic',
            fontSize: '9pt',
          }}
        >
          [Mahd. LinkedIn profiili]
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
            fontSize: isTopLayout ? '9pt' : '9pt',
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

  // ═══════════════════════════════════════════════════════════════
  // TOP LAYOUT (default) - Vaaka-asettelu
  // ═══════════════════════════════════════════════════════════════
  
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
        {/* ✅ HEADER - Top layout */}
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
          {/* Vasen: Nimi */}
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

          {/* ✅ Oikea: Yhteystiedot TAI Vahvuudet TAI tyhjä */}
          <div style={{ minWidth: '200px' }}>
            {sidebarContent === 'contact' && <ContactInfo isTopLayout={true} />}
            {sidebarContent === 'highlights' && <KeyHighlights isTopLayout={true} />}
            {/* Jos 'none', ei näytetä mitään */}
          </div>
        </div>

        {/* ✅ SISÄLTÖALUE */}
        <div style={{ padding: '50px 50px' }}>
          {/* Työnimike */}
          {data.jobTitle && (
            <div
              style={{
                fontStyle: 'italic',
                fontSize: '11pt',
                color: '#5A6C7D',
                marginBottom: '24px',
              }}
            >
              <span>Työnhakemus [{data.jobTitle}]</span>
            </div>
          )}

          {/* Vastaanottaja - vain jos EI general-letter */}
          {!isGeneral && data.companyName && (
            <div
              style={{
                marginBottom: '24px',
                fontSize: '11pt',
                fontStyle: 'italic',
                color: '#5A6C7D',
              }}
            >
              <span>Hei [Teijo Työnantaja / {data.companyName}],</span>
            </div>
          )}

          {/* PÄÄSISÄLTÖ */}
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

          {/* ALLEKIRJOITUS */}
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

        {/* PDF Debug */}
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

  // ═══════════════════════════════════════════════════════════════
  // LEFT LAYOUT (sidebar) - Pysty-asettelu
  // ═══════════════════════════════════════════════════════════════
  
  if (headerLayout === 'left') {
    return (
      <div
        className="cover-letter-paper bg-white mx-auto relative"
        style={{
          width: '210mm',
          height: '297mm', // ✅ KIINTEÄ korkeus = koko sivun mittainen väri
          fontFamily: "'Merriweather', serif",
          color: '#1a202c',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* ✅ LEFT SIDEBAR - KOKO SIVUN KORKUINEN */}
        <div
          style={{
            width: '70mm',
            height: '100%', // ✅ Koko sivun korkeus
            background: headerColor,
            padding: '40px 25px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          {/* Nimi */}
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

          {/* ✅ Yhteystiedot TAI Vahvuudet TAI tyhjä */}
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
          
          {/* Jos 'none', ei näytetä mitään */}
        </div>

        {/* ✅ MAIN CONTENT (right side) */}
        <div style={{ flex: 1, padding: '50px 40px', overflowY: 'auto' }}>
          {/* Työnimike */}
          {data.jobTitle && (
            <div
              style={{
                fontStyle: 'italic',
                fontSize: '11pt',
                color: '#5A6C7D',
                marginBottom: '24px',
              }}
            >
              <span>Työnhakemus [{data.jobTitle}]</span>
            </div>
          )}

          {/* Vastaanottaja */}
          {!isGeneral && data.companyName && (
            <div
              style={{
                marginBottom: '24px',
                fontSize: '11pt',
                fontStyle: 'italic',
                color: '#5A6C7D',
              }}
            >
              <span>Hei [Teijo Työnantaja / {data.companyName}],</span>
            </div>
          )}

          {/* PÄÄSISÄLTÖ */}
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

          {/* ALLEKIRJOITUS */}
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

        {/* PDF Debug */}
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

  // Fallback
  return null;
}
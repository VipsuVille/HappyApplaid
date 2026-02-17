// components/cover-letter/CoverLetterTemplate.tsx
// ✅ FANCY REDESIGN – sama interface, näyttävämpi ulkoasu
// ✅ UPDATED: fontSize, lineHeight & textAlign props now affect actual rendering

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
  // ✅ NEW: Typography controls
  fontSize?: number;
  lineHeight?: number;
  textAlign?: 'left' | 'justify' | 'center';
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
  
  const headerColor = data.headerColor || '#1a1a2e';
  const headerLayout = data.headerLayout || 'top';
  const sidebarContent = data.sidebarContent || 'contact';
  
  // ✅ FIX: Use provided fontSize/lineHeight/textAlign instead of hardcoded values
  const bodyFontSize = data.fontSize ?? 10.8;
  const bodyLineHeight = data.lineHeight ?? 1.85;
  const bodyTextAlign = data.textAlign ?? 'justify';
  
  const paragraphs = data.content?.split('\n\n').filter(p => p.trim()) || [];
  
  const today = new Date().toLocaleDateString('fi-FI', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Derive accent color from header
  const accentColor = headerColor;

  // Parse color for lighter tint
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    if (hex.startsWith('rgb')) {
      const match = hex.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (match) return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
    }
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  };

  const rgb = hexToRgb(accentColor);
  const accentLight = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)` : 'rgba(26, 26, 46, 0.08)';
  const accentMedium = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)` : 'rgba(26, 26, 46, 0.15)';

  const firstName = data.name.split(' ')[0] || '';
  const lastName = data.name.split(' ').slice(1).join(' ') || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0) || firstName.charAt(1) || ''}`.toUpperCase();

  // ✅ Scale contact font size proportionally
  const contactFontSize = Math.max(8, bodyFontSize * 0.88);

  // ✅ Paragraph spacing scales with font size
  const paragraphSpacing = Math.round(bodyFontSize * 1.6);

  const ContactInfo = ({ vertical = false }: { vertical?: boolean }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        gap: vertical ? '14px' : '28px',
        flexWrap: 'wrap',
        fontSize: `${contactFontSize}pt`,
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      {data.email && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          color: vertical ? '#64748b' : 'rgba(255,255,255,0.75)',
        }}>
          <span style={{ 
            width: '28px', 
            height: '28px', 
            borderRadius: '8px', 
            background: vertical ? accentLight : 'rgba(255,255,255,0.12)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '12px',
            flexShrink: 0,
          }}>✉</span>
          <span style={{ wordBreak: 'break-word' }}>{data.email}</span>
        </div>
      )}
      {data.phone && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          color: vertical ? '#64748b' : 'rgba(255,255,255,0.75)',
        }}>
          <span style={{ 
            width: '28px', 
            height: '28px', 
            borderRadius: '8px', 
            background: vertical ? accentLight : 'rgba(255,255,255,0.12)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '12px',
            flexShrink: 0,
          }}>☎</span>
          <span>{data.phone}</span>
        </div>
      )}
      {data.location && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          color: vertical ? '#64748b' : 'rgba(255,255,255,0.75)',
        }}>
          <span style={{ 
            width: '28px', 
            height: '28px', 
            borderRadius: '8px', 
            background: vertical ? accentLight : 'rgba(255,255,255,0.12)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '12px',
            flexShrink: 0,
          }}>⌖</span>
          <span>{data.location}</span>
        </div>
      )}
    </div>
  );

  const KeyHighlights = ({ dark = false }: { dark?: boolean }) => {
    if (!data.keyHighlights || data.keyHighlights.length === 0) return null;
    
    return (
      <div style={{ width: '100%' }}>
        <h3
          style={{
            fontSize: '8pt',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase' as const,
            color: dark ? 'rgba(255,255,255,0.5)' : '#94a3b8',
            marginBottom: '16px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Vahvuudet
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.keyHighlights.slice(0, 5).map((highlight, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '9pt',
                color: dark ? 'rgba(255,255,255,0.7)' : '#475569',
                fontFamily: "'DM Sans', sans-serif",
                lineHeight: '1.5',
              }}
            >
              <span style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: accentColor, 
                marginTop: '5px',
                flexShrink: 0,
              }} />
              <span>{highlight}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════
  // TOP LAYOUT – Dramatic header with geometric elements
  // ═══════════════════════════════════════════════
  if (headerLayout === 'top') {
    return (
      <div
        className="cover-letter-paper bg-white mx-auto relative"
        style={{
          width: '210mm',
          minHeight: '297mm',
          fontFamily: "'Libre Baskerville', 'Georgia', serif",
          color: '#1e293b',
          overflow: 'hidden',
        }}
      >
        {/* Decorative top-right geometric element */}
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          border: `2px solid ${accentMedium}`,
          opacity: 0.4,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          border: `1.5px solid ${accentMedium}`,
          opacity: 0.25,
          pointerEvents: 'none',
        }} />

        {/* HEADER */}
        <div
          className="header-box"
          style={{
            background: accentColor,
            padding: '44px 56px 40px',
            position: 'relative',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          {/* Subtle pattern overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 80px)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Name Row */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '24px',
              marginBottom: '8px',
            }}>
              {/* Monogram Circle */}
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.9)',
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '1px',
                flexShrink: 0,
              }}>
                {initials}
              </div>

              <div>
                <h1
                  style={{
                    fontSize: '34px',
                    fontWeight: 700,
                    color: '#ffffff',
                    fontFamily: "'Libre Baskerville', Georgia, serif",
                    lineHeight: '1.15',
                    margin: 0,
                    letterSpacing: '-0.5px',
                  }}
                >
                  {data.name}
                </h1>
                {(data.jobTitle || data.companyName) && (
                  <p style={{
                    margin: '6px 0 0',
                    fontSize: '10.5pt',
                    color: 'rgba(255,255,255,0.55)',
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 400,
                    letterSpacing: '0.5px',
                  }}>
                    {data.jobTitle}{data.jobTitle && data.companyName ? ' · ' : ''}{data.companyName}
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{
              width: '60px',
              height: '2px',
              background: 'rgba(255,255,255,0.2)',
              margin: '20px 0',
            }} />

            {/* Contact or Highlights */}
            {sidebarContent === 'contact' && <ContactInfo />}
            {sidebarContent === 'highlights' && <KeyHighlights dark />}
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: '48px 56px 56px' }}>
          {/* Date + thin accent line */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            marginBottom: '36px' 
          }}>
            <span style={{
              fontSize: '9pt',
              color: '#94a3b8',
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '1px',
              textTransform: 'uppercase' as const,
              whiteSpace: 'nowrap',
            }}>
              {today}
            </span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* ✅ FIX: Content paragraphs use dynamic fontSize, lineHeight, textAlign */}
          <div
            style={{
              lineHeight: bodyLineHeight,
              fontSize: `${bodyFontSize}pt`,
              fontFamily: "'Libre Baskerville', Georgia, serif",
              color: '#334155',
            }}
          >
            {paragraphs.map((paragraph, idx) => (
              <p
                key={idx}
                style={{
                  marginBottom: `${paragraphSpacing}px`,
                  textAlign: bodyTextAlign,
                }}
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Signature */}
          <div style={{ marginTop: '52px' }}>
            <div style={{
              width: '40px',
              height: '2px',
              background: accentColor,
              marginBottom: '20px',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }} />
            <p
              style={{
                marginBottom: '6px',
                fontSize: '9pt',
                color: '#94a3b8',
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '1px',
                textTransform: 'uppercase' as const,
              }}
            >
              Ystävällisin terveisin
            </p>
            <p
              style={{
                fontSize: '16pt',
                color: '#1e293b',
                fontFamily: "'Libre Baskerville', Georgia, serif",
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              {data.name}
            </p>
          </div>
        </div>

        {/* Bottom decorative accent line */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${accentColor}, transparent)`,
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }} />

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

  // ═══════════════════════════════════════════════
  // LEFT LAYOUT – Editorial sidebar with personality
  // ═══════════════════════════════════════════════
  if (headerLayout === 'left') {
    return (
      <div
        className="cover-letter-paper bg-white mx-auto relative"
        style={{
          width: '210mm',
          height: '297mm',
          fontFamily: "'Libre Baskerville', Georgia, serif",
          color: '#1e293b',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* LEFT SIDEBAR */}
        <div
          style={{
            width: '74mm',
            height: '100%',
            background: accentColor,
            padding: '48px 24px 40px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          {/* Subtle pattern */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(180deg, transparent, transparent 60px, rgba(255,255,255,0.015) 60px, rgba(255,255,255,0.015) 120px)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Monogram */}
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '1px',
              marginBottom: '24px',
              alignSelf: 'center',
            }}>
              {initials}
            </div>

            {/* Name */}
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: "'Libre Baskerville', Georgia, serif",
                lineHeight: '1.3',
                margin: '0 0 8px',
                textAlign: 'center',
              }}
            >
              {data.name}
            </h1>

            {(data.jobTitle || data.companyName) && (
              <p style={{
                margin: '0 0 24px',
                fontSize: '8.5pt',
                color: 'rgba(255,255,255,0.45)',
                fontFamily: "'DM Sans', sans-serif",
                textAlign: 'center',
                letterSpacing: '0.5px',
              }}>
                {data.jobTitle}{data.jobTitle && data.companyName ? ' · ' : ''}{data.companyName}
              </p>
            )}

            {/* Divider */}
            <div style={{
              width: '40px',
              height: '1.5px',
              background: 'rgba(255,255,255,0.15)',
              margin: '0 auto 28px',
            }} />

            {/* Sidebar content */}
            {sidebarContent === 'contact' && <ContactInfo vertical />}
            {sidebarContent === 'highlights' && <KeyHighlights dark />}

            {/* Decorative bottom element */}
            <div style={{ marginTop: 'auto', paddingTop: '30px', textAlign: 'center' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.15)',
                margin: '0 auto',
              }} />
            </div>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div style={{ 
          flex: 1, 
          padding: '48px 44px', 
          overflowY: 'auto',
          position: 'relative',
        }}>
          {/* Decorative corner */}
          <div style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            width: '60px',
            height: '60px',
            borderTop: `1.5px solid ${accentMedium}`,
            borderRight: `1.5px solid ${accentMedium}`,
            opacity: 0.5,
            pointerEvents: 'none',
          }} />

          {/* Date */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            marginBottom: '36px' 
          }}>
            <span style={{
              fontSize: '9pt',
              color: '#94a3b8',
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '1px',
              textTransform: 'uppercase' as const,
              whiteSpace: 'nowrap',
            }}>
              {today}
            </span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* ✅ FIX: Content uses dynamic fontSize, lineHeight, textAlign */}
          <div
            style={{
              lineHeight: bodyLineHeight,
              fontSize: `${bodyFontSize}pt`,
              fontFamily: "'Libre Baskerville', Georgia, serif",
              color: '#334155',
            }}
          >
            {paragraphs.map((paragraph, idx) => (
              <p
                key={idx}
                style={{
                  marginBottom: `${paragraphSpacing}px`,
                  textAlign: bodyTextAlign,
                }}
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Signature */}
          <div style={{ marginTop: '48px' }}>
            <div style={{
              width: '40px',
              height: '2px',
              background: accentColor,
              marginBottom: '18px',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }} />
            <p
              style={{
                marginBottom: '6px',
                fontSize: '9pt',
                color: '#94a3b8',
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '1px',
                textTransform: 'uppercase' as const,
              }}
            >
              Ystävällisin terveisin
            </p>
            <p
              style={{
                fontSize: '14pt',
                color: '#1e293b',
                fontFamily: "'Libre Baskerville', Georgia, serif",
                fontStyle: 'italic',
              }}
            >
              {data.name}
            </p>
          </div>

          {/* Bottom decorative corner */}
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '44px',
            width: '40px',
            height: '40px',
            borderBottom: `1.5px solid ${accentMedium}`,
            borderLeft: `1.5px solid ${accentMedium}`,
            opacity: 0.4,
            pointerEvents: 'none',
          }} />
        </div>
      </div>
    );
  }

  return null;
}
'use client';

// components/cover-letter/CoverLetterTemplate.tsx
// ✅ KAKSI TYYLIÄ: 'modern' (top/left, monogrammi) ja 'classic' (Ella-tyyli, hillitty)
// ✅ Useita allekirjoitustyylejä: 'script' | 'print' | 'bold'
// ✅ Kaikki elementit muokattavia, yhteensopiva edit-cover-letter -editorin kanssa

import React, { useRef } from 'react';

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
  fontSize?: number;
  lineHeight?: number;
  textAlign?: 'left' | 'justify' | 'center';
  // ✅ UUDET valinnaiset kentät
  templateStyle?: 'modern' | 'classic';
  signatureStyle?: 'script' | 'print' | 'bold';
}

interface CoverLetterTemplateProps {
  data: CoverLetterData;
  isPdfPreview?: boolean;
  isEditing?: boolean;
  onChange?: (newContent: string) => void;
  onFieldChange?: (field: keyof CoverLetterData, value: string) => void;
}

export default function CoverLetterTemplate({
  data,
  isPdfPreview = false,
  isEditing = false,
  onChange,
  onFieldChange,
}: CoverLetterTemplateProps) {

  const colorInputRef = useRef<HTMLInputElement>(null);

  const headerColor = data.headerColor || '#1a1a2e';
  const templateStyle = data.templateStyle || 'modern';
  const headerLayout = data.headerLayout || 'top';
  const sidebarContent = data.sidebarContent || 'contact';
  const bodyFontSize = data.fontSize ?? 10.8;
  const bodyLineHeight = data.lineHeight ?? 1.85;
  const bodyTextAlign = data.textAlign ?? 'justify';
  const signatureStyle = data.signatureStyle || 'script';
  const paragraphs = data.content?.split('\n\n').filter(p => p.trim()) || [];
  const today = new Date().toLocaleDateString('fi-FI', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const accentColor = headerColor;

  const hexToRgb = (hex: string) => {
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
  const accentLight = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)` : 'rgba(26,26,46,0.08)';
  const accentMedium = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)` : 'rgba(26,26,46,0.15)';

  const firstName = data.name.split(' ')[0] || '';
  const lastName = data.name.split(' ').slice(1).join(' ') || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0) || firstName.charAt(1) || ''}`.toUpperCase();
  const contactFontSize = Math.max(8, bodyFontSize * 0.88);
  const paragraphSpacing = Math.round(bodyFontSize * 1.6);

  // ─── Shared edit styles ───────────────────────────────────────
  const editableStyle = (active: boolean): React.CSSProperties => active ? {
    outline: '2px solid #f97316',
    borderRadius: '4px',
    padding: '2px 6px',
    cursor: 'text',
    minWidth: '40px',
    display: 'inline-block',
    transition: 'outline 0.15s',
  } : {
    cursor: 'default',
  };

  const editableBlockStyle = (active: boolean): React.CSSProperties => active ? {
    outline: '2px solid #f97316',
    borderRadius: '4px',
    padding: '4px',
    cursor: 'text',
    minHeight: '1.5em',
    transition: 'outline 0.15s',
  } : {};

  // ─── Inline editable span ─────────────────────────────────────
  const EditableSpan = ({
    value,
    field,
    style,
    placeholder,
  }: {
    value: string;
    field: keyof CoverLetterData;
    style?: React.CSSProperties;
    placeholder?: string;
  }) => {
    if (!isEditing) return <span style={style}>{value}</span>;
    return (
      <span
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onFieldChange?.(field, e.currentTarget.innerText)}
        style={{ ...style, ...editableStyle(isEditing) }}
        title={`Klikkaa muokataksesi: ${placeholder || String(field)}`}
      >
        {value}
      </span>
    );
  };

  // ─── Hidden color input (jaettu) ──────────────────────────────
  const ColorInput = () => (
    <input
      ref={colorInputRef}
      type="color"
      value={accentColor.startsWith('#') ? accentColor : '#1a1a2e'}
      onChange={(e) => onFieldChange?.('headerColor', e.target.value)}
      style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }}
    />
  );

  // ─── Paragraphs editable ─────────────────────────────────────
  const EditableParagraphs = ({ color = '#334155' }: { color?: string }) => (
    <div style={{
      lineHeight: bodyLineHeight,
      fontSize: `${bodyFontSize}pt`,
      fontFamily: "'Libre Baskerville', Georgia, serif",
      color,
    }}>
      {paragraphs.map((paragraph, idx) => (
        <p
          key={idx}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onBlur={(e) => {
            if (isEditing && onChange) {
              const allParas = Array.from(
                e.currentTarget.parentElement?.querySelectorAll('p') || []
              );
              onChange(allParas.map(p => p.innerText).join('\n\n'));
            }
          }}
          style={{
            marginBottom: `${paragraphSpacing}px`,
            textAlign: bodyTextAlign,
            ...editableBlockStyle(isEditing),
          }}
        >
          {paragraph}
        </p>
      ))}
    </div>
  );

  // ─── Contact info ─────────────────────────────────────────────
  const ContactInfo = ({ vertical = false, onDark = true, centered = false }: { vertical?: boolean; onDark?: boolean; centered?: boolean }) => {
    const txtColor = onDark ? 'rgba(255,255,255,0.75)' : '#64748b';
    const chipBg = onDark ? 'rgba(255,255,255,0.12)' : accentLight;
    return (
      <div style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        gap: vertical ? '14px' : '28px',
        flexWrap: 'wrap',
        justifyContent: centered ? 'center' : 'flex-start',
        fontSize: `${contactFontSize}pt`,
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      }}>
        {data.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: txtColor }}>
            <span style={{ width: '26px', height: '26px', borderRadius: '7px', background: chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>✉</span>
            <EditableSpan value={data.email} field="email" style={{ wordBreak: 'break-word', color: txtColor }} placeholder="sähköposti" />
          </div>
        )}
        {data.phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: txtColor }}>
            <span style={{ width: '26px', height: '26px', borderRadius: '7px', background: chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>☎</span>
            <EditableSpan value={data.phone} field="phone" style={{ color: txtColor }} placeholder="puhelin" />
          </div>
        )}
        {data.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: txtColor }}>
            <span style={{ width: '26px', height: '26px', borderRadius: '7px', background: chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>⌖</span>
            <EditableSpan value={data.location} field="location" style={{ color: txtColor }} placeholder="paikkakunta" />
          </div>
        )}
      </div>
    );
  };

  // ─── Signature (useita tyylejä) ───────────────────────────────
  const Signature = ({ marginTop = 52, centered = false }: { marginTop?: number; centered?: boolean }) => {
    // Allekirjoitustyylit
    const sigStyles: Record<string, React.CSSProperties> = {
      script: { fontSize: '17pt', fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontStyle: 'normal', fontWeight: 400, color: accentColor },
      print:  { fontSize: '13pt', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: '0.5px', color: '#1e293b' },
      bold:   { fontSize: '15pt', fontFamily: "'Libre Baskerville', Georgia, serif", fontStyle: 'italic', fontWeight: 700, color: '#1e293b' },
    };
    const nameStyle = sigStyles[signatureStyle] || sigStyles.script;

    return (
      <div style={{ marginTop: `${marginTop}px`, textAlign: centered ? 'center' : 'left' }}>
        <div style={{ width: '40px', height: '2px', background: accentColor, marginBottom: '18px', margin: centered ? '0 auto 18px' : '0 0 18px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
        <p style={{ marginBottom: '8px', fontSize: '9pt', color: '#94a3b8', fontFamily: "'DM Sans', sans-serif", letterSpacing: '1px', textTransform: 'uppercase' }}>
          Ystävällisin terveisin
        </p>
        <p style={nameStyle}>
          <EditableSpan value={data.name} field="name" style={nameStyle} placeholder="Nimi" />
        </p>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // CLASSIC LAYOUT (Ella-tyyli) — hillitty, ammattimainen
  // ═══════════════════════════════════════════════════════════════
  if (templateStyle === 'classic') {
    return (
      <div
        className="cover-letter-paper bg-white mx-auto relative"
        style={{ width: '210mm', minHeight: '297mm', fontFamily: "'Libre Baskerville', Georgia, serif", color: '#1e293b', display: 'flex', flexDirection: 'column' }}
      >
        {/* Ohut värillinen yläreuna */}
        <div style={{ height: '6px', background: accentColor, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />

        {/* HEADER — nimi keskitettynä, titteli reunaviivan sisällä */}
        <div style={{ padding: '52px 56px 0', textAlign: 'center', position: 'relative' }}>
          {/* Värinvalitsin (vain muokkaustilassa) */}
          {isEditing && (
            <div
              onClick={() => colorInputRef.current?.click()}
              title="🎨 Klikkaa vaihtaaksesi korostusväriä"
              style={{ position: 'absolute', top: '20px', right: '24px', width: '26px', height: '26px', borderRadius: '50%', background: accentColor, border: '2px solid #fff', boxShadow: '0 0 0 1px #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
            >🎨<ColorInput /></div>
          )}

          <h1 style={{ fontSize: '30px', fontWeight: 700, color: '#1e293b', fontFamily: "'Libre Baskerville', Georgia, serif", letterSpacing: '1px', margin: 0 }}>
            <EditableSpan value={data.name} field="name" style={{ fontSize: '30px', fontWeight: 700, color: '#1e293b' }} placeholder="Nimi" />
          </h1>

          {(data.jobTitle || data.companyName) && (
            <div style={{ display: 'inline-block', marginTop: '14px', padding: '5px 18px', border: `1px solid ${accentColor}`, borderRadius: '2px' }}>
              <span style={{ fontSize: '10pt', color: accentColor, fontFamily: "'DM Sans', sans-serif", letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                <EditableSpan value={data.jobTitle || ''} field="jobTitle" style={{ color: accentColor }} placeholder="Titteli" />
                {data.jobTitle && data.companyName ? ' · ' : ''}
                <EditableSpan value={data.companyName || ''} field="companyName" style={{ color: accentColor }} placeholder="Yritys" />
              </span>
            </div>
          )}
        </div>

        {/* BODY */}
        <div style={{ padding: '44px 64px 40px', flex: 1 }}>
          {/* Vastaanottaja + päiväys rivi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <span style={{ fontSize: '9pt', color: '#94a3b8', fontFamily: "'DM Sans', sans-serif", letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {today}
            </span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          <EditableParagraphs />
          <Signature marginTop={48} />
        </div>

        {/* FOOTER — keskitetty yhteystietorivi ohuen viivan yläpuolella */}
        <div style={{ padding: '0 56px 44px' }}>
          <div style={{ height: '1px', background: '#e2e8f0', marginBottom: '20px' }} />
          <ContactInfo onDark={false} centered />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MODERN — TOP LAYOUT (alkuperäinen, monogrammi + banneri)
  // ═══════════════════════════════════════════════════════════════
  if (headerLayout === 'top') {
    return (
      <div
        className="cover-letter-paper bg-white mx-auto relative"
        style={{ width: '210mm', minHeight: '297mm', fontFamily: "'Libre Baskerville', 'Georgia', serif", color: '#1e293b', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '180px', height: '180px', borderRadius: '50%', border: `2px solid ${accentMedium}`, opacity: 0.4, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '10px', right: '10px', width: '100px', height: '100px', borderRadius: '50%', border: `1.5px solid ${accentMedium}`, opacity: 0.25, pointerEvents: 'none' }} />

        {/* HEADER */}
        <div className="header-box" style={{ background: accentColor, padding: '44px 56px 40px', position: 'relative', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 80px)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '8px' }}>
              <div
                onClick={() => isEditing && colorInputRef.current?.click()}
                style={{
                  width: '68px', height: '68px', borderRadius: '50%',
                  border: isEditing ? '3px solid rgba(255,255,255,0.7)' : '2px solid rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.9)',
                  fontFamily: "'DM Sans', sans-serif", letterSpacing: '1px', flexShrink: 0,
                  cursor: isEditing ? 'pointer' : 'default', position: 'relative',
                }}
                title={isEditing ? '🎨 Klikkaa vaihtaaksesi header-väriä' : ''}
              >
                {initials}
                {isEditing && (
                  <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#f97316', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid white' }}>🎨</span>
                )}
                <ColorInput />
              </div>

              <div>
                <h1 style={{ fontSize: '34px', fontWeight: 700, color: '#ffffff', fontFamily: "'Libre Baskerville', Georgia, serif", lineHeight: '1.15', margin: 0, letterSpacing: '-0.5px' }}>
                  <EditableSpan value={data.name} field="name" style={{ color: '#ffffff', fontSize: '34px', fontWeight: 700, fontFamily: "'Libre Baskerville', Georgia, serif" }} placeholder="Nimi" />
                </h1>
                {(data.jobTitle || data.companyName) && (
                  <p style={{ margin: '6px 0 0', fontSize: '10.5pt', color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: '0.5px' }}>
                    <EditableSpan value={data.jobTitle || ''} field="jobTitle" style={{ color: 'rgba(255,255,255,0.55)' }} placeholder="Titteli" />
                    {data.jobTitle && data.companyName ? ' · ' : ''}
                    <EditableSpan value={data.companyName || ''} field="companyName" style={{ color: 'rgba(255,255,255,0.55)' }} placeholder="Yritys" />
                  </p>
                )}
              </div>
            </div>

            <div style={{ width: '60px', height: '2px', background: 'rgba(255,255,255,0.2)', margin: '20px 0' }} />
            {sidebarContent === 'contact' && <ContactInfo />}
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: '48px 56px 56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '36px' }}>
            <span style={{ fontSize: '9pt', color: '#94a3b8', fontFamily: "'DM Sans', sans-serif", letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{today}</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          <EditableParagraphs />
          <Signature marginTop={52} />
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${accentColor}, transparent)`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MODERN — LEFT LAYOUT (sivupalsta) — korjattu minHeight monisivuille
  // ═══════════════════════════════════════════════════════════════
  if (headerLayout === 'left') {
    return (
      <div
        className="cover-letter-paper bg-white mx-auto relative"
        style={{ width: '210mm', minHeight: '297mm', fontFamily: "'Libre Baskerville', Georgia, serif", color: '#1e293b', display: 'flex', overflow: 'hidden' }}
      >
        {/* LEFT SIDEBAR */}
        <div style={{ width: '74mm', background: accentColor, padding: '48px 24px 40px', display: 'flex', flexDirection: 'column', position: 'relative', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, transparent, transparent 60px, rgba(255,255,255,0.015) 60px, rgba(255,255,255,0.015) 120px)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div
              onClick={() => isEditing && colorInputRef.current?.click()}
              style={{
                width: '72px', height: '72px', borderRadius: '50%',
                border: isEditing ? '3px solid rgba(255,255,255,0.7)' : '2px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 700, color: 'rgba(255,255,255,0.85)',
                fontFamily: "'DM Sans', sans-serif", letterSpacing: '1px',
                marginBottom: '24px', alignSelf: 'center',
                cursor: isEditing ? 'pointer' : 'default', position: 'relative',
              }}
              title={isEditing ? '🎨 Klikkaa vaihtaaksesi header-väriä' : ''}
            >
              {initials}
              {isEditing && (
                <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#f97316', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid white' }}>🎨</span>
              )}
              <ColorInput />
            </div>

            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', fontFamily: "'Libre Baskerville', Georgia, serif", lineHeight: '1.3', margin: '0 0 8px', textAlign: 'center' }}>
              <EditableSpan value={data.name} field="name" style={{ color: '#ffffff', fontSize: '22px', fontWeight: 700 }} placeholder="Nimi" />
            </h1>

            {(data.jobTitle || data.companyName) && (
              <p style={{ margin: '0 0 24px', fontSize: '8.5pt', color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', letterSpacing: '0.5px' }}>
                <EditableSpan value={data.jobTitle || ''} field="jobTitle" style={{ color: 'rgba(255,255,255,0.45)' }} placeholder="Titteli" />
                {data.jobTitle && data.companyName ? ' · ' : ''}
                <EditableSpan value={data.companyName || ''} field="companyName" style={{ color: 'rgba(255,255,255,0.45)' }} placeholder="Yritys" />
              </p>
            )}

            <div style={{ width: '40px', height: '1.5px', background: 'rgba(255,255,255,0.15)', margin: '0 auto 28px' }} />
            {sidebarContent === 'contact' && <ContactInfo vertical />}

            <div style={{ marginTop: 'auto', paddingTop: '30px', textAlign: 'center' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.15)', margin: '0 auto' }} />
            </div>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div style={{ flex: 1, padding: '48px 44px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '24px', right: '24px', width: '60px', height: '60px', borderTop: `1.5px solid ${accentMedium}`, borderRight: `1.5px solid ${accentMedium}`, opacity: 0.5, pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '36px' }}>
            <span style={{ fontSize: '9pt', color: '#94a3b8', fontFamily: "'DM Sans', sans-serif", letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{today}</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          <EditableParagraphs />
          <Signature marginTop={48} />
        </div>
      </div>
    );
  }

  return null;
}
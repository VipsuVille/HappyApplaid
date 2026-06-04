'use client';
// lib/cover-letter/skins/CreativeWave.tsx
// ✅ Aaltografiikka ylä- ja alareunassa, accent-väri aalloissa.
//    KORJAUS: (1) sulkulause muokattavissa (editableClosing) — lukee
//    data.style.closingText, oletus kielen mukaan. (2) alareunan aalto ei
//    enää mene allekirjoituksen päälle (sisällön alapehmuste kasvatettu).

import React from 'react';
import {
  EditableText,
  EditableParagraphs,
  Signature,
  ContactRow,
  DateRow,
} from '../engine/components';

export default function CreativeWave({ engine }: { engine: any }) {
  const { data, fontStack, updateField } = engine;
  const accent = data.style.accentColor || '#0284c7';
  const headingSize = data.style.regions?.heading?.fontSize; // px

  // Kielen mukainen oletus-sulkulause (käyttäjä voi muokata, tallentuu closingText:iin)
  const defaultClosing = data.language === 'english' ? 'Sincerely,' : 'Ystävällisin terveisin,';

  return (
    <div
      className="cover-letter-paper bg-white mx-auto relative flex flex-col justify-between"
      style={{
        width: '210mm',
        minHeight: '297mm',
        fontFamily: fontStack('sans'),
        color: data.style.text.textColor || '#1f2937',
        overflow: 'hidden',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* 1. YLÄREUNAN AALTO-GRAFIIKKA */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{ height: '140px', overflow: 'hidden', zIndex: 0 }}
      >
        <svg viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
          <path fill={accent} fillOpacity="0.2" d="M0,96L120,112C240,128,480,160,720,149.3C960,139,1200,85,1320,58.7L1440,32L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z"></path>
          <path fill={accent} fillOpacity="0.75" d="M0,32L120,53.3C240,75,480,117,720,117.3C960,117,1200,75,1320,53.3L1440,32L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z"></path>
        </svg>
      </div>

      {/* 2. SISÄLTÖALUE — alapehmuste 170px jotta allekirjoitus jää aallon yläpuolelle */}
      <div style={{ padding: '120px 64px 170px 64px', flexGrow: 1, zIndex: 10, position: 'relative' }}>

        {/* Keskitetty otsikko- ja yritysosa */}
        <div className="text-center mb-12">
          <EditableText
            engine={engine}
            as="h1"
            value={data.contact.name}
            onCommit={(v) => engine.updateContact('name', v)}
            style={{
              fontSize: headingSize ? `${headingSize}px` : '32px',
              fontWeight: 800,
              color: accent,
              letterSpacing: '-0.5px',
              margin: '0 0 6px',
            }}
            placeholder="Nimesi"
          />

          {(data.jobTitle || data.companyName) && (
            <div className="text-sm font-medium uppercase tracking-wider text-gray-500 mb-4">
              <EditableText
                engine={engine}
                value={data.jobTitle || ''}
                onCommit={(v) => updateField('jobTitle', v)}
                placeholder="Haettava tehtävä"
              />
              {data.jobTitle && data.companyName && ' • '}
              <EditableText
                engine={engine}
                value={data.companyName || ''}
                onCommit={(v) => updateField('companyName', v)}
                placeholder="Yritys"
              />
            </div>
          )}

          {/* Keskitetyt yhteystiedot */}
          <div className="flex justify-center border-t border-b border-gray-100 py-3 mt-2">
            <ContactRow engine={engine} onDark={false} />
          </div>
        </div>

        {/* Päivämäärä ja leipäteksti */}
        <div className="mt-8">
          <DateRow engine={engine} />
          <div className="mt-6">
            <EditableParagraphs engine={engine} region="body" />
          </div>
          {/* ✅ editableClosing → sulkulause muokattavissa, tallentuu closingText:iin */}
          <Signature engine={engine} marginTop={48} editableClosing closing={defaultClosing} />
        </div>
      </div>

      {/* 3. ALAREUNAN AALTO-GRAFIIKKA */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: '140px', overflow: 'hidden', zIndex: 0 }}
      >
        <svg viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
          <path fill={accent} fillOpacity="0.2" d="M0,224L120,240C240,256,480,288,720,266.7C960,245,1200,171,1320,133.3L1440,96L1440,320L1320,320C1200,320,960,320,720,320C480,320,240,320,120,320L0,320Z"></path>
          <path fill={accent} fillOpacity="0.85" d="M0,192L120,181.3C240,171,480,149,720,170.7C960,192,1200,256,1320,288L1440,320L1440,320L1320,320C1200,320,960,320,720,320C480,320,240,320,120,320L0,320Z"></path>
        </svg>
      </div>
    </div>
  );
}
import React from 'react';
import { CVPreviewProps } from '@/types';
import Section from '@/components/cv/Section';

const CVPreview: React.FC<CVPreviewProps> = ({ previewData, isPaid, previewHtml }) => {
  const generatePlaceholderImage = () =>
    `data:image/svg+xml,${encodeURIComponent(`
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" stroke-width="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    `)}`;

  const backgroundImage = !isPaid ? generatePlaceholderImage() : '';

  return (
    <div
      className="relative bg-white p-8 shadow-lg"
      style={{
        backgroundImage: `url('${backgroundImage}')`,
        opacity: isPaid ? 1 : 1, // Tässä voi säädellä esikatselun näkyvyyttä
      }}
    >
      {!isPaid && (
        <div className="absolute inset-0 z-10 flex items-center justify-center 
                        bg-white/50 text-4xl font-bold text-gray-400 rotate-45">
          ESIKATSELU
        </div>
      )}

      {previewHtml ? (
        previewHtml // Jos CV on valmis, näytetään se tässä
      ) : (
        <>
          <div className="relative">
            <h1 className="text-3xl font-bold text-center mb-6">Curriculum Vitae</h1>
            <div className="mb-6">
              <h2 className="text-xl font-semibold">{previewData.name}</h2>
              <p>{previewData.email}</p>
              <p>{previewData.phone}</p>
            </div>
            <Section title="Koulutus" content={previewData.education} />
            <Section title="Työkokemus" content={previewData.workExperience} />
            <Section title="Taidot" content={previewData.skills} />
            <Section title="Kielitaito" content={previewData.languages} />
          </div>
        </>
      )}
    </div>
  );
};

export default CVPreview;

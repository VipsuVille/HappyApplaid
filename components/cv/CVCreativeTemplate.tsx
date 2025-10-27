import React, { useEffect, useState, useRef } from 'react';
import { CVTemplateProps } from '@/types';
import CVContainer from './CVContainer';
import Section from './Section';
import DOMPurify from "dompurify";
import { fetchImageAsBase64 } from '@/lib/utils';

import styles from './CreativeCVTemplate.module.css'; // Import your CSS module

interface CVImages {
  profile?: string;
  background?: string;
  base64?: {
    profile?: string;
    background?: string;
  };
}

const printStyles = `
  @page {
    size: A4;
    margin: 0;
  }
  @media print {
    body {
      width: 210mm;
      height: 297mm;
    }
    * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

const CreativeCVTemplate: React.FC<CVTemplateProps> = ({
  data,
  aiData,
  isEditing,
  onContentChange,
  onProfileImageChange,
  onBackgroundImageChange,
}) => {
  const [images, setImages] = useState<CVImages>({});
  const [seinakuvaBase64, setSeinakuvaBase64] = useState<string | undefined>(undefined);
  const cvRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadImages = async () => {
      try {
        if (!data.userId || !data.cvId) return;

     
      } catch (error) {
        console.error('Error loading images:', error);
        setImages({
          profile: data.profileImage,
          background: data.backgroundImage
        });
      }
    };

    loadImages();
  }, [data.userId, data.cvId, data.profileImage, data.backgroundImage]);

  useEffect(() => {
    const fetchBase64Image = async () => {
      try {
        const response = await fetch('/api/image-base64');
        const { base64 } = await response.json();
        setSeinakuvaBase64(base64);
      } catch (error) {
        console.error('Error fetching base64 image:', error);
      }
    };

    fetchBase64Image();
  }, []);

 // Example for TechnicalCVTemplate - Apply this pattern to other templates too
const generatePDF = async (): Promise<Blob> => {
  if (!cvRef.current) throw new Error('CV element not found');

  try {
    // Add loading indication here if needed
    
    // Wait for images to load and fonts to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clone the element to avoid modifying the original
    const clone = cvRef.current.cloneNode(true) as HTMLElement;
    
   
    
    // Send to API for PDF generation
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 

        
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'PDF generation failed');
    }

    return await response.blob();
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
};

  return (
    <CVContainer ref={cvRef} 
    onGeneratePDF={!isEditing ? generatePDF : undefined} 
    templateType="creative">
      <style>{printStyles}</style>
      
      <div style={{ 
        width: '210mm', 
        height: '297mm', 
        maxWidth: '210mm', 
        maxHeight: '297mm', 
        minWidth: '210mm', 
        minHeight: '297mm', 
        justifyItems: 'center',
        backgroundColor: 'white'
      }}>
        <div className="flex flex-row h-[297mm] w-[210mm] box-border">
          {/* Vasen sivupalkki */}
          <div className="w-[70mm] flex flex-col h-[297mm]">
            {/* Profiilikuva */}
            <div className="h-[99mm] w-[70mm] box-border">
              {(images.profile || aiData?.profileInitials) && (
                <div className="w-[70mm] h-[99mm] overflow-hidden">
                  {images.profile ? (
                    <img
                      src={images.base64?.profile || images.profile}
                      alt="Profiilikuva"
                      style={{
                        width: '70mm',
                        height: '99mm',
                        objectFit: 'cover',
                      }}
                      crossOrigin="anonymous" // Tärkeä CORS-ongelmien välttämiseksi
                    />
                  ) : (
                    <div
                      className="w-[70mm] h-[99mm] flex items-center justify-center bg-gray-200"
                      style={{
                        width: '70mm',
                        height: '99mm',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#e5e7eb',
                      }}
                    >
                      <span className="text-3xl">{aiData?.profileInitials}</span>
                    </div>
                  )}
                </div>
              )}
              {isEditing && (
                <div className="absolute bottom-2 right-2">
                  <label className="bg-blue-500 text-white px-3 py-1 rounded cursor-pointer">
                    Vaihda kuva
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onProfileImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Taidot-osio */}
            <div
              className="h-[198mm] w-[70mm] relative left-0"
              style={{
                position: 'relative',
                width: '70mm',
                height: '198mm',
                margin: 0,
                padding: 0,
                left: 0,
                top: 0,
              }}
            >
              {seinakuvaBase64 && (
                <img
                  src={seinakuvaBase64}
                  alt="seinakuva"
                  style={{
                    width: '70mm',
                    height: '198mm',
                    objectFit: 'cover',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                  }}
                  crossOrigin="anonymous"
                />
              )}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1rem',
                  color: 'white',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  width: '70mm',
                  height: '198mm',
                }}
              >
                <Section
                  title="Taidot"
                  content={DOMPurify.sanitize(aiData?.html?.skills_section || '')}
                  isEditing={isEditing}
                  onChange={(newContent) => onContentChange?.('skills', newContent)}
                />
              </div>
            </div>
          </div>

          {/* Oikea sisältöalue */}
          <div className="w-[140mm] flex flex-col h-[297mm] bg-white min-w-0">
            {/* Header-alue */}
            <div
              className="h-[99mm] w-[140mm] relative"
              style={{
                height: '99mm',
                width: '140mm',
                position: 'relative',
              }}
            >
              {images.background && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      backgroundImage: `url('${images.base64?.background || images.background}')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: 0.5,
                      width: "140mm",
                      height: "99mm",
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '49mm',
                      background: 'linear-gradient(to top, white, transparent)',
                    }}
                  />
                </>
              )}
              {isEditing && (
                <div className="absolute bottom-2 right-2">
                  <label className="bg-blue-500 text-white px-3 py-1 rounded cursor-pointer">
                    Vaihda taustakuva
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onBackgroundImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Nimi */}
              <div className="relative z-10 p-4 md:pb-0">
                <Section
                  title=""
                  content={data.name}
                  isEditing={isEditing}
                  onChange={(newContent) => onContentChange?.('name', newContent)}
                />
              </div>
            </div>

            {/* Muut tiedot */}
            <div className="h-[198mm] p-4 md:pb-0 max-h-[198mm] grid grid-cols-2 gap-4 overflow-y-auto">
              {/* Yhteystiedot */}
              <Section
                title="Yhteystiedot"
                content={`
                  📧 ${data.email}\n
                  📞 ${data.phone}\n
                  📍 ${data.location}\n
                  ${data.linkedIn ? `💼 ${data.linkedIn}` : ''}
                `}
                isEditing={isEditing}
                onChange={(newContent) => {
                  const lines = newContent.split('\n');
                  const email = lines[0].replace('📧', '').trim();
                  const phone = lines[1].replace('📞', '').trim();
                  const location = lines[2].replace('📍', '').trim();
                  const linkedIn = lines[3]?.replace('💼', '').trim() || '';

                  onContentChange?.('email', email);
                  onContentChange?.('phone', phone);
                  onContentChange?.('location', location);
                  onContentChange?.('linkedIn', linkedIn);
                }}
              />

              {/* Harrastukset */}
              <Section
                title="Harrastukset"
                content={data.hobbies}
                isEditing={isEditing}
                onChange={(newContent) => onContentChange?.('hobbies', newContent)}
              />

              {/* Koulutus */}
              <Section
                title="Koulutus"
                content={data.education}
                isEditing={isEditing}
                onChange={(newContent) => onContentChange?.('education', newContent)}
              />

              {/* Työkokemus */}
              <Section
                title="Työkokemus"
                content={data.workExperience}
                isEditing={isEditing}
                onChange={(newContent) => onContentChange?.('workExperience', newContent)}
              />

              {/* Kielitaito */}
              <Section
                title="Kielitaito"
                content={data.languages}
                isEditing={isEditing}
                onChange={(newContent) => onContentChange?.('languages', newContent)}
              />
            </div>
          </div>
        </div>
      </div>
    </CVContainer>
  );
};

export default CreativeCVTemplate;
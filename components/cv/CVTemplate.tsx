import React, { useEffect } from 'react';
import { CVTemplateProps } from '@/types';
import { deleteStoredCV } from '@/utils/supabaseUtils';
import { useAuth } from '@clerk/nextjs';

const CVTemplate: React.FC<CVTemplateProps> = ({ data, isPaid = false, aiData, userData, id }) => {
  const { getToken } = useAuth();

  const handleDelete = async () => {
    if (!id) return;
    try {
      const supabaseToken = await getToken({ template: 'supabase-custom' });
      if (!supabaseToken) {
        throw new Error('Authentication token not available');
      }
      await deleteStoredCV(id, supabaseToken);
      alert('CV deleted successfully');
    } catch (error) {
      console.error('Error deleting CV:', error);
      alert('Failed to delete CV');
    }
  };

  // Add styles to document head
  useEffect(() => {
    if (aiData?.styles) {
      const styleElement = document.createElement('style');
      styleElement.innerHTML = `
        .cv-section {
          margin-bottom: 1.5rem;
          padding: 1rem;
          border-radius: 0.5rem;
        }
        .section-title {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
          color: #2d3748;
        }
        .personal-description {
          ${aiData.styles.personal_description_style || ''}
        }
        .skills-section {
          ${aiData.styles.skills_style || ''}
        }
      `;
      document.head.appendChild(styleElement);
      return () => {
        document.head.removeChild(styleElement);
      };
    }
  }, [aiData?.styles]);

  console.log('aiData:', JSON.stringify(aiData, null, 2));

  return (
    <div className="relative w-full bg-white shadow-xl">
      <div 
        className="w-full relative"
        style={{
          minHeight: '297mm',
          maxWidth: '210mm',
          margin: '0 auto',
        }}
      >
        {/* Background Section */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{
            height: '33.33%',
            backgroundImage: aiData?.background ? `url(${aiData.background})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'top',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* Preview Watermark */}
        {!isPaid && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="transform rotate-45 text-slate-300 text-6xl font-bold opacity-20">
              PREVIEW
            </div>
          </div>
        )}

        {/* CV Content */}
        <div className="relative z-10 p-8">
          {aiData ? (
            <div className="space-y-6">
              {/* Personal Description */}
              <div className="cv-section personal-description">
                <h2 className="section-title">Profiili</h2>
                <p>{aiData.profile}</p>
              </div>

              {/* Skills Section */}
              <div className="cv-section skills-section">
                <h2 className="section-title">Taidot</h2>
                <p>{typeof aiData.html?.skills_section === 'string' ? 
                    aiData.html.skills_section : 
                    JSON.stringify(aiData.html?.skills_section)}</p>
              </div>

              {/* Experience Section */}
              <div className="cv-section">
                <h2 className="section-title">Työkokemus</h2>
                <p>{typeof aiData.html?.experience_section === 'string' ? 
                    aiData.html.experience_section : 
                    JSON.stringify(aiData.html?.experience_section)}</p>
              </div>

              {/* Education Section */}
              <div className="cv-section">
                <h2 className="section-title">Koulutus</h2>
                <p>{typeof aiData.html?.education_section === 'string' ? 
                    aiData.html.education_section : 
                    JSON.stringify(aiData.html?.education_section)}</p>
              </div>

              {/* Languages Section */}
              <div className="cv-section">
                <h2 className="section-title">Kielitaito</h2>
                <p>{typeof aiData.html?.languages_section === 'string' ? 
                    aiData.html.languages_section : 
                    JSON.stringify(aiData.html?.languages_section)}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold">{data.name}</h1>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Yhteystiedot</h2>
                  <p>{data.email}</p>
                  <p>{data.phone}</p>
                  <p>{data.location}</p>
                  <p>{data.age} vuotta</p>
                  {data.linkedIn && <p>{data.linkedIn}</p>}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Harrastukset</h2>
                  <p>{data.hobbies}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {id && (
          <div className="absolute bottom-4 right-4 space-x-4">
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              Delete CV
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CVTemplate;
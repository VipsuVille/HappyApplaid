'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getCVById, updateCV } from '@/utils/supabaseUtils';
import { useAuth } from '@clerk/nextjs';
import { BaseCV, UserFormData, AIData } from '@/types';
import CVPreview from '@/components/cv/CVPreview';
import { useParams } from 'next/navigation';
import parse from 'html-react-parser'; // Lisää tämä import

const EditableCVSection: React.FC<{
  content: string;
  onContentChange: (newContent: string) => void;
  isEditing: boolean;
}> = ({ content, onContentChange, isEditing }) => {
  if (isEditing) {
    return (
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={4}
      />
    );
  }
  return <div className="whitespace-pre-wrap">{content}</div>;
};

const EditCVPage: React.FC = () => {
  const params = useParams();  // Changed from useRouter
  const id = params?.id;  // Access id from params
  const { getToken } = useAuth();
  const [cvData, setCvData] = useState<BaseCV | null>(null);
  const [editingSections, setEditingSections] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadCV = async () => {
      if (typeof id === 'string') {
        try {
          const fetchedCV = await getCVById(id);
          setCvData(fetchedCV);
        } catch (error) {
          console.error('Error loading CV:', error);
          alert('CV:n lataaminen epäonnistui');
        }
      }
    };

    if (id) {
      loadCV();
    }
  }, [id]);

  const handleSectionEdit = (sectionKey: string) => {
    setEditingSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleContentChange = (sectionKey: keyof UserFormData, newContent: string) => {
    if (!cvData) return;
    
    setCvData({
      ...cvData,
      cv_data: {
        ...cvData.cv_data,
        [sectionKey]: newContent
      }
    });
  };

  const handleSave = async () => {
    if (!cvData || !id) return;
    
    setIsSaving(true);
    try {
      const token = await getToken({ template: 'supabase-custom' });
      if (!token) throw new Error('No authentication token');
      
      await updateCV(id as string, cvData, token);
      setEditingSections({});
      alert('CV tallennettu onnistuneesti!');
    } catch (error) {
      console.error('Error saving CV:', error);
      alert('CV:n tallentaminen epäonnistui');
    } finally {
      setIsSaving(false);
    }
  };

  if (!cvData) return <div className="flex justify-center items-center min-h-screen">Ladataan...</div>;

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Muokkaa CV:tä</h1>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {isSaving ? 'Tallennetaan...' : 'Tallenna muutokset'}
        </button>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-8 max-w-4xl mx-auto">
        {/* Preview */}
        <div className="mb-8">
          <CVPreview
            previewData={cvData.cv_data}
            isPaid={true}
            previewHtml={
              cvData.ai_data ? 
              parse(`
                ${(cvData.ai_data as AIData).html.skills_section}
                ${(cvData.ai_data as AIData).html.experience_section}
                ${(cvData.ai_data as AIData).html.education_section}
                ${(cvData.ai_data as AIData).html.languages_section}
              `) : 
              null
            }
          />
        </div>

        {/* Editable Sections */}
        <div className="space-y-8">
          {/* Personal Information */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Henkilötiedot</h2>
              <button
                onClick={() => handleSectionEdit('personalInfo')}
                className="text-blue-500 hover:text-blue-600"
              >
                {editingSections.personalInfo ? 'Valmis' : 'Muokkaa'}
              </button>
            </div>
            <div className="space-y-4">
              <EditableCVSection
                content={cvData.cv_data.name}
                onContentChange={(content) => handleContentChange('name', content)}
                isEditing={editingSections.personalInfo}
              />
              <EditableCVSection
                content={cvData.cv_data.email}
                onContentChange={(content) => handleContentChange('email', content)}
                isEditing={editingSections.personalInfo}
              />
              <EditableCVSection
                content={cvData.cv_data.phone}
                onContentChange={(content) => handleContentChange('phone', content)}
                isEditing={editingSections.personalInfo}
              />
            </div>
          </div>

          {/* Education */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Koulutus</h2>
              <button
                onClick={() => handleSectionEdit('education')}
                className="text-blue-500 hover:text-blue-600"
              >
                {editingSections.education ? 'Valmis' : 'Muokkaa'}
              </button>
            </div>
            <EditableCVSection
              content={cvData.cv_data.education}
              onContentChange={(content) => handleContentChange('education', content)}
              isEditing={editingSections.education}
            />
          </div>

          {/* Work Experience */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Työkokemus</h2>
              <button
                onClick={() => handleSectionEdit('workExperience')}
                className="text-blue-500 hover:text-blue-600"
              >
                {editingSections.workExperience ? 'Valmis' : 'Muokkaa'}
              </button>
            </div>
            <EditableCVSection
              content={cvData.cv_data.workExperience}
              onContentChange={(content) => handleContentChange('workExperience', content)}
              isEditing={editingSections.workExperience}
            />
          </div>

          {/* Skills */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Taidot</h2>
              <button
                onClick={() => handleSectionEdit('skills')}
                className="text-blue-500 hover:text-blue-600"
              >
                {editingSections.skills ? 'Valmis' : 'Muokkaa'}
              </button>
            </div>
            <EditableCVSection
              content={cvData.cv_data.skills}
              onContentChange={(content) => handleContentChange('skills', content)}
              isEditing={editingSections.skills}
            />
          </div>

          {/* Languages */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Kielitaito</h2>
              <button
                onClick={() => handleSectionEdit('languages')}
                className="text-blue-500 hover:text-blue-600"
              >
                {editingSections.languages ? 'Valmis' : 'Muokkaa'}
              </button>
            </div>
            <EditableCVSection
              content={cvData.cv_data.languages}
              onContentChange={(content) => handleContentChange('languages', content)}
              isEditing={editingSections.languages}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCVPage;
'use client';

import { useState } from 'react';
import { UserFormData, AIData, Status, StatusText } from '@/types';
import { useAuth, UserButton, useUser } from '@clerk/nextjs';
import CVTemplate from '@/components/cv/CVTemplate';
import { initialFormData } from '@/utils/preview';
import DownloadButton from '@/components/cv/DownloadButton';
import LoadingStates from '@/components/ui/LoadingStage';
import CVPreview from '../cv/CVPreview';
import parse from 'html-react-parser'; // Lisää tämä importteihin alussa


type CVFormProps = {
  setIsLoading: (loading: boolean) => void;
  isLoading: boolean;
};

export default function FrontPageForm({ setIsLoading, isLoading }: { setIsLoading: (loading: boolean) => void, isLoading: boolean }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<Status | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<React.ReactNode | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [aiData, setAiData] = useState<AIData | null>(null);
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loadingStage, setLoadingStage] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please sign in to continue");
      return;
    }

    setIsLoading(true);
    setProgress(0);


    

    try {
      setStage(StatusText.UPLOADING);    setProgress(25);
    setLoadingStage('Generoidaan CV:tä...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    setStage(StatusText.UPLOADED);
    setProgress(50);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStage(StatusText.SAVING);
        setProgress(75);
        await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await fetch('/api/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setStage(StatusText.GENERATING);
      setProgress(90);

      const generatedAiData = await response.json();
      setAiData(generatedAiData);

      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress(100);
      setLoadingStage('Valmistellaan esikatselua...');

      // Odota hetki että CV-template on renderöitynyt
      await new Promise(resolve => setTimeout(resolve, 100));

      const previewElement = generatedAiData.html ? (
        <div dangerouslySetInnerHTML={{ __html: generatedAiData.html }} />
      ) : null;
      
      setPreviewHtml(previewElement);

    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'CV:n luonti epäonnistui');
    } finally {
      setIsLoading(false);
      setStage(null);
      setProgress(0);
    }
  };

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <LoadingStates progress={progress} stage={stage} />
        </div>
      );
    }

    if (aiData) {
      return (
        <CVTemplate
          data={formData}
          aiData={aiData}
          userData={formData}
          isPaid={isPaid}
        />
      );
    }

    return (
      <CVPreview
        previewData={formData}
        isPaid={false}
        previewHtml={
          aiData ? 
          parse(`
            ${(aiData as AIData).html.skills_section}
            ${(aiData as AIData).html.experience_section}
            ${(aiData as AIData).html.education_section}
            ${(aiData as AIData).html.languages_section}
          `) : 
          null
        }
      />
    );
  };

  return (
    
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8">
{/* Left side - Form */}
      <div className="w-full lg:w-1/2 lg:sticky lg:top-8 lg:self-start">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Luo uusi CV</h2>
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          {/* Input fields */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nimi</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700">Ikä</label>
            <input
              type="text"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Sähköposti
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Puhelin
            </label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Sijainti
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="education" className="block text-sm font-medium text-gray-700">
              Koulutus
            </label>
            <textarea
              id="education"
              name="education"
              value={formData.education}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="workExperience" className="block text-sm font-medium text-gray-700">
              Työkokemus
            </label>
            <textarea
              id="workExperience"
              name="workExperience"
              value={formData.workExperience}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="skills" className="block text-sm font-medium text-gray-700">
              Taidot
            </label>
            <textarea
              id="skills"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="hobbies" className="block text-sm font-medium text-gray-700">
              Harrastukset
            </label>
            <textarea
              id="hobbies"
              name="hobbies"
              value={formData.hobbies}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="languages" className="block text-sm font-medium text-gray-700">
              Kielitaito
            </label>
            <textarea
              id="languages"
              name="languages"
              value={formData.languages}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="linkedIn" className="block text-sm font-medium text-gray-700">
              LinkedIn
            </label>
            <input
              type="text"
              id="linkedIn"
              name="linkedIn"
              value={formData.linkedIn}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
  <label htmlFor="language" className="block text-sm font-medium text-gray-700">
    Language:
  </label>
  <div className="space-y-2">
    <div>
      <input 
        type="radio"
        value="Suomi"
        id="languageSuomi"
        name="language"
        defaultChecked
        onChange={handleChange}
        className="mr-2"
      />
      <label htmlFor="languageSuomi">Suomi</label>
    </div>
    
    <div>
      <input 
        type="radio"
        value="Swedish"
        id="languageSwedish"
        name="language"
        onChange={handleChange}
        className="mr-2"
      />
      <label htmlFor="languageSwedish">Swedish</label>
    </div>
    
    <div>
      <input 
        type="radio"
        value="English"
        id="languageEnglish"
        name="language"
        onChange={handleChange}
        className="mr-2"
      />
      <label htmlFor="languageEnglish">English</label>
    </div>
    
    <div>
      <input 
        type="radio"
        value="Saame"
        id="languageSaame"
        name="language"
        onChange={handleChange}
        className="mr-2"
      />
      <label htmlFor="languageSaame">Saame</label>
    </div>
  </div>
</div>

          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
          >
            {isLoading ? 'Generoidaan CV:tä...' : 'Luo CV'}
          </button>
        </form>
        </div>
        </div>

  {/* Right side - Preview */}
  {renderPreview()}
      </div>
    </div>
    </div>

  );
}

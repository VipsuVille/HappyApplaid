import React from 'react';
import { useAuth } from '@clerk/nextjs';
import { UserFormData, AIData } from '@/types';
import { saveCV } from '@/utils/supabaseUtils';
import html2pdf from 'html2pdf.js';

type DownloadButtonProps = {
  userId: string;
  aiData: AIData;
  userData: UserFormData;
};

const DownloadButton: React.FC<DownloadButtonProps> = ({ userId, aiData, userData }) => {
  const { getToken } = useAuth();

  const handleDownloadPDF = async () => {
    try {
      const cvElement = document.getElementById('cv-preview');
      if (!cvElement) {
        throw new Error('CV preview element not found');
      }

      // Lisää kaikki data renderöintiin
      if (aiData.background) {
        cvElement.style.backgroundImage = `url(${aiData.background})`;
        cvElement.style.backgroundSize = 'cover';
        cvElement.style.backgroundRepeat = 'no-repeat';
      }

      const supabaseToken = await getToken({ template: 'supabase-custom' });
      if (!supabaseToken) {
        throw new Error('Authentication token not available');
      }

      // Tallenna CV ja varmista, että kaikki data on mukana
      await saveCV({
        userId,
        cvData: userData,
        aiData,
        authToken: supabaseToken,
        cvElement,
      });

      // PDF-asetukset
      const options = {
        margin: 1,
        filename: `CV_${userData.name || 'Anonymous'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      // Luo ja lataa PDF
      await html2pdf().set(options).from(cvElement).save();

      alert('CV tallennettu onnistuneesti PDF-muodossa!');
    } catch (error) {
      console.error('Error handling PDF:', error);
      alert(error instanceof Error ? error.message : 'CV:n tallentaminen epäonnistui');
    }
  };

  return (
    <button
      onClick={handleDownloadPDF}
      className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
    >
      Lataa CV (PDF)
    </button>
  );
};

export default DownloadButton;

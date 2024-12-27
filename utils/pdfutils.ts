// src/utils/pdfutils.ts
import html2pdf from 'html2pdf.js';
import type { UserFormData } from '@/types';

export async function generateAndDownloadPDF(cvData: UserFormData, cvElement: HTMLElement): Promise<void> {
  try {
    // Haetaan ensin ChatGPT:n generoima data
    const response = await fetch('/api/generate-cv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cvData)
    });

    if (!response.ok) {
      throw new Error('Failed to generate CV data');
    }

    const aiData = await response.json();

    // PDF generointi asetukset
    const opt = {
      margin: 10,
      filename: `${cvData.name}-CV.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      }
    };

    // Generoidaan PDF suoraan elementistä
    await html2pdf().set(opt).from(cvElement).save();

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}
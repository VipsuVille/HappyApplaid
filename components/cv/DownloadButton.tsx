// components/cv/DownloadButton.tsx
'use client';
import { PDFDocument, rgb } from 'pdf-lib';

type DownloadButtonProps = {
  cvElementRef: React.RefObject<HTMLElement>;
};

const DownloadButton = ({ cvElementRef }: DownloadButtonProps) => {
  const handleDownload = async () => {
    try {
      // Luo uusi PDF-dokumentti
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4-koko (leveys x korkeus)

      // Hae CV-elementin sisältö
      const cvElement = cvElementRef.current;
      if (!cvElement) {
        throw new Error('CV-elementtiä ei löytynyt.');
      }

      // Lisää tekstiä PDF-tiedostoon (esimerkki)
      const text = cvElement.innerText || 'CV-sisältö';
      page.drawText(text, {
        x: 50,
        y: 800, // Aloita ylhäältä
        size: 12,
        color: rgb(0, 0, 0), // Musta teksti
      });

      // Tallenna PDF-tiedosto
      const pdfBytes = await pdfDoc.save();

      // Luo Blob ja lataa tiedosto
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'cv.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF-generointivirhe:', error);
      alert('PDF:n lataaminen epäonnistui. Yritä uudelleen.');
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
    >
      Lataa CV (PDF)
    </button>
  );
};

export default DownloadButton;
export default function AccountPage() {
  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Oma tili</h1>
      <p>Tulossa pian...</p>
    </div>
  );
}/*
// app/admin/images/page.tsx
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

// Määritellään UploadResult-tyyppi vastaamaan imageUtils.ts tiedoston palautusarvoa
interface UploadResult {
  success: boolean;
  fileName: string;
  filePath?: string;
  publicUrl?: string;
  error?: string;
}

export default function UploadImagesPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [imageType, setImageType] = useState<'profile'|'background'>('profile');
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

 /* const handleUpload = async () => {
    if (!files || files.length === 0) return;
   
    setIsUploading(true);
    try {
      const filesArray = Array.from(files);
      // Käytetään suoraan supabase-instanssia lib/supabase.ts tiedostosta
      const uploadResults = await uploadDefaultImages(filesArray, imageType, supabase);
      setResults(uploadResults);
      
      // Kerää onnistuneiden latausten julkiset URL:t esikatselua varten
      const urls = uploadResults
        .filter(result => result.success && result.publicUrl)
        .map(result => result.publicUrl as string);
      
      setPreviewUrls(urls);
      
      // Tulostetaan julkiset URL:t konsoliin tarkistusta varten
      console.log("Julkiset URL:t:", urls);
    } catch (error) {
      console.error("Virhe kuvien latauksessa:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Lataa default-kuvia</h1>
     
      <div className="mb-4">
        <label className="block mb-2">Kuva tyyppi:</label>
        <select
          value={imageType}
          onChange={(e) => setImageType(e.target.value as 'profile' | 'background')}
          className="p-2 border rounded"
        >
          <option value="profile">Profiilikuva</option>
          <option value="background">Taustakuva</option>
        </select>
      </div>
     
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setFiles(e.target.files)}
        className="mb-4"
      />
     
      <button
   //     onClick={handleUpload}
        disabled={isUploading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isUploading ? 'Ladataan...' : 'Lataa kuvat'}
      </button>
     
      {results.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Tulokset:</h2>
          <ul>
            {results.map((result, index) => (
              <li key={index} className={result.success ? 'text-green-600' : 'text-red-600'}>
                {result.fileName}: {result.success 
                  ? `Onnistui${result.publicUrl ? ' - Julkinen URL luotu' : ''}` 
                  : `Epäonnistui${result.error ? ` - ${result.error}` : ''}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {previewUrls.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Ladatut kuvat:</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {previewUrls.map((url, index) => (
              <div key={index} className="border p-2">
                <img 
                  src={url} 
                  alt={`Ladattu kuva ${index + 1}`} 
                  className="w-full h-48 object-cover"
                />
                <div className="mt-2 text-xs break-all">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {url}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}*/
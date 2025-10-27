// app/admin/images/components/UploadForm.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('profile'); // Esim. 'profile', 'background'
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  

  useEffect(() => {
    // Voit lisätä tarkistuksen, että käyttäjä on admin
    async function checkAdmin() {
      const res = await fetch('/api/check-admin');
      if (!res.ok) {
        window.location.href = '/unauthorized';
      }
    }
    checkAdmin();
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !name) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('category', category);
    
    setIsUploading(true);
    
    try {
      const res = await fetch('/api/admin/images/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error('Kuvan lataus epäonnistui');
      
      // Päivitä näkymä
      router.refresh();
      
      // Tyhjennä lomake
      setFile(null);
      setName('');
      setIsUploading(false);
    } catch (error) {
      console.error('Virhe kuvan latauksessa:', error);
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg">
      <div className="mb-4">
        <label className="block mb-1">Nimi</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      
      <div className="mb-4">
        <label className="block mb-1">Kategoria</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="profile">Profiilikuva</option>
          <option value="background">Taustakuva</option>
        </select>
      </div>
      
      <div className="mb-4">
        <label className="block mb-1">Kuvatiedosto</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full p-2 border rounded"
          accept="image/*"
          required
        />
      </div>
      
      <button
        type="submit"
        disabled={isUploading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isUploading ? 'Ladataan...' : 'Lataa kuva'}
      </button>
    </form>
  );
}
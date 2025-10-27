// app/admin/images/components/ImageGallery.tsx
'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

type ImageItem = {
    id: string;
    name: string;
    url: string;
    category: string;
    is_active: boolean; // Lisätty
    created_at?: string; // Valinnainen
    updated_at?: string; // Valinnainen
  };

export default function ImageGallery() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchImages() {
      try {
        const res = await fetch('/api/admin/images');
        if (!res.ok) throw new Error('Kuvien haku epäonnistui');
        
        const data = await res.json();
        setImages(data);
      } catch (error) {
        console.error('Virhe kuvien haussa:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchImages();
  }, []);
  

// Lisää aktivointi/deaktivointi -painikkeet
const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/images/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      
      if (!res.ok) throw new Error('Statusin muutos epäonnistui');
      
      setImages(images.map(img => 
        img.id === id ? { ...img, is_active: !currentStatus } : img
      ));
    } catch (error) {
      console.error('Virhe:', error);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Haluatko varmasti poistaa tämän kuvan?')) return;
    
    try {
      const res = await fetch(`/api/admin/images/${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Kuvan poisto epäonnistui');
      
      // Päivitä näkymä poistamalla kuva listasta
      setImages(images.filter(img => img.id !== id));
    } catch (error) {
      console.error('Virhe kuvan poistossa:', error);
    }
  };
  
  if (loading) return <div>Ladataan kuvia...</div>;
  
  if (images.length === 0) return <div>Ei kuvia.</div>;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {images.map(image => (
        <div key={image.id} className="border rounded-lg overflow-hidden">
          <div className="relative h-48">
            <Image 
              src={image.url} 
              alt={image.name}
              fill
              style={{ objectFit: 'cover' }}
            />
          </div>
          
          <div className="p-3">
            <h3 className="font-medium">{image.name}</h3>
            <p className="text-sm text-gray-600">Kategoria: {image.category}</p>
            
            <div className="mt-3 flex justify-between">
              <button
                onClick={() => handleDelete(image.id)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Poista
              </button>
            </div>
            <button
  onClick={() => handleToggleActive(image.id, image.is_active)}
  className={`px-3 py-1 rounded ${
    image.is_active 
      ? 'bg-yellow-500 hover:bg-yellow-600' 
      : 'bg-green-500 hover:bg-green-600'
  } text-white`}
>
  {image.is_active ? 'Deaktivoi' : 'Aktivoi'}
</button>
          </div>
        </div>
      ))}
    </div>
  );
}
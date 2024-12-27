'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { getUserCVs, deleteStoredCV, getCVs } from '@/utils/supabaseUtils';
import { BaseCV } from '@/types';
import CVTemplate from '@/components/cv/CVTemplate';
import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import DownloadButton from '@/components/cv/DownloadButton';
import Header from '@/components/ui/Header';

export default function MyCVsPage() {
  const { userId, getToken } = useAuth();
  const [cvs, setCvs] = useState<BaseCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);


  useEffect(() => {
    if (userId) {
      (async () => {
        const fetchedCVs = await getCVs(userId);
        setCvs(fetchedCVs);
      })();
    }
  }, [userId]);

  async function loadCVs() {
    if (!userId) return;
    try {
      const supabaseToken = await getToken({ template: 'supabase-custom' });
      if (!supabaseToken) {
        throw new Error('Authentication token not available');
      }
      
      const userCVs = await getUserCVs(userId, supabaseToken);
      setCvs(userCVs);
    } catch (error) {
      console.error('Error loading CVs:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (cvId: string) => {
    if (!confirm('Haluatko varmasti poistaa tämän CV:n?')) return;
    
    setDeleteLoading(cvId);
    try {
      const supabaseToken = await getToken({ template: 'supabase-custom' });
      if (!supabaseToken) {
        throw new Error('Authentication token not available');
      }

      await deleteStoredCV(cvId, supabaseToken);
      await loadCVs(); // Päivitä lista poiston jälkeen
    } catch (error) {
      console.error('Error deleting CV:', error);
      alert('CV:n poistaminen epäonnistui');
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => {
    loadCVs();
  }, [userId, getToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Ladataan CV:itä...</div>
      </div>
    );
  }

  if (cvs.length === 0) {
    return (
      <div className="container mx-auto p-4">
                  <Header isLoading={loading} />
        <h1 className="text-2xl font-bold mb-4">Omat CV:t</h1>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Ei vielä luotuja CV:itä</p>
          <Link 
            href="/create-cv" 
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Luo ensimmäinen CV
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
                <Header isLoading={loading} />
      <div className="flex justify-between items-center mb-6 mt-16">
        <h1 className="text-2xl font-bold">Omat CV:t</h1>
        <Link
          href="/"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + Luo uusi CV
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cvs.map((cv) => (
          <div key={cv.id} className="border p-4 rounded shadow">
            <h2 className="font-bold">{cv.cv_data.name || 'Nimetön CV'}</h2>
            <div className="flex justify-between items-center mt-2">
            <Link 
              href={`/edit-cv/${cv.id}`}
              className="text-blue-500 hover:underline"
            >
              Edit PDF
            </Link>
            <a
              href={cv.ai_data.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-500 hover:underline"
            >
              View PDF
            </a>
          </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cvs.map((cv) => (
          <div key={cv.id} className="border rounded-lg p-4 shadow-lg relative group">
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={() => handleDelete(cv.id)}
                disabled={deleteLoading === cv.id}
                className="p-2 rounded-full bg-white shadow hover:bg-red-50 transition-colors"
                title="Poista CV"
              >
                <Trash2 
                  className={`w-5 h-5 ${deleteLoading === cv.id ? 'text-gray-400' : 'text-red-500'}`}
                />
              </button>
            </div>

            <div className="mb-4">
              <h2 className="text-xl font-semibold">{cv.cv_data.name}</h2>
              <p className="text-gray-600">
                Luotu: {new Date(cv.created_at).toLocaleDateString('fi-FI')}
              </p>
            </div>

            <div className="relative h-[297mm] w-full overflow-hidden rounded-lg shadow-inner">
              <div className="absolute inset-0">
                <CVTemplate
                  data={cv.cv_data}
                  aiData={cv.ai_data}
                  userData={cv.cv_data}
                  isPaid={true}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {cv.pdf_url && (
                <a
                  href={cv.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 block"
                >
                  Lataa aiemmin generoitu PDF
                </a>
              )}
              <DownloadButton
                userId={userId || ''}
                aiData={cv.ai_data}
                userData={cv.cv_data}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
// app/cover-letter-preview/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import CoverLetterContainer from '@/components/cover-letter/CoverLetterContainer';
import CoverLetterTemplate from '@/components/cover-letter/CoverLetterTemplate';

export default function CoverLetterPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const letterId = params?.id as string;
  const isPdfMode = searchParams?.get('pdf') === 'true';
  
  const [letter, setLetter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLetter = async () => {
      if (!letterId || typeof letterId !== 'string') {
        setError('Letter ID puuttuu');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Ladataan cover letter:', letterId, isPdfMode ? '(PDF mode)' : '(Normal mode)');

        const response = await fetch(`/api/cover-letters/${letterId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Cover letterin lataus epäonnistui');
        }

        const data = await response.json();

        if (!data) {
          throw new Error('Cover letteriä ei löytynyt');
        }

        console.log('✅ Cover letter ladattu:', {
          id: data.id,
          title: data.title,
          hasContent: !!data.content,
          hasBody: !!data.content?.body,
        });

        setLetter(data);
      } catch (err) {
        console.error('❌ Virhe cover letterin latauksessa:', err);
        setError(err instanceof Error ? err.message : 'Tuntematon virhe');
      } finally {
        setLoading(false);
      }
    };

    loadLetter();
  }, [letterId, isPdfMode]);

  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666', marginBottom: '10px' }}>
            Ladataan hakukirjettä...
          </div>
        </div>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', padding: '20px', maxWidth: '500px' }}>
          <div style={{ color: '#dc3545', fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
            ❌ Virhe hakukirjeen latauksessa
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>
            {error || 'Hakukirjettä ei löytynyt'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: white !important;
          font-family: 'Merriweather', serif !important;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        html {
          margin: 0 !important;
          padding: 0 !important;
        }

        #__next {
          margin: 0 !important;
          padding: 0 !important;
        }
      `}</style>

      <div
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: 'white',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        <CoverLetterContainer data-template-type="standard">
          <CoverLetterTemplate
            data={letter}
            ai_data={letter.ai_data || {}}
            isPdfPreview={isPdfMode}
            isEditing={false}
          />
        </CoverLetterContainer>
      </div>
    </>
  );
}
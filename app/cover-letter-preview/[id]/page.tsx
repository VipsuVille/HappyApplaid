// app/cover-letter-preview/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import CoverLetterContainer from '@/components/cover-letter/CoverLetterContainer';
import CoverLetterTemplate from '@/components/cover-letter/CoverLetterTemplate';
import { supabase } from '@/lib/supabase-client';

export default function CoverLetterPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const letterId = params?.id as string;
  const isPDFGeneration = searchParams?.get('pdf') === 'true';
  
  const [letter, setLetter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Funktio kuvien muuntamiseen PDF:ää varten (kuten CV:ssä)
  const convertImageForPDF = async (imageUrl: string): Promise<string> => {
    if (!isPDFGeneration || !imageUrl || imageUrl.startsWith("data:")) {
      console.log("⏭️ Skipping conversion:", {
        isPDFGeneration,
        hasUrl: !!imageUrl,
        isBase64: imageUrl?.startsWith("data:")
      });
      return imageUrl;
    }

    try {
      console.log("🔄 Converting image:", imageUrl.substring(0, 100) + "...");

      const response = await fetch(
        `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
      );

      console.log("📥 Proxy response status:", response.status);

      if (!response.ok) {
        console.error("❌ Proxy failed:", response.statusText);
        return imageUrl;
      }

      const data = await response.json();
      
      console.log("📦 Proxy response data:", {
        hasBase64: !!data.base64,
        base64Length: data.base64?.length || 0,
        base64Prefix: data.base64?.substring(0, 50) || 'N/A'
      });

      if (data.base64) {
        console.log("✅ Image converted successfully, length:", data.base64.length);
        return data.base64;
      }

      console.warn("⚠️ No base64 in response");
      return imageUrl;
    } catch (error) {
      console.error("❌ Error converting image:", error);
      return imageUrl;
    }
  };

  useEffect(() => {
    const loadLetter = async () => {
      if (!letterId || typeof letterId !== 'string') {
        console.error('❌ Letter ID puuttuu');
        setError('Letter ID puuttuu');
        setLoading(false);
        return;
      }

      try {
        console.log(
          '🔍 Ladataan cover letter:',
          letterId,
          isPDFGeneration ? '(PDF mode)' : '(Normal mode)'
        );

        // ✅ Käytä API routea (kuten CV:ssä)
        const response = await fetch(`/api/cover-letters/${letterId}`);

        console.log('📥 API response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ API error:', errorData);
          throw new Error(errorData.error || 'Cover letterin lataus epäonnistui');
        }

        const responseData = await response.json();
        console.log('📦 API response data:', {
          hasCoverLetter: !!responseData.coverLetter,
          hasContent: !!responseData.coverLetter?.content,
        });

        const { coverLetter: data } = responseData;

        if (!data) {
          console.error('❌ Cover letter data puuttuu');
          throw new Error('Cover letteriä ei löytynyt');
        }

        console.log('✅ Cover letter ladattu onnistuneesti:', {
          id: data.id,
          title: data.title,
          hasContent: !!data.content,
          hasBody: !!data.content?.body,
          contentKeys: data.content ? Object.keys(data.content) : [],
        });

        let processedLetter = { ...data };

        // ✅ VARMISTA että content-rakenne on olemassa
        if (!processedLetter.content) {
          console.warn('⚠️ Content puuttuu, luodaan tyhjä rakenne');
          processedLetter.content = {};
        }

        if (!processedLetter.ai_data) {
          processedLetter.ai_data = {};
        }

        // ✅ PROFIILIKUVA käsittely (jos cover letterissä on kuva)
        if (data.content?.profile_image || data.ai_data?.profile_image) {
          let profileUrl = data.content?.profile_image || data.ai_data?.profile_image;

          console.log('👤 Profiilikuva alkuperäinen:', profileUrl?.substring(0, 100) + '...');

          // ✅ TARKISTA: Onko jo base64?
          if (profileUrl.startsWith('data:image')) {
            console.log('👤 ✅ Profiilikuva on jo base64');
            if (data.content?.profile_image) {
              processedLetter.content.profile_image = profileUrl;
            } else {
              processedLetter.ai_data.profile_image = profileUrl;
            }
          }
          // ✅ TARKISTA: Onko HTTP URL?
          else if (profileUrl.startsWith('http')) {
            console.log('👤 🌐 Profiilikuva on HTTP URL');

            if (isPDFGeneration) {
              console.log('👤 📄 PDF mode - muunnetaan base64:ksi');
              profileUrl = await convertImageForPDF(profileUrl);
            }

            if (data.content?.profile_image) {
              processedLetter.content.profile_image = profileUrl;
            } else {
              processedLetter.ai_data.profile_image = profileUrl;
            }
          }
          // ✅ Muuten Supabase storage path
          else {
            console.log('👤 💾 Profiilikuva on Supabase storage path');

            if (isPDFGeneration) {
              const { data: publicUrlData } = supabase.storage
                .from('cv_files')
                .getPublicUrl(profileUrl);

              if (publicUrlData?.publicUrl) {
                console.log('👤 🔄 Muunnetaan base64:ksi');
                profileUrl = await convertImageForPDF(publicUrlData.publicUrl);
              }
            } else {
              try {
                const { data: signedUrlData, error: urlError } =
                  await supabase.storage.from('cv_files').createSignedUrl(
                    profileUrl,
                    7 * 24 * 60 * 60
                  );

                if (!urlError && signedUrlData?.signedUrl) {
                  console.log('👤 ✍️ Signed URL luotu');
                  profileUrl = signedUrlData.signedUrl;
                }
              } catch (urlError) {
                console.warn('⚠️ URL:n haku epäonnistui:', urlError);
              }
            }

            if (data.content?.profile_image) {
              processedLetter.content.profile_image = profileUrl;
            } else {
              processedLetter.ai_data.profile_image = profileUrl;
            }
          }
        }

        console.log('✅ Cover letter prosessoitu onnistuneesti');
        console.log('🎨 FINAL COVER LETTER DATA:', {
          hasContent: !!processedLetter.content,
          hasBody: !!processedLetter.content?.body,
          hasAiData: !!processedLetter.ai_data,
        });

        setLetter(processedLetter);
      } catch (err) {
        console.error('❌ Virhe cover letterin latauksessa:', err);
        setError(err instanceof Error ? err.message : 'Tuntematon virhe');
      } finally {
        setLoading(false);
      }
    };

    loadLetter();
  }, [letterId, isPDFGeneration]);

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
          <div style={{ 
            fontSize: '18px', 
            color: '#666',
            marginBottom: '10px' 
          }}>
            Ladataan hakukirjettä...
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
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
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          maxWidth: '500px' 
        }}>
          <div style={{ 
            color: '#dc3545', 
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '10px'
          }}>
            ❌ Virhe hakukirjeen latauksessa
          </div>
          <div style={{ 
            color: '#666', 
            fontSize: '14px' 
          }}>
            {error || 'Hakukirjettä ei löytynyt'}
          </div>
          <div style={{
            marginTop: '20px',
            fontSize: '12px',
            color: '#999'
          }}>
            Letter ID: {letterId}
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

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
        <CoverLetterContainer data-template-type="standard" className="mx-auto">
          <CoverLetterTemplate
            data={letter}
            ai_data={letter.ai_data || {}}
            isPdfPreview={isPDFGeneration}
            isEditing={false}
          />
        </CoverLetterContainer>
      </div>
    </>
  );
}
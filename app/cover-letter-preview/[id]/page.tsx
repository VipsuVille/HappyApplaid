// app/cover-letter-preview/[id]/page.tsx - CLIENT-SIDE + PDF-OPTIMOITU
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import CoverLetterContainer from '@/components/cover-letter/CoverLetterContainer';
import CoverLetterTemplate from '@/components/cover-letter/CoverLetterTemplate';
import CoverLetterHeader from '@/components/cover-letter/CoverLetterHeader';
import { supabase } from '@/lib/supabase-client';

export default function CoverLetterPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const letterId = params?.id as string;
  const isPDFGeneration = searchParams?.get('pdf') === 'true';
  
  const [letter, setLetter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const convertImageForPDF = async (imageUrl: string): Promise<string> => {
    if (!isPDFGeneration || !imageUrl || imageUrl.startsWith("data:")) {
      return imageUrl;
    }

    try {
      const response = await fetch(
        `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
      );

      if (!response.ok) {
        console.error("❌ Proxy failed:", response.statusText);
        return imageUrl;
      }

      const data = await response.json();
      
      if (data.base64) {
        console.log("✅ Image converted successfully");
        return data.base64;
      }

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

        const response = await fetch(`/api/cover-letters/${letterId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Cover letterin lataus epäonnistui');
        }

        const responseData = await response.json();
        const { coverLetter: data } = responseData;

        if (!data) {
          throw new Error('Cover letteriä ei löytynyt');
        }

        console.log('✅ Cover letter ladattu:', data.id);

        let processedLetter = { ...data };

        if (!processedLetter.content) {
          processedLetter.content = {};
        }

        if (!processedLetter.ai_data) {
          processedLetter.ai_data = {};
        }

        // Profiilikuva käsittely (jos tarvitaan)
        if (data.content?.profile_image || data.ai_data?.profile_image) {
          let profileUrl = data.content?.profile_image || data.ai_data?.profile_image;

          if (profileUrl.startsWith('data:image')) {
            // Already base64
          } else if (profileUrl.startsWith('http')) {
            if (isPDFGeneration) {
              profileUrl = await convertImageForPDF(profileUrl);
            }
          } else {
            // Supabase storage path
            if (isPDFGeneration) {
              const { data: publicUrlData } = supabase.storage
                .from('cv_files')
                .getPublicUrl(profileUrl);

              if (publicUrlData?.publicUrl) {
                profileUrl = await convertImageForPDF(publicUrlData.publicUrl);
              }
            } else {
              try {
                const { data: signedUrlData } =
                  await supabase.storage.from('cv_files').createSignedUrl(
                    profileUrl,
                    7 * 24 * 60 * 60
                  );

                if (signedUrlData?.signedUrl) {
                  profileUrl = signedUrlData.signedUrl;
                }
              } catch (urlError) {
                console.warn('⚠️ URL:n haku epäonnistui:', urlError);
              }
            }
          }

          if (data.content?.profile_image) {
            processedLetter.content.profile_image = profileUrl;
          } else {
            processedLetter.ai_data.profile_image = profileUrl;
          }
        }

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

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div style={{
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
      }}>
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

  // ✅ ERROR STATE
  if (error || !letter) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
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
        </div>
      </div>
    );
  }

  // ✅ PDF-TILA: Minimalistinen renderöinti
  if (isPDFGeneration) {
    return (
      <>
        {/* ✅ GOOGLE FONTS */}
        <link
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Merriweather:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />

        {/* ✅ INLINE CSS - PAKOTTAA TYYLIT */}
        <style dangerouslySetInnerHTML={{ __html: `
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            background: white;
            overflow: hidden;
          }

          body {
            font-family: 'Merriweather', serif !important;
          }

          @page {
            size: A4;
            margin: 0;
          }

          @media print {
            html, body {
              width: 210mm;
              height: 297mm;
              margin: 0 !important;
              padding: 0 !important;
            }

            .no-print {
              display: none !important;
            }

            * {
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }

          /* ✅ SININEN PALKKI */
          .cover-letter-accent {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 12px !important;
            height: 100% !important;
            background: linear-gradient(to bottom, #3498db, #2980b9, #3498db) !important;
            box-shadow: inset -1px 0 3px rgba(0,0,0,0.1) !important;
            z-index: 1 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          .cover-letter-top-accent {
            position: absolute !important;
            top: 0 !important;
            left: 12px !important;
            right: 0 !important;
            height: 8px !important;
            background: linear-gradient(to right, #3498db, #ede7f6) !important;
            opacity: 0.7 !important;
            z-index: 1 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          /* ✅ ALLEKIRJOITUS */
          .signature-text {
            font-family: 'Dancing Script', cursive !important;
          }

          .signature-line {
            border-bottom: 2px solid #3498db !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          /* ✅ OTSIKKO */
          h1 {
            border-bottom: 2px solid #3498db !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          /* ✅ PIILOTA KAIKKI NAVIGAATIO */
          header, nav, .no-print, [role="banner"] {
            display: none !important;
          }
        `}} />

        {/* ✅ VAIN HAKUKIRJE */}
        <div style={{
          width: '210mm',
          height: '297mm',
          margin: 0,
          padding: 0,
          background: 'white',
          position: 'relative'
        }}>
          <CoverLetterContainer 
            templateType="standard"
            style={{ 
              boxShadow: 'none',
              borderRadius: 0,
              margin: 0
            }}
          >
            <CoverLetterHeader
              applicantInfo={{
                name: letter.content?.applicant_info?.name || 
                      letter.content?.applicant_info?.full_name || 
                      'Hakija',
                full_name: letter.content?.applicant_info?.name || 
                          letter.content?.applicant_info?.full_name || 
                          'Hakija',
              }}
              date={letter.created_at ? 
                new Date(letter.created_at).toLocaleDateString('fi-FI') : 
                new Date().toLocaleDateString('fi-FI')
              }
              isEditing={false}
            />
            <CoverLetterTemplate
              data={{
                title: letter.title || 'Hakukirje',
                content: letter.content || {}
              }}
              ai_data={letter.ai_data || {
                html: { content: letter.content?.body || '' },
                styles: { main_style: '' }
              }}
              isEditing={false}
              isPdfPreview={true}
            />
          </CoverLetterContainer>
        </div>
      </>
    );
  }

  // ✅ NORMAALITILA: Koko UI
  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #f5f5f5 !important;
          font-family: 'Merriweather', serif !important;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        html {
          margin: 0 !important;
          padding: 0 !important;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '40px 20px'
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          <CoverLetterContainer 
            data-template-type="standard" 
            style={{
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              borderRadius: '3px'
            }}
          >
            <CoverLetterHeader
              applicantInfo={{
                name: letter.content?.applicant_info?.name || 
                      letter.content?.applicant_info?.full_name || 
                      'Hakija',
                full_name: letter.content?.applicant_info?.name || 
                          letter.content?.applicant_info?.full_name || 
                          'Hakija',
              }}
              date={letter.created_at ? 
                new Date(letter.created_at).toLocaleDateString('fi-FI') : 
                new Date().toLocaleDateString('fi-FI')
              }
              isEditing={false}
            />
            <CoverLetterTemplate
              data={{
                title: letter.title || 'Hakukirje',
                content: letter.content || {}
              }}
              ai_data={letter.ai_data || {
                html: { content: letter.content?.body || '' },
                styles: { main_style: '' }
              }}
              isEditing={false}
              isPdfPreview={false}
            />
          </CoverLetterContainer>
        </div>
      </div>
    </>
  );
}
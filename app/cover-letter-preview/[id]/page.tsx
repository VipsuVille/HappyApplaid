// app/cover-letter-preview/[id]/page.tsx
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import CoverLetterContainer from '@/components/cover-letter/CoverLetterContainer';
import CoverLetterTemplate from '@/components/cover-letter/CoverLetterTemplate';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pdf?: string }>;
}

export default async function CoverLetterPreviewPage({ 
  params,
  searchParams 
}: PageProps) {
  const { id } = await params;
  const { pdf } = await searchParams;
  const isPdfMode = pdf === 'true';

  // ✅ HAE COVER LETTER TIETOKANNASTA
  const { data: letter, error } = await supabaseAdmin
    .from('cover_letters')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !letter) {
    notFound();
  }

  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <link
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Merriweather:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
        <style>
          {`
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 0;
              background: ${isPdfMode ? 'white' : '#f5f5f5'};
            }

            ${isPdfMode ? `
              @media print {
                body {
                  margin: 0 !important;
                  padding: 0 !important;
                }
                .cover-letter-container {
                  box-shadow: none !important;
                  border-radius: 0 !important;
                }
              }
            ` : ''}
          `}
        </style>
      </head>
      <body>
        <CoverLetterContainer data-template-type="standard">
          <CoverLetterTemplate
            data={letter}
            ai_data={letter.ai_data}
            isPdfPreview={isPdfMode}
            isEditing={false}
          />
        </CoverLetterContainer>
      </body>
    </html>
  );
}
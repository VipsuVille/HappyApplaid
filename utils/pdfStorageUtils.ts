import { createClient } from '@supabase/supabase-js';
import html2pdf from 'html2pdf.js';
import type { UserFormData, AIData, BaseCV } from '@/types';
import { generateSignedUrl } from '@/lib/supabase';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface GeneratePDFParams {
  cvData: UserFormData;
  aiData: AIData;
  cvElement: HTMLElement;
  userId: string;
  authToken: string;
}

// Get authenticated Supabase client
const getAuthenticatedClient = async (token: string) => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
};

// Convert file to base64
const fileToBase64 = async (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// Generate PDF and store in Supabase
export const generateAndStorePDF = async ({
  cvData,
  aiData,
  cvElement,
  userId,
  authToken
}: GeneratePDFParams): Promise<{ pdfUrl: string; dbRecord: BaseCV }> => {
  try {
    const authenticatedClient = await getAuthenticatedClient(authToken);

    // PDF generation options
    const pdfOptions = {
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

    // Generate PDF blob
    const pdfBlob = await new Promise<Blob>((resolve, reject) => {
      html2pdf()
        .set(pdfOptions)
        .from(cvElement)
        .save()
        .then((pdf: any) => {
          // html2pdf palauttaa worker-objektin, joten meidän täytyy pyytää blob erikseen
          return pdf.output('blob');
        })
        .then((blob: Blob) => resolve(blob))
        .catch(reject);
    });

    // Convert PDF to base64
    const pdfBase64 = await fileToBase64(pdfBlob);

    // Prepare initial CV record
    const timestamp = Date.now();
    const pdfFilename = `${userId}-${timestamp}.pdf`;
    const backgroundFilename = `${userId}-${timestamp}-bg.png`;

    // TALLENNETAAN PDF TIEDOSTO!!
    const { data: pdfData, error: pdfError } = await authenticatedClient
    .storage
    .from('cv_files')
    .upload(pdfFilename, pdfBlob, {
      contentType: 'application/pdf',
      upsert: false,
      metadata: {
        user_id: userId
      }
    });

    if (pdfError) throw pdfError;

    // Store background image if exists
    let backgroundUrl = '';
    if (aiData.background) {
      const base64Regex = /^data:image\/\w+;base64,/;
      const base64Data = aiData.background.replace(base64Regex, '');
      const imageBlob = Buffer.from(base64Data, 'base64');

      const { data: bgData, error: bgError } = await authenticatedClient
  .storage
  .from('cv_files')
  .upload(backgroundFilename, imageBlob, {
    contentType: 'image/png',
    upsert: false,
    metadata: {
      user_id: userId
    }
  });

      if (bgError) throw bgError;

      const { data: publicBgUrl } = authenticatedClient
        .storage
        .from('cv_files')
        .getPublicUrl(backgroundFilename);

      backgroundUrl = publicBgUrl.publicUrl;
    }

    // Get PDF public URL
    const { data: publicPdfUrl } = authenticatedClient
      .storage
      .from('cv_files')
      .getPublicUrl(pdfFilename);

    // Prepare CV record
    const { data: pdfSignedData, error: pdfSignError } = await authenticatedClient
  .storage
  .from('cv_files')
  .createSignedUrl(pdfFilename, 60 * 60 * 24 * 30); // 30 päivää

if (pdfSignError) throw pdfSignError;

// Now use the signed URL in cvRecord
const cvRecord = {
  user_id: userId,
  cv_data: cvData,
  ai_data: {
    ...aiData,
    background: backgroundUrl,
    pdf_url: pdfSignedData.signedUrl, // Use this instead of undefined pdfSignedUrl
    urls_expire_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  }
    };
    // Store CV record in database
    const { data: dbData, error: dbError } = await authenticatedClient
      .from('cvs')
      .insert([cvRecord])
      .select()
      .single();

    if (dbError) {
      // Cleanup storage if database insert fails
      await authenticatedClient.storage
        .from('cv_files')
        .remove([pdfFilename, backgroundFilename]);
      throw dbError;
    }

    return {
      pdfUrl: publicPdfUrl.publicUrl,
      dbRecord: dbData
    };

  } catch (error) {
    console.error('Error in generateAndStorePDF:', error);
    throw error;
  }
};

export const fetchStoredCV = async (
  cvId: string,
  authToken: string
): Promise<BaseCV> => {
  try {
    const authenticatedClient = await getAuthenticatedClient(authToken);

    // Haetaan ensin käyttäjän CV ja varmistetaan omistajuus
    const { data: cv, error } = await authenticatedClient
      .from('cvs')
      .select('*')
      .eq('id', cvId)
      .single();

    if (error) throw error;

    // Tarkista URL:ien voimassaolo
    if (cv.ai_data.urls_expire_at) {
      const urlsExpireAt = new Date(cv.ai_data.urls_expire_at);
      const now = new Date();
      
      // Jos URL:t vanhenevat pian (esim. 24h sisällä), päivitä ne
      if (urlsExpireAt.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
        const newPdfUrl = await generateSignedUrl('cv_files', cv.ai_data.pdf_url.split('/').pop()!);
        const newBgUrl = cv.ai_data.background ? 
          await generateSignedUrl('cv_files', cv.ai_data.background.split('/').pop()!) : 
          '';

        // Päivitä URLs tietokantaan
        const newExpiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const { error: updateError } = await authenticatedClient
          .from('cvs')
          .update({
            ai_data: {
              ...cv.ai_data,
              pdf_url: newPdfUrl,
              background: newBgUrl,
              urls_expire_at: newExpiryDate.toISOString()
            }
          })
          .eq('id', cvId);

        if (updateError) throw updateError;

        cv.ai_data.pdf_url = newPdfUrl;
        cv.ai_data.background = newBgUrl;
        cv.ai_data.urls_expire_at = newExpiryDate.toISOString();
      }
    }

    return cv;
  } catch (error) {
    console.error('Error fetching stored CV:', error);
    throw error;
  }
};
export const updateCV = async (
  cvId: string, 
  cvData: BaseCV, 
  authToken: string
): Promise<void> => {
  try {
    const authenticatedClient = await getAuthenticatedClient(authToken);

    const { error: updateError } = await authenticatedClient
      .from('cvs')
      .update({ 
        cv_data: cvData.cv_data,
        ai_data: cvData.ai_data
      })
      .eq('id', cvId);

    if (updateError) {
      throw new Error(`Failed to update CV: ${updateError.message}`);
    }
  } catch (error) {
    console.error('Error updating CV:', error);
    throw error;
  }
};
// Delete stored CV and all related files
export const deleteStoredCV = async (
  cvId: string,
  authToken: string
): Promise<void> => {
  try {
    const authenticatedClient = await getAuthenticatedClient(authToken);

    // Fetch CV data first to get file paths
    const cv = await fetchStoredCV(cvId, authToken);
    
    // Delete files from storage
    if (cv.ai_data.pdf_url) {
      const pdfFilename = cv.ai_data.pdf_url.split('/').pop();
      await authenticatedClient.storage
        .from('cv_files')
        .remove([pdfFilename!]);
    }

    if (cv.ai_data.background) {
      const bgFilename = cv.ai_data.background.split('/').pop();
      await authenticatedClient.storage
        .from('cv_files')
        .remove([bgFilename!]);
    }

    // Delete CV record
    const { error } = await authenticatedClient
      .from('cvs')
      .delete()
      .eq('id', cvId);

    if (error) throw error;

  } catch (error) {
    console.error('Error deleting stored CV:', error);
    throw error;
  }
};
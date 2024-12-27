import { createClient } from '@supabase/supabase-js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { BaseCV, AIData, SaveCVParams, UserFormData } from '@/types';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const getAuthenticatedClient = async (token: string) => {
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
export const getCVs = async (userId: string) => {
  const { data, error } = await supabase
    .from('cvs')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
};
export const getCVById = async (id: string) => {
  const { data, error } = await supabase
    .from('cvs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};
async function generatePDF(cvElement: HTMLElement): Promise<Blob> {
  const scale = 2; // Korkeampi laatu
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageHeight = pdf.internal.pageSize.height;
  const pageWidth = pdf.internal.pageSize.width;

  const canvas = await html2canvas(cvElement, {
    scale: scale,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: cvElement.scrollWidth,
    windowHeight: cvElement.scrollHeight
  });

  const imgData = canvas.toDataURL('image/jpeg', 1.0);
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
  return pdf.output('blob');
}

export const saveCV = async ({ 
  userId, 
  cvData, 
  aiData, 
  authToken,
  cvElement
}: SaveCVParams & { authToken: string; cvElement: HTMLElement }): Promise<string> => {
  try {
    if (!authToken) {
      throw new Error('Authentication token not available');
    }

    const authenticatedClient = await getAuthenticatedClient(authToken);
    const timestamp = Date.now();

    // Generate PDF
    const pdfBlob = await generatePDF(cvElement);
    const pdfFilename = `${userId}-${timestamp}.pdf`;

    // Save PDF to storage bucket
    const { data: pdfStorageData, error: pdfStorageError } = await authenticatedClient
      .storage
      .from('cv_files')
      .upload(pdfFilename, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (pdfStorageError) {
      throw pdfStorageError;
    }

    // Get signed URL for PDF with extended expiry
    const { data: pdfSignedData, error: pdfSignError } = await authenticatedClient
      .storage
      .from('cv_files')
      .createSignedUrl(pdfFilename, 60 * 60 * 24 * 7); // 7 days expiry

    if (pdfSignError) {
      throw pdfSignError;
    }

    // Prepare CV record with initial data
    const cvRecord = {
      user_id: userId,
      cv_data: cvData,
      ai_data: {
        html: aiData.html || '',
        styles: aiData.styles || '',
        images: aiData.images || [],
        profile: aiData.profile || '',
        background: '', // Temporary URL
        pdf_url: pdfSignedData.signedUrl
      }
    };

    // Save base record
    const { data: dbData, error: dbError } = await authenticatedClient
      .from('cvs')
      .insert([cvRecord])
      .select()
      .single();

    if (dbError) {
      // Cleanup PDF if database insert fails
      await authenticatedClient.storage.from('cv_files').remove([pdfFilename]);
      throw dbError;
    }

    // Handle background image if exists
    if (aiData.background) {
      const base64Regex = /^data:image\/\w+;base64,/;
      const base64Data = aiData.background.replace(base64Regex, '');
      const blob = Buffer.from(base64Data, 'base64');
      const filename = `${dbData.id}-${timestamp}.png`;

      const { data: storageData, error: storageError } = await authenticatedClient
        .storage
        .from('cv_files')
        .upload(filename, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (storageError) {
        // Cleanup everything if upload fails
        await authenticatedClient.from('cvs').delete().eq('id', dbData.id);
        await authenticatedClient.storage.from('cv_files').remove([pdfFilename, filename]);
        throw storageError;
      }

      // Get signed URL for background image
      const { data: signedUrlData, error: signUrlError } = await authenticatedClient
        .storage
        .from('cv_files')
        .createSignedUrl(filename, 60 * 60 * 24 * 7); // 7 days expiry

      if (signUrlError) {
        throw signUrlError;
      }

      // Update record with background URL
      const { error: updateError } = await authenticatedClient
        .from('cvs')
        .update({ 
          ai_data: {
            ...cvRecord.ai_data,
            background: signedUrlData.signedUrl
          }
        })
        .eq('id', dbData.id);

      if (updateError) {
        await authenticatedClient.from('cvs').delete().eq('id', dbData.id);
        await authenticatedClient.storage.from('cv_files').remove([pdfFilename, filename]);
        throw updateError;
      }
    }

    return dbData.id;

  } catch (error) {
    console.error('Error in saveCV:', error);
    throw error;
  }
};


export const getUserCVs = async (
  userId: string, 
  authToken: string
): Promise<BaseCV[]> => {
  try {
    if (!authToken) {
      throw new Error('Authentication token not available');
    }

    const authenticatedClient = await getAuthenticatedClient(authToken);

    const { data, error } = await authenticatedClient
      .from('cvs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(cv => ({
      ...cv,
      pdfUrl: cv.ai_data?.pdf_url || ''
    })) as BaseCV[];
  } catch (error) {
    console.error('Error fetching user CVs:', error);
    throw error;
  }
};
export const deleteStoredCV = async (cvId: string, authToken: string): Promise<void> => {
  const authenticatedClient = await getAuthenticatedClient(authToken);

  // Hae CV-tiedot tietokannasta
  const { data: cvData, error: fetchError } = await authenticatedClient
    .from('cvs')
    .select('ai_data')
    .eq('id', cvId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch CV: ${fetchError.message}`);
  }

  const pdfUrl = cvData?.ai_data?.pdf_url || '';
  const filename = pdfUrl.split('/').pop(); // Poimi tiedoston nimi URL:sta

  // Poista tiedosto Supabase Storage:sta
  if (filename) {
    const { error: deleteFileError } = await authenticatedClient
      .storage
      .from('cv_files')
      .remove([filename]);

    if (deleteFileError) {
      throw new Error(`Failed to delete file: ${deleteFileError.message}`);
    }
  }

  // Poista tietue tietokannasta
  const { error: deleteRecordError } = await authenticatedClient
    .from('cvs')
    .delete()
    .eq('id', cvId);

  if (deleteRecordError) {
    throw new Error(`Failed to delete CV record: ${deleteRecordError.message}`);
  }
};
// Add this to your supabaseUtils.ts file

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
export const fetchStoredCV = async (cvId: string, authToken: string) => {
  const authenticatedClient = await getAuthenticatedClient(authToken);

  const { data, error } = await authenticatedClient
    .from('cvs')
    .select('*')
    .eq('id', cvId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch CV: ${error.message}`);
  }

  return data;
};


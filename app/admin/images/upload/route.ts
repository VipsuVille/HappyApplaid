
// app/admin/images/[id]/route.ts
import { NextResponse } from 'next/server';

export async function DELETE() {
  return NextResponse.json(
    { error: 'This endpoint is currently disabled' },
    { status: 503 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'This endpoint is currently disabled' },
    { status: 503 }
  );
}
/*// app/api/admin/images/upload/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
// import supabaseAdmin from '@/lib/supabase-admin';


interface ClerkPublicMetadata {
    role?: string;
  }
export async function POST(req: Request) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.publicMetadata as ClerkPublicMetadata)?.role;
   
  // Tarkista admin-oikeudet
  if (!userId || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
 
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const category = formData.get('category') as string;
   
    if (!file || !name || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
   
    // Generoi uniikki tiedostonimi
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `default-images/${fileName}`;
   
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('cv_files') // Käytä oikeaa bucketia
      .upload(filePath, file);
   
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }
   
    // Get public URL
  //  const { data: urlData } = supabaseAdmin.storage
 //     .from('cv_files')
  //    .getPublicUrl(uploadData.path);
   
    // Tallenna tietokantaan
  //  const { data, error: dbError } = await supabaseAdmin
//.from('default_images')
   /*   .insert({
        image_type: category,
        file_path: filePath,
        is_active: true,
        name: name
      })
      .select();
   
    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }
   
    return NextResponse.json({
      success: true,
      image: data[0],
      publicUrl: urlData.publicUrl
    });
   
  } catch (error: unknown) {
    console.error('Error uploading image:', error);
    
    // Tarkista, onko error olio jolla on message-ominaisuus
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: 'Failed to upload image', details: errorMessage },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false, // Tarvitaan FormDataa varten
  },
};*/
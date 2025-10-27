import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testBucket() {
  // Luo testitiedosto
  const testBlob = new Blob(['Testi sisältö'], { type: 'text/plain' });

  // Tallenna tiedosto
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('cv_files')
    .upload('testi.txt', testBlob);

  if (uploadError) {
    console.error('Tallennus epäonnistui:', uploadError);
    return;
  }
  console.log('Tiedosto tallennettu:', uploadData);

  // Hae tiedosto (allekirjoitettu URL)
  const { data: signedUrlData, error: signedUrlError } = await supabase
    .storage
    .from('cv_files')
    .createSignedUrl('testi.txt', 3600);

  if (signedUrlError) {
    console.error('URL:n luonti epäonnistui:', signedUrlError);
    return;
  }
  console.log('Allekirjoitettu URL:', signedUrlData.signedUrl);
}

testBucket();
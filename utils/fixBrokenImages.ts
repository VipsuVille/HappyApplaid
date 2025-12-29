// app/api/fix-images/route.ts
import { supabaseAdmin } from "@/lib/supabase";

export async function fixBrokenImageUrls() {
  console.log("🔧 Aloitetaan kuvien korjaus...");
  
  const { data: cvs, error } = await supabaseAdmin
    .from("cvs")
    .select("*");

  if (error) {
    console.error("❌ Virhe haettaessa CV:itä:", error);
    return { success: false, error };
  }

  let fixedCount = 0;

  for (const cv of cvs || []) {
    let needsUpdate = false;
    const updates: any = { content: { ...cv.content } };

    // ✅ KORJAA PROFIILIKUVA
    const profileImg = cv.content?.cv_data?.profileImage;
    if (profileImg && profileImg.includes("supabase.co/storage/v1/object/public/cv_files/data:image")) {
      const base64Match = profileImg.match(/(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)/);
      if (base64Match) {
        updates.content.cv_data = {
          ...cv.content.cv_data,
          profileImage: base64Match[1]
        };
        needsUpdate = true;
        console.log(`✅ Korjattu profiilikuva CV:ssä ${cv.id}`);
      }
    }

    // ✅ KORJAA TAUSTAKUVA
    const bgImg = cv.content?.ai_data?.background_image;
    if (bgImg && bgImg.includes("supabase.co/storage/v1/object/public/cv_files/data:image")) {
      const base64Match = bgImg.match(/(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)/);
      if (base64Match) {
        updates.content.ai_data = {
          ...cv.content.ai_data,
          background_image: base64Match[1]
        };
        needsUpdate = true;
        console.log(`✅ Korjattu taustakuva CV:ssä ${cv.id}`);
      }
    }

    if (needsUpdate) {
      const { error: updateError } = await supabaseAdmin
        .from("cvs")
        .update(updates)
        .eq("id", cv.id);

      if (updateError) {
        console.error(`❌ Virhe päivittäessä CV:tä ${cv.id}:`, updateError);
      } else {
        fixedCount++;
      }
    }
  }

  console.log(`🎉 Korjattu ${fixedCount} CV:tä yhteensä`);
  return { success: true, fixedCount };
}
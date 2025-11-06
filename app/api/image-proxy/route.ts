// app/api/image-proxy/route.ts - DEBUG VERSION
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  // --- DEBUG: Alku ---
  console.log(`[IMAGE_PROXY] 🔍 Request received. URL parameter: ${imageUrl ? imageUrl.substring(0, 100) + '...' : 'MISSING'}`);
  // --- DEBUG: Loppu ---
 
  if (!imageUrl) {
    console.error('[IMAGE_PROXY] ❌ URL parameter is missing.');
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }
 
  const isRelativePath = imageUrl.startsWith('/') && !imageUrl.startsWith('//');
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_CONTENT_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'
  ];
 
  try {
    let arrayBuffer;
    let contentType;
    let fetchUrl = imageUrl; // URL jota kutsutaan
    
    if (isRelativePath) {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      fetchUrl = new URL(imageUrl, baseUrl).toString();
      console.log(`[IMAGE_PROXY] 🌐 Relative path detected. Full URL: ${fetchUrl.substring(0, 100) + '...'}`);
    } else {
      try {
        new URL(imageUrl);
        console.log(`[IMAGE_PROXY] 🔗 Absolute URL validated.`);
      } catch {
        console.error('[IMAGE_PROXY] ❌ Invalid absolute URL format.');
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }
    }
    
    // --- KUTSU ULKOISEEN KUVAAN ---
    console.log(`[IMAGE_PROXY] 📥 Attempting to fetch: ${fetchUrl.substring(0, 100) + '...'}`);
    
    const imageResponse = await fetch(fetchUrl);
    
    if (!imageResponse.ok) {
      console.error(`[IMAGE_PROXY] ❌ Fetch failed. Status: ${imageResponse.status}, StatusText: ${imageResponse.statusText}`);
      // Yritä lukea virheteksti, jos mahdollista
      try {
        const errorBody = await imageResponse.text();
        console.error(`[IMAGE_PROXY] ❌ Response Body snippet: ${errorBody.substring(0, 200)}`);
      } catch (e) {
        console.error('[IMAGE_PROXY] ⚠️ Could not read error body.');
      }
      
      return NextResponse.json({
        error: `Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`
      }, { status: imageResponse.status >= 400 && imageResponse.status < 500 ? 400 : 500 });
    }
    
    console.log('[IMAGE_PROXY] ✅ Image fetched successfully.');

    contentType = imageResponse.headers.get('content-type');
    arrayBuffer = await imageResponse.arrayBuffer();

    // Check content type
    if (!contentType || !ALLOWED_CONTENT_TYPES.some(type => contentType!.startsWith(type))) {
      console.error(`[IMAGE_PROXY] ❌ Unsupported content type: ${contentType}`);
      return NextResponse.json({ error: `Unsupported content type: ${contentType}` }, { status: 400 });
    }
   
    // Check size
    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
      console.error(`[IMAGE_PROXY] ❌ Image too large: ${arrayBuffer.byteLength / 1024 / 1024}MB`);
      return NextResponse.json({ error: 'Image too large' }, { status: 400 });
    }
    
    console.log(`[IMAGE_PROXY] ✅ Size: ${arrayBuffer.byteLength} bytes. Content-Type: ${contentType}`);
   
    // Convert to base64
    const buffer = Buffer.from(arrayBuffer);
    const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;
    
    console.log('[IMAGE_PROXY] ✅ Conversion to Base64 successful. Returning...');

    return NextResponse.json({ base64 });

  } catch (error) {
    console.error('[IMAGE_PROXY] 🛑 CRITICAL Error proxying image:', error);
    return NextResponse.json({
      error: 'Failed to proxy image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
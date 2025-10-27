// app/api/generate-image/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Varmista, että OpenAI API-avain on määritelty ympäristömuuttujissa
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is not set.");
  // Voit heittää virheen tai palauttaa virheen Next.js-sovelluksen käynnistyessä,
  // jos API-avain on ehdoton vaatimus.
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Aseta maksimikesto Vercelin tai muun palvelun rajoitusten mukaisesti.
// DALL-E-3 generointi voi kestää kauan, 30 sekuntia on usein riittävä.
export const maxDuration = 30; 

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const prompt = requestBody.prompt;
    
    // Validoidaan prompt:n olemassaolo ja tyyppi
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.warn('Image generation: Invalid or empty prompt received.');
      return NextResponse.json({ error: 'Valid prompt string is required' }, { status: 400 });
    }

    // Rajaa promptin pituus DALL-E-3 rajoihin (max 400 merkkiä)
    // Lisätään ellipsi vain, jos promptia joudutaan oikeasti lyhentämään.
    const trimmedPrompt = prompt.length > 400 
      ? prompt.substring(0, 397) + '...' 
      : prompt;

    console.log(`Image generation: Starting DALL-E-3 call with prompt: "${trimmedPrompt.substring(0, 100)}..."`);

    // Kutsutaan OpenAI:n kuvagenerointi-APIa
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: trimmedPrompt,
      n: 1, // Generoidaan yksi kuva
      size: '1792x1024', // Optimoitu koko CV-taustalle (vaaka-asettelu)
      quality: 'standard', // 'standard' tai 'hd'
      style: 'natural', // 'natural' tai 'vivid'
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      console.error('Image generation: No image URL received from OpenAI response data.');
      throw new Error('No image URL received from OpenAI');
    }

    console.log(`Image generation: Generated image URL received: ${imageUrl}`);

    // Lataa kuva suoraan palvelimelle ja muunna Base64-muotoon
    const imageResponse = await fetch(imageUrl);
    
    // Tarkista kuvan latauksen onnistuminen
    if (!imageResponse.ok) {
      // Lue virheviesti vastauksesta, jos mahdollista
      const errorText = await imageResponse.text();
      console.error(`Image generation: Failed to fetch generated image from URL. Status: ${imageResponse.status}, Body: ${errorText}`);
      throw new Error(`Failed to fetch generated image: ${imageResponse.statusText || 'Unknown error'}`);
    }

    // Lue kuva array bufferiksi ja muunna Base64:ksi
    const buffer = await imageResponse.arrayBuffer();
    // Buffer on Node.js:n globaali objekti, joten se on käytettävissä tässä API-reitissä
    const base64Image = Buffer.from(buffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/png'; // Oletus content-type, jos sitä ei ole

    console.log('Image generation: Successfully fetched and converted image to Base64.');

    // Palauta Base64-enkoodattu kuva data-URL:nä
    return NextResponse.json({ 
      url: `data:${contentType};base64,${base64Image}`,
      originalUrl: imageUrl // Palautetaan myös alkuperäinen URL debuggausta varten
    });
    
  } catch (error) {
    console.error('Image generation: Uncaught error during process:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate image',
        details: error instanceof Error ? error.message : 'Unknown error occurred.'
      },
      { status: 500 }
    );
  }
}
// app/api/generate-image/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is not set.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 30; 

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const prompt = requestBody.prompt;
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.warn('Image generation: Invalid or empty prompt received.');
      return NextResponse.json({ error: 'Valid prompt string is required' }, { status: 400 });
    }

    const trimmedPrompt = prompt.length > 400 
      ? prompt.substring(0, 397) + '...' 
      : prompt;

    console.log(`Image generation: Starting DALL-E-3 call with prompt: "${trimmedPrompt.substring(0, 100)}..."`);

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: trimmedPrompt,
      n: 1,
      size: '1792x1024',
      quality: 'standard',
      style: 'natural',
    });

    // ✅ KORJAUS: Tarkista ensin että data on olemassa
    if (!response.data || response.data.length === 0) {
      console.error('Image generation: No data array in OpenAI response.');
      throw new Error('No image data received from OpenAI');
    }

    const imageUrl = response.data[0]?.url; // Nyt TypeScript tietää että data on olemassa
    if (!imageUrl) {
      console.error('Image generation: No image URL in response data.');
      throw new Error('No image URL received from OpenAI');
    }

    console.log(`Image generation: Generated image URL received: ${imageUrl}`);

    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error(`Image generation: Failed to fetch generated image from URL. Status: ${imageResponse.status}, Body: ${errorText}`);
      throw new Error(`Failed to fetch generated image: ${imageResponse.statusText || 'Unknown error'}`);
    }

    const buffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    console.log('Image generation: Successfully fetched and converted image to Base64.');

    return NextResponse.json({ 
      url: `data:${contentType};base64,${base64Image}`,
      originalUrl: imageUrl
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
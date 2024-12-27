// app/api/generate-cv/route.ts
import { NextResponse } from 'next/server';
import { generateCVWithLangChain } from '@/lib/langchain/cvGenerator';

async function fetchImageAsBase64(url: string) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
}

export async function POST(request: Request) {
  try {
    const userData = await request.json();
    const cvData = await generateCVWithLangChain(userData);

    // Muunna taustakuva base64-muotoon
    const backgroundImage = await fetchImageAsBase64(cvData.background);

    return NextResponse.json({
      html: cvData.html,
      styles: cvData.styles,
      profile: cvData.profile,
      images: cvData.images,
      background: backgroundImage
    });
  } catch (error) {
    console.error('Error in CV generation:', error);
    return NextResponse.json({ 
      error: 'Failed to generate CV' 
    }, { 
      status: 500 
    });
  }
}
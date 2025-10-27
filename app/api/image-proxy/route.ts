// app/api/image-proxy/route.ts - Updated version
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');
 
  if (!imageUrl) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }
 
  // Check if it's a relative path starting with /
  const isRelativePath = imageUrl.startsWith('/') && !imageUrl.startsWith('//');
  
  // Define constants
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_CONTENT_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'
  ];
 
  try {
    let arrayBuffer;
    let contentType;
    
    if (isRelativePath) {
      // Create the absolute URL for relative paths
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const fullUrl = new URL(imageUrl, baseUrl).toString();
      
      // Fetch the image using the full URL
      const imageResponse = await fetch(fullUrl);
      
      if (!imageResponse.ok) {
        return NextResponse.json({
          error: `Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`
        }, { status: 500 });
      }
      
      contentType = imageResponse.headers.get('content-type');
      arrayBuffer = await imageResponse.arrayBuffer();
    } else {
      // For non-relative URLs, proceed as before
      try {
        new URL(imageUrl);
      } catch (e) {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }
      
      const imageResponse = await fetch(imageUrl);
      
      if (!imageResponse.ok) {
        return NextResponse.json({
          error: `Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`
        }, { status: 500 });
      }
      
      contentType = imageResponse.headers.get('content-type');
      arrayBuffer = await imageResponse.arrayBuffer();
    }
   
    // Check content type
    if (!contentType || !ALLOWED_CONTENT_TYPES.some(type => contentType.startsWith(type))) {
      return NextResponse.json({ error: `Unsupported content type: ${contentType}` }, { status: 400 });
    }
   
    // Check size
    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image too large' }, { status: 400 });
    }
   
    // Convert to base64
    const buffer = Buffer.from(arrayBuffer);
    const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;
   
    return NextResponse.json({ base64 });
  } catch (error) {
    console.error('Error proxying image:', error);
    return NextResponse.json({
      error: 'Failed to proxy image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
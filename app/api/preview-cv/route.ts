import { NextResponse } from 'next/server';
import { createPreviewData } from '@/utils/preview';
import type { BaseCV } from '@/types';

export async function POST(request: Request) {
  const data: BaseCV = await request.json();
  const previewData = createPreviewData(data);
  return NextResponse.json({ previewData });
}
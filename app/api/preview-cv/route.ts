//app/api/preview-cv/route.ts

import { NextResponse } from "next/server";
import { createPreviewData } from "@/utils/preview";
import type { PreviewData } from "@/types";

export async function POST(request: Request) {
  const data: PreviewData = await request.json();
  const previewData = createPreviewData(data);
  return NextResponse.json({ previewData });
}

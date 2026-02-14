// app/api/generate-pdf/route.ts - KORJATTU: Parempi renderöinti
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { cvId, authToken } = await req.json();

    if (!cvId) {
      return NextResponse.json({ error: "CV ID is required" }, { status: 400 });
    }

    const cvUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/cv-preview/${cvId}?pdf=true`;
    console.log(`📄 Navigating to: ${cvUrl}`);

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    // ✅ A4 at 96 DPI = 794 x 1123px
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2, // ✅ Higher quality rendering
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(cvUrl, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // ✅ Wait for CV content to actually render (not just network idle)
    await page.waitForSelector('.cv-container, [data-template-type]', { timeout: 15000 }).catch(() => {
      console.warn('⚠️ CV container selector not found, continuing anyway');
    });

    // ✅ Inject PDF-specific CSS fixes
    await page.addStyleTag({
      content: `
        /* Reset everything for PDF */
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        
        body { 
          margin: 0 !important; 
          padding: 0 !important; 
          background: white !important;
          overflow: visible !important;
        }
        
        /* CV container should be exactly A4 */
        .cv-container {
          width: 210mm !important;
          min-height: 297mm !important;
          max-width: 210mm !important;
          overflow: visible !important;
          transform: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Remove any scaling transforms */
        .cv-container * {
          transform: none !important;
        }
        
        /* Ensure all sections are visible */
        .cv-container > div,
        .cv-container section,
        .cv-container article {
          overflow: visible !important;
          display: block !important;
        }
        
        /* Hide UI elements that shouldn't be in PDF */
        nav, header:not(.cv-header), footer, 
        [class*="toolbar"], [class*="sidebar"],
        [class*="modal"], [class*="toast"] {
          display: none !important;
        }

        /* Force backgrounds to print */
        div[style*="background"] {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        @page {
          size: A4;
          margin: 0;
        }
      `
    });

    // Wait for images to load
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.onload = img.onerror = resolve;
              })
          )
      );
    });

    // Wait for background images
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const elementsWithBg = document.querySelectorAll("*");
        const promises: Promise<void>[] = [];

        elementsWithBg.forEach((el) => {
          const element = el as HTMLElement;
          const style = window.getComputedStyle(element);
          const bgImage = style.backgroundImage;

          if (bgImage && bgImage !== "none" && bgImage.includes("url(")) {
            const promise = new Promise<void>((resolveImg) => {
              const img = new Image();
              const url = bgImage.match(/url\(['"]?([^'"]*?)['"]?\)/)?.[1];
              if (url) {
                img.onload = img.onerror = () => resolveImg();
                img.src = url;
              } else {
                resolveImg();
              }
            });
            promises.push(promise);
          }
        });

        Promise.all(promises).then(() => resolve());
      });
    });

    // ✅ Final settle wait (fonts, layout)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("🖨️ Generating PDF...");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
      preferCSSPageSize: false,
    });

    await browser.close();

    console.log("✅ PDF generated successfully");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cv-${cvId}.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("❌ PDF generation failed:", error);
    return NextResponse.json(
      {
        error: "PDF generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
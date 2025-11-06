// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

// Pidempi maxDuration Vercelissä on tärkeä Puppeteerille
export const maxDuration = 300; 

export async function POST(req: NextRequest) {
  try {
    // Poista authToken destructuring, koska emme tarvitse sitä enää
    const { cvId } = await req.json(); 

    if (!cvId) {
      return NextResponse.json({ error: "CV ID is required" }, { status: 400 });
    }

    // ✅ TÄRKEÄ MUUTOS: Lisää ?pdf=true query-parametri URL:iin
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    if (!siteUrl || siteUrl.includes('undefined')) {
         throw new Error("Site URL environment variable is not set correctly.");
    }
    
    const cvUrl = `${siteUrl}/cv-preview/${cvId}?pdf=true`;
    // Vercel-yhteensopiva Puppeteer setup
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    // A4-koko optimoitu PDF:lle
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    });

    // Poista authTokenin asetus, koska middleware sallii nyt pyynnön
    // if (authToken) { ... }

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    console.log(`Navigating to: ${cvUrl}`);

    await page.goto(cvUrl, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Odota että kaikki kuvat latautuvat
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

    // Odota hetki varmistaaksesi kaiken renderöitymisen
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Varmista että background-image CSS propertyt latautuvat (voit pitää tämän)
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

    console.log("Generating PDF...");

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

    console.log("PDF generated successfully");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cv-${cvId}.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json(
      {
        error: "PDF generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
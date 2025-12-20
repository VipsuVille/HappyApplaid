// app/api/generate-cover-letter-pdf/route.ts - KORJATTU (kuten CV)
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { letterId } = await req.json();

    if (!letterId) {
      return NextResponse.json(
        { error: "Letter ID is required" },
        { status: 400 }
      );
    }

    console.log(`📄 Generating PDF for cover letter: ${letterId}`);

    // ✅ NAVIGOI PREVIEW-SIVULLE (kuten CV:ssä)
    const letterUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/cover-letter-preview/${letterId}?pdf=true`;

    console.log(`📄 Navigating to: ${letterUrl}`);

    // ✅ DYNAMIC IMPORT BASED ON ENVIRONMENT
    const isDev = process.env.NODE_ENV === "development";
    let browser;
    
    if (isDev) {
      const puppeteer = await import("puppeteer");
      console.log("🔧 Using local Puppeteer...");
      
      browser = await puppeteer.default.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      });
    } else {
      const puppeteer = await import("puppeteer-core");
      const chromium = await import("@sparticuz/chromium");
      console.log("🚀 Using Sparticuz Chromium...");
      
      browser = await puppeteer.default.launch({
        args: chromium.default.args,
        executablePath: await chromium.default.executablePath(),
        headless: true,
      });
    }

    const page = await browser.newPage();

    // ✅ A4-VIEWPORT
    await page.setViewport({
      width: 794,  // A4 leveys
      height: 1123, // A4 korkeus
      deviceScaleFactor: 1,
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // ✅ NAVIGOI SIVULLE
    await page.goto(letterUrl, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // ✅ ODOTA KAIKKI KUVAT (kuten CV:ssä)
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

    // ✅ ODOTA TAUSTAGRAFIIKKAA (kuten CV:ssä)
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

    // ✅ LISÄODOTUSAIKA RENDERÖINNILLE (kuten CV:ssä)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log("🖨️ Generating PDF...");

    // ✅ PDF-ASETUKSET (kuten CV:ssä)
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true, // ✅ KRIITTINEN - Taustakuviot mukaan!
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
        "Content-Disposition": `attachment; filename="hakukirje-${letterId}.pdf"`,
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
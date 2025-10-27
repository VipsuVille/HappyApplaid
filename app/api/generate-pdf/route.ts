// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { cvId, authToken } = await req.json();

    if (!cvId) {
      return NextResponse.json({ error: "CV ID is required" }, { status: 400 });
    }

    const cvUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/cv-preview/${cvId}`;

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security", // Sallii CORS kuvien lataus
        "--disable-features=VizDisplayCompositor",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
    });

    const page = await browser.newPage();

    // A4-koko optimoitu PDF:lle
    await page.setViewport({
      width: 794, // A4 leveys pisteinä
      height: 1123, // A4 korkeus pisteinä
      deviceScaleFactor: 1, // Vähennä jos liian iso
    });

    // Aseta auth token jos saatavilla
    if (authToken) {
      await page.setExtraHTTPHeaders({
        Authorization: `Bearer ${authToken}`,
      });
    }

    // Lisää User-Agent että näyttää oikealta selaimelta
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    console.log(`Navigating to: ${cvUrl}`);

    // Mene CV preview sivulle
    await page.goto(cvUrl, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Odota että kaikki kuvat latautuvat (erityisesti taustakuvat)
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

    // Odota vielä hetki varmuuden vuoksi
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Varmista että background-image CSS propertyt latautuvat
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

    // *** TÄRKEÄ: Käytä page.pdf() eikä screenshot() ***
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true, // TÄRKEÄ: näyttää taustakuvat
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

    // Palauta oikea PDF tiedosto
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf", // KORJAUS: oli image/png
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

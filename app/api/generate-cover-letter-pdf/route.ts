// app/api/generate-cover-letter-pdf/route.ts - TARKKA KOPIO CV:stä
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { letterId } = await req.json();

    if (!letterId) {
      return NextResponse.json({ error: "Letter ID is required" }, { status: 400 });
    }

    // ✅ LISÄÄ ?pdf=true parametri (KUTEN CV:SSÄ)
    const letterUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/cover-letter-preview/${letterId}?pdf=true`;

    console.log(`📄 Navigating to: ${letterUrl}`);

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(letterUrl, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // ✅ ODOTA KUVAT (TARKKA KOPIO CV:stä)
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

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // ✅ BACKGROUND IMAGES (TARKKA KOPIO CV:stä)
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

    console.log("🖨️ Generating PDF...");

    // ✅ PDF-ASETUKSET (TARKKA KOPIO CV:stä)
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
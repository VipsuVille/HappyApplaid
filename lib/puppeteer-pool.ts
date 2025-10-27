// lib/puppeteer-pool.ts
import puppeteer from "puppeteer"; // Paikallista kehitystä varten
import type { Browser, Page } from "puppeteer";

// Tuo @sparticuz/chromium vain, jos sitä tarvitaan tuotannossa.
// Tämä estää sen latautumisen paikallisessa ympäristössä.
let chromium: any;
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  chromium = require("@sparticuz/chromium");
}

let browser: Browser | null = null;

async function getBrowser() {
  if (!browser) {
    console.log("puppeteer-pool: Luodaan uusi selaininstanssi.");
    try {
      if (isProduction) {
        browser = await puppeteer.launch({
          args: [
            ...chromium.args,
            "--hide-scrollbars",
            "--disable-web-security",
          ],
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        });
      } else {
        // Paikallinen kehitysympäristö
        browser = await puppeteer.launch({
          args: ["--no-sandbox"],
          headless: true, // Aseta false, jos haluat nähdä selaimen käyttöliittymän
        });
      }
      console.log("puppeteer-pool: Selaininstanssi luotu onnistuneesti.");
    } catch (e) {
      console.error("puppeteer-pool: Virhe selaininstanssin luomisessa:", e);
      browser = null;
      throw e;
    }
  }
  return browser;
}

export async function generatePDF(
  htmlContent: string,
  options = {}
): Promise<Buffer> {
  let page: Page | null = null;
  try {
    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();

    console.log("puppeteer-pool: Asetetaan HTML-sisältö sivulle.");
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    console.log("puppeteer-pool: Odotetaan kuvien latautumista.");
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

    console.log("puppeteer-pool: Generoidaan PDF.");
    const pdfOutput = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      ...options,
    });

    console.log("puppeteer-pool: PDF-generointi valmis.");
    return Buffer.from(pdfOutput);
  } catch (error) {
    console.error("puppeteer-pool: Virhe PDF:n luomisessa:", error);
    if (browser) {
      console.log("puppeteer-pool: Suljetaan viallinen selaininstanssi.");
      await browser.close();
      browser = null;
    }
    throw error;
  } finally {
    if (page) {
      console.log("puppeteer-pool: Suljetaan sivu.");
      await page.close();
    }
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

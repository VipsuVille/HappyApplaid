// app/api/generate-cover-letter-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { letterId } = await req.json();

    if (!letterId) {
      return NextResponse.json(
        { error: "Letter ID is required" },
        { status: 400 }
      );
    }

    console.log(`📄 Generating PDF for cover letter: ${letterId}`);

    // ✅ HAE COVER LETTER TIETOKANNASTA
    const { data: letter, error: fetchError } = await supabaseAdmin
      .from('cover_letters')
      .select('*')
      .eq('id', letterId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !letter) {
      console.error('❌ Letter not found:', fetchError);
      return NextResponse.json(
        { error: "Cover letter not found" },
        { status: 404 }
      );
    }

    // ✅ RAKENNA HTML (SAMA LOGIIKKA KUIN CV:SSÄ)
    const bodyContent = letter.content?.body || letter.ai_data?.html?.content || '';
    const applicantName = letter.content?.applicant_info?.name || 'Hakija';
    const displayTitle = letter.title || 'Työhakemus';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Merriweather:wght@300;400;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            @page {
              size: A4;
              margin: 0;
            }

            body { 
              margin: 0;
              padding: 0;
              font-family: 'Merriweather', serif;
              line-height: 1.7;
              color: #333;
              width: 210mm;
              height: 297mm;
              position: relative;
              overflow: hidden;
            }
            
            .cover-letter-container {
              width: 210mm;
              height: 297mm;
              background-color: white;
              position: relative;
              overflow: hidden;
            }
            
            .cover-letter-accent {
              position: absolute;
              top: 0;
              left: 0;
              width: 12px;
              height: 100%;
              background: linear-gradient(to bottom, #3498db, #2980b9, #3498db);
            }
            
            .cover-letter-top-accent {
              position: absolute;
              top: 0;
              left: 12px;
              right: 0;
              height: 8px;
              background: linear-gradient(to right, #3498db, #ede7f6);
              opacity: 0.7;
            }
            
            .cover-letter-content-wrapper {
              margin-left: 20px;
              width: calc(100% - 20px);
              padding: 20mm;
              box-sizing: border-box;
              position: relative;
              z-index: 1;
            }
            
            h1 {
              color: #2c3e50;
              border-bottom: 3px solid #3498db;
              padding-bottom: 12px;
              margin-bottom: 30px;
              font-weight: 700;
              font-size: 18pt;
              line-height: 1.3;
            }
            
            p {
              margin-bottom: 16px;
              line-height: 1.7;
              text-align: justify;
              font-size: 11pt;
            }
            
            .signature-section {
              margin-top: 50px;
              page-break-inside: avoid;
            }
            
            .closing-text {
              font-size: 11pt;
              color: #555;
              margin-bottom: 8px;
            }
            
            .signature-line {
              border-bottom: 2px solid #3498db;
              width: 230px;
              margin-bottom: 12px;
            }
            
            .signature-text {
              font-family: 'Dancing Script', cursive;
              font-size: 18pt;
              color: #2c3e50;
            }
          </style>
        </head>
        <body>
          <div class="cover-letter-container">
            <div class="cover-letter-accent"></div>
            <div class="cover-letter-top-accent"></div>
            
            <div class="cover-letter-content-wrapper">
              <h1>${displayTitle}</h1>
              
              <div class="cover-letter-content">
                ${bodyContent}
              </div>
              
              <div class="signature-section">
                <div class="closing-text">Ystävällisin terveisin,</div>
                <div class="signature-line"></div>
                <div class="signature-text">${applicantName}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

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

    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    });

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

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

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("🖨️ Generating PDF...");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: false,
    });

    await browser.close();

    console.log("✅ PDF generated successfully");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="hakukirje_${displayTitle.substring(0, 30).replace(/[^\w-]/g, "_")}.pdf"`,
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
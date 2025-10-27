// lib/html-generator.ts
// TÄMÄ TIEDOSTO VASTAA CV-KOMPONENTIN RENDERÖINNISTÄ PUHTAAKSI HTML-MERKKIJONOKSI

import { UserFormData, AIData } from "@/types"; // Oletetaan, että tyypit ovat olemassa

// Tässä on se ydinlogiikka, joka renderöi CV-komponentin, mutta ilman Reactia.
// Voit yksinkertaisesti siirtää ulkoasulogiiikan CV-komponentistasi tänne.
export function renderCVToHtml(data: UserFormData, aiData: AIData): string {
  // TÄRKEÄÄ: Sisällytä kaikki CSS-tyylit (<style>...</style>) suoraan tähän funktioon
  // ÄLÄ KÄYTÄ TAILWIND-LUOKKIA TÄÄLLÄ SUORAAN, KOSKA PUPPETEER EI KÄSITTELE NIITÄ OLETUKSENA
  // Muunna Tailwind-luokat vastaavaksi CSS:ksi.

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${data.name || "CV"}</title>
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
        
        <style>
          @page { size: A4; margin: 0; }
          body { font-family: sans-serif; }
          .cv-container {
            width: 210mm;
            min-height: 297mm;
            position: relative;
            background: white;
            box-sizing: border-box;
          }
          /* Määrittele kaikki käytetyt tyylit tässä, esimerkiksi: */
          .header-area {
            background-color: #f0f4f8; 
            padding: 20px;
          }
          .name-text {
            color: #1E3A8A; 
            font-size: 24pt;
            font-weight: bold;
          }
          .job-title {
            color: #3B82F6; 
            font-size: 14pt;
          }
          /* JATKA KAIKKIEN TARVITTAVIEN TYYLIEN MÄÄRITTELYÄ */
        </style>
      </head>
      <body>
        <div class="cv-container">
          <div class="header-area">
            <h1 class="name-text">${data.name}</h1>
            <p class="job-title">${data.jobTitle}</p>
          </div>
          <div class="main-content">
            ${
              aiData.html.personal_description
                ? `<p>${aiData.html.personal_description}</p>`
                : ""
            }
            ${aiData.html.skills_section || ""}
            ${aiData.html.experience_section || ""}
            ${aiData.html.education_section || ""}
            ${aiData.html.languages_section || ""}
          </div>
        </div>
      </body>
    </html>
  `;
}

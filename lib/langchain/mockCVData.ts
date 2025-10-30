import { NextResponse } from 'next/server';
export const mockCVData = {}
export async function DELETE() {
  return NextResponse.json(
    { error: 'This endpoint is currently disabled' },
    { status: 503 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'This endpoint is currently disabled' },
    { status: 503 }
  );
}
/*
//lib/langchain/mockCVData.ts

import { AIData, UserFormData } from '@/types';


export const mockCVData = {
  simple: {
    cv_data: {
      name: "Matti Meikäläinen",
      email: "matti.uimari@example.com",
      phone: "0401234567",
      education: "Liikuntatieteiden maisteri - Jyväskylän yliopisto",
      workExperience: "Kilpauimari - Suomen Uimaliitto (2015-2023)\nUimaopettaja - Helsingin Uimahalli (2013-2015)",
      skills: "Kestävyysuinti, Vapaauinti, Selkäuinti\nKisamentaliteetti, Tiimityö",
      languages: "Suomi, Englanti, Ruotsi",
      age: "28",
      location: "Helsinki",
      hobbies: "Ulkoilu, kuntosali, luontokuvaus",
      linkedIn: "https://linkedin.com/in/matti-uimari",
      language: "fi",
      personalityTraits: "Kunnianhimoinen, tiimipelaaja, sinnikäs",
      backgroundImage: "/mock-images/simple-bg.png",
      profileImage: "/mock-images/homer.png",
      title: "Kilpauimari & Uimaopettaja",
      introText: "Olen kansainvälisesti menestynyt kilpauimari, jolla on yli 10 vuoden kokemus huippu-urheilusta. Olympialaisissa vuonna 2020 saavutin 400 metrin vapaauinnissa 5. sijan. Euroopan-mestaruuskilpailuista minulla on kaksi hopeaa ja yksi pronssi.\n\nViime vuosina olen keskittynyt erityisesti pitkien matkojen kestävyysuintiin ja saavuttanut useita Suomen ennätyksiä. Olen erikoistunut tekniikan hiomiseen ja kisamentaliteetin vahvistamiseen. Harrastan aktiivisesti nuorten uimareiden valmennusta ja olen intohimoinen uimaopettaja.\n\nVahvuuksiini kuuluu erinomainen kunto, tiimityötaidot ja kyky toimia paineensietoisesti kovan kilpailun alla. Olen tunnettu sinnikkyydestäni ja kyrystäni antaa parhaani joka kerta.",
      cvType: 'simple',
      userId: 'mock_user_1',
      cvId: 'mock_cv_simple_1',
    },
    ai_data: {
      html: {
        skills_section: `
          <div>
            <h3>Taidot</h3>
            <ul>
              <li>Kestävyysuinti (erityisesti 400m ja 1500m vapaauinti)</li>
              <li>Tekniikan analysointi ja kehittäminen</li>
              <li>Kisamentaliteetin valmennus</li>
              <li>Ruokavalion suunnittelu urheilijalle</li>
              <li>Vammaisen urheilijan valmennus</li>
            </ul>
          </div>
        `,
        education_section: `
          <div>
            <h3>Koulutus</h3>
            <ul>
              <li>Liikuntatieteiden maisteri - Jyväskylän yliopisto (2018)</li>
              <li>Valmentajan perustutkinto - Suomen Olympiakomitea (2016)</li>
              <li>Urheilulääketieteen peruskurssi - KIHU (2015)</li>
            </ul>
          </div>
        `,
        languages_section: `
          <div>
            <h3>Kielitaito</h3>
            <ul>
              <li>Suomi - äidinkieli</li>
              <li>Englanti - sujuva</li>
              <li>Ruotsi - hyvä</li>
            </ul>
          </div>
        `,
        experience_section: `
          <div>
            <h3>Työkokemus</h3>
            <ul>
              <li>Kilpauimari - Suomen Uimaliitto (2015-2023)</li>
              <li>Uimaopettaja - Helsingin Uimahalli (2013-2015)</li>
              <li>Nuorten valmentaja - Helsingin Uimarit (2018-)</li>
            </ul>
          </div>
        `,
        intro_section: `
          <div class="intro-text">
            <p>${"Olen kansainvälisesti menestynyt kilpauimari, jolla on yli 10 vuoden kokemus huippu-urheilusta. Olympialaisissa vuonna 2020 saavutin 400 metrin vapaauinnissa 5. sijan. Euroopan-mestaruuskilpailuista minulla on kaksi hopeaa ja yksi pronssi.".repeat(2)}</p>
          </div>
        `
      },
      styles: {
        personal_description_style: "border: 2px solid #3498db; padding: 10px; background-color: #f2f2f2; font-size: 1.2rem;",
        skills_style: "font-size: 1rem; font-weight: bold;",
        main_container_style: "max-width: 800px; margin: 0 auto;",
        background_integration_style: "background-image: url('/mock-images/simple-bg.png'); background-size: cover; height: 33vh; background-position: center; background-repeat: no-repeat;",
      },
      images: {
        background_prompt: "Uima-aiheinen tausta sinisellä värillä",
        visual_elements: ["water-texture", "swimming-pool"],
      },
      profile: "Matti Meikäläinen - Kilpauimari",
      profileInitials: "MM",
      background: "/mock-images/simple-bg.png",
    },
  },
    technical: {
      cv_data: {
        name: "Tekninen CV",
        email: "tekniikka@example.com",
        phone: "0401234567",
        education: "Tietojenkäsittelytiede - Helsingin yliopisto",
        workExperience: "Ohjelmistokehittäjä - XYZ Oy (2020-2023)",
        skills: "JavaScript, React, Node.js",
        languages: "Suomi, Englanti",
        age: "30",
        location: "Helsinki",
        hobbies: "Koodaus, lukeminen",
        linkedIn: "https://linkedin.com/in/tekniikka",
        language: "fi",
        personalityTraits: "Analyyttinen, tarkka",
        backgroundImage: "/mock-images/technical-bg.png",
        profileImage: "/mock-images/homer.png",
        cvType: 'technical', // Lisätty cvType cv_dataan
        userId: 'mock_user_1',
        cvId: 'mock_cv_technical_1',
      },
      ai_data: {
        html: {
          skills_section: "<div><h3>Taidot</h3><ul><li>JavaScript</li><li>React</li><li>Node.js</li></ul></div>",
          education_section: "<div><h3>Koulutus</h3><ul><li>Tietojenkäsittelytiede - Helsingin yliopisto</li></ul></div>",
          languages_section: "<div><h3>Kielitaito</h3><ul><li>Suomi - äidinkieli</li><li>Englanti - sujuva</li></ul></div>",
          experience_section: "<div><h3>Työkokemus</h3><ul><li>Ohjelmistokehittäjä - XYZ Oy (2020-2023)</li></ul></div>",
        },
        styles: {
          personal_description_style: "border: 2px solid #3498db; padding: 10px; background-color: #f2f2f2; font-size: 1.2rem;",
          skills_style: "font-size: 1rem; font-weight: bold;",
          main_container_style: "max-width: 800px; margin: 0 auto;",
          background_integration_style: "background-image: url('/mock-images/technical-bg.png'); background-size: cover; height: 33vh; background-position: center; background-repeat: no-repeat;",
        },
        images: {
          background_prompt: "Minimalistinen tausta ohjelmointiteemalla",
          visual_elements: ["code-snippet", "abstract-design"],
        },
        profile: "Testi CV - Ohjelmistokehittäjä",
        background: "/mock-images/technical-bg.png",
      },
    },
    
    creative: {
      cv_data: {
        name: "Luova CV",
        email: "luova@example.com",
        phone: "0409876543",
        education: "Taiteiden maisteri - Taideyliopisto",
        workExperience: "Grafinen suunnittelija - Design Oy (2019-2022)",
        skills: "Grafinen suunnittelu, Markkinointi",
        languages: "Suomi, Englanti",
        age: "28",
        location: "Turku",
        hobbies: "Piirtäminen, valokuvaus",
        linkedIn: "https://linkedin.com/in/luova",
        language: "fi",
        personalityTraits: "Luova, innovatiivinen",
        backgroundImage: "/mock-images/creative-bg.png",
        profileImage: "/mock-images/homer.png",
        cvType: 'creative', // Lisätty cvType cv_dataan
        userId: 'mock_user_1',
        cvId: 'mock_cv_creative_1',
      },
      ai_data: {
        html: {
          skills_section: "<div><h3>Taidot</h3><ul><li>Grafinen suunnittelu</li><li>Markkinointi</li></ul></div>",
          education_section: "<div><h3>Koulutus</h3><ul><li>Taiteiden maisteri - Taideyliopisto</li></ul></div>",
          languages_section: "<div><h3>Kielitaito</h3><ul><li>Suomi - äidinkieli</li><li>Englanti - erinomainen</li></ul></div>",
          experience_section: "<div><h3>Työkokemus</h3><ul><li>Grafinen suunnittelija - Design Oy (2019-2022)</li></ul></div>",
        },
        styles: {
          personal_description_style: "border: 2px solid #3498db; padding: 10px; background-color: #f2f2f2; font-size: 1.2rem;",
          skills_style: "font-size: 1rem; font-weight: bold;",
          main_container_style: "max-width: 800px; margin: 0 auto;",
          background_integration_style: "background-image: url('/mock-images/creative-bg.png'); background-size: cover; height: 33vh; background-position: center; background-repeat: no-repeat;",
        },
        images: {
          background_prompt: "Minimalistinen tausta luovalle CV:lle",
          visual_elements: ["abstract-design", "colorful-patterns"],
        },
        profile: "Testi CV - Graafinen suunnittelija",
        background: "/mock-images/creative-bg.png",
      },
    },
  } as Record<'technical' | 'simple' | 'creative', { cv_data: UserFormData; ai_data: AIData }>;
   */
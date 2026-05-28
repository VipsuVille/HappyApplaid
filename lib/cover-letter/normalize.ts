// lib/cover-letter/normalize.ts
// ✅ Siistii body-tekstin kappalejaon ennen tallennusta / näyttöä.
// Korjaa kohdan 4: isot välit vaikka tekstissä on oikeasti vain yksi katko,
// ja keskelle virkettä eksyneet kappalekatkot.

export function normalizeBody(text: string | undefined | null): string {
  if (!text) return '';

  return text
    // Yhtenäistä rivinvaihdot
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

    // contentEditable jättää joskus &nbsp; / näkymättömiä merkkejä
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b/g, '')

    // Korkeintaan yksi tyhjä rivi kappaleiden väliin (poistaa kolmoisvälit)
    .replace(/\n{3,}/g, '\n\n')

    // ⭐ Ydinkorjaus: jos kappalekatkoa EDELTÄVÄ merkki ei ole virkkeen
    // lopetusmerkki (. ! ? : ” " ' ) ]), katko on todennäköisesti väärässä
    // paikassa → muunnetaan tavalliseksi välilyönniksi.
    .replace(/([^.!?:”"'’)\]])\n\n+/g, '$1 ')

    // Tuplavälilyönnit yhdeksi
    .replace(/[ \t]{2,}/g, ' ')

    // Siisti rivien reunat
    .split('\n')
    .map((line) => line.trim())
    .join('\n')

    .trim();
}

// Apu: poistaa mahdolliset HTML-tagit (käyttöön myöhemmin, kun body voi olla
// rich-textiä → PDF/AI tarvitsevat puhtaan tekstin). Turvallinen nytkin.
export function stripHtml(html: string | undefined | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}
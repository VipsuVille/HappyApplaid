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
/**
 * ✅ Poistaa allekirjoituksen / lopputervehdyksen kirjeen lopusta.
 * KIELINEUTRAALI: ei perustu sanalistaan, vaan allekirjoituksen MUOTOON:
 *   - viimeinen rivi joka päättyy pilkkuun ("Ystävällisin terveisin,", "Best regards,")
 *   - TAI lyhyt rivi (alle 5 sanaa) joka ei pääty virkkeen lopetusmerkkiin
 * Toimii suomeksi, englanniksi, ruotsiksi, saksaksi — millä tahansa kielellä.
 *
 * Tarkistaa enintään 2 viimeistä riviä (esim. "Ystävällisin terveisin," + nimi).
 */
export function stripSignoff(text: string | undefined | null): string {
  if (!text) return '';

  let lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Poista enintään 2 allekirjoitusriviä lopusta
  for (let i = 0; i < 2; i++) {
    if (lines.length === 0) break;
    const last = lines[lines.length - 1];
    const wordCount = last.split(/\s+/).length;

    const endsWithComma = last.endsWith(',');
    const isShortNonSentence = wordCount <= 4 && !/[.!?:]$/.test(last);

    if (endsWithComma || isShortNonSentence) {
      lines.pop();
    } else {
      break; // ei näytä allekirjoitukselta → lopeta
    }
  }

  return lines.join('\n').trim();
}
// lib/langchain/finnishStyle.ts
// Suomen kielen laatuopas LLM-generaattoreille (prompt engineering).
// Injektoi system-promptiin VAIN kun kohdekieli on suomi:
//   const langBlock = isFinnish ? FINNISH_STYLE_RULES : '';
//   ...['system', `... ${langBlock} ...`]

export const FINNISH_STYLE_RULES = `
# ════════════════════════════════════════════════════════════════
# NATIVE FINNISH QUALITY — write like a Finn, not a translator
# ════════════════════════════════════════════════════════════════

You are writing in Finnish. Write as a native Finnish speaker writes — NOT as
translated English. Avoid "käännöskukkaset" (translationese): sentences that are
grammatically correct but sound translated or stiff.

## REKISTERI (register)
- Asiallinen mutta ihmismäinen. Luonteva, ei kankea virkakieli, ei slangi.
- Kirjoita kuin osaava ihminen puhuisi työhaastattelussa — selkeästi ja aidosti.

## KIELLETYT / YLIKÄYTETYT SANAT (älä käytä näitä)
- "resonoi" / "resonoida"  → "puhuttelee minua", "tuntuu omalta", "sopii minulle"
- "saumaton" → "sujuva", "mutkaton"
- "ratkaisukeskeinen" (klisee) → kuvaa konkreettisesti MITÄ teet
- "dynaaminen", "proaktiivinen", "synergia" → vältä korulauseet kokonaan
- "urani matka" / "matkani" → sano asia suoraan
- Käännöskalkit: "päivän päätteeksi" (at the end of the day),
  "ajatella laatikon ulkopuolelta", "tuoda pöytään", "win-win" → vältä

## KAKSIMIELISYYDET (tärkeää!)
- Joillakin sanoilla on arkikielessä toinen, joskus hauska tai sopimaton merkitys.
- Lue jokainen lause kuin suomalainen sen kuulisi. Jos sen voi tulkita kahdella
  tavalla, kirjoita uusiksi.
- Esim. suora käännös "I'm flexible in all positions" → "joustan kaikissa
  asennoissa" kuulostaa kaksimieliseltä. Kirjoita: "sopeudun erilaisiin tehtäviin".
- Vältä sanoja jotka voivat viitata kehoon/seksuaalisuuteen vahingossa.

## HYVÄ vs. HUONO (mallit)
HUONO: "Tämä rooli resonoi vahvasti kanssani."
HYVÄ:  "Tämä tehtävä tuntuu juuri minulle sopivalta."

HUONO: "Olen intohimoinen ja ratkaisukeskeinen ammattilainen."
HYVÄ:  "Pidän siitä, kun saan purkaa hankalan ongelman osiin ja löytää toimivan tavan."

HUONO: "Haluan tuoda pöytään dynaamista osaamistani."
HYVÄ:  "Voin auttaa erityisesti asiakaspalvelussa ja aikataulujen hallinnassa."

## ENNEN PALAUTUSTA — tarkista itse:
- [ ] Kuulostaako jokainen lause siltä, että suomalainen oikeasti sanoisi näin?
- [ ] Onko yhtään kiellettyä sanaa? Korvaa.
- [ ] Voiko jonkin lauseen tulkita kaksimielisesti? Kirjoita uusiksi.
- [ ] Onko teksti suoraa ja konkreettista, ei korulauseita?
`;

// Valinnainen: erillinen "suomi-tarkistus" -kriteeri laatuvaiheeseen.
// Lisää tämä esim. evaluateLetterQuality-promptin arviointikohtiin:
export const FINNISH_QUALITY_CHECK = `
6. Is the Finnish NATURAL (not translationese)? Penalize:
   - words like "resonoi", "intohimoinen", "saumaton", "ratkaisukeskeinen"
   - stiff/bureaucratic phrasing or English calques
   - any sentence with an accidental double (suggestive) meaning
`;
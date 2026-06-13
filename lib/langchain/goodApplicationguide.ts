// lib/langchain/goodApplicationguide.ts
// Kuratoidut periaatteet hyvästä (suomalaisesta) hakukirjeestä.
// Tiivistä tähän asiantuntijoiden neuvot OMIN SANOIN — älä liitä raakoja artikkeleita.
// Injektoi system-promptiin (vain hakukirjeissä, halutessasi vain suomeksi):
//   const guide = isFinnish ? GOOD_APPLICATION_GUIDE : '';

export const GOOD_APPLICATION_GUIDE = `
# ════════════════════════════════════════════════════════════════
# WHAT MAKES A STRONG FINNISH COVER LETTER (expert-informed)
# ════════════════════════════════════════════════════════════════

Write a letter that a Finnish recruiter would find genuine and concrete.

## PERIAATTEET
1. KONKREETTISUUS yli yleisyyden.
   - Älä: "Olen ahkera ja oma-aloitteinen."
   - Vaan: "Otin vastuun varaston inventaariosta, kun esimieheni oli sairaana."
2. KOHDISTA tehtävään ja yritykseen — ei geneeristä massakirjettä.
3. NÄYTÄ ESIMERKEILLÄ (STAR: tilanne → tehtävä → toiminta → tulos).
   Kerro lyhyt tilanne ja mitä siitä seurasi.
4. ALOITA VAHVASTI. Älä aloita "Haen ilmoittamaanne tehtävää".
   Aloita sillä, miksi juuri tämä tehtävä/ala kiinnostaa, tai konkreettisella
   esimerkillä osaamisestasi.
5. MITÄ ANNAT työnantajalle — ei vain mitä haluat itse.
6. PITUUS: yksi sivu, n. 250–400 sanaa. Tiivis on parempi kuin rönsyilevä.
7. OMA ÄÄNI: rehellinen, ihmismäinen. Ei korulauseita, ei liioittelua.
8. LOPETA SELKEÄSTI: kerro kiinnostuksesi jatkaa (esim. haastattelu),
   ilman nöyristelyä.

## VÄLTÄ (yleisiä virheitä)
- CV:n toistaminen sellaisenaan — kirje täydentää, ei toista.
- Tyhjät superlatiivit ("erittäin motivoitunut huippuosaaja").
- Liian pitkä, monisivuinen kirje.
- Geneerisyys: mikä tahansa yritys voisi saada saman kirjeen.

## HYVÄ vs. HEIKKO ALOITUS
HEIKKO: "Haen teillä avoinna olevaa myyjän tehtävää."
HYVÄ:   "Parhaat työpäiväni ovat niitä, joina saan auttaa epävarman asiakkaan
         löytämään juuri oikean ratkaisun — siksi tämä tehtävä kiinnostaa minua."
`;
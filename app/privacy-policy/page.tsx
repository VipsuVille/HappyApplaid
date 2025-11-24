/* # TIETOSUOJASELOSTE (GDPR)

**Viimeksi päivitetty:** [PÄIVÄMÄÄRÄ]  
**Yritys:** [YRITYKSESI NIMI]  
**Y-tunnus:** [Y-TUNNUS]  
**Yhteyshenkilö:** [SÄHKÖPOSTI]

---

## 1. KUKA ON REKISTERINPITÄJÄ?

**Rekisterinpitäjä:**
- Nimi: [YRITYKSESI NIMI]
- Osoite: [OSOITE]
- Y-tunnus: [Y-TUNNUS]
- Yhteyshenkilö tietosuoja-asioissa: [EMAIL]

---

## 2. MITÄ TIETOJA KERÄÄMME?

### 2.1 Pakolliset tiedot (palvelun käyttöön)
- **Nimi** (hakukirjeen luomiseen)
- **Sähköpostiosoite** (tilin tunnistamiseen ja viestintään)
- **Puhelinnumero** (hakukirjeen yhteystietoihin)

### 2.2 Vapaaehtoiset tiedot (paremman palvelun tarjoamiseen)
- **Sijainti** (hakukirjeen yhteystietoihin)
- **Työkokemus** (AI-generoidun hakukirjeen sisältöön)
- **Koulutus** (AI-generoidun hakukirjeen sisältöön)
- **Taidot** (ATS-optimointiin)
- **Persoonallisuustiedot** (hakukirjeen henkilökohtaistamiseen):
  - Työtyyli
  - Ongelmanratkaisutapa
  - Energianlähteet
  - Ainutlaatuiset vahvuudet
  - Oppimistyyli
  - Tiimirooli
  - Arvot
  - Ammatti-identiteetti

### 2.3 Automaattisesti kerätyt tiedot
- **Tekninen data:** IP-osoite, selaintyyppi, käyttöjärjestelmä
- **Käyttödata:** Kirjautumisajat, palvelun käyttö
- **Evästeet:** Istunnon hallinta, käyttökokemuksen parantaminen

---

## 3. MIKSI KERÄÄMME TIETOJA?

| Käyttötarkoitus | Oikeusperuste | Säilytysaika |
|----------------|---------------|--------------|
| Hakukirjeiden luominen AI:lla | Sopimus (palvelun tarjoaminen) | Tilin olemassaolon ajan |
| Tilin hallinta ja tunnistus | Sopimus | Tilin olemassaolon ajan |
| Laskutus ja maksujen käsittely | Sopimus + Lakisääteinen velvoite | 6 vuotta (kirjanpitolaki) |
| Palvelun kehittäminen | Oikeutettu etu | Anonymisoitu data: pysyvästi |
| Markkinointi (vain suostumuksella) | Suostumus | Suostumuksen peruuttamiseen asti |

---

## 4. KENELLE TIETOJA LUOVUTETAAN?

### 4.1 Kolmannet osapuolet (tietojen käsittelijät)

| Palvelu | Käyttötarkoitus | Sijainti | GDPR-sopimus |
|---------|----------------|----------|--------------|
| **Clerk** | Käyttäjien tunnistus ja kirjautuminen | USA (EU-DPA) | ✅ DPA allekirjoitettu |
| **Supabase** | Tietokannan ylläpito | EU (Saksa/Ranska) | ✅ GDPR-yhteensopiva |
| **OpenAI** | AI-pohjainen tekstin generointi | USA (EU-DPA) | ✅ DPA allekirjoitettu |
| **Stripe** (jos käytössä) | Maksujen käsittely | USA (EU-DPA) | ✅ PCI DSS -sertifioitu |

### 4.2 Mitä tietoja lähetämme OpenAI:lle?
OpenAI:lle lähetetään:
- Työpaikkailmoitus (käyttäjän syöttämä)
- Käyttäjän profiilitiedot (nimi, työkokemus, taidot, persoonallisuus)
- Käyttäjän kirjoittamat lisätiedot

**TÄRKEÄÄ:**
- OpenAI EI käytä tietojasi mallien koulutukseen (Zero Data Retention -sopimus)
- OpenAI säilyttää dataa 30 päivää väärinkäytösten estämiseksi, jonka jälkeen se poistetaan
- Lue lisää: [OpenAI Enterprise Privacy](https://openai.com/enterprise-privacy)

### 4.3 Tietojen siirto EU:n ulkopuolelle
- **USA:** Clerk ja OpenAI sijaitsevat USA:ssa, mutta noudattavat EU:n tietosuojasopimuksia (Standard Contractual Clauses)
- **EU:** Supabase-tietokanta sijaitsee EU-alueella (Saksa/Ranska)

---

## 5. OIKEUTESI (GDPR)

Sinulla on seuraavat oikeudet:

### 5.1 Oikeus tarkastaa tietosi
- Voit ladata kaikki tietosi JSON-muodossa
- **Toteutus:** Mene profiilisivulle → "Lataa tietoni"

### 5.2 Oikeus korjata tietosi
- Voit muokata tietojasi milloin tahansa
- **Toteutus:** Mene profiilisivulle → Muokkaa tietoja

### 5.3 Oikeus poistaa tietosi ("oikeus tulla unohdetuksi")
- Voit poistaa tilisi ja kaikki tietosi
- **Toteutus:** Mene asetuksiin → "Poista tili"
- **Huom:** Laskutustiedot säilytetään 6 vuotta kirjanpitolain mukaan

### 5.4 Oikeus rajoittaa käsittelyä
- Voit keskeyttää tietojesi käsittelyn
- **Toteutus:** Ota yhteyttä: [EMAIL]

### 5.5 Oikeus siirtää tiedot (data portability)
- Voit siirtää tietosi toiseen palveluun
- **Toteutus:** Lataa tietosi JSON-muodossa

### 5.6 Oikeus peruuttaa suostumus
- Jos olet antanut suostumuksen (esim. markkinointi), voit peruuttaa sen
- **Toteutus:** Mene asetuksiin → "Markkinointiviestit"

### 5.7 Oikeus tehdä valitus
Jos koet, että tietojasi käsitellään väärin, voit tehdä valituksen:
- **Suomi:** Tietosuojavaltuutetun toimisto (https://tietosuoja.fi/)
- **EU:** Oman maasi tietosuojaviranomainen

---

## 6. TIETOTURVA

### 6.1 Tekninen suojaus
- **Salaus:** Kaikki tiedot salataan TLS/SSL-yhteydellä
- **Tietokanta:** Supabase käyttää AES-256-salausta
- **Pääsynhallinta:** Vain valtuutetut työntekijät voivat käsitellä tietoja
- **Varmuuskopiot:** Automaattiset päivittäiset varmuuskopiot

### 6.2 Tietomurtojen hallinta
Jos tietomurto tapahtuu:
- Ilmoitamme sinulle 72 tunnin kuluessa
- Ilmoitamme viranomaisille (Tietosuojavaltuutettu)
- Toteutamme korjaavat toimenpiteet välittömästi

---

## 7. EVÄSTEET (COOKIES)

### 7.1 Mitä evästeitä käytämme?

| Eväste | Tyyppi | Tarkoitus | Kesto |
|--------|--------|-----------|-------|
| `__clerk_db_jwt` | Välttämätön | Kirjautumisen säilytys | Istunnon ajan |
| `sb-access-token` | Välttämätön | Supabase-istunto | Istunnon ajan |
| `analytics_*` (jos käytössä) | Analytiikka | Käyttötilastojen keräys | 1 vuosi |

### 7.2 Miten voin hallita evästeitä?
- Voit estää evästeet selaimesi asetuksista
- **HUOM:** Välttämättömät evästeet (kirjautuminen) ovat pakollisia palvelun toiminnalle

---

## 8. LASTEN TIETOSUOJA

- Palvelu on tarkoitettu vain 16 vuotta täyttäneille
- Jos alle 16-vuotias on rekisteröitynyt, ota yhteyttä: [EMAIL]
- Poistamme alaikäisten tiedot välittömästi

---

## 9. MUUTOKSET TIETOSUOJASELOSTEESEEN

- Pidätämme oikeuden päivittää tietosuojaselostetta
- Ilmoitamme merkittävistä muutoksista sähköpostitse
- Viimeisin versio löytyy aina osoitteesta: [URL]

---

## 10. YHTEYSTIEDOT

**Tietosuoja-asiat:**
- Sähköposti: [EMAIL]
- Postiosoite: [OSOITE]
- Puhelin: [PUHELIN] (arkisin 9-17)

**Vastausaika:** Vastaamme tietosuojakyselyihin 14 päivän kuluessa.

---

## 11. GDPR-YHTEENVETO (TIIVISTELMÄ)

✅ **Mitä keräämme:** Nimi, email, puhelin, työhistoria, persoonallisuustiedot  
✅ **Miksi keräämme:** Hakukirjeiden luominen AI:lla  
✅ **Mihin data menee:** Supabase (EU), OpenAI (USA, GDPR-sopimus)  
✅ **Oikeutesi:** Tarkastaa, korjata, poistaa, siirtää  
✅ **Säilytys:** Tilin ajan, laskutusdata 6v  
✅ **Yhteyttä:** [EMAIL]

---

**Hyväksyn tietosuojaselosteen:** [CHECKBOX]  
*Pakollinen palvelun käyttöön* */
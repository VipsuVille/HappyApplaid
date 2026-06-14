// app/tietosuoja/page.tsx
// Tietosuojaseloste (GDPR) — HappyApplaid
// ⚠️ TÄYTÄ HAKASULKEET: [NIMESI] ja [SÄHKÖPOSTI]. Muu sisältö vastaa nykyistä
//    kokoonpanoa (yksityishenkilö-rekisterinpitäjä, data poistetaan heti tilin
//    mukana, Vercel Analytics ainoana analytiikkana, ei evästebanneria).
// ⚠️ EI OIKEUDELLISTA NEUVOA — tarkistuta juristilla ennen julkaisua.

export const metadata = {
  title: 'Tietosuojaseloste – HappyApplaid',
  description: 'Miten HappyApplaid käsittelee henkilötietojasi (GDPR).',
};

export default function TietosuojaPage() {
  const updated = '13.6.2026'; // päivitä kun muutat selostetta

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 text-gray-800 dark:text-neutral-200">
      <div className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tietosuojaseloste</h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mb-10">
          Päivitetty {updated} · EU:n yleinen tietosuoja-asetus (GDPR)
        </p>

        <Section title="1. Rekisterinpitäjä">
          <p>
            Tästä palvelusta (HappyApplaid, happyapplaid.com) vastaava rekisterinpitäjä on
            yksityishenkilö:
          </p>
          <p className="mt-2">
            <strong>VipsuGod</strong><br />
            Sähköposti: <strong>vipsugod@gmail.com</strong>
          </p>
          <p className="mt-2">
            Tietosuojaa koskevissa asioissa ota yhteyttä yllä olevaan sähköpostiin.
          </p>
        </Section>

        <Section title="2. Mitä tietoja keräämme">
          <p>Käsittelemme seuraavia henkilötietoja:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Tilitiedot:</strong> nimi ja sähköpostiosoite (kirjautumisen yhteydessä, Clerk-palvelun kautta).</li>
            <li><strong>Profiilitiedot:</strong> antamasi tiedot CV:tä ja hakukirjeitä varten (työkokemus, koulutus, taidot, vapaaehtoiset persoonallisuuskysymysten vastaukset).</li>
            <li><strong>Luotu sisältö:</strong> luomasi CV:t ja hakukirjeet sekä niihin liittyvät kuvatiedostot.</li>
            <li><strong>Käyttötiedot:</strong> tieto käyttämistäsi AI-toiminnoista (viikkokäytön seurantaa varten).</li>
            <li><strong>Maksutiedot:</strong> tilauksen tila ja laskutuskausi. Varsinaiset korttitiedot käsittelee Stripe — emme tallenna niitä.</li>
          </ul>
        </Section>

        <Section title="3. Mihin tietoja käytetään ja millä perusteella">
          <p>Käsittelemme tietoja seuraaviin tarkoituksiin:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Palvelun tuottaminen</strong> (CV:iden ja hakukirjeiden luonti) — käsittelyperuste: sopimuksen täytäntöönpano.</li>
            <li><strong>Tilin ja tilauksen hallinta</strong> — käsittelyperuste: sopimuksen täytäntöönpano.</li>
            <li><strong>Käytön rajoittaminen ja väärinkäytön esto</strong> (viikkokäytön seuranta) — käsittelyperuste: oikeutettu etu.</li>
            <li><strong>Palvelun kehittäminen</strong> (anonyymi kävijäanalytiikka) — käsittelyperuste: oikeutettu etu.</li>
          </ul>
        </Section>

        <Section title="4. Tekoälyn käyttö">
          <p>
            Palvelu käyttää OpenAI:n kielimalleja CV:iden ja hakukirjeiden luontiin. Antamasi
            profiili- ja työpaikkatiedot lähetetään käsiteltäväksi OpenAI:lle sisällön
            luomiseksi. Emme käytä tietojasi tekoälymallien kouluttamiseen.
          </p>
        </Section>

        <Section title="5. Palveluntarjoajat (tietojen vastaanottajat)">
          <p>Käytämme luotettavia alihankkijoita tietojen käsittelyssä:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Clerk</strong> — kirjautuminen ja käyttäjähallinta.</li>
            <li><strong>Supabase</strong> — tietokanta ja tiedostojen tallennus.</li>
            <li><strong>Stripe</strong> — maksujen käsittely.</li>
            <li><strong>OpenAI</strong> — sisällön luonti (tekoäly).</li>
            <li><strong>Vercel</strong> — palvelun käyttöympäristö ja yksityisyysystävällinen kävijäanalytiikka (Vercel Analytics ei käytä evästeitä eikä tunnista yksittäisiä käyttäjiä).</li>
          </ul>
          <p className="mt-2">
            Osa palveluntarjoajista voi käsitellä tietoja EU/ETA-alueen ulkopuolella (esim.
            Yhdysvallat). Tällöin siirto perustuu EU:n hyväksymiin suojatoimiin (esim.
            vakiosopimuslausekkeet).
          </p>
        </Section>

        <Section title="6. Evästeet">
          <p>
            Käytämme ainoastaan palvelun toiminnan kannalta <strong>välttämättömiä evästeitä</strong>:
            kirjautumisen ja istunnon ylläpitoon (Clerk) sekä maksamiseen (Stripe). Nämä eivät
            vaadi erillistä suostumusta. Emme käytä mainos- tai seurantaevästeitä. Kävijäanalytiikka
            (Vercel Analytics) toimii ilman evästeitä.
          </p>
        </Section>

        <Section title="7. Tietojen säilytysaika">
          <p>
            Säilytämme henkilötietojasi niin kauan kuin sinulla on aktiivinen tili. Kun
            <strong> poistat tilisi, kaikki henkilötietosi ja luomasi sisältö poistetaan
            välittömästi</strong> (CV:t, hakukirjeet, profiilitiedot, kuvatiedostot ja
            käyttöhistoria). Maksutapahtumiin liittyviä tietoja voidaan säilyttää
            kirjanpitolainsäädännön edellyttämä aika.
          </p>
        </Section>

        <Section title="8. Oikeutesi">
          <p>Sinulla on GDPR:n mukaiset oikeudet:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Oikeus saada pääsy tietoihisi.</li>
            <li>Oikeus oikaista virheelliset tiedot.</li>
            <li>Oikeus poistaa tietosi (&quot;oikeus tulla unohdetuksi&quot;) — voit poistaa tilisi milloin tahansa asetuksista.</li>
            <li>Oikeus rajoittaa tai vastustaa käsittelyä.</li>
            <li>Oikeus siirtää tiedot järjestelmästä toiseen.</li>
            <li>Oikeus tehdä valitus valvontaviranomaiselle (Suomessa tietosuojavaltuutetun toimisto, tietosuoja.fi).</li>
          </ul>
          <p className="mt-2">
            Voit käyttää oikeuksiasi ottamalla yhteyttä yllä olevaan sähköpostiin tai poistamalla
            tilisi suoraan palvelun asetuksista.
          </p>
        </Section>

        <Section title="9. Tietoturva">
          <p>
            Tiedot säilytetään suojatuilla palvelimilla ja yhteydet on salattu. Pääsy tietoihin on
            rajattu. Emme voi kuitenkaan taata täydellistä tietoturvaa internetissä.
          </p>
        </Section>

        <Section title="10. Muutokset tähän selosteeseen">
          <p>
            Voimme päivittää tätä selostetta palvelun kehittyessä. Merkittävistä muutoksista
            ilmoitamme palvelussa. Viimeisin päivitys: {updated}.
          </p>
        </Section>

        <p className="mt-12 text-xs text-gray-400 dark:text-neutral-600">
          Tämä seloste on laadittu hyvässä uskossa, mutta se ei ole oikeudellinen neuvo.
        </p>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h2>
      <div className="text-sm leading-relaxed text-gray-700 dark:text-neutral-300">{children}</div>
    </section>
  );
}
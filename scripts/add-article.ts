// ═══════════════════════════════════════════════════════════════
// scripts/add-article.ts - LISÄÄ YKSITTÄINEN ARTIKKELI
// ═══════════════════════════════════════════════════════════════
// 1. Lisää nämä rivit aivan tiedoston alkuun:
import dotenv from 'dotenv';
import path from 'path';

// 2. Lataa .env.local tiedosto projektin juuresta
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
console.log('DEBUG: Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Löytyi' : 'EI LÖYTYNYT');

const article = `
CV ja työhakemus ovat edelleen keskeisessä roolissa työnhaussa ja useimmiten molempia tarvitaan.

Kuntarekryn hakulomake ikään kuin yhdistää nämä kaksi työnhaun asiakirjaa yhdeksi kokonaisuudeksi. Jokainen Kuntarekryn kautta rekrytoiva työnantaja päättää itse, mitä tietoja pyytää hakijaa täyttämään lomakkeella. Usein hakijoilta kuitenkin pyydetään olennaiset taustatiedot (yhteystiedot, koulutus, työkokemus) ja sen lisäksi lomakkeella on vapaamuotoisia tekstikenttiä, joilla hakija voi avata osaamistaan ja motivaatiotaan laajemmin.

Hyödynnä aina mahdollisuus perustella omin sanoin, miksi juuri sinä olisit hyvä valinta tehtävään. Joskus CV:tä ja työhakemusta pyydetään myös erillisinä liitteinä, jolloin ne kannattaa ehdottomasti toimittaa.

Lue työpaikkailmoitus ja vastaa siihen, mitä kysytään
Työhakemus on tiivis ja selkeärakenteinen, sivumäärillä mitattuna alle sivun mittainen. Kerro hakemuksessa ainakin:

oma motivaatio ja soveltuvuus haettavaan tehtävään
muutama poiminta relevantista työhistoriasta
mitä hyötyä työpanoksestani on organisaatiolle
minkälainen olen työntekijänä
halukkuus tapaamiseen
allekirjoitus ja yhteystiedot (Kuntarekryn hakulomakkeen vapaamuotoiseen tekstikenttään et tarvitse yhteystietoja erikseen)
Työhakemuksessa ei välttämättä riitä, että kerrot työhistoriasi ja osaamisesi, vaan sinun pitää myös luoda odotuksia ja luvata. Työnantaja etsii henkilöä, joka ratkaisee hänen ongelmansa. Ensimmäinen ongelma on löytää sopiva henkilö avoinna olevaan tehtävään – valinnan myötä ratkeavat muut ongelmat. Totta pitää puhua, mutta kerro miksi juuri sinä olet se paras valinta. Katso osaamistasi ulkopuolisen silmin ja monelta eri kantilta.

Lähde hakemuksessa aina liikkeelle siitä, mitä työnantaja hakee. Työnantajaa ei kiinnosta, että työntekijä hakee työtä, vaan että hakee juuri tätä työtä, juuri hänen organisaatiostaan.

Ensimmäinen kappale on vakio: sano siinä jotain positiivista organisaatiosta tai tehtävästä ja sitä kautta perustele kiinnostuksesi tehtävään. Jatka sitten osaamisesi/kokemuksesi esittelyllä niin, että tulet jollain tavoin käsitelleeksi suurimman osan työpaikkailmoituksessa vaadituista taidoista konkreettisten esimerkkien kautta. Esimerkiksi sen sijaan, että kerrot olevasi kokenut erikoisammattimies, kerro että edellisessä tehtävässäsi vastasit mittalaitteiden asennuksesta, säätämisestä ja huoltotiimin tulosseurannasta.

Työhakemus kertoo, minkälainen olet työntekijänä
Itsensä kehuminen voi olla vaikeaa, mutta mitäpä jos laittaisit kehut vaikkapa entisen esihenkilösi suuhun: Esihenkilöni tapasi sanoa, että jos Tiina ei tätä osaa, niin sitten meille tarvitaan koulutusta.

Toimivia ilmaisuja ovat myös esimerkiksi: Minua on kuvattu itseohjautuvaksi tiimipelaajaksi… Olen saanut positiivista palautetta projektinhallintataidoistani… Asiakkaat ovat kiitelleet minua tehokkaaksi ja asioita eteenpäin vieväksi... Osallisuuttani työyhteisössä on pidetty tärkeänä.

Päätä hakemus toivomukseen, että haluaisit tapaamisessa kertoa tarkemmin osaamisestasi ja päästä tutustumaan organisaatioon paremmin. Kerro palkkatoiveesi vain, jos sitä on kysytty. Ennen hakemuksen lähettämistä tarkista huolella, että olet varmasti vastannut vaatimuksiin niin hyvin kuin mahdollista ja että hakemustekstisi on kieliopillisesti ja rakenteellisesti selkeä kokonaisuus.

Videomuotoiset työnhaun asiakirjat ovat yleistyneet viime vuosina merkittävästi. Video-CV ja videohakemus antavatkin tekstiversiota paremman mahdollisuuden tuoda myös omaa persoonaa esiin. Mikäli sinulla ei ole vielä kertynyt työkokemusta, katso myös vinkkimme työhakemuksen laatimiseen ilman työkokemusta.
`;

async function main() {
  const { ingestContent } = await import('../lib/knowledge/ingestion');
  console.log('📥 Adding article...');
  
  const result = await ingestContent({
    content: article,
    source: 'kuntarekry', // Lähde
    author: 'None', // Kirjoittaja (optional)
    url: 'https://www.kuntarekry.fi/fi/tyoelamauutiset/toita-hakemassa/tyohakemus-tassa-hyvat-vinkit/', // URL (optional)
    
    // ✅ PRIORITY: Kuinka tärkeä tämä on?
    priority: 'high', // 'high' | 'medium' | 'low'
    
    // ✅ TYPE: Mitä varten?
    content_type: 'cover_letter', // 'cover_letter' | 'cv' | 'both'
  });

  console.log('✅ Result:', result);
  console.log(`   Chunks added: ${result.chunksAdded}`);
  console.log(`   Insights: ${result.insights.length}`);
  console.log(`   Detected type: ${result.detectedType}`);
}

main().catch(console.error);

// Suorita: npx ts-node scripts/add-article.ts


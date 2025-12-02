// scripts/debug-rag.ts - NÄYTÄ MITÄ RAG PALAUTTAA

import { KnowledgeBase } from '../lib/knowledge/index.js';

async function debugRAG() {
  console.log('🔍 RAG DEBUG - Simuloidaan hakukirjeen luontia\n');

  const knowledgeBase = new KnowledgeBase();

  // Simuloi Pro-käyttäjän hakukirjeen luonti
  const mockInput = {
    jobDescription: `
      Haemme ohjelmistokehittäjää Hankkijalle.
      
      Vastuualueesi:
      - Web-sovellusten kehitys
      - Tiimityöskentely
      - Jatkuva oppiminen
      
      Etsimme sinua jos:
      - Osaat Reactin ja TypeScriptin
      - Olet tiimipelaaja
      - Haluat kehittyä
    `,
    
    userProfile: {
      experienceLevel: 'mid',
      hasLeadership: false,
      careerStage: 'growing',
      skills: ['React', 'TypeScript', 'JavaScript'],
      yearsOfExperience: 3
    },
    
    language: 'finnish'
  };

  console.log('📋 SYÖTE:');
  console.log('─────────────────────────────────────');
  console.log('Työ:', mockInput.jobDescription.substring(0, 100) + '...');
  console.log('Profiili:', mockInput.userProfile.experienceLevel, 
              `(${mockInput.userProfile.yearsOfExperience}v)`);
  console.log('\n');

  // Rakenna RAG-konteksti
  console.log('🧠 RAKENNETAAN RAG-KONTEKSTIA...\n');
  
  const ragContext = await knowledgeBase.buildAIContext({
    jobDescription: mockInput.jobDescription,
    userProfile: mockInput.userProfile,
    language: mockInput.language,
    contentType: 'cover_letter'
  });

  // Analysoi tulokset
  console.log('✅ RAG-KONTEKSTI RAKENNETTU\n');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Erittele osat
  const sections = ragContext.split('\n\n---\n\n');
  
  sections.forEach((section, index) => {
    if (section.includes('CORE TRUTH GUIDELINES')) {
      console.log('📜 OSA 1: CORE GUIDELINES (honesty.md)');
      console.log('   Pituus:', section.length, 'merkkiä');
      console.log('   Sisältö: Perustotuudet - AINA mukana\n');
    } 
    else if (section.includes('LEARNED INSIGHTS')) {
      console.log('📚 OSA 2: RAG INSIGHTS (knowledge base)');
      console.log('   Pituus:', section.length, 'merkkiä');
      
      // Laske montako artikkelia
      const articles = section.match(/\[Source: ([^\]]+)\]/g) || [];
      console.log('   Artikkeleja:', articles.length);
      
      articles.forEach((art, i) => {
        const source = art.match(/\[Source: ([^\]]+)\]/)?.[1];
        console.log(`   ${i + 1}. ${source}`);
      });
      
      // Laske insights
      const insights = section.match(/- [A-Z]/g) || [];
      console.log('   Insights:', insights.length);
      console.log('\n');
    }
  });

  console.log('═══════════════════════════════════════════════════════════\n');

  // Näytä esimerkkipoimi
  const insightSection = sections.find(s => s.includes('LEARNED INSIGHTS'));
  if (insightSection) {
    const firstInsight = insightSection.match(/- ([^\n]+)/)?.[1];
    console.log('💡 ESIMERKKI-INSIGHT (ensimmäinen):');
    console.log('   "' + firstInsight + '"');
    console.log('\n');
  }

  // Yhteenveto
  console.log('📊 YHTEENVETO:');
  console.log('─────────────────────────────────────');
  console.log('Kokonaispituus:', ragContext.length, 'merkkiä');
  console.log('Token-estimaatti:', Math.ceil(ragContext.length / 4), 'tokenia');
  console.log('Kustannus-estimaatti: ~$0.000' + Math.ceil(ragContext.length / 4000));
  console.log('\n');

  // Tallenna tiedostoon (optional)
  const fs = await import('fs/promises');
  await fs.writeFile('rag-debug-output.txt', ragContext, 'utf-8');
  console.log('💾 Tallennettu: rag-debug-output.txt');
  console.log('   (voit lukea koko kontekstin sieltä)\n');
}

debugRAG().catch(console.error);

// Aja: npx tsx scripts/debug-rag.ts
```

---

## 2️⃣ Miksi Jaetaan 7 Osaan? (Chunking)

### **Syy 1: Token Limit**
```
OpenAI Embedding API rajoitukset:
- Max input: 8,191 tokenia (≈ 32,000 merkkiä)

Sinun artikkeli:
- Pituus: ~3,500 merkkiä
- Tokeneja: ~875 tokenia

→ MAHTUISI YHTEEN! Miksi sitten 7 osaa?
```

### **Syy 2: Semantic Precision (Semanttinen Tarkkuus)**
```
ONGELMA: Pitkä embedding = yleinen, epätarkka

Artikkeli: "Hakukirjeen rakenne + Puhelun merkitys + PDF-vinkit..."
Embedding: [0.42, -0.31, 0.15, ...] (keskiarvo kaikesta)

Käyttäjä kysyy: "Miten rakennetaan hakukirje?"
↓
Vektori: [0.89, -0.12, 0.44, ...]
↓
Vertaa: Cosine similarity = 0.65 (huono match!)

MIKSI? Koska artikkelin embedding sisältää:
- 40% hakukirjeen rakenne
- 30% puhelinvinkit
- 30% PDF-muotoilu

→ Relevantti osa (rakenne) "laimentuu" muun sisällön sekaan
```

**RATKAISU: CHUNKING**
```
Jaa artikkeli osiin:

Chunk 1: "Tehokas työhakemus..."
         → Embedding: [0.91, -0.08, 0.52, ...] (fokus: yleiskatsaus)

Chunk 2: "Työhakemuksen rakenne..."
         → Embedding: [0.88, -0.11, 0.48, ...] (fokus: rakenne)

Chunk 3: "Soita työnantajalle..."
         → Embedding: [0.34, 0.72, -0.21, ...] (fokus: puhelin)

Käyttäjä kysyy: "Miten rakennetaan hakukirje?"
↓
Vektori: [0.89, -0.12, 0.44, ...]
↓
Chunk 2 match: 0.94 ✅ (ERINOMAINEN!)
Chunk 1 match: 0.78 ✅ (Hyvä)
Chunk 3 match: 0.42 ❌ (Ei relevantti)

→ Palauttaa VAIN Chunk 2 (tarkka vastaus!)
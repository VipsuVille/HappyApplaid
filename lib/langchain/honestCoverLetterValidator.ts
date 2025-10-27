// lib/langchain/honestCoverLetterValidator.ts
// ✅ VALIDOI TIEDOT + KYSY PUUTTUVAT

export interface ValidationResult {
  isComplete: boolean;
  missingCritical: string[];
  missingRecommended: string[];
  questions: Question[];
  canGenerate: 'yes' | 'with_limitations' | 'no';
  reason?: string;
}

export interface Question {
  id: string;
  field: string; // esim. "workExperience", "problemSolving"
  question: string;
  why: string; // Miksi tämä on tärkeää
  required: boolean;
  minLength: number;
  example: string;
  context: string; // Konteksti työpaikkailmoituksesta
}

/**
 * ✅ VALIDOI HAKUKIRJEEN TIEDOT
 * - Ei keksi mitään
 * - Kysyy puuttuvat tiedot
 * - Kertoo rehellisesti mitä puuttuu
 */
export async function validateCoverLetterData(input: {
  jobDescription: string;
  name: string;
  email: string;
  phone: string;
  workExperience?: string;
  education?: string;
  skills?: string;
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  superpower?: string;
  valuesExample?: string;
}): Promise<ValidationResult> {
  
  const missingCritical: string[] = [];
  const missingRecommended: string[] = [];
  const questions: Question[] = [];

  // ✅ 1. PAKOLLLISET PERUSTIEDOT
  if (!input.name || input.name.length < 2) {
    missingCritical.push('name');
  }
  if (!input.email || !input.email.includes('@')) {
    missingCritical.push('email');
  }

  // ✅ 2. ANALYSOI TYÖPAIKKAILMOITUS
  const jobAnalysis = await analyzeJobRequirements(input.jobDescription);

  // ✅ 3. TARKISTA TYÖKOKEMUS
  const hasWorkExperience = input.workExperience && input.workExperience.length > 100;
  
  if (!hasWorkExperience) {
    // ❌ EI TYÖKOKEMUSTA - tarvitaan VAHVA persoonallisuusprofiili
    
    // PAKOLLINEN: Ongelmanratkaisu (korvaa työkokemusta)
    if (!input.problemSolving || input.problemSolving.length < 80) {
      missingCritical.push('problemSolving');
      questions.push({
        id: 'problemSolving_critical',
        field: 'problemSolving',
        question: 'Anna konkreettinen esimerkki haastavasta tilanteesta jonka ratkaisit',
        why: 'Koska sinulla ei ole työkokemusta, tarvitsemme todisteen ongelmanratkaisukyvystäsi. Tämä voi olla koulusta, harrastuksesta tai vapaa-ajalta.',
        required: true,
        minLength: 80,
        example: 'Esimerkki: Ryhmätyössä syntyi erimielisyys toteutustavasta. Ehdotin että listaamme kaikki vaihtoehdot ja äänestämme. Lopulta löysimme kompromissin ja saimme projektin valmiiksi ajoissa.',
        context: `Työpaikkailmoitus mainitsee: "${jobAnalysis.mainChallenge}"`,
      });
    }

    // PAKOLLINEN: Ainutlaatuinen vahvuus
    if (!input.uniqueStrength || input.uniqueStrength.length < 60) {
      missingCritical.push('uniqueStrength');
      questions.push({
        id: 'uniqueStrength_critical',
        field: 'uniqueStrength',
        question: 'Mikä on sellainen asia, jossa olet erityisen hyvä ja jota ihmiset pyytävät sinulta?',
        why: 'Tämä erottaa sinut muista hakijoista. Ei tarvitse olla "ammatillinen" - voi olla luonteenpiirre tai kyky.',
        required: true,
        minLength: 60,
        example: 'Esimerkki: Olen hyvä selittämään monimutkaisia asioita yksinkertaisesti. Koulussa luokkatoverini pyytävät usein minua auttamaan oppimisessa.',
        context: `Työpaikkailmoitus hakee: "${jobAnalysis.keySkills.join(', ')}"`,
      });
    }

    // PAKOLLINEN: Ammatti-identiteetti
    if (!input.superpower || input.superpower.length < 10) {
      missingCritical.push('superpower');
      questions.push({
        id: 'superpower_critical',
        field: 'superpower',
        question: 'Kuvaa itsesi kolmella sanalla ammattilaisena',
        why: 'Tämä luo ammatillisen identiteetin vaikka et ole vielä työelämässä.',
        required: true,
        minLength: 10,
        example: 'Esimerkki: Oppimishaluinen, Järjestelmällinen, Yhteistyökykyinen',
        context: `Työpaikkailmoitus arvostaa: "${jobAnalysis.values.join(', ')}"`,
      });
    }
  } else {
    // ✅ ON TYÖKOKEMUSTA - tarkista että se on kuvattu hyvin
    
    // ✅ TARKISTA ENSIN että workExperience ei ole undefined
    const hasDescription = input.workExperience 
      ? input.workExperience.split('\n').length > 2 
      : false;
      
    if (!hasDescription) {
      missingRecommended.push('workExperience_detail');
      questions.push({
        id: 'workExperience_detail',
        field: 'workExperience',
        question: 'Kuvaile työtehtäviäsi ja saavutuksiasi tarkemmin',
        why: 'Pelkkä yrityksen nimi ei riitä - kerro mitä teit ja mitä saavutit.',
        required: false,
        minLength: 100,
        example: 'Esimerkki: Myyjä, K-Market (kesä 2023)\n- Asiakaspalvelu ja kassakäsittely\n- Tuotteiden esittely ja myyntityö\n- Varaston järjestely\nSaavutus: Sain parhaan asiakaspalautteen kesätyöntekijöistä (4.8/5)',
        context: `Työpaikkailmoitus hakee kokemusta: "${jobAnalysis.experienceAreas.join(', ')}"`,
      });
    }
  }

  // ✅ 4. TARKISTA PERSOONALLISUUSPROFIILI (suositeltava kaikille)
  const personalityScore = calculatePersonalityCompleteness({
    workingStyle: input.workingStyle,
    problemSolving: input.problemSolving,
    energySources: input.energySources,
    uniqueStrength: input.uniqueStrength,
    learningStyle: input.learningStyle,
    teamRole: input.teamRole,
    superpower: input.superpower,
    valuesExample: input.valuesExample,
  });

  if (personalityScore < 50) {
    // Alle 50% persoonallisuudesta täytetty
    if (!input.workingStyle || input.workingStyle.length < 50) {
      missingRecommended.push('workingStyle');
      questions.push({
        id: 'workingStyle_recommended',
        field: 'workingStyle',
        question: 'Miten tykkäät työskennellä? Missä olosuhteissa olet parhaimmillasi?',
        why: 'Auttaa työnantajaa arvioimaan sopivuuttasi tiimiin ja työkulttuuriin.',
        required: false,
        minLength: 50,
        example: 'Esimerkki: Pidän järjestelmällisestä työskentelystä selkeillä ohjeilla. Nautin rauhallisesta ympäristöstä missä voin keskittyä.',
        context: `Työpaikan kuvaus: "${jobAnalysis.workEnvironment}"`,
      });
    }

    if (!input.teamRole || input.teamRole.length < 40) {
      missingRecommended.push('teamRole');
      questions.push({
        id: 'teamRole_recommended',
        field: 'teamRole',
        question: 'Millainen rooli sinulla on yleensä ryhmässä?',
        why: 'Työnantaja haluaa tietää miten toimit tiimissä.',
        required: false,
        minLength: 40,
        example: 'Esimerkki: Huolehdin että tehtävät tulee tehtyä ajallaan ja kaikki tietävät vastuunsa. Toimin mieluiten organisoijana.',
        context: `Työpaikkailmoitus mainitsee: "${jobAnalysis.teamExpectation}"`,
      });
    }
  }

  // ✅ 5. TARKISTA TAIDOT
  if (!input.skills || input.skills.length < 30) {
    missingRecommended.push('skills');
    questions.push({
      id: 'skills_recommended',
      field: 'skills',
      question: 'Listaa 5-10 taitoasi (tekniset, sosiaaliset, kielelliset)',
      why: 'ATS-järjestelmä etsii avainsanoja. Ilman taitoja hakemuksesi ei läpäise seulontaa.',
      required: false,
      minLength: 30,
      example: 'Esimerkki: Excel, PowerPoint, asiakaspalvelu, tiimityö, ongelmanratkaisu, Englanti (sujuva), B-ajokortti',
      context: `Työpaikkailmoitus vaatii: "${jobAnalysis.requiredSkills.join(', ')}"`,
    });
  }

  // ✅ 6. PÄÄTÖS
  let canGenerate: 'yes' | 'with_limitations' | 'no';
  let reason: string | undefined;

  if (missingCritical.length > 0) {
    canGenerate = 'no';
    reason = `Puuttuu pakolliset tiedot: ${missingCritical.join(', ')}. Vastaa kysymyksiin ennen jatkamista.`;
  } else if (missingRecommended.length > 3) {
    canGenerate = 'with_limitations';
    reason = `Voit luoda hakukirjeen, mutta se on heikko (${personalityScore}% valmiina). Suosittelemme vastaamaan suositeltuihin kysymyksiin.`;
  } else {
    canGenerate = 'yes';
    reason = personalityScore >= 80 
      ? 'Loistava! Profiilisi on vahva ja luo tehokkaan hakukirjeen.' 
      : 'Hyvä! Voit edelleen parantaa vastaamalla suositeltuihin kysymyksiin.';
  }

  return {
    isComplete: missingCritical.length === 0 && missingRecommended.length === 0,
    missingCritical,
    missingRecommended,
    questions,
    canGenerate,
    reason,
  };
}

/**
 * ✅ ANALYSOI MITÄ TYÖPAIKKAILMOITUS VAATII
 */
async function analyzeJobRequirements(jobDescription: string): Promise<{
  mainChallenge: string;
  keySkills: string[];
  experienceAreas: string[];
  values: string[];
  workEnvironment: string;
  teamExpectation: string;
  requiredSkills: string[];
}> {
  // Tämä voisi olla AI-pohjainen analyysi, mutta yksinkertaistetaan:
  
  const lowerDesc = jobDescription.toLowerCase();
  
  return {
    mainChallenge: extractMainChallenge(jobDescription),
    keySkills: extractKeySkills(jobDescription),
    experienceAreas: extractExperienceAreas(jobDescription),
    values: extractValues(jobDescription),
    workEnvironment: extractWorkEnvironment(jobDescription),
    teamExpectation: extractTeamExpectation(jobDescription),
    requiredSkills: extractRequiredSkills(jobDescription),
  };
}

// ✅ APUFUNKTIOT
function extractMainChallenge(desc: string): string {
  const challenges = [
    'haastava tilanne', 'ongelmanratkaisu', 'itsenäinen työskentely',
    'nopea oppiminen', 'asiakaspalvelu', 'projektityö'
  ];
  
  const found = challenges.find(c => desc.toLowerCase().includes(c));
  return found || 'monipuolinen työtehtävä';
}

function extractKeySkills(desc: string): string[] {
  const skills = [
    'tiimityö', 'kommunikaatio', 'organisointi', 'itsenäisyys',
    'ongelmanratkaisu', 'asiakaspalvelu', 'tekninen osaaminen'
  ];
  
  return skills.filter(s => desc.toLowerCase().includes(s)).slice(0, 3);
}

function extractExperienceAreas(desc: string): string[] {
  const areas = [
    'asiakaspalvelu', 'myynti', 'hallinto', 'tekninen tuki',
    'projektityö', 'tiimityö', 'esimiestyö'
  ];
  
  return areas.filter(a => desc.toLowerCase().includes(a)).slice(0, 3);
}

function extractValues(desc: string): string[] {
  const values = [
    'luotettavuus', 'sitoutuminen', 'innovatiivisuus', 'asiakaslähtöisyys',
    'yhteistyö', 'oppiminen', 'laatu'
  ];
  
  return values.filter(v => desc.toLowerCase().includes(v)).slice(0, 3);
}

function extractWorkEnvironment(desc: string): string {
  if (desc.toLowerCase().includes('etätyö')) return 'Etätyö mahdollista';
  if (desc.toLowerCase().includes('toimisto')) return 'Toimistoympäristö';
  if (desc.toLowerCase().includes('asiakaskohde')) return 'Asiakaskohteissa liikkuminen';
  return 'Monipuolinen työympäristö';
}

function extractTeamExpectation(desc: string): string {
  if (desc.toLowerCase().includes('tiimityö')) return 'Vahva tiimityöskentely';
  if (desc.toLowerCase().includes('itsenäinen')) return 'Itsenäinen työskentely';
  return 'Sekä itsenäistä että tiimiä';
}

function extractRequiredSkills(desc: string): string[] {
  const commonSkills = [
    'excel', 'word', 'powerpoint', 'suomi', 'englanti', 'ruotsi',
    'asiakaspalvelu', 'myynti', 'ajokortti', 'atk-taidot'
  ];
  
  return commonSkills.filter(s => desc.toLowerCase().includes(s));
}

function calculatePersonalityCompleteness(personality: {
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  superpower?: string;
  valuesExample?: string;
}): number {
  const fields = [
    { field: personality.workingStyle, min: 50 },
    { field: personality.problemSolving, min: 80 },
    { field: personality.energySources, min: 40 },
    { field: personality.uniqueStrength, min: 60 },
    { field: personality.learningStyle, min: 40 },
    { field: personality.teamRole, min: 40 },
    { field: personality.superpower, min: 10 },
    { field: personality.valuesExample, min: 50 },
  ];

  const completed = fields.filter(
    f => f.field && f.field.length >= f.min
  ).length;

  return Math.round((completed / fields.length) * 100);
}
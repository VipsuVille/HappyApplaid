// lib/ats/atsScoreChecker.ts
// ═══════════════════════════════════════════════════════════════
// ATS REALITY SIMULATOR — Core Scoring Engine v2
//
// v2 Changes:
// - Role-type detection (tech, sales, healthcare, service, admin, etc.)
// - Theme-based analysis for non-tech roles
// - Hard requirements extraction (driver's license, language, etc.)
// - Competency cluster scoring instead of pure keyword matching
// - Smarter recommendations per role type
//
// SECURITY: All inputs are sanitized before processing.
// No user PII is sent to AI — only extracted keywords/themes.
// ═══════════════════════════════════════════════════════════════

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

export type RoleType =
  | 'tech'
  | 'sales'
  | 'healthcare'
  | 'service'
  | 'admin'
  | 'logistics'
  | 'education'
  | 'marketing'
  | 'finance'
  | 'general';

export interface ATSCheckInput {
  jobPosting: string;
  userDocument?: string;
  documentType: 'cv' | 'cover_letter' | 'both' | 'job_only';
}

export interface JobRequirementsResult {
  jobTitle: string;
  roleType: RoleType;
  requiredSkills: string[];
  preferredSkills: string[];
  hardRequirements: HardRequirement[];
  competencyThemes: CompetencyTheme[];
  experienceRequirements: { skill: string; years: string }[];
  requiredLanguages: string[];
  educationLevel: string;
  detectedLanguage: string;
  keywordCount: number;
  difficultyEstimate: 'easy' | 'moderate' | 'hard' | 'very_hard';
  tips: string[];
}

export interface HardRequirement {
  requirement: string;       // e.g. "B driving license"
  found: boolean;
  critical: boolean;         // if missing → likely auto-rejected
}

export interface CompetencyTheme {
  theme: string;             // e.g. "Sales capability"
  description: string;
  keywords: string[];        // what to look for
  found: boolean;
  matchedKeywords: string[];
  weight: number;            // 1-3
}

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  context: string;
  importance: 'required' | 'preferred' | 'nice_to_have';
  weight: number;
}

export interface ExperienceGap {
  skill: string;
  required: string;
  userHas: string;
  gapSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  passLikelihood: number;
}

export interface ATSScoreResult {
  overallScore: number;
  keywordScore: number;
  experienceScore: number;
  languageScore: number;
  formattingScore: number;

  // v2: role-aware
  roleType: RoleType;
  hardRequirements: HardRequirement[];
  competencyThemes: CompetencyTheme[];
  themeScore: number;         // 0-100, replaces pure keyword score for non-tech roles

  keywordMatches: KeywordMatch[];
  experienceGaps: ExperienceGap[];

  detectedLanguage: {
    jobPosting: string;
    userDocument: string;
    match: boolean;
  };

  recommendations: {
    critical: string[];
    important: string[];
    optional: string[];
  };

  jobTitle: string;
  requiredSkillsCount: number;
  matchedSkillsCount: number;
  passLikelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  summary: string;
}

// ═══════════════════════════════════════
// SECURITY
// ═══════════════════════════════════════

const MAX_INPUT_LENGTH = 15000;
const MAX_KEYWORD_LENGTH = 100;

function sanitizeInput(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let clean = text;
  clean = clean.replace(/<[^>]*>/g, '');
  clean = clean.replace(/javascript:/gi, '');
  clean = clean.replace(/on\w+\s*=/gi, '');
  clean = clean.replace(/data:\s*text\/html/gi, '');
  clean = clean.replace(/vbscript:/gi, '');
  clean = clean.replace(
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|DECLARE|CAST|CONVERT|xp_)\b)/gi,
    (match) => match.replace(/./g, '*')
  );
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  clean = clean.replace(/\s+/g, ' ').trim();
  if (clean.length > MAX_INPUT_LENGTH) clean = clean.substring(0, MAX_INPUT_LENGTH);
  return clean;
}

function validateInput(text: string): { valid: boolean; reason?: string } {
  if (!text || text.length < 20)
    return { valid: false, reason: 'Input too short (minimum 20 characters)' };
  if (text.length > MAX_INPUT_LENGTH)
    return { valid: false, reason: `Input too long (maximum ${MAX_INPUT_LENGTH} characters)` };

  const suspiciousPatterns = [
    /(\{|\[)\s*("|')?\s*(\\|\/)/,
    /<\s*script/i,
    /\b(eval|setTimeout|setInterval|Function)\s*\(/,
    /\$\{.*\}/,
    /\{\{.*\}\}/,
    /\.\.\//g,
  ];
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) return { valid: false, reason: 'Input contains suspicious patterns' };
  }

  const wordCount = text.split(/\s+/).filter((w) => /^[a-zA-ZäöåÄÖÅ]/.test(w)).length;
  if (wordCount < 5) return { valid: false, reason: 'Input must contain readable text' };
  return { valid: true };
}

// ═══════════════════════════════════════
// ROLE TYPE DETECTION
// ═══════════════════════════════════════

/**
 * Detects the role type from a job posting.
 * This drives which analysis model is used downstream.
 */
function detectRoleType(text: string): RoleType {
  const t = text.toLowerCase();

  // Score each role type
  const scores: Record<RoleType, number> = {
    tech: 0,
    sales: 0,
    healthcare: 0,
    service: 0,
    admin: 0,
    logistics: 0,
    education: 0,
    marketing: 0,
    finance: 0,
    general: 0,
  };

  // Tech indicators
  const techWords = [
    'react', 'angular', 'vue', 'javascript', 'typescript', 'python', 'java', 'c#',
    'node.js', 'docker', 'kubernetes', 'aws', 'azure', 'sql', 'api', 'backend',
    'frontend', 'fullstack', 'devops', 'ohjelmisto', 'kehittäjä', 'developer',
    'software', 'engineer', 'programming', 'code', 'git', 'agile',
  ];
  techWords.forEach((w) => { if (t.includes(w)) scores.tech += 2; });

  // Sales indicators
  const salesWords = [
    'myynti', 'myynnin', 'myyjä', 'sales', 'asiakashankinta', 'provisio', 'komissio',
    'kauppa', 'tavoite', 'budjetti', 'liikevaihto', 'asiakaskäynti', 'ovelta ovelle',
    'kenttämyynti', 'b2b', 'b2c', 'ratkaisumyynti', 'suoramyynti', 'myynnillistä',
    'tulospalkka', 'myyntitulos', 'asiakasneuvottelu', 'tarjous', 'closing',
  ];
  salesWords.forEach((w) => { if (t.includes(w)) scores.sales += 2; });

  // Healthcare indicators
  const healthWords = [
    'hoitaja', 'sairaanhoitaja', 'lähihoitaja', 'lääkäri', 'terveys', 'potilas',
    'kliininen', 'hoitotyö', 'kuntoutus', 'fysioterapia', 'apteekit', 'nurse',
    'doctor', 'medical', 'patient', 'clinical', 'healthcare',
  ];
  healthWords.forEach((w) => { if (t.includes(w)) scores.healthcare += 2; });

  // Customer service indicators
  const serviceWords = [
    'asiakaspalvelu', 'asiakaspalvelija', 'customer service', 'support', 'helpdesk',
    'palveluneuvoja', 'kassatyö', 'kauppa', 'palvelualttius', 'asiakaslähtöinen',
    'puhelintyö', 'chat', 'reklamaatio',
  ];
  serviceWords.forEach((w) => { if (t.includes(w)) scores.service += 2; });

  // Admin indicators
  const adminWords = [
    'toimisto', 'sihteeri', 'assistentti', 'hallinto', 'office', 'coordinator',
    'administrator', 'excel', 'word', 'toimistotyö', 'arkistointi', 'laskutus',
  ];
  adminWords.forEach((w) => { if (t.includes(w)) scores.admin += 2; });

  // Logistics indicators
  const logisticsWords = [
    'varasto', 'logistiikka', 'kuljetus', 'trukinkuljettaja', 'trukki', 'lastaus',
    'keräily', 'pakkaus', 'terminaali', 'warehouse', 'logistics', 'delivery',
    'kuriiri', 'postinjakelu',
  ];
  logisticsWords.forEach((w) => { if (t.includes(w)) scores.logistics += 2; });

  // Education indicators
  const eduWords = [
    'opettaja', 'opetus', 'koulutus', 'pedagogi', 'didaktiikka', 'luokka',
    'koulu', 'oppilaat', 'teacher', 'education', 'training', 'coaching',
  ];
  eduWords.forEach((w) => { if (t.includes(w)) scores.education += 2; });

  // Marketing indicators
  const marketingWords = [
    'markkinointi', 'some', 'sosiaalinen media', 'kampanja', 'brändi', 'sisältö',
    'seo', 'sem', 'ads', 'marketing', 'brand', 'content', 'creative', 'design',
    'copywriting', 'analytiikka', 'google analytics',
  ];
  marketingWords.forEach((w) => { if (t.includes(w)) scores.marketing += 2; });

  // Finance indicators
  const financeWords = [
    'taloushallinto', 'kirjanpito', 'tilitoimisto', 'controller', 'CFO', 'budjetointi',
    'raportointi', 'tilinpäätös', 'accounting', 'finance', 'audit', 'tax',
  ];
  financeWords.forEach((w) => { if (t.includes(w)) scores.finance += 2; });

  // Find highest scoring role
  let best: RoleType = 'general';
  let bestScore = 0;
  for (const [role, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = role as RoleType;
    }
  }

  // Minimum threshold — if nothing matches, it's general
  return bestScore >= 2 ? best : 'general';
}

// ═══════════════════════════════════════
// HARD REQUIREMENTS EXTRACTION
// ═══════════════════════════════════════

/**
 * Extracts hard binary requirements that cause auto-rejection if missing.
 * These are independent of role type.
 */
function extractHardRequirements(jobPosting: string): HardRequirement[] {
  const t = jobPosting.toLowerCase();
  const requirements: HardRequirement[] = [];

  const checks: Array<{ label: string; patterns: RegExp[]; critical: boolean }> = [
    {
      label: 'B-ajokortti / B driving license',
      patterns: [/\bb-?kortti\b/, /\bb-?ajo\b/, /\bdriving licen/i, /\bajokortti\b/],
      critical: true,
    },
    {
      label: 'Suomen kielen taito / Finnish language',
      patterns: [/suomen kiel/, /suomi.*vaatim/, /finnish.*required/, /fluent.*finnish/i],
      critical: true,
    },
    {
      label: 'Rikostaustaote / Criminal record check',
      patterns: [/rikostaustaote/, /puhdas rikosrekisteri/, /criminal record/i, /background check/i],
      critical: true,
    },
    {
      label: 'Täysi-ikäisyys / 18+ years old',
      patterns: [/täysi.ikäinen/, /vähintään 18/, /18 vuotta/, /18\+/],
      critical: true,
    },
    {
      label: 'Englannin kielen taito / English language',
      patterns: [/english.*required/, /fluent.*english/i, /englanti.*vaatim/],
      critical: false,
    },
    {
      label: 'Ruotsin kielen taito / Swedish language',
      patterns: [/ruotsi.*vaatim/, /swedish.*required/, /fluent.*swedish/i],
      critical: false,
    },
    {
      label: 'Hygieniapassi / Hygiene certificate',
      patterns: [/hygieniapassi/, /hygiene passport/i],
      critical: true,
    },
    {
      label: 'Trukkikortti / Forklift license',
      patterns: [/trukkikortti/, /forklift.*licen/i],
      critical: true,
    },
  ];

  for (const check of checks) {
    const found = check.patterns.some((p) => p.test(t));
    if (found) {
      requirements.push({ requirement: check.label, found: false, critical: check.critical });
    }
  }

  return requirements;
}

/**
 * Checks which hard requirements are present in the user's document.
 */
function matchHardRequirements(
  requirements: HardRequirement[],
  userDoc: string
): HardRequirement[] {
  const u = userDoc.toLowerCase();

  return requirements.map((req) => {
    // Simple presence check on the first keyword of each requirement
    const firstWord = req.requirement.split('/')[0].trim().toLowerCase().split(' ')[0];
    const found =
      u.includes(firstWord) ||
      (req.requirement.includes('ajokortti') && (u.includes('ajokortti') || u.includes('b-kortti') || u.includes('kortti'))) ||
      (req.requirement.includes('suomen') && (u.includes('suomi') || u.includes('suomeksi') || u.includes('äidinkieli'))) ||
      (req.requirement.includes('rikostaustaote') && u.includes('rikos')) ||
      (req.requirement.includes('hygieniapassi') && u.includes('hygieni')) ||
      (req.requirement.includes('trukkikortti') && u.includes('trukki'));

    return { ...req, found };
  });
}

// ═══════════════════════════════════════
// COMPETENCY THEME DEFINITIONS PER ROLE
// ═══════════════════════════════════════

/**
 * Returns competency themes relevant to the detected role type.
 * These replace/supplement pure keyword matching for non-tech roles.
 */
function getCompetencyThemes(roleType: RoleType): Omit<CompetencyTheme, 'found' | 'matchedKeywords'>[] {
  const themes: Record<RoleType, Omit<CompetencyTheme, 'found' | 'matchedKeywords'>[]> = {
    tech: [
      {
        theme: 'Technical skills',
        description: 'Programming languages, frameworks, tools',
        keywords: ['react', 'typescript', 'javascript', 'python', 'java', 'sql', 'aws', 'docker', 'git'],
        weight: 3,
      },
      {
        theme: 'Development practices',
        description: 'Agile, CI/CD, testing, code review',
        keywords: ['agile', 'scrum', 'ci/cd', 'testing', 'tdd', 'code review', 'sprint'],
        weight: 2,
      },
      {
        theme: 'Problem solving',
        description: 'Debugging, architecture, analytical thinking',
        keywords: ['debugging', 'architecture', 'ongelmanratkaisu', 'analyyttinen', 'suunnittelu'],
        weight: 1,
      },
    ],

    sales: [
      {
        theme: 'Myyntiprosessin omistajuus',
        description: 'Kokemus koko myyntisyklista — kartoituksesta kaupan päättämiseen',
        keywords: [
          'myynti', 'kauppa', 'closing', 'tarjous', 'neuvottelu', 'asiakashankinta',
          'myynnin', 'myyjä', 'ratkaisumyynti', 'b2b', 'b2c', 'suoramyynti',
        ],
        weight: 3,
      },
      {
        theme: 'Tavoitteellisuus ja tulokset',
        description: 'Konkreettiset myyntitulokset, kvartaalitavoitteet, provisiot',
        keywords: [
          'tavoite', 'tulos', 'budjetti', 'provisio', 'komissio', 'liikevaihto',
          'tulospalkka', 'kvartaali', 'myyntitavoite', 'ylitti', 'saavutti',
        ],
        weight: 3,
      },
      {
        theme: 'Asiakassuhteet ja viestintä',
        description: 'Asiakaslähtöisyys, neuvottelu, pitkäaikaiset asiakassuhteet',
        keywords: [
          'asiakaslähtöinen', 'asiakassuhde', 'asiakaspalvelu', 'neuvottelu',
          'viestintä', 'kommunikointi', 'luottamus', 'yhteistyö',
        ],
        weight: 2,
      },
      {
        theme: 'Itsenäinen kenttätyö',
        description: 'Kyky johtaa omaa työtä, kenttätyökokemus',
        keywords: [
          'itsenäinen', 'kenttätyö', 'oma-aloitteinen', 'itseohjautuva',
          'aikataulutus', 'priorisointi', 'vastuu',
        ],
        weight: 2,
      },
    ],

    healthcare: [
      {
        theme: 'Kliininen osaaminen',
        description: 'Hoitotyön käytännöt, toimenpiteet, lääkehoito',
        keywords: [
          'hoitotyö', 'kliininen', 'lääkehoito', 'toimenpide', 'potilas',
          'sairaanhoito', 'kuntoutus', 'hoitoprosessi',
        ],
        weight: 3,
      },
      {
        theme: 'Empatia ja potilaslähtöisyys',
        description: 'Inhimillinen kohtaaminen, kuuntelu, potilaan tukeminen',
        keywords: [
          'empatia', 'potilaslähtöinen', 'kohtaaminen', 'tukeminen',
          'kuuntelu', 'inhimillinen', 'ihmisläheinen',
        ],
        weight: 2,
      },
      {
        theme: 'Tiimityö ja moniammatillisuus',
        description: 'Yhteistyö hoitotiimin ja muiden ammattilaisten kanssa',
        keywords: [
          'tiimityö', 'moniammatillinen', 'yhteistyö', 'kollegat',
          'osasto', 'hoitotiimi',
        ],
        weight: 2,
      },
    ],

    service: [
      {
        theme: 'Asiakaspalveluosaaminen',
        description: 'Kokemusta asiakaspalvelusta eri kanavissa',
        keywords: [
          'asiakaspalvelu', 'asiakaslähtöinen', 'palveluasenne', 'asiakastyytyväisyys',
          'reklamaatio', 'palveluhenkinen',
        ],
        weight: 3,
      },
      {
        theme: 'Viestintä ja vuorovaikutus',
        description: 'Selkeä viestintä, rauhallisuus, kuuntelu',
        keywords: [
          'viestintä', 'vuorovaikutus', 'kommunikointi', 'kuuntelu',
          'selkeä', 'positiivinen',
        ],
        weight: 2,
      },
      {
        theme: 'Ongelmanratkaisu',
        description: 'Kyky ratkaista asiakastilanteet itsenäisesti',
        keywords: [
          'ongelmanratkaisu', 'ratkaisukeskeinen', 'itsenäinen', 'päätöksenteko',
          'tilanteiden hallinta',
        ],
        weight: 2,
      },
    ],

    admin: [
      {
        theme: 'Toimistotyökalut',
        description: 'Office-ohjelmat, järjestelmät, digitaaliset työkalut',
        keywords: ['excel', 'word', 'outlook', 'powerpoint', 'teams', 'office', 'järjestelmä'],
        weight: 3,
      },
      {
        theme: 'Organisointikyky',
        description: 'Aikataulutus, koordinointi, priorisointi',
        keywords: ['organisointi', 'koordinointi', 'aikataulutus', 'priorisointi', 'hallinta'],
        weight: 2,
      },
      {
        theme: 'Tarkkuus ja luotettavuus',
        description: 'Huolellisuus, virheettömyys, vastuullisuus',
        keywords: ['tarkka', 'huolellinen', 'luotettava', 'vastuullinen', 'järjestelmällinen'],
        weight: 2,
      },
    ],

    logistics: [
      {
        theme: 'Varastotyö ja logistiikka',
        description: 'Keräily, pakkaus, lähetykset, varastointi',
        keywords: ['varasto', 'keräily', 'pakkaus', 'lähetys', 'varastointi', 'logistiikka', 'WMS'],
        weight: 3,
      },
      {
        theme: 'Fyysiset vaatimukset',
        description: 'Kyky fyysiseen työhön, nosto, pitkät seisomiset',
        keywords: ['fyysinen', 'nosto', 'seisomatyö', 'aktiivinen', 'liikunta'],
        weight: 2,
      },
      {
        theme: 'Tarkkuus ja turvallisuus',
        description: 'Laatu, turvallisuusohjeet, huolellisuus',
        keywords: ['tarkkuus', 'turvallisuus', 'laatu', 'huolellinen', 'ohjeet'],
        weight: 2,
      },
    ],

    education: [
      {
        theme: 'Pedagoginen osaaminen',
        description: 'Opetuskokemus, pedagogiikka, oppimisen tukeminen',
        keywords: ['opetus', 'pedagoginen', 'oppiminen', 'didaktiikka', 'opetussuunnitelma'],
        weight: 3,
      },
      {
        theme: 'Vuorovaikutus oppilaiden kanssa',
        description: 'Kohtaaminen, motivointi, ryhmänhallinta',
        keywords: ['vuorovaikutus', 'motivointi', 'ryhmänhallinta', 'kohtaaminen', 'oppilaat'],
        weight: 2,
      },
      {
        theme: 'Kehittyminen ja reflektointi',
        description: 'Oman työn kehittäminen, yhteistyö kollegoiden kanssa',
        keywords: ['kehittyminen', 'reflektointi', 'yhteistyö', 'arviointi', 'palaute'],
        weight: 1,
      },
    ],

    marketing: [
      {
        theme: 'Digitaalinen markkinointi',
        description: 'Some, SEO, SEM, kampanjat, analytiikka',
        keywords: ['some', 'seo', 'sem', 'google ads', 'facebook', 'instagram', 'analytiikka', 'kampanja'],
        weight: 3,
      },
      {
        theme: 'Sisällöntuotanto',
        description: 'Copywriting, kuvankäsittely, videotuotanto',
        keywords: ['sisältö', 'copywriting', 'teksti', 'kuva', 'video', 'brändi', 'visuaalinen'],
        weight: 2,
      },
      {
        theme: 'Data ja tulokset',
        description: 'Tulosperusteinen markkinointi, mittarit, raportointi',
        keywords: ['data', 'mittari', 'raportointi', 'konversio', 'ROI', 'tulokset', 'kasvu'],
        weight: 2,
      },
    ],

    finance: [
      {
        theme: 'Taloushallinto-osaaminen',
        description: 'Kirjanpito, tilinpäätös, raportointi',
        keywords: ['kirjanpito', 'tilinpäätös', 'raportointi', 'taloushallinto', 'laskutus'],
        weight: 3,
      },
      {
        theme: 'Analyyttinen ajattelu',
        description: 'Datan analysointi, budjetointi, ennusteet',
        keywords: ['analyysi', 'budjetointi', 'ennuste', 'excel', 'taulukko', 'laskenta'],
        weight: 2,
      },
      {
        theme: 'Tarkkuus ja säädöstuntemus',
        description: 'Lakien ja säädösten tuntemus, virheettömyys',
        keywords: ['tarkka', 'säädös', 'compliance', 'laki', 'verotus', 'luotettava'],
        weight: 2,
      },
    ],

    general: [
      {
        theme: 'Ammattiosaaminen',
        description: 'Alan tietämys ja kokemus',
        keywords: ['kokemus', 'osaaminen', 'tausta', 'ammattitaito'],
        weight: 2,
      },
      {
        theme: 'Työelämätaidot',
        description: 'Yhteistyö, viestintä, vastuullisuus',
        keywords: ['yhteistyö', 'viestintä', 'vastuullisuus', 'joustavuus', 'motivaatio'],
        weight: 2,
      },
    ],
  };

  return themes[roleType] || themes.general;
}

// ═══════════════════════════════════════
// COMPETENCY THEME MATCHING
// ═══════════════════════════════════════

function matchCompetencyThemes(
  roleType: RoleType,
  userDoc: string
): CompetencyTheme[] {
  const themeDefinitions = getCompetencyThemes(roleType);
  const userLower = userDoc.toLowerCase();

  return themeDefinitions.map((def) => {
    const matchedKeywords = def.keywords.filter((kw) => userLower.includes(kw.toLowerCase()));
    const found = matchedKeywords.length > 0;

    return {
      ...def,
      found,
      matchedKeywords,
    };
  });
}

// ═══════════════════════════════════════
// LANGUAGE DETECTION
// ═══════════════════════════════════════

function detectLanguage(text: string): string {
  const sample = text.substring(0, 500).toLowerCase();
  const fiWords = ['ja', 'on', 'ei', 'että', 'tai', 'mutta', 'ovat', 'kanssa', 'myös', 'työ', 'kokemus'];
  const enWords = ['the', 'and', 'is', 'are', 'with', 'for', 'that', 'this', 'have', 'experience'];

  let fiScore = 0;
  let enScore = 0;

  for (const w of fiWords) {
    if (new RegExp(`\\b${w}\\b`).test(sample)) fiScore++;
  }
  for (const w of enWords) {
    if (new RegExp(`\\b${w}\\b`).test(sample)) enScore++;
  }
  if (/[äöåÄÖÅ]/.test(sample)) fiScore += 3;

  if (fiScore > enScore) return 'fi';
  if (enScore > fiScore) return 'en';
  return 'unknown';
}

// ═══════════════════════════════════════
// LEGACY KEYWORD EXTRACTION (for tech roles)
// ═══════════════════════════════════════

interface ExtractedRequirements {
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequirements: { skill: string; years: string }[];
  languages: string[];
  educationLevel: string;
  jobTitle: string;
}

function extractRequirementsLocal(jobPosting: string): ExtractedRequirements {
  const text = jobPosting.toLowerCase();
  const lines = jobPosting.split('\n').map((l) => l.trim()).filter(Boolean);

  const techKeywords = [
    'react', 'angular', 'vue', 'javascript', 'typescript', 'python', 'java', 'c#', 'c++',
    'node.js', 'nodejs', 'express', 'next.js', 'nextjs', 'docker', 'kubernetes', 'aws',
    'azure', 'gcp', 'sql', 'postgresql', 'mongodb', 'redis', 'git', 'ci/cd', 'agile',
    'scrum', 'rest', 'graphql', 'html', 'css', 'sass', 'tailwind', 'figma', 'linux',
    'terraform', 'ansible', 'jenkins', 'github actions', 'jira', 'confluence',
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy',
    'spring boot', 'django', 'flask', 'ruby on rails', '.net', 'blazor',
    'php', 'laravel', 'swift', 'kotlin', 'flutter', 'react native',
    'power bi', 'tableau', 'excel', 'sap', 'salesforce', 'hubspot',
  ];

  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];
  const experienceReqs: { skill: string; years: string }[] = [];

  for (const kw of techKeywords) {
    if (text.includes(kw)) {
      const isRequired =
        text.includes('require') || text.includes('must have') ||
        text.includes('essential') || text.includes('mandatory') ||
        text.includes('edellytämme') || text.includes('vaaditaan');
      if (isRequired) requiredSkills.push(kw);
      else preferredSkills.push(kw);
    }
  }

  if (requiredSkills.length === 0 && preferredSkills.length > 0) {
    requiredSkills.push(...preferredSkills.splice(0, Math.ceil(preferredSkills.length * 0.6)));
  }

  const expPatterns = [
    /(\d+)\+?\s*(?:years?|vuot|v\.)\s*(?:of\s+)?(?:experience\s+(?:with|in)\s+)?([a-zA-Z\s.#+]+)/gi,
  ];
  for (const pattern of expPatterns) {
    let match;
    while ((match = pattern.exec(jobPosting)) !== null) {
      const years = match[1];
      const skill = match[2].trim().substring(0, MAX_KEYWORD_LENGTH);
      if (years && skill && skill.length > 1) {
        experienceReqs.push({ skill, years: `${years}+ years` });
      }
    }
  }

  const langs: string[] = [];
  if (/\b(english|englanti)\b/i.test(text)) langs.push('English');
  if (/\b(finnish|suomi|suomen)\b/i.test(text)) langs.push('Finnish');
  if (/\b(swedish|ruotsi)\b/i.test(text)) langs.push('Swedish');
  if (/\b(german|saksa)\b/i.test(text)) langs.push('German');

  let jobTitle = lines[0]?.substring(0, 100) || 'Unknown Position';
  const titleMatch = jobPosting.match(/(?:position|role|title|tehtävä|rooli):\s*(.+)/i);
  if (titleMatch) jobTitle = titleMatch[1].trim().substring(0, 100);

  return {
    requiredSkills: [...new Set(requiredSkills)],
    preferredSkills: [...new Set(preferredSkills)],
    experienceRequirements: experienceReqs,
    languages: langs,
    educationLevel:
      /\b(master|maisteri|diplomi)/i.test(text) ? 'masters' :
      /\b(bachelor|kandidaatti|amk|ammattikorkeakoulu)/i.test(text) ? 'bachelors' : 'any',
    jobTitle,
  };
}

function matchKeywords(requirements: ExtractedRequirements, userText: string): KeywordMatch[] {
  const userLower = userText.toLowerCase();
  const matches: KeywordMatch[] = [];

  for (const skill of requirements.requiredSkills) {
    const found = userLower.includes(skill.toLowerCase());
    let context = 'missing';
    if (found) {
      const idx = userLower.indexOf(skill.toLowerCase());
      const start = Math.max(0, idx - 25);
      const end = Math.min(userText.length, idx + skill.length + 25);
      context = '...' + userText.substring(start, end).trim() + '...';
    }
    matches.push({ keyword: skill, found, context, importance: 'required', weight: 3 });
  }

  for (const skill of requirements.preferredSkills) {
    const found = userLower.includes(skill.toLowerCase());
    matches.push({ keyword: skill, found, context: found ? 'found' : 'missing', importance: 'preferred', weight: 1 });
  }

  return matches;
}

// ═══════════════════════════════════════
// AI ENHANCED ANALYSIS
// ═══════════════════════════════════════

function extractMentionedSkills(userText: string, reqs: ExtractedRequirements): string[] {
  const userLower = userText.toLowerCase();
  return [...reqs.requiredSkills, ...reqs.preferredSkills].filter((s) =>
    userLower.includes(s.toLowerCase())
  );
}

async function aiEnhancedAnalysis(
  roleType: RoleType,
  jobRequirements: ExtractedRequirements,
  competencyThemes: CompetencyTheme[],
  userText: string,
): Promise<{
  experienceGaps: ExperienceGap[];
  additionalKeywords: string[];
  summary: string;
} | null> {
  try {
    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 1000,
    });

    // Build context based on role type
    const themeContext = competencyThemes.map((t) =>
      `${t.theme}: ${t.found ? `FOUND (${t.matchedKeywords.join(', ')})` : 'MISSING'}`
    ).join('\n');

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You analyze job application gaps for a ${roleType} role. Return ONLY valid JSON.
No personal data. Only skill and competency analysis.
Response format:
{
  "experience_gaps": [
    { "skill": "Myyntiprosessi", "required": "Kenttämyyntikokemus", "user_has": "mentioned/not mentioned", "gap": "none|low|medium|high|critical", "pass_pct": 60 }
  ],
  "additional_keywords": ["keyword1", "keyword2"],
  "summary": "Brief 1-sentence assessment in Finnish or English matching the job posting language"
}`],
      ['human', `Role type: ${roleType}
Job requires: ${jobRequirements.requiredSkills.join(', ') || 'See competency themes'}
Experience requirements: ${jobRequirements.experienceRequirements.map((e) => `${e.skill}: ${e.years}`).join(', ') || 'none specified'}

Competency theme analysis:
${themeContext}

User document word count: ${userText.split(/\s+/).length}
User document mentioned skills: ${extractMentionedSkills(userText, jobRequirements).join(', ') || 'none detected'}

Analyze gaps for this ${roleType} role. Return JSON only.`],
    ]);

    const result = await model.invoke(await prompt.formatMessages({}));
    const content = typeof result.content === 'string' ? result.content : '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      experienceGaps: (parsed.experience_gaps || []).map((g: any) => ({
        skill: String(g.skill || '').substring(0, MAX_KEYWORD_LENGTH),
        required: String(g.required || 'not specified').substring(0, 50),
        userHas: String(g.user_has || 'not mentioned').substring(0, 50),
        gapSeverity: ['none', 'low', 'medium', 'high', 'critical'].includes(g.gap) ? g.gap : 'medium',
        passLikelihood: Math.min(100, Math.max(0, Number(g.pass_pct) || 50)),
      })),
      additionalKeywords: (parsed.additional_keywords || [])
        .filter((k: any) => typeof k === 'string')
        .map((k: string) => k.substring(0, MAX_KEYWORD_LENGTH)),
      summary: String(parsed.summary || '').substring(0, 500),
    };
  } catch (error) {
    console.error('AI analysis failed (non-critical):', error);
    return null;
  }
}

// ═══════════════════════════════════════
// FORMATTING SCORE
// ═══════════════════════════════════════

function calculateFormattingScore(text: string): number {
  let score = 70;
  if (/[•\-\*]\s/.test(text)) score += 10;
  if (/\n\n/.test(text)) score += 5;
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 50) score -= 20;
  if (wordCount > 200) score += 10;
  if (wordCount > 1000) score += 5;
  if (/\d+%/.test(text)) score += 5;
  if (/\d+/.test(text)) score += 5;
  return Math.min(100, Math.max(0, score));
}

// ═══════════════════════════════════════
// RECOMMENDATIONS GENERATOR
// ═══════════════════════════════════════

function generateRecommendations(
  roleType: RoleType,
  keywordMatches: KeywordMatch[],
  competencyThemes: CompetencyTheme[],
  hardRequirements: HardRequirement[],
  experienceGaps: ExperienceGap[],
  languageMatch: boolean,
  formattingScore: number,
  additionalKeywords: string[],
): ATSScoreResult['recommendations'] {
  const critical: string[] = [];
  const important: string[] = [];
  const optional: string[] = [];

  // Language mismatch
  if (!languageMatch) {
    critical.push(
      'Dokumentin kieli ei vastaa ilmoituksen kieltä. Tämä johtaa todennäköisesti automaattiseen hylkäykseen.'
    );
  }

  // Hard requirements not found
  const missingCritical = hardRequirements.filter((r) => r.critical && !r.found);
  if (missingCritical.length > 0) {
    critical.push(
      `Kriittiset vaatimukset puuttuvat CV:stä: ${missingCritical.map((r) => r.requirement).join(', ')}. ` +
      `Lisää nämä jos sinulla ne on.`
    );
  }

  // Role-specific: missing competency themes
  const missingThemes = competencyThemes.filter((t) => !t.found && t.weight >= 2);
  if (missingThemes.length > 0) {
    if (roleType === 'sales') {
      important.push(
        `CV:ssäsi ei vielä näy: ${missingThemes.map((t) => t.theme).join(', ')}. ` +
        `Myyntiroolissa on tärkeää kuvata konkreettisia myyntituloksia ja -prosesseja.`
      );
    } else {
      important.push(
        `Nämä osaamisalueet puuttuvat: ${missingThemes.map((t) => t.theme).join(', ')}.`
      );
    }
  }

  // Tech-role keyword gaps
  const missingRequired = keywordMatches.filter((m) => !m.found && m.importance === 'required');
  if (missingRequired.length > 0) {
    const keywords = missingRequired.map((m) => m.keyword).slice(0, 5).join(', ');
    critical.push(`Vaaditut avainsanat puuttuvat: ${keywords}. Lisää ne jos sinulla on kyseinen kokemus.`);
  }

  // Experience gaps
  const criticalGaps = experienceGaps.filter((g) => g.gapSeverity === 'critical' || g.gapSeverity === 'high');
  if (criticalGaps.length > 0) {
    important.push(
      `Merkittäviä kokemuspuutteita: ${criticalGaps.map((g) => g.skill).join(', ')}. ` +
      `Harkitse miten voit tuoda esiin siirrettävissä olevat taidot.`
    );
  }

  // Formatting
  if (formattingScore < 60) {
    important.push('Paranna dokumentin rakennetta: käytä luettelopisteitä, selkeitä osioita ja konkreettisia lukuja.');
  }

  // Role-specific tips
  if (roleType === 'sales' && competencyThemes.every((t) => !t.found)) {
    important.push(
      'Myyntiroolissa ATS ei etsi teknisiä avainsanoja vaan käyttäytymistä: ' +
      'kirjoita myyntituloksista (€, %, kauppojen määrä), asiakashankinnasta ja tavoitteiden saavuttamisesta.'
    );
  }

  // Additional keywords from AI
  if (additionalKeywords.length > 0) {
    optional.push(`Harkitse mainitsemista: ${additionalKeywords.slice(0, 5).join(', ')}`);
  }

  return { critical, important, optional };
}

// ═══════════════════════════════════════
// JOB-ONLY ANALYSIS
// ═══════════════════════════════════════

export function analyzeJobOnly(jobPosting: string): JobRequirementsResult {
  const cleanJob = sanitizeInput(jobPosting);
  const validation = validateInput(cleanJob);
  if (!validation.valid) throw new Error(`Invalid job posting: ${validation.reason}`);

  const reqs = extractRequirementsLocal(cleanJob);
  const roleType = detectRoleType(cleanJob);
  const lang = detectLanguage(cleanJob);
  const hardReqs = extractHardRequirements(cleanJob);
  const themes = getCompetencyThemes(roleType);
  const totalKeywords = reqs.requiredSkills.length + reqs.preferredSkills.length + themes.length;

  const difficulty: JobRequirementsResult['difficultyEstimate'] =
    totalKeywords >= 15 ? 'very_hard' :
    totalKeywords >= 10 ? 'hard' :
    totalKeywords >= 5  ? 'moderate' : 'easy';

  const tips: string[] = [];

  // Role-specific tips
  if (roleType === 'sales') {
    tips.push('Tämä on myyntirooli. ATS etsii käyttäytymiskuvauksia: myyntituloksia, asiakashankintaa ja tavoitteellisuutta.');
    tips.push('Mainitse konkreettiset luvut: montako kauppaa per viikko, kuinka suuri liikevaihto, mitkä tavoitteet saavutit.');
  } else if (roleType === 'healthcare') {
    tips.push('Terveydenhuoltoroolissa korostuvat kliininen osaaminen, empatia ja tiimityökyky.');
  }

  if (hardReqs.length > 0) {
    tips.push(`Kriittiset vaatimukset: ${hardReqs.filter((r) => r.critical).map((r) => r.requirement).join(', ')}.`);
  }
  if (reqs.languages.length > 0) {
    tips.push(`Kielivaatimukset: ${reqs.languages.join(', ')}. Kirjoita hakemus samalla kielellä.`);
  }
  if (totalKeywords >= 10) {
    tips.push('Ilmoitus on avainsanarikas. Käytä täsmällisiä termejä ilmoituksesta.');
  }

  return {
    jobTitle: reqs.jobTitle,
    roleType,
    requiredSkills: reqs.requiredSkills,
    preferredSkills: reqs.preferredSkills,
    hardRequirements: hardReqs,
    competencyThemes: themes.map((t) => ({ ...t, found: false, matchedKeywords: [] })),
    experienceRequirements: reqs.experienceRequirements,
    requiredLanguages: reqs.languages,
    educationLevel: reqs.educationLevel,
    detectedLanguage: lang,
    keywordCount: totalKeywords,
    difficultyEstimate: difficulty,
    tips,
  };
}

// ═══════════════════════════════════════
// MAIN SCORING FUNCTION
// ═══════════════════════════════════════

export async function checkATSScore(input: ATSCheckInput): Promise<ATSScoreResult> {
  // STEP 1: Validate & sanitize
  const cleanJob = sanitizeInput(input.jobPosting);
  const jobValidation = validateInput(cleanJob);
  if (!jobValidation.valid) throw new Error(`Invalid job posting: ${jobValidation.reason}`);

  const cleanDoc = input.userDocument ? sanitizeInput(input.userDocument) : '';
  if (input.userDocument) {
    const docValidation = validateInput(cleanDoc);
    if (!docValidation.valid) throw new Error(`Invalid document: ${docValidation.reason}`);
  }

  // STEP 2: Detect role type
  const roleType = detectRoleType(cleanJob);
  console.log(`[ATS] Detected role type: ${roleType}`);

  // STEP 3: Extract requirements
  const requirements = extractRequirementsLocal(cleanJob);

  // STEP 4: Hard requirements
  const rawHardReqs = extractHardRequirements(cleanJob);
  const hardRequirements = cleanDoc
    ? matchHardRequirements(rawHardReqs, cleanDoc)
    : rawHardReqs;

  // STEP 5: Competency themes (role-aware)
  const competencyThemes = cleanDoc
    ? matchCompetencyThemes(roleType, cleanDoc)
    : getCompetencyThemes(roleType).map((t) => ({ ...t, found: false, matchedKeywords: [] }));

  // STEP 6: Keyword matching (still useful for tech roles)
  const keywordMatches = cleanDoc ? matchKeywords(requirements, cleanDoc) : [];

  // STEP 7: Language detection
  const jobLang = detectLanguage(cleanJob);
  const docLang = cleanDoc ? detectLanguage(cleanDoc) : jobLang;
  const languageMatch = jobLang === docLang || jobLang === 'unknown' || docLang === 'unknown';

  // STEP 8: Calculate scores

  // Theme score — weighted average of found themes
  const totalThemeWeight = competencyThemes.reduce((s, t) => s + t.weight, 0);
  const foundThemeWeight = competencyThemes.filter((t) => t.found).reduce((s, t) => s + t.weight, 0);
  const themeScore = totalThemeWeight > 0 ? Math.round((foundThemeWeight / totalThemeWeight) * 100) : 50;

  // Keyword score — only meaningful for tech roles
  const totalKwWeight = keywordMatches.reduce((s, m) => s + m.weight, 0);
  const foundKwWeight = keywordMatches.filter((m) => m.found).reduce((s, m) => s + m.weight, 0);
  const keywordScore = totalKwWeight > 0 ? Math.round((foundKwWeight / totalKwWeight) * 100) : themeScore;

  // Hard requirement penalty
  const missingCritical = hardRequirements.filter((r) => r.critical && !r.found).length;
  const hardReqPenalty = missingCritical * 15; // -15 per missing critical requirement

  const languageScore = languageMatch ? 100 : 15;
  const formattingScore = cleanDoc ? calculateFormattingScore(cleanDoc) : 70;

  // STEP 9: AI-enhanced analysis
  let experienceGaps: ExperienceGap[] = [];
  let aiSummary = '';
  let additionalKeywords: string[] = [];

  if (cleanDoc) {
    const aiResult = await aiEnhancedAnalysis(roleType, requirements, competencyThemes, cleanDoc);
    if (aiResult) {
      experienceGaps = aiResult.experienceGaps;
      aiSummary = aiResult.summary;
      additionalKeywords = aiResult.additionalKeywords;
    }
  }

  const experienceScore =
    experienceGaps.length > 0
      ? Math.round(experienceGaps.reduce((s, g) => s + g.passLikelihood, 0) / experienceGaps.length)
      : themeScore;

  // STEP 10: Overall score — role-adaptive weighting
  let overallScore: number;
  if (roleType === 'tech') {
    // Tech: keyword-heavy
    overallScore = Math.round(
      keywordScore * 0.40 +
      experienceScore * 0.25 +
      languageScore * 0.20 +
      formattingScore * 0.15
    );
  } else {
    // Non-tech: theme-heavy
    overallScore = Math.round(
      themeScore * 0.40 +
      experienceScore * 0.25 +
      languageScore * 0.20 +
      formattingScore * 0.15
    );
  }

  // Apply hard requirement penalty
  overallScore = Math.max(0, overallScore - hardReqPenalty);

  // STEP 11: Recommendations
  const recommendations = generateRecommendations(
    roleType,
    keywordMatches,
    competencyThemes,
    hardRequirements,
    experienceGaps,
    languageMatch,
    formattingScore,
    additionalKeywords,
  );

  // STEP 12: Pass likelihood
  const passLikelihood: ATSScoreResult['passLikelihood'] =
    overallScore >= 80 ? 'very_high' :
    overallScore >= 65 ? 'high' :
    overallScore >= 50 ? 'medium' :
    overallScore >= 35 ? 'low' : 'very_low';

  // STEP 13: Summary
  const matchedThemeCount = competencyThemes.filter((t) => t.found).length;
  const matchedCount = keywordMatches.filter((m) => m.found).length;
  const summary =
    aiSummary ||
    (roleType === 'tech'
      ? `Löydettiin ${matchedCount}/${keywordMatches.length} avainsanaa. ` +
        `${!languageMatch ? 'Kieliristiriita havaittu. ' : ''}` +
        `ATS-läpimenon todennäköisyys: ${passLikelihood.replace('_', ' ')}.`
      : `${roleType.charAt(0).toUpperCase() + roleType.slice(1)}-rooli: ` +
        `${matchedThemeCount}/${competencyThemes.length} osaamisteemat löydetty. ` +
        `${!languageMatch ? 'Kieliristiriita havaittu. ' : ''}` +
        `Läpimenon todennäköisyys: ${passLikelihood.replace('_', ' ')}.`);

  return {
    overallScore,
    keywordScore,
    experienceScore,
    languageScore,
    formattingScore,
    roleType,
    hardRequirements,
    competencyThemes,
    themeScore,
    keywordMatches,
    experienceGaps,
    detectedLanguage: { jobPosting: jobLang, userDocument: docLang, match: languageMatch },
    recommendations,
    jobTitle: requirements.jobTitle,
    requiredSkillsCount: requirements.requiredSkills.length + competencyThemes.length,
    matchedSkillsCount: matchedCount + matchedThemeCount,
    passLikelihood,
    summary,
  };
}
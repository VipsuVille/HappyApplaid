// lib/langchain/responseHelper.ts

export interface PreviousResponse {
  id: string;
  question_text: string;
  answer: string;
  question_category: string;   // 'skills' | 'experience' | 'education' | 'personality' | 'achievements' | jne.
  asked_in_context: string;    // 'cv_generation' | 'cover_letter_v1' | jne.
  created_at: string;
}

export interface AnswerEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
}

// ─────────────────────────────────────────────────────────────────
// HAKU
// ─────────────────────────────────────────────────────────────────

/**
 * Hakee käyttäjän aiemmat vastaukset tietokannasta.
 * Kutsutaan sekä kysymysanalyysissä että generointivaiheessa.
 *
 * @param category   - 'cv' tai 'cover_letter'
 * @param context    - valinnainen tarkennus, esim. 'cv_generation'
 * @param limit      - max rivimäärä (default 200)
 */
export async function fetchPreviousResponses(
  category: string,
  context?: string,
  limit = 200
): Promise<PreviousResponse[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const params = new URLSearchParams({ category, limit: String(limit) });
    if (context) params.set('context', context);

    const response = await fetch(`${baseUrl}/api/user-responses?${params}`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.warn(`⚠️ fetchPreviousResponses: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    const responses: PreviousResponse[] = data.responses ?? [];

    console.log(
      `📚 fetchPreviousResponses: ${responses.length} vastausta ` +
      `(category=${category}, context=${context ?? 'kaikki'})`
    );

    return responses;
  } catch (error) {
    console.error('❌ fetchPreviousResponses failed:', error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// MUUNNOS
// ─────────────────────────────────────────────────────────────────

/**
 * Muuntaa tietokantarivit yhtenäiseen AnswerEntry-muotoon.
 */
export function convertToAnswerFormat(responses: PreviousResponse[]): AnswerEntry[] {
  return responses.map((r) => ({
    id: r.id,
    question: r.question_text,
    answer: r.answer,
    category: r.question_category,
  }));
}

// ─────────────────────────────────────────────────────────────────
// YHDISTÄMINEN
// Käyttää question_category-kenttää, ei tekstianalyysiä.
// Toimii kaikilla kielillä ja kaikilla aloilla.
// ─────────────────────────────────────────────────────────────────

/**
 * Ryhmittelee vastaukset question_category-kentän perusteella.
 * Kategorian nimeä ei verrata kielispesifisiin avainsanoihin —
 * riittää että se SISÄLTÄÄ tunnistettavan osan (experience, skill, jne.).
 * Tuntemattomat kategoriat menevät 'other'-buckettiin josta AI voi
 * itse päättää miten hyödyntää ne.
 */
function bucketByCategory(answers: AnswerEntry[]): Record<string, string[]> {
  const buckets: Record<string, string[]> = {
    experience:   [],
    education:    [],
    skills:       [],
    personality:  [],
    achievements: [],
    other:        [],
  };

  answers.forEach(({ answer, category }) => {
    if (!answer?.trim()) return;

    const cat = (category ?? 'other').toLowerCase();

    if (cat.includes('experience') || cat.includes('work')) {
      buckets.experience.push(answer.trim());
    } else if (cat.includes('education')) {
      buckets.education.push(answer.trim());
    } else if (cat.includes('skill')) {
      buckets.skills.push(answer.trim());
    } else if (
      cat.includes('personality') ||
      cat.includes('working_style') ||
      cat.includes('strength')
    ) {
      buckets.personality.push(answer.trim());
    } else if (cat.includes('achievement') || cat.includes('project')) {
      buckets.achievements.push(answer.trim());
    } else {
      // Kaikki muut (esim. harrastukset, tavoitteet, motivaatio, jne.)
      // menevät other-buckettiin — AI saa ne käyttöön additionalContext-kentän kautta
      buckets.other.push(answer.trim());
    }
  });

  return buckets;
}

/** Liittää extra-tekstin kentän perään, tai asettaa sen jos kenttä on tyhjä. */
function append(existing: string | undefined, extra: string): string {
  return existing ? `${existing}\n${extra}` : extra;
}

/**
 * Yhdistää aiemmat vastaukset CV-profiiliin.
 * Kieliagnostinen: ei sisällä yhtään suomen/englannin/muun kielen avainsanaa.
 */
export function mergeResponsesIntoProfile(
  profile: Record<string, any>,
  answers: AnswerEntry[]
): Record<string, any> {
  const enhanced = { ...profile };
  const buckets = bucketByCategory(answers);

  if (buckets.experience.length > 0) {
    enhanced.workExperience = append(
      enhanced.workExperience,
      buckets.experience.join('\n')
    );
  }

  if (buckets.education.length > 0) {
    enhanced.education = append(
      enhanced.education,
      buckets.education.join('\n')
    );
  }

  if (buckets.skills.length > 0) {
    enhanced.skills = append(
      enhanced.skills,
      buckets.skills.join('\n')
    );
  }

  if (buckets.personality.length > 0) {
    enhanced.uniqueStrength = append(
      enhanced.uniqueStrength,
      buckets.personality.join('\n')
    );
  }

  if (buckets.achievements.length > 0) {
    enhanced.bestProjectExample = append(
      enhanced.bestProjectExample,
      buckets.achievements.join('\n')
    );
  }

  if (buckets.other.length > 0) {
    // additionalContext ei ole varsinainen profiilikenttä,
    // mutta se välitetään AI-promptiin jotta mitään ei katoa
    enhanced.additionalContext = append(
      enhanced.additionalContext,
      buckets.other.join('\n')
    );
  }

  return enhanced;
}

/**
 * Sama logiikka hakukirjeille.
 * Kenttänimet voivat erota CV:n kentistä, mutta kategorialogiikka on identtinen.
 */
export function mergeResponsesIntoLetterContext(
  context: Record<string, any>,
  answers: AnswerEntry[]
): Record<string, any> {
  const enhanced = { ...context };
  const buckets = bucketByCategory(answers);

  if (buckets.experience.length > 0) {
    enhanced.workExperience = append(
      enhanced.workExperience,
      buckets.experience.join('\n')
    );
  }

  if (buckets.education.length > 0) {
    enhanced.education = append(
      enhanced.education,
      buckets.education.join('\n')
    );
  }

  if (buckets.skills.length > 0) {
    enhanced.skills = append(
      enhanced.skills,
      buckets.skills.join('\n')
    );
  }

  if (buckets.personality.length > 0) {
    enhanced.keyStrengths = append(
      enhanced.keyStrengths,
      buckets.personality.join('\n')
    );
  }

  if (buckets.achievements.length > 0) {
    enhanced.relevantExperience = append(
      enhanced.relevantExperience,
      buckets.achievements.join('\n')
    );
  }

  if (buckets.other.length > 0) {
    enhanced.additionalContext = append(
      enhanced.additionalContext,
      buckets.other.join('\n')
    );
  }

  return enhanced;
}
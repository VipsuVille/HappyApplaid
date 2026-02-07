// lib/profileValidation.ts
// ✅ Tarkka profiilin validointi informatiivisilla viesteillä

export interface ValidationIssue {
  field: string;
  displayName: string;
  required: boolean;
  currentValue?: any;
  isEmpty: boolean;
  minLength?: number;
  currentLength?: number;
}

export interface ProfileValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  requiredMissing: ValidationIssue[];
  optionalMissing: ValidationIssue[];
  totalRequired: number;
  totalOptional: number;
  completionPercentage: number;
}

export interface ProfileData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  job_title?: string;
  education?: any;
  work_experience?: any;
  skills?: any;
  languages?: any;
  working_style?: string;
  problem_solving?: string;
  energy_sources?: string;
  unique_strength?: string;
  learning_style?: string;
  team_role?: string;
  values_example?: string;
  superpower?: string;
  career_goals?: string;
  best_project_example?: string;
  failure_lesson?: string;
}

// ✅ KENTÄT KATEGORIOITTAIN
const FIELD_CATEGORIES = {
  basic: {
    name: 'Perustiedot',
    fields: [
      { key: 'name', name: 'Nimi', required: true, minLength: undefined, minItems: undefined },
      { key: 'email', name: 'Sähköposti', required: true, minLength: undefined, minItems: undefined },
      { key: 'phone', name: 'Puhelinnumero', required: false, minLength: undefined, minItems: undefined },
      { key: 'location', name: 'Sijainti', required: false, minLength: undefined, minItems: undefined },
    ]
  },
  professional: {
    name: 'Ammatillinen tausta',
    fields: [
      { key: 'job_title', name: 'Työnimike', required: false, minLength: undefined, minItems: undefined },
      { key: 'work_experience', name: 'Työkokemus', required: true, minLength: undefined, minItems: 1 },
      { key: 'education', name: 'Koulutus', required: true, minLength: undefined, minItems: 1 },
      { key: 'skills', name: 'Taidot', required: true, minLength: undefined, minItems: 1 },
      { key: 'languages', name: 'Kielet', required: false, minLength: undefined, minItems: undefined },
    ]
  },
  personality: {
    name: 'Persoonallisuus',
    fields: [
      { key: 'working_style', name: 'Työskentelytyyli', required: true, minLength: 50, minItems: undefined },
      { key: 'problem_solving', name: 'Ongelmanratkaisu', required: true, minLength: 80, minItems: undefined },
      { key: 'unique_strength', name: 'Ainutlaatuinen vahvuus', required: true, minLength: 60, minItems: undefined },
    ]
  },
  optional: {
    name: 'Vapaavalintaiset',
    fields: [
      { key: 'energy_sources', name: 'Energian lähteet', required: false, minLength: undefined, minItems: undefined },
      { key: 'learning_style', name: 'Oppimistyyli', required: false, minLength: undefined, minItems: undefined },
      { key: 'team_role', name: 'Rooli tiimissä', required: false, minLength: undefined, minItems: undefined },
      { key: 'values_example', name: 'Arvojen esimerkki', required: false, minLength: undefined, minItems: undefined },
      { key: 'superpower', name: 'Supervoima', required: false, minLength: undefined, minItems: undefined },
      { key: 'career_goals', name: 'Uratavoitteet', required: false, minLength: undefined, minItems: undefined },
      { key: 'best_project_example', name: 'Paras projekti', required: false, minLength: undefined, minItems: undefined },
      { key: 'failure_lesson', name: 'Opetus epäonnistumisesta', required: false, minLength: undefined, minItems: undefined },
    ]
  }
};

/**
 * ✅ Tarkistaa onko arvo tyhjä (kaikki tyypit)
 */
function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * ✅ Laskee arrayn tai stringin pituuden
 */
function getLength(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') return value.trim().length;
  if (Array.isArray(value)) return value.length;
  return 0;
}

/**
 * ✅ PÄÄFUNKTIO: Validoi profiili ja anna tarkat tiedot puuttuvista
 */
export function validateProfile(profileData: ProfileData | null): ProfileValidationResult {
  const issues: ValidationIssue[] = [];
  
  if (!profileData) {
    return {
      isValid: false,
      issues: [],
      requiredMissing: [],
      optionalMissing: [],
      totalRequired: 0,
      totalOptional: 0,
      completionPercentage: 0
    };
  }

  // ✅ Käy läpi kaikki kategoriat
  Object.values(FIELD_CATEGORIES).forEach(category => {
    category.fields.forEach(field => {
      const value = (profileData as any)[field.key];
      const isFieldEmpty = isEmpty(value);
      const currentLength = getLength(value);
      
      // Tarkista minLength (tekstikentät)
      const failsMinLength = field.minLength && currentLength < field.minLength;
      
      // Tarkista minItems (arrayt)
      const failsMinItems = field.minItems && currentLength < field.minItems;
      
      const hasIssue = isFieldEmpty || failsMinLength || failsMinItems;
      
      if (hasIssue || !isFieldEmpty) {
        issues.push({
          field: field.key,
          displayName: field.name,
          required: field.required || false,
          currentValue: value,
          isEmpty: isFieldEmpty,
          minLength: field.minLength,
          currentLength: currentLength
        });
      }
    });
  });

  // ✅ Jaa puuttuvat pakollisiin ja vapaaehtoisiin
  const requiredMissing = issues.filter(i => i.required && (i.isEmpty || (i.minLength && i.currentLength! < i.minLength)));
  const optionalMissing = issues.filter(i => !i.required && i.isEmpty);
  
  // ✅ Laske täyttöprosentti
  const totalFields = issues.length;
  const filledFields = issues.filter(i => !i.isEmpty && (!i.minLength || i.currentLength! >= i.minLength)).length;
  const completionPercentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  return {
    isValid: requiredMissing.length === 0,
    issues,
    requiredMissing,
    optionalMissing,
    totalRequired: issues.filter(i => i.required).length,
    totalOptional: issues.filter(i => !i.required).length,
    completionPercentage
  };
}

/**
 * ✅ Muotoile validointitulos käyttäjälle näytettäväksi tekstiksi
 */
export function formatValidationMessage(result: ProfileValidationResult, language: 'fi' | 'en' = 'fi'): {
  title: string;
  description: string;
  missingFields: string[];
} {
  const { requiredMissing } = result;
  
  if (result.isValid) {
    return {
      title: language === 'fi' ? '✅ Profiili kunnossa!' : '✅ Profile complete!',
      description: language === 'fi' 
        ? 'Kaikki pakolliset kentät on täytetty.' 
        : 'All required fields are filled.',
      missingFields: []
    };
  }

  const count = requiredMissing.length;
  const missingFields = requiredMissing.map(issue => {
    if (issue.minLength && issue.currentLength! < issue.minLength) {
      return language === 'fi'
        ? `${issue.displayName} (kirjoita vähintään ${issue.minLength} merkkiä, nyt ${issue.currentLength})`
        : `${issue.displayName} (min ${issue.minLength} chars, currently ${issue.currentLength})`;
    }
    return issue.displayName;
  });

  const title = language === 'fi'
    ? `Täytä profiili generoinnin mahdollistamiseksi`
    : `Complete profile to enable generation`;

  const description = language === 'fi'
    ? count <= 5
      ? `Täytä seuraavat ${count} pakollista kenttää:`
      : `Täytä ensin ${count} pakollista kenttää. Katso lista kohdista alta.`
    : count <= 5
      ? `Fill these ${count} required fields:`
      : `Fill ${count} required fields first. See list below.`;

  return {
    title,
    description,
    missingFields
  };
}

/**
 * ✅ Generoi kategorisoitu lista puuttuvista kentistä
 */
export function getGroupedMissingFields(result: ProfileValidationResult): {
  category: string;
  fields: ValidationIssue[];
}[] {
  const grouped: { category: string; fields: ValidationIssue[] }[] = [];

  Object.entries(FIELD_CATEGORIES).forEach(([key, category]) => {
    const categoryFields = category.fields.map(f => f.key);
    const missingInCategory = result.requiredMissing.filter(issue => 
      categoryFields.includes(issue.field)
    );

    if (missingInCategory.length > 0) {
      grouped.push({
        category: category.name,
        fields: missingInCategory
      });
    }
  });

  return grouped;
}
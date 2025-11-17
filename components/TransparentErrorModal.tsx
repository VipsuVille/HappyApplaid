// components/TransparentErrorModal.tsx - SELKEÄT VIRHEILMOITUKSET
'use client';

import { XCircle, AlertTriangle, Info, Shield, HelpCircle } from 'lucide-react';

export interface ErrorExplanation {
  type: 'forbidden_keyword' | 'guardian_rejected' | 'cannot_insert' | 'language_mismatch';
  title: string;
  message: string;
  violations?: {
    factual?: string[];
    personality?: string[];
    skills?: string[];
  };
  whyThisHappened: string;
  howToFix: string[];
  canRetry: boolean;
}

interface Props {
  error: ErrorExplanation | null;
  onClose: () => void;
  onRetry?: () => void;
}

export default function TransparentErrorModal({ error, onClose, onRetry }: Props) {
  if (!error) return null;

  const getIcon = () => {
    switch (error.type) {
      case 'forbidden_keyword':
        return <XCircle className="w-8 h-8 text-red-600" />;
      case 'guardian_rejected':
        return <Shield className="w-8 h-8 text-red-600" />;
      case 'cannot_insert':
        return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
      case 'language_mismatch':
        return <Info className="w-8 h-8 text-blue-600" />;
      default:
        return <HelpCircle className="w-8 h-8 text-gray-600" />;
    }
  };

  const getBgColor = () => {
    switch (error.type) {
      case 'forbidden_keyword':
      case 'guardian_rejected':
        return 'bg-red-50 border-red-200';
      case 'cannot_insert':
        return 'bg-yellow-50 border-yellow-200';
      case 'language_mismatch':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 border-b ${getBgColor()}`}>
          <div className="flex items-start gap-4">
            {getIcon()}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {error.title}
              </h2>
              <p className="text-gray-700">{error.message}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 flex-shrink-0"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Violations (jos on) */}
        {error.violations && Object.values(error.violations).some(v => v && v.length > 0) && (
          <div className="p-6 border-b bg-red-50">
            <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Havaitut ongelmat:
            </h3>
            
            {error.violations.factual && error.violations.factual.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-semibold text-red-800 mb-1">
                  📊 Faktavirheet:
                </p>
                <ul className="text-sm text-red-700 space-y-1 ml-4">
                  {error.violations.factual.map((v, i) => (
                    <li key={i} className="list-disc">• {v}</li>
                  ))}
                </ul>
              </div>
            )}

            {error.violations.personality && error.violations.personality.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-semibold text-red-800 mb-1">
                  🧠 Persoonallisuusristiriidat:
                </p>
                <ul className="text-sm text-red-700 space-y-1 ml-4">
                  {error.violations.personality.map((v, i) => (
                    <li key={i} className="list-disc">• {v}</li>
                  ))}
                </ul>
              </div>
            )}

            {error.violations.skills && error.violations.skills.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-semibold text-red-800 mb-1">
                  🛠️ Taitojen ristiriidat:
                </p>
                <ul className="text-sm text-red-700 space-y-1 ml-4">
                  {error.violations.skills.map((v, i) => (
                    <li key={i} className="list-disc">• {v}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Miksi tämä tapahtui */}
        <div className="p-6 border-b bg-blue-50">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Miksi tämä tapahtui?
          </h3>
          <p className="text-sm text-blue-800 leading-relaxed">
            {error.whyThisHappened}
          </p>
        </div>

        {/* Miten korjata */}
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Miten voin korjata tämän?
          </h3>
          <ol className="space-y-3">
            {error.howToFix.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Sulje
          </button>
          {error.canRetry && onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Yritä uudelleen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ✅ HELPER: Muunna API-virhe käyttäjäystävälliseksi
 */
export function parseAPIError(errorResponse: any): ErrorExplanation {
  // FORBIDDEN KEYWORD
  if (errorResponse.error === 'FORBIDDEN_KEYWORD') {
    return {
      type: 'forbidden_keyword',
      title: '🚫 Kielletty avainsana',
      message: errorResponse.message,
      whyThisHappened: `Yrität lisätä avainsanan joka vaatii osaamista, jota ei ole profiilissasi. Järjestelmämme estää epätodenmukaisten taitojen lisäämisen hakukirjeeseesi, jotta hakemuksesi pysyy rehellisen ja uskottavana.`,
      howToFix: [
        'Mene profiilisivulle ja lisää tämä taito sinne ensin',
        'TAI valitse toinen avainsana joka vastaa todellista osaamistasi',
        'TAI lisää avainsana manuaalisesti (omalla vastuullasi)'
      ],
      canRetry: false
    };
  }

  // GUARDIAN REJECTED
  if (errorResponse.error === 'GUARDIAN_REJECTED') {
    return {
      type: 'guardian_rejected',
      title: '🛡️ Turvatarkistus epäonnistui',
      message: 'AI yritti muuttaa hakukirjettäsi tavalla joka ei vastaa profiiliasi.',
      violations: errorResponse.violations,
      whyThisHappened: `Järjestelmämme "Master Guardian" -komponentti tarkistaa jokaisen muutoksen varmistaakseen, ettei AI keksi kokemusta, taitoja tai pätevyyksiä joita sinulla ei ole. Tämä muutos hylättiin koska se sisälsi epätodellisia väittämiä.`,
      howToFix: errorResponse.fixSuggestions || [
        'Lisää avainsana manuaalisesti itse',
        'Valitse toinen, turvallisempi avainsana',
        'Päivitä profiilisi sisältämään tarvittava osaaminen'
      ],
      canRetry: false
    };
  }

  // CANNOT INSERT
  if (errorResponse.error === 'CANNOT_INSERT_NATURALLY') {
    return {
      type: 'cannot_insert',
      title: '⚠️ Ei voitu lisätä luonnollisesti',
      message: errorResponse.message,
      whyThisHappened: `AI ei löytänyt sopivaa kohtaa lisätäkseen avainsanan ilman että se muuttaisi hakukirjeesi rakennetta tai faktoja. Tämä on hyvä asia - se tarkoittaa että järjestelmä kieltäytyi tekemästä epäluonnollista muutosta.`,
      howToFix: [
        'Lisää avainsana manuaalisesti klikkaamalla hakukirjettä ja kirjoittamalla',
        'Valitse toinen avainsana joka sopii paremmin hakukirjeen kontekstiin',
        'Kirjoita hakukirjettä uudelleen sisältääksesi tämän avainsanan alusta asti'
      ],
      canRetry: true
    };
  }

  // LANGUAGE MISMATCH
  if (errorResponse.error === 'LANGUAGE_MISMATCH') {
    return {
      type: 'language_mismatch',
      title: '🌍 Kielten epäsuhta havaittu',
      message: 'Työpaikkailmoitus ja hakukirjeesi ovat eri kielillä.',
      whyThisHappened: `ATS-järjestelmät eivät käännä tekstiä - ne etsivät täsmällisiä avainsanoja. Jos työpaikkailmoitus on englanniksi mutta hakukirjeesi suomeksi, robotti EI löydä avainsanoja ja hakemuksesi hylätään automaattisesti.`,
      howToFix: [
        'Kirjoita hakukirje uudelleen työpaikkailmoituksen kielellä',
        'TAI käännä työpaikkailmoitus hakukirjeen kielelle (jos sallittua)',
        'Varmista että käytät TÄSMÄLLEEN samoja sanoja kuin ilmoituksessa'
      ],
      canRetry: false
    };
  }

  // DEFAULT
  return {
    type: 'cannot_insert',
    title: '❌ Virhe tapahtui',
    message: errorResponse.message || 'Tuntematon virhe',
    whyThisHappened: 'Järjestelmässä tapahtui odottamaton virhe.',
    howToFix: [
      'Yritä uudelleen',
      'Jos ongelma toistuu, ota yhteyttä tukeen',
      'Kokeile manuaalista lisäystä'
    ],
    canRetry: true
  };
}
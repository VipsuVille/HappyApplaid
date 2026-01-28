// app/create-cover-letter/page.tsx - COMPLETE WITH ATS WARNING

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  Sparkles,
  FileText,
  User,
  Briefcase,
  Loader2,
  AlertCircle,
  Globe,
  AlertTriangle,
  ChevronRight,
  Zap,
} from 'lucide-react';

// ===================================
// ATS LANGUAGE WARNING COMPONENT
// ===================================

interface LanguageWarningProps {
  jobPosting: string;
  selectedLanguage: 'finnish' | 'english';
  generationMethod: 'ats-v1' | 'ats-v2' | 'traditional';
}

function ATSLanguageWarning({ 
  jobPosting, 
  selectedLanguage, 
  generationMethod 
}: LanguageWarningProps) {
  const [warning, setWarning] = useState<{
    detected: string;
    selected: string;
    severity: 'critical' | 'warning' | 'info';
  } | null>(null);

  useEffect(() => {
    if (!generationMethod.startsWith('ats') || !jobPosting || jobPosting.length < 50) {
      setWarning(null);
      return;
    }

    const detectLanguage = (text: string): string => {
      const lowerText = text.toLowerCase();
      
      const finnishWords = ['ja', 'on', 'että', 'ovat', 'joka', 'sekä', 'kuin', 'kanssa', 'mukaan', 'työhön', 'tehtävät', 'osaaminen', 'kokemusta'];
      const finnishMatches = finnishWords.filter(word => 
        lowerText.includes(` ${word} `) || lowerText.startsWith(`${word} `)
      ).length;
      
      const englishWords = ['and', 'the', 'that', 'with', 'for', 'are', 'you', 'will', 'have', 'our', 'work', 'experience', 'skills', 'responsibilities'];
      const englishMatches = englishWords.filter(word => 
        lowerText.includes(` ${word} `) || lowerText.startsWith(`${word} `)
      ).length;
      
      if (finnishMatches > englishMatches * 1.5) return 'finnish';
      if (englishMatches > finnishMatches * 1.5) return 'english';
      return 'unknown';
    };

    const detectedLang = detectLanguage(jobPosting);
    
    if (detectedLang === 'unknown') {
      setWarning(null);
      return;
    }

    const langMap: Record<string, string> = {
      'finnish': 'suomi',
      'english': 'englanti'
    };

    const detectedDisplay = langMap[detectedLang];
    const selectedDisplay = langMap[selectedLanguage];

    if (detectedLang !== selectedLanguage) {
      setWarning({
        detected: detectedDisplay,
        selected: selectedDisplay,
        severity: 'critical'
      });
    } else {
      setWarning(null);
    }
  }, [jobPosting, selectedLanguage, generationMethod]);

  if (!warning) return null;

  return (
    <div className="mb-6 p-5 bg-red-500/10 border-2 border-red-500/30 rounded-2xl animate-pulse">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-7 h-7 text-red-400 shrink-0 mt-0.5 animate-bounce" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="font-bold text-red-200 text-lg md:text-xl">
              ⚠️ KRIITTINEN VAROITUS: Kielten epäsuhta!
            </p>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 bg-red-500/10 p-4 rounded-xl">
              <Globe className="w-6 h-6 text-red-300 shrink-0" />
              <div className="flex-1">
                <p className="text-red-200 font-semibold mb-1">
                  📋 Työpaikkailmoitus on: <span className="text-red-100 text-base md:text-lg font-bold uppercase">{warning.detected}</span>
                </p>
                <p className="text-red-200 font-semibold">
                  ✉️ Olet valitsemassa: <span className="text-red-100 text-base md:text-lg font-bold uppercase">{warning.selected}</span>-kielistä hakukirjettä
                </p>
              </div>
            </div>

            <div className="bg-red-950/40 p-4 rounded-xl border border-red-500/20">
              <p className="text-red-200 font-bold mb-3 flex items-center gap-2 text-base">
                <AlertCircle className="w-5 h-5" />
                Miksi tämä on kriittinen ongelma?
              </p>
              <ul className="space-y-2 text-red-100/90 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold text-lg">❌</span>
                  <span><strong>ATS-järjestelmä EI KOSKAAN käännä tekstiä</strong> - se etsii vain tarkkoja avainsanoja ilmoituksesta</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold text-lg">❌</span>
                  <span>Jos työpaikka on <strong>{warning.detected}-kielellä</strong> mutta kirjoitat hakemuksen <strong>{warning.selected}-kielellä</strong>, ATS <strong>ei löydä yhtään avainsanaa</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold text-lg">❌</span>
                  <span><strong className="text-red-200">Hakemuksesi hylätään 100% todennäköisyydellä automaattisesti</strong> ennen kuin kukaan ihminen näkee sen</span>
                </li>
              </ul>
            </div>

            <div className="bg-green-950/40 p-4 rounded-xl border border-green-500/20">
              <p className="text-green-200 font-bold mb-2 flex items-center gap-2 text-base">
                <span className="text-2xl">💡</span>
                PAKOLLINEN toimenpide:
              </p>
              <p className="text-green-100 text-sm md:text-base">
                <strong className="text-green-200">Vaihda hakukirjeen kieleksi {warning.detected}</strong> (sama kieli kuin työpaikkailmoituksessa).
              </p>
              <p className="text-green-100/80 text-xs mt-2">
                TAI jos haluat hakea {warning.selected}-kielisellä hakemuksella, etsi työpaikkailmoitus joka on {warning.selected}-kielellä.
              </p>
            </div>

            <div className="bg-orange-950/40 p-3 rounded-xl border border-orange-500/20">
              <p className="text-orange-200 text-xs leading-relaxed">
                <strong>Huom:</strong> Vaikka osaisit molempia kieliä täydellisesti, ATS-järjestelmä ei ymmärrä tätä. 
                Se on robotti joka etsii vain tarkkoja sanoja ilmoituksesta - ei mitään muuta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================================
// LANGUAGE SELECTOR
// ===================================

interface LanguageSelectorProps {
  selectedLanguage: 'finnish' | 'english';
  onLanguageChange: (lang: 'finnish' | 'english') => void;
  generationMethod: 'ats-v1' | 'ats-v2' | 'traditional';
}

function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  generationMethod
}: LanguageSelectorProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-gray-900/60 to-black/60 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 backdrop-blur-md p-2.5 rounded-xl border border-primary/30">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-gray-100">Hakukirjeen kieli</h3>
            <p className="text-xs text-gray-400">Valitse sama kieli kuin työpaikkailmoituksessa</p>
          </div>
        </div>

        {generationMethod.startsWith('ats') && (
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="text-xs md:text-sm text-primary hover:text-primary/80 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">{showInfo ? 'Piilota ohje' : 'Miksi tärkeää?'}</span>
          </button>
        )}
      </div>

      {showInfo && generationMethod.startsWith('ats') && (
        <div className="mb-5 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-sm md:text-base text-blue-200 mb-2 font-semibold">
            ℹ️ ATS-järjestelmät eivät käännä tekstiä
          </p>
          <p className="text-xs md:text-sm text-blue-100/90 leading-relaxed">
            Jos työpaikkailmoitus on <strong>englanniksi</strong>, hakukirjeen <strong>PITÄÄ olla englanniksi</strong>. 
            Jos ilmoitus on <strong>suomeksi</strong>, hakukirjeen <strong>PITÄÄ olla suomeksi</strong>. 
            Muuten ATS ei löydä avainsanoja ja hakemuksesi hylätään automaattisesti.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <button
          onClick={() => onLanguageChange('finnish')}
          className={`p-4 md:p-5 rounded-xl border-2 transition-all ${
            selectedLanguage === 'finnish'
              ? 'border-primary bg-primary/20 text-primary shadow-lg scale-105'
              : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10'
          }`}
        >
          <div className="text-3xl md:text-4xl mb-2">🇫🇮</div>
          <p className="font-bold text-base md:text-lg">Suomi</p>
          <p className="text-xs opacity-70">Finnish</p>
        </button>

        <button
          onClick={() => onLanguageChange('english')}
          className={`p-4 md:p-5 rounded-xl border-2 transition-all ${
            selectedLanguage === 'english'
              ? 'border-primary bg-primary/20 text-primary shadow-lg scale-105'
              : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10'
          }`}
        >
          <div className="text-3xl md:text-4xl mb-2">🇬🇧</div>
          <p className="font-bold text-base md:text-lg">Englanti</p>
          <p className="text-xs opacity-70">English</p>
        </button>
      </div>
    </div>
  );
}

// ===================================
// MAIN COMPONENT
// ===================================

export default function CreateCoverLetterPage() {
  const router = useRouter();
  const { userId, getToken } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    jobPosting: '',
    language: 'finnish' as 'finnish' | 'english',
    style: 'professional' as 'professional' | 'casual' | 'creative',
  });

  const [selectedMethod, setSelectedMethod] = useState<'ats-v1' | 'ats-v2' | 'traditional'>('ats-v2');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      setError('Sinun täytyy olla kirjautunut sisään');
      return;
    }

    if (!formData.jobPosting.trim()) {
      setError('Työpaikkailmoitus on pakollinen');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          userId,
          method: selectedMethod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate cover letter');
      }

      const data = await response.json();
      
      // Navigate to the new cover letter
      if (data.id) {
        router.push(`/edit-cover-letter/${data.id}`);
      } else {
        throw new Error('No cover letter ID returned');
      }
    } catch (err) {
      console.error('Error generating cover letter:', err);
      setError(err instanceof Error ? err.message : 'Jokin meni pieleen');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 relative z-10">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent mb-3">
            Luo hakukirje
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Täytä tiedot ja generoi ATS-optimoitu hakukirje
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Personal Info */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-gray-900/60 to-black/60 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-orange-500/20 backdrop-blur-md p-2.5 rounded-xl border border-orange-400/30">
                <User className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-100">Omat tiedot</h3>
                <p className="text-xs text-gray-400">Nämä näkyvät hakukirjeessä</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Nimi *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-400/50 transition-colors"
                  placeholder="Matti Meikäläinen"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Sähköposti *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-400/50 transition-colors"
                  placeholder="matti@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Puhelin</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-400/50 transition-colors"
                  placeholder="+358 40 123 4567"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Paikkakunta</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-400/50 transition-colors"
                  placeholder="Helsinki"
                />
              </div>
            </div>
          </div>

          {/* Job Posting */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-gray-900/60 to-black/60 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-amber-500/20 backdrop-blur-md p-2.5 rounded-xl border border-amber-400/30">
                <Briefcase className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-bold text-gray-100">Työpaikkailmoitus</h3>
                <p className="text-xs text-gray-400">Liitä koko työpaikkailmoitus tähän</p>
              </div>
            </div>

            <textarea
              required
              value={formData.jobPosting}
              onChange={(e) => setFormData({ ...formData, jobPosting: e.target.value })}
              rows={10}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400/50 transition-colors resize-none"
              placeholder="Liitä tähän koko työpaikkailmoitus... ATS-järjestelmä etsii avainsanoja tästä tekstistä."
            />
          </div>

          {/* Language Selection */}
          <LanguageSelector
            selectedLanguage={formData.language}
            onLanguageChange={(lang) => setFormData({ ...formData, language: lang })}
            generationMethod={selectedMethod}
          />

          {/* ATS Language Warning */}
          <ATSLanguageWarning
            jobPosting={formData.jobPosting}
            selectedLanguage={formData.language}
            generationMethod={selectedMethod}
          />

          {/* Generation Method */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-gray-900/60 to-black/60 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-purple-500/20 backdrop-blur-md p-2.5 rounded-xl border border-purple-400/30">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-100">Generointimenetelmä</h3>
                <p className="text-xs text-gray-400">Valitse ATS-optimointi</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setSelectedMethod('ats-v2')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedMethod === 'ats-v2'
                    ? 'border-primary bg-primary/20 text-primary shadow-lg'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-bold text-sm">ATS V2</span>
                </div>
                <p className="text-xs opacity-80">Paras ATS-optimointi</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('ats-v1')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedMethod === 'ats-v1'
                    ? 'border-primary bg-primary/20 text-primary shadow-lg'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5" />
                  <span className="font-bold text-sm">ATS V1</span>
                </div>
                <p className="text-xs opacity-80">Perus ATS-optimointi</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('traditional')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedMethod === 'traditional'
                    ? 'border-primary bg-primary/20 text-primary shadow-lg'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5" />
                  <span className="font-bold text-sm">Perinteinen</span>
                </div>
                <p className="text-xs opacity-80">Ei ATS-optimointia</p>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 text-lg shadow-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Generoidaan hakukirjettä...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                <span>Luo hakukirje</span>
                <ChevronRight className="w-6 h-6" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
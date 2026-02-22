// components/SmartSuggestions.tsx

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, FileText, Shield, Crown } from 'lucide-react';

interface SmartSuggestionsProps {
  hasDocuments: boolean;
  hasRunATS: boolean;
  atsScore?: number | null;
  hasHighGap?: boolean;
  isFreeTierLimited: boolean;
  language: string;
  isDark?: boolean; // ✅ LISÄÄ TÄMÄ
}

export function SmartSuggestions({
  hasDocuments,
  hasRunATS,
  atsScore,
  hasHighGap,
  isFreeTierLimited,
  language,
  isDark = false, // ✅ DEFAULT FALSE
}: SmartSuggestionsProps) {
  // ❌ POISTA TÄMÄ:
  // const { isDark } = useTheme();
  
  const t = (fi: string, en: string) => language === 'en' ? en : fi;

  const suggestions: { icon: React.ReactNode; title: string; desc: string; href: string; cta: string; accent: string }[] = [];

  if (!hasDocuments) {
    suggestions.push({
      icon: <FileText className="w-6 h-6 text-orange-400" />,
      title: t('Luo ensimmäinen CV:si', 'Create your first CV'),
      desc: t('Aloita profiilisi rakentaminen — AI mukauttaa sen joka rooliin.', 'Start building your profile — AI tailors it to every role.'),
      href: '/create-cv',
      cta: t('Luo CV', 'Create CV'),
      accent: 'orange',
    });
  }

  if (hasDocuments && !hasRunATS) {
    suggestions.push({
      icon: <Shield className="w-6 h-6 text-green-400" />,
      title: t('Testaa hakemuksesi ATS-pisteet', 'Run an ATS check on your application'),
      desc: t('Näe pääseekö hakemuksesi automaattisen seulan läpi — ennen kuin lähetät.', 'See if your application passes automated screening — before you apply.'),
      href: '/ats-checker',
      cta: t('Aja ATS-testi', 'Run ATS Check'),
      accent: 'green',
    });
  }

  if (hasRunATS && atsScore !== null && atsScore !== undefined && atsScore < 70) {
    suggestions.push({
      icon: <TrendingUp className="w-6 h-6 text-amber-400" />,
      title: t('ATS-pisteesi on alhainen', 'Your ATS score is low'),
      desc: t(`Pisteesi ${atsScore}% — paranna CV:täsi ennen hakemista.`, `Your score is ${atsScore}% — improve your CV before applying.`),
      href: '/create-cv?optimize=true',
      cta: t('Paranna CV:tä', 'Improve CV'),
      accent: 'amber',
    });
  }

  if (hasHighGap) {
    suggestions.push({
      icon: <FileText className="w-6 h-6 text-indigo-400" />,
      title: t('Suuri kokemuskuilu havaittu', 'High experience gap detected'),
      desc: t('Luo kohdennettu hakukirje joka selittää siirtymäsi vakuuttavasti.', 'Generate a targeted cover letter that explains your transition persuasively.'),
      href: '/create-cover-letter?based_on_gap=true',
      cta: t('Luo hakukirje', 'Generate Cover Letter'),
      accent: 'indigo',
    });
  }

  if (isFreeTierLimited) {
    suggestions.push({
      icon: <Crown className="w-6 h-6 text-amber-400" />,
      title: t('Ilmainen käyttö täynnä', 'Free tier limit reached'),
      desc: t('Päivitä Premium-tiliin ja luo rajattomasti ATS-optimoituja dokumentteja.', 'Upgrade to Premium for unlimited ATS-optimized documents.'),
      href: '/pricing',
      cta: t('Päivitä Premium', 'Upgrade to Premium'),
      accent: 'amber',
    });
  }

  if (suggestions.length === 0) return null;

  const accentMap: Record<string, { border: string; bg: string; btn: string }> = {
    orange: {
      border: isDark ? 'border-orange-500/30' : 'border-orange-300/60',
      bg: isDark ? 'bg-orange-500/10' : 'bg-orange-50',
      btn: 'bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700',
    },
    green: {
      border: isDark ? 'border-green-500/30' : 'border-green-300/60',
      bg: isDark ? 'bg-green-500/10' : 'bg-green-50',
      btn: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700',
    },
    amber: {
      border: isDark ? 'border-amber-500/30' : 'border-amber-300/60',
      bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
      btn: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600',
    },
    indigo: {
      border: isDark ? 'border-indigo-500/30' : 'border-indigo-300/60',
      bg: isDark ? 'bg-indigo-500/10' : 'bg-indigo-50',
      btn: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700',
    },
  };

  return (
    <div className="mb-8">
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide mb-4 ${
        isDark ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30' : 'bg-orange-100 text-orange-600 border border-orange-300/50'
      }`}>
        <Sparkles className="w-3.5 h-3.5" />
        {t('Suositeltu seuraava askel', 'Recommended next step')}
      </div>

      <div className={`grid gap-4 ${suggestions.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {suggestions.slice(0, 2).map((s, i) => {
          const style = accentMap[s.accent];
          return (
            <div key={i} className={`rounded-[1.5rem] p-5 border transition-colors duration-300 ${style.bg} ${style.border}`}>
              <div className="flex items-start gap-3 mb-3">
                {s.icon}
                <div>
                  <p className={`font-bold text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{s.title}</p>
                  <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.desc}</p>
                </div>
              </div>
              <Link href={s.href}>
                <Button className={`w-full h-9 rounded-xl text-sm font-bold shadow-md transition-all ${style.btn}`}>
                  {s.cta}
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
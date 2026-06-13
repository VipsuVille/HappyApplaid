// components/IterativeFeedback.tsx
// UI komponentti hakukirjeen iteratiiviselle muokkaukselle (EI tokeneita)

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Loader2,
  Info,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  coverLetterId: string;
  onSuccess: (newContent: string, summary: string, affectedSections: string[]) => void;
}

export default function IterativeFeedback({
  coverLetterId,
  onSuccess,
}: Props) {
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  const exampleFeedbacks = [
    "Korosta enemmän projektinhallintaosaamistani",
    "Poista maininta varastotyöstä",
    "Muuta avauskappale rennommaksi",
    "Lisää konkreettinen esimerkki projektista",
    "Korosta tiimityötaitoja",
    "Poista liian muodollinen sävy",
  ];

  const handleIterate = async () => {
    if (!feedback.trim()) {
      toast.error('Kirjoita palaute ensin');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/iterate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coverLetterId,
          userFeedback: feedback,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('✅ Muokattu!');
        onSuccess(
          data.newContent,
          data.changesSummary,
          data.affectedSections || []
        );
        setFeedback('');
      } else if (response.status === 429) {
        // Viikkokatto täynnä
        toast.error(data.message || 'Viikon AI-toiminnot käytetty. Kokeile myöhemmin tai päivitä pakettiasi.');
      } else {
        toast.error(data.error || 'Muokkaus epäonnistui');
      }
    } catch (error) {
      console.error('Iteration failed:', error);
      toast.error('Muokkaus epäonnistui');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30 rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-500/20 rounded-2xl border border-purple-500/30">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
              Etkö ole tyytyväinen?
            </h3>
            <p className="text-sm text-purple-200/70">
              Anna AI:lle ohjeita muokkaukseen. Muokataan vain tarvittavat osat!
            </p>
          </div>
        </div>

        {/* AI-toiminto -merkki (ei token-hintaa) */}
        <div className="shrink-0">
          <div className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-purple-300" />
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
              AI-toiminto
            </span>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3">
        <Info className="w-5 h-5 text-blue-400 shrink-0" />
        <div className="text-xs text-blue-200/70 space-y-1">
          <p className="font-bold">💡 Vinkki: Ole tarkka!</p>
          <p>
            Mitä tarkempi palaute, sitä parempi tulos.
            Esim: &quot;Korosta projektinhallintaa kappaleessa 2&quot;
            on parempi kuin &quot;Muuta jotain&quot;.
          </p>
        </div>
      </div>

      {/* Examples (collapsible) */}
      <div className="mb-4">
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200 transition-colors"
        >
          <Lightbulb className="w-4 h-4" />
          {showExamples ? 'Piilota esimerkit' : 'Näytä esimerkkejä'}
        </button>

        {showExamples && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {exampleFeedbacks.map((example, i) => (
              <button
                key={i}
                onClick={() => setFeedback(example)}
                className="text-left p-3 bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-200 transition-colors"
              >
                💬 &quot;{example}&quot;
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Feedback textarea */}
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder='Esim: "Korosta enemmän projektinhallintaosaamistani" tai "Poista maininta varastotyöstä"'
        disabled={isLoading}
        className="w-full h-32 bg-black/40 border-2 border-purple-500/30 rounded-2xl p-4 text-sm text-gray-200 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 resize-none placeholder:text-gray-600 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-4">
        <Button
          onClick={handleIterate}
          disabled={isLoading || !feedback.trim()}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-xl sm:rounded-2xl px-6 py-3 sm:py-4 font-bold text-sm sm:text-base transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Muokataan...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Muokkaa AI:llä
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
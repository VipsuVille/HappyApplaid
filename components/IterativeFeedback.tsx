// components/IterativeFeedback.tsx
// UI komponentti hakukirjeen iteratiiviselle muokkaukselle

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Loader2, 
  MessageSquare, 
  Info,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  coverLetterId: string;
  iterationCost: number; // 30 TKN (Premium) tai 50 TKN (Basic)
  currentTokens: number;
  onSuccess: (newContent: string, summary: string, affectedSections: string[]) => void;
}

export default function IterativeFeedback({ 
  coverLetterId, 
  iterationCost,
  currentTokens,
  onSuccess 
}: Props) {
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  const canAfford = currentTokens >= iterationCost;

  const exampleFeedbacks = [
    "Korosta enemmän projektinhallintaosaamistani",
    "Poista maininta varastotyöstä",
    "Muuta avauskappale renommaksi",
    "Lisää konkreettinen esimerkki projektista",
    "Korosta tiimityötaitoja",
    "Poista liian muodollinen sävy",
  ];

  const handleIterate = async () => {
    if (!feedback.trim()) {
      toast.error('Kirjoita palaute ensin');
      return;
    }

    if (!canAfford) {
      toast.error(`Tarvitset ${iterationCost} tokenia`);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/iterate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coverLetterId,
          userFeedback: feedback
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(`✅ Muokattu! (${data.tokensUsed} TKN)`);
        onSuccess(
          data.newContent, 
          data.changesSummary,
          data.affectedSections || []
        );
        setFeedback('');
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
        
        {/* Cost badge */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full">
            <span className="text-xs font-black text-purple-300">
              {iterationCost} TKN
            </span>
          </div>
          <span className="text-[10px] text-gray-500">
            vs {iterationCost * 3} TKN uusi
          </span>
        </div>
      </div>

      {/* Info box */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3">
        <Info className="w-5 h-5 text-blue-400 shrink-0" />
        <div className="text-xs text-blue-200/70 space-y-1">
          <p className="font-bold">💡 Vinkki: Ole tarkka!</p>
          <p>
            Mitä tarkempi palaute, sitä parempi tulos. 
            Esim: "Korosta projektinhallintaa kappaleessa 2" 
            on parempi kuin "Muuta jotain".
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
                💬 "{example}"
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Token info */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-400" />
            <span className="text-gray-400">Saldo:</span>
            <span className={`font-bold ${canAfford ? 'text-white' : 'text-red-400'}`}>
              {currentTokens} TKN
            </span>
          </div>
          {!canAfford && (
            <div className="flex items-center gap-1 text-red-400 text-xs">
              <AlertCircle className="w-3 h-3" />
              Ei riittävästi
            </div>
          )}
        </div>
        
        {/* Button */}
        <Button
          onClick={handleIterate}
          disabled={isLoading || !feedback.trim() || !canAfford}
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
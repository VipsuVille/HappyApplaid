// components/GlobalGenerationBanner.tsx
// ✅ FINAL: Ei overlay, vain success-toiminnot

'use client';

import { useGeneration } from '@/context/GenerationContext';
import { useRouter } from 'next/navigation';
import { 
  RocketIcon, 
  CheckCircleIcon, 
  HammerIcon, 
  FileTextIcon, 
  MailIcon,
  MessageSquare,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Edit,
  FolderOpen
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';

interface GlobalGenerationBannerProps {
  onOpenQuestions?: () => void;
  generatedItemId?: string; // ✅ ID kun valmis
}

export default function GlobalGenerationBanner({ 
  onOpenQuestions,
}: GlobalGenerationBannerProps) {
  const router = useRouter();
  const { state, isGenerating, questionCount, reset } = useGeneration();
  const [isExpanded, setIsExpanded] = useState(true);

  if (state.stage === 'idle') return null;

  const stageConfig = {
    starting: {
      icon: <RocketIcon className="w-5 h-5 text-orange-500 animate-bounce" />,
      text: state.type === 'cv' ? 'Käynnistetään CV:n luontia...' : 'Käynnistetään hakukirjeen luontia...',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    analyzing: {
      icon: <HammerIcon className="w-5 h-5 text-orange-500 animate-bounce" />,
      text: 'Analysoidaan tietoja...',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    waiting_questions: {
      icon: <MessageSquare className="w-5 h-5 text-blue-400 animate-pulse" />,
      text: `Odottaa vastauksia (${questionCount} kysymystä)`,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    generating: {
      icon: state.type === 'cv' 
        ? <FileTextIcon className="w-5 h-5 text-emerald-500 animate-pulse" />
        : <MailIcon className="w-5 h-5 text-emerald-500 animate-pulse" />,
      text: state.type === 'cv' ? 'Generoidaan CV:tä...' : 'Generoidaan hakukirjettä...',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    finalizing: {
      icon: <HammerIcon className="w-5 h-5 text-amber-500 animate-bounce" />,
      text: 'Viimeistellään...',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    complete: {
      icon: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
      text: '✅ Valmis!',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    error: {
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      text: state.error || 'Virhe generoinnissa',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
  };

  const config = stageConfig[state.stage];
  const showProgress = ['starting', 'analyzing', 'generating', 'finalizing'].includes(state.stage);

  // ✅ Success toiminnot
  const handleEdit = () => {
    if (!state.generatedItemId) return;
    
    const route = state.type === 'cv' 
      ? `/edit-cv/${state.generatedItemId}`
      : `/edit-cover-letter/${state.generatedItemId}`;
    
    router.push(route);
    reset(); // Tyhjennä banner
  };

  const handleViewAll = () => {
    const route = state.type === 'cv' ? '/my-cvs' : '/my-cover-letters';
    router.push(route);
    reset(); // Tyhjennä banner
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[999] transition-all duration-300 ${
      isExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-3rem)]'
    }`}>
      <div className={`${config.bgColor} border-t-2 border-white/10 backdrop-blur-xl shadow-2xl`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          
          {/* HEADER (aina näkyvissä) */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {config.icon}
              <div>
                <p className={`font-bold text-sm ${config.color}`}>
                  {config.text}
                </p>
                {state.templateType && (
                  <p className="text-xs text-gray-500">
                    {state.templateType} · {state.language}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* ✅ SUCCESS ACTIONS */}
              {state.stage === 'complete' && state.generatedItemId && (
                <>
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Muokkaa
                  </button>
                  <button
                    onClick={handleViewAll}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    {state.type === 'cv' ? 'Kaikki CV:t' : 'Kaikki kirjeet'}
                  </button>
                </>
              )}

              {/* Vastaa kysymyksiin -nappi */}
              {state.stage === 'waiting_questions' && onOpenQuestions && (
                <button
                  onClick={onOpenQuestions}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Vastaa nyt
                </button>
              )}

              {/* Sulje (vain jos valmis tai error) */}
              {(state.stage === 'complete' || state.stage === 'error') && (
                <button
                  onClick={reset}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Sulje"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}

              {/* Laajenna/Supista */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title={isExpanded ? 'Pienennä' : 'Laajenna'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* PROGRESS (näkyy kun laajennettu) */}
          {isExpanded && showProgress && (
            <div className="mt-3">
              <Progress value={state.progress} className="h-2 bg-gray-800/50">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-600 transition-all duration-300" 
                  style={{ width: `${state.progress}%` }}
                />
              </Progress>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-400">{state.progress}%</p>
                <p className="text-xs text-gray-500">
                  ~{Math.max(5, Math.round((100 - state.progress) / 2))}s jäljellä
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
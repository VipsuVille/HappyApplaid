// components/CVQuestionsModal.tsx - UUSI (cover letter modaalin pohjalta)
'use client';

import { useState } from 'react';
import { X, HelpCircle, Send, Loader2, AlertCircle, Save, SkipForward } from 'lucide-react';
import type { GenerationQuestion } from '@/context/GenerationContext';

interface QuestionAnswer {
  id: string;
  question: string;
  answer: string;
  answerType: 'use' | 'mention' | 'interested' | 'skip';
  shouldSave: boolean;
  category: string; // ✅ REQUIRED, ei optional
}

interface Props {
  questions: GenerationQuestion[];
  preFilled: Record<string, boolean>;
  onSubmit: (answers: QuestionAnswer[]) => Promise<void>;
  onCancel: () => void;
}

export default function CVQuestionsModal({
  questions,
  preFilled,
  onSubmit,
  onCancel,
}: Props) {
  // State for each question's answer
  const [answers, setAnswers] = useState<Record<string, {
    text: string;
    type: 'use' | 'mention' | 'interested' | 'skip';
    shouldSave: boolean;
  }>>(() => {
    // Initialize with defaults
    const initial: Record<string, any> = {};
    questions.forEach(q => {
      initial[q.id] = {
        text: '',
        type: 'use', // default to "use"
        shouldSave: true // default to saving
      };
    });
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTextChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        text: value
      }
    }));
  };

  const handleTypeChange = (questionId: string, type: 'use' | 'mention' | 'interested' | 'skip') => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        type
      }
    }));
  };

  const handleSaveToggle = (questionId: string, shouldSave: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        shouldSave
      }
    }));
  };

  const handleSubmit = async () => {
    // Validate: Check that non-skipped questions have answers
    const unansweredRequired = questions.filter(q => {
      const answer = answers[q.id];
      return answer.type !== 'skip' && (!answer.text || answer.text.trim().length < 10);
    });

    if (unansweredRequired.length > 0) {
      setError(`Vastaa kaikkiin kysymyksiin (vähintään 10 merkkiä) tai valitse "Ohita". Puuttuu: ${unansweredRequired.length} vastausta.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build payload
      const payload: QuestionAnswer[] = questions
        .map(q => {
          const answer = answers[q.id];
          
          // If skipped and no text, don't include
          if (answer.type === 'skip' && !answer.text) {
            return null;
          }

          return {
            id: q.id,
            question: q.question,
            answer: answer.text || '',
            answerType: answer.type,
            shouldSave: answer.shouldSave,
            category: q.category || 'other' // ✅ VARMISTA että on aina string
          };
        })
        .filter((item): item is QuestionAnswer => item !== null); // ✅ Type guard

      console.log('📤 CV: Lähetetään vastaukset:', payload);
      
      await onSubmit(payload);
      
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Tuntematon virhe lähetettäessä vastauksia');
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority?: string) => {
    if (priority === 'critical') return 'border-red-400 bg-red-50';
    if (priority === 'important') return 'border-yellow-400 bg-yellow-50';
    return 'border-blue-400 bg-blue-50';
  };

  const getPriorityLabel = (priority?: string) => {
    if (priority === 'critical') return '🔴 Tärkeä';
    if (priority === 'important') return '🟡 Suositeltu';
    return '🔵 Vapaaehtoinen';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full my-8 flex flex-col max-h-[90vh] border border-slate-700/50">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-700/50 flex-shrink-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent mb-2">
                💡 Tarkennetaan CV:täsi
              </h2>
              <p className="text-sm text-slate-300">
                AI haluaa varmistaa, että CV:stä tulee mahdollisimman vakuuttava.
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="p-6 space-y-6 overflow-y-auto flex-grow">
          {questions.map((question, idx) => {
            const answer = answers[question.id];
            const isPreFilled = preFilled[question.id];
            
            return (
              <div 
                key={question.id} 
                className={`p-5 border-2 rounded-xl transition-all ${getPriorityColor(question.priority)} backdrop-blur-md`}
              >
                {/* Question Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-bold text-slate-700 border-2 border-slate-300 shadow-sm">
                      {idx + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        {getPriorityLabel(question.priority)}
                      </span>
                      {isPreFilled && (
                        <span className="text-xs bg-green-500/20 text-green-700 px-2 py-0.5 rounded-full border border-green-500/30">
                          ✓ Tallennettu vastaus
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg">
                      {question.question}
                    </h3>
                    {question.why && (
                      <p className="text-sm text-slate-700 mb-3 flex items-start gap-2 italic">
                        <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {question.why}
                      </p>
                    )}
                  </div>
                </div>

                {/* RADIO BUTTONS - Miten käytetään */}
                <div className="mb-4 bg-white/50 rounded-lg p-3 border border-slate-300">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Miten tätä käytetään CV:ssä?</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name={`type-${question.id}`}
                        value="use"
                        checked={answer.type === 'use'}
                        onChange={() => handleTypeChange(question.id, 'use')}
                        className="w-4 h-4 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-green-600 transition-colors">
                        ✅ Käytä
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name={`type-${question.id}`}
                        value="mention"
                        checked={answer.type === 'mention'}
                        onChange={() => handleTypeChange(question.id, 'mention')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                        💬 Mainitse
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name={`type-${question.id}`}
                        value="interested"
                        checked={answer.type === 'interested'}
                        onChange={() => handleTypeChange(question.id, 'interested')}
                        className="w-4 h-4 text-yellow-600 focus:ring-yellow-500"
                      />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-yellow-600 transition-colors">
                        ⭐ Korostettava
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name={`type-${question.id}`}
                        value="skip"
                        checked={answer.type === 'skip'}
                        onChange={() => handleTypeChange(question.id, 'skip')}
                        className="w-4 h-4 text-gray-600 focus:ring-gray-500"
                      />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-gray-600 transition-colors">
                        ⏭️ Ohita
                      </span>
                    </label>
                  </div>
                </div>

                {/* TEXT AREA - Kirjoita lisätietoja */}
                {answer.type !== 'skip' && (
                  <div className="mb-4">
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">
                      {answer.type === 'use' && '✍️ Kerro lisää (käytetään CV:ssä)'}
                      {answer.type === 'mention' && '✍️ Kerro lyhyesti (mainitaan kevyesti)'}
                      {answer.type === 'interested' && '✍️ Miksi tämä on vahvuutesi? (korostetaan)'}
                    </label>
                    <textarea
                      value={answer.text}
                      onChange={(e) => handleTextChange(question.id, e.target.value)}
                      placeholder={
                        answer.type === 'use' 
                          ? "Kerro kokemuksestasi tai osaamisestasi yksityiskohtaisesti..."
                          : answer.type === 'mention'
                          ? "Lyhyt kommentti riittää..."
                          : "Miksi tämä on vahvuutesi tai tärkeä osaaminen?"
                      }
                      className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm min-h-[100px] bg-white/80 text-slate-900 placeholder-slate-500"
                    />
                    <div className="mt-2 text-xs text-slate-600 text-right">
                      {answer.text?.length || 0} merkkiä {(answer.text?.length ?? 0) answer.type !== 'skip' && (answer.text?.length ?? 0) < 10 && '(vähintään 10)'}
                    </div>
                  </div>
                )}

                {/* CHECKBOX - Tallenna tulevia hakemuksia varten */}
                <div className="bg-slate-100/80 rounded-lg p-3 border border-slate-300">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={answer.shouldSave}
                      onChange={(e) => handleSaveToggle(question.id, e.target.checked)}
                      className="w-5 h-5 text-orange-600 focus:ring-orange-500 rounded mt-0.5"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-orange-600 transition-colors flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Tallenna vastaus tulevia CV:itä varten
                      </span>
                      <p className="text-xs text-slate-600 mt-1">
                        AI ei kysy tätä uudelleen. Voit muokata myöhemmin profiilissa.
                      </p>
                    </div>
                  </label>
                </div>

              </div>
            );
          })}
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="px-6 py-3 bg-red-500/20 border-t border-red-400/30 flex items-center gap-2 text-red-200 flex-shrink-0">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* FOOTER */}
        <div className="p-6 border-t border-slate-700/50 flex justify-between items-center flex-shrink-0 bg-slate-900/50 rounded-b-2xl">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/50 disabled:opacity-50 text-slate-300 transition-colors flex items-center gap-2"
          >
            <SkipForward className="w-4 h-4" />
            Peruuta
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 flex items-center gap-2 font-semibold shadow-lg transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Käsitellään...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Valmis - Generoi CV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
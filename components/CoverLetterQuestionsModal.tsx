// components/CoverLetterQuestionsModal.tsx
'use client';

import { useState } from 'react';
import { X, HelpCircle, Send, Loader2, AlertCircle } from 'lucide-react';

interface AIQuestion {
  id: string;
  question: string;
  context: string;
  personality_focus?: string;
  priority?: 'high' | 'medium' | 'low';
}

// Backend odottaa tätä muotoa arrayna
interface AnsweredQuestion {
  id: string;
  question: string;
  answer: string;
}

interface Props {
  questions: AIQuestion[];
  tempCoverLetterData: {
    title: string;
    tempContent: string;
    signature: string;
    job_match_score?: number;
    personality_hooks?: string[];
  };
  jobDescription: string;
  onSubmit: (answers: AnsweredQuestion[]) => Promise<void>;
  onCancel: () => void;
}

export default function CoverLetterQuestionsModal({
  questions,
  tempCoverLetterData,
  jobDescription,
  onSubmit,
  onCancel,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    // 1. Validointi: Tarkista pakolliset (High priority)
    const unansweredHigh = questions.filter(
      q => q.priority === 'high' && (!answers[q.id] || answers[q.id].length < 10)
    );

    if (unansweredHigh.length > 0) {
      setError('Vastaa kaikkiin pakollisiin kysymyksiin (punainen reunus).');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // ✅ KORJAUS TÄSSÄ: 
      // Etsimme alkuperäisen kysymyksen 'questions'-listasta ID:n perusteella.
      // Emme käytä pelkkää ID:tä kysymystekstinä.
      
      const answeredQuestionsPayload: AnsweredQuestion[] = questions
        .filter(q => answers[q.id] && answers[q.id].trim().length > 0) // Ota vain vastatut
        .map(q => ({
          id: q.id,
          question: q.question, // ✅ TÄMÄ ON SE TÄRKEIN KOHTA: Otetaan oikea tekstimuotoinen kysymys
          answer: answers[q.id]
        }));

      if (answeredQuestionsPayload.length === 0) {
        // Jos käyttäjä ei vastannut mihinkään (ja ei ollut pakollisia), lähetetään tyhjä array
        // Tai jos haluat estää tyhjän lähetyksen, voit heittää virheen tässä
      }

      console.log('📤 Lähetetään vastaukset:', answeredQuestionsPayload);
      
      await onSubmit(answeredQuestionsPayload);
      
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Tuntematon virhe lähetettäessä vastauksia');
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority?: string) => {
    if (priority === 'high') return 'border-red-300 bg-red-50';
    if (priority === 'medium') return 'border-yellow-300 bg-yellow-50';
    return 'border-blue-300 bg-blue-50';
  };

  const getPriorityLabel = (priority?: string) => {
    if (priority === 'high') return '🔴 Pakollinen';
    if (priority === 'medium') return '🟡 Suositeltu';
    return '🔵 Vapaaehtoinen';
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                💡 Tarkennetaan hakemustasi
              </h2>
              <p className="text-sm text-gray-600">
                AI huomasi muutaman kohdan, joita tarkentamalla saat paremman lopputuloksen.
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-grow">
          {questions.map((question, idx) => (
            <div key={question.id} className={`p-4 border-2 rounded-lg ${getPriorityColor(question.priority)}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-bold text-gray-700 border-2 border-gray-300">
                    {idx + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">
                      {getPriorityLabel(question.priority)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                    {question.question}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 flex items-start gap-2 italic">
                    <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {question.context}
                  </p>
                </div>
              </div>

              <textarea
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder="Kirjoita vastauksesi tähän..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[100px]"
              />
              
              <div className="mt-2 text-xs text-gray-500 text-right">
                {answers[question.id]?.length || 0} merkkiä
              </div>
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-100 flex items-center gap-2 text-red-700 flex-shrink-0">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between items-center flex-shrink-0 rounded-b-lg">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-gray-700"
          >
            Ohita kysymykset
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Käsitellään...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Valmis - Generoi kirje
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
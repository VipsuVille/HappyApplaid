// components/CoverLetterQuestionsModal.tsx - KORJATTU VERSIO
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

// ✅ UUSI: Tämä on mitä backend odottaa
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
  onSubmit: (answers: AnsweredQuestion[]) => Promise<void>; // ✅ MUUTETTU: Array!
  onCancel: () => void;
}

export default function CoverLetterQuestionsModal({
  questions,
  tempCoverLetterData,
  jobDescription,
  onSubmit,
  onCancel,
}: Props) {
  // ✅ Sisäisesti käytetään Record<string, string> kuten ennen
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    // Tarkista että kaikki high-priority kysymykset vastattu
    const unansweredHigh = questions.filter(
      q => q.priority === 'high' && (!answers[q.id] || answers[q.id].length < 20)
    );

    if (unansweredHigh.length > 0) {
      setError('Vastaa kaikkiin pakollisiin kysymyksiin (vähintään 20 merkkiä)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // ✅ KRIITTINEN MUUTOS: Muodosta array objekteja
      const answeredQuestions: AnsweredQuestion[] = questions
        .filter(q => answers[q.id] && answers[q.id].trim().length > 0)
        .map(q => ({
          id: q.id,
          question: q.question,  // ✅ TALLENNA KYSYMYSTEKSTI!
          answer: answers[q.id]
        }));

      console.log('📤 Submitting answers:', answeredQuestions);
      
      await onSubmit(answeredQuestions); // ✅ Lähetä array!
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tuntematon virhe');
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
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                💡 Paranna hakukirjettäsi
              </h2>
              <p className="text-sm text-gray-600">
                AI tarvitsee lisätietoja luodakseen vahvemman hakukirjeen. 
                Vastaa kysymyksiin ja saat henkilökohtaisemman lopputuloksen.
              </p>
              {tempCoverLetterData.job_match_score && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Nykyinen match:</span>
                  <span className="font-bold text-blue-600">
                    {tempCoverLetterData.job_match_score}/10
                  </span>
                  <span className="text-gray-500">→ Voidaan parantaa!</span>
                </div>
              )}
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Questions */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {questions.map((question, idx) => (
            <div key={question.id} className={`p-4 border-2 rounded-lg ${getPriorityColor(question.priority)}`}>
              {/* Question header */}
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
                    {question.personality_focus && (
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                        🎯 {question.personality_focus}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {question.question}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {question.context}
                  </p>
                </div>
              </div>

              {/* Answer textarea */}
              <textarea
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder={
                  question.priority === 'high' 
                    ? 'Vastaa tähän (pakollinen, vähintään 20 merkkiä)...'
                    : 'Vastaa tähän (vapaaehtoinen)...'
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                rows={4}
              />
              
              {/* Character count */}
              <div className="mt-2 text-xs text-gray-500 text-right">
                {answers[question.id]?.length || 0} merkkiä
                {question.priority === 'high' && (answers[question.id]?.length || 0) < 20 && (
                  <span className="text-red-600 ml-2">
                    (vähintään 20 tarvitaan)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-t border-b border-red-200 flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {questions.filter(q => q.priority === 'high').length} pakollista kysymystä
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Peruuta
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Luodaan...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Luo hakukirje
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
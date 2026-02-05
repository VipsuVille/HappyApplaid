// context/GenerationContext.tsx
// ✅ FINAL: generatedItemId lisätty

'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type GenerationType = 'cv' | 'cover_letter';

export type GenerationStage = 
  | 'idle'
  | 'starting'
  | 'analyzing'
  | 'waiting_questions'
  | 'generating'
  | 'finalizing'
  | 'complete'
  | 'error';

export interface GenerationQuestion {
  id: string;
  question: string;
  why?: string;
  priority?: 'critical' | 'important' | 'optional';
}

interface GenerationState {
  type: GenerationType | null;
  stage: GenerationStage;
  progress: number;
  questions: GenerationQuestion[];
  answers: Record<string, string>;
  error: string | null;
  startedAt: number | null;
  templateType?: string;
  language?: string;
  generatedItemId?: string; // ✅ UUSI: ID kun valmis
}

interface GenerationContextValue {
  state: GenerationState;
  
  startGeneration: (type: GenerationType, metadata?: { templateType?: string; language?: string }) => void;
  setStage: (stage: GenerationStage, progress?: number) => void;
  setQuestions: (questions: GenerationQuestion[]) => void;
  setAnswer: (questionId: string, answer: string) => void;
  setError: (error: string) => void;
  completeGeneration: (itemId?: string) => void; // ✅ MUUTETTU: Valinnainen ID
  failGeneration: (error: string) => void;
  cancelGeneration: () => void;
  reset: () => void;
  
  isGenerating: boolean;
  hasQuestions: boolean;
  questionCount: number;
}

const GenerationContext = createContext<GenerationContextValue | undefined>(undefined);

const INITIAL_STATE: GenerationState = {
  type: null,
  stage: 'idle',
  progress: 0,
  questions: [],
  answers: {},
  error: null,
  startedAt: null,
  generatedItemId: undefined,
};

export function GlobalGenerationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GenerationState>(INITIAL_STATE);

  const startGeneration = useCallback((
    type: GenerationType, 
    metadata?: { templateType?: string; language?: string }
  ) => {
    setState({
      ...INITIAL_STATE,
      type,
      stage: 'starting',
      progress: 0,
      startedAt: Date.now(),
      templateType: metadata?.templateType,
      language: metadata?.language,
    });
  }, []);

  const setStage = useCallback((stage: GenerationStage, progress?: number) => {
    setState(prev => ({
      ...prev,
      stage,
      progress: progress ?? prev.progress,
    }));
  }, []);

  const setQuestions = useCallback((questions: GenerationQuestion[]) => {
    setState(prev => ({
      ...prev,
      stage: 'waiting_questions',
      questions,
      answers: {},
    }));
  }, []);

  const setAnswer = useCallback((questionId: string, answer: string) => {
    setState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: answer,
      },
    }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      stage: 'error',
      error,
    }));
  }, []);

  const completeGeneration = useCallback((itemId?: string) => {
    setState(prev => ({
      ...prev,
      stage: 'complete',
      progress: 100,
      generatedItemId: itemId, // ✅ Tallenna ID
    }));
    
    // ✅ EI AUTOMAATTISTA RESETTIÄ - Käyttäjä sulkee itse bannerista
  }, []);

  const failGeneration = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      stage: 'error',
      error,
    }));
  }, []);

  const cancelGeneration = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const isGenerating = state.stage !== 'idle' && state.stage !== 'complete' && state.stage !== 'error';
  const hasQuestions = state.questions.length > 0;
  const questionCount = state.questions.length;

  return (
    <GenerationContext.Provider
      value={{
        state,
        startGeneration,
        setStage,
        setQuestions,
        setAnswer,
        setError,
        completeGeneration,
        failGeneration,
        cancelGeneration,
        reset,
        isGenerating,
        hasQuestions,
        questionCount,
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error('useGeneration must be used within GlobalGenerationProvider');
  }
  return context;
}
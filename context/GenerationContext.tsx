"use client";

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export type GenerationType = 'cv' | 'cover_letter';

export type GenerationStage =
  | 'idle'
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
  helpText?: string;
  priority?: 'critical' | 'important' | 'helpful';
  category?: string;
}

export interface GenerationState {
  type: GenerationType | null;
  stage: GenerationStage;
  progress: number;
  questions: GenerationQuestion[];
  answers: Record<string, string>;
  error: string | null;
  resultId: string | null;
  generatedItemId: string | null;
  templateType?: string;
  language?: string;
  metadata?: Record<string, any>;
}

interface GenerationContextType {
  cvState: GenerationState;
  coverLetterState: GenerationState;
  state: GenerationState;
  isGenerating: boolean;
  questionCount: number;
  startGeneration: (type: GenerationType, metadata?: Record<string, any>) => void;
  setStage: (stage: GenerationStage, progress?: number) => void;
  setQuestions: (questions: GenerationQuestion[]) => void;
  setAnswer: (questionId: string, answer: string) => void;
  completeGeneration: (resultId: string) => void;
  failGeneration: (error: string) => void;
  cancelGeneration: () => void;
  resetState: (type?: GenerationType) => void;
  reset: () => void;
}

const createInitialState = (): GenerationState => ({
  type: null,
  stage: 'idle',
  progress: 0,
  questions: [],
  answers: {},
  error: null,
  resultId: null,
  generatedItemId: null,
  templateType: undefined,
  language: undefined,
  metadata: {},
});

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export function GenerationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [cvState, setCvState] = useState<GenerationState>(createInitialState());
  const [coverLetterState, setCoverLetterState] = useState<GenerationState>(createInitialState());
  const [activeType, setActiveType] = useState<GenerationType | null>(null);

  // ✅ REF: Päivittyy synkronisesti toisin kuin useState
  const activeTypeRef = useRef<GenerationType | null>(null);

  // ✅ Päivitä AINA molemmat: ref JA state
  const setActive = useCallback((type: GenerationType | null) => {
    activeTypeRef.current = type;
    setActiveType(type);
  }, []);

  const state = activeType === 'cv' ? cvState :
                activeType === 'cover_letter' ? coverLetterState :
                createInitialState();

  const isGenerating = state.stage !== 'idle' &&
                       state.stage !== 'complete' &&
                       state.stage !== 'error' &&
                       state.stage !== 'waiting_questions';

  const questionCount = state.questions?.length || 0;

  const updateState = useCallback((type: GenerationType, updater: (prev: GenerationState) => GenerationState) => {
    if (type === 'cv') {
      setCvState(updater);
    } else {
      setCoverLetterState(updater);
    }
  }, []);

  const startGeneration = useCallback((type: GenerationType, metadata?: Record<string, any>) => {
    console.log(`🚀 [Context] Starting ${type} generation`);

    const otherType = type === 'cv' ? 'cover_letter' : 'cv';
    const otherState = otherType === 'cv' ? cvState : coverLetterState;

    if (otherState.stage !== 'idle' &&
        otherState.stage !== 'complete' &&
        otherState.stage !== 'error') {
      console.error(`❌ [Context] Cannot start ${type} - ${otherType} is still generating`);
      throw new Error(`Generointi on jo käynnissä (${otherType}). Odota sen valmistumista.`);
    }

    setActive(type); // ✅ Päivittää SEKÄ refin että staten

    updateState(type, () => ({
      type,
      stage: 'analyzing',
      progress: 10,
      questions: [],
      answers: {},
      error: null,
      resultId: null,
      generatedItemId: null,
      templateType: metadata?.templateType,
      language: metadata?.language,
      metadata: metadata || {},
    }));
  }, [cvState, coverLetterState, updateState, setActive]);

  const setStage = useCallback((stage: GenerationStage, progress?: number) => {
    const type = activeTypeRef.current; // ✅ Ref, ei state
    if (!type) {
      console.warn('⚠️ [Context] setStage called but no active type');
      return;
    }
    updateState(type, (prev) => ({
      ...prev,
      stage,
      progress: progress ?? prev.progress,
    }));
  }, [updateState]);

  const setQuestions = useCallback((questions: GenerationQuestion[]) => {
    const type = activeTypeRef.current;
    if (!type) return;
    console.log(`❓ [Context] Setting ${questions.length} questions for ${type}`);
    updateState(type, (prev) => ({
      ...prev,
      questions,
      stage: 'waiting_questions',
      progress: 30,
    }));
  }, [updateState]);

  const setAnswer = useCallback((questionId: string, answer: string) => {
    const type = activeTypeRef.current;
    if (!type) return;
    updateState(type, (prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: answer,
      },
    }));
  }, [updateState]);

  const completeGeneration = useCallback((resultId: string) => {
    const type = activeTypeRef.current; // ✅ Ref, ei state
    if (!type) return;
    console.log(`✅ [Context] ${type} generation complete:`, resultId);
    updateState(type, (prev) => ({
      ...prev,
      stage: 'complete',
      progress: 100,
      resultId,
      generatedItemId: resultId,
    }));
  }, [updateState]);

  const failGeneration = useCallback((error: string) => {
    const type = activeTypeRef.current; // ✅ Ref, ei state
    if (!type) return;
    console.error(`❌ [Context] ${type} generation failed:`, error);
    updateState(type, (prev) => ({
      ...prev,
      stage: 'error',
      error,
    }));
  }, [updateState]);

  const cancelGeneration = useCallback(() => {
    const type = activeTypeRef.current;
    if (!type) return;
    console.log(`🛑 [Context] Cancelling ${type} generation`);
    updateState(type, () => createInitialState());
    setActive(null);
  }, [updateState, setActive]);

  const resetState = useCallback((type?: GenerationType) => {
    if (type) {
      console.log(`🔄 [Context] Resetting ${type} state`);
      updateState(type, () => createInitialState());
      if (activeTypeRef.current === type) {
        setActive(null);
      }
    } else {
      console.log('🔄 [Context] Resetting ALL states');
      setCvState(createInitialState());
      setCoverLetterState(createInitialState());
      setActive(null);
    }
  }, [updateState, setActive]);

  const value: GenerationContextType = {
    cvState,
    coverLetterState,
    state,
    isGenerating,
    questionCount,
    startGeneration,
    setStage,
    setQuestions,
    setAnswer,
    completeGeneration,
    failGeneration,
    cancelGeneration,
    resetState,
    reset: () => resetState(),
  };

  return (
    <GenerationContext.Provider value={value}>
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error('useGeneration must be used within GenerationProvider');
  }
  return context;
}

export default GenerationContext;
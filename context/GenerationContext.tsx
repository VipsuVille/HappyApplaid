// contexts/GenerationContext.tsx - KORJATTU VERSIO
"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

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
  metadata?: Record<string, any>;
}

interface GenerationContextType {
  // ✅ ERILLINEN STATE CV:LLE JA COVER LETTERILLE
  cvState: GenerationState;
  coverLetterState: GenerationState;
  
  // ✅ GETTERIT AKTIIVISELLE STATELLE
  state: GenerationState;
  isGenerating: boolean;
  
  // Actions
  startGeneration: (type: GenerationType, metadata?: Record<string, any>) => void;
  setStage: (stage: GenerationStage, progress?: number) => void;
  setQuestions: (questions: GenerationQuestion[]) => void;
  setAnswer: (questionId: string, answer: string) => void;
  completeGeneration: (resultId: string) => void;
  failGeneration: (error: string) => void;
  cancelGeneration: () => void;
  resetState: (type?: GenerationType) => void;
}

// ════════════════════════════════════════════════════════════════
// INITIAL STATES
// ════════════════════════════════════════════════════════════════

const createInitialState = (): GenerationState => ({
  type: null,
  stage: 'idle',
  progress: 0,
  questions: [],
  answers: {},
  error: null,
  resultId: null,
  metadata: {},
});

// ════════════════════════════════════════════════════════════════
// CONTEXT
// ════════════════════════════════════════════════════════════════

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export function GenerationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  
  // ✅ ERILLINEN STATE KUMMALLEKIN
  const [cvState, setCvState] = useState<GenerationState>(createInitialState());
  const [coverLetterState, setCoverLetterState] = useState<GenerationState>(createInitialState());
  
  // ✅ AKTIIVINEN TYYPPI (viimeksi aloitettu)
  const [activeType, setActiveType] = useState<GenerationType | null>(null);
  
  // ✅ GETTERI AKTIIVISELLE STATELLE
  const state = activeType === 'cv' ? cvState : 
                activeType === 'cover_letter' ? coverLetterState : 
                createInitialState();
  
  // ✅ KRIITTINEN: Kysymystilassa ei ole "generating" - käyttäjä voi vastata!
  const isGenerating = state.stage !== 'idle' && 
                       state.stage !== 'complete' && 
                       state.stage !== 'error' &&
                       state.stage !== 'waiting_questions'; // ✅ LISÄTTY!
  
  // ✅ HELPER: Päivitä oikea state
  const updateState = useCallback((type: GenerationType, updater: (prev: GenerationState) => GenerationState) => {
    if (type === 'cv') {
      setCvState(updater);
    } else {
      setCoverLetterState(updater);
    }
  }, []);
  
  // ════════════════════════════════════════════════════════════════
  // ACTIONS
  // ════════════════════════════════════════════════════════════════
  
  const startGeneration = useCallback((type: GenerationType, metadata?: Record<string, any>) => {
    console.log(`🚀 [Context] Starting ${type} generation`);
    
    // ✅ TARKISTA ETTÄ TOINEN EI OLE KESKEN
    const otherType = type === 'cv' ? 'cover_letter' : 'cv';
    const otherState = otherType === 'cv' ? cvState : coverLetterState;
    
    if (otherState.stage !== 'idle' && 
        otherState.stage !== 'complete' && 
        otherState.stage !== 'error') {
      console.error(`❌ [Context] Cannot start ${type} - ${otherType} is still generating`);
      throw new Error(`Generointi on jo käynnissä (${otherType}). Odota sen valmistumista.`);
    }
    
    setActiveType(type);
    
    updateState(type, () => ({
      type,
      stage: 'analyzing',
      progress: 10,
      questions: [],
      answers: {},
      error: null,
      resultId: null,
      metadata: metadata || {},
    }));
  }, [cvState, coverLetterState, updateState]);
  
  const setStage = useCallback((stage: GenerationStage, progress?: number) => {
    if (!activeType) {
      console.warn('⚠️ [Context] setStage called but no active type');
      return;
    }
    
    updateState(activeType, (prev) => ({
      ...prev,
      stage,
      progress: progress ?? prev.progress,
    }));
  }, [activeType, updateState]);
  
  const setQuestions = useCallback((questions: GenerationQuestion[]) => {
    if (!activeType) return;
    
    console.log(`❓ [Context] Setting ${questions.length} questions for ${activeType}`);
    
    updateState(activeType, (prev) => ({
      ...prev,
      questions,
      stage: 'waiting_questions',
      progress: 30,
    }));
  }, [activeType, updateState]);
  
  const setAnswer = useCallback((questionId: string, answer: string) => {
    if (!activeType) return;
    
    updateState(activeType, (prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: answer,
      },
    }));
  }, [activeType, updateState]);
  
  const completeGeneration = useCallback((resultId: string) => {
    if (!activeType) return;
    
    console.log(`✅ [Context] ${activeType} generation complete:`, resultId);
    
    updateState(activeType, (prev) => ({
      ...prev,
      stage: 'complete',
      progress: 100,
      resultId,
    }));
    
    // ✅ NAVIGATE OIKEALLE SIVULLE
    setTimeout(() => {
      if (activeType === 'cv') {
        router.push(`/edit-cv/${resultId}`);
      } else {
        router.push(`/edit-cover-letter/${resultId}`);
      }
    }, 500);
  }, [activeType, updateState, router]);
  
  const failGeneration = useCallback((error: string) => {
    if (!activeType) return;
    
    console.error(`❌ [Context] ${activeType} generation failed:`, error);
    
    updateState(activeType, (prev) => ({
      ...prev,
      stage: 'error',
      error,
    }));
  }, [activeType, updateState]);
  
  const cancelGeneration = useCallback(() => {
    if (!activeType) return;
    
    console.log(`🛑 [Context] Cancelling ${activeType} generation`);
    
    updateState(activeType, () => createInitialState());
    setActiveType(null);
  }, [activeType, updateState]);
  
  const resetState = useCallback((type?: GenerationType) => {
    if (type) {
      console.log(`🔄 [Context] Resetting ${type} state`);
      updateState(type, () => createInitialState());
      if (activeType === type) {
        setActiveType(null);
      }
    } else {
      console.log('🔄 [Context] Resetting ALL states');
      setCvState(createInitialState());
      setCoverLetterState(createInitialState());
      setActiveType(null);
    }
  }, [activeType, updateState]);
  
  const value: GenerationContextType = {
    cvState,
    coverLetterState,
    state,
    isGenerating,
    startGeneration,
    setStage,
    setQuestions,
    setAnswer,
    completeGeneration,
    failGeneration,
    cancelGeneration,
    resetState,
  };
  
  return (
    <GenerationContext.Provider value={value}>
      {children}
    </GenerationContext.Provider>
  );
}

// ════════════════════════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════════════════════════

export function useGeneration() {
  const context = useContext(GenerationContext);
  
  if (!context) {
    throw new Error('useGeneration must be used within GenerationProvider');
  }
  
  return context;
}

// ════════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════════

export default GenerationContext;
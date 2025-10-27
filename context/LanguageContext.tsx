//context/LanguageContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'fi';

const LanguageContext = createContext<{
  language: Language;
  toggleLanguage: () => void;
} | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'fi' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
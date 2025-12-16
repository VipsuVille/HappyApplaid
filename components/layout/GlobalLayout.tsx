// components/layout/GlobalLayout.tsx
'use client';

import SmartHeader from '@/components/ui/smartHeader';
import SubscriptionProvider from '@/context/SubscriptionContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Toaster } from 'sonner';
// Poista importit useState ja useEffect, jos ne olivat aiemmin täällä.

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
    // POISTA KOKO isMounted-LOGIIKKA TÄSTÄ KOMPONENTISTA.

    return (
        // Takuu: Yksi juurielementti
        <div id="app-root-wrapper" className="min-h-screen flex flex-col">
            
            {/* TÄRKEÄÄ: Providerit käärivät childrenin AINA. */}
            <SubscriptionProvider>
                <LanguageProvider>
                    
                    {/* 1. Header (Client Component, joka on nyt Contextin sisällä) */}
                    <SmartHeader />
                    
                    {/* 2. Page Content (children, joka käyttää Contextia) */}
                    <main className="flex-grow">
                        {children} 
                    </main>

                    {/* 3. Toaster */}
                    <Toaster position="top-center" />
                    
                </LanguageProvider>
            </SubscriptionProvider>
        </div>
    );
}
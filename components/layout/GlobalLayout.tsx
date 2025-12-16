// components/layout/GlobalLayout.tsx
'use client';

import SmartHeader from '@/components/ui/smartHeader';
import SubscriptionProvider from '@/context/SubscriptionContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Toaster } from 'sonner';

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
    return (
        // ✅ TÄRKEÄ: YKSI JUURINODI (DIV), JOKA KÄÄRII KAIKEN.
        <div id="app-root-wrapper" className="min-h-screen flex flex-col">
            <SubscriptionProvider>
                <LanguageProvider>
                    
                    {/* 1. Globaali Header */}
                    <SmartHeader />
                    
                    {/* 2. Page Content (children) */}
                    {/* Kääritään children "main"-elementtiin selkeyden vuoksi. */}
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
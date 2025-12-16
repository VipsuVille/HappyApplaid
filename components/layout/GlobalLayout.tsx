// components/layout/GlobalLayout.tsx
'use client';

import SmartHeader from '@/components/ui/smartHeader';
import SubscriptionProvider from '@/context/SubscriptionContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Toaster } from 'sonner';

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
    // Siirrä kaikki Providerit, Header ja Toaster tänne.
    // TÄMÄ TAKAA, ETTÄ NE KAIKKI HYDRATOITUVAT YHDESSÄ CLIENT-PUOLELLA.
    return (
        <SubscriptionProvider>
            <LanguageProvider>
                <SmartHeader />
                {children}
                <Toaster position="top-center" />
            </LanguageProvider>
        </SubscriptionProvider>
    );
}
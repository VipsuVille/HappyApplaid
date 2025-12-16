// components/layout/GlobalLayout.tsx
'use client';

import SmartHeader from '@/components/ui/smartHeader';
import SubscriptionProvider from '@/context/SubscriptionContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Prevent hydration mismatch by not rendering until client-side
    if (!isMounted) {
        return null;
    }

    return (
        <SubscriptionProvider>
            <LanguageProvider>
                <div className="min-h-screen flex flex-col">
                    <SmartHeader />
                    <main className="flex-grow">
                        {children}
                    </main>
                    <Toaster position="top-center" />
                </div>
            </LanguageProvider>
        </SubscriptionProvider>
    );
}
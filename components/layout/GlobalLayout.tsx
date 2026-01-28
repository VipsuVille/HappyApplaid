// components/layout/GlobalLayout.tsx - THEME PROVIDER LISÄTTY
'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import SubscriptionProvider from '@/context/SubscriptionContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext'; // ✅ LISÄTTY
import { Toaster } from 'sonner';

const SmartHeader = dynamic(
  () => import('@/components/ui/smartHeader'),
  { ssr: true }
);

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // ✅ PIILOTA HEADER PREVIEW-SIVUILLA
  const isPreviewPage = pathname?.includes('/cover-letter-preview') || 
                        pathname?.includes('/cv-preview');

  return (
    <>
      {/* ✅ THEME PROVIDER WRAPPAA KAIKEN */}
      <ThemeProvider>
        <SubscriptionProvider>
          <LanguageProvider>
            <div className="min-h-screen flex flex-col">
              {/* ✅ EHDOLLINEN HEADER */}
              {!isPreviewPage && <SmartHeader />}
              
              <main className="flex-grow">
                {children}
              </main>
            </div>
            <Toaster position="top-center" />
          </LanguageProvider>
        </SubscriptionProvider>
      </ThemeProvider>
    </>
  );
}
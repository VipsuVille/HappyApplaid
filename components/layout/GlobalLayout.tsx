// components/layout/GlobalLayout.tsx - KORJATTU
'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import SubscriptionProvider from '@/context/SubscriptionContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Toaster } from 'sonner';

const SmartHeader = dynamic(() => import('@/components/ui/smartHeader'), {
  ssr: false,
  loading: () => (
    <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
        </div>
      </div>
    </header>
  )
});

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // ✅ PIILOTA HEADER PREVIEW-SIVUILLA
  const isPreviewPage = pathname?.includes('/cover-letter-preview') || 
                        pathname?.includes('/cv-preview');

  return (
    <>
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
    </>
  );
}
// components/layout/GlobalLayout.tsx - KORJATTU
'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import SubscriptionProvider from '@/context/SubscriptionContext';
import { LanguageProvider } from '@/context/LanguageContext';
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
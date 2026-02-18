// app/layout.tsx

import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalLayout from '@/components/layout/GlobalLayout';
import { clerkAppearance } from '@/lib/clerkAppearance';
import { GenerationProvider } from '@/context/GenerationContext';
import GlobalGenerationBanner from '@/components/GlobalGenerationBanner';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.className} bg-gray-900`} suppressHydrationWarning>
          <GenerationProvider>
            <GlobalLayout>
              {children}
            </GlobalLayout>
            <GlobalGenerationBanner />
          </GenerationProvider>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
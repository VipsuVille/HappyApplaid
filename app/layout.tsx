// app/layout.tsx - ✅ KORJATTU: Provider oikeassa paikassa

import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalLayout from '@/components/layout/GlobalLayout';
import { clerkAppearance } from '@/lib/clerkAppearance';
import { GlobalGenerationProvider } from '@/context/GenerationContext';
import GlobalGenerationBanner from '@/components/GlobalGenerationBanner';

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
          <GlobalGenerationProvider> {/* ✅ SISÄLLÄ body:ä */}
            <GlobalLayout>
              {children}
            </GlobalLayout>
            <GlobalGenerationBanner /> {/* ✅ GlobalLayout:in jälkeen */}
          </GlobalGenerationProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
// app/layout.tsx - ✅ KORJATTU

import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalLayout from '@/components/layout/GlobalLayout';
import { clerkAppearance } from '@/lib/clerkAppearance';
import { GlobalGenerationProvider } from '@/context/GenerationContext'; // ✅ OIKEA POLKU
import GlobalGenerationBanner from '@/components/GlobalGenerationBanner';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <GlobalGenerationProvider> {/* ✅ WRAPPAA KAIKKI */}
        <html lang="en" suppressHydrationWarning>
          <body className={`${inter.className} bg-gray-900`} suppressHydrationWarning>
            <GlobalLayout>
              {children}
            </GlobalLayout>
            <GlobalGenerationBanner /> {/* ✅ BANNER BODYN LOPUSSA */}
          </body>
        </html>
      </GlobalGenerationProvider>
    </ClerkProvider>
  );
}
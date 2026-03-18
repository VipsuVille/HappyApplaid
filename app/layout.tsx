import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";
import GlobalLayout from '@/components/layout/GlobalLayout';
import { clerkAppearance } from '@/lib/clerkAppearance';
import { GenerationProvider } from '@/context/GenerationContext';
import GlobalGenerationBanner from '@/components/GlobalGenerationBanner';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Inter, Barlow_Condensed, Barlow } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-barlow-condensed',
});

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-barlow',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${inter.className} ${barlowCondensed.variable} ${barlow.variable} bg-gray-900`}
          suppressHydrationWarning
        >
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
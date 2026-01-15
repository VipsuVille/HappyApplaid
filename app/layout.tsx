// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalLayout from '@/components/layout/GlobalLayout';
import { clerkAppearance } from '@/lib/clerkAppearance';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en">
        <body className={`${inter.className} bg-gray-900`} suppressHydrationWarning>
          <GlobalLayout>
            {children}
          </GlobalLayout>
        </body>
      </html>
    </ClerkProvider>
  );
}
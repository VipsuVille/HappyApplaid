//app/layout.tsx

import { ClerkProvider } from "@clerk/nextjs";
import type { Appearance } from "@clerk/types";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/context/LanguageContext";

const inter = Inter({ subsets: ["latin"] });

const clerkAppearance: Appearance = {
  elements: {
    formButtonPrimary: 
      "bg-blue-500 hover:bg-blue-600 text-sm normal-case",
    card: 
      "bg-white shadow-xl rounded-xl border-0",
    headerTitle: 
      "text-2xl font-bold text-gray-900",
    headerSubtitle: 
      "text-base text-gray-600",
    socialButtonsBlockButton: 
      "border border-gray-300 hover:bg-gray-50",
    socialButtonsBlockButtonText: 
      "text-gray-600 font-medium",
    formFieldInput: 
      "rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500",
    footerActionLink: 
      "text-blue-500 hover:text-blue-600 font-medium",
    formFieldLabel: 
      "text-gray-700 font-medium",
    dividerLine: 
      "bg-gray-200",
    dividerText: 
      "text-gray-500",
  },
  
  layout: {
    socialButtonsPlacement: "bottom",
    logoPlacement: "inside",
   // logoImageUrl: "/your-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
    >
      <html lang="fi">
      <LanguageProvider>
      
      <body className={`${inter.className} bg-slate-200`}>{children}<Toaster position="top-center" /></body>
      </LanguageProvider>
      </html>
    </ClerkProvider>
  );
}
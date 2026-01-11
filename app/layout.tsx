// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/theme.css";
import GlobalLayout from '@/components/layout/GlobalLayout';

const inter = Inter({ subsets: ["latin"] });

const clerkAppearance = {
  layout: {
    socialButtonsPlacement: "bottom" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  elements: {
    card: "bg-white rounded-3xl shadow-2xl border-2 border-gray-100",
    headerTitle: "text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent",
    headerSubtitle: "text-gray-600",
    formButtonPrimary: 
      "bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all",
    formFieldInput: 
      "rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition-all",
    formFieldLabel: "text-gray-700 font-medium",
    footer: "hidden",
    footerActionLink: "text-indigo-600 hover:text-indigo-700 font-semibold",
    socialButtonsBlockButton: 
      "border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl transition-all",
    socialButtonsBlockButtonText: "font-medium text-gray-700",
    dividerLine: "bg-gray-200",
    dividerText: "text-gray-500",
    footerActionText: "text-gray-600",
    formResendCodeLink: "text-indigo-600 hover:text-indigo-700 font-medium",
    otpCodeFieldInput: "border-2 border-gray-200 focus:border-indigo-400 rounded-xl",
  },
  variables: {
    colorPrimary: "#6366f1",
    colorDanger: "#ef4444",
    colorSuccess: "#22c55e",
    colorWarning: "#f59e0b",
    borderRadius: "0.75rem",
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en">
        <body className={`${inter.className} bg-slate-200`} suppressHydrationWarning>
          <GlobalLayout>
            {children}
          </GlobalLayout>
        </body>
      </html>
    </ClerkProvider>
  );
}
//components/ui/Header.tsx
"use client";

import { ClerkLoaded, UserButton, useUser } from "@clerk/nextjs";
import { AuthButtons } from "@/components/ui/AuthButtons";
import Link from "next/link";
import { useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";

const glassStyle =
  "backdrop-blur-md bg-white/10 border-b border-white/20 shadow-lg";

function Header({ isLoading }: { isLoading: boolean }) {
  const { isLoaded, isSignedIn } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language, toggleLanguage } = useLanguage();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  if (!isLoaded) {
    return (
      <header className={`fixed top-0 left-0 w-full z-50 ${glassStyle}`}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            InstaHired
          </Link>

          <Link href="/settings" className="text-sm hover:underline">
            Asetukset
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className={`fixed top-0 left-0 w-full z-50 ${glassStyle}`}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          InstaHired
        </Link>

        <div className="hidden md:flex items-center gap-4">
          <Button
            onClick={toggleLanguage}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            aria-label="Toggle language"
          >
            <Languages className="h-5 w-5" />
            <span className="sr-only">Toggle language</span>
          </Button>

          {!isSignedIn ? (
            <AuthButtons />
          ) : (
            <>
              <nav className="flex gap-6">
                <Link href="/" className="hover:text-blue-500 text-white">
                  {language === "en" ? "Home" : "Etusivu"}
                </Link>
                <Link href="/my-cvs" className="hover:text-blue-500 text-white">
                  {language === "en" ? "My CVs" : "Omat CV:t"}
                </Link>
                <Link
                  href="/profile"
                  className="hover:text-blue-500 text-white"
                >
                  {language === "en" ? "Profile" : "Oma profiili"}
                </Link>
              </nav>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10",
                  },
                }}
              />
            </>
          )}
        </div>

        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-2 focus:outline-none text-white"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-lg w-full absolute top-16 left-0 shadow-lg p-4">
          {isSignedIn ? (
            <>
              <nav className="flex flex-col gap-4 mb-4">
                <Link
                  href="/"
                  className="hover:text-blue-500"
                  onClick={toggleMobileMenu}
                >
                  {language === "en" ? "Home" : "Etusivu"}
                </Link>
                <Link
                  href="/my-cvs"
                  className="hover:text-blue-500"
                  onClick={toggleMobileMenu}
                >
                  {language === "en" ? "My CVs" : "Omat CV:t"}
                </Link>
                <Link
                  href="/profile"
                  className="hover:text-blue-500"
                  onClick={toggleMobileMenu}
                >
                  {language === "en" ? "Profile" : "Oma profiili"}
                </Link>
              </nav>
              <div className="pt-4 border-t border-gray-200">
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10",
                    },
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex justify-center">
                <Button
                  onClick={toggleLanguage}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Languages className="h-5 w-5" />
                  {language === "en" ? "FI" : "EN"}
                </Button>
              </div>
              <AuthButtons />
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-green-500 to-blue-500 animate-slide"></div>
      )}
    </header>
  );
}

export default Header;

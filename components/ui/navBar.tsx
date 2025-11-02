// components/ui/navBar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, SignInButton, SignOutButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import {
  FileText,
  Menu,
  X,
  Home,
  FileEdit,
  User as UserIcon,
  Settings,
  Crown,
  LogOut,
} from 'lucide-react';

interface NavbarProps {
  isPremium?: boolean;
  tokens?: number;
  hasUsedFreeCv?: boolean;
  loading?: boolean;
  showAuthButtons?: boolean; // Näytä Sign In/Out napit
}

export default function UniversalNavbar({
  isPremium = false,
  tokens = 0,
  hasUsedFreeCv = false,
  loading = false,
  showAuthButtons = true,
}: NavbarProps) {
  const { user, isSignedIn } = useUser();
  const { language } = useLanguage();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDevelopmentMode = process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true';

  // Navigaatiolinkit
  const navLinks = [
    {
      href: '/',
      label: language === 'en' ? 'Home' : 'Etusivu',
      icon: Home,
      show: true,
    },
    {
      href: '/my-cvs',
      label: language === 'en' ? 'CVs' : 'CV:t',
      icon: FileText,
      show: isSignedIn,
    },
    {
      href: '/my-cover-letters',
      label: language === 'en' ? 'Cover Letters' : 'Hakukirjeet',
      icon: FileEdit,
      show: isSignedIn && isPremium,
    },
    {
      href: '/profile',
      label: language === 'en' ? 'Profile' : 'Profiili',
      icon: UserIcon,
      show: isSignedIn,
    },
    {
      href: '/settings',
      label: language === 'en' ? 'Settings' : 'Asetukset',
      icon: Settings,
      show: true,
    },
  ];

  // Sulje mobiilimenu kun klikataan linkkiä
  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  // Tarkista onko linkki aktiivinen
  const isActive = (href: string) => {
    return pathname === href;
  };

  return (
    <header className="bg-white/90 backdrop-blur-lg shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:inline">
              HappyApplaid
            </span>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks
              .filter((link) => link.show)
              .map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`flex items-center gap-2 ${
                        isActive(link.href)
                          ? 'text-indigo-600 bg-indigo-50'
                          : 'text-gray-600 hover:text-indigo-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden lg:inline">{link.label}</span>
                    </Button>
                  </Link>
                );
              })}
          </nav>

          {/* USER INFO & ACTIONS */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* PREMIUM/FREE BADGE */}
            {!loading && isSignedIn && (
              <>
                {isPremium ? (
                  <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 px-3 py-1.5 rounded-full shadow-sm">
                    <Crown className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs sm:text-sm font-semibold text-yellow-800">
                      Premium ({tokens})
                    </span>
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-300 px-2 sm:px-3 py-1.5 rounded-full shadow-sm">
                    <span className="text-xs sm:text-sm font-semibold text-gray-700">
                      {hasUsedFreeCv
                        ? language === 'en'
                          ? 'Free Used'
                          : 'Käytetty'
                        : language === 'en'
                        ? '1 Free CV'
                        : '1 Ilmainen'}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* USER NAME (Desktop only) */}
            {isSignedIn && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                <UserIcon className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {user?.firstName}
                </span>
              </div>
            )}

            {/* AUTH BUTTONS (Desktop) */}
            {showAuthButtons && isDevelopmentMode && (
              <div className="hidden md:block">
                {isSignedIn ? (
                  <SignOutButton>
                    <Button variant="outline" size="sm">
                      <LogOut className="h-4 w-4 mr-2" />
                      {language === 'en' ? 'Sign Out' : 'Kirjaudu ulos'}
                    </Button>
                  </SignOutButton>
                ) : (
                  <SignInButton mode="modal">
                    <Button variant="outline" size="sm">
                      {language === 'en' ? 'Sign In' : 'Kirjaudu sisään'}
                    </Button>
                  </SignInButton>
                )}
              </div>
            )}

            {/* MOBILE MENU BUTTON */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2 animate-in slide-in-from-top">
            {/* User Info Mobile */}
            {isSignedIn && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg mb-4">
                <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.firstName?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-600">
                    {isPremium ? (
                      <span className="text-yellow-600">
                        ⭐ Premium ({tokens} tokens)
                      </span>
                    ) : (
                      <span className="text-gray-600">
                        {hasUsedFreeCv
                          ? language === 'en'
                            ? 'Free CV Used'
                            : 'Ilmainen CV käytetty'
                          : language === 'en'
                          ? '1 Free CV Available'
                          : '1 Ilmainen CV käytettävissä'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Links Mobile */}
            {navLinks
              .filter((link) => link.show)
              .map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive(link.href)
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                );
              })}

            {/* Auth Buttons Mobile */}
            {showAuthButtons && isDevelopmentMode && (
              <div className="pt-4 border-t border-gray-200 mt-4">
                {isSignedIn ? (
                  <SignOutButton>
                    <button
                      onClick={handleLinkClick}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                    >
                      <LogOut className="h-5 w-5" />
                      {language === 'en' ? 'Sign Out' : 'Kirjaudu ulos'}
                    </button>
                  </SignOutButton>
                ) : (
                  <SignInButton mode="modal">
                    <button
                      onClick={handleLinkClick}
                      className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      {language === 'en' ? 'Sign In' : 'Kirjaudu sisään'}
                    </button>
                  </SignInButton>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
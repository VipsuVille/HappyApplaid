// components/ui/smartHeader.tsx - KORJATTU

'use client';

import { useEffect, useState } from 'react';
import { SignOutButton, useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext'; // ✅ UUSI CONTEXT!
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
  Languages,
  ChevronDown,
} from 'lucide-react';

interface SmartHeaderProps {
  isLoading?: boolean;
  showAuthButtons?: boolean;
}

export default function SmartHeader({
  isLoading = false,
  showAuthButtons = true,
}: SmartHeaderProps) {
  const { user, isSignedIn, isLoaded } = useUser();
  const { language, toggleLanguage } = useLanguage();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // ✅ KÄYTÄ UUTTA CONTEXT HOOKIA
  const { subscription, isLoading: subscriptionLoading } = useSubscription();

  const isDevelopmentMode = process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true';

  // ✅ PUHDAS DATA CONTEXTISTA
  const isPremium = subscription?.is_premium || false;
  const tokens = subscription?.tokens || 0;
  const plan = subscription?.plan_type || 'free';

  // Debug-lokit
  useEffect(() => {
    console.log("📱 SmartHeader State:", {
      isSignedIn,
      subscriptionLoading,
      isPremium,
      plan,
      tokens,
    });
  }, [isSignedIn, subscriptionLoading, isPremium, plan, tokens]);

  // Navigation links
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

  const isActive_route = (href: string) => pathname === href;
  const handleLinkClick = () => setMobileMenuOpen(false);

  // Loading skeleton
  if (!isLoaded || (isSignedIn && subscriptionLoading)) {
    return (
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
            <div className="flex gap-2">
              <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
              <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
         
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xl font-bold hidden sm:inline relative h-20 w-60">
              <Image
                src="/logo.png"
                alt="Yrityksen logo"
                fill
                style={{ objectFit: "contain"}}
                priority
              />
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
                        isActive_route(link.href)
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

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-2 sm:gap-3">
           
            {/* Language Toggle */}
            <Button
              onClick={toggleLanguage}
              variant="ghost"
              size="sm"
              className="hidden sm:flex items-center gap-2"
              title={language === 'en' ? 'Vaihda suomeksi' : 'Switch to English'}
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs">{language === 'en' ? 'FI' : 'EN'}</span>
            </Button>

            {/* PREMIUM/FREE BADGE */}
            {isSignedIn && !subscriptionLoading && (
              <>
                {isPremium ? (
                  <Link href="/pricing">
                    <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer">
                      <Crown className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs sm:text-sm font-semibold text-yellow-800">
                        {plan.charAt(0).toUpperCase() + plan.slice(1)} ({tokens})
                      </span>
                    </div>
                  </Link>
                ) : (
                  <Link href="/pricing">
                    <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-300 px-2 sm:px-3 py-1.5 rounded-full shadow-sm hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer">
                      <span className="text-xs sm:text-sm font-semibold text-gray-700">
                        {language === 'en' ? '🔒 Free Plan' : '🔒 Ilmainen'}
                      </span>
                    </div>
                  </Link>
                )}
              </>
            )}

            {/* User Menu */}
            {isSignedIn && (
              <div className="hidden sm:block relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <UserIcon className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {user?.firstName}
                  </span>
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="border-t border-gray-100 my-1" />
                    <SignOutButton>
                      <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <LogOut className="h-4 w-4" />
                        {language === 'en' ? 'Sign Out' : 'Kirjaudu ulos'}
                      </button>
                    </SignOutButton>
                  </div>
                )}
              </div>
            )}

            {/* Auth Buttons */}
            {showAuthButtons && isDevelopmentMode && !isSignedIn && (
              <div className="hidden md:flex gap-2">
                <Link href="/sign-in">
                  <Button variant="outline" size="sm">
                    {language === 'en' ? 'Sign In' : 'Kirjaudu'}
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
           
            {/* User Info Card */}
            {isSignedIn && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl mb-4 border border-indigo-100">
                <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {user?.firstName?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {isPremium ? (
                      <span className="text-yellow-600 font-semibold">
                        ⭐ {plan.charAt(0).toUpperCase() + plan.slice(1)} • {tokens} tokens
                      </span>
                    ) : (
                      <Link href="/pricing">
                        <span className="text-indigo-600 font-semibold cursor-pointer hover:underline">
                          🔒 {language === 'en' ? 'Upgrade' : 'Päivitä'}
                        </span>
                      </Link>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Language Toggle */}
            <button
              onClick={() => {
                toggleLanguage();
                handleLinkClick();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all border border-blue-200"
            >
              <Languages className="h-5 w-5 text-indigo-600" />
              <span className="font-semibold text-gray-800">
                {language === 'en' ? 'Suomeksi 🇫🇮' : 'English 🇬🇧'}
              </span>
            </button>

            {/* Navigation Links */}
            <div className="space-y-1">
              {navLinks
                .filter((link) => link.show)
                .map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={handleLinkClick}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive_route(link.href)
                          ? 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 font-semibold border border-indigo-200'
                          : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  );
                })}
            </div>

            {/* Sign Out */}
            {showAuthButtons && isDevelopmentMode && isSignedIn && (
              <div className="pt-4 border-t border-gray-200 mt-4">
                <SignOutButton>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-50 to-pink-50 text-red-600 rounded-xl hover:from-red-100 hover:to-pink-100 transition-all font-semibold border border-red-200">
                    <LogOut className="h-5 w-5" />
                    {language === 'en' ? 'Sign Out' : 'Kirjaudu ulos'}
                  </button>
                </SignOutButton>
              </div>
            )}

            {/* Sign In */}
            {showAuthButtons && isDevelopmentMode && !isSignedIn && (
              <div className="pt-4 border-t border-gray-200 mt-4">
                <Link href="/sign-in" onClick={handleLinkClick}>
                  <button className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-md">
                    {language === 'en' ? 'Sign In' : 'Kirjaudu sisään'}
                  </button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute bottom-0 left-0 w-full h-1">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse" />
          </div>
        )}
      </div>
    </header>
  );
}


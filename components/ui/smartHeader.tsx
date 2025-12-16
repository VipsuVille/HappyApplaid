// components/ui/smartHeader.tsx - TÄYSIN UUSITTU

'use client';

import { useEffect, useState } from 'react';
import { SignedOut, SignInButton, SignOutButton, useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
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
  FileBox,
  Book,
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

  const { subscription, isLoading: subscriptionLoading } = useSubscription();

  const isPremium = subscription?.is_premium || false;
  const tokens = subscription?.tokens || 0;
  const plan = subscription?.plan_type || 'free';

  // Navigation links (only for logged in users)
  const navLinks = [
    {
      href: '/',
      label: language === 'en' ? 'Home' : 'Etusivu',
      icon: Home,
    },
    {
      href: '/my-cvs',
      label: language === 'en' ? 'CVs' : 'CV:t',
      icon: FileText,
    },
    {
      href: '/my-cover-letters',
      label: language === 'en' ? 'Letters' : 'Kirjeet',
      icon: FileEdit,
    },
{href: '/profile/responses',
  label: language === 'en' ? "Answers" : 'Vastaukset',
  icon: Book,
},
    {
      href: '/profile',
      label: language === 'en' ? 'Profile' : 'Profiili',
      icon: UserIcon,
    },
  ];

  const isActive = (href: string) => pathname === href;
  const handleLinkClick = () => setMobileMenuOpen(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setProfileMenuOpen(false);
    };
    if (profileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [profileMenuOpen]);

  // Loading skeleton
  if (!isLoaded) {
    return (
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
            <div className="flex gap-2">
              <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
        </div>
      </header>
    );
  }

if (!isSignedIn) {
  return (
    <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* LOGO */}
          <Link href="/" className="flex items-center">
            <div className="relative h-12 w-40 sm:h-14 sm:w-48">
              <Image
                src="/logo.png"
                alt="HappyApplaid"
                fill
                style={{ objectFit: "contain" }}
                priority
              />
            </div>
          </Link>

          {/* RIGHT SIDE - Language + Sign In */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Language Toggle */}
            <Button
              onClick={toggleLanguage}
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5 sm:gap-2"
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-medium">
                {language === 'en' ? 'FI' : 'EN'}
              </span>
            </Button>

            {/* Sign In Button - KORJATTU */}
            <SignedOut>
              <SignInButton mode="modal">
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-sm hover:shadow-md transition-all"
                >
                  {language === 'en' ? 'Sign In' : 'Kirjaudu'}
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>
    </header>
  );
}
  // ========================================
  // SIGNED IN - Full Navigation
  // ========================================
  return (
<header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
         
          {/* LOGO */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <div className="relative h-12 w-32 sm:h-14 sm:w-40">
              <Image
                src="/logo.png"
                alt="HappyApplaid"
                fill
                style={{ objectFit: "contain" }}
                priority
              />
            </div>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
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

          {/* RIGHT SIDE */}
            <div className="flex items-center gap-2 sm:gap-3">           
            {/* Language Toggle (Desktop) */}
            <Button
              onClick={toggleLanguage}
              variant="ghost"
              size="sm"
              className="hidden sm:flex items-center gap-2"
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs">{language === 'en' ? 'FI' : 'EN'}</span>
            </Button>

            {/* PREMIUM/FREE BADGE (Desktop) */}
            {!subscriptionLoading && (
              <>
                {isPremium ? (
                  <Link href="/pricing">
                    <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer">
                      <Crown className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs font-semibold text-yellow-800">
                        {plan.toUpperCase()}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <Link href="/pricing">
                    <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-full shadow-sm hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer">
                      <span className="text-xs font-semibold text-gray-700">
                        {language === 'en' ? 'Free' : 'Ilmainen'}
                      </span>
                    </div>
                  </Link>
                )}
              </>
            )}

            {/* User Menu (Desktop) */}
            <div className="hidden sm:block relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileMenuOpen(!profileMenuOpen);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <div className="h-6 w-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user?.firstName?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">
                  {user?.firstName}
                </span>
                <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <Link href="/settings" onClick={() => setProfileMenuOpen(false)}>
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      {language === 'en' ? 'Settings' : 'Asetukset'}
                    </button>
                  </Link>
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
       {/* MOBILE MENU */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-3">
           
            {/* User Info Card */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200">
              {/* ... (User avatar ja nimi) ... */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                    {/* 🚨 KORJAUS 2: Lisää lataustilan tarkistus mobiilimenuun */}
                    {subscriptionLoading ? (
                        <span className="text-gray-500 font-semibold">
                            {language === 'en' ? 'Loading status...' : 'Ladataan tilaa...'}
                        </span>
                    ) : isPremium ? (
                    <span className="text-yellow-600 font-semibold">
                      ⭐ {plan.toUpperCase()}
                    </span>
                  ) : (
                    <Link href="/pricing">
                      <span className="text-indigo-600 font-semibold cursor-pointer hover:underline">
                        {language === 'en' ? '🔒 Upgrade' : '🔒 Päivitä'}
                      </span>
                    </Link>
                  )}
                </p>
              </div>
            </div>

            {/* Language Toggle */}
            <button
              onClick={() => {
                toggleLanguage();
                handleLinkClick();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl hover:from-blue-100 hover:to-indigo-100 transition-all border border-blue-200"
            >
              <Languages className="h-5 w-5 text-indigo-600" />
              <span className="font-semibold text-gray-800">
                {language === 'en' ? 'Suomeksi 🇫🇮' : 'English 🇬🇧'}
              </span>
            </button>

            {/* Navigation Links */}
            <div className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                      isActive(link.href)
                        ? 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 font-semibold border-2 border-indigo-300'
                        : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                );
              })}

              {/* Settings Link */}
              <Link
                href="/settings"
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  isActive('/settings')
                    ? 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 font-semibold border-2 border-indigo-300'
                    : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent'
                }`}
              >
                <Settings className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{language === 'en' ? 'Settings' : 'Asetukset'}</span>
              </Link>
            </div>

            {/* Sign Out */}
            <div className="pt-2 border-t border-gray-200">
              <SignOutButton>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-50 to-pink-50 text-red-600 rounded-2xl hover:from-red-100 hover:to-pink-100 transition-all font-semibold border-2 border-red-200">
                  <LogOut className="h-5 w-5" />
                  {language === "en" ? 'Sign Out' : 'Kirjaudu ulos'}
                </button>
              </SignOutButton>
            </div>
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
// components/ui/smartHeader.tsx
'use client';

import { useEffect, useState } from 'react';
import { SignOutButton, useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
  Languages,
  ChevronDown,
} from 'lucide-react';

// ===================================
// TYPES
// ===================================
interface FreemiumStatus {
  is_premium: boolean;
  tokens: number;
  has_used_free_cv: false;
  can_create_cv: boolean;
  plan_type: 'free' | 'premium';
  cv_count: number;
}

interface SmartHeaderProps {
  isLoading?: boolean;
  showAuthButtons?: boolean;
  serverFreemiumStatus?: FreemiumStatus | null;
}

// ===================================
// SMART HEADER COMPONENT
// ===================================
export default function SmartHeader({ 
  isLoading = false,
  showAuthButtons = true,
  serverFreemiumStatus = null,
}: SmartHeaderProps) {
  const { user, isSignedIn, isLoaded } = useUser();
  const { language, toggleLanguage } = useLanguage();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [clientStatus, setClientStatus] = useState<FreemiumStatus>({
    is_premium: false,
    tokens: 0,
    has_used_free_cv: false,
    can_create_cv: true,
    plan_type: 'free',
    cv_count: 0,
  });
  const [statusLoading, setStatusLoading] = useState(true);

  const isDevelopmentMode = process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true';

  const freemiumStatus = serverFreemiumStatus || clientStatus;
  const isPremium = freemiumStatus.is_premium;
  const tokens = freemiumStatus.tokens;
  const hasUsedFreeCv = freemiumStatus.has_used_free_cv;

  // ===================================
  // FETCH STATUS
  // ===================================
  useEffect(() => {
    if (serverFreemiumStatus) {
      setStatusLoading(false);
      return;
    }

    if (!isSignedIn || !user?.id) {
      setStatusLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        setStatusLoading(true);
        const response = await fetch('/api/check-subscription');
        
        if (response.ok) {
          const data: FreemiumStatus = await response.json();
          setClientStatus(data);
        }
      } catch (error) {
        console.error('Error fetching freemium status:', error);
      } finally {
        setStatusLoading(false);
      }
    };

    fetchStatus();
  }, [isSignedIn, user?.id, serverFreemiumStatus]);

  // ===================================
  // NAVIGATION LINKS
  // ===================================
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

  const isActive = (href: string) => pathname === href;
  const handleLinkClick = () => setMobileMenuOpen(false);

  // ===================================
  // LOADING SKELETON
  // ===================================
  if (!isLoaded || (isSignedIn && statusLoading && !serverFreemiumStatus)) {
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

  // ===================================
  // MAIN RENDER
  // ===================================
  return (
    <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
         {/* ===================================
    LOGO
    =================================== */}
<Link href="/" className="flex items-center gap-2 flex-shrink-0">
    {/* Varsinainen LOGO (kuva) */}
    {/* Poista "bg-gradient-to-r... text-transparent" -luokat, sillä ne koskevat tekstiä */}
    <span className="text-xl font-bold hidden sm:inline relative h-20 w-60">
        <Image 
            src="/logo.png" // KORJAA POLKU: Olettaen, että kuva on public-kansiossa
            alt="Yrityksen logo" 
            fill // Käytä "fill" täyttämään vanhempi span-elementti
            style={{ objectFit: "contain"}} // Varmistaa, että kuva skaalautuu oikein
            priority // Usein logot ladataan nopeasti (vain jos tarpeellinen)
        />
    </span>
</Link>
          {/* ===================================
              DESKTOP NAVIGATION
              =================================== */}
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

          {/* ===================================
              RIGHT SIDE: USER INFO & ACTIONS
              =================================== */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Language Toggle (Desktop) */}
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

            {/* Premium/Free Badge (Desktop) */}
            {isSignedIn && !statusLoading && (
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
                        ? language === 'en' ? 'Free Used' : 'Käytetty'
                        : language === 'en' ? '1 Free CV' : '1 Ilmainen'}
                    </span>
                  </div>
                )}
              </>
            )}

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

            {/* Auth Buttons (Desktop) */}
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

        {/* ===================================
            MOBILE MENU
            =================================== */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2 animate-in slide-in-from-top duration-200">
            
            {/* User Info Card (Mobile) */}
            {isSignedIn && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl mb-4 border border-indigo-100">
                <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {user?.firstName?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {isPremium ? (
                      <span className="text-yellow-600 font-semibold">
                        ⭐ Premium • {tokens} tokens
                      </span>
                    ) : (
                     // ✅ TEE TÄSTÄ KLIKKAUTUVA:
  <Link href={hasUsedFreeCv ? "/pricing" : "/create-cv"}>
    <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-300 px-2 sm:px-3 py-1.5 rounded-full shadow-sm hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer">
      <span className="text-xs sm:text-sm font-semibold text-gray-700">
        {hasUsedFreeCv
          ? language === 'en' ? '🔒 Upgrade' : '🔒 Päivitä'
          : language === 'en' ? '1 Free CV' : '1 Ilmainen CV'}
      </span>
    </div>
  </Link>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Language Toggle (Mobile) */}
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

            {/* Navigation Links (Mobile) */}
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
                        isActive(link.href)
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

            {/* Sign Out Button (Mobile) */}
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

            {/* Sign In Button (Mobile) */}
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

        {/* ===================================
            LOADING INDICATOR
            =================================== */}
        {isLoading && (
          <div className="absolute bottom-0 left-0 w-full h-1">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse" />
          </div>
        )}
      </div>
    </header>
  );
}
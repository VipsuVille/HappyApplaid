'use client';

import { useEffect, useState } from 'react';
import { SignInButton, SignOutButton, useUser } from '@clerk/nextjs';
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

  if (!isLoaded) {
    return (
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
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
            <span className="text-xl font-bold hidden sm:inline relative h-20 w-40">
               {/* Huom: Varmista että kuva löytyy polusta /logo.png */}
               <div className="flex items-center h-full text-indigo-600 font-bold text-2xl">
                  HappyApplaid
               </div>
            </span>
          </Link>

          {/* DESKTOP NAVIGATION (Vain kirjautuneille) */}
          {isSignedIn && (
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
          )}

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Language Toggle */}
            <Button
              onClick={toggleLanguage}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
              title={language === 'en' ? 'Vaihda suomeksi' : 'Switch to English'}
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs">{language === 'en' ? 'FI' : 'EN'}</span>
            </Button>

            {/* KIRJAUTUMATON: Vain Sign In */}
            {!isSignedIn && showAuthButtons && (
              <div className="hidden md:block">
                <SignInButton mode="modal">
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md">
                    {language === 'en' ? 'Sign In' : 'Kirjaudu'}
                  </Button>
                </SignInButton>
              </div>
            )}

            {/* KIRJAUTUNUT: Premium Badge & User Menu */}
            {isSignedIn && (
              <>
                {!subscriptionLoading && (
                  <>
                    {isPremium ? (
                      <Link href="/pricing">
                        <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer">
                          <Crown className="h-4 w-4 text-yellow-600" />
                          <span className="text-xs sm:text-sm font-semibold text-yellow-800">
                            {plan.charAt(0).toUpperCase() + plan.slice(1)}
                          </span>
                        </div>
                      </Link>
                    ) : (
                      <Link href="/pricing">
                        <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-full shadow-sm hover:bg-gray-100 transition-all cursor-pointer">
                          <span className="text-xs sm:text-sm font-semibold text-gray-700">
                            {language === 'en' ? 'Free Plan' : 'Ilmainen'}
                          </span>
                        </div>
                      </Link>
                    )}
                  </>
                )}

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
                      <SignOutButton>
                        <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                          <LogOut className="h-4 w-4" />
                          {language === 'en' ? 'Sign Out' : 'Kirjaudu ulos'}
                        </button>
                      </SignOutButton>
                    </div>
                  )}
                </div>
              </>
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
          <div className="md:hidden border-t border-gray-200 py-4 space-y-4">
            
            {/* Kirjautumaton mobiili */}
            {!isSignedIn && (
              <div className="space-y-3 px-2">
                <SignInButton mode="modal">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                    {language === 'en' ? 'Sign In' : 'Kirjaudu sisään'}
                  </Button>
                </SignInButton>
              </div>
            )}

            {/* Kirjautunut mobiili */}
            {isSignedIn && (
              <>
                <div className="px-4 py-2 bg-gray-50 rounded-lg mx-2">
                  <p className="font-bold text-gray-900">{user?.fullName}</p>
                  <p className="text-xs text-gray-500">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
                <div className="space-y-1">
                  {navLinks.filter(l => l.show).map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                          isActive_route(link.href) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
                <div className="px-2">
                  <SignOutButton>
                    <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                      {language === 'en' ? 'Sign Out' : 'Kirjaudu ulos'}
                    </Button>
                  </SignOutButton>
                </div>
              </>
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
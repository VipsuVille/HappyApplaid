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
  Book,
} from 'lucide-react';

export default function SmartHeader() {
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const { user, isSignedIn, isLoaded: isClerkLoaded } = useUser();
  const { language, toggleLanguage } = useLanguage();
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const plan = subscription?.plan_type;

  useEffect(() => {
    if (!profileMenuOpen) return;

    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-profile-menu]')) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [profileMenuOpen]);

  // LOADING
  if (!isClerkLoaded || isSubscriptionLoading) {
    return <header className="h-16 bg-black/80 backdrop-blur-xl border-b border-white/10" />;
  }

  // SIGNED OUT
  if (!isSignedIn) {
    return (
      <header className="bg-black/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <Link href="/">
            <Image src="/logo.png" alt="HappyApplaid" width={150} height={40} />
          </Link>

          <div className="flex gap-2">
            <Button 
              onClick={toggleLanguage} 
              variant="ghost" 
              size="sm"
              className="bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10"
            >
              <Languages className="w-4 h-4 mr-1" />
              {language === 'en' ? 'FI' : 'EN'}
            </Button>

            <SignedOut>
              <SignInButton mode="modal">
                <Button 
                  size="sm"
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white border-none"
                >
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </header>
    );
  }

  // SIGNED IN
  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/my-cvs', label: 'CVs', icon: FileText },
    { href: '/my-cover-letters', label: 'Letters', icon: FileEdit },
    { href: '/profile/responses', label: 'Answers', icon: Book },
    { href: '/profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <header className="bg-black/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center relative">

        {/* LOGO */}
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="HappyApplaid" width={150} height={40} />
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Button
                variant="ghost"
                size="sm"
                className={
                  pathname === href 
                    ? 'text-orange-400 bg-orange-500/20 border border-orange-400/30' 
                    : 'text-gray-300 hover:text-orange-300 hover:bg-white/5'
                }
              >
                <Icon className="w-4 h-4 mr-1" />
                {label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-2 relative">

          {/* PLAN BADGE */}
          {plan && (
            <Link href="/pricing" className="hidden sm:block">
              <div className="flex items-center gap-2 bg-amber-500/20 backdrop-blur-md border border-amber-400/30 px-3 py-1.5 rounded-full">
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">
                  {plan.toUpperCase()}
                </span>
              </div>
            </Link>
          )}

          {/* PROFILE */}
          <div data-profile-menu className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                {user?.firstName?.[0] ?? 'U'}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-300" />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-12 w-48 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50">
                <Link href="/settings">
                  <button className="w-full px-4 py-2 text-sm text-left text-gray-200 hover:bg-white/5 flex items-center gap-2 rounded-t-lg">
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </Link>

                <SignOutButton>
                  <button className="w-full px-4 py-2 text-sm text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2 rounded-b-lg">
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </SignOutButton>
              </div>
            )}
          </div>

          {/* MOBILE TOGGLE */}
          <button
            className="md:hidden text-gray-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl z-40">
          <nav className="flex flex-col p-4 gap-2">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-white/5 hover:text-orange-300 transition-colors">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </div>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
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
  // 🔒 HOOKIT AINA ENSIN
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const { user, isSignedIn, isLoaded: isClerkLoaded } = useUser();
  const { language, toggleLanguage } = useLanguage();
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const plan = subscription?.plan_type;

  // 🔒 Sulje profiilimenu klikatessa ulos
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

  // 🔄 LOADING
  if (!isClerkLoaded || isSubscriptionLoading) {
    return <header className="h-16 bg-white/80 border-b" />;
  }

  // 🚪 SIGNED OUT
  if (!isSignedIn) {
    return (
      <header className="bg-white/80 backdrop-blur border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <Link href="/">
            <Image src="/logo.png" alt="HappyApplaid" width={150} height={40} />
          </Link>

          <div className="flex gap-2">
            <Button onClick={toggleLanguage} variant="ghost" size="sm">
              <Languages className="w-4 h-4 mr-1" />
              {language === 'en' ? 'FI' : 'EN'}
            </Button>

            <SignedOut>
              <SignInButton mode="modal">
                <Button size="sm">Sign In</Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </header>
    );
  }

  // 🔐 SIGNED IN
  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/my-cvs', label: 'CVs', icon: FileText },
    { href: '/my-cover-letters', label: 'Letters', icon: FileEdit },
    { href: '/profile/responses', label: 'Answers', icon: Book },
    { href: '/profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <header className="bg-white/80 backdrop-blur border-b sticky top-0 z-50">
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
                className={pathname === href ? 'text-indigo-600 bg-indigo-50' : ''}
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
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 px-3 py-1.5 rounded-full">
                <Crown className="w-4 h-4 text-yellow-600" />
                <span className="text-xs font-semibold text-yellow-800">
                  {plan.toUpperCase()}
                </span>
              </div>
            </Link>
          )}

          {/* PROFILE */}
          <div data-profile-menu className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full"
            >
              <div className="w-6 h-6 bg-indigo-600 text-white rounded-full text-xs flex items-center justify-center">
                {user?.firstName?.[0] ?? 'U'}
              </div>
              <ChevronDown className="w-4 h-4" />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-12 w-48 bg-white border rounded-lg shadow-md z-50">
                <Link href="/settings">
                  <button className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50">
                    <Settings className="w-4 h-4 inline mr-2" />
                    Settings
                  </button>
                </Link>

                <SignOutButton>
                  <button className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50">
                    <LogOut className="w-4 h-4 inline mr-2" />
                    Sign out
                  </button>
                </SignOutButton>
              </div>
            )}
          </div>

          {/* MOBILE TOGGLE */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-t shadow-lg z-40">
          <nav className="flex flex-col p-4 gap-2">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100">
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

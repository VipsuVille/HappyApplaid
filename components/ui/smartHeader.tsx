'use client';

import { useEffect, useState } from 'react';
import { SignInButton, SignUpButton, SignOutButton, useUser } from '@clerk/nextjs';
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
  ReceiptEuro,
  CircleDollarSign,
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
    setMobileMenuOpen(false);
  }, [pathname]);

  const t = {
    en: {
      home: 'Home',
      cvs: 'CVs',
      letters: 'Letters',
      answers: 'Answers',
      profile: 'Profile',
      pricing: 'Pricing',
      settings: 'Settings',
      signOut: 'Sign out',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      toggleLang: 'FI'
    },
    fi: {
      home: 'Koti',
      cvs: 'CV:t',
      letters: 'Kirjeet',
      answers: 'Vastaukset',
      profile: 'Profiili',
      pricing: 'Hinnasto',
      settings: 'Asetukset',
      signOut: 'Kirjaudu ulos',
      signIn: 'Kirjaudu',
      signUp: 'Rekisteröidy',
      toggleLang: 'EN'
    }
  }[language];

  useEffect(() => {
    if (!profileMenuOpen) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-profile-menu]')) setProfileMenuOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [profileMenuOpen]);

  if (!isClerkLoaded || isSubscriptionLoading) {
    return <header className="h-16 bg-black/80 backdrop-blur-xl border-b border-white/10" />;
  }

  const PricingIcon = language === 'fi' ? ReceiptEuro : CircleDollarSign;
  const pricingAnchor = pathname === '/' ? '#pricing' : '/#pricing';

  const navLinks = [
    { href: '/', label: t.home, icon: Home },
    { href: '/my-cvs', label: t.cvs, icon: FileText },
    { href: '/my-cover-letters', label: t.letters, icon: FileEdit },
    { href: '/profile/responses', label: t.answers, icon: Book },
    { href: '/profile', label: t.profile, icon: UserIcon },
    { href: '/pricing', label: t.pricing, icon: PricingIcon },
  ];

  return (
    <header className="bg-black/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center relative">
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="HappyApplaid" width={150} height={40} />
        </Link>

        {/* Desktop Navigation (Logged In) */}
        {isSignedIn && (
          <nav className="hidden md:flex gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={pathname === href ? 'text-orange-400 bg-orange-500/20 border border-orange-400/30' : 'text-gray-300 hover:text-orange-300 hover:bg-white/5'}
                >
                  <Icon className="w-4 h-4 mr-1" />
                  {label}
                </Button>
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {/* Pricing Link (Logged Out) */}
          {!isSignedIn && (
            <Link href={pricingAnchor} className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-orange-300">
                <PricingIcon className="w-4 h-4 mr-1" />
                {t.pricing}
              </Button>
            </Link>
          )}

          {/* Language Toggle (Logged Out Desktop) */}
          {!isSignedIn && (
            <Button onClick={toggleLanguage} variant="ghost" size="sm" className="hidden sm:flex bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10">
              <Languages className="w-4 h-4 mr-1" />
              {t.toggleLang}
            </Button>
          )}

          {/* Auth Buttons (Logged Out) */}
          {!isSignedIn ? (
            <div className="flex items-center gap-2">
              {/* Modal Sign In */}
              <SignInButton mode="modal">
                <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">
                  {t.signIn}
                </Button>
              </SignInButton>
              
              {/* Modal Sign Up */}
              <SignUpButton mode="modal">
                <Button size="sm" className="bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700">
                  {t.signUp}
                </Button>
              </SignUpButton>
            </div>
          ) : (
            /* Profile Menu (Logged In) */
            <div className="flex items-center gap-3">
              {plan && (
                <Link href="/pricing" className="hidden sm:block">
                  <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 px-3 py-1.5 rounded-full">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-300">{plan.toUpperCase()}</span>
                  </div>
                </Link>
              )}
              
              <div data-profile-menu className="relative">
                <button onClick={() => setProfileMenuOpen(!profileMenuOpen)} className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">
                  <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                    {user?.firstName?.[0] ?? 'U'}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-300" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-12 w-48 bg-gray-900/95 border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
                    <button onClick={toggleLanguage} className="w-full px-4 py-2 text-sm text-left text-gray-200 hover:bg-white/5 flex items-center gap-2">
                      <Languages className="w-4 h-4" />
                      {language === "en" ? "Suomeksi" : "In English"}
                    </button>
                    <Link href="/settings">
                      <button className="w-full px-4 py-2 text-sm text-left text-gray-200 hover:bg-white/5 flex items-center gap-2">
                        <Settings className="w-4 h-4" /> {t.settings}
                      </button>
                    </Link>
                    <SignOutButton>
                      <button className="w-full px-4 py-2 text-sm text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2 border-t border-white/5">
                        <LogOut className="w-4 h-4" /> {t.signOut}
                      </button>
                    </SignOutButton>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-gray-300 hover:bg-white/5 rounded-lg" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 border-b border-white/10 absolute top-16 left-0 w-full z-40 animate-in slide-in-from-top duration-200">
          <div className="flex flex-col p-4 gap-2">
            {isSignedIn ? (
              navLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-orange-300">
                    <Icon className="w-5 h-5 mr-3" />
                    {label}
                  </Button>
                </Link>
              ))
            ) : (
              <>
                <Link href="/">
                  <Button variant="ghost" className="w-full justify-start text-gray-300">
                    <Home className="w-5 h-5 mr-3" /> {t.home}
                  </Button>
                </Link>
                <Link href={pricingAnchor}>
                  <Button variant="ghost" className="w-full justify-start text-gray-300">
                    <PricingIcon className="w-5 h-5 mr-3" /> {t.pricing}
                  </Button>
                </Link>
                <Button onClick={toggleLanguage} variant="ghost" className="w-full justify-start text-gray-300">
                  <Languages className="w-5 h-5 mr-3" /> {language === 'en' ? 'Suomeksi' : 'English'}
                </Button>
                
                {/* Mobile Auth Buttons */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <SignInButton mode="modal">
                    <Button variant="ghost" className="w-full text-gray-300">
                      {t.signIn}
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white">
                      {t.signUp}
                    </Button>
                  </SignUpButton>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
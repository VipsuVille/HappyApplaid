'use client';

import { useEffect, useState } from 'react';
import { SignInButton, SignUpButton, SignOutButton, useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useTokens } from '@/hooks/useTokens';
import { clerkAppearance } from '@/lib/clerkAppearance';
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
  Sparkles,
} from 'lucide-react';

export default function SmartHeader() {
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const { user, isSignedIn, isLoaded: isClerkLoaded } = useUser();
  const { language, toggleLanguage } = useLanguage();
  const { tokens, plan_type, isLoading: tokensLoading } = useTokens();
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const plan = subscription?.plan_type || plan_type;

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
      toggleLang: 'EN',
      balance: 'Balance',
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
      toggleLang: 'FI',
      balance: 'Saldosi',
    },
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

  if (!isClerkLoaded || isSubscriptionLoading || tokensLoading) {
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
    <>
      <header className="bg-black/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex justify-between items-center relative">
          
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image src="/logo.png" alt="HappyApplaid" width={120} height={32} className="sm:w-[150px] sm:h-[40px]" />
          </Link>

          {/* Desktop Navigation (Logged In) */}
          {isSignedIn && (
            <nav className="hidden lg:flex gap-1 mx-4">
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
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Desktop Action Bar (Language + Auth/Profile) */}
            <div className="hidden lg:flex items-center gap-3">
              
              {/* Common Language Toggle for Desktop */}
              <Button
                onClick={toggleLanguage}
                variant="ghost"
                size="sm"
                className="bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10"
              >
                <Languages className="w-4 h-4 mr-1" />
                {t.toggleLang}
              </Button>

              {!isSignedIn ? (
                <>
                  <Link href={pricingAnchor}>
                    <Button variant="ghost" size="sm" className="text-gray-300 hover:text-orange-300">
                      <PricingIcon className="w-4 h-4 mr-1" />
                      {t.pricing}
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2">
                    <SignInButton mode="modal" appearance={clerkAppearance}>
                      <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">
                        {t.signIn}
                      </Button>
                    </SignInButton>
                    <SignUpButton mode="modal" appearance={clerkAppearance}>
                      <Button className="bg-gradient-to-r from-orange-500 to-amber-600 text-white">
                        {t.signUp}
                      </Button>
                    </SignUpButton>
                  </div>
                </>
              ) : (
                <>
                  {/* Token Balance */}
                  <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 px-3 py-1.5 rounded-full flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-white">{tokens.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-orange-500">TKN</span>
                    </div>
                  </div>

                  {/* Plan Badge */}
                  {plan && (
                    <Link href="/pricing">
                      <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 px-3 py-1.5 rounded-full hover:bg-amber-500/30 transition-colors">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-300">{plan.toUpperCase()}</span>
                      </div>
                    </Link>
                  )}

                  {/* Profile Menu (Language toggle removed from here) */}
                  <div data-profile-menu className="relative">
                    <button
                      onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                      className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                        {user?.firstName?.[0] ?? 'U'}
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-300" />
                    </button>

                    {profileMenuOpen && (
                      <div className="absolute right-0 top-12 w-48 bg-gray-900/95 border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
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
                </>
              )}
            </div>

            {/* Mobile: Hamburger Menu Toggle (Visible below lg) */}
            <button
              className="lg:hidden p-2 text-gray-300 hover:bg-white/5 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu (Visible below lg) */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-black/95 backdrop-blur-xl border-b border-white/10 absolute left-0 top-full w-screen -mx-3 sm:-mx-4 z-50 animate-in slide-in-from-top duration-200">
              <div className="flex flex-col p-4 gap-2">
                {isSignedIn ? (
                  <>
                    <div className="mb-2 p-3 bg-gray-900/60 rounded-lg border border-gray-800">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t.balance}</p>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-orange-400" />
                        <span className="text-xl font-black text-white">{tokens.toLocaleString()}</span>
                        <span className="text-xs font-bold text-orange-500">TKN</span>
                        {plan && (
                          <>
                            <div className="w-px h-5 bg-gray-700 mx-1" />
                            <Crown className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold text-amber-300">{plan.toUpperCase()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {navLinks.map(({ href, label, icon: Icon }) => (
                      <Link key={href} href={href}>
                        <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-orange-300">
                          <Icon className="w-5 h-5 mr-3" />
                          {label}
                        </Button>
                      </Link>
                    ))}

                    <div className="pt-2 border-t border-white/10 space-y-2">
                      <Button onClick={toggleLanguage} variant="ghost" className="w-full justify-start text-gray-300">
                        <Languages className="w-5 h-5 mr-3" />
                        {language === 'en' ? 'In English' : 'Suomeksi'}
                      </Button>
                      <Link href="/settings">
                        <Button variant="ghost" className="w-full justify-start text-gray-300">
                          <Settings className="w-5 h-5 mr-3" /> {t.settings}
                        </Button>
                      </Link>
                      <SignOutButton>
                        <Button className="w-full justify-start text-red-400 hover:text-red-300" variant="ghost">
                          <LogOut className="w-5 h-5 mr-3" /> {t.signOut}
                        </Button>
                      </SignOutButton>
                    </div>
                  </>
                ) : (
                  <>
                    <Link href="/">
                      <Button variant="ghost" className="w-full justify-start text-gray-300"><Home className="w-5 h-5 mr-3" /> {t.home}</Button>
                    </Link>
                    <Link href={pricingAnchor}>
                      <Button variant="ghost" className="w-full justify-start text-gray-300"><PricingIcon className="w-5 h-5 mr-3" /> {t.pricing}</Button>
                    </Link>
                    <Button onClick={toggleLanguage} variant="ghost" className="w-full justify-start text-gray-300">
                      <Languages className="w-5 h-5 mr-3" /> {language === 'en' ? 'English' : 'Suomeksi'}
                    </Button>
                    <div className="pt-2 border-t border-white/10 space-y-2">
                      <SignInButton mode="modal" appearance={clerkAppearance}>
                        <Button variant="ghost" className="w-full text-gray-300">{t.signIn}</Button>
                      </SignInButton>
                      <SignUpButton mode="modal" appearance={clerkAppearance}>
                        <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white">{t.signUp}</Button>
                      </SignUpButton>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
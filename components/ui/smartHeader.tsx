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
import { useTheme } from '@/context/ThemeContext';
import { clerkAppearance } from '@/lib/clerkAppearance';
import ThemeToggle from '@/components/ThemeToggle';
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
  Shield,
} from 'lucide-react';

export default function SmartHeader() {
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const { user, isSignedIn, isLoaded: isClerkLoaded } = useUser();
  const { language, toggleLanguage } = useLanguage();
  const { tokens, plan_type, isLoading: tokensLoading } = useTokens();
let isDark = false;
try {
  const theme = useTheme();
  isDark = theme?.isDark ?? false;
} catch (error) {
  isDark = false;
}  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const plan = subscription?.plan_type || plan_type;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const t = {
    en: {
      home: 'Home', cvs: 'CVs', letters: 'Letters', answers: 'Answers',
      profile: 'Profile', pricing: 'Pricing', settings: 'Settings',
      signOut: 'Sign out', signIn: 'Sign In', signUp: 'Sign Up',
      toggleLang: 'EN', balance: 'Balance', atsChecker: 'ATS Check',
    },
    fi: {
      home: 'Koti', cvs: 'CV:t', letters: 'Kirjeet', answers: 'Vastaukset',
      profile: 'Profiili', pricing: 'Hinnasto', settings: 'Asetukset',
      signOut: 'Kirjaudu ulos', signIn: 'Kirjaudu', signUp: 'Rekisteröidy',
      toggleLang: 'FI', balance: 'Saldosi', atsChecker: 'ATS Mittari',
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
    return <header className={`h-16 backdrop-blur-xl border-b ${isDark ? 'bg-black/80 border-white/10' : 'bg-white/80 border-gray-200'}`} />;
  }

  const PricingIcon = language === 'fi' ? ReceiptEuro : CircleDollarSign;
  const pricingAnchor = pathname === '/' ? '#pricing' : '/#pricing';

  // ── Nav-linkit: päälinkit ja toissijaiset ───────────────────────────────
  const primaryNavLinks = [
    { href: '/', label: t.home, icon: Home },
    { href: '/ats-checker', label: t.atsChecker, icon: Shield },
    { href: '/my-cvs', label: t.cvs, icon: FileText },
    { href: '/my-cover-letters', label: t.letters, icon: FileEdit },
    { href: '/profile/responses', label: t.answers, icon: Book },
  ];

  const secondaryNavLinks = [
    { href: '/profile', label: t.profile, icon: UserIcon },
    { href: '/pricing', label: t.pricing, icon: PricingIcon },
  ];

  const allNavLinks = [...primaryNavLinks, ...secondaryNavLinks];

  // ── Header-taustaluokat ─────────────────────────────────────────────────
  const headerBg = isDark
    ? 'bg-black/80 border-white/10'
    : 'bg-white/90 border-gray-200/80';

  return (
    <>
      <header className={`backdrop-blur-xl border-b sticky top-0 z-50 transition-colors duration-300 ${headerBg}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex justify-between items-center relative">

          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image
              src="/logo.png"
              alt="HappyApplaid"
              width={120}
              height={32}
              className="sm:w-[150px] sm:h-[40px]"
              // Valoversio logosta: lisää tämä kun sinulla on vaalea logo
              // style={{ filter: isDark ? 'none' : 'invert(1) brightness(0.3)' }}
            />
          </Link>

          {/* Desktop Nav (kirjautunut) */}
          {isSignedIn && (
            <nav className="hidden lg:flex gap-0.5 mx-4">
              {primaryNavLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={
                      pathname === href
                        ? 'text-orange-400 bg-orange-500/20 border border-orange-400/30'
                        : isDark
                          ? 'text-gray-300 hover:text-orange-300 hover:bg-white/5'
                          : 'text-gray-600 hover:text-orange-500 hover:bg-orange-50'
                    }
                  >
                    <Icon className="w-4 h-4 mr-1.5" />
                    {label}
                  </Button>
                </Link>
              ))}
            </nav>
          )}

          {/* Desktop oikea puoli */}
          <div className="hidden lg:flex items-center gap-2">

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Kielenvaihto */}
            <Button
              onClick={toggleLanguage}
              variant="ghost"
              size="sm"
              className={`border ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-gray-200 border-white/10'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
              }`}
            >
              <Languages className="w-4 h-4 mr-1" />
              {t.toggleLang}
            </Button>

            {!isSignedIn ? (
              <>
                <Link href={pricingAnchor}>
                  <Button variant="ghost" size="sm" className={isDark ? 'text-gray-300 hover:text-orange-300' : 'text-gray-600 hover:text-orange-500'}>
                    <PricingIcon className="w-4 h-4 mr-1" />
                    {t.pricing}
                  </Button>
                </Link>
                <SignInButton mode="modal" appearance={clerkAppearance}>
                  <Button size="sm" variant="ghost" className={isDark ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}>
                    {t.signIn}
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal" appearance={clerkAppearance}>
                  <Button className="bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700">
                    {t.signUp}
                  </Button>
                </SignUpButton>
              </>
            ) : (
              <>
                {/* Token-saldo */}
                <div className={`backdrop-blur-sm border px-3 py-1.5 rounded-full flex items-center gap-2 ${
                  isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-gray-100 border-gray-200'
                }`}>
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {tokens.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-orange-500">TKN</span>
                </div>

                {/* Plan-badge */}
                {plan && (
                  <Link href="/pricing">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border hover:opacity-80 transition-opacity ${
                      isDark
                        ? 'bg-amber-500/20 border-amber-400/30'
                        : 'bg-amber-100 border-amber-300/60'
                    }`}>
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span className={`text-xs font-bold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                        {plan.toUpperCase()}
                      </span>
                    </div>
                  </Link>
                )}

                {/* ── LOGOUT — aina näkyvillä desktopissa kirjautuneilla ── */}
                <SignOutButton>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`flex items-center gap-1.5 border ${
                      isDark
                        ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10 border-transparent hover:border-red-500/20'
                        : 'text-red-500 hover:text-red-600 hover:bg-red-50 border-transparent hover:border-red-200'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    {t.signOut}
                  </Button>
                </SignOutButton>

                {/* Profile-menu (Settings) */}
                <div data-profile-menu className="relative">
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className={`flex items-center gap-2 border px-3 py-1.5 rounded-full transition-colors ${
                      isDark
                        ? 'bg-white/5 border-white/10 hover:bg-white/10'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                      {user?.firstName?.[0] ?? 'U'}
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${profileMenuOpen ? 'rotate-180' : ''} ${isDark ? 'text-gray-300' : 'text-gray-500'}`} />
                  </button>

                  {profileMenuOpen && (
                    <div className={`absolute right-0 top-12 w-48 border rounded-xl shadow-2xl z-50 overflow-hidden ${
                      isDark
                        ? 'bg-gray-900/95 border-white/10'
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className={`px-4 py-2 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                        <p className={`text-xs font-bold truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className={`text-[10px] truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {user?.primaryEmailAddress?.emailAddress}
                        </p>
                      </div>
                      {secondaryNavLinks.map(({ href, label, icon: Icon }) => (
                        <Link key={href} href={href}>
                          <button className={`w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors ${
                            isDark ? 'text-gray-200 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'
                          }`}>
                            <Icon className="w-4 h-4" /> {label}
                          </button>
                        </Link>
                      ))}
                      <Link href="/settings">
                        <button className={`w-full px-4 py-2 text-sm text-left flex items-center gap-2 border-t transition-colors ${
                          isDark ? 'text-gray-200 hover:bg-white/5 border-white/5' : 'text-gray-700 hover:bg-gray-50 border-gray-100'
                        }`}>
                          <Settings className="w-4 h-4" /> {t.settings}
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile: Hamburger */}
          <button
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* ── MOBILE MENU ────────────────────────────────────────────────── */}
{mobileMenuOpen && (
  <div className={`lg:hidden border-b absolute left-0 top-full w-full z-50 animate-in slide-in-from-top duration-200 shadow-2xl ${
    isDark
      ? 'bg-[#0a0a0a] backdrop-blur-2xl border-white/10'  // ✅ Täysi musta
      : 'bg-white backdrop-blur-2xl border-gray-200'      // ✅ Täysi valkoinen
  }`}>
            <div className="flex flex-col p-4 gap-1 max-h-[80vh] overflow-y-auto">

              {isSignedIn ? (
                <>
                  {/* Saldo + plan mobiilissa */}
                  <div className={`mb-2 p-3 rounded-xl border ${
                    isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <p className={`text-[10px] uppercase tracking-wider mb-1.5 font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {t.balance}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Sparkles className="w-4 h-4 text-orange-400" />
                      <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {tokens.toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-orange-500">TKN</span>
                      {plan && (
                        <>
                          <div className={`w-px h-5 mx-1 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
                          <Crown className="w-4 h-4 text-amber-400" />
                          <span className={`text-xs font-bold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                            {plan.toUpperCase()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Päälinkit */}
                  {allNavLinks.map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${
                          pathname === href
                            ? 'text-orange-400 bg-orange-500/10'
                            : isDark ? 'text-gray-300 hover:text-orange-300' : 'text-gray-600 hover:text-orange-500 hover:bg-orange-50'
                        }`}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {label}
                      </Button>
                    </Link>
                  ))}

                  {/* Asetukset ja lisät */}
                  <div className={`pt-2 mt-1 border-t space-y-1 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    {/* Theme + Kieli samalla rivillä */}
                    <div className={`flex items-center justify-between px-4 py-2 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {language === 'en' ? 'Dark mode' : 'Tumma tila'}
                      </span>
                      <ThemeToggle />
                    </div>

                    <Button
                      onClick={toggleLanguage}
                      variant="ghost"
                      className={`w-full justify-start ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                    >
                      <Languages className="w-5 h-5 mr-3" />
                      {language === 'en' ? 'In English' : 'Suomeksi'}
                    </Button>

                    <Link href="/settings">
                      <Button variant="ghost" className={`w-full justify-start ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <Settings className="w-5 h-5 mr-3" /> {t.settings}
                      </Button>
                    </Link>

                    {/* ── LOGOUT — näkyvillä mobiilissa aina ── */}
                    <SignOutButton>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start font-bold ${
                          isDark
                            ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                            : 'text-red-500 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <LogOut className="w-5 h-5 mr-3" /> {t.signOut}
                      </Button>
                    </SignOutButton>
                  </div>
                </>

              ) : (
                // Ei kirjautunut — mobiili
                <>
                  <Link href="/">
                    <Button variant="ghost" className={`w-full justify-start ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Home className="w-5 h-5 mr-3" /> {t.home}
                    </Button>
                  </Link>
                  <Link href={pricingAnchor}>
                    <Button variant="ghost" className={`w-full justify-start ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      <PricingIcon className="w-5 h-5 mr-3" /> {t.pricing}
                    </Button>
                  </Link>

                  <div className={`flex items-center justify-between px-4 py-2 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {language === 'en' ? 'Dark mode' : 'Tumma tila'}
                    </span>
                    <ThemeToggle />
                  </div>

                  <Button
                    onClick={toggleLanguage}
                    variant="ghost"
                    className={`w-full justify-start ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                  >
                    <Languages className="w-5 h-5 mr-3" />
                    {language === 'en' ? 'English' : 'Suomeksi'}
                  </Button>

                  <div className={`pt-2 mt-1 border-t space-y-2 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <SignInButton mode="modal" appearance={clerkAppearance}>
                      <Button variant="ghost" className={`w-full ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {t.signIn}
                      </Button>
                    </SignInButton>
                    <SignUpButton mode="modal" appearance={clerkAppearance}>
                      <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700">
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
    </>
  );
}
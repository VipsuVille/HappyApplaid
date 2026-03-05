'use client';

// ══════════════════════════════════════════════════════════
//  HappyApplaid — SmartHeader (unauthenticated view)
//  Aesthetic: Riot Games × Blizzard — dark, bold, cinematic
//  The authenticated parts are left unchanged.
// ══════════════════════════════════════════════════════════

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
  FileText, Menu, X, Home, FileEdit, User as UserIcon,
  Settings, Crown, LogOut, Languages, ChevronDown, Book,
  ReceiptEuro, CircleDollarSign, Sparkles, Shield,
} from 'lucide-react';

// ── Inline styles for Riot-style header (unauthenticated only) ──────────
const riotStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Barlow:wght@400;500;600&display=swap');

  .ha-header-unauth {
    font-family: 'Barlow Condensed', 'Impact', sans-serif !important;
  }

  /* Nav link pill */
  .ha-nav-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-size: .78rem;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: rgba(17,17,17,.45);
    background: transparent;
    border: none;
    cursor: pointer;
    position: relative;
    transition: color .18s;
    text-decoration: none;
    white-space: nowrap;
  }
  .ha-header-dark .ha-nav-link { color: rgba(240,236,228,.55); }
  .ha-nav-link::after {
    content: '';
    position: absolute;
    bottom: 0; left: 14px; right: 14px;
    height: 1px;
    background: #f97316;
    transform: scaleX(0);
    transform-origin: left;
    transition: transform .22s ease;
  }
  .ha-nav-link:hover { color: #111 !important; }
  .ha-header-dark .ha-nav-link:hover { color: #f0ece4 !important; }
  .ha-nav-link:hover::after { transform: scaleX(1); }

  /* Sign In ghost */
  .ha-btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: .78rem;
    font-weight: 800;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: rgba(17,17,17,.6);
    background: transparent;
    border: 1px solid rgba(0,0,0,.15);
    cursor: pointer;
    transition: border-color .2s, color .2s, background .2s;
  }
  .ha-header-dark .ha-btn-ghost {
    color: rgba(240,236,228,.7);
    border-color: rgba(255,255,255,.12);
  }
  .ha-btn-ghost:hover {
    border-color: rgba(249,115,22,.5);
    color: #111;
    background: rgba(249,115,22,.06);
  }
  .ha-header-dark .ha-btn-ghost:hover { color: #f0ece4; }

  /* Sign Up CTA */
  .ha-btn-cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 22px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: .82rem;
    font-weight: 900;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: #000;
    background: #f97316;
    border: none;
    cursor: pointer;
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
    transition: background .2s, transform .15s;
  }
  .ha-btn-cta:hover { background: #fb923c; transform: translateY(-1px); }
  .ha-btn-cta:active { transform: none; }

  /* Pricing link */
  .ha-pricing-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-size: .78rem;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: rgba(17,17,17,.38);
    border: none;
    background: transparent;
    cursor: pointer;
    transition: color .18s;
    text-decoration: none;
  }
  .ha-header-dark .ha-pricing-link { color: rgba(240,236,228,.45); }
  .ha-pricing-link:hover, .ha-header-dark .ha-pricing-link:hover { color: #f97316; }

  /* Lang toggle */
  .ha-lang-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: .72rem;
    font-weight: 800;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: rgba(17,17,17,.35);
    background: transparent;
    border: 1px solid rgba(0,0,0,.1);
    cursor: pointer;
    transition: color .18s, border-color .18s;
  }
  .ha-header-dark .ha-lang-btn {
    color: rgba(240,236,228,.4);
    border-color: rgba(255,255,255,.08);
  }
  .ha-lang-btn:hover { color: #111; border-color: rgba(0,0,0,.25); }
  .ha-header-dark .ha-lang-btn:hover { color: #f0ece4; border-color: rgba(255,255,255,.2); }

  /* Mobile menu */
  .ha-mobile-menu {
    position: absolute;
    left: 0; top: 100%; width: 100%;
    background: #0a0a0a;
    border-bottom: 1px solid rgba(249,115,22,.2);
    border-top: 1px solid rgba(249,115,22,.15);
    z-index: 100;
    box-shadow: 0 20px 60px rgba(0,0,0,.8);
  }
  .ha-header-unauth:not(.ha-header-dark) .ha-mobile-menu {
    background: #f0efe9;
    border-bottom-color: rgba(249,115,22,.3);
    border-top-color: rgba(249,115,22,.3);
    box-shadow: 0 20px 40px rgba(0,0,0,.12);
  }
  .ha-mobile-link {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 14px 20px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: .95rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: rgba(17,17,17,.55);
    background: transparent;
    border: none;
    cursor: pointer;
    border-bottom: 1px solid rgba(0,0,0,.06);
    text-decoration: none;
    transition: color .15s, background .15s;
  }
  .ha-header-dark .ha-mobile-link { color: rgba(240,236,228,.6); border-bottom-color: rgba(255,255,255,.04); }
  .ha-mobile-link:hover { color: #111; background: rgba(249,115,22,.04); }
  .ha-header-dark .ha-mobile-link:hover { color: #f0ece4; }

  /* Bottom orange line on header */
  .ha-header-line {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(249,115,22,.5) 30%, rgba(249,115,22,.5) 70%, transparent);
  }

  /* Scrolled: add subtle bg */
  .ha-header-scrolled {
    background: rgba(8,8,8,.98) !important;
    box-shadow: 0 4px 40px rgba(0,0,0,.6);
  }
`;

export default function SmartHeader() {
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const { user, isSignedIn, isLoaded: isClerkLoaded } = useUser();
  const { language, toggleLanguage } = useLanguage();
  const { tokens, plan_type, isLoading: tokensLoading } = useTokens();
  let isDark = false;
  try {
    const theme = useTheme();
    isDark = theme?.isDark ?? false;
  } catch { isDark = false; }
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const plan = subscription?.plan_type || plan_type;

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const t = {
    en: {
      home: 'Home', cvs: 'CVs', letters: 'Letters', answers: 'Answers',
      profile: 'Profile', pricing: 'Pricing', settings: 'Settings',
      signOut: 'Sign out', signIn: 'Sign In', signUp: 'Get Started Free',
      toggleLang: 'EN', balance: 'Balance', atsChecker: 'ATS Check',
    },
    fi: {
      home: 'Koti', cvs: 'CV:t', letters: 'Kirjeet', answers: 'Vastaukset',
      profile: 'Profiili', pricing: 'Hinnasto', settings: 'Asetukset',
      signOut: 'Kirjaudu ulos', signIn: 'Kirjaudu', signUp: 'Aloita Ilmaiseksi',
      toggleLang: 'FI', balance: 'Saldosi', atsChecker: 'ATS Mittari',
    },
  }[language];

  useEffect(() => {
    if (!profileMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-profile-menu]')) setProfileMenuOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [profileMenuOpen]);

  if (!isClerkLoaded || isSubscriptionLoading || tokensLoading) {
    return (
      <header style={{ height: '64px', background: isDark ? 'rgba(8,8,8,.95)' : 'rgba(245,244,240,.95)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)'}` }} />
    );
  }

  const PricingIcon = language === 'fi' ? ReceiptEuro : CircleDollarSign;
  const pricingAnchor = pathname === '/' ? '#pricing' : '/#pricing';

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

  // ────────────────────────────────────────────────────────
  //  AUTHENTICATED — unchanged dark-card style
  // ────────────────────────────────────────────────────────
  if (isSignedIn) {
    const headerBg = isDark ? 'bg-black/80 border-white/10' : 'bg-white/90 border-gray-200/80';
    return (
      <>
        <header className={`backdrop-blur-xl border-b sticky top-0 z-50 transition-colors duration-300 ${headerBg}`}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex justify-between items-center relative">

            <Link href="/" className="flex items-center flex-shrink-0">
              <Image src="/logo.png" alt="HappyApplaid" width={120} height={32} className="sm:w-[150px] sm:h-[40px]" />
            </Link>

            <nav className="hidden lg:flex gap-0.5 mx-4">
              {primaryNavLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <Button variant="ghost" size="sm" className={
                    pathname === href
                      ? 'text-orange-400 bg-orange-500/20 border border-orange-400/30'
                      : isDark ? 'text-gray-300 hover:text-orange-300 hover:bg-white/5'
                              : 'text-gray-600 hover:text-orange-500 hover:bg-orange-50'
                  }>
                    <Icon className="w-4 h-4 mr-1.5" />
                    {label}
                  </Button>
                </Link>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-2">
              <ThemeToggle />
              <Button onClick={toggleLanguage} variant="ghost" size="sm" className={`border ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-200 border-white/10' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'}`}>
                <Languages className="w-4 h-4 mr-1" />{t.toggleLang}
              </Button>

              <div className={`backdrop-blur-sm border px-3 py-1.5 rounded-full flex items-center gap-2 ${isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{tokens.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-orange-500">TKN</span>
              </div>

              {plan && (
                <Link href="/pricing">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border hover:opacity-80 transition-opacity ${isDark ? 'bg-amber-500/20 border-amber-400/30' : 'bg-amber-100 border-amber-300/60'}`}>
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className={`text-xs font-bold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>{plan.toUpperCase()}</span>
                  </div>
                </Link>
              )}

              <SignOutButton>
                <Button size="sm" variant="ghost" className={`flex items-center gap-1.5 border ${isDark ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10 border-transparent hover:border-red-500/20' : 'text-red-500 hover:text-red-600 hover:bg-red-50 border-transparent hover:border-red-200'}`}>
                  <LogOut className="w-4 h-4" />{t.signOut}
                </Button>
              </SignOutButton>

              <div data-profile-menu className="relative">
                <button onClick={() => setProfileMenuOpen(!profileMenuOpen)} className={`flex items-center gap-2 border px-3 py-1.5 rounded-full transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                  <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                    {user?.firstName?.[0] ?? 'U'}
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${profileMenuOpen ? 'rotate-180' : ''} ${isDark ? 'text-gray-300' : 'text-gray-500'}`} />
                </button>
                {profileMenuOpen && (
                  <div className={`absolute right-0 top-12 w-48 border rounded-xl shadow-2xl z-50 overflow-hidden ${isDark ? 'bg-gray-900/95 border-white/10' : 'bg-white border-gray-200'}`}>
                    <div className={`px-4 py-2 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                      <p className={`text-xs font-bold truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user?.firstName} {user?.lastName}</p>
                      <p className={`text-[10px] truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{user?.primaryEmailAddress?.emailAddress}</p>
                    </div>
                    {secondaryNavLinks.map(({ href, label, icon: Icon }) => (
                      <Link key={href} href={href}>
                        <button className={`w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors ${isDark ? 'text-gray-200 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`}>
                          <Icon className="w-4 h-4" />{label}
                        </button>
                      </Link>
                    ))}
                    <Link href="/settings">
                      <button className={`w-full px-4 py-2 text-sm text-left flex items-center gap-2 border-t transition-colors ${isDark ? 'text-gray-200 hover:bg-white/5 border-white/5' : 'text-gray-700 hover:bg-gray-50 border-gray-100'}`}>
                        <Settings className="w-4 h-4" />{t.settings}
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile hamburger */}
            <button className={`lg:hidden p-2 rounded-lg transition-colors ${isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile menu (authenticated) */}
          {mobileMenuOpen && (
            <div className={`lg:hidden border-b absolute left-0 top-full w-full z-50 animate-in slide-in-from-top duration-200 shadow-2xl ${isDark ? 'bg-[#0a0a0a] backdrop-blur-2xl border-white/10' : 'bg-white backdrop-blur-2xl border-gray-200'}`}>
              <div className="flex flex-col p-4 gap-1 max-h-[80vh] overflow-y-auto">
                <div className={`mb-2 p-3 rounded-xl border ${isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <p className={`text-[10px] uppercase tracking-wider mb-1.5 font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.balance}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{tokens.toLocaleString()}</span>
                    <span className="text-xs font-bold text-orange-500">TKN</span>
                    {plan && (<><div className={`w-px h-5 mx-1 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} /><Crown className="w-4 h-4 text-amber-400" /><span className={`text-xs font-bold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>{plan.toUpperCase()}</span></>)}
                  </div>
                </div>
                {allNavLinks.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href}>
                    <Button variant="ghost" className={`w-full justify-start ${pathname === href ? 'text-orange-400 bg-orange-500/10' : isDark ? 'text-gray-300 hover:text-orange-300' : 'text-gray-600 hover:text-orange-500 hover:bg-orange-50'}`}>
                      <Icon className="w-5 h-5 mr-3" />{label}
                    </Button>
                  </Link>
                ))}
                <div className={`pt-2 mt-1 border-t space-y-1 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                  <div className={`flex items-center justify-between px-4 py-2 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{language === 'en' ? 'Dark mode' : 'Tumma tila'}</span>
                    <ThemeToggle />
                  </div>
                  <Button onClick={toggleLanguage} variant="ghost" className={`w-full justify-start ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Languages className="w-5 h-5 mr-3" />{language === 'en' ? 'In English' : 'Suomeksi'}
                  </Button>
                  <Link href="/settings">
                    <Button variant="ghost" className={`w-full justify-start ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Settings className="w-5 h-5 mr-3" />{t.settings}
                    </Button>
                  </Link>
                  <SignOutButton>
                    <Button variant="ghost" className={`w-full justify-start font-bold ${isDark ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-red-500 hover:text-red-600 hover:bg-red-50'}`}>
                      <LogOut className="w-5 h-5 mr-3" />{t.signOut}
                    </Button>
                  </SignOutButton>
                </div>
              </div>
            </div>
          )}
        </header>
      </>
    );
  }

  // ────────────────────────────────────────────────────────
  //  UNAUTHENTICATED — Riot / Blizzard style
  // ────────────────────────────────────────────────────────
  return (
    <>
      <style>{riotStyles}</style>

      <header
        className={`ha-header-unauth${scrolled ? ' ha-header-scrolled' : ''}${isDark ? ' ha-header-dark' : ''}`}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          height: '64px',
          background: scrolled
            ? (isDark ? 'rgba(8,8,8,.98)' : 'rgba(245,244,240,.98)')
            : (isDark ? 'rgba(8,8,8,.7)' : 'rgba(245,244,240,.7)'),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${isDark ? 'rgba(249,115,22,.15)' : 'rgba(249,115,22,.2)'}`,
          transition: 'background .3s, box-shadow .3s',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Bottom accent line */}
        <div className="ha-header-line" />

        <div style={{ maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Image src="/logo.png" alt="HappyApplaid" width={120} height={32} style={{ width: 'clamp(100px, 14vw, 140px)', height: 'auto' }} />
          </Link>

          {/* Desktop center nav — minimal, Riot-style */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center' }} className="desktop-nav">
            <a href={pricingAnchor} className="ha-nav-link">
              <PricingIcon size={13} />
              {t.pricing}
            </a>
            {/* Optional: link to about/blog if exists */}
            <a href="/ats-checker" className="ha-nav-link">
              <Shield size={13} />
              ATS Check
            </a>
          </nav>

          {/* Desktop right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} className="desktop-actions">

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Lang toggle */}
            <button className="ha-lang-btn" onClick={toggleLanguage}>
              <Languages size={12} />
              {t.toggleLang}
            </button>

            {/* Sign In */}
            <SignInButton mode="modal" appearance={clerkAppearance}>
              <button className="ha-btn-ghost">{t.signIn}</button>
            </SignInButton>

            {/* Sign Up CTA */}
            <SignUpButton mode="modal" appearance={clerkAppearance}>
              <button className="ha-btn-cta">
                <Sparkles size={14} />
                {t.signUp}
              </button>
            </SignUpButton>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              padding: '8px',
              background: 'transparent',
              border: 'none',
              color: isDark ? 'rgba(240,236,228,.7)' : 'rgba(17,17,17,.6)',
              cursor: 'pointer',
            }}
            className="mobile-hamburger"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* ── MOBILE MENU (unauthenticated) ── */}
        {mobileMenuOpen && (
          <div className="ha-mobile-menu">
            <div style={{ padding: '8px 0' }}>

              {/* Nav links */}
              <a href="/" className="ha-mobile-link" onClick={() => setMobileMenuOpen(false)}>
                <Home size={18} style={{ color: '#f97316' }} />
                {t.home}
              </a>
              <a href="/ats-checker" className="ha-mobile-link" onClick={() => setMobileMenuOpen(false)}>
                <Shield size={18} style={{ color: '#f97316' }} />
                ATS Check
              </a>
              <a href={pricingAnchor} className="ha-mobile-link" onClick={() => setMobileMenuOpen(false)}>
                <PricingIcon size={18} style={{ color: '#f97316' }} />
                {t.pricing}
              </a>

              {/* Divider */}
              <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)', margin: '8px 0' }} />

              {/* Theme toggle row */}
              <div className="ha-mobile-link" style={{ justifyContent: 'space-between', cursor: 'default' }}>
                <span style={{ color: isDark ? 'rgba(240,236,228,.5)' : 'rgba(17,17,17,.5)' }}>
                  {language === 'en' ? 'Dark mode' : 'Tumma tila'}
                </span>
                <ThemeToggle />
              </div>

              {/* Lang */}
              <button
                className="ha-mobile-link"
                onClick={() => { toggleLanguage(); setMobileMenuOpen(false); }}
                style={{ width: '100%', textAlign: 'left' }}
              >
                <Languages size={18} style={{ color: isDark ? 'rgba(240,236,228,.4)' : 'rgba(17,17,17,.4)' }} />
                {language === 'en' ? 'Suomeksi' : 'In English'}
              </button>

              {/* Divider */}
              <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)', margin: '8px 0' }} />

              {/* Auth CTAs */}
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SignInButton mode="modal" appearance={clerkAppearance}>
                  <button className="ha-btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                    {t.signIn}
                  </button>
                </SignInButton>
                <SignUpButton mode="modal" appearance={clerkAppearance}>
                  <button className="ha-btn-cta" style={{ width: '100%', justifyContent: 'center', clipPath: 'none' }}>
                    <Sparkles size={16} />
                    {t.signUp}
                  </button>
                </SignUpButton>
              </div>
            </div>
          </div>
        )}

        {/* Responsive styles via inline style tag */}
        <style>{`
          @media (max-width: 768px) {
            .desktop-nav { display: none !important; }
            .desktop-actions { display: none !important; }
            .mobile-hamburger { display: flex !important; }
          }
          @media (min-width: 769px) {
            .ha-mobile-menu { display: none !important; }
          }
        `}</style>
      </header>
    </>
  );
}
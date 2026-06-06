'use client';

// ══════════════════════════════════════════════════════════
//  HappyApplaid — SmartHeader
//  Kirjautunut: Koti · ATS · Luo▾ · Omat▾  |  token·plan-pilleri + profiilivalikko
//  Kirjautumaton: wordmark + ATS · Hinnasto + Sign in / Get started
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
  ReceiptEuro, CircleDollarSign, Sparkles, Shield, Plus, FolderOpen,
} from 'lucide-react';

const riotStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Barlow:wght@400;500;600&display=swap');
  .ha-header-unauth { font-family: 'Barlow Condensed', 'Impact', sans-serif !important; }
  .ha-nav-link { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; font-size:.78rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:rgba(17,17,17,.45); background:transparent; border:none; cursor:pointer; position:relative; transition:color .18s; text-decoration:none; white-space:nowrap; }
  .ha-header-dark .ha-nav-link { color:rgba(240,236,228,.55); }
  .ha-nav-link::after { content:''; position:absolute; bottom:0; left:14px; right:14px; height:1px; background:#f97316; transform:scaleX(0); transform-origin:left; transition:transform .22s ease; }
  .ha-nav-link:hover { color:#111 !important; }
  .ha-header-dark .ha-nav-link:hover { color:#f0ece4 !important; }
  .ha-nav-link:hover::after { transform:scaleX(1); }
  .ha-btn-ghost { display:inline-flex; align-items:center; gap:6px; padding:8px 18px; font-family:'Barlow Condensed',sans-serif; font-size:.78rem; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:rgba(17,17,17,.6); background:transparent; border:1px solid rgba(0,0,0,.15); cursor:pointer; transition:border-color .2s,color .2s,background .2s; }
  .ha-header-dark .ha-btn-ghost { color:rgba(240,236,228,.7); border-color:rgba(255,255,255,.12); }
  .ha-btn-ghost:hover { border-color:rgba(249,115,22,.5); color:#111; background:rgba(249,115,22,.06); }
  .ha-header-dark .ha-btn-ghost:hover { color:#f0ece4; }
  .ha-btn-cta { display:inline-flex; align-items:center; gap:8px; padding:9px 22px; font-family:'Barlow Condensed',sans-serif; font-size:.82rem; font-weight:900; letter-spacing:.1em; text-transform:uppercase; color:#000; background:#f97316; border:none; cursor:pointer; clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px)); transition:background .2s,transform .15s; }
  .ha-btn-cta:hover { background:#fb923c; transform:translateY(-1px); }
  .ha-lang-btn { display:inline-flex; align-items:center; gap:4px; padding:6px 12px; font-family:'Barlow Condensed',sans-serif; font-size:.72rem; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:rgba(17,17,17,.35); background:transparent; border:1px solid rgba(0,0,0,.1); cursor:pointer; transition:color .18s,border-color .18s; }
  .ha-header-dark .ha-lang-btn { color:rgba(240,236,228,.4); border-color:rgba(255,255,255,.08); }
  .ha-lang-btn:hover { color:#111; border-color:rgba(0,0,0,.25); }
  .ha-header-dark .ha-lang-btn:hover { color:#f0ece4; border-color:rgba(255,255,255,.2); }
  .ha-mobile-menu { position:absolute; left:0; top:100%; width:100%; background:#0a0a0a; border-bottom:1px solid rgba(249,115,22,.2); border-top:1px solid rgba(249,115,22,.15); z-index:100; box-shadow:0 20px 60px rgba(0,0,0,.8); }
  .ha-header-unauth:not(.ha-header-dark) .ha-mobile-menu { background:#f0efe9; border-bottom-color:rgba(249,115,22,.3); border-top-color:rgba(249,115,22,.3); box-shadow:0 20px 40px rgba(0,0,0,.12); }
  .ha-mobile-link { display:flex; align-items:center; gap:12px; width:100%; padding:14px 20px; font-family:'Barlow Condensed',sans-serif; font-size:.95rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:rgba(17,17,17,.55); background:transparent; border:none; cursor:pointer; border-bottom:1px solid rgba(0,0,0,.06); text-decoration:none; transition:color .15s,background .15s; }
  .ha-header-dark .ha-mobile-link { color:rgba(240,236,228,.6); border-bottom-color:rgba(255,255,255,.04); }
  .ha-mobile-link:hover { color:#111; background:rgba(249,115,22,.04); }
  .ha-header-dark .ha-mobile-link:hover { color:#f0ece4; }
  .ha-header-scrolled { box-shadow:0 4px 40px rgba(0,0,0,.6); }
`;

export default function SmartHeader() {
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const { user, isSignedIn, isLoaded: isClerkLoaded } = useUser();
  const { language, toggleLanguage } = useLanguage();
  const { tokens, plan_type, isLoading: tokensLoading } = useTokens();
  let isDark = false;
  try { const theme = useTheme(); isDark = theme?.isDark ?? false; } catch { isDark = false; }
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null); // 'luo' | 'omat' | 'profile'
  const [scrolled, setScrolled] = useState(false);

  const plan = subscription?.plan_type || plan_type;

  useEffect(() => { setMobileMenuOpen(false); setOpenMenu(null); }, [pathname]);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Sulje avoin valikko klikatessa ulkopuolelle
  useEffect(() => {
    if (!openMenu) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-menu]')) setOpenMenu(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenu]);

  const t = {
    en: {
      home: 'Home', cvs: 'My CVs', letters: 'My Letters', answers: 'Answers',
      profile: 'Profile', pricing: 'Pricing', settings: 'Settings',
      signOut: 'Sign out', signIn: 'Sign In', signUp: 'Get Started Free',
      toggleLang: 'EN', balance: 'Balance', atsChecker: 'ATS Check',
      create: 'Create', newCv: 'New CV', newLetter: 'New Cover Letter',
      mine: 'Mine', theme: 'Theme',
    },
    fi: {
      home: 'Koti', cvs: 'CV:t', letters: 'Hakukirjeet', answers: 'Vastaukset',
      profile: 'Profiili', pricing: 'Hinnasto', settings: 'Asetukset',
      signOut: 'Kirjaudu ulos', signIn: 'Kirjaudu', signUp: 'Aloita Ilmaiseksi',
      toggleLang: 'FI', balance: 'Saldosi', atsChecker: 'ATS Mittari',
      create: 'Luo', newCv: 'Uusi CV', newLetter: 'Uusi hakukirje',
      mine: 'Omat', theme: 'Teema',
    },
  }[language];

  const PricingIcon = language === 'fi' ? ReceiptEuro : CircleDollarSign;
  const pricingAnchor = pathname === '/' ? '#pricing' : '/#pricing';

  const createItems = [
    { href: '/create-cv', label: t.newCv, icon: FileText },
    { href: '/create-cover-letter', label: t.newLetter, icon: FileEdit },
  ];
  const mineItems = [
    { href: '/my-cvs', label: t.cvs, icon: FileText },
    { href: '/my-cover-letters', label: t.letters, icon: FileEdit },
    { href: '/profile/responses', label: t.answers, icon: Book },
  ];
  const secondaryNavLinks = [
    { href: '/profile', label: t.profile, icon: UserIcon },
    { href: '/pricing', label: t.pricing, icon: PricingIcon },
  ];
  // Mobiili: kaikki linkit yhtenä listana
  const allMobileLinks = [
    { href: '/', label: t.home, icon: Home },
    { href: '/ats-checker', label: t.atsChecker, icon: Shield },
    { href: '/create-cv', label: t.newCv, icon: FileText },
    { href: '/create-cover-letter', label: t.newLetter, icon: FileEdit },
    { href: '/my-cvs', label: t.cvs, icon: FileText },
    { href: '/my-cover-letters', label: t.letters, icon: FileEdit },
    { href: '/profile/responses', label: t.answers, icon: Book },
    { href: '/profile', label: t.profile, icon: UserIcon },
    { href: '/pricing', label: t.pricing, icon: PricingIcon },
  ];

  if (!isClerkLoaded || isSubscriptionLoading || tokensLoading) {
    return <header style={{ height: '64px', background: isDark ? 'rgba(8,8,8,.95)' : 'rgba(245,244,240,.95)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)'}` }} />;
  }

  // Yhteinen dropdown-renderöinti (desktop, kirjautunut)
  const NavDropdown = ({ id, label, Icon, items }: { id: string; label: string; Icon: any; items: { href: string; label: string; icon: any }[] }) => (
    <div data-menu className="relative">
      <button
        onClick={() => setOpenMenu(openMenu === id ? null : id)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          openMenu === id
            ? 'text-orange-400 bg-orange-500/10'
            : isDark ? 'text-gray-300 hover:text-orange-300 hover:bg-white/5' : 'text-gray-600 hover:text-orange-500 hover:bg-orange-50'
        }`}
      >
        <Icon className="w-4 h-4" />{label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openMenu === id ? 'rotate-180' : ''}`} />
      </button>
      {openMenu === id && (
        <div className={`absolute left-0 top-12 w-52 border rounded-xl shadow-2xl z-50 overflow-hidden ${isDark ? 'bg-gray-900/95 border-white/10' : 'bg-white border-gray-200'}`}>
          {items.map(({ href, label, icon: ItemIcon }) => (
            <Link key={href} href={href}>
              <button className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2.5 transition-colors ${pathname === href ? 'text-orange-500 bg-orange-500/10' : isDark ? 'text-gray-200 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`}>
                <ItemIcon className="w-4 h-4" />{label}
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  // ────────────────────────────────────────────────────────
  //  KIRJAUTUNUT
  // ────────────────────────────────────────────────────────
  if (isSignedIn) {
    const headerBg = isDark ? 'bg-black/80 border-white/10' : 'bg-white/90 border-gray-200/80';
    return (
      <header className={`backdrop-blur-xl border-b sticky top-0 z-50 transition-colors duration-300 ${headerBg}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex justify-between items-center relative">

          <Link href="/" className="flex items-center flex-shrink-0">
            <Image src="/logo.png" alt="HappyApplaid" width={120} height={32} className="sm:w-[150px] sm:h-[40px]" />
          </Link>

          {/* Desktop-navi: Koti · ATS · Luo▾ · Omat▾ */}
          <nav className="hidden lg:flex items-center gap-1 mx-4">
            <Link href="/">
              <button className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/' ? 'text-orange-400 bg-orange-500/10' : isDark ? 'text-gray-300 hover:text-orange-300 hover:bg-white/5' : 'text-gray-600 hover:text-orange-500 hover:bg-orange-50'}`}>
                <Home className="w-4 h-4" />{t.home}
              </button>
            </Link>
            <Link href="/ats-checker">
              <button className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/ats-checker' ? 'text-orange-400 bg-orange-500/10' : isDark ? 'text-gray-300 hover:text-orange-300 hover:bg-white/5' : 'text-gray-600 hover:text-orange-500 hover:bg-orange-50'}`}>
                <Shield className="w-4 h-4" />{t.atsChecker}
              </button>
            </Link>
            <NavDropdown id="luo" label={t.create} Icon={Plus} items={createItems} />
            <NavDropdown id="omat" label={t.mine} Icon={FolderOpen} items={mineItems} />
          </nav>

          {/* Oikea: token·plan-pilleri + profiilivalikko */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/pricing">
              <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-opacity hover:opacity-80 ${isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{tokens.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-orange-500">TKN</span>
                {plan && (
                  <>
                    <span className={`w-px h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span className={`text-[11px] font-bold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>{plan.toUpperCase()}</span>
                  </>
                )}
              </div>
            </Link>

            <div data-menu className="relative">
              <button onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')} className={`flex items-center gap-2 border px-3 py-1.5 rounded-full transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                  {user?.firstName?.[0] ?? 'U'}
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${openMenu === 'profile' ? 'rotate-180' : ''} ${isDark ? 'text-gray-300' : 'text-gray-500'}`} />
              </button>
              {openMenu === 'profile' && (
                <div className={`absolute right-0 top-12 w-56 border rounded-xl shadow-2xl z-50 overflow-hidden ${isDark ? 'bg-gray-900/95 border-white/10' : 'bg-white border-gray-200'}`}>
                  <div className={`px-4 py-3 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <p className={`text-xs font-bold truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{user?.firstName} {user?.lastName}</p>
                    <p className={`text-[10px] truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{user?.primaryEmailAddress?.emailAddress}</p>
                  </div>
                  {secondaryNavLinks.map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href}>
                      <button className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2.5 transition-colors ${isDark ? 'text-gray-200 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`}>
                        <Icon className="w-4 h-4" />{label}
                      </button>
                    </Link>
                  ))}
                  <Link href="/settings">
                    <button className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2.5 transition-colors ${isDark ? 'text-gray-200 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`}>
                      <Settings className="w-4 h-4" />{t.settings}
                    </button>
                  </Link>
                  <div className={`flex items-center justify-between px-4 py-2.5 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.theme}</span>
                    <ThemeToggle />
                  </div>
                  <button onClick={toggleLanguage} className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2.5 transition-colors ${isDark ? 'text-gray-200 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <Languages className="w-4 h-4" />{language === 'en' ? 'Suomeksi' : 'In English'}
                  </button>
                  <SignOutButton>
                    <button className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2.5 font-semibold border-t transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10 border-white/5' : 'text-red-500 hover:bg-red-50 border-gray-100'}`}>
                      <LogOut className="w-4 h-4" />{t.signOut}
                    </button>
                  </SignOutButton>
                </div>
              )}
            </div>
          </div>

          {/* Mobile hamburger */}
          <button className={`lg:hidden p-2 rounded-lg transition-colors ${isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu (kirjautunut) */}
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
              {allMobileLinks.map(({ href, label, icon: Icon }) => (
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
    );
  }

  // ────────────────────────────────────────────────────────
  //  KIRJAUTUMATON
  // ────────────────────────────────────────────────────────
  const Wordmark = () => (
    <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '1.35rem', letterSpacing: '.02em', textTransform: 'uppercase', lineHeight: 1, color: isDark ? '#f0ece4' : '#1a1714' }}>
        Happy<span style={{ color: '#f97316' }}>Applaid</span>
      </span>
    </Link>
  );

  return (
    <>
      <style>{riotStyles}</style>
      <header
        className={`ha-header-unauth${scrolled ? ' ha-header-scrolled' : ''}${isDark ? ' ha-header-dark' : ''}`}
        style={{
          position: 'sticky', top: 0, zIndex: 50, height: '60px',
          background: scrolled ? (isDark ? 'rgba(24,21,18,.98)' : 'rgba(250,248,244,.98)') : (isDark ? 'rgba(24,21,18,.75)' : 'rgba(250,248,244,.75)'),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)'}`,
          transition: 'background .3s, box-shadow .3s, border-color .3s',
          display: 'flex', alignItems: 'center',
        }}
      >
        <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <Wordmark />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} className="desktop-actions">
            <a href="/ats-checker" className="ha-nav-link">{t.atsChecker}</a>
            <a href={pricingAnchor} className="ha-nav-link">{t.pricing}</a>
            <div style={{ width: '1px', height: '20px', background: isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.1)', margin: '0 4px' }} />
            <ThemeToggle />
            <button className="ha-lang-btn" onClick={toggleLanguage}>{t.toggleLang}</button>
            <SignInButton mode="modal" appearance={clerkAppearance}>
              <button className="ha-btn-ghost">{t.signIn}</button>
            </SignInButton>
            <SignUpButton mode="modal" appearance={clerkAppearance}>
              <button className="ha-btn-cta">{t.signUp}</button>
            </SignUpButton>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ display: 'none', padding: '8px', background: 'transparent', border: 'none', color: isDark ? 'rgba(240,236,228,.7)' : 'rgba(17,17,17,.6)', cursor: 'pointer' }} className="mobile-hamburger">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="ha-mobile-menu">
            <div style={{ padding: '8px 0' }}>
              <a href="/" className="ha-mobile-link" onClick={() => setMobileMenuOpen(false)}><Home size={18} style={{ color: '#f97316' }} />{t.home}</a>
              <a href="/ats-checker" className="ha-mobile-link" onClick={() => setMobileMenuOpen(false)}><Shield size={18} style={{ color: '#f97316' }} />{t.atsChecker}</a>
              <a href={pricingAnchor} className="ha-mobile-link" onClick={() => setMobileMenuOpen(false)}><PricingIcon size={18} style={{ color: '#f97316' }} />{t.pricing}</a>
              <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)', margin: '8px 0' }} />
              <div className="ha-mobile-link" style={{ justifyContent: 'space-between', cursor: 'default' }}>
                <span style={{ color: isDark ? 'rgba(240,236,228,.5)' : 'rgba(17,17,17,.5)' }}>{language === 'en' ? 'Dark mode' : 'Tumma tila'}</span>
                <ThemeToggle />
              </div>
              <button className="ha-mobile-link" onClick={() => { toggleLanguage(); setMobileMenuOpen(false); }} style={{ width: '100%', textAlign: 'left' }}>
                <Languages size={18} style={{ color: isDark ? 'rgba(240,236,228,.4)' : 'rgba(17,17,17,.4)' }} />{language === 'en' ? 'Suomeksi' : 'In English'}
              </button>
              <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)', margin: '8px 0' }} />
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SignInButton mode="modal" appearance={clerkAppearance}>
                  <button className="ha-btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>{t.signIn}</button>
                </SignInButton>
                <SignUpButton mode="modal" appearance={clerkAppearance}>
                  <button className="ha-btn-cta" style={{ width: '100%', justifyContent: 'center', clipPath: 'none' }}>
                    <Sparkles size={16} />{t.signUp}
                  </button>
                </SignUpButton>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @media (max-width: 768px) { .desktop-actions { display: none !important; } .mobile-hamburger { display: flex !important; } }
          @media (min-width: 769px) { .ha-mobile-menu { display: none !important; } }
        `}</style>
      </header>
    </>
  );
}
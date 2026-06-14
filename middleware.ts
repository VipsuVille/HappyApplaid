// middleware.ts — siivottu: ei enää DEVELOPMENT_MODE-riippuvuutta.
// Toimii samoin dev- ja tuotannossa:
//  • julkiset sivut auki
//  • suojatut UI-reitit vaativat kirjautumisen
//  • /admin vaatii Clerk publicMetadata.role === 'admin'
//  • suojatut API-reitit vaativat auth
//  • CSRF, rate limiting, security headers, CSP säilytetty
//  • Stripe webhook, PDF-generointi ja cover-letters GET pysyvät julkisina

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface ClerkPublicMetadata {
  role?: string;
}

// Sivut jotka näkyvät ilman kirjautumista
const isPublicPage = createRouteMatcher([
  '/',
  '/coming-soon',
  '/pricing(.*)',        // hinnoittelu saa näkyä kirjautumattomille
  '/tietosuoja(.*)',     // tietosuojaseloste julkinen
  '/unauthorized',
  '/goodbye',
]);

const isAuthPage = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback',
]);

// Suojatut UI-reitit (vaativat kirjautumisen)
const isProtectedRoute = createRouteMatcher([
  '/my-cvs(.*)',
  '/edit-cv(.*)',
  '/create-cv(.*)',
  '/create-cover-letter(.*)',
  '/my-cover-letters(.*)',
  '/edit-cover-letter(.*)',
  '/profile(.*)',
  '/account(.*)',
  '/settings(.*)',
  '/admin(.*)',
]);

const isProtectedApiRoute = createRouteMatcher([
  '/api/generate-cv',
  '/api/generate-pdf',
  '/api/generate-cover-letter',
  '/api/finalize-cover-letter',
  '/api/generate-cover-letter-pdf',
  '/api/user-profile(.*)',
  '/api/save-profile',
  '/api/delete-account(.*)',
]);

const isPublicApiRoute = createRouteMatcher([
  '/api/webhooks/stripe',
  '/api/proxy-image',
  '/api/image-proxy',
  '/api/webhooks',
  '/api/generate-image',
  '/api/webhooks/(.*)',
  '/api/waitlist',
  '/api/detect-ats',
  '/api/extract-keywords-ai',
  '/api/analyze-ats-realistic',
  '/api/insert-keyword-smart',
  '/api/cv/(.*)',
]);

const isPdfGenerationRoute = (req: NextRequest) => {
  const isPreviewPath =
    req.nextUrl.pathname.startsWith('/cv-preview/') ||
    req.nextUrl.pathname.startsWith('/cover-letter-preview/');
  return isPreviewPath && req.nextUrl.searchParams.get('pdf') === 'true';
};

// ─── Rate limiting (sama kuin ennen) ──────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit = 100, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) return false;
  record.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) rateLimitMap.delete(ip);
  }
}, 3600000);

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl;
  const response = NextResponse.next();

  // ── Security headers ──────────────────────────────────────────
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.happyapplaid.com https://va.vercel-scripts.com",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://www.happyapplaid.com https://happyapplaid.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.happyapplaid.com https://api.openai.com https://*.supabase.co wss://*.clerk.com https://va.vercel-scripts.com",
    "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  // ── 1. Stripe webhook (täysin julkinen) ───────────────────────
  if (url.pathname === '/api/webhooks/stripe') return response;

  // ── 2. PDF-generointi (puppeteer hakee preview-sivun) ─────────
  if (isPdfGenerationRoute(req)) {
    console.log(`✅ Middleware bypassing for PDF: ${url.pathname}`);
    return response;
  }

  // ── 3. Julkiset API-reitit ────────────────────────────────────
  if (isPublicApiRoute(req)) return response;

  // ── 4. Cover letter API: GET julkinen, muut vaativat tokenin ──
  if (url.pathname.match(/^\/api\/cover-letters\/[^\/]+$/)) {
    if (req.method === 'GET') return response;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return response;
  }

  // ── 5. Rate limiting kaikille /api-reiteille ──────────────────
  if (url.pathname.startsWith('/api/')) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const limit = isPublicApiRoute(req) ? 50 : 100;
    if (!checkRateLimit(ip, limit)) {
      console.warn(`⚠️ Rate limit exceeded: ${ip}`);
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  }

  // ── Auth-tila ─────────────────────────────────────────────────
  const { userId, sessionClaims } = await auth();

  // ── 6. ADMIN-reitit (rooli vaaditaan) ─────────────────────────
  if (url.pathname.startsWith('/admin')) {
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }
    const role = (sessionClaims?.publicMetadata as ClerkPublicMetadata)?.role;
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
    return response;
  }

  // ── 7. Suojatut API-reitit (auth) ─────────────────────────────
  if (isProtectedApiRoute(req)) {
    if (!userId) {
      console.error(`❌ Unauthorized API: ${url.pathname}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return response;
  }

  // ── 8. Suojatut UI-reitit (kirjautuminen) ─────────────────────
  if (isProtectedRoute(req) && !userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // ── 9. Auth-sivut (sign-in/up) aina auki ──────────────────────
  if (isAuthPage(req)) return response;

  // ── 10. CSRF-suojaus mutatoiville pyynnöille ──────────────────
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');

    const validOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      `https://${host}`,
      `http://${host}`,
      'http://localhost:3000',
      'https://localhost:3000',
    ].filter(Boolean) as string[];

    const isSameOrigin = origin && host && new URL(origin).host === host;
    const isAllowedOrigin = origin && validOrigins.some((allowed) => origin.startsWith(allowed));

    if (!isSameOrigin && !isAllowedOrigin) {
      console.error('❌ CSRF blocked:', { origin, host, pathname: url.pathname });
      return new NextResponse('CSRF protection', { status: 403 });
    }
  }

  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
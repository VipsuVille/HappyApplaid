// middleware.ts - PRODUCTION-READY
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSubscription } from '@/lib/stripe/subscriptions'; 

interface ClerkPublicMetadata {
  role?: string;
}

const isPublicPage = createRouteMatcher([
  '/', 
  '/coming-soon',
]);

const isAuthPage = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback', 
]);

const isProtectedRoute = createRouteMatcher([
  '/my-cvs(.*)',
  '/edit-cv(.*)',
  '/create-cv(.*)',
  '/create-cover-letter(.*)',
  '/my-cover-letters(.*)',
  '/edit-cover-letter(.*)',
  '/profile(.*)',
  '/pricing(.*)',
  '/admin(.*)', 
]);

const isProtectedApiRoute = createRouteMatcher([
  '/api/generate-cv',
  '/api/generate-pdf',
  '/api/generate-cover-letter',
  '/api/generate-cover-letter-pdf',
  '/api/user-profile(.*)',
  '/api/save-profile',
  // ❌ POISTETTU: '/api/cover-letters(.*)', - käsitellään erikseen
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
  '/api/cv/(.*)',  // ✅ CV GET on julkinen (Puppeteer)
]);

const isPdfGenerationRoute = (req: NextRequest) => {
  const isPreviewPath = (
    req.nextUrl.pathname.startsWith('/cv-preview/') ||
    req.nextUrl.pathname.startsWith('/cover-letter-preview/')
  );
  return isPreviewPath && req.nextUrl.searchParams.get('pdf') === 'true';
}

// ✅ RATE LIMITING - Yksinkertainen IP-pohjainen
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// ✅ PUHDISTA VANHENTUNEET RATE LIMIT TIEDOT (1h välein)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 3600000);

export default clerkMiddleware(async (auth, req) => { 
  const url = req.nextUrl;
  const isDevelopmentMode = process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true';

  // ✅ TURVALLISUUSHEADERIT (XSS, Clickjacking, etc.)
  const response = NextResponse.next();
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.happyapplaid.com",
    "worker-src 'self' blob:", 
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.happyapplaid.com https://api.openai.com https://*.supabase.co wss://*.clerk.com",
    "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  // 1. Stripe webhook - ohita kaikki
  if (url.pathname === '/api/webhooks/stripe') {
    return response;
  }

  // 2. PDF-generointi - Salli Puppeteerille pääsy
  if (isPdfGenerationRoute(req)) {
    console.log(`✅ Middleware bypassing Clerk for PDF generation: ${url.pathname}`);
    return response;
  }
  
  // 3. Julkiset API-reitit - ohita autentikointi
  if (isPublicApiRoute(req)) {
    return response;
  }

  // ✅ 4. COVER LETTER API - GET on julkinen, muut vaativat auth
  if (url.pathname.match(/^\/api\/cover-letters\/[^\/]+$/)) {
    if (req.method === 'GET') {
      console.log(`✅ Public GET request to cover letter API: ${url.pathname}`);
      return response; // ← Salli GET ilman authia (Puppeteer)
    }
    
    // PATCH/DELETE/POST vaativat autentikaation
    const authState = await auth();
    const { userId } = authState;
    
    if (!userId) {
      console.error(`❌ Unauthorized ${req.method} to cover letter API: ${url.pathname}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log(`✅ Authorized ${req.method} to cover letter API: ${url.pathname}`);
    return response;
  }

  // ✅ 5. RATE LIMITING kaikille API-reiteille
  if (url.pathname.startsWith('/api/')) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    const limit = isPublicApiRoute(req) ? 50 : 100;
    
    if (!checkRateLimit(ip, limit)) {
      console.warn(`⚠️ Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
  }

  // Jos ollaan tuotantotilassa
  if (!isDevelopmentMode) {
    if (!isPublicPage(req)) { 
      return NextResponse.redirect(new URL('/', req.url)); 
    }
    return response;
  }

  // --- Kehitystila ---

  const authState = await auth(); 
  const { userId, sessionClaims } = authState; 

  // Suojatut API-reitit - vaatii käyttäjän
  if (isProtectedApiRoute(req)) {
    if (!userId) {
      console.error(`❌ Unauthorized API call: ${url.pathname}`);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TILAUSTARKISTUS VAIN GENEROINTIREITEILLE
    const requiresSubscription = [
      '/api/generate-cover-letter',
      '/api/generate-cv',
    ];

    if (requiresSubscription.some(route => url.pathname === route)) {
      const { active } = await getSubscription(userId);
      if (!active) {
        return NextResponse.json(
          { error: 'Subscription required' },
          { status: 402 }
        );
      }
    }

    console.log(`✅ Authorized API call: ${url.pathname} (userId: ${userId})`);
    return response;
  }

  // Admin-reitit
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

  // Muut suojatut UI-reitit
  if (isProtectedRoute(req) && !userId) { 
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }
  
  // Clerkin autentikaatiosivut
  if (isAuthPage(req)) {
    return response;
  }

  // ✅ CSRF-SUOJAUS POST/PUT/DELETE-pyynnöille
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
    const isAllowedOrigin = origin && validOrigins.some(allowed => origin.startsWith(allowed));

    if (!isSameOrigin && !isAllowedOrigin) {
      console.error('❌ CSRF blocked:', { 
        origin, 
        host,
        pathname: url.pathname,
        method: req.method 
      });
      return new NextResponse('CSRF protection - invalid origin', { status: 403 });
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
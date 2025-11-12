// middleware.ts - KORJATTU ATS-REITEILLE
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
  '/edit-cover-letter(.*)',  // ✅ LISÄTTY
  '/profile(.*)',
  '/pricing(.*)',
  '/admin(.*)', 
]);

// ✅ LISÄTTY UUDET ATS-REITIT
const isProtectedApiRoute = createRouteMatcher([
  '/api/generate-cv',
  '/api/generate-pdf',
  '/api/generate-cover-letter',
  '/api/generate-cover-letter-pdf',  // ✅ LISÄTTY
  '/api/user-profile(.*)',
  '/api/save-profile',
  '/api/cover-letters(.*)',  // ✅ LISÄTTY
  // ✅ UUDET ATS-REITIT
  '/api/detect-ats',
  '/api/extract-keywords-ai',
  '/api/insert-keyword-smart',
]);

const isPublicApiRoute = createRouteMatcher([
  '/api/webhooks/stripe',
  '/api/proxy-image',
  '/api/image-proxy',
  '/api/webhooks',
  '/api/generate-image',
  '/api/webhooks/(.*)',
  '/api/waitlist', 
]);

/**
 * Tarkistaa, onko kyseessä PDF-generointipyynnön tekemä navigointi.
 */
const isPdfGenerationRoute = (req: NextRequest) => {
  const isPreviewPath = (
    req.nextUrl.pathname.startsWith('/cv-preview/') ||
    req.nextUrl.pathname.startsWith('/cover-letter-preview/')
  );
  return isPreviewPath && req.nextUrl.searchParams.get('pdf') === 'true';
}

export default clerkMiddleware(async (auth, req) => { 
  const url = req.nextUrl;
  const isDevelopmentMode = process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true';

  // 1. Stripe webhook - ohita kaikki
  if (url.pathname === '/api/webhooks/stripe') {
    return NextResponse.next();
  }

  // 2. PDF-generointi - Salli Puppeteerille pääsy
  if (isPdfGenerationRoute(req)) {
    console.log(`✅ Middleware bypassing Clerk for PDF generation: ${url.pathname}`);
    return NextResponse.next();
  }
  
  // 3. Julkiset API-reitit - ohita autentikointi
  if (isPublicApiRoute(req)) {
    return NextResponse.next();
  }

  // Jos ollaan tuotantotilassa
  if (!isDevelopmentMode) {
    if (!isPublicPage(req)) { 
      return NextResponse.redirect(new URL('/', req.url)); 
    }
    return NextResponse.next();
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

    // ✅ TILAUSTARKISTUS VAIN GENEROINTIREITEILLE
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

    // ✅ SALLI ATS-REITIT ILMAN LISÄTARKISTUKSIA
    console.log(`✅ Authorized API call: ${url.pathname} (userId: ${userId})`);
    return NextResponse.next();
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
    return NextResponse.next();
  }

  // Muut suojatut UI-reitit
  if (isProtectedRoute(req) && !userId) { 
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }
  
  // Clerkin autentikaatiosivut
  if (isAuthPage(req)) {
    return NextResponse.next();
  }

  // CSRF-suojaus POST-pyynnöille
  if (req.method === 'POST') {
    const origin = req.headers.get('origin');
    
    const validOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      'http://localhost:3000',
      'https://localhost:3000',
    ].filter(Boolean) as string[];

    if (origin && !validOrigins.includes(origin)) {
      console.error('❌ CSRF blocked:', { origin, pathname: url.pathname });
      return new NextResponse('CSRF protection - invalid origin', { status: 403 });
    }
  }

  return NextResponse.next(); 
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
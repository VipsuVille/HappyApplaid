// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSubscription } from '@/lib/stripe/subscriptions'; 

interface ClerkPublicMetadata {
  role?: string;
}

// Määritä etusivu ja "coming soon" -sivu julkisiksi
const isPublicPage = createRouteMatcher([
  '/', // Etusivu
  '/coming-soon', // Tälle sivulle ohjataan tuotannossa
]);

// Määritä Clerkin autentikaatiosivut julkisiksi
const isAuthPage = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback', 
]);

// Määritä suojatut UI-reitit
const isProtectedRoute = createRouteMatcher([
  '/my-cvs(.*)',
  '/edit-cv(.*)',
  '/create-cv(.*)',
  '/create-cover-letter(.*)',
  '/my-cover-letters(.*)',
  '/profile(.*)',
  '/pricing(.*)',
  '/admin(.*)', 
]);

// Määritä suojatut API-reitit
const isProtectedApiRoute = createRouteMatcher([
  '/api/generate-cv',
  '/api/generate-pdf',
  '/api/generate-cover-letter',
  '/api/user-profile(.*)',
  '/api/save-profile'
]);

// Määritä julkiset API-reitit
const isPublicApiRoute = createRouteMatcher([
  '/api/image-base64',
  '/api/webhooks/stripe',
  '/api/proxy-image',
  '/api/webhooks',
  '/api/generate-image',
  '/api/webhooks/(.*)',
  '/api/waitlist', 
]);

/**
 * Tarkistaa, onko kyseessä PDF-generointipyynnön tekemä navigointi.
 * sallii vain reitit, joissa on '?pdf=true'.
 */
const isPdfGenerationRoute = (req: NextRequest) => {
    const isPreviewPath = (
        req.nextUrl.pathname.startsWith('/cv-preview/') ||
        req.nextUrl.pathname.startsWith('/cover-letter-preview/')
    );
    // Vain jos polku on esikatselusivu JA sisältää ?pdf=true -parametrin
    return isPreviewPath && req.nextUrl.searchParams.get('pdf') === 'true';
}


export default clerkMiddleware(async (auth, req) => { 
  const url = req.nextUrl;
  const isDevelopmentMode = process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true';

  // 1. Stripe webhook - ohita kaikki
  if (url.pathname === '/api/webhooks/stripe') {
    return NextResponse.next();
  }

  // 2. PDF-generointi - TÄRKEÄ MUUTOS: Salli Puppeteerille pääsy
  // Tämä sallii sivun ladata ilman autentikointia, kun ?pdf=true
  if (isPdfGenerationRoute(req)) {
    return NextResponse.next();
  }
  
  // 3. Julkiset API-reitit - ohita autentikointi
  if (isPublicApiRoute(req)) {
    return NextResponse.next();
  }

  // Jos ollaan tuotantotilassa (Development Mode = false)
  if (!isDevelopmentMode) {
    // Jos käyttäjä yrittää päästä millekään muulle kuin sallitulle sivulle, ohjaa etusivulle
    if (!isPublicPage(req)) { 
      return NextResponse.redirect(new URL('/', req.url)); 
    }
    // Salli etusivu ja coming-soon-sivu
    return NextResponse.next();
  }

  // --- Seuraava logiikka suoritetaan vain kehitystilassa (isDevelopmentMode === true) ---

  const authState = await auth(); 
  const { userId, sessionClaims } = authState; 

  // Suojatut API-reitit - vaatii käyttäjän
  if (isProtectedApiRoute(req)) {
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Tarkista tilaus cover letter -generointia varten
    if (url.pathname === '/api/generate-cover-letter') {
      if (userId) { 
          const { active } = await getSubscription(userId);
          if (!active) {
              return NextResponse.json(
                  { error: 'Subscription required' },
                  { status: 402 }
              );
          }
      }
    }
    return NextResponse.next();
  }

  // Tämä redundantti tarkistus poistetaan, koska isPdfGenerationRoute hoitaa sen aiemmin
  // if (url.pathname.startsWith('/cv-preview/') || url.pathname.startsWith('/cover-letter-preview/')) {
  //   return NextResponse.next();
  // }

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

  // Muut suojatut UI-reitit - vaatii käyttäjän
  if (isProtectedRoute(req) && !userId) { 
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }
  
  // Salli Clerkin omat autentikaatiosivut aina
  if (isAuthPage(req)) {
    return NextResponse.next();
  }

  // CSRF-suojaus POST-pyynnöille (ei muutoksia)
  if (req.method === 'POST') {
    const origin = req.headers.get('origin');
    
    const validOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      'http://localhost:3000',
      'https://localhost:3000',
    ].filter(Boolean) as string[];

    if (origin && !validOrigins.includes(origin)) {
      console.error('❌ CSRF blocked:', { origin });
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
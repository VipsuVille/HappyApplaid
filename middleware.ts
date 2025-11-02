// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSubscription } from '@/lib/stripe/subscriptions'; // Varmista, että tämä polku on oikein

interface ClerkPublicMetadata {
  role?: string;
}

// Määritä etusivu ja "coming soon" -sivu julkisiksi
const isPublicPage = createRouteMatcher([
  '/', // Etusivu
  '/coming-soon', // Tälle sivulle ohjataan tuotannossa
]);

// Määritä Clerkin autentikaatiosivut julkisiksi, jotta niihin pääsee kehityksessä
// Nämä ovat niitä sivuja, joille ohjaamme käyttäjän kirjautumaan sisään
const isAuthPage = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback', // Varmuuden vuoksi, jos käytät SSO:ta
]);

// Määritä suojatut UI-reitit (dashboard, CV-näkymät jne.)
const isProtectedRoute = createRouteMatcher([
  '/my-cvs(.*)',
  '/edit-cv(.*)',
  '/create-cv(.*)',
  '/create-cover-letter(.*)',
  '/my-cover-letters(.*)',
  '/profile(.*)',
  '/pricing(.*)',
  '/admin(.*)', // Admin-reitit on jo erikseen käsitelty, mutta pidän tämän mukana yleisempään suojaukseen
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
  '/api/waitlist', // Lisää tämä, jos se on julkinen API-reitti (kuten page.tsx:ssä)
]);

export default clerkMiddleware(async (auth, req) => { // auth on tässä ClerkAuth-promise
  const url = req.nextUrl;
  const isDevelopmentMode = process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true';

  // 1. Stripe webhook - ohita kaikki middlewaren käsittely
  if (url.pathname === '/api/webhooks/stripe') {
    return NextResponse.next();
  }

  // 2. Julkiset API-reitit - ohita autentikointi
  if (isPublicApiRoute(req)) {
    return NextResponse.next();
  }

  // Jos ollaan tuotantotilassa (Development Mode = false)
  if (!isDevelopmentMode) {
    // Jos käyttäjä yrittää päästä millekään muulle kuin etusivulle tai coming-soon sivulle, ohjaa coming-soon-sivulle
    // Tämä kattaa myös kaikki /sign-in, /sign-up jne.
    if (!isPublicPage(req)) { // Vain julkiset sivut sallitaan
      return NextResponse.redirect(new URL('/', req.url)); // Ohjaa etusivulle, joka näyttää coming soon -sisällön
    }
    // Salli etusivu ja coming-soon-sivu ilman lisätarkistuksia
    return NextResponse.next();
  }

  // --- Seuraava logiikka suoritetaan vain kehitystilassa (isDevelopmentMode === true) ---

  // Kutsu auth() vain kerran ja odota tulosta
  const authState = await auth(); // TÄRKEÄÄ: Odotetaan promisea!
  const { userId, sessionClaims } = authState; // Nyt userId ja sessionClaims ovat saatavilla

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
      if (userId) { // userId on jo tarkistettu yllä, mutta tämä tarkistus on turvallisuussyistä ok
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
  // Jos reitti on suojattu, ja käyttäjä ei ole kirjautunut, ohjaa sign-in-sivulle
  if (isProtectedRoute(req) && !userId) { // Käytä nyt suoraan userId:tä
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }
  
  // Salli Clerkin omat autentikaatiosivut aina (esim. /sign-in, /sign-up)
  if (isAuthPage(req)) {
    return NextResponse.next();
  }

  // CSRF-suojaus POST-pyynnöille (ei muutoksia, jos toimii)
  if (req.method === 'POST') {
    const origin = req.headers.get('origin');
    
    // ✅ ENV-pohjainen (turvallinen)
    const validOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      'http://localhost:3000',
      'https://localhost:3000',
    ].filter(Boolean) as string[];

    // Debug-loki (voit poistaa tuotannossa)
    console.log('🔍 CSRF Check:', {
      origin,
      validOrigins: validOrigins.map(o => o?.replace(/^https?:\/\//, '...')),
    });

    if (origin && !validOrigins.includes(origin)) {
      console.error('❌ CSRF blocked:', { origin });
      return new NextResponse('CSRF protection - invalid origin', { status: 403 });
    }
  }
  return NextResponse.next(); // Salli kaikki muut reitit, joita ei ole estetty/ohjattu
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
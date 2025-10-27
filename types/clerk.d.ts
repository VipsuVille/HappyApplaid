import 'next-auth';

// Laajenna Clerk-kirjaston tyyppejä
declare module '@clerk/nextjs/server' {
  interface PublicMetadata {
    role?: string;
    // Voit lisätä tähän muita julkisia metatietoja tarpeen mukaan
  }
}
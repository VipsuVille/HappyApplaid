// src/app/page.tsx
'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import CVForm from '@/components/forms/FrontPageFormi';
import Header from '@/components/ui/Header';

export default function Home() {
  const [isPaid, setIsPaid] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isLoaded) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ecff821a]"></div>
        </div>
      </div>
    );
  }
  // Näytetään latausikkuna kun autentikaatiota tarkistetaan
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ecff821a]"></div>
      </div>
    );

  }
  return (
    <div className="min-h-screen">
      {!isSignedIn ? (
        // Layout kirjautumattomille käyttäjille
        <div className="md:grid md:grid-cols-12 min-h-screen">
          {/* Header vie 4 saraketta työpöytäkoossa */}
          <div className="md:col-span-4 md:col-start-2">
            <Header isLoading={isLoading} />
          </div>
          
          {/* Pääsisältö vie loput 6 saraketta */}
          <main className="p-4 md:col-span-6">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <h1 className="text-3xl font-bold">Tervetuloa CV-generaattoriin</h1>
              <p className="text-gray-600">
                Kirjaudu sisään tai rekisteröidy käyttääksesi CV-generaattoria.
              </p>
            </div>
          </main>
        </div>
      ) : (
        // Layout kirjautuneille käyttäjille
        <>
          <Header isLoading={isLoading} />
          <main className="mt-16 p-4">
          < CVForm setIsLoading={setIsLoading} isLoading={isLoading} />
          </main>
        </>
      )}
    </div>
  );

 
}
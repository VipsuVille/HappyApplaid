'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useTokens } from '@/hooks/useTokens';
import { useSubscription } from '@/hooks/useSubscription';
import { PRICING } from '@/lib/pricing';

export default function AccountPage() {
  const { user } = useUser();
  const { tokens, isActive, plan, isLoading: tokensLoading } = useTokens();
  const { status, isLoading: subscriptionLoading } = useSubscription();
  const [cancelLoading, setCancelLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tarkista URL-parametrit
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('canceled') === 'true') {
      setSuccessMessage('Tilauksesi on peruutettu onnistuneesti.');
      // Poista parametri URL:sta
      window.history.replaceState({}, document.title, '/account');
    }
  }, []);

  const handleCancelSubscription = async () => {
    if (!confirm('Haluatko varmasti peruuttaa tilauksesi? Kaikki jäljellä olevat tokenit menetetään.')) {
      return;
    }

    setCancelLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Tilauksen peruuttaminen epäonnistui');
      }

      // Ohjaus tapahtuu serverillä redirect()-funktiolla
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Tilauksen peruuttaminen epäonnistui');
      setCancelLoading(false);
    }
  };

  // Hae tierin tiedot
  const tierInfo = plan && plan !== 'none' ? PRICING[plan as keyof typeof PRICING] : null;

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Oma tili</h1>

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {errorMessage}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Käyttäjätiedot</CardTitle>
            <CardDescription>Henkilökohtaiset tietosi</CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Sähköposti:</p>
                  <p>{user.primaryEmailAddress?.emailAddress}</p>
                </div>
                <div>
                  <p className="font-medium">Nimi:</p>
                  <p>{user.fullName || 'Ei asetettu'}</p>
                </div>
              </div>
            ) : (
              <p>Ladataan käyttäjätietoja...</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tilaustiedot</CardTitle>
            <CardDescription>Aktiivisen tilauksesi tiedot</CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptionLoading || tokensLoading ? (
              <p>Ladataan tilaustietoja...</p>
            ) : status === 'active' ? (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Tilaus:</p>
                  <p className="text-green-600">Aktiivinen</p>
                </div>
                <div>
                  <p className="font-medium">Taso:</p>
                  <p className="capitalize">{plan}</p>
                </div>
                <div>
                  <p className="font-medium">Tokenit:</p>
                  <p>{tokens} tokenia jäljellä</p>
                </div>
                {tierInfo && (
                  <div>
                    <p className="font-medium">Hinta:</p>
                    <p>{tierInfo.monthly}€/kk</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p>Sinulla ei ole aktiivista tilausta.</p>
                <Button className="mt-4" onClick={() => window.location.href = '/pricing'}>
                  Tutustu tilausvaihtoehtoihin
                </Button>
              </div>
            )}
          </CardContent>
          {status === 'active' && (
            <CardFooter>
              <Button 
                variant="destructive" 
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
              >
                {cancelLoading ? 'Perutaan...' : 'Peruuta tilaus'}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
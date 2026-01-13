// components/buttons/SubscriptionButton.tsx
'use client';

import { PRICING } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';

export const SubscriptionButton = ({ tier = 'basic' }: { tier?: keyof typeof PRICING }) => {
  const { user } = useUser();

  const handleSubscribe = async () => {
    if (!user) {
      alert('Kirjaudu sisään jatkaaksesi');
      return;
    }

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier, // Lähetä tier backendille
          userId: user.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Virhe tilauksen luonnissa');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Subscription error:', error);
      alert(error instanceof Error ? error.message : 'Tilauksen aloittaminen epäonnistui');
    }
  };

  return (
    <Button onClick={handleSubscribe}>
      Tilaa nyt {PRICING[tier].features}€/kk
    </Button>
  );
};
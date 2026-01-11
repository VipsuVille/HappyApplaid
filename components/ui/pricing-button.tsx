// components/buttons/pricing-button.tsx - PÄIVITETTY

'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { BillingPeriod } from '@/lib/pricing';

export interface PricingButtonProps {
  tier: 'free' | 'basic' | 'premium';
  label: string;
  billingPeriod?: BillingPeriod; // ✅ LISÄTTY
}

export function PricingButton({ tier, label, billingPeriod = 'monthly' }: PricingButtonProps) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!isLoaded) return;

    // FREE: Ohjaa sign-up:iin tai dashboardiin
    if (tier === 'free') {
      if (isSignedIn) {
        router.push('/dashboard');
      } else {
        router.push('/sign-up');
      }
      return;
    }

    // MAKSULLISET: Luo checkout session
    if (!isSignedIn) {
      router.push('/sign-in?redirect=/pricing');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tier,
          billingPeriod // ✅ Lähetä billing period
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Virhe maksusivun avaamisessa. Yritä uudelleen.');
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className={`w-full py-4 text-lg font-bold rounded-xl transition-all ${
        tier === 'free'
          ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          : tier === 'basic'
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg'
          : 'bg-white text-purple-600 hover:bg-purple-50 border-2 border-white'
      }`}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Ladataan...
        </div>
      ) : (
        label
      )}
    </Button>
  );
}
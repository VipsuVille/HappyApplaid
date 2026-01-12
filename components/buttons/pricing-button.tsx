// components/buttons/pricing-button.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Tier, BillingPeriod } from '@/lib/pricing';

export interface PricingButtonProps {
  tier: Tier;
  label: string;
  billingPeriod?: BillingPeriod; // default = monthly
}

export function PricingButton({
  tier,
  label,
  billingPeriod = 'monthly',
}: PricingButtonProps) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!isLoaded || loading) return;

    // FREE
    if (tier === 'free') {
      router.push(isSignedIn ? '/dashboard' : '/sign-up');
      return;
    }

    // PAID but not logged in
    if (!isSignedIn) {
      router.push('/sign-in?redirect=/pricing');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          billingPeriod,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Checkout failed');
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('❌ Checkout error:', err);
      alert('Virhe maksusivun avaamisessa. Yritä uudelleen.');
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className="w-full py-4 text-lg font-semibold"
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Ladataan…
        </span>
      ) : (
        label
      )}
    </Button>
  );
}

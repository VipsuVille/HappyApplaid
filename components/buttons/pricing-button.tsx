// components/pricing-button.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Tier } from '@/lib/pricing';

interface PricingButtonProps {
  tier: Tier;
  label: string;
  disabled?: boolean;
}

export function PricingButton({ tier, label, disabled }: PricingButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { isSignedIn } = useAuth();

const handleClick = async () => {
  console.log('🎯 Button clicked!');
  console.log('🔐 isSignedIn:', isSignedIn);
  console.log('📦 tier:', tier);

  if (!isSignedIn) {
    console.log('❌ Not signed in, redirecting to sign-in');
    router.push('/sign-in?redirect=/pricing');
    return;
  }

  if (tier === 'free') {
    console.log('ℹ️ Free tier, redirecting to dashboard');
    router.push('/dashboard');
    return;
  }

  setLoading(true);
  console.log('🚀 Calling API...');

  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier })
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);

    const data = await response.json();
    console.log('📦 Response data:', data);

    if (data.url) {
      console.log('✅ Got URL, redirecting to:', data.url);
      window.location.href = data.url;
    } else {
      console.error('❌ No URL in response');
      alert('Virhe: ' + (data.error || 'Ei checkout URL:ia'));
      setLoading(false);
    }
  } catch (error) {
    console.error('💥 Fetch error:', error);
    alert('Maksuprosessi epäonnistui');
    setLoading(false);
  }
};

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Ladataan...
        </span>
      ) : label}
    </button>
  );
}
'use client';
// hooks/usePlanStatus.ts
// Yksi yhtenäinen lähde UI:n free/pro-logiikalle. Korvaa useTokens:n näkymissä.
// Lukee /api/user-plan-status → plan, jäljellä olevat AI-luonnit, lukitut ominaisuudet.
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

export interface PlanStatus {
  plan: 'free' | 'pro' | 'premium';
  aiRemaining: number;
  aiLimit: number;
  windowLabel: string; // 'viikko' | 'päivä' | 'kuukausi'
  features: {
    recruiter_verdict: boolean;
    premium_skins: boolean;
  };
}

export function usePlanStatus() {
  const { isSignedIn } = useAuth();
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isSignedIn) { setStatus(null); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/user-plan-status');
      if (res.ok) setStatus(await res.json());
    } catch {
      /* hiljainen — UI toimii ilman statusta */
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => { refresh(); }, [refresh]);

  return {
    status,
    loading,
    refresh, // kutsu generoinnin jälkeen päivittämään jäljellä oleva määrä
    isPaid: status ? status.plan !== 'free' : false,
    /** Onko maksullinen ominaisuus käytössä (esim. can('recruiter_verdict')) */
    can: (f: keyof PlanStatus['features']) => !!status?.features?.[f],
  };
}
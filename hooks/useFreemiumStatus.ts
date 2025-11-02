// hooks/useFreemiumStatus.ts
'use client';

import { useEffect, useState } from 'react';
import type { FreemiumStatus } from '@/lib/types/subscription.types';

export function useFreemiumStatus(userId?: string) {
  const [status, setStatus] = useState<FreemiumStatus>({
    is_premium: false,
    tokens: 0,
    has_used_free_cv: false,
    can_create_cv: true,
    plan_type: 'free',
    cv_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/check-subscription');
        
        if (!response.ok) {
          throw new Error('Failed to fetch subscription status');
        }
        
        const data: FreemiumStatus = await response.json();
        setStatus(data);
      } catch (err) {
        console.error('Error fetching freemium status:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [userId]);

  return { status, loading, error };
}
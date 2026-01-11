// hooks/useFreeUsage.ts
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

export interface FreeUsageInfo {
  hasUsedCV: boolean;
  hasUsedCoverLetter: boolean;
  hasUsedAny: boolean;
  remainingFreeActions: number;
  isLoading: boolean;
}

export function useFreeUsage() {
  const { user, isLoaded } = useUser();
  const [info, setInfo] = useState<FreeUsageInfo>({
    hasUsedCV: false,
    hasUsedCoverLetter: false,
    hasUsedAny: false,
    remainingFreeActions: 1,
    isLoading: true,
  });

  useEffect(() => {
    if (!isLoaded || !user) {
      setInfo(prev => ({ ...prev, isLoading: false }));
      return;
    }

    async function fetchFreeUsage() {
      try {
        const response = await fetch('/api/free-usage');
        
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }

        const data = await response.json();
        
        setInfo({
          hasUsedCV: data.hasUsedCV || false,
          hasUsedCoverLetter: data.hasUsedCoverLetter || false,
          hasUsedAny: data.hasUsedAny || false,
          remainingFreeActions: data.remainingFreeActions || 0,
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to load free usage:', error);
        setInfo(prev => ({ ...prev, isLoading: false }));
      }
    }

    fetchFreeUsage();
  }, [user, isLoaded]);

  return info;
}
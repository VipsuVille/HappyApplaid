// components/SubscriptionCard.tsx - KORJATTU

"use client";

import { useState } from 'react';
import { useSubscription } from '@/context/SubscriptionContext'; // ✅ UUSI CONTEXT
import { Button } from '@/components/ui/button';
import { Loader2, Crown, Calendar, AlertCircle } from 'lucide-react';

export function SubscriptionCard() {
  const { subscription, isLoading, refetch } = useSubscription(); // ✅ CONTEXT
  const [isCanceling, setIsCanceling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  const cancelSubscription = async () => {
    if (!confirm('Haluatko varmasti peruuttaa tilauksen?')) return;
    
    setIsCanceling(true);
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`Tilaus päättyy ${new Date(data.cancelAt).toLocaleDateString('fi-FI')}`);
        await refetch(); // ✅ Päivitä context
      } else {
        alert(`Virhe: ${data.error}`);
      }
    } catch (error) {
      console.error('Cancel error:', error);
      alert('Peruutus epäonnistui');
    } finally {
      setIsCanceling(false);
    }
  };

  const reactivateSubscription = async () => {
    setIsReactivating(true);
    try {
      const response = await fetch('/api/subscription/reactivate', {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Tilaus aktivoitu uudelleen!');
        await refetch(); // ✅ Päivitä context
      } else {
        const data = await response.json();
        alert(`Virhe: ${data.error}`);
      }
    } catch (error) {
      console.error('Reactivate error:', error);
      alert('Uudelleenaktivointi epäonnistui');
    } finally {
      setIsReactivating(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 border-2 border-gray-200 rounded-xl bg-white shadow-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Ladataan tilaustasi...</span>
        </div>
      </div>
    );
  }

  // No subscription / Free tier
  if (!subscription || subscription.plan_type === 'free') {
    return (
      <div className="p-6 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-slate-50">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-gray-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Ilmainen tilaus
            </h3>
            <p className="text-gray-600 mb-4">
              Ei aktiivista maksullista tilausta
            </p>
            <Button asChild className="bg-gradient-to-r from-indigo-600 to-purple-600">
              <a href="/pricing">
                <Crown className="w-4 h-4 mr-2" />
                Päivitä Premium-tiliin
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Active subscription
  return (
    <div className="p-6 border-2 border-indigo-200 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg">
      <div className="space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-md">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold capitalize text-gray-900">
                {subscription.plan_type}-tilaus
              </h3>
              <p className="text-sm text-gray-600">
                Aktiivinen • {subscription.status}
              </p>
            </div>
          </div>
          
          {/* Token Badge */}
          <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border-2 border-indigo-300 shadow-sm">
            <p className="text-sm font-bold text-indigo-900">
              {subscription.tokens} 
              <span className="text-xs ml-1 text-gray-600">tokenia</span>
            </p>
          </div>
        </div>

        {/* Cancellation Warning */}
        {subscription.cancel_at_period_end ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-yellow-800 font-semibold mb-1">
                  ⚠️ Tilaus päättyy
                </p>
                <p className="text-yellow-700 text-sm mb-3">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {new Date(subscription.current_period_end!).toLocaleDateString('fi-FI', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-xs text-yellow-600 mb-3">
                  Tilaus ei uusiudu automaattisesti. Voit perua tämän päätöksen.
                </p>
                <Button
                  onClick={reactivateSubscription}
                  disabled={isReactivating}
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-yellow-50 border-yellow-400"
                >
                  {isReactivating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Peruuta peruutus
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-indigo-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-700 font-medium">
                Seuraava uusiutuminen
              </p>
              <p className="text-sm font-bold text-indigo-900">
                {new Date(subscription.current_period_end!).toLocaleDateString('fi-FI', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <Button
              onClick={cancelSubscription}
              disabled={isCanceling}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              {isCanceling ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Peruuta tilaus
            </Button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Pääset käyttämään palvelua jakson loppuun asti
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
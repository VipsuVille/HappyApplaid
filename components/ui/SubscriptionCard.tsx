// components/SubscriptionCard.tsx - KORJATTU
"use client";
import { useState } from 'react';
import { useSubscription } from '@/components/SubscriptionStatus';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function SubscriptionCard() {
  const { subscription, isLoading } = useSubscription();
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
        window.location.reload();
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
      // ✅ LUO UUSI ENDPOINT: /api/subscription/reactivate
      const response = await fetch('/api/subscription/reactivate', {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Tilaus aktivoitu uudelleen!');
        window.location.reload();
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

  if (isLoading) {
    return <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> Ladataan...</div>;
  }

  if (!subscription || subscription.plan_type === 'free') {
    return (
      <div className="p-6 border rounded-lg">
        <p className="text-gray-600 mb-4">Ei aktiivista tilausta</p>
        <Button asChild>
          <a href="/pricing">Päivitä Premium-tiliin</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg space-y-4">
      <div>
        <h3 className="text-xl font-bold capitalize">{subscription.plan_type}-tilaus</h3>
        <p className="text-gray-600">
          {subscription.tokens} tokenia jäljellä
        </p>
      </div>

      {subscription.cancel_at_period_end ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-800 font-semibold">
            ⚠️ Tilaus päättyy {new Date(subscription.current_period_end!).toLocaleDateString('fi-FI')}
          </p>
          <p className="text-yellow-700 text-sm mt-1">
            Ei uusiudu automaattisesti
          </p>
          <Button
            onClick={reactivateSubscription}
            disabled={isReactivating}
            variant="outline"
            className="mt-3"
          >
            {isReactivating ? <Loader2 className="animate-spin mr-2" /> : null}
            Peruuta peruutus
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Uusiutuu {new Date(subscription.current_period_end!).toLocaleDateString('fi-FI')}
          </p>
          <Button
            onClick={cancelSubscription}
            disabled={isCanceling}
            variant="destructive"
          >
            {isCanceling ? <Loader2 className="animate-spin mr-2" /> : null}
            Peruuta tilaus
          </Button>
        </div>
      )}
    </div>
  );
}
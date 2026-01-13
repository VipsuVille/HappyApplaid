'use client';


//app/components/promoCode.tsx
import { useState } from 'react';

export default function PromoCodeRedeem() {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const redeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setMessage('❌ Syötä promo-koodi');
      return;
    }

    setLoading(true);
    setMessage('⏳ Aktivoidaan...');
    setSuccess(false);

    try {
      const res = await fetch('/api/redeem-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setMessage(`✅ ${data.message}\n🎁 ${data.subscription.tokens} tokenia\n📅 Voimassa ${data.subscription.durationDays} päivää`);
        setCode('');
        
        // Päivitä sivu 2 sekunnin kuluttua
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      } else {
        setSuccess(false);
        setMessage(`❌ ${data.error || 'Virhe aktivoinnissa'}`);
      }
    } catch (error) {
      setSuccess(false);
      setMessage(`❌ Verkkovirhe: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🎁 Promo-koodi
        </h2>
        <p className="text-sm text-gray-600">
          Onko sinulla promo-koodi? Aktivoi se tästä!
        </p>
      </div>

      <form onSubmit={redeemCode} className="space-y-4">
        <div>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Syötä koodi"
            maxLength={20}
            disabled={loading}
            className="w-full px-4 py-3 text-center text-lg font-mono uppercase border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
        >
          {loading ? '⏳ Aktivoidaan...' : '✨ Aktivoi Koodi'}
        </button>
      </form>

      {message && (
        <div className={`mt-4 p-4 rounded-lg whitespace-pre-line text-center ${
          success
            ? 'bg-green-50 text-green-800 border-2 border-green-200' 
            : 'bg-red-50 text-red-800 border-2 border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          💡 Vinkki: Promo-koodin saa Vipsulta
        </p>
      </div>
    </div>
  );
}
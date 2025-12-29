"use client";
import { useState } from "react";

export default function FixImagesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleFix = async () => {
    setLoading(true);
    setResult("Korjataan...");
    
    try {
      const res = await fetch("/api/fix-images", { method: "POST" });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult("Virhe: " + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">🔧 Korjaa kuvat tietokannassa</h1>
      <p className="mb-6 text-gray-600">
        Tämä työkalu korjaa väärät kuva-URLit CV:issä (poistaa tuplat Supabase-polusta)
      </p>
      
      <button
        onClick={handleFix}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors font-bold"
      >
        {loading ? "🔄 Korjataan..." : "▶️ Aja korjaus"}
      </button>
      
      {result && (
        <pre className="mt-6 p-4 bg-gray-100 rounded-lg overflow-auto text-sm border border-gray-300">
          {result}
        </pre>
      )}
    </div>
  );
}
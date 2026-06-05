'use client';
// components/ats/RecruiterVerdict.tsx
// Pudota tämä ats-checker-sivulle omaksi osiokseen ("Ihminen: rekrytoijan verdikti").
import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  CheckCircle2, AlertTriangle, XCircle, HelpCircle, Sparkles, Loader2, UserCheck,
} from 'lucide-react';

type Verdict = 'interview' | 'maybe' | 'pass';
interface Result {
  verdict: Verdict; verdictLabel: string; firstImpression: string;
  strengths: string[]; concerns: string[]; gaps: string[];
  questionsTheydAsk: string[]; fitScore: number; oneLineToFix: string;
}

const VERDICT_STYLE: Record<Verdict, { bg: string; text: string; Icon: any; fallback: string }> = {
  interview: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', Icon: CheckCircle2, fallback: 'Kutsuisin haastatteluun' },
  maybe:     { bg: 'bg-amber-500/10 border-amber-500/30',     text: 'text-amber-400',   Icon: AlertTriangle, fallback: 'Ehkä \u2014 jää harkintaan' },
  pass:      { bg: 'bg-red-500/10 border-red-500/30',         text: 'text-red-400',     Icon: XCircle,       fallback: 'En tässä vaiheessa kutsuisi' },
};

export default function RecruiterVerdict() {
  const { getToken } = useAuth();
  const [coverLetter, setCoverLetter] = useState('');
  const [jobPosting, setJobPosting] = useState('');
  const [tone, setTone] = useState<'strict' | 'neutral' | 'benevolent'>('neutral');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    if (!coverLetter.trim() || !jobPosting.trim()) {
      setError('Liitä sekä hakemuksesi että työpaikkailmoitus.');
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/recruiter-verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ coverLetter, jobPosting, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Virhe');
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Arvio epäonnistui.');
    } finally {
      setLoading(false);
    }
  };

  const v = result ? VERDICT_STYLE[result.verdict] : null;

  return (
    <div className="space-y-6">
      {/* Selittävä yläosa */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
          <UserCheck className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Rekrytoijan verdikti</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tekoäly asettuu ilmoituksen tehneen yrityksen rooliin ja kertoo rehellisesti, oletko hakija jonka he haluavat.
          </p>
        </div>
      </div>

      {/* Syötteet */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Hakemuksesi</label>
          <textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={8}
            placeholder="Liitä hakukirjeesi tai CV:n teksti..."
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3 text-sm text-gray-900 dark:text-gray-100 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none resize-y" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Työpaikkailmoitus</label>
          <textarea value={jobPosting} onChange={(e) => setJobPosting(e.target.value)} rows={8}
            placeholder="Liitä työpaikkailmoituksen teksti..."
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3 text-sm text-gray-900 dark:text-gray-100 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none resize-y" />
        </div>
      </div>

      {/* Sävy + nappi */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Sävy</span>
          {([['strict', 'Tiukka'], ['neutral', 'Neutraali'], ['benevolent', 'Hyväntahtoinen']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setTone(val)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${tone === val ? 'bg-orange-500 text-white border-orange-500' : 'text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-orange-400'}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={run} disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-60 transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Arvioidaan...' : 'Arvioi hakemus'}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Tulos */}
      {result && v && (
        <div className="space-y-5 pt-2">
          {/* Verdikti-banneri + fit-mittari */}
          <div className={`rounded-2xl border p-5 ${v.bg}`}>
            <div className="flex items-center gap-3 mb-3">
              <v.Icon className={`w-6 h-6 ${v.text}`} />
              <span className={`text-lg font-black ${v.text}`}>{result.verdictLabel || v.fallback}</span>
              <span className="ml-auto text-sm font-bold text-gray-500 dark:text-gray-400">{result.fitScore}/100</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full bg-orange-500" style={{ width: `${result.fitScore}%` }} />
            </div>
            {result.firstImpression && (
              <p className="text-sm text-gray-700 dark:text-gray-200 mt-3 italic">&ldquo;{result.firstImpression}&rdquo;</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <ListCard title="Vahvuudet" items={result.strengths} Icon={CheckCircle2} color="text-emerald-500" />
            <ListCard title="Mietityttää" items={result.concerns} Icon={AlertTriangle} color="text-amber-500" />
            <ListCard title="Puuttuu ilmoitukseen nähden" items={result.gaps} Icon={XCircle} color="text-red-500" />
            <ListCard title="Kysymykset haastattelussa" items={result.questionsTheydAsk} Icon={HelpCircle} color="text-blue-500" />
          </div>

          {result.oneLineToFix && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-500">Tärkein korjaus</span>
              <p className="text-sm text-gray-800 dark:text-gray-100 mt-1">{result.oneLineToFix}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ListCard({ title, items, Icon, color }: { title: string; items: string[]; Icon: any; color: string }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-4">
      <div className="flex items-center gap-2 mb-2"><Icon className={`w-4 h-4 ${color}`} /><h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h3></div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (<li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex gap-2"><span className={color}>&bull;</span><span>{it}</span></li>))}
      </ul>
    </div>
  );
}
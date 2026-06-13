'use client';
// components/admin/AdminKnowledge.tsx — lomake materiaalin lisäykseen + lista + poisto.
import { useState, useEffect, useCallback } from 'react';

interface Article {
  source: string; chunks: number; language: string;
  priority: string; content_type: string; topics: string[];
}

export default function AdminKnowledge() {
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [language, setLanguage] = useState('finnish');
  const [contentType, setContentType] = useState('cover_letter');
  const [priority, setPriority] = useState('medium');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);

  const loadArticles = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/knowledge');
      const d = await r.json();
      if (d.ok) setArticles(d.articles || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  const submit = async () => {
    if (content.trim().length < 50) { setMsg({ ok: false, text: 'Sisältöä liian vähän (väh. 50 merkkiä).' }); return; }
    if (!source.trim()) { setMsg({ ok: false, text: 'Anna lähteen nimi.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, source, language, contentType, priority }),
      });
      const d = await r.json();
      if (d.ok) {
        setMsg({ ok: true, text: `Lisätty ${d.chunksAdded} palaa (${d.detectedType}).` });
        setContent(''); setSource('');
        loadArticles();
      } else {
        setMsg({ ok: false, text: d.error || 'Lisäys epäonnistui.' });
      }
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Virhe.' });
    } finally { setBusy(false); }
  };

  const remove = async (src: string) => {
    if (!confirm(`Poista "${src}"?`)) return;
    await fetch(`/api/admin/knowledge?source=${encodeURIComponent(src)}`, { method: 'DELETE' });
    loadArticles();
  };

  const inputCls = 'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm';
  const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1';

  return (
    <div className="space-y-8">
      {/* Lomake */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-5 space-y-4">
        <div>
          <label className={labelCls}>Materiaali (tiivistetyt neuvot — älä liitä raakaa copyright-tekstiä)</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8}
            className={inputCls} placeholder="Esim. periaatteet hyvästä hakukirjeestä, omin sanoin..." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Lähde (nimi)</label>
            <input value={source} onChange={(e) => setSource(e.target.value)} className={inputCls} placeholder="esim. Duunitori-vinkit" />
          </div>
          <div>
            <label className={labelCls}>Kieli</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputCls}>
              <option value="finnish">Suomi</option>
              <option value="english">Englanti</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Tyyppi</label>
            <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={inputCls}>
              <option value="cover_letter">Hakukirje</option>
              <option value="cv">CV</option>
              <option value="both">Molemmat</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Prioriteetti</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
              <option value="high">Korkea</option>
              <option value="medium">Normaali</option>
              <option value="low">Matala</option>
            </select>
          </div>
        </div>

        <button onClick={submit} disabled={busy}
          className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm">
          {busy ? 'Lisätään...' : 'Lisää materiaali'}
        </button>

        {msg && (
          <p className={`text-sm ${msg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {msg.text}
          </p>
        )}
      </div>

      {/* Lista */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Lisätty materiaali ({articles.length})</h2>
        {articles.length === 0 ? (
          <p className="text-sm text-gray-400">Ei materiaalia vielä.</p>
        ) : (
          <ul className="space-y-2">
            {articles.map((a) => (
              <li key={a.source}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{a.source}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {a.language} · {a.content_type} · {a.priority} · {a.chunks} palaa
                  </p>
                </div>
                <button onClick={() => remove(a.source)}
                  className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex-shrink-0">
                  Poista
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
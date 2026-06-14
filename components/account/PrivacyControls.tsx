'use client';
// components/account/PrivacyControls.tsx
// Rehelliset tietosuojavalinnat — ei dark patterneja. Kaikki napit toimivat:
//  • Suostumus tallentuu Clerkin unsafeMetadata:an (ei omaa backendiä).
//  • Tietopyyntö = oikea mailto-linkki.
//  • "Lataa tietoni" = oikea GDPR-vienti (/api/account/export-data) → JSON-lataus.
//  • Politiikkalinkki = kielitietoinen (/tietosuoja FI, /privacy-policy EN).
//  • Eväste-kortti POISTETTU (vain välttämättömät evästeet → ei omaa sivua tarvita).

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { toast } from 'sonner';
import { Mail, FileText, Download, Trash2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

// ⚠️ Pidä TÄSMÄLLEEN samana kuin /tietosuoja- ja /privacy-policy-sivuilla.
const PRIVACY_EMAIL = 'vipsu@protonmail.com';

export function PrivacyControls() {
  const { user, isLoaded } = useUser();
  const { language } = useLanguage();
  const en = language === 'en';

  const initial = Boolean((user?.unsafeMetadata as any)?.marketingConsent);
  const [consent, setConsent] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // kielitietoinen tietosuojaselosteen polku
  const privacyHref = en ? '/privacy-policy' : '/tietosuoja';

  const toggleConsent = async () => {
    if (!user || saving) return;
    const next = !consent;
    setConsent(next); // optimistinen
    setSaving(true);
    try {
      await user.update({
        unsafeMetadata: { ...(user.unsafeMetadata || {}), marketingConsent: next },
      });
      toast.success(next
        ? (en ? 'Consent saved' : 'Suostumus tallennettu')
        : (en ? 'Consent withdrawn' : 'Suostumus peruttu'));
    } catch {
      setConsent(!next); // palauta jos epäonnistui
      toast.error(en ? 'Saving failed' : 'Tallennus epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  // GDPR-vienti: hae JSON ja tarjoa lataus
  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch('/api/account/export-data');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `happyapplaid-${en ? 'my-data' : 'tietoni'}-${
        new Date().toISOString().split('T')[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(en ? 'Your data was downloaded' : 'Tietosi ladattiin');
    } catch {
      toast.error(en ? 'Download failed' : 'Lataus epäonnistui');
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-7 space-y-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
        {en ? 'Privacy' : 'Tietosuoja'}
      </h2>

      {/* Suostumus-toggle */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {en
              ? 'May HappyApplaid send you tips and product news by email?'
              : 'Saako HappyApplaid lähettää sinulle vinkkejä ja tuoteuutisia sähköpostiin?'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {en
              ? 'Optional. You can change this anytime — your account works either way.'
              : 'Vapaaehtoista. Voit muuttaa tämän milloin tahansa — tilisi toimii joka tapauksessa.'}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={consent}
          disabled={!isLoaded || saving}
          onClick={toggleConsent}
          className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${consent ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'} ${saving ? 'opacity-60' : ''}`}
        >
          <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${consent ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {/* Kortit */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Lataa tietoni (GDPR-vienti) */}
        <div className="p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {en ? 'Download my data' : 'Lataa tietoni'}
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
            {en
              ? 'Get a copy of all data stored about you, as a JSON file.'
              : 'Saat kopion kaikista sinusta tallennetuista tiedoista JSON-tiedostona.'}
          </p>
          <button
            onClick={exportData}
            disabled={exporting}
            className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-400 transition-colors disabled:opacity-60"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting
              ? (en ? 'Preparing…' : 'Valmistellaan…')
              : (en ? 'Download data' : 'Lataa tiedot')}
          </button>
        </div>

        {/* Tietopyyntö (mailto, varakeino) */}
        <div className="p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {en ? 'Request your data' : 'Pyydä tietosi'}
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
            {en
              ? 'Prefer to ask in person? Send us a data request by email.'
              : 'Haluatko mieluummin pyytää erikseen? Lähetä tietopyyntö sähköpostilla.'}
          </p>
          <a
            href={`mailto:${PRIVACY_EMAIL}?subject=${encodeURIComponent(en ? 'Data request' : 'Tietopyyntö')}`}
            className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-400 transition-colors"
          >
            {en ? 'Send data request' : 'Lähetä tietopyyntö'}
          </a>
        </div>

        {/* Poista tietoni → vie poisto-osioon */}
        <div className="p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {en ? 'Delete my data' : 'Poista tietoni'}
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
            {en
              ? 'We permanently delete your account and all related data.'
              : 'Poistamme tilisi ja kaikki siihen liittyvät tiedot pysyvästi.'}
          </p>
          <a
            href="#delete-account"
            className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-red-400 transition-colors"
          >
            {en ? 'Go to deletion' : 'Siirry poistoon'}
          </a>
        </div>

        {/* Tietosuojaseloste (kielitietoinen) */}
        <div className="p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {en ? 'Privacy Policy' : 'Tietosuojaseloste'}
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
            {en
              ? 'Read what data we collect and how it is processed.'
              : 'Lue mitä tietoja keräämme ja miten niitä käsitellään.'}
          </p>
          <Link
            href={privacyHref}
            className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-400 transition-colors"
          >
            {en ? 'View Privacy Policy' : 'Näytä tietosuojaseloste'}
          </Link>
        </div>
      </div>
    </section>
  );
}
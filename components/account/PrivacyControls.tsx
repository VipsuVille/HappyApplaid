'use client';
// components/account/PrivacyControls.tsx
// Rehelliset tietosuojavalinnat — ei dark patterneja. Kaikki napit toimivat:
//  • Suostumus tallentuu Clerkin unsafeMetadata:an (ei omaa backendiä).
//  • Tietopyyntö on oikea mailto-linkki.
//  • Politiikkalinkit osoittavat sivuille.

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { toast } from 'sonner';
import { Mail, FileText, Cookie, Trash2, Loader2 } from 'lucide-react';

// Vaihda tämä omaan tietosuojasähköpostiisi
const PRIVACY_EMAIL = 'vipsu@protonmail.com';

export function PrivacyControls() {
  const { user, isLoaded } = useUser();
  const initial = Boolean((user?.unsafeMetadata as any)?.marketingConsent);
  const [consent, setConsent] = useState(initial);
  const [saving, setSaving] = useState(false);

  const toggleConsent = async () => {
    if (!user || saving) return;
    const next = !consent;
    setConsent(next); // optimistinen
    setSaving(true);
    try {
      await user.update({
        unsafeMetadata: { ...(user.unsafeMetadata || {}), marketingConsent: next },
      });
      toast.success(next ? 'Suostumus tallennettu' : 'Suostumus peruttu');
    } catch {
      setConsent(!next); // palauta jos epäonnistui
      toast.error('Tallennus epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-7 space-y-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Tietosuoja</h2>

      {/* Suostumus-toggle */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Saako HappyApplaid lähettää sinulle vinkkejä ja tuoteuutisia sähköpostiin?
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Vapaaehtoista. Voit muuttaa tämän milloin tahansa — tilisi toimii joka tapauksessa.
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
        {/* Tietopyyntö */}
        <div className="p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Pyydä tietosi</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
            Saat kopion kaikista sinusta tallennetuista tiedoista.
          </p>
          <a
            href={`mailto:${PRIVACY_EMAIL}?subject=${encodeURIComponent('Tietopyyntö')}`}
            className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-400 transition-colors"
          >
            Lähetä tietopyyntö
          </a>
        </div>

        {/* Poista tietoni → vie poisto-osioon */}
        <div className="p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Poista tietoni</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
            Poistamme tilisi ja kaikki siihen liittyvät tiedot pysyvästi.
          </p>
          <a
            href="#delete-account"
            className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-red-400 transition-colors"
          >
            Siirry poistoon
          </a>
        </div>

        {/* Tietosuojakäytäntö */}
        <div className="p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Tietosuojakäytäntö</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
            Lue mitä tietoja keräämme ja miten niitä käsitellään.
          </p>
          <Link
            href="/privacy"
            className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-400 transition-colors"
          >
            Näytä tietosuojakäytäntö
          </Link>
        </div>

        {/* Evästekäytäntö */}
        <div className="p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Cookie className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Evästekäytäntö</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
            Lue miten parannamme palvelua evästeiden avulla.
          </p>
          <Link
            href="/cookies"
            className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-400 transition-colors"
          >
            Näytä evästekäytäntö
          </Link>
        </div>
      </div>
    </section>
  );
}
// app/settings/page.tsx  (server component)
import { currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";   // ✅ erikseen, EI /server

import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, User as UserIcon, ShieldCheck } from "lucide-react";
import { DeleteAccountSection } from "@/components/account/DeleteAccountSection";
import { PrivacyControls } from "@/components/account/PrivacyControls";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-[#f7f6f2] dark:bg-[#0b0b0d]">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14 space-y-8">

        {/* Otsikko */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Tili &amp; tietosuoja</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
            Tilin asetukset
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Hallitse tiliäsi ja tietojasi. Sinä päätät mitä säilytetään ja mihin tietojasi käytetään.
          </p>
        </div>

        {/* Perustiedot */}
        <section className="bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-7">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Perustiedot</h2>
          </div>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="space-y-1">
              <dt className="text-xs font-bold uppercase tracking-wider text-gray-400">Nimi</dt>
              <dd className="text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-bold uppercase tracking-wider text-gray-400">Sähköposti</dt>
              <dd className="text-gray-900 dark:text-gray-100 truncate">{user.emailAddresses[0]?.emailAddress}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-bold uppercase tracking-wider text-gray-400">Liittynyt</dt>
              <dd className="text-gray-900 dark:text-gray-100">{new Date(user.createdAt).toLocaleDateString("fi-FI")}</dd>
            </div>
          </dl>
        </section>

        {/* Tietosuoja & valinnat (client) */}
        <PrivacyControls />

        {/* Tilin poisto (olemassa oleva komponentti) */}
        <DeleteAccountSection />

        {/* Kirjaudu ulos */}
        <div className="flex justify-end pt-2">
          <SignOutButton>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <LogOut className="w-4 h-4" />
              Kirjaudu ulos
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
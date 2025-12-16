// components/layout/GlobalLayout.tsx
'use client';

import { useState, useEffect } from 'react'; // <== TÄRKEÄ UUSI IMPORT
import SmartHeader from '@/components/ui/smartHeader';
import SubscriptionProvider from '@/context/SubscriptionContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Toaster } from 'sonner';

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
    // Tila Client-puolen mounttauksen seuraamiseen
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // Asetetaan trueksi vain kerran, kun Client Component on mountattu selaimessa.
        // Tämän jälkeen se tietää, että kaikki selaimen API:t ja globaalit muuttujat ovat käytettävissä.
        setIsMounted(true);
    }, []);

    // 🎯 Käsittele tilanne, jossa renderöidään Server Componentista Client Componentiin
    if (!isMounted) {
        // Kun komponentti renderöidään ensin palvelimella (tai kun client lataa), 
        // palauta vain Server Componentin odottama sisältö.
        // Koska children on peräisin Server Componentista (ClerkProvider), 
        // palautetaan vain sisältö, joka pysyy samana.
        // Tämä minimoi hydraatiomisfitin.
        // HUOM: Joskus pelkkä 'return null;' voi toimia paremmin, mutta Next.js App Routerissa
        // on usein turvallisempaa palauttaa staattinen kuori, jos se on mahdollista.
        
        // Tässä tapauksessa, koska Clerkin pitäisi hallita lataustilaa, 
        // Viivästetään KAIKEN dynaamisen Client Component sisällön renderöinti.
        return (
             <div id="app-root-wrapper" className="min-h-screen flex flex-col">
                 <main className="flex-grow">{children}</main>
             </div>
        );
    }
    
    // Vasta kun isMounted on true (eli komponentti on selaimessa), 
    // renderöidään koko dynaaminen puu Providersien ja SmartHeaderin kanssa.
    return (
        <div id="app-root-wrapper" className="min-h-screen flex flex-col">
            <SubscriptionProvider>
                <LanguageProvider>
                    
                    {/* TÄMÄ RENDERÖI VASTA isMounted:in JÄLKEEN */}
                    <SmartHeader />
                    
                    <main className="flex-grow">
                        {children}
                    </main>

                    <Toaster position="top-center" />
                </LanguageProvider>
            </SubscriptionProvider>
        </div>
    );
}
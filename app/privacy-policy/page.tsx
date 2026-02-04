// app/account/page.tsx - FULL GDPR COMPLIANCE
'use client';

import { useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { 
  User, Mail, Phone, MapPin, Download, 
  Trash2, Shield, FileText, Loader2, CheckCircle,
  AlertTriangle, Info
} from 'lucide-react';

export default function AccountPage() {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showGDPR, setShowGDPR] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // ═══════════════════════════════════════════════════════════════
  // DOWNLOAD ALL USER DATA (GDPR ARTICLE 15 & 20)
  // ═══════════════════════════════════════════════════════════════
  
  const handleDownloadData = async () => {
    setIsDownloading(true);
    setErrorMessage('');
    
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/account/export-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      const data = await response.json();
      
      // Create JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      setSuccessMessage('✅ Tietosi on ladattu onnistuneesti!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      console.error('Export error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Lataus epäonnistui');
    } finally {
      setIsDownloading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // DELETE ACCOUNT (GDPR ARTICLE 17 - RIGHT TO BE FORGOTTEN)
  // ═══════════════════════════════════════════════════════════════
  
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'POISTA') {
      setErrorMessage('Kirjoita "POISTA" vahvistaaksesi');
      return;
    }
    
    if (!confirm('VIIMEINEN VAROITUS: Kaikki tietosi poistetaan pysyvästi. Tätä toimintoa ei voi peruuttaa!')) {
      return;
    }
    
    setIsDeleting(true);
    setErrorMessage('');
    
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }
      
      // Redirect to goodbye page
      window.location.href = '/goodbye';
      
    } catch (error) {
      console.error('Delete error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Poisto epäonnistui');
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Oma tili</h1>
          <p className="text-muted-foreground">
            Hallitse tietojasi ja yksityisyyttäsi (GDPR-yhteensopiva)
          </p>
        </div>

        {/* NOTIFICATIONS */}
        {successMessage && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <p className="text-green-100 font-bold flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {successMessage}
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-100 font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {errorMessage}
            </p>
          </div>
        )}

        <div className="grid gap-6">
          
          {/* ═════════════════════════════════════════════════════
              SECTION 1: USER INFO
              ═════════════════════════════════════════════════════ */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              Perustiedot
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Sähköposti</p>
                  <p className="font-semibold">{user?.primaryEmailAddress?.emailAddress || 'Ei asetettu'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Nimi</p>
                  <p className="font-semibold">{user?.fullName || 'Ei asetettu'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Käyttäjätunnus</p>
                  <p className="font-mono text-xs">{userId}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <a
                href="/user-profile"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                Muokkaa profiilia
              </a>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════
              SECTION 2: GDPR RIGHTS
              ═════════════════════════════════════════════════════ */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Tietosuojaoikeutesi (GDPR)
            </h2>

            <div className="space-y-4 mb-6">
              {/* RIGHT TO ACCESS (ARTICLE 15) */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <Download className="w-5 h-5 text-blue-400" />
                  Oikeus tarkastaa tietosi
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Lataa kaikki tietosi JSON-muodossa (GDPR Art. 15 & 20)
                </p>
                <button
                  onClick={handleDownloadData}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                      Ladataan...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 inline mr-2" />
                      Lataa tietoni
                    </>
                  )}
                </button>
              </div>

              {/* RIGHT TO RECTIFICATION (ARTICLE 16) */}
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <h3 className="font-bold mb-2">✅ Oikeus korjata tietosi</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Voit muokata tietojasi milloin tahansa profiilisivulla (GDPR Art. 16)
                </p>
                <a
                  href="/user-profile"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                >
                  Muokkaa tietoja
                </a>
              </div>

              {/* INFO BOXES */}
              <div className="p-4 bg-muted/50 rounded-xl">
                <h3 className="font-bold mb-2">ℹ️ Muut oikeutesi:</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• <strong>Oikeus rajoittaa käsittelyä</strong> (Art. 18): Ota yhteyttä tukeen</li>
                  <li>• <strong>Oikeus vastustaa</strong> (Art. 21): Voit kieltää markkinointiviesit</li>
                  <li>• <strong>Oikeus tehdä valitus</strong> (Art. 77): Tietosuojavaltuutettu (tietosuoja.fi)</li>
                </ul>
              </div>
            </div>

            {/* GDPR POLICY LINK */}
            <button
              onClick={() => setShowGDPR(!showGDPR)}
              className="w-full px-4 py-3 bg-muted hover:bg-muted/80 rounded-xl font-bold flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Lue täydellinen tietosuojaseloste
              </span>
              <span>{showGDPR ? '▼' : '▶'}</span>
            </button>

            {showGDPR && <GDPRPolicy />}
          </div>

          {/* ═════════════════════════════════════════════════════
              SECTION 3: DANGER ZONE (DELETE Account)
              ═════════════════════════════════════════════════════ */}
          <div className="bg-red-500/5 border border-red-500/30 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-red-400">
              <Trash2 className="w-6 h-6" />
              Vaarallinen vyöhyke
            </h2>

            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <h3 className="font-bold mb-2 text-red-300">
                ⚠️ Oikeus tulla unohdetuksi (GDPR Art. 17)
              </h3>
              <p className="text-sm text-red-200/80 mb-2">
                Voit poistaa tilisi ja kaikki tietosi pysyvästi. Tämä sisältää:
              </p>
              <ul className="text-sm text-red-200/80 space-y-1 ml-4">
                <li>• Kaikki hakukirjeet ja CV:t</li>
                <li>• Profiilitiedot</li>
                <li>• Käyttöhistoria</li>
                <li>• Ladatut tiedostot</li>
              </ul>
              <p className="text-sm text-red-200/80 mt-3">
                <strong>HUOM:</strong> Laskutustiedot säilytetään 6 vuotta kirjanpitolain mukaan.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-red-300">
                  Kirjoita "POISTA" vahvistaaksesi
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Kirjoita POISTA (isoilla kirjaimilla)"
                  className="w-full px-4 py-2 bg-background border border-red-500/50 rounded-xl focus:outline-none focus:border-red-500"
                />
              </div>

              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmation !== 'POISTA'}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-red-700 transition-colors"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-5 h-5 inline mr-2 animate-spin" />
                    Poistetaan...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5 inline mr-2" />
                    Poista tili pysyvästi
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════
              SECTION 4: CONTACT
              ═════════════════════════════════════════════════════ */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">💬 Kysymyksiä tietosuojasta?</h2>
            <p className="text-muted-foreground mb-4">
              Vastaamme tietosuojakyselyihin 14 päivän kuluessa.
            </p>
            <div className="space-y-2 text-sm">
              <p>📧 <strong>Sähköposti:</strong> privacy@yourcvapp.com</p>
              <p>📍 <strong>Osoite:</strong> [YRITYKSESI OSOITE]</p>
              <p>🏢 <strong>Y-tunnus:</strong> [Y-TUNNUS]</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GDPR POLICY COMPONENT (Collapsible)
// ═══════════════════════════════════════════════════════════════

function GDPRPolicy() {
  return (
    <div className="mt-6 prose prose-invert max-w-none bg-muted/30 rounded-xl p-6 text-sm">
      <h2 className="text-xl font-bold mb-4">📜 Tietosuojaseloste (GDPR)</h2>
      
      <p><strong>Viimeksi päivitetty:</strong> 2.2.2026</p>
      <p><strong>Yritys:</strong> [YRITYKSESI NIMI]</p>
      <p><strong>Y-tunnus:</strong> [Y-TUNNUS]</p>
      <p><strong>Yhteyshenkilö:</strong> privacy@yourcvapp.com</p>

      <hr className="my-6 border-border" />

      <h3 className="text-lg font-bold mt-6 mb-3">1. Kuka on rekisterinpitäjä?</h3>
      <ul>
        <li><strong>Nimi:</strong> [YRITYKSESI NIMI]</li>
        <li><strong>Osoite:</strong> [OSOITE]</li>
        <li><strong>Y-tunnus:</strong> [Y-TUNNUS]</li>
        <li><strong>Yhteyshenkilö:</strong> privacy@yourcvapp.com</li>
      </ul>

      <h3 className="text-lg font-bold mt-6 mb-3">2. Mitä tietoja keräämme?</h3>
      
      <h4 className="font-bold mt-4 mb-2">2.1 Pakolliset tiedot</h4>
      <ul>
        <li>Nimi (hakukirjeen luomiseen)</li>
        <li>Sähköpostiosoite (tilin tunnistamiseen)</li>
        <li>Puhelinnumero (hakukirjeen yhteystietoihin)</li>
      </ul>

      <h4 className="font-bold mt-4 mb-2">2.2 Vapaaehtoiset tiedot</h4>
      <ul>
        <li>Sijainti</li>
        <li>Työkokemus, koulutus, taidot</li>
        <li>Persoonallisuustiedot (työtyyli, ongelmanratkaisu, vahvuudet)</li>
      </ul>

      <h4 className="font-bold mt-4 mb-2">2.3 Automaattisesti kerätyt tiedot</h4>
      <ul>
        <li>Tekninen data: IP-osoite, selaintyyppi, käyttöjärjestelmä</li>
        <li>Käyttödata: Kirjautumisajat, palvelun käyttö</li>
        <li>Evästeet: Istunnon hallinta</li>
      </ul>

      <h3 className="text-lg font-bold mt-6 mb-3">3. Miksi keräämme tietoja?</h3>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="p-2">Käyttötarkoitus</th>
            <th className="p-2">Oikeusperuste</th>
            <th className="p-2">Säilytysaika</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="p-2">Hakukirjeiden luominen AI:lla</td>
            <td className="p-2">Sopimus</td>
            <td className="p-2">Tilin ajan</td>
          </tr>
          <tr className="border-b border-border">
            <td className="p-2">Tilin hallinta</td>
            <td className="p-2">Sopimus</td>
            <td className="p-2">Tilin ajan</td>
          </tr>
          <tr className="border-b border-border">
            <td className="p-2">Laskutus</td>
            <td className="p-2">Lakisääteinen velvoite</td>
            <td className="p-2">6 vuotta</td>
          </tr>
        </tbody>
      </table>

      <h3 className="text-lg font-bold mt-6 mb-3">4. Kenelle tietoja luovutetaan?</h3>
      
      <h4 className="font-bold mt-4 mb-2">4.1 Kolmannet osapuolet</h4>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="p-2">Palvelu</th>
            <th className="p-2">Käyttötarkoitus</th>
            <th className="p-2">Sijainti</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="p-2"><strong>Clerk</strong></td>
            <td className="p-2">Käyttäjien tunnistus</td>
            <td className="p-2">USA (EU-DPA ✅)</td>
          </tr>
          <tr className="border-b border-border">
            <td className="p-2"><strong>Supabase</strong></td>
            <td className="p-2">Tietokanta</td>
            <td className="p-2">EU (Saksa) ✅</td>
          </tr>
          <tr className="border-b border-border">
            <td className="p-2"><strong>OpenAI</strong></td>
            <td className="p-2">AI-tekstin generointi</td>
            <td className="p-2">USA (EU-DPA ✅)</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
        <p className="font-bold mb-2">🔒 Mitä tietoja lähetämme OpenAI:lle?</p>
        <p className="text-sm mb-2">OpenAI:lle lähetetään:</p>
        <ul className="text-sm">
          <li>✅ Työpaikkailmoitus</li>
          <li>✅ Työkokemus, koulutus, taidot (ANONYMISOITU)</li>
          <li>❌ <strong>EI KOSKAAN:</strong> Nimi, email, puhelin, osoite</li>
        </ul>
        <p className="text-sm mt-2">
          OpenAI <strong>EI käytä</strong> tietojasi mallien koulutukseen (Zero Data Retention).
          Data säilytetään 30 päivää väärinkäytösten estämiseksi.
        </p>
      </div>

      <h3 className="text-lg font-bold mt-6 mb-3">5. Oikeutesi (GDPR)</h3>
      <ul>
        <li><strong>Tarkastaa tietosi</strong> (Art. 15): Lataa tietosi JSON-muodossa</li>
        <li><strong>Korjata tietosi</strong> (Art. 16): Muokkaa profiilisivulla</li>
        <li><strong>Poistaa tietosi</strong> (Art. 17): "Poista tili" -nappi</li>
        <li><strong>Siirtää tiedot</strong> (Art. 20): Lataa JSON-muodossa</li>
        <li><strong>Rajoittaa käsittelyä</strong> (Art. 18): Ota yhteyttä</li>
        <li><strong>Tehdä valitus</strong> (Art. 77): Tietosuojavaltuutettu (tietosuoja.fi)</li>
      </ul>

      <h3 className="text-lg font-bold mt-6 mb-3">6. Tietoturva</h3>
      <ul>
        <li>✅ TLS/SSL-salaus kaikissa yhteyksissä</li>
        <li>✅ Supabase AES-256-salaus</li>
        <li>✅ Pääsynhallinta: Vain valtuutetut työntekijät</li>
        <li>✅ Automaattiset varmuuskopiot</li>
        <li>✅ Tietomurto-ilmoitus: 72h kuluessa</li>
      </ul>

      <h3 className="text-lg font-bold mt-6 mb-3">7. Evästeet (Cookies)</h3>
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="p-2">Eväste</th>
            <th className="p-2">Tyyppi</th>
            <th className="p-2">Tarkoitus</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="p-2">__clerk_db_jwt</td>
            <td className="p-2">Välttämätön</td>
            <td className="p-2">Kirjautuminen</td>
          </tr>
          <tr className="border-b border-border">
            <td className="p-2">sb-access-token</td>
            <td className="p-2">Välttämätön</td>
            <td className="p-2">Supabase-istunto</td>
          </tr>
        </tbody>
      </table>

      <h3 className="text-lg font-bold mt-6 mb-3">8. Lasten tietosuoja</h3>
      <p>
        Palvelu on tarkoitettu vain <strong>16 vuotta täyttäneille</strong>.
        Jos alle 16-vuotias on rekisteröitynyt, ota yhteyttä: privacy@yourcvapp.com
      </p>

      <h3 className="text-lg font-bold mt-6 mb-3">9. Yhteystiedot</h3>
      <ul>
        <li>📧 <strong>Sähköposti:</strong> privacy@yourcvapp.com</li>
        <li>📍 <strong>Postiosoite:</strong> [OSOITE]</li>
        <li>⏰ <strong>Vastausaika:</strong> 14 päivää</li>
      </ul>

      <hr className="my-6 border-border" />

      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
        <h3 className="font-bold mb-2">✅ GDPR-yhteenveto (tiivistelmä)</h3>
        <ul className="text-sm space-y-1">
          <li>✅ <strong>Mitä keräämme:</strong> Nimi, email, puhelin, työhistoria</li>
          <li>✅ <strong>Miksi:</strong> Hakukirjeiden luominen AI:lla</li>
          <li>✅ <strong>Mihin:</strong> Supabase (EU), OpenAI (USA, GDPR-sopimus)</li>
          <li>✅ <strong>Oikeutesi:</strong> Tarkastaa, korjata, poistaa, siirtää</li>
          <li>✅ <strong>Säilytys:</strong> Tilin ajan, laskutus 6v</li>
          <li>✅ <strong>Yhteyttä:</strong> privacy@yourcvapp.com</li>
        </ul>
      </div>
    </div>
  );
}
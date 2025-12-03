import { Crown, Sparkles, Zap, Target, FileText, Check, Database, TrendingUp, Shield } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-8">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero */}
        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-2xl p-12 mb-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-100/80 to-purple-100/80 border border-white/40 mb-4">
              <Crown className="w-5 h-5 text-indigo-700" />
              <span className="text-sm font-bold text-indigo-800 uppercase">Hinnoittelu</span>
            </div>
            
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Valitse Sopiva Tilaus
            </h1>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto mb-6">
              Aloita ilmaiseksi tai päivitä maksulliseen tilaukseen
            </p>

            {/* Token-selitys */}
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-indigo-200">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span className="text-sm text-gray-700">
                <strong>1 CV = 50 tokenia</strong> | <strong>1 Hakukirje = 50 tokenia</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* FREE */}
          <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all">
            <div className="text-center mb-6">
              <div className="h-16 w-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-gray-400 to-gray-600">
                <FileText className="h-8 w-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Free</h2>
              
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-4xl font-bold text-gray-900">0€</span>
                <span className="text-lg text-gray-600">/kk</span>
              </div>
              
              <p className="text-sm text-gray-600">Kokeile palvelua</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                <span className="text-sm text-gray-700">1 ilmainen CV</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                <span className="text-sm text-gray-700">Profiilitiedot tallennetaan</span>
              </div>
              <div className="flex items-start gap-3 opacity-50">
                <span className="text-sm text-gray-500">❌ Ei hakukirjeitä</span>
              </div>
            </div>

            <button className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold">
              Kokeile ilmaiseksi
            </button>
          </div>

          {/* BASIC */}
          <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all">
            <div className="text-center mb-6">
              <div className="h-16 w-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <Zap className="h-8 w-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Basic</h2>
              
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-4xl font-bold text-gray-900">4.99€</span>
                <span className="text-lg text-gray-600">/kk</span>
              </div>
              
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 rounded-full">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-700">1000 tokenia</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                <span className="text-sm text-gray-700"><strong>Rajattomat CV:t</strong> (50t/kpl)</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                <span className="text-sm text-gray-700"><strong>Rajattomat hakukirjeet</strong> (50t/kpl)</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                <span className="text-sm text-gray-700">Kohdennetut työpaikkahakemukset</span>
              </div>
              <div className="flex items-start gap-3 opacity-50">
                <span className="text-sm text-gray-500">❌ Ei ATS-optimointia</span>
              </div>
            </div>

            <button className="w-full py-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
              Valitse Basic
            </button>
          </div>

          {/* SEMI-PRO */}
          <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all">
            <div className="text-center mb-6">
              <div className="h-16 w-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-purple-500 to-pink-600">
                <Target className="h-8 w-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Semi-Pro</h2>
              
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-4xl font-bold text-gray-900">9.99€</span>
                <span className="text-lg text-gray-600">/kk</span>
              </div>
              
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 rounded-full">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-purple-700">2000 tokenia</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-purple-600 mt-0.5" />
                <span className="text-sm text-gray-700">Kaikki Basic-ominaisuudet</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-purple-600 mt-0.5" />
                <span className="text-sm text-gray-700"><strong>ATS-optimoidut CV:t</strong></span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-purple-600 mt-0.5" />
                <span className="text-sm text-gray-700"><strong>ATS-optimoidut hakukirjeet</strong></span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-purple-600 mt-0.5" />
                <span className="text-sm text-gray-700">Läpäise isojen yhtiöiden tekoälysuodattimet</span>
              </div>
            </div>

            <button className="w-full py-3 bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
              Valitse Semi-Pro
            </button>
          </div>

          {/* PRO - MOST POPULAR */}
          <div className="backdrop-blur-xl bg-white/70 border-2 border-yellow-400 rounded-2xl shadow-2xl p-6 hover:shadow-3xl transition-all md:scale-105 md:-mt-4 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2">
              <Crown className="h-4 w-4" />
              <span className="text-sm font-bold">Suosituin</span>
            </div>

            <div className="text-center mb-6 mt-2">
              <div className="h-16 w-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-yellow-500 to-orange-500">
                <Crown className="h-8 w-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pro</h2>
              
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-4xl font-bold text-gray-900">15.99€</span>
                <span className="text-lg text-gray-600">/kk</span>
              </div>
              
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 rounded-full">
                <Sparkles className="w-4 h-4 text-yellow-600" />
                <span className="text-xs font-bold text-yellow-700">3000 tokenia</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-yellow-600 mt-0.5" />
                <span className="text-sm text-gray-700">Kaikki Semi-Pro -ominaisuudet</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-yellow-600 mt-0.5" />
                <span className="text-sm text-gray-700"><strong>RAG-artikkelit</strong></span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-yellow-600 mt-0.5" />
                <span className="text-sm text-gray-700">AI "boostaus" eksperttitiedolla</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-yellow-600 mt-0.5" />
                <span className="text-sm text-gray-700">Jatkuvasti päivittyvä tietokanta</span>
              </div>
            </div>

            <button className="w-full py-3 bg-gradient-to-br from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2">
              <Crown className="h-5 w-5" />
              Valitse Pro
            </button>
          </div>
        </div>

        {/* RAG-selitys */}
        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 h-16 w-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Database className="h-8 w-8 text-white" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                Mitä on RAG-teknologia?
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                  Vain PRO
                </span>
              </h3>
              
              <p className="text-gray-700 mb-4 leading-relaxed">
                RAG (Retrieval-Augmented Generation) on tekoälyteknologia, joka <strong>boostaa AI:n osaamista eksperttiartikkeleilla</strong>. 
                Kun luot CV:n tai hakukirjeen, järjestelmä hakee automaattisesti sopivimmat asiantuntija-artikkelit tietokannasta 
                ja käyttää niitä parantaakseen sisällön laatua.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Paremmat tulokset</h4>
                    <p className="text-sm text-gray-600">AI käyttää todellista asiantuntijatietoa, ei pelkkää yleistä tietoa</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl">
                  <Shield className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Aina ajantasalla</h4>
                    <p className="text-sm text-gray-600">Artikkelit päivitetään jatkuvasti uusimpien trendien mukaan</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl">
                  <Sparkles className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Kohdennettu tieto</h4>
                    <p className="text-sm text-gray-600">Järjestelmä valitsee juuri sinun alasi ja työpaikkasi kannalta oleellisen tiedon</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ATS-selitys */}
        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 h-16 w-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Target className="h-8 w-8 text-white" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                Mitä on ATS-optimointi?
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                  Semi-Pro & Pro
                </span>
              </h3>
              
              <p className="text-gray-700 mb-4 leading-relaxed">
                <strong>ATS (Applicant Tracking System)</strong> on tekoäly, jota suuret yritykset käyttävät hakijoiden karsimiseen. 
                Se lukee CV:si ja hakukirjeesi, ja päättää pääsetkö ihmisrekrytoijan luettavaksi. 
                <strong>Jopa 75% hakijoista karsiutuu ATS:n takia</strong> - vaikka olisivat muuten sopivia!
              </p>

              <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 p-4 rounded-xl mb-4">
                <p className="text-sm text-gray-700">
                  <strong className="text-red-700">⚠️ Ilman ATS-optimointia:</strong> CV:si voi sisältää oikeita taitoja, 
                  mutta väärällä termistöllä → ATS ei tunnista niitä → hakemus hylätään automaattisesti
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl">
                  <h4 className="font-bold text-green-700 mb-2">✅ ATS-optimoitu hakemus</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Oikeat avainsanat työpaikkailmoituksesta</li>
                    <li>• Mitattavat saavutukset numeroilla</li>
                    <li>• ATS-ystävällinen muotoilu</li>
                    <li>• Teollisuusstandardi-termistö</li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl">
                  <h4 className="font-bold text-indigo-700 mb-2">📈 Tulokset</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• 3x todennäköisempi päästä haastatteluun</li>
                    <li>• Läpäisee automaattiset suodattimet</li>
                    <li>• Erottuu muista hakijoista</li>
                    <li>• Sopii isoille yhtiöille (Nokia, Microsoft jne.)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vertailu */}
        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Ominaisuuksien Vertailu</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left p-4 font-bold text-gray-700">Ominaisuus</th>
                  <th className="text-center p-4 font-bold text-gray-500">Free</th>
                  <th className="text-center p-4 font-bold text-blue-700">Basic</th>
                  <th className="text-center p-4 font-bold text-purple-700">Semi-Pro</th>
                  <th className="text-center p-4 font-bold text-yellow-700">Pro</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium">CV:iden määrä</td>
                  <td className="text-center p-4 text-gray-500">1 kpl</td>
                  <td className="text-center p-4 text-blue-700">Rajaton</td>
                  <td className="text-center p-4 text-purple-700">Rajaton</td>
                  <td className="text-center p-4 text-yellow-700">Rajaton</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium">Hakukirjeet</td>
                  <td className="text-center p-4 text-gray-500">❌</td>
                  <td className="text-center p-4 text-blue-700">Rajaton</td>
                  <td className="text-center p-4 text-purple-700">Rajaton</td>
                  <td className="text-center p-4 text-yellow-700">Rajaton</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium">Tokeneita/kk</td>
                  <td className="text-center p-4 text-gray-500">0</td>
                  <td className="text-center p-4 text-blue-700 font-bold">1000</td>
                  <td className="text-center p-4 text-purple-700 font-bold">2000</td>
                  <td className="text-center p-4 text-yellow-700 font-bold">3000</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium">ATS-optimointi</td>
                  <td className="text-center p-4 text-gray-500">❌</td>
                  <td className="text-center p-4 text-blue-700">❌</td>
                  <td className="text-center p-4 text-purple-700">✅</td>
                  <td className="text-center p-4 text-yellow-700">✅</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">RAG-artikkelit</td>
                  <td className="text-center p-4 text-gray-500">❌</td>
                  <td className="text-center p-4 text-blue-700">❌</td>
                  <td className="text-center p-4 text-purple-700">❌</td>
                  <td className="text-center p-4 text-yellow-700">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
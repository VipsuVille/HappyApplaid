import { SignUp } from "@clerk/nextjs";
import { Sparkles, Check } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 font-sans text-gray-900 selection:bg-amber-300 selection:text-gray-900 relative overflow-hidden flex items-center justify-center p-4">
      
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-400/20 to-yellow-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Side - Sign Up Form */}
          <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-2xl shadow-indigo-500/10 p-8 md:p-12 backdrop-saturate-150 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-purple-100/30 pointer-events-none rounded-3xl"></div>
            
            <div className="relative z-10">
              {/* Logo/Title Section */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
                  HappyApplaid
                </h1>
                <p className="text-gray-600 text-lg">
                  Aloita ilmaiseksi tänään
                </p>
              </div>

              {/* Clerk Sign Up Component */}
              <div className="flex justify-center">
                <SignUp 
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "bg-transparent shadow-none",
                    }
                  }}
                />
              </div>

              {/* Footer Text */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Onko sinulla jo tili?{" "}
                  <a href="/sign-in" className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
                    Kirjaudu sisään
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Benefits */}
          <div className="hidden lg:flex flex-col justify-center">
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-2xl shadow-indigo-500/10 p-8 backdrop-saturate-150 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-purple-100/30 pointer-events-none rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-100/80 to-purple-100/80 backdrop-blur-sm border border-white/40 shadow-lg shadow-indigo-500/10 mb-6">
                  <Sparkles className="w-5 h-5 text-indigo-700" />
                  <span className="text-sm font-extrabold text-indigo-800 uppercase tracking-wider">
                    Aloita Ilmaiseksi
                  </span>
                </div>

                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Miksi HappyApplaid?
                </h2>

                <div className="space-y-4">
                  {[
                    {
                      title: "1 Ilmainen CV",
                      description: "Luo ensimmäinen persoonallisuusvetoinen CV:si ilmaiseksi"
                    },
                    {
                      title: "Tekoälyavusteinen",
                      description: "Edistynyt AI optimoi CV:si työnhakua varten"
                    },
                    {
                      title: "ATS-optimointi",
                      description: "Läpäise automaattiset seulontajärjestelmät helposti"
                    },
                    {
                      title: "Nopea aloitus",
                      description: "Luo ensimmäinen CV:si alle 5 minuutissa"
                    },
                    {
                      title: "Turvallinen",
                      description: "Tietosi on salattu ja täysin suojattu"
                    }
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-6 w-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">
                          {benefit.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                  <p className="text-sm text-gray-700 text-center">
                    <span className="font-bold">Ei luottokorttia tarvita</span> ilmaisen CV:n luomiseen
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="text-center mt-6">
          <a href="/" className="text-gray-600 hover:text-gray-900 transition-colors font-medium inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Takaisin etusivulle
          </a>
        </div>
      </div>
    </div>
  );
}
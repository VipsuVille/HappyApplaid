// app/create-cover-letter/page.tsx - V1 (TAVALLINEN) vs V2 (ATS-OPTIMOITU)
"use client";
import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  HelpCircle,
  Send,
  ArrowLeft,
  Sparkles,
  Lock,
  Zap,
  CheckCircle,
} from "lucide-react";
import { useSubscription } from "@/components/SubscriptionStatus";
import SmartHeader from "@/components/ui/smartHeader";

interface PersonalityProfile {
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  superpower?: string;
}

type Language = "finnish" | "english" | "swedish" | string;
type Style = "formal" | "casual";
type CoverLetterVersion = "v1" | "v2"; // V1 = tavallinen, V2 = ATS-optimoitu

export default function CreateCoverLetter() {
  const { user } = useUser();
  const { userId } = useAuth();
  const router = useRouter();
  const { subscription, isLoading: subscriptionLoading, isActive } = useSubscription();

  const [jobDescription, setJobDescription] = useState("");
  const [personalNotes, setPersonalNotes] = useState("");
  const [language, setLanguage] = useState<Language>("finnish");
  const [customLanguage, setCustomLanguage] = useState<string>("");
  const [style, setStyle] = useState<Style>("formal");
  const [showCustomLanguage, setShowCustomLanguage] = useState(false);

  // ✅ UUSI: V1 vs V2 valinta
  const [selectedVersion, setSelectedVersion] = useState<CoverLetterVersion>("v1");
  const isPremium = isActive && subscription?.plan_type === "premium";

  const [personalityProfile, setPersonalityProfile] = useState<PersonalityProfile>({});
  const [hasPersonalityData, setHasPersonalityData] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load personality profile
  useEffect(() => {
    const loadPersonalityProfile = async () => {
      if (!userId) return;

      try {
        const response = await fetch(`/api/user-profile/${userId}`);
        if (response.ok) {
          const profileData = await response.json();
          const personality: PersonalityProfile = {
            workingStyle: profileData.working_style,
            problemSolving: profileData.problem_solving,
            energySources: profileData.energy_sources,
            uniqueStrength: profileData.unique_strength,
            learningStyle: profileData.learning_style,
            teamRole: profileData.team_role,
            valuesExample: profileData.values_example,
            superpower: profileData.superpower,
          };

          setPersonalityProfile(personality);
          const hasData = Object.values(personality).some(
            (value) => value && value.trim().length > 0
          );
          setHasPersonalityData(hasData);
        }
      } catch (error) {
        console.error("Failed to load personality profile:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadPersonalityProfile();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ TARKISTA TILAUS
    if (!isActive) {
      setError("Tilaajille suunnattu ominaisuus. Osta tilaus käyttääksesi.");
      return;
    }

    // ✅ TARKISTA PREMIUM (jos V2 valittu)
    if (selectedVersion === "v2" && !isPremium) {
      setError("ATS-optimoitu hakukirje vaatii Premium-tilauksen. Päivitä tilaus!");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Työpaikkailmoitus on pakollinen");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const fullName = user?.fullName || "";
      const email = user?.primaryEmailAddress?.emailAddress || "";
      const phoneNumber = user?.phoneNumbers?.[0]?.phoneNumber || "";
      const userProfile = await fetchUserProfile(userId!);
      const selectedLanguage = showCustomLanguage ? customLanguage : language;

      const payload = {
        userId,
        jobDescription: jobDescription.trim(),
        personalNotes: personalNotes.trim(),
        name: fullName,
        email: email,
        phone: phoneNumber,
        jobTitle: userProfile?.job_title || "",
        education: userProfile?.education || "",
        workExperience: userProfile?.work_experience || "",
        skills: userProfile?.skills || "",
        language: selectedLanguage,
        style,
        ...personalityProfile,
      };

      // ✅ VALITSE OIKEA API VERSION MUKAAN
      const apiEndpoint = selectedVersion === "v2" 
        ? "/api/generate-cover-letter-v2" 
        : "/api/generate-cover-letter";

      console.log(`📡 Calling ${apiEndpoint}...`);

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // ✅ ERIKOISKÄSITTELY PREMIUM-VAATIMUKSELLE
        if (errorData.error === "PREMIUM_REQUIRED") {
          setError(
            "🔒 ATS-optimoitu hakukirje vaatii Premium-tilauksen. " +
            "Päivitä tilaus tai valitse tavallinen hakukirje."
          );
          return;
        }
        
        throw new Error(errorData.error || "Hakukirjeen luonti epäonnistui");
      }

      const data = await response.json();

      if (data.questions && data.questions.length > 0) {
        // Kysymyksiä palautettu - käsittele ne
        console.log("❓ AI kysyy lisätietoja");
        // TODO: Näytä kysymykset käyttäjälle
      } else if (data.coverLetterId) {
        router.push("/my-cover-letters");
      } else {
        throw new Error("Vastaus ei sisältänyt hakukirjeen tunnusta");
      }
    } catch (error) {
      console.error("Virhe hakukirjeen luonnissa:", error);
      setError(error instanceof Error ? error.message : "Tuntematon virhe");
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const response = await fetch(`/api/user-profile/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user profile");
      return await response.json();
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return {};
    }
  };

  if (loadingProfile || subscriptionLoading) {
    return (
      <>
        <SmartHeader />
        <div className="min-h-screen">
          <main className="container mx-auto py-8 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Ladataan...</span>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <div>
      <SmartHeader />
      <div className="bg-gradient-to-br from-gray-50 to-indigo-50">
        <main className="container mx-auto py-8 px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold mb-6">Luo uusi hakukirje</h1>

            {/* ✅ VERSION VALINTA */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Valitse hakukirjetyyppi:
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* V1 - TAVALLINEN */}
                <button
                  type="button"
                  onClick={() => setSelectedVersion("v1")}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedVersion === "v1"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Tavallinen hakukirje</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Nopea ja persoonallinen hakukirje. Sopii pienille yrityksille.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Sisältyy Basic-tilaukseen</span>
                  </div>
                </button>

                {/* V2 - ATS-OPTIMOITU */}
                <button
                  type="button"
                  onClick={() => {
                    if (isPremium) {
                      setSelectedVersion("v2");
                    } else {
                      setError("ATS-optimointi vaatii Premium-tilauksen. Päivitä tilaus!");
                    }
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all relative ${
                    selectedVersion === "v2"
                      ? "border-purple-500 bg-purple-50"
                      : isPremium
                      ? "border-gray-300 hover:border-gray-400"
                      : "border-gray-200 opacity-75 cursor-not-allowed"
                  }`}
                  disabled={!isPremium}
                >
                  {/* 🔒 LUKKO-IKONI JOS EI PREMIUM */}
                  {!isPremium && (
                    <div className="absolute top-2 right-2">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">
                      ATS-optimoitu hakukirje
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Läpäisee automaattiset järjestelmät. Sopii suurille yrityksille.
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    {isPremium ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-purple-600" />
                        <span className="text-purple-700 font-semibold">Premium-ominaisuus</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Vaatii Premium-tilauksen</span>
                      </>
                    )}
                  </div>
                  
                  {/* 🎁 HOUKUTUS PÄIVITTÄÄ */}
                  {!isPremium && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push("/pricing");
                        }}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Päivitä Premium-tilaukseen →
                      </button>
                    </div>
                  )}
                </button>
              </div>

              {/* ℹ️ INFO V2:STA */}
              {selectedVersion === "v2" && isPremium && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <strong>ATS-optimointi sisältää:</strong>
                  </p>
                  <ul className="text-xs text-purple-700 mt-1 space-y-1 ml-4">
                    <li>✓ Avainsanojen automaattinen tunnistus</li>
                    <li>✓ 3-osainen rakenne (Esittely, Osaaminen, Motivaatio)</li>
                    <li>✓ Master Guardian -validointi (ei väärää tietoa)</li>
                    <li>✓ Monikielinen synonym matching</li>
                    <li>✓ Stop words -suodatus</li>
                  </ul>
                </div>
              )}
            </div>

            {/* LOPUT LOMAKKEESTA (sama kuin ennen) */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Työpaikan kuvaus *
                </label>
                <textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={8}
                  placeholder="Liitä tähän työpaikan kuvaus..."
                  required
                />
              </div>

              <div>
                <label htmlFor="personalNotes" className="block text-sm font-medium text-gray-700 mb-2">
                  Henkilökohtaiset huomiot
                </label>
                <textarea
                  id="personalNotes"
                  value={personalNotes}
                  onChange={(e) => setPersonalNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Kerro asioita, joita haluat painottaa..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                    Hakukirjeen kieli
                  </label>
                  <select
                    id="language"
                    value={showCustomLanguage ? "custom" : language}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setShowCustomLanguage(true);
                      } else {
                        setShowCustomLanguage(false);
                        setLanguage(e.target.value as Language);
                      }
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  >
                    <option value="finnish">Suomi</option>
                    <option value="english">English</option>
                    <option value="swedish">Svenska</option>
                    <option value="custom">Muu kieli</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-2">
                    Hakukirjeen tyyli
                  </label>
                  <select
                    id="style"
                    value={style}
                    onChange={(e) => setStyle(e.target.value as Style)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  >
                    <option value="formal">Muodollinen</option>
                    <option value="casual">Rennompi</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isGenerating || !jobDescription.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                >
                  {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {selectedVersion === "v2" ? (
                    <>
                      <Zap className="h-4 w-4" />
                      {isGenerating ? "Optimoidaan..." : "Luo ATS-optimoitu hakukirje"}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {isGenerating ? "Luodaan..." : "Luo hakukirje"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
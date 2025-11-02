// app/create-cover-letter/page.tsx - Enhanced personality integration
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
  User,
} from "lucide-react";
import { useSubscription } from "@/components/SubscriptionStatus"; // ✅ KORJATTU
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

interface AIQuestion {
  id: string;
  question: string;
  context: string;
  personality_focus?: string;
  answer: string;
}

type Language = "finnish" | "english" | "swedish" | string;
type Style = "formal" | "casual";

export default function CreateCoverLetter() {
  const { user } = useUser();
  const { userId } = useAuth();
  const router = useRouter();
  
  // ✅ KORJATTU: Käytä toimivaa hook:ia
  const { subscription, isLoading: subscriptionLoading, isActive } = useSubscription();


  const [jobDescription, setJobDescription] = useState("");
  const [personalNotes, setPersonalNotes] = useState("");
  const [language, setLanguage] = useState<Language>("finnish");
  const [customLanguage, setCustomLanguage] = useState<string>("");
  const [style, setStyle] = useState<Style>("formal");
  const [showCustomLanguage, setShowCustomLanguage] = useState(false);

  // Personality profile state
  const [personalityProfile, setPersonalityProfile] =
    useState<PersonalityProfile>({});
  const [hasPersonalityData, setHasPersonalityData] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnsweringQuestions, setIsAnsweringQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI questions state
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [tempCoverLetterData, setTempCoverLetterData] = useState<any>(null);

  // Load user's personality profile on component mount
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

          // Check if user has meaningful personality data
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


// Ja handleSubmit-funktiossa:
if (!isActive) {
  setError(
    "Tilaajille suunnattu ominaisuus. Osta kuukausitilaus käyttääksesi tätä toiminnallisuutta."
  );
  return;
}

    if (!jobDescription.trim()) {
      setError("Työpaikkailmoitus on pakollinen");
      return;
    }

    if (!userId) {
      setError("Käyttäjätunnus puuttuu. Kirjaudu sisään uudelleen.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const fullName = user?.fullName || "";
      const email = user?.primaryEmailAddress?.emailAddress || "";
      const phoneNumber = user?.phoneNumbers?.[0]?.phoneNumber || "";

      // Get comprehensive user profile
      const userProfile = await fetchUserProfile(userId);
      const selectedLanguage = showCustomLanguage ? customLanguage : language;

      // Enhanced payload with personality data
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
        // PERSONALITY DATA FOR ENHANCED PERSONALIZATION
        ...personalityProfile,
      };

      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Hakukirjeen luonti epäonnistui");
      }

      const data = await response.json();

      if (data.questions && data.questions.length > 0) {
        const formattedQuestions = data.questions.map((q: any) => ({
          ...q,
          answer: "",
        }));

        setAiQuestions(formattedQuestions);
        setShowQuestions(true);
        setTempCoverLetterData(data);
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

  const handleQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      setError("Käyttäjätunnus puuttuu. Kirjaudu sisään uudelleen.");
      return;
    }

    setIsAnsweringQuestions(true);
    setError(null);

    try {
      const fullName = user?.fullName || "";
      const email = user?.primaryEmailAddress?.emailAddress || "";
      const phoneNumber = user?.phoneNumbers?.[0]?.phoneNumber || "";
      const userProfile = await fetchUserProfile(userId);
      const selectedLanguage = showCustomLanguage ? customLanguage : language;

      const answers = aiQuestions.reduce((acc, q) => {
        acc[q.id] = q.answer;
        return acc;
      }, {} as Record<string, string>);

      const response = await fetch("/api/finalize-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          tempCoverLetterData,
          answers,
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
          // Include personality data in finalization too
          ...personalityProfile,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Hakukirjeen viimeistely epäonnistui"
        );
      }

      const data = await response.json();

      if (!data.coverLetterId) {
        throw new Error("Vastaus ei sisältänyt hakukirjeen tunnusta");
      }

      router.push("/my-cover-letters");
    } catch (error) {
      console.error("Virhe hakukirjeen viimeistelyssä:", error);
      setError(error instanceof Error ? error.message : "Tuntematon virhe");
    } finally {
      setIsAnsweringQuestions(false);
    }
  };

  const handleBackToForm = () => {
    setShowQuestions(false);
    setAiQuestions([]);
    setTempCoverLetterData(null);
  };

  const updateQuestionAnswer = (id: string, answer: string) => {
    setAiQuestions((prevQuestions) =>
      prevQuestions.map((q) => (q.id === id ? { ...q, answer } : q))
    );
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

  const getFieldLabel = (field: string) => {
    const labels: Record<string, Record<string, string>> = {
      finnish: {
        jobDescription: "Työpaikan kuvaus *",
        personalNotes: "Henkilökohtaiset huomiot",
        personalNotesPlaceholder:
          "Kerro asioita, joita haluat erityisesti painottaa hakukirjeessä",
        language: "Hakukirjeen kieli",
        customLanguage: "Muu kieli",
        style: "Hakukirjeen tyyli",
        submit: isGenerating
          ? "Luodaan hakukirjettä..."
          : "Luo persoonallinen hakukirje",
        title: "Luo uusi hakukirje",
        profileInfo:
          "Käytämme profiilitietojasi ja persoonallisuusanalyysejäsi hakukirjeen luomiseen.",
        questionsTitle: "Tarvitsemme hieman lisätietoa sinusta",
        questionsExplanation:
          "Saadaksemme hakemuksestasi mahdollisimman tehokkaan, tarvitsemme muutamia lisätietoja. Nämä tiedot auttavat meitä räätälöimään hakukirjeesi juuri tätä työpaikkaa varten.",
        answersSubmit: isAnsweringQuestions
          ? "Viimeistellään hakukirjettä..."
          : "Lähetä vastaukset ja luo hakukirje",
        backButton: "Takaisin",
        answerPlaceholder: "Kirjoita vastauksesi tähän...",
        personalityMissing: "Persoonallisuusprofiili puuttuu",
        personalityAvailable: "Persoonallisuusprofiili löydetty",
      },
    };

    return labels.finnish[field] || labels.finnish[field];
  };

  // Personality status indicator
  const PersonalityIndicator = () => (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg border ${
        hasPersonalityData
          ? "bg-green-50 border-green-200 text-green-700"
          : "bg-yellow-50 border-yellow-200 text-yellow-700"
      }`}
    >
      <Sparkles className="h-4 w-4" />
      <span className="text-sm font-medium">
        {hasPersonalityData
          ? getFieldLabel("personalityAvailable")
          : getFieldLabel("personalityMissing")}
      </span>
      {!hasPersonalityData && (
        <Button
          variant="link"
          size="sm"
          onClick={() => router.push("/profile")}
          className="p-0 h-auto text-yellow-700 underline"
        >
          Täydennä profiili
        </Button>
      )}
    </div>
  );

  if (loadingProfile) {
    return (
      <div className="min-h-screen">
 <SmartHeader />
         <main className="container mx-auto py-8 px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Ladataan profiilitietoja...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Questions form
  if (showQuestions && aiQuestions.length > 0) {
    return (
      <div className="min-h-screen">
 <SmartHeader />   
      <main className="container mx-auto py-8 px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-6">
              <Button
                onClick={handleBackToForm}
                variant="ghost"
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {getFieldLabel("backButton")}
              </Button>
              <h1 className="text-2xl font-bold">
                {getFieldLabel("questionsTitle")}
              </h1>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
              {getFieldLabel("questionsExplanation")}
            </div>

            <form onSubmit={handleQuestionsSubmit} className="space-y-6">
              {aiQuestions.map((question) => (
                <div
                  key={question.id}
                  className="bg-gray-50 p-5 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start mb-3">
                    <HelpCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {question.question}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {question.context}
                      </p>
                      {question.personality_focus && (
                        <p className="text-xs text-blue-600 mt-1">
                          Fokus: {question.personality_focus}
                        </p>
                      )}
                    </div>
                  </div>

                  <textarea
                    value={question.answer}
                    onChange={(e) =>
                      updateQuestionAnswer(question.id, e.target.value)
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mt-2"
                    rows={3}
                    placeholder={getFieldLabel("answerPlaceholder")}
                  />
                </div>
              ))}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={
                    isAnsweringQuestions ||
                    aiQuestions.some((q) => !q.answer.trim())
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                >
                  {isAnsweringQuestions && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <Send className="h-4 w-4 mr-2" />
                  {getFieldLabel("answersSubmit")}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen">
 <SmartHeader />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      {/* ✅ Client Component Navbar */}
      </div>
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">{getFieldLabel("title")}</h1>

          <PersonalityIndicator />

          <div className="mt-6 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
            {getFieldLabel("profileInfo")}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="jobDescription"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {getFieldLabel("jobDescription")}
              </label>
              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                rows={8}
                placeholder="Liitä tähän työpaikan kuvaus tai vaatimukset. Hakukirje luodaan tämän ja persoonallisuusprofiilisi perusteella."
                required
              />
            </div>

            <div>
              <label
                htmlFor="personalNotes"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {getFieldLabel("personalNotes")}
              </label>
              <textarea
                id="personalNotes"
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder={getFieldLabel("personalNotesPlaceholder")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="language"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {getFieldLabel("language")}
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="finnish">Suomi</option>
                  <option value="english">English</option>
                  <option value="swedish">Svenska</option>
                  <option value="custom">Muu kieli</option>
                </select>
              </div>

              {showCustomLanguage && (
                <div>
                  <label
                    htmlFor="customLanguage"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {getFieldLabel("customLanguage")}
                  </label>
                  <input
                    id="customLanguage"
                    type="text"
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Esim. Ranska, Espanja, Saksa..."
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="style"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {getFieldLabel("style")}
                </label>
                <select
                  id="style"
                  value={style}
                  onChange={(e) => setStyle(e.target.value as Style)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                <Sparkles className="h-4 w-4" />
                {getFieldLabel("submit")}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

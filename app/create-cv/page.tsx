// app/create-cv/page.tsx - TÄYDELLINEN VERSIO (OSA 1)

"use client";

import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FileText,
  Sparkles,
  Zap,
  Target,
  Info,
  Crown,
  AlertCircle,
  ChevronDown,
  Check,
} from "lucide-react";
import { TokenAction, useTokens } from "@/hooks/useTokens";
import CVConfirmationModal from "@/components/CVConfirmationModal";

type CVTemplate = "technical" | "creative" | "simple";

interface CVQuestion {
  id: string;
  question: string;
  why?: string;
  priority?: 'critical' | 'important' | 'optional';
}

interface ViolationItem {
  type: 'skill' | 'education' | 'experience';
  content: string;
  reason: string;
}

interface Violations {
  fabricatedSkills?: string[];
  fabricatedEducation?: string[];
  fabricatedExperience?: string[];
}

export default function CreateCVPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate>("simple");
  const [jobPosting, setJobPosting] = useState("");
  const [useATS, setUseATS] = useState(false);
  const [useRAG, setUseRAG] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // CV Questions
  const [questions, setQuestions] = useState<CVQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showQuestions, setShowQuestions] = useState(false);

  // ✅ VAHVISTUSMODAL
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingViolations, setPendingViolations] = useState<Violations | null>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  const { 
    tokens, 
    isActive, 
    plan_type,
    features,
    isLoading: tokensLoading,
    getActionCost 
  } = useTokens();

  // ════════════════════════════════════════════════════════════════
  // LOAD PROFILE
  // ════════════════════════════════════════════════════════════════

  const loadProfile = async () => {
    if (!user) return;

    try {
      setProfileLoading(true);
      console.log('📋 Loading profile for:', user.id);
      
      const response = await fetch(`/api/user-profile/${user.id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Profile loaded:', {
          hasName: !!data.name,
          hasEmail: !!data.email,
          workExpCount: data.work_experience?.length || 0,
          keys: Object.keys(data)
        });
        setProfileData(data);
      } else if (response.status === 404) {
        console.warn('⚠️ Profile not found (404)');
        setProfileData(null);
      } else {
        console.error('❌ Profile fetch failed:', response.status);
        setProfileData(null);
      }
    } catch (error) {
      console.error("❌ Error loading profile:", error);
      setProfileData(null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (userLoaded && user) {
      loadProfile();
    }
  }, [userLoaded, user]);

  useEffect(() => {
    if (isLoading) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isLoading]);

  const currentActions: TokenAction[] = ['cv_basic'];
  if (useATS) currentActions.push('cv_ats_addon');
  if (useRAG) currentActions.push('cv_rag_addon');

  const totalCost = currentActions.reduce(
    (sum, action) => sum + getActionCost(action),
    0
  );

  if (!userLoaded || profileLoading || tokensLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ladataan...</p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ✅ MAIN GENERATE FUNCTION
  // ════════════════════════════════════════════════════════════════

  const handleGenerateCV = async () => {
    console.log('🚀 [FRONTEND] Generate CV button clicked');
    console.log('   - User:', user?.id);
    console.log('   - Template:', selectedTemplate);
    console.log('   - ATS:', useATS);
    console.log('   - RAG:', useRAG);
    
    if (!user) {
      toast.error("Kirjaudu sisään luodaksesi CV:n");
      return;
    }

    if (!profileData) {
      toast.error("Täytä ensin profiilisi!");
      router.push("/profile");
      return;
    }

    if (tokens < totalCost) {
      toast.error(`Tarvitset ${totalCost} tokenia, mutta sinulla on vain ${tokens}.`);
      return;
    }

    if (useATS && !features.canUseATS) {
      toast.error("ATS-optimointi vaatii Semi-Pro tai Pro -tason");
      return;
    }

    if (useRAG && !features.canUseRAG) {
      toast.error("RAG-tietokanta vaatii Pro-tason");
      return;
    }

    if (useATS && !jobPosting.trim()) {
      toast.error("Anna työpaikkailmoitus ATS-optimointia varten");
      return;
    }

    setIsLoading(true);

    try {
      const token = await getToken({ template: "supabase" });
      if (!token) throw new Error("No auth token");

      const requestBody = {
        profileData: profileData,
        cvType: selectedTemplate,
        language: "finnish",
        forceGenerate: false,
        jobPosting: useATS || useRAG ? jobPosting : undefined,
        enableRAG: useRAG,
        skipQuestions: false,
        skipValidation: false
      };

      // Tallenna pending request myöhempää käyttöä varten
      setPendingRequest(requestBody);

      const response = await fetch("/api/generate-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log('   → API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('   ❌ API error:', errorData);
        
        if (errorData.error === "FREE_CV_ALREADY_USED") {
          toast.error("Olet jo käyttänyt ilmaisen CV:n! Aktivoi Basic-tilaus.", 
            { duration: 8000 });
          router.push("/pricing");
          return;
        }

        if (errorData.error === "PROFILE_REQUIRED") {
          toast.error("Profiilia ei löydy. Lataa sivu uudelleen tai täytä profiili.");
          return;
        }

        throw new Error(errorData.message || errorData.error || "CV generation failed");
      }

      const result = await response.json();
      console.log('🧪 CV API RESULT:', result);

      // ✅ 1. TARVITAAN LISÄTIETOJA?
      if (result.needsMoreInfo && result.questions) {
        console.log('❓ CV QUESTIONS:', result.questions);
        toast.info(`Tarvitaan lisätietoja: ${result.questions.length} kysymystä`);
        setQuestions(result.questions);
        setShowQuestions(true);
        setIsLoading(false);
        return;
      }

      // ✅ 2. TARVITAAN VAHVISTUS?
      if (result.needsConfirmation && result.violations) {
        console.log('🚨 CV needs confirmation:', result.violations);
        
        setPendingViolations(result.violations);
        setShowConfirmation(true);
        setIsLoading(false);
        return;
      }

      // ✅ 3. ONNISTUI!
      toast.success(
        useRAG ? "🎯 RAG-optimoitu CV luotu!" :
        useATS ? "✅ ATS-optimoitu CV luotu!" :
        "✅ CV luotu!",
        { 
          description: `Generointi kesti ${Math.round((result.generationTime || 0) / 1000)}s`
        }
      );

      router.push(`/edit-cv/${result.id || result.cvId}`);

    } catch (error) {
      console.error('❌ [FRONTEND] Generation failed:', error);
      
      toast.error(
        "Virhe CV:n luonnissa",
        { description: error instanceof Error ? error.message : "Tuntematon virhe" }
      );
    } finally {
      setIsLoading(false);
    }
  };// ════════════════════════════════════════════════════════════════
  // ✅ QUESTION HANDLER
  // ════════════════════════════════════════════════════════════════

  const handleAnswerQuestions = async () => {
    console.log('📨 Submitting CV follow-up answers');

    setIsLoading(true);

    const answeredQuestions = questions
      .filter(q => answers[q.id]?.trim())
      .map(q => ({
        id: q.id,
        question: q.question,
        answer: answers[q.id],
      }));

    try {
      const response = await fetch("/api/generate-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendingRequest,
          answeredQuestions,
          skipQuestions: true,
        }),
      });

      const result = await response.json();
      console.log('✅ CV generated after questions:', result);

      // Tarkista vielä onko vahvistusta tarvitaan
      if (result.needsConfirmation && result.violations) {
        setPendingViolations(result.violations);
        setShowConfirmation(true);
        setShowQuestions(false);
        setIsLoading(false);
        return;
      }

      toast.success("✅ CV luotu lisätietojen jälkeen!");

      setShowQuestions(false);
      setQuestions([]);
      setAnswers({});

      router.push(`/edit-cv/${result.id || result.cvId}`);
    } catch (err) {
      console.error('❌ Failed after questions:', err);
      toast.error("Virhe CV:n luonnissa lisäkysymysten jälkeen");
    } finally {
      setIsLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // ✅ CONFIRMATION HANDLERS
  // ════════════════════════════════════════════════════════════════

  const handleApproveViolations = async (items: ViolationItem[]) => {
    if (!pendingRequest) return;

    setIsLoading(true);
    setShowConfirmation(false);

    try {
      console.log('✅ User approved violations:', items);

      const confirmedViolations = items.map(item => ({
        type: item.type,
        content: item.content,
        decision: 'approved'
      }));

      const response = await fetch('/api/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pendingRequest,
          confirmedViolations,
          skipValidation: true
        })
      });

      const data = await response.json();

      if (data.success && data.cvId) {
        toast.success('✅ CV luotu hyväksytyillä tiedoilla!');
        router.push(`/edit-cv/${data.cvId}`);
      } else {
        throw new Error('Failed to generate with approved items');
      }

    } catch (error) {
      console.error('Error with approved violations:', error);
      toast.error('❌ CV:n luonti epäonnistui');
      setIsLoading(false);
    }
  };

  const handleRejectViolations = async () => {
    if (!pendingRequest) return;

    setIsLoading(true);
    setShowConfirmation(false);

    try {
      console.log('❌ User rejected violations - creating lean CV');

      const violationItems: ViolationItem[] = [
        ...(pendingViolations?.fabricatedSkills || []).map(skill => ({
          type: 'skill' as const,
          content: skill,
          reason: 'Rejected by user'
        })),
        ...(pendingViolations?.fabricatedEducation || []).map(edu => ({
          type: 'education' as const,
          content: edu,
          reason: 'Rejected by user'
        })),
        ...(pendingViolations?.fabricatedExperience || []).map(exp => ({
          type: 'experience' as const,
          content: exp,
          reason: 'Rejected by user'
        }))
      ];

      const confirmedViolations = violationItems.map(item => ({
        type: item.type,
        content: item.content,
        decision: 'rejected'
      }));

      const response = await fetch('/api/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pendingRequest,
          confirmedViolations,
          skipValidation: true
        })
      });

      const data = await response.json();

      if (data.success && data.cvId) {
        toast.success('✅ CV luotu ilman hylättyjä tietoja', {
          description: 'CV voi olla lyhyempi, mutta sisältää vain varmennetut tiedot.'
        });
        router.push(`/edit-cv/${data.cvId}`);
      } else {
        throw new Error('Failed to generate lean CV');
      }

    } catch (error) {
      console.error('Error creating lean CV:', error);
      toast.error('❌ CV:n luonti epäonnistui');
      setIsLoading(false);
    }
  };

  const handleEditViolations = async (corrections: Array<{ original: string; corrected: string; type: string }>) => {
    if (!pendingRequest) return;

    setIsLoading(true);
    setShowConfirmation(false);

    try {
      console.log('✏️ User corrected violations:', corrections);

      const confirmedViolations = corrections.map(corr => ({
        type: corr.type,
        content: corr.original,
        decision: 'corrected',
        correctedContent: corr.corrected
      }));

      const response = await fetch('/api/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pendingRequest,
          confirmedViolations,
          skipValidation: true
        })
      });

      const data = await response.json();

      if (data.success && data.cvId) {
        toast.success('✅ CV luotu korjatuilla tiedoilla!');
        router.push(`/edit-cv/${data.cvId}`);
      } else {
        throw new Error('Failed to generate with corrections');
      }

    } catch (error) {
      console.error('Error with corrections:', error);
      toast.error('❌ CV:n luonti epäonnistui');
      setIsLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // TEMPLATE DATA (sama kuin ennen)
  // ════════════════════════════════════════════════════════════════

  const templates = [
    {
      id: "simple" as CVTemplate,
      icon: FileText,
      label: "Rento",
      description: "Persoonallinen ja lähestyttävä CV",
      gradient: "from-blue-500 to-cyan-600",
      bg: "bg-blue-50",
      border: "border-blue-500",
    },
    {
      id: "technical" as CVTemplate,
      icon: Sparkles,
      label: "Professional",
      description: "Tekninen ja strukturoitu ammattilaisille",
      gradient: "from-indigo-500 to-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-500",
    },
    {
      id: "creative" as CVTemplate,
      icon: Zap,
      label: "Creative",
      description: "Luova ja visuaalinen portfolio-CV",
      gradient: "from-pink-500 to-rose-600",
      bg: "bg-pink-50",
      border: "border-pink-500",
    },
  ];

  // ════════════════════════════════════════════════════════════════
  // RENDER (SAMA KUIN ENNEN + MODAALIT)
  // ════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Loading Banner */}
      {isLoading && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-lg w-full px-4 animate-fade-in">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-5 rounded-2xl shadow-2xl border-2 border-white/20">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="animate-spin rounded-full h-8 w-8 border-3 border-white border-t-transparent"></div>
                  <div className="absolute inset-0 rounded-full bg-white/10 animate-ping"></div>
                </div>
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg mb-1">CV:tä luodaan...</p>
                <p className="text-sm text-indigo-100 leading-relaxed">
                  ⏱️ Kestää 30-60 sekuntia. Älä sulje sivua.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ... LOPUT UI (HEADER, TEMPLATES, SETTINGS) ... */}
      {/* Kopioi aiempi UI tähän */}

      {/* ✅ CV FOLLOW-UP QUESTIONS MODAL */}
      {showQuestions && questions.length > 0 && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              Tarvitaan lisätietoja CV:tä varten
            </h2>

            <p className="text-sm text-gray-600 mb-6">
              Vastaa alla oleviin kysymyksiin, jotta CV voidaan räätälöidä paremmin
              tähän työpaikkaan.
            </p>

            {questions.map((q, index) => (
              <div key={q.id} className="mb-5">
                <label className="block font-semibold mb-1">
                  {index + 1}. {q.question}
                </label>

                {q.why && (
                  <p className="text-xs text-gray-500 mb-2">
                    Miksi tämä kysytään: {q.why}
                  </p>
                )}

                <textarea
                  className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  value={answers[q.id] || ""}
                  onChange={(e) =>
                    setAnswers(prev => ({
                      ...prev,
                      [q.id]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowQuestions(false)}
              >
                Peruuta
              </Button>

              <Button
                onClick={handleAnswerQuestions}
                disabled={isLoading}
              >
                Lähetä vastaukset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ CONFIRMATION MODAL */}
      {showConfirmation && pendingViolations && (
        <CVConfirmationModal
          violations={pendingViolations}
          onApprove={handleApproveViolations}
          onReject={handleRejectViolations}
          onEdit={handleEditViolations}
        />
      )}
    </div>
  );
}
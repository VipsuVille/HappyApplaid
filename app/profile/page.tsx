// app/profile/page.tsx - TÄYSIN KORJATTU VERSIO

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  User,
  Camera,
  X,
  CheckCircle,
  Heart,
  Sparkles,
  Briefcase,
  Languages,
  GraduationCap,
  Loader2,
  Shield,
  Plus,
  Trash2,
  Award,
  Target,
  Lightbulb,
  Clock,
  CreditCard,
  Check
} from "lucide-react";
import { toast } from "sonner";
import type { ProfileData } from "@/types";
import { supabase } from "@/lib/supabase-client";

// ════════════════════════════════════════════════════════════════
// DESIGN SYSTEM - SAMA KUIN LANDING PAGE
// ════════════════════════════════════════════════════════════════

const styles = {
  // 🎨 Käytetään SAMAA designia kuin landing page
  wrapper: "min-h-screen bg-gradient-to-br from-[#121212] via-[#0e0e0e] to-[#1a1a1a] font-sans text-[#e7e3dc] selection:bg-amber-300/30 selection:text-white relative overflow-hidden",
  glassCard: "backdrop-blur-2xl bg-[#1a1a1a]/70 border border-[#2a2a2a] rounded-3xl shadow-2xl shadow-black/50",
  glassPanel: "bg-[#1a1a1a]/50 backdrop-blur-md border border-[#2a2a2a] rounded-2xl",
  glassInput: "bg-black/40 backdrop-blur-sm border-2 border-[#2a2a2a] focus:border-orange-400/50 focus:ring-4 focus:ring-orange-300/10 shadow-inner transition-all outline-none rounded-xl text-[#e7e3dc] font-medium placeholder:text-gray-500",
  gradientHeading: "bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent font-extrabold",
  label: "block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide",
  buttonPrimary: "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl font-bold",
  buttonSecondary: "bg-white/5 backdrop-blur-md text-orange-300 border-2 border-orange-400/30 hover:bg-white/10 shadow-sm transition-all rounded-xl font-bold",
  buttonDelete: "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 hover:border-red-500/50 transition-all rounded-xl font-semibold text-sm",
  stepBubbleActive: "bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/40 scale-110 ring-4 ring-orange-500/20",
  stepBubbleCompleted: "bg-green-500 text-white shadow-md shadow-green-500/30",
  stepBubbleInactive: "bg-white/5 text-gray-500 border border-white/10",
};

// ════════════════════════════════════════════════════════════════
// TYPES - PARANNETUT
// ════════════════════════════════════════════════════════════════

interface WorkExperience {
  id: number;
  company: string;
  position: string;
  duration: string;
  description: string;
  isCurrent: boolean; // ✅ UUSI: Nykyinen työ
  biggestAchievement?: string;
  whatYouLearned?: string;
  howYourStrengthShowed?: string;
  teamSize?: number;
  metrics?: string;
  toolsUsed?: string;
}

interface Education {
  id: number;
  school: string;
  degree: string;
  year: string;
  isOngoing: boolean;
  specialization?: string;
  favoriteSubjects?: string;
  thesisOrProject?: string;
  whatYouLearned?: string;
  whyThisField?: string;
  proudestMoment?: string;
}

interface Skill {
  id: number;
  name: string;
  proficiency: 1 | 2 | 3 | 4 | 5;
  yearsUsed?: number;
  concreteExample: string;
  impact?: string;
}

interface Language {
  id: number;
  language: string;
  speaking: 1 | 2 | 3 | 4 | 5;
  writing: 1 | 2 | 3 | 4 | 5;
  reading: 1 | 2 | 3 | 4 | 5;
  whereUsed: string;
  certification?: string;
}

interface EnhancedProfileData extends Omit<ProfileData,"workExperience" | "education" | "languages" | "skills"> {
  workExperience: WorkExperience[];
  education: Education[];
  languages: Language[];
  skills: Skill[];
  
  idealWorkEnvironment?: string;
  feedbackExample?: string;
  workplaceFrustration?: string;
  proudMoment?: string;
  whatIfMoney?: string;
}

type ArrayFieldName = "education" | "workExperience" | "languages" | "skills";
type ProfileFieldName = keyof EnhancedProfileData;

interface StepData {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

// ════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ════════════════════════════════════════════════════════════════

const QuestionCard: React.FC<{
  title: string;
  isRequired: boolean;
  isCompleted?: boolean;
  charCount?: number;
  minChars?: number;
  helpText: string;
  children: React.ReactNode;
}> = ({
  title,
  isRequired,
  isCompleted,
  charCount = 0,
  minChars = 0,
  helpText,
  children,
}) => (
  <div
    className={`p-6 md:p-8 transition-all duration-300 mb-6 ${styles.glassPanel} ${
      isCompleted
        ? "border-green-400/30 bg-green-500/5"
        : isRequired
        ? "border-orange-400/20"
        : "border-[#2a2a2a]"
    } hover:shadow-lg hover:shadow-orange-500/5`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <h3 className="text-lg md:text-xl font-bold text-gray-100 flex items-center gap-2">
          {title}
          {isRequired && !isCompleted && <span className="text-orange-400 text-xs align-top">*</span>}
          {isCompleted && (
            <div className="bg-green-500/20 text-green-300 rounded-full p-1">
              <CheckCircle className="w-4 h-4" />
            </div>
          )}
        </h3>
        <p className="text-sm text-gray-400 mt-1 font-medium">{helpText}</p>
      </div>
    </div>

    {children}

    {minChars > 0 && (
      <div className="mt-3 flex justify-between items-center text-xs font-semibold">
        <span
          className={`px-2 py-1 rounded-md ${
            charCount >= minChars 
              ? "bg-green-500/20 text-green-300" 
              : "bg-orange-500/20 text-orange-300"
          }`}
        >
          {charCount}/{minChars} merkkiä{" "}
          {charCount >= minChars ? "✓" : `(vielä ${minChars - charCount})`}
        </span>
      </div>
    )}
  </div>
);

const ExampleHint: React.FC<{ examples: string[] }> = ({ examples }) => (
  <div className="mt-3 p-4 bg-orange-500/5 backdrop-blur-sm border border-orange-500/10 rounded-xl">
    <p className="text-xs text-orange-300 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
      <Sparkles className="w-3 h-3" /> Ideoita:
    </p>
    <ul className="text-sm text-gray-400 space-y-1.5 ml-1">
      {examples.map((example, index) => (
        <li key={index} className="flex items-start gap-2">
          <span className="opacity-50">•</span> {example}
        </li>
      ))}
    </ul>
  </div>
);

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════

const EnhancedProfilePage: React.FC = () => {
  const { userId } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState<EnhancedProfileData>({
    name: "",
    email: "",
    phone: "",
    location: "",
    jobTitle: "",
    profileImage: "",
    
    education: [],
    workExperience: [],
    languages: [],
    skills: [],
    
    workingStyle: "",
    problemSolving: "",
    energySources: "",
    uniqueStrength: "",
    learningStyle: "",
    teamRole: "",
    valuesExample: "",
    superpower: "",
    careerGoals: "",
    bestProjectExample: "",
    failureLesson: "",
    
    idealWorkEnvironment: "",
    feedbackExample: "",
    workplaceFrustration: "",
    proudMoment: "",
    whatIfMoney: "",
  });

  const steps: StepData[] = [
    {
      id: "essential",
      title: "Persoonallisuus",
      icon: Heart,
      description: "Simple CV:n ydin",
    },
    {
      id: "basic",
      title: "Perustiedot",
      icon: User,
      description: "Yhteystiedot & kuva",
    },
    {
      id: "experience",
      title: "Kokemus",
      icon: Briefcase,
      description: "Työ & Koulutus",
    },
    {
      id: "skills",
      title: "Taidot",
      icon: Award,
      description: "Osaaminen & Kielet",
    },
    {
      id: "bonus",
      title: "Lisätiedot",
      icon: Sparkles,
      description: "Ekstrat",
    },
  ];

  // ════════════════════════════════════════════════════════════════
  // LOAD & SAVE
  // ════════════════════════════════════════════════════════════════

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const response = await fetch("/api/save-profile", { method: "GET" });

      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          let imageUrl = "";
          if (data.profile.profileImage) {
            const img = data.profile.profileImage;
            
            if (img.startsWith('http')) {
              imageUrl = img;
            } else if (img.startsWith('data:image')) {
              imageUrl = img;
            } else {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
              imageUrl = supabaseUrl 
                ? `${supabaseUrl}/storage/v1/object/public/cv_files/${img}`
                : "";
            }
          }
          
          // ✅ KRIITTINEN KORJAUS: Varmista että skills on AINA array
          const normalizedSkills = Array.isArray(data.profile.skills)
            ? data.profile.skills
            : typeof data.profile.skills === 'string'
            ? [] // Jos string, muuta tyhjäksi arrayks
            : [];
          
          setProfileData({
            ...data.profile,
            profileImage: imageUrl,
            workExperience: Array.isArray(data.profile.workExperience) ? data.profile.workExperience : [],
            education: Array.isArray(data.profile.education) ? data.profile.education : [],
            languages: Array.isArray(data.profile.languages) ? data.profile.languages : [],
            skills: normalizedSkills, // ✅ Aina array
          });
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfileData = async (showToast = true) => {
    if (!userId) {
      if (showToast) toast.error("Kirjaudu sisään tallentaaksesi profiilin");
      return false;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/save-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: profileData }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      
      setLastSaved(new Date());
      
      if (showToast) {
        toast.success("Profiili tallennettu onnistuneesti!");
      }
      return true;
    } catch (error) {
      console.error("Error saving profile:", error);
      if (showToast) toast.error("Profiilin tallentaminen epäonnistui");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save debounced
  useEffect(() => {
    if (isLoading) return;
    const debounceTimer = setTimeout(() => {
      saveProfileData(false);
    }, 2000);
    return () => clearTimeout(debounceTimer);
  }, [profileData, isLoading]);

  // ════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════

  const handleInputChange = (field: ProfileFieldName, value: string): void => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Valitse vain kuvatiedostoja");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kuvan koko max 5MB");
      return;
    }

    const toastId = toast.loading("Ladataan kuvaa...");

    try {
      setIsSaving(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `profile_${Date.now()}.${fileExt}`;
      const filePath = `profiles/${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("cv_files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.dismiss(toastId);
        toast.error("Kuvan lataus epäonnistui");
        return;
      }

      const { data: urlData } = supabase.storage
        .from("cv_files")
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        toast.dismiss(toastId);
        toast.error("URL:n haku epäonnistui");
        return;
      }

      // ✅ KORJATTU: Lisää user_id varmistus
      if (userId) {
        const { error: dbError } = await supabase
          .from("default_images")
          .insert({
            user_id: userId,
            image_type: "profile",
            file_path: filePath,
            name: `Profiilikuva ${new Date().toLocaleDateString()}`,
            is_active: true,
            is_ai_generated: false,
          });

        if (dbError) {
          console.error("DB error:", dbError);
        }
      }

      setProfileData((prev) => ({
        ...prev,
        profileImage: urlData.publicUrl,
      }));

      toast.dismiss(toastId);
      toast.success("Profiilikuva lisätty!");
      
    } catch (error) {
      console.error("Error:", error);
      toast.dismiss(toastId);
      toast.error("Kuvan lataus epäonnistui");
    } finally {
      setIsSaving(false);
    }
  };

  const removeProfileImage = () => {
    setProfileData((prev) => ({ ...prev, profileImage: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("Profiilikuva poistettu");
  };

  const nextStep = (): void => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      saveProfileData(false);
    }
  };

  const prevStep = (): void => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleFinalSave = async () => {
    const success = await saveProfileData(true);
    if (success) {
      setTimeout(() => {
        router.push("/create-cover-letter");
      }, 1000);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // ARRAY HANDLERS
  // ════════════════════════════════════════════════════════════════

  const addArrayItem = (arrayName: ArrayFieldName) => {
    const currentItems = profileData[arrayName] as any[];
    const newId = currentItems.length > 0 
      ? Math.max(...currentItems.map((item: any) => item.id)) + 1 
      : 1;
    
    let newItem: any;
    
    if (arrayName === "education") {
      newItem = { 
        id: newId, 
        school: "", 
        degree: "", 
        year: "", 
        isOngoing: false,
        specialization: "",
        favoriteSubjects: "",
        thesisOrProject: "",
        whatYouLearned: "",
        whyThisField: "",
        proudestMoment: ""
      };
    } else if (arrayName === "workExperience") {
      newItem = { 
        id: newId, 
        company: "", 
        position: "", 
        duration: "", 
        description: "",
        isCurrent: false, // ✅ UUSI
        biggestAchievement: "",
        whatYouLearned: "",
        howYourStrengthShowed: "",
        teamSize: undefined,
        metrics: "",
        toolsUsed: ""
      };
    } else if (arrayName === "languages") {
      newItem = { 
        id: newId, 
        language: "", 
        speaking: 3,
        writing: 3,
        reading: 3,
        whereUsed: "",
        certification: ""
      };
    } else if (arrayName === "skills") {
      newItem = {
        id: newId,
        name: "",
        proficiency: 3,
        yearsUsed: undefined,
        concreteExample: "",
        impact: ""
      };
    }

    setProfileData((prev) => ({
      ...prev,
      [arrayName]: [...prev[arrayName], newItem],
    }));
  };

  const removeArrayItem = (arrayName: ArrayFieldName, id: number) => {
    setProfileData((prev) => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((item: any) => item.id !== id),
    }));
  };

  const handleArrayItemChange = (
    arrayName: ArrayFieldName,
    id: number,
    field: string,
    value: string | boolean | number
  ): void => {
    setProfileData((prev) => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item: any) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  // ════════════════════════════════════════════════════════════════
  // PROGRESS CALCULATION
  // ════════════════════════════════════════════════════════════════

  const getEssentialProgress = () => {
    const essentialFields = [
      { field: profileData.workingStyle, min: 50 },
      { field: profileData.problemSolving, min: 80 },
      { field: profileData.energySources, min: 40 },
      { field: profileData.uniqueStrength, min: 60 },
      { field: profileData.learningStyle, min: 40 },
      { field: profileData.teamRole, min: 40 },
      { field: profileData.superpower, min: 10 },
      { field: profileData.bestProjectExample, min: 60 },
      { field: profileData.failureLesson, min: 70 },
    ];

    const completed = essentialFields.filter(
      (item) => item.field && item.field.length >= item.min
    ).length;

    return {
      completed,
      total: essentialFields.length,
      percentage: Math.round((completed / essentialFields.length) * 100),
    };
  };

  const getOverallProgress = () => {
    const essential = getEssentialProgress();
    const hasBasic = profileData.name && profileData.email;
    const hasExperience = profileData.workExperience.length > 0 || profileData.education.length > 0;
    
    // ✅ KORJATTU: Turvallinen skills-tarkistus
    const skills = Array.isArray(profileData.skills) ? profileData.skills : [];
    const hasSkills = skills.length >= 3;

    const scores = [
      essential.percentage,
      hasBasic ? 100 : 0,
      hasExperience ? 100 : 0,
      hasSkills ? 100 : 0,
    ];

    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        const essentials = getEssentialProgress();
        return essentials.completed === essentials.total;
      case 1:
        return profileData.name && profileData.email;
      default:
        return true;
    }
  };

  // ════════════════════════════════════════════════════════════════
  // RENDER SECTIONS (samat kuin ennen, mutta dark theme)
  // ════════════════════════════════════════════════════════════════

  const renderEssentials = () => {
    const progress = getEssentialProgress();
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <h2 className={`text-2xl mb-2 ${styles.gradientHeading}`}>
            Persoonallisuus
          </h2>
          <p className="text-gray-400 mb-6 font-medium">
            Tämä on Simple CV:n ydin. Vastaa rehellisesti.
          </p>

          <div className="bg-black/30 backdrop-blur-sm rounded-full p-2 max-w-md mx-auto border border-[#2a2a2a] shadow-inner">
            <div className="flex justify-between text-xs font-bold text-gray-400 mb-2 px-2 uppercase tracking-wide">
              <span>Valmiusaste</span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-800/50 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <QuestionCard
            title="Miten tykkäät työskennellä?"
            isRequired={true}
            isCompleted={profileData.workingStyle.length >= 50}
            charCount={profileData.workingStyle.length}
            minChars={50}
            helpText="Kerro työskentelytapasi ja olosuhteet"
          >
            <textarea
              value={profileData.workingStyle}
              onChange={(e) => handleInputChange("workingStyle", e.target.value)}
              className={`w-full p-4 ${styles.glassInput} min-h-[100px]`}
              placeholder="Esim: 'Tykkään selvistä ohjeista ja rauhallisesta ympäristöstä...'"
            />
            <ExampleHint examples={["Olen järjestelmällinen", "Tykkään tiimityöstä", "Työskentelen parhaiten rauhassa"]} />
          </QuestionCard>

          <QuestionCard
            title="Anna esimerkki kun ratkaisit haastavan tilanteen"
            isRequired={true}
            isCompleted={profileData.problemSolving.length >= 80}
            charCount={profileData.problemSolving.length}
            minChars={80}
            helpText="Voi olla koulusta, harrastuksista tai vapaa-ajalta"
          >
            <textarea
              value={profileData.problemSolving}
              onChange={(e) => handleInputChange("problemSolving", e.target.value)}
              className={`w-full p-4 ${styles.glassInput} min-h-[120px]`}
              placeholder="Kerro tilanne, mitä teit, lopputulos..."
            />
            <ExampleHint examples={["Asiakkaan ongelma kesti 2h mutta ratkaisin sen", "Projekti myöhässä - järjestin uuden aikataulun"]} />
          </QuestionCard>

          <QuestionCard
            title="Mistä saat energiaa ja motivaatiota?"
            isRequired={true}
            isCompleted={profileData.energySources.length >= 40}
            charCount={profileData.energySources.length}
            minChars={40}
            helpText="Mikä saa sinut innostumaan?"
          >
            <textarea
              value={profileData.energySources}
              onChange={(e) => handleInputChange("energySources", e.target.value)}
              className={`w-full p-4 ${styles.glassInput} min-h-[100px]`}
              placeholder="Esim: 'Saan energiaa auttamisesta...'"
            />
          </QuestionCard>

          <QuestionCard
            title="Mikä tekee sinusta erityisen?"
            isRequired={true}
            isCompleted={profileData.uniqueStrength.length >= 60}
            charCount={profileData.uniqueStrength.length}
            minChars={60}
            helpText="Mitä ihmiset pyytävät juuri sinulta?"
          >
            <textarea
              value={profileData.uniqueStrength}
              onChange={(e) => handleInputChange("uniqueStrength", e.target.value)}
              className={`w-full p-4 ${styles.glassInput} min-h-[100px]`}
              placeholder="Esim: 'Olen hyvä selittämään asioita...'"
            />
          </QuestionCard>

          <QuestionCard
            title="Miten opit parhaiten?"
            isRequired={true}
            isCompleted={profileData.learningStyle.length >= 40}
            charCount={profileData.learningStyle.length}
            minChars={40}
            helpText="Sopeutumiskykysi todistus"
          >
            <textarea
              value={profileData.learningStyle}
              onChange={(e) => handleInputChange("learningStyle", e.target.value)}
              className={`w-full p-4 ${styles.glassInput} min-h-[100px]`}
              placeholder="Esim: 'Opin tekemällä ja kokeilemalla...'"
            />
          </QuestionCard>

          <QuestionCard
            title="Millainen rooli sinulla on ryhmässä?"
            isRequired={true}
            isCompleted={profileData.teamRole.length >= 40}
            charCount={profileData.teamRole.length}
            minChars={40}
            helpText="Johtaja, tukija vai ideankeksijä?"
          >
            <textarea
              value={profileData.teamRole}
              onChange={(e) => handleInputChange("teamRole", e.target.value)}
              className={`w-full p-4 ${styles.glassInput} min-h-[100px]`}
              placeholder="Esim: 'Huolehdin että hommat tulee tehtyä...'"
            />
          </QuestionCard>

          <QuestionCard
            title="Millaisissa tilanteissa olet ollut parhaimmillaan?"
            isRequired={true}
            isCompleted={profileData.bestProjectExample.length >= 60}
            charCount={profileData.bestProjectExample.length}
            minChars={60}
            helpText="Kuvaa projekti, tehtävä tai tilanne jossa menestyit"
          >
            <textarea
              value={profileData.bestProjectExample}
              onChange={(e) => handleInputChange("bestProjectExample", e.target.value)}
              className={`w-full p-4 ${styles.glassInput} min-h-[120px]`}
              placeholder="Esim: 'Rakensimme uuden prosessin...'"
            />
            <ExampleHint examples={[
              "Rakensin sovelluksen varastoon",
              "Organisoin tapahtuman",
              "Mentoroin uutta työntekijää"
            ]} />
          </QuestionCard>

          <QuestionCard
            title="Kerro suurimmasta haasteesta ja mitä siitä opit"
            isRequired={true}
            isCompleted={profileData.failureLesson.length >= 70}
            charCount={profileData.failureLesson.length}
            minChars={70}
            helpText="Growth mindset! Näytä että kehityt virheistä"
          >
            <textarea
              value={profileData.failureLesson}
              onChange={(e) => handleInputChange("failureLesson", e.target.value)}
              className={`w-full p-4 ${styles.glassInput} min-h-[120px]`}
              placeholder="Esim: 'Projektissa kului budjetti, opin aikataulutuksesta...'"
            />
          </QuestionCard>

          <QuestionCard
            title="Kuvaa itsesi kolmella sanalla"
            isRequired={true}
            isCompleted={profileData.superpower.length >= 10}
            charCount={profileData.superpower.length}
            minChars={10}
            helpText="Valitse sanat jotka todella kuvaavat sinua"
          >
            <input
              type="text"
              value={profileData.superpower}
              onChange={(e) => handleInputChange("superpower", e.target.value)}
              className={`w-full p-4 ${styles.glassInput}`}
              placeholder="Esim: Luotettava, Oppimishaluinen, Järjestelmällinen"
            />
          </QuestionCard>

          <QuestionCard
            title="Millainen työympäristö on sinulle paras?"
            isRequired={false}
            isCompleted={!!profileData.idealWorkEnvironment && profileData.idealWorkEnvironment.length >= 80}
            charCount={profileData.idealWorkEnvironment?.length || 0}
            minChars={80}
            helpText="Kuvaa ympäristö jossa loistat parhaiten"
          >
            <textarea
              value={profileData.idealWorkEnvironment || ""}
              onChange={(e) => handleInputChange("idealWorkEnvironment", e.target.value)}
              className={`w-full p-4 ${styles.glassInput} min-h-[100px]`}
              placeholder="Esim: 'Rauhallinen toimisto jossa voin keskittyä...'"
            />
            <ExampleHint examples={[
              "Rauhallinen toimisto jossa voin keskittyä, mutta tiimi on lähellä kun tarvitsen apua",
              "Nopea ja dynaaminen ympäristö jossa asiat muuttuu - tykkään mukautua",
              "Selkeät aikataulut ja vastuut, mutta vapaus toteuttaa omavaraisesti"
            ]} />
          </QuestionCard>

          <QuestionCard
            title="Kerro tilanne kun sait palautetta - miten reagoit?"
            isRequired={false}
            isCompleted={!!profileData.feedbackExample && profileData.feedbackExample.length >= 100}
            charCount={profileData.feedbackExample?.length || 0}
            minChars={100}
            helpText="Näyttää kykysi kehittyä ja ottaa vastaan kritiikkiä"
          >
            <textarea
              value={profileData.feedbackExample || ""}
              onChange={(e) => handleInputChange("feedbackExample", e.target.value)}
              className={`w-full p-4 ${styles.glassInput} min-h-[120px]`}
              placeholder="Esim: 'Pomoni sanoi että raportit olivat liian pitkiä...'"
            />
            <ExampleHint examples={[
              "Pomoni sanoi että raportit olivat liian pitkiä. Opin kirjoittamaan tiivistetysti",
              "Asiakas valitti hitaasta vastauksesta. Aloin käyttämään templateja",
              "Koodikatselmuksessa huomautettiin luettavuudesta. Opin parempia käytäntöjä"
            ]} />
          </QuestionCard>

          <QuestionCard
            title="Millainen käytös ärsyttää sinua työpaikalla?"
            isRequired={false}
            isCompleted={!!profileData.workplaceFrustration && profileData.workplaceFrustration.length >= 60}
            charCount={profileData.workplaceFrustration?.length || 0}
            minChars={60}
            helpText="Paljastaa arvosi ja työkulttuuripreferenssisi"
          >
            <textarea
              value={profileData.workplaceFrustration || ""}
              onChange={(e) => handleInputChange("workplaceFrustration", e.target.value)}
              className={`w-full p-4 ${styles.glassInput} min-h-[100px]`}
              placeholder="Esim: 'Ärsyttää kun sovitut aikataulut eivät pidä...'"
            />
            <ExampleHint examples={[
              "Ärsyttää kun sovitut aikataulut eivät pidä - arvostан luotettavuutta",
              "En tykkää kun ihmiset eivät kommunikoi ongelmista - haluan avoimuutta",
              "Häiritsee kun joku ottaa kunnian muiden työstä - arvostan rehellisyyttä"
            ]} />
          </QuestionCard>

          <QuestionCard
            title="Kerro hetki kun olit ylpeä itsestäsi"
            isRequired={false}
            isCompleted={!!profileData.proudMoment && profileData.proudMoment.length >= 80}
            charCount={profileData.proudMoment?.length || 0}
            minChars={80}
            helpText="Voi olla työstä, koulusta, harrastuksista tai elämästä"
          >
            <textarea
              value={profileData.proudMoment || ""}
              onChange={(e) => handleInputChange("proudMoment", e.target.value)}
              className={`w-full p-4 ${styles.glassInput} min-h-[100px]`}
              placeholder="Esim: 'Autin asiakasta 2 tuntia kunnes ongelma ratkesi...'"
            />
            <ExampleHint examples={[
              "Autin asiakasta 2 tuntia kunnes ongelma ratkesi - sain kiitoskirjeen",
              "Pääsin läpi vaikeasta kurssista vaikka luulin että epäonnistun",
              "Organisoin vapaaehtoistyötapahtuman 50 henkilölle - kaikki meni nappiin"
            ]} />
          </QuestionCard>

          <QuestionCard
            title="Mitä tekisit jos voittaisit lotossa 1M€?"
            isRequired={false}
            isCompleted={!!profileData.whatIfMoney && profileData.whatIfMoney.length >= 80}
            charCount={profileData.whatIfMoney?.length || 0}
            minChars={80}
            helpText="Paljastaa TODELLISEN motivaatiosi (raha vs. merkitys)"
          >
            <textarea
              value={profileData.whatIfMoney || ""}
              onChange={(e) => handleInputChange("whatIfMoney", e.target.value)}
              className={`w-full p-4 ${styles.glassInput} min-h-[100px]`}
              placeholder="Esim: 'Perustaisin oman kahvilan jossa ihmiset voi tulla juttelemaan...'"
            />
            <ExampleHint examples={[
              "Perustaisin oman kahvilan jossa ihmiset voi tulla juttelemaan - tykkään sosiaalisesta työstä",
              "Opiskelisin lisää ohjelmointia ja rakentaisin oman pelifirman - teknologia innostaa",
              "Jatkaisin samaa työtä mutta tekisin sitä vähemmän - tykkään työstäni mutta haluan enemmän aikaa perheelle"
            ]} />
          </QuestionCard>

          <QuestionCard
            title="Mitä haluat saavuttaa uralla seuraavassa 3 vuodessa?"
            isRequired={false}
            isCompleted={!!profileData.careerGoals && profileData.careerGoals.length >= 40}
            charCount={profileData.careerGoals?.length || 0}
            minChars={40}
            helpText="Motivaatiosi ja suuntasi näkökulmasta"
          >
            <textarea
              value={profileData.careerGoals || ""}
              onChange={(e) => handleInputChange("careerGoals", e.target.value)}
              className={`w-full p-4 ${styles.glassInput} min-h-[100px]`}
              placeholder="Esim: 'Haluan oppia projektinhallintaa ja johtaa omaa timiä...'"
            />
          </QuestionCard>
        </div>
      </div>
    );
  };

  const renderBasicInfo = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className={`text-2xl mb-2 ${styles.gradientHeading}`}>Yhteystiedot</h2>
        <p className="text-gray-400 font-medium">Pakolliset tiedot</p>
      </div>

      <div className="flex justify-center mb-10">
        <div className="relative group">
          <div className="w-40 h-40 rounded-3xl border-4 border-orange-500/30 shadow-2xl overflow-hidden bg-black/40 flex items-center justify-center relative">
            {profileData.profileImage ? (
              <img
                src={profileData.profileImage}
                alt="Profiilikuva"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-16 h-16 text-gray-600" />
            )}

            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm cursor-pointer"
                 onClick={() => fileInputRef.current?.click()}>
                <Camera className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="absolute -bottom-4 right-[-10px] flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-2xl shadow-lg hover:scale-110 transition-transform"
            >
              <Camera className="w-5 h-5" />
            </button>

            {profileData.profileImage && (
              <button
                onClick={removeProfileImage}
                className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-2xl shadow-lg hover:scale-110 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={styles.label}>Koko nimi *</label>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className={`w-full p-4 ${styles.glassInput}`}
            placeholder="Etunimi Sukunimi"
          />
        </div>

        <div>
          <label className={styles.label}>Sähköposti *</label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className={`w-full p-4 ${styles.glassInput}`}
            placeholder="email@example.com"
          />
        </div>

        <div>
          <label className={styles.label}>Puhelinnumero</label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            className={`w-full p-4 ${styles.glassInput}`}
            placeholder="040 1234567"
          />
        </div>

        <div>
          <label className={styles.label}>Paikkakunta</label>
          <input
            type="text"
            value={profileData.location}
            onChange={(e) => handleInputChange("location", e.target.value)}
            className={`w-full p-4 ${styles.glassInput}`}
            placeholder="Helsinki"
          />
        </div>

        <div className="md:col-span-2">
          <label className={styles.label}>Millaista työtä haet?</label>
          <input
            type="text"
            value={profileData.jobTitle}
            onChange={(e) => handleInputChange("jobTitle", e.target.value)}
            className={`w-full p-4 ${styles.glassInput}`}
            placeholder="Esim. Asiakaspalvelu, IT-tuki..."
          />
        </div>
      </div>
    </div>
  );

  const renderExperience = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className={`text-2xl mb-2 ${styles.gradientHeading}`}>Työkokemus & Koulutus</h2>
        <div className="inline-block px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 mt-2">
          <p className="text-orange-300 text-sm font-semibold">
            Professional CV vaatii kokemuksen, Rento CV:lle vapaaehtoinen.
          </p>
        </div>
      </div>

      {/* TYÖKOKEMUS */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <div className="bg-orange-500/20 p-2 rounded-lg"><Briefcase className="w-5 h-5 text-orange-400" /></div>
            Työkokemus
          </h3>
          <button
            onClick={() => addArrayItem("workExperience")}
            className={styles.buttonSecondary + " px-4 py-2 text-sm flex items-center gap-2"}
          >
            <Plus className="w-4 h-4" />
            Lisää työpaikka
          </button>
        </div>

        {profileData.workExperience.length === 0 ? (
          <div className={`${styles.glassPanel} p-8 text-center border-dashed border-2 border-orange-500/20`}>
            <p className="text-gray-400 mb-4">Ei vielä työkokemusta lisätty.</p>
            <button
              onClick={() => addArrayItem("workExperience")}
              className={styles.buttonPrimary + " px-6 py-3"}
            >
              Lisää ensimmäinen
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {profileData.workExperience.map((work, index) => (
              <div key={work.id} className={`${styles.glassPanel} p-6 md:p-8 relative group`}>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => removeArrayItem("workExperience", work.id)}
                    className={styles.buttonDelete + " px-3 py-1 flex items-center gap-1"}
                  >
                    <Trash2 className="w-3 h-3" />
                    Poista
                  </button>
                </div>
                
                <h4 className="text-lg font-bold text-gray-100 mb-6 border-b border-gray-700/50 pb-2">
                  Työpaikka {index + 1}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={styles.label}>Yritys *</label>
                    <input
                      type="text"
                      value={work.company}
                      onChange={(e) => handleArrayItemChange("workExperience", work.id, "company", e.target.value)}
                      className={`w-full p-3 ${styles.glassInput}`}
                      placeholder="Yrityksen nimi"
                    />
                  </div>
                  
                  <div>
                    <label className={styles.label}>Tehtävänimike *</label>
                    <input
                      type="text"
                      value={work.position}
                      onChange={(e) => handleArrayItemChange("workExperience", work.id, "position", e.target.value)}
                      className={`w-full p-3 ${styles.glassInput}`}
                      placeholder="Työnimike"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className={styles.label}>Ajankohta (kk/vvvv) *</label>
                    <input
                      type="text"
                      placeholder="Esim. 01/2020 - 12/2022"
                      value={work.duration}
                      onChange={(e) => handleArrayItemChange("workExperience", work.id, "duration", e.target.value)}
                      className={`w-full p-3 ${styles.glassInput}`}
                    />
                  </div>

                  {/* ✅ NYKYINEN TYÖ CHECKBOX */}
                  <div className="md:col-span-2 flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <input
                      type="checkbox"
                      checked={work.isCurrent}
                      onChange={(e) => handleArrayItemChange("workExperience", work.id, "isCurrent", e.target.checked)}
                      className="w-5 h-5 rounded text-blue-500 focus:ring-blue-500/50"
                    />
                    <label className="text-sm font-bold text-blue-300">
                      Työskentelen täällä edelleen
                    </label>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className={styles.label}>Tehtävät & Vastuut *</label>
                    <textarea
                      rows={3}
                      value={work.description}
                      onChange={(e) => handleArrayItemChange("workExperience", work.id, "description", e.target.value)}
                      className={`w-full p-3 ${styles.glassInput}`}
                      placeholder="Mitä teit päivittäin?"
                    />
                  </div>

                  {/* ✅ PAKOLLISET VAIN JOS EI NYKYINEN TYÖ */}
                  {!work.isCurrent && (
                    <>
                      <div className="md:col-span-2 p-5 bg-green-500/5 border-2 border-green-500/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <Award className="w-5 h-5 text-green-400" />
                          <label className="text-sm font-bold text-green-300 uppercase">
                            Mikä oli suurin saavutuksesi? *
                          </label>
                        </div>
                        <textarea
                          rows={3}
                          placeholder="Konkreettinen esimerkki + mittarit jos mahdollista. Esim: 'Automatisoin raportointiprosessin → säästin tiimin 10h/viikko'"
                          value={work.biggestAchievement || ""}
                          onChange={(e) => handleArrayItemChange("workExperience", work.id, "biggestAchievement", e.target.value)}
                          className={`w-full p-3 bg-black/40 border border-green-500/20 rounded-lg focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 text-gray-200`}
                        />
                        <div className="mt-2 text-xs text-green-400">
                          {(work.biggestAchievement?.length || 0) >= 80 ? '✓ Hyvä!' : `Vielä ${80 - (work.biggestAchievement?.length || 0)} merkkiä`}
                        </div>
                      </div>

                      <div className="md:col-span-2 p-5 bg-blue-500/5 border-2 border-blue-500/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="w-5 h-5 text-blue-400" />
                          <label className="text-sm font-bold text-blue-300 uppercase">
                            Mitä opit tästä roolista? *
                          </label>
                        </div>
                        <textarea
                          rows={2}
                          placeholder="Esim: 'Opin projektinhallintaa ja miten johtaa tiimejä paineen alla'"
                          value={work.whatYouLearned || ""}
                          onChange={(e) => handleArrayItemChange("workExperience", work.id, "whatYouLearned", e.target.value)}
                          className={`w-full p-3 bg-black/40 border border-blue-500/20 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 text-gray-200`}
                        />
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2 p-5 bg-purple-500/5 border-2 border-purple-500/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-5 h-5 text-purple-400" />
                      <label className="text-sm font-bold text-purple-300 uppercase">
                        Miten vahvuutesi näkyi tässä työssä?
                      </label>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Yhdistä profiilisi vahvuudet konkreettiseen työhön. Esim: 'Järjestelmällisyyteni auttoi pitämään projektin aikataulussa'"
                      value={work.howYourStrengthShowed || ""}
                      onChange={(e) => handleArrayItemChange("workExperience", work.id, "howYourStrengthShowed", e.target.value)}
                      className={`w-full p-3 bg-black/40 border border-purple-500/20 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 text-gray-200`}
                    />
                  </div>

                  <div className="md:col-span-2 mt-4">
                    <details className="group/details">
                      <summary className="cursor-pointer text-sm font-bold text-orange-400 hover:text-orange-300 flex items-center gap-2">
                        <Plus className="w-4 h-4 group-open/details:rotate-45 transition-transform" />
                        Lisää yksityiskohtia (vapaaehtoinen)
                      </summary>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase">Tiimin koko</label>
                          <input
                            type="number"
                            placeholder="esim. 5"
                            value={work.teamSize || ""}
                            onChange={(e) => handleArrayItemChange("workExperience", work.id, "teamSize", parseInt(e.target.value) || 0)}
                            className={`w-full p-2 ${styles.glassInput} text-sm`}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase">Käytetyt työkalut</label>
                          <input
                            type="text"
                            placeholder="esim. Excel, Salesforce"
                            value={work.toolsUsed || ""}
                            onChange={(e) => handleArrayItemChange("workExperience", work.id, "toolsUsed", e.target.value)}
                            className={`w-full p-2 ${styles.glassInput} text-sm`}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-bold text-gray-400 uppercase">Mittarit / Tulokset</label>
                          <input
                            type="text"
                            placeholder="esim. 'Nostin myyntiä 25%', 'Vähensin virheitä 50%'"
                            value={work.metrics || ""}
                            onChange={(e) => handleArrayItemChange("workExperience", work.id, "metrics", e.target.value)}
                            className={`w-full p-2 ${styles.glassInput} text-sm`}
                          />
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KOULUTUS */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <div className="bg-purple-500/20 p-2 rounded-lg"><GraduationCap className="w-5 h-5 text-purple-400" /></div>
            Koulutus
          </h3>
          <button 
            onClick={() => addArrayItem("education")} 
            className={styles.buttonSecondary + " px-4 py-2 text-sm flex items-center gap-2"}
          >
            <Plus className="w-4 h-4" />
            Lisää koulutus
          </button>
        </div>

        {profileData.education.length === 0 ? (
          <div className={`${styles.glassPanel} p-8 text-center border-dashed border-2 border-purple-500/20`}>
            <p className="text-gray-400 mb-4">Ei vielä koulutusta lisätty.</p>
            <button onClick={() => addArrayItem("education")} className={styles.buttonPrimary + " px-6 py-3"}>
              Lisää ensimmäinen
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {profileData.education.map((edu, index) => (
              <div key={edu.id} className={`${styles.glassPanel} p-6 md:p-8 relative group`}>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => removeArrayItem("education", edu.id)}
                    className={styles.buttonDelete + " px-3 py-1 flex items-center gap-1"}
                  >
                    <Trash2 className="w-3 h-3" />
                    Poista
                  </button>
                </div>
                
                <h4 className="text-lg font-bold text-gray-100 mb-6 border-b border-gray-700/50 pb-2">
                  Koulutus {index + 1}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className={styles.label}>Oppilaitos *</label>
                    <input 
                      type="text" 
                      value={edu.school} 
                      onChange={(e) => handleArrayItemChange("education", edu.id, "school", e.target.value)} 
                      className={`w-full p-3 ${styles.glassInput}`} 
                      placeholder="Koulun nimi"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className={styles.label}>Tutkinto *</label>
                    <input 
                      type="text" 
                      value={edu.degree} 
                      onChange={(e) => handleArrayItemChange("education", edu.id, "degree", e.target.value)} 
                      className={`w-full p-3 ${styles.glassInput}`} 
                      placeholder="Esim. Tradenomi"
                    />
                  </div>
                  
                  <div>
                    <label className={styles.label}>Vuosi *</label>
                    <input 
                      type="text" 
                      value={edu.year} 
                      onChange={(e) => handleArrayItemChange("education", edu.id, "year", e.target.value)}
className={`w-full p-3 ${styles.glassInput}`}
placeholder="2024"
/>
</div>
<div className="flex items-end pb-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={edu.isOngoing} 
                    onChange={(e) => handleArrayItemChange("education", edu.id, "isOngoing", e.target.checked)} 
                    className="w-5 h-5 rounded text-purple-500 focus:ring-purple-500/50" 
                  />
                  <span className="text-sm font-medium text-gray-300">Opiskelen tällä hetkellä</span>
                </label>
              </div>

              <div className="md:col-span-2 p-5 bg-yellow-500/5 border-2 border-yellow-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <label className="text-sm font-bold text-yellow-300 uppercase">
                    Miksi valitsit tämän koulutuksen?
                  </label>
                </div>
                <textarea
                  rows={2}
                  placeholder="Esim: 'Halusin ymmärtää miten teknologia voi ratkaista arkisia ongelmia'"
                  value={edu.whyThisField || ""}
                  onChange={(e) => handleArrayItemChange("education", edu.id, "whyThisField", e.target.value)}
                  className={`w-full p-3 bg-black/40 border border-yellow-500/20 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 text-gray-200`}
                />
              </div>

              <div className="md:col-span-2 p-5 bg-green-500/5 border-2 border-green-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-green-400" />
                  <label className="text-sm font-bold text-green-300 uppercase">
                    Mikä oli ylpein hetki opinnoissasi?
                  </label>
                </div>
                <textarea
                  rows={2}
                  placeholder="Saavutus, projekti tai hetki joka määritteli opintojasi"
                  value={edu.proudestMoment || ""}
                  onChange={(e) => handleArrayItemChange("education", edu.id, "proudestMoment", e.target.value)}
                  className={`w-full p-3 bg-black/40 border border-green-500/20 rounded-lg focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 text-gray-200`}
                />
              </div>

              <div className="md:col-span-2 mt-4">
                <details className="group/details">
                  <summary className="cursor-pointer text-sm font-bold text-purple-400 hover:text-purple-300 flex items-center gap-2">
                    <Plus className="w-4 h-4 group-open/details:rotate-45 transition-transform" />
                    Lisää yksityiskohtia (vapaaehtoinen)
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">Erikoistuminen</label>
                      <input
                        type="text"
                        placeholder="esim. Tietojärjestelmät"
                        value={edu.specialization || ""}
                        onChange={(e) => handleArrayItemChange("education", edu.id, "specialization", e.target.value)}
                        className={`w-full p-2 ${styles.glassInput} text-sm`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">Lempiaineet</label>
                      <input
                        type="text"
                        placeholder="esim. Ohjelmointi, Matematiikka"
                        value={edu.favoriteSubjects || ""}
                        onChange={(e) => handleArrayItemChange("education", edu.id, "favoriteSubjects", e.target.value)}
                        className={`w-full p-2 ${styles.glassInput} text-sm`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">Opinnäytetyö/Lopputyö</label>
                      <input
                        type="text"
                        placeholder="Aihe tai kuvaus"
                        value={edu.thesisOrProject || ""}
                        onChange={(e) => handleArrayItemChange("education", edu.id, "thesisOrProject", e.target.value)}
                        className={`w-full p-2 ${styles.glassInput} text-sm`}
                      />
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
</div>
);
const renderSkills = () => {
// ✅ TURVALLINEN SKILLS ARRAY
const skills = Array.isArray(profileData.skills) ? profileData.skills : [];
return (
  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="text-center mb-8">
      <h2 className={`text-2xl mb-2 ${styles.gradientHeading}`}>Taidot & Kielitaito</h2>
      <p className="text-gray-400 font-medium">Konkreettiset esimerkit vahvistavat osaamisesi</p>
    </div>

    {/* TAIDOT */}
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <div className="bg-amber-500/20 p-2 rounded-lg"><Award className="w-5 h-5 text-amber-400" /></div>
          Taidot ja Osaaminen
        </h3>
        <button 
          onClick={() => addArrayItem("skills")} 
          className={styles.buttonSecondary + " px-4 py-2 text-sm flex items-center gap-2"}
        >
          <Plus className="w-4 h-4" />
          Lisää taito
        </button>
      </div>

      {skills.length === 0 ? (
        <div className={`${styles.glassPanel} p-8 text-center border-dashed border-2 border-amber-500/20`}>
          <p className="text-gray-400 mb-4">Lisää vähintään 3-5 taitoa konkreettisilla esimerkeillä.</p>
          <button onClick={() => addArrayItem("skills")} className={styles.buttonPrimary + " px-6 py-3"}>
            Lisää ensimmäinen taito
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {skills.map((skill, index) => (
            <div key={skill.id} className={`${styles.glassPanel} p-5 relative group`}>
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => removeArrayItem("skills", skill.id)}
                  className={styles.buttonDelete + " px-2 py-1 flex items-center gap-1 text-xs"}
                >
                  <Trash2 className="w-3 h-3" />
                  Poista
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className={styles.label}>Taidon nimi *</label>
                  <input
                    type="text"
                    placeholder="esim. Excel, Asiakaspalvelu, Python"
                    value={skill.name}
                    onChange={(e) => handleArrayItemChange("skills", skill.id, "name", e.target.value)}
                    className={`w-full p-3 ${styles.glassInput}`}
                  />
                </div>

                <div>
                  <label className={styles.label}>Taso *</label>
                  <select
                    value={skill.proficiency}
                    onChange={(e) => handleArrayItemChange("skills", skill.id, "proficiency", parseInt(e.target.value))}
                    className={`w-full p-3 ${styles.glassInput}`}
                  >
                    <option value={1}>⭐ Perusteet</option>
                    <option value={2}>⭐⭐ Hyvä</option>
                    <option value={3}>⭐⭐⭐ Vahva</option>
                    <option value={4}>⭐⭐⭐⭐ Erinomainen</option>
                    <option value={5}>⭐⭐⭐⭐⭐ Ekspertti</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={styles.label}>Kuinka kauan käytössä?</label>
                  <input
                    type="number"
                    placeholder="vuotta"
                    value={skill.yearsUsed || ""}
                    onChange={(e) => handleArrayItemChange("skills", skill.id, "yearsUsed", parseInt(e.target.value) || 0)}
                    className={`w-full p-3 ${styles.glassInput}`}
                  />
                </div>

                <div className="md:col-span-3 p-4 bg-blue-500/5 border-2 border-blue-500/20 rounded-lg">
                  <label className="text-sm font-bold text-blue-300 uppercase mb-2 block">
                    Anna konkreettinen esimerkki missä käytit tätä taitoa *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Esim: 'Rakensin Excel-raportin joka automatisoi viikkoanalyysin 20 henkilölle'"
                    value={skill.concreteExample}
                    onChange={(e) => handleArrayItemChange("skills", skill.id, "concreteExample", e.target.value)}
                    className="w-full p-3 bg-black/40 border border-blue-500/20 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 text-gray-200"
                  />
                  <div className="mt-2 text-xs text-blue-400">
                    {skill.concreteExample.length >= 50 ? '✓ Hyvä!' : `Vielä ${50 - skill.concreteExample.length} merkkiä`}
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label className="text-xs font-bold text-gray-400 uppercase">Vaikutus/Tulos (vapaaehtoinen)</label>
                  <input
                    type="text"
                    placeholder="esim. 'Säästin tiimin 10h/viikko', 'Asiakastyytyväisyys nousi 4.5/5'"
                    value={skill.impact || ""}
                    onChange={(e) => handleArrayItemChange("skills", skill.id, "impact", e.target.value)}
                    className={`w-full p-2 ${styles.glassInput} text-sm`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <p className="text-xs text-amber-300 font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Vinkki: Lisää 5-10 taitoa konkreettisilla esimerkeillä. AI ymmärtää paremmin todellisen osaamisesi!
        </p>
      </div>
    </div>

    {/* KIELET */}
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <div className="bg-blue-500/20 p-2 rounded-lg"><Languages className="w-5 h-5 text-blue-400" /></div>
          Kielitaito
        </h3>
        <button 
          onClick={() => addArrayItem("languages")} 
          className={styles.buttonSecondary + " px-4 py-2 text-sm flex items-center gap-2"}
        >
          <Plus className="w-4 h-4" />
          Lisää kieli
        </button>
      </div>

      {profileData.languages.length > 0 && (
        <div className="space-y-4">
          {profileData.languages.map((lang, index) => (
            <div key={lang.id} className={`${styles.glassPanel} p-5 relative group`}>
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => removeArrayItem("languages", lang.id)}
                  className={styles.buttonDelete + " px-2 py-1 flex items-center gap-1 text-xs"}
                >
                  <Trash2 className="w-3 h-3" />
                  Poista
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={styles.label}>Kieli</label>
                  <input 
                    type="text" 
                    value={lang.language} 
                    onChange={(e) => handleArrayItemChange("languages", lang.id, "language", e.target.value)} 
                    className={`w-full p-2 ${styles.glassInput} text-sm`} 
                    placeholder="esim. Englanti"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Puhuminen</label>
                  <select
                    value={lang.speaking}
                    onChange={(e) => handleArrayItemChange("languages", lang.id, "speaking", parseInt(e.target.value))}
                    className={`w-full p-2 ${styles.glassInput} text-sm`}
                  >
                    <option value={1}>⭐ Perusteet</option>
                    <option value={2}>⭐⭐ Keskitaso</option>
                    <option value={3}>⭐⭐⭐ Hyvä</option>
                    <option value={4}>⭐⭐⭐⭐ Erinomainen</option>
                    <option value={5}>⭐⭐⭐⭐⭐ Äidinkieli</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Kirjoittaminen</label>
                  <select
                    value={lang.writing}
                    onChange={(e) => handleArrayItemChange("languages", lang.id, "writing", parseInt(e.target.value))}
                    className={`w-full p-2 ${styles.glassInput} text-sm`}
                  >
                    <option value={1}>⭐ Perusteet</option>
                    <option value={2}>⭐⭐ Keskitaso</option>
                    <option value={3}>⭐⭐⭐ Hyvä</option>
                    <option value={4}>⭐⭐⭐⭐ Erinomainen</option>
                    <option value={5}>⭐⭐⭐⭐⭐ Äidinkieli</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Lukeminen</label>
                  <select
                    value={lang.reading}
                    onChange={(e) => handleArrayItemChange("languages", lang.id, "reading", parseInt(e.target.value))}
                    className={`w-full p-2 ${styles.glassInput} text-sm`}
                  >
                    <option value={1}>⭐ Perusteet</option>
                    <option value={2}>⭐⭐ Keskitaso</option>
                    <option value={3}>⭐⭐⭐ Hyvä</option>
                    <option value={4}>⭐⭐⭐⭐ Erinomainen</option>
                    <option value={5}>⭐⭐⭐⭐⭐ Äidinkieli</option>
                  </select>
                </div>

                <div className="md:col-span-4 p-4 bg-purple-500/5 border-2 border-purple-500/20 rounded-lg">
                  <label className="text-sm font-bold text-purple-300 uppercase mb-2 block">
                    Missä olet käyttänyt tätä kieltä? *
                  </label>
                  <input
                    type="text"
                    placeholder="Esim: 'Asiakaspalvelua englanniksi 2 vuotta - päivittäin 20+ puhelua'"
                    value={lang.whereUsed}
                    onChange={(e) => handleArrayItemChange("languages", lang.id, "whereUsed", e.target.value)}
                    className="w-full p-3 bg-black/40 border border-purple-500/20 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 text-gray-200"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-xs font-bold text-gray-400 uppercase">Sertifikaatti (vapaaehtoinen)</label>
                  <input
                    type="text"
                    placeholder="esim. IELTS 7.5, YKI 5"
                    value={lang.certification || ""}
                    onChange={(e) => handleArrayItemChange("languages", lang.id, "certification", e.target.value)}
                    className={`w-full p-2 ${styles.glassInput} text-sm`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
};
const renderBonus = () => (
<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
<div className="text-center mb-8">
      <h2 className={`text-2xl mb-2 ${styles.gradientHeading}`}> {/* ✅ Lisätty backticks */}
Lisätiedot
</h2>
<p className="text-gray-400 font-medium">Viimeistele profiilisi</p>
</div>
<QuestionCard
    title="Kerro esimerkki kun toimit arvojesi mukaan"
    isRequired={false}
    isCompleted={!!profileData.valuesExample && profileData.valuesExample.length > 50}
    helpText="Vahvistaa luotettavuutta (vapaaehtoinen)"
  >
    <textarea
      value={profileData.valuesExample || ""}
      onChange={(e) => handleInputChange("valuesExample", e.target.value)}
      className={`w-full p-4 ${styles.glassInput} min-h-[100px]`}
      placeholder="Esim: 'Kassalla asiakas unohti vaihtorahan...'"
    />
  </QuestionCard>
</div>
);
// MAIN RENDER
if (isLoading) {
return (
<div className={styles.wrapper + " flex items-center justify-center"}>
<div className="text-center bg-black/50 backdrop-blur-xl p-8 rounded-3xl border border-orange-500/30 shadow-xl">
<Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto mb-4" />
<p className="text-gray-100 font-bold animate-pulse">Ladataan profiilia...</p>
</div>
</div>
);
}
const overallProgress = getOverallProgress();
return (
<>
<div className={styles.wrapper + " pb-20 pt-8"}>
{/* Background orbs - SAMA KUIN LANDING PAGE */}
<div className="fixed inset-0 overflow-hidden pointer-events-none">
<div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-500/10 to-amber-600/10 rounded-full blur-3xl animate-pulse"></div>
<div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-500/8 to-gray-700/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
<div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-500/8 to-orange-600/8 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
</div>
    <div className="container max-w-5xl mx-auto relative z-10 px-4">
      
      {/* Header Section */}
      <div className="text-center mb-10 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-orange-400/30 shadow-sm mb-2">
          <Shield className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-extrabold text-orange-300 uppercase tracking-widest">Käyttäjäprofiili</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-100 drop-shadow-sm tracking-tight">
          Luo <span className={styles.gradientHeading}>Profiilisi</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Täytä tiedot omaan tahtiisi - kaikki tallentuu automaattisesti taustalla.
        </p>

        {/* Overall Progress Bar */}
        <div className="mt-8 max-w-lg mx-auto bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-orange-500/20 shadow-sm">
          <div className="flex justify-between text-sm mb-2 font-bold text-gray-300">
            <span>Kokonaisvalmius</span>
            <span className="text-orange-400">{overallProgress}%</span>
          </div>
          <div className="w-full bg-gray-800/50 rounded-full h-4 overflow-hidden border border-gray-700/60">
            <div
              className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(249,115,22,0.4)] relative"
              style={{ width: `${overallProgress}%` }}
            >
              <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-b from-white/30 to-transparent"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="flex justify-center mb-12">
        <div className="flex items-center gap-4 md:gap-8 bg-black/30 backdrop-blur-md px-6 py-4 rounded-full border border-orange-500/20 shadow-lg">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center relative group">
              <button
                onClick={() => setCurrentStep(index)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 transform ${
                  index === currentStep
                    ? styles.stepBubbleActive
                    : index < currentStep
                    ? styles.stepBubbleCompleted
                    : styles.stepBubbleInactive
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <step.icon className="w-6 h-6" />
                )}
              </button>
              
              {/* Tooltip */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-gray-400 whitespace-nowrap bg-black/80 px-2 py-1 rounded-md shadow-sm pointer-events-none">
                {step.title}
              </div>
              
              {index < steps.length - 1 && (
                <div className="hidden md:block w-12 h-0.5 ml-8 bg-gray-700/50 absolute left-4 z-[-1]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`${styles.glassCard} p-6 md:p-10 mb-8 min-h-[500px] relative`}>
        {/* Header for Step */}
        <div className="absolute top-0 right-0 p-6 pointer-events-none">
          <div className="text-[100px] font-black text-orange-500/5 leading-none select-none z-0">
            {currentStep + 1}
          </div>
        </div>
        
        <div className="relative z-10">
          {currentStep === 0 && renderEssentials()}
          {currentStep === 1 && renderBasicInfo()}
          {currentStep === 2 && renderExperience()}
          {currentStep === 3 && renderSkills()}
          {currentStep === 4 && renderBonus()}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-orange-500/20 shadow-sm">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className={`flex items-center px-6 py-4 rounded-xl font-bold transition-all ${
            currentStep === 0
              ? "text-gray-600 cursor-not-allowed"
              : "bg-white/5 text-gray-300 hover:bg-white/10 shadow-sm border border-gray-700"
          }`}
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Edellinen
        </button>
        
        {/* Auto-save indicator */}
        <div className="hidden md:flex flex-col items-center">
          {isSaving ? (
            <div className="flex items-center gap-2 text-orange-400 text-sm font-bold animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" /> Tallennetaan...
            </div>
          ) : lastSaved ? (
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium opacity-70">
              <CheckCircle className="w-3 h-3" /> Tallennettu {lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          ) : null}
        </div>

        {currentStep === steps.length - 1 ? (
          <button
            onClick={handleFinalSave}
            disabled={isSaving}
            className={`flex items-center px-8 py-4 rounded-xl font-bold transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 ${
              styles.buttonPrimary
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Viimeistellään...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Valmis - Luo Hakukirje
              </>
            )}
          </button>
        ) : (
          <button
            onClick={nextStep}
            disabled={!isStepValid()}
            className={`flex items-center px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${
              isStepValid()
                ? styles.buttonPrimary
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            Seuraava
            <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        )}
      </div>
    </div>
  </div>
</>
);
};
export default EnhancedProfilePage;
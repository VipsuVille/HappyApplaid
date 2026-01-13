// app/profile/page.tsx - LIQUID GLASS STYLE
/* eslint-disable @typescript-eslint/no-explicit-any */

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
  Save,
  CheckCircle,
  AlertCircle,
  Heart,
  Sparkles,
  Briefcase,
  Languages,
  GraduationCap,
  Loader2,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import type { ProfileData } from "@/types";
import { supabase } from "@/lib/supabase-client";

// --- DESIGN SYSTEM STYLES ---
const styles = {
  // Layout & Cards
  wrapper: "min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 font-sans text-gray-900 selection:bg-amber-300 selection:text-gray-900 relative overflow-hidden",
  glassCard: "backdrop-blur-xl bg-white/70 border border-white/60 shadow-2xl shadow-indigo-500/10 rounded-3xl",
  glassPanel: "bg-white/40 backdrop-blur-md border border-indigo-200/50 rounded-2xl",
  
  // Inputs
  glassInput: "bg-white/60 backdrop-blur-sm border-2 border-indigo-200/60 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-300/30 shadow-inner transition-all outline-none rounded-xl text-gray-800 font-medium placeholder:text-gray-400",
  
  // Typography
  gradientHeading: "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-extrabold",
  label: "block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide",
  
  // Buttons
  buttonPrimary: "bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white border-white/20 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl font-bold",
  buttonSecondary: "bg-white/50 text-indigo-900 border-2 border-white/60 hover:bg-white/80 hover:border-indigo-200 shadow-sm transition-all rounded-xl font-bold backdrop-blur-sm",
  buttonDelete: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-all rounded-xl font-semibold text-sm",
  
  // Elements
  stepBubbleActive: "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/40 scale-110 ring-4 ring-white/50",
  stepBubbleCompleted: "bg-green-500 text-white shadow-md shadow-green-500/30",
  stepBubbleInactive: "bg-white/50 text-gray-400 border border-white/60",
};

// --- TYPES ---
type ArrayFieldName = "education" | "workExperience" | "languages";
type ProfileFieldName = keyof ProfileData;

interface StepData {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

// --- HELPER COMPONENTS ---

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
        ? "border-green-400/30 bg-green-50/30"
        : isRequired
        ? "border-indigo-200/50" // Neutraalimpi oletustila
        : "border-white/50"
    } hover:shadow-lg hover:shadow-indigo-500/5`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <h3 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
          {title}
          {isRequired && !isCompleted && <span className="text-pink-500 text-xs align-top">*</span>}
          {isCompleted && (
            <div className="bg-green-100 text-green-600 rounded-full p-1">
              <CheckCircle className="w-4 h-4" />
            </div>
          )}
        </h3>
        <p className="text-sm text-gray-500 mt-1 font-medium">{helpText}</p>
      </div>
    </div>

    {children}

    {minChars > 0 && (
      <div className="mt-3 flex justify-between items-center text-xs font-semibold">
        <span
          className={`px-2 py-1 rounded-md ${
            charCount >= minChars 
              ? "bg-green-100 text-green-700" 
              : "bg-orange-100 text-orange-700"
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
  <div className="mt-3 p-4 bg-indigo-50/50 backdrop-blur-sm border border-indigo-100/50 rounded-xl">
    <p className="text-xs text-indigo-800 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
      <Sparkles className="w-3 h-3" /> Ideoita:
    </p>
    <ul className="text-sm text-indigo-700/80 space-y-1.5 ml-1">
      {examples.map((example, index) => (
        <li key={index} className="flex items-start gap-2">
          <span className="opacity-50">•</span> {example}
        </li>
      ))}
    </ul>
  </div>
);

// --- MAIN COMPONENT ---
const SimplifiedProfilePage: React.FC = () => {
  const { userId } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null); // Uusi tila hiljaiselle tallennukselle
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    email: "",
    phone: "",
    location: "",
    jobTitle: "",
    profileImage: "",
    education: [],
    workExperience: [],
    workingStyle: "",
    problemSolving: "",
    energySources: "",
    uniqueStrength: "",
    learningStyle: "",
    teamRole: "",
    valuesExample: "",
    superpower: "",
    languages: [],
    skills: "",
    careerGoals: "",
    bestProjectExample: "",
    failureLesson: "",
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
      id: "bonus",
      title: "Lisätiedot",
      icon: Sparkles,
      description: "Ekstrat",
    },
  ];

  // Load profile on mount
  useEffect(() => {
    loadProfileData();
  }, [userId]);

// app/profile/page.tsx - KORJAUS loadProfileData-funktioon

// app/profile/page.tsx - loadProfileData korjaus
const loadProfileData = async () => {
  if (!userId) return;

  try {
    setIsLoading(true);
    const response = await fetch("/api/save-profile", { method: "GET" });

    if (response.ok) {
      const data = await response.json();
      if (data.profile) {
        
        // ✅ MUUNNA profile_image URL:ksi HETI
        let imageUrl = "";
        if (data.profile.profileImage) {
          const img = data.profile.profileImage;
          
          if (img.startsWith('http')) {
            // Jo täysi URL
            imageUrl = img;
          } else if (img.startsWith('data:image')) {
            // Base64 (legacy)
            imageUrl = img;
          } else {
            // File path → rakennetaan täysi URL
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            imageUrl = supabaseUrl 
              ? `${supabaseUrl}/storage/v1/object/public/cv_files/${img}`
              : "";
          }
        }
        
        setProfileData({
          ...data.profile,
          profileImage: imageUrl // ✅ Aina täysi URL tai tyhjä string
        });
      }
    } else if (response.status !== 404) {
      console.error("Failed to load profile");
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
      
      // UI feedback updates
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
      // Pass false to suppress toast on auto-save
      saveProfileData(false);
    }, 2000);
    return () => clearTimeout(debounceTimer);
  }, [profileData, isLoading]);

  const handleInputChange = (field: ProfileFieldName, value: string): void => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

// app/profile/page.tsx - KORJATTU handleImageUpload

const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file || !userId) return;

  // Validoi tiedosto
  if (!file.type.startsWith("image/")) {
    toast.error("Valitse vain kuvatiedostoja");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.error("Kuvan koko max 5MB");
    return;
  }

  // ✅ TALLENNA TOAST ID
  const toastId = toast.loading("Ladataan kuvaa...");

  try {
    setIsSaving(true);

    // 1️⃣ GENEROI TIEDOSTONIMI
    const fileExt = file.name.split(".").pop();
    const fileName = `profile_${Date.now()}.${fileExt}`;
    const filePath = `profiles/${userId}/${fileName}`;

    // 2️⃣ LATAA SUPABASE STORAGE:EN
    const { error: uploadError } = await supabase.storage
      .from("cv_files")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      toast.dismiss(toastId); // ✅ POISTA LOADING
      toast.error("Kuvan lataus epäonnistui");
      return;
    }

    // 3️⃣ HAE PUBLIC URL
    const { data: urlData } = supabase.storage
      .from("cv_files")
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      toast.dismiss(toastId);
      toast.error("URL:n haku epäonnistui");
      return;
    }

    // 4️⃣ TALLENNA default_images-TAULUUN
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
      // Ei kriittinen virhe - kuva on jo Storagessa
    }

    // 5️⃣ PÄIVITÄ UI - KÄYTÄ TÄYTTÄ URL:IA!
    setProfileData((prev) => ({
      ...prev,
      profileImage: urlData.publicUrl, // ✅ TÄYSI URL, EI file path!
    }));

    toast.dismiss(toastId); // ✅ POISTA LOADING
    toast.success("Profiilikuva lisätty!");
    
  } catch (error) {
    console.error("Error:", error);
    toast.dismiss(toastId); // ✅ POISTA LOADING
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
      // Pieni viive ennen ohjausta, jotta käyttäjä näkee success-tilan
      setTimeout(() => {
         router.push("/create-cv");
      }, 1000);
    }
  };

  // ... (Sama logiikka kuin ennen: getEssentialProgress, addArrayItem, removeArrayItem, handleArrayItemChange) ...
  const getEssentialProgress = () => {
    const essentialFields = [
      { field: profileData.workingStyle, min: 50 },
      { field: profileData.problemSolving, min: 80 },
      { field: profileData.energySources, min: 40 },
      { field: profileData.uniqueStrength, min: 60 },
      { field: profileData.learningStyle, min: 40 },
      { field: profileData.teamRole, min: 40 },
      { field: profileData.superpower, min: 10 },
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

  const addArrayItem = (arrayName: ArrayFieldName) => {
    const currentItems = profileData[arrayName] as any[];
    const newId = currentItems.length > 0 
      ? Math.max(...currentItems.map((item: any) => item.id)) + 1 
      : 1;
    
    let newItem: any;
    if (arrayName === "education") {
      newItem = { id: newId, school: "", degree: "", year: "", isOngoing: false };
    } else if (arrayName === "workExperience") {
      newItem = { id: newId, company: "", position: "", duration: "", description: "" };
    } else {
      newItem = { id: newId, language: "", level: "Hyvä" };
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
    value: string | boolean
  ): void => {
    setProfileData((prev) => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item: any) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  // --- RENDER SECTIONS ---

  const renderEssentials = () => {
    const progress = getEssentialProgress();
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <h2 className={`text-2xl mb-2 ${styles.gradientHeading}`}>
            Persoonallisuus
          </h2>
          <p className="text-gray-600 mb-6 font-medium">
            Tämä on Simple CV:n ydin. Vastaa rehellisesti.
          </p>

          <div className="bg-white/50 backdrop-blur-sm rounded-full p-2 max-w-md mx-auto border border-white/60 shadow-inner">
            <div className="flex justify-between text-xs font-bold text-gray-500 mb-2 px-2 uppercase tracking-wide">
              <span>Valmiusaste</span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200/50 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-pink-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
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
          title="Millaisissa tilanteissa olet ollut parhaimmillaan?"
          isRequired={true}
          isCompleted={profileData.bestProjectExample.length >= 60}
          charCount={profileData.bestProjectExample.length}
          minChars={60}
          helpText="Kuvaa projekti, tehtävä tai tilanne jossa menestyit"
        >
          <textarea
            value={profileData.bestProjectExample}
            onChange={(e) =>
              handleInputChange("bestProjectExample", e.target.value)
            }
             className={`w-full p-4 ${styles.glassInput} min-h-[120px]`}
            placeholder="Esim: 'Rakensimme uuden prosessin...'"
          />
          <ExampleHint
            examples={[
              "Rakensin sovelluksen varastoon",
              "Organisoin tapahtuman",
              "Mentoroin uutta työntekijää",
            ]}
          />
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
            onChange={(e) =>
              handleInputChange("failureLesson", e.target.value)
            }
             className={`w-full p-4 ${styles.glassInput} min-h-[120px]`}
            placeholder="Esim: 'Projektissa kului budjetti, opin aikataulutuksesta...'"
          />
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
          title="Mitä haluat saavuttaa uralla seuraavassa 3 vuodessa?"
          isRequired={false}
          isCompleted={profileData.careerGoals.length >= 40}
          charCount={profileData.careerGoals.length}
          minChars={40}
          helpText="Motivaatiosi ja suuntasi näkökulmasta"
        >
          <textarea
            value={profileData.careerGoals}
            onChange={(e) =>
              handleInputChange("careerGoals", e.target.value)
            }
             className={`w-full p-4 ${styles.glassInput} min-h-[100px]`}
            placeholder="Esim: 'Haluan oppia projektinhallintaa ja johtaa omaa timiä...'"
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
        </div>
      </div>
    );
  };

  const renderBasicInfo = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className={`text-2xl mb-2 ${styles.gradientHeading}`}>Yhteystiedot</h2>
        <p className="text-gray-600 font-medium">Pakolliset tiedot</p>
      </div>

      <div className="flex justify-center mb-10">
        <div className="relative group">
          <div className="w-40 h-40 rounded-3xl border-4 border-white shadow-2xl overflow-hidden bg-indigo-50 flex items-center justify-center relative">
            {profileData.profileImage ? (
    <img
      src={profileData.profileImage}
      alt="Profiilikuva"
      className="w-full h-full object-cover"
    />
  ) : (
    <User className="w-16 h-16 text-indigo-200" />
  )}

             {/* Hover Overlay */}
             <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}>
                 <Camera className="w-8 h-8 text-white" />
             </div>
          </div>

          <div className="absolute -bottom-4 right-[-10px] flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-2xl shadow-lg hover:scale-110 transition-transform"
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
        <div className="inline-block px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-100 mt-2">
            <p className="text-indigo-800 text-sm font-semibold">
                Professional CV vaatii kokemuksen, Rento CV:lle vapaaehtoinen.
            </p>
        </div>
      </div>

      {/* TYÖKOKEMUS */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <div className="bg-indigo-100 p-2 rounded-lg"><Briefcase className="w-5 h-5 text-indigo-600" /></div>
             Työkokemus
          </h3>
          <button
            onClick={() => addArrayItem("workExperience")}
            className={styles.buttonSecondary + " px-4 py-2 text-sm"}
          >
            + Lisää työpaikka
          </button>
        </div>

        {profileData.workExperience.length === 0 ? (
          <div className={`${styles.glassPanel} p-8 text-center border-dashed border-2 border-indigo-200/50`}>
            <p className="text-gray-500 mb-4">Ei vielä työkokemusta lisätty.</p>
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
                    className={styles.buttonDelete + " px-3 py-1"}
                  >
                    Poista
                  </button>
                </div>
                
                <h4 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-200/50 pb-2">Työpaikka {index + 1}</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={styles.label}>Yritys *</label>
                    <input
                      type="text"
                      value={work.company}
                      onChange={(e) => handleArrayItemChange("workExperience", work.id, "company", e.target.value)}
                      className={`w-full p-3 ${styles.glassInput}`}
                    />
                  </div>
                   <div>
                    <label className={styles.label}>Tehtävänimike *</label>
                    <input
                      type="text"
                      value={work.position}
                      onChange={(e) => handleArrayItemChange("workExperience", work.id, "position", e.target.value)}
                      className={`w-full p-3 ${styles.glassInput}`}
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
                   <div className="md:col-span-2">
                    <label className={styles.label}>Tehtävät & Vastuut *</label>
                    <textarea
                      rows={3}
                      value={work.description}
                      onChange={(e) => handleArrayItemChange("workExperience", work.id, "description", e.target.value)}
                      className={`w-full p-3 ${styles.glassInput}`}
                    />
                  </div>
                   <div className="md:col-span-2 p-4 bg-green-50/50 border border-green-100 rounded-xl">
                    <label className="text-sm font-bold text-green-700 uppercase mb-2 block">Saavutukset (Vapaaehtoinen)</label>
                    <textarea
                      rows={2}
                      placeholder="Mitä saavutit? Numerot toimivat hyvin!"
                      value={work.achievements || ""}
                      onChange={(e) => handleArrayItemChange("workExperience", work.id, "achievements", e.target.value)}
                      className={`w-full p-3 bg-white border border-green-200 rounded-lg focus:outline-none focus:border-green-400`}
                    />
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
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <div className="bg-purple-100 p-2 rounded-lg"><GraduationCap className="w-5 h-5 text-purple-600" /></div>
            Koulutus
          </h3>
          <button onClick={() => addArrayItem("education")} className={styles.buttonSecondary + " px-4 py-2 text-sm"}>
            + Lisää koulutus
          </button>
        </div>

        {profileData.education.length === 0 ? (
          <div className={`${styles.glassPanel} p-8 text-center border-dashed border-2 border-purple-200/50`}>
             <p className="text-gray-500 mb-4">Ei vielä koulutusta lisätty.</p>
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
                    className={styles.buttonDelete + " px-3 py-1"}
                  >
                    Poista
                  </button>
                </div>
                 <h4 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-200/50 pb-2">Koulutus {index + 1}</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                        <label className={styles.label}>Oppilaitos *</label>
                        <input type="text" value={edu.school} onChange={(e) => handleArrayItemChange("education", edu.id, "school", e.target.value)} className={`w-full p-3 ${styles.glassInput}`} />
                    </div>
                     <div className="md:col-span-2">
                        <label className={styles.label}>Tutkinto *</label>
                        <input type="text" value={edu.degree} onChange={(e) => handleArrayItemChange("education", edu.id, "degree", e.target.value)} className={`w-full p-3 ${styles.glassInput}`} />
                    </div>
                     <div>
                        <label className={styles.label}>Vuosi *</label>
                        <input type="text" value={edu.year} onChange={(e) => handleArrayItemChange("education", edu.id, "year", e.target.value)} className={`w-full p-3 ${styles.glassInput}`} />
                    </div>
                     <div className="flex items-end pb-3">
                         <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={edu.isOngoing} onChange={(e) => handleArrayItemChange("education", edu.id, "isOngoing", e.target.checked)} className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500" />
                            <span className="text-sm font-medium text-gray-700">Opiskelen tällä hetkellä</span>
                         </label>
                    </div>
                 </div>
              </div>
            ))}
            </div>
        )}
      </div>

      {/* TAIDOT */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4">Taidot ja Osaaminen</h3>
        <div className={`${styles.glassPanel} p-6`}>
             <label className={styles.label}>Osaaminen (vähintään 5-10 taitoa) *</label>
             <textarea
                value={profileData.skills}
                onChange={(e) => handleInputChange("skills", e.target.value)}
                className={`w-full p-4 ${styles.glassInput} min-h-[150px]`}
                placeholder="Listaa taitosi..."
             />
             <div className="flex justify-end mt-2">
                 <span className={`text-xs font-bold px-2 py-1 rounded ${profileData.skills.length >= 50 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {profileData.skills.length}/50 merkkiä
                 </span>
             </div>
        </div>
      </div>

       {/* KIELET */}
       <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Kielitaito</h3>
          <button onClick={() => addArrayItem("languages")} className={styles.buttonSecondary + " px-4 py-2 text-sm"}>
            + Lisää kieli
          </button>
        </div>
        
        {profileData.languages.length > 0 && (
             <div className="space-y-4">
                 {profileData.languages.map((lang, index) => (
                     <div key={lang.id} className={`${styles.glassPanel} p-4 flex flex-col md:flex-row gap-4 items-end`}>
                        <div className="flex-1 w-full">
                            <label className={styles.label}>Kieli</label>
                            <input type="text" value={lang.language} onChange={(e) => handleArrayItemChange("languages", lang.id, "language", e.target.value)} className={`w-full p-2 ${styles.glassInput}`} />
                        </div>
                        <div className="flex-1 w-full">
                             <label className={styles.label}>Taso</label>
                              <select value={lang.level} onChange={(e) => handleArrayItemChange("languages", lang.id, "level", e.target.value)} className={`w-full p-2 ${styles.glassInput}`}>
                                <option>Äidinkieli</option>
                                <option>Erinomainen</option>
                                <option>Hyvä</option>
                                <option>Perustaso</option>
                              </select>
                        </div>
                        <button onClick={() => removeArrayItem("languages", lang.id)} className={styles.buttonDelete + " px-4 py-2"}>
                            Poista
                        </button>
                     </div>
                 ))}
             </div>
        )}
       </div>
    </div>
  );

  const renderBonus = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className={`text-2xl mb-2 ${styles.gradientHeading}`}>Lisätiedot</h2>
        <p className="text-gray-600 font-medium">Viimeistele profiilisi</p>
      </div>

      <QuestionCard
        title="Kerro esimerkki kun toimit arvojesi mukaan"
        isRequired={false}
        isCompleted={profileData.valuesExample.length > 50}
        helpText="Vahvistaa luotettavuutta (vapaaehtoinen)"
      >
        <textarea
          value={profileData.valuesExample}
          onChange={(e) => handleInputChange("valuesExample", e.target.value)}
          className={`w-full p-4 ${styles.glassInput} min-h-[100px]`}
          placeholder="Esim: 'Kassalla asiakas unohti vaihtorahan...'"
        />
      </QuestionCard>
    </div>
  );

  const isStepValid = () => {
    switch (currentStep) {
      case 0: // Essentials
        const essentials = getEssentialProgress();
        return essentials.completed === essentials.total;
      case 1: // Basic
        return profileData.name && profileData.email;
      default:
        return true;
    }
  };

  const getOverallProgress = () => {
    const essential = getEssentialProgress();
    const hasBasic = profileData.name && profileData.email;
    const hasExperience = profileData.workExperience.length > 0 || profileData.education.length > 0;
    const hasBonus = profileData.skills.length > 10;

    const scores = [
      essential.percentage,
      hasBasic ? 100 : 0,
      hasExperience ? 100 : 0,
      hasBonus ? 100 : 0,
    ];

    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  if (isLoading) {
    return (
      <div className={styles.wrapper + " flex items-center justify-center"}>
        <div className="text-center bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-xl">
          <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-indigo-900 font-bold animate-pulse">Ladataan profiilia...</p>
        </div>
      </div>
    );
  }

  const overallProgress = getOverallProgress();

  return (
    <>
      <div className={styles.wrapper + " pb-20 pt-8"}>
        
        {/* Animated Blobs Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="container max-w-5xl mx-auto relative z-10 px-4">
          
          {/* Header Section */}
          <div className="text-center mb-10 space-y-4">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/50 shadow-sm mb-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-widest">Käyttäjäprofiili</span>
             </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 drop-shadow-sm tracking-tight">
              Luo <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600">Profiilisi</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Täytä tiedot omaan tahtiisi - kaikki tallentuu automaattisesti taustalla.
            </p>

            {/* Overall Progress Bar */}
            <div className="mt-8 max-w-lg mx-auto bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
              <div className="flex justify-between text-sm mb-2 font-bold text-gray-700">
                <span>Kokonaisvalmius</span>
                <span className="text-indigo-600">{overallProgress}%</span>
              </div>
              <div className="w-full bg-white/50 rounded-full h-4 overflow-hidden border border-white/60">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(168,85,247,0.4)] relative"
                  style={{ width: `${overallProgress}%` }}
                >
                     {/* Shine effect */}
                     <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-b from-white/30 to-transparent"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center gap-4 md:gap-8 bg-white/40 backdrop-blur-md px-6 py-4 rounded-full border border-white/60 shadow-lg">
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
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-gray-600 whitespace-nowrap bg-white/80 px-2 py-1 rounded-md shadow-sm pointer-events-none">
                      {step.title}
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className="hidden md:block w-12 h-0.5 ml-8 bg-gray-300/50 absolute left-4 z-[-1]" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className={`${styles.glassCard} p-6 md:p-10 mb-8 min-h-[500px] relative`}>
            {/* Header for Step */}
             <div className="absolute top-0 right-0 p-6 pointer-events-none">
                 <div className="text-[100px] font-black text-indigo-900/5 leading-none select-none z-0">
                     {currentStep + 1}
                 </div>
             </div>
             
             <div className="relative z-10">
                {currentStep === 0 && renderEssentials()}
                {currentStep === 1 && renderBasicInfo()}
                {currentStep === 2 && renderExperience()}
                {currentStep === 3 && renderBonus()}
             </div>
          </div>

          {/* Footer Navigation */}
          <div className="flex justify-between items-center bg-white/30 backdrop-blur-md p-4 rounded-2xl border border-white/40 shadow-sm">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center px-6 py-4 rounded-xl font-bold transition-all ${
                currentStep === 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200"
              }`}
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Edellinen
            </button>
            
            {/* Auto-save indicator */}
            <div className="hidden md:flex flex-col items-center">
                {isSaving ? (
                     <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold animate-pulse">
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
                    Valmis - Luo CV
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={!isStepValid()}
                className={`flex items-center px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${
                  isStepValid()
                    ? "bg-gray-900 text-white hover:bg-black"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
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

export default SimplifiedProfilePage;
// app/profile/page.tsx - TÄYDELLINEN VERSIO
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
} from "lucide-react";
import { toast } from "sonner";
import type { ProfileData} from "@/types";

type ArrayFieldName = "education" | "workExperience" | "languages";
type ProfileFieldName = keyof ProfileData;

interface StepData {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

// Helper components (OUTSIDE main component to prevent re-render issues)
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
    className={`border-2 rounded-lg p-6 transition-all ${
      isCompleted
        ? "border-green-200 bg-green-50"
        : isRequired
        ? "border-orange-200 bg-orange-50"
        : "border-gray-200 bg-white"
    }`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <h3 className="text-lg font-medium text-gray-800 flex items-center">
          {title}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
          {isCompleted && (
            <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
          )}
          {isRequired && !isCompleted && (
            <AlertCircle className="w-5 h-5 text-orange-500 ml-2" />
          )}
        </h3>
        <p className="text-sm text-gray-600 mt-1">{helpText}</p>
      </div>
    </div>

    {children}

    {minChars > 0 && (
      <div className="mt-2 flex justify-between items-center text-xs">
        <span
          className={`${
            charCount >= minChars ? "text-green-600" : "text-orange-600"
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
  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
    <p className="text-xs text-blue-700 font-medium mb-1">💡 Ideoita:</p>
    <ul className="text-xs text-blue-600 space-y-1">
      {examples.map((example, index) => (
        <li key={index}>• {example}</li>
      ))}
    </ul>
  </div>
);

// MAIN COMPONENT
const SimplifiedProfilePage: React.FC = () => {
  const { userId } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
  });

  const steps: StepData[] = [
    {
      id: "essential",
      title: "Tärkeimmät tiedot",
      icon: Heart,
      description: "Simple CV:n ydin - persoonallisuutesi",
    },
    {
      id: "basic",
      title: "Perustiedot",
      icon: User,
      description: "Yhteystiedot ja profiilikuva",
    },
    {
      id: "experience",
      title: "Kokemus",
      icon: Briefcase,
      description: "Työkokemus ja koulutus (Technical/Creative CV:lle)",
    },
    {
      id: "bonus",
      title: "Lisätiedot",
      icon: Sparkles,
      description: "Vapaaehtoisia täydennyksiä",
    },
  ];

  // Load profile on mount
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
          setProfileData((prevData) => ({
            ...prevData,
            ...data.profile,
          }));
          toast.success("Profiili ladattu");
        }
      } else if (response.status !== 404) {
        console.error("Failed to load profile");
        toast.error("Profiilin lataaminen epäonnistui");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Profiilin lataaminen epäonnistui");
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfileData = async (showToast = true) => {
    if (!userId) {
      toast.error("Kirjaudu sisään tallentaaksesi profiilin");
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
      if (showToast) toast.success("Profiili tallennettu!");
      return true;
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Profiilin tallentaminen epäonnistui");
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

  const handleInputChange = (field: ProfileFieldName, value: string): void => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Valitse vain kuvatiedostoja");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kuvan koko max 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      setProfileData((prev) => ({
        ...prev,
        profileImage: base64String,
      }));
      toast.success("Profiilikuva lisätty!");
    };
    reader.readAsDataURL(file);
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
      toast.success("Profiili valmis! Ohjataan CV-luontiin...");
      router.push("/create-cv");
    }
  };

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

  // RENDER FUNCTIONS
  const renderEssentials = () => {
    const progress = getEssentialProgress();

    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Persoonallisuutesi - Simple CV:n ydin
          </h2>
          <p className="text-gray-600 mb-4">
            <span className="text-green-600 font-medium">
              Ei vaadi työkokemusta!
            </span>{" "}
            Vastaa omien kokemustesi pohjalta.
          </p>

          <div className="bg-gray-100 rounded-full p-1 max-w-md mx-auto">
            <div className="flex justify-between text-sm mb-2">
              <span>Simple CV valmius</span>
              <span className="font-medium">
                {progress.completed}/{progress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            {progress.completed === progress.total && (
              <div className="flex items-center justify-center mt-2 text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">
                  Valmis Simple CV:hen!
                </span>
              </div>
            )}
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
              onChange={(e) =>
                handleInputChange("workingStyle", e.target.value)
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
              rows={3}
              placeholder="Esim: 'Tykkään selvistä ohjeista ja rauhallisesta ympäristöstä...'"
            />
            <ExampleHint
              examples={[
                "Olen järjestelmällinen, pidän aikatauluista",
                "Tykkään tiimityöstä ja ideointipalaverista",
                "Työskentelen parhaiten rauhassa keskittyen",
              ]}
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
              onChange={(e) =>
                handleInputChange("problemSolving", e.target.value)
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
              rows={4}
              placeholder="Kerro tilanne, mitä teit, lopputulos..."
            />
            <ExampleHint
              examples={[
                "Ryhmätyön konflikti → listasimme tehtävät",
                "Tekninen ongelma → googlailin ja kysyin apua",
                "Autoin ystävää kuuntelemalla ja ehdottamalla",
              ]}
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
              onChange={(e) =>
                handleInputChange("energySources", e.target.value)
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
              rows={3}
              placeholder="Esim: 'Saan energiaa auttamisesta ja oppimisesta...'"
            />
            <ExampleHint
              examples={[
                "Ihmisten auttaminen",
                "Ongelmanratkaisu",
                "Uuden oppiminen",
              ]}
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
              onChange={(e) =>
                handleInputChange("uniqueStrength", e.target.value)
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
              rows={3}
              placeholder="Esim: 'Olen hyvä selittämään asioita yksinkertaisesti...'"
            />
            <ExampleHint
              examples={[
                "Hyvä kuuntelija, rauhoitan tilanteita",
                "Huomaan yksityiskohdat ja virheet",
                "Motivoin ryhmän yhteen",
              ]}
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
              onChange={(e) =>
                handleInputChange("learningStyle", e.target.value)
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
              rows={3}
              placeholder="Esim: 'Opin tekemällä ja kokeilemalla...'"
            />
            <ExampleHint
              examples={[
                "Tekemällä käytännössä",
                "Videoista ja ohjeista",
                "Kysymällä ja keskustelemalla",
              ]}
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
              rows={3}
              placeholder="Esim: 'Huolehdin että hommat tulee tehtyä...'"
            />
            <ExampleHint
              examples={[
                "Organisoin ja pidän aikataulut",
                "Keksin ideoita ja inspiroin",
                "Kuuntelen ja tuen",
              ]}
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="Esim: Luotettava, Oppimishaluinen, Huolellinen"
            />
            <ExampleHint
              examples={[
                "Luotettava, Innostunut, Järjestelmällinen",
                "Kärsivällinen, Tarkka, Yhteistyökykyinen",
              ]}
            />
          </QuestionCard>
        </div>
      </div>
    );
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Yhteystiedot</h2>
        <p className="text-gray-600">Pakolliset kaikille CV-tyypeille</p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-4 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
            {profileData.profileImage ? (
              <img
                src={profileData.profileImage}
                alt="Profiilikuva"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-16 h-16 text-gray-400" />
            )}
          </div>

          <div className="absolute bottom-0 right-0 flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg"
            >
              <Camera className="w-4 h-4" />
            </button>

            {profileData.profileImage && (
              <button
                onClick={removeProfileImage}
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg"
              >
                <X className="w-4 h-4" />
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Koko nimi *
          </label>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Etunimi Sukunimi"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sähköposti *
          </label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="email@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Puhelinnumero
          </label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="040 1234567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paikkakunta
          </label>
          <input
            type="text"
            value={profileData.location}
            onChange={(e) => handleInputChange("location", e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Helsinki"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Millaista työtä haet?
          </label>
          <input
            type="text"
            value={profileData.jobTitle}
            onChange={(e) => handleInputChange("jobTitle", e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Esim. Asiakaspalvelu, IT-tuki..."
          />
        </div>
      </div>
    </div>
  );

 // KORVAA renderExperience() funktio profile/page.tsx:ssä tällä

const renderExperience = () => (
  <div className="space-y-8">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Työkokemus & Koulutus
      </h2>
      <p className="text-gray-600">
        <span className="text-red-600 font-bold">
          PAKOLLINEN Professional CV:lle!
        </span>
        <br />
        <span className="text-green-600 font-medium">
          Vapaaehtoinen Rento CV:lle
        </span>
      </p>
      <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800 font-medium">
          💼 Professional CV vaatii:
        </p>
        <ul className="text-sm text-blue-700 mt-2 space-y-1">
          <li>✓ Vähintään 1 työkokemus kuvauksineen</li>
          <li>✓ Vähintään 1 koulutus</li>
          <li>✓ Taidot/osaaminen listattuna</li>
          <li>✓ Kielitaito</li>
        </ul>
      </div>
    </div>

    {/* 📋 TYÖKOKEMUS */}
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Työkokemus</h3>
          <p className="text-sm text-gray-600">
            Listaa työpaikat uusimmasta vanhimpaan
          </p>
        </div>
        <button
          onClick={() => addArrayItem("workExperience")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Briefcase className="w-4 h-4" />+ Lisää työpaikka
        </button>
      </div>

      {profileData.workExperience.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2 font-medium">
            Ei vielä työkokemusta lisätty
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Lisää kaikki työpaikat, harjoittelut ja kesätyöt
          </p>
          <button
            onClick={() => addArrayItem("workExperience")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Lisää ensimmäinen työpaikka
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {profileData.workExperience.map((work, index) => (
            <div
              key={work.id}
              className="border-2 border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-lg font-semibold text-gray-800">
                  Työpaikka {index + 1}
                </h4>
                <button
                  onClick={() => removeArrayItem("workExperience", work.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                >
                  <X className="w-4 h-4 inline mr-1" />
                  Poista
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Yrityksen nimi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yritys / Organisaatio *
                  </label>
                  <input
                    type="text"
                    placeholder="Esim: ABC Oy, Kaupan Kassa"
                    value={work.company}
                    onChange={(e) =>
                      handleArrayItemChange(
                        "workExperience",
                        work.id,
                        "company",
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Tehtävänimike */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tehtävänimike / Rooli *
                  </label>
                  <input
                    type="text"
                    placeholder="Esim: Myyjä, IT-tukihenkilö, Harjoittelija"
                    value={work.position}
                    onChange={(e) =>
                      handleArrayItemChange(
                        "workExperience",
                        work.id,
                        "position",
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Ajankohta */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ajankohta *
                  </label>
                  <input
                    type="text"
                    placeholder="Esim: 01/2022 - 12/2023, Kesä 2023, 2020-2022"
                    value={work.duration}
                    onChange={(e) =>
                      handleArrayItemChange(
                        "workExperience",
                        work.id,
                        "duration",
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Vinkki: Kirjoita muodossa "Kuukausi/Vuosi - Kuukausi/Vuosi"
                  </p>
                </div>

                {/* Työtehtävien kuvaus */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Työtehtävät ja vastuut *
                  </label>
                  <textarea
                    placeholder="Kerro mitä teit työssäsi. Esim: Asiakaspalvelu, kassakäsittely, tuotteiden esittely, varastonhallinta..."
                    value={work.description}
                    onChange={(e) =>
                      handleArrayItemChange(
                        "workExperience",
                        work.id,
                        "description",
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                      💡 Listaa 3-5 pääasiallista tehtävää
                    </p>
                    <span
                      className={`text-xs font-medium ${
                        work.description && work.description.length >= 50
                          ? "text-green-600"
                          : "text-orange-600"
                      }`}
                    >
                      {work.description?.length || 0}/50 merkkiä
                    </span>
                  </div>
                </div>
              </div>

              {/* Saavutukset (vapaaehtoinen) */}
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <label className="block text-sm font-medium text-green-800 mb-2">
                  🏆 Saavutukset (vapaaehtoinen, mutta suositeltava)
                </label>
                <textarea
                  placeholder="Mitä erityistä saavutit? Esim: Myynnin kasvu 20%, Asiakaspalautteen parantaminen, Uusien järjestelmien käyttöönotto..."
                  value={work.value || ""}
                  onChange={(e) =>
                    handleArrayItemChange(
                      "workExperience",
                      work.id,
                      "achievements",
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none bg-white"
                  rows={2}
                />
                <p className="text-xs text-green-700 mt-2">
                  💡 Numerot ja prosentit ovat tehokkaita! (Esim. "Käsittelin
                  50+ asiakasta päivässä")
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* 🎓 KOULUTUS */}
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Koulutus</h3>
          <p className="text-sm text-gray-600">
            Listaa koulutus uusimmasta vanhimpaan
          </p>
        </div>
        <button
          onClick={() => addArrayItem("education")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <GraduationCap className="w-4 h-4" />+ Lisää koulutus
        </button>
      </div>

      {profileData.education.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
          <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2 font-medium">
            Ei vielä koulutusta lisätty
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Lisää lukio, ammattikoulu, korkeakoulu tai muut tutkinnot
          </p>
          <button
            onClick={() => addArrayItem("education")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Lisää ensimmäinen koulutus
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {profileData.education.map((edu, index) => (
            <div
              key={edu.id}
              className="border-2 border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-lg font-semibold text-gray-800">
                  Koulutus {index + 1}
                </h4>
                <button
                  onClick={() => removeArrayItem("education", edu.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                >
                  <X className="w-4 h-4 inline mr-1" />
                  Poista
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Oppilaitos */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Oppilaitos *
                  </label>
                  <input
                    type="text"
                    placeholder="Esim: Helsingin Yliopisto, Stadin ammattiopisto, Ressun lukio"
                    value={edu.school}
                    onChange={(e) =>
                      handleArrayItemChange(
                        "education",
                        edu.id,
                        "school",
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Tutkinto */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tutkinto / Koulutusohjelma *
                  </label>
                  <input
                    type="text"
                    placeholder="Esim: Ylioppilas, Datanomi, Tradenomi, Kandidaatti (tietotekniikka)"
                    value={edu.degree}
                    onChange={(e) =>
                      handleArrayItemChange(
                        "education",
                        edu.id,
                        "degree",
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Vuosi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valmistumisvuosi / Ajankohta *
                  </label>
                  <input
                    type="text"
                    placeholder="Esim: 2023, 2020-2024"
                    value={edu.year}
                    onChange={(e) =>
                      handleArrayItemChange(
                        "education",
                        edu.id,
                        "year",
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Kesken checkbox */}
                <div className="flex items-center gap-4 pt-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={edu.isOngoing}
                      onChange={(e) =>
                        handleArrayItemChange(
                          "education",
                          edu.id,
                          "isOngoing",
                          e.target.checked
                        )
                      }
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Opiskelen tällä hetkellä
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* 💼 TAIDOT JA OSAAMINEN */}
    <div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">
        Taidot ja Osaaminen
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        <span className="text-red-600 font-bold">
          PAKOLLINEN Professional CV:lle!
        </span>
        <br />
        Listaa kaikki osaamisesi: tekninen osaaminen, ohjelmistot, työkalut,
        kielitaito, ajokortti jne.
      </p>
<div className={`border-2 ${
              profileData.skills.length >= 50
                ? "border-green-200 bg-green-50"
                : "border-orange-200 bg-orange-50"
            } rounded-lg p-6`}
          >
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Osaaminen (vähintään 5-10 taitoa) *
        </label>
        <textarea
          value={profileData.skills}
          onChange={(e) => handleInputChange("skills", e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
          rows={6}
          placeholder="Listaa taitosi kategorioittain. Esimerkki:&#10;&#10;TIETOTEKNISET TAIDOT:&#10;- Microsoft Office (Excel, Word, PowerPoint)&#10;- Google Workspace&#10;- Sähköpostin ja kalenterin hallinta&#10;&#10;AMMATILLISET TAIDOT:&#10;- Asiakaspalvelu&#10;- Projektinhallinta&#10;- Sosiaalinen media (Instagram, Facebook, LinkedIn)&#10;&#10;HENKILÖKOHTAISET TAIDOT:&#10;- Tiimityö&#10;- Ongelmanratkaisu&#10;- Joustavuus&#10;&#10;MUUT:&#10;- B-ajokortti&#10;- Hygieniapassi"
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-gray-600">
            💡 Vinkki: Jaa taidot kategorioihin (Tekniset, Ammatilliset,
            Henkilökohtaiset)
          </p>
          <span
            className={`text-xs font-medium ${
              profileData.skills.length >= 50
                ? "text-green-600"
                : "text-orange-600"
            }`}
          >
            {profileData.skills.length}/50 merkkiä
            {profileData.skills.length >= 50 ? " ✓" : ""}
          </span>
        </div>

        {/* Esimerkkitaidot */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-medium text-blue-800 mb-2">
            📝 Esimerkkejä taidoista:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-blue-700">
            <div>
              <strong>IT:</strong>
              <br />
              Excel, Word, PowerPoint
              <br />
              Canva, Photoshop
              <br />
              Google Analytics
            </div>
            <div>
              <strong>Ammatilliset:</strong>
              <br />
              Asiakaspalvelu
              <br />
              Myynti
              <br />
              Projektinhallinta
            </div>
            <div>
              <strong>Muut:</strong>
              <br />
              B-ajokortti
              <br />
              Hygieniapassi
              <br />
              Ensiapukurssi
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* 🌍 KIELET */}
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Kielitaito</h3>
          <p className="text-sm text-gray-600">
            <span className="text-red-600 font-bold">
              PAKOLLINEN Professional CV:lle!
            </span>
            <br />
            Listaa kaikki kielet joita osaat
          </p>
        </div>
        <button
          onClick={() => addArrayItem("languages")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Languages className="w-4 h-4" />+ Lisää kieli
        </button>
      </div>

      {profileData.languages.length === 0 ? (
        <div className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center bg-orange-50">
          <Languages className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <p className="text-gray-600 mb-2 font-medium">
            Ei vielä kieliä lisätty
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Professional CV vaatii vähintään yhden kielen (esim. Suomi)
          </p>
          <button
            onClick={() => addArrayItem("languages")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Lisää ensimmäinen kieli
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {profileData.languages.map((lang, index) => (
            <div
              key={lang.id}
              className="border-2 border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-base font-semibold text-gray-800">
                  Kieli {index + 1}
                </h4>
                <button
                  onClick={() => removeArrayItem("languages", lang.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                >
                  <X className="w-4 h-4 inline mr-1" />
                  Poista
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kieli */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kieli *
                  </label>
                  <input
                    type="text"
                    placeholder="Esim: Suomi, Englanti, Ruotsi"
                    value={lang.language}
                    onChange={(e) =>
                      handleArrayItemChange(
                        "languages",
                        lang.id,
                        "language",
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Taitotaso */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taitotaso *
                  </label>
                  <select
                    value={lang.level}
                    onChange={(e) =>
                      handleArrayItemChange(
                        "languages",
                        lang.id,
                        "level",
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Äidinkieli">Äidinkieli</option>
                    <option value="Erinomainen">Erinomainen (C2)</option>
                    <option value="Erittäin hyvä">Erittäin hyvä (C1)</option>
                    <option value="Hyvä">Hyvä (B2)</option>
                    <option value="Tyydyttävä">Tyydyttävä (B1)</option>
                    <option value="Perustaso">Perustaso (A1-A2)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Valitse realistinen taso
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vinkki */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>💡 Vinkki:</strong> Suomi, Ruotsi ja Englanti ovat yleisimmät
          kielet Suomessa. Listaa kaikki kielet joita osaat edes perustasolla!
        </p>
      </div>
    </div>
  </div>
)

  const renderBonus = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Lisätiedot</h2>
        <p className="text-gray-600">
          Vapaaehtoisia, mutta tekevät CV:stä paremman
        </p>
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
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
          placeholder="Esim: 'Kassalla asiakas unohti vaihtorahan. Juoksin perään...'"
        />
      </QuestionCard>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Taidot ja osaaminen{" "}
          <span className="text-gray-500">(vapaaehtoinen)</span>
        </label>
        <textarea
          value={profileData.skills}
          onChange={(e) => handleInputChange("skills", e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Listaa taitojasi. Esim: Excel, asiakaspalvelu, sosiaalinen media, ajokortti..."
        />
      </div>

      {/* Kielet */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Kielitaito</h3>
          <button
            onClick={() => addArrayItem("languages")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Lisää
          </button>
        </div>

        {profileData.languages.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-500">Ei vielä kieliä lisätty</p>
            <button
              onClick={() => addArrayItem("languages")}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Lisää ensimmäinen
            </button>
          </div>
        ) : (
          profileData.languages.map((lang) => (
            <div
              key={lang.id}
              className="border-2 border-gray-200 rounded-lg p-4 mb-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Kieli"
                  value={lang.language}
                  onChange={(e) =>
                    handleArrayItemChange(
                      "languages",
                      lang.id,
                      "language",
                      e.target.value
                    )
                  }
                  className="px-4 py-2 border rounded-lg"
                />
                <select
                  value={lang.level}
                  onChange={(e) =>
                    handleArrayItemChange(
                      "languages",
                      lang.id,
                      "level",
                      e.target.value
                    )
                  }
                  className="px-4 py-2 border rounded-lg"
                >
                  <option>Perustaso</option>
                  <option>Hyvä</option>
                  <option>Erinomainen</option>
                  <option>Äidinkieli</option>
                </select>
                <button
                  onClick={() => removeArrayItem("languages", lang.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  Poista
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const isStepValid = () => {
    switch (currentStep) {
      case 0: // Essentials
        const essentials = getEssentialProgress();
        return essentials.completed === essentials.total;
      case 1: // Basic
        return profileData.name && profileData.email;
      case 2: // Experience
        return true; // Vapaaehtoinen
      case 3: // Bonus
        return true; // Vapaaehtoinen
      default:
        return true;
    }
  };

  const getOverallProgress = () => {
    const essential = getEssentialProgress();
    const hasBasic = profileData.name && profileData.email;
    const hasExperience =
      profileData.workExperience.length > 0 || profileData.education.length > 0;
    const hasBonus = profileData.skills || profileData.languages.length > 0;

    const scores = [
      essential.percentage, // 0-100
      hasBasic ? 100 : 0,
      hasExperience ? 100 : 0,
      hasBonus ? 100 : 0,
    ];

    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ladataan profiilia...</p>
        </div>
      </div>
    );
  }

  const overallProgress = getOverallProgress();

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Luo Profiilisi
        </h1>
        <p className="text-gray-600">
          Täytä tiedot omaan tahtiisi - kaikki tallentuu automaattisesti
        </p>

        {/* Overall Progress */}
        <div className="mt-6 max-w-md mx-auto">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Kokonaisvalmius</span>
            <span className="text-gray-600">{overallProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          {overallProgress >= 70 && (
            <p className="text-sm text-green-600 mt-2 font-medium">
              ✓ Valmis luomaan Simple CV:n!
            </p>
          )}
        </div>
      </div>

      {/* Step Progress */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setCurrentStep(index)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  index === currentStep
                    ? "bg-blue-600 text-white scale-110"
                    : index < currentStep
                    ? "bg-green-500 text-white hover:scale-105"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </button>
              {index < steps.length - 1 && (
                <div
                  className={`w-8 h-px transition-colors ${
                    index < currentStep ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {steps[currentStep].title}
        </h2>
        <p className="text-sm text-gray-600">
          {steps[currentStep].description}
        </p>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
        {currentStep === 0 && renderEssentials()}
        {currentStep === 1 && renderBasicInfo()}
        {currentStep === 2 && renderExperience()}
        {currentStep === 3 && renderBonus()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
            currentStep === 0
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Edellinen
        </button>

        {currentStep === steps.length - 1 ? (
          <button
            onClick={handleFinalSave}
            disabled={isSaving}
            className={`flex items-center px-8 py-3 rounded-lg font-medium transition-colors ${
              !isSaving
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isSaving ? (
              <>
                <Save className="w-5 h-5 mr-2 animate-spin" />
                Tallennetaan...
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
            className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
              isStepValid()
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Seuraava
            <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        )}
      </div>

      {/* Hint */}
      <p className="text-center text-sm text-gray-500 mt-4">
        {!isStepValid() && currentStep === 0 &&
          "Täytä kaikki pakolliset persoonallisuuskysymykset"}
        {!isStepValid() && currentStep === 1 && "Täytä nimi ja sähköposti"}
        {isStepValid() && currentStep < steps.length - 1 &&
          "Voit jatkaa seuraavaan vaiheeseen"}
        {currentStep === steps.length - 1 && "Voit tallentaa ja siirtyä CV-luontiin"}
      </p>

      <p className="text-center text-xs text-gray-400 mt-2">
        {isSaving ? "Tallennetaan..." : "Tiedot tallentuvat automaattisesti"}
      </p>
    </div>
  );
};

export default SimplifiedProfilePage;
"use client";
//components/howitworks.tsx
import { User, Brain, FileText } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function HowItWorksTimeline() {
  const { language } = useLanguage();

  const steps = [
    {
      icon: User,
      title: language === "en" ? "Sign up or log in" : "Luo käyttäjä tai kirjaudu",
      text:
        language === "en"
          ? "Create a free account or sign in to get started."
          : "Luo ilmainen käyttäjä tai kirjaudu sisään aloittaaksesi.",
    },
    {
      icon: Brain,
      title:
        language === "en"
          ? "Complete your profile once"
          : "Täytä profiilisi kerran",
      text:
        language === "en"
          ? "Add your background, skills and strengths. The AI uses this in every application."
          : "Kerro taustastasi ja vahvuuksistasi. AI käyttää tietoja kaikissa hakemuksissa.",
    },
    {
      icon: FileText,
      title:
        language === "en"
          ? "Generate CV or cover letter"
          : "Generoi CV tai hakukirje",
      text:
        language === "en"
          ? "Create a general document or paste a job ad (or type e.g. “IKEA”) for a job-specific version."
          : "Luo yleinen dokumentti tai liitä työpaikkailmoitus (tai kirjoita esim. “IKEA”) työpaikkakohtaista versiota varten.",
    },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-xl border-2 border-indigo-200 rounded-3xl p-6 sm:p-10 shadow-2xl">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
        {language === "en" ? "How it works" : "Näin ohjelma toimii"}
      </h2>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={index} className="flex-1 text-center relative">
              <div className="mx-auto w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center mb-4 shadow-lg">
                <Icon className="w-7 h-7" />
              </div>

              <h3 className="font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600">{step.text}</p>

              {/* Nuoli vain desktopissa */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-7 right-[-24px] text-indigo-400 text-3xl">
                  →
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

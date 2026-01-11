"use client";
import { User, Brain, FileText, CheckCircle2, ChevronRight, FileEdit, ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

export default function HowItWorksTimeline() {
  const { language } = useLanguage();
  const { isSignedIn } = useUser();

  const steps = [
    {
      icon: User,
      title: language === "en" ? "Sign up or log in" : "Luo käyttäjä tai kirjaudu",
      text: language === "en" ? "Create a account to save your progress." : "Luo tili tallentaaksesi edistymisesi.",
      isCompleted: isSignedIn,
      action: null
    },
    {
      icon: Brain,
      title: language === "en" ? "Complete profile" : "Täytä profiilisi",
      text: language === "en" ? "Add your skills and background." : "Kerro taustastasi ja vahvuuksistasi.",
      isCompleted: false,
      action: {
        label: language === "en" ? "Go to profile" : "Täydennä profiili",
        href: "/profile"
      }
    },
    {
      icon: FileText,
      title: language === "en" ? "Generate" : "Generoi",
      text: language === "en" ? "Create professional documents." : "Luo dokumentteja sekunneissa.",
      isCompleted: false,
      multiAction: [
        { label: "CV", href: "/my-cvs", icon: FileText },
        { label: "Letter", href: "/my-cover-letters", icon: FileEdit }
      ]
    },
  ];

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
      {/* Tyylitelty otsikko */}
      <div className="flex flex-col items-center mb-12">
        <h2 className="text-3xl font-black text-white mb-2">
          {language === "en" ? "Quick Start Guide" : "Näin pääset alkuun"}
        </h2>
        <div className="h-1 w-20 bg-orange-500 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isDone = step.isCompleted;

          return (
            <div 
              key={index} 
              className={`group relative p-6 rounded-2xl transition-all duration-300 border ${
                isDone ? 'bg-orange-500/5 border-orange-500/20' : 'bg-white/5 border-transparent hover:border-white/10 hover:-translate-y-1'
              }`}
            >
              {/* Icon / Checkmark */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${
                isDone ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'
              }`}>
                {isDone ? <CheckCircle2 className="w-8 h-8" /> : <Icon className="w-7 h-7" />}
              </div>

              <h3 className={`font-bold text-lg mb-2 ${isDone ? 'text-orange-400' : 'text-white'}`}>
                {step.title}
              </h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {step.text}
              </p>

              {/* Action Buttons */}
              {step.action && !isDone && (
                <Link href={step.action.href}>
                  <button className="flex items-center gap-2 text-xs font-bold text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wider">
                    {step.action.label} <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>
              )}

              {step.multiAction && (
                <div className="flex gap-2">
                  {step.multiAction.map((act, i) => (
                    <Link key={i} href={act.href} className="flex-1">
                      <button className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white/5 hover:bg-orange-500 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/5">
                        <act.icon className="w-3.5 h-3.5" />
                        {act.label}
                      </button>
                    </Link>
                  ))}
                </div>
              )}

              {/* Desktop Connectors */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 translate-x-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className={`w-6 h-6 ${isDone ? 'text-orange-500' : 'text-gray-800'}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
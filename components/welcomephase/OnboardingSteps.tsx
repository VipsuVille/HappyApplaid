// components/onboarding/OnboardingSteps.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  User,
  FileText,
  Download,
  CheckCircle,
  Target,
  Clock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingStepsProps {
  isOpen: boolean; // LISÄTTY: Tämän propin puuttuminen aiheutti virheen
  onComplete: () => void;
  currentUserName?: string;
}

const OnboardingSteps: React.FC<OnboardingStepsProps> = ({
  isOpen, // DESTRUKTUROITU
  onComplete,
  currentUserName = "käyttäjä",
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  // LISÄTTY: Jos isOpen on false, komponenttia ei renderöidä (modal on suljettu)
  if (!isOpen) {
    return null;
  }

  // ... (muu steps-data on ennallaan)
  const steps = [
    {
      id: "profile",
      title: "Täytä profiilisi",
      description:
        "Kerro itsestäsi - erityisesti persoonallisuuskysymykset ovat tärkeitä!",
      icon: User,
      time: "5-10 min",
      importance: "Tärkein vaihe",
      color: "bg-green-500",
      details: [
        "Perustiedot (nimi, sähköposti)",
        "🌟 Persoonallisuuskysymykset (tärkein osa!)",
        "Työkokemus ja koulutus (vapaaehtoinen)",
        "Taidot ja kielitaito",
      ],
      href: "/profile",
    },
    {
      id: "cv",
      title: "Luo ensimmäinen CV",
      description:
        "Tekoäly luo sinulle henkilökohtaisen CV:n profiilisi pohjalta",
      icon: FileText,
      time: "2-3 min",
      importance: "Helppo kun profiili on täytetty",
      color: "bg-blue-500",
      details: [
        "Valitse CV-malli (Simple suositeltu aloittelijoille)",
        "Tekoäly täyttää CV:n automaattisesti",
        "Voit muokata sisältöä tarpeen mukaan",
        "Lataa valmis PDF",
      ],
      href: "/create-cv",
    },
    {
      id: "download",
      title: "Lataa ja käytä",
      description: "CV on valmis käytettäväksi työhakemuksissa!",
      icon: Download,
      time: "1 min",
      importance: "Valmis!",
      color: "bg-purple-500",
      details: [
        "Lataa PDF-muodossa",
        "Käytä työhakemuksissa",
        "Luo hakukirjeitä samalla tavalla",
        "Päivitä profiilia tarpeen mukaan",
      ],
      href: "/my-cvs",
    },
  ];
  // ... (muu koodi on ennallaan)

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center border-b">
          <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Target className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Hei {currentUserName}! 👋</CardTitle>
          <p className="text-gray-600">
            Opastan sinut läpi 3 yksinkertaisen vaiheen - olet valmis alle 15
            minuutissa!
          </p>

          {/* Progress indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? "w-8 bg-indigo-500"
                    : index < currentStep
                    ? "w-6 bg-green-500"
                    : "w-6 bg-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Vaihe {currentStep + 1} / {steps.length}
          </p>
        </CardHeader>

        <CardContent className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-6">
                <div
                  className={`h-16 w-16 ${currentStepData.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}
                >
                  <currentStepData.icon className="h-8 w-8 text-white" />
                </div>

                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    {currentStepData.time}
                  </Badge>
                  <Badge
                    variant={currentStep === 0 ? "default" : "outline"}
                    className={currentStep === 0 ? "bg-green-600" : ""}
                  >
                    {currentStepData.importance}
                  </Badge>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {currentStepData.title}
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  {currentStepData.description}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  Mitä tässä vaiheessa tehdään:
                </h3>
                <div className="space-y-2">
                  {currentStepData.details.map((detail, index) => (
                    <div key={index} className="flex items-start">
                      <div className="h-2 w-2 bg-indigo-400 rounded-full mt-2 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 text-sm leading-relaxed">
                        {detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special emphasis for first step */}
              {currentStep === 0 && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6 mb-6">
                  <div className="flex items-start">
                    <Sparkles className="h-6 w-6 text-green-600 mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-green-900 mb-2">
                        Tärkeä tietää: Persoonallisuuskysymykset ovat avainta!
                      </h4>
                      <p className="text-sm text-green-800 mb-2">
                        Vaikka sinulla ei olisi työkokemusta, voit silti luoda
                        vaikuttavan CV:n vastaamalla persoonallisuuskysymyksiin
                        huolellisesti.
                      </p>
                      <p className="text-xs text-green-700 font-medium">
                        Tekoäly käyttää näitä vastauksia luodakseen juuri
                        sinulle sopivan CV:n!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                >
                  Takaisin
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={onComplete}
                    className="text-gray-500"
                  >
                    Ohita opastus
                  </Button>

                  {currentStep < steps.length - 1 ? (
                    <Button onClick={handleNext}>
                      Seuraava
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Link href={currentStepData.href}>
                      <Button
                        onClick={onComplete}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Aloita käyttö!
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingSteps;

// components/welcomephase/WelcomeModal.tsx
"use client";

import React, { useState, useEffect } from "react"; // Lisätty useEffect
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Sparkles, Target, User } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

// Korjattu: Lisätty puuttuvat propit 'isOpen' ja 'initialEmail'
interface WelcomeModalProps {
  isOpen: boolean; // LISÄTTY
  onComplete: (data: {
    name: string;
    email: string;
    useClerkEmail: boolean;
  }) => void;
  onSkip: () => void;
  initialEmail?: string; // LISÄTTY, tehty valinnaiseksi
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen, // DESTRUKTUROITU
  onComplete,
  onSkip,
  initialEmail, // DESTRUKTUROITU
}) => {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : ""
  );
  const [email, setEmail] = useState("");
  const [useClerkEmail, setUseClerkEmail] = useState(false);

  // Käytä initialEmail, jos se on annettu (esim. Home.tsx:stä)
  const clerkEmail = initialEmail || user?.primaryEmailAddress?.emailAddress;

  // LISÄTTY: Sulje modaali heti, jos isOpen on false
  if (!isOpen) {
    return null;
  }

  // Aseta alustava sähköposti, jos se on saatavilla ja käyttäjä on kirjautunut sisään
  useEffect(() => {
    if (clerkEmail) {
      setEmail(clerkEmail);
    }
  }, [clerkEmail]);

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        toast.error("Anna nimesi jatkaaksesi");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Tarkistetaan ensin, käytetäänkö clerkEmailia, jos se on käytössä
      let finalEmail = useClerkEmail ? clerkEmail : email;

      // Jos clerkEmail on saatavilla ja sitä ei ole valittu käytettäväksi, mutta käyttäjä yrittää ohittaa
      // antaa toisen sähköpostin, käytä annettua sähköpostia.

      if (!finalEmail?.trim()) {
        toast.error("Anna sähköpostiosoite jatkaaksesi");
        return;
      }

      // Tässä vaiheessa onComplete pitäisi olla valmis hyväksymään Promise<void> Home.tsx:n puolella
      onComplete({
        name: name.trim(),
        email: finalEmail!, // Huomaa: Oletetaan, että se on olemassa trimmin jälkeen
        useClerkEmail: !!useClerkEmail,
      });
    }
  };

  const handleUseClerkEmail = () => {
    if (!clerkEmail) {
      toast.error("Clerk-sähköpostia ei ole saatavilla");
      return;
    }
    setUseClerkEmail(true);
    // onComplete kutsuu seuraavan vaiheen Home.tsx:ssä
    onComplete({
      name: name.trim(),
      email: clerkEmail,
      useClerkEmail: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl">
            Tervetuloa HappyApplaidiin!
          </CardTitle>
          <p className="text-gray-600">
            {step === 1
              ? "Aloitetaan perustietojen keräämiselllä"
              : "Vahvista sähköpostiosoitteesi"}
          </p>

          {/* Progress indicator */}
          <div className="flex justify-center gap-2 mt-4">
            <div
              className={`w-8 h-2 rounded-full ${
                step >= 1 ? "bg-indigo-500" : "bg-gray-200"
              }`}
            />
            <div
              className={`w-8 h-2 rounded-full ${
                step >= 2 ? "bg-indigo-500" : "bg-gray-200"
              }`}
            />
            <div className="w-8 h-2 rounded-full bg-gray-200" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="welcome-name">Koko nimesi *</Label>
                <Input
                  id="welcome-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Etunimi Sukunimi"
                  className="mt-1"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tämä näkyy CV:ssäsi ja hakukirjeissäsi
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Seuraavaksi:
                </h4>
                <div className="space-y-2 text-sm text-blue-700">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Täydennät persoonallisuuskysymykset (tärkein osa!)
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Luot ensimmäisen CV:si tekoälyllä
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Lataat valmiin PDF:n
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {clerkEmail && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">
                    Käytä kirjautumissähköpostia?
                  </h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700">{clerkEmail}</p>
                      <p className="text-xs text-green-600">
                        Suositeltu - sama kuin kirjautumisessa
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleUseClerkEmail}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Käytä tätä
                    </Button>
                  </div>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">tai</span>
                </div>
              </div>

              <div>
                <Label htmlFor="welcome-email">
                  Tai anna toinen sähköposti
                </Label>
                <Input
                  id="welcome-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="oma@sahkoposti.com"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tämä näkyy CV:ssäsi ja työnantajat voivat ottaa sinuun
                  yhteyttä
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={onSkip}
              className="text-gray-600"
            >
              Ohita toistaiseksi
            </Button>

            <Button onClick={handleNext}>
              {step === 1 ? "Seuraava" : "Valmis"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {step === 1 && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Vaihe 1/2 - Kestää alle minuutti
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomeModal;

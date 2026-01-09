"use client";

import { useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Trash2, Shield } from "lucide-react";

export function DeleteAccountSection() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(0);
  const [confirmText, setConfirmText] = useState("");

  const handleDeleteAccount = async () => {
  if (confirmStep === 0) {
    setConfirmStep(1);
    return;
  }

  if (confirmStep === 1) {
    if (confirmText.toLowerCase() !== "poista tilini") {
      alert('Kirjoita "POISTA TILINI" vahvistaaksesi');
      return;
    }
    setConfirmStep(2);
    return;
  }

  setIsDeleting(true);

  try {
    const response = await fetch("/api/delete-account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Poisto epäonnistui");
    }

    // 🚀 TÄRKEÄ: ohjaa heti pois sivulta
    router.replace("/");

    // alert on ok, mutta EI pakollinen
    alert("Tilisi on poistettu onnistuneesti. Kiitos että käytit palveluamme!");
  } catch (error) {
    console.error("Delete failed:", error);
    alert(
      `Virhe: ${error instanceof Error ? error.message : "Tuntematon virhe"}`
    );
    setConfirmStep(0);
    setConfirmText("");
  } finally {
    setIsDeleting(false);
  }
};


  const resetDeletion = () => {
    setConfirmStep(0);
    setConfirmText("");
  };

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader>
        <CardTitle className="text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Vaarallinen alue
        </CardTitle>
        <CardDescription>
          Tilin poistaminen on peruuttamaton toiminto. Kaikki tietosi poistetaan
          pysyvästi.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {confirmStep === 0 && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Mitä poistetaan:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Kaikki CV:t ja hakukirjeet</li>
                <li>• Profiilitiedot ja persoonallisuuskysymykset</li>
                <li>• Tilaushistoria ja tokenit</li>
                <li>• Kaikki ladatut kuvat</li>
                <li>• Käyttäjätili Clerk-järjestelmästä</li>
              </ul>
            </div>

            <Button
              onClick={handleDeleteAccount}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Poista tilini pysyvästi
            </Button>
          </div>
        )}

        {confirmStep === 1 && (
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                Vahvista tilin poisto kirjoittamalla:
              </p>
              <p className="font-bold text-yellow-900">POISTA TILINI</p>
            </div>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Kirjoita vahvistusteksti tähän"
              className="w-full p-3 border rounded-lg"
              autoFocus
            />

            <div className="flex gap-2">
              <Button
                onClick={resetDeletion}
                variant="outline"
                className="flex-1"
              >
                Peruuta
              </Button>
              <Button
                onClick={handleDeleteAccount}
                variant="destructive"
                className="flex-1"
                disabled={confirmText.toLowerCase() !== "poista tilini"}
              >
                Jatka
              </Button>
            </div>
          </div>
        )}

        {confirmStep === 2 && (
          <div className="space-y-4">
            <div className="bg-red-100 p-4 rounded-lg border border-red-300">
              <p className="font-bold text-red-900 mb-2">
                ⚠️ VIIMEINEN VAROITUS
              </p>
              <p className="text-sm text-red-800">
                Tämä toiminto poistaa KAIKEN pysyvästi. Tietoja ei voida
                palauttaa. Oletko varma että haluat jatkaa?
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={resetDeletion}
                variant="outline"
                className="flex-1"
              >
                En, peruuta
              </Button>
              <Button
                onClick={handleDeleteAccount}
                variant="destructive"
                className="flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? "Poistetaan..." : "Kyllä, poista tili"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

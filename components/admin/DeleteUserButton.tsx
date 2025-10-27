"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeleteUserButtonProps {
  userId: string;
  userName?: string;
  onDeleteComplete?: () => void;
}

export function DeleteUserButton({
  userId,
  userName = "käyttäjä",
  onDeleteComplete,
}: DeleteUserButtonProps) {
  const { getToken } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(0);

  const handleDelete = async () => {
    if (confirmStep < 2) {
      setConfirmStep(confirmStep + 1);
      return;
    }

    setIsDeleting(true);

    try {
      const token = await getToken({ template: "supabase" });

      const response = await fetch(`/api/admin/delete-user/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Deletion failed");
      }

      alert(`Käyttäjä ${userName} poistettu onnistuneesti!`);
      onDeleteComplete?.();
    } catch (error) {
      console.error("Delete failed:", error);
      alert(
        `Virhe: ${error instanceof Error ? error.message : "Tuntematon virhe"}`
      );
    } finally {
      setIsDeleting(false);
      setConfirmStep(0);
    }
  };

  const getButtonText = () => {
    if (isDeleting) return "Poistetaan...";
    switch (confirmStep) {
      case 0:
        return `Poista ${userName}`;
      case 1:
        return "Vahvista poisto";
      case 2:
        return "POISTA PYSYVÄSTI";
      default:
        return "Poista";
    }
  };

  const getButtonVariant = () => {
    switch (confirmStep) {
      case 0:
        return "outline";
      case 1:
        return "secondary";
      case 2:
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleDelete}
        disabled={isDeleting}
        variant={getButtonVariant()}
        size="sm"
        className="w-full"
      >
        {confirmStep < 2 ? (
          <Trash2 className="h-4 w-4 mr-2" />
        ) : (
          <AlertTriangle className="h-4 w-4 mr-2" />
        )}
        {getButtonText()}
      </Button>

      {confirmStep > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {confirmStep === 1 && "Klikkaa uudelleen vahvistaaksesi"}
          {confirmStep === 2 && "⚠️ VAROITUS: Tämä poistaa KAIKEN pysyvästi!"}
        </p>
      )}

      {confirmStep > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmStep(0)}
          className="text-xs"
        >
          Peruuta
        </Button>
      )}
    </div>
  );
}

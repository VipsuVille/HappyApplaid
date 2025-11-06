import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DeleteAccountSection } from "@/components/account/DeleteAccountSection";
import { getFreemiumStatus } from "@/lib/server/getFreemiumStatus";
import SmartHeader from "@/components/ui/smartHeader";

export default async function SettingsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }
  const freemiumStatus = await getFreemiumStatus(user.id); // ✅ Käytä

  return (
<div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 container max-w-5xl mx-auto">
  <SmartHeader />

  <div className="space-y-8  py-8 px-4">
        {/* Otsikko */}
        <div>
          <h1 className="text-3xl font-bold">Tilin asetukset</h1>
          <p className="text-muted-foreground">Hallitse tiliäsi ja tietojasi</p>
        </div>

        {/* Perustiedot */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Perustiedot</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Nimi:</span> {user.firstName}{" "}
              {user.lastName}
            </div>
            <div>
              <span className="font-medium">Sähköposti:</span>{" "}
              {user.emailAddresses[0]?.emailAddress}
            </div>
            <div>
              <span className="font-medium">Liittynyt:</span>{" "}
              {new Date(user.createdAt).toLocaleDateString("fi-FI")}
            </div>
          </div>
        </div>

        {/* Muut asetukset... */}

        {/* Tilin poisto (aivan lopussa) */}
        <DeleteAccountSection />
      </div>
    </div>
  );
}

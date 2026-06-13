// app/admin/page.tsx — admin-sivu (server component, roolisuojattu).
// Ohjaa pois muut kuin adminit ENNEN renderöintiä.
import { redirect } from "next/navigation";
import { getAdminUserId } from "@/lib/admin";
import AdminKnowledge from "@/components/admin/AdminKnowledge";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const adminId = await getAdminUserId();
  if (!adminId) redirect("/");

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-1">Admin · RAG-materiaali</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Lisää hyvän hakemuksen materiaalia tietokantaan. Valitse kieli — se ohjaa mihin hakemuksiin materiaali vaikuttaa.
        </p>
        <AdminKnowledge />
      </div>
    </div>
  );
}
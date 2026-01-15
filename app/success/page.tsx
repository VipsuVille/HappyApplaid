import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id;

  if (!sessionId) {
    redirect('/');
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-amber-400" />
        </div>

        <h1 className="text-3xl font-bold text-white mt-6">
          Payment successful! 🎉
        </h1>

        <p className="text-neutral-400 mt-4">
          Your Premium subscription is now active. You can start creating applications immediately.
        </p>

        <Link href="/my-cvs">
          <button className="mt-8 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3 font-semibold hover:from-orange-600 hover:to-amber-700 transition-all">
            Start building your CV
          </button>
        </Link>

        <Link href="/pricing">
          <button className="mt-3 w-full rounded-xl bg-neutral-800 text-neutral-300 py-3 font-semibold hover:bg-neutral-700 transition-all">
            View plan details
          </button>
        </Link>
      </div>
    </main>
  );
}
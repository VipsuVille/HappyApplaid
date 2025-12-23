import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    // 1. min-h-screen varmistaa, että div vie koko näytön korkeuden
    // 2. flex, items-center (pysty) ja justify-center (vaaka) hoitavat keskityksen
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Animated background blobs - pidetään absolute, jotta ne eivät siirrä sisältöä */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-md space-y-8 flex flex-col items-center">
        
        {/* Logo/Title Section */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            HappyApplaid
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Tervetuloa takaisin!
          </p>
        </div>

        {/* Clerk Sign In Component - Tämä keskittyy nyt automaattisesti */}
        <div className="w-full flex justify-center">
          <SignIn />
        </div>

        {/* Footer Text */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Eikö sinulla ole tiliä?{" "}
            <Link href="/sign-up" className="font-medium text-indigo-600 hover:text-indigo-500">
              Rekisteröidy tästä
            </Link>
          </p>
        </div>

        {/* Back to Home Link */}
        <Link 
          href="/" 
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Takaisin etusivulle
        </Link>
      </div>
    </div>
  );
}
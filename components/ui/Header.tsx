'use client'

import { ClerkLoaded, SignUpButton, UserButton, useUser } from "@clerk/nextjs"
import { AuthButtons } from '@/components/ui/AuthButtons'; // Oletan että tämä on oikeassa paikassa

import Link from "next/link";
const glassStyle = "backdrop-blur-md bg-[#ecff821a]/10 border border-white/20 shadow-lg"
function Header({ isLoading }: { isLoading: boolean }) {
    const { user } = useUser();
    if (user) {
    return (

        <header className={`${glassStyle}flex flex-wrap justify-between items-center px-4 py-2 fixed top-0 left-0 w-full bg-gray-100/50  z-50 shadow-md h-[140px] lg:h-16`}>
            {/* Top row */}
            <div className="flex w-full flex-wrap justify-between items-center">
                <Link href="/"
                    className="text-[20px]
                    font-bold bg-gradient-to-r from-green-400 via-red-500 to-pink-500
                    bg-clip-text
                    hover:opacity-50
                    cursor-pointer
                    mx-auto lg:mx-0">
                    Example Shop
                </Link>
               {isLoading && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-green-500 to-blue-500 animate-slide"></div>
            )}
                <div className="flex items-center space-x-4 mt-[8px] lg:mt-0 flex-1 lg:flex-none">
                    <UserButton 
                        afterSignOutUrl="/"
                        appearance={{
                        elements: {
                            avatarBox: "w-10 h-10 rounded-full",
                        }
                        }}
                    />
                    <nav className="space-x-4">
  <Link href="/" className="text-gray-600 hover:text-gray-900">
    Etusivu
  </Link>
  <Link href="/my-cvs" className="text-gray-600 hover:text-gray-900">
    Omat CV:t
  </Link>
</nav>
                    {/* User area */}
                    <ClerkLoaded>
                        {user && (
                               <div>Hi {user.firstName}</div> 
                        )}
                    </ClerkLoaded>
                </div>
            </div>
            
        </header>
    )}
    return (
        <header className={`${glassStyle} w-full h-screen bg-gray-300/50 backdrop-blur-lg flex flex-col justify-start items-center pt-12 px-8 md:h-screen`}>
            <Link href="/"
                className="text-[24px] font-bold bg-gradient-to-r from-yellow-500 via-red-500 to-pink-500 bg-clip-text hover:opacity-50 cursor-pointer mb-12">
                Example Shop
            </Link>
            
            <div className="flex flex-col items-center space-y-6">
                <AuthButtons />
            </div>
            
            {isLoading && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-green-500 to-blue-500 animate-slide"></div>
            )}
        </header>
    )
}

export default Header;
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function AuthButtons() {
  return (
    <div className="flex gap-4 items-center">
      <SignInButton mode="modal">
        <button className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition">
          Kirjaudu sisään
        </button>
      </SignInButton>
      
      <SignUpButton mode="modal">
        <button className="px-4 py-2 rounded-lg border border-blue-500 text-blue-500 hover:bg-blue-50 transition">
          Rekisteröidy
        </button>
      </SignUpButton>
      
      <UserButton 
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: "w-10 h-10 rounded-full",
          }
        }}
      />
    </div>
  );
}

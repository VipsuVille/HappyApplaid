// lib/clerkAppearance.ts
import type { Appearance } from '@clerk/types';

export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: '#f97316', // orange-500
    colorDanger: '#ef4444', // red-500
    colorSuccess: '#10b981', // green-500
    colorWarning: '#f59e0b', // amber-500
    colorTextOnPrimaryBackground: '#ffffff',
    colorBackground: '#000000',
    colorInputBackground: 'rgba(255, 255, 255, 0.05)',
    colorInputText: '#ffffff',
    borderRadius: '0.75rem',
    fontFamily: 'inherit',
  },
  elements: {
    // Root container
    rootBox: 'w-full',
    
    // Main card - Netflix style glassmorphism
    card: `
      bg-black/40 
      backdrop-blur-2xl 
      border 
      border-white/10 
      shadow-2xl 
      shadow-orange-500/10
      rounded-2xl
    `,
    
    // Header
    headerTitle: 'text-white text-2xl font-bold',
    headerSubtitle: 'text-gray-400 text-sm',
    
    // Form elements
    formButtonPrimary: `
      bg-gradient-to-r 
      from-orange-500 
      to-amber-600 
      hover:from-orange-600 
      hover:to-amber-700 
      text-white 
      font-semibold 
      rounded-xl 
      h-12
      shadow-lg
      shadow-orange-500/20
      transition-all
      hover:scale-[1.02]
    `,
    
    formFieldInput: `
      bg-white/5 
      border 
      border-white/10 
      text-white 
      rounded-xl 
      h-12
      focus:border-orange-500/50
      focus:ring-2
      focus:ring-orange-500/20
      placeholder:text-gray-500
      backdrop-blur-md
    `,
    
    formFieldLabel: 'text-gray-300 font-medium text-sm mb-2',
    
    // Social buttons
    socialButtonsBlockButton: `
      bg-white/5 
      border 
      border-white/10 
      text-gray-300 
      hover:bg-white/10 
      rounded-xl 
      h-12
      backdrop-blur-md
      transition-all
    `,
    
    socialButtonsBlockButtonText: 'text-gray-300 font-medium',
    
    // Divider
    dividerLine: 'bg-white/10',
    dividerText: 'text-gray-500 text-xs uppercase tracking-wider',
    
    // Footer
    footerActionLink: `
      text-orange-400 
      hover:text-orange-300 
      font-medium
      transition-colors
    `,
    
    footerActionText: 'text-gray-400',
    
    // Identity preview (email/username display)
    identityPreviewText: 'text-orange-500/70',
    identityPreviewEditButton: 'text-orange-400 hover:text-orange-300',
    
    // Form field error
    formFieldErrorText: 'text-red-400 text-xs mt-1',
        identityPreview: {
      gap: '0.75rem',
    },
    // Alert
    alertText: 'text-gray-300',
    
    // Modal backdrop
    modalBackdrop: 'backdrop-blur-sm bg-black/60',
    
    // Modal content - extra glassmorphism
    modalContent: `
      bg-black/60
      backdrop-blur-3xl
      border
      border-white/10
      rounded-3xl
      shadow-2xl
      shadow-orange-500/10
    `,
    
    // Form container
    form: 'space-y-4',
    
    // OTP input
    formFieldInputShowPasswordButton: 'text-gray-400 hover:text-gray-300',
    
    // Alternative methods
    alternativeMethodsBlockButton: `
      text-gray-400 
      hover:text-gray-300 
      text-sm
      transition-colors
    `,
  },
};

export const clerkPageAppearance: Appearance = {
  ...clerkAppearance,
  elements: {
    ...clerkAppearance.elements,
    // For dedicated pages, remove some modal-specific styles
    card: `
      bg-black/40 
      backdrop-blur-2xl 
      border 
      border-white/10 
      shadow-2xl 
      shadow-orange-500/20
      rounded-3xl
      p-8
      md:p-12
      max-w-md
      w-full
    `,
  },
};
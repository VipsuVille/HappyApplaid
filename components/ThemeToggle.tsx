// components/ThemeToggle.tsx

'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative w-14 h-7 rounded-full transition-all duration-300
        ${isDark 
          ? 'bg-gradient-to-r from-slate-700 to-slate-900' 
          : 'bg-gradient-to-r from-amber-400 to-orange-500'
        }
      `}
      aria-label="Toggle theme"
    >
      {/* Slider */}
      <div
        className={`
          absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300
          flex items-center justify-center
          ${isDark 
            ? 'left-0.5 bg-slate-300' 
            : 'left-7 bg-white'
          }
        `}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-slate-900" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-600" />
        )}
      </div>

      {/* Background Icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5">
        <Moon 
          className={`w-3.5 h-3.5 transition-opacity ${
            isDark ? 'opacity-0' : 'opacity-40 text-white'
          }`} 
        />
        <Sun 
          className={`w-3.5 h-3.5 transition-opacity ${
            isDark ? 'opacity-40 text-slate-400' : 'opacity-0'
          }`} 
        />
      </div>
    </button>
  );
}
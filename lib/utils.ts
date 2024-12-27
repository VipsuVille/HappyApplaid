import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
// lib/langchain/utils.ts
export function determineIndustry(workExperience: string): string {
  // Add logic to determine industry from work experience
  return "technology"; // Placeholder
}

export async function generateBackgroundImage(prompt: string): Promise<string> {
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    body: JSON.stringify({ prompt })
  });
  
  const data = await response.json();
  return data.url;
}
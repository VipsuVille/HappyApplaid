//lib/utils
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fallback-kuva, jos taustakuvan generointi epäonnistuu
export const FALLBACK_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgAB/1h8ZAAAAABJRU5ErkJggg==";

export function determineIndustry(): string {
  // Add logic to determine industry from work experience
  return "technology"; // Placeholder
}

export function validateImagePrompt(prompt: string): boolean {
  const forbiddenWords = ["cv", "resume", "curriculum vitae"];
  const forbiddenPatterns = [/[0-9]{5,}/];

  if (forbiddenWords.some((word) => prompt.toLowerCase().includes(word))) {
    return false;
  }

  if (forbiddenPatterns.some((pattern) => pattern.test(prompt))) {
    return false;
  }

  return true;
}

export function optimizeImagePrompt(prompt: string | undefined): string {
  if (!prompt) return "";

  let optimizedPrompt = prompt.trim().replace(/\s+/g, " ");

  if (optimizedPrompt.length > 900) {
    const sections = optimizedPrompt.split("REQUIREMENTS:");
    let mainPrompt = "";
    let requirements = "";

    if (sections.length > 1) {
      mainPrompt = sections[0].slice(0, 400);
      requirements = sections[1]
        .split(/[.,]\s+/)
        .slice(0, 3)
        .join(". ");
      optimizedPrompt = `${mainPrompt.trim()}. REQUIREMENTS: ${requirements.trim()}.`;
    } else {
      optimizedPrompt = optimizedPrompt.slice(0, 900);
    }
  }

  return optimizedPrompt.slice(0, 1000);
}

export async function prepareHTMLForPDF(html: string): Promise<string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const images = doc.querySelectorAll("img");
  for (const img of Array.from(images)) {
    if (img.src.startsWith("/")) {
      img.src = window.location.origin + img.src;
    }
  }

  return doc.body.innerHTML;
}

export async function fetchImageAsBase64(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;

  try {
    let fullUrl = url;

    if (url.startsWith("/") && !url.startsWith("//")) {
      const baseUrl = window.location.origin;
      fullUrl = `${baseUrl}${url}`;
    }

    try {
      const response = await fetch(fullUrl);

      if (response.ok) {
        const blob = await response.blob();
        return await blobToBase64(blob);
      }
    } catch {
      console.warn("Direct fetch failed, trying image proxy");
    }

    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(fullUrl)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const data = await response.json();
    return data.base64;
  } catch (error) {
    console.error(`Error fetching base64 image:`, error);
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ PAKOTA UUSI BUILD JOKA KERTA
  generateBuildId: async () => {
    return `build-${Date.now()}-${Math.random().toString(36).substring(7)}`
  },

  // ✅ Server Actions: nosta body-raja jotta kuvat (megatavuja) menevät läpi.
  //    Oletus on 1 MB → kuva ylittää → 400 "unexpected response".
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },

  // Kuvien optimointi
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
        pathname: "/private/**",
      },
      {
        protocol: "https",
        hostname: "xgwwnqzbbzpdvgnchpzn.supabase.co",
        pathname: "/storage/v1/**",
      },
    ],
  },

  env: {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
  },
};

export default nextConfig;
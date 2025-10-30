// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WebSocket- ja Webhook-tuki
  // Tämä osa on poistettu, koska se saattoi aiheuttaa ristiriitoja Turbopackin kanssa.
  // webpack: (config) => {
  //   config.externals.push('ws'); // WebSocket-tuki
  //   return config;
  // },

  // Kuvien optimointi
  images: {
    remotePatterns: [
      // DALL-E kuvat
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
        pathname: "/private/**",
      },
      // Supabase kuvat
      {
        protocol: "https",
        hostname: "xgwwnqzbbzpdvgnchpzn.supabase.co",
        pathname: "/storage/v1/**",
      },
    ],
    
  },

  // Ympäristömuuttujat
  env: {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
  },
};

export default nextConfig;

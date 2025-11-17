// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Content Security Policy headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.happyapplaid.com",
              "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.happyapplaid.com https://api.openai.com https://xgwwnqzbbzpdvgnchpzn.supabase.co wss://*.clerk.com",
              "img-src 'self' data: https: blob:",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
            ].join('; '),
          },
        ],
      },
    ];
  },

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
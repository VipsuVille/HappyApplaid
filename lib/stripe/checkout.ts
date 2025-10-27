// lib/stripe/checkout.ts
import { Stripe } from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

/**
 * Hakee Stripe-session sessio ID:n perusteella
 */
export async function getStripeSession(sessionId: string) {
  return await stripe.checkout.sessions.retrieve(sessionId);
}
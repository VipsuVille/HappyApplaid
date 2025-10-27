// lib/stripe.ts
import Stripe from 'stripe';
console.log('Using Stripe Secret Key:', process.env.STRIPE_SECRET_KEY);
console.log('Loaded ENV variables:', process.env);
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia', // Päivitä tämä
  });

// Luo uusi asiakas Stripeen
export async function createStripeCustomer(email: string, name?: string) {
  return await stripe.customers.create({
    email,
    name,
    metadata: { signupDate: new Date().toISOString() },
  });
}

// Luo uusi tilaus
export async function createSubscription(customerId: string, priceId: string) {
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
}

// Tarkista tilauksen tila
export async function getSubscription(subscriptionId: string) {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

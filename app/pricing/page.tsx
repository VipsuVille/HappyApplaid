//app/pricing/page.tsx
import PromoCodeRedeem from '@/components/promoCode';
import { Button } from '@/components/ui/button';
import { PRICING } from '@/lib/pricing';
import { createCheckoutSession, Tier } from '@/lib/stripe/subscriptions';
import { currentUser } from '@clerk/nextjs/server';
import { Link } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function PricingPage() {
  const user = await currentUser();
 
  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Valitse sopiva tilaus</h1>
     <div> <p> onko sinulla etukoodi?</p></div>
           <PromoCodeRedeem />
<Link href="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-indigo-600"
                  >
                    Etusivulle
                  </Button>
                </Link>
      <div className="grid md:grid-cols-2 gap-8">
        {Object.entries(PRICING).map(([tier, details]) => (
          <div key={tier} className="border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">{tier}</h2>
            <p className="text-2xl font-bold mb-4">
              {details.monthly}€/kk
            </p>
           
            <ul className="space-y-2 mb-6">
              {details.features.map((feature) => (
                <li key={feature} className="flex items-center">
                  <span className="mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
           
            <form action={async () => {
              'use server';
              if (!user?.id) return;
              const session = await createCheckoutSession(user.id, tier as Tier);
              if (session.url) {
                redirect(session.url);
              }
            }}>
              <Button type="submit" className="w-full">
                Tilaa nyt
              </Button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
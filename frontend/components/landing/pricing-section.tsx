'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PLANS = [
  {
    name: 'Free',
    price: 0,
    description: 'Try the platform — perfect for an idea or side project.',
    features: ['1 storefront', 'Up to 25 products', 'Basic analytics', 'Community support'],
    cta: 'Start free',
    href: '/register',
    plan: 'free',
    highlight: false,
  },
  {
    name: 'Starter',
    price: 29,
    description: 'For new stores that need real features without the price tag.',
    features: ['Up to 500 products', 'Custom theme', 'Order management', 'Email support'],
    cta: 'Choose Starter',
    href: '/onboarding?plan=starter',
    plan: 'starter',
    highlight: false,
  },
  {
    name: 'Professional',
    price: 99,
    description: 'For growing stores doing real revenue.',
    features: [
      'Unlimited products',
      'Staff & roles (Manager / Operative)',
      'Advanced analytics',
      'Priority support',
      'Connect your own Stripe keys',
    ],
    cta: 'Choose Pro',
    href: '/onboarding?plan=professional',
    plan: 'professional',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 299,
    description: 'For multi-brand operators and large teams.',
    features: [
      'Multiple storefronts',
      'White-label domain',
      'Dedicated success manager',
      'SLA & audit logs',
      'Custom integrations',
    ],
    cta: 'Choose Enterprise',
    href: '/onboarding?plan=enterprise',
    plan: 'enterprise',
    highlight: false,
  },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24" id="pricing" data-testid="pricing-section">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">Simple pricing. Real margins.</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Start free. Upgrade as you grow. Connect your own Stripe account on Pro to keep 100% of
          customer revenue.
        </p>

        <div className="inline-flex items-center gap-3 mt-8 rounded-full border border-slate-700 p-1 bg-slate-900">
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              !annual ? 'bg-sky-500 text-white' : 'text-slate-400'
            }`}
            data-testid="billing-monthly-toggle"
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              annual ? 'bg-sky-500 text-white' : 'text-slate-400'
            }`}
            data-testid="billing-annual-toggle"
          >
            Annual <span className="ml-1 text-[10px] text-emerald-400 font-bold">−20%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {PLANS.map((p) => {
          const monthly = annual ? Math.round(p.price * 0.8) : p.price;
          return (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                p.highlight
                  ? 'bg-gradient-to-b from-sky-500/10 to-slate-900 border-sky-500/40 shadow-lg shadow-sky-500/10'
                  : 'bg-slate-900 border-slate-800'
              }`}
              data-testid={`plan-card-${p.plan}`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-[10px] font-bold tracking-wider px-3 py-1 rounded-full uppercase">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-semibold mb-1">{p.name}</h3>
              <p className="text-xs text-slate-400 min-h-[36px] mb-5">{p.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold tracking-tight">${monthly}</span>
                <span className="text-sm text-slate-400 ml-1">/mo</span>
                {annual && p.price > 0 && (
                  <p className="text-[11px] text-emerald-400 mt-1">
                    billed annually · ${monthly * 12}/yr
                  </p>
                )}
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-slate-300">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={
                  p.highlight
                    ? 'bg-sky-500 hover:bg-sky-400 text-white w-full'
                    : 'bg-slate-800 hover:bg-slate-700 text-white w-full border border-slate-700'
                }
                data-testid={`plan-cta-${p.plan}`}
              >
                <Link href={p.href}>
                  {p.cta} <ArrowRight size={14} className="ml-1.5" />
                </Link>
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-500 mt-8">
        All prices in USD. Cancel anytime. Stores already on the platform? Manage your plan from your
        store admin → Billing.
      </p>
    </section>
  );
}

import Link from 'next/link';
import { ShoppingBag, ArrowRight, Building2, Users, Palette, Shield, BarChart3, Zap } from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: Building2,
      title: 'Multi-Tenant Architecture',
      description: 'Every store is completely isolated. Data never leaks between tenants.',
    },
    {
      icon: Shield,
      title: 'Role-Based Access Control',
      description: 'Super Admin, Store Admin, Manager, and Operative roles with strict permission boundaries.',
    },
    {
      icon: Palette,
      title: 'Dynamic Theme System',
      description: '3 pre-built themes with live preview. Customize colors, fonts, and layout per store.',
    },
    {
      icon: BarChart3,
      title: 'Full Analytics',
      description: 'Revenue tracking, order analytics, and inventory insights for each tenant.',
    },
    {
      icon: Users,
      title: 'Staff Management',
      description: 'Invite team members, assign roles, and control access to sensitive data.',
    },
    {
      icon: Zap,
      title: 'Production Ready',
      description: 'Built with Next.js 14, Supabase RLS, TypeScript, and shadcn/ui.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <ShoppingBag size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold">ShopStack</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 rounded-full px-4 py-1.5 text-sky-400 text-sm font-medium mb-8">
          <Zap size={13} />
          Production-ready multi-tenant SaaS commerce
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight mb-6">
          The commerce platform
          <br />
          <span className="text-sky-400">built for scale</span>
        </h1>

        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          Launch a fully-featured multi-tenant e-commerce platform with RBAC, theme customization,
          and enterprise-grade security out of the box.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-150 hover:shadow-lg hover:shadow-sky-500/25"
          >
            Start for free <ArrowRight size={18} />
          </Link>
          <Link
            href="/techstore"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors border border-slate-700"
          >
            View demo store
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-3">Everything you need, already built</h2>
        <p className="text-slate-400 text-center mb-12">
          Skip months of setup. ShopStack gives you a complete multi-tenant platform on day one.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors"
              >
                <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={20} className="text-sky-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl font-bold mb-6">Demo Accounts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { role: 'Super Admin', href: '/saas', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
              { role: 'Store Admin', href: '/store/techstore/admin', color: 'bg-sky-500/10 border-sky-500/30 text-sky-400' },
              { role: 'Manager', href: '/store/techstore/manager', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
              { role: 'Operative', href: '/store/techstore/operative', color: 'bg-slate-500/10 border-slate-500/30 text-slate-300' },
            ].map((demo) => (
              <Link
                key={demo.role}
                href={demo.href}
                className={`rounded-xl border p-4 text-sm font-medium transition-all hover:scale-[1.02] ${demo.color}`}
              >
                {demo.role}
              </Link>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-6">Sign in first at <Link href="/login" className="text-sky-400">/login</Link></p>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
          <p>ShopStack &mdash; Multi-Tenant SaaS Commerce Platform</p>
        </div>
      </footer>
    </div>
  );
}

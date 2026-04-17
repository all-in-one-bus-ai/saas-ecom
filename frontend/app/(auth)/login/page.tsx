'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, CircleAlert as AlertCircle, ShoppingBag } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirect, setRedirect] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setRedirect(searchParams.get('redirect'));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle() as unknown as { data: { system_role: string | null } | null };

      if (redirect) {
        router.push(redirect);
      } else if (profile?.system_role === 'super_admin') {
        router.push('/saas');
      } else {
        const { data: memberships } = await supabase
          .from('tenant_memberships')
          .select('role, tenants!inner(slug)')
          .eq('user_id', data.user.id)
          .eq('is_active', true)
          .limit(1);

        if (memberships && memberships.length > 0) {
          const m = memberships[0] as unknown as { role: string; tenants: { slug: string } };
          const { slug } = m.tenants;
          if (m.role === 'store_admin') router.push(`/store/${slug}/admin`);
          else if (m.role === 'manager') router.push(`/store/${slug}/manager`);
          else router.push(`/store/${slug}/operative`);
        } else {
          router.push('/onboarding');
        }
      }
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-sky-500 rounded-xl mb-4">
            <ShoppingBag size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-slate-400 mt-1 text-sm">Sign in to your account</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
          {(error || searchParams.get('error')) && (
            <Alert variant="destructive" className="mb-6 bg-red-950/50 border-red-800 text-red-300">
              <AlertCircle size={16} />
              <AlertDescription>{error || 'Access denied. Check your credentials.'}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-sm">Email address</Label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300 text-sm">Password</Label>
                <Link href="/forgot-password" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold transition-all duration-150"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-sky-400 hover:text-sky-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

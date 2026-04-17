'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPlatformUser } from '@/lib/actions/saas-users';
import { UserPlus, ArrowLeft } from 'lucide-react';

export default function NewUserPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createPlatformUser(fd);
      if (res?.error) setError(res.error);
      else router.push('/saas/users');
    });
  }

  return (
    <div className="animate-in max-w-2xl" data-testid="new-user-page">
      <Link href="/saas/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={14} /> Back to users
      </Link>

      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Create user</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Add a new user to the platform</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="rounded-xl border bg-card shadow-sm p-6 space-y-5" data-testid="new-user-form">
        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" required minLength={1} maxLength={100} className="mt-1.5" data-testid="user-fullname-input" />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="mt-1.5" data-testid="user-email-input" />
        </div>

        <div>
          <Label htmlFor="password">Temporary password</Label>
          <Input id="password" name="password" type="password" required minLength={8} className="mt-1.5" data-testid="user-password-input" />
          <p className="text-xs text-muted-foreground mt-1">User can change this after first login. Min 8 characters.</p>
        </div>

        <div>
          <Label htmlFor="system_role">Role</Label>
          <select id="system_role" name="system_role" defaultValue="none" className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="user-role-select">
            <option value="none">Regular user</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700" data-testid="user-form-error">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="bg-sky-600 hover:bg-sky-500 text-white gap-2" data-testid="submit-user">
            <UserPlus size={16} />
            {isPending ? 'Creating…' : 'Create user'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push('/saas/users')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

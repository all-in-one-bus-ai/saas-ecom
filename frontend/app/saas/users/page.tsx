import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth/get-session';
import { listPlatformUsers } from '@/lib/actions/saas-users';
import { UsersTable } from './users-table';
import { Button } from '@/components/ui/button';
import { Plus, Users as UsersIcon } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

export const metadata = { title: 'Platform Users' };
export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  try {
    await requireSuperAdmin();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const res = await listPlatformUsers();
  const users = res.data ?? [];
  const error = res.error;
  const superCount = users.filter((u: any) => u.profile?.system_role === 'super_admin').length;

  return (
    <div className="animate-in" data-testid="saas-users-page">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Platform Users</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {users.length} total · {superCount} super admin{superCount === 1 ? '' : 's'}
          </p>
        </div>
        <Button asChild className="bg-sky-600 hover:bg-sky-500 text-white gap-2">
          <Link href="/saas/users/new">
            <Plus size={16} /> New User
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 mb-4" data-testid="users-error">
          Unable to list users: {error}. Make sure SUPABASE_SERVICE_ROLE_KEY is set correctly.
        </div>
      )}

      {!error && users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No users yet"
          description="Platform users will appear here once someone signs up."
        />
      ) : (
        <UsersTable users={users as any} />
      )}
    </div>
  );
}

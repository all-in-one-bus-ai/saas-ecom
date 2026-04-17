'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Shield, ShieldOff, Trash2, MoreVertical, Search } from 'lucide-react';
import { grantSuperAdmin, revokeSuperAdmin, deletePlatformUser } from '@/lib/actions/saas-users';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  profile: { full_name: string; system_role: 'super_admin' | null } | null;
  memberships: Array<{ tenant_id: string; role: string; tenants: { name: string; slug: string } | null }>;
}

export function UsersTable({ users }: { users: User[] }) {
  const [query, setQuery] = useState('');
  const [, startTransition] = useTransition();

  const filtered = users.filter((u) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.profile?.full_name ?? '').toLowerCase().includes(q)
    );
  });

  function doGrant(id: string) {
    startTransition(async () => { await grantSuperAdmin(id); });
  }
  function doRevoke(id: string) {
    if (!confirm('Revoke super admin access for this user?')) return;
    startTransition(async () => { await revokeSuperAdmin(id); });
  }
  function doDelete(id: string, email: string) {
    if (!confirm(`Permanently delete user ${email}? This cannot be undone.`)) return;
    startTransition(async () => { await deletePlatformUser(id); });
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          data-testid="users-search-input"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm" data-testid="users-table">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stores</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last sign-in</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const isSuper = u.profile?.system_role === 'super_admin';
              return (
                <tr key={u.id} className="data-table-row" data-testid={`user-row-${u.id}`}>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-foreground">{u.profile?.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    {isSuper ? (
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                        <Shield size={11} /> Super Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
                        Member
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs">
                    {u.memberships.length === 0 ? '—' : (
                      <div className="flex flex-wrap gap-1">
                        {u.memberships.slice(0, 3).map((m, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-md bg-sky-50 text-sky-700 px-1.5 py-0.5 text-[10px]">
                            {m.tenants?.slug ?? m.tenant_id.slice(0, 6)}·{m.role.replace('_', ' ')}
                          </span>
                        ))}
                        {u.memberships.length > 3 && <span className="text-muted-foreground">+{u.memberships.length - 3}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs" suppressHydrationWarning>
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" data-testid={`user-actions-${u.id}`}>
                          <MoreVertical size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isSuper ? (
                          <DropdownMenuItem onClick={() => doRevoke(u.id)} className="text-red-600">
                            <ShieldOff size={14} className="mr-2" /> Revoke super admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => doGrant(u.id)}>
                            <Shield size={14} className="mr-2" /> Grant super admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => doDelete(u.id, u.email)}
                          className="text-red-600"
                        >
                          <Trash2 size={14} className="mr-2" /> Delete user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">
                  No users match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

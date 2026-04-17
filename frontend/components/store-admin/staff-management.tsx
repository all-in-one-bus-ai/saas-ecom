'use client';

import { useState } from 'react';
import { UserCog, UserPlus, Trash2, ShieldCheck, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { inviteStaffMember, removeStaffMember, updateStaffRole } from '@/lib/actions/staff';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/lib/rbac/permissions';
import type { UserRole } from '@/lib/types/database';

interface Membership {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  user_profiles: { id: string; full_name: string; avatar_url: string } | null;
}

interface Props {
  memberships: Membership[];
  tenantSlug: string;
  tenantId: string;
  currentUserId: string;
}

const ROLE_ICON: Record<string, React.ReactNode> = {
  store_admin: <ShieldCheck size={14} className="text-amber-500" />,
  manager: <Shield size={14} className="text-sky-500" />,
  operative: <Shield size={14} className="text-slate-400" />,
};

export function StaffManagement({ memberships, tenantSlug, tenantId, currentUserId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await inviteStaffMember(tenantSlug, formData);
    if (result?.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Staff member invited!', description: 'They can now log in with their email.' });
      setOpen(false);
    }
    setLoading(false);
  };

  const handleRemove = async (membershipId: string) => {
    const result = await removeStaffMember(tenantSlug, membershipId);
    if (result?.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Staff member removed' });
    }
  };

  const handleRoleChange = async (membershipId: string, newRole: string) => {
    const result = await updateStaffRole(tenantSlug, membershipId, newRole as 'manager' | 'operative');
    if (result?.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Role updated' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-sky-600 hover:bg-sky-500 text-white gap-2">
              <UserPlus size={16} /> Invite Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Staff Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" name="full_name" placeholder="Jane Smith" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" name="email" type="email" placeholder="jane@example.com" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue="operative">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="operative">Store Operative</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Managers can view analytics and manage orders. Operatives can update order status.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading} className="bg-sky-600 hover:bg-sky-500 text-white">
                  {loading ? 'Inviting...' : 'Send Invite'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Member</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((m) => {
              const initials = m.user_profiles?.full_name
                ?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U';
              const isCurrentUser = m.user_id === currentUserId;

              return (
                <tr key={m.id} className="data-table-row">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-slate-200 text-slate-700 text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {m.user_profiles?.full_name ?? 'Unknown'}
                          {isCurrentUser && (
                            <span className="ml-2 text-[11px] text-sky-600 font-medium">(you)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {m.role === 'store_admin' ? (
                      <div className="flex items-center gap-1.5">
                        {ROLE_ICON[m.role]}
                        <span className="text-sm font-medium text-foreground">{ROLE_LABELS[m.role as UserRole]}</span>
                      </div>
                    ) : (
                      <Select
                        defaultValue={m.role}
                        onValueChange={(val) => handleRoleChange(m.id, val)}
                        disabled={isCurrentUser}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="operative">Store Operative</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={m.is_active ? 'badge-status-active' : 'badge-status-cancelled'}>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end">
                      {!isCurrentUser && m.role !== 'store_admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleRemove(m.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

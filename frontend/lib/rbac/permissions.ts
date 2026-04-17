import type { UserRole } from '@/lib/types/database';

export type Permission =
  | 'tenants:view'
  | 'tenants:create'
  | 'tenants:update'
  | 'tenants:delete'
  | 'tenants:suspend'
  | 'system:settings'
  | 'system:analytics'
  | 'subscriptions:view'
  | 'subscriptions:manage'
  | 'products:view'
  | 'products:create'
  | 'products:update'
  | 'products:delete'
  | 'categories:view'
  | 'categories:create'
  | 'categories:update'
  | 'categories:delete'
  | 'inventory:view'
  | 'inventory:update'
  | 'orders:view'
  | 'orders:create'
  | 'orders:update'
  | 'orders:delete'
  | 'orders:update_status'
  | 'customers:view'
  | 'customers:create'
  | 'customers:update'
  | 'customers:delete'
  | 'staff:view'
  | 'staff:invite'
  | 'staff:update'
  | 'staff:remove'
  | 'discounts:view'
  | 'discounts:create'
  | 'discounts:update'
  | 'discounts:delete'
  | 'store:settings'
  | 'store:billing'
  | 'store:theme'
  | 'analytics:view'
  | 'reports:view';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'tenants:view', 'tenants:create', 'tenants:update', 'tenants:delete', 'tenants:suspend',
    'system:settings', 'system:analytics',
    'subscriptions:view', 'subscriptions:manage',
    'products:view', 'products:create', 'products:update', 'products:delete',
    'categories:view', 'categories:create', 'categories:update', 'categories:delete',
    'inventory:view', 'inventory:update',
    'orders:view', 'orders:create', 'orders:update', 'orders:delete', 'orders:update_status',
    'customers:view', 'customers:create', 'customers:update', 'customers:delete',
    'staff:view', 'staff:invite', 'staff:update', 'staff:remove',
    'discounts:view', 'discounts:create', 'discounts:update', 'discounts:delete',
    'store:settings', 'store:billing', 'store:theme',
    'analytics:view', 'reports:view',
  ],
  store_admin: [
    'products:view', 'products:create', 'products:update', 'products:delete',
    'categories:view', 'categories:create', 'categories:update', 'categories:delete',
    'inventory:view', 'inventory:update',
    'orders:view', 'orders:create', 'orders:update', 'orders:delete', 'orders:update_status',
    'customers:view', 'customers:create', 'customers:update', 'customers:delete',
    'staff:view', 'staff:invite', 'staff:update', 'staff:remove',
    'discounts:view', 'discounts:create', 'discounts:update', 'discounts:delete',
    'store:settings', 'store:billing', 'store:theme',
    'analytics:view', 'reports:view',
    'subscriptions:view',
  ],
  manager: [
    'products:view',
    'categories:view',
    'inventory:view', 'inventory:update',
    'orders:view', 'orders:create', 'orders:update', 'orders:update_status',
    'customers:view', 'customers:create', 'customers:update',
    'staff:view',
    'discounts:view',
    'analytics:view', 'reports:view',
  ],
  operative: [
    'products:view',
    'categories:view',
    'inventory:view', 'inventory:update',
    'orders:view', 'orders:update_status',
    'customers:view',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  store_admin: 'Store Admin',
  manager: 'Manager',
  operative: 'Store Operative',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: 'Full platform access. Manages all tenants and system settings.',
  store_admin: 'Full store management including staff, billing, and theme customization.',
  manager: 'Manages orders, inventory, and customer support. Read-only on products and analytics.',
  operative: 'Updates order statuses and basic inventory. Limited read-only access.',
};

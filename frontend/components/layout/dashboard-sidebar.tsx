'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Settings,
  BarChart3,
  Activity,
  Package,
  ShoppingCart,
  Palette,
  UserPlus,
  Tag,
  Truck,
  UserCog,
  Layers,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';

// Icon map to resolve string names to components
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Settings,
  BarChart3,
  Activity,
  Package,
  ShoppingCart,
  Palette,
  UserPlus,
  Tag,
  Truck,
  UserCog,
  Layers,
  Warehouse,
};

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Changed from LucideIcon to string
  badge?: string | number;
  permission?: string;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

interface DashboardSidebarProps {
  logo: React.ReactNode;
  navGroups: NavGroup[];
  footer?: React.ReactNode;
}

export function DashboardSidebar({ logo, navGroups, footer }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar">
      <div className="flex items-center h-16 px-4 border-b border-slate-800 shrink-0">
        {logo}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6 scrollbar-hide">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            {group.title && (
              <p className="px-3 mb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = iconMap[item.icon] || LayoutDashboard;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'dashboard-sidebar-item',
                        isActive && 'active'
                      )}
                    >
                      <Icon size={16} className="shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="ml-auto text-[11px] font-semibold bg-slate-700 text-slate-300 rounded-full px-2 py-0.5">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {footer && (
        <div className="border-t border-slate-800 p-3 shrink-0">
          {footer}
        </div>
      )}
    </aside>
  );
}

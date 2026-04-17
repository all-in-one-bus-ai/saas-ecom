import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  iconColor?: string;
  iconBg?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  iconColor = 'text-sky-600',
  iconBg = 'bg-sky-50',
}: StatCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-foreground tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
          {trend && (
            <p className={cn('mt-2 text-xs font-medium', isPositive ? 'text-emerald-600' : 'text-red-600')}>
              {isPositive ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ml-3', iconBg)}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
    </div>
  );
}

'use client';

import { Bell, Moon, Sun, Menu, LogOut, User, Settings } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface DashboardHeaderProps {
  title?: string;
  userEmail?: string;
  userName?: string;
  roleBadge?: string;
  actions?: React.ReactNode;
}

export function DashboardHeader({
  title,
  userEmail,
  userName,
  roleBadge,
  actions,
}: DashboardHeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const toggleDark = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail?.[0]?.toUpperCase() ?? 'U';

  return (
    <header className="h-16 border-b bg-background flex items-center gap-4 px-6 shrink-0">
      {title && (
        <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
      )}

      <div className="ml-auto flex items-center gap-2">
        {actions}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDark}
          className="text-muted-foreground hover:text-foreground"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground relative"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-slate-700 text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{userName || 'User'}</span>
                <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
                {roleBadge && (
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-sky-600">
                    {roleBadge}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User size={14} className="mr-2" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings size={14} className="mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
              <LogOut size={14} className="mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

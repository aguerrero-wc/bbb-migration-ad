import { LogOut } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/features/auth/hooks/use-auth';

const navLinks = [
  { to: '/rooms', label: 'Rooms' },
  { to: '/reservations', label: 'Reservations' },
  { to: '/recordings', label: 'Recordings' },
] as const;

export function MainLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="min-h-screen bg-background" data-testid="main-layout">
      <header
        className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        data-testid="main-header"
      >
        <div className="container flex h-14 items-center">
          <div className="mr-8 font-semibold" data-testid="app-name">
            BBB Meeting Management
          </div>
          <nav className="flex items-center gap-6 text-sm" data-testid="main-nav">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'transition-colors hover:text-foreground/80',
                    isActive ? 'text-foreground' : 'text-foreground/60',
                  )
                }
                data-testid={`nav-link-${link.label.toLowerCase()}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          {user && (
            <div className="ml-auto flex items-center gap-4" data-testid="user-section">
              <span className="text-sm text-muted-foreground" data-testid="user-name">
                {user.firstName} {user.lastName}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void logout()}
                data-testid="logout-button"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="container py-6" data-testid="main-content">
        <Outlet />
      </main>
    </div>
  );
}

import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { LogOut, Sun, Moon } from 'lucide-react';

export function AppLayout() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full ${theme === 'dark' ? 'dark' : ''}`}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
              <span className="truncate text-sm sm:text-base tracking-[0.12em] uppercase text-muted-foreground font-bold">
                Customer Relationship Management
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={toggleTheme} title="Ganti tema">
                {theme === 'dark' ? <Sun className="h-4 w-4 text-foreground" /> : <Moon className="h-4 w-4 text-foreground" />}
              </Button>
              <span className="text-sm text-muted-foreground ml-2">{user?.email}</span>
              <Button variant="ghost" size="icon" onClick={signOut} title="Keluar">
                <LogOut className="h-4 w-4 text-foreground" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

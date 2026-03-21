import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { LogOut, Sun, Moon, Languages } from 'lucide-react';

export function AppLayout() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full ${theme === 'dark' ? 'dark' : ''}`}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0 relative">
            <SidebarTrigger />
            <span className="absolute left-1/2 -translate-x-1/2 text-lg tracking-[0.2em] uppercase text-muted-foreground font-bold">CRM</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                title={t('header.toggleLanguage')}
                className="gap-1 text-xs font-medium px-2"
              >
                <Languages className="h-4 w-4" />
                {language === 'id' ? 'EN' : 'ID'}
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleTheme} title={t('header.toggleTheme')}>
                {theme === 'dark' ? <Sun className="h-4 w-4 text-foreground" /> : <Moon className="h-4 w-4 text-foreground" />}
              </Button>
              <span className="text-sm text-muted-foreground ml-2">{user?.email}</span>
              <Button variant="ghost" size="icon" onClick={signOut} title={t('header.logout')}>
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

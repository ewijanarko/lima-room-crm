import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar } from
'@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { LayoutDashboard, Building2, Target, Package, ClipboardList, BarChart3, Users, Calendar, Handshake, Rocket } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import logo from '@/assets/Logo_Lima_Ruang_Baru_Transparent.png';
import type { TranslationKey } from '@/lib/translations';

export function AppSidebar() {
  const { state } = useSidebar();
  const { t } = useLanguage();
  const collapsed = state === 'collapsed';

  const mainNav = [
    { titleKey: 'nav.dashboard' as TranslationKey, url: '/dashboard', icon: LayoutDashboard },
    { titleKey: 'nav.clients' as TranslationKey, url: '/clients', icon: Building2 },
    { titleKey: 'nav.deals' as TranslationKey, url: '/deals', icon: Target },
    { titleKey: 'nav.products' as TranslationKey, url: '/products', icon: Package },
    { titleKey: 'nav.tasks' as TranslationKey, url: '/tasks', icon: ClipboardList },
    { titleKey: 'nav.implementations' as TranslationKey, url: '/implementations', icon: Rocket },
    { titleKey: 'nav.reports' as TranslationKey, url: '/reports', icon: BarChart3 },
  ];

  const secondaryNav = [
    { titleKey: 'nav.meetings' as TranslationKey, url: '/meetings', icon: Calendar },
    { titleKey: 'nav.partners' as TranslationKey, url: '/partners', icon: Handshake },
    { titleKey: 'nav.team' as TranslationKey, url: '/team', icon: Users },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 flex items-center gap-3">
        <img src={logo} alt="Lima Ruang" className="h-32 w-32 shrink-0 object-contain" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.main')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) =>
              <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild>
                    <NavLink
                    to={item.url}
                    className="hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{t(item.titleKey)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.other')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) =>
              <SidebarMenuItem key={item.titleKey}>
                  {item.disabled ? (
                    <SidebarMenuButton disabled className="opacity-40 cursor-not-allowed">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{t(item.titleKey)}</span>}
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{t(item.titleKey)}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>);
}

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { LayoutDashboard, Building2, Target } from 'lucide-react';
import logo from '@/assets/Logo_Lima_Ruang_Baru_Transparent.png';

const mainNav = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Klien', url: '/clients', icon: Building2 },
  { title: 'Deal', url: '/deals', icon: Target },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-4 pt-5 pb-3">
        <div className="flex items-start">
          <img
            src={logo}
            alt="Lima Ruang"
            className={collapsed ? 'h-8 w-8 shrink-0 object-contain' : 'h-[9rem] w-[9rem] shrink-0 object-contain'}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {mainNav.map((item) =>
              <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild size="lg">
                    <NavLink
                    to={item.url}
                    className="rounded-xl px-3 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!collapsed && (
        <SidebarFooter className="p-0">
          <div className="relative h-36 overflow-hidden">
            <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-sidebar-primary/25" />
            <div className="absolute left-6 bottom-2 h-16 w-16 rounded-full bg-sidebar-primary/60" />
            <div className="absolute left-14 top-4 h-20 w-20 rounded-full border-[3px] border-gold/70" />
            <div className="absolute right-10 top-8 h-3 w-3 rotate-12 rounded-sm bg-sidebar-primary/70" />
            <div className="absolute right-16 bottom-10 h-2.5 w-2.5 rotate-45 rounded-sm bg-gold/60" />
            <div className="absolute right-6 bottom-4 h-4 w-4 rounded-full bg-sidebar-accent" />
          </div>
        </SidebarFooter>
      )}
    </Sidebar>);
}

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
import { LayoutDashboard, Building2, Target, Package, ClipboardList, Calendar, Settings } from 'lucide-react';
import logo from '@/assets/Logo_Lima_Ruang_Baru_Transparent.png';

const mainNav = [
{ title: 'Dasbor', url: '/dashboard', icon: LayoutDashboard },
{ title: 'Klien', url: '/clients', icon: Building2 },
{ title: 'Deal', url: '/deals', icon: Target },
{ title: 'Produk', url: '/products', icon: Package },
{ title: 'Tugas', url: '/tasks', icon: ClipboardList }];

const secondaryNav = [
{ title: 'Rapat', url: '#', icon: Calendar, disabled: true },
{ title: 'Pengaturan', url: '#', icon: Settings, disabled: true }];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 flex items-center gap-3">
        <img src={logo} alt="Lima Ruang" className="h-32 w-32 shrink-0 object-contain" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) =>
              <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                    to={item.url}
                    className="hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Segera Hadir</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) =>
              <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton disabled className="opacity-40 cursor-not-allowed">
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>);
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Shield, Search, Crown, UserCheck, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const ROLE_CONFIG: Record<AppRole, { label: string; icon: typeof Crown; variant: 'default' | 'secondary' | 'outline' }> = {
  admin: { label: 'Admin', icon: Crown, variant: 'default' },
  manager: { label: 'Manager', icon: Shield, variant: 'secondary' },
  user: { label: 'User', icon: UserIcon, variant: 'outline' },
};

export default function Team() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      return !!data;
    },
    enabled: !!user?.id,
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['team-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at');
      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ['team-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin,
  });

  const { data: deals } = useQuery({
    queryKey: ['team-deals-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('deals').select('created_by, stage');
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ['team-tasks-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('assigned_to, status');
      if (error) throw error;
      return data;
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // Delete existing role
      const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (deleteError) throw deleteError;
      // Insert new role
      const { error: insertError } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-roles'] });
      toast.success('Peran berhasil diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui peran'),
  });

  const getUserRole = (userId: string): AppRole => {
    const userRole = roles?.find(r => r.user_id === userId);
    return userRole?.role ?? 'user';
  };

  const getUserStats = (userId: string) => {
    const userDeals = deals?.filter(d => d.created_by === userId) ?? [];
    const userTasks = tasks?.filter(t => t.assigned_to === userId) ?? [];
    return {
      totalDeals: userDeals.length,
      wonDeals: userDeals.filter(d => d.stage === 'won').length,
      activeTasks: userTasks.filter(t => t.status !== 'done').length,
      doneTasks: userTasks.filter(t => t.status === 'done').length,
    };
  };

  const filtered = profiles?.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Akses Ditolak</h2>
        <p className="text-muted-foreground">Hanya admin yang dapat mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manajemen Tim</h1>
        <p className="text-muted-foreground">Kelola anggota tim dan peran pengguna</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-3"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{profiles?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Anggota</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-3"><Crown className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{roles?.filter(r => r.role === 'admin').length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Admin</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-3"><UserCheck className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{roles?.filter(r => r.role === 'manager').length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Manager</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari anggota..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Team list */}
      <div className="grid gap-4">
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Memuat...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Tidak ada anggota ditemukan</p>
        ) : (
          filtered.map(profile => {
            const role = getUserRole(profile.user_id);
            const stats = getUserStats(profile.user_id);
            const RoleIcon = ROLE_CONFIG[role].icon;
            const isSelf = profile.user_id === user?.id;

            return (
              <Card key={profile.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{profile.full_name ?? 'Tanpa Nama'}</p>
                      {isSelf && <Badge variant="outline" className="text-xs">Anda</Badge>}
                    </div>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{stats.totalDeals} deal ({stats.wonDeals} won)</span>
                      <span>{stats.activeTasks} tugas aktif</span>
                      <span>{stats.doneTasks} selesai</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={ROLE_CONFIG[role].variant} className="gap-1">
                      <RoleIcon className="h-3 w-3" />
                      {ROLE_CONFIG[role].label}
                    </Badge>

                    {!isSelf && (
                      <Select
                        value={role}
                        onValueChange={(val) => updateRole.mutate({ userId: profile.user_id, newRole: val as AppRole })}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Search, CheckCircle2, Clock, Circle, AlertTriangle, ArrowUp, ArrowDown, Minus, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/format';

const STATUS_LABELS: Record<string, string> = {
  todo: 'Belum Dikerjakan',
  in_progress: 'Sedang Dikerjakan',
  done: 'Selesai',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
};

const STATUS_ICONS: Record<string, typeof Circle> = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
};

const PRIORITY_ICONS: Record<string, typeof Minus> = {
  low: ArrowDown,
  medium: Minus,
  high: ArrowUp,
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  related_client_id: string | null;
  related_deal_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  clients?: { company_name: string } | null;
  deals?: { title: string } | null;
  profiles?: { full_name: string | null } | null;
};

const emptyForm = {
  title: '',
  description: '',
  status: 'todo' as string,
  priority: 'medium' as string,
  due_date: '',
  assigned_to: '',
  related_client_id: '',
  related_deal_id: '',
};

export default function Tasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, clients:related_client_id(company_name), deals:related_deal_id(title)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, company_name').order('company_name');
      return data || [];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['deals-list'],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('id, title').order('title');
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name').order('full_name');
      return data || [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        title: values.title,
        description: values.description || null,
        status: values.status as any,
        priority: values.priority as any,
        due_date: values.due_date || null,
        assigned_to: values.assigned_to || null,
        related_client_id: values.related_client_id || null,
        related_deal_id: values.related_deal_id || null,
        created_by: user?.id,
      };
      if (values.id) {
        const { created_by, ...updatePayload } = payload;
        const { error } = await supabase.from('tasks').update(updatePayload).eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tasks').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(editingTask ? 'Tugas berhasil diperbarui' : 'Tugas berhasil ditambahkan');
      resetForm();
    },
    onError: () => toast.error('Gagal menyimpan tugas'),
  });

  const quickStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('tasks').update({ status: status as any }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  function resetForm() {
    setForm(emptyForm);
    setEditingTask(null);
    setDialogOpen(false);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date || '',
      assigned_to: task.assigned_to || '',
      related_client_id: task.related_client_id || '',
      related_deal_id: task.related_deal_id || '',
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Judul tugas wajib diisi');
    upsertMutation.mutate({ ...form, id: editingTask?.id });
  }

  function cycleStatus(task: Task) {
    const order = ['todo', 'in_progress', 'done'];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    quickStatusMutation.mutate({ id: task.id, status: next });
  }

  const filtered = tasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function priorityVariant(p: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (p === 'high') return 'destructive';
    if (p === 'medium') return 'default';
    return 'secondary';
  }

  function statusVariant(s: string): 'default' | 'secondary' | 'outline' {
    if (s === 'done') return 'default';
    if (s === 'in_progress') return 'secondary';
    return 'outline';
  }

  const isOverdue = (t: Task) => t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Tugas & Aktivitas</h1>
          <p className="text-muted-foreground text-sm">Kelola tugas dan follow-up Anda</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Tambah Tugas</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Judul *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul tugas" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioritas</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tenggat Waktu</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Ditugaskan Kepada</Label>
                <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v === '_none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih anggota tim" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Tidak ada</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || 'Tanpa nama'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Klien Terkait</Label>
                  <Select value={form.related_client_id} onValueChange={(v) => setForm({ ...form, related_client_id: v === '_none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih klien" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Tidak ada</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Deal Terkait</Label>
                  <Select value={form.related_deal_id} onValueChange={(v) => setForm({ ...form, related_deal_id: v === '_none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih deal" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Tidak ada</SelectItem>
                      {deals.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detail tugas..." rows={3} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>Batal</Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari tugas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Prioritas</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Judul</TableHead>
              <TableHead>Prioritas</TableHead>
              <TableHead>Tenggat</TableHead>
              <TableHead>Klien / Deal</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Memuat...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-muted-foreground">Belum ada tugas</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((task) => {
                const StatusIcon = STATUS_ICONS[task.status] || Circle;
                const PriorityIcon = PRIORITY_ICONS[task.priority] || Minus;
                const overdue = isOverdue(task);
                return (
                  <TableRow key={task.id} className="cursor-pointer" onClick={() => openEdit(task)}>
                    <TableCell onClick={(e) => { e.stopPropagation(); cycleStatus(task); }}>
                      <StatusIcon className={`h-5 w-5 cursor-pointer transition-colors ${
                        task.status === 'done' ? 'text-accent' : task.status === 'in_progress' ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={priorityVariant(task.priority)} className="gap-1">
                        <PriorityIcon className="h-3 w-3" />
                        {PRIORITY_LABELS[task.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.due_date ? (
                        <span className={overdue ? 'text-destructive font-medium flex items-center gap-1' : ''}>
                          {overdue && <AlertTriangle className="h-3 w-3" />}
                          {formatDate(task.due_date)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs">
                        {task.clients?.company_name && (
                          <span className="text-muted-foreground">{task.clients.company_name}</span>
                        )}
                        {task.deals?.title && (
                          <span className="text-primary/70">{task.deals.title}</span>
                        )}
                        {!task.clients?.company_name && !task.deals?.title && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(task.status)}>
                        {STATUS_LABELS[task.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { clientStatusPillClass } from '@/lib/format';

type Client = Tables<'clients'>;

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  prospect: 'Prospek',
  inactive: 'Tidak Aktif',
  churned: 'Churned',
};

export default function Clients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });

  const createClient = useMutation({
    mutationFn: async (form: Partial<Client>) => {
      const { error } = await supabase.from('clients').insert({ ...form, created_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setDialogOpen(false);
      toast.success('Client dibuat');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateClient = useMutation({
    mutationFn: async (form: Partial<Client> & { id: string }) => {
      const { id, ...rest } = form;
      const { error } = await supabase.from('clients').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setEditDialogOpen(false);
      setEditingClient(null);
      toast.success('Client diperbarui');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = clients.filter(c => {
    const matchSearch = c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Client</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Tambah Client</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Client Baru</DialogTitle></DialogHeader>
            <ClientForm onSubmit={(data) => createClient.mutate(data)} loading={createClient.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari client..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="prospect">Prospek</SelectItem>
            <SelectItem value="inactive">Tidak Aktif</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Perusahaan</TableHead>
              <TableHead>Industri</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Kota</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-16">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada client ditemukan.</TableCell></TableRow>
            ) : (
              filtered.map(client => (
                <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link to={`/clients/${client.id}`} className="font-medium text-foreground hover:text-primary">
                      {client.company_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.industry || '-'}</TableCell>
                  <TableCell>
                    <Badge className={`border-transparent ${clientStatusPillClass(client.status)}`}>{STATUS_LABELS[client.status] || 'Aktif'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.city || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{client.email || '-'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingClient(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          {editingClient && (
            <ClientForm
              initialData={editingClient}
              onSubmit={(data) => updateClient.mutate({ ...data, id: editingClient.id })}
              loading={updateClient.isPending}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientForm({ onSubmit, loading, initialData, isEdit }: {
  onSubmit: (data: any) => void;
  loading: boolean;
  initialData?: Client;
  isEdit?: boolean;
}) {
  const [form, setForm] = useState({
    company_name: initialData?.company_name || '',
    contact_name: initialData?.contact_name || '',
    industry: initialData?.industry || '',
    status: (initialData?.status || 'prospect') as string,
    city: initialData?.city || '',
    country: initialData?.country || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
  });
  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="space-y-2">
        <Label>Nama Perusahaan</Label>
        <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Nama Kontak</Label>
        <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Industri</Label>
          <Input value={form.industry} onChange={e => set('industry', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="prospect">Prospek</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Tidak Aktif</SelectItem>
              <SelectItem value="churned">Churned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Negara</Label>
          <Input value={form.country} onChange={e => set('country', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Kota</Label>
          <Input value={form.city} onChange={e => set('city', e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Alamat Lengkap</Label>
        <Input value={form.address} onChange={e => set('address', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Telepon</Label>
          <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {isEdit
          ? (loading ? 'Menyimpan...' : 'Simpan Perubahan')
          : (loading ? 'Membuat...' : 'Buat Client')
        }
      </Button>
    </form>
  );
}

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
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-accent text-accent-foreground',
  prospect: 'bg-primary text-primary-foreground',
  inactive: 'bg-muted text-muted-foreground',
  churned: 'bg-destructive text-destructive-foreground',
};

export default function Clients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

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
      toast.success('Client created');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = clients.filter(c => {
    const matchSearch = c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Add Client</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
            <ClientForm onSubmit={(data) => createClient.mutate(data)} loading={createClient.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No clients found</TableCell></TableRow>
            ) : (
              filtered.map(client => (
                <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link to={`/clients/${client.id}`} className="font-medium text-foreground hover:text-primary">
                      {client.company_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.industry || '—'}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[client.status] || ''}>{client.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.city || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{client.email || '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ClientForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ company_name: '', industry: '', status: 'prospect' as const, city: '', email: '', phone: '', address: '' });
  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSubmit(form); }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label>Company Name *</Label>
        <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Industry</Label>
          <Input value={form.industry} onChange={e => set('industry', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>City</Label>
          <Input value={form.city} onChange={e => set('city', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating...' : 'Create Client'}
      </Button>
    </form>
  );
}

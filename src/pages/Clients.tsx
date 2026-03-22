import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
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
import type { TranslationKey } from '@/lib/translations';

type Client = Tables<'clients'>;

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-accent text-accent-foreground',
  prospect: 'bg-primary text-primary-foreground',
  inactive: 'bg-muted text-muted-foreground',
  churned: 'bg-destructive text-destructive-foreground',
};

const STATUS_KEYS: Record<string, TranslationKey> = {
  active: 'status.active',
  prospect: 'status.prospect',
  inactive: 'status.inactive',
  churned: 'status.churned',
};

export default function Clients() {
  const { user } = useAuth();
  const { t } = useLanguage();
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
      toast.success(t('clients.created'));
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
      toast.success(t('clients.updated'));
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
        <h1 className="text-2xl font-bold">{t('clients.title')}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> {t('clients.addClient')}</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{t('clients.newClient')}</DialogTitle></DialogHeader>
            <ClientForm onSubmit={(data) => createClient.mutate(data)} loading={createClient.isPending} t={t} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('clients.search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('clients.allStatus')}</SelectItem>
            <SelectItem value="active">{t('status.active')}</SelectItem>
            <SelectItem value="prospect">{t('status.prospect')}</SelectItem>
            <SelectItem value="inactive">{t('status.inactive')}</SelectItem>
            <SelectItem value="churned">{t('status.churned')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('clients.company')}</TableHead>
              <TableHead>{t('clients.industry')}</TableHead>
              <TableHead>{t('clients.status')}</TableHead>
              <TableHead>{t('clients.city')}</TableHead>
              <TableHead>{t('clients.email')}</TableHead>
              <TableHead className="w-16">{t('clients.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('clients.loading')}</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('clients.notFound')}</TableCell></TableRow>
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
                    <Badge className={STATUS_COLORS[client.status] || ''}>{t(STATUS_KEYS[client.status] || 'status.active')}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.city || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{client.email || '—'}</TableCell>
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
          <DialogHeader><DialogTitle>{t('clients.editClient')}</DialogTitle></DialogHeader>
          {editingClient && (
            <ClientForm
              initialData={editingClient}
              onSubmit={(data) => updateClient.mutate({ ...data, id: editingClient.id })}
              loading={updateClient.isPending}
              t={t}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientForm({ onSubmit, loading, t, initialData, isEdit }: {
  onSubmit: (data: any) => void;
  loading: boolean;
  t: (key: any) => string;
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
        <Label>{t('clients.companyName')}</Label>
        <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>{t('clients.contactName')}</Label>
        <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t('clients.industry')}</Label>
          <Input value={form.industry} onChange={e => set('industry', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t('clients.status')}</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="prospect">{t('status.prospect')}</SelectItem>
              <SelectItem value="active">{t('status.active')}</SelectItem>
              <SelectItem value="inactive">{t('status.inactive')}</SelectItem>
              <SelectItem value="churned">{t('status.churned')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t('clients.country')}</Label>
          <Input value={form.country} onChange={e => set('country', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t('clients.city')}</Label>
          <Input value={form.city} onChange={e => set('city', e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t('clients.fullAddress')}</Label>
        <Input value={form.address} onChange={e => set('address', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t('clients.email')}</Label>
          <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t('clients.phone')}</Label>
          <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {isEdit
          ? (loading ? t('clients.saving') : t('clients.saveChanges'))
          : (loading ? t('clients.creating') : t('clients.createClient'))
        }
      </Button>
    </form>
  );
}

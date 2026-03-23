import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Handshake } from 'lucide-react';
import { toast } from 'sonner';
import { formatIDR } from '@/lib/format';
import type { TranslationKey } from '@/lib/translations';

const TYPE_KEYS: Record<string, TranslationKey> = {
  referral: 'partners.referral', reseller: 'partners.reseller', technology: 'partners.technology',
};

type Partner = {
  id: string; company_name: string; contact_name: string | null; email: string | null;
  phone: string | null; type: string; commission_rate: number | null; is_active: boolean;
  notes: string | null; created_by: string | null; created_at: string;
};

const emptyForm = {
  company_name: '', contact_name: '', email: '', phone: '',
  type: 'referral', commission_rate: 0, is_active: true, notes: '',
};

export default function Partners() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const { data, error } = await supabase.from('partners').select('*').order('company_name');
      if (error) throw error;
      return data as Partner[];
    },
  });

  const { data: partnerDeals = [] } = useQuery({
    queryKey: ['partner-deals'],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('id, title, value, stage, partner_id').not('partner_id', 'is', null);
      return data || [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        company_name: values.company_name, contact_name: values.contact_name || null,
        email: values.email || null, phone: values.phone || null,
        type: values.type as any, commission_rate: values.commission_rate,
        is_active: values.is_active, notes: values.notes || null, created_by: user?.id,
      };
      if (values.id) {
        const { created_by, ...upd } = payload;
        const { error } = await supabase.from('partners').update(upd).eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('partners').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success(editingPartner ? t('partners.updated') : t('partners.added'));
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  function resetForm() { setForm(emptyForm); setEditingPartner(null); setDialogOpen(false); }

  function openEdit(partner: Partner) {
    setEditingPartner(partner);
    setForm({
      company_name: partner.company_name, contact_name: partner.contact_name || '',
      email: partner.email || '', phone: partner.phone || '', type: partner.type,
      commission_rate: partner.commission_rate || 0, is_active: partner.is_active,
      notes: partner.notes || '',
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim()) return toast.error(t('partners.nameRequired'));
    upsertMutation.mutate({ ...form, id: editingPartner?.id });
  }

  const filtered = partners.filter(p => {
    if (filterType !== 'all' && p.type !== filterType) return false;
    if (search && !p.company_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function getPartnerDealCount(partnerId: string) {
    return partnerDeals.filter(d => d.partner_id === partnerId).length;
  }

  function getPartnerDealValue(partnerId: string) {
    return partnerDeals.filter(d => d.partner_id === partnerId).reduce((s, d) => s + (d.value || 0), 0);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('partners.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('partners.subtitle')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={o => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />{t('partners.addPartner')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPartner ? t('partners.editPartner') : t('partners.addNew')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('partners.companyName')} *</Label>
                <Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('partners.contactName')}</Label>
                  <Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('partners.type')}</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_KEYS).map(([k, v]) => <SelectItem key={k} value={k}>{t(v)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t('clients.email')}</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('clients.phone')}</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('partners.commissionRate')}</Label>
                  <Input type="number" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: parseFloat(e.target.value) || 0 })} min={0} max={100} step={0.5} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                  <Label>{form.is_active ? t('products.active') : t('products.inactive')}</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('partners.notes')}</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>{t('tasks.cancel')}</Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? t('tasks.saving') : t('tasks.save')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('partners.search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('partners.allTypes')}</SelectItem>
            {Object.entries(TYPE_KEYS).map(([k, v]) => <SelectItem key={k} value={k}>{t(v)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('partners.companyName')}</TableHead>
              <TableHead>{t('partners.contactName')}</TableHead>
              <TableHead>{t('partners.type')}</TableHead>
              <TableHead>{t('partners.commissionRate')}</TableHead>
              <TableHead>{t('partners.deals')}</TableHead>
              <TableHead>{t('partners.dealValue')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t('tasks.loading')}</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Handshake className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-muted-foreground">{t('partners.noPartners')}</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(p => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => openEdit(p)}>
                  <TableCell className="font-medium">{p.company_name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.contact_name || '—'}</TableCell>
                  <TableCell><Badge variant="secondary">{t(TYPE_KEYS[p.type])}</Badge></TableCell>
                  <TableCell className="font-mono">{p.commission_rate || 0}%</TableCell>
                  <TableCell className="font-mono">{getPartnerDealCount(p.id)}</TableCell>
                  <TableCell className="font-mono">{formatIDR(getPartnerDealValue(p.id))}</TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? 'default' : 'outline'}>{p.is_active ? t('products.active') : t('products.inactive')}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

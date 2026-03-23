import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Search, Rocket, Calendar, Target, Building2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/format';
import type { TranslationKey } from '@/lib/translations';

const STATUS_KEYS: Record<string, TranslationKey> = {
  planning: 'impl.planning', in_progress: 'impl.inProgress', completed: 'impl.completed', on_hold: 'impl.onHold',
};

type Impl = {
  id: string; deal_id: string | null; client_id: string | null; title: string;
  status: string; start_date: string | null; target_date: string | null;
  progress_percent: number; notes: string | null; created_by: string | null;
  clients?: { company_name: string } | null; deals?: { title: string } | null;
};

type Milestone = {
  id: string; implementation_id: string; title: string; status: string;
  due_date: string | null; completed_at: string | null;
};

const emptyForm = {
  title: '', deal_id: '', client_id: '', status: 'planning',
  start_date: '', target_date: '', notes: '',
};

export default function Implementations() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingImpl, setEditingImpl] = useState<Impl | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedImpl, setSelectedImpl] = useState<Impl | null>(null);

  const { data: impls = [], isLoading } = useQuery({
    queryKey: ['implementations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('implementations')
        .select('*, clients:client_id(company_name), deals:deal_id(title)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Impl[];
    },
  });

  const { data: wonDeals = [] } = useQuery({
    queryKey: ['won-deals'],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('id, title, client_id, clients(company_name)').eq('stage', 'won').order('title');
      return data || [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => { const { data } = await supabase.from('clients').select('id, company_name').order('company_name'); return data || []; },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        title: values.title, deal_id: values.deal_id || null, client_id: values.client_id || null,
        status: values.status as any, start_date: values.start_date || null,
        target_date: values.target_date || null, notes: values.notes || null, created_by: user?.id,
      };
      if (values.id) {
        const { created_by, ...upd } = payload;
        const { error } = await supabase.from('implementations').update(upd).eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('implementations').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['implementations'] });
      toast.success(editingImpl ? t('impl.updated') : t('impl.added'));
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  function resetForm() { setForm(emptyForm); setEditingImpl(null); setDialogOpen(false); }

  function openEdit(impl: Impl) {
    setEditingImpl(impl);
    setForm({
      title: impl.title, deal_id: impl.deal_id || '', client_id: impl.client_id || '',
      status: impl.status, start_date: impl.start_date || '', target_date: impl.target_date || '',
      notes: impl.notes || '',
    });
    setDialogOpen(true);
  }

  function handleDealSelect(dealId: string) {
    const deal = wonDeals.find(d => d.id === dealId);
    setForm({
      ...form,
      deal_id: dealId === '_none' ? '' : dealId,
      client_id: deal?.client_id || form.client_id,
      title: form.title || (deal ? `Implementasi - ${deal.title}` : ''),
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error(t('impl.titleRequired'));
    upsertMutation.mutate({ ...form, id: editingImpl?.id });
  }

  const filtered = impls.filter(impl => {
    if (filterStatus !== 'all' && impl.status !== filterStatus) return false;
    if (search && !impl.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function statusVariant(s: string): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (s === 'completed') return 'default';
    if (s === 'in_progress') return 'secondary';
    if (s === 'on_hold') return 'destructive';
    return 'outline';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('impl.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('impl.subtitle')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={o => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />{t('impl.addImpl')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingImpl ? t('impl.editImpl') : t('impl.addNew')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('impl.implTitle')} *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={t('impl.titlePlaceholder')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('impl.relatedDeal')}</Label>
                  <Select value={form.deal_id} onValueChange={handleDealSelect}>
                    <SelectTrigger><SelectValue placeholder={t('impl.selectDeal')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{t('tasks.none')}</SelectItem>
                      {wonDeals.map(d => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('tasks.relatedClient')}</Label>
                  <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v === '_none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder={t('tasks.selectClient')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{t('tasks.none')}</SelectItem>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('common.status')}</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_KEYS).map(([k, v]) => <SelectItem key={k} value={k}>{t(v)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('impl.startDate')}</Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('impl.targetDate')}</Label>
                  <Input type="date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('impl.notes')}</Label>
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
          <Input placeholder={t('impl.search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('tasks.allStatus')}</SelectItem>
            {Object.entries(STATUS_KEYS).map(([k, v]) => <SelectItem key={k} value={k}>{t(v)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t('tasks.loading')}</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Rocket className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-muted-foreground">{t('impl.noImpl')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(impl => (
            <Card key={impl.id} className="bg-card border-border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedImpl(impl)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{impl.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {impl.clients?.company_name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{impl.clients.company_name}</span>}
                    </div>
                  </div>
                  <Badge variant={statusVariant(impl.status)}>{t(STATUS_KEYS[impl.status])}</Badge>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{t('impl.progress')}</span>
                    <span>{impl.progress_percent}%</span>
                  </div>
                  <Progress value={impl.progress_percent} className="h-2" />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {impl.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(impl.start_date)}</span>}
                  {impl.target_date && <span className="flex items-center gap-1"><Target className="h-3 w-3" />{formatDate(impl.target_date)}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedImpl && <ImplSheet impl={selectedImpl} onClose={() => setSelectedImpl(null)} onEdit={() => { openEdit(selectedImpl); setSelectedImpl(null); }} t={t} />}
    </div>
  );
}

function ImplSheet({ impl, onClose, onEdit, t }: { impl: Impl; onClose: () => void; onEdit: () => void; t: (key: any) => string }) {
  const queryClient = useQueryClient();

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', impl.id],
    queryFn: async () => {
      const { data } = await supabase.from('implementation_milestones').select('*').eq('implementation_id', impl.id).order('created_at');
      return (data || []) as Milestone[];
    },
  });

  const [newMilestone, setNewMilestone] = useState('');

  const addMilestone = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from('implementation_milestones').insert({ implementation_id: impl.id, title });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', impl.id] });
      setNewMilestone('');
      recalcProgress();
    },
  });

  const toggleMilestone = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from('implementation_milestones').update({
        status: completed ? 'completed' as any : 'pending' as any,
        completed_at: completed ? new Date().toISOString() : null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', impl.id] });
      setTimeout(recalcProgress, 500);
    },
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('implementation_milestones').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', impl.id] });
      setTimeout(recalcProgress, 500);
    },
  });

  async function recalcProgress() {
    const { data } = await supabase.from('implementation_milestones').select('status').eq('implementation_id', impl.id);
    if (data && data.length > 0) {
      const completed = data.filter(m => m.status === 'completed').length;
      const percent = Math.round((completed / data.length) * 100);
      await supabase.from('implementations').update({ progress_percent: percent }).eq('id', impl.id);
      queryClient.invalidateQueries({ queryKey: ['implementations'] });
    }
  }

  return (
    <Sheet open={!!impl} onOpenChange={() => onClose()}>
      <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{impl.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{t(STATUS_KEYS[impl.status])}</Badge>
            <Button variant="outline" size="sm" onClick={onEdit}>{t('impl.editImpl')}</Button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {impl.clients?.company_name && <div><p className="text-muted-foreground">{t('deals.client')}</p><p className="font-medium">{impl.clients.company_name}</p></div>}
            {impl.deals?.title && <div><p className="text-muted-foreground">{t('impl.relatedDeal')}</p><p className="font-medium">{impl.deals.title}</p></div>}
            {impl.start_date && <div><p className="text-muted-foreground">{t('impl.startDate')}</p><p>{formatDate(impl.start_date)}</p></div>}
            {impl.target_date && <div><p className="text-muted-foreground">{t('impl.targetDate')}</p><p>{formatDate(impl.target_date)}</p></div>}
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">{t('impl.progress')}</span>
              <span>{impl.progress_percent}%</span>
            </div>
            <Progress value={impl.progress_percent} className="h-2" />
          </div>

          {impl.notes && <div className="text-sm"><p className="text-muted-foreground mb-1">{t('impl.notes')}</p><p>{impl.notes}</p></div>}

          <div>
            <h3 className="font-semibold text-sm mb-3">{t('impl.milestones')}</h3>
            <div className="space-y-2">
              {milestones.map(m => (
                <div key={m.id} className="flex items-center gap-2 group">
                  <Checkbox
                    checked={m.status === 'completed'}
                    onCheckedChange={checked => toggleMilestone.mutate({ id: m.id, completed: !!checked })}
                  />
                  <span className={`flex-1 text-sm ${m.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{m.title}</span>
                  {m.due_date && <span className="text-xs text-muted-foreground">{formatDate(m.due_date)}</span>}
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteMilestone.mutate(m.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Input
                placeholder={t('impl.milestonePlaceholder')}
                value={newMilestone}
                onChange={e => setNewMilestone(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newMilestone.trim()) { e.preventDefault(); addMilestone.mutate(newMilestone.trim()); } }}
                className="text-sm"
              />
              <Button size="sm" disabled={!newMilestone.trim()} onClick={() => addMilestone.mutate(newMilestone.trim())}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

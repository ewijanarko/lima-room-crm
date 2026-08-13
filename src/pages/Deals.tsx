import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatIDR, daysSince, daysBetween, formatDate, dealStatusPillClass } from '@/lib/format';
import DealTimeline from '@/components/deals/DealTimeline';

const STATUS_LABELS: Record<string, string> = { open: 'Terbuka', won: 'Menang', lost: 'Kalah' };
const STATUS_FILTERS = ['all', 'open', 'won', 'lost'] as const;
const STATUS_FILTER_LABELS: Record<string, string> = { all: 'Semua', open: 'Terbuka', won: 'Menang', lost: 'Kalah' };

const EVENT_LABELS: Record<string, string> = {
  lead_created: 'Lead Dibuat', meeting: 'Pertemuan', discussion: 'Diskusi',
  proposal_sent: 'Proposal Dikirim', negotiation: 'Negosiasi', document: 'Dokumen',
  note: 'Catatan', won: 'Deal Menang', lost: 'Deal Kalah',
};

export default function Deals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*, clients(company_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['deal-events-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('deal_events')
        .select('deal_id, event_type, event_date')
        .order('event_date', { ascending: true });
      return data || [];
    },
  });

  const latestEventByDeal = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of allEvents) map[e.deal_id] = e.event_type;
    return map;
  }, [allEvents]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, company_name').order('company_name');
      return data || [];
    },
  });

  const createDeal = useMutation({
    mutationFn: async (form: any) => {
      const { data: deal, error } = await supabase
        .from('deals')
        .insert({ title: form.title, client_id: form.client_id, value: form.value, expected_close_date: form.expected_close_date || null, description: form.description || null, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      const { error: eventError } = await supabase.from('deal_events').insert({
        deal_id: deal.id,
        event_type: 'lead_created',
        event_date: new Date().toISOString(),
        created_by: user?.id,
      });
      if (eventError) throw eventError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal-events-all'] });
      setDialogOpen(false);
      toast.success('Deal dibuat');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredDeals = deals.filter(d => statusFilter === 'all' || d.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deal</h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map(s => <SelectItem key={s} value={s}>{STATUS_FILTER_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Deal Baru</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Deal Baru</DialogTitle></DialogHeader>
              <DealForm clients={clients} onSubmit={d => createDeal.mutate(d)} loading={createDeal.isPending} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Judul</th>
              <th className="text-left p-3 font-medium">Client</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Tahap Terakhir</th>
              <th className="text-right p-3 font-medium">Nilai</th>
              <th className="text-right p-3 font-medium">Umur (hari)</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeals.map(deal => (
              <tr key={deal.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedDealId(deal.id)}>
                <td className="p-3 font-medium">{deal.title}</td>
                <td className="p-3 text-muted-foreground">{(deal as any).clients?.company_name}</td>
                <td className="p-3"><Badge className={`border-transparent ${dealStatusPillClass(deal.status)}`}>{STATUS_LABELS[deal.status]}</Badge></td>
                <td className="p-3 text-muted-foreground">{EVENT_LABELS[latestEventByDeal[deal.id]] || '-'}</td>
                <td className="p-3 text-right font-medium">{formatIDR(deal.value || 0)}</td>
                <td className="p-3 text-right text-muted-foreground">
                  {deal.status === 'open' ? daysSince(deal.created_at) : daysBetween(deal.created_at, deal.closed_at || deal.created_at)}
                </td>
              </tr>
            ))}
            {filteredDeals.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Belum ada deal.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DealSheet deal={deals.find(d => d.id === selectedDealId) || null} onClose={() => setSelectedDealId(null)} />
    </div>
  );
}

function DealSheet({ deal, onClose }: { deal: any; onClose: () => void }) {
  if (!deal) return null;

  return (
    <Sheet open={!!deal} onOpenChange={() => onClose()}>
      <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{deal.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge className={`border-transparent ${dealStatusPillClass(deal.status)}`}>{STATUS_LABELS[deal.status]}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Nilai</p>
              <p className="font-medium">{formatIDR(deal.value || 0)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">{deal.clients?.company_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Target Closing</p>
              <p>{deal.expected_close_date ? formatDate(deal.expected_close_date) : '-'}</p>
            </div>
          </div>
          {deal.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{deal.description}</p>}

          <div>
            <h3 className="text-sm font-semibold mb-2">Timeline</h3>
            <DealTimeline dealId={deal.id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DealForm({ clients, onSubmit, loading }: { clients: any[]; onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ title: '', client_id: '', value: 0, expected_close_date: '', description: '' });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
      <div className="space-y-2"><Label>Judul Deal *</Label><Input value={form.title} onChange={e => set('title', e.target.value)} required /></div>
      <div className="space-y-2">
        <Label>Client *</Label>
        <Select value={form.client_id} onValueChange={v => set('client_id', v)}>
          <SelectTrigger><SelectValue placeholder="Pilih client" /></SelectTrigger>
          <SelectContent>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Nilai Perkiraan (Rp)</Label>
          <Input type="number" value={form.value} onChange={e => set('value', parseInt(e.target.value) || 0)} />
        </div>
        <div className="space-y-2">
          <Label>Target Closing</Label>
          <Input type="date" value={form.expected_close_date} onChange={e => set('expected_close_date', e.target.value)} />
        </div>
      </div>
      <div className="space-y-2"><Label>Deskripsi</Label><Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} /></div>
      <Button type="submit" className="w-full" disabled={loading || !form.client_id}>{loading ? 'Membuat...' : 'Buat Deal'}</Button>
    </form>
  );
}

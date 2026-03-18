import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import { formatIDR, daysSince, stageBorderColor, formatDateTime } from '@/lib/format';

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;
const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead', qualified: 'Qualified', proposal: 'Proposal',
  negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
};

export default function Deals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);

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

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, company_name').order('company_name');
      return data || [];
    },
  });

  const createDeal = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from('deals').insert({ ...form, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setDialogOpen(false);
      toast.success('Deal created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from('deals').update({ stage: stage as any, stage_changed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
    onError: (e: any) => toast.error(e.message),
  });

  const handleDragStart = (dealId: string) => setDraggedDealId(dealId);
  const handleDrop = (stage: string) => {
    if (draggedDealId) {
      updateStage.mutate({ id: draggedDealId, stage });
      setDraggedDealId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deals Pipeline</h1>
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded-md">
            <Button variant={view === 'kanban' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('kanban')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('list')}>
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> New Deal</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>New Deal</DialogTitle></DialogHeader>
              <DealForm clients={clients} onSubmit={d => createDeal.mutate(d)} loading={createDeal.isPending} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage);
            const totalValue = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
            return (
              <div
                key={stage}
                className="flex-shrink-0 w-72"
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(stage)}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h3>
                    <Badge variant="secondary" className="text-[10px]">{stageDeals.length}</Badge>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{formatIDR(totalValue)}</span>
                </div>
                <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-muted/30 border border-border/50">
                  {stageDeals.map(deal => (
                    <Card
                      key={deal.id}
                      className={`bg-card border-border border-l-2 ${stageBorderColor(deal.stage)} cursor-pointer hover:bg-muted/50 transition-colors`}
                      draggable
                      onDragStart={() => handleDragStart(deal.id)}
                      onClick={() => setSelectedDeal(deal)}
                    >
                      <CardContent className="p-3">
                        <p className="text-sm font-medium truncate">{deal.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{(deal as any).clients?.company_name}</p>
                        {deal.product && <p className="text-xs text-muted-foreground">{deal.product}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-mono text-xs font-medium">{formatIDR(deal.value || 0)}</span>
                          <span className="text-[10px] text-muted-foreground">{daysSince(deal.stage_changed_at)}d</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Title</th>
                <th className="text-left p-3 font-medium">Client</th>
                <th className="text-left p-3 font-medium">Stage</th>
                <th className="text-right p-3 font-medium">Value</th>
                <th className="text-left p-3 font-medium">Product</th>
                <th className="text-right p-3 font-medium">Days</th>
              </tr>
            </thead>
            <tbody>
              {deals.map(deal => (
                <tr key={deal.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedDeal(deal)}>
                  <td className="p-3 font-medium">{deal.title}</td>
                  <td className="p-3 text-muted-foreground">{(deal as any).clients?.company_name}</td>
                  <td className="p-3"><Badge variant="secondary">{STAGE_LABELS[deal.stage]}</Badge></td>
                  <td className="p-3 text-right font-mono">{formatIDR(deal.value || 0)}</td>
                  <td className="p-3 text-muted-foreground">{deal.product || '—'}</td>
                  <td className="p-3 text-right text-muted-foreground">{daysSince(deal.stage_changed_at)}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DealSheet deal={selectedDeal} onClose={() => setSelectedDeal(null)} onStageChange={(id, stage) => updateStage.mutate({ id, stage })} />
    </div>
  );
}

function DealSheet({ deal, onClose, onStageChange }: { deal: any; onClose: () => void; onStageChange: (id: string, stage: string) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commDialog, setCommDialog] = useState(false);

  const { data: comms = [] } = useQuery({
    queryKey: ['deal-comms', deal?.id],
    queryFn: async () => {
      if (!deal?.id) return [];
      const { data } = await supabase.from('communications').select('*').eq('deal_id', deal.id).order('communication_date', { ascending: false });
      return data || [];
    },
    enabled: !!deal?.id,
  });

  const addComm = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from('communications').insert({ ...form, deal_id: deal.id, client_id: deal.client_id, logged_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-comms', deal.id] });
      setCommDialog(false);
      toast.success('Communication logged');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!deal) return null;

  return (
    <Sheet open={!!deal} onOpenChange={() => onClose()}>
      <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{deal.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={deal.stage} onValueChange={v => onStageChange(deal.id, v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Value</p>
              <p className="font-mono font-medium">{formatIDR(deal.value || 0)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">{deal.clients?.company_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Product</p>
              <p>{deal.product || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Partner Deal</p>
              <p>{deal.is_partner_deal ? 'Yes' : 'No'}</p>
            </div>
          </div>

          <Tabs defaultValue="comms">
            <TabsList className="w-full">
              <TabsTrigger value="comms" className="flex-1">Communications</TabsTrigger>
            </TabsList>
            <TabsContent value="comms" className="space-y-3 mt-3">
              <Dialog open={commDialog} onOpenChange={setCommDialog}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" />Log</Button></DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader><DialogTitle>Log Communication</DialogTitle></DialogHeader>
                  <DealCommForm onSubmit={d => addComm.mutate(d)} loading={addComm.isPending} />
                </DialogContent>
              </Dialog>
              {comms.map((c: any) => (
                <div key={c.id} className="p-3 rounded-md bg-muted/50 text-sm">
                  <p className="font-medium">{c.subject || 'No subject'}</p>
                  {c.summary && <p className="text-xs text-muted-foreground mt-1">{c.summary}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{c.type} · {c.direction} · {formatDateTime(c.communication_date)}</p>
                </div>
              ))}
              {comms.length === 0 && <p className="text-sm text-muted-foreground">No communications yet.</p>}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DealForm({ clients, onSubmit, loading }: { clients: any[]; onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ title: '', client_id: '', stage: 'lead', value: 0, product: '', description: '' });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
      <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => set('title', e.target.value)} required /></div>
      <div className="space-y-2">
        <Label>Client *</Label>
        <Select value={form.client_id} onValueChange={v => set('client_id', v)}>
          <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
          <SelectContent>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Value (IDR)</Label>
          <Input type="number" value={form.value} onChange={e => set('value', parseInt(e.target.value) || 0)} />
        </div>
        <div className="space-y-2">
          <Label>Product</Label>
          <Input value={form.product} onChange={e => set('product', e.target.value)} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading || !form.client_id}>{loading ? 'Creating...' : 'Create Deal'}</Button>
    </form>
  );
}

function DealCommForm({ onSubmit, loading }: { onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ type: 'call' as const, direction: 'outbound' as const, subject: '', summary: '' });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={form.type} onValueChange={v => set('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Direction</Label>
          <Select value={form.direction} onValueChange={v => set('direction', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="outbound">Outbound</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2"><Label>Subject</Label><Input value={form.subject} onChange={e => set('subject', e.target.value)} /></div>
      <div className="space-y-2"><Label>Summary</Label><Input value={form.summary} onChange={e => set('summary', e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Logging...' : 'Log Communication'}</Button>
    </form>
  );
}

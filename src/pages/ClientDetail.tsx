import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, User, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { formatIDR, formatDateTime } from '@/lib/format';
import type { TranslationKey } from '@/lib/translations';

const STATUS_KEYS: Record<string, TranslationKey> = {
  active: 'status.active', prospect: 'status.prospect', inactive: 'status.inactive', churned: 'status.churned',
};

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', id],
    queryFn: async () => {
      const { data } = await supabase.from('contacts').select('*').eq('client_id', id!).order('is_primary', { ascending: false });
      return data || [];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['client-deals', id],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('*').eq('client_id', id!).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: comms = [] } = useQuery({
    queryKey: ['client-comms', id],
    queryFn: async () => {
      const { data } = await supabase.from('communications').select('*').eq('client_id', id!).order('communication_date', { ascending: false });
      return data || [];
    },
  });

  const [contactDialog, setContactDialog] = useState(false);
  const [commDialog, setCommDialog] = useState(false);

  const addContact = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from('contacts').insert({ ...form, client_id: id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts', id] }); setContactDialog(false); toast.success(t('clientDetail.contactAdded')); },
    onError: (e: any) => toast.error(e.message),
  });

  const addComm = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from('communications').insert({ ...form, client_id: id, logged_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client-comms', id] }); setCommDialog(false); toast.success(t('clientDetail.commLogged')); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!client) return <p className="text-muted-foreground">{t('clientDetail.notFound')}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/clients"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{client.company_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge>{t(STATUS_KEYS[client.status] || 'status.active')}</Badge>
            {client.industry && <span className="text-sm text-muted-foreground">{client.industry}</span>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('clientDetail.overview')}</TabsTrigger>
          <TabsTrigger value="contacts">{t('clientDetail.contacts')} ({contacts.length})</TabsTrigger>
          <TabsTrigger value="deals">{t('clientDetail.deals')} ({deals.length})</TabsTrigger>
          <TabsTrigger value="comms">{t('clientDetail.comms')} ({comms.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-base">{t('clientDetail.companyDetails')}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {client.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{client.email}</div>}
                {client.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{client.phone}</div>}
                {client.city && <p className="text-muted-foreground">📍 {client.city}</p>}
                {client.address && <p className="text-muted-foreground">{client.address}</p>}
                {client.website && <a href={client.website} target="_blank" className="text-primary hover:underline">{client.website}</a>}
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-base">{t('clientDetail.quickStats')}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{t('clientDetail.totalDeals')}: <span className="font-mono font-medium">{deals.length}</span></p>
                <p>{t('clientDetail.totalValue')}: <span className="font-mono font-medium">{formatIDR(deals.reduce((s, d) => s + (d.value || 0), 0))}</span></p>
                <p>{t('clientDetail.won')}: <span className="font-mono font-medium">{formatIDR(deals.filter(d => d.stage === 'won').reduce((s, d) => s + (d.value || 0), 0))}</span></p>
                <p>{t('clientDetail.communications')}: <span className="font-mono font-medium">{comms.length}</span></p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4 space-y-4">
          <Dialog open={contactDialog} onOpenChange={setContactDialog}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />{t('clientDetail.addContact')}</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>{t('clientDetail.newContact')}</DialogTitle></DialogHeader>
              <ContactForm onSubmit={d => addContact.mutate(d)} loading={addContact.isPending} t={t} />
            </DialogContent>
          </Dialog>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contacts.map(c => (
              <Card key={c.id} className="bg-card border-border">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{c.name} {c.is_primary && <Badge variant="secondary" className="ml-1 text-[10px]">{t('clientDetail.primary')}</Badge>}</p>
                    {c.position && <p className="text-xs text-muted-foreground">{c.position}</p>}
                    {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {contacts.length === 0 && <p className="text-sm text-muted-foreground col-span-2">{t('clientDetail.noContacts')}</p>}
          </div>
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <div className="space-y-2">
            {deals.map(d => (
              <Link key={d.id} to={`/deals?deal=${d.id}`} className="block">
                <Card className="bg-card border-border hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{d.title}</p>
                      <p className="text-xs text-muted-foreground">{d.product || t('clientDetail.noProduct')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-medium">{formatIDR(d.value || 0)}</p>
                      <Badge variant="secondary" className="text-[10px]">{d.stage}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {deals.length === 0 && <p className="text-sm text-muted-foreground">{t('clientDetail.noDeals')}</p>}
          </div>
        </TabsContent>

        <TabsContent value="comms" className="mt-4 space-y-4">
          <Dialog open={commDialog} onOpenChange={setCommDialog}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />{t('clientDetail.logComm')}</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>{t('clientDetail.logComm')}</DialogTitle></DialogHeader>
              <CommForm onSubmit={d => addComm.mutate(d)} loading={addComm.isPending} t={t} />
            </DialogContent>
          </Dialog>
          <div className="space-y-2">
            {comms.map(c => (
              <div key={c.id} className="flex gap-3 p-3 rounded-md bg-muted/50">
                <span className="text-lg">{({ call: '📞', email: '✉️', meeting: '🤝', whatsapp: '💬', other: '📝' } as any)[c.type] || '📝'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.subject || t('clientDetail.noSubject')}</p>
                  {c.summary && <p className="text-xs text-muted-foreground mt-1">{c.summary}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.direction === 'outbound' ? t('deals.outbound') : t('deals.inbound')} · {formatDateTime(c.communication_date)}
                  </p>
                </div>
              </div>
            ))}
            {comms.length === 0 && <p className="text-sm text-muted-foreground">{t('clientDetail.noComms')}</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContactForm({ onSubmit, loading, t }: { onSubmit: (d: any) => void; loading: boolean; t: (key: any) => string }) {
  const [form, setForm] = useState({ name: '', position: '', email: '', phone: '', is_primary: false });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
      <div className="space-y-2"><Label>{t('clientDetail.name')}</Label><Input value={form.name} onChange={e => set('name', e.target.value)} required /></div>
      <div className="space-y-2"><Label>{t('clientDetail.position')}</Label><Input value={form.position} onChange={e => set('position', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>{t('clients.email')}</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div className="space-y-2"><Label>{t('clients.phone')}</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? t('clientDetail.adding') : t('clientDetail.addContact')}</Button>
    </form>
  );
}

function CommForm({ onSubmit, loading, t }: { onSubmit: (d: any) => void; loading: boolean; t: (key: any) => string }) {
  const [form, setForm] = useState({ type: 'call' as const, direction: 'outbound' as const, subject: '', summary: '' });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t('comm.type')}</Label>
          <Select value={form.type} onValueChange={v => set('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="call">{t('comm.call')}</SelectItem>
              <SelectItem value="email">{t('comm.email')}</SelectItem>
              <SelectItem value="meeting">{t('comm.meeting')}</SelectItem>
              <SelectItem value="whatsapp">{t('comm.whatsapp')}</SelectItem>
              <SelectItem value="other">{t('comm.other')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('comm.direction')}</Label>
          <Select value={form.direction} onValueChange={v => set('direction', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="outbound">{t('comm.outbound')}</SelectItem>
              <SelectItem value="inbound">{t('comm.inbound')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2"><Label>{t('comm.subject')}</Label><Input value={form.subject} onChange={e => set('subject', e.target.value)} /></div>
      <div className="space-y-2"><Label>{t('comm.summary')}</Label><Input value={form.summary} onChange={e => set('summary', e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? t('comm.logging') : t('comm.log')}</Button>
    </form>
  );
}

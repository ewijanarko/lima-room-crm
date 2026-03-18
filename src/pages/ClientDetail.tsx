import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts', id] }); setContactDialog(false); toast.success('Contact added'); },
    onError: (e: any) => toast.error(e.message),
  });

  const addComm = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from('communications').insert({ ...form, client_id: id, logged_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client-comms', id] }); setCommDialog(false); toast.success('Communication logged'); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!client) return <p className="text-muted-foreground">Client not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/clients"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{client.company_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge>{client.status}</Badge>
            {client.industry && <span className="text-sm text-muted-foreground">{client.industry}</span>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
          <TabsTrigger value="comms">Communications ({comms.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-base">Company Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {client.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{client.email}</div>}
                {client.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{client.phone}</div>}
                {client.city && <p className="text-muted-foreground">📍 {client.city}</p>}
                {client.address && <p className="text-muted-foreground">{client.address}</p>}
                {client.website && <a href={client.website} target="_blank" className="text-primary hover:underline">{client.website}</a>}
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-base">Quick Stats</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Total Deals: <span className="font-mono font-medium">{deals.length}</span></p>
                <p>Total Value: <span className="font-mono font-medium">{formatIDR(deals.reduce((s, d) => s + (d.value || 0), 0))}</span></p>
                <p>Won: <span className="font-mono font-medium">{formatIDR(deals.filter(d => d.stage === 'won').reduce((s, d) => s + (d.value || 0), 0))}</span></p>
                <p>Communications: <span className="font-mono font-medium">{comms.length}</span></p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4 space-y-4">
          <Dialog open={contactDialog} onOpenChange={setContactDialog}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Contact</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>New Contact</DialogTitle></DialogHeader>
              <ContactForm onSubmit={d => addContact.mutate(d)} loading={addContact.isPending} />
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
                    <p className="font-medium text-sm">{c.name} {c.is_primary && <Badge variant="secondary" className="ml-1 text-[10px]">Primary</Badge>}</p>
                    {c.position && <p className="text-xs text-muted-foreground">{c.position}</p>}
                    {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {contacts.length === 0 && <p className="text-sm text-muted-foreground col-span-2">No contacts yet.</p>}
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
                      <p className="text-xs text-muted-foreground">{d.product || 'No product'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-medium">{formatIDR(d.value || 0)}</p>
                      <Badge variant="secondary" className="text-[10px]">{d.stage}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {deals.length === 0 && <p className="text-sm text-muted-foreground">No deals yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="comms" className="mt-4 space-y-4">
          <Dialog open={commDialog} onOpenChange={setCommDialog}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Log Communication</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Log Communication</DialogTitle></DialogHeader>
              <CommForm onSubmit={d => addComm.mutate(d)} loading={addComm.isPending} />
            </DialogContent>
          </Dialog>
          <div className="space-y-2">
            {comms.map(c => (
              <div key={c.id} className="flex gap-3 p-3 rounded-md bg-muted/50">
                <span className="text-lg">{({ call: '📞', email: '✉️', meeting: '🤝', whatsapp: '💬', other: '📝' } as any)[c.type] || '📝'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.subject || 'No subject'}</p>
                  {c.summary && <p className="text-xs text-muted-foreground mt-1">{c.summary}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.direction} · {formatDateTime(c.communication_date)}
                  </p>
                </div>
              </div>
            ))}
            {comms.length === 0 && <p className="text-sm text-muted-foreground">No communications logged yet.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContactForm({ onSubmit, loading }: { onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: '', position: '', email: '', phone: '', is_primary: false });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
      <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} required /></div>
      <div className="space-y-2"><Label>Position</Label><Input value={form.position} onChange={e => set('position', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Adding...' : 'Add Contact'}</Button>
    </form>
  );
}

function CommForm({ onSubmit, loading }: { onSubmit: (d: any) => void; loading: boolean }) {
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

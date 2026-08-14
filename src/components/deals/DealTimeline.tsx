import { useState, useRef, useMemo } from 'react';
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
import { Plus, FileText, Download, Trash2, Upload, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime, formatIDR } from '@/lib/format';

const EVENT_TYPES = [
  'lead_created', 'meeting', 'discussion', 'proposal_sent',
  'negotiation', 'document', 'note', 'won', 'lost',
] as const;

const EVENT_LABELS: Record<string, string> = {
  lead_created: 'Lead Dibuat',
  meeting: 'Pertemuan',
  discussion: 'Diskusi',
  proposal_sent: 'Proposal Dikirim',
  negotiation: 'Negosiasi',
  document: 'Dokumen',
  note: 'Catatan',
  won: 'Deal Menang',
  lost: 'Deal Kalah',
};

const EVENT_COLORS: Record<string, string> = {
  lead_created: 'bg-blue-500',
  meeting: 'bg-cyan-500',
  discussion: 'bg-indigo-500',
  proposal_sent: 'bg-violet-500',
  negotiation: 'bg-orange-500',
  document: 'bg-slate-500',
  note: 'bg-gray-400',
  won: 'bg-green-500',
  lost: 'bg-red-500',
};

export default function DealTimeline({ dealId }: { dealId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addDialog, setAddDialog] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['deal-events', dealId],
    queryFn: async () => {
      const { data } = await supabase
        .from('deal_events')
        .select('*')
        .eq('deal_id', dealId)
        .order('event_date', { ascending: false });
      return data || [];
    },
  });

  // Sorted defensively client-side (newest first) regardless of query cache
  // or insertion order, so backdated events always display in true date order.
  const sortedEvents = useMemo(
    () => [...events].sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()),
    [events],
  );

  const { data: eventDocs = [] } = useQuery({
    queryKey: ['deal-event-docs', dealId],
    queryFn: async () => {
      const eventIds = events.map((e: any) => e.id);
      if (eventIds.length === 0) return [];
      const { data } = await supabase
        .from('deal_documents')
        .select('*')
        .in('deal_event_id', eventIds);
      return data || [];
    },
    enabled: events.length > 0,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['deal-events', dealId] });
    queryClient.invalidateQueries({ queryKey: ['deals'] });
    queryClient.invalidateQueries({ queryKey: ['client-deals'] });
  };

  const addEvent = useMutation({
    mutationFn: async (form: { event_type: string; event_date: string; title: string; description: string; amount: string }) => {
      const { error } = await supabase.from('deal_events').insert({
        deal_id: dealId,
        event_type: form.event_type as any,
        event_date: form.event_date,
        title: form.title || null,
        description: form.description || null,
        amount: form.amount ? parseInt(form.amount) : null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      setAddDialog(false);
      toast.success('Peristiwa ditambahkan');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateEvent = useMutation({
    mutationFn: async ({ eventId, description }: { eventId: string; description: string }) => {
      const { error } = await supabase.from('deal_events').update({ description }).eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Peristiwa diperbarui');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from('deal_events').delete().eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['deal-event-docs', dealId] });
      toast.success('Peristiwa dihapus');
    },
  });

  const uploadDoc = useMutation({
    mutationFn: async ({ eventId, file }: { eventId: string; file: File }) => {
      const filePath = `${dealId}/${eventId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('deal-documents').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { error } = await supabase.from('deal_documents').insert({
        deal_event_id: eventId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-event-docs', dealId] });
      toast.success('Dokumen diunggah');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteDoc = useMutation({
    mutationFn: async (doc: any) => {
      await supabase.storage.from('deal-documents').remove([doc.file_path]);
      const { error } = await supabase.from('deal_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-event-docs', dealId] });
      toast.success('Dokumen dihapus');
    },
  });

  const handleDownload = async (doc: any) => {
    const { data } = await supabase.storage.from('deal-documents').createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Dialog open={addDialog} onOpenChange={setAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" />Tambah Peristiwa</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Tambah Peristiwa</DialogTitle></DialogHeader>
            <EventForm onSubmit={d => addEvent.mutate(d)} loading={addEvent.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {sortedEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada peristiwa tercatat.</p>
      ) : (
        <div className="relative ml-3">
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

          {sortedEvents.map((event: any, idx: number) => {
            const docs = eventDocs.filter((d: any) => d.deal_event_id === event.id);
            return (
              <EventCard
                key={event.id}
                event={event}
                docs={docs}
                isLast={idx === sortedEvents.length - 1}
                onDelete={() => deleteEvent.mutate(event.id)}
                onUpdate={(desc) => updateEvent.mutate({ eventId: event.id, description: desc })}
                onUpload={(file) => uploadDoc.mutate({ eventId: event.id, file })}
                onDownload={handleDownload}
                onDeleteDoc={(doc) => deleteDoc.mutate(doc)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, docs, onDelete, onUpdate, onUpload, onDownload, onDeleteDoc }: {
  event: any; docs: any[]; isLast: boolean;
  onDelete: () => void; onUpdate: (desc: string) => void; onUpload: (file: File) => void; onDownload: (doc: any) => void; onDeleteDoc: (doc: any) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(event.description || '');

  const handleSave = () => {
    onUpdate(editDesc);
    setEditing(false);
  };

  return (
    <div className="relative pl-6 pb-4">
      <div className={`absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 border-background ${EVENT_COLORS[event.event_type] || 'bg-muted'}`} />

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{EVENT_LABELS[event.event_type]}</Badge>
              {event.title && <span className="text-sm font-medium">{event.title}</span>}
              <span className="text-xs text-muted-foreground">{formatDateTime(event.event_date)}</span>
              {event.amount != null && <span className="text-xs text-muted-foreground">{formatIDR(event.amount)}</span>}
            </div>
            {editing ? (
              <div className="mt-2 space-y-2">
                <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={4} />
                <div className="flex gap-1">
                  <Button size="sm" onClick={handleSave}>Simpan</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditDesc(event.description || ''); }}>Batal</Button>
                </div>
              </div>
            ) : (
              event.description && (
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{event.description}</p>
              )
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditDesc(event.description || ''); setEditing(true); }}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="mt-2 space-y-1">
          {docs.map((doc: any) => (
            <div key={doc.id} className="flex items-center justify-between gap-2 text-xs bg-background/50 rounded px-2 py-1">
              <div className="flex items-center gap-1 truncate">
                <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{doc.file_name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onDownload(doc)}>
                  <Download className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onDeleteDoc(doc)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <input ref={fileRef} type="file" className="hidden" onChange={e => {
            const file = e.target.files?.[0];
            if (file) { onUpload(file); e.target.value = ''; }
          }} />
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3 w-3 mr-1" />Unggah Dokumen
          </Button>
        </div>
      </div>
    </div>
  );
}

function EventForm({ onSubmit, loading }: { onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    event_type: '', event_date: new Date().toISOString().slice(0, 16),
    title: '', description: '', amount: '',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); if (form.event_type) onSubmit(form); }} className="space-y-3">
      <div className="space-y-2">
        <Label>Jenis Peristiwa *</Label>
        <Select value={form.event_type} onValueChange={v => set('event_type', v)}>
          <SelectTrigger><SelectValue placeholder="Pilih jenis peristiwa" /></SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{EVENT_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Tanggal & Waktu</Label>
        <Input type="datetime-local" value={form.event_date} onChange={e => set('event_date', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Judul (opsional)</Label>
        <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="mis. Meeting kickoff dengan tim procurement" />
      </div>
      <div className="space-y-2">
        <Label>Jumlah / Nilai (opsional, Rp)</Label>
        <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="mis. nilai proposal atau nilai final deal" />
      </div>
      <div className="space-y-2">
        <Label>Catatan</Label>
        <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5} placeholder="Detail pertemuan, hasil diskusi, dsb." />
      </div>
      <Button type="submit" className="w-full" disabled={loading || !form.event_type}>
        {loading ? 'Menambahkan...' : 'Tambah Peristiwa'}
      </Button>
    </form>
  );
}

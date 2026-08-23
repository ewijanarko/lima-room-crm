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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, User, Phone, Mail, Upload, Download, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatIDR, formatDateTime, clientStatusPillClass, dealStatusPillClass } from '@/lib/format';
import { CLIENT_STATUS_LABELS as STATUS_LABELS, LEAD_SOURCE_LABELS } from '@/lib/client';

const DEAL_STATUS_LABELS: Record<string, string> = { open: 'Terbuka', won: 'Menang', lost: 'Kalah' };

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

  const [contactDialog, setContactDialog] = useState(false);

  const addContact = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from('contacts').insert({ ...form, client_id: id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts', id] }); setContactDialog(false); toast.success('Kontak ditambahkan'); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!client) return <p className="text-muted-foreground">Client tidak ditemukan.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/clients"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{client.company_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`border-transparent ${clientStatusPillClass(client.status)}`}>{STATUS_LABELS[client.status] || 'Aktif'}</Badge>
            {client.industry && <span className="text-sm text-muted-foreground">{client.industry}</span>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
          <TabsTrigger value="contacts">Kontak ({contacts.length})</TabsTrigger>
          <TabsTrigger value="deals">Deal ({deals.length})</TabsTrigger>
          <TabsTrigger value="documents">Dokumen</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-base">Detail Perusahaan</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {client.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{client.email}</div>}
                {client.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{client.phone}</div>}
                {client.city && <p className="text-muted-foreground">📍 {client.city}</p>}
                {client.address && <p className="text-muted-foreground">{client.address}</p>}
                {client.website && <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{client.website}</a>}
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-base">Ringkasan Cepat</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  Sumber Lead:{' '}
                  <span className="font-medium">
                    {client.lead_source ? LEAD_SOURCE_LABELS[client.lead_source] : 'Belum diisi'}
                  </span>
                  {client.lead_source_detail && (
                    <span className="text-muted-foreground"> ({client.lead_source_detail})</span>
                  )}
                </p>
                <p>Total Deal: <span className="font-medium">{deals.length}</span></p>
                <p>Total Nilai: <span className="font-medium">{formatIDR(deals.reduce((s, d) => s + (d.value || 0), 0))}</span></p>
                <p>Menang: <span className="font-medium">{formatIDR(deals.filter(d => d.status === 'won').reduce((s, d) => s + (d.value || 0), 0))}</span></p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border md:col-span-2">
              <CardHeader><CardTitle className="text-base">Catatan</CardTitle></CardHeader>
              <CardContent className="text-sm">
                {client.notes ? (
                  <p className="whitespace-pre-line text-muted-foreground">{client.notes}</p>
                ) : (
                  <p className="text-muted-foreground">Belum ada catatan. Tambahkan lewat tombol edit di halaman daftar Client.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4 space-y-4">
          <Dialog open={contactDialog} onOpenChange={setContactDialog}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Tambah Kontak</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Kontak Baru</DialogTitle></DialogHeader>
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
                    <p className="font-medium text-sm">{c.name} {c.is_primary && <Badge variant="secondary" className="ml-1 text-[10px]">Utama</Badge>}</p>
                    {c.position && <p className="text-xs text-muted-foreground">{c.position}</p>}
                    {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {contacts.length === 0 && <p className="text-sm text-muted-foreground col-span-2">Belum ada kontak.</p>}
          </div>
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <div className="space-y-2">
            {deals.map(d => (
              <Link key={d.id} to="/deals" className="block">
                <Card className="bg-card border-border hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{d.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatIDR(d.value || 0)}</p>
                      <Badge className={`border-transparent text-[10px] ${dealStatusPillClass(d.status)}`}>{DEAL_STATUS_LABELS[d.status]}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {deals.length === 0 && <p className="text-sm text-muted-foreground">Belum ada deal.</p>}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab clientId={id!} user={user} />
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
      <div className="space-y-2"><Label>Nama</Label><Input value={form.name} onChange={e => set('name', e.target.value)} required /></div>
      <div className="space-y-2"><Label>Jabatan</Label><Input value={form.position} onChange={e => set('position', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div className="space-y-2"><Label>Telepon</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Menambahkan...' : 'Tambah Kontak'}</Button>
    </form>
  );
}

function DocumentsTab({ clientId, user }: { clientId: string; user: any }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: documents = [] } = useQuery({
    queryKey: ['client-documents', clientId],
    queryFn: async () => {
      const { data } = await supabase.from('client_documents').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
      return data || [];
    },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 10MB');
      return;
    }
    setUploading(true);
    try {
      const filePath = `${clientId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('client-documents').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from('client_documents').insert({
        client_id: clientId, file_name: file.name, file_path: filePath,
        file_size: file.size, mime_type: file.type, uploaded_by: user?.id,
      });
      if (dbError) throw dbError;
      queryClient.invalidateQueries({ queryKey: ['client-documents', clientId] });
      toast.success('Dokumen diunggah');
    } catch (err: any) {
      toast.error(err.message || 'Unggah gagal');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDownload(doc: any) {
    const { data } = await supabase.storage.from('client-documents').createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  const deleteMutation = useMutation({
    mutationFn: async (doc: any) => {
      await supabase.storage.from('client-documents').remove([doc.file_path]);
      const { error } = await supabase.from('client_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-documents', clientId] });
      toast.success('Dokumen dihapus');
    },
    onError: (e: any) => toast.error(e.message),
  });

  function formatFileSize(bytes: number | null) {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label>
          <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" disabled={uploading} />
          <Button asChild size="sm" disabled={uploading}>
            <span><Upload className="h-4 w-4 mr-1" />{uploading ? 'Mengunggah...' : 'Unggah Dokumen'}</span>
          </Button>
        </label>
        <span className="text-xs text-muted-foreground">Maks 10MB</span>
      </div>
      <div className="space-y-2">
        {documents.map((doc: any) => (
          <div key={doc.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/50 group">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.file_name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)} · {formatDateTime(doc.created_at)}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => deleteMutation.mutate(doc)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {documents.length === 0 && <p className="text-sm text-muted-foreground">Belum ada dokumen.</p>}
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
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
import { Plus, FileText, Download, Trash2, Upload, Circle, CheckCircle2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/format';
import type { TranslationKey } from '@/lib/translations';

const PHASES = [
  'lead_creation', 'discovery', 'proposal', 'pitching',
  'won_deal', 'planning', 'kickoff', 'implementation', 'go_live',
] as const;

const PHASE_KEYS: Record<string, TranslationKey> = {
  lead_creation: 'phase.lead_creation',
  discovery: 'phase.discovery',
  proposal: 'phase.proposal',
  pitching: 'phase.pitching',
  won_deal: 'phase.won_deal',
  planning: 'phase.planning',
  kickoff: 'phase.kickoff',
  implementation: 'phase.implementation',
  go_live: 'phase.go_live',
};

const PHASE_COLORS: Record<string, string> = {
  lead_creation: 'bg-blue-500',
  discovery: 'bg-cyan-500',
  proposal: 'bg-indigo-500',
  pitching: 'bg-violet-500',
  won_deal: 'bg-green-500',
  planning: 'bg-yellow-500',
  kickoff: 'bg-orange-500',
  implementation: 'bg-rose-500',
  go_live: 'bg-emerald-500',
};

export default function DealPhaseTimeline({ dealId, t }: { dealId: string; t: (key: any) => string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addDialog, setAddDialog] = useState(false);

  const { data: phases = [] } = useQuery({
    queryKey: ['deal-phases', dealId],
    queryFn: async () => {
      const { data } = await supabase
        .from('deal_phases')
        .select('*')
        .eq('deal_id', dealId)
        .order('phase_date', { ascending: true });
      return data || [];
    },
  });

  const { data: phaseDocs = [] } = useQuery({
    queryKey: ['deal-phase-docs', dealId],
    queryFn: async () => {
      const phaseIds = phases.map((p: any) => p.id);
      if (phaseIds.length === 0) return [];
      const { data } = await supabase
        .from('deal_phase_documents')
        .select('*')
        .in('deal_phase_id', phaseIds);
      return data || [];
    },
    enabled: phases.length > 0,
  });

  const addPhase = useMutation({
    mutationFn: async (form: { phase: string; phase_date: string; description: string }) => {
      const { error } = await supabase.from('deal_phases').insert({
        deal_id: dealId,
        phase: form.phase as any,
        phase_date: form.phase_date,
        description: form.description,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-phases', dealId] });
      setAddDialog(false);
      toast.success(t('phases.added'));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePhase = useMutation({
    mutationFn: async ({ phaseId, description }: { phaseId: string; description: string }) => {
      const { error } = await supabase.from('deal_phases').update({ description }).eq('id', phaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-phases', dealId] });
      toast.success(t('phases.updated'));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePhase = useMutation({
    mutationFn: async (phaseId: string) => {
      const { error } = await supabase.from('deal_phases').delete().eq('id', phaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-phases', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deal-phase-docs', dealId] });
      toast.success(t('phases.deleted'));
    },
  });

  const uploadDoc = useMutation({
    mutationFn: async ({ phaseId, file }: { phaseId: string; file: File }) => {
      const filePath = `${dealId}/${phaseId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('deal-documents').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { error } = await supabase.from('deal_phase_documents').insert({
        deal_phase_id: phaseId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-phase-docs', dealId] });
      toast.success(t('phases.docUploaded'));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteDoc = useMutation({
    mutationFn: async (doc: any) => {
      await supabase.storage.from('deal-documents').remove([doc.file_path]);
      const { error } = await supabase.from('deal_phase_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-phase-docs', dealId] });
      toast.success(t('phases.docDeleted'));
    },
  });

  const handleDownload = async (doc: any) => {
    const { data } = await supabase.storage.from('deal-documents').createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  // Determine which phases are completed (have entries)
  const completedPhases = new Set(phases.map((p: any) => p.phase));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {/* Phase progress indicators */}
        <div className="flex items-center gap-1 flex-wrap">
          {PHASES.map((p) => (
            <div key={p} className="flex items-center gap-1" title={t(PHASE_KEYS[p])}>
              {completedPhases.has(p) ? (
                <CheckCircle2 className={`h-4 w-4 text-green-500`} />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40" />
              )}
              <span className="text-[10px] text-muted-foreground hidden sm:inline">{t(PHASE_KEYS[p])}</span>
            </div>
          ))}
        </div>
        <Dialog open={addDialog} onOpenChange={setAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" />{t('phases.addPhase')}</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{t('phases.addPhaseTitle')}</DialogTitle></DialogHeader>
            <PhaseForm onSubmit={d => addPhase.mutate(d)} loading={addPhase.isPending} t={t} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Vertical timeline */}
      {phases.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('phases.noPhases')}</p>
      ) : (
        <div className="relative ml-3">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

          {phases.map((phase: any, idx: number) => {
            const docs = phaseDocs.filter((d: any) => d.deal_phase_id === phase.id);
            return (
              <PhaseCard
                key={phase.id}
                phase={phase}
                docs={docs}
                isLast={idx === phases.length - 1}
                t={t}
                onDelete={() => deletePhase.mutate(phase.id)}
                onUpdate={(desc) => updatePhase.mutate({ phaseId: phase.id, description: desc })}
                onUpload={(file) => uploadDoc.mutate({ phaseId: phase.id, file })}
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

function PhaseCard({ phase, docs, isLast, t, onDelete, onUpdate, onUpload, onDownload, onDeleteDoc }: {
  phase: any; docs: any[]; isLast: boolean; t: (key: any) => string;
  onDelete: () => void; onUpdate: (desc: string) => void; onUpload: (file: File) => void; onDownload: (doc: any) => void; onDeleteDoc: (doc: any) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(phase.description || '');

  const handleSave = () => {
    onUpdate(editDesc);
    setEditing(false);
  };

  return (
    <div className="relative pl-6 pb-4">
      {/* Dot */}
      <div className={`absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 border-background ${PHASE_COLORS[phase.phase] || 'bg-muted'}`} />

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{t(PHASE_KEYS[phase.phase])}</Badge>
              <span className="text-xs text-muted-foreground">{formatDate(phase.phase_date)}</span>
            </div>
            {editing ? (
              <div className="mt-2 space-y-2">
                <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={4} />
                <div className="flex gap-1">
                  <Button size="sm" onClick={handleSave}>{t('phases.save')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditDesc(phase.description || ''); }}>{t('phases.cancel')}</Button>
                </div>
              </div>
            ) : (
              phase.description && (
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{phase.description}</p>
              )
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditDesc(phase.description || ''); setEditing(true); }}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Documents */}
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
            <Upload className="h-3 w-3 mr-1" />{t('phases.uploadFiles')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PhaseForm({ onSubmit, loading, t }: { onSubmit: (d: any) => void; loading: boolean; t: (key: any) => string }) {
  const [form, setForm] = useState({ phase: '', phase_date: new Date().toISOString().slice(0, 10), description: '' });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); if (form.phase) onSubmit(form); }} className="space-y-3">
      <div className="space-y-2">
        <Label>{t('phases.phase')} *</Label>
        <Select value={form.phase} onValueChange={v => set('phase', v)}>
          <SelectTrigger><SelectValue placeholder={t('phases.selectPhase')} /></SelectTrigger>
          <SelectContent>
            {PHASES.map(p => <SelectItem key={p} value={p}>{t(PHASE_KEYS[p])}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t('phases.date')}</Label>
        <Input type="date" value={form.phase_date} onChange={e => set('phase_date', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>{t('phases.description')}</Label>
        <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5} placeholder={t('phases.descriptionPlaceholder')} />
      </div>
      <Button type="submit" className="w-full" disabled={loading || !form.phase}>
        {loading ? t('phases.adding') : t('phases.addEntry')}
      </Button>
    </form>
  );
}

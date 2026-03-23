import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Calendar, Plus, Clock, MapPin, Building2, Target, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { formatDateTime } from '@/lib/format';

type Meeting = {
  id: string; title: string; description: string | null; meeting_date: string;
  duration_minutes: number; location: string | null; related_client_id: string | null;
  related_deal_id: string | null; created_by: string | null; created_at: string;
  clients?: { company_name: string } | null; deals?: { title: string } | null;
};

const emptyForm = {
  title: '', description: '', meeting_date: '', duration_minutes: 60,
  location: '', related_client_id: '', related_deal_id: '',
};

export default function Meetings() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*, clients:related_client_id(company_name), deals:related_deal_id(title)')
        .order('meeting_date', { ascending: true });
      if (error) throw error;
      return data as Meeting[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => { const { data } = await supabase.from('clients').select('id, company_name').order('company_name'); return data || []; },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['deals-list'],
    queryFn: async () => { const { data } = await supabase.from('deals').select('id, title').order('title'); return data || []; },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        title: values.title, description: values.description || null,
        meeting_date: values.meeting_date, duration_minutes: values.duration_minutes,
        location: values.location || null, related_client_id: values.related_client_id || null,
        related_deal_id: values.related_deal_id || null, created_by: user?.id,
      };
      if (values.id) {
        const { created_by, ...upd } = payload;
        const { error } = await supabase.from('meetings').update(upd).eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('meetings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success(editingMeeting ? t('meetings.updated') : t('meetings.added'));
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meetings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success(t('meetings.deleted'));
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  function resetForm() { setForm(emptyForm); setEditingMeeting(null); setDialogOpen(false); }

  function openEdit(meeting: Meeting) {
    setEditingMeeting(meeting);
    setForm({
      title: meeting.title, description: meeting.description || '',
      meeting_date: meeting.meeting_date.slice(0, 16),
      duration_minutes: meeting.duration_minutes, location: meeting.location || '',
      related_client_id: meeting.related_client_id || '', related_deal_id: meeting.related_deal_id || '',
    });
    setDialogOpen(true);
  }

  function openNewOnDate(date: Date) {
    resetForm();
    const dateStr = format(date, "yyyy-MM-dd'T'09:00");
    setForm({ ...emptyForm, meeting_date: dateStr });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error(t('meetings.titleRequired'));
    if (!form.meeting_date) return toast.error(t('meetings.dateRequired'));
    upsertMutation.mutate({ ...form, id: editingMeeting?.id });
  }

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = monthStart.getDay(); // 0=Sun

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function getMeetingsForDay(day: Date) {
    return meetings.filter(m => isSameDay(new Date(m.meeting_date), day));
  }

  const upcoming = meetings.filter(m => new Date(m.meeting_date) >= new Date()).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('meetings.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('meetings.subtitle')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />{t('meetings.addMeeting')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingMeeting ? t('meetings.editMeeting') : t('meetings.addNew')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('meetings.meetingTitle')} *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={t('meetings.titlePlaceholder')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('meetings.dateTime')} *</Label>
                  <Input type="datetime-local" value={form.meeting_date} onChange={e => setForm({ ...form, meeting_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('meetings.duration')}</Label>
                  <Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })} min={15} step={15} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('meetings.location')}</Label>
                <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder={t('meetings.locationPlaceholder')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('tasks.relatedClient')}</Label>
                  <Select value={form.related_client_id} onValueChange={v => setForm({ ...form, related_client_id: v === '_none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder={t('tasks.selectClient')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{t('tasks.none')}</SelectItem>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('tasks.relatedDeal')}</Label>
                  <Select value={form.related_deal_id} onValueChange={v => setForm({ ...form, related_deal_id: v === '_none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder={t('tasks.selectDeal')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{t('tasks.none')}</SelectItem>
                      {deals.map(d => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('meetings.descriptionLabel')}</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('meetings.descriptionPlaceholder')} rows={3} />
              </div>
              <DialogFooter className="gap-2">
                {editingMeeting && (
                  <Button type="button" variant="destructive" size="sm" onClick={() => deleteMutation.mutate(editingMeeting.id)}>
                    <Trash2 className="h-4 w-4 mr-1" />{t('meetings.delete')}
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={resetForm}>{t('tasks.cancel')}</Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? t('tasks.saving') : t('tasks.save')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar Grid */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} className="min-h-[80px]" />
            ))}
            {daysInMonth.map(day => {
              const dayMeetings = getMeetingsForDay(day);
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] p-1 border border-border/50 rounded-sm cursor-pointer hover:bg-muted/50 transition-colors ${today ? 'bg-primary/10 border-primary/30' : ''}`}
                  onClick={() => openNewOnDate(day)}
                >
                  <span className={`text-xs font-medium ${today ? 'text-primary' : 'text-foreground'}`}>{format(day, 'd')}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayMeetings.slice(0, 3).map(m => (
                      <div
                        key={m.id}
                        className="text-[10px] truncate bg-primary/20 text-primary rounded px-1 py-0.5 cursor-pointer"
                        onClick={e => { e.stopPropagation(); openEdit(m); }}
                      >
                        {format(new Date(m.meeting_date), 'HH:mm')} {m.title}
                      </div>
                    ))}
                    {dayMeetings.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{dayMeetings.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming list */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t('meetings.upcoming')}</h2>
        <div className="space-y-2">
          {upcoming.map(m => (
            <Card key={m.id} className="bg-card border-border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openEdit(m)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDateTime(m.meeting_date)} ({m.duration_minutes}{t('meetings.min')})</span>
                    {m.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                  {m.clients?.company_name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{m.clients.company_name}</span>}
                  {m.deals?.title && <span className="flex items-center gap-1"><Target className="h-3 w-3" />{m.deals.title}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
          {upcoming.length === 0 && !isLoading && <p className="text-sm text-muted-foreground">{t('meetings.noMeetings')}</p>}
        </div>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatIDR, formatDate, daysBetween } from '@/lib/format';
import { Target, TrendingUp, DollarSign, Percent } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const EVENT_LABELS: Record<string, string> = {
  lead_created: 'Lead Dibuat', meeting: 'Pertemuan', discussion: 'Diskusi',
  proposal_sent: 'Proposal Dikirim', negotiation: 'Negosiasi', document: 'Dokumen',
  note: 'Catatan', won: 'Deal Menang', lost: 'Deal Kalah',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');
}

export default function Dashboard() {
  const { data: deals = [] } = useQuery({
    queryKey: ['deals-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('deals')
        .select('id, status, value, created_at, closed_at, client_id, clients(company_name)');
      return data || [];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ['deal-events-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('deal_events')
        .select('deal_id, event_type, event_date')
        .order('event_date', { ascending: true });
      return data || [];
    },
  });

  const openDeals = deals.filter(d => d.status === 'open');
  const wonDeals = deals.filter(d => d.status === 'won');
  const lostDeals = deals.filter(d => d.status === 'lost');

  const pipelineValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const winRate = wonDeals.length + lostDeals.length > 0
    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
    : 0;

  const wonDurations = wonDeals.map(d => daysBetween(d.created_at, d.closed_at || d.created_at));
  const avgDuration = wonDurations.length > 0
    ? Math.round(wonDurations.reduce((s, d) => s + d, 0) / wonDurations.length)
    : 0;

  const kpis = [
    { label: 'Revenue Menang', value: formatIDR(wonValue), icon: DollarSign },
    { label: 'Nilai Pipeline', value: formatIDR(pipelineValue), icon: TrendingUp },
    { label: 'Rata-rata Durasi Lead → Deal', value: `${avgDuration} hari`, icon: Target },
    { label: 'Win Rate', value: `${winRate}%`, icon: Percent },
  ];

  const latestEventByDeal = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of events) map[e.deal_id] = e.event_type;
    return map;
  }, [events]);

  const funnelData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of openDeals) {
      const stage = latestEventByDeal[d.id] || 'lead_created';
      counts[stage] = (counts[stage] || 0) + 1;
    }
    return Object.entries(counts).map(([stage, count]) => ({
      name: EVENT_LABELS[stage] || stage,
      count,
    }));
  }, [openDeals, latestEventByDeal]);

  const monthlyTrend = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of wonDeals) {
      if (!d.closed_at) continue;
      const key = new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' }).format(new Date(d.closed_at));
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [wonDeals]);

  const wonTable = [...wonDeals]
    .sort((a, b) => new Date(b.closed_at || b.created_at).getTime() - new Date(a.closed_at || a.created_at).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <kpi.icon className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <p className="text-xl font-bold mt-3">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deal Menang per Bulan</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyTrend} margin={{ left: 0, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="wonGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ background: 'hsl(var(--sidebar-background))', border: 'none', borderRadius: 12, color: 'hsl(0 0% 100%)', padding: '8px 12px' }}
                    labelStyle={{ color: 'hsl(0 0% 100% / 0.7)', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--accent))" strokeWidth={2.5} fill="url(#wonGradient)" dot={{ r: 4, fill: 'hsl(var(--accent))', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada deal yang menang.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deal Terbuka per Tahap</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={110} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ background: 'hsl(var(--sidebar-background))', border: 'none', borderRadius: 12, color: 'hsl(0 0% 100%)', padding: '8px 12px' }}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="hsl(var(--primary))" barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada deal terbuka.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deal Menang Terbaru - Durasi Lead ke Deal</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {wonTable.length > 0 ? (
            <div className="divide-y divide-border">
              {wonTable.map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 px-3 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(d.clients?.company_name || '?')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{d.clients?.company_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Lead {formatDate(d.created_at)} · Menang {d.closed_at ? formatDate(d.closed_at) : '-'} · {daysBetween(d.created_at, d.closed_at || d.created_at)} hari
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">{formatIDR(d.value || 0)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">Belum ada deal yang menang.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

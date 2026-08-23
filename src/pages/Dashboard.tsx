import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatIDR, formatDate, daysBetween } from '@/lib/format';
import { Target, TrendingUp, DollarSign, Percent, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function monthKey(date: string | Date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' }).format(new Date(y, m - 1, 1));
}

function buildMonthRange(start: Date, end: Date) {
  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');
}

export default function Dashboard() {
  const [detailOpen, setDetailOpen] = useState<'won' | 'open' | null>(null);

  const { data: deals = [] } = useQuery({
    queryKey: ['deals-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('deals')
        .select('id, title, status, value, created_at, closed_at, client_id, clients(company_name)');
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
    { label: 'Revenue Menang', value: formatIDR(wonValue), icon: DollarSign, detail: 'won' as const },
    { label: 'Nilai Pipeline', value: formatIDR(pipelineValue), icon: TrendingUp, detail: 'open' as const },
    { label: 'Rata-rata Durasi Lead → Deal', value: `${avgDuration} hari`, icon: Target, detail: null },
    { label: 'Win Rate', value: `${winRate}%`, icon: Percent, detail: null },
  ];

  const detailDeals = detailOpen === 'won' ? wonDeals : detailOpen === 'open' ? openDeals : [];
  const detailTotal = detailDeals.reduce((s, d) => s + (d.value || 0), 0);

  const monthRange = useMemo(() => {
    if (deals.length === 0) return [];
    const earliest = deals.reduce((min, d) => {
      const t = new Date(d.created_at).getTime();
      return t < min ? t : min;
    }, Date.now());
    return buildMonthRange(new Date(earliest), new Date());
  }, [deals]);

  const monthlyWon = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of wonDeals) {
      if (!d.closed_at) continue;
      const key = monthKey(d.closed_at);
      counts[key] = (counts[key] || 0) + 1;
    }
    return monthRange.map(key => ({ name: monthLabel(key), count: counts[key] || 0 }));
  }, [wonDeals, monthRange]);

  const monthlyOpen = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of openDeals) {
      const key = monthKey(d.created_at);
      counts[key] = (counts[key] || 0) + 1;
    }
    return monthRange.map(key => ({ name: monthLabel(key), count: counts[key] || 0 }));
  }, [openDeals, monthRange]);

  const wonTable = [...wonDeals]
    .sort((a, b) => new Date(b.closed_at || b.created_at).getTime() - new Date(a.closed_at || a.created_at).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className={kpi.detail ? 'cursor-pointer transition-colors hover:bg-muted/40' : undefined}
            onClick={kpi.detail ? () => setDetailOpen(kpi.detail) : undefined}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <kpi.icon className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xl font-bold">{kpi.value}</p>
                {kpi.detail && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>
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
            {monthlyWon.some(m => m.count > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyWon} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ background: 'hsl(var(--sidebar-background))', border: 'none', borderRadius: 12, color: 'hsl(0 0% 100%)', padding: '8px 12px' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada deal yang menang.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deal Terbuka per Bulan</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyOpen.some(m => m.count > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyOpen} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ background: 'hsl(var(--sidebar-background))', border: 'none', borderRadius: 12, color: 'hsl(0 0% 100%)', padding: '8px 12px' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
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

      <Dialog open={!!detailOpen} onOpenChange={(open) => !open && setDetailOpen(null)}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detailOpen === 'won' ? 'Rincian Revenue Menang' : 'Rincian Nilai Pipeline'}
            </DialogTitle>
          </DialogHeader>
          {detailDeals.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/50">
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Deal</th>
                    <th className="text-left p-3 font-medium">Client</th>
                    <th className="text-left p-3 font-medium">{detailOpen === 'won' ? 'Tanggal Menang' : 'Tanggal Lead'}</th>
                    <th className="text-right p-3 font-medium">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {detailDeals.map((d: any) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{d.title}</td>
                      <td className="p-3 text-muted-foreground">{d.clients?.company_name}</td>
                      <td className="p-3 text-muted-foreground">
                        {formatDate(detailOpen === 'won' ? (d.closed_at || d.created_at) : d.created_at)}
                      </td>
                      <td className="p-3 text-right font-medium">{formatIDR(d.value || 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td colSpan={3} className="p-3 font-semibold">Total ({detailDeals.length} deal)</td>
                    <td className="p-3 text-right font-semibold">{formatIDR(detailTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {detailOpen === 'won' ? 'Belum ada deal yang menang.' : 'Belum ada deal terbuka.'}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

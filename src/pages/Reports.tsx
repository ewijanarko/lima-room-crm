import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatIDR } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';

const STAGE_LABELS: Record<string, string> = {
  lead: 'Prospek', qualified: 'Terkualifikasi', proposal: 'Proposal',
  negotiation: 'Negosiasi', won: 'Menang', lost: 'Kalah',
};

const STAGE_COLORS: Record<string, string> = {
  lead: 'hsl(215,80%,52%)', qualified: 'hsl(260,60%,55%)', proposal: 'hsl(43,74%,49%)',
  negotiation: 'hsl(25,85%,55%)', won: 'hsl(160,60%,42%)', lost: 'hsl(0,72%,51%)',
};

const PIE_COLORS = [
  'hsl(215,80%,52%)', 'hsl(260,60%,55%)', 'hsl(43,74%,49%)',
  'hsl(25,85%,55%)', 'hsl(160,60%,42%)', 'hsl(170,55%,42%)',
  'hsl(0,72%,51%)', 'hsl(200,60%,50%)', 'hsl(300,50%,50%)', 'hsl(120,40%,50%)',
];

const tooltipStyle = {
  background: 'hsl(222,25%,14%)',
  border: '1px solid hsl(222,20%,20%)',
  borderRadius: 8,
  color: 'hsl(220,15%,90%)',
};

export default function Reports() {
  const { data: deals } = useQuery({
    queryKey: ['reports-deals'],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('id, title, stage, value, client_id, created_at, expected_close_date, created_by, clients(company_name)');
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['reports-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name');
      return data || [];
    },
  });

  // 1. Revenue by month (won deals)
  const revenueByMonth = (() => {
    if (!deals) return [];
    const wonDeals = deals.filter(d => d.stage === 'won');
    const grouped: Record<string, number> = {};
    wonDeals.forEach(d => {
      const month = new Date(d.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' });
      grouped[month] = (grouped[month] || 0) + (d.value || 0);
    });
    return Object.entries(grouped).map(([month, value]) => ({ month, value }));
  })();

  // 2. Deal funnel
  const funnelData = Object.keys(STAGE_LABELS).map(stage => ({
    name: STAGE_LABELS[stage],
    stage,
    count: deals?.filter(d => d.stage === stage).length || 0,
    value: deals?.filter(d => d.stage === stage).reduce((s, d) => s + (d.value || 0), 0) || 0,
  }));

  // Win rate
  const totalClosed = (deals?.filter(d => ['won', 'lost'].includes(d.stage)).length) || 0;
  const wonCount = deals?.filter(d => d.stage === 'won').length || 0;
  const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

  // 3. Top clients by deal value
  const topClients = (() => {
    if (!deals) return [];
    const grouped: Record<string, { name: string; value: number; count: number }> = {};
    deals.forEach(d => {
      const name = (d.clients as any)?.company_name || 'Unknown';
      if (!grouped[d.client_id]) grouped[d.client_id] = { name, value: 0, count: 0 };
      grouped[d.client_id].value += d.value || 0;
      grouped[d.client_id].count += 1;
    });
    return Object.values(grouped).sort((a, b) => b.value - a.value).slice(0, 10);
  })();

  // 4. Sales performance by user
  const salesPerformance = (() => {
    if (!deals || !profiles) return [];
    const grouped: Record<string, { name: string; won: number; total: number; value: number }> = {};
    deals.forEach(d => {
      const uid = d.created_by || 'unknown';
      const profile = profiles.find(p => p.user_id === uid);
      if (!grouped[uid]) grouped[uid] = { name: profile?.full_name || 'Unknown', won: 0, total: 0, value: 0 };
      grouped[uid].total += 1;
      if (d.stage === 'won') {
        grouped[uid].won += 1;
        grouped[uid].value += d.value || 0;
      }
    });
    return Object.values(grouped).sort((a, b) => b.value - a.value);
  })();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Laporan & Analitik</h1>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-5 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Deal</p>
            <p className="text-3xl font-bold font-mono mt-1">{deals?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Win Rate</p>
            <p className="text-3xl font-bold font-mono mt-1">{winRate}%</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendapatan (Menang)</p>
            <p className="text-3xl font-bold font-mono mt-1">{formatIDR(deals?.filter(d => d.stage === 'won').reduce((s, d) => s + (d.value || 0), 0) || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Month */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Pendapatan per Bulan</CardTitle></CardHeader>
          <CardContent>
            {revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,10%,25%)" />
                  <XAxis dataKey="month" stroke="hsl(220,10%,55%)" fontSize={12} />
                  <YAxis stroke="hsl(220,10%,55%)" fontSize={12} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [formatIDR(val), 'Pendapatan']} />
                  <Bar dataKey="value" fill="hsl(160,60%,42%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Belum ada data pendapatan.</p>
            )}
          </CardContent>
        </Card>

        {/* Deal Funnel */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Corong Tahap Deal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" stroke="hsl(220,10%,55%)" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="hsl(220,10%,55%)" fontSize={12} width={100} />
                <Tooltip contentStyle={tooltipStyle} formatter={(val: number, _: string, entry: any) => [`${val} deal (${formatIDR(entry.payload.value)})`, 'Jumlah']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry) => (
                    <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Top 10 Klien (Nilai Deal)</CardTitle></CardHeader>
          <CardContent>
            {topClients.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={topClients}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    fontSize={11}
                  >
                    {topClients.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [formatIDR(val), 'Nilai']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Belum ada data klien.</p>
            )}
          </CardContent>
        </Card>

        {/* Sales Performance */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Performa Sales</CardTitle></CardHeader>
          <CardContent>
            {salesPerformance.length > 0 ? (
              <div className="space-y-3">
                {salesPerformance.map((user, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.won}/{user.total} deal menang · {formatIDR(user.value)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold">
                        {user.total > 0 ? Math.round((user.won / user.total) * 100) : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">win rate</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Belum ada data performa.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatIDR } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, CartesianGrid,
} from 'recharts';
import type { TranslationKey } from '@/lib/translations';

const STAGE_KEYS: Record<string, TranslationKey> = {
  lead: 'stage.lead', qualified: 'stage.qualified', proposal: 'stage.proposal',
  negotiation: 'stage.negotiation', won: 'stage.won', lost: 'stage.lost',
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
  background: 'hsl(222,25%,14%)', border: '1px solid hsl(222,20%,20%)', borderRadius: 8, color: 'hsl(220,15%,90%)',
};

export default function Reports() {
  const { t, language } = useLanguage();

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

  const revenueByMonth = (() => {
    if (!deals) return [];
    const wonDeals = deals.filter(d => d.stage === 'won');
    const grouped: Record<string, number> = {};
    wonDeals.forEach(d => {
      const month = new Date(d.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { year: 'numeric', month: 'short' });
      grouped[month] = (grouped[month] || 0) + (d.value || 0);
    });
    return Object.entries(grouped).map(([month, value]) => ({ month, value }));
  })();

  const funnelData = Object.keys(STAGE_KEYS).map(stage => ({
    name: t(STAGE_KEYS[stage]),
    stage,
    count: deals?.filter(d => d.stage === stage).length || 0,
    value: deals?.filter(d => d.stage === stage).reduce((s, d) => s + (d.value || 0), 0) || 0,
  }));

  const totalClosed = (deals?.filter(d => ['won', 'lost'].includes(d.stage)).length) || 0;
  const wonCount = deals?.filter(d => d.stage === 'won').length || 0;
  const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

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

  const salesPerformance = (() => {
    if (!deals || !profiles) return [];
    const grouped: Record<string, { name: string; won: number; total: number; value: number }> = {};
    deals.forEach(d => {
      const uid = d.created_by || 'unknown';
      const profile = profiles.find(p => p.user_id === uid);
      if (!grouped[uid]) grouped[uid] = { name: profile?.full_name || 'Unknown', won: 0, total: 0, value: 0 };
      grouped[uid].total += 1;
      if (d.stage === 'won') { grouped[uid].won += 1; grouped[uid].value += d.value || 0; }
    });
    return Object.values(grouped).sort((a, b) => b.value - a.value);
  })();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('reports.title')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-5 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('reports.totalDeals')}</p>
            <p className="text-3xl font-bold font-mono mt-1">{deals?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('reports.winRate')}</p>
            <p className="text-3xl font-bold font-mono mt-1">{winRate}%</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('reports.revenueWon')}</p>
            <p className="text-3xl font-bold font-mono mt-1">{formatIDR(deals?.filter(d => d.stage === 'won').reduce((s, d) => s + (d.value || 0), 0) || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">{t('reports.revenueByMonth')}</CardTitle></CardHeader>
          <CardContent>
            {revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,10%,25%)" />
                  <XAxis dataKey="month" stroke="hsl(220,10%,55%)" fontSize={12} />
                  <YAxis stroke="hsl(220,10%,55%)" fontSize={12} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [formatIDR(val), t('reports.revenue')]} />
                  <Bar dataKey="value" fill="hsl(160,60%,42%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">{t('reports.noRevenue')}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">{t('reports.dealFunnel')}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" stroke="hsl(220,10%,55%)" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="hsl(220,10%,55%)" fontSize={12} width={100} />
                <Tooltip contentStyle={tooltipStyle} formatter={(val: number, _: string, entry: any) => [`${val} deal (${formatIDR(entry.payload.value)})`, t('dashboard.count')]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry) => (<Cell key={entry.stage} fill={STAGE_COLORS[entry.stage]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">{t('reports.topClients')}</CardTitle></CardHeader>
          <CardContent>
            {topClients.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={topClients} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} fontSize={11}>
                    {topClients.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [formatIDR(val), t('deals.value')]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">{t('reports.noClients')}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">{t('reports.salesPerformance')}</CardTitle></CardHeader>
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
                        {user.won}/{user.total} {t('reports.dealsWon')} · {formatIDR(user.value)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold">{user.total > 0 ? Math.round((user.won / user.total) * 100) : 0}%</p>
                      <p className="text-xs text-muted-foreground">win rate</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">{t('reports.noPerformance')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatIDR } from '@/lib/format';
import { Building2, Target, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

const STAGE_COLORS: Record<string, string> = {
  lead: 'hsl(215, 80%, 52%)',
  qualified: 'hsl(260, 60%, 55%)',
  proposal: 'hsl(43, 74%, 49%)',
  negotiation: 'hsl(25, 85%, 55%)',
  won: 'hsl(160, 60%, 42%)',
  lost: 'hsl(0, 72%, 51%)',
};

export default function Dashboard() {
  const { data: clients } = useQuery({
    queryKey: ['clients-count'],
    queryFn: async () => {
      const { count } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active');
      return count || 0;
    },
  });

  const { data: deals } = useQuery({
    queryKey: ['deals-all'],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('id, stage, value');
      return data || [];
    },
  });

  const { data: recentComms } = useQuery({
    queryKey: ['recent-communications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('communications')
        .select('id, type, subject, communication_date, client_id, clients(company_name)')
        .order('communication_date', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const openDeals = deals?.filter(d => !['won', 'lost'].includes(d.stage)) || [];
  const pipelineValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const wonValue = deals?.filter(d => d.stage === 'won').reduce((sum, d) => sum + (d.value || 0), 0) || 0;

  // Funnel data
  const stageCounts = Object.keys(STAGE_LABELS).map(stage => ({
    name: STAGE_LABELS[stage],
    stage,
    count: deals?.filter(d => d.stage === stage).length || 0,
    value: deals?.filter(d => d.stage === stage).reduce((s, d) => s + (d.value || 0), 0) || 0,
  }));

  const kpis = [
    { label: 'Revenue (Won)', value: formatIDR(wonValue), icon: DollarSign, color: 'text-accent' },
    { label: 'Pipeline Value', value: formatIDR(pipelineValue), icon: TrendingUp, color: 'text-primary' },
    { label: 'Active Clients', value: clients?.toString() || '0', icon: Building2, color: 'text-gold' },
    { label: 'Open Deals', value: openDeals.length.toString(), icon: Target, color: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-semibold font-mono mt-1">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-8 w-8 ${kpi.color} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Deal Stage Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stageCounts} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" stroke="hsl(220,10%,55%)" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="hsl(220,10%,55%)" fontSize={12} width={90} />
                <Tooltip
                  contentStyle={{ background: 'hsl(222,25%,14%)', border: '1px solid hsl(222,20%,20%)', borderRadius: 8, color: 'hsl(220,15%,90%)' }}
                  formatter={(val: number, _name: string, entry: any) => [
                    `${val} deals (${formatIDR(entry.payload.value)})`,
                    'Count',
                  ]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stageCounts.map((entry) => (
                    <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Recent Communications</CardTitle>
          </CardHeader>
          <CardContent>
            {recentComms && recentComms.length > 0 ? (
              <div className="space-y-3">
                {recentComms.map((comm: any) => (
                  <div key={comm.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                    <MessageIcon type={comm.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{comm.subject || 'No subject'}</p>
                      <p className="text-xs text-muted-foreground">
                        {comm.clients?.company_name} · {new Date(comm.communication_date).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No communications logged yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MessageIcon({ type }: { type: string }) {
  const icons: Record<string, string> = { call: '📞', email: '✉️', meeting: '🤝', whatsapp: '💬', other: '📝' };
  return <span className="text-lg">{icons[type] || '📝'}</span>;
}

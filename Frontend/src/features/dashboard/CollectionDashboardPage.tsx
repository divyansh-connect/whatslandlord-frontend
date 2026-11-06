import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { StatsCard } from '../../components/StatsCard';
import { ChartCard } from '../../components/ChartCard';
import { PageHeader } from '../../components/PageHeader';
import { 
  DollarSign, Wrench, RefreshCw, ArrowUpRight, ArrowDownRight, 
  UserCheck, AlertCircle, Calendar, MessageSquare, HandCoins
} from 'lucide-react';
import { 
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend, AreaChart, Area,
  BarChart as ReBarChart, Bar
} from 'recharts';
import { useAuthStore } from '../../store/useStore';
import { Button } from '../../components/ui/Button';
import { useTranslation } from 'react-i18next';

export const CollectionDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  // Query Metrics
  const { data: metrics, isLoading: loadingMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => api.dashboard.getMetrics(),
  });

  // Query Charts
  const { data: charts, isLoading: loadingCharts, refetch: refetchCharts } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: () => api.dashboard.getChartData(),
  });

  const refreshAll = () => {
    refetchMetrics();
    refetchCharts();
  };

  // Mock list of overdue tenant balances
  const overdueTenants = [
    { id: '1', name: 'Robert Johnson', unit: 'Unit 205', balance: 1450, daysOverdue: 12 },
    { id: '2', name: 'Emily Davis', unit: 'Unit 104', balance: 850, daysOverdue: 8 },
    { id: '3', name: 'Michael Chang', unit: 'Unit 310', balance: 1800, daysOverdue: 5 },
    { id: '4', name: 'Jessica Taylor', unit: 'Unit 112', balance: 400, daysOverdue: 3 },
  ];

  // Mock recent transaction log
  const recentTransactions = [
    { id: 't-1', date: '2026-07-23', type: 'Rent Payment', party: 'Robert Johnson', amount: 1200, status: 'Completed', flow: 'in' },
    { id: 't-2', date: '2026-07-23', type: 'Owner Payout', party: 'Lakeside Development', amount: 4500, status: 'Completed', flow: 'out' },
    { id: 't-3', date: '2026-07-22', type: 'Vendor Invoice', party: 'Rapid Plumbing Corp', amount: 350, status: 'Completed', flow: 'out' },
    { id: 't-4', date: '2026-07-22', type: 'Rent Payment', party: 'Sarah Jenkins', amount: 1850, status: 'Completed', flow: 'in' },
    { id: 't-5', date: '2026-07-21', type: 'Vendor Invoice', party: 'Volt Electric Services', amount: 480, status: 'Pending', flow: 'out' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('collectionDashboard.title')}
        description={t('collectionDashboard.desc')}
        breadcrumbs={[
          { label: t('ai.breadcrumbs.home'), href: '/' },
          { label: t('collectionDashboard.collections') }
        ]}
        action={{
          label: t('collectionDashboard.refreshLedger'),
          onClick: refreshAll,
          icon: <RefreshCw className="w-4 h-4" />,
          variant: 'outline'
        }}
      />

      {/* --- 4 FINANCIAL STATS CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t('collectionDashboard.tenantCollections')}
          value={`$${(metrics?.monthlyRevenue ?? 0).toLocaleString()}`}
          icon={<ArrowUpRight className="w-5 h-5 text-emerald-500" />}
          trend={(metrics?.monthlyRevenue ?? 0) > 0 ? "up" : "neutral"}
          trendLabel={(metrics?.monthlyRevenue ?? 0) > 0 ? `${metrics?.occupiedUnits ?? 0} Active` : "0%"}
          description={t('collectionDashboard.grossInflow')}
          loading={loadingMetrics}
        />
        <StatsCard
          title={t('collectionDashboard.tenantOverdue')}
          value={`$${(metrics?.pendingRent ?? 0).toLocaleString()}`}
          icon={<AlertCircle className="w-5 h-5 text-rose-500" />}
          trend={(metrics?.pendingRent ?? 0) > 0 ? "down" : "neutral"}
          trendLabel={(metrics?.pendingRent ?? 0) > 0 ? `${(metrics as any)?.pendingInvoicesCount || 1} Overdue` : "0%"}
          description={t('collectionDashboard.pendingAccounts')}
          loading={loadingMetrics}
        />
        <StatsCard
          title={t('collectionDashboard.ownerPayouts')}
          value={`$${((metrics?.monthlyRevenue ?? 0) * 0.72).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={<HandCoins className="w-5 h-5 text-indigo-500" />}
          description={t('collectionDashboard.distributionsProcessed')}
          loading={loadingMetrics}
        />
        <StatsCard
          title={t('collectionDashboard.maintenanceExpenses')}
          value={`$${(metrics?.expenses ?? 0).toLocaleString()}`}
          icon={<ArrowDownRight className="w-5 h-5 text-amber-500" />}
          description={t('collectionDashboard.invoicesPaid')}
          loading={loadingMetrics}
        />
      </div>

      {/* --- CASHFLOW CHARTS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cashflow timeline */}
        <div className="lg:col-span-2">
          <ChartCard
            title={t('collectionDashboard.cashflowInflowVsOutflow')}
            description={t('collectionDashboard.cashflowDesc')}
            loading={loadingCharts}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.revenueGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--foreground), 0.05)" />
                <XAxis dataKey="month" stroke="currentColor" fontSize={11} tickLine={false} axisLine={false} opacity={0.6} />
                <YAxis stroke="currentColor" fontSize={11} tickLine={false} axisLine={false} opacity={0.6} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))', 
                    borderRadius: '10px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" name={t('collectionDashboard.inflowRent')} dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInflow)" />
                <Area type="monotone" name={t('collectionDashboard.outflowPayouts')} dataKey="expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorOutflow)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Tenant Overdue List */}
        <div className="bg-card border rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="font-extrabold text-sm text-foreground">{t('collectionDashboard.followUpRequired')}</h3>
              <p className="text-[11px] text-muted-foreground">{t('collectionDashboard.followUpDesc')}</p>
            </div>
            <div className="space-y-3">
              {overdueTenants.map((tItem) => (
                <div key={tItem.id} className="flex justify-between items-center bg-secondary/10 p-3 rounded-xl border border-border/20">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground leading-none">{tItem.name}</p>
                    <p className="text-[10px] text-muted-foreground">{tItem.unit} • <span className="text-rose-500 font-semibold">{t('collectionDashboard.daysLate', { days: tItem.daysOverdue })}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-rose-500">${tItem.balance}</p>
                    <button className="text-[9px] text-primary hover:underline font-bold mt-0.5 flex items-center gap-0.5">
                      <MessageSquare className="w-2.5 h-2.5" /> {t('collectionDashboard.sendAlert')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- RECENT TRANSACTIONS LOG TABLE --- */}
      <div className="bg-card border rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="font-extrabold text-sm text-foreground">{t('collectionDashboard.recentCashflow')}</h3>
          <p className="text-[11px] text-muted-foreground">{t('collectionDashboard.ledgerAuditLog')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] tracking-wider font-bold">
                <th className="py-2">{t('collectionDashboard.date')}</th>
                <th className="py-2">{t('collectionDashboard.type')}</th>
                <th className="py-2">{t('collectionDashboard.party')}</th>
                <th className="py-2">{t('collectionDashboard.amount')}</th>
                <th className="py-2">{t('collectionDashboard.status')}</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border/25 hover:bg-secondary/5 transition">
                  <td className="py-2.5 font-mono text-muted-foreground">{tx.date}</td>
                  <td className="py-2.5 font-bold text-foreground">{tx.type}</td>
                  <td className="py-2.5 font-semibold text-muted-foreground">{tx.party}</td>
                  <td className={`py-2.5 font-black ${tx.flow === 'in' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {tx.flow === 'in' ? '+' : '-'}${tx.amount}
                  </td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                      tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                      'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CollectionDashboardPage;

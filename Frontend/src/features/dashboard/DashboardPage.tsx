import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { StatsCard } from '../../components/StatsCard';
import { ChartCard } from '../../components/ChartCard';
import { PageHeader } from '../../components/PageHeader';
import { 
  Building2, Home, UserCheck, AlertCircle, TrendingUp, DollarSign, Calendar, Wrench, 
  Sparkles, RefreshCw, BarChart
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart as ReBarChart, Bar, Legend, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';

import { useAuthStore } from '../../store/useStore';
import { useTranslation } from 'react-i18next';
import { MetricDetailsModal, MetricType } from './MetricDetailsModal';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedMetric, setSelectedMetric] = React.useState<MetricType | null>(null);

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
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    queryClient.invalidateQueries({ queryKey: ['units'] });
    queryClient.invalidateQueries({ queryKey: ['properties'] });
    queryClient.invalidateQueries({ queryKey: ['leases'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

  const { user } = useAuthStore();
  const isCollectionManager = user?.role === 'Collection Manager';

  return (
    <div className="space-y-6">
      <PageHeader
        title={isCollectionManager ? t('dashboard.titleCollection') : t('dashboard.titlePortfolio')}
        description={isCollectionManager ? t('dashboard.descCollection') : t('dashboard.descPortfolio')}
        breadcrumbs={[
          { label: t('ai.breadcrumbs.home'), href: '/' },
          { label: t('nav.dashboard') }
        ]}
        action={{
          label: t('dashboard.syncData'),
          onClick: refreshAll,
          icon: <RefreshCw className="w-4 h-4" />,
          variant: 'outline'
        }}
      />

      {/* --- METRIC CARDS GRID --- */}
      {isCollectionManager ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title={t('dashboard.monthlyRevenue')}
            value={`$${(metrics?.monthlyRevenue ?? 0).toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
            trend="up"
            trendLabel="+12.4%"
            description={t('dashboard.rentCollectionRate')}
            loading={loadingMetrics}
            onClick={() => setSelectedMetric('monthlyRevenue')}
          />
          <StatsCard
            title={t('dashboard.pendingRent')}
            value={`$${(metrics?.pendingRent ?? 0).toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
            trend="down"
            trendLabel="-8.5%"
            description={t('dashboard.outstandingBalances')}
            loading={loadingMetrics}
            onClick={() => setSelectedMetric('pendingRent')}
          />
          <StatsCard
            title={t('dashboard.expenses')}
            value={`$${(metrics?.expenses ?? 0).toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
            description={t('dashboard.invoicesPaid')}
            loading={loadingMetrics}
            onClick={() => setSelectedMetric('expenses')}
          />
          <StatsCard
            title={t('dashboard.openMaintenance')}
            value={metrics?.openMaintenance ?? 0}
            icon={<Wrench className="w-5 h-5" />}
            trend={metrics?.openMaintenance ? "up" : "neutral"}
            trendLabel={metrics?.openMaintenance ? `+${metrics.openMaintenance} pending` : "0 pending"}
            description={t('dashboard.activeWorkOrders')}
            loading={loadingMetrics}
            onClick={() => setSelectedMetric('openMaintenance')}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            title={t('dashboard.totalProperties')}
            value={metrics?.totalProperties ?? 0}
            icon={<Building2 className="w-5 h-5" />}
            trend="up"
            trendLabel={`+1 ${t('dashboard.thisQuarter').split(' ')[0]}`}
            description={t('dashboard.thisQuarter')}
            loading={loadingMetrics}
            onClick={() => setSelectedMetric('properties')}
          />
          <StatsCard
            title={t('dashboard.totalUnits')}
            value={metrics?.totalUnits ?? 0}
            icon={<Home className="w-5 h-5" />}
            description={t('dashboard.acrossAllAssets')}
            loading={loadingMetrics}
            onClick={() => setSelectedMetric('totalUnits')}
          />
          <StatsCard
            title={t('dashboard.occupiedUnits')}
            value={metrics?.occupiedUnits ?? 0}
            icon={<UserCheck className="w-5 h-5" />}
            trend="neutral"
            trendLabel="Stable"
            description={t('dashboard.activeLeases')}
            loading={loadingMetrics}
            onClick={() => setSelectedMetric('occupiedUnits')}
          />
          <StatsCard
            title={t('dashboard.vacantUnits')}
            value={metrics?.vacantUnits ?? 0}
            icon={<AlertCircle className="w-5 h-5" />}
            trend="down"
            trendLabel="-2"
            description={t('dashboard.readyForListings')}
            loading={loadingMetrics}
            onClick={() => setSelectedMetric('vacantUnits')}
          />
          <StatsCard
            title={t('dashboard.occupancyRate')}
            value={`${metrics?.occupancyRate ?? 0}%`}
            icon={<TrendingUp className="w-5 h-5" />}
            trend="up"
            trendLabel="+4.2%"
            description={t('dashboard.comparedToLastMonth')}
            loading={loadingMetrics}
            onClick={() => setSelectedMetric('occupancyRate')}
          />
          <StatsCard
            title={t('dashboard.monthlyRevenue')}
            value={`$${(metrics?.monthlyRevenue ?? 0).toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
            trend="up"
            trendLabel="+12.4%"
            description={t('dashboard.rentCollectionRate')}
            loading={loadingMetrics}
            onClick={() => setSelectedMetric('monthlyRevenue')}
          />
          <StatsCard
            title={t('dashboard.pendingRent')}
            value={`$${(metrics?.pendingRent ?? 0).toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
            trend="down"
            trendLabel="-8.5%"
            description={t('dashboard.outstandingBalances')}
            loading={loadingMetrics}
            onClick={() => setSelectedMetric('pendingRent')}
          />
          <StatsCard
            title={t('dashboard.expenses')}
            value={`$${(metrics?.expenses ?? 0).toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
            description={t('dashboard.invoicesPaid')}
            loading={loadingMetrics}
            onClick={() => setSelectedMetric('expenses')}
          />
          <StatsCard
            title={t('dashboard.openMaintenance')}
            value={metrics?.openMaintenance ?? 0}
            icon={<Wrench className="w-5 h-5" />}
            trend={metrics?.openMaintenance ? "up" : "neutral"}
            trendLabel={metrics?.openMaintenance ? `+${metrics.openMaintenance}` : "0"}
            description={t('dashboard.activeWorkOrders')}
            loading={loadingMetrics}
            onClick={() => setSelectedMetric('openMaintenance')}
          />
          <StatsCard
            title={t('dashboard.leasesExpiringSoon')}
            value={metrics?.leasesExpiringSoon ?? 0}
            icon={<Calendar className="w-5 h-5" />}
            description={t('dashboard.expiringIn60Days')}
            loading={loadingMetrics}
            onClick={() => setSelectedMetric('leasesExpiringSoon')}
          />
        </div>
      )}

      {/* --- CHARTS GRID --- */}
      {isCollectionManager ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Growth Chart */}
          <ChartCard
            title={t('dashboard.revenueGrowth')}
            description={t('dashboard.revenueGrowthDesc')}
            loading={loadingCharts}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.revenueGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.01}/>
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
                  formatter={(value: any) => [`$${value.toLocaleString()}`, t('dashboard.revenue')]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Maintenance Analytics Chart */}
          <ChartCard
            title={t('dashboard.maintenanceWorkOrders')}
            description={t('dashboard.maintenanceWorkOrdersDesc')}
            loading={loadingCharts}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.maintenanceAnalytics}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="category"
                >
                  {charts?.maintenanceAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ 
                    background: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))', 
                    borderRadius: '10px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'semibold' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Growth Chart */}
          <ChartCard
            title={t('dashboard.revenueGrowth')}
            description={t('dashboard.revenueGrowthDesc')}
            loading={loadingCharts}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.revenueGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.01}/>
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
                  formatter={(value: any) => [`$${value.toLocaleString()}`, t('dashboard.revenue')]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Income vs Expenses Chart */}
          <ChartCard
            title={t('dashboard.incomeVsExpenses')}
            description={t('dashboard.incomeVsExpensesDesc')}
            loading={loadingCharts}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={charts?.incomeVsExpenses} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  formatter={(value: any) => [`$${value.toLocaleString()}`]}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'semibold' }} />
                <Bar dataKey="income" name={t('dashboard.income')} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name={t('dashboard.expenses')} fill="#ef4444" radius={[4, 4, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Occupancy Trend Chart */}
          <ChartCard
            title={t('dashboard.occupancyTrend')}
            description={t('dashboard.occupancyTrendDesc')}
            loading={loadingCharts}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.occupancyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--foreground), 0.05)" />
                <XAxis dataKey="month" stroke="currentColor" fontSize={11} tickLine={false} axisLine={false} opacity={0.6} />
                <YAxis stroke="currentColor" fontSize={11} tickLine={false} axisLine={false} opacity={0.6} domain={[60, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))', 
                    borderRadius: '10px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: any) => [`${value}%`, t('dashboard.occupancy')]}
                />
                <Line type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Maintenance Analytics Chart */}
          <ChartCard
            title={t('dashboard.maintenanceWorkOrders')}
            description={t('dashboard.maintenanceWorkOrdersDesc')}
            loading={loadingCharts}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.maintenanceAnalytics}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="category"
                >
                  {charts?.maintenanceAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ 
                    background: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))', 
                    borderRadius: '10px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'semibold' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* METRIC DETAILS MODAL */}
      <MetricDetailsModal
        open={!!selectedMetric}
        metricType={selectedMetric}
        metricsSummary={metrics}
        onClose={() => setSelectedMetric(null)}
      />
    </div>
  );
};
export default DashboardPage;

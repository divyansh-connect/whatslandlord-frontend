import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { reportApi } from '../reports/services/reportApi';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { 
  DollarSign, TrendingUp, AlertCircle, Calendar, Plus, 
  Send, HelpCircle, Activity, CreditCard 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, PieChart, Pie, Cell 
} from 'recharts';
import { RentMetricModal, RentMetricType } from './RentMetricModal';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const RentDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedMetric, setSelectedMetric] = useState<RentMetricType | null>(null);

  // Queries aligned with Delinquency & Payment History reports
  const { data: delinqRes, isLoading: loadingDelinq } = useQuery({ 
    queryKey: ['report-delinquency', 'dashboard'], 
    queryFn: () => reportApi.getDelinquency({}) 
  });
  const { data: payHistoryRes, isLoading: loadingPayHistory } = useQuery({ 
    queryKey: ['report-payment-history', 'dashboard'], 
    queryFn: () => reportApi.getPaymentHistory({}) 
  });
  const { data: allPlans = [], isLoading: loadingPlans } = useQuery({ 
    queryKey: ['rent-plans-all'], 
    queryFn: () => api.paymentPlans.getAll() 
  });

  if (loadingDelinq || loadingPayHistory || loadingPlans) {
    return <LoadingSkeleton type="card" />;
  }

  const delinquencyItems = delinqRes?.data || [];
  const paymentItems = payHistoryRes?.data || [];

  // Real Delinquency / Outstanding Balance aligned 100% with Report calculations
  const outstandingBalance = delinqRes?.summary?.totalDelinquentBalance ?? delinquencyItems.reduce(
    (sum: number, i: any) => sum + Number(i.outstandingBalance || 0),
    0
  );
  const latePayments = delinqRes?.summary?.totalDelinquentInvoices ?? delinquencyItems.length;

  // Real Cleared Payments aligned with Payment History Report
  const clearedPayments = paymentItems.filter((p: any) => {
    const st = String(p.paymentStatus || p.status || '').toLowerCase().replace(/[\s_-]/g, '');
    return st === 'paid' || st === 'cleared' || st === 'completed' || !st;
  });

  const now = new Date();
  const currMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const currentMonthPayments = clearedPayments.filter((p: any) => {
    const pDate = String(p.paymentDate || p.paidDate || p.createdAt || '');
    return pDate.startsWith(currMonthPrefix);
  });

  // Total collected strictly matching Payment History Report KPI
  const reportTotalCollected = payHistoryRes?.summary?.totalCollectedAmount ?? clearedPayments.reduce(
    (sum: number, p: any) => sum + Number(p.amount || 0),
    0
  );

  // If this calendar month has recorded payments, use them, otherwise use the report's collected revenue
  const monthlyCollected = currentMonthPayments.length > 0
    ? currentMonthPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    : reportTotalCollected;

  const todayTransactions = clearedPayments.filter((p: any) => {
    const pDate = String(p.paymentDate || p.paidDate || p.createdAt || '');
    return pDate.startsWith(todayStr);
  });
  const collectedToday = todayTransactions.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

  // Dynamic Collection Rate strictly matching collections vs invoiced/billed
  const totalBilledThisMonth = monthlyCollected + outstandingBalance;
  const collectionRate = totalBilledThisMonth > 0 
    ? Math.min(100, Math.round((monthlyCollected / totalBilledThisMonth) * 100)) 
    : (monthlyCollected > 0 ? 100 : 0);

  const activePlans = allPlans.filter((p: any) => p.status === 'Active').length;

  // Real Collection Trends Grouped by Day of Week
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daySums: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  clearedPayments.forEach((p: any) => {
    const pDate = p.paymentDate || p.paidDate || p.createdAt;
    if (pDate) {
      const d = new Date(pDate);
      if (!isNaN(d.getTime())) {
        const dayName = days[d.getDay()];
        if (daySums[dayName] !== undefined) {
          daySums[dayName] += Number(p.amount || 0);
        }
      }
    }
  });

  const collectionTrendData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
    day,
    Collected: daySums[day] || 0,
  }));

  // Real Payment Channels Distribution
  const methodCounts: Record<string, number> = {};
  clearedPayments.forEach((p: any) => {
    const m = p.paymentMethod || 'ACH/Direct';
    methodCounts[m] = (methodCounts[m] || 0) + 1;
  });

  const totalPaidCount = clearedPayments.length || 1;
  const methodDistribution = Object.entries(methodCounts).map(([name, count]) => ({
    name,
    value: Math.round((count / totalPaidCount) * 100),
  }));

  const recentPayments = [...clearedPayments]
    .sort((a: any, b: any) => String(b.paymentDate || b.paidDate || '').localeCompare(String(a.paymentDate || a.paidDate || '')))
    .slice(0, 5);

  const topOverdueInvoices = [...delinquencyItems]
    .sort((a, b) => Number(b.outstandingBalance || 0) - Number(a.outstandingBalance || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6 text-foreground">
      <PageHeader
        title={t('pmRentDashboard.title')}
        description={t('pmRentDashboard.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/' },
          { label: t('nav.rent') },
        ]}
      />

      {/* QUICK ACTION BAR */}
      <div className="flex flex-wrap gap-2.5 p-3.5 bg-card/60 border rounded-2xl">
        <Button size="sm" onClick={() => navigate({ to: '/payments/new' })} className="flex items-center gap-1">
          <Plus className="w-4 h-4" /> {t('pmRentDashboard.recordPayment')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate({ to: '/invoices/new' })} className="flex items-center gap-1">
          <Plus className="w-4 h-4" /> {t('pmRentDashboard.createInvoice')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate({ to: '/rent-ledger' })} className="flex items-center gap-1">
          <Plus className="w-4 h-4" /> {t('pmRentDashboard.rentLedger')}
        </Button>
      </div>

      {/* STATS METRIC GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Collected Today */}
        <Card 
          onClick={() => setSelectedMetric('collectedToday')}
          className="p-5 border border-border bg-card flex flex-col justify-between cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative group"
        >
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('pmRentDashboard.collectedToday')}</p>
            <p className="text-2xl font-extrabold mt-1 text-emerald-500">${collectedToday.toLocaleString()}</p>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold mt-4">{t('pmRentDashboard.dailyClearing')}</span>
        </Card>

        {/* Monthly Collected */}
        <Card 
          onClick={() => setSelectedMetric('monthlyCollected')}
          className="p-5 border border-border bg-card flex flex-col justify-between cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative group"
        >
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Monthly Collected</p>
            <p className="text-2xl font-extrabold mt-1 text-emerald-500">${monthlyCollected.toLocaleString()}</p>
          </div>
          <span className="text-[10px] text-emerald-500 font-bold mt-4 flex items-center gap-0.5">
            <TrendingUp className="w-3.5 h-3.5" /> {collectionRate}% Collection Rate
          </span>
        </Card>

        {/* Outstanding Balance */}
        <Card 
          onClick={() => setSelectedMetric('outstandingBalance')}
          className="p-5 border border-border bg-card flex flex-col justify-between cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative group"
        >
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Outstanding Balance</p>
            <p className="text-2xl font-extrabold mt-1 text-rose-500">${outstandingBalance.toLocaleString()}</p>
          </div>
          <span className="text-[10px] text-rose-500 font-bold mt-4 flex items-center gap-0.5">
            <AlertCircle className="w-3.5 h-3.5" /> {latePayments} Overdue Bills
          </span>
        </Card>
      </div>

      {/* GRAPH & DATA SEGMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Graph */}
        <Card className="lg:col-span-2 p-6 border-border bg-card">
          <h3 className="font-bold text-sm uppercase mb-4 tracking-wide">Daily Collection Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={collectionTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--foreground), 0.05)" />
                <XAxis dataKey="day" stroke="currentColor" fontSize={11} opacity={0.6} />
                <YAxis stroke="currentColor" fontSize={11} opacity={0.6} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }} formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Collected']} />
                <Area type="monotone" dataKey="Collected" stroke="hsl(var(--primary))" fill="rgba(var(--primary), 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Method Distribution */}
        <Card className="lg:col-span-1 p-6 border-border bg-card flex flex-col justify-between">
          <h3 className="font-bold text-sm uppercase mb-4 tracking-wide">Payment Channels</h3>
          <div className="h-60 flex justify-center items-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={methodDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {methodDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value}%`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-muted-foreground pt-4 border-t border-border/40">
            {methodDistribution.map((method, index) => (
              <div key={method.name} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="truncate">{method.name} ({method.value}%)</span>
              </div>
            ))}
          </div>
        </Card>

      </div>

      {/* BOTTOM LIST WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Recent Payments */}
        <Card className="p-5 border-border bg-card space-y-4">
          <h3 className="font-bold text-sm uppercase border-b pb-3 tracking-wide">Recent Cleared Payments</h3>
          <div className="divide-y space-y-3">
            {recentPayments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No recent payments recorded.</p>
            ) : (
              recentPayments.map((pay: any) => (
                <div key={pay.id} className="flex justify-between items-center pt-3 text-xs">
                  <div>
                    <p className="font-bold">{pay.tenantName || 'Resident'}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      {pay.propertyName ? `${pay.propertyName} • ` : ''}{pay.unitNumber ? `Unit ${pay.unitNumber} • ` : ''}{pay.paymentMethod || 'ACH'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-emerald-500">${Number(pay.amount || 0).toLocaleString()}</p>
                    <span className="text-[9px] text-muted-foreground font-bold">{pay.paymentDate || pay.paidDate || 'Paid'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Overdue Accounts */}
        <Card className="p-5 border-border bg-card space-y-4">
          <h3 className="font-bold text-sm uppercase border-b pb-3 tracking-wide">Largest Outstanding Rent Balances</h3>
          <div className="divide-y space-y-3">
            {topOverdueInvoices.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">All accounts are current. No overdue balances.</p>
            ) : (
              topOverdueInvoices.map((inv: any) => (
                <div key={inv.id} className="flex justify-between items-center pt-3 text-xs">
                  <div>
                    <p className="font-bold">{inv.tenantName}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">{inv.propertyName} • {inv.unitNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-rose-500">
                      ${Number(inv.outstandingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className="text-[9px] text-rose-500 font-bold uppercase">
                      {inv.daysLate ? `${inv.daysLate} Days Late` : 'Overdue'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

      </div>

      {/* RENT METRIC DETAILS MODAL */}
      <RentMetricModal
        open={!!selectedMetric}
        metricType={selectedMetric}
        summaryMetrics={{
          collectedToday,
          monthlyCollected,
          outstandingBalance,
          latePayments,
          activePlans,
        }}
        onClose={() => setSelectedMetric(null)}
      />
    </div>
  );
};

export default RentDashboardPage;

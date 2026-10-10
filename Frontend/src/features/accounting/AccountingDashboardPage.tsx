import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, Legend 
} from 'recharts';
import { Plus, CheckSquare, DollarSign, Wallet, FileText, ArrowRight, TrendingUp } from 'lucide-react';
import { AccountingMetricModal, AccountingMetricType } from './AccountingMetricModal';

export const AccountingDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedMetric, setSelectedMetric] = useState<AccountingMetricType | null>(null);

  // Real Queries
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({ 
    queryKey: ['coa-accounts-list'], 
    queryFn: () => api.accounts.getAll() 
  });
  const { data: bills = [], isLoading: loadingBills } = useQuery({ 
    queryKey: ['bills-list'], 
    queryFn: () => api.vendorBills.getAll() 
  });
  const { data: payments = [], isLoading: loadingPayments } = useQuery({ 
    queryKey: ['accounting-payments-list'], 
    queryFn: () => api.payments.getAll() 
  });
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({ 
    queryKey: ['accounting-expenses-list'], 
    queryFn: () => api.expenses.getAll() 
  });

  if (loadingAccounts || loadingBills) {
    return <LoadingSkeleton type="card" />;
  }

  // Calculate real totals from live Chart of Accounts & actual transactions
  const accountsAssetSum = accounts.filter(a => a.accountType === 'Assets').reduce((sum, a) => sum + (a.balance || 0), 0);
  const accountsIncomeSum = accounts.filter(a => a.accountType === 'Income' || a.accountType === 'Revenue').reduce((sum, a) => sum + (a.balance || 0), 0);
  const accountsExpenseSum = accounts.filter(a => a.accountType === 'Expenses').reduce((sum, a) => sum + (a.balance || 0), 0);

  // If CoA accounts balance is present, use it; otherwise use real payments & expenses sums
  const paymentsSum = payments.filter((p: any) => p.status === 'Paid').reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const expensesSum = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  const cashBalance = accountsAssetSum > 0 ? accountsAssetSum : (paymentsSum > expensesSum ? paymentsSum - expensesSum : 0);
  const totalIncome = accountsIncomeSum > 0 ? accountsIncomeSum : paymentsSum;
  const totalExpenses = accountsExpenseSum > 0 ? accountsExpenseSum : expensesSum;
  const netProfit = totalIncome - totalExpenses;

  // Real monthly data grouped by actual transaction dates
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIdx = new Date().getMonth();
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const idx = (currentMonthIdx - 5 + i + 12) % 12;
    return MONTH_NAMES[idx];
  });

  const monthlyData = last6Months.map(month => {
    const mIncome = payments
      .filter((p: any) => p.status === 'Paid' && p.paidDate && new Date(p.paidDate).toLocaleString('en-US', { month: 'short' }) === month)
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const mExpenses = expenses
      .filter((e: any) => e.date && new Date(e.date).toLocaleString('en-US', { month: 'short' }) === month)
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    return { 
      month, 
      Income: mIncome, 
      Expenses: mExpenses 
    };
  });

  return (
    <div className="space-y-6 text-foreground">
      <PageHeader
        title={t('pmAccountingDashboard.title')}
        description={t('pmAccountingDashboard.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/' },
          { label: t('nav.accounting'), href: '/accounting' },
        ]}
      />

      {/* QUICK ACTIONS BAR */}
      <div className="flex flex-wrap gap-2.5 p-3.5 bg-card border rounded-2xl">
        <Button size="sm" onClick={() => navigate({ to: '/accounting/income' })} className="flex items-center gap-1">
          <Plus className="w-4 h-4" /> {t('pmAccountingDashboard.recordIncome')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate({ to: '/accounting/expenses' })} className="flex items-center gap-1">
          <Plus className="w-4 h-4" /> {t('pmAccountingDashboard.recordExpense')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate({ to: '/accounting/chart-of-accounts' })} className="flex items-center gap-1">
          <Plus className="w-4 h-4" /> {t('pmAccountingDashboard.coa')}
        </Button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash Balance */}
        <Card 
          onClick={() => setSelectedMetric('cashBalance')}
          className="p-5 border bg-card flex flex-col justify-between cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative group"
        >
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('pmAccountingDashboard.cashBalance')}</p>
            <p className="text-2xl font-black mt-1 text-emerald-500">${cashBalance.toLocaleString()}</p>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold mt-4">{t('pmAccountingDashboard.cashSubtitle')}</span>
        </Card>

        {/* Total Income YTD */}
        <Card 
          onClick={() => setSelectedMetric('totalIncome')}
          className="p-5 border bg-card flex flex-col justify-between cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative group"
        >
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('pmAccountingDashboard.totalIncomeYtd')}</p>
            <p className="text-2xl font-black mt-1 text-emerald-500">${totalIncome.toLocaleString()}</p>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold mt-4">{t('pmAccountingDashboard.incomeSubtitle')}</span>
        </Card>

        {/* Total Expenses YTD */}
        <Card 
          onClick={() => setSelectedMetric('totalExpenses')}
          className="p-5 border bg-card flex flex-col justify-between cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative group"
        >
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('pmAccountingDashboard.totalExpensesYtd')}</p>
            <p className="text-2xl font-black mt-1 text-rose-500">${totalExpenses.toLocaleString()}</p>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold mt-4">{t('pmAccountingDashboard.expensesSubtitle')}</span>
        </Card>

        {/* Net Profit Margin */}
        <Card 
          onClick={() => setSelectedMetric('netProfit')}
          className="p-5 border bg-card flex flex-col justify-between cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative group"
        >
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('pmAccountingDashboard.netProfitMargin')}</p>
            <p className="text-2xl font-black mt-1 text-emerald-500">${netProfit.toLocaleString()}</p>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold mt-4">{t('pmAccountingDashboard.profitSubtitle')}</span>
        </Card>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Income vs Expenses Bar Chart */}
        <Card className="lg:col-span-2 p-6 border bg-card">
          <h3 className="font-extrabold text-sm uppercase mb-4 tracking-wider">{t('pmAccountingDashboard.monthlyFinancialPayouts')}</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--foreground), 0.05)" />
                <XAxis dataKey="month" stroke="currentColor" fontSize={11} opacity={0.6} />
                <YAxis stroke="currentColor" fontSize={11} opacity={0.6} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }} formatter={(val: any) => [`$${Number(val).toLocaleString()}`]} />
                <Legend />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Profit margins trend */}
        <Card className="lg:col-span-1 p-6 border bg-card">
          <h3 className="font-extrabold text-sm uppercase mb-4 tracking-wider">{t('pmAccountingDashboard.netProfitTrend')}</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData.map(d => ({ month: d.month, Profit: d.Income - d.Expenses }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--foreground), 0.05)" />
                <XAxis dataKey="month" stroke="currentColor" fontSize={11} opacity={0.6} />
                <YAxis stroke="currentColor" fontSize={11} opacity={0.6} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }} formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Net Margin']} />
                <Line type="monotone" dataKey="Profit" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

      </div>

      {/* BOTTOM SEGMENTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pending Bills */}
        <Card className="p-5 border bg-card space-y-4">
          <h3 className="font-extrabold text-sm uppercase border-b pb-3 tracking-wider">Pending Vendor Bills</h3>
          <div className="divide-y space-y-3">
            {bills.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No pending vendor bills recorded.</p>
            ) : (
              bills.slice(0, 3).map((bill: any) => (
                <div key={bill.id} className="pt-3 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold">{bill.vendorName}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">Due: {bill.dueDate} • NO: {bill.billNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-rose-500">${Number(bill.amount || 0).toLocaleString()}</p>
                    <span className="text-[9px] text-muted-foreground font-bold">{bill.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Bank Reconciliation Status */}
        <Card className="p-5 border bg-card space-y-4">
          <h3 className="font-extrabold text-sm uppercase border-b pb-3 tracking-wider">Bank Reconciliation Status</h3>
          <div className="space-y-4 text-xs font-semibold pt-2">
            <p className="text-muted-foreground">Reconciliation period closing: Active Ledger</p>
            <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-3 rounded-xl">
              <span>Cleared Statement Balance:</span>
              <span className="font-black text-sm">${cashBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => navigate({ to: '/accounting/reconciliation' })} className="flex items-center gap-1.5 text-xs">
                Run Reconciliation Matcher <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

      </div>

      {/* ACCOUNTING METRIC DETAILS MODAL */}
      <AccountingMetricModal
        open={!!selectedMetric}
        metricType={selectedMetric}
        summaryData={{
          cashBalance,
          totalIncome,
          totalExpenses,
          netProfit,
        }}
        onClose={() => setSelectedMetric(null)}
      />
    </div>
  );
};

export default AccountingDashboardPage;

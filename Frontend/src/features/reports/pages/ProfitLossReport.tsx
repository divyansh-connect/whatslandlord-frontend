import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../services/reportApi';
import { ReportLayout } from '../components/ReportLayout';
import { ReportFilters } from '../components/ReportFilters';
import { ExportActions } from '../components/ExportActions';
import { ReportTable } from '../components/ReportTable';
import { ReportDetailsModal } from '../components/ReportDetailsModal';
import { useReportFilters } from '../hooks/useReportFilters';
import { useReportExport } from '../hooks/useReportExport';
import { useReportDataFilter } from '../hooks/useReportDataFilter';
import { DollarSign, TrendingUp, TrendingDown, Eye } from 'lucide-react';

export const ProfitLossReport: React.FC = () => {
  const { filters, setFilterVal, resetFilters } = useReportFilters('date');
  const { isExporting, handleExport } = useReportExport();
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // Query P&L data (always fetch live DB data on mount, zero fake fallback)
  const { data, isLoading } = useQuery({
    queryKey: ['report-profit-loss', filters.propertyId],
    queryFn: () => reportApi.getProfitLoss(filters),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const pl = data?.data || { income: [], expenses: [], transactions: [], summary: { totalIncome: 0, totalExpenses: 0, netProfit: 0 } };
  const rawTransactions = (data as any)?.transactions || pl.transactions || [];
  const filteredTransactions = useReportDataFilter(rawTransactions, filters);

  // Apply column sorting
  const sortedTransactions = [...filteredTransactions].sort((a: any, b: any) => {
    const sortBy = filters.sortBy || 'date';
    const order = filters.sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'amount') {
      return ((Number(a.amount) || 0) - (Number(b.amount) || 0)) * order;
    }
    if (sortBy === 'propertyName' || sortBy === 'unitNumber' || sortBy === 'category' || sortBy === 'type' || sortBy === 'description') {
      return String(a[sortBy] || '').localeCompare(String(b[sortBy] || '')) * order;
    }
    const dateA = a.date && a.date !== 'N/A' ? new Date(a.date).getTime() : 0;
    const dateB = b.date && b.date !== 'N/A' ? new Date(b.date).getTime() : 0;
    return (dateA - dateB) * order;
  });

  // Strictly compute KPI totals and category breakdowns from active filtered transactions (0 when empty, no fallback)
  const displayIncome = filteredTransactions
    .filter((t: any) => t.type === 'Income')
    .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);

  const displayExpenses = filteredTransactions
    .filter((t: any) => t.type === 'Expense')
    .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);

  const displayNetProfit = displayIncome - displayExpenses;

  const incomeCategoryMap: Record<string, number> = {};
  const expenseCategoryMap: Record<string, number> = {};

  filteredTransactions.forEach((t: any) => {
    const amt = Number(t.amount || 0);
    if (amt <= 0) return;
    const cat = t.category || (t.type === 'Income' ? 'Rental Revenue' : 'Property Maintenance & Repairs');
    if (t.type === 'Income') {
      incomeCategoryMap[cat] = (incomeCategoryMap[cat] || 0) + amt;
    } else if (t.type === 'Expense') {
      expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + amt;
    }
  });

  const incomeCategories = Object.keys(incomeCategoryMap).map((name) => ({
    name,
    amount: incomeCategoryMap[name],
  }));

  const expenseCategories = Object.keys(expenseCategoryMap).map((name) => ({
    name,
    amount: expenseCategoryMap[name],
  }));

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (row: any) => (row.date && row.date !== 'N/A' ? new Date(row.date).toLocaleDateString() : 'N/A'),
    },
    { key: 'description', header: 'Description' },
    { key: 'propertyName', header: 'Property' },
    { key: 'unitNumber', header: 'Unit' },
    { key: 'category', header: 'Category' },
    {
      key: 'type',
      header: 'Type',
      render: (row: any) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${row.type === 'Income'
              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
            }`}
        >
          {row.type}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: any) => (
        <span
          className={`font-black ${row.type === 'Income'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
            }`}
        >
          {row.type === 'Income' ? '+' : '-'}${Number(row.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <button
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
          title="View Details"
          onClick={() => setSelectedRow(row)}
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <ReportLayout
      title="Profit & Loss Statement"
      description="Attributed general ledger statement showing operating profits and overhead expenses."
    >
      <ExportActions
        onExport={(fileType) =>
          handleExport({
            reportType: 'PROFIT_LOSS',
            filters,
            data: sortedTransactions,
            totalRecords: sortedTransactions.length,
            fileType,
          })
        }
        isExporting={isExporting}
      />

      <ReportFilters
        filters={filters}
        onChange={setFilterVal}
        onReset={resetFilters}
        showDateFilters={false}
        showStatusFilter={true}
        statusOptions={['Income', 'Expense']}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Income Card */}
        <div className="p-6 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">Total Income</span>
            <h3 className="text-2xl font-black text-green-900 dark:text-green-300 mt-1">
              ${displayIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-xl text-green-700 dark:text-green-300">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Expenses Card */}
        <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">Total Expenses</span>
            <h3 className="text-2xl font-black text-red-900 dark:text-red-300 mt-1">
              ${displayExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-xl text-red-700 dark:text-red-300">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Net Profit Card */}
        <div className={`p-6 border rounded-2xl flex items-center justify-between ${displayNetProfit >= 0
            ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300'
            : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
          }`}>
          <div>
            <span className="text-xs font-bold uppercase tracking-wide">Net Profit</span>
            <h3 className="text-2xl font-black mt-1">
              ${displayNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Category Breakdown Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        {/* Income Category List */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-2">
            Revenues
          </h4>
          {incomeCategories.length === 0 ? (
            <p className="text-xs text-slate-400">No revenue records found.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              {incomeCategories.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">{item.name}</span>
                  <span className="font-bold text-green-600">${Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expense Category List */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-2">
            Operating Expenses
          </h4>
          {expenseCategories.length === 0 ? (
            <p className="text-xs text-slate-400">No expense records found.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              {expenseCategories.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">{item.name}</span>
                  <span className="font-bold text-red-500">${Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Itemized Transactions Table */}
      <div className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Statement Ledger Transactions
          </h4>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {sortedTransactions.length} records found
          </span>
        </div>
        <ReportTable
          columns={columns}
          data={sortedTransactions}
          isLoading={isLoading}
          pagination={(data as any)?.pagination}
          onPageChange={(page) => setFilterVal('page', page)}
          onSort={(key) => {
            const order = filters.sortBy === key && filters.sortOrder === 'asc' ? 'desc' : 'asc';
            setFilterVal('sortBy', key);
            setFilterVal('sortOrder', order);
          }}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
        />
      </div>

      {selectedRow && (
        <ReportDetailsModal
          title="Transaction Details"
          data={selectedRow}
          columns={columns}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </ReportLayout>
  );
};
export default ProfitLossReport;

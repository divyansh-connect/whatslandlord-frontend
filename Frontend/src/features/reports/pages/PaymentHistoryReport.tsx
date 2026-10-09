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
import { DollarSign, CreditCard, CheckCircle2, TrendingUp, Eye } from 'lucide-react';

export const PaymentHistoryReport: React.FC = () => {
  const { filters, setFilterVal, resetFilters } = useReportFilters('paymentDate');
  const { isExporting, handleExport } = useReportExport();
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // Query Payment History data
  const { data, isLoading } = useQuery({
    queryKey: ['report-payment-history', filters],
    queryFn: () => reportApi.getPaymentHistory(filters),
  });

  const reportItems = data?.data || [];
  const summary = data?.summary || {
    totalCollectedAmount: reportItems.reduce((acc, curr) => acc + (curr.amount || 0), 0),
    totalTransactions: data?.pagination?.totalRecords || reportItems.length,
    averageTransaction: reportItems.length > 0 ? Math.round(reportItems.reduce((acc, curr) => acc + (curr.amount || 0), 0) / reportItems.length) : 0,
    topMethod: reportItems.length > 0 ? reportItems[0].paymentMethod || 'ACH' : 'N/A',
  };

  const columns = [
    { key: 'tenantName', header: 'Tenant Name' },
    { key: 'propertyName', header: 'Property' },
    { key: 'unitNumber', header: 'Unit' },
    {
      key: 'paymentDate',
      header: 'Payment Date',
      render: (row: any) => (row.paymentDate && row.paymentDate !== 'N/A' ? new Date(row.paymentDate).toLocaleDateString() : 'N/A'),
    },
    {
      key: 'amount',
      header: 'Amount Paid',
      render: (row: any) => `$${Number(row.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    { key: 'paymentMethod', header: 'Payment Method' },
    { key: 'referenceNumber', header: 'Reference/Check #' },
    {
      key: 'paymentStatus',
      header: 'Status',
      render: (row: any) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            row.paymentStatus === 'Paid' || row.paymentStatus === 'Cleared'
              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
          }`}
        >
          {row.paymentStatus}
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
      title="Payment History Report"
      description="List of all completed rental payments and transaction references."
    >
      <ExportActions
        onExport={(fileType) =>
          handleExport({
            reportType: 'PAYMENT_HISTORY',
            filters,
            data: reportItems,
            totalRecords: data?.pagination.totalRecords || reportItems.length,
            fileType,
          })
        }
        isExporting={isExporting}
      />

      <ReportFilters
        filters={filters}
        onChange={setFilterVal}
        onReset={resetFilters}
        showStatusFilter={true}
        statusOptions={['Paid', 'Pending', 'PartiallyPaid', 'Failed', 'Refunded']}
        showPaymentMethodFilter={true}
        paymentMethodOptions={['ACH', 'CreditCard', 'DebitCard', 'BankTransfer', 'WireTransfer', 'Cash', 'Check', 'MoneyOrder', 'Zelle']}
      />

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-teal-700 dark:text-teal-400 uppercase tracking-wide">Total Collected Revenue</span>
            <h3 className="text-2xl font-black text-teal-950 dark:text-teal-200 mt-0.5">
              ${summary.totalCollectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 bg-teal-100 dark:bg-teal-900/40 rounded-lg text-teal-700 dark:text-teal-300">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Total Payments Count</span>
            <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-200 mt-0.5">
              {summary.totalTransactions} Transactions
            </h3>
          </div>
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">Avg Transaction Size</span>
            <h3 className="text-xl font-black text-indigo-950 dark:text-indigo-200 mt-0.5">
              ${summary.averageTransaction.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-700 dark:text-indigo-300">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Top Payment Method</span>
            <h3 className="text-xl font-black text-blue-950 dark:text-blue-200 mt-0.5">
              {summary.topMethod}
            </h3>
          </div>
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-700 dark:text-blue-300">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      <ReportTable
        columns={columns}
        data={reportItems}
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={(page) => setFilterVal('page', page)}
        onSort={(key) => {
          const order = filters.sortBy === key && filters.sortOrder === 'asc' ? 'desc' : 'asc';
          setFilterVal('sortBy', key);
          setFilterVal('sortOrder', order);
        }}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
      />

      {selectedRow && (
        <ReportDetailsModal
          title="Payment Details"
          data={selectedRow}
          columns={columns}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </ReportLayout>
  );
};
export default PaymentHistoryReport;

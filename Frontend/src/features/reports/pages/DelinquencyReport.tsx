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
import { AlertTriangle, Users, FileText, Clock, Eye } from 'lucide-react';

export const DelinquencyReport: React.FC = () => {
  const { filters, setFilterVal, resetFilters } = useReportFilters('dueDate');
  const { isExporting, handleExport } = useReportExport();
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // Query Delinquency data
  const { data, isLoading } = useQuery({
    queryKey: ['report-delinquency', filters],
    queryFn: () => reportApi.getDelinquency(filters),
  });

  const reportItems = data?.data || [];
  const summary = data?.summary || {
    totalDelinquentBalance: reportItems.reduce((acc, curr) => acc + (curr.outstandingBalance || 0), 0),
    totalOriginalAmount: reportItems.reduce((acc, curr) => acc + (curr.rentAmount || 0), 0),
    totalDelinquentTenants: new Set(reportItems.map((i) => i.tenantName)).size,
    totalDelinquentInvoices: data?.pagination?.totalRecords || reportItems.length,
    averageDaysLate: reportItems.length > 0 ? Math.round(reportItems.reduce((acc, curr) => acc + (curr.daysLate || 0), 0) / reportItems.length) : 0,
  };

  const columns = [
    { key: 'tenantName', header: 'Tenant Name' },
    { key: 'propertyName', header: 'Property' },
    { key: 'unitNumber', header: 'Unit' },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (row: any) => (row.dueDate && row.dueDate !== 'N/A' ? new Date(row.dueDate).toLocaleDateString() : 'N/A'),
    },
    {
      key: 'rentAmount',
      header: 'Amount Due',
      render: (row: any) => `$${Number(row.rentAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'paidAmount',
      header: 'Paid Amount',
      render: (row: any) => `$${Number(row.paidAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'outstandingBalance',
      header: 'Outstanding Balance',
      render: (row: any) => (
        <span className="font-bold text-rose-600 dark:text-rose-400">
          ${Number(row.outstandingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'daysLate',
      header: 'Days Late',
      render: (row: any) => (
        <span className="font-extrabold text-amber-600 dark:text-amber-400">{row.daysLate} Days</span>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Status',
      render: (row: any) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
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
      title="Delinquency Report"
      description="Track outstanding invoice balances, overdue fees, and payment delays per tenant."
    >
      <ExportActions
        onExport={(fileType) =>
          handleExport({
            reportType: 'DELINQUENCY',
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
        statusOptions={['Unpaid', 'Overdue', 'Partially Paid']}
      />

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wide">Total Overdue Balance</span>
            <h3 className="text-2xl font-black text-rose-950 dark:text-rose-200 mt-0.5">
              ${summary.totalDelinquentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 bg-rose-100 dark:bg-rose-900/40 rounded-lg text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Delinquent Tenants</span>
            <h3 className="text-xl font-black text-amber-950 dark:text-amber-200 mt-0.5">
              {summary.totalDelinquentTenants} Tenants
            </h3>
          </div>
          <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-700 dark:text-amber-300">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Overdue Invoices</span>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {summary.totalDelinquentInvoices} Invoices
            </h3>
          </div>
          <div className="p-2.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Avg Days Past Due</span>
            <h3 className="text-xl font-black text-orange-950 dark:text-orange-200 mt-0.5">
              {summary.averageDaysLate} Days
            </h3>
          </div>
          <div className="p-2.5 bg-orange-100 dark:bg-orange-900/40 rounded-lg text-orange-700 dark:text-orange-300">
            <Clock className="w-5 h-5" />
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
          title="Delinquency Details"
          data={selectedRow}
          columns={columns}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </ReportLayout>
  );
};
export default DelinquencyReport;

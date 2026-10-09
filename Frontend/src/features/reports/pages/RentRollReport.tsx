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
import { DollarSign, Building2, CheckCircle2, ShieldCheck, Eye } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

export const RentRollReport: React.FC = () => {
  const { filters, setFilterVal, resetFilters } = useReportFilters('startDate');
  const { isExporting, handleExport } = useReportExport();
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // Query Rent Roll data
  const { data, isLoading } = useQuery({
    queryKey: ['report-rent-roll', filters],
    queryFn: () => reportApi.getRentRoll(filters),
  });

  const reportItems = data?.data || [];
  const summary = data?.summary || {
    totalMonthlyRent: reportItems.reduce((acc, curr) => acc + (curr.monthlyRent || 0), 0),
    totalSecurityDeposits: reportItems.reduce((acc, curr) => acc + (curr.securityDeposit || 0), 0),
    occupiedCount: reportItems.filter((i) => i.unitStatus === 'Occupied' || i.leaseStatus === 'Active').length,
    vacantCount: Math.max(0, reportItems.length - reportItems.filter((i) => i.unitStatus === 'Occupied' || i.leaseStatus === 'Active').length),
    totalUnits: data?.pagination?.totalRecords || reportItems.length,
  };

  const columns = [
    { key: 'propertyName', header: 'Property Name' },
    { key: 'unitNumber', header: 'Unit Number' },
    { key: 'tenantName', header: 'Tenant Name' },
    {
      key: 'startDate',
      header: 'Start Date',
      render: (row: any) => (row.startDate && row.startDate !== 'N/A' ? new Date(row.startDate).toLocaleDateString() : 'N/A'),
    },
    {
      key: 'endDate',
      header: 'End Date',
      render: (row: any) => (row.endDate && row.endDate !== 'N/A' ? new Date(row.endDate).toLocaleDateString() : 'N/A'),
    },
    {
      key: 'leaseStatus',
      header: 'Lease Status',
      render: (row: any) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            row.leaseStatus === 'Active'
              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
          }`}
        >
          {row.leaseStatus}
        </span>
      ),
    },
    {
      key: 'monthlyRent',
      header: 'Monthly Rent',
      render: (row: any) => `$${Number(row.monthlyRent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'securityDeposit',
      header: 'Security Deposit',
      render: (row: any) => `$${Number(row.securityDeposit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'unitStatus',
      header: 'Unit Status',
      render: (row: any) => (
        <span
          className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
            row.unitStatus === 'Occupied'
              ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          {row.unitStatus}
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
      title="Rent Roll Report"
      description="Detailed breakdown of active rents, security deposits, and unit vacancy status across properties."
    >
      <ExportActions
        onExport={(fileType) =>
          handleExport({
            reportType: 'RENT_ROLL',
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
        statusOptions={['Active', 'Draft', 'Expired', 'Terminated', 'Ended']}
      />

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Total Monthly Rent</span>
            <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-200 mt-0.5">
              ${summary.totalMonthlyRent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-700 dark:text-emerald-300">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">Security Deposits Held</span>
            <h3 className="text-xl font-black text-indigo-950 dark:text-indigo-200 mt-0.5">
              ${summary.totalSecurityDeposits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-700 dark:text-indigo-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Portfolio Units</span>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {summary.totalUnits} Units
            </h3>
          </div>
          <div className="p-2.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Occupied / Vacant</span>
            <h3 className="text-xl font-black text-blue-950 dark:text-blue-200 mt-0.5">
              {summary.occupiedCount} Occ / {summary.vacantCount} Vac
            </h3>
          </div>
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-700 dark:text-blue-300">
            <CheckCircle2 className="w-5 h-5" />
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
          title="Rent Roll Details"
          data={selectedRow}
          columns={columns}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </ReportLayout>
  );
};
export default RentRollReport;

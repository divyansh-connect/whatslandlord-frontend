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
import { Wrench, DollarSign, CheckCircle2, Clock, Eye } from 'lucide-react';

export const MaintenanceReport: React.FC = () => {
  const { filters, setFilterVal, resetFilters } = useReportFilters('createdAt');
  const { isExporting, handleExport } = useReportExport();
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // Query Maintenance data
  const { data, isLoading } = useQuery({
    queryKey: ['report-maintenance', filters],
    queryFn: () => reportApi.getMaintenance(filters),
  });

  const reportItems = data?.data || [];
  const summary = data?.summary || {
    totalWorkOrders: data?.pagination?.totalRecords || reportItems.length,
    totalEstimatedCost: reportItems.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0),
    totalActualCost: reportItems.reduce((acc, curr) => acc + (curr.actualCost || curr.estimatedCost || 0), 0),
    completedCount: reportItems.filter((i) => i.status === 'Completed' || i.status === 'Closed').length,
    inProgressCount: reportItems.filter((i) => i.status === 'InProgress' || i.status === 'Assigned').length,
    openCount: reportItems.filter((i) => i.status === 'Open').length,
    completionRate: reportItems.length > 0 ? parseFloat(((reportItems.filter((i) => i.status === 'Completed' || i.status === 'Closed').length / reportItems.length) * 100).toFixed(1)) : 0.0,
  };

  const columns = [
    { key: 'ticketId', header: 'Ticket ID' },
    { key: 'propertyName', header: 'Property' },
    { key: 'unitNumber', header: 'Unit' },
    { key: 'issue', header: 'Issue' },
    {
      key: 'priority',
      header: 'Priority',
      render: (row: any) => (
        <span
          className={`px-2.5 py-0.5 rounded text-xs font-bold ${
            row.priority === 'Emergency' || row.priority === 'High'
              ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          {row.priority}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            row.status === 'Completed'
              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    { key: 'assignedPerson', header: 'Assigned Staff' },
    { key: 'vendor', header: 'Vendor' },
    {
      key: 'estimatedCost',
      header: 'Est. Cost',
      render: (row: any) => `$${Number(row.estimatedCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'actualCost',
      header: 'Actual Cost',
      render: (row: any) => `$${Number(row.actualCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'createdDate',
      header: 'Created Date',
      render: (row: any) => (row.createdDate && row.createdDate !== 'N/A' ? new Date(row.createdDate).toLocaleDateString() : 'N/A'),
    },
    {
      key: 'completedDate',
      header: 'Completed Date',
      render: (row: any) =>
        row.completedDate && row.completedDate !== 'N/A' ? new Date(row.completedDate).toLocaleDateString() : 'Pending',
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
      title="Maintenance Log Report"
      description="Track maintenance jobs, staff/vendor performance, and repair cost balances."
    >
      <ExportActions
        onExport={(fileType) =>
          handleExport({
            reportType: 'MAINTENANCE',
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
        statusOptions={['Open', 'Assigned', 'InProgress', 'Completed', 'Closed']}
        showPriorityFilter={true}
        priorityOptions={['Low', 'Normal', 'High', 'Emergency']}
      />

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Maintenance Requests</span>
            <h3 className="text-xl font-black text-orange-950 dark:text-orange-200 mt-0.5">
              {summary.totalWorkOrders} Jobs
            </h3>
          </div>
          <div className="p-2.5 bg-orange-100 dark:bg-orange-900/40 rounded-lg text-orange-700 dark:text-orange-300">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wide">Total Repair Cost</span>
            <h3 className="text-xl font-black text-rose-950 dark:text-rose-200 mt-0.5">
              ${summary.totalActualCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 bg-rose-100 dark:bg-rose-900/40 rounded-lg text-rose-700 dark:text-rose-300">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Completed Work Orders</span>
            <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-200 mt-0.5">
              {summary.completedCount} Closed
            </h3>
          </div>
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Completion Rate</span>
            <h3 className="text-xl font-black text-blue-950 dark:text-blue-200 mt-0.5">
              {summary.completionRate}%
            </h3>
          </div>
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-700 dark:text-blue-300">
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
          title="Maintenance Details"
          data={selectedRow}
          columns={columns}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </ReportLayout>
  );
};
export const ReportReport = MaintenanceReport;
export default ReportReport;

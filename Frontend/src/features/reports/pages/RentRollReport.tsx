import React, { useState, useMemo } from 'react';
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
import { DollarSign, TrendingUp, TrendingDown, ShieldCheck, Eye } from 'lucide-react';

export const RentRollReport: React.FC = () => {
  const { filters, setFilterVal, resetFilters } = useReportFilters('startDate');
  const { isExporting, handleExport } = useReportExport();
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // Query Rent Roll data
  const { data, isLoading } = useQuery({
    queryKey: ['report-rent-roll', filters],
    queryFn: () => reportApi.getRentRoll(filters),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const reportItems = data?.data || [];
  const filteredReportItems = useReportDataFilter(reportItems, filters);

  const summary = useMemo(() => {
    let totalActualRent = 0;
    let totalPotentialRent = 0;
    let totalVacancyLoss = 0;
    let totalSecurityDeposits = 0;

    filteredReportItems.forEach((curr: any) => {
      const isOccupied = curr.unitStatus === 'Occupied' || curr.leaseStatus === 'Active';
      const marketOrActiveRent = Number(curr.potentialRent ?? curr.monthlyRent ?? 0);
      const actual = isOccupied ? Number(curr.monthlyRent || marketOrActiveRent || 0) : 0;
      const loss = isOccupied ? 0 : Number(curr.vacancyLoss || marketOrActiveRent || 0);
      const potential = isOccupied ? actual : loss;
      const deposit = isOccupied ? Number(curr.securityDeposit || 0) : 0;

      totalActualRent += actual;
      totalPotentialRent += potential;
      totalVacancyLoss += loss;
      totalSecurityDeposits += deposit;
    });

    return {
      totalMonthlyRent: totalActualRent,
      totalPotentialRent,
      totalVacancyLoss,
      totalSecurityDeposits,
    };
  }, [filteredReportItems]);

  const columns = [
    { key: 'propertyName', header: 'Property Name' },
    { key: 'unitNumber', header: 'Unit Number' },
    {
      key: 'tenantName',
      header: 'Tenant Name',
      render: (row: any) => (!row.tenantName || row.tenantName === 'Vacant' ? 'N/A' : row.tenantName),
    },
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
      key: 'daysToExpiry',
      header: 'Days to Expiry',
      render: (row: any) => {
        const isOccupied = row.unitStatus === 'Occupied' || row.leaseStatus === 'Active';
        let label = row.daysToExpiry;
        let days = row.daysToExpiryNum;

        if ((!label || label === 'N/A') && row.endDate && row.endDate !== 'N/A' && (isOccupied || row.leaseStatus === 'Expired')) {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const endD = new Date(row.endDate);
          if (!isNaN(endD.getTime())) {
            endD.setHours(0, 0, 0, 0);
            days = Math.ceil((endD.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
            label = days < 0 ? `Expired (${Math.abs(days)}d ago)` : days === 0 ? 'Expires Today' : `${days} Days`;
          }
        }

        if (!label || label === 'N/A') {
          return <span className="text-xs text-slate-400">N/A</span>;
        }
        let badgeStyle = 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300';
        if (typeof days === 'number') {
          if (days < 0) {
            badgeStyle = 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800';
          } else if (days <= 30) {
            badgeStyle = 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300';
          } else if (days <= 60) {
            badgeStyle = 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300';
          } else if (days <= 90) {
            badgeStyle = 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300';
          }
        }
        return (
          <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeStyle}`}>
            {label}
          </span>
        );
      },
    },
    {
      key: 'leaseStatus',
      header: 'Lease Status',
      render: (row: any) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            row.leaseStatus === 'Active'
              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              : row.leaseStatus === 'Vacant'
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
          }`}
        >
          {row.leaseStatus}
        </span>
      ),
    },
    {
      key: 'potentialRent',
      header: 'Market / Potential Rent',
      render: (row: any) => (
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          ${Number(row.potentialRent ?? row.monthlyRent ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'monthlyRent',
      header: 'Actual Monthly Rent',
      render: (row: any) => {
        const isOccupied = row.unitStatus === 'Occupied' || row.leaseStatus === 'Active';
        const val = isOccupied ? Number(row.monthlyRent || 0) : 0;
        return (
          <span className={`font-bold ${val > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
            ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: 'vacancyLoss',
      header: 'Vacancy Loss',
      render: (row: any) => {
        const isOccupied = row.unitStatus === 'Occupied' || row.leaseStatus === 'Active';
        const loss = isOccupied ? 0 : Number(row.vacancyLoss || row.potentialRent || row.monthlyRent || 0);
        return (
          <span className={`font-bold ${loss > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
            {loss > 0 ? `-$${loss.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '$0.00'}
          </span>
        );
      },
    },
    {
      key: 'securityDeposit',
      header: 'Security Deposit Held',
      render: (row: any) => {
        const isOccupied = row.unitStatus === 'Occupied' || row.leaseStatus === 'Active';
        const dep = isOccupied ? Number(row.securityDeposit || 0) : 0;
        return `$${dep.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      },
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
      description="Detailed breakdown of active lease rents, potential market rents, vacancy loss, and security deposits held."
    >
      <ExportActions
        onExport={(fileType) =>
          handleExport({
            reportType: 'RENT_ROLL',
            filters,
            data: filteredReportItems,
            totalRecords: filteredReportItems.length,
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
        statusOptions={['Active', 'Occupied', 'Vacant', 'Pending Move In', 'Draft', 'Expired', 'Terminated', 'Ended']}
      />

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Total Actual Monthly Rent</span>
            <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-200 mt-0.5">
              ${summary.totalMonthlyRent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-700 dark:text-emerald-300">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Total Potential Rent</span>
            <h3 className="text-xl font-black text-blue-950 dark:text-blue-200 mt-0.5">
              ${summary.totalPotentialRent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-700 dark:text-blue-300">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wide">Total Vacancy Loss</span>
            <h3 className="text-xl font-black text-rose-950 dark:text-rose-200 mt-0.5">
              ${summary.totalVacancyLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 bg-rose-100 dark:bg-rose-900/40 rounded-lg text-rose-700 dark:text-rose-300">
            <TrendingDown className="w-5 h-5" />
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
      </div>

      <ReportTable
        columns={columns}
        data={filteredReportItems}
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

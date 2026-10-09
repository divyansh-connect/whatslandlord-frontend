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
import { Percent, Building2, CheckCircle2, AlertCircle, Eye } from 'lucide-react';

export const OccupancyReport: React.FC = () => {
  const { filters, setFilterVal, resetFilters } = useReportFilters('propertyName');
  const { isExporting, handleExport } = useReportExport();
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // Query Occupancy data
  const { data, isLoading } = useQuery({
    queryKey: ['report-occupancy', filters],
    queryFn: () => reportApi.getOccupancy(filters),
  });

  const reportItems = data?.data || [];
  const summary = data?.summary || {
    portfolioTotalUnits: reportItems.reduce((acc, curr) => acc + (curr.totalUnits || 0), 0),
    portfolioOccupiedUnits: reportItems.reduce((acc, curr) => acc + (curr.occupiedUnits || 0), 0),
    portfolioVacantUnits: reportItems.reduce((acc, curr) => acc + (curr.vacantUnits || 0), 0),
    portfolioMaintenanceUnits: 0,
    overallOccupancyPercentage:
      reportItems.reduce((acc, curr) => acc + (curr.totalUnits || 0), 0) > 0
        ? parseFloat(
            (
              (reportItems.reduce((acc, curr) => acc + (curr.occupiedUnits || 0), 0) /
                reportItems.reduce((acc, curr) => acc + (curr.totalUnits || 0), 0)) *
              100
            ).toFixed(1)
          )
        : 0.0,
    totalProperties: data?.pagination?.totalRecords || reportItems.length,
  };

  const columns = [
    { key: 'propertyName', header: 'Property Name' },
    { key: 'totalUnits', header: 'Total Units' },
    { key: 'occupiedUnits', header: 'Occupied Units' },
    { key: 'vacantUnits', header: 'Vacant Units' },
    {
      key: 'occupancyPercentage',
      header: 'Occupancy Percentage',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 transition-all ${
                row.occupancyPercentage >= 80
                  ? 'bg-emerald-500'
                  : row.occupancyPercentage >= 50
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, row.occupancyPercentage)}%` }}
            ></div>
          </div>
          <span className="font-bold text-xs">{row.occupancyPercentage}%</span>
        </div>
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
      title="Occupancy Report"
      description="Detailed analysis of unit occupancy levels and vacancies across your properties."
    >
      <ExportActions
        onExport={(fileType) =>
          handleExport({
            reportType: 'OCCUPANCY',
            filters,
            data: reportItems,
            totalRecords: data?.pagination.totalRecords || reportItems.length,
            fileType,
          })
        }
        isExporting={isExporting}
      />

      <ReportFilters filters={filters} onChange={setFilterVal} onReset={resetFilters} />

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">Overall Occupancy Rate</span>
            <h3 className="text-2xl font-black text-indigo-950 dark:text-indigo-200 mt-0.5">
              {summary.overallOccupancyPercentage}%
            </h3>
          </div>
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-700 dark:text-indigo-300">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Portfolio Units</span>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {summary.portfolioTotalUnits} Units
            </h3>
          </div>
          <div className="p-2.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Occupied Units</span>
            <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-200 mt-0.5">
              {summary.portfolioOccupiedUnits} Occupied
            </h3>
          </div>
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wide">Vacant Units</span>
            <h3 className="text-xl font-black text-rose-950 dark:text-rose-200 mt-0.5">
              {summary.portfolioVacantUnits} Vacant
            </h3>
          </div>
          <div className="p-2.5 bg-rose-100 dark:bg-rose-900/40 rounded-lg text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      <ReportTable
        columns={columns}
        data={reportItems}
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={(page) => setFilterVal('page', page)}
      />

      {selectedRow && (
        <ReportDetailsModal
          title="Occupancy Details"
          data={selectedRow}
          columns={columns}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </ReportLayout>
  );
};
export default OccupancyReport;

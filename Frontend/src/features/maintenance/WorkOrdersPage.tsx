import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { WorkOrder } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Eye, Download, Clock } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { extractPreferredVisit } from '../../utils/maintenanceHelpers';

export const WorkOrdersPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Queries
  const { data: workOrders = [], isLoading } = useQuery({ queryKey: ['work-orders-list'], queryFn: () => api.workOrders.getAll() });

  const filteredOrders = workOrders.filter((w) => {
    const numVal = w.workOrderNumber || '';
    const vendorVal = w.vendorName || '';
    const searchMatch = numVal.toLowerCase().includes(searchQuery.toLowerCase()) || vendorVal.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = statusFilter === '' || w.status === statusFilter;
    return searchMatch && statusMatch;
  });

  const handleExport = () => {
    const headers = 'ID,WO Number,Property,Unit,Vendor,Tech,Scheduled Date,Est Cost,Actual Cost,Status\n';
    const rows = filteredOrders
      .slice(0, 500)
      .map(
        (w) =>
          `"${w.id}","${w.workOrderNumber}","${w.propertyName}","${w.unitNumber}","${w.vendorName}","${w.assignedTechnician}","${w.scheduledDate}","${w.estimatedCost}","${w.actualCost}","${w.status}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'Work_Orders.csv');
    a.click();
  };

  const columns: ColumnDef<WorkOrder>[] = [
    {
      accessorKey: 'workOrderNumber',
      header: t('maintenanceRequests.requestNo'),
      id: 'workOrderNumber',
      cell: ({ row }) => {
        const num = row.original.workOrderNumber;
        const displayNum = num && !num.includes('-') && num.length < 15 ? (num.startsWith('#') ? num : `#${num}`) : `#WO-${1001 + row.index}`;
        return (
          <span onClick={() => navigate({ to: `/maintenance/work-orders/${row.original.id}` })} className="font-bold text-primary hover:underline cursor-pointer">
            {displayNum}
          </span>
        );
      },
    },
    { 
      accessorKey: 'propertyName', 
      header: t('maintenanceRequests.propertyLocation'), 
      id: 'property',
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.propertyName || 'Property'}</span>
    },
    { 
      accessorKey: 'unitNumber', 
      header: t('maintenanceRequests.unit'), 
      id: 'unit',
      cell: ({ row }) => <span>{row.original.unitNumber || 'Unit 101'}</span>
    },
    { 
      accessorKey: 'vendorName', 
      header: t('maintenanceWorkOrders.contractorVendor'), 
      id: 'vendor',
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.vendorName || 'Unassigned'}</span>
    },
    { 
      accessorKey: 'assignedTechnician', 
      header: t('maintenanceWorkOrders.assignedTech'), 
      id: 'tech',
      cell: ({ row }) => <span className="font-medium text-muted-foreground">{row.original.assignedTechnician || 'Unassigned'}</span>
    },
    { 
      accessorKey: 'scheduledDate', 
      header: t('maintenanceWorkOrders.scheduledDate'), 
      id: 'date',
      cell: ({ row }) => {
        const pref = extractPreferredVisit(row.original);
        return (
          <div className="space-y-1">
            <span>{row.original.scheduledDate || 'N/A'}</span>
            {pref && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 whitespace-nowrap block w-fit">
                <Clock className="w-2.5 h-2.5 text-amber-500" /> Pref: {pref}
              </span>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: 'estimatedCost',
      header: t('maintenanceWorkOrders.estCost'),
      id: 'estCost',
      cell: ({ row }) => <span className="font-semibold text-foreground">${(row.original.estimatedCost || 0).toLocaleString()}</span>,
    },
    {
      accessorKey: 'actualCost',
      header: t('maintenanceWorkOrders.actualCost'),
      id: 'actCost',
      cell: ({ row }) => (
        <span className="font-extrabold text-rose-500">
          ${((row.original.actualCost || 0) + (row.original.extraExpenses || 0)).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('maintenanceRequests.status'),
      id: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: t('maintenanceRequests.actions'),
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: `/maintenance/work-orders/${row.original.id}` })} title="View Detail">
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('maintenanceWorkOrders.title')}
        description={t('maintenanceWorkOrders.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/' },
          { label: t('nav.maintenance'), href: '/maintenance' },
          { label: t('maintenanceWorkOrders.title') },
        ]}
      />

      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold text-muted-foreground uppercase">
          {t('maintenanceWorkOrders.totalFound', { count: filteredOrders.length })}
        </span>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-xs font-semibold flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search work orders by number or vendor..."
        filters={[
          {
            key: 'status',
            value: statusFilter,
            placeholder: 'All Statuses',
            options: [
              { label: 'Draft', value: 'Draft' },
              { label: 'Assigned', value: 'Assigned' },
              { label: 'Scheduled', value: 'Scheduled' },
              { label: 'In Progress', value: 'In Progress' },
              { label: 'Waiting', value: 'Waiting' },
              { label: 'Completed', value: 'Completed' },
              { label: 'Closed', value: 'Closed' },
              { label: 'Cancelled', value: 'Cancelled' },
            ],
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'status') setStatusFilter(val);
        }}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('');
        }}
      />

      <DataTable columns={columns} data={filteredOrders.slice(0, 100)} loading={isLoading} />
    </div>
  );
};
export default WorkOrdersPage;

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { MaintenanceRequest } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { RequestPriorityBadge } from '../../components/MaintenanceComponents';
import { StatusBadge } from '../../components/StatusBadge';
import { Plus, Eye, Trash2, Download, Clock } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { extractPreferredVisit } from '../../utils/maintenanceHelpers';

import { getFormattedRequestNumber } from '../../utils/format';

export const RequestsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Queries
  const { data: requests = [], isLoading } = useQuery({ queryKey: ['service-requests-list'], queryFn: () => api.serviceRequests.getAll() });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.serviceRequests.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests-list'] });
      setDeleteId(null);
    },
  });

  const filteredRequests = requests.filter((r) => {
    const titleVal = r.title || '';
    const tenantVal = r.tenantName || '';
    const searchMatch = titleVal.toLowerCase().includes(searchQuery.toLowerCase()) || tenantVal.toLowerCase().includes(searchQuery.toLowerCase());
    const prioMatch = priorityFilter === '' || r.priority === priorityFilter;
    const statusMatch = statusFilter === '' || r.status === statusFilter;
    return searchMatch && prioMatch && statusMatch;
  });

  const handleExport = () => {
    const headers = 'ID,Title,Property,Unit,Tenant,Priority,Status,Created At\n';
    const rows = filteredRequests
      .slice(0, 500)
      .map(
        (r) =>
          `"${r.id}","${r.title}","${r.propertyName}","${r.unitNumber}","${r.tenantName}","${r.priority}","${r.status}","${r.createdAt}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'Maintenance_Requests.csv');
    a.click();
  };

  const columns: ColumnDef<MaintenanceRequest>[] = [
    {
      accessorKey: 'id',
      header: t('maintenanceRequests.requestNo'),
      id: 'id',
      cell: ({ row }) => (
        <span onClick={() => navigate({ to: `/maintenance/requests/${row.original.id}` })} className="font-bold text-primary hover:underline cursor-pointer">
          {getFormattedRequestNumber(row.original, row.index)}
        </span>
      ),
    },
    { accessorKey: 'propertyName', header: t('maintenanceRequests.propertyLocation'), id: 'property' },
    { accessorKey: 'unitNumber', header: t('maintenanceRequests.unit'), id: 'unit' },
    { accessorKey: 'tenantName', header: t('maintenanceRequests.resident'), id: 'tenant' },
    {
      accessorKey: 'priority',
      header: t('maintenanceRequests.priority'),
      id: 'priority',
      cell: ({ row }) => <RequestPriorityBadge priority={row.original.priority as any} />,
    },
    {
      accessorKey: 'status',
      header: t('maintenanceRequests.status'),
      id: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: t('maintenanceRequests.submittedDate'),
      id: 'createdAt',
      cell: ({ row }) => {
        const pref = extractPreferredVisit(row.original);
        return (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground block">{row.original.createdAt}</span>
            {pref && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 whitespace-nowrap">
                <Clock className="w-2.5 h-2.5 text-amber-500" /> Pref: {pref}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: t('maintenanceRequests.actions'),
      cell: ({ row }) => (
        <div className="flex space-x-1">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: `/maintenance/requests/${row.original.id}` })} title="View Detail">
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(row.original.id)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Archive Request"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('maintenanceRequests.title')}
        description={t('maintenanceRequests.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/' },
          { label: t('nav.maintenance'), href: '/maintenance' },
          { label: t('maintenanceRequests.title') },
        ]}
        action={{
          label: t('maintenanceRequests.submitTicket'),
          onClick: () => navigate({ to: '/maintenance/requests/new' }),
          icon: <Plus className="w-4.5 h-4.5" />,
        }}
      />

      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold text-muted-foreground uppercase">
          {t('maintenanceRequests.totalFound', { count: filteredRequests.length })}
        </span>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-xs font-semibold flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" />
          {t('maintenanceRequests.exportCsv')}
        </Button>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('maintenanceRequests.searchPlaceholder')}
        filters={[
          {
            key: 'priority',
            value: priorityFilter,
            placeholder: 'Priority Bracket',
            options: [
              { label: 'Urgent', value: 'Urgent' },
              { label: 'High', value: 'High' },
              { label: 'Medium', value: 'Medium' },
              { label: 'Low', value: 'Low' },
            ],
          },
          {
            key: 'status',
            value: statusFilter,
            placeholder: 'All Statuses',
            options: [
              { label: 'New', value: 'New' },
              { label: 'Submitted', value: 'Submitted' },
              { label: 'Approved', value: 'Approved' },
              { label: 'Assigned', value: 'Assigned' },
              { label: 'In Progress', value: 'In Progress' },
              { label: 'Waiting for Parts', value: 'Waiting for Parts' },
              { label: 'Completed', value: 'Completed' },
              { label: 'Cancelled', value: 'Cancelled' },
            ],
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'priority') setPriorityFilter(val);
          if (key === 'status') setStatusFilter(val);
        }}
        onReset={() => {
          setSearchQuery('');
          setPriorityFilter('');
          setStatusFilter('');
        }}
      />

      <DataTable columns={columns} data={filteredRequests.slice(0, 100)} loading={isLoading} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Maintenance Request"
        description="Are you sure you want to delete this maintenance request? Click Yes to confirm or No to cancel."
        confirmText="Yes, Delete"
        cancelText="No, Cancel"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
};
export default RequestsPage;

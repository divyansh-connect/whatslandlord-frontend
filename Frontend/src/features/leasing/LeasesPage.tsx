import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { Lease } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Plus, Eye, Key, AlertTriangle, Play, Trash2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';

export const LeasesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Dialog triggers
  const [terminateId, setTerminateId] = useState<string | null>(null);
  const [deleteLeaseItem, setDeleteLeaseItem] = useState<Lease | null>(null);

  // Queries
  const { data: leases = [], isLoading, error } = useQuery({
    queryKey: ['leases'],
    queryFn: () => api.leasing.getLeases(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
  });

  const terminateMutation = useMutation({
    // simple state update simulation
    mutationFn: async (id: string) => {
      return api.leasing.updateLease(id, { status: 'Terminated' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      setTerminateId(null);
    },
  });

  const deleteLeaseMutation = useMutation({
    mutationFn: async (lease: Lease) => {
      return api.leasing.deleteLease(lease.id, lease);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      setDeleteLeaseItem(null);
    },
  });

  // Filter Logic
  const filteredLeases = leases.filter((l) => {
    const tenantVal = l.tenantName || '';
    const idVal = l.id || '';
    const tenantMatch = tenantVal.toLowerCase().includes(searchQuery.toLowerCase());
    const leaseIdMatch = idVal.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProp = propertyFilter === '' || l.propertyId === propertyFilter;
    const matchesStatus = statusFilter === '' || l.status === statusFilter;
    return (tenantMatch || leaseIdMatch) && matchesProp && matchesStatus;
  });

  const columns: ColumnDef<Lease>[] = [
    {
      accessorKey: 'id',
      header: t('leases.columns.leaseId'),
      id: 'id',
      cell: ({ row }) => (
        <span
          onClick={() => navigate({ to: `/leases/${row.original.id}` })}
          className="font-bold text-primary hover:underline cursor-pointer"
        >
          {row.index + 1}
        </span>
      ),
    },
    { accessorKey: 'tenantName', header: t('leases.columns.resident'), id: 'tenantName' },
    { accessorKey: 'propertyName', header: t('leases.columns.property'), id: 'property' },
    { accessorKey: 'unitNumber', header: t('leases.columns.unit'), id: 'unit' },
    {
      accessorKey: 'startDate',
      header: t('leases.columns.startDate'),
      id: 'startDate',
      cell: ({ row }) => {
        const val = row.original.startDate;
        if (!val) return '—';
        return val.includes('T') ? val.split('T')[0] : val;
      },
    },
    {
      accessorKey: 'endDate',
      header: t('leases.columns.endDate'),
      id: 'endDate',
      cell: ({ row }) => {
        const val = row.original.endDate;
        if (!val) return '—';
        return val.includes('T') ? val.split('T')[0] : val;
      },
    },
    {
      accessorKey: 'rentAmount',
      header: t('leases.columns.rent'),
      id: 'rent',
      cell: ({ row }) => <span className="font-semibold">${row.original.rentAmount.toLocaleString()}</span>,
    },
    {
      accessorKey: 'status',
      header: t('leases.columns.status'),
      id: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: t('leases.columns.actions'),
      cell: ({ row }) => (
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: `/leases/${row.original.id}` })}
            title={t('leases.actions.view')}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {row.original.status === 'Active' && (
            <Button
              variant="ghost"
              size="icon"
              className="text-amber-500 hover:bg-amber-500/10"
              onClick={() => setTerminateId(row.original.id)}
              title={t('leases.actions.terminate')}
            >
              <AlertTriangle className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
            onClick={() => setDeleteLeaseItem(row.original)}
            title="Delete Lease"
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
        title={t('leases.title')}
        description={t('leases.desc')}
        breadcrumbs={[
          { label: t('ai.breadcrumbs.home'), href: '/' },
          { label: t('nav.leasing'), href: '/leasing/leases' },
          { label: t('nav.leases') },
        ]}
        action={{
          label: t('leases.createWizard'),
          onClick: () => navigate({ to: '/leases/new' }),
          icon: <Plus className="w-4.5 h-4.5" />,
        }}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('leases.searchPlaceholder')}
        filters={[
          {
            key: 'property',
            value: propertyFilter,
            placeholder: t('leases.propertyPlaceholder'),
            options: properties.map((p) => ({ label: p.name, value: p.id })),
          },
          {
            key: 'status',
            value: statusFilter,
            placeholder: t('leases.statusPlaceholder'),
            options: [
              { label: t('leases.statuses.active'), value: 'Active' },
              { label: t('leases.statuses.pending'), value: 'Pending' },
              { label: t('leases.statuses.expired'), value: 'Expired' },
              { label: t('leases.statuses.terminated'), value: 'Terminated' },
            ],
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'property') setPropertyFilter(val);
          if (key === 'status') setStatusFilter(val);
        }}
        onReset={() => {
          setSearchQuery('');
          setPropertyFilter('');
          setStatusFilter('');
        }}
      />

      <DataTable columns={columns} data={filteredLeases} loading={isLoading} error={error ? error.message : null} />

      <ConfirmDialog
        open={!!terminateId}
        onOpenChange={(open) => !open && setTerminateId(null)}
        title={t('leases.terminateDialog.title')}
        description={t('leases.terminateDialog.desc')}
        confirmText={t('leases.terminateDialog.confirm')}
        variant="destructive"
        onConfirm={() => terminateId && terminateMutation.mutate(terminateId)}
      />

      <ConfirmDialog
        open={!!deleteLeaseItem}
        onOpenChange={(open) => !open && setDeleteLeaseItem(null)}
        title="Move to Restore Bin"
        description={`Are you sure you want to delete Lease "${deleteLeaseItem?.id}"? It will be moved to the Restore Bin and can be restored anytime.`}
        confirmText="Move to Restore Bin"
        variant="destructive"
        loading={deleteLeaseMutation.isPending}
        onConfirm={() => deleteLeaseItem && deleteLeaseMutation.mutate(deleteLeaseItem)}
      />
    </div>
  );
};
export default LeasesPage;

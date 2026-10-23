import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { Tenant } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { TenantAvatar } from '../../components/TenantAvatar';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Plus, Eye, Edit, Trash2, Download } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';

export const TenantsPage: React.FC<{ filterStatus?: string }> = ({ filterStatus }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(filterStatus || '');
  const [balanceFilter, setBalanceFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Queries
  const { data: tenants = [], isLoading, error } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.tenant.getAll(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.tenant.delete(id, tenants.find((t) => t.id === id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setDeleteId(null);
    },
  });

  // Filter Logic
  const filteredTenants = tenants.filter((t) => {
    const nameMatch = `${t.firstName || ''} ${t.lastName || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (t.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProp = propertyFilter === '' || t.propertyId === propertyFilter;
    const matchesStatus = statusFilter === '' || t.status === statusFilter;
    
    const balanceSum = (t.invoices || []).reduce((sum, inv) => {
      const isPaid = (inv as any).status === 'Paid' || (inv as any).status === 'PAID';
      const invBal = isPaid ? 0 : (inv.balance !== undefined ? inv.balance : inv.amount);
      return sum + Number(invBal || 0);
    }, 0) + Number(t.previousBalance || t.openingBalance || 0);
    const hasBalance = balanceSum > 0;
    const matchesBalance = balanceFilter === '' || 
      (balanceFilter === 'has-balance' && hasBalance) ||
      (balanceFilter === 'no-balance' && !hasBalance);

    return (nameMatch || emailMatch) && matchesProp && matchesStatus && matchesBalance;
  });

  // Export CSV
  const handleExport = () => {
    const headers = 'Name,Email,Phone,Property,Unit,Status\n';
    const rows = filteredTenants
      .map(
        (t) =>
          `"${t.firstName} ${t.lastName}","${t.email}","${t.phone}","${t.propertyName || ''}","${t.unitNumber || ''}","${t.status}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'Tenants_Report.csv');
    a.click();
  };

  const columns: ColumnDef<Tenant>[] = [
    {
      id: 'avatar',
      header: t('tenants.columns.avatar'),
      cell: ({ row }) => (
        <TenantAvatar name={`${row.original.firstName} ${row.original.lastName}`} size="sm" />
      ),
    },
    {
      accessorKey: 'firstName',
      header: t('tenants.columns.name'),
      id: 'name',
      cell: ({ row }) => (
        <span
          onClick={() => navigate({ to: `/tenants/${row.original.id}` })}
          className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
        >
          {row.original.firstName} {row.original.lastName}
        </span>
      ),
    },
    { accessorKey: 'email', header: t('tenants.columns.email'), id: 'email' },
    { accessorKey: 'phone', header: t('tenants.columns.phone'), id: 'phone' },
    {
      accessorKey: 'propertyName',
      header: t('tenants.columns.property'),
      id: 'property',
      cell: ({ row }) => row.original.propertyName || <span className="text-muted-foreground italic text-xs">{t('tenants.unassigned')}</span>,
    },
    {
      accessorKey: 'unitNumber',
      header: t('tenants.columns.unit'),
      id: 'unit',
      cell: ({ row }) => row.original.unitNumber || '-',
    },
    {
      id: 'balance',
      header: t('tenants.columns.balance'),
      cell: ({ row }) => {
        const balanceSum = (row.original.invoices || []).reduce((sum, inv) => {
          const isPaid = (inv as any).status === 'Paid' || (inv as any).status === 'PAID';
          const invBal = isPaid ? 0 : (inv.balance !== undefined ? inv.balance : inv.amount);
          return sum + Number(invBal || 0);
        }, 0) + Number(row.original.previousBalance || row.original.openingBalance || 0);
        return (
          <span className={balanceSum > 0 ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
            ${balanceSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: t('tenants.columns.status'),
      id: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: t('tenants.columns.actions'),
      cell: ({ row }) => (
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: `/tenants/${row.original.id}` })}
            title={t('tenants.actions.view')}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: `/tenants/${row.original.id}/edit` })}
            title={t('tenants.actions.edit')}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(row.original.id)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title={t('tenants.actions.delete')}
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
        title={filterStatus ? t('tenants.titleFiltered', { status: filterStatus }) : t('tenants.title')}
        description={t('tenants.desc')}
        breadcrumbs={[
          { label: t('ai.breadcrumbs.home'), href: '/' },
          { label: t('nav.tenants') },
        ]}
        action={{
          label: t('tenants.addTenant'),
          onClick: () => navigate({ to: '/tenants/new' }),
          icon: <Plus className="w-4.5 h-4.5" />,
        }}
      />

      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold text-muted-foreground uppercase">
          {t('tenants.total', { count: filteredTenants.length })}
        </span>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-xs font-semibold flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" />
          {t('tenants.exportCsv')}
        </Button>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('tenants.searchPlaceholder')}
        filters={[
          {
            key: 'property',
            value: propertyFilter,
            placeholder: t('tenants.propertyPlaceholder'),
            options: properties.map((p) => ({ label: p.name, value: p.id })),
          },
          {
            key: 'status',
            value: statusFilter,
            placeholder: t('tenants.statusPlaceholder'),
            options: [
              { label: t('tenants.statuses.active'), value: 'Active' },
              { label: t('tenants.statuses.pending'), value: 'Pending' },
              { label: t('tenants.statuses.inactive'), value: 'Inactive' },
            ],
          },
          {
            key: 'balance',
            value: balanceFilter,
            placeholder: t('tenants.balancePlaceholder'),
            options: [
              { label: t('tenants.balances.hasBalance'), value: 'has-balance' },
              { label: t('tenants.balances.noBalance'), value: 'no-balance' },
            ],
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'property') setPropertyFilter(val);
          if (key === 'status') setStatusFilter(val);
          if (key === 'balance') setBalanceFilter(val);
        }}
        onReset={() => {
          setSearchQuery('');
          setPropertyFilter('');
          setStatusFilter('');
          setBalanceFilter('');
        }}
      />

      <DataTable columns={columns} data={filteredTenants} loading={isLoading} error={error ? error.message : null} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('tenants.deleteDialog.title')}
        description={t('tenants.deleteDialog.desc')}
        confirmText={t('tenants.deleteDialog.confirm')}
        variant="destructive"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
};
export default TenantsPage;

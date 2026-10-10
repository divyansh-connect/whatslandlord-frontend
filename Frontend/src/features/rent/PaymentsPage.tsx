import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { RentPayment } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { PaymentMethodBadge } from '../../components/Phase4Components';
import { Plus, Eye, Pencil, Trash2, Download } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { EditPaymentModal } from './EditPaymentModal';

export const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Dialog triggers
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Queries
  const { data: payments = [], isLoading, error } = useQuery({
    queryKey: ['payments-list'],
    queryFn: () => api.payments.getAll(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.payments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-list'] });
      setDeleteId(null);
    },
  });

  // Filters
  const filteredPayments = payments.filter((pay) => {
    const nameMatch = pay.tenantName.toLowerCase().includes(searchQuery.toLowerCase());
    const refMatch = (pay.referenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProp = propertyFilter === '' || pay.propertyId === propertyFilter;
    const matchesStatus = statusFilter === '' || pay.status === statusFilter;
    const matchesMethod = methodFilter === '' || pay.paymentMethod === methodFilter;

    return (nameMatch || refMatch) && matchesProp && matchesStatus && matchesMethod;
  });

  // Export CSV
  const handleExport = () => {
    const headers = 'Receipt,Tenant,Property,Unit,Amount,Status,Method,Reference\n';
    const rows = filteredPayments
      .map(
        (p) =>
          `"${p.id}","${p.tenantName}","${p.propertyName}","${p.unitNumber}",${p.amount},"${p.status}","${p.paymentMethod}","${p.referenceNumber}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'Payments_Report.csv');
    a.click();
  };

  const columns: ColumnDef<RentPayment>[] = [
    {
      accessorKey: 'id',
      header: t('rentPaymentsPage.receiptNo'),
      id: 'id',
      cell: ({ row }) => {
        const pay = row.original as any;
        const displayNum = pay.receiptNumber || `#${row.index + 1}`;
        return (
          <span
            onClick={() => navigate({ to: `/payments/${row.original.id}` })}
            className="font-bold text-primary hover:underline cursor-pointer"
          >
            {displayNum}
          </span>
        );
      },
    },
    { accessorKey: 'tenantName', header: t('rentPaymentsPage.tenant'), id: 'tenantName' },
    { accessorKey: 'propertyName', header: t('rentPaymentsPage.property'), id: 'property' },
    { accessorKey: 'unitNumber', header: t('rentPaymentsPage.unitNo'), id: 'unit' },
    { accessorKey: 'paidDate', header: t('rentPaymentsPage.datePaid'), id: 'paidDate', cell: ({ row }) => row.original.paidDate || '-' },
    {
      accessorKey: 'amount',
      header: t('rentPaymentsPage.amountPaid'),
      id: 'amount',
      cell: ({ row }) => <span className="font-extrabold text-emerald-500">${row.original.amount.toLocaleString()}</span>,
    },
    {
      accessorKey: 'paymentMethod',
      header: t('rentPaymentsPage.method'),
      id: 'method',
      cell: ({ row }) => <PaymentMethodBadge method={row.original.paymentMethod} />,
    },
    {
      accessorKey: 'status',
      header: t('rentPaymentsPage.status'),
      id: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: t('rentPaymentsPage.actions'),
      cell: ({ row }) => {
        const pay = row.original as any;
        const isTenantOnline =
          pay.createdBy === 'Tenant' ||
          pay.createdBy === 'Tenant Portal' ||
          ['Razorpay', 'Stripe', 'AuthorizeNet'].includes(pay.paymentMethod);

        return (
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: `/payments/${row.original.id}` })} title={t('rentPaymentsPage.viewReceipt')}>
              <Eye className="w-4 h-4" />
            </Button>
            {!isTenantOnline && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingPayment(row.original)}
                className="text-blue-500 hover:bg-blue-500/10"
                title="Edit Payment"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            {!isTenantOnline && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteId(row.original.id)}
                className="text-rose-500 hover:bg-rose-500/10"
                title="Delete Payment"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('rentPaymentsPage.title')}
        description={t('rentPaymentsPage.desc')}
        breadcrumbs={[
          { label: t('ai.breadcrumbs.home'), href: '/' },
          { label: t('rentPaymentsPage.rentCollection'), href: '/rent' },
          { label: t('rentPaymentsPage.payments') },
        ]}
        action={{
          label: t('rentPaymentsPage.recordPayment'),
          onClick: () => navigate({ to: '/payments/new' }),
          icon: <Plus className="w-4.5 h-4.5" />,
        }}
      />

      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold text-muted-foreground uppercase">
          {t('rentPaymentsPage.showingReceipts', { count: filteredPayments.length })}
        </span>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-xs font-semibold flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" />
          {t('rentPaymentsPage.exportCsv')}
        </Button>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('rentPaymentsPage.searchPlaceholder')}
        filters={[
          {
            key: 'property',
            value: propertyFilter,
            placeholder: t('rentPaymentsPage.allProperties'),
            options: properties.map((p) => ({ label: p.name, value: p.id })),
          },
          {
            key: 'status',
            value: statusFilter,
            placeholder: t('rentPaymentsPage.allStatuses'),
            options: [
              { label: 'Paid', value: 'Paid' },
              { label: 'Pending', value: 'Pending' },
              { label: 'Refunded', value: 'Refunded' },
              { label: 'Voided', value: 'Voided' },
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
          setMethodFilter('');
        }}
      />

      <DataTable columns={columns} data={filteredPayments} loading={isLoading} error={error ? error.message : null} />

      <EditPaymentModal
        payment={editingPayment}
        open={!!editingPayment}
        onOpenChange={(open) => !open && setEditingPayment(null)}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Payment"
        description="Are you sure you want to delete this payment? This will revert any invoice balances and account entries associated with this transaction."
        confirmText="Delete Payment"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
};
export default PaymentsPage;

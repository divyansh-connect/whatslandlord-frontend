import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { CoAAccount } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { FormDialog } from '../../components/FormDialog';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/StatusBadge';
import { CurrencyInput } from '../../components/Phase4Components';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

export const ChartOfAccountsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  // Dialog states
  const [isOpen, setIsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form states
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('Assets');
  const [openingBalance, setOpeningBalance] = useState(0);

  // Queries
  const { data: accounts = [], isLoading } = useQuery({ queryKey: ['coa-accounts-list'], queryFn: () => api.accounts.getAll() });

  const createMutation = useMutation({
    mutationFn: () => {
      return api.accounts.create({
        accountNumber: number,
        accountName: name,
        accountType: type as any,
        balance: openingBalance,
        currency: 'USD',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coa-accounts-list'] });
      setIsOpen(false);
      setNumber('');
      setName('');
      setOpeningBalance(0);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.accounts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coa-accounts-list'] });
      setDeleteId(null);
    },
  });

  const filteredAccounts = accounts.filter((a) => {
    const searchMatch = a.accountName.toLowerCase().includes(searchQuery.toLowerCase()) || a.accountNumber.includes(searchQuery);
    const typeMatch = typeFilter === '' || a.accountType === typeFilter;
    return searchMatch && typeMatch;
  });

  const columns: ColumnDef<CoAAccount>[] = [
    { accessorKey: 'accountNumber', header: t('pmCoa.accountNumber'), id: 'number', cell: ({ row }) => <span className="font-mono font-bold">{row.original.accountNumber}</span> },
    { accessorKey: 'accountName', header: t('pmCoa.accountName'), id: 'name', cell: ({ row }) => <span className="font-bold">{row.original.accountName}</span> },
    { accessorKey: 'accountType', header: t('pmCoa.type'), id: 'type' },
    {
      accessorKey: 'balance',
      header: t('pmCoa.balance'),
      id: 'balance',
      cell: ({ row }) => <span className="font-extrabold">${row.original.balance.toLocaleString()}</span>,
    },
    {
      accessorKey: 'status',
      header: t('pmIncome.status'),
      id: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: t('pmCoa.actions'),
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('pmCoa.title')}
        description={t('pmCoa.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/' },
          { label: t('nav.accounting'), href: '/accounting' },
          { label: t('pmCoa.title') },
        ]}
        action={{
          label: t('pmCoa.addAccount', 'Create Ledger Account'),
          onClick: () => setIsOpen(true),
          icon: <Plus className="w-4.5 h-4.5" />,
        }}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('pmCoa.searchPlaceholder')}
        filters={[
          {
            key: 'type',
            value: typeFilter,
            placeholder: t('pmCoa.type'),
            options: [
              { label: 'Assets', value: 'Assets' },
              { label: 'Liabilities', value: 'Liabilities' },
              { label: 'Equity', value: 'Equity' },
              { label: 'Income', value: 'Income' },
              { label: 'Expenses', value: 'Expenses' },
            ],
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'type') setTypeFilter(val);
        }}
        onReset={() => {
          setSearchQuery('');
          setTypeFilter('');
        }}
      />

      <DataTable columns={columns} data={filteredAccounts.slice(0, 100)} loading={isLoading} />

      {/* CREATE DIALOG */}
      <FormDialog open={isOpen} onOpenChange={setIsOpen} title="Setup Ledger Account">
        <div className="space-y-4 pt-2">
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Account Number</label>
            <Input placeholder="E.g., 1010" value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Account Name</label>
            <Input placeholder="E.g., Petty Cash Escrow" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Account Type</label>
            <Select value={type} onChange={(e: any) => setType(e.target.value)}>
              <option value="Assets">Assets</option>
              <option value="Liabilities">Liabilities</option>
              <option value="Equity">Equity</option>
              <option value="Income">Income</option>
              <option value="Expenses">Expenses</option>
            </Select>
          </div>

          <CurrencyInput
            label="Opening Balance ($)"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(Number(e.target.value))}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || !number || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Account
            </Button>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Ledger Account"
        description="Are you sure you want to delete this ledger account? This reverses all linked transaction logs."
        confirmText="Delete Account"
        variant="destructive"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
};
export default ChartOfAccountsPage;

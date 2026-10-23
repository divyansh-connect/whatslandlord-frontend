import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { Property } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { FormDialog } from '../../components/FormDialog';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/StatusBadge';
import { Plus, Trash2, Edit, Copy, Eye, Download, Lock, Loader2, Upload } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { PropertyImportModal } from './PropertyImportModal';

export const PropertiesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Query Properties
  const { data: properties = [], isLoading, error } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
  });

  // Query Owners to populate filter
  const { data: owners = [] } = useQuery({
    queryKey: ['owners'],
    queryFn: () => api.owner.getAll(),
  });

  const [deletePropertyItem, setDeletePropertyItem] = useState<Property | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (prop: Property) => {
      return api.property.delete(prop.id, prop);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setDeletePropertyItem(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (prop: Property) => {
      return api.property.create({
        name: `${prop.name} (Copy)`,
        type: prop.type,
        status: prop.status,
        owner: prop.owner,
        ownershipPercentage: prop.ownershipPercentage,
        managementCompany: prop.managementCompany,
        address: prop.address,
        streetAddress: prop.streetAddress,
        city: prop.city,
        state: prop.state,
        country: prop.country,
        zip: prop.zip,
        yearBuilt: prop.yearBuilt,
        totalBuildings: prop.totalBuildings,
        squareFootage: prop.squareFootage,
        purchasePrice: prop.purchasePrice,
        currentValue: prop.currentValue,
        monthlyExpenses: prop.monthlyExpenses,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });

  // Filters (Exclude Drafts & Inactive from main Properties page)
  const filteredProperties = properties.filter((prop) => {
    if (!prop) return false;
    if (prop.status === 'Draft' || prop.status === 'Inactive') return false;
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch = !q ||
      (prop.name || '').toLowerCase().includes(q) ||
      (prop.city || '').toLowerCase().includes(q) ||
      (prop.address || '').toLowerCase().includes(q);
    const matchesType = typeFilter === '' || prop.type === typeFilter;
    const matchesStatus = statusFilter === '' || prop.status === statusFilter;
    const matchesOwner = ownerFilter === '' || prop.owner === ownerFilter;
    return matchesSearch && matchesType && matchesStatus && matchesOwner;
  });

  // Comprehensive Export with ALL property details (Excel .xlsx & CSV)
  const handleExport = (format: 'xlsx' | 'csv' = 'xlsx') => {
    if (filteredProperties.length === 0) return;

    const exportData = filteredProperties.map((p) => {
      const ownerName = p.owner && typeof p.owner === 'object' ? p.owner.name : (p.owner || 'Default Owner');
      return {
        'Property Name': p.name || '',
        'Property Type': p.type || 'Apartment',
        'Status': p.status || 'Active',
        'Owner Name': ownerName,
        'Ownership Percentage (%)': p.ownershipPercentage ?? 100,
        'Management Company': p.managementCompany || 'Apex Property Management',
        'Street Address': p.streetAddress || p.address || '',
        'City': p.city || '',
        'State': p.state || '',
        'Zip Code': p.zip || '',
        'Country': p.country || 'USA',
        'Total Units': p.unitsCount ?? 0,
        'Occupied Units': p.occupiedUnits ?? 0,
        'Occupancy Rate (%)': p.occupancyRate ?? 0,
        'Monthly Revenue ($)': p.monthlyRevenue ?? 0,
        'Monthly Expenses ($)': p.monthlyExpenses ?? 0,
        'Year Built': p.yearBuilt ?? '',
        'Total Buildings': p.totalBuildings ?? 1,
        'Square Footage': p.squareFootage ?? '',
        'Purchase Price ($)': p.purchasePrice ?? '',
        'Current Value ($)': p.currentValue ?? '',
        'NYC BIN #': p.nycBin || (p as any).bin || '',
        'Full Address': p.address || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 28 }, // Property Name
      { wch: 18 }, // Type
      { wch: 14 }, // Status
      { wch: 22 }, // Owner Name
      { wch: 24 }, // Ownership %
      { wch: 25 }, // Management Company
      { wch: 26 }, // Street Address
      { wch: 16 }, // City
      { wch: 10 }, // State
      { wch: 12 }, // Zip Code
      { wch: 12 }, // Country
      { wch: 14 }, // Total Units
      { wch: 16 }, // Occupied Units
      { wch: 18 }, // Occupancy Rate
      { wch: 20 }, // Monthly Revenue
      { wch: 20 }, // Monthly Expenses
      { wch: 14 }, // Year Built
      { wch: 16 }, // Total Buildings
      { wch: 18 }, // Square Footage
      { wch: 18 }, // Purchase Price
      { wch: 18 }, // Current Value
      { wch: 14 }, // NYC BIN #
      { wch: 35 }, // Full Address
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Properties');

    if (format === 'xlsx') {
      XLSX.writeFile(workbook, 'Properties_All_Details.xlsx');
    } else {
      XLSX.writeFile(workbook, 'Properties_All_Details.csv');
    }
  };

  const columns: ColumnDef<Property>[] = [
    {
      accessorKey: 'name',
      header: t('properties.columns.name'),
      id: 'name',
      cell: ({ row }) => (
        <span className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer" onClick={() => navigate({ to: `/properties/${row.original.id}` })}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: t('properties.columns.type'),
      id: 'type',
      cell: ({ row }) => <StatusBadge status={row.original.type} />,
    },
    {
      accessorKey: 'owner',
      header: t('properties.columns.owner'),
      id: 'owner',
      cell: ({ row }) => {
        const owner = row.original.owner;
        const ownerName = owner && typeof owner === 'object' ? owner.name : (owner || 'No Owner');
        return <span className="text-muted-foreground text-xs font-semibold">{ownerName}</span>;
      },
    },
    {
      accessorKey: 'address',
      header: t('properties.columns.address'),
      id: 'address',
      cell: ({ row }) => <span className="text-muted-foreground text-xs truncate max-w-[150px] inline-block">{row.original.address}</span>,
    },
    {
      id: 'nycBin',
      header: 'NYC BIN #',
      accessorFn: (row) => row.nycBin || (row as any).bin || '',
      cell: ({ row }) => {
        const binValue = row.original.nycBin || (row.original as any).bin;
        return (
          <span className="font-mono text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {binValue ? binValue : 'N/A'}
          </span>
        );
      },
    },
    {
      accessorKey: 'unitsCount',
      header: t('properties.columns.units'),
      id: 'units',
      cell: ({ row }) => <span>{row.original.unitsCount}</span>,
    },
    {
      accessorKey: 'occupancyRate',
      header: t('properties.columns.occupancy'),
      id: 'occupancy',
      cell: ({ row }) => (
        <div className="flex items-center space-x-1.5">
          <span className="font-semibold text-xs">{row.original.occupancyRate}%</span>
          <div className="w-12 bg-muted rounded-full h-1 overflow-hidden">
            <div className="bg-primary h-1" style={{ width: `${row.original.occupancyRate}%` }} />
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'monthlyRevenue',
      header: t('properties.columns.revenue'),
      id: 'revenue',
      cell: ({ row }) => <span className="font-semibold text-emerald-500">${row.original.monthlyRevenue.toLocaleString()}</span>,
    },
    {
      accessorKey: 'status',
      header: t('properties.columns.status'),
      id: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: t('properties.columns.createdAt'),
      id: 'createdAt',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.createdAt}</span>,
    },
    {
      id: 'actions',
      header: t('properties.columns.actions'),
      cell: ({ row }) => (
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: `/properties/${row.original.id}` })}
            title={t('properties.actions.view')}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: `/properties/edit`, search: { id: row.original.id } as any })}
            title={t('properties.actions.edit', 'Edit')}
            className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletePropertyItem(row.original)}
            title="Delete Property"
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
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
        title={t('properties.title')}
        description={t('properties.desc')}
        breadcrumbs={[
          { label: t('ai.breadcrumbs.home'), href: '/' },
          { label: t('owner.nav.properties') },
        ]}
        action={{
          label: t('properties.addProperty'),
          onClick: () => navigate({ to: '/properties/new' }),
          icon: <Plus className="w-4.5 h-4.5" />,
        }}
      />

      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold text-muted-foreground uppercase">
          {t('properties.showing', { count: filteredProperties.length })}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="text-xs font-semibold flex items-center gap-1.5 border-dashed hover:bg-primary/5 hover:border-primary/60 text-foreground"
          >
            <Upload className="w-3.5 h-3.5 text-primary" />
            Import Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('xlsx')}
            className="text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500/10 hover:border-emerald-500/50"
            title="Export all property details as Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            className="text-xs font-semibold flex items-center gap-1.5"
            title="Export all property details as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            {t('properties.exportCsv')}
          </Button>
        </div>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('properties.searchPlaceholder')}
        filters={[
          {
            key: 'type',
            value: typeFilter,
            placeholder: t('properties.typePlaceholder'),
            options: [
              { label: t('properties.types.apartment'), value: 'Apartment' },
              { label: t('properties.types.commercial'), value: 'Commercial' },
              { label: t('properties.types.singleFamily'), value: 'Single Family' },
              { label: t('properties.types.multiFamily'), value: 'Multi Family' },
              { label: 'Mixed-Use Property (MUP)', value: 'MUP' },
              { label: t('properties.types.hoa'), value: 'HOA' },
            ],
          },
          {
            key: 'status',
            value: statusFilter,
            placeholder: t('properties.statusPlaceholder'),
            options: [
              { label: t('properties.statuses.active'), value: 'Active' },
              { label: t('properties.statuses.inactive'), value: 'Inactive' },
              { label: t('properties.statuses.underReview'), value: 'Under Review' },
              { label: t('properties.statuses.archived'), value: 'Archived' },
            ],
          },
          {
            key: 'owner',
            value: ownerFilter,
            placeholder: t('properties.ownerPlaceholder'),
            options: owners.map((o) => ({
              id: o.id,
              label: `${o.firstName} ${o.lastName}`,
              value: `${o.firstName} ${o.lastName}`,
            })),
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'type') setTypeFilter(val);
          if (key === 'status') setStatusFilter(val);
          if (key === 'owner') setOwnerFilter(val);
        }}
        onReset={() => {
          setSearchQuery('');
          setTypeFilter('');
          setStatusFilter('');
          setOwnerFilter('');
        }}
      />

      <DataTable
        columns={columns}
        data={filteredProperties}
        loading={isLoading}
        error={error ? error.message : null}
      />

      <ConfirmDialog
        open={!!deletePropertyItem}
        onOpenChange={(open) => !open && setDeletePropertyItem(null)}
        title="Move to Restore Bin"
        description={`Are you sure you want to delete "${deletePropertyItem?.name}"? It will be moved to the Restore Bin and can be restored anytime.`}
        confirmText="Move to Restore Bin"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deletePropertyItem && deleteMutation.mutate(deletePropertyItem)}
      />

      <PropertyImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
      />
    </div>
  );
};
export default PropertiesPage;

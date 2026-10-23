import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { Unit } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { FormDialog } from '../../components/FormDialog';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/StatusBadge';
import { Plus, Eye, UserPlus, Key, RefreshCw, Trash2, Edit, Loader2, Clock } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from '@tanstack/react-router';

export const UnitsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bedroomsFilter, setBedroomsFilter] = useState('');

  // Assign tenant modal state
  const [assignUnitId, setAssignUnitId] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  
  // Change status modal state
  const [statusUnitId, setStatusUnitId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<any>('Vacant');

  // Quick Late Fee modal state
  const [lateFeeUnit, setLateFeeUnit] = useState<any | null>(null);
  const [modalLateFeeEnabled, setModalLateFeeEnabled] = useState<boolean>(false);
  const [modalLateFeeType, setModalLateFeeType] = useState<string>('FLAT');
  const [modalLateFeeAmount, setModalLateFeeAmount] = useState<number>(50);
  const [modalLateFeeGraceDays, setModalLateFeeGraceDays] = useState<number>(5);

  const openLateFeeModal = (unit: any) => {
    setLateFeeUnit(unit);
    setModalLateFeeEnabled(Boolean(unit.isLateFeeEnabled));
    setModalLateFeeType(unit.lateFeeType || 'FLAT');
    setModalLateFeeAmount(unit.lateFeeAmount !== null && unit.lateFeeAmount !== undefined ? Number(unit.lateFeeAmount) : 50);
    setModalLateFeeGraceDays(unit.lateFeeGraceDays !== null && unit.lateFeeGraceDays !== undefined ? Number(unit.lateFeeGraceDays) : 5);
  };

  // Queries
  const { data: units = [], isLoading, error } = useQuery({
    queryKey: ['units'],
    queryFn: () => api.unit.getAll(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => api.building.getAll(),
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.tenant.getAll(),
  });

  // Mutations
  const assignMutation = useMutation({
    mutationFn: ({ unitId, tenantId }: { unitId: string; tenantId: string }) => {
      const tenantObj = tenants.find((t) => t.id === tenantId);
      const name = tenantObj ? `${tenantObj.firstName} ${tenantObj.lastName}` : 'Tenant';
      return api.unit.assignTenant(unitId, tenantId, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setAssignUnitId(null);
      setSelectedTenantId('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ unitId, status }: { unitId: string; status: any }) =>
      api.unit.update(unitId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setStatusUnitId(null);
    },
  });

  const [deleteUnitItem, setDeleteUnitItem] = useState<Unit | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (unit: Unit) => api.unit.delete(unit.id, unit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setDeleteUnitItem(null);
    },
  });

  const lateFeeMutation = useMutation({
    mutationFn: async () => {
      if (!lateFeeUnit) return;
      return api.unit.update(lateFeeUnit.id, {
        isLateFeeEnabled: modalLateFeeEnabled,
        lateFeeType: modalLateFeeType,
        lateFeeAmount: modalLateFeeEnabled ? Number(modalLateFeeAmount) : null,
        lateFeeGraceDays: modalLateFeeEnabled ? Number(modalLateFeeGraceDays) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setLateFeeUnit(null);
    },
  });

  // Filter logic
  const filteredUnits = units.filter((unit) => {
    const matchesSearch =
      unit.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.propertyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProp = propertyFilter === '' || unit.propertyId === propertyFilter;
    const matchesBld = buildingFilter === '' || unit.buildingId === buildingFilter;
    const matchesStatus = statusFilter === '' || unit.status === statusFilter;
    const matchesBeds = bedroomsFilter === '' || unit.bedrooms === Number(bedroomsFilter);
    return matchesSearch && matchesProp && matchesBld && matchesStatus && matchesBeds;
  });

  const columns: ColumnDef<Unit>[] = [
    {
      accessorKey: 'unitNumber',
      header: t('pmProperties.unitNumber'),
      id: 'unitNumber',
      cell: ({ row }) => (
        <span
          className="font-bold text-primary hover:underline cursor-pointer"
          onClick={() => navigate({ to: `/properties/units/${row.original.id}` })}
        >
          {row.original.unitNumber}
        </span>
      ),
    },
    { accessorKey: 'propertyName', header: t('pmLeasing.property'), id: 'property' },
    { accessorKey: 'floor', header: t('pmProperties.floor'), id: 'floor' },
    { accessorKey: 'bedrooms', header: t('pmProperties.beds'), id: 'bedrooms' },
    { accessorKey: 'bathrooms', header: t('pmProperties.baths'), id: 'bathrooms' },
    { accessorKey: 'squareFootage', header: t('pmProperties.sqft'), id: 'squareFootage' },
    {
      accessorKey: 'rentAmount',
      header: t('pmProperties.rent'),
      id: 'rent',
      cell: ({ row }) => <span>${row.original.rentAmount.toLocaleString()}</span>,
    },
    {
      accessorKey: 'tenantName',
      header: t('pmProperties.tenant'),
      id: 'tenant',
      cell: ({ row }) => row.original.tenantName || <span className="text-muted-foreground italic text-xs">{t('pmProperties.vacant')}</span>,
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
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: `/properties/units/${row.original.id}` })}
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: `/properties/units/${row.original.id}/edit` })}
            title="Edit Unit"
          >
            <Edit className="w-4 h-4" />
          </Button>
          {row.original.status !== 'Occupied' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAssignUnitId(row.original.id)}
              title="Assign Tenant"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setStatusUnitId(row.original.id);
              setSelectedStatus(row.original.status);
            }}
            title="Change Status"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openLateFeeModal(row.original)}
            title="Late Fee Policy"
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          >
            <Clock className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteUnitItem(row.original)}
            title="Delete Unit"
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
        title={t('pmProperties.unitsTitle')}
        description={t('pmProperties.unitsDesc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/' },
          { label: t('nav.properties'), href: '/properties' },
          { label: t('pmProperties.unitsTitle') },
        ]}
        action={{
          label: t('pmProperties.addUnit'),
          onClick: () => navigate({ to: '/properties/units/new' }), // matching routes
          icon: <Plus className="w-4.5 h-4.5" />,
        }}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by unit # or property..."
        filters={[
          {
            key: 'property',
            value: propertyFilter,
            placeholder: 'All Properties',
            options: properties.map((p) => ({ label: p.name, value: p.id })),
          },
          {
            key: 'status',
            value: statusFilter,
            placeholder: 'All Statuses',
            options: [
              { label: 'Occupied', value: 'Occupied' },
              { label: 'Vacant', value: 'Vacant' },
              { label: 'Reserved', value: 'Reserved' },
              { label: 'Under Maintenance', value: 'Under Maintenance' },
            ],
          },
          {
            key: 'bedrooms',
            value: bedroomsFilter,
            placeholder: 'Bedrooms',
            options: [
              { label: '1 Bed', value: '1' },
              { label: '2 Bed', value: '2' },
              { label: '3 Bed', value: '3' },
              { label: '4 Bed', value: '4' },
            ],
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'property') {
            setPropertyFilter(val);
            setBuildingFilter('');
          }
          if (key === 'status') setStatusFilter(val);
          if (key === 'bedrooms') setBedroomsFilter(val);
        }}
        onReset={() => {
          setSearchQuery('');
          setPropertyFilter('');
          setBuildingFilter('');
          setStatusFilter('');
          setBedroomsFilter('');
        }}
      />

      <DataTable columns={columns} data={filteredUnits} loading={isLoading} error={error ? error.message : null} />

      {/* ASSIGN TENANT MODAL */}
      <FormDialog
        open={!!assignUnitId}
        onOpenChange={(open) => !open && setAssignUnitId(null)}
        title="Assign Tenant to Unit"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">Select an active/pending tenant to move into this unit.</p>
          <Select value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)}>
            <option value="">Select Tenant...</option>
            {tenants.filter(t => t.status !== 'Active').map((t) => (
              <option key={t.id} value={t.id}>
                {t.firstName} {t.lastName} ({t.status})
              </option>
            ))}
          </Select>
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" onClick={() => setAssignUnitId(null)}>Cancel</Button>
            <Button 
              onClick={() => assignUnitId && selectedTenantId && assignMutation.mutate({ unitId: assignUnitId, tenantId: selectedTenantId })}
              disabled={assignMutation.isPending || !selectedTenantId}
            >
              {assignMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Assign Tenant
            </Button>
          </div>
        </div>
      </FormDialog>

      {/* CHANGE STATUS MODAL */}
      <FormDialog
        open={!!statusUnitId}
        onOpenChange={(open) => !open && setStatusUnitId(null)}
        title="Change Unit Status"
      >
        <div className="space-y-4 pt-2">
          <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)}>
            <option value="Vacant">Vacant</option>
            <option value="Occupied">Occupied</option>
            <option value="Reserved">Reserved</option>
            <option value="Under Maintenance">Under Maintenance</option>
          </Select>
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" onClick={() => setStatusUnitId(null)}>Cancel</Button>
            <Button
              onClick={() => statusUnitId && statusMutation.mutate({ unitId: statusUnitId, status: selectedStatus })}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Update Status
            </Button>
          </div>
        </div>
      </FormDialog>

      {/* QUICK LATE FEE POLICY MODAL */}
      <FormDialog
        open={!!lateFeeUnit}
        onOpenChange={(open) => !open && setLateFeeUnit(null)}
        title={`Late Fee Policy — Unit ${lateFeeUnit?.unitNumber || ''}`}
      >
        <div className="space-y-4 pt-1">
          <div className="p-3 bg-secondary/50 rounded-xl flex items-center justify-between border border-border">
            <div>
              <p className="text-xs font-extrabold text-foreground">{lateFeeUnit?.propertyName} • Unit {lateFeeUnit?.unitNumber}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Rent: ${lateFeeUnit?.rentAmount?.toLocaleString()} / mo</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">
                {modalLateFeeEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <Button
                type="button"
                size="sm"
                variant={modalLateFeeEnabled ? 'default' : 'outline'}
                onClick={() => setModalLateFeeEnabled(!modalLateFeeEnabled)}
                className={`h-7 px-3 text-xs font-bold ${
                  modalLateFeeEnabled 
                    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                    : 'border-border text-muted-foreground'
                }`}
              >
                {modalLateFeeEnabled ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>

          {modalLateFeeEnabled ? (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide">Type</label>
                  <Select
                    value={modalLateFeeType}
                    onChange={(e) => setModalLateFeeType(e.target.value)}
                    className="h-9 text-xs font-bold"
                  >
                    <option value="FLAT">Flat Fee ($)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide">
                    {modalLateFeeType === 'PERCENTAGE' ? 'Percentage (%)' : 'Amount ($)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">
                      {modalLateFeeType === 'PERCENTAGE' ? '%' : '$'}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step={modalLateFeeType === 'PERCENTAGE' ? '0.5' : '1'}
                      value={modalLateFeeAmount}
                      onChange={(e) => setModalLateFeeAmount(Number(e.target.value))}
                      className="h-9 pl-7 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide">Grace Days</label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      value={modalLateFeeGraceDays}
                      onChange={(e) => setModalLateFeeGraceDays(Number(e.target.value))}
                      className="h-9 pr-14 text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-muted-foreground uppercase pointer-events-none select-none">
                      Days
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-[11px] text-muted-foreground">
                <span className="font-bold text-amber-600 dark:text-amber-400">Rule Preview: </span>
                If unpaid after <strong>{modalLateFeeGraceDays} days</strong> of due date, charge{' '}
                <strong>{modalLateFeeType === 'PERCENTAGE' ? `${modalLateFeeAmount}% of rent` : `$${modalLateFeeAmount}`}</strong> late fee.
              </div>
            </div>
          ) : (
            <div className="p-3 bg-muted/40 rounded-xl text-center text-xs text-muted-foreground font-medium">
              Late fee is currently turned off for this unit. No overdue penalty invoices will be generated by the automated cron job.
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setLateFeeUnit(null)}>Cancel</Button>
            <Button
              onClick={() => lateFeeMutation.mutate()}
              disabled={lateFeeMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {lateFeeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Policy
            </Button>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteUnitItem}
        onOpenChange={(open) => !open && setDeleteUnitItem(null)}
        title="Move to Restore Bin"
        description={`Are you sure you want to delete Unit "${deleteUnitItem?.unitNumber}"? It will be moved to the Restore Bin and can be restored anytime.`}
        confirmText="Move to Restore Bin"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteUnitItem && deleteMutation.mutate(deleteUnitItem)}
      />
    </div>
  );
};
export default UnitsPage;

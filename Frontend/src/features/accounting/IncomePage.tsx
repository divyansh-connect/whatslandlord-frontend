import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { IncomeRecord } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { FormDialog } from '../../components/FormDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/StatusBadge';
import { CurrencyInput } from '../../components/Phase4Components';
import { Plus, Loader2, Building, Home, User } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

export const IncomePage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [sourceType, setSourceType] = useState<'Tenant' | 'Owner' | 'Miscellaneous'>('Tenant');
  const [propertyId, setPropertyId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [miscSourceName, setMiscSourceName] = useState('');
  const [category, setCategory] = useState('Rent');
  const [amount, setAmount] = useState(150);

  // Queries
  const { data: income = [], isLoading } = useQuery({ queryKey: ['income-list'], queryFn: () => api.income.getAll() });
  const { data: properties = [] } = useQuery({ queryKey: ['properties'], queryFn: () => api.property.getAll() });
  const { data: buildings = [] } = useQuery({ queryKey: ['buildings'], queryFn: () => api.building.getAll() });
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => api.unit.getAll() });
  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: () => api.tenant.getAll() });
  const { data: owners = [] } = useQuery({ queryKey: ['owners'], queryFn: () => api.owner.getAll() });

  // Auto-select property effect for Owner
  useEffect(() => {
    if (sourceType === 'Owner' && selectedOwnerId) {
      const owned = properties.filter((p) => p.ownerId === selectedOwnerId);
      if (owned.length === 1) {
        setPropertyId(owned[0].id);
      } else {
        setPropertyId('');
      }
    }
  }, [selectedOwnerId, sourceType, properties]);

  const createMutation = useMutation({
    mutationFn: () => {
      let resolvedName = '';
      let sourceId = '';
      let resolvedPropertyId = '';
      let resolvedBuildingId = '';
      let resolvedUnitId = '';

      if (sourceType === 'Tenant') {
        const tenant = tenants.find((t) => t.id === selectedTenantId);
        resolvedName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Tenant';
        sourceId = selectedTenantId;
        resolvedPropertyId = tenant ? tenant.propertyId || '' : '';
        resolvedUnitId = tenant ? tenant.unitId || '' : '';
        if (tenant && tenant.unitId) {
          const matchingUnit = units.find((u) => u.id === tenant.unitId);
          resolvedBuildingId = matchingUnit ? matchingUnit.buildingId || '' : '';
        }
      } else if (sourceType === 'Owner') {
        const owner = owners.find((o) => o.id === selectedOwnerId);
        resolvedName = owner ? `${owner.firstName} ${owner.lastName}` : 'Owner';
        sourceId = selectedOwnerId;
        resolvedPropertyId = propertyId;
        resolvedBuildingId = '';
        resolvedUnitId = '';
      } else {
        resolvedName = miscSourceName || 'Miscellaneous Source';
        resolvedPropertyId = propertyId;
        resolvedBuildingId = buildingId;
        resolvedUnitId = unitId;
      }

      const prop = properties.find((p) => p.id === resolvedPropertyId);

      return api.income.create({
        date: new Date().toISOString().split('T')[0],
        propertyId: resolvedPropertyId,
        propertyName: prop ? prop.name : 'Property',
        buildingId: resolvedBuildingId,
        unitId: resolvedUnitId,
        sourceType,
        sourceId,
        tenantName: resolvedName,
        category,
        amount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-list'] });
      queryClient.invalidateQueries({ queryKey: ['coa-accounts-list'] });
      setIsOpen(false);
      setAmount(150);
      setPropertyId('');
      setBuildingId('');
      setUnitId('');
      setSelectedTenantId('');
      setSelectedOwnerId('');
      setMiscSourceName('');
      setSourceType('Tenant');
    },
  });

  const filteredIncome = income.filter((item) => {
    const searchMatch = item.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) || item.propertyName.toLowerCase().includes(searchQuery.toLowerCase());
    const catMatch = categoryFilter === '' || item.category === categoryFilter;
    return searchMatch && catMatch;
  });

  const columns: ColumnDef<IncomeRecord>[] = [
    { accessorKey: 'date', header: t('pmIncome.clearingDate'), id: 'date' },
    { accessorKey: 'tenantName', header: t('pmIncome.residentName'), id: 'tenant' },
    { accessorKey: 'propertyName', header: t('pmIncome.propertyLocation'), id: 'property' },
    {
      accessorKey: 'category',
      header: t('pmIncome.category'),
      id: 'category',
      cell: ({ row }) => <span className="font-bold text-[10px] bg-secondary px-2 py-0.5 rounded-lg border uppercase">{row.original.category}</span>,
    },
    {
      accessorKey: 'amount',
      header: t('pmIncome.amount'),
      id: 'amount',
      cell: ({ row }) => <span className="font-extrabold text-emerald-500">${row.original.amount.toLocaleString()}</span>,
    },
    {
      accessorKey: 'status',
      header: t('pmIncome.status'),
      id: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('pmIncome.title')}
        description={t('pmIncome.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/' },
          { label: t('nav.accounting'), href: '/accounting' },
          { label: t('pmIncome.title') },
        ]}
        action={{
          label: t('pmIncome.recordIncome'),
          onClick: () => setIsOpen(true),
          icon: <Plus className="w-4.5 h-4.5" />,
        }}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('pmIncome.searchPlaceholder')}
        filters={[
          {
            key: 'category',
            value: categoryFilter,
            placeholder: t('pmIncome.incomeCategory'),
            options: [
              { label: 'Rent', value: 'Rent' },
              { label: 'Utilities', value: 'Utilities' },
              { label: 'Late Fees', value: 'Late Fees' },
              { label: 'Parking', value: 'Parking' },
              { label: 'Storage', value: 'Storage' },
              { label: 'Pet Fees', value: 'Pet Fees' },
            ],
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'category') setCategoryFilter(val);
        }}
        onReset={() => {
          setSearchQuery('');
          setCategoryFilter('');
        }}
      />

      <DataTable columns={columns} data={filteredIncome.slice(0, 100)} loading={isLoading} />

      {/* CREATE DIALOG */}
      <FormDialog open={isOpen} onOpenChange={setIsOpen} title="Record Miscellaneous Income">
        <div className="space-y-4 pt-2">
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Source Type</label>
            <Select value={sourceType} onChange={(e) => {
              setSourceType(e.target.value as any);
              setSelectedTenantId('');
              setSelectedOwnerId('');
              setMiscSourceName('');
              setPropertyId('');
              setBuildingId('');
              setUnitId('');
            }}>
              <option value="Tenant">Tenant / Resident</option>
              <option value="Owner">Property Owner (Contribution)</option>
              <option value="Miscellaneous">Miscellaneous / Vending / Other</option>
            </Select>
          </div>

          {sourceType === 'Tenant' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Resident / Tenant Payee</label>
                <Select value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)}>
                  <option value="">Select Tenant...</option>
                  {tenants.filter((t: any) => t.unitId).map((t) => (
                    <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                  ))}
                </Select>
              </div>

              {selectedTenantId && (() => {
                const tenant = tenants.find((t) => t.id === selectedTenantId);
                const tenantProp = properties.find((p) => p.id === tenant?.propertyId);
                const tenantUnit = units.find((u) => u.id === tenant?.unitId);
                const tenantBldg = buildings.find((b) => b.id === tenantUnit?.buildingId);

                return (
                  <div className="p-4 bg-secondary/20 border border-border/40 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" /> Associated Location Details
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-foreground/80">
                      <div className="space-y-1">
                        <span className="text-[9px] text-muted-foreground uppercase block">Property</span>
                        <span className="flex items-center gap-1"><Home className="w-3 h-3 text-muted-foreground" /> {tenantProp ? tenantProp.name : 'N/A'}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-muted-foreground uppercase block">Building</span>
                        <span className="flex items-center gap-1"><Building className="w-3 h-3 text-muted-foreground" /> {tenantBldg ? tenantBldg.name : 'N/A'}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-muted-foreground uppercase block">Unit</span>
                        <span className="flex items-center gap-1"><Building className="w-3 h-3 text-muted-foreground" /> Unit {tenantUnit ? tenantUnit.unitNumber : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {sourceType === 'Owner' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Property Owner Payee</label>
                <Select value={selectedOwnerId} onChange={(e) => setSelectedOwnerId(e.target.value)}>
                  <option value="">Select Owner...</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>
                  ))}
                </Select>
              </div>

              {selectedOwnerId && (() => {
                const ownedProperties = properties.filter((p) => p.ownerId === selectedOwnerId);

                return (
                  <div className="space-y-4">
                    {ownedProperties.length > 1 && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Select Property</label>
                        <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                          <option value="">Choose Property...</option>
                          {ownedProperties.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </Select>
                      </div>
                    )}

                    {propertyId && (() => {
                      const resolvedProp = properties.find((p) => p.id === propertyId);
                      return (
                        <div className="p-4 bg-secondary/20 border border-border/40 rounded-2xl space-y-3">
                          <h4 className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                            <Home className="w-3.5 h-3.5 text-primary" /> Associated Property Details
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-foreground/80">
                            <div className="space-y-1">
                              <span className="text-[9px] text-muted-foreground uppercase block">Property Name</span>
                              <span>{resolvedProp ? resolvedProp.name : 'N/A'}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] text-muted-foreground uppercase block">Address</span>
                              <span>{resolvedProp ? resolvedProp.address || resolvedProp.streetAddress || 'N/A' : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          )}

          {sourceType === 'Miscellaneous' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Source / Payee Name</label>
                <Input placeholder="E.g., Laundry machine collection" value={miscSourceName} onChange={(e) => setMiscSourceName(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Property Portfolio</label>
                <Select value={propertyId} onChange={(e) => {
                  const pId = e.target.value;
                  setPropertyId(pId);
                  const matchingBld = buildings.find((b) => b.propertyId === pId);
                  setBuildingId(matchingBld ? matchingBld.id : '');
                  setUnitId('');
                }}>
                  <option value="">Select Property...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Rentable Unit</label>
                <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={!propertyId}>
                  <option value="">Select Unit...</option>
                  {units.filter((u) => u.propertyId === propertyId || (buildingId && u.buildingId === buildingId)).map((u) => (
                    <option key={u.id} value={u.id}>Unit {u.unitNumber} - {u.status}</option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Income Category</label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Rent">Rent Revenue</option>
              <option value="Utilities">Utilities Reimbursement</option>
              <option value="Late Fees">Late Fees Penalty</option>
              <option value="Parking">Parking Space Rent</option>
              <option value="Storage">Storage Lockers Rent</option>
              <option value="Pet Fees">Pet Rent Fee</option>
            </Select>
          </div>

          <CurrencyInput
            label="Payment Amount ($)"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                (sourceType === 'Tenant' && !selectedTenantId) ||
                (sourceType === 'Owner' && (!selectedOwnerId || !propertyId)) ||
                (sourceType === 'Miscellaneous' && (!miscSourceName || !propertyId)) ||
                createMutation.isPending
              }
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Income
            </Button>
          </div>

        </div>
      </FormDialog>
    </div>
  );
};
export default IncomePage;

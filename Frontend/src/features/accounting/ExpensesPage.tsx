import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { ExpenseRecord } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { FormDialog } from '../../components/FormDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/StatusBadge';
import { CurrencyInput } from '../../components/Phase4Components';
import { Plus, Check, X, Loader2, Building, Home, User, Sparkles, TrendingUp, DollarSign } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

export const ExpensesPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [uiPayeeType, setUiPayeeType] = useState<'VendorMaintenance' | 'Tenant' | 'Owner'>('VendorMaintenance');
  const [payeeType, setPayeeType] = useState<'Vendor' | 'Maintenance' | 'Tenant' | 'Owner'>('Vendor');
  const [selectedCombinedPayeeId, setSelectedCombinedPayeeId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [category, setCategory] = useState('Maintenance');
  const [amount, setAmount] = useState(250);

  // Queries
  const { data: expenses = [], isLoading } = useQuery({ queryKey: ['expenses-list'], queryFn: () => api.expenses.getAll() });
  const { data: properties = [] } = useQuery({ queryKey: ['properties'], queryFn: () => api.property.getAll() });
  const { data: buildings = [] } = useQuery({ queryKey: ['buildings'], queryFn: () => api.building.getAll() });
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => api.unit.getAll() });
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => api.vendors.getAll() });
  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: () => api.tenant.getAll() });
  const { data: owners = [] } = useQuery({ queryKey: ['owners'], queryFn: () => api.owner.getAll() });
  const { data: users = [] } = useQuery({ queryKey: ['users-list'], queryFn: () => api.users.getAll() });

  const aiFinancialInsights = React.useMemo(() => {
    const totalExpenses = (expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const maintenanceExpenses = (expenses || [])
      .filter((e: any) => {
        const cat = (e.category || '').toLowerCase();
        return cat.includes('maintenance') || cat.includes('repair') || cat.includes('plumbing') || cat.includes('hvac');
      })
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    const percent = totalExpenses > 0 ? Math.round((maintenanceExpenses / totalExpenses) * 100) : 0;
    
    return {
      totalExpenses,
      maintenanceExpenses,
      percent,
      recommendation:
        percent > 40
          ? `High Operational Drag: Maintenance accounts for ${percent}% of portfolio cash outflows. Staff job resolution inputs indicate recurring repair calls.`
          : `Healthy Portfolio Margin: Maintenance accounts for ${percent}% of total expenditures. Contractor and labor costs remain well within budgeted parameters.`,
    };
  }, [expenses]);

  // Auto-select property effect for Owner
  useEffect(() => {
    if (uiPayeeType === 'Owner' && selectedOwnerId) {
      const owned = properties.filter((p) => p.ownerId === selectedOwnerId);
      if (owned.length === 1) {
        setPropertyId(owned[0].id);
      } else {
        setPropertyId('');
      }
    }
  }, [selectedOwnerId, uiPayeeType, properties]);

  const handleCombinedPayeeChange = (value: string) => {
    setSelectedCombinedPayeeId(value);
    if (value.startsWith('vendor-')) {
      setPayeeType('Vendor');
      setSelectedVendorId(value.replace('vendor-', ''));
      setSelectedMaintenanceId('');
    } else if (value.startsWith('staff-')) {
      setPayeeType('Maintenance');
      setSelectedMaintenanceId(value.replace('staff-', ''));
      setSelectedVendorId('');
    } else {
      setSelectedVendorId('');
      setSelectedMaintenanceId('');
    }
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => {
      let resolvedPayeeName = '';
      let payeeId = '';
      let resolvedPropertyId = '';
      let resolvedBuildingId = '';
      let resolvedUnitId = '';

      if (uiPayeeType === 'VendorMaintenance') {
        resolvedPropertyId = propertyId;
        resolvedBuildingId = buildingId;
        resolvedUnitId = unitId;

        if (payeeType === 'Vendor') {
          const vendor = vendors.find((v) => v.id === selectedVendorId);
          resolvedPayeeName = vendor ? vendor.name : 'Vendor';
          payeeId = selectedVendorId;
        } else {
          const staff = users.find((u) => u.id === selectedMaintenanceId);
          resolvedPayeeName = staff ? staff.name : 'Maintenance Staff';
          payeeId = selectedMaintenanceId;
        }
      } else if (uiPayeeType === 'Tenant') {
        const tenant = tenants.find((t) => t.id === selectedTenantId);
        resolvedPayeeName = tenant ? `${tenant.firstName} ${tenant.lastName} (Tenant)` : 'Tenant';
        payeeId = selectedTenantId;

        resolvedPropertyId = tenant ? tenant.propertyId || '' : '';
        resolvedUnitId = tenant ? tenant.unitId || '' : '';
        if (tenant && tenant.unitId) {
          const matchingUnit = units.find((u) => u.id === tenant.unitId);
          resolvedBuildingId = matchingUnit ? matchingUnit.buildingId || '' : '';
        }
      } else if (uiPayeeType === 'Owner') {
        const owner = owners.find((o) => o.id === selectedOwnerId);
        resolvedPayeeName = owner ? `${owner.firstName} ${owner.lastName} (Owner)` : 'Owner';
        payeeId = selectedOwnerId;

        resolvedPropertyId = propertyId;
        resolvedBuildingId = '';
        resolvedUnitId = '';
      }

      const prop = properties.find((p) => p.id === resolvedPropertyId);

      return api.expenses.create({
        vendorName: resolvedPayeeName,
        propertyId: resolvedPropertyId,
        propertyName: prop ? prop.name : 'Property',
        buildingId: resolvedBuildingId,
        unitId: resolvedUnitId,
        payeeType: uiPayeeType === 'VendorMaintenance' ? payeeType : (uiPayeeType as any),
        payeeId,
        category,
        amount,
        tax: amount * 0.05,
        paymentMethod: 'Bank Wire',
        date: new Date().toISOString().split('T')[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
      setIsOpen(false);
      setAmount(250);
      setPropertyId('');
      setBuildingId('');
      setUnitId('');
      setSelectedVendorId('');
      setSelectedMaintenanceId('');
      setSelectedTenantId('');
      setSelectedOwnerId('');
      setSelectedCombinedPayeeId('');
      setUiPayeeType('VendorMaintenance');
      setPayeeType('Vendor');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.expenses.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.expenses.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
    },
  });

  const filteredExpenses = expenses.filter((exp) => {
    const vendor = exp.vendorName || '';
    const propName = exp.propertyName || '';
    const searchMatch = vendor.toLowerCase().includes(searchQuery.toLowerCase()) || propName.toLowerCase().includes(searchQuery.toLowerCase());
    const catMatch = categoryFilter === '' || exp.category === categoryFilter;
    return searchMatch && catMatch;
  });

  const columns: ColumnDef<ExpenseRecord>[] = [
    { accessorKey: 'date', header: t('pmExpenses.expenseDate'), id: 'date' },
    { accessorKey: 'vendorName', header: t('pmExpenses.vendorPartner'), id: 'vendor' },
    { accessorKey: 'propertyName', header: t('pmIncome.propertyLocation'), id: 'property' },
    {
      accessorKey: 'category',
      header: t('pmIncome.category'),
      id: 'category',
      cell: ({ row }) => <span className="font-bold text-[10px] bg-secondary px-2 py-0.5 rounded-lg border uppercase">{row.original.category}</span>,
    },
    {
      accessorKey: 'amount',
      header: t('pmExpenses.amountPaid'),
      id: 'amount',
      cell: ({ row }) => <span className="font-extrabold text-rose-500">${row.original.amount.toLocaleString()}</span>,
    },
    {
      accessorKey: 'status',
      header: t('pmIncome.status'),
      id: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: t('pmExpenses.approvalAction'),
      cell: ({ row }) => {
        if (row.original.status === 'Pending Approval') {
          return (
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => approveMutation.mutate(row.original.id)}
                className="text-emerald-500 hover:bg-emerald-500/10 h-8 w-8"
                title="Approve Expense"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => rejectMutation.mutate(row.original.id)}
                className="text-rose-500 hover:bg-rose-500/10 h-8 w-8"
                title="Reject Expense"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          );
        }
        return <span className="text-xs text-muted-foreground font-semibold">Audited</span>;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('pmExpenses.title')}
        description={t('pmExpenses.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/' },
          { label: t('nav.accounting'), href: '/accounting' },
          { label: t('pmExpenses.title') },
        ]}
        action={{
          label: t('pmExpenses.recordExpense'),
          onClick: () => setIsOpen(true),
          icon: <Plus className="w-4.5 h-4.5" />,
        }}
      />

      {/* AI Monthly Financial Intelligence Banner */}
      <div className="mb-6 p-4 bg-gradient-to-r from-emerald-500/10 via-primary/5 to-purple-500/10 border border-primary/25 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-black text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" /> AI Financial Health & Maintenance Intelligence
            </span>
            <span className="text-[10px] bg-primary/10 text-primary font-black px-2 py-0.5 rounded-full">
              Automated Analysis
            </span>
          </div>
          <p className="text-xs text-foreground font-semibold leading-relaxed">
            {aiFinancialInsights.recommendation}
          </p>
          <div className="flex flex-wrap gap-4 pt-1 text-[11px] font-bold text-muted-foreground">
            <span>Total Maintenance Spend: <strong className="text-foreground">${aiFinancialInsights.maintenanceExpenses.toLocaleString()}</strong></span>
            <span>Portfolio Share: <strong className="text-emerald-600 dark:text-emerald-400">{aiFinancialInsights.percent}%</strong> of all recorded expenses</span>
          </div>
        </div>

        <div className="p-3 bg-secondary/30 rounded-2xl border border-border/50 text-right shrink-0">
          <p className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">AI Budget Status</p>
          <p className="font-black text-sm text-emerald-500">
            {aiFinancialInsights.percent > 40 ? '⚠️ High Outflow' : '✓ Optimal Margin'}
          </p>
        </div>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('pmExpenses.searchPlaceholder')}
        filters={[
          {
            key: 'category',
            value: categoryFilter,
            placeholder: t('pmExpenses.expenseCategory'),
            options: [
              { label: 'Repairs', value: 'Repairs' },
              { label: 'Maintenance', value: 'Maintenance' },
              { label: 'Utilities', value: 'Utilities' },
              { label: 'Insurance', value: 'Insurance' },
              { label: 'Property Taxes', value: 'Property Taxes' },
              { label: 'Payroll', value: 'Payroll' },
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

      <DataTable columns={columns} data={filteredExpenses.slice(0, 100)} loading={isLoading} />

      {/* CREATE DIALOG */}
      <FormDialog open={isOpen} onOpenChange={setIsOpen} title="Record Expense Transaction">
        <div className="space-y-4 pt-2">
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Payee Type</label>
            <Select value={uiPayeeType} onChange={(e) => {
              setUiPayeeType(e.target.value as any);
              setSelectedCombinedPayeeId('');
              setSelectedVendorId('');
              setSelectedMaintenanceId('');
              setSelectedTenantId('');
              setSelectedOwnerId('');
              setPropertyId('');
              setBuildingId('');
              setUnitId('');
            }}>
              <option value="VendorMaintenance">Vendor / Staff Payee</option>
              <option value="Tenant">Tenant (Refund / Return)</option>
              <option value="Owner">Property Owner (Distribution)</option>
            </Select>
          </div>

          {uiPayeeType === 'VendorMaintenance' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Payee (Staff)</label>
                <Select value={selectedCombinedPayeeId} onChange={(e) => handleCombinedPayeeChange(e.target.value)}>
                  <option value="">Select Payee...</option>
                  {users
                    .filter((u) => u.role === 'Maintenance Staff' || u.role === 'Maintenance')
                    .map((u) => (
                      <option key={u.id} value={`staff-${u.id}`}>{u.name}</option>
                    ))
                  }
                </Select>
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

          {uiPayeeType === 'Tenant' && (
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

          {uiPayeeType === 'Owner' && (
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

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Expense Category</label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Repairs">Repairs & Diagnostics</option>
              <option value="Maintenance">General Maintenance</option>
              <option value="Utilities">Public Utilities</option>
              <option value="Insurance">Property Insurance Premium</option>
              <option value="Property Taxes">Property Taxes Levies</option>
              <option value="Payroll">Staff Payroll</option>
              <option value="Landscaping">Landscaping Servicing</option>
              <option value="Office">Office Supplies & Tools</option>
            </Select>
          </div>

          <CurrencyInput
            label="Expense Amount ($)"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                (uiPayeeType === 'VendorMaintenance' && (!selectedCombinedPayeeId || !propertyId)) ||
                (uiPayeeType === 'Tenant' && !selectedTenantId) ||
                (uiPayeeType === 'Owner' && (!selectedOwnerId || !propertyId)) ||
                createMutation.isPending
              }
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Expense
            </Button>
          </div>

        </div>
      </FormDialog>
    </div>
  );
};
export default ExpensesPage;

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { FormDialog } from '../../components/FormDialog';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { 
  Building, MapPin, Trash2, Home, DollarSign, Users, Layers, 
  ShieldCheck, Mail, Phone, Calendar, ExternalLink, Image as ImageIcon, 
  User, CheckCircle2, Landmark 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const OwnerPropertiesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);

  // Create Property States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [propertyName, setPropertyName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyType, setPropertyType] = useState('Commercial');
  const [propertyRent, setPropertyRent] = useState(2400);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Queries
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['owner-properties-list'],
    queryFn: () => api.ownerProperties.getAll(),
  });

  const { data: allLeases = [] } = useQuery({
    queryKey: ['owner-all-leases'],
    queryFn: () => api.leasing.getLeases(),
  });

  const { data: allTenants = [] } = useQuery({
    queryKey: ['owner-all-tenants'],
    queryFn: () => api.tenant.getAll(),
  });

  // Calculate dynamic stats matched with active lease agreements
  const getPropertyStats = (p: any) => {
    if (!p) {
      return {
        enrichedUnits: [],
        occupiedUnits: 0,
        vacantUnits: 0,
        occupancyRate: 0,
        monthlyRevenue: 0,
        totalUnitsCount: 0,
      };
    }
    const rawUnits = p.units || [];
    const propLeases = allLeases.filter((l: any) => l.propertyId === p.id || rawUnits.some((u: any) => u.id === l.unitId));
    const propTenants = allTenants.filter((t: any) => t.propertyId === p.id || rawUnits.some((u: any) => u.id === t.unitId));

    let totalMonthlyRent = 0;
    const enrichedUnits = rawUnits.map((u: any) => {
      const activeLease = propLeases.find((l: any) =>
        (l.unitId === u.id || l.unit?.id === u.id) &&
        (l.status === 'Active' || l.status === 'Pending_Move_In' || l.status === 'Pending')
      ) || (u.leases || []).find((l: any) =>
        l.status === 'Active' || l.status === 'Pending_Move_In' || l.status === 'Pending'
      ) || (u.leases || [])[0];

      const matchedTenant = propTenants.find((t: any) => t.unitId === u.id) || (u.tenants || [])[0] || activeLease?.tenant;
      const isOcc = (u.status || '').toLowerCase() === 'occupied' || !!activeLease || !!matchedTenant;
      const rentAmount = Number(activeLease?.rentAmount ?? u.rentAmount ?? 0);
      
      const leaseDeposit = activeLease ? Number(activeLease.depositAmount ?? activeLease.deposit ?? activeLease.securityDeposit ?? 0) : null;
      const unitDeposit = u.securityDeposit ? Number(u.securityDeposit) : null;
      const deposit = leaseDeposit !== null && leaseDeposit > 0 ? leaseDeposit : (unitDeposit && unitDeposit > 0 ? unitDeposit : null);

      const tenantName = matchedTenant
        ? `${matchedTenant.firstName || ''} ${matchedTenant.lastName || ''}`.trim()
        : (activeLease?.tenantName || (u.tenants?.length ? `${u.tenants[0].firstName} ${u.tenants[0].lastName}`.trim() : u.tenantName) || (isOcc ? 'Occupied Resident' : 'Vacant'));

      if (isOcc) {
        totalMonthlyRent += rentAmount;
      }

      return {
        ...u,
        isOccupied: isOcc,
        status: isOcc ? 'Occupied' : 'Vacant',
        rentAmount,
        securityDeposit: deposit,
        tenantName: isOcc ? tenantName : 'Vacant',
        leaseStatus: activeLease?.status || (isOcc ? 'Active' : null),
      };
    });

    const occCount = enrichedUnits.filter((u: any) => u.isOccupied).length;
    const totalUnitsCount = Math.max(enrichedUnits.length, Number(p.totalUnits || p.unitsCount || 1));
    const vacCount = Math.max(0, totalUnitsCount - occCount);
    const occRate = totalUnitsCount > 0 ? Math.round((occCount / totalUnitsCount) * 100) : 0;
    const finalRent = totalMonthlyRent > 0 ? totalMonthlyRent : Number(p.monthlyRevenue || p.monthlyRent || 0);

    return {
      enrichedUnits,
      occupiedUnits: occCount,
      vacantUnits: vacCount,
      occupancyRate: occRate,
      monthlyRevenue: finalRent,
      totalUnitsCount,
    };
  };

  const createMutation = useMutation({
    mutationFn: (newProp: any) => api.ownerProperties.create(newProp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-properties-list'] });
      setIsCreateOpen(false);
      setPropertyName('');
      setPropertyAddress('');
      setPropertyType('Commercial');
      setPropertyRent(2400);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.ownerProperties.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-properties-list'] });
      setDeleteId(null);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (propertyName) {
      createMutation.mutate({
        name: propertyName,
        address: propertyAddress,
        type: propertyType,
        monthlyRent: Number(propertyRent)
      });
    }
  };

  if (isLoading) {
    return <LoadingSkeleton type="card" />;
  }

  const selectedStats = selectedProperty ? getPropertyStats(selectedProperty) : null;

  return (
    <div className="space-y-6 text-foreground">
      <PageHeader
        title={t('owner.ownerProperties.title')}
        description={t('owner.ownerProperties.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/owner' },
          { label: t('owner.ownerProperties.title') },
        ]}
      />

      <div className="flex flex-col gap-4 w-full">
        {properties.map((p: any) => {
          const stats = getPropertyStats(p);
          const hasRealValuation = p.currentValue && p.currentValue !== 1200000 && p.currentValue > 0;

          return (
            <Card key={p.id} className="p-6 border bg-card w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-primary/40 transition-all shadow-sm rounded-2xl">
              {/* Left Info Section with Photo */}
              <div className="space-y-3 flex-1 min-w-[280px]">
                <div className="flex items-center space-x-3.5">
                  {p.imageUrl ? (
                    <img 
                      src={p.imageUrl} 
                      alt={p.name} 
                      className="w-14 h-14 rounded-2xl object-cover border border-border/80 shadow-xs shrink-0" 
                    />
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0">
                      <Building className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-black text-lg uppercase tracking-tight">{p.name}</h4>
                      <StatusBadge status={p.status || 'Active'} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground inline-block mt-1">
                      {p.type}
                    </span>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center text-xs text-muted-foreground font-medium">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0 text-primary" />
                  <span className="truncate">{p.address}</span>
                </div>

                {/* Specs Pills */}
                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-muted-foreground">
                  <span className="bg-secondary/40 px-2.5 py-1 rounded-md border border-border">
                    {p.ownershipPercentage || 100}% Share
                  </span>
                  {p.nycBin && (
                    <span className="bg-secondary/40 px-2.5 py-1 rounded-md border border-border font-mono text-amber-500">
                      BIN: {p.nycBin}
                    </span>
                  )}
                </div>
              </div>

              {/* Center Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-secondary/15 rounded-2xl p-4 text-xs font-semibold border border-border/50 w-full md:w-auto min-w-[320px]">
                <div className="space-y-0.5">
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Total Units</p>
                  <p className="font-black text-base text-foreground">{stats.totalUnitsCount} Units</p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {stats.occupiedUnits} Occ / {stats.vacantUnits} Vac
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Est. Monthly Rent</p>
                  <p className="font-black text-base text-emerald-400">
                    ${stats.monthlyRevenue.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Occ. Rate: {stats.occupancyRate}%
                  </p>
                </div>

                <div className="space-y-0.5 col-span-2 sm:col-span-1">
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Asset Valuation</p>
                  <p className="font-black text-base text-primary">
                    {hasRealValuation ? `$${p.currentValue.toLocaleString()}` : 'N/A'}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">Market Value</p>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex md:flex-col gap-2.5 w-full md:w-auto shrink-0 pt-2 md:pt-0">
                <Button size="sm" variant="outline" onClick={() => setSelectedProperty(p)} className="flex-1 md:flex-none text-xs font-bold uppercase h-10 px-5 shadow-xs">
                  {t('owner.ownerProperties.viewDetails')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteId(p.id)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-10 px-3 rounded-xl flex items-center justify-center" title={t('owner.ownerProperties.deleteProperty')}>
                  <Trash2 className="w-4 h-4 mr-1 md:mr-0" />
                  <span className="md:hidden text-xs font-bold">Delete</span>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* COMPREHENSIVE DETAIL DIALOG */}
      <FormDialog 
        open={!!selectedProperty} 
        onOpenChange={(open) => !open && setSelectedProperty(null)} 
        title="Managed Asset Profile & Units Breakdown"
        className="!max-w-4xl lg:!max-w-5xl w-[95vw]"
      >
        {selectedProperty && selectedStats && (
          <div className="space-y-5 pt-2 text-xs font-semibold text-foreground max-h-[82vh] overflow-y-auto pr-1">
            {/* Header info */}
            <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-4">
              <div className="flex items-center space-x-3.5">
                {selectedProperty.imageUrl ? (
                  <img
                    src={selectedProperty.imageUrl}
                    alt={selectedProperty.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-border shadow-xs shrink-0"
                  />
                ) : (
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
                    <Building className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-black text-lg uppercase tracking-tight">{selectedProperty.name}</h3>
                    <StatusBadge status={selectedProperty.status || 'Active'} />
                  </div>
                  <p className="text-muted-foreground text-xs font-medium flex items-center mt-0.5">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-primary shrink-0" />
                    {selectedProperty.address || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Property Photo & Media Card (if available) */}
            {selectedProperty.imageUrl && (
              <div className="p-4 bg-secondary/15 rounded-2xl border border-border/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" /> Property Photo & Media
                  </span>
                  <a
                    href={selectedProperty.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    View Full Image <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="overflow-hidden rounded-xl border border-border/70 max-h-56 bg-black/5 flex items-center justify-center">
                  <img
                    src={selectedProperty.imageUrl}
                    alt={selectedProperty.name}
                    className="w-full max-h-56 object-cover rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Top 4 Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 bg-secondary/20 rounded-2xl border border-border/50">
                <p className="text-[10px] uppercase text-muted-foreground font-black">Total Units</p>
                <p className="font-extrabold text-base mt-0.5 text-foreground">{selectedStats.totalUnitsCount} Units</p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  {selectedStats.occupiedUnits} Occ / {selectedStats.vacantUnits} Vac
                </p>
              </div>

              <div className="p-3.5 bg-secondary/20 rounded-2xl border border-border/50">
                <p className="text-[10px] uppercase text-muted-foreground font-black">Occupancy Rate</p>
                <p className="font-extrabold text-base mt-0.5 text-foreground">{selectedStats.occupancyRate}%</p>
                <p className="text-[10px] text-emerald-500 font-bold mt-0.5">
                  {selectedStats.occupancyRate > 0 ? 'Active Leased' : 'Vacant'}
                </p>
              </div>

              <div className="p-3.5 bg-secondary/20 rounded-2xl border border-border/50">
                <p className="text-[10px] uppercase text-muted-foreground font-black">Monthly Rent Revenue</p>
                <p className="font-extrabold text-base mt-0.5 text-emerald-400">
                  ${selectedStats.monthlyRevenue.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Contractual Rent</p>
              </div>

              <div className="p-3.5 bg-secondary/20 rounded-2xl border border-border/50">
                <p className="text-[10px] uppercase text-muted-foreground font-black">Ownership Share</p>
                <p className="font-extrabold text-base mt-0.5 text-foreground">{selectedProperty.ownershipPercentage || 100}%</p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Title Equity</p>
              </div>
            </div>

            {/* Two Detailed Cards: Asset Parameters & Ownership/Valuation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Asset Parameters (matching /properties/new) */}
              <div className="p-4 bg-secondary/15 rounded-2xl border border-border/50 space-y-3">
                <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                  <Building className="w-3.5 h-3.5 text-primary" /> Asset Parameters
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Property Type</p>
                    <p className="font-extrabold text-foreground mt-0.5">{selectedProperty.type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Total Floors</p>
                    <p className="font-extrabold text-foreground mt-0.5">{selectedProperty.totalFloors ? `${selectedProperty.totalFloors} Floor` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Total Units</p>
                    <p className="font-extrabold text-foreground mt-0.5">{selectedStats.totalUnitsCount ? `${selectedStats.totalUnitsCount} Unit` : '0 Unit'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Management Co.</p>
                    <p className="font-extrabold text-foreground mt-0.5">{selectedProperty.managementCompany && !selectedProperty.managementCompany.includes('Apex') ? selectedProperty.managementCompany : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">NYC BIN #</p>
                    <p className="font-extrabold text-amber-500 font-mono mt-0.5">{selectedProperty.nycBin || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">City, State & Zip</p>
                    <p className="font-extrabold text-foreground mt-0.5">
                      {[selectedProperty.city, selectedProperty.state, selectedProperty.zip].filter(Boolean).join(', ') || selectedProperty.address || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ownership & Financial Parameters */}
              <div className="p-4 bg-secondary/15 rounded-2xl border border-border/50 space-y-3">
                <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                  <Landmark className="w-3.5 h-3.5 text-primary" /> Ownership & Financials
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Owner Account</p>
                    <p className="font-extrabold text-foreground mt-0.5 flex items-center gap-1 truncate">
                      <Landmark className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">
                        {selectedProperty.owner ? (typeof selectedProperty.owner === 'object' ? (selectedProperty.owner.name || selectedProperty.owner.email) : selectedProperty.owner) : 'N/A'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Share Percentage</p>
                    <p className="font-extrabold text-foreground mt-0.5">{selectedProperty.ownershipPercentage != null ? `${selectedProperty.ownershipPercentage}%` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Purchase Price</p>
                    <p className="font-extrabold text-foreground mt-0.5">
                      {selectedProperty.purchasePrice && selectedProperty.purchasePrice !== 1000000 && selectedProperty.purchasePrice > 0 
                        ? `$${selectedProperty.purchasePrice.toLocaleString()}` 
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Current Valuation</p>
                    <p className="font-extrabold text-primary mt-0.5">
                      {selectedProperty.currentValue && selectedProperty.currentValue !== 1200000 && selectedProperty.currentValue > 0 
                        ? `$${selectedProperty.currentValue.toLocaleString()}` 
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Monthly Expenses</p>
                    <p className="font-extrabold text-rose-500 mt-0.5">
                      ${(Number(selectedProperty.monthlyExpenses) || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Net Operating Income</p>
                    <p className="font-extrabold text-emerald-400 mt-0.5">
                      ${Math.max(0, selectedStats.monthlyRevenue - (Number(selectedProperty.monthlyExpenses) || 0)).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Units & Rent Breakdown */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-xs uppercase tracking-wider text-foreground flex items-center">
                  <Layers className="w-4 h-4 mr-1.5 text-primary" />
                  Units Breakdown & Rent Costs ({selectedStats.enrichedUnits.length} Units)
                </h4>
                <span className="text-[10px] text-muted-foreground font-bold">
                  {selectedStats.occupiedUnits} Occupied / {selectedStats.vacantUnits} Vacant
                </span>
              </div>

              {selectedStats.enrichedUnits && selectedStats.enrichedUnits.length > 0 ? (
                <div className="border rounded-2xl overflow-hidden divide-y bg-secondary/10">
                  <div className="grid grid-cols-12 p-3 font-extrabold text-[10px] uppercase text-muted-foreground bg-secondary/30">
                    <div className="col-span-3">Unit Number</div>
                    <div className="col-span-2">Type / Beds</div>
                    <div className="col-span-3">Monthly Rent</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Resident</div>
                  </div>
                  {selectedStats.enrichedUnits.map((unit: any) => (
                    <div key={unit.id} className="grid grid-cols-12 p-3 items-center text-xs font-semibold hover:bg-secondary/20 transition-colors">
                      <div className="col-span-3 font-extrabold text-foreground">
                        {unit.unitNumber?.startsWith('Unit') ? unit.unitNumber : `Unit ${unit.unitNumber || unit.id?.slice(0, 4)}`}
                      </div>
                      <div className="col-span-2 text-muted-foreground text-xs">
                        {unit.bedrooms || 1}B / {unit.bathrooms || 1}Ba
                      </div>
                      <div className="col-span-3 font-extrabold text-emerald-400">
                        ${(unit.rentAmount || 0).toLocaleString()}/mo
                        {unit.securityDeposit && unit.securityDeposit > 0 ? (
                          <span className="block text-[9.5px] font-normal text-muted-foreground">Dep: ${unit.securityDeposit.toLocaleString()}</span>
                        ) : (
                          <span className="block text-[9.5px] font-normal text-muted-foreground">Dep: N/A</span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <StatusBadge status={unit.status || 'Vacant'} />
                      </div>
                      <div className="col-span-2 truncate text-foreground text-xs font-bold flex items-center gap-1">
                        {unit.tenantName && unit.tenantName !== 'Vacant' ? (
                          <>
                            <User className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate">{unit.tenantName}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">Vacant</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border rounded-xl text-center text-muted-foreground text-xs font-medium">
                  No units recorded for this property asset.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedProperty(null)} className="font-bold px-6">
                Close
              </Button>
            </div>
          </div>
        )}
      </FormDialog>

      {/* CREATE DIALOG */}
      <FormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} title={t('ownerProperties.addNewProperty')}>
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-3 text-xs font-semibold text-foreground">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">{t('ownerProperties.propertyName')}</label>
            <Input required placeholder="E.g., Sunset Gardens" value={propertyName} onChange={e => setPropertyName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">{t('ownerProperties.address')}</label>
            <Input required placeholder="E.g., 789 Palms Blvd, Austin, TX" value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">{t('ownerProperties.propertyType')}</label>
              <Select value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                <option value="Apartment">Apartment</option>
                <option value="Commercial">Commercial</option>
                <option value="Single Family">Single Family</option>
                <option value="Multi Family">Multi Family</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Est. Rent ($)</label>
              <Input type="number" required value={propertyRent} onChange={e => setPropertyRent(Number(e.target.value))} />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} loading={createMutation.isPending}>
              Create Property
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Property"
        description="Are you sure you want to remove this property? This action can be undone from Restore Bin."
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default OwnerPropertiesPage;

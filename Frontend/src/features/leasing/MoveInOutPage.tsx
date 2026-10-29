import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { useNavigate } from '@tanstack/react-router';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Eye, Edit, Trash2, Calendar, ClipboardList, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export const MoveInOutPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>(''); // empty means all

  // Load Move Ins from backend database
  const { data: rawMoveIns = [], isLoading: isLoadingMoves, isFetching: isFetchingMoves, refetch: refetchMoves } = useQuery({
    queryKey: ['moveIns', statusFilter],
    queryFn: () => api.moveIns.getAll(statusFilter),
  });

  // Also load Leases to seamlessly surface any Pending Move In lease
  const { data: allLeases = [], isLoading: isLoadingLeases, isFetching: isFetchingLeases, refetch: refetchLeases } = useQuery({
    queryKey: ['leases'],
    queryFn: () => api.leasing.getLeases(),
  });

  const isLoading = isLoadingMoves && isLoadingLeases;
  const isFetching = isFetchingMoves || isFetchingLeases;
  const refetch = () => {
    refetchMoves();
    refetchLeases();
  };

  // Combine DB moveIns with any Lease that is in Pending_Move_In
  const moveIns = React.useMemo(() => {
    // Filter out corrupted/orphaned move-ins that have no lease and no unit
    const validRawMoveIns = (rawMoveIns || []).filter((m: any) => {
      const hasLease = Boolean(m.lease || m.leaseId || m.lease?.tenantName);
      const hasUnit = Boolean(m.unit || m.unitId || m.unit?.unitNumber);
      return hasLease || hasUnit;
    });

    const list = [...validRawMoveIns];
    const registeredLeaseIds = new Set(
      list.map((m: any) => m.leaseId || m.lease?.id).filter(Boolean)
    );

    allLeases.forEach((lease: any) => {
      const leaseStatus = String(lease.status || '').trim();
      const isPendingMoveIn = 
        leaseStatus === 'Pending_Move_In' || 
        leaseStatus === 'Pending Move In' || 
        leaseStatus.toLowerCase().includes('pending');

      if (isPendingMoveIn && !registeredLeaseIds.has(lease.id)) {
        if (!statusFilter || statusFilter === 'SCHEDULED') {
          list.push({
            id: `lease-movein-${lease.id}`,
            leaseId: lease.id,
            scheduledDate: lease.startDate || new Date().toISOString(),
            status: 'SCHEDULED',
            isVirtual: true,
            lease: {
              ...lease,
              tenant: lease.tenant || (lease.tenantName ? {
                firstName: lease.tenantName.split(' ')[0],
                lastName: lease.tenantName.split(' ').slice(1).join(' '),
              } : undefined),
            },
            unit: lease.unit || {
              id: lease.unitId,
              unitNumber: lease.unitNumber || 'Unit',
              property: lease.property || { name: lease.propertyName || 'Property' },
            },
          });
        }
      }
    });

    return list;
  }, [rawMoveIns, allLeases, statusFilter]);

  const completeMutation = useMutation({
    mutationFn: async (moveInItem: any) => {
      const targetId = typeof moveInItem === 'string' ? moveInItem : moveInItem?.id;
      if (!targetId) return;

      if (targetId.startsWith('lease-movein-') || (moveInItem && moveInItem.isVirtual)) {
        const leaseId = targetId.replace('lease-movein-', '');
        const targetLease = allLeases.find((l: any) => l.id === leaseId);
        const unitId = targetLease?.unitId || targetLease?.unit?.id || moveInItem?.unit?.id;

        // Try creating moveIn first in DB so inspection history is preserved
        try {
          const created = await api.moveIns.create({
            leaseId,
            unitId,
            scheduledDate: targetLease?.startDate || new Date().toISOString(),
            status: 'SCHEDULED',
          });
          if (created?.id) {
            await api.moveIns.complete(created.id);
          }
        } catch (e) {
          // Direct fallback activation
          await api.leasing.updateLease(leaseId, { status: 'Active' });
          if (unitId) {
            try { await api.unit.update(unitId, { status: 'Occupied' }); } catch {}
          }
        }
        return;
      }

      await api.moveIns.complete(targetId);
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['moveIns'] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });

  const statusFilters = [
    { label: 'All Moves', value: '' },
    { label: 'Scheduled', value: 'SCHEDULED' },
    { label: 'Inspection In Progress', value: 'INSPECTION_IN_PROGRESS' },
    { label: 'Inspection Completed', value: 'INSPECTION_COMPLETED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Move In Workflow Registry"
        description="Monitor upcoming tenant move-in schedules, checklist templates, and condition review signoffs."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Leasing', href: '/leasing/move-in' },
          { label: 'Move In Registry' },
        ]}
        action={{
          label: isFetching ? 'Refreshing...' : 'Refresh Registry',
          onClick: () => refetch(),
          icon: <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        }}
      />

      {/* FILTER TABS */}
      <div className="flex flex-wrap gap-1.5 border-b pb-4">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={`text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all ${
              statusFilter === filter.value
                ? 'bg-primary text-white shadow-sm shadow-primary/20 scale-102'
                : 'bg-card border text-muted-foreground hover:text-foreground'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm text-foreground">
        {isLoading ? (
          <div className="py-12 text-center text-xs font-semibold text-muted-foreground">Loading registry entries...</div>
        ) : moveIns.length === 0 ? (
          <div className="py-12 text-center text-xs font-semibold text-muted-foreground space-y-3">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="font-extrabold text-sm text-foreground">No Moves Found</h3>
            <p className="text-[10px] text-muted-foreground max-w-sm mx-auto">Create a lease agreement to schedule and generate a move-in checklist record automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-4">Resident</th>
                  <th className="p-4">Property</th>
                  <th className="p-4">Unit</th>
                  <th className="p-4">Scheduled Date</th>
                  <th className="p-4">Workflow Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y font-semibold text-foreground">
                {moveIns.map((m: any) => {
                  const lease = m.lease || {};
                  const tenant = lease.tenant || m.tenant || {};
                  const unit = m.unit || lease.unit || {};
                  const property = unit.property || lease.property || {};
                  
                  const tenantName = (tenant.firstName || tenant.lastName)
                    ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim()
                    : (tenant.name || lease.tenantName || m.tenantName || 'Resident');
                  const propertyName = property.name || property.address || lease.propertyName || m.propertyName || 'Property';
                  const unitNumber = unit.unitNumber || lease.unitNumber || m.unitNumber || 'Unit';

                  return (
                    <tr key={m.id} className="hover:bg-accent/40 transition">
                      <td className="p-4 font-bold text-primary">{tenantName}</td>
                      <td className="p-4 font-bold">{propertyName}</td>
                      <td className="p-4">{unitNumber}</td>
                      <td className="p-4 font-mono text-muted-foreground">{new Date(m.scheduledDate).toLocaleDateString()}</td>
                      <td className="p-4">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        {m.status === 'SCHEDULED' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => completeMutation.mutate(m)}
                            disabled={completeMutation.isPending}
                            className="border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 font-bold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Skip Inspection
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigate({ to: `/leasing/move-in/${m.id}` })}
                        >
                          <Eye className="w-4 h-4 mr-1" /> View Workflow
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoveInOutPage;

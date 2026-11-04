import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { useNavigate } from '@tanstack/react-router';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Eye, ClipboardList, RefreshCw, CheckCircle2 } from 'lucide-react';

export const MoveOutRegistryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>(''); // empty means all

  // Load Move Outs from backend database
  const { data: rawMoveOuts = [], isLoading: isLoadingMoves, isFetching, refetch } = useQuery({
    queryKey: ['moveOuts', statusFilter],
    queryFn: () => api.moveOuts.getAll(statusFilter),
  });

  // Load all leases to ensure terminated / ended leases show up in Move Out registry
  const { data: allLeases = [], isLoading: isLoadingLeases } = useQuery({
    queryKey: ['leases'],
    queryFn: () => api.leasing.getLeases(),
  });

  const isLoading = isLoadingMoves || isLoadingLeases;

  // Merge backend move-outs with terminated / ended leases
  const moveOuts = React.useMemo(() => {
    const list = [...rawMoveOuts];
    const existingLeaseIds = new Set(
      list.map((m: any) => m.leaseId || m.lease?.id).filter(Boolean)
    );

    allLeases.forEach((l: any) => {
      const isTerminatedOrEnded = ['Terminated', 'Ended', 'Expired', 'Cancelled'].includes(l.status);
      if (isTerminatedOrEnded && !existingLeaseIds.has(l.id)) {
        if (!statusFilter || statusFilter === 'SCHEDULED') {
          list.push({
            id: `lease-moveout-${l.id}`,
            leaseId: l.id,
            unitId: l.unitId,
            scheduledDate: l.endDate || l.createdAt || new Date().toISOString(),
            status: 'SCHEDULED',
            notes: 'Auto-detected from lease status',
            lease: l,
            unit: l.unit,
          });
        }
      }
    });

    return list;
  }, [rawMoveOuts, allLeases, statusFilter]);

  const completeMutation = useMutation({
    mutationFn: async (m: any) => {
      const moveOutId = typeof m === 'string' ? m : m.id;
      const res = await api.moveOuts.complete(moveOutId);
      // Guarantee lease is Ended and unit is Vacant if virtual or fallback
      const realLeaseId = (m.leaseId || m.lease?.id || moveOutId).replace('lease-moveout-', '');
      const unitId = m.unitId || m.unit?.id || m.lease?.unitId;
      const tenantId = m.lease?.tenantId || m.lease?.tenant?.id;
      if (realLeaseId) {
        await api.leasing.updateLease(realLeaseId, { status: 'Ended' }).catch(() => {});
        if (unitId) {
          await api.unit.update(unitId, { status: 'Vacant' }).catch(() => {});
        }
        if (tenantId) {
          await api.tenant.update(tenantId, { status: 'Inactive', unitId: null }).catch(() => {});
        }
      }
      return res;
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['moveOuts'] });
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
    { label: 'Damage Review', value: 'DAMAGE_REVIEW' },
    { label: 'Ready for Completion', value: 'READY_FOR_COMPLETION' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Move Out Workflow Registry"
        description="Monitor upcoming tenant move-out schedules, inspect damages, and signoff final security deposit refunds."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Leasing', href: '/leasing/move-out' },
          { label: 'Move Out Registry' },
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
        ) : moveOuts.length === 0 ? (
          <div className="py-12 text-center text-xs font-semibold text-muted-foreground space-y-3">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="font-extrabold text-sm text-foreground">No Move Outs Found</h3>
            <p className="text-[10px] text-muted-foreground max-w-sm mx-auto">Create a move-out record from the active leases page to schedule a checklist.</p>
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
                {moveOuts.map((m: any) => {
                  const lease = m.lease || {};
                  const tenant = lease.tenant || {};
                  const unit = m.unit || {};
                  const property = unit.property || {};
                  
                  const tenantName = tenant.firstName ? `${tenant.firstName} ${tenant.lastName}` : 'Resident';
                  const propertyName = property.name || 'Property';
                  const unitNumber = unit.unitNumber || 'Unit';

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
                          onClick={() => navigate({ to: `/leasing/move-out/${m.id}` })}
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

export default MoveOutRegistryPage;

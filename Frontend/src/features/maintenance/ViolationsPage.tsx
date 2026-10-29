import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { Violation } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/Dialog';
import { Wrench, ShieldAlert, Eye, Download, Info, Building2, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

export const ViolationsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');

  // Sync Modal states
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [binNumber, setBinNumber] = useState('4115368');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMode, setSyncMode] = useState<'bulk' | 'single'>('bulk');
  const [syncResult, setSyncResult] = useState<{ 
    success?: boolean; 
    message?: string; 
    count?: number;
    details?: Array<{ propertyName: string; bin: string; count: number }>;
  } | null>(null);

  // Queries
  const { data: violations = [], isLoading } = useQuery({ 
    queryKey: ['violations-list'], 
    queryFn: () => api.violations.getAll() 
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties-list'],
    queryFn: () => api.property.getAll()
  });

  const createWorkOrderMutation = useMutation({
    mutationFn: (id: string) => api.violations.createWorkOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violations-list'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['service-requests-list'] });
      alert('Dispatched! Violation is now converted into a Service Request. You can assign it from Service Requests.');
    },
  });

  const handleOpenSyncModal = () => {
    setSyncResult(null);
    setIsSyncModalOpen(true);
  };

  const handleExecuteBulkSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const result: any = await api.violations.syncAllDob();
      queryClient.invalidateQueries({ queryKey: ['violations-list'] });
      
      const totalCount = result?.totalSyncedCount ?? 0;
      const details = result?.syncedProperties || [];

      setSyncResult({
        success: true,
        message: `Successfully synced ${totalCount} violation(s) across all registered NYC properties!`,
        count: totalCount,
        details: details.map((d: any) => ({
          propertyName: d.propertyName || d.address || `Property BIN ${d.bin}`,
          bin: d.bin,
          count: d.syncedCount ?? d.fetchedCount ?? d.count ?? 0,
        })),
      });
    } catch (err: any) {
      console.error('Bulk DOB Sync failed', err);
      setSyncResult({
        success: false,
        message: err?.response?.data?.message || 'Failed to bulk-sync NYC DOB Open Data. Please try again.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExecuteSingleSync = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanBin = binNumber.trim();
    if (!cleanBin) return;

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const result: any = await api.violations.syncDob(cleanBin);
      queryClient.invalidateQueries({ queryKey: ['violations-list'] });
      const count = result?.syncedCount ?? 0;
      setSyncResult({
        success: true,
        message: `Successfully fetched and synced ${count} violation(s) for BIN ${cleanBin} from NYC Open Data.`,
        count,
      });
    } catch (err: any) {
      console.error('DOB Sync failed', err);
      setSyncResult({
        success: false,
        message: err?.response?.data?.message || 'Failed to connect to NYC DOB Open Data API. Please verify the BIN number.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredViolations = violations.filter((v: any) => {
    if (!v) return false;
    const q = (searchQuery || '').toLowerCase().trim();
    const authorityVal = String(v.issuingAuthority || '');
    const descVal = String(v.description || '');
    const propNameVal = String(v.propertyName || (v.property ? v.property.name : '') || '');
    const codeVal = String(v.violationCode || v.id || '');
    const statusVal = String(v.status || '');
    const severityVal = String(v.severity || '');

    const searchMatch = !q || 
      authorityVal.toLowerCase().includes(q) || 
      descVal.toLowerCase().includes(q) || 
      propNameVal.toLowerCase().includes(q) ||
      codeVal.toLowerCase().includes(q) ||
      statusVal.toLowerCase().includes(q) ||
      severityVal.toLowerCase().includes(q);
    
    const severityMatch = !severityFilter || severityVal.toLowerCase() === severityFilter.toLowerCase();
    const statusMatch = !statusFilter || statusVal.toLowerCase() === statusFilter.toLowerCase();
    const propIdVal = String(v.propertyId || (v.property ? v.property.id : '') || '');
    const propertyMatch = !propertyFilter || propIdVal === propertyFilter || propNameVal.toLowerCase().includes(propertyFilter.toLowerCase());
    
    return searchMatch && severityMatch && statusMatch && propertyMatch;
  });

  const columns: ColumnDef<Violation>[] = [
    {
      accessorKey: 'violationCode',
      header: 'Violation Reference',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{row.original.violationCode}</span>
          <span className="text-xs text-muted-foreground">{row.original.issuingAuthority || 'NYC DOB'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'propertyName',
      header: 'Property / Location',
      cell: ({ row }) => {
        let name = row.original.propertyName || 'Building Asset';
        if (name.includes('4115368')) {
          name = '13324 Sanford Ave, Flushing, NY 11355';
        } else if (name.includes('1000000')) {
          name = '3858 Broadway, New York, NY';
        } else if (name.startsWith('NYC Building Asset') || name.startsWith('NYC Property Asset')) {
          const matched = name.match(/\(BIN (\d+)\)/);
          name = matched ? `NYC Property (BIN: ${matched[1]})` : name;
        }
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              {name}
            </span>
            <span className="text-xs text-muted-foreground">Unit: {row.original.unitNumber || 'Building Wide'}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'description',
      header: 'Code Description',
      cell: ({ row }) => (
        <p className="text-xs text-muted-foreground line-clamp-2 max-w-md" title={row.original.description}>
          {row.original.description}
        </p>
      ),
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
            row.original.severity === 'Critical'
              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
          }`}
        >
          {row.original.severity}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Compliance Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'fineAmount',
      header: 'Fine Amount',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold text-foreground">
          ${(row.original.fineAmount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Corrective Action',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.status === 'Resolved' || row.original.status === 'Settled' ? (
            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
              Settled
            </span>
          ) : row.original.status === 'Disputed' || row.original.workOrderId ? (
            <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
              Dispatched
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
              onClick={() => createWorkOrderMutation.mutate(row.original.id)}
              disabled={createWorkOrderMutation.isPending}
            >
              <Wrench className="w-3.5 h-3.5" />
              Dispatch
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('maintenanceViolations.title')}
        description={t('maintenanceViolations.desc')}
        breadcrumbs={[{ label: t('header.home'), href: '/' }, { label: t('nav.maintenance'), href: '/maintenance' }, { label: t('maintenanceViolations.title') }]}
        action={{
          label: 'Sync NYC DOB',
          onClick: handleOpenSyncModal,
          icon: <ShieldAlert className="w-4.5 h-4.5" />,
        }}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search violations by property address, authority, description, code..."
        filters={[
          {
            key: 'property',
            value: propertyFilter,
            placeholder: 'All Properties',
            options: properties.map((p) => ({
              label: `${p.name} ${p.nycBin ? `(BIN: ${p.nycBin})` : ''}`,
              value: p.id,
            })),
          },
          {
            key: 'severity',
            value: severityFilter,
            placeholder: 'All Severities',
            options: [
              { label: 'Critical Alert', value: 'Critical' },
              { label: 'Warning Notice', value: 'Warning' },
            ],
          },
          {
            key: 'status',
            value: statusFilter,
            placeholder: 'All Statuses',
            options: [
              { label: 'Open Violation', value: 'Open' },
              { label: 'Resolved Compliant', value: 'Resolved' },
              { label: 'Disputed Claim', value: 'Disputed' },
            ],
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'property') setPropertyFilter(val);
          if (key === 'severity') setSeverityFilter(val);
          if (key === 'status') setStatusFilter(val);
        }}
        onReset={() => {
          setSearchQuery('');
          setPropertyFilter('');
          setSeverityFilter('');
          setStatusFilter('');
          queryClient.invalidateQueries({ queryKey: ['violations-list'] });
          queryClient.invalidateQueries({ queryKey: ['properties-list'] });
        }}
      />

      <DataTable columns={columns} data={filteredViolations} loading={isLoading} />

      {/* Sync NYC DOB React Modal Popup */}
      <Dialog open={isSyncModalOpen} onOpenChange={setIsSyncModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Building2 className="w-5 h-5 text-indigo-500" />
              <DialogTitle className="text-lg font-bold">Sync NYC DOB Violations</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Fetch live violations directly from NYC Open Data (Socrata API). You can bulk-sync all registered company properties or enter a single BIN manually.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Sync Mode Selector */}
            <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setSyncMode('bulk')}
                className={`py-1.5 px-3 text-xs font-semibold rounded-md transition-all ${
                  syncMode === 'bulk'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ⚡ Sync All Properties (Bulk)
              </button>
              <button
                type="button"
                onClick={() => setSyncMode('single')}
                className={`py-1.5 px-3 text-xs font-semibold rounded-md transition-all ${
                  syncMode === 'single'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🔍 Manual Single BIN
              </button>
            </div>

            {syncMode === 'single' ? (
              <form onSubmit={handleExecuteSingleSync} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>NYC BIN (Building Identification Number)</span>
                    <span className="text-[10px] text-muted-foreground font-normal">7-Digit NYC Code</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 4115368"
                    value={binNumber}
                    onChange={(e) => setBinNumber(e.target.value)}
                    className="font-mono text-sm"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsSyncModalOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSyncing || !binNumber.trim()} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Sync Single BIN
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg text-xs space-y-1 text-indigo-700 dark:text-indigo-300">
                  <p className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    Auto-Sync All Configured Properties
                  </p>
                  <p className="opacity-90">
                    This will scan all properties in your portal with an assigned NYC BIN number and automatically fetch & attach their latest violations.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsSyncModalOpen(false)}>Cancel</Button>
                  <Button
                    type="button"
                    onClick={handleExecuteBulkSync}
                    disabled={isSyncing}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Syncing All Properties...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Start Bulk Auto-Sync
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {syncResult && (
              <div
                className={`p-3 rounded-lg text-xs space-y-2 border ${
                  syncResult.success
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400'
                }`}
              >
                <div className="flex items-start gap-2">
                  {syncResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  )}
                  <div>
                    <p className="font-semibold">{syncResult.success ? 'Sync Completed Successfully' : 'Sync Failed'}</p>
                    <p className="mt-0.5 opacity-90">{syncResult.message}</p>
                  </div>
                </div>

                {syncResult.details && syncResult.details.length > 0 && (
                  <div className="pt-2 border-t border-emerald-500/20 space-y-1">
                    <p className="font-semibold text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Synced Properties Breakdown:</p>
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                      {syncResult.details.map((d, i) => (
                        <li key={i} className="flex justify-between items-center bg-emerald-500/5 px-2 py-1 rounded font-mono text-[11px]">
                          <span>{d.propertyName} {d.bin ? `(BIN: ${d.bin})` : ''}</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{d.count} violation(s)</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Dataset ID: <code className="font-mono text-foreground font-semibold">3h2n-5cm9</code> (NYC DOB Open Data)</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViolationsPage;

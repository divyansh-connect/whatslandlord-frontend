import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { RestoreBinItem } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  RotateCcw,
  Trash2,
  Search,
  Building2,
  Home,
  Users,
  Key,
  CreditCard,
  FileText,
  Wrench,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Sparkles,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

export const RestoreBinPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  // Modal states
  const [itemToRestore, setItemToRestore] = useState<RestoreBinItem | null>(null);
  const [itemToPermanentDelete, setItemToPermanentDelete] = useState<RestoreBinItem | null>(null);
  const [isEmptyBinOpen, setIsEmptyBinOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch soft-deleted items
  const { data: binItems = [], isLoading, error } = useQuery<RestoreBinItem[]>({
    queryKey: ['restore-bin-items'],
    queryFn: () => api.restoreBin.getAll(),
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: async (item: RestoreBinItem) => {
      return api.restoreBin.restore(item.id, item.entityType, item.entityId);
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ['restore-bin-items'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
      queryClient.invalidateQueries({ queryKey: ['payments-list'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      setItemToRestore(null);
      showToast(`✅ "${item.title}" has been restored successfully!`);
    },
    onError: (err: any) => {
      showToast(`Failed to restore item: ${err?.message || 'Unknown error'}`, 'error');
    },
  });

  // Permanent Delete Mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: async (item: RestoreBinItem) => {
      return api.restoreBin.permanentDelete(item.id, item.entityType, item.entityId);
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ['restore-bin-items'] });
      setItemToPermanentDelete(null);
      showToast(`🗑️ "${item.title}" was permanently deleted.`, 'success');
    },
    onError: (err: any) => {
      showToast(`Failed to permanently delete item: ${err?.message || 'Unknown error'}`, 'error');
    },
  });

  // Empty Bin Mutation
  const emptyBinMutation = useMutation({
    mutationFn: async () => {
      return api.restoreBin.emptyBin();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restore-bin-items'] });
      setIsEmptyBinOpen(false);
      showToast('🧹 Restore Bin has been completely emptied.');
    },
    onError: (err: any) => {
      showToast(`Failed to empty Restore Bin: ${err?.message || 'Unknown error'}`, 'error');
    },
  });

  // Filtering
  const filteredItems = binItems.filter((item) => {
    if (!item) return false;
    const matchesType = selectedType === 'all' || (item.entityType || '').toLowerCase() === selectedType.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (item.title || '').toLowerCase().includes(q) ||
      (item.subtitle || '').toLowerCase().includes(q) ||
      (item.entityType || '').toLowerCase().includes(q) ||
      (item.deletedBy || '').toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  // Stats calculation
  const totalItems = binItems.length;
  const propertyAndUnitsCount = binItems.filter(
    (i) => i.entityType === 'Property' || i.entityType === 'Unit'
  ).length;
  const tenantsAndLeasesCount = binItems.filter(
    (i) => i.entityType === 'Tenant' || i.entityType === 'Lease'
  ).length;
  const otherCount = totalItems - propertyAndUnitsCount - tenantsAndLeasesCount;

  // Icon and badge styling by entity type
  const getEntityBadge = (type: string) => {
    switch (type) {
      case 'Property':
        return {
          icon: <Building2 className="w-3.5 h-3.5 mr-1" />,
          label: 'Property',
          className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
      case 'Unit':
        return {
          icon: <Home className="w-3.5 h-3.5 mr-1" />,
          label: 'Unit',
          className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        };
      case 'Tenant':
        return {
          icon: <Users className="w-3.5 h-3.5 mr-1" />,
          label: 'Tenant',
          className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'Lease':
        return {
          icon: <Key className="w-3.5 h-3.5 mr-1" />,
          label: 'Lease',
          className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      case 'Owner':
        return {
          icon: <UserCheck className="w-3.5 h-3.5 mr-1" />,
          label: 'Owner',
          className: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        };
      case 'Invoice':
        return {
          icon: <FileText className="w-3.5 h-3.5 mr-1" />,
          label: 'Invoice',
          className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        };
      case 'Payment':
        return {
          icon: <CreditCard className="w-3.5 h-3.5 mr-1" />,
          label: 'Payment',
          className: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
        };
      case 'WorkOrder':
      case 'ServiceRequest':
        return {
          icon: <Wrench className="w-3.5 h-3.5 mr-1" />,
          label: type === 'WorkOrder' ? 'Work Order' : 'Service Request',
          className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        };
      default:
        return {
          icon: <FileText className="w-3.5 h-3.5 mr-1" />,
          label: type,
          className: 'bg-muted text-muted-foreground border-border',
        };
    }
  };

  const formatDeletedDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    try {
      const d = new Date(dateString);
      return (
        d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) +
        ' ' +
        d.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {feedbackMessage && (
        <div
          className={clsx(
            'flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 shadow-md',
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          )}
        >
          <div className="flex items-center space-x-2 font-medium text-sm">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-bold underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Restore Bin"
        description="Review soft-deleted data across the dashboard. Easily restore items back to active state or delete them permanently."
        breadcrumbs={[
          { label: t('header.home', 'Home'), href: '/' },
          { label: 'Restore Bin' },
        ]}
        action={
          totalItems > 0
            ? {
                label: 'Empty Bin Permanently',
                icon: <Trash2 className="w-4 h-4" />,
                onClick: () => setIsEmptyBinOpen(true),
                variant: 'destructive',
                className: 'bg-rose-600 hover:bg-rose-700 text-white font-semibold',
              }
            : undefined
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total In Bin
            </p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{totalItems}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Recoverable records</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Properties & Units
            </p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{propertyAndUnitsCount}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Buildings & rentals</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tenants & Leases
            </p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{tenantsAndLeasesCount}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Residents & contracts</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Financials & Orders
            </p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{otherCount}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Invoices & work orders</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card rounded-xl border border-border/60 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, identifier, address, or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'property', label: 'Properties' },
              { id: 'unit', label: 'Units' },
              { id: 'tenant', label: 'Tenants' },
              { id: 'lease', label: 'Leases' },
              { id: 'invoice', label: 'Invoices' },
              { id: 'owner', label: 'Owners' },
              { id: 'workorder', label: 'Work Orders' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0',
                  selectedType === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Loading Restore Bin items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground mb-4">
              <RotateCcw className="w-8 h-8 opacity-40" />
            </div>
            <h4 className="text-base font-bold text-foreground">
              {searchQuery || selectedType !== 'all' ? 'No matching items found' : 'Restore Bin is empty'}
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {searchQuery || selectedType !== 'all'
                ? 'Try adjusting your search query or entity filter tabs.'
                : 'Whenever you delete any property, unit, tenant, lease, invoice, or record in the software, it is kept safe here for easy recovery.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Item Name / Identifier</th>
                  <th className="py-3 px-4">Details / Summary</th>
                  <th className="py-3 px-4">Deleted At</th>
                  <th className="py-3 px-4">Deleted By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredItems.map((item) => {
                  const badge = getEntityBadge(item.entityType);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      {/* Entity Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={clsx(
                            'inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border',
                            badge.className
                          )}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>

                      {/* Title / Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground text-sm">
                          {item.title}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground opacity-75">
                          ID: {item.entityId ? item.entityId.substring(0, 16) : item.id}
                        </div>
                      </td>

                      {/* Details / Subtitle */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-xs text-muted-foreground truncate">
                          {item.subtitle || 'No extra metadata recorded'}
                        </div>
                      </td>

                      {/* Deleted At */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-muted-foreground">
                        {formatDeletedDate(item.deletedAt)}
                      </td>

                      {/* Deleted By */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center text-xs font-medium text-foreground/80 bg-muted px-2 py-0.5 rounded">
                          {item.deletedBy || 'Property Manager'}
                        </span>
                      </td>

                      {/* Actions Column (User Request: 1. Restore button, 2. Delete Permanently button) */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end space-x-2">
                          {/* 1. Restore Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setItemToRestore(item)}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold flex items-center h-8 px-2.5"
                            title="Restore this soft-deleted item"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                            Restore
                          </Button>

                          {/* 2. Permanent Delete Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setItemToPermanentDelete(item)}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs font-bold flex items-center h-8 px-2.5"
                            title="Permanently remove from database"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-600 dark:text-rose-400" />
                            Delete Permanently
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer showing count */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="p-3 bg-muted/20 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
            <span>
              Showing <strong>{filteredItems.length}</strong> soft-deleted item
              {filteredItems.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[11px] italic">
              Restoring an item puts it back in active queries instantly.
            </span>
          </div>
        )}
      </div>

      {/* Confirm Restore Dialog */}
      <ConfirmDialog
        open={!!itemToRestore}
        onOpenChange={(open) => !open && setItemToRestore(null)}
        title="Restore Soft-Deleted Item"
        description={`Are you sure you want to restore "${itemToRestore?.title}"? It will be recovered and become active and visible again in its original module.`}
        confirmText="Yes, Restore"
        variant="default"
        loading={restoreMutation.isPending}
        onConfirm={() => itemToRestore && restoreMutation.mutate(itemToRestore)}
      />

      {/* Confirm Permanent Delete Dialog */}
      <ConfirmDialog
        open={!!itemToPermanentDelete}
        onOpenChange={(open) => !open && setItemToPermanentDelete(null)}
        title="Permanently Delete Item"
        description={`WARNING: Are you sure you want to permanently delete "${itemToPermanentDelete?.title}"? This action CANNOT be undone and this record will be purged forever from the database.`}
        confirmText="Yes, Delete Permanently"
        variant="destructive"
        loading={permanentDeleteMutation.isPending}
        onConfirm={() =>
          itemToPermanentDelete && permanentDeleteMutation.mutate(itemToPermanentDelete)
        }
      />

      {/* Confirm Empty Bin Dialog */}
      <ConfirmDialog
        open={isEmptyBinOpen}
        onOpenChange={setIsEmptyBinOpen}
        title="Empty Restore Bin Completely"
        description="WARNING: Are you sure you want to permanently purge all items currently inside the Restore Bin? Once emptied, these records cannot be recovered."
        confirmText="Yes, Empty Entire Bin"
        variant="destructive"
        loading={emptyBinMutation.isPending}
        onConfirm={() => emptyBinMutation.mutate()}
      />
    </div>
  );
};

export default RestoreBinPage;

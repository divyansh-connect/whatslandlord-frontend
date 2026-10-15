import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { StatusBadge } from '../../components/StatusBadge';
import {
  DollarSign, CheckCircle2, Clipboard,
  Search, Eye, Play, Check, X,
  AlertTriangle, MapPin, Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { extractPreferredVisit, cleanDescription } from '../../utils/maintenanceHelpers';

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'TBD';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

export const StaffMaintenancePage: React.FC = () => {
  const navigate = useNavigate();
  const currentPath = window.location.pathname;
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Determine if we are on the Completed Tasks (History) view
  const isCompletedView = currentPath.includes('/completed');


  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [rejectTaskId, setRejectTaskId] = useState<string | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState('');

  const [completeTaskId, setCompleteTaskId] = useState<string | null>(null);
  const [actualCostVal, setActualCostVal] = useState<string>('');
  const [extraExpensesVal, setExtraExpensesVal] = useState<string>('');
  const [resolutionNotesVal, setResolutionNotesVal] = useState('');

  // ── Fetch work orders from real backend DB ──────────────────────────────
  const { data: allWorkOrders = [], isLoading } = useQuery({
    queryKey: ['staff-work-orders'],
    queryFn: () => api.staffTasks.getAll(),
  });

  // ── Status-update mutation (hits real DB) ───────────────────────────────
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; status: string; actualCost?: number; rejectReason?: string; resolutionNotes?: string }) =>
      api.staffTasks.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-work-order-details-v2'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['recent-maintenance-requests'] });
    },
  });

  // ── Filter: active vs completed view ───────────────────────────────────
  const filteredWorkOrders = allWorkOrders.filter((order: any) => {
    const isCompletedStatus = ['Completed', 'Closed', 'Rejected', 'Cancelled'].includes(order.status);
    const matchesStatus = isCompletedView ? isCompletedStatus : !isCompletedStatus;

    const matchesSearch =
      order.workOrderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.propertyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.unitNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.issue && order.issue.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch && matchesStatus;
  });

  // ── Action handlers – all call real API ────────────────────────────────
  const handleAccept = (orderId: string) => {
    updateStatusMutation.mutate({ id: orderId, status: 'Assigned' });
  };

  const handleStartWork = (orderId: string) => {
    updateStatusMutation.mutate({ id: orderId, status: 'In Progress' });
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTaskId) return;
    updateStatusMutation.mutate(
      { id: rejectTaskId, status: 'Rejected', rejectReason: rejectReasonText || 'No reason provided' },
      {
        onSuccess: () => {
          setRejectTaskId(null);
          setRejectReasonText('');
        },
      }
    );
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeTaskId) return;
    const actual = actualCostVal ? Number(actualCostVal) : 0;
    const extra = extraExpensesVal ? Number(extraExpensesVal) : 0;
    updateStatusMutation.mutate(
      {
        id: completeTaskId,
        status: 'Completed',
        actualCost: actual + extra,
        resolutionNotes: resolutionNotesVal || 'Repairs completed.',
      },
      {
        onSuccess: () => {
          setCompleteTaskId(null);
          setActualCostVal('');
          setExtraExpensesVal('');
          setResolutionNotesVal('');
        },
      }
    );
  };

  if (isLoading) {
    return <LoadingSkeleton type="card" />;
  }

  return (
    <div className="space-y-6 text-foreground">
      <PageHeader
        title={isCompletedView ? t('staffMaintenance.workHistory') : t('staffMaintenance.myWorkOrders')}
        description={
          isCompletedView
            ? t('staffMaintenance.workHistoryDesc')
            : t('staffMaintenance.myWorkOrdersDesc')
        }
        breadcrumbs={[
          { label: t('staffMaintenance.portalBreadcrumb'), href: '/staff/dashboard' },
          { label: isCompletedView ? t('staffMaintenance.workHistoryBreadcrumb') : t('staffMaintenance.myTasksBreadcrumb') },
        ]}
      />

      {/* SEARCH BAR */}
      <div className="flex gap-3.5 p-4 bg-card border rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('staffMaintenance.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      {/* TASK LIST */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground">
            {isCompletedView ? t('staffMaintenance.archivedLogs') : t('staffMaintenance.activeTasks')} ({filteredWorkOrders.length})
          </h3>
        </div>

        {filteredWorkOrders.length === 0 ? (
          <Card className="p-12 text-center border bg-card">
            <Clipboard className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-xs text-muted-foreground font-semibold">{t('staffMaintenance.noOrders')}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredWorkOrders.map((order: any) => {
              const priorityBorderColor =
                order.priority === 'Urgent' ? 'border-l-rose-500' :
                order.priority === 'Emergency' ? 'border-l-rose-500' :
                order.priority === 'High' ? 'border-l-amber-500' :
                order.priority === 'Medium' ? 'border-l-blue-500' :
                'border-l-emerald-500';

              const isBusy = updateStatusMutation.isPending;

              return (
                <Card
                  key={order.id}
                  className={`p-4 border border-l-4 ${priorityBorderColor} bg-card hover:border-muted-foreground/30 hover:shadow-lg hover:shadow-black/20 transition-all duration-200 group relative overflow-hidden`}
                >
                  <div className="space-y-3.5">
                    {/* Row 1 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-primary text-xs uppercase bg-primary/10 px-2 py-0.5 rounded">
                          {order.workOrderNumber}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>

                      {order.priority && (
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          order.priority === 'Urgent' || order.priority === 'Emergency' ? 'bg-rose-500/10 text-rose-500 border-rose-500/25' :
                          order.priority === 'High' ? 'bg-amber-500/10 text-amber-500 border-amber-500/25' :
                          order.priority === 'Medium' ? 'bg-blue-500/10 text-blue-500 border-blue-500/25' :
                          'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                        }`}>
                          {t('staffMaintenance.priority', { priority: order.priority })}
                        </span>
                      )}
                    </div>

                    {/* Row 2: Details */}
                    {(() => {
                      const prefVisit = extractPreferredVisit(order);
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-10 gap-4 items-start">
                          <div className="md:col-span-7 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors duration-200">
                                {order.issue || 'Standard Maintenance Task'}
                              </h4>
                              {prefVisit && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 whitespace-nowrap">
                                  <Clock className="w-2.5 h-2.5 text-amber-500" /> Pref: {prefVisit}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground/80 font-medium flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              {order.propertyName} • <span className="text-foreground">{order.unitNumber}</span>
                            </p>
                            {order.description && (
                              <p className="text-xs text-muted-foreground/60 line-clamp-2 mt-1.5 leading-relaxed">
                                {cleanDescription(order.description) || order.description}
                              </p>
                            )}

                            {/* Reject reason */}
                            {order.status === 'Rejected' && order.rejectReason && (
                              <div className="p-3 bg-rose-500/5 border border-rose-500/20 text-rose-500 rounded-xl text-[11px] font-semibold space-y-0.5 mt-2">
                                <p className="uppercase text-[8px] text-muted-foreground font-bold tracking-wide">{t('staffMaintenance.reasonForRejection')}</p>
                                <p className="leading-relaxed italic">"{order.rejectReason}"</p>
                              </div>
                            )}

                            {/* Resolution notes */}
                            {order.status === 'Completed' && order.resolutionNotes && (
                              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-emerald-600 rounded-xl text-[11px] font-semibold space-y-0.5 mt-2">
                                <p className="uppercase text-[8px] text-muted-foreground font-bold tracking-wide">{t('staffMaintenance.resolutionNotes')}</p>
                                <p className="leading-relaxed italic">"{order.resolutionNotes}"</p>
                              </div>
                            )}
                          </div>

                          {/* Right: cost/date info */}
                          <div className="md:col-span-3 text-[11px] space-y-3 shrink-0 md:pl-4">
                            <div className="space-y-0.5">
                              <span className="text-muted-foreground uppercase text-[8px] tracking-wider block font-bold leading-none">
                                {t('staffMaintenance.scheduledDate')}
                              </span>
                              <span className="text-foreground font-black text-sm block">
                                {formatDate(order.scheduledDate || order.dueDate)}
                              </span>
                              {prefVisit && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 mt-0.5">
                                  <Clock className="w-2.5 h-2.5" /> Day: {prefVisit}
                                </span>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-muted-foreground uppercase text-[8px] tracking-wider block font-bold leading-none">
                                {isCompletedView ? t('staffMaintenance.finalCost') : t('staffMaintenance.estimatedBudget')}
                              </span>
                              <span className="text-foreground font-black text-sm block">
                                {isCompletedView ? (
                                  <span className="text-emerald-500">
                                    ${order.actualCost ?? 0}
                                    {order.extraExpenses && order.extraExpenses > 0 ? ` (+${order.extraExpenses} extra)` : ''}
                                  </span>
                                ) : (
                                  `$${order.estimatedCost ?? 0}`
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Row 3: Actions */}
                    <div className="pt-2.5 border-t border-border/40 flex justify-between items-center gap-2">
                      <div className="flex gap-2.5">
                        {order.status === 'New' && (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleAccept(order.id)}
                              className="h-8 px-4 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/95 transition-all shadow-sm disabled:opacity-60"
                            >
                              {t('staffMaintenance.accept')}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setRejectTaskId(order.id)}
                              className="h-8 px-4 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all disabled:opacity-60"
                            >
                              {t('staffMaintenance.reject')}
                            </button>
                          </>
                        )}

                        {(['Assigned', 'Scheduled', 'Draft'].includes(order.status)) && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleStartWork(order.id)}
                            className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm shadow-amber-500/15 disabled:opacity-60"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" /> {isBusy ? 'Updating...' : t('staffMaintenance.startWork')}
                          </button>
                        )}

                        {(['In Progress', 'InProgress', 'In_Progress'].includes(order.status)) && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setCompleteTaskId(order.id);
                              setActualCostVal(String(order.estimatedCost ?? ''));
                            }}
                            className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-500/15 disabled:opacity-60"
                          >
                            <Check className="w-3.5 h-3.5" /> {isBusy ? 'Updating...' : t('staffMaintenance.markCompleted')}
                          </button>
                        )}

                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate({ to: `/staff/tasks/${order.id}` })}
                        className="flex items-center gap-1 h-8 font-bold px-3.5 rounded-xl text-xs border bg-background hover:bg-secondary/35 text-foreground"
                      >
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" /> {t('staffMaintenance.details')}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* REJECT DIALOG MODAL */}
      {rejectTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 relative animate-in zoom-in-95 duration-200 text-foreground">
            <button
              onClick={() => setRejectTaskId(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary/40 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 text-rose-500 font-extrabold text-sm border-b pb-3 uppercase tracking-wide">
              <AlertTriangle className="w-5 h-5" />
              <h3>{t('staffMaintenance.rejectAssignment')}</h3>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-muted-foreground font-bold text-[10px] uppercase">{t('staffMaintenance.reasonForRejection')}</label>
                <textarea
                  required
                  rows={3}
                  value={rejectReasonText}
                  onChange={(e) => setRejectReasonText(e.target.value)}
                  placeholder={t('staffMaintenance.rejectionPlaceholder')}
                  className="w-full rounded-xl border bg-background p-3.5 border-border/80 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl h-10 font-bold"
                  onClick={() => setRejectTaskId(null)}
                >
                  {t('staffMaintenance.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 rounded-xl h-10 font-bold bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60"
                >
                  {updateStatusMutation.isPending ? 'Rejecting…' : t('staffMaintenance.confirmReject')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETION DETAIL MODAL */}
      {completeTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 relative animate-in zoom-in-95 duration-200 text-foreground">
            <button
              onClick={() => setCompleteTaskId(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary/40 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 text-emerald-500 font-extrabold text-sm border-b pb-3 uppercase tracking-wide">
              <CheckCircle2 className="w-5 h-5" />
              <h3>{t('staffMaintenance.recordJobResolution')}</h3>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-bold text-[10px] uppercase">{t('staffMaintenance.laborBaseCost')}</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      required
                      value={actualCostVal}
                      onChange={(e) => setActualCostVal(e.target.value)}
                      className="pl-8 h-10 rounded-xl"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-bold text-[10px] uppercase">{t('staffMaintenance.extraExpenses')}</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={extraExpensesVal}
                      onChange={(e) => setExtraExpensesVal(e.target.value)}
                      className="pl-8 h-10 rounded-xl"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-bold text-[10px] uppercase">{t('staffMaintenance.materialsUsedNotes')}</label>
                <textarea
                  rows={4}
                  value={resolutionNotesVal}
                  onChange={(e) => setResolutionNotesVal(e.target.value)}
                  placeholder={t('staffMaintenance.notesPlaceholder')}
                  className="w-full rounded-xl border bg-background p-3.5 border-border/80 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl h-10 font-bold"
                  onClick={() => setCompleteTaskId(null)}
                >
                  {t('staffMaintenance.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 rounded-xl h-10 font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"
                >
                  {updateStatusMutation.isPending ? 'Saving…' : t('staffMaintenance.submitFinish')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffMaintenancePage;

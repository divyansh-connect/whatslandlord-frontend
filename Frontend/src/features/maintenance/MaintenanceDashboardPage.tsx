import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { useAuthStore } from '../../store/useStore';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { StatusBadge } from '../../components/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Plus, CheckSquare, Settings, AlertCircle, Wrench, ShieldAlert, ArrowRight,
  Clipboard, Clock, CheckCircle2, XCircle, Search, Eye, Play, Check
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { extractPreferredVisit, cleanDescription } from '../../utils/maintenanceHelpers';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

export const MaintenanceDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const isStaff = user?.role === 'Maintenance Staff';

  // --- QUERY FOR PROPERTY MANAGER VIEW ---
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['maintenance-metrics'],
    queryFn: () => api.maintenance.getMetrics(),
    enabled: !isStaff,
  });

  const { data: recentRequests = [], isLoading: loadingRecent } = useQuery({
    queryKey: ['recent-maintenance-requests'],
    queryFn: async () => {
      const all = await api.serviceRequests.getAll();
      return all.slice(0, 5);
    },
    enabled: !isStaff,
  });

  // --- QUERY FOR MAINTENANCE STAFF VIEW (real DB) ---
  const { data: allWorkOrders = [], isLoading: loadingWorkOrders } = useQuery({
    queryKey: ['staff-dashboard-work-orders'],
    queryFn: () => api.staffTasks.getAll(),
    enabled: isStaff,
  });

  // Status-update mutation for staff dashboard (hits real DB)
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.staffTasks.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-work-order-details-v2'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['recent-maintenance-requests'] });
    },
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Only active work orders in dashboard view (filter completed/closed/rejected)
  const activeWorkOrders = allWorkOrders.filter((order: any) => {
    const isActive = !['Completed', 'Closed', 'Rejected', 'Cancelled'].includes(order.status);
    const matchesSearch =
      order.workOrderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.propertyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.unitNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.issue && order.issue.toLowerCase().includes(searchQuery.toLowerCase()));
    return isActive && matchesSearch;
  });

  // Staff summary counts derived from real DB data
  const assignedCount = allWorkOrders.filter((w: any) => ['New', 'Assigned', 'Open', 'Submitted'].includes(w.status)).length;
  const inProgressCount = allWorkOrders.filter((w: any) => ['In Progress', 'InProgress', 'In_Progress'].includes(w.status)).length;
  const completedCount = allWorkOrders.filter((w: any) => ['Completed', 'Closed'].includes(w.status)).length;
  const rejectedCount = allWorkOrders.filter((w: any) => ['Rejected', 'Cancelled'].includes(w.status)).length;

  if (isStaff) {
    if (loadingWorkOrders) {
      return <LoadingSkeleton type="card" />;
    }

    return (
      <div className="space-y-6 text-foreground">
        <PageHeader
          title={t('maintenance.staffPortalTitle')}
          description={t('maintenance.staffPortalDesc')}
          breadcrumbs={[
            { label: t('maintenance.portalBreadcrumb'), href: '/staff/dashboard' },
            { label: t('maintenance.dashboardBreadcrumb') },
          ]}
        />

        {/* STAFF SUMMARY METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border bg-gradient-to-br from-blue-500/5 to-blue-500/10 flex items-center space-x-4">
            <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-500 shadow-inner">
              <Clipboard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('maintenance.assignedTasks')}</p>
              <p className="text-2xl font-black mt-0.5 text-blue-500">{assignedCount}</p>
            </div>
          </Card>

          <Card className="p-5 border bg-gradient-to-br from-amber-500/5 to-amber-500/10 flex items-center space-x-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 shadow-inner">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('maintenance.inProgress')}</p>
              <p className="text-2xl font-black mt-0.5 text-amber-500">{inProgressCount}</p>
            </div>
          </Card>

          <Card className="p-5 border bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 flex items-center space-x-4">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('maintenance.completed')}</p>
              <p className="text-2xl font-black mt-0.5 text-emerald-500">{completedCount}</p>
            </div>
          </Card>

          <Card className="p-5 border bg-gradient-to-br from-rose-500/5 to-rose-500/10 flex items-center space-x-4">
            <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-500 shadow-inner">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('maintenance.rejected')}</p>
              <p className="text-2xl font-black mt-0.5 text-rose-500">{rejectedCount}</p>
            </div>
          </Card>
        </div>

        {/* MY TASKS SEARCH BAR */}
        <div className="flex gap-3.5 p-4 bg-card border rounded-2xl shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('maintenance.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        {/* ACTIVE WORK ORDER CARDS */}
        <Card className="p-5 border bg-card space-y-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wider">{t('maintenance.myTasks')}</h3>

          {activeWorkOrders.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground font-semibold">
              {t('maintenance.noTasks')}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {activeWorkOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-2xl border bg-secondary/10 hover:border-primary/30 transition-all group animate-in fade-in duration-200"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-primary text-xs uppercase bg-primary/10 px-2 py-0.5 rounded">
                        {order.workOrderNumber}
                      </span>
                      <StatusBadge status={order.status} />
                      {order.priority && (
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                          order.priority === 'Urgent' || order.priority === 'Emergency' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                          order.priority === 'High' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                          order.priority === 'Medium' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                          'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}>
                          {order.priority}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-foreground">{order.issue || 'Maintenance Task'}</h4>
                    <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-2 flex-wrap">
                      <span>{order.propertyName} • Unit {order.unitNumber}</span>
                      {extractPreferredVisit(order) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 whitespace-nowrap">
                          <Clock className="w-2.5 h-2.5 text-amber-500" /> Pref Day: {extractPreferredVisit(order)}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-2 w-full md:w-auto border-t pt-3 md:pt-0 md:border-0 justify-between">
                    <div className="flex gap-2">
                      {/* Accept / Reject (New orders) */}
                      {order.status === 'New' && (
                        <>
                          <button
                            disabled={updateStatusMutation.isPending}
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'Assigned' })}
                            className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all disabled:opacity-60"
                          >
                            {t('maintenance.accept')}
                          </button>
                          <button
                            disabled={updateStatusMutation.isPending}
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'Rejected' })}
                            className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all disabled:opacity-60"
                          >
                            {t('maintenance.reject')}
                          </button>
                        </>
                      )}

                      {/* Start Work (Assigned orders) */}
                      {(['Assigned', 'Scheduled', 'Draft'].includes(order.status)) && (
                        <button
                          disabled={updateStatusMutation.isPending}
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'In Progress' })}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-extrabold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/20 transition-all disabled:opacity-60"
                        >
                          <Play className="w-3 h-3 fill-amber-500" /> {updateStatusMutation.isPending ? 'Updating...' : t('maintenance.startWork')}
                        </button>
                      )}

                      {/* Mark Complete (In Progress orders) */}
                      {(['In Progress', 'InProgress', 'In_Progress'].includes(order.status)) && (
                        <button
                          disabled={updateStatusMutation.isPending}
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'Completed' })}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-extrabold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 transition-all disabled:opacity-60"
                        >
                          <Check className="w-3 h-3" /> {updateStatusMutation.isPending ? 'Updating...' : t('maintenance.complete')}
                        </button>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate({ to: `/staff/tasks/${order.id}` })}
                      className="flex items-center gap-1.5 h-9 font-bold px-4 rounded-xl border bg-background hover:bg-secondary/35 text-foreground"
                    >
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" /> {t('maintenance.details')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // --- RENDER PROPERTY MANAGER DASHBOARD ---
  if (loadingMetrics || loadingRecent || !metrics) {
    return <LoadingSkeleton type="card" />;
  }

  const priorityData = [
    { name: 'Urgent', value: metrics.emergencyRequests },
    { name: 'High', value: 8 },
    { name: 'Medium', value: 15 },
    { name: 'Low', value: 20 },
  ];

  return (
    <div className="space-y-6 text-foreground">
      <PageHeader
        title={t('maintenance.dashboardTitle')}
        description={t('maintenance.dashboardDesc')}
        breadcrumbs={[
          { label: t('ai.breadcrumbs.home'), href: '/' },
          { label: t('nav.maintenance') },
        ]}
      />

      {/* QUICK ACTIONS */}
      <div className="flex flex-wrap gap-2.5 p-3.5 bg-card border rounded-2xl">
        <Button size="sm" onClick={() => navigate({ to: '/maintenance/requests/new' })} className="flex items-center gap-1">
          <Plus className="w-4 h-4" /> {t('maintenance.createRequest')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate({ to: '/maintenance/work-orders' })} className="flex items-center gap-1">
          <Plus className="w-4 h-4" /> {t('maintenance.createWorkOrder')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate({ to: '/inspections/new' })} className="flex items-center gap-1">
          <Plus className="w-4 h-4" /> {t('maintenance.scheduleInspection')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate({ to: '/vendors' })} className="flex items-center gap-1">
          <Plus className="w-4 h-4" /> {t('maintenance.addVendor')}
        </Button>
      </div>

      {/* STATS METRIC GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border bg-card flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('maintenance.openRequests')}</p>
            <p className="text-2xl font-black mt-1 text-primary">{metrics.openRequests}</p>
          </div>
          <span className="text-[10px] text-rose-500 font-bold mt-4 flex items-center gap-0.5 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" /> {metrics.emergencyRequests} {t('maintenance.emergency')}
          </span>
        </Card>

        <Card className="p-5 border bg-card flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('maintenance.workOrdersInProgress')}</p>
            <p className="text-2xl font-black mt-1 text-amber-500">{metrics.workOrdersInProgress}</p>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold mt-4">{t('maintenance.assignedToActive')}</span>
        </Card>

        <Card className="p-5 border bg-card flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('maintenance.completedThisMonth')}</p>
            <p className="text-2xl font-black mt-1 text-emerald-500">{metrics.completedThisMonth}</p>
          </div>
          <span className="text-[10px] text-emerald-500 font-bold mt-4">
            {t('maintenance.avgCompletion', { time: metrics.avgCompletionTime })}
          </span>
        </Card>

        <Card className="p-5 border bg-card flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('maintenance.totalCost')}</p>
            <p className="text-2xl font-black mt-1 text-rose-500">${metrics.totalMaintenanceCost.toLocaleString()}</p>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold mt-4">{t('maintenance.workOrdersAndMaterials')}</span>
        </Card>
      </div>

      {/* GRAPH & METRIC DATA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requests by Priority */}
        <Card className="lg:col-span-1 p-6 border bg-card flex flex-col justify-between">
          <h3 className="font-extrabold text-sm uppercase mb-4 tracking-wider">{t('maintenance.priorityBracket')}</h3>
          <div className="h-60 flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-muted-foreground pt-4 border-t border-border/40">
            {priorityData.map((pr, index) => (
              <div key={pr.name} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span>{pr.name} ({pr.value})</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Service Requests list */}
        <Card className="lg:col-span-2 p-5 border bg-card space-y-4">
          <h3 className="font-extrabold text-sm uppercase border-b pb-3 tracking-wider">{t('maintenance.recentTickets')}</h3>
          <div className="divide-y space-y-3">
            {recentRequests.map((req) => (
              <div key={req.id} className="pt-3 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold">{req.title}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold">Unit {req.unitNumber} • {req.propertyName}</p>
                </div>
                <div className="text-right flex items-center space-x-3">
                  <span className="text-[9px] font-bold text-muted-foreground">{req.createdAt}</span>
                  <Button variant="ghost" size="sm" onClick={() => navigate({ to: `/maintenance/requests/${req.id}` })} className="h-7 text-[10px] text-primary hover:bg-primary/10">
                    {t('maintenance.view')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MaintenanceDashboardPage;

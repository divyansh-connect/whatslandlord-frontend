import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { CreditCard, Wrench, MessageSquare, BookOpen, Package, UserCheck, FileText, Upload, CheckCircle2, AlertCircle, Clock, ArrowRight, Sparkles, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const TenantDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Queries
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['tenant-dashboard-metrics'],
    queryFn: () => api.tenantPortal.getMetrics(),
  });

  const { data: screeningReports = [] } = useQuery({
    queryKey: ['tenant-screening-reports'],
    queryFn: () => api.screening.getAll(),
  });

  const { data: profile } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: () => api.tenantProfile.get(),
  });

  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['tenant-notifications-list'],
    queryFn: () => api.tenantNotifications.getAll(),
    refetchInterval: 4000,
  });

  const dismissNoticeMutation = useMutation({
    mutationFn: (id: string) => api.tenantNotifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-notifications-list'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list', 'Tenant'] });
    },
  });

  useEffect(() => {
    const handleSync = () => {
      refetchNotifications();
      queryClient.invalidateQueries({ queryKey: ['tenant-notifications-list'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list', 'Tenant'] });
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('ai-notice-sent', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('ai-notice-sent', handleSync);
    };
  }, [refetchNotifications, queryClient]);

  if (isLoading || !metrics) {
    return <LoadingSkeleton type="card" />;
  }

  const isPending = profile?.status === 'Pending';

  const latestRentNotice = notifications.find((n: any) => 
    !Boolean(n.read) && (
      (n.id || '').startsWith('ai-notice') ||
      (n.title || '').toLowerCase().includes('rent') ||
      (n.title || '').toLowerCase().includes('notice') ||
      (n.title || '').toLowerCase().includes('reminder') ||
      (n.message || '').toLowerCase().includes('rent') ||
      (n.type || '') === 'warning'
    )
  );

  return (
    <div className="space-y-6 text-foreground">
      <PageHeader
        title={t('tenant.dashboard.title')}
        description={t('tenant.dashboard.desc')}
        breadcrumbs={[
          { label: t('ai.breadcrumbs.home'), href: '/tenant' },
          { label: t('tenant.nav.dashboard') },
        ]}
      />

      {/* AI Rent Notice Alert Banner (Visible when Manager dispatches notice) */}
      {latestRentNotice && (
        <Card className="p-4 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-rose-500/10 border-2 border-purple-500/40 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-fade-in">
          <div className="space-y-1 flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-black text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-500" /> {latestRentNotice.title}
              </span>
              <span className="text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-300 font-extrabold px-2 py-0.5 rounded-full">
                New Management Notice
              </span>
            </div>
            <p className="text-xs text-foreground font-semibold leading-relaxed">
              {latestRentNotice.message}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">
              Received: {latestRentNotice.timestamp || latestRentNotice.date || 'Recent'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => navigate({ to: '/tenant/payments' })}
              className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs h-9 px-4 flex items-center gap-1.5 shadow"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pay Rent Now</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dismissNoticeMutation.mutate(latestRentNotice.id)}
              disabled={dismissNoticeMutation.isPending}
              className="text-xs font-bold h-9 flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Dismiss</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate({ to: '/tenant/notifications' })}
              className="text-xs font-bold h-9"
            >
              All Alerts
            </Button>
          </div>
        </Card>
      )}

      {/* Pending status warning */}
      {isPending && (
        <Card className="p-5 border bg-amber-500/5 border-amber-500/20 space-y-2 rounded-2xl shadow-sm text-slate-800 dark:text-amber-300">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-sm uppercase text-amber-600 dark:text-amber-400">Application Under Review</h4>
              <p className="text-xs text-muted-foreground font-semibold mt-1">
                Your registration application has been received and is currently under review by the Property Manager. You will gain full access to payments and features once approved.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* QUICK ACTIONS BAR */}
      <div className="flex flex-wrap gap-2.5 p-3.5 bg-card border rounded-2xl">
        <Button 
          size="sm" 
          onClick={() => navigate({ to: '/tenant/payments' })} 
          className="flex items-center gap-1"
          disabled={isPending}
        >
          <CreditCard className="w-4 h-4" /> {t('tenant.dashboard.payRent')}
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => navigate({ to: '/tenant/maintenance' })} 
          className="flex items-center gap-1"
          disabled={isPending}
        >
          <Wrench className="w-4 h-4" /> {t('tenant.dashboard.submitRepair')}
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => navigate({ to: '/tenant/messages' })} 
          className="flex items-center gap-1"
          disabled={isPending}
        >
          <MessageSquare className="w-4 h-4" /> {t('tenant.dashboard.contactMgmt')}
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => navigate({ to: '/tenant/lease' })} 
          className="flex items-center gap-1"
          disabled={isPending}
        >
          <BookOpen className="w-4 h-4" /> {t('tenant.dashboard.viewLease')}
        </Button>
      </div>

      {/* SCREENING CORNER */}
      {screeningReports.length > 0 && (
        <Card className="p-5 border bg-primary/5 border-primary/20 space-y-4 rounded-2xl shadow-sm">
          {screeningReports.map((report: any) => {
            const propName = report.propertyName || 'Property';
            const unitNo = report.unitNumber || 'N/A';

            if (report.status === 'Approved') {
              return (
                <div key={report.id} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 uppercase">Screening Approved</h4>
                    <p className="text-xs text-muted-foreground font-semibold mt-1">
                      Your background screening check has been approved successfully! Welcome to your new home.
                    </p>
                  </div>
                </div>
              );
            }
            if (report.status === 'Declined') {
              return (
                <div key={report.id} className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-sm text-rose-600 dark:text-rose-400 uppercase">Screening Declined</h4>
                    <p className="text-xs text-muted-foreground font-semibold mt-1">
                      Your screening application has been declined. Please contact your property manager for details.
                    </p>
                  </div>
                </div>
              );
            }
            if (report.status === 'Pending Approval' || report.status === 'Processing') {
              return (
                <div key={report.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-emerald-600 dark:text-emerald-400 font-extrabold uppercase text-sm">Screening Check Submitted</h4>
                      <p className="text-xs text-muted-foreground font-semibold mt-1">
                        Your verification documents have been uploaded for {propName} {unitNo}. The Property Manager is reviewing it.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate({ to: '/tenant/screening/$screeningId', params: { screeningId: report.id } })}
                    className="shrink-0 uppercase text-[10px] font-black tracking-wide bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5 self-start sm:self-center"
                  >
                    View Status <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            }
            // default is Pending Documents / any other status (amber theme)
            return (
              <div key={report.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-amber-600 dark:text-amber-400 font-extrabold uppercase text-sm">Action Required: Tenant Screening Check</h4>
                    <p className="text-xs text-muted-foreground font-semibold mt-1">
                      Please verify your identity and upload the required verification documents for {propName} {unitNo}.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate({ to: '/tenant/screening/$screeningId', params: { screeningId: report.id } })}
                  className="shrink-0 uppercase text-[10px] font-black tracking-wide bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 self-start sm:self-center"
                >
                  Start Screening <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </Card>
      )}

      {/* METRIC GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border bg-card flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('tenant.dashboard.currentRentDue')}</p>
            <p className="text-2xl font-black mt-1 text-primary">${metrics.currentRent.toLocaleString()}</p>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold mt-4">{t('tenant.dashboard.dueDate')}: {metrics.nextDueDate}</span>
        </Card>

        <Card className="p-5 border bg-card flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('tenant.dashboard.outstandingBalance')}</p>
            <p className="text-2xl font-black mt-1 text-emerald-500">${metrics.outstandingBalance.toLocaleString()}</p>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold mt-4">{t('tenant.dashboard.accountStatus')}</span>
        </Card>

        <Card className="p-5 border bg-card flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('tenant.dashboard.activeVisitorPasses')}</p>
            <p className="text-2xl font-black mt-1 text-indigo-500">{metrics.activeVisitors}</p>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold mt-4">{t('tenant.dashboard.registeredGuests')}</span>
        </Card>

        <Card className="p-5 border bg-card flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('tenant.dashboard.waitingPackages')}</p>
            <p className="text-2xl font-black mt-1 text-amber-500">{metrics.packagesWaiting}</p>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold mt-4">{t('tenant.dashboard.awaitingPickup')}</span>
        </Card>
      </div>

      {/* ADDITIONAL LEASE NOTIFICATION CARD */}
      <Card className="p-5 border bg-card flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="space-y-1">
          <h4 className="font-extrabold text-sm uppercase">{t('tenant.dashboard.leaseRenewal')}</h4>
          <p className="text-xs text-muted-foreground font-semibold">{t('tenant.dashboard.leaseExpiringText', { date: metrics.leaseExpiration })}</p>
        </div>
        <Button size="sm" onClick={() => navigate({ to: '/tenant/lease' })} className="uppercase text-xs font-black">
          {t('tenant.dashboard.reviewRenewal')}
        </Button>
      </Card>
    </div>
  );
};
export default TenantDashboardPage;

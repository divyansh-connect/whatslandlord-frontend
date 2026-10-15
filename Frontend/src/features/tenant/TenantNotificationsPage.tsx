import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useStore';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Check, Trash2, Bell } from 'lucide-react';

import { isNoticeForTenant } from '../../utils/tenantNoticeHelper';

export const TenantNotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: tenantProfile } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: () => api.tenantProfile.get(),
  });

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['tenant-notifications-list'],
    queryFn: () => api.tenantNotifications.getAll(),
    refetchInterval: 4000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.tenantNotifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-notifications-list'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list', 'Tenant'] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => api.tenantNotifications.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-notifications-list'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list', 'Tenant'] });
    },
  });

  React.useEffect(() => {
    const handleSync = () => {
      refetch();
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('ai-notice-sent', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('ai-notice-sent', handleSync);
    };
  }, [refetch]);

  const tenantCtx = {
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.name,
    profileId: tenantProfile?.id,
    profileEmail: tenantProfile?.email,
    profileFirstName: tenantProfile?.firstName,
    profileLastName: tenantProfile?.lastName,
    unitNumber: tenantProfile?.unitNumber,
  };

  const isolatedNotifications = notifications.filter((n: any) => isNoticeForTenant(n, tenantCtx));

  if (isLoading) {
    return <LoadingSkeleton type="card" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tenant.notifications.title')}
        description={t('tenant.notifications.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/tenant' },
          { label: t('tenant.notifications.title') }
        ]}
        action={{
          label: t('tenant.notifications.markAllRead'),
          onClick: () => markReadMutation.mutate('all'),
          icon: <Check className="w-4 h-4" />
        }}
      />

      <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase border-b pb-2">
        <span>{t('tenant.notifications.recentActivity', { count: isolatedNotifications.length })}</span>
        {isolatedNotifications.length > 0 && (
          <button onClick={() => clearAllMutation.mutate()} className="text-rose-500 hover:underline flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" /> {t('tenant.notifications.clearAll')}
          </button>
        )}
      </div>

      {isolatedNotifications.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center space-y-3">
          <Bell className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
          <h4 className="font-bold text-xs">{t('tenant.notifications.noAlerts')}</h4>
          <p className="text-[10px] text-muted-foreground">{t('tenant.notifications.allCaughtUp')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {isolatedNotifications.map((n: any) => (
            <div 
              key={n.id} 
              onClick={() => markReadMutation.mutate(n.id)}
              className={`p-4 rounded-xl border bg-card flex justify-between items-start transition cursor-pointer hover:bg-secondary/20 hover:border-primary/40 ${
                !n.read ? 'border-l-4 border-l-primary' : 'opacity-85'
              }`}
            >
              <div className="space-y-1 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-foreground">{n.title}</span>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
                <p className="text-muted-foreground text-[11px] font-medium leading-relaxed">{n.message}</p>
                <p className="text-[10px] text-muted-foreground/60">{n.timestamp || n.date}</p>
              </div>
              <div className="flex items-center space-x-2">
                <StatusBadge status={n.type} />
                {!n.read && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      markReadMutation.mutate(n.id);
                    }}
                    className="text-[10px] font-extrabold px-2 py-1 text-primary"
                  >
                    {t('tenant.notifications.markRead')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TenantNotificationsPage;

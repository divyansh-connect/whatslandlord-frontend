import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  Bell,
  CheckCheck,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
  Wrench,
  CreditCard,
  Building,
  User,
  FileText,
  MessageSquare,
  BarChart3,
  BookOpen,
  Settings,
  X,
} from 'lucide-react';
import api from '../../api';
import { useAuthStore, useNotificationStore, NotificationItem } from '../../store/useStore';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ConfirmDialog } from '../../components/ConfirmDialog';

// Helper to determine notification category/module
export const getNotificationModule = (item: { title?: string; message?: string; type?: string }): string | null => {
  const text = `${item.title || ''} ${item.message || ''}`.toLowerCase();

  if (
    text.includes('work order') ||
    text.includes('maintenance') ||
    text.includes('service request') ||
    text.includes('inspection') ||
    text.includes('vendor') ||
    text.includes('violation')
  ) {
    return 'Maintenance';
  }
  if (
    text.includes('lease') ||
    text.includes('leasing') ||
    text.includes('applicant') ||
    text.includes('move-in') ||
    text.includes('move-out')
  ) {
    return 'Leasing';
  }
  if (text.includes('tenant') || text.includes('portal credentials') || text.includes('screening')) {
    return 'Tenants';
  }
  if (text.includes('owner') || text.includes('payout') || text.includes('distribution')) {
    return 'Owners';
  }
  if (
    text.includes('rent') ||
    text.includes('payment') ||
    text.includes('invoice') ||
    text.includes('late fee') ||
    text.includes('ledger')
  ) {
    return 'Rent & Payments';
  }
  if (
    text.includes('accounting') ||
    text.includes('journal') ||
    text.includes('expense') ||
    text.includes('income') ||
    text.includes('chart of accounts')
  ) {
    return 'Accounting';
  }
  if (text.includes('property') || text.includes('building') || text.includes('unit')) {
    return 'Properties';
  }
  if (text.includes('report')) {
    return 'Reports';
  }
  if (
    text.includes('communication') ||
    text.includes('announcement') ||
    text.includes('message') ||
    text.includes('sms') ||
    text.includes('email')
  ) {
    return 'Communication';
  }
  if (
    text.includes('user') ||
    text.includes('role') ||
    text.includes('subscription') ||
    text.includes('company settings')
  ) {
    return 'Company Settings';
  }
  return null;
};

// Helper for redirect target path
export const getNotificationRedirectPath = (
  title: string = '',
  message: string = '',
  role: string = 'Property Manager',
  targetId?: string
): string | null => {
  const text = `${title} ${message}`.toLowerCase();

  if (text.includes('work order') || text.includes('maintenance')) {
    return targetId ? `/maintenance/work-orders?id=${targetId}` : '/maintenance/work-orders';
  }
  if (text.includes('service request')) {
    return targetId ? `/maintenance/requests?id=${targetId}` : '/maintenance/requests';
  }
  if (text.includes('violation')) {
    return targetId ? `/maintenance/violations?id=${targetId}` : '/maintenance/violations';
  }
  if (text.includes('invoice')) {
    return targetId ? `/invoices?id=${targetId}` : '/invoices';
  }
  if (text.includes('payment') || text.includes('rent')) {
    return targetId ? `/payments/${targetId}` : '/payments';
  }
  if (text.includes('lease') || text.includes('leasing')) {
    return targetId ? `/leases/${targetId}` : '/leasing/leases';
  }
  if (text.includes('tenant')) {
    return targetId ? `/tenants?id=${targetId}` : '/tenants';
  }
  if (text.includes('owner')) {
    return targetId ? `/owners?id=${targetId}` : '/owners';
  }
  if (text.includes('property') || text.includes('unit')) {
    return targetId ? `/properties?id=${targetId}` : '/properties';
  }
  return null;
};

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const displayRole = user?.role || 'Property Manager';

  const { notifications, markAsRead, markAllAsRead, clearAll, deleteNotification } = useNotificationStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Query RBAC Roles to filter out notifications for hidden menus
  const { data: roles = [] } = useQuery({
    queryKey: ['rbac-roles-list'],
    queryFn: () => api.roles.getAll(),
  });

  const hasModuleAccess = (moduleName: string) => {
    if (user?.role === 'Super Admin' || user?.role === 'Property Manager') return true;
    const matchingRole = roles.find((r: any) => r.name.toLowerCase() === user?.role?.toLowerCase());
    if (!matchingRole) return true;
    const permRule = matchingRole.permissions.find((p: any) => p.module === moduleName);
    return permRule ? permRule.view : false;
  };

  // Fetch notifications from Backend API
  const { data: realNotifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications-list', displayRole],
    queryFn: () => api.notifications.getAll({ role: displayRole }),
  });

  const localNotifications = notifications.filter((n) => n.role === displayRole);
  const combinedNotifications = Array.from(
    new Map(
      [...(realNotifications || []), ...localNotifications].map((n) => [n.id, n])
    ).values()
  );

  // 1. Filter out notifications for HIDDEN MENUS
  const accessibleNotifications = combinedNotifications.filter((n) => {
    const mod = getNotificationModule(n);
    if (mod && !hasModuleAccess(mod)) {
      return false;
    }
    return true;
  });

  // 2. Filter by status, category, and search query
  const filteredNotifications = accessibleNotifications.filter((n) => {
    // Status filter
    if (statusFilter === 'unread' && n.read) return false;
    if (statusFilter === 'read' && !n.read) return false;

    // Category filter
    if (categoryFilter !== 'all') {
      const mod = getNotificationModule(n) || 'General';
      if (mod.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    }

    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(term);
      const matchMessage = n.message.toLowerCase().includes(term);
      if (!matchTitle && !matchMessage) return false;
    }

    return true;
  });

  const unreadCount = accessibleNotifications.filter((n) => !n.read).length;
  const readCount = accessibleNotifications.filter((n) => n.read).length;

  const handleMarkAllRead = async () => {
    markAllAsRead(displayRole);
    await api.notifications.markAllAsRead(displayRole);
    await queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
  };

  const handleClearAll = async () => {
    clearAll(displayRole);
    await api.notifications.clearAll(displayRole);
    await queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    setConfirmClearOpen(false);
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(id);
    await api.notifications.delete(id);
    await queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
  };

  const handleItemClick = (n: NotificationItem) => {
    if (!n.read) {
      markAsRead(n.id);
      api.notifications.markAsRead(n.id);
    }
    const directUrl = (n as any).targetUrl;
    const path = directUrl
      ? ((n as any).targetId && !directUrl.includes('?') ? `${directUrl}?id=${(n as any).targetId}` : directUrl)
      : getNotificationRedirectPath(n.title, n.message, displayRole, n.targetId);
    if (path) {
      navigate({ to: path });
    }
  };

  const renderNotificationIcon = (item: NotificationItem) => {
    const mod = getNotificationModule(item);
    if (mod === 'Maintenance') return <Wrench className="w-4 h-4 text-amber-500" />;
    if (mod === 'Rent & Payments') return <CreditCard className="w-4 h-4 text-emerald-500" />;
    if (mod === 'Leasing') return <FileText className="w-4 h-4 text-blue-500" />;
    if (mod === 'Tenants') return <User className="w-4 h-4 text-indigo-500" />;
    if (mod === 'Properties') return <Building className="w-4 h-4 text-purple-500" />;
    if (mod === 'Accounting') return <BookOpen className="w-4 h-4 text-cyan-500" />;
    if (mod === 'Communication') return <MessageSquare className="w-4 h-4 text-pink-500" />;
    if (mod === 'Reports') return <BarChart3 className="w-4 h-4 text-orange-500" />;

    if (item.type === 'success') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (item.type === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <Info className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6 mb-2">
        <PageHeader
          title="Notifications Center"
          description="Manage system alerts, unread notifications, and role-based activity feeds."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Notifications' },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2 sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmClearOpen(true)}
            disabled={accessibleNotifications.length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </Button>
        </div>
      </div>

      {/* METRICS STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Total Alerts</span>
            <Bell className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{accessibleNotifications.length}</p>
          <p className="text-[11px] text-muted-foreground italic">Visible notifications for your role</p>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-rose-500 tracking-wider">Unread Alerts</span>
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
          </div>
          <p className="text-2xl font-extrabold text-rose-500">{unreadCount}</p>
          <p className="text-[11px] text-muted-foreground italic">Requires your review or action</p>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-500 tracking-wider">Read Alerts</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{readCount}</p>
          <p className="text-[11px] text-muted-foreground italic">Archived notifications</p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            placeholder="Search notifications by keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-sm font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Tabs */}
          <div className="flex bg-muted/40 p-1 rounded-xl border border-border">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({accessibleNotifications.length})
            </button>
            <button
              onClick={() => setStatusFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'unread' ? 'bg-background text-rose-500 shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setStatusFilter('read')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'read' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Read ({readCount})
            </button>
          </div>

          {/* Category Filter */}
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 text-xs font-semibold w-40"
          >
            <option value="all">All Modules</option>
            <option value="properties">Properties</option>
            <option value="leasing">Leasing</option>
            <option value="tenants">Tenants</option>
            <option value="owners">Owners</option>
            <option value="rent & payments">Rent & Payments</option>
            <option value="accounting">Accounting</option>
            <option value="maintenance">Maintenance</option>
            <option value="reports">Reports</option>
            <option value="communication">Communication</option>
          </Select>
        </div>
      </div>

      {/* NOTIFICATIONS LIST */}
      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/30 border border-border flex items-center justify-center mx-auto text-muted-foreground">
              <Bell className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-base text-foreground">No Notifications Found</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your search query or filter options.'
                : 'You are all caught up! New alerts and notifications will appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredNotifications.map((item) => {
              const moduleName = getNotificationModule(item) || 'General';
              const targetPath = getNotificationRedirectPath(item.title, item.message, displayRole, item.targetId);

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-4 transition-all hover:bg-muted/30 cursor-pointer flex items-start justify-between gap-4 ${
                    !item.read ? 'bg-primary/5 font-semibold' : 'opacity-90'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-xl bg-background border border-border shrink-0 mt-0.5 shadow-sm">
                      {renderNotificationIcon(item)}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{item.title}</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground uppercase tracking-wide">
                          {moduleName}
                        </span>
                        {!item.read && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> New
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed break-words">{item.message}</p>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" /> {item.time}
                        </span>
                        {targetPath && (
                          <span className="text-primary font-bold flex items-center gap-0.5 hover:underline">
                            View details <ExternalLink className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.read) {
                          useNotificationStore.setState((state) => ({
                            notifications: state.notifications.map((n) => (n.id === item.id ? { ...n, read: false } : n)),
                          }));
                        } else {
                          markAsRead(item.id);
                          api.notifications.markAsRead(item.id);
                        }
                      }}
                      title={item.read ? 'Mark as Unread' : 'Mark as Read'}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
                    >
                      <CheckCheck className={`w-4 h-4 ${item.read ? 'text-muted-foreground' : 'text-primary'}`} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      title="Delete Notification"
                      className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmClearOpen}
        onOpenChange={(open) => setConfirmClearOpen(open)}
        title="Clear All Notifications"
        description="Are you sure you want to clear all notifications for your role? This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleClearAll}
      />
    </div>
  );
};

export default NotificationsPage;

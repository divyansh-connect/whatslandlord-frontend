import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { useAuthStore, useThemeStore, useNotificationStore } from '../store/useStore';
import { getNotificationRedirectPath } from '../utils/navigation';
import { 
  Menu, Bell, Sun, Moon, LogOut, ChevronDown, ChevronRight, User,
  Building2, CreditCard, BookOpen, Wrench, FileText, 
  MessageSquare, BarChart3, ShieldAlert, LifeBuoy, Settings, X, Loader2,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/StatusBadge';
import { clsx } from 'clsx';
import { LanguageSelector } from '../components/LanguageSelector';
import { useTranslation } from 'react-i18next';

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  path: string;
  submenu?: { title: string; path: string }[];
}

interface OwnerLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  navigate: (path: string) => void;
}

export const OwnerLayout: React.FC<OwnerLayoutProps> = ({
  children,
  currentPath,
  navigate,
}) => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { notifications, setNotifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const queryClient = useQueryClient();

  // Fetch real backend notifications strictly for Owner
  const { data: realOwnerNotifications = [] } = useQuery({
    queryKey: ['notifications-list', 'Owner'],
    queryFn: () => api.notifications.getAll({ role: 'Owner' }),
    refetchInterval: 15000,
  });

  const handleMarkAllAsRead = () => {
    markAllAsRead('Owner');
    api.notifications.markAllAsRead('Owner');
    queryClient.setQueryData(['notifications-list', 'Owner'], (old: any[] = []) =>
      old.map((n) => ({ ...n, read: true }))
    );
  };

  const handleClearAll = () => {
    clearAll('Owner');
    api.notifications.clearAll('Owner');
    queryClient.setQueryData(['notifications-list', 'Owner'], []);
  };

  const handleMarkSingleAsRead = (id: string) => {
    markAsRead(id);
    api.notifications.markAsRead(id);
    queryClient.setQueryData(['notifications-list', 'Owner'], (old: any[] = []) =>
      old.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const { data: platformSettings } = useQuery({
    queryKey: ['platform-settings-general'],
    queryFn: () => api.platformSettings.getGeneral(),
    refetchInterval: 15000,
  });

  const localNotifications = notifications.filter((n) => n.role === 'Owner');
  const roleNotifications = Array.from(
    new Map(
      [...(realOwnerNotifications || []), ...localNotifications].map((n) => [n.id, n])
    ).values()
  );

  const unreadCount = roleNotifications.filter((n) => !n.read).length;

  const { t } = useTranslation();

  const menuItems: MenuItem[] = [
    { title: t('owner.nav.dashboard'), icon: <LayoutDashboard className="w-5 h-5" />, path: '/owner' },
    { title: t('owner.nav.properties'), icon: <Building2 className="w-5 h-5" />, path: '/owner/properties' },
    { title: t('owner.nav.financials'), icon: <CreditCard className="w-5 h-5" />, path: '/owner/financials' },
    { title: t('owner.nav.statements'), icon: <BookOpen className="w-5 h-5" />, path: '/owner/statements' },
    { title: t('owner.nav.distributions'), icon: <LifeBuoy className="w-5 h-5" />, path: '/owner/distributions' },
    { title: t('owner.nav.maintenance'), icon: <Wrench className="w-5 h-5" />, path: '/owner/maintenance' },
    { title: t('owner.nav.documents'), icon: <FileText className="w-5 h-5" />, path: '/owner/documents' },
    { title: t('owner.nav.reports'), icon: <BarChart3 className="w-5 h-5" />, path: '/owner/reports' },
    { title: t('owner.nav.messages'), icon: <MessageSquare className="w-5 h-5" />, path: '/owner/messages' },
    { title: t('owner.nav.profile'), icon: <User className="w-5 h-5" />, path: '/owner/profile' },
  ];

  const handleMenuClick = (item: MenuItem) => {
    navigate(item.path);
    setIsMobileOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col border-r bg-card text-card-foreground shrink-0 w-64">
        <div className="h-16 flex items-center px-6 border-b">
          <span className="font-black text-lg text-primary truncate">
            {t('owner.portal')}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.title}
                onClick={() => handleMenuClick(item)}
                className={clsx(
                  'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider',
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                {item.icon}
                <span>{item.title}</span>
              </button>
            );
          })}
        </nav>

        {/* Desktop Logout Button */}
        <div className="p-4 border-t border-border/40">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>{t('owner.signOut')}</span>
          </button>
        </div>
      </aside>

      {/* MOBILE SIDEBAR DRAWER (SHEET) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          {/* Drawer content */}
          <div className="relative flex flex-col w-72 max-w-xs bg-card border-r p-4 transition-transform duration-200">
            <div className="flex items-center justify-between pb-4 border-b mb-4">
              <span className="font-black text-lg text-primary truncate">
                {t('owner.portal')}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto space-y-1">
              {menuItems.map((item) => {
                const isActive = currentPath === item.path;
                return (
                  <button
                    key={item.title}
                    onClick={() => handleMenuClick(item)}
                    className={clsx(
                      'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider',
                      isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </nav>
            {/* Mobile Logout Button */}
            <div className="pt-4 border-t border-border/40 mt-5">
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>{t('owner.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <span className="text-xs font-black uppercase text-muted-foreground">{t('owner.investorDashboard')}</span>
          </div>

          <div className="flex items-center space-x-4 relative">
            
            {/* THEME TOGGLE */}
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            </Button>

            {/* NOTIFICATIONS WIDGET */}
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setShowNotifications(!showNotifications)}>
                <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm border-2 border-background pointer-events-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>

              {showNotifications && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-border bg-card shadow-2xl p-4 animate-fade-in text-foreground">
                  <div className="flex items-center justify-between pb-2 border-b border-border/80">
                    <h4 className="font-bold text-sm">{t('header.notifications')}</h4>
                    <div className="flex space-x-2 text-xs font-semibold text-primary">
                      <button onClick={handleMarkAllAsRead} className="hover:underline">
                        {t('header.readAll')}
                      </button>
                      <span>•</span>
                      <button onClick={handleClearAll} className="hover:underline text-muted-foreground">
                        {t('header.clear')}
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {roleNotifications.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-6">
                        {t('header.noNotifications')}
                      </p>
                    ) : (
                      roleNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            handleMarkSingleAsRead(n.id);
                            setShowNotifications(false);
                            const rawUrl = (n as any).targetUrl;
                            const directUrl = rawUrl
                              ? rawUrl.startsWith('/rent-payments/invoices')
                                ? rawUrl.replace('/rent-payments/invoices', '/invoices')
                                : rawUrl === '/rent-payments'
                                ? '/payments'
                                : rawUrl
                              : null;
                            const path = directUrl
                              ? ((n as any).targetId && !directUrl.includes('?') ? `${directUrl}?id=${(n as any).targetId}` : directUrl)
                              : getNotificationRedirectPath(n.title, n.message, user?.role || 'Owner', n.targetId);
                            if (path) {
                              navigate(path);
                            }
                          }}
                          className={clsx(
                            'p-2.5 rounded-lg border border-border/40 hover:bg-muted/50 cursor-pointer transition-all text-left',
                            !n.read && 'bg-primary/5 border-primary/20'
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-semibold text-xs">{n.title}</span>
                            <span className="text-[10px] text-muted-foreground">{n.time}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Language Selector */}
            <LanguageSelector />

            {/* USER PROFILE DROPDOWN */}
            <div className="relative">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center space-x-2 border rounded-full p-1.5 hover:bg-secondary/40">
                <div className="w-6.5 h-6.5 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs uppercase text-primary shrink-0">
                  {user?.name?.slice(0, 2) || 'OW'}
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-card border rounded-xl shadow-xl py-2 z-50 text-xs font-semibold">
                  <div className="px-4 py-2 border-b">
                    <p className="font-extrabold truncate">{user?.name || 'Investor Owner'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email || 'owner@capital.com'}</p>
                  </div>
                  <button onClick={() => { logout(); navigate('/login'); }} className="w-full text-left px-4 py-2 text-rose-500 hover:bg-rose-500/10 flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> {t('owner.signOut')}
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* SYSTEM MAINTENANCE BANNER */}
        {platformSettings?.maintenanceMode === 'true' && (
          <div className="bg-rose-600 text-white px-6 py-3 shadow-lg flex items-center justify-between text-xs font-extrabold shrink-0 z-20 animate-in slide-in-from-top duration-300">
            <div className="flex items-center space-x-2.5">
              <ShieldAlert className="w-5 h-5 text-white animate-bounce shrink-0" />
              <span>⚠️ SYSTEM MAINTENANCE MODE ACTIVE — Owner portal is currently under scheduled system maintenance. Access to financial reports & portal features is restricted.</span>
            </div>
            <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest shrink-0 ml-4 border border-white/20">Portal Restricted</span>
          </div>
        )}

        {/* OUTLET PAGE BODY */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 bg-secondary/5">
          {children}
        </main>

      </div>
    </div>
  );
};

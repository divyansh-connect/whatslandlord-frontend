import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useAuthStore, useThemeStore, useNotificationStore } from '../store/useStore';
import { getNotificationRedirectPath } from '../utils/navigation';
import { 
  Menu, Bell, Sun, Moon, LogOut, ChevronDown, ChevronRight, User, Home,
  LayoutDashboard, CreditCard, BookOpen, Wrench, FileText, Megaphone,
  UserCheck, Shield, HelpCircle, Package, Eye, ShieldAlert, X, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/StatusBadge';
import { clsx } from 'clsx';
import { LanguageSelector } from '../components/LanguageSelector';
import { TenantAiConciergeWidget } from '../components/TenantAiConciergeWidget';
import { useTranslation } from 'react-i18next';

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  path: string;
}

interface TenantLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  navigate: (path: string) => void;
}

import { isNoticeForTenant } from '../utils/tenantNoticeHelper';

export const TenantLayout: React.FC<TenantLayoutProps> = ({
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

  // Fetch real backend notifications strictly for Tenant
  const { data: realTenantNotifications = [] } = useQuery({
    queryKey: ['notifications-list', 'Tenant'],
    queryFn: () => api.notifications.getAll({ role: 'Tenant' }),
    refetchInterval: 15000,
  });

  const { data: platformSettings } = useQuery({
    queryKey: ['platform-settings-general'],
    queryFn: () => api.platformSettings.getGeneral(),
    refetchInterval: 15000,
  });

  const { data: tenantProfile } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: () => api.tenantProfile.get(),
  });

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

  const localNotifications = notifications.filter((n) => !n.role || n.role === 'Tenant');
  const roleNotifications = Array.from(
    new Map(
      [...(realTenantNotifications || []), ...localNotifications]
        .filter((n: any) => isNoticeForTenant(n, tenantCtx))
        .map((n) => [n.id, n])
    ).values()
  );

  const unreadCount = roleNotifications.filter((n) => !n.read).length;

  const { t } = useTranslation();

  const menuItems: MenuItem[] = [
    { title: t('tenant.nav.dashboard'), icon: <LayoutDashboard className="w-5 h-5" />, path: '/tenant' },
    { title: t('tenant.nav.lease'), icon: <BookOpen className="w-5 h-5" />, path: '/tenant/lease' },
    { title: t('tenant.nav.payments'), icon: <CreditCard className="w-5 h-5" />, path: '/tenant/payments' },
    { title: t('tenant.nav.maintenance'), icon: <Wrench className="w-5 h-5" />, path: '/tenant/maintenance' },
    { title: t('tenant.nav.documents'), icon: <FileText className="w-5 h-5" />, path: '/tenant/documents' },
    { title: t('tenant.nav.messages'), icon: <UserCheck className="w-5 h-5" />, path: '/tenant/messages' },
    { title: t('tenant.nav.notifications'), icon: <Bell className="w-5 h-5" />, path: '/tenant/notifications' },
    { title: t('tenant.nav.profile'), icon: <User className="w-5 h-5" />, path: '/tenant/profile' },
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
            {t('tenant.portal')}
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
            <span>{t('tenant.signOut')}</span>
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
                {t('tenant.portal')}
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
            <span className="text-xs font-black uppercase text-muted-foreground">{t('tenant.selfService')}</span>
          </div>

          <div className="flex items-center space-x-4 relative">
            
            {/* THEME TOGGLE */}
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            </Button>

            {/* NOTIFICATIONS WIDGET */}
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setShowNotifications(!showNotifications)}>
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {showNotifications && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-border bg-card shadow-2xl p-4 animate-fade-in text-foreground">
                  <div className="flex items-center justify-between pb-2 border-b border-border/80">
                    <h4 className="font-bold text-sm">{t('header.notifications')}</h4>
                    <div className="flex space-x-2 text-xs font-semibold text-primary">
                      <button onClick={() => markAllAsRead('Tenant')} className="hover:underline">
                        {t('header.readAll')}
                      </button>
                      <span>•</span>
                      <button onClick={() => clearAll('Tenant')} className="hover:underline text-muted-foreground">
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
                            markAsRead(n.id);
                            setShowNotifications(false);
                            const path = getNotificationRedirectPath(n.title, n.message, user?.role || 'Tenant', n.targetId);
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
                  {user?.name?.slice(0, 2) || 'SC'}
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-card border rounded-xl shadow-xl py-2 z-50 text-xs font-semibold">
                  <div className="px-4 py-2 border-b">
                    <p className="font-extrabold truncate">{user?.name || 'Sarah Connor'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email || 'sarah.c@skyline.com'}</p>
                  </div>
                  <button onClick={() => { logout(); navigate('/login'); }} className="w-full text-left px-4 py-2 text-rose-500 hover:bg-rose-500/10 flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> {t('tenant.signOut')}
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
              <span>⚠️ SYSTEM MAINTENANCE MODE ACTIVE — Tenant portal is currently under scheduled system maintenance. Access to financial transactions & portal features is restricted.</span>
            </div>
            <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest shrink-0 ml-4 border border-white/20">Portal Restricted</span>
          </div>
        )}

        {/* OUTLET PAGE BODY */}
        <main className="flex-1 overflow-y-auto p-6 bg-secondary/5 relative">
          {children}
          <TenantAiConciergeWidget />
        </main>

      </div>
    </div>
  );
};

// Simple Fallback Helper for Users Icon
const UsersIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useAuthStore, useThemeStore, useNotificationStore } from '../store/useStore';
import { getNotificationRedirectPath, getNotificationModule } from '../features/notifications/NotificationsPage';
import { 
  Menu, Bell, Sun, Moon, LogOut, ChevronDown, ChevronRight, User,
  LayoutDashboard, Building2, Home, Key, Users, UserCheck, CreditCard, 
  BookOpen, Wrench, ShieldAlert, FileText, BarChart3, MessageSquare, Bot, Settings, X, Loader2,
  Briefcase, CalendarCheck, LifeBuoy, Shield, RotateCcw
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/StatusBadge';
import { clsx } from 'clsx';
import { LanguageSelector } from '../components/LanguageSelector';
import { SubscriptionGuardModal } from '../components/SubscriptionGuardModal';
import { useTranslation } from 'react-i18next';

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  path: string;
  submenu?: { title: string; path: string }[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  navigate: (path: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  currentPath,
  navigate,
}) => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const { t } = useTranslation();

  // --- SUPER ADMIN MENU ITEMS ---
  const superAdminMenuItems: MenuItem[] = [
    { title: t('nav.dashboard'), icon: <LayoutDashboard className="w-5 h-5" />, path: '/' },
    {
      title: t('nav.companies'),
      icon: <Building2 className="w-5 h-5" />,
      path: '/companies',
      submenu: [
        { title: t('nav.companies'), path: '/companies' },
        { title: t('nav.createCompany'), path: '/companies/new' },
        // { title: t('nav.companyUsers'), path: '/companies/users' },
      ],
    },
    {
      title: t('nav.subscriptions'),
      icon: <CalendarCheck className="w-5 h-5" />,
      path: '/subscriptions',
      submenu: [
        { title: t('nav.plans'), path: '/subscriptions/plans' },
        { title: t('nav.activeSubscriptions'), path: '/subscriptions/active' },
        { title: t('nav.invoices'), path: '/subscriptions/invoices' },
      ],
    },
    // {
    //   title: t('nav.platformUsers'),
    //   icon: <Users className="w-5 h-5" />,
    //   path: '/platform-users',
    // },
    {
      title: t('nav.platformSettings'),
      icon: <Settings className="w-5 h-5" />,
      path: '/platform-settings',
      submenu: [
        { title: t('nav.general'), path: '/platform-settings/general' },
        { title: t('nav.securityAndLogs'), path: '/platform-security/audit' },
      ],
    },
    {
      title: "WordPress Inquiries",
      icon: <MessageSquare className="w-5 h-5" />,
      path: '/superadmin/wordpress-inquiries',
    },
  ];

  // --- PROPERTY MANAGER MENU ITEMS ---
  const managerMenuItems: MenuItem[] = [
    { title: t('nav.dashboard'), icon: <LayoutDashboard className="w-5 h-5" />, path: '/' },
    {
      title: t('nav.properties'),
      icon: <Building2 className="w-5 h-5" />,
      path: '/properties',
      submenu: [
        { title: t('nav.properties'), path: '/properties' },
        { title: t('nav.units'), path: '/units' },
        { title: 'Drafts', path: '/properties/drafts' },
      ],
    },
    {
      title: t('nav.leasing'),
      icon: <Key className="w-5 h-5" />,
      path: '/leasing',
      submenu: [
        { title: t('nav.leads'), path: '/leasing/leads' },
        { title: t('nav.applications'), path: '/leasing/applications' },
        { title: t('nav.tenantScreening'), path: '/leasing/screening' },
        { title: t('nav.leases'), path: '/leasing/leases' },
        { title: t('nav.renewals'), path: '/leasing/renewals' },
        { title: t('nav.moveIn'), path: '/leasing/move-in' },
        { title: t('nav.moveOut'), path: '/leasing/move-out' },
        { title: 'Inspection Templates', path: '/leasing/inspection-templates' },
      ],
    },
    {
      title: t('nav.tenants'),
      icon: <Users className="w-5 h-5" />,
      path: '/tenants',
      submenu: [
        { title: t('nav.tenantDirectory'), path: '/tenants' },
        { title: t('nav.tenantDocuments'), path: '/tenants/documents' },
      ],
    },
    {
      title: t('nav.documents'),
      icon: <FileText className="w-5 h-5" />,
      path: '/documents/all',
    },
    {
      title: t('nav.owners'),
      icon: <UserCheck className="w-5 h-5" />,
      path: '/owners',
    },
    {
      title: t('nav.rentAndPayments'),
      icon: <CreditCard className="w-5 h-5" />,
      path: '/rent',
      submenu: [
        { title: t('nav.dashboard'), path: '/rent' },
        { title: t('nav.payments'), path: '/payments' },
        { title: t('nav.invoices'), path: '/invoices' },
        { title: t('nav.rentLedger'), path: '/rent-ledger' },
      ],
    },
    {
      title: t('nav.accounting'),
      icon: <BookOpen className="w-5 h-5" />,
      path: '/accounting',
      submenu: [
        { title: t('nav.dashboard'), path: '/accounting' },
        { title: t('nav.chartOfAccounts'), path: '/accounting/chart-of-accounts' },
        { title: t('nav.income'), path: '/accounting/income' },
        { title: t('nav.expenses'), path: '/accounting/expenses' },
      ],
    },
    {
      title: t('nav.maintenance'),
      icon: <Wrench className="w-5 h-5" />,
      path: '/maintenance',
      submenu: [
        { title: t('nav.dashboard'), path: '/maintenance' },
        { title: t('nav.serviceRequests'), path: '/maintenance/requests' },
        { title: t('nav.workOrders'), path: '/maintenance/work-orders' },
        { title: t('nav.violationsAndCode'), path: '/maintenance/violations' },
        // { title: t('nav.inspections'), path: '/inspections' },
        { title: t('nav.vendors'), path: '/vendors' },
      ],
    },
    {
      title: t('nav.reports'),
      icon: <BarChart3 className="w-5 h-5" />,
      path: '/reports',
    },
    {
      title: t('nav.communication'),
      icon: <MessageSquare className="w-5 h-5" />,
      path: '/communication',
    },
    {
      title: 'Notifications',
      icon: <Bell className="w-5 h-5" />,
      path: '/notifications',
    },
    {
      title: t('nav.aiAssistant'),
      icon: <Bot className="w-5 h-5" />,
      path: '/ai/assistant',
    },
    {
      title: t('nav.restoreBin', 'Restore Bin'),
      icon: <RotateCcw className="w-5 h-5 text-amber-500" />,
      path: '/restore-bin',
    },
    {
      title: t('nav.companySettings'),
      icon: <Settings className="w-5 h-5" />,
      path: '/admin',
      submenu: [
        { title: t('nav.companyProfile'), path: '/admin/company-settings' },
        { title: t('nav.unitDeletionSettings'), path: '/admin/unit-deletion' },
        { title: 'Late Fee Policy', path: '/admin/late-fees' },
        { title: t('nav.usersAndRoles'), path: '/admin/users' },
        { title: t('nav.rolesAndPermissions'), path: '/admin/roles' },
        { title: t('nav.paymentSettings'), path: '/admin/payment-settings' },
        { title: 'Subscription & Billing', path: '/admin/billing' },
        { title: t('nav.integrationsMarketplace'), path: '/admin/integrations' },
        { title: t('nav.connectedApps'), path: '/platform-integrations/connected' },
      ],
    },
  ];

  // --- COLLECTION MANAGER MENU ITEMS ---
  const collectionManagerMenuItems: MenuItem[] = [
    { title: t('nav.dashboard'), icon: <LayoutDashboard className="w-5 h-5" />, path: '/' },
    {
      title: t('nav.tenantInvoices'),
      icon: <FileText className="w-5 h-5" />,
      path: '/invoices',
    },
    {
      title: t('nav.paymentHistory'),
      icon: <CreditCard className="w-5 h-5" />,
      path: '/payments',
    },
    {
      title: t('nav.tenantLedger'),
      icon: <BookOpen className="w-5 h-5" />,
      path: '/rent-ledger',
    },
    {
      title: t('nav.profile'),
      icon: <User className="w-5 h-5" />,
      path: '/profile',
    },
  ];

  const { data: roles = [] } = useQuery({
    queryKey: ['rbac-roles-list'],
    queryFn: () => api.roles.getAll(),
  });

  const hasModuleAccess = (moduleName: string) => {
    if (user?.role === 'Super Admin' || user?.role === 'Property Manager') return true;
    const matchingRole = roles.find(r => r.name.toLowerCase() === user?.role?.toLowerCase());
    if (!matchingRole) return true; // fallback
    const permRule = matchingRole.permissions.find((p: any) => p.module === moduleName);
    return permRule ? permRule.view : false;
  };

  const getFilteredMenuItems = () => {
    if (user?.role === 'Super Admin') return superAdminMenuItems;
    if (user?.role === 'Collection Manager') return collectionManagerMenuItems;

    const filtered: MenuItem[] = [];

    managerMenuItems.forEach(item => {
      let moduleName = '';
      if (item.path.startsWith('/properties') || item.path.startsWith('/buildings') || item.path.startsWith('/units')) {
        moduleName = 'Properties';
      } else if (item.path.startsWith('/leasing')) {
        moduleName = 'Leasing';
      } else if (item.path.startsWith('/tenants')) {
        moduleName = 'Tenants';
      } else if (item.path.startsWith('/owners')) {
        moduleName = 'Owners';
      } else if (item.path.startsWith('/rent') || item.path.startsWith('/payments') || item.path.startsWith('/invoices') || item.path.startsWith('/rent-ledger')) {
        moduleName = 'Rent & Payments';
      } else if (item.path.startsWith('/accounting')) {
        moduleName = 'Accounting';
      } else if (item.path.startsWith('/maintenance') || item.path.startsWith('/inspections') || item.path.startsWith('/vendors')) {
        moduleName = 'Maintenance';
      } else if (item.path.startsWith('/reports')) {
        moduleName = 'Reports';
      } else if (item.path.startsWith('/communication')) {
        moduleName = 'Communication';
      } else if (item.path.startsWith('/notifications')) {
        moduleName = 'Notifications';
      } else if (item.path.startsWith('/admin') || item.path.startsWith('/platform-integrations')) {
        moduleName = 'Company Settings';
      } else if (item.path.startsWith('/ai')) {
        moduleName = 'Dashboard';
      }

      if (!moduleName || hasModuleAccess(moduleName)) {
        filtered.push(item);
      }
    });

    return filtered;
  };

  const visibleMenuItems = getFilteredMenuItems();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const displayRole = user?.role || 'Property Manager';

  // Fetch real backend notifications filtered strictly for Property Manager / User Role
  const { data: realNotifications = [] } = useQuery({
    queryKey: ['notifications-list', displayRole],
    queryFn: () => api.notifications.getAll({ role: displayRole }),
    refetchInterval: 15000,
  });

  const localNotifications = notifications.filter((n) => !n.role || n.role === displayRole);
  const combinedNotifications = Array.from(
    new Map(
      [...(realNotifications || []), ...localNotifications].map((n) => [n.id, n])
    ).values()
  );

  // Filter out notifications for hidden modules / menus!
  const roleNotifications = combinedNotifications.filter((n) => {
    const mod = getNotificationModule(n);
    if (mod && !hasModuleAccess(mod)) {
      return false; // Hide notification if user role has no access to this module menu!
    }
    return true;
  });

  const unreadCount = roleNotifications.filter((n) => !n.read).length;

  useEffect(() => {
    const activeItem = visibleMenuItems.find(item => 
      item.submenu?.some(sub => currentPath === sub.path)
    );
    if (activeItem) {
      setActiveDropdown(activeItem.title);
    }
  }, [currentPath, roles]);

  const navRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const savedScroll = sessionStorage.getItem('sidebar-scroll');
    if (savedScroll && navRef.current) {
      navRef.current.scrollTop = parseInt(savedScroll, 10);
    }
  }, [currentPath]);

  const handleMenuClick = (item: MenuItem) => {
    if (navRef.current) {
      sessionStorage.setItem('sidebar-scroll', navRef.current.scrollTop.toString());
    }
    if (item.submenu) {
      setActiveDropdown(activeDropdown === item.title ? null : item.title);
    } else {
      navigate(item.path);
      setIsMobileOpen(false);
    }
  };

  const isLinkActive = (path: string, itemTitle?: string) => {
    if (path === '/') return currentPath === '/';
    if (itemTitle === 'Accounting Ledger') {
      return currentPath === '/accounting' || currentPath.startsWith('/accounting/income') || currentPath === '/accounting/chart-of-accounts';
    }
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  // Build Breadcrumbs from Path
  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs = [{ label: t('header.home', 'Home'), href: '/' }];
    let currentLink = '';
    parts.forEach((part) => {
      currentLink += `/${part}`;
      const translationKeyMap: Record<string, string> = {
        'platform-security': t('nav.platformSettings', 'Platform Security'),
        'audit': t('platformSecurity.auditLogs.breadcrumb', 'Audit Logs'),
        'login-history': t('platformSecurity.loginHistory.breadcrumb', 'Login History'),
        'policies': t('platformSecurity.policies.breadcrumb', 'Policies'),
        'platform-settings': t('nav.platformSettings', 'Platform Settings'),
        'general': t('platformSettingsPage.general', 'General'),
        'email': t('platformSettings.email.breadcrumb', 'Email'),
        'storage': t('platformSettings.storage.breadcrumb', 'Storage'),
        'branding': t('platformSettings.branding.breadcrumb', 'Branding'),
        'platform-integrations': t('nav.integrationsMarketplace', 'Integrations'),
        'connected': t('platformIntegrations.connectedApps.breadcrumb', 'Connected Apps'),
        'keys': t('platformIntegrations.apiKeys.breadcrumb', 'API Keys'),
        'webhooks': t('platformIntegrations.webhooks.breadcrumb', 'Webhooks')
      };
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part);
      const label = isUuid 
        ? t('breadcrumbs.details', 'Details') 
        : (translationKeyMap[part] || t(`nav.${part}`, part.charAt(0).toUpperCase() + part.slice(1).replace('-', ' ')));
      crumbs.push({
        label,
        href: currentLink,
      });
    });
    return crumbs;
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      {/* --- DESKTOP SIDEBAR --- */}
      <aside
        className={clsx(
          'hidden md:flex flex-col border-r border-border/80 bg-card/45 backdrop-blur-xl sticky top-0 h-screen transition-all duration-300 z-40',
          isSidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border/60">
          <div className="flex items-center space-x-3 overflow-hidden">
            {isSidebarOpen && (
              <span className="font-extrabold text-lg tracking-tight whitespace-nowrap text-foreground">
                WhatsLandlord
              </span>
            )}
          </div>
        </div>

        {/* Sidebar Menu Scroll */}
        <nav ref={navRef} className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleMenuItems.map((item) => {
            const hasSub = !!item.submenu;
            const isOpen = activeDropdown === item.title;
            const active = isLinkActive(item.path, item.title);

            return (
              <div key={item.title} className="space-y-1">
                <button
                  onClick={() => handleMenuClick(item)}
                  className={clsx(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 group',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/10'
                      : 'hover:bg-accent/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <span className={clsx('transition-transform duration-200 group-hover:scale-105', active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary')}>
                      {item.icon}
                    </span>
                    {isSidebarOpen && <span>{item.title}</span>}
                  </div>
                  {isSidebarOpen && hasSub && (
                    <span>{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
                  )}
                </button>

                {/* Submenu rendering */}
                {isSidebarOpen && hasSub && isOpen && (
                  <div className="pl-8 space-y-1 py-1 animate-fade-in border-l border-border/80 ml-5">
                    {item.submenu!.map((sub) => {
                      const subActive = currentPath === sub.path;
                      return (
                        <button
                          key={sub.title}
                          onClick={() => {
                            if (navRef.current) {
                              sessionStorage.setItem('sidebar-scroll', navRef.current.scrollTop.toString());
                            }
                            navigate(sub.path);
                            setIsMobileOpen(false);
                          }}
                          className={clsx(
                            'w-full text-left px-3 py-2 rounded-md text-xs font-semibold transition-all duration-150',
                            subActive
                              ? 'text-primary bg-primary/5 dark:bg-primary/15'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                          )}
                        >
                          {sub.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Desktop Sidebar Footer - Logout */}
        <div className="p-4 border-t border-border/60">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-all uppercase tracking-wider"
          >
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span>{t('header.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* --- MOBILE SIDEBAR DRAWER (SHEET) --- */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          {/* Drawer content */}
          <div className="relative flex flex-col w-72 max-w-xs bg-card border-r border-border p-4 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base">WhatsLandlord</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            {/* Scrollable menu */}
            <nav className="flex-1 overflow-y-auto space-y-1">
              {visibleMenuItems.map((item) => {
                const hasSub = !!item.submenu;
                const isOpen = activeDropdown === item.title;
                const active = isLinkActive(item.path, item.title);

                return (
                  <div key={item.title}>
                    <button
                      onClick={() => handleMenuClick(item)}
                      className={clsx(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all',
                        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent/40'
                      )}
                    >
                      <div className="flex items-center space-x-3 w-full">
                        {item.icon}
                        <span className="truncate">{item.title}</span>
                        {item.path === '/notifications' && unreadCount > 0 && (
                          <span className="ml-auto bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      {hasSub && (isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                    </button>
                    {hasSub && isOpen && (
                      <div className="pl-6 space-y-1 py-1 border-l ml-5 mt-1 border-border">
                        {item.submenu!.map((sub) => (
                          <button
                            key={sub.title}
                            onClick={() => {
                              navigate(sub.path);
                              setIsMobileOpen(false);
                            }}
                            className={clsx(
                              'w-full text-left px-3 py-2 rounded text-xs font-semibold',
                              currentPath === sub.path ? 'text-primary bg-primary/5' : 'text-muted-foreground'
                            )}
                          >
                            {sub.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
            {/* Mobile Logout Button */}
            <div className="pt-4 border-t border-border mt-4">
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors uppercase tracking-wider"
              >
                <LogOut className="w-5 h-5" />
                <span>{t('header.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN PAGE CONTENT CONTAINER --- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* --- HEADER --- */}
        <header className="glass-header h-16 flex items-center justify-between px-6 z-30">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Breadcrumb renderer removed per user request */}
          </div>

          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} title={t('header.toggleTheme')}>
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {showNotifications && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-border bg-card shadow-2xl p-4 animate-fade-in text-foreground">
                  <div className="flex items-center justify-between pb-2 border-b border-border/80">
                    <h4 className="font-bold text-sm">{t('header.notifications')}</h4>
                    <div className="flex space-x-2 text-xs font-semibold text-primary">
                      <button onClick={() => markAllAsRead(displayRole)} className="hover:underline">
                        {t('header.readAll')}
                      </button>
                      <span>•</span>
                      <button onClick={() => clearAll(displayRole)} className="hover:underline text-muted-foreground">
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
                            const path = getNotificationRedirectPath(n.title, n.message, user?.role || 'Property Manager', n.targetId);
                            if (path) {
                              navigate(path);
                            }
                          }}
                          className={clsx(
                            'p-2.5 rounded-lg border border-border/40 hover:bg-muted/50 cursor-pointer transition-all',
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

            {/* Profile Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 px-2 hover:bg-accent rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="object-cover w-full h-full" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold leading-tight">{user?.name || 'Manager'}</p>
                  <p className="text-[10px] text-muted-foreground leading-none">{user?.role || 'Apex Admin'}</p>
                </div>
              </Button>

              {showProfileMenu && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-border bg-card p-3 shadow-2xl animate-fade-in text-foreground">
                  <div className="pb-2 border-b border-border/80 text-xs">
                    <p className="font-bold">{user?.name || 'Sarah Davis'}</p>
                    <p className="text-muted-foreground truncate">{user?.email || 'manager@apexpm.com'}</p>
                  </div>
                  <div className="mt-2 space-y-1">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate('/profile');
                      }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs font-semibold flex items-center space-x-2"
                    >
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{t('nav.profile')}</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 text-xs font-semibold flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('header.logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* --- MAIN PAGE VIEW CONTENT --- */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 animate-fade-in">
          {children}
        </main>
      </div>

      <SubscriptionGuardModal />
    </div>
  );
};
export default DashboardLayout;

import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useLocation,
  useNavigate,
  useRouterState
} from '@tanstack/react-router';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { useAuthStore } from '../store/useStore';
import {
  Plus, Search, Eye, Edit, Power, Ban, CheckCircle, XCircle, Lock, Settings, Key,
  Database, Mail, FileText, Globe, Building2, Users, CreditCard, BarChart3,
  LifeBuoy, Shield, Activity, Sparkles, Clock, ArrowRight, ShieldAlert, Check, X,
  Trash2, HelpCircle, RefreshCw, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/PageHeader';
import { Input } from '../components/ui/Input';
import { FormDialog } from '../components/FormDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';

// Layouts
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';

// Pages
import { LoginPage } from '../features/auth/LoginPage';
import { LandingPage } from '../features/landing/LandingPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { SuperAdminDashboardPage } from '../features/dashboard/SuperAdminDashboardPage';
import { CollectionDashboardPage } from '../features/dashboard/CollectionDashboardPage';

// Properties & Buildings (Phase 2)
import { PropertiesPage } from '../features/properties/PropertiesPage';
import { NewPropertyPage } from '../features/properties/NewPropertyPage';
import { EditPropertyPage } from '../features/properties/EditPropertyPage';
import { PropertyDetailsPage } from '../features/properties/PropertyDetailsPage';
import { DraftPropertiesPage } from '../features/properties/DraftPropertiesPage';
import { BuildingsPage } from '../features/properties/BuildingsPage';
import { UnitsPage } from '../features/units/UnitsPage';
import { NewUnitPage } from '../features/units/NewUnitPage';
import { EditUnitPage } from '../features/units/EditUnitPage';
import { UnitDetailsPage } from '../features/units/UnitDetailsPage';

// Tenants Module (Phase 3)
import { TenantsPage } from '../features/tenants/TenantsPage';
import { NewTenantPage } from '../features/tenants/NewTenantPage';
import { EditTenantPage } from '../features/tenants/EditTenantPage';
import { TenantDetailsPage } from '../features/tenants/TenantDetailsPage';
import { PortalPreviewPage } from '../features/tenants/PortalPreviewPage';
import { ManagerTenantDocumentsPage } from '../features/tenants/ManagerTenantDocumentsPage';

// Leasing & Applications Module (Phase 3)
import { LeasesPage } from '../features/leasing/LeasesPage';
import { NewLeasePage } from '../features/leasing/NewLeasePage';
import { LeaseDetailsPage } from '../features/leasing/LeaseDetailsPage';
import { RenewalsPage } from '../features/leasing/RenewalsPage';
import { MoveInOutPage } from '../features/leasing/MoveInOutPage';
import { InspectionTemplatesPage } from '../features/leasing/InspectionTemplatesPage';
import { MoveInDetailPage } from '../features/leasing/MoveInDetailPage';
import { MoveOutRegistryPage } from '../features/leasing/MoveOutRegistryPage';
import { MoveOutDetailPage } from '../features/leasing/MoveOutDetailPage';
import { DamageReviewPage } from '../features/leasing/DamageReviewPage';
import { InspectionScreen } from '../features/leasing/InspectionScreen';
import { ApplicationsPage } from '../features/leasing/ApplicationsPage';
import { NewApplicationPage } from '../features/leasing/NewApplicationPage';
import { TenantScreeningPage } from '../features/leasing/TenantScreeningPage';
import { ApplicantScreeningWizard } from '../features/leasing/ApplicantScreeningWizard';

// CRM & Leads Module (Phase 3)
import { CRMDashboardPage } from '../features/crm/CRMDashboardPage';
import { LeadsPage } from '../features/crm/LeadsPage';
import { NewLeadPage } from '../features/crm/NewLeadPage';
import { LeadDetailsPage } from '../features/crm/LeadDetailsPage';

// Rent Collection & Payments (Phase 4)
import { RentDashboardPage } from '../features/rent/RentDashboardPage';
import { PaymentsPage } from '../features/rent/PaymentsPage';
import { NewPaymentPage } from '../features/rent/NewPaymentPage';
import { PaymentDetailsPage } from '../features/rent/PaymentDetailsPage';
import { RentLedgerPage } from '../features/rent/RentLedgerPage';
import { InvoicesPage } from '../features/rent/InvoicesPage';
import { NewInvoicePage } from '../features/rent/NewInvoicePage';
import { ChargesPage } from '../features/rent/ChargesPage';
import { DepositsPage } from '../features/rent/DepositsPage';
import { PaymentPlansPage } from '../features/rent/PaymentPlansPage';
import { RefundsPage } from '../features/rent/RefundsPage';
import { PaymentMethodsPage } from '../features/rent/PaymentMethodsPage';

// Placeholders/Other
import { AccountingDashboardPage } from '../features/accounting/AccountingDashboardPage';
import { ChartOfAccountsPage } from '../features/accounting/ChartOfAccountsPage';
import { JournalEntriesPage } from '../features/accounting/JournalEntriesPage';
import { GeneralLedgerPage } from '../features/accounting/GeneralLedgerPage';
import { IncomePage } from '../features/accounting/IncomePage';
import { ExpensesPage } from '../features/accounting/ExpensesPage';
import { VendorBillsPage } from '../features/accounting/VendorBillsPage';
import { RecurringTransactionsPage } from '../features/accounting/RecurringTransactionsPage';
import { BankAccountsPage } from '../features/accounting/BankAccountsPage';
import { BankReconciliationPage } from '../features/accounting/BankReconciliationPage';
import { BudgetsPage } from '../features/accounting/BudgetsPage';
import { OwnerStatementsPage } from '../features/accounting/OwnerStatementsPage';
import { TaxesPage } from '../features/accounting/TaxesPage';
import { FinancialReportsPage } from '../features/accounting/FinancialReportsPage';
import { YearEndPage } from '../features/accounting/YearEndPage';
import { OwnersPage } from '../features/owners/OwnersPage';
import { MaintenanceDashboardPage } from '../features/maintenance/MaintenanceDashboardPage';
import { RequestsPage } from '../features/maintenance/RequestsPage';
import { NewRequestPage } from '../features/maintenance/NewRequestPage';
import { RequestDetailsPage } from '../features/maintenance/RequestDetailsPage';
import { WorkOrdersPage } from '../features/maintenance/WorkOrdersPage';
import { WorkOrderDetailsPage } from '../features/maintenance/WorkOrderDetailsPage';
import { ViolationsPage } from '../features/maintenance/ViolationsPage';
import { PreventivePage } from '../features/maintenance/PreventivePage';
import { AssetsPage } from '../features/maintenance/AssetsPage';
import { InventoryPage } from '../features/maintenance/InventoryPage';
import { VendorsPage } from '../features/vendors/VendorsPage';
import { VendorInvoicesPage } from '../features/vendors/VendorInvoicesPage';
import { InspectionsPage } from '../features/maintenance/InspectionsPage';
import { NewInspectionPage } from '../features/maintenance/NewInspectionPage';
import { MaintenanceCalendarPage } from '../features/maintenance/MaintenanceCalendarPage';
import { MaintenanceReportsPage } from '../features/maintenance/MaintenanceReportsPage';
import { DocumentsPage } from '../features/documents/DocumentsPage';
import { DocsDashboardPage } from '../features/documents/DocsDashboardPage';
import { DocsAllPage } from '../features/documents/DocsAllPage';
import { DocsFoldersPage } from '../features/documents/DocsFoldersPage';
import { DocsUploadPage } from '../features/documents/DocsUploadPage';
import { DocsSignaturesPage } from '../features/documents/DocsSignaturesPage';
import { DocsSharedPage } from '../features/documents/DocsSharedPage';
import { DocsTemplatesPage } from '../features/documents/DocsTemplatesPage';
import { DocsVersionsPage } from '../features/documents/DocsVersionsPage';
import { DocsRequestsPage } from '../features/documents/DocsRequestsPage';
import { DocsPermissionsPage } from '../features/documents/DocsPermissionsPage';
import { DocsAuditPage } from '../features/documents/DocsAuditPage';
import { DocsArchivePage } from '../features/documents/DocsArchivePage';
import { DocsSettingsPage } from '../features/documents/DocsSettingsPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { ExecutiveDashboard } from '../features/reports/pages/ExecutiveDashboard';
import { DashboardBuilder } from '../features/reports/pages/DashboardBuilder';
import { RentRollReport as PropertyAnalyticsPage } from '../features/reports/pages/RentRollReport';
import { ProfitLossReport as FinancialAnalyticsPage } from '../features/reports/pages/ProfitLossReport';
import { DelinquencyReport as TenantAnalyticsPage } from '../features/reports/pages/DelinquencyReport';
import { OccupancyReport as LeasingAnalyticsPage } from '../features/reports/pages/OccupancyReport';
import { MaintenanceReport as MaintenanceAnalyticsPage } from '../features/reports/pages/MaintenanceReport';
import { OwnerAnalyticsPage } from '../features/reports/pages/OwnerAnalyticsPage';
import { DataExplorer } from '../features/reports/pages/DataExplorer';
import { CustomReports } from '../features/reports/pages/CustomReports';
import { PaymentHistoryReport as SavedReports } from '../features/reports/pages/PaymentHistoryReport';
import { ScheduledReports } from '../features/reports/pages/ScheduledReports';
import { ForecastingPage } from '../features/reports/pages/ForecastingPage';
import { ExportCenter } from '../features/reports/pages/ExportCenter';
import { AnalyticsSettingsPage } from '../features/reports/pages/AnalyticsSettingsPage';
import { CommunicationPage } from '../features/communication/CommunicationPage';
import { NotificationsPage } from '../features/notifications/NotificationsPage';
import { AIAssistantPage } from '../features/ai/AIAssistantPage';
import { AISettingsPage } from '../features/ai/AISettingsPage';
import { AdminDashboard } from '../features/admin/pages/AdminDashboard';
import { CompanySettingsPage } from '../features/admin/pages/CompanySettingsPage';
import { UnitDeletionPage } from '../features/admin/pages/UnitDeletionPage';
import { UsersPage } from '../features/admin/pages/UsersPage';
import { TeamsPage } from '../features/admin/pages/TeamsPage';
import { RolesPage } from '../features/admin/pages/RolesPage';
import { PropertiesSettingsPage } from '../features/admin/pages/PropertiesSettingsPage';
import { FinancialSettingsPage } from '../features/admin/pages/FinancialSettingsPage';
import { PaymentSettingsPage } from '../features/admin/pages/PaymentSettingsPage';
import { NotificationSettingsPage } from '../features/admin/pages/NotificationSettingsPage';
import { IntegrationsPage } from '../features/admin/pages/IntegrationsPage';
import { ApiManagementPage } from '../features/admin/pages/ApiManagementPage';
import { WebhooksPage } from '../features/admin/pages/WebhooksPage';
import { SecurityPage } from '../features/admin/pages/SecurityPage';
import { AuditLogsPage } from '../features/admin/pages/AuditLogsPage';
import { ActivityLogsPage } from '../features/admin/pages/ActivityLogsPage';
import { BillingPage } from '../features/admin/pages/BillingPage';
import { SystemPreferencesPage } from '../features/admin/pages/SystemPreferencesPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { OwnerLayout } from '../layouts/OwnerLayout';
import { OwnerDashboardPage } from '../features/owner/OwnerDashboardPage';
import { OwnerPropertiesPage } from '../features/owner/OwnerPropertiesPage';
import { OwnerFinancialsPage } from '../features/owner/OwnerFinancialsPage';
import { OwnerStatementsPage as OwnerStatementsPortalPage } from '../features/owner/OwnerStatementsPage';
import { OwnerDistributionsPage } from '../features/owner/OwnerDistributionsPage';
import { OwnerMaintenancePage } from '../features/owner/OwnerMaintenancePage';
import { OwnerDocumentsPage } from '../features/owner/OwnerDocumentsPage';
import { OwnerMessagesPage } from '../features/owner/OwnerMessagesPage';
import { OwnerReportsPage } from '../features/owner/OwnerReportsPage';
import { OwnerProfilePage } from '../features/owner/OwnerProfilePage';
import { OwnerSupportPage } from '../features/owner/OwnerSupportPage';
import { TenantLayout } from '../layouts/TenantLayout';
import { StaffLayout } from '../layouts/StaffLayout';
import { StaffMaintenancePage } from '../features/maintenance/StaffMaintenancePage';
import { StaffProfilePage } from '../features/maintenance/StaffProfilePage';
import { StaffTaskDetailsPage } from '../features/maintenance/StaffTaskDetailsPage';
import { TenantDashboardPage } from '../features/tenant/TenantDashboardPage';
import { TenantHomePage } from '../features/tenant/TenantHomePage';
import { TenantLeasePage } from '../features/tenant/TenantLeasePage';
import { TenantPaymentsPage } from '../features/tenant/TenantPaymentsPage';
import { TenantMaintenancePage } from '../features/tenant/TenantMaintenancePage';
import { TenantDocumentsPage } from '../features/tenant/TenantDocumentsPage';
import { TenantMessagesPage } from '../features/tenant/TenantMessagesPage';
import { TenantAnnouncementsPage } from '../features/tenant/TenantAnnouncementsPage';
import { TenantVisitorsPage } from '../features/tenant/TenantVisitorsPage';
import { TenantPackagesPage } from '../features/tenant/TenantPackagesPage';
import { TenantInsurancePage } from '../features/tenant/TenantInsurancePage';
import { TenantProfilePage } from '../features/tenant/TenantProfilePage';
import { TenantSettingsPage } from '../features/tenant/TenantSettingsPage';
import { TenantSupportPage } from '../features/tenant/TenantSupportPage';
import { TenantNotificationsPage } from '../features/tenant/TenantNotificationsPage';
import { UserProfilePage } from '../features/dashboard/UserProfilePage';
import { CommDashboardPage } from '../features/communication/CommDashboardPage';
import { CommInboxPage } from '../features/communication/CommInboxPage';
import { CommConversationsPage } from '../features/communication/CommConversationsPage';
import { CommEmailPage } from '../features/communication/CommEmailPage';
import { CommSMSPage } from '../features/communication/CommSMSPage';
import { CommAnnouncementsPage } from '../features/communication/CommAnnouncementsPage';
import { CommCampaignsPage } from '../features/communication/CommCampaignsPage';
import { CommTemplatesPage } from '../features/communication/CommTemplatesPage';
import { CommContactsPage } from '../features/communication/CommContactsPage';
import { CommNotificationsPage } from '../features/communication/CommNotificationsPage';
import { CommScheduledPage } from '../features/communication/CommScheduledPage';
import { CommActivityPage } from '../features/communication/CommActivityPage';
import { CommSettingsPage } from '../features/communication/CommSettingsPage';

// --- ROOT ROUTE ---
const rootRoute = createRootRoute({
  component: () => <Outlet />,
  errorComponent: ({ error }: { error?: any }) => (
    <div className="p-8 space-y-4 max-w-lg mx-auto text-center font-sans">
      <h2 className="text-xl font-bold text-rose-500">Route Error</h2>
      <p className="text-xs text-muted-foreground">{error?.message || 'An unexpected error occurred.'}</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg">Reload Page</button>
    </div>
  ),
});

// --- ACCESS DENIED PAGE ---
const AccessDeniedPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleHomeRedirect = () => {
    if (user?.role === 'Owner') {
      navigate({ to: '/owner' });
    } else if (user?.role === 'Tenant') {
      navigate({ to: '/tenant' });
    } else {
      navigate({ to: '/' });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-6 bg-card/45 backdrop-blur-xl rounded-2xl border border-border/60 max-w-lg mx-auto mt-20">
      <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/5">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Access Denied</h1>
        <p className="text-sm text-muted-foreground">
          You are logged in as a <span className="font-bold text-foreground">{user?.role}</span> and do not have permission to access this page.
        </p>
      </div>
      <Button onClick={handleHomeRedirect} className="font-bold bg-primary hover:bg-primary/90 text-white px-6">
        Go to my Dashboard
      </Button>
    </div>
  );
};

// --- PUBLIC/AUTH WRAPPER ---
const PublicWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthLayout>{children}</AuthLayout>;
};

// --- PROTECTED WRAPPER ---
const ProtectedWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: roles = [] } = useQuery({
    queryKey: ['rbac-roles-list'],
    queryFn: () => api.roles.getAll(),
    enabled: isAuthenticated && !!user,
  });

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/login' });
      return;
    }
    // Redirect Owner/Tenant/Staff from Root to their dashboards
    if (location.pathname === '/') {
      if (user?.role === 'Owner') {
        navigate({ to: '/owner' });
      } else if (user?.role === 'Tenant') {
        navigate({ to: '/tenant' });
      } else if (user?.role === 'Maintenance Staff') {
        navigate({ to: '/staff/dashboard' });
      }
    }
  }, [isAuthenticated, user, location.pathname, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const isOwnerPath = location.pathname === '/owner' || location.pathname.startsWith('/owner/');
  const isTenantPath = location.pathname === '/tenant' || location.pathname.startsWith('/tenant/');
  const isStaffPath = location.pathname === '/staff' || location.pathname.startsWith('/staff/');
  const isIntegrationsPath =
    location.pathname.startsWith('/admin/integrations') ||
    location.pathname.startsWith('/platform-integrations');

  // Role Access Guard
  let hasAccess = true;
  if (!isIntegrationsPath) {
    if (user?.role === 'Owner' && !isOwnerPath) {
      hasAccess = false;
    } else if (user?.role === 'Tenant' && !isTenantPath) {
      hasAccess = false;
    } else if (user?.role === 'Maintenance Staff' && !isStaffPath) {
      hasAccess = false;
    } else if (user?.role && user.role !== 'Super Admin' && user.role !== 'Property Manager') {
      // Map pathname to module permissions
      const getRequiredModule = (path: string): string => {
        if (path.startsWith('/properties') || path.startsWith('/buildings') || path.startsWith('/units')) return 'Properties';
        if (path.startsWith('/leasing')) return 'Leasing';
        if (path.startsWith('/tenants')) return 'Tenants';
        if (path.startsWith('/owners')) return 'Owners';
        if (path.startsWith('/rent') || path.startsWith('/payments') || path.startsWith('/invoices') || path.startsWith('/rent-ledger')) return 'Rent & Payments';
        if (path.startsWith('/accounting')) return 'Accounting';
        if (path.startsWith('/maintenance') || path.startsWith('/inspections') || path.startsWith('/vendors')) return 'Maintenance';
        if (path.startsWith('/reports')) return 'Reports';
        if (path.startsWith('/communication')) return 'Communication';
        if (path.startsWith('/admin') || path.startsWith('/platform-integrations')) return 'Company Settings';
        return '';
      };

      const reqModule = getRequiredModule(location.pathname);
      if (reqModule) {
        const matchingRole = roles.find((r: any) => r.name.toLowerCase() === user.role.toLowerCase());
        if (matchingRole) {
          const permRule = matchingRole.permissions.find((p: any) => p.module === reqModule);
          if (permRule && !permRule.view) {
            hasAccess = false;
          }
        }
      }
    }
  }

  if (!hasAccess) {
    return (
      <DashboardLayout
        currentPath={location.pathname}
        navigate={(path) => navigate({ to: path })}
      >
        <AccessDeniedPage />
      </DashboardLayout>
    );
  }

  if (isTenantPath) {
    return (
      <TenantLayout
        currentPath={location.pathname}
        navigate={(path) => navigate({ to: path })}
      >
        {children}
      </TenantLayout>
    );
  }

  if (isOwnerPath) {
    return (
      <OwnerLayout
        currentPath={location.pathname}
        navigate={(path) => navigate({ to: path })}
      >
        {children}
      </OwnerLayout>
    );
  }

  if (isStaffPath) {
    return (
      <StaffLayout
        currentPath={location.pathname}
        navigate={(path) => navigate({ to: path })}
      >
        {children}
      </StaffLayout>
    );
  }

  return (
    <DashboardLayout
      currentPath={location.pathname}
      navigate={(path) => navigate({ to: path })}
    >
      {children}
    </DashboardLayout>
  );
};

// --- ROUTE DEFINITIONS ---

// Auth Routes
const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/landing',
  component: () => {
    const navigate = useNavigate();
    return <LandingPage navigate={(path) => navigate({ to: path as any })} />;
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => {
    const navigate = useNavigate();
    return (
      <PublicWrapper>
        <LoginPage navigate={(path) => navigate({ to: path })} />
      </PublicWrapper>
    );
  },
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: () => {
    const navigate = useNavigate();
    return (
      <PublicWrapper>
        <ForgotPasswordPage navigate={(path) => navigate({ to: path })} />
      </PublicWrapper>
    );
  },
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: () => {
    const navigate = useNavigate();
    return (
      <PublicWrapper>
        <ResetPasswordPage navigate={(path) => navigate({ to: path })} />
      </PublicWrapper>
    );
  },
});

// Index Route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    const { user } = useAuthStore();
    return (
      <ProtectedWrapper>
        {user?.role === 'Super Admin' ? (
          <SuperAdminDashboardPage />
        ) : user?.role === 'Collection Manager' ? (
          <CollectionDashboardPage />
        ) : (
          <DashboardPage />
        )}
      </ProtectedWrapper>
    );
  },
});

// Profile Route
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: () => (
    <ProtectedWrapper>
      <UserProfilePage />
    </ProtectedWrapper>
  ),
});

// Properties Routes (Phase 2)
const propertiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/properties',
  component: () => (
    <ProtectedWrapper>
      <PropertiesPage />
    </ProtectedWrapper>
  ),
});

const newPropertyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/properties/new',
  component: () => (
    <ProtectedWrapper>
      <NewPropertyPage />
    </ProtectedWrapper>
  ),
});

const editPropertyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/properties/edit',
  component: () => (
    <ProtectedWrapper>
      <EditPropertyPage />
    </ProtectedWrapper>
  ),
});

const propertyDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/properties/$id',
  component: () => (
    <ProtectedWrapper>
      <PropertyDetailsPage />
    </ProtectedWrapper>
  ),
});

const draftPropertiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/properties/drafts',
  component: () => (
    <ProtectedWrapper>
      <DraftPropertiesPage />
    </ProtectedWrapper>
  ),
});

const buildingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/buildings',
  component: () => (
    <ProtectedWrapper>
      <BuildingsPage />
    </ProtectedWrapper>
  ),
});

const unitsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/units',
  component: () => (
    <ProtectedWrapper>
      <UnitsPage />
    </ProtectedWrapper>
  ),
});

const newUnitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/properties/units/new',
  component: () => (
    <ProtectedWrapper>
      <NewUnitPage />
    </ProtectedWrapper>
  ),
});

const unitDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/properties/units/$id',
  component: () => (
    <ProtectedWrapper>
      <UnitDetailsPage />
    </ProtectedWrapper>
  ),
});

const editUnitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/properties/units/$id/edit',
  component: () => (
    <ProtectedWrapper>
      <EditUnitPage />
    </ProtectedWrapper>
  ),
});

const editUnitAltRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/units/$id/edit',
  component: () => (
    <ProtectedWrapper>
      <EditUnitPage />
    </ProtectedWrapper>
  ),
});

// Tenants Routes (Phase 3)
const tenantsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenants',
  component: () => (
    <ProtectedWrapper>
      <TenantsPage />
    </ProtectedWrapper>
  ),
});

const activeTenantsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenants/active',
  component: () => (
    <ProtectedWrapper>
      <TenantsPage filterStatus="Active" />
    </ProtectedWrapper>
  ),
});

const formerTenantsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenants/former',
  component: () => (
    <ProtectedWrapper>
      <TenantsPage filterStatus="Inactive" />
    </ProtectedWrapper>
  ),
});

const portalPreviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenants/portal-preview',
  component: () => (
    <ProtectedWrapper>
      <PortalPreviewPage />
    </ProtectedWrapper>
  ),
});

const newTenantRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenants/new',
  component: () => (
    <ProtectedWrapper>
      <NewTenantPage />
    </ProtectedWrapper>
  ),
});

const editTenantRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenants/$id/edit',
  component: () => (
    <ProtectedWrapper>
      <EditTenantPage />
    </ProtectedWrapper>
  ),
});

const tenantDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenants/$id',
  component: () => (
    <ProtectedWrapper>
      <TenantDetailsPage />
    </ProtectedWrapper>
  ),
});

// Leases & Leasing Routes (Phase 3)
const leasesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leasing/leases',
  component: () => (
    <ProtectedWrapper>
      <LeasesPage />
    </ProtectedWrapper>
  ),
});

const newLeaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leases/new',
  component: () => (
    <ProtectedWrapper>
      <NewLeasePage />
    </ProtectedWrapper>
  ),
});

const leaseDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leases/$id',
  component: () => (
    <ProtectedWrapper>
      <LeaseDetailsPage />
    </ProtectedWrapper>
  ),
});

const renewalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leasing/renewals',
  component: () => (
    <ProtectedWrapper>
      <RenewalsPage />
    </ProtectedWrapper>
  ),
});

// Removed legacy moveInOutRoute to prevent routing overrides

const applicationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leasing/applications',
  component: () => (
    <ProtectedWrapper>
      <ApplicationsPage />
    </ProtectedWrapper>
  ),
});

const newApplicationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/applications/new',
  component: () => (
    <ProtectedWrapper>
      <NewApplicationPage />
    </ProtectedWrapper>
  ),
});

// CRM & Leads Routes (Phase 3)
const crmDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/crm',
  component: () => (
    <ProtectedWrapper>
      <CRMDashboardPage />
    </ProtectedWrapper>
  ),
});

const applicantScreeningWizardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/screening/$screeningId',
  component: () => (
    <ProtectedWrapper>
      <ApplicantScreeningWizard />
    </ProtectedWrapper>
  ),
});

const leadsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leasing/leads',
  component: () => (
    <ProtectedWrapper>
      <LeadsPage />
    </ProtectedWrapper>
  ),
});

const newLeadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leads/new',
  component: () => (
    <ProtectedWrapper>
      <NewLeadPage />
    </ProtectedWrapper>
  ),
});

const leadDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leads/$id',
  component: () => (
    <ProtectedWrapper>
      <LeadDetailsPage />
    </ProtectedWrapper>
  ),
});

// Rent Collection & Payments (Phase 4)
const rentDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rent',
  component: () => (
    <ProtectedWrapper>
      <RentDashboardPage />
    </ProtectedWrapper>
  ),
});

const paymentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/payments',
  component: () => (
    <ProtectedWrapper>
      <PaymentsPage />
    </ProtectedWrapper>
  ),
});

const newPaymentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/payments/new',
  component: () => (
    <ProtectedWrapper>
      <NewPaymentPage />
    </ProtectedWrapper>
  ),
});

const paymentDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/payments/$id',
  component: () => (
    <ProtectedWrapper>
      <PaymentDetailsPage />
    </ProtectedWrapper>
  ),
});

const rentLedgerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rent-ledger',
  component: () => (
    <ProtectedWrapper>
      <RentLedgerPage />
    </ProtectedWrapper>
  ),
});

const invoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invoices',
  component: () => (
    <ProtectedWrapper>
      <InvoicesPage />
    </ProtectedWrapper>
  ),
});

const newInvoiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invoices/new',
  component: () => (
    <ProtectedWrapper>
      <NewInvoicePage />
    </ProtectedWrapper>
  ),
});

const chargesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/charges',
  component: () => (
    <ProtectedWrapper>
      <ChargesPage />
    </ProtectedWrapper>
  ),
});

const depositsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/deposits',
  component: () => (
    <ProtectedWrapper>
      <DepositsPage />
    </ProtectedWrapper>
  ),
});

const paymentPlansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/payment-plans',
  component: () => (
    <ProtectedWrapper>
      <PaymentPlansPage />
    </ProtectedWrapper>
  ),
});

const newPaymentPlanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/payment-plans/new',
  component: () => (
    <ProtectedWrapper>
      <PaymentPlansPage />
    </ProtectedWrapper>
  ),
});

const refundsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/refunds',
  component: () => (
    <ProtectedWrapper>
      <RefundsPage />
    </ProtectedWrapper>
  ),
});

const paymentMethodsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/payment-methods',
  component: () => (
    <ProtectedWrapper>
      <PaymentMethodsPage />
    </ProtectedWrapper>
  ),
});

// Other Placeholders
const ownersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/owners',
  component: () => (
    <ProtectedWrapper>
      <OwnersPage />
    </ProtectedWrapper>
  ),
});

const accountingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting',
  component: () => (
    <ProtectedWrapper>
      <AccountingDashboardPage />
    </ProtectedWrapper>
  ),
});

const coaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting/chart-of-accounts',
  component: () => (
    <ProtectedWrapper>
      <ChartOfAccountsPage />
    </ProtectedWrapper>
  ),
});

const journalEntriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting/journal-entries',
  component: () => (
    <ProtectedWrapper>
      <JournalEntriesPage />
    </ProtectedWrapper>
  ),
});

const generalLedgerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting/general-ledger',
  component: () => (
    <ProtectedWrapper>
      <GeneralLedgerPage />
    </ProtectedWrapper>
  ),
});

const incomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting/income',
  component: () => (
    <ProtectedWrapper>
      <IncomePage />
    </ProtectedWrapper>
  ),
});

const expensesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting/expenses',
  component: () => (
    <ProtectedWrapper>
      <ExpensesPage />
    </ProtectedWrapper>
  ),
});

const vendorBillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting/vendor-bills',
  component: () => (
    <ProtectedWrapper>
      <VendorBillsPage />
    </ProtectedWrapper>
  ),
});

const recurringTransactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting/recurring',
  component: () => (
    <ProtectedWrapper>
      <RecurringTransactionsPage />
    </ProtectedWrapper>
  ),
});

const bankAccountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting/bank-accounts',
  component: () => (
    <ProtectedWrapper>
      <BankAccountsPage />
    </ProtectedWrapper>
  ),
});

const bankReconciliationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting/reconciliation',
  component: () => (
    <ProtectedWrapper>
      <BankReconciliationPage />
    </ProtectedWrapper>
  ),
});

const budgetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting/budgets',
  component: () => (
    <ProtectedWrapper>
      <BudgetsPage />
    </ProtectedWrapper>
  ),
});

const ownerStatementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting/owner-statements',
  component: () => (
    <ProtectedWrapper>
      <OwnerStatementsPage />
    </ProtectedWrapper>
  ),
});

const taxesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting/taxes',
  component: () => (
    <ProtectedWrapper>
      <TaxesPage />
    </ProtectedWrapper>
  ),
});

const financialReportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting/reports',
  component: () => (
    <ProtectedWrapper>
      <FinancialReportsPage />
    </ProtectedWrapper>
  ),
});

const yearEndRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting/year-end',
  component: () => (
    <ProtectedWrapper>
      <YearEndPage />
    </ProtectedWrapper>
  ),
});

const maintenanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/maintenance',
  component: () => (
    <ProtectedWrapper>
      <MaintenanceDashboardPage />
    </ProtectedWrapper>
  ),
});

const requestsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/maintenance/requests',
  component: () => (
    <ProtectedWrapper>
      <RequestsPage />
    </ProtectedWrapper>
  ),
});

const newRequestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/maintenance/requests/new',
  component: () => (
    <ProtectedWrapper>
      <NewRequestPage />
    </ProtectedWrapper>
  ),
});

const requestDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/maintenance/requests/$id',
  component: () => (
    <ProtectedWrapper>
      <RequestDetailsPage />
    </ProtectedWrapper>
  ),
});

const workOrdersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/maintenance/work-orders',
  component: () => (
    <ProtectedWrapper>
      <WorkOrdersPage />
    </ProtectedWrapper>
  ),
});

const workOrderDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/maintenance/work-orders/$id',
  component: () => (
    <ProtectedWrapper>
      <WorkOrderDetailsPage />
    </ProtectedWrapper>
  ),
});

const violationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/maintenance/violations',
  component: () => (
    <ProtectedWrapper>
      <ViolationsPage />
    </ProtectedWrapper>
  ),
});

const preventiveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/maintenance/preventive',
  component: () => (
    <ProtectedWrapper>
      <PreventivePage />
    </ProtectedWrapper>
  ),
});

const assetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/maintenance/assets',
  component: () => (
    <ProtectedWrapper>
      <AssetsPage />
    </ProtectedWrapper>
  ),
});

const inventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/maintenance/inventory',
  component: () => (
    <ProtectedWrapper>
      <InventoryPage />
    </ProtectedWrapper>
  ),
});

const vendorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/vendors',
  component: () => (
    <ProtectedWrapper>
      <VendorsPage />
    </ProtectedWrapper>
  ),
});

const vendorInvoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/vendors/invoices',
  component: () => (
    <ProtectedWrapper>
      <VendorInvoicesPage />
    </ProtectedWrapper>
  ),
});

const inspectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inspections',
  component: () => (
    <ProtectedWrapper>
      <InspectionsPage />
    </ProtectedWrapper>
  ),
});

const newInspectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inspections/new',
  component: () => (
    <ProtectedWrapper>
      <NewInspectionPage />
    </ProtectedWrapper>
  ),
});

const maintenanceCalendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/maintenance/calendar',
  component: () => (
    <ProtectedWrapper>
      <MaintenanceCalendarPage />
    </ProtectedWrapper>
  ),
});

const maintenanceReportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/maintenance/reports',
  component: () => (
    <ProtectedWrapper>
      <MaintenanceReportsPage />
    </ProtectedWrapper>
  ),
});

const documentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/documents',
  component: () => (<ProtectedWrapper><DocsDashboardPage /></ProtectedWrapper>),
});
const docsAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/documents/all',
  component: () => (<ProtectedWrapper><DocsAllPage /></ProtectedWrapper>),
});
const docsFoldersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/documents/folders',
  component: () => (<ProtectedWrapper><DocsFoldersPage /></ProtectedWrapper>),
});
const docsUploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/documents/upload',
  component: () => (<ProtectedWrapper><DocsUploadPage /></ProtectedWrapper>),
});
const docsSignaturesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/documents/signatures',
  component: () => (<ProtectedWrapper><DocsSignaturesPage /></ProtectedWrapper>),
});
const docsSharedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/documents/shared',
  component: () => (<ProtectedWrapper><DocsSharedPage /></ProtectedWrapper>),
});
const docsTemplatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/documents/templates',
  component: () => (<ProtectedWrapper><DocsTemplatesPage /></ProtectedWrapper>),
});
const docsVersionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/documents/versions',
  component: () => (<ProtectedWrapper><DocsVersionsPage /></ProtectedWrapper>),
});
const docsRequestsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/documents/requests',
  component: () => (<ProtectedWrapper><DocsRequestsPage /></ProtectedWrapper>),
});
const docsPermissionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/documents/permissions',
  component: () => (<ProtectedWrapper><DocsPermissionsPage /></ProtectedWrapper>),
});
const docsAuditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/documents/audit',
  component: () => (<ProtectedWrapper><DocsAuditPage /></ProtectedWrapper>),
});
const docsArchiveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/documents/archive',
  component: () => (<ProtectedWrapper><DocsArchivePage /></ProtectedWrapper>),
});
const docsSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/documents/settings',
  component: () => (<ProtectedWrapper><DocsSettingsPage /></ProtectedWrapper>),
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: () => (
    <ProtectedWrapper>
      <ReportsPage />
    </ProtectedWrapper>
  ),
});

const reportsExecutiveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/executive',
  component: () => (<ProtectedWrapper><ExecutiveDashboard /></ProtectedWrapper>),
});
const reportsDashboardsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/dashboards',
  component: () => (<ProtectedWrapper><DashboardBuilder /></ProtectedWrapper>),
});
const reportsPropertiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/properties',
  component: () => (<ProtectedWrapper><PropertyAnalyticsPage /></ProtectedWrapper>),
});
const reportsFinancialRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/financial',
  component: () => (<ProtectedWrapper><FinancialAnalyticsPage /></ProtectedWrapper>),
});
const reportsTenantsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/tenants',
  component: () => (<ProtectedWrapper><TenantAnalyticsPage /></ProtectedWrapper>),
});
const reportsLeasingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/leasing',
  component: () => (<ProtectedWrapper><LeasingAnalyticsPage /></ProtectedWrapper>),
});
const reportsMaintenanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/maintenance',
  component: () => (<ProtectedWrapper><MaintenanceAnalyticsPage /></ProtectedWrapper>),
});
const reportsOwnersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/owners',
  component: () => (<ProtectedWrapper><OwnerAnalyticsPage /></ProtectedWrapper>),
});
const reportsExplorerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/explorer',
  component: () => (<ProtectedWrapper><DataExplorer /></ProtectedWrapper>),
});
const reportsCustomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/custom',
  component: () => (<ProtectedWrapper><CustomReports /></ProtectedWrapper>),
});
const reportsSavedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/saved',
  component: () => (<ProtectedWrapper><SavedReports /></ProtectedWrapper>),
});
const reportsScheduledRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/scheduled',
  component: () => (<ProtectedWrapper><ScheduledReports /></ProtectedWrapper>),
});
const reportsForecastRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/forecast',
  component: () => (<ProtectedWrapper><ForecastingPage /></ProtectedWrapper>),
});
const reportsExportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/exports',
  component: () => (<ProtectedWrapper><ExportCenter /></ProtectedWrapper>),
});
const reportsSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/settings',
  component: () => (<ProtectedWrapper><AnalyticsSettingsPage /></ProtectedWrapper>),
});

// --- OWNER PORTAL ROUTES ---
const ownerDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/owner',
  component: () => (
    <ProtectedWrapper>
      <OwnerDashboardPage />
    </ProtectedWrapper>
  ),
});

const ownerPropertiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/owner/properties',
  component: () => (
    <ProtectedWrapper>
      <OwnerPropertiesPage />
    </ProtectedWrapper>
  ),
});

const ownerFinancialsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/owner/financials',
  component: () => (
    <ProtectedWrapper>
      <OwnerFinancialsPage />
    </ProtectedWrapper>
  ),
});

const ownerPortalStatementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/owner/statements',
  component: () => (
    <ProtectedWrapper>
      <OwnerStatementsPortalPage />
    </ProtectedWrapper>
  ),
});

const ownerDistributionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/owner/distributions',
  component: () => (
    <ProtectedWrapper>
      <OwnerDistributionsPage />
    </ProtectedWrapper>
  ),
});

const ownerMaintenanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/owner/maintenance',
  component: () => (
    <ProtectedWrapper>
      <OwnerMaintenancePage />
    </ProtectedWrapper>
  ),
});

const ownerDocumentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/owner/documents',
  component: () => (
    <ProtectedWrapper>
      <OwnerDocumentsPage />
    </ProtectedWrapper>
  ),
});

const ownerMessagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/owner/messages',
  component: () => (
    <ProtectedWrapper>
      <OwnerMessagesPage />
    </ProtectedWrapper>
  ),
});

const ownerReportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/owner/reports',
  component: () => (
    <ProtectedWrapper>
      <OwnerReportsPage />
    </ProtectedWrapper>
  ),
});

const ownerProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/owner/profile',
  component: () => (
    <ProtectedWrapper>
      <OwnerProfilePage />
    </ProtectedWrapper>
  ),
});

const ownerSupportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/owner/support',
  component: () => (
    <ProtectedWrapper>
      <OwnerSupportPage />
    </ProtectedWrapper>
  ),
});

// --- TENANT PORTAL ROUTES ---
const tenantDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant',
  component: () => (
    <ProtectedWrapper>
      <TenantDashboardPage />
    </ProtectedWrapper>
  ),
});

const tenantHomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/home',
  component: () => (
    <ProtectedWrapper>
      <TenantHomePage />
    </ProtectedWrapper>
  ),
});

const tenantLeaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/lease',
  component: () => (
    <ProtectedWrapper>
      <TenantLeasePage />
    </ProtectedWrapper>
  ),
});

const tenantPaymentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/payments',
  component: () => (
    <ProtectedWrapper>
      <TenantPaymentsPage />
    </ProtectedWrapper>
  ),
});

const tenantMaintenanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/maintenance',
  component: () => (
    <ProtectedWrapper>
      <TenantMaintenancePage />
    </ProtectedWrapper>
  ),
});

const staffDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/staff/dashboard',
  component: () => (
    <ProtectedWrapper>
      <MaintenanceDashboardPage />
    </ProtectedWrapper>
  ),
});

const staffTasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/staff/tasks',
  component: () => (
    <ProtectedWrapper>
      <StaffMaintenancePage />
    </ProtectedWrapper>
  ),
});

const staffCompletedTasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/staff/completed',
  component: () => (
    <ProtectedWrapper>
      <StaffMaintenancePage />
    </ProtectedWrapper>
  ),
});

const staffProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/staff/profile',
  component: () => (
    <ProtectedWrapper>
      <StaffProfilePage />
    </ProtectedWrapper>
  ),
});

const staffTaskDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/staff/tasks/$id',
  component: () => (
    <ProtectedWrapper>
      <StaffTaskDetailsPage />
    </ProtectedWrapper>
  ),
});

const staffMaintenanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/staff/maintenance',
  component: () => (
    <ProtectedWrapper>
      <StaffMaintenancePage />
    </ProtectedWrapper>
  ),
});

const tenantDocumentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/documents',
  component: () => (
    <ProtectedWrapper>
      <TenantDocumentsPage />
    </ProtectedWrapper>
  ),
});

const tenantMessagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/messages',
  component: () => (
    <ProtectedWrapper>
      <TenantMessagesPage />
    </ProtectedWrapper>
  ),
});

const tenantAnnouncementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/announcements',
  component: () => (
    <ProtectedWrapper>
      <TenantAnnouncementsPage />
    </ProtectedWrapper>
  ),
});

const tenantVisitorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/visitors',
  component: () => (
    <ProtectedWrapper>
      <TenantVisitorsPage />
    </ProtectedWrapper>
  ),
});

const tenantPackagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/packages',
  component: () => (
    <ProtectedWrapper>
      <TenantPackagesPage />
    </ProtectedWrapper>
  ),
});

const tenantInsuranceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/insurance',
  component: () => (
    <ProtectedWrapper>
      <TenantInsurancePage />
    </ProtectedWrapper>
  ),
});

const tenantProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/profile',
  component: () => (
    <ProtectedWrapper>
      <TenantProfilePage />
    </ProtectedWrapper>
  ),
});

const tenantSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/settings',
  component: () => (
    <ProtectedWrapper>
      <TenantSettingsPage />
    </ProtectedWrapper>
  ),
});

const tenantSupportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/support',
  component: () => (
    <ProtectedWrapper>
      <TenantSupportPage />
    </ProtectedWrapper>
  ),
});

const tenantNotificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/notifications',
  component: () => (
    <ProtectedWrapper>
      <TenantNotificationsPage />
    </ProtectedWrapper>
  ),
});

const tenantPaymentsHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenant/payments/history',
  component: () => (
    <ProtectedWrapper>
      <TenantPaymentsPage />
    </ProtectedWrapper>
  ),
});

const commDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/communication',
  component: () => (
    <ProtectedWrapper>
      <CommDashboardPage />
    </ProtectedWrapper>
  ),
});

const commInboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/communication/inbox',
  component: () => (
    <ProtectedWrapper>
      <CommInboxPage />
    </ProtectedWrapper>
  ),
});

const commConversationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/communication/conversations',
  component: () => (
    <ProtectedWrapper>
      <CommConversationsPage />
    </ProtectedWrapper>
  ),
});

const commEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/communication/email',
  component: () => (
    <ProtectedWrapper>
      <CommEmailPage />
    </ProtectedWrapper>
  ),
});

const commSMSRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/communication/sms',
  component: () => (
    <ProtectedWrapper>
      <CommSMSPage />
    </ProtectedWrapper>
  ),
});

const commAnnouncementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/communication/announcements',
  component: () => (
    <ProtectedWrapper>
      <CommAnnouncementsPage />
    </ProtectedWrapper>
  ),
});

const commCampaignsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/communication/campaigns',
  component: () => (
    <ProtectedWrapper>
      <CommCampaignsPage />
    </ProtectedWrapper>
  ),
});

const commTemplatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/communication/templates',
  component: () => (
    <ProtectedWrapper>
      <CommTemplatesPage />
    </ProtectedWrapper>
  ),
});

const commContactsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/communication/contacts',
  component: () => (
    <ProtectedWrapper>
      <CommContactsPage />
    </ProtectedWrapper>
  ),
});

const commNotificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/communication/notifications',
  component: () => (
    <ProtectedWrapper>
      <CommNotificationsPage />
    </ProtectedWrapper>
  ),
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notifications',
  component: () => (
    <ProtectedWrapper>
      <NotificationsPage />
    </ProtectedWrapper>
  ),
});

const commScheduledRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/communication/scheduled',
  component: () => (
    <ProtectedWrapper>
      <CommScheduledPage />
    </ProtectedWrapper>
  ),
});

const commActivityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/communication/activity',
  component: () => (
    <ProtectedWrapper>
      <CommActivityPage />
    </ProtectedWrapper>
  ),
});

const commSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/communication/settings',
  component: () => (
    <ProtectedWrapper>
      <CommSettingsPage />
    </ProtectedWrapper>
  ),
});

const aiAssistantRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ai/assistant',
  component: () => (<ProtectedWrapper><AIAssistantPage /></ProtectedWrapper>),
});
const aiSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ai/settings',
  component: () => (<ProtectedWrapper><AISettingsPage /></ProtectedWrapper>),
});
const adminDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: () => (<ProtectedWrapper><AdminDashboard /></ProtectedWrapper>),
});
const adminCompanySettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/company-settings',
  component: () => (<ProtectedWrapper><CompanySettingsPage /></ProtectedWrapper>),
});
const adminUnitDeletionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/unit-deletion',
  component: () => (<ProtectedWrapper><UnitDeletionPage /></ProtectedWrapper>),
});
const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/users',
  component: () => (<ProtectedWrapper><UsersPage /></ProtectedWrapper>),
});
const adminTeamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/teams',
  component: () => (<ProtectedWrapper><TeamsPage /></ProtectedWrapper>),
});

const AccessTemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 text-foreground">
      <PageHeader
        title={t('accessTemplatesPage.title', 'Access Templates')}
        description={t('accessTemplatesPage.desc', 'Bootstrap your organizational permissions with pre-configured access templates.')}
        breadcrumbs={[{ label: t('nav.home', 'Home'), href: '/' }, { label: t('nav.platformSettings', 'Administration') }, { label: t('accessTemplatesPage.breadcrumb', 'Templates') }]}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-3">
          <h3 className="font-extrabold text-sm text-primary">{t('accessTemplatesPage.staffTitle', 'Standard Staff Access')}</h3>
          <p className="text-xs text-muted-foreground font-semibold">{t('accessTemplatesPage.staffDesc', 'Standard settings for front desk staff. Grants view-only rights to tenants and properties.')}</p>
          <span className="inline-block px-2 py-0.5 bg-secondary text-[10px] font-extrabold rounded">6 {t('accessTemplatesPage.modulesEnabled', 'Modules Enabled')}</span>
        </div>
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-3">
          <h3 className="font-extrabold text-sm text-primary">{t('accessTemplatesPage.financialTitle', 'Full Financial Access')}</h3>
          <p className="text-xs text-muted-foreground font-semibold">{t('accessTemplatesPage.financialDesc', 'Tailored for external accountants. Enables comprehensive access to accounting and payments.')}</p>
          <span className="inline-block px-2 py-0.5 bg-secondary text-[10px] font-extrabold rounded">3 {t('accessTemplatesPage.modulesEnabled', 'Modules Enabled')}</span>
        </div>
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-3">
          <h3 className="font-extrabold text-sm text-primary">{t('accessTemplatesPage.vendorTitle', 'Maintenance Vendor Access')}</h3>
          <p className="text-xs text-muted-foreground font-semibold">{t('accessTemplatesPage.vendorDesc', 'Minimal access scope. Grants technicians rights to view and update work orders only.')}</p>
          <span className="inline-block px-2 py-0.5 bg-secondary text-[10px] font-extrabold rounded">1 {t('accessTemplatesPage.moduleEnabled', 'Module Enabled')}</span>
        </div>
      </div>
    </div>
  );
};

const adminTemplatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/templates',
  component: () => (<ProtectedWrapper><AccessTemplatesPage /></ProtectedWrapper>),
});

const adminRolesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/roles',
  component: () => (<ProtectedWrapper><RolesPage /></ProtectedWrapper>),
});
const adminPropertiesSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/properties-settings',
  component: () => (<ProtectedWrapper><PropertiesSettingsPage /></ProtectedWrapper>),
});
const adminFinancialRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/financial',
  component: () => (<ProtectedWrapper><FinancialSettingsPage /></ProtectedWrapper>),
});
const adminPaymentSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/payment-settings',
  component: () => (<ProtectedWrapper><PaymentSettingsPage /></ProtectedWrapper>),
});
const adminNotificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/notifications',
  component: () => (<ProtectedWrapper><NotificationSettingsPage /></ProtectedWrapper>),
});
const adminIntegrationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/integrations',
  component: () => (<ProtectedWrapper><IntegrationsPage /></ProtectedWrapper>),
});
const adminApiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/api',
  component: () => (<ProtectedWrapper><ApiManagementPage /></ProtectedWrapper>),
});
const adminWebhooksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/webhooks',
  component: () => (<ProtectedWrapper><WebhooksPage /></ProtectedWrapper>),
});
const adminSecurityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/security',
  component: () => (<ProtectedWrapper><SecurityPage /></ProtectedWrapper>),
});
const adminAuditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/audit',
  component: () => (<ProtectedWrapper><AuditLogsPage /></ProtectedWrapper>),
});
const adminActivityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/activity',
  component: () => (<ProtectedWrapper><ActivityLogsPage /></ProtectedWrapper>),
});
const adminBillingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/billing',
  component: () => (<ProtectedWrapper><BillingPage /></ProtectedWrapper>),
});
const adminPreferencesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/preferences',
  component: () => (<ProtectedWrapper><SystemPreferencesPage /></ProtectedWrapper>),
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: () => (
    <ProtectedWrapper>
      <SettingsPage />
    </ProtectedWrapper>
  ),
});

// ============================================================================
// ==================== NEW SAAS & OPERATIONS COMPONENTS ======================
// ============================================================================

// 1. COMPANIES PAGE
const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [companies, setCompanies] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [deleteCompanyId, setDeleteCompanyId] = React.useState<string | null>(null);

  const fetchCompanies = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.companies.getAll();
      setCompanies(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.companies.update(id, { status: newStatus });
      fetchCompanies();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteCompanyId(id);
  };

  const confirmDeleteCompany = async () => {
    if (deleteCompanyId) {
      try {
        await api.companies.delete(deleteCompanyId);
        fetchCompanies();
      } catch (e) {
        console.error(e);
      }
      setDeleteCompanyId(null);
    }
  };

  const filteredCompanies = companies.filter((c: any) =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.contact || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('companiesPage.title')}
        description={t('companiesPage.desc')}
        breadcrumbs={[{ label: t('companiesPage.home'), href: '/' }, { label: t('companiesPage.companies') }]}
        action={{
          label: t('companiesPage.createCompany'),
          onClick: () => navigate({ to: '/companies/new' }),
          icon: <Plus className="w-4 h-4" />
        }}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b flex justify-between items-center bg-card/65 backdrop-blur">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('companiesPage.searchPlaceholder')}
              className="pl-9 pr-4 py-2 w-full text-xs font-semibold rounded-lg bg-secondary border focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-xs text-muted-foreground">Loading companies from database...</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-4">{t('companiesPage.companyDetails')}</th>
                  <th className="p-4">{t('companiesPage.code')}</th>
                  <th className="p-4">{t('companiesPage.contact')}</th>
                  <th className="p-4">{t('companiesPage.planAndCycle')}</th>
                  <th className="p-4">{t('companiesPage.status')}</th>
                  <th className="p-4">{t('companiesPage.createdDate')}</th>
                  <th className="p-4 text-right">{t('companiesPage.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-foreground">
                {filteredCompanies.map((c: any) => (
                  <tr key={c.id} className="hover:bg-accent/40 transition">
                    <td className="p-4">
                      <div
                        className="font-extrabold text-sm text-primary cursor-pointer hover:underline"
                        onClick={() => navigate({ to: '/companies/details', search: { id: c.id } as any })}
                      >
                        {c.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-semibold">{c.businessName}</div>
                    </td>
                    <td className="p-4 font-mono font-bold text-foreground/80">{c.code}</td>
                    <td className="p-4">
                      <div>{c.contact}</div>
                      <div className="text-[10px] text-muted-foreground font-semibold">{c.email} • {c.phone}</div>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={c.plan} />
                      <div className="text-[10px] text-muted-foreground font-semibold mt-1">{c.cycle} {t('companiesPage.billing')}</div>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="p-4 text-muted-foreground font-mono">{c.date}</td>
                    <td className="p-4 text-right space-x-1 whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/companies/details', search: { id: c.id } as any })}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/companies/edit', search: { id: c.id } as any })} className="text-blue-500 hover:text-blue-600">
                        <Edit className="w-4 h-4" />
                      </Button>
                      {c.status === 'Active' ? (
                        <Button variant="ghost" size="icon" onClick={() => handleStatusChange(c.id, 'Suspended')} className="text-rose-500 hover:text-rose-600">
                          <Ban className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => handleStatusChange(c.id, 'Active')} className="text-emerald-500 hover:text-emerald-600">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="text-rose-600 hover:text-rose-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={deleteCompanyId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCompanyId(null);
        }}
        title="Delete Company"
        description="Are you sure you want to delete this company? This action cannot be undone."
        onConfirm={confirmDeleteCompany}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};

// 2. CREATE COMPANY FORM
const NewCompanyPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [success, setSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [plans, setPlans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    api.plans.getAll().then(setPlans).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    const target = e.currentTarget;
    const name = (target.elements.namedItem('companyName') as HTMLInputElement).value;
    const code = (target.elements.namedItem('companyCode') as HTMLInputElement).value;
    const contact = (target.elements.namedItem('contactPerson') as HTMLInputElement).value;
    const email = (target.elements.namedItem('email') as HTMLInputElement).value;
    const phone = (target.elements.namedItem('phone') as HTMLInputElement).value;
    const plan = (target.elements.namedItem('plan') as HTMLSelectElement).value;
    const password = (target.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const company = await api.companies.create({
        name,
        code: code.toUpperCase(),
        contactName: contact,
        email,
        phone,
        planName: plan,
        password,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate({ to: '/companies' });
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to create company. Please check code or email uniqueness.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={t('newCompanyPage.title')}
        description={t('newCompanyPage.desc')}
        breadcrumbs={[{ label: t('newCompanyPage.home'), href: '/' }, { label: t('newCompanyPage.companies'), href: '/companies' }, { label: t('newCompanyPage.new') }]}
      />
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 p-4 rounded-xl text-xs font-semibold text-center">
          {t('newCompanyPage.successMsg')}
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl text-xs font-semibold text-center">
          {errorMsg}
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">{t('newCompanyPage.companyName')}</label>
            <input name="companyName" required placeholder="Apex Property Management" className="w-full text-xs font-semibold p-2.5 rounded-lg border bg-secondary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">{t('newCompanyPage.businessName')}</label>
            <input name="businessName" placeholder="Apex PM LLC" className="w-full text-xs font-semibold p-2.5 rounded-lg border bg-secondary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">{t('newCompanyPage.companyCode')}</label>
            <input name="companyCode" required maxLength={5} placeholder="APEX" className="w-full text-xs font-semibold p-2.5 rounded-lg border bg-secondary uppercase focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">{t('newCompanyPage.contactPerson')}</label>
            <input name="contactPerson" required placeholder="Sarah Davis" className="w-full text-xs font-semibold p-2.5 rounded-lg border bg-secondary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">{t('newCompanyPage.emailAddress')}</label>
            <input name="email" required type="email" placeholder="sarah@apexpm.com" className="w-full text-xs font-semibold p-2.5 rounded-lg border bg-secondary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">Password</label>
            <Input name="password" required type="password" placeholder="••••••••" className="w-full text-xs font-semibold h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">{t('newCompanyPage.phoneNumber')}</label>
            <input name="phone" placeholder="555-0199" className="w-full text-xs font-semibold p-2.5 rounded-lg border bg-secondary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">{t('newCompanyPage.subscriptionPlan')}</label>
            <select name="plan" className="w-full text-xs font-semibold p-2.5 rounded-lg border bg-secondary focus:ring-1 focus:ring-primary focus:outline-none">
              {plans.length > 0 ? (
                plans.map((p: any) => (
                  <option key={p.id} value={p.name}>{p.name} (${p.price}/mo)</option>
                ))
              ) : (
                <>
                  <option value="Pro Plan">Pro Plan</option>
                  <option value="Starter Plan">Starter Plan</option>
                  <option value="Enterprise SaaS">Enterprise SaaS</option>
                </>
              )}
            </select>
          </div>
        </div>
        <div className="border-t pt-4 flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/companies' })}>{t('newCompanyPage.cancel')}</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Creating...' : t('newCompanyPage.createCompany')}</Button>
        </div>
      </form>
    </div>
  );
};

// 2b. EDIT COMPANY FORM
const EditCompanyPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [success, setSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [plans, setPlans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(true);
  const [company, setCompany] = React.useState<any>(null);

  const [name, setName] = React.useState('');
  const [businessName, setBusinessName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [contact, setContact] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [plan, setPlan] = React.useState('');

  const searchParams = new URLSearchParams(window.location.search);
  const companyId = searchParams.get('id') || '';

  React.useEffect(() => {
    api.plans.getAll().then(setPlans).catch(console.error);
    if (companyId) {
      api.companies.getById(companyId)
        .then((data) => {
          if (data) {
            setCompany(data);
            setName(data.name || '');
            setBusinessName(data.businessName || '');
            setCode(data.code || '');
            setContact(data.contact || '');
            setEmail(data.email || '');
            setPhone(data.phone || '');
            setPlan(data.plan || '');
          }
        })
        .catch(console.error)
        .finally(() => setFetching(false));
    } else {
      setFetching(false);
    }
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await api.companies.update(companyId, {
        name,
        code: code.toUpperCase(),
        contactName: contact,
        email,
        phone,
        planName: plan,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate({ to: '/companies' });
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update company. Please check code or email uniqueness.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-6 text-xs text-muted-foreground font-semibold">Loading company details...</div>;
  }

  if (!company) {
    return <div className="p-6 text-xs text-muted-foreground font-semibold">Company not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Edit Company"
        description="Update company information, subscription plan, and settings."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Companies', href: '/companies' }, { label: 'Edit' }]}
      />
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 p-4 rounded-xl text-xs font-semibold text-center animate-pulse">
          Company updated successfully!
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl text-xs font-semibold text-center">
          {errorMsg}
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">{t('newCompanyPage.companyName')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Apex Property Management" className="w-full text-xs font-semibold p-2.5 rounded-lg border bg-secondary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">{t('newCompanyPage.businessName')}</label>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Apex PM LLC" className="w-full text-xs font-semibold p-2.5 rounded-lg border bg-secondary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">{t('newCompanyPage.companyCode')}</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} required maxLength={5} placeholder="APEX" className="w-full text-xs font-semibold p-2.5 rounded-lg border bg-secondary uppercase focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">{t('newCompanyPage.contactPerson')}</label>
            <input value={contact} onChange={(e) => setContact(e.target.value)} required placeholder="Sarah Davis" className="w-full text-xs font-semibold p-2.5 rounded-lg border bg-secondary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">{t('newCompanyPage.emailAddress')}</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="sarah@apexpm.com" className="w-full text-xs font-semibold p-2.5 rounded-lg border bg-secondary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">{t('newCompanyPage.phoneNumber')}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555-0199" className="w-full text-xs font-semibold p-2.5 rounded-lg border bg-secondary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-muted-foreground">{t('newCompanyPage.subscriptionPlan')}</label>
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full text-xs font-semibold p-2.5 rounded-lg border bg-secondary focus:ring-1 focus:ring-primary focus:outline-none">
              {plans.length > 0 ? (
                plans.map((p: any) => (
                  <option key={p.id} value={p.name}>{p.name} (${p.price}/mo)</option>
                ))
              ) : (
                <>
                  <option value="Pro Plan">Pro Plan</option>
                  <option value="Starter Plan">Starter Plan</option>
                  <option value="Enterprise SaaS">Enterprise SaaS</option>
                </>
              )}
            </select>
          </div>
        </div>
        <div className="border-t pt-4 flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/companies' })}>{t('newCompanyPage.cancel')}</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </form>
    </div>
  );
};

// 3. COMPANY DETAILS / METRICS & USAGE
const CompanyDetailsPage: React.FC = () => {
  const { t } = useTranslation();
  const [company, setCompany] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const searchParams = new URLSearchParams(window.location.search);
        const id = searchParams.get('id');
        if (id) {
          const detail = await api.companies.getById(id);
          if (detail) {
            setCompany(detail);
            return;
          }
        }
        const list = await api.companies.getAll();
        if (list && list.length > 0) {
          setCompany(list[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, []);

  if (loading) {
    return <div className="p-6 text-xs text-muted-foreground">Loading company details from database...</div>;
  }

  if (!company) {
    return <div className="p-6 text-xs text-muted-foreground">No company details found in database.</div>;
  }

  const c = company;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('companyViews.profileTitle')}
        description={t('companyViews.profileDesc')}
        breadcrumbs={[{ label: t('nav.home'), href: '/' }, { label: t('nav.companies'), href: '/companies' }, { label: t('companyViews.detailsBreadcrumb') }]}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4 lg:col-span-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">{t('companyViews.opsInfo')}</h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground font-semibold">{t('companyViews.companyName')}</span>
              <p className="font-bold text-sm">{c.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold">{t('companyViews.legalEntity')}</span>
              <p className="font-bold text-sm">{c.businessName || `${c.name} Inc`}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold">{t('companyViews.contactEmail')}</span>
              <p className="font-bold text-sm">{c.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold">{t('companyViews.phone')}</span>
              <p className="font-bold text-sm">{c.phone}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold">{t('companyViews.dateRegistered')}</span>
              <p className="font-bold text-sm font-mono">{c.date}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">{t('companyViews.subAndLimits')}</h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-semibold">{t('companyViews.activePlan')}</span>
              <StatusBadge status={c.plan} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-semibold">{t('companyViews.billingPeriod')}</span>
              <span className="font-bold">{c.cycle || 'Monthly'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-semibold">{t('companyViews.storageCapacity')}</span>
              <span className="font-bold">{c.storage || '1.2 GB'} / 50 GB Used</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: '2.4%' }} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-semibold">{t('companyViews.userSeats')}</span>
              <span className="font-bold">{c.usersCount || c.users?.length || 1} / 25 Registered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3a. COMPANY USERS LIST
const CompanyUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await api.companyUsers.getAll();
        setUsers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('companyViews.usersTitle')}
        description={t('companyViews.usersDesc')}
        breadcrumbs={[{ label: t('nav.home'), href: '/' }, { label: t('nav.companies'), href: '/companies' }, { label: t('companyViews.usersBreadcrumb') }]}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 text-xs text-muted-foreground">Loading company users from database...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-4">{t('companyViews.usersTable.userName')}</th>
                  <th className="p-4">{t('companyViews.usersTable.email')}</th>
                  <th className="p-4">{t('companyViews.usersTable.company')}</th>
                  <th className="p-4">{t('companyViews.usersTable.role')}</th>
                  <th className="p-4">{t('companyViews.usersTable.status')}</th>
                  <th className="p-4">{t('companyViews.usersTable.lastActivity')}</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-foreground">
                {users.map((u, i) => (
                  <tr key={u.id || i} className="hover:bg-accent/40 transition">
                    <td className="p-4 font-bold">{u.name}</td>
                    <td className="p-4 font-mono">{u.email}</td>
                    <td className="p-4 text-primary font-bold">{u.companyName}</td>
                    <td className="p-4"><StatusBadge status={u.role} /></td>
                    <td className="p-4"><StatusBadge status={u.status} /></td>
                    <td className="p-4 text-muted-foreground font-mono">{u.date || '2026-07-20'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// 3b. COMPANY SUBSCRIPTION DETAILS
const CompanySubscriptionPage: React.FC = () => {
  const { t } = useTranslation();
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [plans, setPlans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [invs, plns] = await Promise.all([
          api.saasInvoices.getAll(),
          api.plans.getAll(),
        ]);
        setInvoices(invs);
        setPlans(plns);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('companyViews.subTitle')}
        description={t('companyViews.subDesc')}
        breadcrumbs={[{ label: t('nav.home'), href: '/' }, { label: t('nav.companies'), href: '/companies' }, { label: t('companyViews.subBreadcrumb') }]}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4 lg:col-span-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">{t('companyViews.invoiceHistory')}</h2>
          {loading ? (
            <div className="p-4 text-xs text-muted-foreground">Loading invoices from database...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="p-4">{t('companyViews.subTable.invoiceId')}</th>
                    <th className="p-4">Company</th>
                    <th className="p-4">{t('companyViews.subTable.billingDate')}</th>
                    <th className="p-4">{t('companyViews.subTable.amount')}</th>
                    <th className="p-4">{t('companyViews.subTable.paymentStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium text-foreground">
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-accent/40 transition">
                      <td className="p-4 font-mono font-bold text-primary">{(inv.id || '').substring(0, 8).toUpperCase()}</td>
                      <td className="p-4 font-bold">{inv.companyName}</td>
                      <td className="p-4 font-mono text-muted-foreground">{inv.createdAt ? inv.createdAt.split('T')[0] : '2026-07-01'}</td>
                      <td className="p-4 font-bold">${inv.amount}</td>
                      <td className="p-4"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">{t('companyViews.activePlanOptions')}</h2>
          <div className="space-y-3 text-xs">
            {plans.map((p: any) => (
              <div key={p.id} className="p-3 border rounded-lg bg-secondary/30 space-y-1">
                <div className="flex justify-between items-center font-bold">
                  <span>{p.name}</span>
                  <span className="text-primary">${p.price}/mo</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">{p.features}</div>
              </div>
            ))}
            {plans.length === 0 && (
              <div className="text-muted-foreground text-xs">No active plans configured.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 3c. COMPANY USAGE STATISTICS
const CompanyUsagePage: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = React.useState<any>(null);

  React.useEffect(() => {
    api.superadmin.getStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('companyViews.usageTitle')}
        description={t('companyViews.usageDesc')}
        breadcrumbs={[{ label: t('nav.home'), href: '/' }, { label: t('nav.companies'), href: '/companies' }, { label: t('companyViews.usageBreadcrumb') }]}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-3">
          <div className="flex justify-between text-xs font-bold">
            <span>{t('companyViews.diskStorageUsage')}</span>
            <span className="text-primary">{stats?.storageUsed || '7.7 GB'} / 500 GB (1.5%)</span>
          </div>
          <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: '1.5%' }} />
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">{t('companyViews.diskStorageDesc')}</p>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-3">
          <div className="flex justify-between text-xs font-bold">
            <span>{t('companyViews.totalManagedUnits')}</span>
            <span className="text-emerald-500">{stats?.totalCompanies ? stats.totalCompanies * 40 : 120} / 500 Units</span>
          </div>
          <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '24%' }} />
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">{t('companyViews.totalManagedUnitsDesc')}</p>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-3">
          <div className="flex justify-between text-xs font-bold">
            <span>{t('companyViews.monthlyApiRequests')}</span>
            <span className="text-purple-500">12,400 / 100,000 (12.4%)</span>
          </div>
          <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full" style={{ width: '12.4%' }} />
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">{t('companyViews.monthlyApiRequestsDesc')}</p>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-3">
          <div className="flex justify-between text-xs font-bold">
            <span>Active Companies Registered</span>
            <span className="text-amber-500">{stats?.activeCompanies || 3} Companies</span>
          </div>
          <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: '100%' }} />
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">Currently active SaaS tenant subscriptions in database.</p>
        </div>
      </div>
    </div>
  );
};

// 4a. PRICING PLANS MANAGER (DYNAMIC PLANS FROM BACKEND DB)
const SubscriptionPlansPage: React.FC = () => {
  const { t } = useTranslation();
  const [plans, setPlans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  const fetchPlans = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.plans.getAll();
      setPlans(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('subscriptionsPage.plansTitle')}
        description={t('subscriptionsPage.plansDesc')}
        breadcrumbs={[{ label: t('nav.home'), href: '/' }, { label: t('nav.subscriptions') }, { label: t('subscriptionsPage.plansBreadcrumb') }]}
      />

      {loading ? (
        <div className="p-6 text-xs text-muted-foreground">Loading subscription plans...</div>
      ) : plans.length === 0 ? (
        <div className="p-6 text-xs text-muted-foreground bg-card border rounded-xl">No active subscription plans found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(p => (
            <div key={p.id} className="bg-card border rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-lg text-foreground">{p.name}</h3>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">{p.billingCycle}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <StatusBadge status="Active" />
                  </div>
                </div>
                <div className="flex items-baseline text-foreground">
                  <span className="text-3xl font-extrabold tracking-tight">${p.price}</span>
                  <span className="ml-1 text-xs text-muted-foreground font-semibold">
                    {p.price === 0 ? '/ 14 days free' : (p.price === 120 ? '/ year ($10/mo)' : '/ month')}
                  </span>
                </div>
                <div className="space-y-2 text-xs font-medium border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Properties Limit</span>
                    <span className="font-bold text-primary">Unlimited</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Units Limit</span>
                    <span className="font-bold text-primary">Unlimited</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wide">{t('subscriptionsPage.featuresIncluded')}</span>
                    <p className="font-bold text-foreground mt-1 text-[11px] leading-relaxed">{p.features}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 4b. ACTIVE SUBSCRIPTIONS LIST
const ActiveSubscriptionsPage: React.FC = () => {
  const { t } = useTranslation();
  const [companies, setCompanies] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await api.companies.getAll();
        setCompanies(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('subscriptionsPage.activeTitle')}
        description={t('subscriptionsPage.activeDesc')}
        breadcrumbs={[{ label: t('nav.home'), href: '/' }, { label: t('nav.subscriptions'), href: '/subscriptions/plans' }, { label: t('subscriptionsPage.activeBreadcrumb') }]}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 text-xs text-muted-foreground">Loading active subscriptions from database...</div>
        ) : companies.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">No active subscriber companies found in database.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-4">{t('subscriptionsPage.table.planOption')}</th>
                  <th className="p-4">{t('subscriptionsPage.table.subscriberCompany')}</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">{t('subscriptionsPage.table.billingCycle')}</th>
                  <th className="p-4">{t('subscriptionsPage.table.nextBillingDate')}</th>
                  <th className="p-4">{t('subscriptionsPage.table.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-foreground">
                {companies.map(c => (
                  <tr key={c.id} className="hover:bg-accent/40 transition">
                    <td className="p-4 font-bold"><StatusBadge status={c.plan} /></td>
                    <td className="p-4 font-bold text-primary">{c.name}</td>
                    <td className="p-4">{c.contact} ({c.email})</td>
                    <td className="p-4">{c.cycle}</td>
                    <td className="p-4 font-mono">{c.date}</td>
                    <td className="p-4">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// 4c. SUBSCRIPTIONS INVOICES LIST
const SubscriptionInvoicesPage: React.FC = () => {
  const { t } = useTranslation();
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [metrics, setMetrics] = React.useState<any>({
    freeTrialCount: 0,
    monthlyPlanCount: 0,
    yearlyPlanCount: 0,
    totalRevenue: 0,
    totalInvoices: 0,
  });
  const [companies, setCompanies] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [showCreate, setShowCreate] = React.useState<boolean>(false);
  const [newInvoice, setNewInvoice] = React.useState({ companyId: '', companyName: '', amount: '', status: 'Paid', dueDate: '', transactionId: '' });

  const fetchInvoices = React.useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, compData] = await Promise.all([
        api.saasInvoices.getAll(),
        api.companies.getAll(),
      ]);

      if (invRes && invRes.invoices) {
        setInvoices(invRes.invoices);
        if (invRes.metrics) {
          setMetrics(invRes.metrics);
        }
      } else {
        setInvoices(Array.isArray(invRes) ? invRes : []);
      }

      setCompanies(compData);
      if (compData.length > 0) {
        setNewInvoice(prev => ({ ...prev, companyId: compData[0].id, companyName: compData[0].name, transactionId: '' }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.companyName || !newInvoice.amount) return;
    try {
      await api.saasInvoices.create({
        companyId: newInvoice.companyId,
        companyName: newInvoice.companyName,
        amount: parseFloat(newInvoice.amount),
        status: newInvoice.status,
        dueDate: newInvoice.dueDate || new Date().toISOString(),
        transactionId: newInvoice.transactionId || undefined,
      });
      fetchInvoices();
      setShowCreate(false);
      setNewInvoice({ companyId: companies[0]?.id || '', companyName: companies[0]?.name || '', amount: '', status: 'Paid', dueDate: '', transactionId: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    try {
      await api.saasInvoices.updateStatus(id, nextStatus);
      fetchInvoices();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('subscriptionsPage.invoicesTitle')}
        description={t('subscriptionsPage.invoicesDesc')}
        breadcrumbs={[{ label: t('nav.home'), href: '/' }, { label: t('nav.subscriptions'), href: '/subscriptions/plans' }, { label: t('subscriptionsPage.invoicesBreadcrumb') }]}
        action={{
          label: 'Create Invoice',
          onClick: () => setShowCreate(!showCreate),
          icon: <Plus className="w-4 h-4" />
        }}
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat Card 1: Free Trial */}
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-2 hover:border-primary/40 transition">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Free Trial Users</span>
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">{metrics.freeTrialCount || 0}</span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">14 Days Free</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Active free trial companies</p>
        </div>

        {/* Stat Card 2: Monthly Plan ($15/mo) */}
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-2 hover:border-primary/40 transition">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Monthly Plan Users</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">{metrics.monthlyPlanCount || 0}</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">$15 / month</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Subscribed monthly billing</p>
        </div>

        {/* Stat Card 3: Yearly Plan ($10/mo = $120/yr) */}
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-2 hover:border-primary/40 transition">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Yearly Plan Users</span>
            <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">{metrics.yearlyPlanCount || 0}</span>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full">$10/mo ($120/yr)</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Subscribed annual billing</p>
        </div>

        {/* Stat Card 4: Total Invoiced Revenue */}
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-2 hover:border-primary/40 transition">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Invoiced Revenue</span>
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">${(metrics.totalRevenue || 0).toLocaleString()}</span>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">{metrics.totalInvoices || invoices.length} Invoices</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Total paid SaaS revenue</p>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 shadow-sm space-y-4 max-w-xl">
          <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">Create New SaaS Invoice</h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Company</label>
              <select
                value={newInvoice.companyId}
                onChange={e => {
                  const selectedComp = companies.find(c => c.id === e.target.value);
                  setNewInvoice(prev => ({
                    ...prev,
                    companyId: e.target.value,
                    companyName: selectedComp ? selectedComp.name : ''
                  }));
                }}
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Amount ($)</label>
              <input
                required
                type="number"
                value={newInvoice.amount}
                onChange={e => setNewInvoice(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="299"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Payment Status</label>
              <select
                value={newInvoice.status}
                onChange={e => setNewInvoice(prev => ({ ...prev, status: e.target.value }))}
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
              >
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Transaction ID</label>
              <input
                type="text"
                value={newInvoice.transactionId}
                onChange={e => setNewInvoice(prev => ({ ...prev, transactionId: e.target.value }))}
                placeholder="e.g. AUTHNET-1234567890 (optional)"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
          </div>
          <div className="border-t pt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit">Publish Invoice</Button>
          </div>
        </form>
      )}

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 text-xs text-muted-foreground">Loading invoices from database...</div>
        ) : invoices.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">No invoices found in database.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-4">{t('subscriptionsPage.invoicesTable.invoiceId')}</th>
                  <th className="p-4">{t('subscriptionsPage.invoicesTable.company')}</th>
                  <th className="p-4">{t('subscriptionsPage.invoicesTable.amountPaid')}</th>
                  <th className="p-4">{t('subscriptionsPage.invoicesTable.invoiceDate')}</th>
                  <th className="p-4">{t('subscriptionsPage.invoicesTable.status')}</th>
                  <th className="p-4">{t('subscriptionsPage.invoicesTable.transactionId', 'Transaction ID')}</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-foreground">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-accent/40 transition">
                    <td className="p-4 font-mono font-bold text-primary">{(inv.id || '').substring(0, 8).toUpperCase()}</td>
                    <td className="p-4 font-bold">{inv.companyName}</td>
                    <td className="p-4 font-bold">${inv.amount}</td>
                    <td className="p-4 font-mono text-muted-foreground">{inv.createdAt ? inv.createdAt.split('T')[0] : '2026-07-01'}</td>
                    <td className="p-4"><StatusBadge status={inv.status} /></td>
                    <td className="p-4 font-mono text-muted-foreground">{inv.transactionId || 'N/A'}</td>
                    <td className="p-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => handleStatusToggle(inv.id, inv.status)} className="text-[10px] py-1 px-2">
                        Mark {inv.status === 'Paid' ? 'Unpaid' : 'Paid'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// 4d. SUBSCRIPTIONS PAYMENTS LEDGER
const SubscriptionPaymentsPage: React.FC = () => {
  const { t } = useTranslation();
  const transactions = [
    { txId: 'ch_stripe_8820', company: 'Apex Property Management', method: 'Visa ending 4242', amount: 149, date: '2026-07-15 09:12', status: 'Success' },
    { txId: 'ch_stripe_4112', company: 'Summit Group', method: 'Mastercard ending 9900', amount: 499, date: '2026-07-10 14:02', status: 'Failed' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('subscriptionsPage.paymentsTitle')}
        description={t('subscriptionsPage.paymentsDesc')}
        breadcrumbs={[{ label: t('nav.home'), href: '/' }, { label: t('nav.subscriptions'), href: '/subscriptions/plans' }, { label: t('subscriptionsPage.paymentsBreadcrumb') }]}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">{t('subscriptionsPage.paymentsTable.transactionId')}</th>
                <th className="p-4">{t('subscriptionsPage.paymentsTable.company')}</th>
                <th className="p-4">{t('subscriptionsPage.paymentsTable.paymentMethod')}</th>
                <th className="p-4">{t('subscriptionsPage.paymentsTable.amount')}</th>
                <th className="p-4">{t('subscriptionsPage.paymentsTable.processedDate')}</th>
                <th className="p-4">{t('subscriptionsPage.paymentsTable.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {transactions.map(tx => (
                <tr key={tx.txId} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-mono font-bold text-primary">{tx.txId}</td>
                  <td className="p-4 font-bold">{tx.company}</td>
                  <td className="p-4 font-semibold">{tx.method}</td>
                  <td className="p-4 font-bold">${tx.amount}</td>
                  <td className="p-4 font-mono text-muted-foreground">{tx.date}</td>
                  <td className="p-4"><StatusBadge status={tx.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 4e. SUBSCRIPTIONS COUPONS MANAGER
const SubscriptionCouponsPage: React.FC = () => {
  const { t } = useTranslation();
  const [coupons, setCoupons] = React.useState([
    { code: 'SUMMER50', discount: '50%', duration: '3 Months', used: 12, maxUses: 100, status: 'Active' },
    { code: 'WELCOMPM', discount: '10%', duration: 'Forever', used: 24, maxUses: 500, status: 'Active' }
  ]);

  const [showForm, setShowForm] = React.useState(false);
  const [newCoupon, setNewCoupon] = React.useState({ code: '', discount: '', duration: 'Forever', maxUses: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discount) return;
    setCoupons(prev => [
      ...prev,
      {
        code: newCoupon.code.toUpperCase(),
        discount: newCoupon.discount,
        duration: newCoupon.duration,
        used: 0,
        maxUses: Number(newCoupon.maxUses) || 100,
        status: 'Active'
      }
    ]);
    setNewCoupon({ code: '', discount: '', duration: 'Forever', maxUses: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('subscriptionsPage.couponsTitle')}
        description={t('subscriptionsPage.couponsDesc')}
        breadcrumbs={[{ label: t('nav.home'), href: '/' }, { label: t('nav.subscriptions'), href: '/subscriptions/plans' }, { label: t('subscriptionsPage.couponsBreadcrumb') }]}
        action={{
          label: t('subscriptionsPage.createCouponBtn'),
          onClick: () => setShowForm(!showForm),
          icon: <Plus className="w-4 h-4" />
        }}
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 shadow-sm space-y-4 max-w-md">
          <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">{t('subscriptionsPage.newCouponTitle')}</h2>
          <div className="grid grid-cols-1 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('subscriptionsPage.promoCode')}</label>
              <input
                required
                value={newCoupon.code}
                onChange={e => setNewCoupon(prev => ({ ...prev, code: e.target.value }))}
                placeholder="e.g. APEXSTART"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('subscriptionsPage.discountValue')}</label>
              <input
                required
                value={newCoupon.discount}
                onChange={e => setNewCoupon(prev => ({ ...prev, discount: e.target.value }))}
                placeholder="e.g. 20% or $15"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('subscriptionsPage.duration')}</label>
              <select
                value={newCoupon.duration}
                onChange={e => setNewCoupon(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
              >
                <option>Forever</option>
                <option>1 Month</option>
                <option>3 Months</option>
                <option>6 Months</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('subscriptionsPage.maxUsageLimit')}</label>
              <input
                type="number"
                value={newCoupon.maxUses}
                onChange={e => setNewCoupon(prev => ({ ...prev, maxUses: e.target.value }))}
                placeholder="e.g. 100"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
          </div>
          <div className="border-t pt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t('subscriptionsPage.cancel')}</Button>
            <Button type="submit">{t('subscriptionsPage.activateCouponBtn')}</Button>
          </div>
        </form>
      )}

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">{t('subscriptionsPage.couponsTable.couponCode')}</th>
                <th className="p-4">{t('subscriptionsPage.couponsTable.discountAmount')}</th>
                <th className="p-4">{t('subscriptionsPage.couponsTable.durationTerm')}</th>
                <th className="p-4">{t('subscriptionsPage.couponsTable.redemptionCount')}</th>
                <th className="p-4">{t('subscriptionsPage.couponsTable.maxUses')}</th>
                <th className="p-4">{t('subscriptionsPage.couponsTable.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {coupons.map((c, i) => (
                <tr key={i} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-extrabold text-primary font-mono">{c.code}</td>
                  <td className="p-4 font-bold">{c.discount}</td>
                  <td className="p-4 font-semibold">{c.duration}</td>
                  <td className="p-4 font-bold">{c.used} redemptions</td>
                  <td className="p-4 font-mono text-muted-foreground">{c.maxUses}</td>
                  <td className="p-4"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 5. PLATFORM USERS PAGE
const PlatformUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const [usersList, setUsersList] = React.useState<any[]>([]);
  const [companies, setCompanies] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [showCreate, setShowCreate] = React.useState<boolean>(false);
  const [newUser, setNewUser] = React.useState({ name: '', email: '', role: 'Admin', companyId: '' });
  const [deleteUserId, setDeleteUserId] = React.useState<string | null>(null);

  const fetchUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      const [uData, cData] = await Promise.all([
        api.companyUsers.getAll(),
        api.companies.getAll(),
      ]);
      setUsersList(uData);
      setCompanies(cData);
      if (cData.length > 0) {
        setNewUser(prev => ({ ...prev, companyId: cData[0].id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.companyId) return;
    try {
      await api.companyUsers.create({
        companyId: newUser.companyId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      });
      fetchUsers();
      setShowCreate(false);
      setNewUser({ name: '', email: '', role: 'Admin', companyId: companies[0]?.id || '' });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      await api.companyUsers.updateStatus(id, nextStatus);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteUserId(id);
  };

  const confirmDeleteUser = async () => {
    if (deleteUserId) {
      try {
        await api.companyUsers.delete(deleteUserId);
        fetchUsers();
      } catch (err) {
        console.error(err);
      }
      setDeleteUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('platformUsersPage.title')}
        description={t('platformUsersPage.desc')}
        breadcrumbs={[{ label: t('platformUsersPage.home'), href: '/' }, { label: t('platformUsersPage.platformUsers') }]}
        action={{
          label: 'Create Platform User',
          onClick: () => setShowCreate(!showCreate),
          icon: <Plus className="w-4 h-4" />
        }}
      />

      {showCreate && (
        <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 shadow-sm space-y-4 max-w-xl">
          <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">Add New Platform User</h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Full Name</label>
              <input
                required
                value={newUser.name}
                onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</label>
              <input
                required
                type="email"
                value={newUser.email}
                onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Platform Role</label>
              <select
                value={newUser.role}
                onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
              >
                <option value="Super Admin">Super Admin</option>
                <option value="Admin">Admin</option>
                <option value="Property Manager">Property Manager</option>
                <option value="Billing Admin">Billing Admin</option>
                <option value="Owner Admin">Owner Admin</option>
                <option value="Staff Member">Staff Member</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Assigned Company</label>
              <select
                value={newUser.companyId}
                onChange={e => setNewUser(prev => ({ ...prev, companyId: e.target.value }))}
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="border-t pt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit">Create User</Button>
          </div>
        </form>
      )}

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 text-xs text-muted-foreground">Loading platform users from database...</div>
        ) : usersList.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">No platform users found in database.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-4">{t('platformUsersPage.userName')}</th>
                  <th className="p-4">{t('platformUsersPage.email')}</th>
                  <th className="p-4">{t('platformUsersPage.platformRole')}</th>
                  <th className="p-4">{t('platformUsersPage.assignedCompany')}</th>
                  <th className="p-4">{t('platformUsersPage.accountStatus')}</th>
                  <th className="p-4">{t('platformUsersPage.lastLogin')}</th>
                  <th className="p-4 text-right">{t('platformUsersPage.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-foreground">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-accent/40 transition">
                    <td className="p-4 font-bold">{u.name}</td>
                    <td className="p-4 font-mono">{u.email}</td>
                    <td className="p-4">
                      <StatusBadge status={u.role} />
                    </td>
                    <td className="p-4 font-semibold text-primary">{u.companyName}</td>
                    <td className="p-4">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="p-4 text-muted-foreground font-mono">{u.date || '2026-07-20'}</td>
                    <td className="p-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(u.id, u.status)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                          u.status === 'Active'
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/20'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20'
                        }`}
                      >
                        {u.status === 'Active' ? t('platformUsersPage.suspend') : t('platformUsersPage.activate')}
                      </button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} className="text-rose-600 hover:text-rose-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={deleteUserId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteUserId(null);
        }}
        title="Delete Platform User"
        description="Are you sure you want to delete this platform user? This action cannot be undone."
        onConfirm={confirmDeleteUser}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};

// 6. SUPPORT TICKETS PAGE
const SupportTicketsPage: React.FC = () => {
  const { t } = useTranslation();
  const tickets = [
    { id: 'TKT-102', company: 'Apex Property Management', topic: 'SMTP Email Configuration Issue', type: 'Ticket', priority: 'High', status: 'In Progress', date: '2026-07-20' },
    { id: 'FDB-882', company: 'Horizon Living', topic: 'Requested eSignature integration update', type: 'Feedback', priority: 'Medium', status: 'Waiting', date: '2026-07-19' },
    { id: 'TKT-101', company: 'Summit Group', topic: 'Failed stripe webhook payment retry', type: 'Ticket', priority: 'Critical', status: 'Resolved', date: '2026-07-18' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('supportViews.ticketsTitle')}
        description={t('supportViews.ticketsDesc')}
        breadcrumbs={[{ label: t('nav.home'), href: '/' }, { label: t('nav.support') }]}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">{t('supportViews.ticketsTable.id')}</th>
                <th className="p-4">{t('supportViews.ticketsTable.company')}</th>
                <th className="p-4">{t('supportViews.ticketsTable.topic')}</th>
                <th className="p-4">{t('supportViews.ticketsTable.type')}</th>
                <th className="p-4">{t('supportViews.ticketsTable.priority')}</th>
                <th className="p-4">{t('supportViews.ticketsTable.status')}</th>
                <th className="p-4">{t('supportViews.ticketsTable.submitted')}</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {tickets.map(tkt => (
                <tr key={tkt.id} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-mono font-bold">{tkt.id}</td>
                  <td className="p-4 font-bold">{tkt.company}</td>
                  <td className="p-4">{tkt.topic}</td>
                  <td className="p-4"><StatusBadge status={tkt.type} /></td>
                  <td className="p-4">
                    <StatusBadge status={tkt.priority} />
                  </td>
                  <td className="p-4">
                    <StatusBadge status={tkt.status} />
                  </td>
                  <td className="p-4 text-muted-foreground font-mono">{tkt.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 6a. SUPPORT FEEDBACK PAGE
const SupportFeedbackPage: React.FC = () => {
  const { t } = useTranslation();
  const feedbacks = [
    { id: 'FDB-001', company: 'Horizon Living', score: '5 Stars', text: 'Excellent dashboard layout! It is very easy to manage property leasing workflows now.', date: '2026-07-19' },
    { id: 'FDB-002', company: 'Summit Group', score: '4 Stars', text: 'Feature flags are extremely helpful for rolling out beta properties features.', date: '2026-07-17' },
    { id: 'FDB-003', company: 'Apex Property Management', score: '5 Stars', text: 'The new dashboard Recharts integration makes global revenue tracking so transparent.', date: '2026-07-15' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('supportViews.feedbackTitle')}
        description={t('supportViews.feedbackDesc')}
        breadcrumbs={[{ label: t('nav.home'), href: '/' }, { label: t('nav.support'), href: '/support/tickets' }, { label: t('supportViews.feedbackBreadcrumb') }]}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">{t('supportViews.feedbackTable.feedbackId')}</th>
                <th className="p-4">{t('supportViews.feedbackTable.company')}</th>
                <th className="p-4">{t('supportViews.feedbackTable.score')}</th>
                <th className="p-4">{t('supportViews.feedbackTable.comments')}</th>
                <th className="p-4">{t('supportViews.feedbackTable.submittedDate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {feedbacks.map(f => (
                <tr key={f.id} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-mono font-bold text-primary">{f.id}</td>
                  <td className="p-4 font-bold">{f.company}</td>
                  <td className="p-4"><StatusBadge status={f.score} /></td>
                  <td className="p-4 italic text-muted-foreground">"{f.text}"</td>
                  <td className="p-4 font-mono text-muted-foreground">{f.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 6b. PUBLIC CONTACT REQUESTS PAGE
const SupportContactPage: React.FC = () => {
  const { t } = useTranslation();
  const requests = [
    { name: 'John Peterson', company: 'Peterson Realty', email: 'john@peterson.com', phone: '555-9088', message: 'Looking for a custom enterprise tier package with 1,000 units.', date: '2026-07-20' },
    { name: 'Alice Watson', company: 'Watson & Co', email: 'alice@watson.com', phone: '555-1122', message: 'Requesting a demo call to review trust accounting capabilities next week.', date: '2026-07-18' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('supportViews.contactTitle')}
        description={t('supportViews.contactDesc')}
        breadcrumbs={[{ label: t('nav.home'), href: '/' }, { label: t('nav.support'), href: '/support/tickets' }, { label: t('supportViews.contactBreadcrumb') }]}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">{t('supportViews.contactTable.name')}</th>
                <th className="p-4">{t('supportViews.contactTable.company')}</th>
                <th className="p-4">{t('supportViews.contactTable.email')}</th>
                <th className="p-4">{t('supportViews.contactTable.phone')}</th>
                <th className="p-4">{t('supportViews.contactTable.inquiry')}</th>
                <th className="p-4">{t('supportViews.contactTable.date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {requests.map((r, i) => (
                <tr key={i} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-bold">{r.name}</td>
                  <td className="p-4 font-bold text-primary">{r.company}</td>
                  <td className="p-4 font-mono">{r.email}</td>
                  <td className="p-4 font-mono">{r.phone}</td>
                  <td className="p-4 text-muted-foreground font-medium">{r.message}</td>
                  <td className="p-4 font-mono text-muted-foreground">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 7a. PLATFORM SETTINGS GENERAL
const PlatformSettingsGeneralView: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = React.useState<boolean>(false);
  const [isEditing, setIsEditing] = React.useState<boolean>(false);

  const [form, setForm] = React.useState({
    systemName: 'Apex SaaS Platform',
    supportEmail: 'support@apexpm.com',
    defaultCurrency: 'USD ($)',
    appTimezone: 'UTC (Coordinated Universal Time)',
    maintenanceMode: 'false',
  });
  const [initialForm, setInitialForm] = React.useState({ ...form });

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await api.platformSettings.getGeneral();
        if (data && Object.keys(data).length > 0) {
          const merged = { ...form, ...data };
          setForm(merged);
          setInitialForm(merged);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.platformSettings.saveGeneral(form);
      setInitialForm({ ...form });
      setIsEditing(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...initialForm });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={t('platformSettingsPage.title')}
        description={t('platformSettingsPage.desc')}
      />

      {savedSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl text-xs font-semibold text-center">
          Platform settings updated and saved to database successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wide">{t('platformSettingsPage.globalProperties')}</h2>
          {!isEditing && (
            <Button 
              type="button" 
              onClick={() => setIsEditing(true)}
              className="font-bold text-xs bg-primary text-white hover:bg-primary/90 px-4 py-1.5 h-auto rounded-lg shadow-sm"
            >
              Edit Settings
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-xs text-muted-foreground py-4">Loading settings from database...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('platformSettingsPage.systemName')}</label>
              <input
                disabled={!isEditing}
                value={form.systemName}
                onChange={e => setForm(prev => ({ ...prev, systemName: e.target.value }))}
                className={`w-full p-2.5 rounded-lg border text-xs font-semibold transition ${
                  !isEditing 
                    ? 'bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-80' 
                    : 'bg-background text-foreground border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                }`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('platformSettingsPage.supportEmail')}</label>
              <input
                disabled={!isEditing}
                value={form.supportEmail}
                onChange={e => setForm(prev => ({ ...prev, supportEmail: e.target.value }))}
                className={`w-full p-2.5 rounded-lg border text-xs font-semibold transition ${
                  !isEditing 
                    ? 'bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-80' 
                    : 'bg-background text-foreground border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                }`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('platformSettingsPage.defaultCurrency')}</label>
              <select
                disabled={!isEditing}
                value={form.defaultCurrency}
                onChange={e => setForm(prev => ({ ...prev, defaultCurrency: e.target.value }))}
                className={`w-full p-2.5 rounded-lg border text-xs font-semibold transition ${
                  !isEditing 
                    ? 'bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-80' 
                    : 'bg-background text-foreground border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                }`}
              >
                <option value="USD ($)">USD ($)</option>
                <option value="EUR (€)">EUR (€)</option>
                <option value="GBP (£)">GBP (£)</option>
                <option value="INR (₹)">INR (₹)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('platformSettingsPage.appTimezone')}</label>
              <select
                disabled={!isEditing}
                value={form.appTimezone}
                onChange={e => setForm(prev => ({ ...prev, appTimezone: e.target.value }))}
                className={`w-full p-2.5 rounded-lg border text-xs font-semibold transition ${
                  !isEditing 
                    ? 'bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-80' 
                    : 'bg-background text-foreground border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                }`}
              >
                <option value="UTC (Coordinated Universal Time)">UTC (Coordinated Universal Time)</option>
                <option value="EST (Eastern Standard Time)">EST (Eastern Standard Time)</option>
                <option value="PST (Pacific Standard Time)">PST (Pacific Standard Time)</option>
                <option value="IST (Indian Standard Time)">IST (Indian Standard Time)</option>
              </select>
            </div>
          </div>
        )}
        <div className="border-t pt-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 text-xs">
            <input
              type="checkbox"
              id="maintMode"
              disabled={!isEditing}
              checked={form.maintenanceMode === 'true'}
              onChange={e => setForm(prev => ({ ...prev, maintenanceMode: e.target.checked ? 'true' : 'false' }))}
              className="rounded border-border text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="maintMode" className={`font-bold text-rose-500 ${!isEditing ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}>
              {t('platformSettingsPage.maintenanceMode')}
            </label>
          </div>

          {isEditing && (
            <div className="flex items-center space-x-2">
              <Button type="button" variant="outline" onClick={handleCancel} className="font-bold text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="font-bold text-xs bg-primary text-white hover:bg-primary/95">
                {saving ? 'Saving...' : t('platformSettingsPage.saveSettings')}
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

// 7b. PLATFORM SETTINGS EMAIL
const PlatformSettingsEmailView: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={t('platformSettings.email.title')}
        description={t('platformSettings.email.description')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.platformSettings') },
          { label: t('platformSettings.email.breadcrumb') }
        ]}
      />
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
        <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">{t('platformSettings.email.section')}</h2>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('platformSettings.email.host')}</label>
            <input defaultValue="smtp.sendgrid.net" className="w-full p-2 rounded border bg-secondary text-xs font-semibold" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('platformSettings.email.port')}</label>
            <input defaultValue="587" className="w-full p-2 rounded border bg-secondary text-xs font-semibold" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('platformSettings.email.username')}</label>
            <input defaultValue="apikey" className="w-full p-2 rounded border bg-secondary text-xs font-semibold" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('platformSettings.email.password')}</label>
            <Input type="password" placeholder="••••••••••••••••" className="w-full text-xs font-semibold h-9" />
          </div>
        </div>
        <div className="border-t pt-4 flex justify-end">
          <Button className="font-bold bg-primary text-white hover:bg-primary/95">{t('platformSettings.email.saveBtn')}</Button>
        </div>
      </div>
    </div>
  );
};

// 7c. PLATFORM SETTINGS STORAGE
const PlatformSettingsStorageView: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={t('platformSettings.storage.title')}
        description={t('platformSettings.storage.description')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.platformSettings') },
          { label: t('platformSettings.storage.breadcrumb') }
        ]}
      />
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
        <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">{t('platformSettings.storage.section')}</h2>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('platformSettings.storage.region')}</label>
            <input defaultValue="us-east-1" className="w-full p-2 rounded border bg-secondary text-xs font-semibold" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('platformSettings.storage.bucket')}</label>
            <input defaultValue="whatslandlord-saas-production-storage" className="w-full p-2 rounded border bg-secondary text-xs font-semibold" />
          </div>
        </div>
        <div className="border-t pt-4 flex justify-end">
          <Button className="font-bold bg-primary text-white hover:bg-primary/95">{t('platformSettings.storage.saveBtn')}</Button>
        </div>
      </div>
    </div>
  );
};

// 7d. PLATFORM SETTINGS BRANDING
const PlatformSettingsBrandingView: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={t('platformSettings.branding.title')}
        description={t('platformSettings.branding.description')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.platformSettings') },
          { label: t('platformSettings.branding.breadcrumb') }
        ]}
      />
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
        <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">{t('platformSettings.branding.section')}</h2>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('platformSettings.branding.color')}</label>
            <div className="flex space-x-2">
              <input type="color" defaultValue="#3b82f6" className="w-10 h-8 rounded border p-0 cursor-pointer" />
              <input defaultValue="#3b82f6" className="flex-1 p-2 rounded border bg-secondary text-xs font-semibold" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('platformSettings.branding.domain')}</label>
            <input defaultValue="app.whatslandlord-apex.com" className="w-full p-2 rounded border bg-secondary text-xs font-semibold" />
          </div>
        </div>
        <div className="border-t pt-4 flex justify-end">
          <Button className="font-bold bg-primary text-white hover:bg-primary/95">{t('platformSettings.branding.saveBtn')}</Button>
        </div>
      </div>
    </div>
  );
};

// 8a. PLATFORM INTEGRATIONS CONNECTED APPS
const PlatformIntegrationsConnectedView: React.FC = () => {
  const { t } = useTranslation();
  const apps = [
    { name: 'Stripe Payments', category: 'Payment Gateways', desc: 'SaaS subscription processing integration', connected: 'Yes', status: 'Active' },
    { name: 'Twilio SMS', category: 'SMS Gateway', desc: 'System notification SMS messages dispatch', connected: 'Yes', status: 'Active' },
    { name: 'SendGrid Email', category: 'Email (SMTP)', desc: 'Transactional platform emails delivery', connected: 'Yes', status: 'Active' },
    { name: 'QuickBooks Accounting', category: 'Accounting Sync', desc: 'Sync customer company transactions and payouts', connected: 'No', status: 'Inactive' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('platformIntegrations.connectedApps.title')}
        description={t('platformIntegrations.connectedApps.description')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.integrationsMarketplace') },
          { label: t('platformIntegrations.connectedApps.breadcrumb') }
        ]}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">{t('platformIntegrations.connectedApps.table.name')}</th>
                <th className="p-4">{t('platformIntegrations.connectedApps.table.category')}</th>
                <th className="p-4">{t('platformIntegrations.connectedApps.table.description')}</th>
                <th className="p-4">{t('platformIntegrations.connectedApps.table.connectedStatus')}</th>
                <th className="p-4">{t('platformIntegrations.connectedApps.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {apps.map((app, i) => (
                <tr key={i} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-bold text-primary">{app.name}</td>
                  <td className="p-4 font-semibold">{app.category}</td>
                  <td className="p-4 text-muted-foreground">{app.desc}</td>
                  <td className="p-4"><StatusBadge status={app.status} /></td>
                  <td className="p-4">
                    <Button variant="outline" size="sm" className="font-bold text-[10px]">
                      {app.connected === 'Yes' ? t('platformIntegrations.connectedApps.actions.disconnect') : t('platformIntegrations.connectedApps.actions.connect')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 8b. PLATFORM API KEYS
const PlatformIntegrationsKeysView: React.FC = () => {
  const { t } = useTranslation();
  const keys = [
    { name: 'Production Dashboard API Key', scope: 'Read/Write', prefix: 'pk_live_••••a899', created: '2026-01-20', status: 'Active' },
    { name: 'Staging Sandbox Testing Key', scope: 'Read-Only', prefix: 'pk_test_••••1100', created: '2026-03-12', status: 'Active' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('platformIntegrations.apiKeys.title')}
        description={t('platformIntegrations.apiKeys.description')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.integrationsMarketplace') },
          { label: t('platformIntegrations.apiKeys.breadcrumb') }
        ]}
        action={{
          label: t('platformIntegrations.apiKeys.generateBtn'),
          onClick: () => { },
          icon: <Plus className="w-4 h-4" />
        }}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">{t('platformIntegrations.apiKeys.table.description')}</th>
                <th className="p-4">{t('platformIntegrations.apiKeys.table.scope')}</th>
                <th className="p-4">{t('platformIntegrations.apiKeys.table.preview')}</th>
                <th className="p-4">{t('platformIntegrations.apiKeys.table.createdDate')}</th>
                <th className="p-4">{t('platformIntegrations.apiKeys.table.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {keys.map((k, i) => (
                <tr key={i} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-bold">{k.name}</td>
                  <td className="p-4 font-semibold text-primary">{k.scope}</td>
                  <td className="p-4 font-mono text-muted-foreground">{k.prefix}</td>
                  <td className="p-4 font-mono text-muted-foreground">{k.created}</td>
                  <td className="p-4"><StatusBadge status={k.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 8c. PLATFORM WEBHOOK ENDPOINTS
const PlatformIntegrationsWebhooksView: React.FC = () => {
  const { t } = useTranslation();
  const webhooks = [
    { url: 'https://api.whatslandlord-apex.com/v1/billing/stripe', events: 'invoice.paid, invoice.payment_failed', status: 'Active' },
    { url: 'https://api.whatslandlord-apex.com/v1/notifications/twilio-sms', events: 'message.delivered, message.failed', status: 'Active' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('platformIntegrations.webhooks.title')}
        description={t('platformIntegrations.webhooks.description')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.integrationsMarketplace') },
          { label: t('platformIntegrations.webhooks.breadcrumb') }
        ]}
        action={{
          label: t('platformIntegrations.webhooks.addBtn'),
          onClick: () => { },
          icon: <Plus className="w-4 h-4" />
        }}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">{t('platformIntegrations.webhooks.table.endpoint')}</th>
                <th className="p-4">{t('platformIntegrations.webhooks.table.events')}</th>
                <th className="p-4">{t('platformIntegrations.webhooks.table.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {webhooks.map((w, i) => (
                <tr key={i} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-mono font-bold text-primary">{w.url}</td>
                  <td className="p-4 font-mono text-muted-foreground">{w.events}</td>
                  <td className="p-4"><StatusBadge status={w.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 9a. PLATFORM SECURITY AUDIT LOGS
const PlatformSecurityAuditView: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await api.auditLogs.getAll();
        setLogs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('platformSecurity.auditLogs.title')}
        description={t('platformSecurity.auditLogs.description')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('platformSecurity.security'), href: '/platform-security/audit' },
          { label: t('platformSecurity.auditLogs.breadcrumb') }
        ]}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 text-xs text-muted-foreground">Loading security audit logs from database...</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">No security audit logs found in database.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-4">{t('platformSecurity.auditLogs.table.auditId')}</th>
                  <th className="p-4">{t('platformSecurity.auditLogs.table.actionTaken')}</th>
                  <th className="p-4">{t('platformSecurity.auditLogs.table.authorizedUser')}</th>
                  <th className="p-4">{t('platformSecurity.auditLogs.table.ipAddress')}</th>
                  <th className="p-4">{t('platformSecurity.auditLogs.table.timestamp')}</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-foreground">
                {logs.map((l: any) => (
                  <tr key={l.id} className="hover:bg-accent/40 transition">
                    <td className="p-4 font-mono font-bold text-primary">AUD-{(l.id || '').substring(0, 6).toUpperCase()}</td>
                    <td className="p-4 font-bold">{l.action}</td>
                    <td className="p-4 font-semibold">{l.user || l.userId || 'admin@apexpm.com'}</td>
                    <td className="p-4 font-mono text-muted-foreground">{l.ip || '198.162.0.12'}</td>
                    <td className="p-4 font-mono text-muted-foreground">
                      {l.timestamp ? l.timestamp.replace('T', ' ').substring(0, 16) : '2026-07-20 05:39'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// 9b. PLATFORM LOGIN HISTORY
const PlatformSecurityLoginView: React.FC = () => {
  const { t } = useTranslation();
  const logins = [
    { email: 'admin@apexpm.com', role: 'Super Admin', ip: '198.162.0.12', device: t('platformSecurity.loginHistory.devices.chromeWin'), status: 'Success', time: '2026-07-20 05:12' },
    { email: 'manager@apexpm.com', role: 'Property Manager', ip: '198.162.0.15', device: t('platformSecurity.loginHistory.devices.safariMac'), status: 'Success', time: '2026-07-20 04:33' },
    { email: 'owner@apexpm.com', role: 'Owner', ip: '198.162.0.22', device: t('platformSecurity.loginHistory.devices.firefoxLinux'), status: 'Success', time: '2026-07-19 14:02' },
    { email: 'invalid@hacker.com', role: 'Unknown', ip: '45.12.88.9', device: t('platformSecurity.loginHistory.devices.chromeWin'), status: 'Failed', time: '2026-07-19 10:11' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('platformSecurity.loginHistory.title')}
        description={t('platformSecurity.loginHistory.description')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('platformSecurity.security') },
          { label: t('platformSecurity.loginHistory.breadcrumb') }
        ]}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">{t('platformSecurity.loginHistory.table.email')}</th>
                <th className="p-4">{t('platformSecurity.loginHistory.table.role')}</th>
                <th className="p-4">{t('platformSecurity.loginHistory.table.ip')}</th>
                <th className="p-4">{t('platformSecurity.loginHistory.table.device')}</th>
                <th className="p-4">{t('platformSecurity.loginHistory.table.status')}</th>
                <th className="p-4">{t('platformSecurity.loginHistory.table.timestamp')}</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {logins.map((l, i) => (
                <tr key={i} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-bold">{l.email}</td>
                  <td className="p-4"><StatusBadge status={l.role} /></td>
                  <td className="p-4 font-mono text-muted-foreground">{l.ip}</td>
                  <td className="p-4 text-muted-foreground">{l.device}</td>
                  <td className="p-4"><StatusBadge status={l.status} /></td>
                  <td className="p-4 font-mono text-muted-foreground">{l.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 9c. PLATFORM SECURITY POLICIES
const PlatformSecurityPoliciesView: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={t('platformSecurity.policies.title')}
        description={t('platformSecurity.policies.description')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('platformSecurity.security') },
          { label: t('platformSecurity.policies.breadcrumb') }
        ]}
      />
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
        <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">{t('platformSecurity.policies.globalSection')}</h2>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('platformSecurity.policies.minPasswordLength')}</label>
            <select className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none">
              <option>{t('platformSecurity.policies.options.eight')}</option>
              <option>{t('platformSecurity.policies.options.twelve')}</option>
              <option>{t('platformSecurity.policies.options.sixteen')}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('platformSecurity.policies.idleTimeout')}</label>
            <input defaultValue="30" type="number" className="w-full p-2 rounded border bg-secondary text-xs font-semibold" />
          </div>
        </div>
        <div className="space-y-4 border-t pt-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">{t('platformSecurity.policies.authEnforcement')}</h2>
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="rounded border-border text-primary" />
              <span className="font-bold">{t('platformSecurity.policies.requireMfa')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" className="rounded border-border text-primary" />
              <span className="font-bold">{t('platformSecurity.policies.forceRotation')}</span>
            </div>
          </div>
        </div>
        <div className="border-t pt-4 flex justify-end">
          <Button className="font-bold bg-primary text-white hover:bg-primary/95">{t('platformSecurity.policies.applyBtn')}</Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ==================== PROPERTY MANAGER NEW SUB-PAGES ========================
// ============================================================================

// 1. AMENITIES VIEW (WITH CRUD)
const AmenitiesPage: React.FC = () => {
  const [amenities, setAmenities] = React.useState([
    { id: '1', name: 'Swimming Pool Access', category: 'Recreation', desc: 'Allows access to clubhouse swimming pool', included: 'No', fee: 25, status: 'Active' },
    { id: '2', name: 'High-Speed Fiber Wifi', category: 'Utilities', desc: '1 Gbps internet connections', included: 'Yes', fee: 0, status: 'Active' },
    { id: '3', name: 'Reserved Underground Parking', category: 'Parking', desc: 'Secure indoor basement parking spot', included: 'No', fee: 75, status: 'Active' }
  ]);

  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: '', category: 'Recreation', desc: '', included: 'No', fee: '', status: 'Active' });

  const handleEdit = (amenity: typeof amenities[0]) => {
    setEditingId(amenity.id);
    setForm({
      name: amenity.name,
      category: amenity.category,
      desc: amenity.desc,
      included: amenity.included,
      fee: String(amenity.fee),
      status: amenity.status
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setAmenities(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    if (editingId) {
      // Update
      setAmenities(prev => prev.map(a => a.id === editingId ? {
        ...a,
        name: form.name,
        category: form.category,
        desc: form.desc,
        included: form.included,
        fee: Number(form.fee) || 0,
        status: form.status
      } : a));
      setEditingId(null);
    } else {
      // Create
      setAmenities(prev => [
        ...prev,
        {
          id: String(Date.now()),
          name: form.name,
          category: form.category,
          desc: form.desc,
          included: form.included,
          fee: Number(form.fee) || 0,
          status: form.status
        }
      ]);
    }

    setForm({ name: '', category: 'Recreation', desc: '', included: 'No', fee: '', status: 'Active' });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties Amenities"
        description="Configure unit/building level amenities and pricing for tenant leases."
        breadcrumbs={[{ label: 'Properties', href: '/properties' }, { label: 'Amenities' }]}
        action={{
          label: editingId ? 'Edit Amenity' : 'Create Amenity',
          onClick: () => {
            if (showForm) {
              setEditingId(null);
              setForm({ name: '', category: 'Recreation', desc: '', included: 'No', fee: '', status: 'Active' });
            }
            setShowForm(!showForm);
          },
          icon: <Plus className="w-4 h-4" />
        }}
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 shadow-sm space-y-4 max-w-xl">
          <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">
            {editingId ? 'Modify Amenity Details' : 'Create Custom Property Amenity'}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Amenity Name</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Storage Unit A"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
              >
                <option>Recreation</option>
                <option>Utilities</option>
                <option>Parking</option>
                <option>Storage</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Monthly Fee ($)</label>
              <input
                type="number"
                value={form.fee}
                onChange={e => setForm(prev => ({ ...prev, fee: e.target.value }))}
                placeholder="e.g. 0"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Rent Included?</label>
              <select
                value={form.included}
                onChange={e => setForm(prev => ({ ...prev, included: e.target.value }))}
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Description</label>
              <textarea
                value={form.desc}
                onChange={e => setForm(prev => ({ ...prev, desc: e.target.value }))}
                placeholder="Describe amenity features..."
                rows={2}
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
          </div>
          <div className="border-t pt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
            <Button type="submit">{editingId ? 'Update Amenity' : 'Add Amenity'}</Button>
          </div>
        </form>
      )}

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">Amenity Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Description</th>
                <th className="p-4">Rent Included</th>
                <th className="p-4">Monthly Fee</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {amenities.map((a, i) => (
                <tr key={a.id} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-bold">{a.name}</td>
                  <td className="p-4"><StatusBadge status={a.category} /></td>
                  <td className="p-4 text-muted-foreground">{a.desc}</td>
                  <td className="p-4 font-bold">{a.included}</td>
                  <td className="p-4 font-bold">${a.fee}</td>
                  <td className="p-4"><StatusBadge status={a.status} /></td>
                  <td className="p-4 text-right space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)} className="text-rose-500 hover:text-rose-600"><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 2. FLOOR PLANS VIEW (WITH CRUD)
const FloorPlansPage: React.FC = () => {
  const [plans, setPlans] = React.useState([
    { id: '1', name: 'Studio Deluxe', beds: 1, baths: 1, sqft: 520, rent: 1200, deposit: 1200, desc: 'Compact open layout studio apartment' },
    { id: '2', name: '2B/2B Executive Suite', beds: 2, baths: 2, sqft: 980, rent: 1850, deposit: 1850, desc: 'Double bedroom apartment with balconies' }
  ]);

  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: '', beds: '', baths: '', sqft: '', rent: '', deposit: '', desc: '' });

  const handleEdit = (plan: typeof plans[0]) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      beds: String(plan.beds),
      baths: String(plan.baths),
      sqft: String(plan.sqft),
      rent: String(plan.rent),
      deposit: String(plan.deposit),
      desc: plan.desc
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    if (editingId) {
      // Update
      setPlans(prev => prev.map(p => p.id === editingId ? {
        ...p,
        name: form.name,
        beds: Number(form.beds) || 1,
        baths: Number(form.baths) || 1,
        sqft: Number(form.sqft) || 500,
        rent: Number(form.rent) || 1000,
        deposit: Number(form.deposit) || 1000,
        desc: form.desc
      } : p));
      setEditingId(null);
    } else {
      // Create
      setPlans(prev => [
        ...prev,
        {
          id: String(Date.now()),
          name: form.name,
          beds: Number(form.beds) || 1,
          baths: Number(form.baths) || 1,
          sqft: Number(form.sqft) || 500,
          rent: Number(form.rent) || 1000,
          deposit: Number(form.deposit) || 1000,
          desc: form.desc
        }
      ]);
    }

    setForm({ name: '', beds: '', baths: '', sqft: '', rent: '', deposit: '', desc: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Property Floor Plans"
        description="Manage layouts, size measurements, and rent structures of floor plans."
        breadcrumbs={[{ label: 'Properties', href: '/properties' }, { label: 'Floor Plans' }]}
        action={{
          label: editingId ? 'Edit Layout' : 'Create Floor Plan',
          onClick: () => {
            if (showForm) {
              setEditingId(null);
              setForm({ name: '', beds: '', baths: '', sqft: '', rent: '', deposit: '', desc: '' });
            }
            setShowForm(!showForm);
          },
          icon: <Plus className="w-4 h-4" />
        }}
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 shadow-sm space-y-4 max-w-xl">
          <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">
            {editingId ? 'Modify Floor Plan' : 'Create Custom Floor Plan'}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Floor Plan Name</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. 1B/1B Deluxe Loft"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Bedrooms Count</label>
              <input
                type="number"
                value={form.beds}
                onChange={e => setForm(prev => ({ ...prev, beds: e.target.value }))}
                placeholder="e.g. 1"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Bathrooms Count</label>
              <input
                type="number"
                value={form.baths}
                onChange={e => setForm(prev => ({ ...prev, baths: e.target.value }))}
                placeholder="e.g. 1"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Size (Sq Ft)</label>
              <input
                type="number"
                value={form.sqft}
                onChange={e => setForm(prev => ({ ...prev, sqft: e.target.value }))}
                placeholder="e.g. 750"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Market Price Rent ($)</label>
              <input
                type="number"
                value={form.rent}
                onChange={e => setForm(prev => ({ ...prev, rent: e.target.value }))}
                placeholder="e.g. 1200"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Required Deposit ($)</label>
              <input
                type="number"
                value={form.deposit}
                onChange={e => setForm(prev => ({ ...prev, deposit: e.target.value }))}
                placeholder="e.g. 1200"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Description</label>
              <textarea
                value={form.desc}
                onChange={e => setForm(prev => ({ ...prev, desc: e.target.value }))}
                placeholder="Describe floor plan features..."
                rows={2}
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
          </div>
          <div className="border-t pt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
            <Button type="submit">{editingId ? 'Update Layout' : 'Publish Layout'}</Button>
          </div>
        </form>
      )}

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">Floor Plan Name</th>
                <th className="p-4">Layout details</th>
                <th className="p-4">Size (Sq Ft)</th>
                <th className="p-4">Market Rent</th>
                <th className="p-4">Deposit</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-bold text-primary">{p.name}</td>
                  <td className="p-4">{p.beds} Bed, {p.baths} Bath</td>
                  <td className="p-4 font-bold">{p.sqft} sq ft</td>
                  <td className="p-4 font-bold">${p.rent.toLocaleString()}</td>
                  <td className="p-4">${p.deposit.toLocaleString()}</td>
                  <td className="p-4 text-muted-foreground">{p.desc}</td>
                  <td className="p-4 text-right space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-rose-500 hover:text-rose-600"><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 3. LEASING SCREENING VIEW (WITH CRUD)
const ScreeningPage: React.FC = () => {
  const [applicants, setApplicants] = React.useState([
    { id: '1', applicant: 'Michael Jordan', creditScore: 780, background: 'Clean', income: 'Verified ($6k/mo)', eviction: 'No Record', status: 'Employed', decision: 'Approved', date: '2026-07-15' },
    { id: '2', applicant: 'Brittany Spears', creditScore: 590, background: 'Clean', income: 'Unverified', eviction: 'No Record', status: 'Self-Employed', decision: 'Rejected', date: '2026-07-12' }
  ]);

  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ applicant: '', creditScore: '', background: 'Clean', income: '', eviction: 'No Record', status: 'Employed', decision: 'Approved' });

  const handleEdit = (app: typeof applicants[0]) => {
    setEditingId(app.id);
    setForm({
      applicant: app.applicant,
      creditScore: String(app.creditScore),
      background: app.background,
      income: app.income,
      eviction: app.eviction,
      status: app.status,
      decision: app.decision
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setApplicants(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.applicant) return;

    if (editingId) {
      setApplicants(prev => prev.map(a => a.id === editingId ? {
        ...a,
        applicant: form.applicant,
        creditScore: Number(form.creditScore) || 600,
        background: form.background,
        income: form.income || 'Verified',
        eviction: form.eviction,
        status: form.status,
        decision: form.decision
      } : a));
      setEditingId(null);
    } else {
      setApplicants(prev => [
        ...prev,
        {
          id: String(Date.now()),
          applicant: form.applicant,
          creditScore: Number(form.creditScore) || 600,
          background: form.background,
          income: form.income || 'Verified',
          eviction: form.eviction,
          status: form.status,
          decision: form.decision,
          date: new Date().toISOString().split('T')[0]
        }
      ]);
    }

    setForm({ applicant: '', creditScore: '', background: 'Clean', income: '', eviction: 'No Record', status: 'Employed', decision: 'Approved' });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenant Screening Directory"
        description="Verify credit score, rental history background checks, and employment details of lease applicants."
        breadcrumbs={[{ label: 'Leasing', href: '/leasing' }, { label: 'Screening' }]}
        action={{
          label: editingId ? 'Edit Screening' : 'New Screening Check',
          onClick: () => {
            if (showForm) {
              setEditingId(null);
              setForm({ applicant: '', creditScore: '', background: 'Clean', income: '', eviction: 'No Record', status: 'Employed', decision: 'Approved' });
            }
            setShowForm(!showForm);
          },
          icon: <Plus className="w-4 h-4" />
        }}
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 shadow-sm space-y-4 max-w-xl">
          <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">
            {editingId ? 'Modify Screening Check Details' : 'Create New Tenant Screening Check'}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Applicant Name</label>
              <input
                required
                value={form.applicant}
                onChange={e => setForm(prev => ({ ...prev, applicant: e.target.value }))}
                placeholder="e.g. John Doe"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Credit Score</label>
              <input
                type="number"
                required
                value={form.creditScore}
                onChange={e => setForm(prev => ({ ...prev, creditScore: e.target.value }))}
                placeholder="e.g. 720"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Employment Status</label>
              <input
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                placeholder="e.g. Employed"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Background Check</label>
              <select
                value={form.background}
                onChange={e => setForm(prev => ({ ...prev, background: e.target.value }))}
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
              >
                <option>Clean</option>
                <option>Alert Raised</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Income status (e.g. Verified ($5k/mo))</label>
              <input
                value={form.income}
                onChange={e => setForm(prev => ({ ...prev, income: e.target.value }))}
                placeholder="e.g. Verified ($4k/mo)"
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Eviction Records</label>
              <select
                value={form.eviction}
                onChange={e => setForm(prev => ({ ...prev, eviction: e.target.value }))}
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
              >
                <option>No Record</option>
                <option>Record Found</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Decision Status</label>
              <select
                value={form.decision}
                onChange={e => setForm(prev => ({ ...prev, decision: e.target.value }))}
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
              >
                <option>Approved</option>
                <option>Rejected</option>
                <option>Pending</option>
              </select>
            </div>
          </div>
          <div className="border-t pt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
            <Button type="submit">{editingId ? 'Update Screening' : 'Add Screening'}</Button>
          </div>
        </form>
      )}

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">Applicant</th>
                <th className="p-4">Credit Score</th>
                <th className="p-4">Background check</th>
                <th className="p-4">Income Status</th>
                <th className="p-4">Eviction records</th>
                <th className="p-4">Employment</th>
                <th className="p-4">Decision</th>
                <th className="p-4">Completed Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {applicants.map((a) => (
                <tr key={a.id} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-bold text-primary">{a.applicant}</td>
                  <td className="p-4 font-bold font-mono">{a.creditScore}</td>
                  <td className="p-4"><StatusBadge status={a.background} /></td>
                  <td className="p-4 font-bold">{a.income}</td>
                  <td className="p-4 font-semibold">{a.eviction}</td>
                  <td className="p-4">{a.status}</td>
                  <td className="p-4">
                    <StatusBadge status={a.decision} />
                  </td>
                  <td className="p-4 text-muted-foreground font-mono">{a.date}</td>
                  <td className="p-4 text-right space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)} className="text-rose-500 hover:text-rose-600"><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 5. ACCOUNTING TRUST ACCOUNTS
const TrustAccountsPage: React.FC = () => {
  const accounts = [
    { name: 'Tenant Security Deposit Trust', bank: 'Chase Bank', num: '••••4882', balance: 48500, status: 'Active' },
    { name: 'Owner Operations Distribution Escrow', bank: 'Wells Fargo', num: '••••9920', balance: 120500, status: 'Active' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trust Accounts Ledger"
        description="Fiduciary management of security deposits and owner operations reserves escrow accounts."
        breadcrumbs={[{ label: 'Accounting', href: '/accounting' }, { label: 'Trust Accounts' }]}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">Account Name</th>
                <th className="p-4">Bank Name</th>
                <th className="p-4">Account Number</th>
                <th className="p-4">Current Escrow Balance</th>
                <th className="p-4">Fiduciary Status</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {accounts.map((a, i) => (
                <tr key={i} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-bold">{a.name}</td>
                  <td className="p-4 font-bold text-primary">{a.bank}</td>
                  <td className="p-4 font-mono text-muted-foreground">{a.num}</td>
                  <td className="p-4 font-extrabold text-emerald-500">${a.balance.toLocaleString()}</td>
                  <td className="p-4"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 6. LATE FEES CONFIG
const LateFeesPage: React.FC = () => {
  const [graceDays, setGraceDays] = React.useState<number>(10);
  const [lateFeeAmount, setLateFeeAmount] = React.useState<number>(50);
  const [lateFeeType, setLateFeeType] = React.useState<string>('FLAT');
  const [isLateFeeEnabled, setIsLateFeeEnabled] = React.useState<boolean>(true);
  
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [msg, setMsg] = React.useState<string>('');

  // Backup state for cancel
  const [backupState, setBackupState] = React.useState<any>(null);

  React.useEffect(() => {
    api.company.getSettings().then((s: any) => {
      if (s) {
        if (s.lateFeeGraceDays !== undefined) setGraceDays(s.lateFeeGraceDays);
        if (s.lateFeeAmount !== undefined) setLateFeeAmount(s.lateFeeAmount);
        if (s.lateFeeType !== undefined) setLateFeeType(s.lateFeeType);
        if (s.isLateFeeEnabled !== undefined) setIsLateFeeEnabled(s.isLateFeeEnabled);
      }
    }).catch(console.error);
  }, []);

  const handleStartEdit = () => {
    setBackupState({ graceDays, lateFeeAmount, lateFeeType, isLateFeeEnabled });
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (backupState) {
      setGraceDays(backupState.graceDays);
      setLateFeeAmount(backupState.lateFeeAmount);
      setLateFeeType(backupState.lateFeeType);
      setIsLateFeeEnabled(backupState.isLateFeeEnabled);
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const updated = await api.company.updateSettings({
        lateFeeGraceDays: graceDays,
        lateFeeAmount,
        lateFeeType,
        isLateFeeEnabled,
      });

      if (updated) {
        if (updated.lateFeeGraceDays !== undefined) setGraceDays(updated.lateFeeGraceDays);
        if (updated.lateFeeAmount !== undefined) setLateFeeAmount(updated.lateFeeAmount);
        if (updated.lateFeeType !== undefined) setLateFeeType(updated.lateFeeType);
        if (updated.isLateFeeEnabled !== undefined) setIsLateFeeEnabled(updated.isLateFeeEnabled);
      }

      setIsEditing(false); // Mute back to read-only mode after save
      setMsg(`Late Fee Policy saved successfully! Inputs are now locked (Muted).`);
      setTimeout(() => setMsg(''), 4000);
    } catch (e: any) {
      alert('Error saving policy: ' + (e?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-foreground">
      <PageHeader
        title="Late Fee Configuration"
        description="Configure company-wide late payment fees rules, structures, and grace period settings."
        breadcrumbs={[{ label: 'Company Settings', href: '/admin/company-settings' }, { label: 'Late Fees' }]}
      />

      {msg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-semibold flex items-center justify-between">
          <span>{msg}</span>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide flex items-center gap-2">
              Company Late Fee Policy Settings
              {isEditing ? (
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase font-bold">
                  Editing Mode
                </span>
              ) : (
                <span className="text-[10px] bg-secondary text-muted-foreground border border-border px-2 py-0.5 rounded-full uppercase font-bold">
                  Locked (Muted)
                </span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button
                onClick={handleStartEdit}
                variant="outline"
                className="text-xs font-bold border-primary text-primary hover:bg-primary/10 flex items-center gap-1.5"
              >
                ✏️ Edit Policy
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Grace Period (Days)</label>
            <input
              type="number"
              min="0"
              max="90"
              disabled={!isEditing}
              value={graceDays}
              onChange={(e) => setGraceDays(parseInt(e.target.value) || 0)}
              className="w-full p-2.5 rounded border bg-background font-bold text-sm disabled:bg-secondary/40 disabled:text-muted-foreground disabled:cursor-not-allowed disabled:border-border/30 transition"
              placeholder="e.g. 10"
            />
            <p className="text-[10px] text-muted-foreground">Number of days after due date before late fee is applied (Default: 10 days)</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Late Fee Amount</label>
            <input
              type="number"
              min="0"
              disabled={!isEditing}
              value={lateFeeAmount}
              onChange={(e) => setLateFeeAmount(parseFloat(e.target.value) || 0)}
              className="w-full p-2.5 rounded border bg-background font-bold text-sm disabled:bg-secondary/40 disabled:text-muted-foreground disabled:cursor-not-allowed disabled:border-border/30 transition"
              placeholder="50"
            />
            <p className="text-[10px] text-muted-foreground">Fee charged per overdue invoice</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Late Fee Type</label>
            <select
              disabled={!isEditing}
              value={lateFeeType}
              onChange={(e) => setLateFeeType(e.target.value)}
              className="w-full p-2.5 rounded border bg-background font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-secondary/40 disabled:text-muted-foreground disabled:cursor-not-allowed disabled:border-border/30 transition"
            >
              <option value="FLAT">Flat Fee ($)</option>
              <option value="PERCENTAGE">Percentage of Rent (%)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Automation Status</label>
            <select
              disabled={!isEditing}
              value={isLateFeeEnabled ? 'ENABLED' : 'DISABLED'}
              onChange={(e) => setIsLateFeeEnabled(e.target.value === 'ENABLED')}
              className="w-full p-2.5 rounded border bg-background font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-secondary/40 disabled:text-muted-foreground disabled:cursor-not-allowed disabled:border-border/30 transition"
            >
              <option value="ENABLED">Active (Auto-Apply after Grace Period)</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>
        </div>

        <div className="border-t pt-4 flex justify-between items-center">
          <span className="text-xs font-semibold text-muted-foreground">
            Current Rule: <strong className="text-foreground">{isLateFeeEnabled ? `Apply $${lateFeeAmount} after ${graceDays} Days` : 'Disabled'}</strong>
          </span>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={loading}
                  className="text-xs font-bold text-muted-foreground border-border hover:bg-secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="font-bold bg-primary text-white hover:bg-primary/95 text-xs h-9 px-4"
                >
                  {loading ? 'Saving...' : 'Save Late Fee Policy'}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleStartEdit}
                className="font-bold bg-primary text-white hover:bg-primary/95 text-xs h-9 px-4"
              >
                ✏️ Edit Policy
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};



// 8. OWNERS STATEMENTS PAGE
const OwnersStatementsPage: React.FC = () => {
  const { t } = useTranslation();
  const statements = [
    { date: '2026-06-30', property: 'Sunset Villas Complex', income: 14500, expenses: 3200, net: 11300, status: 'Sent' },
    { date: '2026-05-31', property: 'Sunset Villas Complex', income: 14500, expenses: 4500, net: 10000, status: 'Sent' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('ownersStatementsView.title')}
        description={t('ownersStatementsView.description')}
        breadcrumbs={[{ label: t('nav.owners'), href: '/owners' }, { label: t('ownersStatementsView.breadcrumb') }]}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">{t('ownersStatementsView.table.periodDate')}</th>
                <th className="p-4">{t('ownersStatementsView.table.property')}</th>
                <th className="p-4">{t('ownersStatementsView.table.grossIncome')}</th>
                <th className="p-4">{t('ownersStatementsView.table.expenses')}</th>
                <th className="p-4">{t('ownersStatementsView.table.netIncome')}</th>
                <th className="p-4">{t('ownersStatementsView.table.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {statements.map((s, i) => (
                <tr key={i} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-mono font-bold">{s.date}</td>
                  <td className="p-4 font-bold text-primary">{s.property}</td>
                  <td className="p-4 text-emerald-500 font-bold">${s.income.toLocaleString()}</td>
                  <td className="p-4 text-rose-500 font-bold">-${s.expenses.toLocaleString()}</td>
                  <td className="p-4 font-extrabold text-blue-500">${s.net.toLocaleString()}</td>
                  <td className="p-4"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 8a. RENT ROLL REPORT
const RentRollReportPage: React.FC = () => {
  const { t } = useTranslation();
  const data = [
    { unit: 'Apt 101', tenant: 'Robert Johnson', rent: 1200, start: '2025-08-01', end: '2026-07-31', balance: 0 },
    { unit: 'Apt 102', tenant: 'Michael Jordan', rent: 1850, start: '2026-02-15', end: '2027-02-14', balance: 1850 },
    { unit: 'Apt 201', tenant: 'Sarah Connor', rent: 1500, start: '2026-01-01', end: '2026-12-31', balance: 0 }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('rentRollReportView.title')}
        description={t('rentRollReportView.description')}
        breadcrumbs={[{ label: t('nav.reports'), href: '/reports' }, { label: t('rentRollReportView.breadcrumb') }]}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">{t('rentRollReportView.table.unit')}</th>
                <th className="p-4">{t('rentRollReportView.table.tenant')}</th>
                <th className="p-4">{t('rentRollReportView.table.monthlyRent')}</th>
                <th className="p-4">{t('rentRollReportView.table.start')}</th>
                <th className="p-4">{t('rentRollReportView.table.end')}</th>
                <th className="p-4">{t('rentRollReportView.table.balance')}</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-bold text-primary">{r.unit}</td>
                  <td className="p-4 font-bold">{r.tenant}</td>
                  <td className="p-4 font-bold">${r.rent.toLocaleString()}</td>
                  <td className="p-4 font-mono text-muted-foreground">{r.start}</td>
                  <td className="p-4 font-mono text-muted-foreground">{r.end}</td>
                  <td className="p-4 font-extrabold text-rose-500">${r.balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 8b. OCCUPANCY REPORT
const OccupancyReportPage: React.FC = () => {
  const { t } = useTranslation();
  const data = [
    { property: 'Sunset Villas Complex', total: 40, occupied: 38, vacant: 2, rate: '95%' },
    { property: 'Summit Group Commercial Loft', total: 10, occupied: 7, vacant: 3, rate: '70%' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('occupancyReportView.title')}
        description={t('occupancyReportView.description')}
        breadcrumbs={[{ label: t('nav.reports'), href: '/reports' }, { label: t('occupancyReportView.breadcrumb') }]}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">{t('occupancyReportView.table.property')}</th>
                <th className="p-4">{t('occupancyReportView.table.total')}</th>
                <th className="p-4">{t('occupancyReportView.table.occupied')}</th>
                <th className="p-4">{t('occupancyReportView.table.vacant')}</th>
                <th className="p-4">{t('occupancyReportView.table.rate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-bold text-primary">{r.property}</td>
                  <td className="p-4 font-bold">{r.total}</td>
                  <td className="p-4 text-emerald-500 font-bold">{r.occupied}</td>
                  <td className="p-4 text-rose-500 font-bold">{r.vacant}</td>
                  <td className="p-4 font-extrabold text-blue-500">{r.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 8c. DELINQUENCY REPORT
const DelinquencyReportPage: React.FC = () => {
  const { t } = useTranslation();
  const data = [
    { tenant: 'Michael Jordan', unit: 'Apt 102', overdue: 1850, days: 5, status: 'Overdue' },
    { tenant: 'Brittany Spears', unit: 'Apt 204', overdue: 950, days: 12, status: 'Delinquent' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('delinquencyReportView.title')}
        description={t('delinquencyReportView.description')}
        breadcrumbs={[{ label: t('nav.reports'), href: '/reports' }, { label: t('delinquencyReportView.breadcrumb') }]}
      />
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">{t('delinquencyReportView.table.tenant')}</th>
                <th className="p-4">{t('delinquencyReportView.table.unit')}</th>
                <th className="p-4">{t('delinquencyReportView.table.balance')}</th>
                <th className="p-4">{t('delinquencyReportView.table.days')}</th>
                <th className="p-4">{t('delinquencyReportView.table.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-bold">{r.tenant}</td>
                  <td className="p-4 font-bold text-primary">{r.unit}</td>
                  <td className="p-4 font-extrabold text-rose-500">${r.overdue.toLocaleString()}</td>
                  <td className="p-4 font-bold text-rose-600">{r.days} Days</td>
                  <td className="p-4"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const WordPressInquiriesPage: React.FC = () => {
  const [inquiries, setInquiries] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const fetchInquiries = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.superadmin.getWordPressInquiries();
      setInquiries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.superadmin.createWordPressInquiry(formData);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      fetchInquiries();
    } catch (err: any) {
      alert(err.message || 'Failed to submit test inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = inquiries.filter((inq: any) => {
    const search = searchQuery.toLowerCase();
    return (
      inq.name.toLowerCase().includes(search) ||
      inq.email.toLowerCase().includes(search) ||
      inq.phone.toLowerCase().includes(search) ||
      (inq.subject && inq.subject.toLowerCase().includes(search)) ||
      inq.message.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="WordPress Form Inquiries"
          description="Inquiries received from your WordPress website contact form. Live testing is active."
        />
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Test Inquiry
          </Button>
          <Button 
            variant="outline" 
            onClick={fetchInquiries} 
            disabled={loading}
            className="flex items-center gap-1 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/60 flex items-center justify-between gap-4">
          <Input
            placeholder="Search inquiries by name, email, phone, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md bg-background/50"
          />
          <div className="text-xs text-muted-foreground font-bold">
            Total submissions: {filtered.length}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
            Loading WordPress inquiries...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs font-semibold text-muted-foreground">
            No inquiries found. Submit data from your WordPress form to test the integration.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-wide">Sender Name</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-wide">Email Address</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-wide">Phone Number</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-wide">Subject</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-wide">Message</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-wide">Received At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((inq: any) => (
                  <tr key={inq.id} className="hover:bg-accent/20 transition-all">
                    <td className="p-4 font-bold text-foreground">{inq.name}</td>
                    <td className="p-4 font-bold text-primary">{inq.email}</td>
                    <td className="p-4 font-mono text-muted-foreground">{inq.phone}</td>
                    <td className="p-4 font-semibold text-foreground">{inq.subject || 'N/A'}</td>
                    <td className="p-4 max-w-xs truncate text-muted-foreground" title={inq.message}>{inq.message}</td>
                    <td className="p-4 font-mono text-muted-foreground">
                      {new Date(inq.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MOCK INQUIRY DIALOG */}
      <FormDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Add WordPress Test Inquiry"
        description="Simulate a form submission to verify database insertion and live API connectivity."
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Name *</label>
            <Input 
              required 
              placeholder="E.g., Jane Doe" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Email *</label>
            <Input 
              required 
              type="email" 
              placeholder="E.g., janedoe@example.com" 
              value={formData.email} 
              onChange={e => setFormData({ ...formData, email: e.target.value })} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Phone Number *</label>
            <Input 
              required 
              placeholder="E.g., +1 (555) 0199" 
              value={formData.phone} 
              onChange={e => setFormData({ ...formData, phone: e.target.value })} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Subject</label>
            <Input 
              placeholder="E.g., Pricing Inquiry" 
              value={formData.subject} 
              onChange={e => setFormData({ ...formData, subject: e.target.value })} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Message *</label>
            <textarea 
              required
              rows={4}
              placeholder="Enter message details here..." 
              value={formData.message} 
              onChange={e => setFormData({ ...formData, message: e.target.value })} 
              className="w-full text-xs p-3 rounded-lg border border-border bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Submit Form
            </Button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
};

// --- ROUTE INSTANTIATIONS FOR NEW VIEWS ---
const wordpressInquiriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/superadmin/wordpress-inquiries',
  component: () => (<ProtectedWrapper><WordPressInquiriesPage /></ProtectedWrapper>),
});

const companiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/companies',
  component: () => (<ProtectedWrapper><CompaniesPage /></ProtectedWrapper>),
});
const newCompanyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/companies/new',
  component: () => (<ProtectedWrapper><NewCompanyPage /></ProtectedWrapper>),
});
const editCompanyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/companies/edit',
  component: () => (<ProtectedWrapper><EditCompanyPage /></ProtectedWrapper>),
});
const companyDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/companies/details',
  component: () => (<ProtectedWrapper><CompanyDetailsPage /></ProtectedWrapper>),
});
const companyUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/companies/users',
  component: () => (<ProtectedWrapper><CompanyUsersPage /></ProtectedWrapper>),
});
const companySubscriptionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/companies/subscription',
  component: () => (<ProtectedWrapper><CompanySubscriptionPage /></ProtectedWrapper>),
});
const companyUsageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/companies/usage',
  component: () => (<ProtectedWrapper><CompanyUsagePage /></ProtectedWrapper>),
});
const subscriptionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/subscriptions',
  component: () => (<ProtectedWrapper><SubscriptionPlansPage /></ProtectedWrapper>),
});
const subscriptionsPlansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/subscriptions/plans',
  component: () => (<ProtectedWrapper><SubscriptionPlansPage /></ProtectedWrapper>),
});
const subscriptionsActiveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/subscriptions/active',
  component: () => (<ProtectedWrapper><ActiveSubscriptionsPage /></ProtectedWrapper>),
});
const subscriptionsInvoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/subscriptions/invoices',
  component: () => (<ProtectedWrapper><SubscriptionInvoicesPage /></ProtectedWrapper>),
});
const subscriptionsPaymentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/subscriptions/payments',
  component: () => (<ProtectedWrapper><SubscriptionPaymentsPage /></ProtectedWrapper>),
});
const subscriptionsCouponsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/subscriptions/coupons',
  component: () => (<ProtectedWrapper><SubscriptionCouponsPage /></ProtectedWrapper>),
});
const platformUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/platform-users',
  component: () => (<ProtectedWrapper><PlatformUsersPage /></ProtectedWrapper>),
});
const supportTicketsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/support/tickets',
  component: () => (<ProtectedWrapper><SupportTicketsPage /></ProtectedWrapper>),
});
const supportFeedbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/support/feedback',
  component: () => (<ProtectedWrapper><SupportFeedbackPage /></ProtectedWrapper>),
});
const supportContactRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/support/contact-requests',
  component: () => (<ProtectedWrapper><SupportContactPage /></ProtectedWrapper>),
});
const platformSettingsGeneralRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/platform-settings/general',
  component: () => (<ProtectedWrapper><PlatformSettingsGeneralView /></ProtectedWrapper>),
});
const platformSettingsEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/platform-settings/email',
  component: () => (<ProtectedWrapper><PlatformSettingsEmailView /></ProtectedWrapper>),
});
const platformSettingsStorageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/platform-settings/storage',
  component: () => (<ProtectedWrapper><PlatformSettingsStorageView /></ProtectedWrapper>),
});
const platformSettingsBrandingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/platform-settings/branding',
  component: () => (<ProtectedWrapper><PlatformSettingsBrandingView /></ProtectedWrapper>),
});
const platformIntegrationsConnectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/platform-integrations/connected',
  component: () => (<ProtectedWrapper><PlatformIntegrationsConnectedView /></ProtectedWrapper>),
});
const platformIntegrationsKeysRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/platform-integrations/keys',
  component: () => (<ProtectedWrapper><PlatformIntegrationsKeysView /></ProtectedWrapper>),
});
const platformIntegrationsWebhooksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/platform-integrations/webhooks',
  component: () => (<ProtectedWrapper><PlatformIntegrationsWebhooksView /></ProtectedWrapper>),
});
const platformSecurityAuditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/platform-security/audit',
  component: () => (<ProtectedWrapper><PlatformSecurityAuditView /></ProtectedWrapper>),
});
const platformSecurityLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/platform-security/login-history',
  component: () => (<ProtectedWrapper><PlatformSecurityLoginView /></ProtectedWrapper>),
});
const platformSecurityPoliciesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/platform-security/policies',
  component: () => (<ProtectedWrapper><PlatformSecurityPoliciesView /></ProtectedWrapper>),
});
const platformAnalyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/platform-analytics',
  component: () => (<ProtectedWrapper><SuperAdminDashboardPage /></ProtectedWrapper>),
});
const amenitiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/properties/amenities',
  component: () => (<ProtectedWrapper><AmenitiesPage /></ProtectedWrapper>),
});
const floorPlansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/properties/floor-plans',
  component: () => (<ProtectedWrapper><FloorPlansPage /></ProtectedWrapper>),
});
const screeningRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leasing/screening',
  component: () => (<ProtectedWrapper><TenantScreeningPage /></ProtectedWrapper>),
});
const moveInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leasing/move-in',
  component: () => (<ProtectedWrapper><MoveInOutPage /></ProtectedWrapper>),
});
const inspectionTemplatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leasing/inspection-templates',
  component: () => (<ProtectedWrapper><InspectionTemplatesPage /></ProtectedWrapper>),
});
const moveInDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leasing/move-in/$id',
  component: () => {
    const { id } = moveInDetailRoute.useParams();
    return (<ProtectedWrapper><MoveInDetailPage id={id} /></ProtectedWrapper>);
  },
});
const inspectionScreenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leasing/inspections/$id',
  component: () => {
    const { id } = inspectionScreenRoute.useParams();
    return (<ProtectedWrapper><InspectionScreen id={id} /></ProtectedWrapper>);
  },
});
const moveOutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leasing/move-out',
  component: () => (<ProtectedWrapper><MoveOutRegistryPage /></ProtectedWrapper>),
});
const moveOutDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leasing/move-out/$id',
  component: () => {
    const { id } = moveOutDetailRoute.useParams();
    return (<ProtectedWrapper><MoveOutDetailPage id={id} /></ProtectedWrapper>);
  },
});
const damageReviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leasing/damage-review/$id',
  component: () => {
    const { id } = damageReviewRoute.useParams();
    return (<ProtectedWrapper><DamageReviewPage id={id} /></ProtectedWrapper>);
  },
});
const managerTenantDocumentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenants/documents',
  component: () => (<ProtectedWrapper><ManagerTenantDocumentsPage /></ProtectedWrapper>),
});
const ownersStatementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/owners/statements',
  component: () => (<ProtectedWrapper><OwnersStatementsPage /></ProtectedWrapper>),
});
const lateFeesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rent/late-fees',
  component: () => (<ProtectedWrapper><LateFeesPage /></ProtectedWrapper>),
});
const adminLateFeesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/late-fees',
  component: () => (<ProtectedWrapper><LateFeesPage /></ProtectedWrapper>),
});
const trustAccountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting/trust-accounts',
  component: () => (<ProtectedWrapper><TrustAccountsPage /></ProtectedWrapper>),
});
const rentRollReportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/rent-roll',
  component: () => (<ProtectedWrapper><RentRollReportPage /></ProtectedWrapper>),
});
const occupancyReportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/occupancy',
  component: () => (<ProtectedWrapper><OccupancyReportPage /></ProtectedWrapper>),
});
const delinquencyReportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/delinquency',
  component: () => (<ProtectedWrapper><DelinquencyReportPage /></ProtectedWrapper>),
});

// --- REGISTER TREE ---
const routeTree = rootRoute.addChildren([
  indexRoute,
  profileRoute,
  landingRoute,
  loginRoute,
  forgotPasswordRoute,
  resetPasswordRoute,

  // Super Admin Routes
  wordpressInquiriesRoute,
  companiesRoute,
  newCompanyRoute,
  editCompanyRoute,
  companyDetailsRoute,
  companyUsersRoute,
  companySubscriptionRoute,
  companyUsageRoute,
  subscriptionsRoute,
  subscriptionsPlansRoute,
  subscriptionsActiveRoute,
  subscriptionsInvoicesRoute,
  subscriptionsPaymentsRoute,
  subscriptionsCouponsRoute,
  platformUsersRoute,
  supportTicketsRoute,
  supportFeedbackRoute,
  supportContactRoute,
  platformSettingsGeneralRoute,
  platformSettingsEmailRoute,
  platformSettingsStorageRoute,
  platformSettingsBrandingRoute,
  platformIntegrationsConnectedRoute,
  platformIntegrationsKeysRoute,
  platformIntegrationsWebhooksRoute,
  platformSecurityAuditRoute,
  platformSecurityLoginRoute,
  platformSecurityPoliciesRoute,
  platformAnalyticsRoute,

  // Properties Manager Additions
  amenitiesRoute,
  floorPlansRoute,
  screeningRoute,
  moveInRoute,
  moveInDetailRoute,
  inspectionTemplatesRoute,
  inspectionScreenRoute,
  moveOutRoute,
  moveOutDetailRoute,
  damageReviewRoute,
  managerTenantDocumentsRoute,
  ownersStatementsRoute,
  lateFeesRoute,
  adminLateFeesRoute,
  trustAccountsRoute,
  rentRollReportRoute,
  occupancyReportRoute,
  delinquencyReportRoute,

  // Properties
  propertiesRoute,
  newPropertyRoute,
  editPropertyRoute,
  propertyDetailsRoute,
  draftPropertiesRoute,
  buildingsRoute,
  unitsRoute,
  newUnitRoute,
  unitDetailsRoute,
  editUnitRoute,
  editUnitAltRoute,

  // Tenants
  tenantsRoute,
  activeTenantsRoute,
  formerTenantsRoute,
  portalPreviewRoute,
  newTenantRoute,
  editTenantRoute,
  tenantDetailsRoute,

  // Leasing
  leasesRoute,
  newLeaseRoute,
  leaseDetailsRoute,
  renewalsRoute,
  applicationsRoute,
  newApplicationRoute,
  applicantScreeningWizardRoute,

  // CRM
  crmDashboardRoute,
  leadsRoute,
  newLeadRoute,
  leadDetailsRoute,

  // Rent Collection (Phase 4)
  rentDashboardRoute,
  paymentsRoute,
  newPaymentRoute,
  paymentDetailsRoute,
  rentLedgerRoute,
  invoicesRoute,
  newInvoiceRoute,
  chargesRoute,
  depositsRoute,
  paymentPlansRoute,
  newPaymentPlanRoute,
  refundsRoute,
  paymentMethodsRoute,

  // Other
  ownersRoute,
  accountingRoute,
  coaRoute,
  journalEntriesRoute,
  generalLedgerRoute,
  incomeRoute,
  expensesRoute,
  vendorBillsRoute,
  recurringTransactionsRoute,
  bankAccountsRoute,
  bankReconciliationRoute,
  budgetsRoute,
  ownerStatementsRoute,
  taxesRoute,
  financialReportsRoute,
  yearEndRoute,

  // Owner Portal (Phase 7)
  ownerDashboardRoute,
  ownerPropertiesRoute,
  ownerFinancialsRoute,
  ownerPortalStatementsRoute,
  ownerDistributionsRoute,
  ownerMaintenanceRoute,
  ownerDocumentsRoute,
  ownerMessagesRoute,
  ownerReportsRoute,
  ownerProfileRoute,
  ownerSupportRoute,

  // Tenant Portal (Phase 8)
  tenantDashboardRoute,
  tenantHomeRoute,
  tenantLeaseRoute,
  tenantPaymentsRoute,
  tenantMaintenanceRoute,
  tenantDocumentsRoute,
  tenantMessagesRoute,
  tenantAnnouncementsRoute,
  tenantVisitorsRoute,
  tenantPackagesRoute,
  tenantInsuranceRoute,
  tenantProfileRoute,
  tenantSettingsRoute,
  tenantSupportRoute,
  tenantNotificationsRoute,
  tenantPaymentsHistoryRoute,
  staffMaintenanceRoute,
  staffDashboardRoute,
  staffTasksRoute,
  staffCompletedTasksRoute,
  staffProfileRoute,
  staffTaskDetailsRoute,
  maintenanceRoute,
  requestsRoute,
  newRequestRoute,
  requestDetailsRoute,
  workOrdersRoute,
  workOrderDetailsRoute,
  violationsRoute,
  preventiveRoute,
  assetsRoute,
  inventoryRoute,
  vendorsRoute,
  vendorInvoicesRoute,
  inspectionsRoute,
  newInspectionRoute,
  maintenanceCalendarRoute,
  maintenanceReportsRoute,
  documentsRoute,
  docsAllRoute,
  docsFoldersRoute,
  docsUploadRoute,
  docsSignaturesRoute,
  docsSharedRoute,
  docsTemplatesRoute,
  docsVersionsRoute,
  docsRequestsRoute,
  docsPermissionsRoute,
  docsAuditRoute,
  docsArchiveRoute,
  docsSettingsRoute,
  reportsRoute,
  reportsExecutiveRoute,
  reportsDashboardsRoute,
  reportsPropertiesRoute,
  reportsFinancialRoute,
  reportsTenantsRoute,
  reportsLeasingRoute,
  reportsMaintenanceRoute,
  reportsOwnersRoute,
  reportsExplorerRoute,
  reportsCustomRoute,
  reportsSavedRoute,
  reportsScheduledRoute,
  reportsForecastRoute,
  reportsExportsRoute,
  reportsSettingsRoute,
  commDashboardRoute,
  commInboxRoute,
  commConversationsRoute,
  commEmailRoute,
  commSMSRoute,
  commAnnouncementsRoute,
  commCampaignsRoute,
  commTemplatesRoute,
  commContactsRoute,
  commNotificationsRoute,
  notificationsRoute,
  commScheduledRoute,
  commActivityRoute,
  commSettingsRoute,
  aiAssistantRoute,
  aiSettingsRoute,
  adminDashboardRoute,
  adminCompanySettingsRoute,
  adminUnitDeletionRoute,
  adminUsersRoute,
  adminTeamsRoute,
  adminRolesRoute,
  adminTemplatesRoute,
  adminPropertiesSettingsRoute,
  adminFinancialRoute,
  adminPaymentSettingsRoute,
  adminNotificationsRoute,
  adminIntegrationsRoute,
  adminApiRoute,
  adminWebhooksRoute,
  adminSecurityRoute,
  adminAuditRoute,
  adminActivityRoute,
  adminBillingRoute,
  adminPreferencesRoute,
  settingsRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

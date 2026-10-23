import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore, useThemeStore } from './store/useStore';
import { Ionicons } from '@expo/vector-icons';

LogBox.ignoreLogs([
  'Cannot connect to Expo CLI.',
  'Cannot connect to Expo CLI',
  'Non-serializable values were found in the navigation state',
]);

import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './screens/LoginScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';

import { AdminDashboard } from './screens/AdminDashboard';
import { ManagerDashboard } from './screens/ManagerDashboard';
import { CollectionDashboard } from './screens/CollectionDashboard';
import { StaffDashboard } from './screens/StaffDashboard';
import { OwnerDashboard } from './screens/OwnerDashboard';
import { TenantDashboard } from './screens/TenantDashboard';
import { MaintenanceStaffDashboard } from './screens/MaintenanceStaffDashboard';

import { PropertiesScreen } from './screens/PropertiesScreen';
import { LeadsScreen } from './screens/LeadsScreen';
import { TenantsScreen } from './screens/TenantsScreen';
import { InspectionDetailsScreen } from './screens/InspectionDetailsScreen';
import { RentScreen } from './screens/RentScreen';
import { MaintenanceScreen } from './screens/MaintenanceScreen';
import { CompaniesScreen } from './screens/CompaniesScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TenantLeaseScreen } from './screens/TenantLeaseScreen';
import { SubscriptionsScreen } from './screens/SubscriptionsScreen';
import { PlatformUsersScreen } from './screens/PlatformUsersScreen';
import { TenantNotificationsScreen } from './screens/TenantNotificationsScreen';
import { TenantMessagesScreen } from './screens/TenantMessagesScreen';
import { TenantDocumentsScreen } from './screens/TenantDocumentsScreen';
import { StatementsScreen } from './screens/StatementsScreen';
import { DistributionsScreen } from './screens/DistributionsScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { InvoicesScreen } from './screens/InvoicesScreen';
import { TenantLedgerScreen } from './screens/TenantLedgerScreen';
import { TenantServicesScreen } from './screens/TenantServicesScreen';
import { TenantMaintenanceScreen } from './screens/TenantMaintenanceScreen';
import { TenantProfileScreen } from './screens/TenantProfileScreen';
import { OwnerFinancialsScreen } from './screens/OwnerFinancialsScreen';
import { OwnerMaintenanceScreen } from './screens/OwnerMaintenanceScreen';
import { OwnerReportsScreen } from './screens/OwnerReportsScreen';
import { OwnerPropertiesScreen } from './screens/OwnerPropertiesScreen';
import { OwnerServicesScreen } from './screens/OwnerServicesScreen';
import { ManagerServicesScreen } from './screens/ManagerServicesScreen';
import { IntegrationsScreen } from './screens/IntegrationsScreen';
import { AIAssistantScreen } from './screens/AIAssistantScreen';
import { ManagerCommunicationScreen } from './screens/ManagerCommunicationScreen';
import { ManagerAccountingScreen } from './screens/ManagerAccountingScreen';
import { ManagerRentPaymentsScreen } from './screens/ManagerRentPaymentsScreen';
import { OwnersScreen } from './screens/OwnersScreen';
import { WordPressInquiriesScreen } from './screens/WordPressInquiriesScreen';
import { PlatformSettingsScreen } from './screens/PlatformSettingsScreen';
import { InspectionTemplatesScreen } from './screens/InspectionTemplatesScreen';
import { RolesPermissionsScreen } from './screens/RolesPermissionsScreen';
import { CompanySettingsScreen } from './screens/CompanySettingsScreen';

export default function App() {
  const { user, isAuthenticated, isLoaded, initializeAuth } = useAuthStore();
  const { theme, language } = useThemeStore();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState(null);
  const [currentInspectionId, setCurrentInspectionId] = useState(null);

  const handleNavigate = (tabId, paramsOrSubTab) => {
    let subTab = typeof paramsOrSubTab === 'string' ? paramsOrSubTab : paramsOrSubTab?.tab || null;

    if (tabId === 'inspection' && paramsOrSubTab && paramsOrSubTab.inspectionId) {
      setCurrentInspectionId(paramsOrSubTab.inspectionId);
    }

    // Direct route & sub-tab normalization
    switch (tabId) {
      case 'units':
      case 'drafts':
        setActiveTab('properties');
        setActiveSubTab(tabId);
        break;

      case 'properties':
        setActiveTab('properties');
        setActiveSubTab(subTab || 'properties');
        break;

      case 'leads':
      case 'applications':
      case 'screening':
      case 'leases':
      case 'leasing':
      case 'renewals':
      case 'movein':
      case 'moveout':
        setActiveTab('leads');
        setActiveSubTab(subTab || (tabId === 'leasing' ? 'leases' : tabId));
        break;

      case 'payments':
      case 'invoices':
      case 'rent-ledger':
      case 'ledger':
        setActiveTab('rent');
        setActiveSubTab(tabId === 'rent-ledger' ? 'ledger' : tabId);
        break;

      case 'rent':
      case 'rent-dashboard':
        setActiveTab('rent');
        setActiveSubTab(subTab || 'dashboard');
        break;

      case 'chart-of-accounts':
      case 'income':
      case 'expenses':
        setActiveTab('accounting');
        setActiveSubTab(tabId === 'chart-of-accounts' ? 'coa' : tabId);
        break;

      case 'accounting':
        setActiveTab('accounting');
        setActiveSubTab(subTab || 'dashboard');
        break;

      case 'requests':
      case 'maintenance-requests':
      case 'work-orders':
      case 'violations':
      case 'vendors':
        setActiveTab('maintenance');
        setActiveSubTab(tabId === 'vendors' ? 'staff' : tabId === 'work-orders' ? 'work_orders' : tabId);
        break;

      case 'maintenance':
        setActiveTab('maintenance');
        setActiveSubTab(subTab || 'requests');
        break;

      case 'admin':
      case 'company-settings':
      case 'unit-deletion':
      case 'late-fees':
      case 'users':
      case 'roles':
      case 'payment-settings':
      case 'billing':
      case 'integrations':
      case 'connected':
        setActiveTab('company-settings');
        setActiveSubTab(
          subTab || (tabId === 'admin' || tabId === 'company-settings' ? 'menu' : tabId)
        );
        break;

      default:
        setActiveTab(tabId);
        setActiveSubTab(subTab);
        break;
    }
  };

  useEffect(() => {
    initializeAuth();
    useThemeStore.getState().loadTheme();
  }, []);

  // Reset active tab to 'dashboard' whenever user logs in or switches user
  useEffect(() => {
    if (isAuthenticated) {
      setActiveTab('dashboard');
      setActiveSubTab(null);
    }
  }, [user?.email, isAuthenticated]);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>Initializing Portal...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen />
      </>
    );
  }

  const getNormalizedRole = (r) => {
    if (!r) return 'Property Manager';
    const lower = String(r).toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ');
    if (lower.includes('super')) return 'Super Admin';
    if (lower.includes('collection')) return 'Collection Manager';
    if (lower.includes('owner')) return 'Owner';
    if (lower.includes('staff') || lower.includes('vendor')) return 'Maintenance Staff';
    if (lower.includes('tenant') || lower.includes('resident')) return 'Tenant';
    return 'Property Manager';
  };

  const role = getNormalizedRole(user?.role);

  // Role-Specific Navigation Menu Tabs matching Web App strictly
  let moduleTabs = [];

  switch (role) {
    case 'Super Admin':
      moduleTabs = [
        { id: 'dashboard', label: language === 'es' ? 'Tablero' : 'Dashboard', icon: 'grid-outline', activeIcon: 'grid' },
        { id: 'companies', label: language === 'es' ? 'Empresas' : 'Companies', icon: 'business-outline', activeIcon: 'business' },
        { id: 'subscriptions', label: language === 'es' ? 'Suscripciones' : 'Subscriptions', icon: 'card-outline', activeIcon: 'card' },
        { id: 'wordpress-inquiries', label: 'WP Leads', icon: 'chatbox-ellipses-outline', activeIcon: 'chatbox-ellipses' },
        { id: 'platform-settings', label: language === 'es' ? 'Ajustes' : 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
        { id: 'profile', label: language === 'es' ? 'Perfil' : 'Profile', icon: 'person-outline', activeIcon: 'person' },
      ];
      break;

    case 'Collection Manager':
      moduleTabs = [
        { id: 'dashboard', label: language === 'es' ? 'Tablero' : 'Dashboard', icon: 'grid-outline', activeIcon: 'grid' },
        { id: 'rent', label: language === 'es' ? 'Pagos' : 'Payments', icon: 'card-outline', activeIcon: 'card' },
        { id: 'ledger', label: language === 'es' ? 'Libro' : 'Ledger', icon: 'book-outline', activeIcon: 'book' },
        { id: 'profile', label: language === 'es' ? 'Perfil' : 'Profile', icon: 'person-outline', activeIcon: 'person' },
      ];
      break;

    case 'Maintenance Staff':
      moduleTabs = [
        { id: 'dashboard', label: language === 'es' ? 'Tablero' : 'Dashboard', icon: 'grid-outline', activeIcon: 'grid' },
        { id: 'mytasks', label: language === 'es' ? 'Mis Tareas' : 'My Tasks', icon: 'clipboard-outline', activeIcon: 'clipboard' },
        { id: 'history', label: language === 'es' ? 'Historial' : 'History', icon: 'time-outline', activeIcon: 'time' },
        { id: 'profile', label: language === 'es' ? 'Perfil' : 'Profile', icon: 'person-outline', activeIcon: 'person' },
      ];
      break;

    case 'Owner':
      moduleTabs = [
        { id: 'dashboard', label: language === 'es' ? 'Tablero' : 'Dashboard', icon: 'grid-outline', activeIcon: 'grid' },
        { id: 'properties', label: language === 'es' ? 'Propiedades' : 'Properties', icon: 'business-outline', activeIcon: 'business' },
        { id: 'rent', label: language === 'es' ? 'Finanzas' : 'Financials', icon: 'card-outline', activeIcon: 'card' },
        { id: 'messages', label: language === 'es' ? 'Mensajes' : 'Messages', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
        { id: 'more', label: language === 'es' ? 'Servicios' : 'Services', icon: 'apps-outline', activeIcon: 'apps' },
      ];
      break;

    case 'Tenant':
      moduleTabs = [
        { id: 'dashboard', label: language === 'es' ? 'Tablero' : 'Dashboard', icon: 'grid-outline', activeIcon: 'grid' },
        { id: 'lease', label: language === 'es' ? 'Contrato' : 'Lease', icon: 'document-text-outline', activeIcon: 'document-text' },
        { id: 'rent', label: language === 'es' ? 'Pagos' : 'Payments', icon: 'card-outline', activeIcon: 'card' },
        { id: 'ai', label: language === 'es' ? 'Asistente IA' : 'AI Assistant', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
        { id: 'more', label: language === 'es' ? 'Servicios' : 'Services', icon: 'apps-outline', activeIcon: 'apps' },
      ];
      break;

    case 'Property Manager':
    default:
      moduleTabs = [
        { id: 'dashboard', label: language === 'es' ? 'Tablero' : language === 'hi' ? 'डैशबोर्ड' : 'Dashboard', icon: 'grid-outline', activeIcon: 'grid' },
        { id: 'properties', label: language === 'es' ? 'Propiedades' : language === 'hi' ? 'संपत्तियां' : 'Properties', icon: 'business-outline', activeIcon: 'business' },
        { id: 'owners', label: language === 'es' ? 'Propietarios' : language === 'hi' ? 'मालिक' : 'Owners', icon: 'person-add-outline', activeIcon: 'person-add' },
        { id: 'tenants', label: language === 'es' ? 'Inquilinos' : language === 'hi' ? 'किरायेदार' : 'Tenants', icon: 'people-outline', activeIcon: 'people' },
        { id: 'more', label: language === 'es' ? 'Más' : language === 'hi' ? 'अधिक' : 'More', icon: 'apps-outline', activeIcon: 'apps' },
      ];
      break;
  }

  // 1-to-1 Dashboard & Screen Router for ALL 14 Web Menus
  const renderDashboardByRole = () => {
    switch (role) {
      case 'Super Admin':
        return <AdminDashboard onNavigate={(screenId) => handleNavigate(screenId)} />;
      case 'Property Manager':
        return <ManagerDashboard onNavigate={handleNavigate} />;
      case 'Collection Manager':
        return <CollectionDashboard onNavigate={handleNavigate} />;
      case 'Maintenance Staff':
        return <MaintenanceStaffDashboard activeSubTab="dashboard" onNavigate={handleNavigate} />;
      case 'Owner':
        return <OwnerDashboard onNavigate={handleNavigate} />;
      case 'Tenant':
        return <TenantDashboard onNavigate={handleNavigate} />;
      default:
        return <ManagerDashboard onNavigate={handleNavigate} />;
    }
  };

  const renderScreen = () => {
    if (role === 'Maintenance Staff') {
      if (activeTab === 'dashboard') return <MaintenanceStaffDashboard activeSubTab="dashboard" />;
      if (activeTab === 'mytasks') return <MaintenanceStaffDashboard activeSubTab="mytasks" />;
      if (activeTab === 'history') return <MaintenanceStaffDashboard activeSubTab="history" />;
      if (activeTab === 'profile') return <ProfileScreen />;
    }

    switch (activeTab) {
      case 'dashboard':
        return renderDashboardByRole();
      case 'subscriptions':
        return <SubscriptionsScreen />;
      case 'platform-users':
        return <PlatformUsersScreen />;
      case 'wordpress-inquiries':
        return <WordPressInquiriesScreen />;
      case 'platform-settings':
        return <PlatformSettingsScreen />;
      case 'inspection-templates':
        return <InspectionTemplatesScreen />;
      case 'roles-permissions':
        return <RolesPermissionsScreen />;
      case 'integrations':
        return <CompanySettingsScreen initialTab="integrations" onNavigate={handleNavigate} />;
      case 'lease':
      case 'leasing':
        return role === 'Tenant' ? <TenantLeaseScreen /> : <LeadsScreen initialTab={activeSubTab || 'leases'} onNavigate={handleNavigate} />;
      case 'properties':
        return role === 'Owner' ? <OwnerPropertiesScreen onNavigate={handleNavigate} /> : <PropertiesScreen initialTab={activeSubTab || 'properties'} />;
      case 'units':
        return <PropertiesScreen initialTab="units" />;
      case 'drafts':
        return <PropertiesScreen initialTab="drafts" />;
      case 'leads':
      case 'applications':
      case 'screening':
      case 'leases':
      case 'renewals':
      case 'movein':
      case 'moveout':
        return <LeadsScreen initialTab={activeSubTab || activeTab} onNavigate={handleNavigate} />;
      case 'inspection':
        return <InspectionDetailsScreen inspectionId={currentInspectionId} onNavigate={handleNavigate} />;
      case 'tenants':
        return <TenantsScreen />;
      case 'owners':
        return <OwnersScreen />;
      case 'documents':
        return <TenantDocumentsScreen initialTab={activeSubTab || 'tenant'} onNavigate={handleNavigate} />;
      case 'invoices':
        if (role === 'Property Manager' || role === 'Collection Manager') {
          return <ManagerRentPaymentsScreen initialTab="invoices" />;
        }
        return <InvoicesScreen />;
      case 'communication':
      case 'messages':
        return role === 'Property Manager' ? <ManagerCommunicationScreen /> : <TenantMessagesScreen />;
      case 'notifications':
        return <NotificationsScreen onNavigate={handleNavigate} />;
      case 'statements':
        return <StatementsScreen />;
      case 'reports':
        return role === 'Owner' ? <OwnerReportsScreen /> : <ReportsScreen />;
      case 'rent':
      case 'payments':
      case 'rent-dashboard':
        if (role === 'Owner') return <OwnerFinancialsScreen />;
        if (role === 'Property Manager' || role === 'Collection Manager') {
          return <ManagerRentPaymentsScreen initialTab={activeSubTab || (activeTab === 'payments' ? 'payments' : 'dashboard')} />;
        }
        return <RentScreen />;
      case 'financials':
      case 'ledger':
      case 'rent-ledger':
        if (role === 'Owner') return <OwnerFinancialsScreen />;
        if (role === 'Property Manager' || role === 'Collection Manager') {
          return <ManagerRentPaymentsScreen initialTab="ledger" />;
        }
        return <TenantLedgerScreen />;
      case 'accounting':
      case 'chart-of-accounts':
      case 'income':
      case 'expenses':
        if (role === 'Owner') return <OwnerFinancialsScreen />;
        if (role === 'Property Manager' || role === 'Collection Manager') {
          return <ManagerAccountingScreen initialTab={activeSubTab || 'dashboard'} onNavigate={handleNavigate} />;
        }
        return <TenantLedgerScreen />;
      case 'maintenance':
      case 'work-orders':
      case 'violations':
      case 'vendors': {
        const defaultMaintenanceTab = activeTab === 'work-orders'
          ? 'work_orders'
          : activeTab === 'violations'
          ? 'violations'
          : activeTab === 'vendors'
          ? 'staff'
          : 'requests';
        if (role === 'Tenant') {
          return <TenantMaintenanceScreen onNavigate={handleNavigate} />;
        }
        return role === 'Owner'
          ? <OwnerMaintenanceScreen onNavigate={handleNavigate} />
          : <MaintenanceScreen initialTab={activeSubTab || defaultMaintenanceTab} onNavigate={handleNavigate} />;
      }
      case 'companies':
        return <CompaniesScreen />;
      case 'distributions':
        return <DistributionsScreen />;
      case 'ai':
        return <AIAssistantScreen onNavigate={handleNavigate} />;
      case 'company-settings':
      case 'admin':
        return <CompanySettingsScreen initialTab={activeSubTab || 'menu'} onNavigate={handleNavigate} />;
      case 'profile':
        if (role === 'Tenant') {
          return <TenantProfileScreen onNavigate={handleNavigate} />;
        }
        return <ProfileScreen onNavigate={handleNavigate} />;
      case 'more':
        if (role === 'Tenant') {
          return (
            <TenantServicesScreen
              onNavigate={(screenId) => {
                if (screenId === 'logout') {
                  useAuthStore.getState().logout();
                } else {
                  handleNavigate(screenId);
                }
              }}
            />
          );
        }
        if (role === 'Owner') {
          return (
            <OwnerServicesScreen
              onNavigate={(screenId) => {
                if (screenId === 'logout') {
                  useAuthStore.getState().logout();
                } else {
                  handleNavigate(screenId);
                }
              }}
            />
          );
        }
        if (role === 'Property Manager') {
          return (
            <ManagerServicesScreen
              onNavigate={(screenId) => {
                if (screenId === 'logout') {
                  useAuthStore.getState().logout();
                } else {
                  handleNavigate(screenId);
                }
              }}
            />
          );
        }
        return renderDashboardByRole();
      default:
        return renderDashboardByRole();
    }
  };

  const handleTabPress = (tabId) => {
    handleNavigate(tabId);
  };

  const isDarkMode = theme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />


      {/* Main Screen Content */}
      <View style={[styles.content, activeTab !== 'dashboard' && styles.nonDashboardContent]}>
        {renderScreen()}
      </View>

      {/* Fixed Bottom Navigation Bar */}
      <View
        style={[
          styles.bottomBarContainer,
          (role === 'Maintenance Staff' || role === 'Tenant') && {
            paddingBottom: Platform.OS === 'ios' ? 24 : 14,
            paddingTop: 8,
          },
          { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderTopColor: isDarkMode ? '#334155' : '#e2e8f0' },
        ]}
      >
        <View style={styles.fixedBottomBar}>
          {moduleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const useIonicon =
              typeof tab.icon === 'string' &&
              (tab.icon.includes('-outline') ||
                ['grid', 'clipboard', 'time', 'person', 'menu', 'card', 'hammer', 'document-text', 'business', 'people', 'apps'].includes(tab.icon));
            return (
              <TouchableOpacity
                key={`bottom-${tab.id}`}
                style={[
                  styles.bottomTabItem,
                  isActive && { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(56, 189, 248, 0.08)' },
                ]}
                onPress={() => handleTabPress(tab.id)}
                activeOpacity={0.7}
              >
                {isActive && (
                  <View
                    style={{
                      height: 2.5,
                      backgroundColor: '#38bdf8',
                      position: 'absolute',
                      top: -8,
                      left: 10,
                      right: 10,
                      borderRadius: 2,
                    }}
                  />
                )}
                {useIonicon ? (
                  <Ionicons
                    name={isActive ? tab.activeIcon : tab.icon}
                    size={20}
                    color={isActive ? '#38bdf8' : isDarkMode ? '#94a3b8' : '#64748b'}
                    style={{ marginBottom: 2 }}
                  />
                ) : (
                  <Text style={[styles.bottomTabIcon, { color: isActive ? '#38bdf8' : isDarkMode ? '#94a3b8' : '#64748b' }]} allowFontScaling={false}>
                    {tab.icon}
                  </Text>
                )}
                <Text
                  style={[
                    styles.bottomTabText,
                    isActive && styles.bottomTabTextActive,
                    { color: isActive ? '#38bdf8' : isDarkMode ? '#94a3b8' : '#64748b' },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.75}
                  allowFontScaling={false}
                  maxFontSizeMultiplier={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: Platform.OS === 'ios' ? 44 : Platform.OS === 'android' ? 28 : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  nonDashboardContent: {
    paddingTop: Platform.OS === 'ios' ? 16 : 14,
  },
  bottomBarContainer: {
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 8,
  },
  fixedBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  bottomTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 1,
    borderRadius: 8,
    minWidth: 0,
    overflow: 'hidden',
  },
  bottomTabItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  bottomTabIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  bottomTabText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: -0.3,
    textAlign: 'center',
    width: '100%',
  },
  bottomTabTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
});

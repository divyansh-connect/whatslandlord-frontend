import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore, useThemeStore } from './store/useStore';
import { Ionicons } from '@expo/vector-icons';

import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './screens/LoginScreen';
import { NavigationDrawer } from './components/NavigationDrawer';

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
import { OwnerFinancialsScreen } from './screens/OwnerFinancialsScreen';
import { OwnerMaintenanceScreen } from './screens/OwnerMaintenanceScreen';
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

export default function App() {
  const { user, isAuthenticated, isLoaded, initializeAuth } = useAuthStore();
  const { theme, language } = useThemeStore();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentInspectionId, setCurrentInspectionId] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const handleNavigate = (tabId, params) => {
    if (tabId === 'inspection' && params && params.inspectionId) {
      setCurrentInspectionId(params.inspectionId);
    }
    setActiveTab(tabId);
  };

  useEffect(() => {
    initializeAuth();
    useThemeStore.getState().loadTheme();
  }, []);

  // Reset active tab to 'dashboard' whenever user logs in or switches user
  useEffect(() => {
    if (isAuthenticated) {
      setActiveTab('dashboard');
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
        { id: 'maintenance', label: language === 'es' ? 'Reparaciones' : 'Repairs', icon: 'hammer-outline', activeIcon: 'hammer' },
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
        { id: 'dashboard', label: language === 'es' ? 'Tablero' : 'Dashboard', icon: 'grid-outline', activeIcon: 'grid' },
        { id: 'properties', label: language === 'es' ? 'Propiedades' : 'Properties', icon: 'business-outline', activeIcon: 'business' },
        { id: 'ai', label: language === 'es' ? 'Asistente IA' : 'AI Assistant', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
        { id: 'owners', label: language === 'es' ? 'Propietarios' : 'Owners', icon: 'person-add-outline', activeIcon: 'person-add' },
        { id: 'tenants', label: language === 'es' ? 'Inquilinos' : 'Tenants', icon: 'people-outline', activeIcon: 'people' },
        { id: 'more', label: language === 'es' ? 'Servicios' : 'Services', icon: 'apps-outline', activeIcon: 'apps' },
      ];
      break;
  }

  // 1-to-1 Dashboard & Screen Router for ALL Web Menus
  const renderDashboardByRole = () => {
    switch (role) {
      case 'Super Admin':
        return <AdminDashboard onNavigate={(screenId) => setActiveTab(screenId)} />;
      case 'Property Manager':
        return <ManagerDashboard onNavigate={handleNavigate} />;
      case 'Collection Manager':
        return <CollectionDashboard onNavigate={handleNavigate} />;
      case 'Maintenance Staff':
        return <StaffDashboard />;
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
        return <IntegrationsScreen onNavigate={handleNavigate} />;
      case 'lease':
        return role === 'Tenant' ? <TenantLeaseScreen /> : <LeadsScreen onNavigate={handleNavigate} />;
      case 'properties':
        return <PropertiesScreen />;
      case 'leads':
      case 'applications':
        return <LeadsScreen onNavigate={handleNavigate} />;
      case 'inspection':
        return <InspectionDetailsScreen inspectionId={currentInspectionId} onNavigate={handleNavigate} />;
      case 'tenants':
        return <TenantsScreen />;
      case 'owners':
        return <OwnersScreen />;
      case 'documents':
        return <TenantDocumentsScreen />;
      case 'invoices':
        return <InvoicesScreen />;
      case 'communication':
      case 'messages':
        return role === 'Property Manager' ? <ManagerCommunicationScreen /> : <TenantMessagesScreen />;
      case 'notifications':
        return <TenantNotificationsScreen />;
      case 'statements':
        return <StatementsScreen />;
      case 'reports':
        return <ReportsScreen />;
      case 'rent':
        if (role === 'Owner') return <OwnerFinancialsScreen />;
        if (role === 'Property Manager' || role === 'Collection Manager') return <ManagerRentPaymentsScreen />;
        return <RentScreen />;
      case 'financials':
      case 'ledger':
      case 'accounting':
        if (role === 'Owner') return <OwnerFinancialsScreen />;
        if (role === 'Property Manager' || role === 'Collection Manager') return <ManagerAccountingScreen />;
        return <TenantLedgerScreen />;
      case 'maintenance':
        return role === 'Owner' ? <OwnerMaintenanceScreen /> : <MaintenanceScreen />;
      case 'companies':
        return <CompaniesScreen />;
      case 'distributions':
        return <DistributionsScreen />;
      case 'ai':
        return <AIAssistantScreen onNavigate={handleNavigate} />;
      case 'profile':
        return <ProfileScreen />;
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
    if (tabId === 'more' && role !== 'Tenant' && role !== 'Owner' && role !== 'Property Manager') {
      setDrawerVisible(true);
    } else {
      setActiveTab(tabId);
    }
  };

  const isDarkMode = theme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />



      {/* Navigation Drawer Component */}
      <NavigationDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeScreen={activeTab}
        onSelectScreen={(screenId) => setActiveTab(screenId)}
      />

      {/* Main Screen Content */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Fixed Bottom Navigation Bar */}
      <View style={[
        styles.bottomBarContainer,
        (role === 'Maintenance Staff' || role === 'Tenant') && { paddingBottom: Platform.OS === 'ios' ? 24 : 16, paddingTop: 10 },
        { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderTopColor: isDarkMode ? '#334155' : '#e2e8f0' }
      ]}>
        <View style={styles.fixedBottomBar}>
          {moduleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isStaff = role === 'Maintenance Staff';
            const isTenant = role === 'Tenant';
            const useIonicon = typeof tab.icon === 'string' && (tab.icon.includes('-outline') || ['grid', 'clipboard', 'time', 'person', 'menu', 'card', 'hammer', 'document-text'].includes(tab.icon));
            return (
              <TouchableOpacity
                key={`bottom-${tab.id}`}
                style={[
                  styles.bottomTabItem,
                  (isActive && !useIonicon) && styles.bottomTabItemActive,
                  (isActive && !useIonicon && !isDarkMode) && { backgroundColor: 'rgba(56, 189, 248, 0.08)' }
                ]}
                onPress={() => handleTabPress(tab.id)}
                activeOpacity={0.7}
              >
                {(isStaff || isTenant) && isActive && (
                  <View style={{ height: 2.5, backgroundColor: '#38bdf8', position: 'absolute', top: -6, left: 16, right: 16, borderRadius: 1 }} />
                )}
                {useIonicon ? (
                  <Ionicons
                    name={isActive ? tab.activeIcon : tab.icon}
                    size={20}
                    color={isActive ? '#38bdf8' : (isDarkMode ? '#cbd5e1' : '#64748b')}
                    style={{ marginBottom: 2 }}
                  />
                ) : (
                  <Text style={[styles.bottomTabIcon, { color: isActive ? '#38bdf8' : (isDarkMode ? '#cbd5e1' : '#64748b') }]} allowFontScaling={false}>{tab.icon}</Text>
                )}
                <Text
                  style={[
                    styles.bottomTabText,
                    isActive && styles.bottomTabTextActive,
                    { color: isActive ? '#38bdf8' : (isDarkMode ? '#94a3b8' : '#475569') }
                  ]}
                  allowFontScaling={false}
                >
                  {(isStaff || isTenant || role === 'Collection Manager') ? tab.label : (tab.label.split(' ')[1] || tab.label)}
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
    paddingTop: Platform.OS === 'ios' ? 52 : Platform.OS === 'android' ? 38 : 0,
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hamburgerBtn: {
    paddingRight: 4,
    paddingVertical: 4,
  },
  hamburgerIcon: {
    color: '#38bdf8',
    fontSize: 20,
    fontWeight: '800',
  },
  brandIcon: {
    fontSize: 16,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellBtn: {
    position: 'relative',
    padding: 4,
  },
  bellIcon: {
    fontSize: 18,
  },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 7,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  profileBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBadgeText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 13,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 22 : 0,
  },
  bottomBarContainer: {
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 6,
  },
  fixedBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  bottomTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  bottomTabItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  bottomTabIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  bottomTabText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  bottomTabTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
});

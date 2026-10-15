import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const NavigationDrawer = ({ visible, onClose, activeScreen, activeTab, onSelectScreen }) => {
  const { user, logout } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  // Expanded menu accordion state
  const [expandedMenus, setExpandedMenus] = useState({
    properties: false,
    leasing: false,
    tenants: false,
    rent: false,
    accounting: false,
    maintenance: false,
    admin: false,
  });

  const toggleSubmenu = (menuId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const roleLower = String(user?.role || '').toLowerCase();
  const isSuperAdmin = roleLower.includes('super');
  const isCollectionManager = roleLower.includes('collection');
  const isOwner = roleLower.includes('owner');
  const isTenant = roleLower.includes('tenant') || roleLower.includes('resident');
  const isStaff = roleLower.includes('staff') || roleLower.includes('vendor');
  const isManager = !isSuperAdmin && !isCollectionManager && !isOwner && !isTenant && !isStaff;

  // 14 MAIN MENUS FOR PROPERTY MANAGER (Exact Specification 1-to-1)
  const managerMenus = [
    {
      id: 'dashboard',
      title: language === 'es' ? 'Tablero Principal' : language === 'hi' ? 'डैशबोर्ड' : 'Dashboard',
      icon: 'grid-outline',
      path: '/',
      screen: 'dashboard',
    },
    {
      id: 'properties',
      title: language === 'es' ? 'Propiedades' : language === 'hi' ? 'संपत्तियां' : 'Properties',
      icon: 'business-outline',
      path: '/properties',
      screen: 'properties',
      submenus: [
        { id: 'prop-list', title: language === 'es' ? 'Propiedades' : language === 'hi' ? 'संपत्तियां' : 'Properties', path: '/properties', screen: 'properties', tab: 'properties' },
        { id: 'prop-units', title: language === 'es' ? 'Unidades' : language === 'hi' ? 'इकाइयां' : 'Units', path: '/units', screen: 'properties', tab: 'units' },
        { id: 'prop-drafts', title: language === 'es' ? 'Borradores' : language === 'hi' ? 'ड्राफ्ट' : 'Drafts', path: '/properties/drafts', screen: 'properties', tab: 'drafts' },
      ],
    },
    {
      id: 'leasing',
      title: language === 'es' ? 'Arrendamientos' : language === 'hi' ? 'पट्टा / लीजिंग' : 'Leasing',
      icon: 'key-outline',
      path: '/leasing',
      screen: 'leads',
      submenus: [
        { id: 'lease-leads', title: language === 'es' ? 'Prospectos' : language === 'hi' ? 'लीड्स' : 'Leads', path: '/leasing/leads', screen: 'leads', tab: 'leads' },
        { id: 'lease-apps', title: language === 'es' ? 'Solicitudes' : language === 'hi' ? 'आवेदन' : 'Applications', path: '/leasing/applications', screen: 'leads', tab: 'applications' },
        { id: 'lease-screen', title: language === 'es' ? 'Evaluación' : language === 'hi' ? 'स्क्रीनिंग' : 'Tenant Screening', path: '/leasing/screening', screen: 'leads', tab: 'screening' },
        { id: 'lease-list', title: language === 'es' ? 'Contratos' : language === 'hi' ? 'लीज सूची' : 'Leases', path: '/leasing/leases', screen: 'leads', tab: 'leases' },
        { id: 'lease-renew', title: language === 'es' ? 'Renovaciones' : language === 'hi' ? 'नवीनीकरण' : 'Renewals', path: '/leasing/renewals', screen: 'leads', tab: 'renewals' },
        { id: 'lease-movein', title: language === 'es' ? 'Mudanza Entrada' : language === 'hi' ? 'मूव-इन' : 'Move-In', path: '/leasing/move-in', screen: 'leads', tab: 'movein' },
        { id: 'lease-moveout', title: language === 'es' ? 'Mudanza Salida' : language === 'hi' ? 'मूव-आउट' : 'Move-Out', path: '/leasing/move-out', screen: 'leads', tab: 'moveout' },
        { id: 'lease-temp', title: language === 'es' ? 'Plantillas Insp.' : language === 'hi' ? 'निरीक्षण टेम्पलेट' : 'Inspection Templates', path: '/leasing/inspection-templates', screen: 'inspection-templates' },
      ],
    },
    {
      id: 'tenants',
      title: language === 'es' ? 'Inquilinos' : language === 'hi' ? 'किरायेदार' : 'Tenants',
      icon: 'people-outline',
      path: '/tenants',
      screen: 'tenants',
      submenus: [
        { id: 'tenant-dir', title: language === 'es' ? 'Directorio Inquilinos' : language === 'hi' ? 'किरायेदार डायरेक्टरी' : 'Tenant Directory', path: '/tenants', screen: 'tenants' },
        { id: 'tenant-docs', title: language === 'es' ? 'Documentos' : language === 'hi' ? 'किरायेदार दस्तावेज़' : 'Tenant Documents', path: '/tenants/documents', screen: 'documents' },
      ],
    },
    {
      id: 'documents',
      title: language === 'es' ? 'Documentos' : language === 'hi' ? 'दस्तावेज़' : 'Documents',
      icon: 'document-text-outline',
      path: '/documents/all',
      screen: 'documents',
    },
    {
      id: 'owners',
      title: language === 'es' ? 'Propietarios' : language === 'hi' ? 'मालिक' : 'Owners',
      icon: 'person-circle-outline',
      path: '/owners',
      screen: 'owners',
    },
    {
      id: 'rent',
      title: language === 'es' ? 'Renta y Pagos' : language === 'hi' ? 'किराया और भुगतान' : 'Rent & Payments',
      icon: 'card-outline',
      path: '/rent',
      screen: 'rent',
      submenus: [
        { id: 'rent-dash', title: language === 'es' ? 'Panel de Renta' : language === 'hi' ? 'डैशबोर्ड' : 'Dashboard', path: '/rent', screen: 'rent', tab: 'dashboard' },
        { id: 'rent-pay', title: language === 'es' ? 'Pagos' : language === 'hi' ? 'भुगतान' : 'Payments', path: '/payments', screen: 'rent', tab: 'payments' },
        { id: 'rent-inv', title: language === 'es' ? 'Facturas' : language === 'hi' ? 'चालान (Invoices)' : 'Invoices', path: '/invoices', screen: 'rent', tab: 'invoices' },
        { id: 'rent-ledg', title: language === 'es' ? 'Libro Mayor Renta' : language === 'hi' ? 'किराया खाता बही' : 'Rent Ledger', path: '/rent-ledger', screen: 'rent', tab: 'ledger' },
      ],
    },
    {
      id: 'accounting',
      title: language === 'es' ? 'Contabilidad' : language === 'hi' ? 'लेखांकन' : 'Accounting',
      icon: 'book-outline',
      path: '/accounting',
      screen: 'accounting',
      submenus: [
        { id: 'acc-dash', title: language === 'es' ? 'Panel Contable' : language === 'hi' ? 'डैशबोर्ड' : 'Dashboard', path: '/accounting', screen: 'accounting', tab: 'dashboard' },
        { id: 'acc-coa', title: language === 'es' ? 'Plan de Cuentas' : language === 'hi' ? 'खातों का चार्ट' : 'Chart of Accounts', path: '/accounting/chart-of-accounts', screen: 'accounting', tab: 'coa' },
        { id: 'acc-inc', title: language === 'es' ? 'Ingresos' : language === 'hi' ? 'आय (Income)' : 'Income', path: '/accounting/income', screen: 'accounting', tab: 'income' },
        { id: 'acc-exp', title: language === 'es' ? 'Gastos' : language === 'hi' ? 'खर्च (Expenses)' : 'Expenses', path: '/accounting/expenses', screen: 'accounting', tab: 'expenses' },
      ],
    },
    {
      id: 'maintenance',
      title: language === 'es' ? 'Mantenimiento' : language === 'hi' ? 'रखरखाव' : 'Maintenance',
      icon: 'hammer-outline',
      path: '/maintenance',
      screen: 'maintenance',
      submenus: [
        { id: 'maint-dash', title: language === 'es' ? 'Panel Mantenimiento' : language === 'hi' ? 'डैशबोर्ड' : 'Dashboard', path: '/maintenance', screen: 'maintenance', tab: 'dashboard' },
        { id: 'maint-req', title: language === 'es' ? 'Solicitudes Servicio' : language === 'hi' ? 'सेवा अनुरोध' : 'Service Requests', path: '/maintenance/requests', screen: 'maintenance', tab: 'requests' },
        { id: 'maint-wo', title: language === 'es' ? 'Órdenes de Trabajo' : language === 'hi' ? 'कार्य आदेश' : 'Work Orders', path: '/maintenance/work-orders', screen: 'maintenance', tab: 'work_orders' },
        { id: 'maint-viol', title: language === 'es' ? 'Infracciones y Código' : language === 'hi' ? 'उल्लंघन एवं कोड' : 'Violations & Code', path: '/maintenance/violations', screen: 'maintenance', tab: 'violations' },
        { id: 'maint-vend', title: language === 'es' ? 'Proveedores' : language === 'hi' ? 'विक्रेता (Vendors)' : 'Vendors', path: '/vendors', screen: 'maintenance', tab: 'vendors' },
      ],
    },
    {
      id: 'reports',
      title: language === 'es' ? 'Informes' : language === 'hi' ? 'रिपोर्ट्स' : 'Reports',
      icon: 'bar-chart-outline',
      path: '/reports',
      screen: 'reports',
    },
    {
      id: 'communication',
      title: language === 'es' ? 'Comunicación' : language === 'hi' ? 'संचार एवं चैट' : 'Communication',
      icon: 'chatbubbles-outline',
      path: '/communication',
      screen: 'communication',
    },
    {
      id: 'notifications',
      title: language === 'es' ? 'Notificaciones' : language === 'hi' ? 'सूचनाएं' : 'Notifications',
      icon: 'notifications-outline',
      path: '/notifications',
      screen: 'notifications',
    },
    {
      id: 'ai',
      title: language === 'es' ? 'Asistente IA' : language === 'hi' ? 'एआई सहायक' : 'AI Assistant',
      icon: 'hardware-chip-outline',
      path: '/ai/assistant',
      screen: 'ai',
    },
    {
      id: 'admin',
      title: language === 'es' ? 'Ajustes de Empresa' : language === 'hi' ? 'कंपनी सेटिंग्स' : 'Company Settings',
      icon: 'settings-outline',
      path: '/admin',
      screen: 'company-settings',
      submenus: [
        { id: 'adm-prof', title: language === 'es' ? 'Perfil de Empresa' : language === 'hi' ? 'कंपनी प्रोफ़ाइल' : 'Company Profile', path: '/admin/company-settings', screen: 'company-settings', tab: 'profile' },
        { id: 'adm-del', title: language === 'es' ? 'Eliminación Unidades' : language === 'hi' ? 'यूनिट विलोपन' : 'Unit Deletion Settings', path: '/admin/unit-deletion', screen: 'company-settings', tab: 'unit-deletion' },
        { id: 'adm-late', title: language === 'es' ? 'Política Retrasos' : language === 'hi' ? 'विलंब शुल्क नीति' : 'Late Fee Policy', path: '/admin/late-fees', screen: 'company-settings', tab: 'late-fees' },
        { id: 'adm-usr', title: language === 'es' ? 'Usuarios y Roles' : language === 'hi' ? 'उपयोगकर्ता और भूमिकाएं' : 'Users & Roles', path: '/admin/users', screen: 'company-settings', tab: 'users' },
        { id: 'adm-perm', title: language === 'es' ? 'Permisos y Accesos' : language === 'hi' ? 'भूमिकाएं एवं अनुमतियां' : 'Roles & Permissions', path: '/admin/roles', screen: 'company-settings', tab: 'roles' },
        { id: 'adm-pay', title: language === 'es' ? 'Ajustes de Pago' : language === 'hi' ? 'भुगतान सेटिंग्स' : 'Payment Settings', path: '/admin/payment-settings', screen: 'company-settings', tab: 'payment-settings' },
        { id: 'adm-bill', title: language === 'es' ? 'Suscripción y Fact.' : language === 'hi' ? 'सदस्यता और बिलिंग' : 'Subscription & Billing', path: '/admin/billing', screen: 'company-settings', tab: 'billing' },
        { id: 'adm-int', title: language === 'es' ? 'Mercado Integraciones' : language === 'hi' ? 'इंटीग्रेशन मार्केट' : 'Integrations Marketplace', path: '/admin/integrations', screen: 'company-settings', tab: 'integrations' },
        { id: 'adm-conn', title: language === 'es' ? 'Apps Conectadas' : language === 'hi' ? 'कनेक्टेड ऐप्स' : 'Connected Apps', path: '/platform-integrations/connected', screen: 'company-settings', tab: 'connected' },
      ],
    },
  ];

  // Menus for Other Roles
  let currentRoleMenus = managerMenus;

  if (isSuperAdmin) {
    currentRoleMenus = [
      { id: 'dashboard', title: 'Dashboard', icon: 'grid-outline', screen: 'dashboard' },
      { id: 'companies', title: 'Companies', icon: 'business-outline', screen: 'companies' },
      { id: 'subscriptions', title: 'Subscriptions', icon: 'card-outline', screen: 'subscriptions' },
      { id: 'platform-users', title: 'Platform Users', icon: 'people-outline', screen: 'platform-users' },
      { id: 'properties', title: 'Properties', icon: 'home-outline', screen: 'properties' },
      { id: 'maintenance', title: 'Maintenance', icon: 'hammer-outline', screen: 'maintenance' },
      { id: 'admin', title: 'Platform Settings', icon: 'settings-outline', screen: 'platform-settings' },
    ];
  } else if (isCollectionManager) {
    currentRoleMenus = [
      { id: 'dashboard', title: 'Dashboard', icon: 'grid-outline', screen: 'dashboard' },
      { id: 'invoices', title: 'Tenant Invoices', icon: 'document-text-outline', screen: 'invoices' },
      { id: 'rent', title: 'Payment History', icon: 'card-outline', screen: 'rent' },
      { id: 'financials', title: 'Tenant Ledger', icon: 'book-outline', screen: 'financials' },
      { id: 'profile', title: 'Profile', icon: 'person-outline', screen: 'profile' },
    ];
  } else if (isOwner) {
    currentRoleMenus = [
      { id: 'dashboard', title: 'Dashboard', icon: 'grid-outline', screen: 'dashboard' },
      { id: 'properties', title: 'Properties', icon: 'business-outline', screen: 'properties' },
      { id: 'financials', title: 'Financials', icon: 'card-outline', screen: 'financials' },
      { id: 'statements', title: 'Statements', icon: 'document-text-outline', screen: 'statements' },
      { id: 'distributions', title: 'Distributions', icon: 'cash-outline', screen: 'distributions' },
      { id: 'maintenance', title: 'Maintenance', icon: 'hammer-outline', screen: 'maintenance' },
      { id: 'documents', title: 'Documents', icon: 'folder-open-outline', screen: 'documents' },
      { id: 'reports', title: 'Reports', icon: 'bar-chart-outline', screen: 'reports' },
      { id: 'communication', title: 'Messages', icon: 'chatbubbles-outline', screen: 'communication' },
    ];
  } else if (isTenant) {
    currentRoleMenus = [
      { id: 'dashboard', title: 'Dashboard', icon: 'grid-outline', screen: 'dashboard' },
      { id: 'lease', title: 'My Lease', icon: 'document-text-outline', screen: 'lease' },
      { id: 'rent', title: 'Payments', icon: 'card-outline', screen: 'rent' },
      { id: 'maintenance', title: 'Maintenance', icon: 'hammer-outline', screen: 'maintenance' },
      { id: 'documents', title: 'Documents', icon: 'folder-open-outline', screen: 'documents' },
      { id: 'communication', title: 'Messages', icon: 'chatbubbles-outline', screen: 'communication' },
      { id: 'ai', title: 'AI Assistant', icon: 'hardware-chip-outline', screen: 'ai' },
    ];
  } else if (isStaff) {
    currentRoleMenus = [
      { id: 'dashboard', title: 'Dashboard', icon: 'grid-outline', screen: 'dashboard' },
      { id: 'mytasks', title: 'My Tasks', icon: 'clipboard-outline', screen: 'mytasks' },
      { id: 'history', title: 'Task History', icon: 'time-outline', screen: 'history' },
      { id: 'profile', title: 'Profile', icon: 'person-outline', screen: 'profile' },
    ];
  }

  const handleSelect = (screenId, tabId) => {
    onSelectScreen(screenId, tabId);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.drawerContainer}>
          <SafeAreaView style={styles.safeArea}>
            {/* Header with User Info */}
            <View style={styles.userHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || 'User'}
                </Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {user?.role || 'Property Manager'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Scrollable Navigation Menu */}
            <ScrollView
              style={styles.menuList}
              contentContainerStyle={styles.menuContentContainer}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <Text style={styles.sectionHeader}>
                {isOwner
                  ? (language === 'es' ? 'MENÚ PROPIETARIO' : language === 'hi' ? 'मालिक मेनू' : 'OWNER PORTAL MENU')
                  : isTenant
                  ? (language === 'es' ? 'MENÚ INQUILINO' : language === 'hi' ? 'किरायेदार मेनू' : 'TENANT PORTAL MENU')
                  : (language === 'es' ? 'MENÚ DE NAVEGACIÓN (14 MENÚS)' : language === 'hi' ? 'प्रबंधक मेनू (14 श्रेणियां)' : 'MANAGER NAVIGATION (14 MENUS)')}
              </Text>

              {currentRoleMenus.map((item, index) => {
                const hasSub = Array.isArray(item.submenus) && item.submenus.length > 0;
                const isExpanded = expandedMenus[item.id] || false;
                const isCurrentScreen = activeScreen === item.screen;

                return (
                  <View key={`${item.id}-${index}`} style={styles.menuItemWrapper}>
                    {/* Main Menu Button */}
                    <TouchableOpacity
                      style={[
                        styles.menuItem,
                        isCurrentScreen && !hasSub && styles.menuItemActive,
                      ]}
                      onPress={() => {
                        if (hasSub) {
                          toggleSubmenu(item.id);
                        } else {
                          handleSelect(item.screen);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.menuItemLeft}>
                        <Ionicons
                          name={item.icon}
                          size={18}
                          color={isCurrentScreen ? '#38bdf8' : colors.textSecondary}
                          style={{ marginRight: 10 }}
                        />
                        <Text
                          style={[
                            styles.menuItemText,
                            isCurrentScreen && styles.menuItemTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                      </View>

                      {hasSub && (
                        <Ionicons
                          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                          size={15}
                          color={colors.textMuted}
                        />
                      )}
                    </TouchableOpacity>

                    {/* Submenus Rendering */}
                    {hasSub && isExpanded && (
                      <View style={styles.submenuContainer}>
                        {item.submenus.map((sub) => {
                          const isSubActive =
                            activeScreen === sub.screen && (!sub.tab || activeTab === sub.tab);
                          return (
                            <TouchableOpacity
                              key={sub.id}
                              style={[
                                styles.submenuItem,
                                isSubActive && styles.submenuItemActive,
                              ]}
                              onPress={() => handleSelect(sub.screen, sub.tab)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.subBullet, isSubActive && styles.subBulletActive]} />
                              <Text
                                style={[
                                  styles.submenuText,
                                  isSubActive && styles.submenuTextActive,
                                ]}
                                numberOfLines={1}
                              >
                                {sub.title}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}

              <View style={{ height: 16 }} />

              {/* Log Out Action */}
              <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
                <Ionicons name="log-out-outline" size={17} color="#f87171" style={{ marginRight: 8 }} />
                <Text style={styles.logoutText}>
                  {language === 'es' ? 'Cerrar Sesión' : language === 'hi' ? 'लॉग आउट' : 'Log Out'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.45)',
    },
    backdrop: {
      flex: 1,
    },
    drawerContainer: {
      width: '84%',
      maxWidth: 320,
      backgroundColor: colors.surface,
      height: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 4, height: 0 },
      shadowOpacity: isDarkMode ? 0.5 : 0.15,
      shadowRadius: 10,
      elevation: 12,
    },
    safeArea: {
      flex: 1,
      paddingTop: Platform.OS === 'android' ? 36 : 10,
    },
    userHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    avatarCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#38bdf8',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: {
      color: '#0f172a',
      fontSize: 18,
      fontWeight: '800',
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    roleBadge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 2,
    },
    roleBadgeText: {
      color: '#38bdf8',
      fontSize: 10,
      fontWeight: '700',
    },
    closeBtn: {
      padding: 6,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginBottom: 6,
    },
    menuList: {
      flex: 1,
    },
    menuContentContainer: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 40,
    },
    sectionHeader: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      marginBottom: 8,
      marginLeft: 6,
    },
    menuItemWrapper: {
      marginBottom: 3,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 9,
      backgroundColor: 'transparent',
    },
    menuItemActive: {
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuItemText: {
      color: colors.textSecondary,
      fontSize: 13.5,
      fontWeight: '600',
    },
    menuItemTextActive: {
      color: '#38bdf8',
      fontWeight: '750',
    },
    submenuContainer: {
      paddingLeft: 22,
      paddingRight: 6,
      paddingVertical: 2,
      borderLeftWidth: 1.5,
      borderLeftColor: isDarkMode ? '#334155' : '#cbd5e1',
      marginLeft: 18,
      marginVertical: 2,
    },
    submenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 6,
      marginBottom: 1,
    },
    submenuItemActive: {
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
    },
    subBullet: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.textMuted,
      marginRight: 8,
    },
    subBulletActive: {
      backgroundColor: '#38bdf8',
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    submenuText: {
      color: colors.textSecondary,
      fontSize: 12.5,
      fontWeight: '550',
    },
    submenuTextActive: {
      color: '#38bdf8',
      fontWeight: '750',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.25)',
      marginTop: 10,
    },
    logoutText: {
      color: '#f87171',
      fontSize: 13.5,
      fontWeight: '700',
    },
  });

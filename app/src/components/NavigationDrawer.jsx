import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';

export const NavigationDrawer = ({ visible, onClose, activeScreen, onSelectScreen }) => {
  const { user, logout } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  const roleLower = String(user?.role || '').toLowerCase();
  const isSuperAdmin = roleLower.includes('super');
  const isCollectionManager = roleLower.includes('collection');
  const isOwner = roleLower.includes('owner');
  const isManager = roleLower.includes('manager') || isSuperAdmin;

  let menuItems = [];

  if (isSuperAdmin) {
    menuItems = [
      { id: 'dashboard', label: language === 'es' ? '📊 Tablero Principal' : '📊 Dashboard' },
      { id: 'companies', label: language === 'es' ? '🏢 Empresas' : '🏢 Companies' },
      { id: 'subscriptions', label: language === 'es' ? '📅 Suscripciones' : '📅 Subscriptions' },
      { id: 'platform-users', label: language === 'es' ? '👥 Usuarios Plataforma' : '👥 Platform Users' },
      { id: 'properties', label: language === 'es' ? '🏠 Propiedades' : '🏠 Properties' },
      { id: 'maintenance', label: language === 'es' ? '🛠️ Mantenimiento' : '🛠️ Maintenance' },
    ];
  } else if (isCollectionManager) {
    menuItems = [
      { id: 'dashboard', label: language === 'es' ? '📊 Tablero Principal' : '📊 Dashboard' },
      { id: 'invoices', label: language === 'es' ? '📄 Facturas de Inquilinos' : '📄 Tenant Invoices' },
      { id: 'rent', label: language === 'es' ? '💳 Historial de Pagos' : '💳 Payment History' },
      { id: 'financials', label: language === 'es' ? '📖 Libro Mayor Inquilinos' : '📖 Tenant Ledger' },
    ];
  } else if (isManager) {
    menuItems = [
      { id: 'dashboard', label: language === 'es' ? '📊 Tablero Principal' : '📊 Dashboard' },
      { id: 'properties', label: language === 'es' ? '🏢 Propiedades' : '🏢 Properties' },
      { id: 'leads', label: language === 'es' ? '🔑 Alquileres' : '🔑 Leasing' },
      { id: 'tenants', label: language === 'es' ? '👥 Inquilinos' : '👥 Tenants' },
      { id: 'documents', label: language === 'es' ? '📂 Documentos' : '📂 Documents' },
      { id: 'owners', label: language === 'es' ? '👔 Propietarios' : '👔 Owners' },
      { id: 'rent', label: language === 'es' ? '💳 Alquiler y Pagos' : '💳 Rent & Payments' },
      { id: 'accounting', label: language === 'es' ? '📚 Contabilidad' : '📚 Accounting' },
      { id: 'maintenance', label: language === 'es' ? '🛠️ Mantenimiento' : '🛠️ Maintenance' },
      { id: 'reports', label: language === 'es' ? '📊 Informes' : '📊 Reports' },
      { id: 'communication', label: language === 'es' ? '💬 Comunicación' : '💬 Communication' },
      { id: 'ai', label: language === 'es' ? '🤖 Asistente IA' : '🤖 AI Assistant' },
    ];
  } else if (isOwner) {
    menuItems = [
      { id: 'dashboard', label: language === 'es' ? '📊 Tablero Principal' : '📊 Dashboard' },
      { id: 'properties', label: language === 'es' ? '🏢 Propiedades' : '🏢 Properties' },
      { id: 'financials', label: language === 'es' ? '💳 Finanzas' : '💳 Financials' },
      { id: 'statements', label: language === 'es' ? '📖 Estados de Cuenta' : '📖 Statements' },
      { id: 'distributions', label: language === 'es' ? '⚙️ Distribuciones' : '⚙️ Distributions' },
      { id: 'maintenance', label: language === 'es' ? '🛠️ Mantenimiento' : '🛠️ Maintenance' },
      { id: 'documents', label: language === 'es' ? '📄 Documentos' : '📄 Documents' },
      { id: 'reports', label: language === 'es' ? '📊 Informes' : '📊 Reports' },
      { id: 'communication', label: language === 'es' ? '💬 Mensajes' : '💬 Messages' },
    ];
  } else {
    menuItems = [
      { id: 'dashboard', label: language === 'es' ? '📊 Tablero Principal' : '📊 Dashboard' },
      { id: 'lease', label: language === 'es' ? '📖 Contrato' : '📖 Lease' },
      { id: 'rent', label: language === 'es' ? '💳 Pagos' : '💳 Payments' },
      { id: 'maintenance', label: language === 'es' ? '🛠️ Mantenimiento' : '🛠️ Maintenance' },
      { id: 'documents', label: language === 'es' ? '📄 Documentos' : '📄 Documents' },
      { id: 'communication', label: language === 'es' ? '👤 Mensajes' : '👤 Messages' },
      { id: 'ai', label: language === 'es' ? '🤖 Asistente IA' : '🤖 AI Assistant' },
    ];
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.drawerContainer}>
          <SafeAreaView style={styles.safeArea}>
            {/* User Profile Header */}
            <View style={styles.userHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText} allowFontScaling={false}>
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1} allowFontScaling={false}>
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email || 'User'}
                </Text>
                <Text style={styles.userRole} allowFontScaling={false}>
                  {user?.role || 'Member'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Scrollable Navigation Menu */}
            <ScrollView
              style={styles.menuList}
              contentContainerStyle={styles.menuContentContainer}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <Text style={styles.sectionHeader} allowFontScaling={false}>
                {user?.role === 'Owner'
                  ? (language === 'es' ? 'MENÚ PROPIETARIO' : 'OWNER PORTAL MENU')
                  : user?.role === 'Tenant'
                  ? (language === 'es' ? 'MENÚ INQUILINO' : 'TENANT PORTAL MENU')
                  : (language === 'es' ? 'MENÚ DE NAVEGACIÓN' : 'NAVIGATION MENU')}
              </Text>

              {menuItems.map((item, index) => {
                const isActive = activeScreen === item.id;
                return (
                  <TouchableOpacity
                    key={`${item.id}-${index}`}
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    onPress={() => {
                      onSelectScreen(item.id);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]} allowFontScaling={false}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View style={{ height: 20 }} />

              <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Text style={styles.logoutText} allowFontScaling={false}>
                  {language === 'es' ? '🚪 Cerrar Sesión' : '🚪 Log Out'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.45)',
  },
  backdrop: {
    flex: 1,
  },
  drawerContainer: {
    width: '80%',
    maxWidth: 310,
    backgroundColor: colors.surface,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: isDarkMode ? 0.5 : 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 36 : 10,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  userRole: {
    color: '#38bdf8',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 4,
  },
  menuList: {
    flex: 1,
  },
  menuContentContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 60,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 8,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  menuItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  menuItemText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  menuItemTextActive: {
    color: '#38bdf8',
    fontWeight: '800',
  },
  logoutButton: {
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    marginTop: 10,
  },
  logoutText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '700',
  },
});

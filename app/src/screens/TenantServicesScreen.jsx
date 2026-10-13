import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export const TenantServicesScreen = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';

  const menuItems = [
    {
      id: 'maintenance',
      label: es ? 'Reparaciones y Mantenimiento' : 'Repairs & Maintenance',
      subtitle: es ? 'Rastrear y presentar tickets de mantenimiento' : 'Track and file maintenance tickets',
      icon: 'hammer-outline',
      color: '#f59e0b',
    },
    {
      id: 'documents',
      label: es ? 'Documentos' : 'Documents',
      subtitle: es ? 'Contratos, recibos y archivos comunitarios' : 'Leases, receipts, and community files',
      icon: 'document-text-outline',
      color: '#38bdf8',
    },
    {
      id: 'notifications',
      label: es ? 'Notificaciones' : 'Notifications',
      subtitle: es ? 'Ver actualizaciones y anuncios recientes' : 'View recent updates and announcements',
      icon: 'notifications-outline',
      color: '#10b981',
    },
    {
      id: 'profile',
      label: es ? 'Configuración de Perfil' : 'Profile Settings',
      subtitle: es ? 'Administrar sus datos de contacto y cuenta' : 'Manage your contact details and account',
      icon: 'person-outline',
      color: '#ec4899',
    },
  ];

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User profile header card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText} allowFontScaling={false}>
              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'P'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} allowFontScaling={false}>
              {user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Tenant')}
            </Text>
            <Text style={styles.profileRole} allowFontScaling={false}>
              {es ? 'Inquilino · Residente Activo' : 'Tenant · Active Resident'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeader} allowFontScaling={false}>
          {es ? 'MENÚ DE SERVICIOS' : 'SERVICES MENU'}
        </Text>

        {/* Menu Options */}
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => onNavigate(item.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuLabel} allowFontScaling={false}>{item.label}</Text>
              <Text style={styles.menuSubtitle} allowFontScaling={false}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={16} color="#475569" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Log Out Button docked at the absolute bottom */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => onNavigate('logout')}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText} allowFontScaling={false}>
            {es ? 'Cerrar Sesión' : 'Log Out'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 20 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  profileRole: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  sectionHeader: { fontSize: 10, fontWeight: '800', color: colors.textMuted, marginBottom: 10, letterSpacing: 1 },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextContainer: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  menuSubtitle: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },

  bottomButtonContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  logoutBtn: { 
    backgroundColor: '#ef4444', 
    borderRadius: 12, 
    paddingVertical: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
  },
  logoutBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});

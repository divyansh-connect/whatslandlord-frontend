import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export const ManagerServicesScreen = ({ onNavigate }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get('/notifications?role=Property Manager', logout, refreshAccessToken)
      .then((res) => {
        if (!isMounted) return;
        const raw = res?.data !== undefined ? res.data : res;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        const unread = list.filter((n) => !n.read && !n.isRead).length;
        setUnreadCount(unread);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const menuItems = [
    {
      id: 'notifications',
      label: language === 'es' ? 'Notificaciones' : language === 'hi' ? 'सूचनाएं' : 'Notifications',
      icon: 'notifications-outline',
      color: '#3b82f6',
      badge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : null,
    },
    {
      id: 'properties',
      label: language === 'es' ? 'Propiedades' : language === 'hi' ? 'संपत्तियां' : 'Properties',
      icon: 'business-outline',
      color: '#38bdf8',
    },
    {
      id: 'leads',
      label: language === 'es' ? 'Arrendamiento' : language === 'hi' ? 'लीजिंग' : 'Leasing',
      icon: 'key-outline',
      color: '#f43f5e',
    },
    {
      id: 'tenants',
      label: language === 'es' ? 'Inquilinos' : language === 'hi' ? 'किरायेदार' : 'Tenants',
      icon: 'people-outline',
      color: '#3b82f6',
    },
    {
      id: 'maintenance',
      label: language === 'es' ? 'Mantenimiento' : language === 'hi' ? 'रखरखाव' : 'Maintenance',
      icon: 'hammer-outline',
      color: '#f59e0b',
    },
    {
      id: 'documents',
      label: language === 'es' ? 'Documentos' : language === 'hi' ? 'दस्तावेज़' : 'Documents',
      icon: 'folder-open-outline',
      color: '#6366f1',
    },
    {
      id: 'owners',
      label: language === 'es' ? 'Propietarios' : language === 'hi' ? 'मालिक' : 'Owners',
      icon: 'person-circle-outline',
      color: '#0ea5e9',
    },
    {
      id: 'rent',
      label: language === 'es' ? 'Pagos y Renta' : language === 'hi' ? 'किराया और भुगतान' : 'Rent & Pay',
      icon: 'cash-outline',
      color: '#10b981',
    },
    {
      id: 'accounting',
      label: language === 'es' ? 'Contabilidad' : language === 'hi' ? 'लेखांकन' : 'Accounting',
      icon: 'journal-outline',
      color: '#a855f7',
    },
    {
      id: 'reports',
      label: language === 'es' ? 'Informes' : language === 'hi' ? 'रिपोर्ट्स' : 'Reports',
      icon: 'analytics-outline',
      color: '#ec4899',
    },
    {
      id: 'communication',
      label: language === 'es' ? 'Mensajes' : language === 'hi' ? 'मैसेज' : 'Messages',
      icon: 'chatbubbles-outline',
      color: '#06b6d4',
    },
    {
      id: 'ai',
      label: language === 'es' ? 'Asistente IA' : language === 'hi' ? 'AI सहायक' : 'AI Copilot',
      icon: 'hardware-chip-outline',
      color: '#8b5cf6',
    },
    {
      id: 'profile',
      label: language === 'es' ? 'Preferencias' : language === 'hi' ? 'प्राथमिकताएं' : 'Preferences',
      icon: 'person-circle-outline',
      color: '#0284c7',
    },
    {
      id: 'company-settings',
      label: language === 'es' ? 'Ajustes' : language === 'hi' ? 'सेटिंग्स' : 'Settings',
      icon: 'settings-outline',
      color: '#64748b',
    },
    {
      id: 'integrations',
      label: language === 'es' ? 'Integraciones' : language === 'hi' ? 'इंटीग्रेशन' : 'Integrations',
      icon: 'apps-outline',
      color: '#10b981',
    },
  ];

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => onNavigate && onNavigate('profile')}
          activeOpacity={0.8}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText} allowFontScaling={false}>
              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'P'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} allowFontScaling={false}>
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Property Manager'}
            </Text>
            <Text style={styles.profileRole} allowFontScaling={false}>
              Property Manager · WhatsLandlord Staff
            </Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={18} color="#64748b" />
        </TouchableOpacity>

        <Text style={styles.sectionHeader} allowFontScaling={false}>SERVICES MENU</Text>

        {/* 3-Column Services App Grid */}
        <View style={styles.gridContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.gridItem}
              onPress={() => onNavigate(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: `${item.color}18` }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
                {item.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={styles.gridLabel}
                numberOfLines={2}
                ellipsizeMode="tail"
                allowFontScaling={false}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Log Out Button docked at the bottom */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => onNavigate('logout')}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText} allowFontScaling={false}>Log Out</Text>
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

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  gridItem: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDarkMode ? 0.2 : 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  gridLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },

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

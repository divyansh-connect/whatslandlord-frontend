import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import apiClient from '../api/client';

export const GlobalHeader = ({ onNavigate }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language, setLanguage } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();

  const [unreadCount, setUnreadCount] = useState(3);
  const [langMenuVisible, setLangMenuVisible] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  // Fetch unread notifications count from backend (Exact Web Match: GET /notifications)
  useEffect(() => {
    let isMounted = true;
    const fetchNotifications = async () => {
      try {
        const query = user?.role === 'Tenant' ? '?role=Tenant' : '';
        const res = await apiClient
          .get(`/notifications${query}`, logout, refreshAccessToken)
          .catch(() => apiClient.get('/portal/notifications', logout, refreshAccessToken).catch(() => null));
        const data = res?.data || res || [];
        if (Array.isArray(data) && isMounted) {
          const unread = data.filter((n) => !n.read && !n.isRead).length;
          setUnreadCount(unread);
        }
      } catch (e) {
        if (isMounted) setUnreadCount(0);
      }
    };
    fetchNotifications();
    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.name || user?.email?.split('@')[0] || 'User';

  const displayRole = user?.role || 'Property Manager';
  const initialLetter = (displayName.charAt(0) || 'U').toUpperCase();

  useEffect(() => {
    if (language !== 'en' && language !== 'es') {
      setLanguage('en');
    }
  }, [language]);

  const handleLogout = () => {
    setProfileMenuVisible(false);
    Alert.alert(
      language === 'es' ? 'Cerrar Sesión' : 'Log Out',
      language === 'es'
        ? '¿Estás seguro de que deseas salir?'
        : 'Are you sure you want to log out?',
      [
        { text: language === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: language === 'es' ? 'Salir' : 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.post('/auth/logout', {}).catch(() => null);
            } catch (_) {}
            logout();
          },
        },
      ]
    );
  };

  const languages = [
    { code: 'en', label: 'English', short: 'EN', flag: '🇺🇸' },
    { code: 'es', label: 'Español', short: 'ES', flag: '🇪🇸' },
  ];

  const currentLangObj = languages.find((l) => l.code === language) || languages[0];

  const styles = getStyles(colors, isDarkMode);

  return (
    <View style={styles.headerContainer}>
      {/* Left: Brand Identity */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          style={styles.brandContainer}
          onPress={() => onNavigate && onNavigate('dashboard')}
          activeOpacity={0.8}
          accessibilityLabel="Go to Dashboard"
        >
          <View style={styles.brandLogo}>
            <Ionicons name="business" size={16} color="#0f172a" />
          </View>
          <Text style={styles.brandTitle} numberOfLines={1}>
            Whats<Text style={styles.brandAccent}>Landlord</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Right Controls: Simple Language Switcher, User Avatar, Notification Bell on Far Right */}
      <View style={styles.rightGroup}>
        {/* Simple & Clean Language Switcher Pill */}
        <TouchableOpacity
          style={styles.langPill}
          onPress={() => setLangMenuVisible(true)}
          activeOpacity={0.7}
          accessibilityLabel="Switch Language"
        >
          <Ionicons name="globe-outline" size={13} color="#38bdf8" style={{ marginRight: 4 }} />
          <Text style={styles.langText}>{currentLangObj.short}</Text>
          <Ionicons name="chevron-down" size={11} color={colors.textMuted} style={{ marginLeft: 2 }} />
        </TouchableOpacity>

        {/* Compact User Avatar Button */}
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => setProfileMenuVisible(true)}
          activeOpacity={0.7}
          accessibilityLabel="User Profile Menu"
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{initialLetter}</Text>
          </View>
        </TouchableOpacity>

        {/* Notification Bell with Badge (Positioned at Top-Right) */}
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => onNavigate && onNavigate('notifications')}
          activeOpacity={0.7}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={21} color={colors.textPrimary} />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Modal: Language Selection */}
      <Modal
        visible={langMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLangMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLangMenuVisible(false)}
        >
          <View style={styles.bottomSheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalHeaderTitle}>
              {language === 'es' ? 'Seleccionar Idioma' : 'Select Language'}
            </Text>
            <Text style={styles.modalSubTitle}>
              {language === 'es' ? 'Elige tu idioma preferido para la app' : 'Choose your preferred language for the app'}
            </Text>

            <View style={styles.langListContainer}>
              {languages.map((l) => {
                const selected = l.code === language;
                return (
                  <TouchableOpacity
                    key={l.code}
                    style={[styles.langSheetItem, selected && styles.langSheetItemSelected]}
                    onPress={() => {
                      setLanguage(l.code);
                      setLangMenuVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.langItemLeft}>
                      <Text style={styles.langFlagText}>{l.flag}</Text>
                      <View>
                        <Text style={[styles.langItemName, selected && styles.langItemTextActive]}>
                          {l.label}
                        </Text>
                        <Text style={styles.langItemSub}>Code: {l.short}</Text>
                      </View>
                    </View>
                    {selected ? (
                      <View style={styles.radioSelected}>
                        <Ionicons name="checkmark-sharp" size={14} color="#0f172a" />
                      </View>
                    ) : (
                      <View style={styles.radioUnselected} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bottom Sheet Modal: User Profile & Actions */}
      <Modal
        visible={profileMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setProfileMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setProfileMenuVisible(false)}
        >
          <View style={styles.bottomSheetContent}>
            <View style={styles.sheetHandle} />
            
            {/* User Profile Card */}
            <View style={styles.profileSheetHeader}>
              <View style={styles.profileAvatarLarge}>
                <Text style={styles.profileAvatarTextLarge}>{initialLetter}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.profileModalName} numberOfLines={1}>
                  {displayName}
                </Text>
                <View style={styles.profileRoleBadge}>
                  <Text style={styles.profileRoleBadgeText} numberOfLines={1}>
                    {displayRole}
                  </Text>
                </View>
                <Text style={styles.profileModalEmail} numberOfLines={1}>
                  {user?.email || 'manager@whatslandlord.com'}
                </Text>
              </View>
            </View>

            <View style={styles.sheetDivider} />

            {/* Quick Actions */}
            <TouchableOpacity
              style={styles.sheetActionItem}
              onPress={() => {
                setProfileMenuVisible(false);
                onNavigate && onNavigate('profile');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetActionIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                <Ionicons name="person-outline" size={18} color="#38bdf8" />
              </View>
              <Text style={styles.sheetActionText}>
                {language === 'es' ? 'Mi Perfil' : language === 'hi' ? 'मेरी प्रोफ़ाइल' : 'My Profile'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetActionItem}
              onPress={() => {
                setProfileMenuVisible(false);
                onNavigate && onNavigate('company-settings');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetActionIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                <Ionicons name="settings-outline" size={18} color="#a855f7" />
              </View>
              <Text style={styles.sheetActionText}>
                {language === 'es' ? 'Ajustes de Empresa' : language === 'hi' ? 'कंपनी सेटिंग्स' : 'Company Settings'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <View style={styles.sheetDivider} />

            {/* Logout Action */}
            <TouchableOpacity
              style={styles.logoutSheetItem}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetActionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              </View>
              <Text style={styles.logoutSheetText}>
                {language === 'es' ? 'Cerrar Sesión' : language === 'hi' ? 'लॉग आउट' : 'Log Out'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 48,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#1e293b' : '#e2e8f0',
      zIndex: 40,
    },
    menuBtn: {
      padding: 4,
      marginRight: 6,
    },
    brandContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    brandLogo: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: '#38bdf8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    brandAccent: {
      color: '#38bdf8',
    },
    rightGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    langPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(56, 189, 248, 0.08)',
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.18)',
    },
    langText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#38bdf8',
    },
    avatarBtn: {
      padding: 1,
    },
    avatarCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#0284c7',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#38bdf8' : '#0ea5e9',
    },
    avatarInitial: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '800',
    },
    bellBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    bellBadge: {
      position: 'absolute',
      top: 3,
      right: 3,
      backgroundColor: '#ef4444',
      borderRadius: 8,
      minWidth: 15,
      height: 15,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 2.5,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    bellBadgeText: {
      color: '#ffffff',
      fontSize: 8.5,
      fontWeight: '900',
    },

    // Bottom Sheet Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'flex-end',
    },
    bottomSheetContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDarkMode ? '#475569' : '#cbd5e1',
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalHeaderTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    modalSubTitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    langListContainer: {
      gap: 10,
    },
    langSheetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    langSheetItemSelected: {
      backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(56, 189, 248, 0.08)',
      borderColor: '#38bdf8',
    },
    langItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    langFlagText: {
      fontSize: 22,
    },
    langItemName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    langItemTextActive: {
      color: '#38bdf8',
    },
    langItemSub: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 1,
    },
    radioSelected: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#38bdf8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioUnselected: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.textMuted,
    },

    // Profile Bottom Sheet
    profileSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    profileAvatarLarge: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#0284c7',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#38bdf8',
    },
    profileAvatarTextLarge: {
      fontSize: 20,
      fontWeight: '800',
      color: '#ffffff',
    },
    profileModalName: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    profileRoleBadge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      marginTop: 4,
      marginBottom: 2,
    },
    profileRoleBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#38bdf8',
    },
    profileModalEmail: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    sheetDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginVertical: 12,
    },
    sheetActionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
    sheetActionIconBox: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    sheetActionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    logoutSheetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
    logoutSheetText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ef4444',
    },
  });

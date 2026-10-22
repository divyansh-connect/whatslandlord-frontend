import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { isNoticeForTenant } from '../utils/tenantNoticeHelper';

export const TenantNotificationsScreen = () => {
  const { colors, isDarkMode } = useThemeColors();
  const { language } = useThemeStore();
  const { user, logout, refreshAccessToken } = useAuthStore();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLiveNotifications = useCallback(async () => {
    try {
      const [notifsRes, profileRes] = await Promise.all([
        apiClient.get('/portal/tenant/notifications', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/portal/tenant/profile', logout, refreshAccessToken).catch(() => null),
      ]);

      const raw = notifsRes?.data !== undefined ? notifsRes.data : notifsRes;
      const serverList = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      const profile = profileRes?.data || profileRes || {};

      const tenantCtx = {
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.name,
        profileId: profile?.id,
        profileEmail: profile?.email,
        profileFirstName: profile?.firstName,
        profileLastName: profile?.lastName,
        unitNumber: profile?.unitNumber,
      };

      const isolated = serverList.filter((n) => isNoticeForTenant(n, tenantCtx));
      setNotifications(isolated);
    } catch (e) {
      console.log('Error fetching live tenant notifications:', e.message);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, logout, refreshAccessToken]);

  useEffect(() => {
    fetchLiveNotifications();
  }, [fetchLiveNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLiveNotifications();
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
    try {
      await apiClient.patch('/portal/tenant/notifications/all/read', {}, logout, refreshAccessToken);
    } catch (_) {}
    Alert.alert(
      es ? 'Éxito' : 'Success',
      es ? 'Todas las notificaciones marcadas como leídas' : 'All notifications marked as read'
    );
  };

  const handleClearAll = async () => {
    Alert.alert(
      es ? 'Borrar Todo' : 'Clear All',
      es ? '¿Está seguro de que desea borrar todas las notificaciones?' : 'Are you sure you want to clear all notifications?',
      [
        { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: es ? 'Borrar' : 'Clear',
          style: 'destructive',
          onPress: async () => {
            setNotifications([]);
            try {
              await apiClient.delete('/portal/tenant/notifications', logout, refreshAccessToken);
            } catch (_) {}
          },
        },
      ]
    );
  };

  const handleToggleRead = async (item) => {
    const newReadState = !(item.read || item.isRead);
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: newReadState, isRead: newReadState } : n))
    );

    if (newReadState) {
      try {
        await apiClient.patch(`/portal/tenant/notifications/${item.id}/read`, {}, logout, refreshAccessToken);
      } catch (_) {}
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
    >
      {/* Header matching Web */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.title} allowFontScaling={false}>
              {es ? 'Centro de Notificaciones' : 'Tenant Notifications Center'}
            </Text>
            <Text style={styles.headerDesc} allowFontScaling={false}>
              {es
                ? 'Verifique actualizaciones recientes sobre su contrato, pagos y mantenimiento.'
                : 'Verify recent updates regarding your lease, payments, maintenance orders, and announcements.'}
            </Text>
          </View>

          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead} activeOpacity={0.8}>
            <Ionicons name="checkmark-done-outline" size={15} color="#ffffff" style={{ marginRight: 5 }} />
            <Text style={styles.markAllBtnText} allowFontScaling={false}>
              {es ? 'Marcar Leído' : 'Mark All as Read'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Subheader matching Web */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} allowFontScaling={false}>
          {es ? `ACTIVIDAD RECIENTE (${notifications.length})` : `RECENT ACTIVITY (${notifications.length})`}
        </Text>
        {notifications.length > 0 && (
          <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={13} color="#f43f5e" style={{ marginRight: 4 }} />
            <Text style={styles.clearAllText} allowFontScaling={false}>
              {es ? 'Borrar Todo' : 'Clear All'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading state */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#38bdf8" />
          <Text style={styles.loadingText} allowFontScaling={false}>
            {es ? 'Cargando notificaciones...' : 'Loading notifications...'}
          </Text>
        </View>
      ) : notifications.length === 0 ? (
        /* Empty State 100% synchronized with Web screenshot */
        <View style={styles.emptyCard}>
          <Ionicons name="notifications-outline" size={42} color={colors.textMuted} style={{ marginBottom: 12, opacity: 0.6 }} />
          <Text style={styles.emptyTitle} allowFontScaling={false}>
            {es ? 'No se encontraron alertas' : 'No alerts found'}
          </Text>
          <Text style={styles.emptySubtitle} allowFontScaling={false}>
            {es
              ? 'Está al día con las actualizaciones de su residencia.'
              : 'You are all caught up on your residency updates.'}
          </Text>
        </View>
      ) : (
        /* Notifications List */
        notifications.map((item) => {
          const isRead = item.read || item.isRead;
          const type = (item.type || item.tag || 'Notice').toLowerCase();

          let tagBg = 'rgba(56, 189, 248, 0.15)';
          let tagColor = '#38bdf8';

          if (type.includes('urgent') || type.includes('warning') || type.includes('overdue')) {
            tagBg = 'rgba(239, 68, 68, 0.15)';
            tagColor = '#ef4444';
          } else if (type.includes('success') || type.includes('paid')) {
            tagBg = 'rgba(16, 185, 129, 0.15)';
            tagColor = '#10b981';
          }

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.card,
                isRead ? styles.cardRead : styles.cardUnreadHighlight,
              ]}
              onPress={() => handleToggleRead(item)}
              activeOpacity={0.8}
            >
              <View style={styles.cardMain}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle} allowFontScaling={false}>
                    {item.title}
                  </Text>
                  {!isRead && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.cardDesc} allowFontScaling={false}>
                  {item.message || item.description || ''}
                </Text>
                <Text style={styles.cardTime} allowFontScaling={false}>
                  {item.timestamp || item.date || item.time || 'Recent'}
                </Text>
              </View>

              <View style={styles.cardRight}>
                <View style={[styles.tagBadge, { backgroundColor: tagBg }]}>
                  <Text style={[styles.tagText, { color: tagColor }]} allowFontScaling={false}>
                    {item.type || item.tag || 'Notice'}
                  </Text>
                </View>

                {!isRead && (
                  <TouchableOpacity
                    style={styles.readActionBtn}
                    onPress={() => handleToggleRead(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.readActionText} allowFontScaling={false}>
                      {es ? 'Marcar Leído' : 'Mark Read'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
};

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { padding: 16, paddingBottom: 60 },

    header: { marginBottom: 18 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
    headerDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },

    markAllBtn: {
      backgroundColor: '#0284c7',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    markAllBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },

    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.divider || colors.cardBorder,
      paddingBottom: 8,
      marginBottom: 16,
    },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },
    clearAllBtn: { flexDirection: 'row', alignItems: 'center' },
    clearAllText: { color: '#f43f5e', fontSize: 12, fontWeight: '700' },

    loadingContainer: { padding: 30, alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: colors.textSecondary, fontSize: 12, marginTop: 8 },

    emptyCard: {
      backgroundColor: colors.surface,
      paddingVertical: 44,
      paddingHorizontal: 24,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginTop: 8,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 4,
      textAlign: 'center',
    },
    emptySubtitle: {
      color: colors.textMuted,
      fontSize: 11.5,
      textAlign: 'center',
      maxWidth: 260,
      lineHeight: 16,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    cardRead: { opacity: 0.75 },
    cardUnreadHighlight: {
      borderLeftWidth: 4,
      borderLeftColor: '#0284c7',
    },
    cardMain: { flex: 1, paddingRight: 10 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    cardTitle: { fontSize: 13.5, fontWeight: '800', color: colors.textPrimary },
    unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0284c7', marginLeft: 6, alignSelf: 'center' },
    cardDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
    cardTime: { fontSize: 10, color: colors.textMuted, marginTop: 6 },

    cardRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
    tagBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    tagText: { fontSize: 9.5, fontWeight: '800', textTransform: 'capitalize' },

    readActionBtn: { marginTop: 10, paddingVertical: 4 },
    readActionText: { color: '#0284c7', fontSize: 11, fontWeight: '800' },
  });

export default TenantNotificationsScreen;

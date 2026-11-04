import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { AppActivityIndicator as ActivityIndicator } from '../components/AppActivityIndicator';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore, useNotificationStore } from '../store/useStore';
import { useThemeColors } from '../theme';

// Helper to determine notification category/module (Exact match with Web getNotificationModule)
export const getNotificationModule = (item) => {
  const text = `${item.title || ''} ${item.message || ''}`.toLowerCase();

  if (
    text.includes('work order') ||
    text.includes('maintenance') ||
    text.includes('service request') ||
    text.includes('inspection') ||
    text.includes('vendor') ||
    text.includes('violation')
  ) {
    return 'MAINTENANCE';
  }
  if (
    text.includes('lease') ||
    text.includes('leasing') ||
    text.includes('applicant') ||
    text.includes('move-in') ||
    text.includes('move-out')
  ) {
    return 'LEASING';
  }
  if (text.includes('tenant') || text.includes('portal credentials') || text.includes('screening')) {
    return 'TENANTS';
  }
  if (text.includes('owner') || text.includes('payout') || text.includes('distribution')) {
    return 'OWNERS';
  }
  if (
    text.includes('rent') ||
    text.includes('payment') ||
    text.includes('invoice') ||
    text.includes('late fee') ||
    text.includes('ledger')
  ) {
    return 'RENT & PAYMENTS';
  }
  if (
    text.includes('accounting') ||
    text.includes('journal') ||
    text.includes('expense') ||
    text.includes('income') ||
    text.includes('chart of accounts')
  ) {
    return 'ACCOUNTING';
  }
  if (text.includes('property') || text.includes('building') || text.includes('unit')) {
    return 'PROPERTIES';
  }
  if (text.includes('report')) {
    return 'REPORTS';
  }
  if (
    text.includes('communication') ||
    text.includes('announcement') ||
    text.includes('message') ||
    text.includes('sms') ||
    text.includes('email')
  ) {
    return 'COMMUNICATION';
  }
  if (
    text.includes('user') ||
    text.includes('role') ||
    text.includes('subscription') ||
    text.includes('company settings')
  ) {
    return 'COMPANY SETTINGS';
  }
  return 'GENERAL';
};

// Helper for redirect target screen in mobile app
export const getNotificationRedirectScreen = (title = '', message = '') => {
  const text = `${title} ${message}`.toLowerCase();

  if (text.includes('work order') || text.includes('maintenance') || text.includes('service request') || text.includes('violation')) {
    return 'maintenance';
  }
  if (text.includes('invoice') || text.includes('payment') || text.includes('rent')) {
    return 'rent';
  }
  if (text.includes('lease') || text.includes('leasing')) {
    return 'leads';
  }
  if (text.includes('tenant')) {
    return 'tenants';
  }
  if (text.includes('owner')) {
    return 'owners';
  }
  if (text.includes('property') || text.includes('building') || text.includes('unit')) {
    return 'properties';
  }
  if (text.includes('accounting') || text.includes('journal') || text.includes('expense')) {
    return 'accounting';
  }
  if (text.includes('report')) {
    return 'reports';
  }
  if (text.includes('communication') || text.includes('message') || text.includes('sms') || text.includes('email')) {
    return 'communication';
  }
  if (text.includes('company') || text.includes('role') || text.includes('user')) {
    return 'company-settings';
  }
  return null;
};

export const NotificationsScreen = ({ onNavigate, onBack }) => {
  const { colors, isDarkMode } = useThemeColors();
  const { language } = useThemeStore();
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { setUnreadCount, decrementUnread, resetUnread } = useNotificationStore();
  const styles = getStyles(colors, isDarkMode);

  const displayRole = user?.role || user?.roleName || '';

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Fetch notifications using exact backend API matching Web
  const fetchNotifications = useCallback(async () => {
    try {
      const query = displayRole ? `?role=${encodeURIComponent(displayRole)}` : '';
      const res = await apiClient
        .get(`/notifications${query}`, logout, refreshAccessToken)
        .catch(() => null);

      const raw = res?.data !== undefined ? res.data : res;
      const serverList = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);

      const formatted = serverList.map((n) => ({
        ...n,
        id: String(n.id || Math.random()),
        title: n.title || 'System Notification',
        message: n.message || '',
        read: Boolean(n.read || n.isRead),
        time: n.createdAt
          ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : (n.time || n.timestamp || 'Recent'),
      }));

      setNotifications(formatted);
      const unread = formatted.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (e) {
      console.log('Error fetching notifications:', e);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [displayRole, logout, refreshAccessToken, setUnreadCount]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  // 1. Mark single notification as read (CRUD: PUT /notifications/:id/read)
  const handleMarkAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n))
    );
    decrementUnread();
    try {
      await apiClient.put(`/notifications/${id}/read`, {}, logout, refreshAccessToken).catch(() => null);
    } catch (_) {}
  };

  // 2. Mark ALL as read (CRUD: PUT /notifications/read-all?role=...)
  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
    resetUnread();
    try {
      const query = displayRole ? `?role=${encodeURIComponent(displayRole)}` : '';
      await apiClient.put(`/notifications/read-all${query}`, {}, logout, refreshAccessToken).catch(() => null);
    } catch (_) {}
    Alert.alert(
      language === 'es' ? 'Éxito' : 'Success',
      language === 'es' ? 'Todas las notificaciones marcadas como leídas' : 'All notifications marked as read'
    );
  };

  // 3. Delete single notification (CRUD: DELETE /notifications/:id)
  const handleDeleteNotification = async (id) => {
    const target = notifications.find((n) => n.id === id);
    if (target && !target.read) {
      decrementUnread();
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await apiClient.delete(`/notifications/${id}`, logout, refreshAccessToken).catch(() => null);
    } catch (_) {}
  };

  // 4. Clear ALL notifications (CRUD: DELETE /notifications?role=...)
  const handleClearAll = () => {
    Alert.alert(
      language === 'es' ? 'Borrar Todo' : 'Clear All',
      language === 'es'
        ? '¿Estás seguro de que deseas eliminar todas las notificaciones?'
        : 'Are you sure you want to delete all notifications?',
      [
        { text: language === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: language === 'es' ? 'Borrar Todo' : 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setNotifications([]);
            resetUnread();
            try {
              const query = displayRole ? `?role=${encodeURIComponent(displayRole)}` : '';
              await apiClient.delete(`/notifications${query}`, logout, refreshAccessToken).catch(() => null);
            } catch (_) {}
          },
        },
      ]
    );
  };

  // Notification item tap handler with smart deep-linking to target screen & detail modal
  const handleItemPress = (item) => {
    if (!item.read) {
      handleMarkAsRead(item.id);
    }

    const title = (item.title || '').toLowerCase();
    const message = (item.message || '').toLowerCase();
    const targetUrl = (item.targetUrl || '').toLowerCase();
    const targetId = item.targetId || null;

    let targetTab = null;
    let targetSubTab = null;

    if (
      targetUrl.includes('maintenance') ||
      title.includes('maintenance') ||
      title.includes('service request') ||
      title.includes('work order') ||
      targetUrl.includes('staff')
    ) {
      if (displayRole === 'Maintenance Staff' || user?.role === 'Maintenance Staff') {
        if (onNavigate) {
          onNavigate('mytasks', { id: targetId });
        }
        return;
      }
      targetTab = 'maintenance';
      targetSubTab = targetUrl.includes('work-order') || title.includes('work order') ? 'work_orders' : 'requests';
    } else if (
      targetUrl.includes('rent') ||
      targetUrl.includes('payment') ||
      title.includes('payment') ||
      title.includes('rent') ||
      title.includes('invoice')
    ) {
      targetTab = 'rent';
      targetSubTab = targetUrl.includes('invoice') || title.includes('invoice') ? 'invoices' : 'payments';
    } else if (targetUrl.includes('lease') || title.includes('lease')) {
      targetTab = 'leads';
      targetSubTab = 'leases';
    } else if (targetUrl.includes('tenant') || title.includes('tenant')) {
      targetTab = 'tenants';
    } else if (targetUrl.includes('owner') || title.includes('owner')) {
      targetTab = 'owners';
    } else {
      targetTab = getNotificationRedirectScreen(item.title, item.message);
    }

    if (targetTab && onNavigate) {
      onNavigate(targetTab, {
        tab: targetSubTab,
        id: targetId,
        workOrderId: targetId,
        paymentId: targetId,
        invoiceId: targetId,
        leaseId: targetId,
        tenantId: targetId,
        autoOpen: true,
      });
    }
  };

  // Category Icon & Color Mapping (Exact match with Web)
  const getCategoryMeta = (category) => {
    switch (category) {
      case 'MAINTENANCE':
        return { icon: 'hammer-outline', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
      case 'RENT & PAYMENTS':
        return { icon: 'card-outline', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
      case 'LEASING':
        return { icon: 'document-text-outline', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };
      case 'TENANTS':
        return { icon: 'person-outline', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' };
      case 'OWNERS':
        return { icon: 'business-outline', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)' };
      case 'PROPERTIES':
        return { icon: 'business-outline', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' };
      case 'ACCOUNTING':
        return { icon: 'journal-outline', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' };
      case 'REPORTS':
        return { icon: 'bar-chart-outline', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' };
      case 'COMMUNICATION':
        return { icon: 'chatbubbles-outline', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.12)' };
      case 'COMPANY SETTINGS':
        return { icon: 'settings-outline', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' };
      default:
        return { icon: 'notifications-outline', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' };
    }
  };

  // Filter & Search logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (statusFilter === 'unread' && n.read) return false;
      if (statusFilter === 'read' && !n.read) return false;

      const category = getNotificationModule(n);
      if (categoryFilter !== 'all' && category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = (n.title || '').toLowerCase().includes(query);
        const matchMessage = (n.message || '').toLowerCase().includes(query);
        if (!matchTitle && !matchMessage) return false;
      }

      return true;
    });
  }, [notifications, statusFilter, categoryFilter, searchTerm]);

  const totalCount = notifications.length;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;

  const categories = [
    'all',
    'RENT & PAYMENTS',
    'MAINTENANCE',
    'LEASING',
    'TENANTS',
    'PROPERTIES',
    'ACCOUNTING',
    'COMMUNICATION',
  ];

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
        }
      >
        {/* Clean Header: Title on Left, Action Icons on Right */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => (onBack ? onBack() : onNavigate ? onNavigate('back') : null)}
              style={styles.backBtn}
              accessibilityLabel="Go back"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary || '#f8fafc'} />
            </TouchableOpacity>
            <Text style={styles.pageTitle} allowFontScaling={false}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadCountBadge}>
                <Text style={styles.unreadCountBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>

          {/* Right Action Icons: Mark All Read + Refresh + Clear All */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={onRefresh}
              activeOpacity={0.7}
              accessibilityLabel="Refresh"
            >
              <Ionicons name="refresh-outline" size={19} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={handleMarkAllRead}
              activeOpacity={0.7}
              accessibilityLabel="Mark all read"
            >
              <Ionicons name="checkmark-done" size={20} color="#3b82f6" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={handleClearAll}
              activeOpacity={0.7}
              accessibilityLabel="Clear all"
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Clean Segment Tabs: All | Unread | Read */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, statusFilter === 'all' && styles.segmentBtnActive]}
            onPress={() => setStatusFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, statusFilter === 'all' && styles.segmentTextActive]} allowFontScaling={false}>
              All ({totalCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, statusFilter === 'unread' && styles.segmentBtnActive]}
            onPress={() => setStatusFilter('unread')}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, statusFilter === 'unread' && styles.segmentTextActive]} allowFontScaling={false}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, statusFilter === 'read' && styles.segmentBtnActive]}
            onPress={() => setStatusFilter('read')}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, statusFilter === 'read' && styles.segmentTextActive]} allowFontScaling={false}>
              Read ({readCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input (Subtle, compact) */}
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Ionicons name="search-outline" size={15} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search by keyword..."
            placeholderTextColor={colors.textSecondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
            allowFontScaling={false}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Notifications List */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={[styles.mutedText, { color: colors.textSecondary }]} allowFontScaling={false}>
              Loading notifications...
            </Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Ionicons name="notifications-off-outline" size={38} color={colors.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
              No Notifications
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]} allowFontScaling={false}>
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters or keyword search.'
                : 'All caught up! New system notifications will appear here.'}
            </Text>
          </View>
        ) : (
          filteredNotifications.map((item) => {
            const category = getNotificationModule(item);
            const meta = getCategoryMeta(category);
            const isUnread = !item.read;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.notifCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                  isUnread && styles.notifCardUnread,
                ]}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.75}
              >
                {/* Left: Icon with soft color tint */}
                <View style={[styles.notifIconBox, { backgroundColor: `${meta.color}15` }]}>
                  <Ionicons name={meta.icon} size={18} color={meta.color} />
                </View>

                {/* Middle Content */}
                <View style={styles.notifBody}>
                  {/* Category Tag + Time */}
                  <View style={styles.notifMetaRow}>
                    <View style={[styles.notifTag, { backgroundColor: `${meta.color}15` }]}>
                      <Text style={[styles.notifTagText, { color: meta.color }]} allowFontScaling={false}>
                        {category}
                      </Text>
                    </View>
                    <Text style={[styles.notifTime, { color: colors.textSecondary }]} allowFontScaling={false}>
                      {item.time}
                    </Text>
                  </View>

                  {/* Title */}
                  <Text style={[styles.notifTitle, { color: colors.textPrimary }]} numberOfLines={1} allowFontScaling={false}>
                    {item.title}
                  </Text>

                  {/* Message Body */}
                  {item.message ? (
                    <Text style={[styles.notifMessage, { color: colors.textSecondary }]} numberOfLines={2} allowFontScaling={false}>
                      {item.message}
                    </Text>
                  ) : null}

                  {/* View Details Link */}
                  <Text style={styles.viewDetailsLink} allowFontScaling={false}>
                    View details ↗
                  </Text>
                </View>

                {/* Right Action Icons: Mark Read + Delete */}
                <View style={styles.notifActionsCol}>
                  <TouchableOpacity
                    style={styles.notifActionBtn}
                    onPress={(e) => {
                      e.stopPropagation && e.stopPropagation();
                      handleMarkAsRead(item.id);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Mark read"
                  >
                    <Ionicons
                      name={item.read ? "checkmark-done" : "checkmark-outline"}
                      size={18}
                      color={item.read ? "#3b82f6" : colors.textSecondary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.notifActionBtn}
                    onPress={(e) => {
                      e.stopPropagation && e.stopPropagation();
                      handleDeleteNotification(item.id);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Delete"
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    mainContainer: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 48,
    },

    // Page Header
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    backBtn: {
      marginRight: 10,
      padding: 4,
    },
    pageTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.4,
    },
    unreadCountBadge: {
      backgroundColor: '#ef4444',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 10,
      marginLeft: 8,
    },
    unreadCountBadgeText: {
      color: '#ffffff',
      fontSize: 10.5,
      fontWeight: '800',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerActionBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },

    // Segment Tabs (All | Unread | Read)
    segmentContainer: {
      flexDirection: 'row',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      borderRadius: 12,
      padding: 4,
      marginBottom: 12,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9,
    },
    segmentBtnActive: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    segmentText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: colors.textPrimary,
      fontWeight: '800',
    },

    // Search Box
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 8 : 4,
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 12.5,
      padding: 0,
    },

    // Category Pills
    categoryScroll: {
      flexDirection: 'row',
      gap: 6,
    },
    catPill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    catPillActive: {
      backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : 'rgba(37, 99, 235, 0.1)',
      borderColor: '#38bdf8',
    },
    catPillText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    catPillTextActive: {
      color: '#38bdf8',
      fontWeight: '800',
    },

    // Notification Cards
    notifCard: {
      flexDirection: 'row',
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
      marginBottom: 10,
      alignItems: 'flex-start',
    },
    notifCardUnread: {
      borderLeftWidth: 3.5,
      borderLeftColor: '#38bdf8',
    },
    notifIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginTop: 2,
    },
    notifBody: {
      flex: 1,
      marginRight: 8,
    },
    notifMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 3,
    },
    notifTag: {
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 4,
    },
    notifTagText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    notifTime: {
      fontSize: 11,
    },
    notifTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 3,
      letterSpacing: -0.2,
    },
    notifMessage: {
      fontSize: 12,
      lineHeight: 16,
      marginBottom: 6,
    },
    viewDetailsLink: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#3b82f6',
    },

    // Actions Col
    notifActionsCol: {
      alignItems: 'center',
      gap: 12,
      paddingLeft: 4,
      paddingTop: 4,
    },
    notifActionBtn: {
      padding: 2,
    },

    // Empty & Loading States
    centerBox: {
      paddingVertical: 50,
      alignItems: 'center',
    },
    mutedText: {
      fontSize: 13,
      marginTop: 8,
    },
    emptyCard: {
      borderRadius: 16,
      borderWidth: 1,
      paddingVertical: 40,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 4,
    },
    emptySub: {
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 17,
    },
  });

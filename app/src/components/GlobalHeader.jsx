import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useNotificationStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import apiClient from '../api/client';

export const GlobalHeader = ({ onNavigate }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { unreadCount, setUnreadCount } = useNotificationStore();
  const { colors, isDarkMode } = useThemeColors();

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
    const interval = setInterval(fetchNotifications, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.role, logout, refreshAccessToken, setUnreadCount]);

  const styles = getStyles(colors, isDarkMode);

  return (
    <View style={styles.headerContainer}>
      {/* Right Controls: Only Notification Bell */}
      <TouchableOpacity
        style={styles.bellBtn}
        onPress={() => onNavigate && onNavigate('notifications')}
        activeOpacity={0.7}
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
        {unreadCount > 0 && (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: 46,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#1e293b' : '#e2e8f0',
      zIndex: 40,
    },
    bellBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    bellBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: '#ef4444',
      borderRadius: 9,
      minWidth: 17,
      height: 17,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    bellBadgeText: {
      color: '#ffffff',
      fontSize: 9,
      fontWeight: '900',
    },
  });

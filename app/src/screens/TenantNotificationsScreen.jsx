import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme';
import { useThemeStore } from '../store/useStore';

export const TenantNotificationsScreen = () => {
  const { colors, isDarkMode } = useThemeColors();
  const { language } = useThemeStore();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Package Arrived at Front Desk',
      description: 'A parcel from Amazon Logistics is waiting at reception.',
      time: '06:41 AM',
      tag: 'warning',
      read: false,
    },
    {
      id: '2',
      title: 'Maintenance Request Scheduled',
      description: 'Work order #WO-1042 for HVAC repair is assigned for Thursday at 10 AM.',
      time: '06:41 AM',
      tag: 'success',
      read: false,
    },
    {
      id: '3',
      title: 'Monthly Rent Statement Ready',
      description: 'Your monthly rent invoice for August 2026 is available for download.',
      time: '06:41 AM',
      tag: 'info',
      read: false,
    },
  ]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    Alert.alert(
      es ? 'Éxito' : 'Success',
      es ? 'Todas las notificaciones marcadas como leídas' : 'All notifications marked as read'
    );
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const toggleRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} allowFontScaling={false}>
          {es ? 'Notificaciones' : 'Notifications'}
        </Text>
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Ionicons name="checkmark-done-outline" size={16} color="#0f172a" style={{ marginRight: 4 }} />
            <Text style={styles.markAllBtnText} allowFontScaling={false}>
              {es ? 'Marcar Todo Leído' : 'Mark All Read'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Subheader */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} allowFontScaling={false}>
          {es ? `ACTIVIDAD RECIENTE (${notifications.length})` : `RECENT ACTIVITY (${notifications.length})`}
        </Text>
        {notifications.length > 0 && (
          <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll}>
            <Ionicons name="trash-outline" size={14} color="#f87171" style={{ marginRight: 4 }} />
            <Text style={styles.clearAllText} allowFontScaling={false}>
              {es ? 'Borrar Todo' : 'Clear All'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Empty State */}
      {notifications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="notifications-off-outline" size={48} color="#475569" style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText} allowFontScaling={false}>
            {es ? 'No se encontraron notificaciones recientes.' : 'No recent notifications found.'}
          </Text>
        </View>
      ) : (
        notifications.map((item) => {
          let tagBg = 'rgba(245, 158, 11, 0.15)';
          let tagColor = '#f59e0b';

          if (item.tag === 'success') {
            tagBg = 'rgba(16, 185, 129, 0.15)';
            tagColor = '#10b981';
          } else if (item.tag === 'info') {
            tagBg = 'rgba(56, 189, 248, 0.15)';
            tagColor = '#38bdf8';
          }

          return (
            <TouchableOpacity 
              key={item.id} 
              style={[
                styles.card, 
                item.read && styles.cardRead,
                !item.read && styles.cardUnreadHighlight
              ]}
              onPress={() => toggleRead(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardMain}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle} allowFontScaling={false}>
                    {item.title}
                  </Text>
                  {!item.read && (
                    <View style={styles.unreadDot} />
                  )}
                </View>
                <Text style={styles.cardDesc} allowFontScaling={false}>{item.description}</Text>
                <Text style={styles.cardTime} allowFontScaling={false}>{item.time}</Text>
              </View>

              <View style={styles.cardRight}>
                <View style={[styles.tagBadge, { backgroundColor: tagBg }]}>
                  <Text style={[styles.tagText, { color: tagColor }]} allowFontScaling={false}>
                    {item.tag}
                  </Text>
                </View>

                <TouchableOpacity style={styles.readActionBtn} onPress={() => toggleRead(item.id)}>
                  <Text style={styles.readActionText} allowFontScaling={false}>
                    {item.read ? (es ? 'No Leído' : 'Unread') : (es ? 'Marcar Leído' : 'Mark read')}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: 16, paddingBottom: 60 },

  header: { marginBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, flex: 1 },

  markAllBtn: { backgroundColor: '#38bdf8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  markAllBtnText: { color: '#0f172a', fontSize: 11, fontWeight: '800' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  clearAllBtn: { flexDirection: 'row', alignItems: 'center' },
  clearAllText: { color: '#f87171', fontSize: 12, fontWeight: '700' },

  emptyCard: { backgroundColor: colors.surface, padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  emptyText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardRead: { opacity: 0.6 },
  cardUnreadHighlight: {
    borderLeftWidth: 4,
    borderLeftColor: '#38bdf8',
  },
  cardMain: { flex: 1, paddingRight: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#38bdf8', marginLeft: 6, alignSelf: 'center' },
  cardDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  cardTime: { fontSize: 10.5, color: colors.textMuted, marginTop: 6 },

  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 9.5, fontWeight: '800', textTransform: 'lowercase' },

  readActionBtn: { marginTop: 10, paddingVertical: 4 },
  readActionText: { color: '#38bdf8', fontSize: 11, fontWeight: '700' },
});

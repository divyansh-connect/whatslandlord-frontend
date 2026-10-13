import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';

export const StaffDashboard = () => {
  const { user } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';
  const [refreshing, setRefreshing] = useState(false);

  const workOrders = [
    { id: 'WO-101', title: 'AC Cooling Leakage', location: 'Sunset Heights #204', priority: 'High', status: 'In Progress' },
    { id: 'WO-102', title: 'Kitchen Sink Clogged', location: 'Grand Horizon #102', priority: 'Medium', status: 'Pending' },
    { id: 'WO-103', title: 'Main Gate Lock Repair', location: 'Building A Lobby', priority: 'Low', status: 'Completed' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} tintColor="#38bdf8" />}
    >
      <View style={styles.header}>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText} allowFontScaling={false}>🛠️ {es ? 'Personal de Mantenimiento' : 'Maintenance Staff'}</Text>
        </View>
        <Text style={styles.title} allowFontScaling={false}>{es ? 'Tablero de Órdenes de Trabajo' : 'Work Orders Dashboard'}</Text>
        <Text style={styles.subtitle} allowFontScaling={false}>{es ? 'Gestione tareas, unidades asignadas y órdenes de trabajo' : 'Manage repair tasks, assigned units & work orders'}</Text>
      </View>

      {/* KPI Stats */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel} allowFontScaling={false}>{es ? 'ÓRDENES ASIGNADAS' : 'ASSIGNED ORDERS'}</Text>
          <Text style={[styles.kpiVal, { color: '#38bdf8' }]} allowFontScaling={false}>4</Text>
          <Text style={styles.kpiSub} allowFontScaling={false}>{es ? 'Tickets Activos' : 'Active Work Tickets'}</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel} allowFontScaling={false}>{es ? 'EN PROGRESO' : 'IN PROGRESS'}</Text>
          <Text style={[styles.kpiVal, { color: '#facc15' }]} allowFontScaling={false}>2</Text>
          <Text style={styles.kpiSub} allowFontScaling={false}>{es ? 'Reparando Actualmente' : 'Currently Repairing'}</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel} allowFontScaling={false}>{es ? 'COMPLETADAS (MES)' : 'COMPLETED (THIS MONTH)'}</Text>
          <Text style={[styles.kpiVal, { color: '#4ade80' }]} allowFontScaling={false}>14</Text>
          <Text style={styles.kpiSub} allowFontScaling={false}>{es ? 'Tickets Resueltos' : 'Resolved Tickets'}</Text>
        </View>
      </View>

      {/* Work Orders List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} allowFontScaling={false}>📋 {es ? 'Órdenes de Trabajo Asignadas' : 'Assigned Work Orders'}</Text>
      </View>

      {workOrders.map((wo) => (
        <View key={wo.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.woId} allowFontScaling={false}>{wo.id}</Text>
            <View style={[styles.priorityBadge, wo.priority === 'High' ? styles.priorityHigh : styles.priorityMed]}>
              <Text style={styles.priorityText} allowFontScaling={false}>
                {es ? (wo.priority === 'High' ? 'Alta' : wo.priority === 'Medium' ? 'Media' : 'Baja') : wo.priority} {es ? 'Prioridad' : 'Priority'}
              </Text>
            </View>
          </View>
          <Text style={styles.woTitle} allowFontScaling={false}>{wo.title}</Text>
          <Text style={styles.woLocation} allowFontScaling={false}>📍 {wo.location}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.statusText} allowFontScaling={false}>{es ? 'Estado:' : 'Status:'} {es ? (wo.status === 'In Progress' ? 'En Progreso' : wo.status === 'Pending' ? 'Pendiente' : 'Completado') : wo.status}</Text>
            <TouchableOpacity style={styles.updateBtn}>
              <Text style={styles.updateBtnText} allowFontScaling={false}>{es ? 'Actualizar Estado →' : 'Update Status →'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16 },
  header: { marginBottom: 16 },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  roleBadgeText: { color: '#f87171', fontSize: 12, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  kpiGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  kpiLabel: { fontSize: 9.5, color: colors.textSecondary, fontWeight: '700', letterSpacing: 0.5 },
  kpiVal: { fontSize: 18, fontWeight: '800', marginVertical: 2 },
  kpiSub: { fontSize: 9.5, color: colors.textSecondary, textAlign: 'center' },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  woId: { color: '#38bdf8', fontSize: 12, fontWeight: '700' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  priorityHigh: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  priorityMed: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
  priorityText: { color: '#f87171', fontSize: 11, fontWeight: '700' },
  woTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginVertical: 6 },
  woLocation: { color: colors.textSecondary, fontSize: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.divider },
  statusText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  updateBtn: { padding: 4 },
  updateBtnText: { color: '#38bdf8', fontSize: 12, fontWeight: '700' },
});

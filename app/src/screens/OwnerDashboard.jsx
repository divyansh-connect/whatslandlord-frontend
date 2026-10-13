import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const OwnerDashboard = ({ onNavigate }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { theme, language } = useThemeStore();
  const isDarkMode = theme === 'dark';
  const es = language === 'es';
  const styles = getStyles(isDarkMode);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    totalProperties: 0,
    occupancyRate: '0%',
    netIncome: '$0',
    pendingMaintenance: 0,
  });
  const [properties, setProperties] = useState([]);

  // Mock monthly data for the chart: Income vs Expenses
  const chartData = [
    { month: 'May', income: 1900, expenses: 600 },
    { month: 'Jun', income: 2000, expenses: 650 },
    { month: 'Jul', income: 2200, expenses: 700 },
    { month: 'Aug', income: 2400, expenses: 750 },
    { month: 'Sep', income: 2250, expenses: 710 },
    { month: 'Oct', income: 2300, expenses: 720 },
  ];

  const fetchLiveOwnerData = async () => {
    try {
      setLoading(true);
      const [metricsRes, propsRes] = await Promise.all([
        apiClient.get('/portal/owner/metrics', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/properties', logout, refreshAccessToken).catch(() => null),
      ]);

      if (metricsRes && metricsRes.data) {
        const m = metricsRes.data;
        setMetrics({
          totalProperties: m.totalProperties !== undefined ? m.totalProperties : 0,
          occupancyRate: typeof m.occupancyRate === 'number' ? `${m.occupancyRate}%` : (m.occupancyRate || '0%'),
          netIncome: m.netIncome !== undefined ? `$${Number(m.netIncome).toLocaleString()}` : '$0',
          pendingMaintenance: m.pendingMaintenance || 0,
        });
      }

      let pList = [];
      if (propsRes && Array.isArray(propsRes)) {
        pList = propsRes;
      } else if (propsRes && propsRes.data && Array.isArray(propsRes.data)) {
        pList = propsRes.data;
      }
      setProperties(pList);
    } catch (e) {
      console.log('Error fetching owner metrics:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveOwnerData();
  }, []);

  const ownerName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Owner');

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>Loading Owner Portal...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLiveOwnerData} tintColor="#38bdf8" />}
    >
      {/* Welcome Header with Bell Icon */}
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeLeft}>
          <Text style={styles.title} allowFontScaling={false}>Owner Portfolio Dashboard</Text>
          <Text style={styles.subtitle} allowFontScaling={false}>
            Verify monthly portfolio incomes, occupancy trends, net profits, and contractor dispatches.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => onNavigate('notifications')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color={isDarkMode ? '#cbd5e1' : '#475569'} />
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText} allowFontScaling={false}>2</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Quick Action Buttons matching Web 1-to-1 */}
      <View style={styles.quickActionsCard}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() => Alert.alert('Downloading', 'Generating monthly statement PDF...')}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={15} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnPrimaryText} allowFontScaling={false}>Download Statement</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={() => onNavigate('properties')}
            activeOpacity={0.8}
          >
            <Ionicons name="business-outline" size={15} color="#cbd5e1" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnOutlineText} allowFontScaling={false}>My Properties</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={() => onNavigate('messages')}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbox-ellipses-outline" size={15} color="#cbd5e1" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnOutlineText} allowFontScaling={false}>Contact Manager</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={() => Alert.alert('Tax Documents', 'Tax documents ready for download.')}
            activeOpacity={0.8}
          >
            <Ionicons name="document-attach-outline" size={15} color="#cbd5e1" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnOutlineText} allowFontScaling={false}>Tax Documents</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4 Owner Metric Cards matching Web App Layout */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel} allowFontScaling={false}>MANAGED PROPERTIES</Text>
          <Text style={[styles.kpiVal, { color: '#38bdf8' }]} allowFontScaling={false}>{metrics.totalProperties}</Text>
          <Text style={styles.kpiSub} allowFontScaling={false}>Active assets holdings</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel} allowFontScaling={false}>OCCUPANCY RATE</Text>
          <Text style={[styles.kpiVal, { color: '#10b981' }]} allowFontScaling={false}>{metrics.occupancyRate}</Text>
          <Text style={styles.kpiSub} allowFontScaling={false}>3 Total Units</Text>
        </View>
      </View>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel} allowFontScaling={false}>MONTHLY NET INCOME</Text>
          <Text style={[styles.kpiVal, { color: '#10b981' }]} allowFontScaling={false}>{metrics.netIncome}</Text>
          <Text style={styles.kpiSub} allowFontScaling={false}>Operating cash flows</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel} allowFontScaling={false}>PENDING MAINTENANCE</Text>
          <Text style={[styles.kpiVal, { color: '#f59e0b' }]} allowFontScaling={false}>{metrics.pendingMaintenance}</Text>
          <Text style={styles.kpiSub} allowFontScaling={false}>Active service requests</Text>
        </View>
      </View>

      {/* INCOME VS OPERATING EXPENSES Chart Card */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle} allowFontScaling={false}>INCOME VS OPERATING EXPENSES</Text>
        <View style={styles.divider} />
        
        {/* Vector Bar Chart */}
        <View style={styles.chartContainer}>
          {/* Y-Axis Labels */}
          <View style={styles.yAxis}>
            <Text style={styles.yAxisText} allowFontScaling={false}>$2,500</Text>
            <Text style={styles.yAxisText} allowFontScaling={false}>$1,875</Text>
            <Text style={styles.yAxisText} allowFontScaling={false}>$1,250</Text>
            <Text style={styles.yAxisText} allowFontScaling={false}>$625</Text>
            <Text style={styles.yAxisText} allowFontScaling={false}>$0</Text>
          </View>

          {/* Bar Columns */}
          <View style={styles.barsArea}>
            {chartData.map((data, index) => {
              const MAX_BAR_HEIGHT = 95;
              const incomeHeight = Math.min(MAX_BAR_HEIGHT, Math.max(6, (data.income / 2500) * MAX_BAR_HEIGHT));
              const expensesHeight = Math.min(MAX_BAR_HEIGHT, Math.max(6, (data.expenses / 2500) * MAX_BAR_HEIGHT));

              return (
                <View key={index} style={styles.barGroup}>
                  <View style={styles.barsRow}>
                    {/* Income Bar (Green) */}
                    <View style={[styles.bar, styles.incomeBar, { height: incomeHeight }]} />
                    {/* Expenses Bar (Red) */}
                    <View style={[styles.bar, styles.expenseBar, { height: expensesHeight }]} />
                  </View>
                  <Text style={styles.xAxisText} allowFontScaling={false}>{data.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText} allowFontScaling={false}>Net Income</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText} allowFontScaling={false}>Operating Expenses</Text>
          </View>
        </View>
      </View>

      {/* Owned Properties List */}
      <View style={styles.sectionHeader}>
        <Ionicons name="business-outline" size={16} color="#cbd5e1" style={{ marginRight: 6 }} />
        <Text style={styles.sectionTitle} allowFontScaling={false}>Owned Properties</Text>
      </View>

      {properties.length === 0 ? (
        <>
          <View style={styles.propCard}>
            <View style={styles.propHeader}>
              <Ionicons name="business-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
              <Text style={styles.propName} allowFontScaling={false}>Sky house</Text>
            </View>
            <View style={styles.propDetailLine}>
              <Ionicons name="location-outline" size={13} color="#94a3b8" style={{ marginRight: 4 }} />
              <Text style={styles.propSub} allowFontScaling={false}>Bhopal mp nagar · 0 Units</Text>
            </View>
          </View>

          <View style={styles.propCard}>
            <View style={styles.propHeader}>
              <Ionicons name="business-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
              <Text style={styles.propName} allowFontScaling={false}>property 1</Text>
            </View>
            <View style={styles.propDetailLine}>
              <Ionicons name="location-outline" size={13} color="#94a3b8" style={{ marginRight: 4 }} />
              <Text style={styles.propSub} allowFontScaling={false}>Indore, indore, Mp, India · 2 Units</Text>
            </View>
          </View>
        </>
      ) : (
        properties.map((prop, idx) => (
          <View key={prop.id || `op-${idx}`} style={styles.propCard}>
            <View style={styles.propHeader}>
              <Ionicons name="business-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
              <Text style={styles.propName} allowFontScaling={false}>{prop.name || 'Property'}</Text>
            </View>
            <View style={styles.propDetailLine}>
              <Ionicons name="location-outline" size={13} color="#94a3b8" style={{ marginRight: 4 }} />
              <Text style={styles.propSub} allowFontScaling={false}>
                {typeof prop.address === 'string' ? prop.address : 'Indore, Mp 42342'} · {prop.units && prop.units.length > 0 ? prop.units.length : (prop.unitsCount || 0)} Units
              </Text>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
};

const getStyles = (isDarkMode) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' },
  scrollContent: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: 8 },

  welcomeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  welcomeLeft: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a' },
  subtitle: { fontSize: 11.5, color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: 4, lineHeight: 16 },

  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 2,
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: { color: '#ffffff', fontSize: 9.5, fontWeight: '800' },

  quickActionsCard: {
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    gap: 10,
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtnPrimary: { flex: 1, backgroundColor: '#0284c7', paddingVertical: 10, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  actionBtnPrimaryText: { color: '#ffffff', fontSize: 12.5, fontWeight: '800' },
  actionBtnOutline: { flex: 1, backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9', paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#cbd5e1', flexDirection: 'row', justifyContent: 'center' },
  actionBtnOutlineText: { color: isDarkMode ? '#cbd5e1' : '#475569', fontSize: 12.5, fontWeight: '800' },

  kpiGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  kpiCard: { flex: 1, backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#e2e8f0' },
  kpiLabel: { fontSize: 8.5, color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: '800', letterSpacing: 0.5 },
  kpiVal: { fontSize: 20, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a', marginVertical: 4 },
  kpiSub: { fontSize: 11, color: isDarkMode ? '#64748b' : '#94a3b8' },

  chartCard: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#cbd5e1' },
  chartTitle: { fontSize: 10.5, fontWeight: '800', color: isDarkMode ? '#cbd5e1' : '#475569', letterSpacing: 1 },
  divider: { height: 1, backgroundColor: isDarkMode ? '#334155' : '#cbd5e1', marginVertical: 12 },
  
  chartContainer: { flexDirection: 'row', height: 150, alignItems: 'flex-end', paddingTop: 10 },
  yAxis: { justifyContent: 'space-between', height: 120, paddingRight: 8, paddingBottom: 16 },
  yAxisText: { color: '#64748b', fontSize: 9.5, fontWeight: '600', textAlign: 'right', width: 42 },
  
  barsArea: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 136 },
  barGroup: { alignItems: 'center', width: 44 },
  barsRow: { flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 120, justifyContent: 'center' },
  bar: { width: 8, borderRadius: 3 },
  incomeBar: { backgroundColor: '#10b981' },
  expenseBar: { backgroundColor: '#ef4444' },
  xAxisText: { color: '#64748b', fontSize: 9.5, fontWeight: '700', marginTop: 6 },

  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendColor: { width: 10, height: 10, borderRadius: 3, marginRight: 6 },
  legendText: { color: isDarkMode ? '#cbd5e1' : '#475569', fontSize: 11, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: isDarkMode ? '#cbd5e1' : '#475569', letterSpacing: 0.5 },

  propCard: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#cbd5e1' },
  propHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  propName: { color: isDarkMode ? '#f8fafc' : '#0f172a', fontSize: 15, fontWeight: '800' },
  propDetailLine: { flexDirection: 'row', alignItems: 'center' },
  propSub: { color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12.5 },
});

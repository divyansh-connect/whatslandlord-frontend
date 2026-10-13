import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

// Animated Touchable Component
const AnimatedTouchable = ({ children, onPress, style, disabled }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleValue }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const StatementsScreen = () => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatement, setSelectedStatement] = useState(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const runEntryAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Strictly call live Railway endpoint: GET /portal/owner/statements
  const fetchLiveStatements = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/portal/owner/statements', logout, refreshAccessToken);
      const rawList = Array.isArray(res) ? res : (res?.data || []);

      if (rawList && rawList.length > 0) {
        const mapped = rawList.map((item) => ({
          id: item.id || `stmt-${Math.random()}`,
          period: item.period || 'Current Period',
          propertyName: item.propertyName || 'Property',
          totalIncome: Number(item.totalIncome || item.income) || 0,
          totalExpenses: Number(item.totalExpenses || item.expenses) || 0,
          netDistribution: Number(item.netDistribution) || 0,
          status: item.status || 'Published',
          generatedDate: item.generatedDate || item.date || '2026-08-04',
        }));
        setStatements(mapped);
      } else {
        setStatements([]);
      }
    } catch (e) {
      console.log('Error fetching GET /portal/owner/statements:', e.message);
      setStatements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  useEffect(() => {
    fetchLiveStatements();
  }, []);

  const filteredStatements = statements.filter((item) => {
    const text = `${item.propertyName || ''} ${item.period || ''} ${item.status || ''}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>Loading Owner Financial Statements...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.mainWrapper}
      contentContainerStyle={styles.outerContentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLiveStatements} tintColor="#38bdf8" />}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Page Header */}
        <View style={styles.header}>
          <Text style={styles.title} allowFontScaling={false}>Owner Financial Statements</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search statements by property location..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.showingRow}>
          <Text style={styles.showingText} allowFontScaling={false}>
            FINANCIAL STATEMENTS ({filteredStatements.length})
          </Text>
        </View>

        {/* Statements List */}
        {filteredStatements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color="#475569" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText} allowFontScaling={false}>No statements found</Text>
            <Text style={styles.emptySubText} allowFontScaling={false}>
              No statements found matching your search.
            </Text>
          </View>
        ) : (
          filteredStatements.map((item, idx) => (
            <AnimatedTouchable
              key={item.id || `stmt-${idx}`}
              style={styles.card}
              onPress={() => setSelectedStatement(item)}
            >
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.propertyNameRow}>
                    <Ionicons name="business-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
                    <Text style={styles.propNameText} allowFontScaling={false}>
                      {item.propertyName}
                    </Text>
                  </View>
                  <Text style={styles.periodText} allowFontScaling={false}>
                    Period: {item.period} · Generated: {item.generatedDate}
                  </Text>
                </View>

                {/* STATUS BADGE & EYE ACTION BUTTON */}
                <View style={styles.rightGroup}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText} allowFontScaling={false}>{item.status}</Text>
                  </View>

                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setSelectedStatement(item)} activeOpacity={0.7}>
                    <Ionicons name="eye-outline" size={14} color="#cbd5e1" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Financial Metrics Grid matching Web Columns */}
              <View style={styles.metricsRow}>
                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel} allowFontScaling={false}>GROSS INCOME</Text>
                  <Text style={styles.metricVal} allowFontScaling={false}>${item.totalIncome.toLocaleString()}</Text>
                </View>

                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel} allowFontScaling={false}>TOTAL EXPENSES</Text>
                  <Text style={[styles.metricVal, { color: '#f87171' }]} allowFontScaling={false}>
                    ${item.totalExpenses.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.metricColRight}>
                  <Text style={styles.metricLabel} allowFontScaling={false}>NET DISTRIBUTION</Text>
                  <Text style={[styles.metricVal, { color: '#10b981', fontWeight: '800' }]} allowFontScaling={false}>
                    ${item.netDistribution.toLocaleString()}
                  </Text>
                </View>
              </View>
            </AnimatedTouchable>
          ))
        )}
      </Animated.View>

      {/* MODAL: Statement Details Modal */}
      <Modal visible={!!selectedStatement} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="document-text-outline" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle} allowFontScaling={false}>
                  Statement Details
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedStatement(null)}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Statement Period</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedStatement?.period}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Property Location</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedStatement?.propertyName}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Gross Income</Text>
                <Text style={[styles.detailVal, { color: '#f8fafc' }]} allowFontScaling={false}>${selectedStatement?.totalIncome.toLocaleString()}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Total Expenses</Text>
                <Text style={[styles.detailVal, { color: '#f87171' }]} allowFontScaling={false}>-${selectedStatement?.totalExpenses.toLocaleString()}</Text>
              </View>

              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Net Payout Distribution</Text>
                <Text style={[styles.detailVal, { color: '#10b981', fontWeight: '900', fontSize: 15 }]} allowFontScaling={false}>
                  ${selectedStatement?.netDistribution.toLocaleString()}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedStatement(null)}>
              <Text style={styles.closeModalBtnText} allowFontScaling={false}>Close Statement</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: colors.background },
  outerContentContainer: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 8 },

  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },

  showingRow: { marginBottom: 12 },
  showingText: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },

  searchBarRow: { marginBottom: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    color: colors.textPrimary,
    fontSize: 12,
    flex: 1,
    padding: 0,
  },

  emptyCard: { backgroundColor: colors.surface, padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  emptyText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  emptySubText: { color: colors.textMuted, fontSize: 12, marginTop: 4 },

  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.cardBorder },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  propertyNameRow: { flexDirection: 'row', alignItems: 'center' },
  propNameText: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  periodText: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },

  rightGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { backgroundColor: 'rgba(56, 189, 248, 0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#38bdf8' },
  statusBadgeText: { color: '#38bdf8', fontSize: 10, fontWeight: '800' },
  eyeBtn: { backgroundColor: colors.inputBackground, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder },

  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 12 },

  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricCol: { flex: 1 },
  metricColRight: { alignItems: 'flex-end' },
  metricLabel: { fontSize: 8.5, color: colors.textMuted, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  metricVal: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },

  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.cardBorder },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },

  detailContainer: { backgroundColor: colors.inputBackground, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surface },
  detailLabel: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '600' },
  detailVal: { color: colors.textPrimary, fontSize: 12.5, fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: 16 },

  closeModalBtn: { backgroundColor: colors.buttonSecondary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  closeModalBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
});

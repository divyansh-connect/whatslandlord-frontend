import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { AppActivityIndicator as ActivityIndicator } from '../components/AppActivityIndicator';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export const DistributionsScreen = ({ onNavigate, onBack }) => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDist, setSelectedDist] = useState(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const runEntryAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Live endpoint: GET /portal/owner/distributions
  const fetchLiveDistributions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/portal/owner/distributions', logout, refreshAccessToken);
      const rawList = Array.isArray(res) ? res : (res?.data || []);

      if (rawList && rawList.length > 0) {
        const mapped = rawList.map((item, idx) => ({
          id: item.id || `dist-${idx}`,
          distributionNo: item.distributionNumber || item.distributionNo || (item.id ? `DIST-${item.id.substring(0, 4).toUpperCase()}` : `DIST-${1000 + idx}`),
          propertyManaged: item.propertyName || item.propertyManaged || 'Portfolio Distribution',
          paymentDate: item.date ? item.date.split('T')[0] : (item.paymentDate ? item.paymentDate.split('T')[0] : '2026-10-31'),
          amountPaid: Number(item.amount !== undefined ? item.amount : item.amountPaid) || 0,
          payoutMethod: item.method || item.payoutMethod || 'Direct Deposit',
          status: item.status || 'Completed',
        }));
        setDistributions(mapped);
      } else {
        setDistributions([]);
      }
    } catch (e) {
      console.log('Error fetching GET /portal/owner/distributions:', e?.message || e);
      setDistributions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  useEffect(() => {
    fetchLiveDistributions();
  }, []);

  const filteredDistributions = distributions.filter((item) => {
    const text = `${item.distributionNo || ''} ${item.propertyManaged || ''} ${item.status || ''} ${item.payoutMethod || ''}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const getStatusStyle = (status) => {
    const lower = String(status || '').toLowerCase();
    if (lower === 'completed' || lower === 'paid') {
      return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
    }
    return { bg: 'rgba(56, 189, 248, 0.12)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>Loading Payout Distributions Log...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.mainWrapper}
      contentContainerStyle={styles.outerContentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLiveDistributions} tintColor="#38bdf8" />}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Page Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {(!!onNavigate || !!onBack) && (
              <TouchableOpacity
                onPress={() => (onBack ? onBack() : onNavigate ? onNavigate('back') : null)}
                style={{ marginRight: 10, padding: 4 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
            <View>
              <Text style={styles.title} allowFontScaling={false}>Payout Distributions Log</Text>
              <Text style={styles.subTitle} allowFontScaling={false}>
                Verify executed owner payouts, payment processing schedules, and distribution breakdowns.
              </Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search distributions by number or property..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.showingRow}>
          <Text style={styles.showingText} allowFontScaling={false}>
            SHOWING {filteredDistributions.length} DISTRIBUTION RECORDS
          </Text>
        </View>

        {/* Table Container */}
        {filteredDistributions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="wallet-outline" size={48} color="#475569" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText} allowFontScaling={false}>No distribution records found</Text>
            <Text style={styles.emptySubText} allowFontScaling={false}>No payouts match your search filter.</Text>
          </View>
        ) : (
          <View style={styles.tableCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header Row */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thCell, { width: 120 }]} allowFontScaling={false}>DISTRIBUTION #</Text>
                  <Text style={[styles.thCell, { width: 170 }]} allowFontScaling={false}>PROPERTY MANAGED</Text>
                  <Text style={[styles.thCell, { width: 110 }]} allowFontScaling={false}>PAYMENT DATE</Text>
                  <Text style={[styles.thCell, { width: 120, textAlign: 'right' }]} allowFontScaling={false}>AMOUNT PAID</Text>
                  <Text style={[styles.thCell, { width: 130 }]} allowFontScaling={false}>PAYOUT METHOD</Text>
                  <Text style={[styles.thCell, { width: 110, textAlign: 'center' }]} allowFontScaling={false}>STATUS</Text>
                </View>

                {/* Table Data Rows */}
                {filteredDistributions.map((item, idx) => {
                  const statusStyle = getStatusStyle(item.status);
                  const isEven = idx % 2 === 0;
                  return (
                    <TouchableOpacity
                      key={item.id || `dist-row-${idx}`}
                      style={[
                        styles.tableRow,
                        isEven ? styles.tableRowEven : styles.tableRowOdd,
                        idx === filteredDistributions.length - 1 && { borderBottomWidth: 0 },
                      ]}
                      onPress={() => setSelectedDist(item)}
                      activeOpacity={0.7}
                    >
                      {/* Distribution Number */}
                      <View style={{ width: 120 }}>
                        <Text style={styles.distNoText} allowFontScaling={false}>{item.distributionNo}</Text>
                      </View>

                      {/* Property Managed */}
                      <View style={{ width: 170, paddingRight: 8 }}>
                        <Text style={styles.propNameText} numberOfLines={1} allowFontScaling={false}>
                          {item.propertyManaged}
                        </Text>
                      </View>

                      {/* Payment Date */}
                      <View style={{ width: 110 }}>
                        <Text style={styles.dateText} allowFontScaling={false}>{item.paymentDate}</Text>
                      </View>

                      {/* Amount Paid */}
                      <View style={{ width: 120, alignItems: 'flex-end', paddingRight: 10 }}>
                        <Text style={styles.amountText} allowFontScaling={false}>
                          +${Number(item.amountPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </Text>
                      </View>

                      {/* Method */}
                      <View style={{ width: 130 }}>
                        <Text style={styles.methodText} allowFontScaling={false}>{item.payoutMethod}</Text>
                      </View>

                      {/* Status */}
                      <View style={{ width: 110, alignItems: 'center' }}>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                          <Text style={[styles.statusBadgeText, { color: statusStyle.text }]} allowFontScaling={false}>
                            {item.status}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </Animated.View>

      {/* MODAL: Distribution Details */}
      <Modal visible={!!selectedDist} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="wallet-outline" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle} allowFontScaling={false}>Distribution Details</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDist(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Distribution Number</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedDist?.distributionNo}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Property Origin</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedDist?.propertyManaged}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Clearing Date</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedDist?.paymentDate}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Payout Method</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedDist?.payoutMethod}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Audit Status</Text>
                <Text style={[styles.detailVal, { color: '#10b981' }]} allowFontScaling={false}>{selectedDist?.status}</Text>
              </View>

              <View style={[styles.detailRow, { borderBottomWidth: 0, paddingTop: 12 }]}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Amount Transferred</Text>
                <Text style={[styles.detailVal, { color: '#10b981', fontWeight: '900', fontSize: 16 }]} allowFontScaling={false}>
                  +${Number(selectedDist?.amountPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedDist(null)}>
              <Text style={styles.closeModalBtnText} allowFontScaling={false}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
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
  subTitle: { fontSize: 12, color: colors.textMuted, marginTop: 3 },

  showingRow: { marginBottom: 10 },
  showingText: { fontSize: 10.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },

  searchBarRow: { marginBottom: 14 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    color: colors.textPrimary,
    fontSize: 12.5,
    flex: 1,
    padding: 0,
  },

  emptyCard: { backgroundColor: colors.surface, padding: 32, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  emptyText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  emptySubText: { color: colors.textMuted, fontSize: 12, marginTop: 4 },

  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  thCell: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tableRowEven: {
    backgroundColor: colors.surface,
  },
  tableRowOdd: {
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)',
  },

  distNoText: { fontSize: 12.5, fontWeight: '800', color: colors.textPrimary },
  propNameText: { fontSize: 12.5, fontWeight: '700', color: colors.textPrimary },
  dateText: { fontSize: 11.5, color: colors.textMuted },
  amountText: { fontSize: 13, fontWeight: '800', color: '#10b981' },
  methodText: { fontSize: 11.5, color: colors.textSecondary },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusBadgeText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },

  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.cardBorder },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },

  detailContainer: { backgroundColor: colors.inputBackground, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.surface },
  detailLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  detailVal: { color: colors.textPrimary, fontSize: 12, fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: 16 },

  closeModalBtn: { backgroundColor: isDarkMode ? '#38bdf8' : '#0284c7', paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  closeModalBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});

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
  Animated,
  Easing,
  Modal,
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

export const DistributionsScreen = () => {
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

  // Strictly call live Railway endpoint: GET /portal/owner/distributions
  const fetchLiveDistributions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/portal/owner/distributions', logout, refreshAccessToken);
      const rawList = Array.isArray(res) ? res : (res?.data || []);

      if (rawList && rawList.length > 0) {
        const mapped = rawList.map((item) => ({
          id: item.id || `dist-${Math.random()}`,
          distributionNo: item.distributionNo || (item.id ? `DIST-${item.id.substring(0, 4).toUpperCase()}` : 'DIST-1000'),
          propertyManaged: item.propertyManaged || 'Property 2 Distribution',
          paymentDate: item.paymentDate || item.date || '2026-08-04',
          amountPaid: Number(item.amountPaid || item.amount) || 0,
          payoutMethod: item.payoutMethod || 'Direct Deposit',
          status: item.status || 'Completed',
        }));
        setDistributions(mapped);
      } else {
        setDistributions([]);
      }
    } catch (e) {
      console.log('Error fetching GET /portal/owner/distributions:', e.message);
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
    const text = `${item.distributionNo || ''} ${item.propertyManaged || ''} ${item.status || ''}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const getStatusStyle = (status) => {
    const lower = String(status).toLowerCase();
    if (lower === 'completed') return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: '#10b981' };
    return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '#38bdf8' };
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
          <Text style={styles.title} allowFontScaling={false}>Payout Distributions Log</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search distributions by number or asset..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.showingRow}>
          <Text style={styles.showingText} allowFontScaling={false}>
            PAYOUT RECORDS ({filteredDistributions.length})
          </Text>
        </View>

        {/* List Log */}
        {filteredDistributions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="wallet-outline" size={48} color="#475569" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText} allowFontScaling={false}>No distribution records found</Text>
          </View>
        ) : (
          filteredDistributions.map((item, idx) => {
            const statusStyle = getStatusStyle(item.status);
            return (
              <AnimatedTouchable
                key={item.id || `dist-${idx}`}
                style={styles.card}
                onPress={() => setSelectedDist(item)}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.distNoRow}>
                      <Ionicons name="wallet-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
                      <Text style={styles.distNoText} allowFontScaling={false}>
                        {item.distributionNo}
                      </Text>
                    </View>
                    <Text style={styles.propText} allowFontScaling={false}>
                      {item.propertyManaged}
                    </Text>
                    <Text style={styles.dateText} allowFontScaling={false}>
                      Cleared: {item.paymentDate} · Method: {item.payoutMethod}
                    </Text>
                  </View>

                  <View style={styles.rightGroup}>
                    <Text style={styles.amountText} allowFontScaling={false}>
                      +${(Number(item.amountPaid) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                      <Text style={[styles.statusBadgeText, { color: statusStyle.text }]} allowFontScaling={false}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </AnimatedTouchable>
            );
          })
        )}
      </Animated.View>

      {/* MODAL: Distribution Details */}
      <Modal visible={!!selectedDist} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="wallet-outline" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle} allowFontScaling={false}>Payout Details</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDist(null)}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Payout Transaction</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedDist?.distributionNo}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Property Origin</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedDist?.propertyManaged}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Payment Clearing Date</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedDist?.paymentDate}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Payout Transfer Method</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedDist?.payoutMethod}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Status</Text>
                <Text style={[styles.detailVal, { color: '#10b981' }]} allowFontScaling={false}>{selectedDist?.status}</Text>
              </View>

              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Amount Transferred</Text>
                <Text style={[styles.detailVal, { color: '#10b981', fontWeight: '900', fontSize: 15 }]} allowFontScaling={false}>
                  +${Number(selectedDist?.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedDist(null)}>
              <Text style={styles.closeModalBtnText} allowFontScaling={false}>Close Details</Text>
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

  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.cardBorder },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  distNoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  distNoText: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  propText: { fontSize: 13, color: colors.textSecondary, marginBottom: 3 },
  dateText: { fontSize: 11, color: colors.textMuted },

  rightGroup: { alignItems: 'flex-end', gap: 6 },
  amountText: { fontSize: 16, fontWeight: '800', color: '#10b981' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusBadgeText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },

  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.cardBorder },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },

  detailContainer: { backgroundColor: colors.inputBackground, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surface },
  detailLabel: { color: colors.textMuted, fontSize: 12.5, fontWeight: '600' },
  detailVal: { color: colors.textPrimary, fontSize: 12.5, fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: 16 },

  closeModalBtn: { backgroundColor: colors.buttonSecondary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  closeModalBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
});

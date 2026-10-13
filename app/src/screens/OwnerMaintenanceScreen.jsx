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

// Animated Touchable Wrapper Component
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

export const OwnerMaintenanceScreen = () => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);

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

  // Strictly call GET /portal/owner/maintenance API
  const fetchOwnerMaintenance = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/portal/owner/maintenance', logout, refreshAccessToken);
      const rawList = Array.isArray(res) ? res : (res?.data || []);

      if (rawList && rawList.length > 0) {
        const formatted = rawList.map((item, index) => {
          const actual = Number(item.actualCost || item.cost || 0);
          const extra = Number(item.extraExpenses || item.extraCost || 0);
          return {
            id: item.id || `m-${Math.random()}`,
            ticketNumber: `#${index + 1}`,
            date: item.date ? item.date.split('T')[0] : (item.createdAt ? item.createdAt.split('T')[0] : ''),
            title: item.title || 'Maintenance Request',
            description: item.description || 'No detailed diagnostics description provided.',
            propertyName: item.propertyName || 'Property',
            unitNumber: item.unitNumber || 'Unit',
            tenantName: item.tenantName || 'Resident',
            estimatedCost: Number(item.estimatedCost) || 0,
            actualCost: actual,
            extraExpenses: extra,
            totalCost: actual + extra,
            status: item.status || 'New',
            resolutionNotes: item.resolutionNotes || null,
            assignedVendorName: item.assignedVendorName || 'Maintenance Contractor',
          };
        });
        setTickets(formatted);
      } else {
        setTickets([]);
      }
    } catch (e) {
      console.log('Error fetching owner maintenance tickets:', e.message);
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  useEffect(() => {
    fetchOwnerMaintenance();
  }, []);

  const filteredTickets = tickets.filter((t) => {
    const text = `${t.title || ''} ${t.propertyName || ''} ${t.tenantName || ''} ${t.ticketNumber || ''}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const getStatusStyle = (status) => {
    const lower = String(status).toLowerCase();
    if (lower === 'completed') return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: '#10b981' };
    if (lower === 'in progress') return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '#38bdf8' };
    return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: '#f59e0b' };
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>Loading Maintenance Tickets...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchOwnerMaintenance} tintColor="#38bdf8" />}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Page Header */}
        <View style={styles.header}>
          <Text style={styles.title} allowFontScaling={false}>Portfolio Maintenance Tickets</Text>
          <Text style={styles.subtitle} allowFontScaling={false}>
            Verify contractor dispatches progress and repairs costs deductions.
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tickets by property or subject..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} allowFontScaling={false}>
            TICKETS PORTFOLIO ({filteredTickets.length})
          </Text>
        </View>

        {/* Tickets List */}
        {filteredTickets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="construct-outline" size={48} color="#475569" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText} allowFontScaling={false}>No tickets found</Text>
          </View>
        ) : (
          filteredTickets.map((item, idx) => {
            const statusStyle = getStatusStyle(item.status);
            return (
              <AnimatedTouchable
                key={item.id || `ticket-${idx}`}
                style={styles.card}
                onPress={() => setSelectedTicket(item)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.ticketNumRow}>
                    <Text style={styles.ticketNum} allowFontScaling={false}>{item.ticketNumber}</Text>
                    <Text style={styles.ticketDate} allowFontScaling={false}>· Submitted: {item.date}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]} allowFontScaling={false}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.subjectText} allowFontScaling={false} numberOfLines={1}>
                  {item.title}
                </Text>

                <View style={styles.detailLine}>
                  <Ionicons name="location-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                  <Text style={styles.detailText} allowFontScaling={false}>
                    {item.propertyName} · Unit {item.unitNumber}
                  </Text>
                </View>

                <View style={styles.detailLine}>
                  <Ionicons name="person-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                  <Text style={styles.detailText} allowFontScaling={false}>
                    Resident: {item.tenantName}
                  </Text>
                </View>

                <View style={styles.divider} />

                {/* Costs Breakdown Row */}
                <View style={styles.costsRow}>
                  <View style={styles.costCol}>
                    <Text style={styles.costLabel} allowFontScaling={false}>QUOTE</Text>
                    <Text style={styles.costVal} allowFontScaling={false}>
                      ${Number(item.estimatedCost).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.costCol}>
                    <Text style={styles.costLabel} allowFontScaling={false}>VARIANCE</Text>
                    <Text style={[styles.costVal, item.extraExpenses > 0 ? { color: '#f87171' } : { color: '#10b981' }]} allowFontScaling={false}>
                      +${Number(item.extraExpenses).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.costColRight}>
                    <Text style={styles.costLabel} allowFontScaling={false}>FINAL COST</Text>
                    <Text style={[styles.costVal, { color: '#cbd5e1', fontWeight: '800' }]} allowFontScaling={false}>
                      ${Number(item.totalCost).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* View Details Footer */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity style={styles.viewBtn} onPress={() => setSelectedTicket(item)} activeOpacity={0.7}>
                    <Ionicons name="eye-outline" size={13} color="#38bdf8" style={{ marginRight: 4 }} />
                    <Text style={styles.viewBtnText} allowFontScaling={false}>View Progress Details</Text>
                  </TouchableOpacity>
                </View>
              </AnimatedTouchable>
            );
          })
        )}
      </Animated.View>

      {/* MODAL: Ticket Details Modal */}
      <Modal visible={!!selectedTicket} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="hammer-outline" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle} allowFontScaling={false}>Ticket {selectedTicket?.ticketNumber} Details</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalScroll}>
              <View style={styles.detailSection}>
                <Text style={styles.modalSectionHeader} allowFontScaling={false}>ISSUE DIAGNOSTICS & DESCRIPTION</Text>
                <View style={styles.descBox}>
                  <Text style={styles.descTextVal} allowFontScaling={false}>{selectedTicket?.description}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.modalSectionHeader} allowFontScaling={false}>LOCATION & TENANT DETAILS</Text>
                <View style={styles.metaCardBox}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel} allowFontScaling={false}>Property / Unit</Text>
                    <Text style={styles.metaVal} allowFontScaling={false}>{selectedTicket?.propertyName} · Unit {selectedTicket?.unitNumber}</Text>
                  </View>
                  <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.metaLabel} allowFontScaling={false}>Resident / Tenant</Text>
                    <Text style={styles.metaVal} allowFontScaling={false}>{selectedTicket?.tenantName}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.modalSectionHeader} allowFontScaling={false}>FINANCIAL BUDGET VARIANCE</Text>
                <View style={styles.metaCardBox}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel} allowFontScaling={false}>Manager Quote</Text>
                    <Text style={styles.metaVal} allowFontScaling={false}>${Number(selectedTicket?.estimatedCost || 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel} allowFontScaling={false}>Actual Final Cost</Text>
                    <Text style={[styles.metaVal, { color: '#10b981' }]} allowFontScaling={false}>${Number(selectedTicket?.totalCost || 0).toLocaleString()}</Text>
                  </View>
                  <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.metaLabel} allowFontScaling={false}>Extra Expenses Variance</Text>
                    <Text style={[styles.metaVal, (selectedTicket?.extraExpenses || 0) > 0 ? { color: '#f87171' } : { color: '#10b981' }]} allowFontScaling={false}>
                      +${Number(selectedTicket?.extraExpenses || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              {selectedTicket?.resolutionNotes && (
                <View style={styles.detailSection}>
                  <Text style={styles.modalSectionHeader} allowFontScaling={false}>RESOLUTION NOTES</Text>
                  <View style={styles.descBox}>
                    <Text style={[styles.descTextVal, { fontStyle: 'italic' }]} allowFontScaling={false}>
                      "{selectedTicket.resolutionNotes}"
                    </Text>
                  </View>
                </View>
              )}

              <View style={[styles.detailSection, { marginBottom: 0 }]}>
                <View style={styles.metaCardBox}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel} allowFontScaling={false}>Assigned Vendor</Text>
                    <Text style={styles.metaVal} allowFontScaling={false}>{selectedTicket?.assignedVendorName}</Text>
                  </View>
                  <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.metaLabel} allowFontScaling={false}>Submission Date</Text>
                    <Text style={styles.metaVal} allowFontScaling={false}>{selectedTicket?.date}</Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedTicket(null)}>
              <Text style={styles.closeModalBtnText} allowFontScaling={false}>Close Ticket Specs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 8 },

  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 11.5, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },

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

  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },

  emptyCard: { backgroundColor: colors.surface, padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  emptyText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ticketNumRow: { flexDirection: 'row', alignItems: 'center' },
  ticketNum: { fontSize: 13, fontWeight: '800', color: '#38bdf8' },
  ticketDate: { fontSize: 11.5, color: '#64748b', marginLeft: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },

  subjectText: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  detailLine: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  detailText: { fontSize: 12.5, color: colors.textSecondary },

  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 12 },

  costsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costCol: { flex: 1 },
  costColRight: { alignItems: 'flex-end' },
  costLabel: { fontSize: 8, color: colors.textMuted, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  costVal: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },

  cardFooter: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: 12, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10 },
  viewBtn: { flexDirection: 'row', alignItems: 'center' },
  viewBtnText: { color: '#38bdf8', fontSize: 11.5, fontWeight: '700' },

  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.cardBorder },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },

  modalScroll: { maxHeight: 350 },
  detailSection: { marginBottom: 14 },
  modalSectionHeader: { fontSize: 8.5, color: colors.textMuted, fontWeight: '850', letterSpacing: 0.5, marginBottom: 6 },
  descBox: { backgroundColor: colors.inputBackground, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder },
  descTextVal: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },

  metaCardBox: { backgroundColor: colors.inputBackground, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.surface },
  metaLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  metaVal: { color: colors.textPrimary, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  closeModalBtn: { backgroundColor: colors.buttonSecondary, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 14 },
  closeModalBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
});

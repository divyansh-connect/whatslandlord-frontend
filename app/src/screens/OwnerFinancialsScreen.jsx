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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const OwnerFinancialsScreen = ({ onNavigate, onBack }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const [ledgerPostings, setLedgerPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosting, setSelectedPosting] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

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

  // Live query sync: GET /portal/owner/financials
  const fetchOwnerFinancials = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/portal/owner/financials', logout, refreshAccessToken);
      const rawList = Array.isArray(res) ? res : (res?.data || []);

      if (rawList && rawList.length > 0) {
        const mapped = rawList.map((item, idx) => {
          const type = item.type || (String(item.category || '').toLowerCase().includes('expense') ? 'Expense' : String(item.category || '').toLowerCase().includes('distribution') ? 'Distribution' : 'Income');
          return {
            id: item.id || `fin-${idx}`,
            date: item.date ? item.date.split('T')[0] : '2026-11-01',
            propertyName: item.propertyName || 'Assigned Property',
            tenantName: item.tenantName || 'Resident',
            category: item.category || 'Rental Income',
            type: type,
            amount: Number(item.amount !== undefined ? item.amount : item.grossRevenue) || 0,
            status: item.status || 'Cleared',
            reference: item.id ? `REF-${String(item.id).substring(0, 8).toUpperCase()}` : `PAY-${1000 + idx}`,
          };
        });
        setLedgerPostings(mapped);
      } else {
        setLedgerPostings([]);
      }
    } catch (e) {
      console.log('Error fetching owner financials:', e?.message || e);
      setLedgerPostings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  useEffect(() => {
    fetchOwnerFinancials();
  }, []);

  const filteredPostings = ledgerPostings.filter((item) => {
    const text = `${item.propertyName || ''} ${item.tenantName || ''} ${item.category || ''} ${item.reference || ''}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const getCategoryStyle = (type, category) => {
    const lowerType = String(type || '').toLowerCase();
    const lowerCat = String(category || '').toLowerCase();
    if (lowerType === 'expense' || lowerCat.includes('expense')) {
      return { bg: 'rgba(244, 63, 94, 0.12)', text: '#f43f5e', border: 'rgba(244, 63, 94, 0.3)' };
    }
    if (lowerType === 'distribution' || lowerCat.includes('distribution')) {
      return { bg: 'rgba(56, 189, 248, 0.12)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
    }
    return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const ownerName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Property Investor');
      const rowsHtml = filteredPostings.map((item) => {
        const isExp = item.type === 'Expense' || item.type === 'Distribution';
        const sign = isExp ? '-' : '+';
        const color = item.type === 'Expense' ? '#f43f5e' : item.type === 'Distribution' ? '#0284c7' : '#10b981';
        return `
          <tr>
            <td>${item.date}</td>
            <td style="font-weight: 700;">${item.propertyName}</td>
            <td>${item.tenantName}</td>
            <td><span style="font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">${item.category}</span></td>
            <td style="text-align: right; font-weight: 800; color: ${color};">${sign}$${Number(item.amount || 0).toLocaleString('en-US')}</td>
          </tr>
        `;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Portfolio Ledger</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #0f172a; }
              h1 { font-size: 22px; font-weight: 800; margin: 0 0 6px 0; }
              p { color: #64748b; font-size: 12px; margin: 0 0 20px 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11.5px; }
              th { background-color: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 800; color: #475569; border-bottom: 2px solid #cbd5e1; }
              td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
            </style>
          </head>
          <body>
            <h1>OWNER INCOME & FINANCIAL LEDGER</h1>
            <p>Investor: ${ownerName} · Generated: ${new Date().toLocaleDateString('en-US')} · Total Records: ${filteredPostings.length}</p>
            <table>
              <thead>
                <tr>
                  <th>CLEARING DATE</th>
                  <th>PROPERTY MANAGED</th>
                  <th>TENANT / SOURCE</th>
                  <th>CATEGORY</th>
                  <th style="text-align: right;">CASH FLOW / AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (err) {
      console.log('Error printing ledger PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>Loading Ledger Postings...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.mainWrapper}
      contentContainerStyle={styles.outerContentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchOwnerFinancials} tintColor="#38bdf8" />}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Page Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
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
                <Text style={styles.title} allowFontScaling={false}>Portfolio Ledger & Transactions</Text>
                <Text style={styles.subTitle} allowFontScaling={false}>
                  Verify clearing deposits, operating disbursements, maintenance write-offs, and distributions.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.exportBtn}
              onPress={handleExportPDF}
              disabled={isExporting}
              activeOpacity={0.8}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#38bdf8" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={15} color={isDarkMode ? '#38bdf8' : '#0284c7'} style={{ marginRight: 5 }} />
                  <Text style={styles.exportBtnText} allowFontScaling={false}>PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search ledger by tenant or property..."
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
            SHOWING {filteredPostings.length} LEDGER POSTINGS
          </Text>
        </View>

        {/* Table Container */}
        {filteredPostings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={48} color="#475569" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText} allowFontScaling={false}>No transactions found</Text>
            <Text style={styles.emptySubText} allowFontScaling={false}>No postings match your search filter.</Text>
          </View>
        ) : (
          <View style={styles.tableCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header Row */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thCell, { width: 110 }]} allowFontScaling={false}>CLEARING DATE</Text>
                  <Text style={[styles.thCell, { width: 160 }]} allowFontScaling={false}>PROPERTY MANAGED</Text>
                  <Text style={[styles.thCell, { width: 160 }]} allowFontScaling={false}>TENANT / SOURCE</Text>
                  <Text style={[styles.thCell, { width: 160 }]} allowFontScaling={false}>CATEGORY</Text>
                  <Text style={[styles.thCell, { width: 130, textAlign: 'right' }]} allowFontScaling={false}>CASH FLOW / AMOUNT</Text>
                </View>

                {/* Table Data Rows */}
                {filteredPostings.map((item, idx) => {
                  const catStyle = getCategoryStyle(item.type, item.category);
                  const isExpense = item.type === 'Expense';
                  const isDist = item.type === 'Distribution';
                  const sign = isExpense || isDist ? '-' : '+';
                  const amountColor = isExpense ? '#f43f5e' : isDist ? '#38bdf8' : '#10b981';
                  const isEven = idx % 2 === 0;

                  return (
                    <TouchableOpacity
                      key={item.id || `posting-row-${idx}`}
                      style={[
                        styles.tableRow,
                        isEven ? styles.tableRowEven : styles.tableRowOdd,
                        idx === filteredPostings.length - 1 && { borderBottomWidth: 0 },
                      ]}
                      onPress={() => setSelectedPosting(item)}
                      activeOpacity={0.7}
                    >
                      {/* Clearing Date */}
                      <View style={{ width: 110 }}>
                        <Text style={styles.dateText} allowFontScaling={false}>{item.date}</Text>
                      </View>

                      {/* Property Managed */}
                      <View style={{ width: 160, paddingRight: 8 }}>
                        <Text style={styles.propNameText} numberOfLines={1} allowFontScaling={false}>
                          {item.propertyName}
                        </Text>
                      </View>

                      {/* Tenant / Source */}
                      <View style={{ width: 160, paddingRight: 8 }}>
                        <Text style={styles.tenantText} numberOfLines={1} allowFontScaling={false}>
                          {item.tenantName}
                        </Text>
                      </View>

                      {/* Category Badge */}
                      <View style={{ width: 160 }}>
                        <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg, borderColor: catStyle.border }]}>
                          <Text style={[styles.categoryText, { color: catStyle.text }]} numberOfLines={1} allowFontScaling={false}>
                            {item.category}
                          </Text>
                        </View>
                      </View>

                      {/* Cash Flow / Amount */}
                      <View style={{ width: 130, alignItems: 'flex-end', paddingRight: 6 }}>
                        <Text style={[styles.amountText, { color: amountColor }]} allowFontScaling={false}>
                          {sign}${Number(item.amount || 0).toLocaleString('en-US')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </Animated.View>

      {/* MODAL: Ledger Item Details */}
      <Modal visible={!!selectedPosting} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="card-outline" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle} allowFontScaling={false}>Posting Details</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPosting(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Reference</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedPosting?.reference}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Property</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedPosting?.propertyName}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Tenant / Source</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedPosting?.tenantName}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Clearing Date</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedPosting?.date}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Category</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedPosting?.category}</Text>
              </View>

              <View style={[styles.detailRow, { borderBottomWidth: 0, paddingTop: 12 }]}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Cash Flow</Text>
                <Text
                  style={[
                    styles.detailVal,
                    {
                      fontSize: 16,
                      fontWeight: '900',
                      color: selectedPosting?.type === 'Expense' ? '#f43f5e' : selectedPosting?.type === 'Distribution' ? '#38bdf8' : '#10b981',
                    },
                  ]}
                  allowFontScaling={false}
                >
                  {selectedPosting?.type === 'Expense' || selectedPosting?.type === 'Distribution' ? '-' : '+'}
                  ${Number(selectedPosting?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedPosting(null)}>
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

  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.1)' : 'rgba(2, 132, 199, 0.1)',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  exportBtnText: {
    color: isDarkMode ? '#38bdf8' : '#0284c7',
    fontSize: 11.5,
    fontWeight: '800',
  },

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

  dateText: { fontSize: 11.5, color: colors.textMuted },
  propNameText: { fontSize: 12.5, fontWeight: '700', color: colors.textPrimary },
  tenantText: { fontSize: 12, color: colors.textSecondary },
  amountText: { fontSize: 13, fontWeight: '800' },

  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  categoryText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },

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

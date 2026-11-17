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

export const StatementsScreen = ({ onNavigate, onBack }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

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

  // Live endpoint: GET /portal/owner/statements
  const fetchLiveStatements = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/portal/owner/statements', logout, refreshAccessToken);
      const rawList = Array.isArray(res) ? res : (res?.data || []);

      if (rawList && rawList.length > 0) {
        const mapped = rawList.map((item, idx) => ({
          id: item.id || `stmt-${idx}`,
          period: item.period || 'Current Period',
          propertyName: item.propertyName || 'Property',
          totalIncome: Number(item.totalIncome !== undefined ? item.totalIncome : item.income) || 0,
          totalExpenses: Number(item.totalExpenses !== undefined ? item.totalExpenses : item.expenses) || 0,
          netDistribution: Number(item.netDistribution) || 0,
          status: item.status || 'Published',
          generatedDate: item.generatedDate || item.date || new Date().toISOString().split('T')[0],
        }));
        setStatements(mapped);
      } else {
        setStatements([]);
      }
    } catch (e) {
      console.log('Error fetching GET /portal/owner/statements:', e?.message || e);
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

  const handleDownloadStatementPDF = async (stmt) => {
    try {
      setDownloadingId(stmt.id);
      const ownerName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Property Investor');
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Owner Statement - ${stmt.propertyName}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #0f172a; margin: 0; }
              .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
              h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
              .desc { font-size: 12px; color: #64748b; margin: 0; }
              .meta-grid { display: flex; justify-content: space-between; margin: 20px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
              .meta-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
              .meta-val { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 3px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #10b981; color: #ffffff; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 800; }
              td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; }
              .amount { text-align: right; font-weight: 800; }
              .positive { color: #10b981; }
              .negative { color: #f43f5e; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>OWNER FINANCIAL STATEMENT</h1>
              <p class="desc">Property: <strong>${stmt.propertyName}</strong> · Statement Period: <strong>${stmt.period}</strong></p>
            </div>
            <div class="meta-grid">
              <div><span class="meta-label">Investor</span><div class="meta-val">${ownerName}</div></div>
              <div><span class="meta-label">Date Generated</span><div class="meta-val">${stmt.generatedDate}</div></div>
              <div><span class="meta-label">Audit Status</span><div class="meta-val">${stmt.status}</div></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>LINE ITEM DESCRIPTION</th>
                  <th style="text-align: right;">AMOUNT (USD)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Operating Revenues (Gross Income)</td>
                  <td class="amount positive">$${Number(stmt.totalIncome || 0).toLocaleString('en-US')}</td>
                </tr>
                <tr>
                  <td>Operating Expenses</td>
                  <td class="amount negative">-$${Number(stmt.totalExpenses || 0).toLocaleString('en-US')}</td>
                </tr>
                <tr style="background: #f1f5f9; font-weight: 800;">
                  <td><strong>Net Distribution Payout</strong></td>
                  <td class="amount positive"><strong>$${Number(stmt.netDistribution || 0).toLocaleString('en-US')}</strong></td>
                </tr>
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
      console.log('Error downloading statement PDF:', err);
    } finally {
      setDownloadingId(null);
    }
  };

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
              <Text style={styles.title} allowFontScaling={false}>Owner Financial Statements</Text>
              <Text style={styles.subTitle} allowFontScaling={false}>
                Verify monthly generated property distributions, net profits, and period statements.
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
              placeholder="Search statements by property location..."
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
            FINANCIAL STATEMENTS ({filteredStatements.length})
          </Text>
        </View>

        {/* Statements Table */}
        {filteredStatements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color="#475569" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText} allowFontScaling={false}>No statements found</Text>
            <Text style={styles.emptySubText} allowFontScaling={false}>No statements match your search criteria.</Text>
          </View>
        ) : (
          <View style={styles.tableCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header Row */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thCell, { width: 120 }]} allowFontScaling={false}>STATEMENT PERIOD</Text>
                  <Text style={[styles.thCell, { width: 160 }]} allowFontScaling={false}>PROPERTY LOCATION</Text>
                  <Text style={[styles.thCell, { width: 110, textAlign: 'right' }]} allowFontScaling={false}>GROSS INCOME</Text>
                  <Text style={[styles.thCell, { width: 115, textAlign: 'right' }]} allowFontScaling={false}>TOTAL EXPENSES</Text>
                  <Text style={[styles.thCell, { width: 130, textAlign: 'right' }]} allowFontScaling={false}>NET DISTRIBUTION</Text>
                  <Text style={[styles.thCell, { width: 100, textAlign: 'center' }]} allowFontScaling={false}>STATUS</Text>
                  <Text style={[styles.thCell, { width: 85, textAlign: 'center' }]} allowFontScaling={false}>ACTIONS</Text>
                </View>

                {/* Table Data Rows */}
                {filteredStatements.map((item, idx) => {
                  const isEven = idx % 2 === 0;
                  const isDownloading = downloadingId === item.id;
                  return (
                    <View
                      key={item.id || `stmt-row-${idx}`}
                      style={[
                        styles.tableRow,
                        isEven ? styles.tableRowEven : styles.tableRowOdd,
                        idx === filteredStatements.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      {/* Statement Period */}
                      <View style={{ width: 120 }}>
                        <Text style={styles.periodText} allowFontScaling={false}>{item.period}</Text>
                      </View>

                      {/* Property Location */}
                      <View style={{ width: 160, paddingRight: 8 }}>
                        <Text style={styles.propNameText} numberOfLines={1} allowFontScaling={false}>
                          {item.propertyName}
                        </Text>
                      </View>

                      {/* Gross Income */}
                      <View style={{ width: 110, alignItems: 'flex-end', paddingRight: 6 }}>
                        <Text style={styles.incomeText} allowFontScaling={false}>
                          ${Number(item.totalIncome || 0).toLocaleString('en-US')}
                        </Text>
                      </View>

                      {/* Total Expenses */}
                      <View style={{ width: 115, alignItems: 'flex-end', paddingRight: 6 }}>
                        <Text style={styles.expensesText} allowFontScaling={false}>
                          ${Number(item.totalExpenses || 0).toLocaleString('en-US')}
                        </Text>
                      </View>

                      {/* Net Distribution */}
                      <View style={{ width: 130, alignItems: 'flex-end', paddingRight: 8 }}>
                        <Text style={styles.netDistText} allowFontScaling={false}>
                          ${Number(item.netDistribution || 0).toLocaleString('en-US')}
                        </Text>
                      </View>

                      {/* Status */}
                      <View style={{ width: 100, alignItems: 'center' }}>
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusBadgeText} allowFontScaling={false}>{item.status}</Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={{ width: 85, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => setSelectedStatement(item)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="eye-outline" size={16} color={colors.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => handleDownloadStatementPDF(item)}
                          disabled={isDownloading}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.7}
                        >
                          {isDownloading ? (
                            <ActivityIndicator size="small" color="#38bdf8" />
                          ) : (
                            <Ionicons name="download-outline" size={16} color={isDarkMode ? '#38bdf8' : '#0284c7'} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </Animated.View>

      {/* MODAL: Statement Details Modal */}
      <Modal visible={!!selectedStatement} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="document-text-outline" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle} allowFontScaling={false}>Statement Breakdown</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedStatement(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Property</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedStatement?.propertyName}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Period</Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedStatement?.period}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Gross Income</Text>
                <Text style={[styles.detailVal, { color: '#10b981' }]} allowFontScaling={false}>
                  ${Number(selectedStatement?.totalIncome || 0).toLocaleString('en-US')}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Total Expenses</Text>
                <Text style={[styles.detailVal, { color: '#f43f5e' }]} allowFontScaling={false}>
                  -${Number(selectedStatement?.totalExpenses || 0).toLocaleString('en-US')}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomWidth: 0, paddingTop: 12 }]}>
                <Text style={styles.detailLabel} allowFontScaling={false}>Net Distribution</Text>
                <Text style={[styles.detailVal, { color: '#10b981', fontWeight: '900', fontSize: 16 }]} allowFontScaling={false}>
                  ${Number(selectedStatement?.netDistribution || 0).toLocaleString('en-US')}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { flex: 1, backgroundColor: isDarkMode ? '#38bdf8' : '#0284c7' }]}
                onPress={() => {
                  const s = selectedStatement;
                  setSelectedStatement(null);
                  handleDownloadStatementPDF(s);
                }}
              >
                <Ionicons name="download-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.modalActionBtnText} allowFontScaling={false}>Export PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, { flex: 1, backgroundColor: colors.buttonSecondary }]}
                onPress={() => setSelectedStatement(null)}
              >
                <Text style={[styles.modalActionBtnText, { color: colors.textSecondary }]} allowFontScaling={false}>Done</Text>
              </TouchableOpacity>
            </View>
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

  periodText: { fontSize: 12, color: colors.textSecondary },
  propNameText: { fontSize: 12.5, fontWeight: '700', color: colors.textPrimary },
  incomeText: { fontSize: 12.5, fontWeight: '700', color: colors.textPrimary },
  expensesText: { fontSize: 12.5, fontWeight: '700', color: '#f43f5e' },
  netDistText: { fontSize: 13, fontWeight: '800', color: '#10b981' },

  statusBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusBadgeText: { fontSize: 9.5, fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase' },

  actionIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  },

  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.cardBorder },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },

  detailContainer: { backgroundColor: colors.inputBackground, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.surface },
  detailLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  detailVal: { color: colors.textPrimary, fontSize: 12, fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: 16 },

  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
  },
  modalActionBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});

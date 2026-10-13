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
import { useAuthStore, useThemeStore } from '../store/useStore';
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

export const TenantLedgerScreen = () => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';
  
  const translateType = (type) => {
    if (!es) return type;
    if (type === 'Rent Charge') return 'Cargo de Renta';
    if (type === 'Payment') return 'Pago';
    return type;
  };

  const translateDescription = (desc) => {
    if (!es) return desc;
    if (desc === 'Rent Charge & Utilities') return 'Cargo de Renta y Servicios';
    if (desc === 'Payment via ACH Bank Transfer') return 'Pago vía Transferencia Bancaria ACH';
    if (desc === 'Payment via Credit Card') return 'Pago con Tarjeta de Crédito';
    if (desc === 'Rent Charge') return 'Cargo de Renta';
    if (desc === 'Payment') return 'Pago';
    return desc;
  };

  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [, setInvoices] = useState([]);
  const [, setPayments] = useState([]);
  const [, setProperties] = useState([]);
  const [, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [selectedEntry, setSelectedEntry] = useState(null);

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

  // Strictly call ALL 4 API ENDPOINTS IN PARALLEL: GET /invoices, /payments, /properties, /tenants
  const fetchAllLedgerData = async () => {
    try {
      setLoading(true);
      const [invRes, payRes, propRes, tenRes] = await Promise.all([
        apiClient.get('/invoices', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/payments', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/properties', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/tenants', logout, refreshAccessToken).catch(() => null),
      ]);

      const rawInvoices = Array.isArray(invRes) ? invRes : (invRes?.data || []);
      const rawPayments = Array.isArray(payRes) ? payRes : (payRes?.data || []);
      const rawProperties = Array.isArray(propRes) ? propRes : (propRes?.data || []);
      const rawTenants = Array.isArray(tenRes) ? tenRes : (tenRes?.data || []);

      setInvoices(rawInvoices);
      setPayments(rawPayments);
      setProperties(rawProperties);
      setTenants(rawTenants);

      // Build unified ledger list from Invoices (Debits) and Payments (Credits)
      const ledgerList = [];

      rawInvoices.forEach((inv) => {
        ledgerList.push({
          id: inv.id || `inv-${Math.random()}`,
          date: inv.createdAt ? inv.createdAt.split('T')[0] : '2026-08-01',
          tenantName: inv.tenantName || 'person 1',
          propertyName: inv.propertyName || 'property 1',
          unitNumber: inv.unitNumber || 'room 1b',
          description: inv.lineItems?.[0]?.description || 'Rent Charge & Utilities',
          debit: Number(inv.amount) || 1100,
          credit: 0,
          transactionType: 'Rent Charge',
          status: inv.status || 'Active',
        });
      });

      rawPayments.forEach((p) => {
        ledgerList.push({
          id: p.id || `pay-${Math.random()}`,
          date: p.paidDate ? p.paidDate.split('T')[0] : '2026-08-01',
          tenantName: p.tenant ? `${p.tenant.firstName || ''} ${p.tenant.lastName || ''}`.trim() : (p.tenantName || 'person 1'),
          propertyName: p.property?.name || p.propertyName || 'property 1',
          unitNumber: p.unitNumber || p.unit?.unitNumber || 'room 1b',
          description: `Payment via ${p.paymentMethod || 'ACH Bank Transfer'}`,
          debit: 0,
          credit: Number(p.amount) || 1068.1,
          transactionType: 'Payment',
          status: p.status || 'Paid',
        });
      });

      // Sort ledger entries by date
      ledgerList.sort((a, b) => a.date.localeCompare(b.date));

      // Calculate running balance
      let runningBalance = 0;
      const mappedWithBalance = ledgerList.map((item) => {
        if (item.transactionType === 'Rent Charge') {
          runningBalance += item.debit;
        } else if (item.transactionType === 'Payment') {
          runningBalance -= item.credit;
        }
        return {
          ...item,
          balance: Math.max(0, runningBalance),
        };
      });

      setLedgerEntries(mappedWithBalance);
    } catch (e) {
      console.log('Error fetching all 4 ledger APIs:', e.message);
      setLedgerEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  useEffect(() => {
    fetchAllLedgerData();
  }, []);

  const filteredEntries = ledgerEntries.filter((item) => {
    const text = `${item.tenantName || ''} ${item.propertyName || ''} ${item.description || ''} ${item.transactionType || ''}`.toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All Types' ? true : item.transactionType === typeFilter;
    return matchesSearch && matchesType;
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>
          {es ? 'Cargando Libro Mayor...' : 'Loading Rent Ledger...'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.mainWrapper}
      contentContainerStyle={styles.outerContentContainer}
      showsVerticalScrollIndicator={true}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchAllLedgerData} tintColor="#38bdf8" />}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Page Header */}
        <View style={styles.header}>
          <Text style={styles.title} allowFontScaling={false}>
            {es ? 'Libro Mayor de Renta' : 'Rent Ledger'}
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={es ? 'Buscar en el libro mayor...' : 'Search ledger entries...'}
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={(txt) => {
                setSearchQuery(txt);
              }}
            />
          </View>
        </View>

        {/* Type Filter Pills */}
        <View style={styles.typePillsRow}>
          {[
            { key: 'All Types', label: es ? 'Todos' : 'All Types' },
            { key: 'Rent Charge', label: es ? 'Cargo de Renta' : 'Rent Charge' },
            { key: 'Payment', label: es ? 'Pago' : 'Payment' },
          ].map(({ key, label }) => {
            const isSelected = typeFilter === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.typeChip, isSelected && styles.typeChipActive]}
                onPress={() => {
                  setTypeFilter(key);
                }}
              >
                <Text style={[styles.typeChipText, isSelected && styles.typeChipTextActive]} allowFontScaling={false}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section Header */}
        <View style={styles.showingRow}>
          <Text style={styles.showingText} allowFontScaling={false}>
            {es ? `TRANSACCIONES DEL LIBRO MAYOR (${filteredEntries.length})` : `LEDGER TRANSACTIONS (${filteredEntries.length})`}
          </Text>
        </View>

        {/* Ledger Entries List */}
        {filteredEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color="#475569" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText} allowFontScaling={false}>
              {es ? 'No se encontraron transacciones' : 'No transactions found'}
            </Text>
          </View>
        ) : (
          filteredEntries.map((item, idx) => {
            const isCharge = item.transactionType === 'Rent Charge';
            return (
              <AnimatedTouchable
                key={item.id || `ledger-${idx}`}
                style={styles.card}
                onPress={() => setSelectedEntry(item)}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.infoLine}>
                      <Ionicons name="person-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                      <Text style={styles.tenantNameText} allowFontScaling={false}>
                        {item.tenantName}
                      </Text>
                    </View>
                    <View style={styles.infoLine}>
                      <Ionicons name="business-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                      <Text style={styles.propText} allowFontScaling={false}>
                        {item.propertyName} ({es ? 'Unidad' : 'Unit'} {item.unitNumber})
                      </Text>
                    </View>
                    <Text style={styles.descText} allowFontScaling={false}>
                      {translateDescription(item.description)} · {es ? 'Fecha:' : 'Date:'} {item.date}
                    </Text>
                  </View>

                  <View style={styles.rightGroup}>
                    <View style={[styles.typeBadge, isCharge ? styles.badgeRed : styles.badgeGreen]}>
                      <Text style={[styles.typeBadgeText, isCharge ? styles.textRed : styles.textGreen]} allowFontScaling={false}>
                        {translateType(item.transactionType)}
                      </Text>
                    </View>

                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setSelectedEntry(item)} activeOpacity={0.7}>
                      <Ionicons name="eye-outline" size={14} color="#cbd5e1" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Debit, Credit & Running Balance Metrics Row */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel} allowFontScaling={false}>
                      {es ? 'DÉBITO (+CARGO)' : 'DEBIT (+CHARGE)'}
                    </Text>
                    <Text style={[styles.metricVal, item.debit > 0 ? { color: '#f87171' } : { color: '#cbd5e1' }]} allowFontScaling={false}>
                      {item.debit > 0 ? `+$${item.debit.toLocaleString()}` : '-'}
                    </Text>
                  </View>

                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel} allowFontScaling={false}>
                      {es ? 'CRÉDITO (-PAGO)' : 'CREDIT (-PAYMENT)'}
                    </Text>
                    <Text style={[styles.metricVal, item.credit > 0 ? { color: '#10b981' } : { color: '#cbd5e1' }]} allowFontScaling={false}>
                      {item.credit > 0 ? `-$${item.credit.toLocaleString()}` : '-'}
                    </Text>
                  </View>

                  <View style={styles.metricColRight}>
                    <Text style={styles.metricLabel} allowFontScaling={false}>
                      {es ? 'SALDO ACTUAL' : 'RUNNING BALANCE'}
                    </Text>
                    <Text style={[styles.metricVal, item.balance > 0 ? { color: '#f87171', fontWeight: '900' } : { color: '#10b981', fontWeight: '900' }]} allowFontScaling={false}>
                      ${item.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              </AnimatedTouchable>
            );
          })
        )}
      </Animated.View>

      {/* MODAL: View Ledger Transaction Details */}
      <Modal visible={!!selectedEntry} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="receipt-outline" size={20} color="#38bdf8" style={{ marginRight: 6 }} />
                <Text style={styles.modalTitle} allowFontScaling={false}>
                  {es ? 'Estado del Libro Mayor' : 'Ledger Statement'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedEntry(null)}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>
                  {es ? 'Nombre del Residente' : 'Resident Name'}
                </Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedEntry?.tenantName}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>
                  {es ? 'Propiedad y Unidad' : 'Property & Unit'}
                </Text>
                <Text style={styles.detailVal} allowFontScaling={false}>
                  {selectedEntry?.propertyName} ({es ? 'Unidad' : 'Unit'} {selectedEntry?.unitNumber})
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>
                  {es ? 'Fecha de Transacción' : 'Transaction Date'}
                </Text>
                <Text style={styles.detailVal} allowFontScaling={false}>{selectedEntry?.date}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>
                  {es ? 'Descripción' : 'Description'}
                </Text>
                <Text style={styles.detailVal} allowFontScaling={false}>
                  {translateDescription(selectedEntry?.description)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>
                  {es ? 'Tipo' : 'Type'}
                </Text>
                <Text style={styles.detailVal} allowFontScaling={false}>
                  {translateType(selectedEntry?.transactionType)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>
                  {es ? 'Monto de Débito (+)' : 'Debit Amount (+)'}
                </Text>
                <Text style={[styles.detailVal, { color: '#f87171' }]} allowFontScaling={false}>
                  {selectedEntry?.debit > 0 ? `+$${selectedEntry.debit.toLocaleString()}` : '$0.00'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel} allowFontScaling={false}>
                  {es ? 'Monto de Crédito (-)' : 'Credit Amount (-)'}
                </Text>
                <Text style={[styles.detailVal, { color: '#10b981' }]} allowFontScaling={false}>
                  {selectedEntry?.credit > 0 ? `-$${selectedEntry.credit.toLocaleString()}` : '$0.00'}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel} allowFontScaling={false}>
                  {es ? 'Saldo Actual' : 'Running Balance'}
                </Text>
                <Text style={[styles.detailVal, { color: '#f87171', fontWeight: '900' }]} allowFontScaling={false}>
                  ${(selectedEntry?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedEntry(null)}>
              <Text style={styles.closeModalBtnText} allowFontScaling={false}>
                {es ? 'Cerrar Declaración' : 'Close Statement'}
              </Text>
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
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },

  showingRow: { marginBottom: 10 },
  showingText: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },

  searchBarRow: { flexDirection: 'row', marginBottom: 16 },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    color: colors.textPrimary,
    fontSize: 12,
    flex: 1,
    padding: 0,
  },

  typePillsRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  typeChip: { backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder },
  typeChipActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  typeChipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  typeChipTextActive: { color: '#ffffff', fontWeight: '800' },

  emptyCard: { backgroundColor: colors.surface, padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  emptyText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },

  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.cardBorder },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLine: { flexDirection: 'row', alignItems: 'center', marginVertical: 1 },
  tenantNameText: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  propText: { fontSize: 12, color: colors.textSecondary },
  descText: { fontSize: 11, color: colors.textMuted, marginTop: 3 },

  rightGroup: { alignItems: 'flex-end', gap: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeRed: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' },
  badgeGreen: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981' },
  typeBadgeText: { fontSize: 9.5, fontWeight: '800' },
  textRed: { color: '#ef4444' },
  textGreen: { color: '#10b981' },
  eyeBtn: { backgroundColor: colors.inputBackground, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder },

  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 12 },

  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricCol: { flex: 1 },
  metricColRight: { alignItems: 'flex-end' },
  metricLabel: { fontSize: 8.5, color: colors.textMuted, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  metricVal: { fontSize: 12.5, fontWeight: '700', color: colors.textPrimary },

  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.cardBorder },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalHeaderTitleRow: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },

  detailCard: { backgroundColor: colors.inputBackground, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surface },
  detailLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  detailVal: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  closeModalBtn: { backgroundColor: colors.buttonSecondary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  closeModalBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
});

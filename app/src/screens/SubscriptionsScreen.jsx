import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Animated,
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

export const SubscriptionsScreen = () => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  // States
  const [activeSubTab, setActiveSubTab] = useState('plans'); // 'plans' | 'active' | 'invoices'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data List States
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Create Plan Form States
  const [createPlanModalOpen, setCreatePlanModalOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [billingCycle, setBillingCycle] = useState('Monthly');
  const [billingCycleDropdownOpen, setBillingCycleDropdownOpen] = useState(false);
  const [maxUnits, setMaxUnits] = useState('');
  const [features, setFeatures] = useState('');

  // Create Invoice Form States
  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('Paid');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const fetchLiveSubscriptionsData = async () => {
    try {
      setLoading(true);
      const [plansRes, compRes, invoicesRes] = await Promise.all([
        apiClient.get('/superadmin/plans', logout, refreshAccessToken),
        apiClient.get('/superadmin/companies', logout, refreshAccessToken),
        apiClient.get('/superadmin/invoices', logout, refreshAccessToken),
      ]);

      if (plansRes && plansRes.data) {
        setPlans(plansRes.data);
      } else {
        setPlans([]);
      }

      if (compRes) {
        const list = Array.isArray(compRes) ? compRes : (compRes.data || []);
        setSubscriptions(list);
        setCompanies(list);
      } else {
        setSubscriptions([]);
        setCompanies([]);
      }

      if (invoicesRes && invoicesRes.data) {
        setInvoices(invoicesRes.data);
      } else {
        setInvoices([]);
      }
    } catch (e) {
      console.log('Error fetching live subscriptions from Railway:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveSubscriptionsData();
  }, []);

  const handleCreatePlan = async () => {
    if (!planName || !planPrice) {
      Alert.alert('Error', 'Please fill in plan name and price');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: planName,
        price: parseFloat(planPrice) || 0,
        billingCycle,
        maxUnits: parseInt(maxUnits) || 500,
        features: features || 'Unlimited Users, Advanced Analytics, Automated Workflows',
      };
      await apiClient.post('/superadmin/plans', payload, logout, refreshAccessToken);
      Alert.alert('Success', `Pricing Plan "${planName}" published successfully.`);
      setCreatePlanModalOpen(false);
      
      // Reset form
      setPlanName('');
      setPlanPrice('');
      setBillingCycle('Monthly');
      setMaxUnits('');
      setFeatures('');
      
      fetchLiveSubscriptionsData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedCompany || !invoiceAmount) {
      Alert.alert('Error', 'Please select a company and fill in amount');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        companyId: selectedCompany.id,
        companyName: selectedCompany.name || selectedCompany.email,
        amount: parseFloat(invoiceAmount) || 0,
        status: invoiceStatus,
      };

      await apiClient.post('/superadmin/invoices', payload, logout, refreshAccessToken);
      Alert.alert('Success', `Invoice successfully generated for ${selectedCompany.name || selectedCompany.email}`);
      setCreateInvoiceModalOpen(false);
      
      // Reset form
      setSelectedCompany(null);
      setInvoiceAmount('');
      setInvoiceStatus('Paid');
      
      fetchLiveSubscriptionsData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to generate invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId, currentStatus) => {
    const nextStatus = currentStatus === 'Paid' ? 'Pending' : currentStatus === 'Pending' ? 'Unpaid' : 'Paid';
    Alert.alert(
      'Update Status',
      `Change payment status to ${nextStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await apiClient.put(`/superadmin/invoices/${invoiceId}/status`, { status: nextStatus }, logout, refreshAccessToken);
              Alert.alert('Success', 'Invoice status updated successfully.');
              fetchLiveSubscriptionsData();
            } catch (error) {
              Alert.alert('Error', 'Could not update status.');
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>Loading Live SaaS Subscriptions...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLiveSubscriptionsData} tintColor="#38bdf8" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} allowFontScaling={false}>
            {activeSubTab === 'plans' && 'Pricing Plans'}
            {activeSubTab === 'active' && 'Subscriptions'}
            {activeSubTab === 'invoices' && 'Invoices Ledger'}
          </Text>

           {activeSubTab === 'plans' && (
            <TouchableOpacity style={styles.createBtn} onPress={() => setCreatePlanModalOpen(true)}>
              <Text style={styles.createBtnText} allowFontScaling={false}>+ Add Plan</Text>
            </TouchableOpacity>
          )}

          {activeSubTab === 'active' && (
            <View style={[styles.createBtn, { opacity: 0, backgroundColor: 'transparent' }]} pointerEvents="none">
              <Text style={styles.createBtnText} allowFontScaling={false}>+ Add Plan</Text>
            </View>
          )}

          {activeSubTab === 'invoices' && (
            <TouchableOpacity style={styles.createBtn} onPress={() => setCreateInvoiceModalOpen(true)}>
              <Text style={styles.createBtnText} allowFontScaling={false}>+ Add Invoice</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Selector Bar */}
      <View style={styles.tabSelectorBar}>
        <TouchableOpacity
          style={[styles.tabSelectorItem, activeSubTab === 'plans' && styles.tabSelectorActive]}
          onPress={() => setActiveSubTab('plans')}
        >
          <Text style={[styles.tabSelectorText, activeSubTab === 'plans' && styles.tabSelectorTextActive]} allowFontScaling={false}>
            Plans
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabSelectorItem, activeSubTab === 'active' && styles.tabSelectorActive]}
          onPress={() => setActiveSubTab('active')}
        >
          <Text style={[styles.tabSelectorText, activeSubTab === 'active' && styles.tabSelectorTextActive]} allowFontScaling={false}>
            Active Subscriptions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabSelectorItem, activeSubTab === 'invoices' && styles.tabSelectorActive]}
          onPress={() => setActiveSubTab('invoices')}
        >
          <Text style={[styles.tabSelectorText, activeSubTab === 'invoices' && styles.tabSelectorTextActive]} allowFontScaling={false}>
            Invoices
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- TAB 1: PLANS --- */}
      {activeSubTab === 'plans' && (
        <View style={styles.section}>
          {plans.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateText} allowFontScaling={false}>
                No active subscription plans found in database.
              </Text>
            </View>
          ) : (
            plans.map((p) => (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} allowFontScaling={false}>{p.name}</Text>
                  <Text style={styles.priceTag} allowFontScaling={false}>${p.price}/{p.billingCycle === 'Yearly' ? 'yr' : 'mo'}</Text>
                </View>
                <View style={styles.divider} />
                <Text style={styles.planSubDetail} allowFontScaling={false}>📦 Max Units Limit: {p.maxUnits || 500} Units</Text>
                <Text style={styles.planSubDetail} allowFontScaling={false}>🛡️ Max Properties Limit: {p.maxProperties || 50} Properties</Text>
                <Text style={styles.planFeatures} allowFontScaling={false}>✨ Features: {p.features}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {/* --- TAB 2: ACTIVE SUBSCRIPTIONS --- */}
      {activeSubTab === 'active' && (
        <View style={styles.section}>
          {subscriptions.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateText} allowFontScaling={false}>
                No active company subscriptions found in database.
              </Text>
            </View>
          ) : (
            subscriptions.map((item, idx) => (
              <View key={item.id || `sub-${idx}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} allowFontScaling={false}>
                    🏢 {item.name || item.email}
                  </Text>
                  <View style={[styles.badge, item.status === 'Active' ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={[styles.badgeText, item.status === 'Active' ? styles.badgeTextActive : styles.badgeTextInactive]} allowFontScaling={false}>
                      {item.status || 'Active'}
                    </Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <Text style={styles.planName} allowFontScaling={false}>📦 {item.planName || 'Pro Plan'}</Text>
                <Text style={styles.cardDetail} allowFontScaling={false}>👤 Contact: {item.contactName || item.email}</Text>
                <Text style={styles.cardDetail} allowFontScaling={false}>✉️ Email: {item.email}</Text>
                <Text style={styles.cardDetail} allowFontScaling={false}>📅 Next Billing Date: 2026-09-01</Text>
                <Text style={styles.cardDetail} allowFontScaling={false}>💰 Billing Cycle: Monthly</Text>
              </View>
            ))
          )}
        </View>
      )}

      {/* --- TAB 3: INVOICES --- */}
      {activeSubTab === 'invoices' && (
        <View style={styles.section}>
          {invoices.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateText} allowFontScaling={false}>
                No invoices found in database.
              </Text>
            </View>
          ) : (
            invoices.map((inv) => (
              <View key={inv.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} allowFontScaling={false}>📄 Invoice #{inv.id.toString().slice(-6).toUpperCase()}</Text>
                  <TouchableOpacity 
                    style={[
                      styles.badge, 
                      inv.status === 'Paid' ? styles.badgeActive : inv.status === 'Pending' ? styles.badgeWarning : styles.badgeInactive
                    ]}
                    onPress={() => handleUpdateInvoiceStatus(inv.id, inv.status)}
                  >
                    <Text style={[
                      styles.badgeText,
                      inv.status === 'Paid' ? styles.badgeTextActive : inv.status === 'Pending' ? styles.badgeTextWarning : styles.badgeTextInactive
                    ]} allowFontScaling={false}>
                      {inv.status || 'Paid'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.divider} />
                <Text style={styles.cardDetail} allowFontScaling={false}>🏢 Company: {inv.companyName || inv.company?.name || 'N/A'}</Text>
                <Text style={styles.cardDetail} allowFontScaling={false}>📅 Due Date: {inv.dueDate ? inv.dueDate.split('T')[0] : '2026-08-01'}</Text>
                {inv.paidDate && (
                  <Text style={styles.cardDetail} allowFontScaling={false}>💰 Paid Date: {inv.paidDate.split('T')[0]}</Text>
                )}
                <View style={styles.cardFooter}>
                  <Text style={styles.amountText} allowFontScaling={false}>Amount: ${parseFloat(inv.amount || 0).toLocaleString()}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* CREATE NEW PRICING PLAN MODAL */}
      <Modal visible={createPlanModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>Create New Subscription Plan</Text>
              <TouchableOpacity onPress={() => setCreatePlanModalOpen(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.inputLabel} allowFontScaling={false}>PLAN NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Pro Plus Plan"
                placeholderTextColor="#64748b"
                value={planName}
                onChangeText={setPlanName}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>MONTHLY PRICE ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 199"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={planPrice}
                onChangeText={setPlanPrice}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>BILLING CYCLE</Text>
              <TouchableOpacity style={styles.pickerSelector} onPress={() => setBillingCycleDropdownOpen(true)}>
                <Text style={styles.pickerSelectorText} allowFontScaling={false}>{billingCycle}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textPrimary} />
              </TouchableOpacity>

              <Text style={styles.inputLabel} allowFontScaling={false}>MAX UNITS LIMIT</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 500"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={maxUnits}
                onChangeText={setMaxUnits}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>INCLUDED FEATURES & DETAILS</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                placeholder="List features separated by commas..."
                placeholderTextColor="#64748b"
                multiline
                value={features}
                onChangeText={setFeatures}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setCreatePlanModalOpen(false)}>
                <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitBtn]} onPress={handleCreatePlan} disabled={submitting}>
                <Text style={styles.submitBtnText} allowFontScaling={false}>
                  {submitting ? 'Publishing...' : 'Publish Pricing Plan'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Billing Cycle Selector Modal */}
        <Modal visible={billingCycleDropdownOpen} transparent animationType="fade">
          <View style={styles.modalBg}>
            <View style={styles.pickerModalContent}>
              <Text style={styles.pickerModalTitle} allowFontScaling={false}>Select Billing Cycle</Text>
              {['Monthly', 'Yearly'].map((cycle) => (
                <TouchableOpacity
                  key={cycle}
                  style={styles.pickerOptionRow}
                  onPress={() => {
                    setBillingCycle(cycle);
                    setBillingCycleDropdownOpen(false);
                  }}
                >
                  <Text style={styles.pickerOptionText} allowFontScaling={false}>{cycle}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.closePickerBtn} onPress={() => setBillingCycleDropdownOpen(false)}>
                <Text style={styles.closePickerBtnText} allowFontScaling={false}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Modal>

      {/* CREATE NEW SAAS INVOICE MODAL */}
      <Modal visible={createInvoiceModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>Create New SaaS Invoice</Text>
              <TouchableOpacity onPress={() => setCreateInvoiceModalOpen(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.inputLabel} allowFontScaling={false}>COMPANY</Text>
              <TouchableOpacity style={styles.pickerSelector} onPress={() => setCompanyDropdownOpen(true)}>
                <Text style={styles.pickerSelectorText} allowFontScaling={false}>
                  {selectedCompany ? `${selectedCompany.name || selectedCompany.email} (${selectedCompany.code || 'CODE'})` : 'Select Company'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textPrimary} />
              </TouchableOpacity>

              <Text style={styles.inputLabel} allowFontScaling={false}>AMOUNT ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="299"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={invoiceAmount}
                onChangeText={setInvoiceAmount}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>PAYMENT STATUS</Text>
              <TouchableOpacity style={styles.pickerSelector} onPress={() => setStatusDropdownOpen(true)}>
                <Text style={styles.pickerSelectorText} allowFontScaling={false}>{invoiceStatus}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setCreateInvoiceModalOpen(false)}>
                <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitBtn]} onPress={handleCreateInvoice} disabled={submitting}>
                <Text style={styles.submitBtnText} allowFontScaling={false}>
                  {submitting ? 'Publishing...' : 'Publish Invoice'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Company Dropdown list modal */}
        <Modal visible={companyDropdownOpen} transparent animationType="fade">
          <View style={styles.modalBg}>
            <View style={styles.pickerModalContent}>
              <Text style={styles.pickerModalTitle} allowFontScaling={false}>Select Company</Text>
              <ScrollView style={{ maxHeight: 250 }}>
                {companies.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.pickerOptionRow}
                    onPress={() => {
                      setSelectedCompany(c);
                      setCompanyDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText} allowFontScaling={false}>
                      {c.name || c.email} ({c.code || 'CODE'})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.closePickerBtn} onPress={() => setCompanyDropdownOpen(false)}>
                <Text style={styles.closePickerBtnText} allowFontScaling={false}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Payment Status Dropdown modal */}
        <Modal visible={statusDropdownOpen} transparent animationType="fade">
          <View style={styles.modalBg}>
            <View style={styles.pickerModalContent}>
              <Text style={styles.pickerModalTitle} allowFontScaling={false}>Select Status</Text>
              {['Paid', 'Pending', 'Unpaid'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={styles.pickerOptionRow}
                  onPress={() => {
                    setInvoiceStatus(status);
                    setStatusDropdownOpen(false);
                  }}
                >
                  <Text style={styles.pickerOptionText} allowFontScaling={false}>{status}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.closePickerBtn} onPress={() => setStatusDropdownOpen(false)}>
                <Text style={styles.closePickerBtnText} allowFontScaling={false}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Modal>
    </ScrollView>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 8 },

  header: { marginBottom: 18, paddingTop: 6, height: 44, justifyContent: 'center' },
  breadcrumb: { color: '#38bdf8', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 38 },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, flex: 1 },
  subtitle: { fontSize: 11.5, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },

  createBtn: { backgroundColor: '#38bdf8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  createBtnText: { color: '#0f172a', fontSize: 11.5, fontWeight: '800' },

  tabSelectorBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabSelectorItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabSelectorActive: {
    backgroundColor: '#38bdf8',
  },
  tabSelectorText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabSelectorTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },

  section: { marginTop: 4 },
  emptyStateCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  emptyStateText: { color: colors.textSecondary, fontSize: 13 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary, flex: 1 },
  priceTag: { color: '#38bdf8', fontSize: 14, fontWeight: '800' },
  planSubDetail: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  planFeatures: { fontSize: 12, color: colors.textMuted, marginTop: 6, fontStyle: 'italic' },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 10.5, fontWeight: '800' },
  badgeActive: { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.3)' },
  badgeTextActive: { color: '#4ade80' },
  badgeInactive: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  badgeTextInactive: { color: '#f87171' },
  badgeWarning: { backgroundColor: 'rgba(250, 204, 21, 0.15)', borderColor: 'rgba(250, 204, 21, 0.3)' },
  badgeTextWarning: { color: '#facc15' },

  planName: { fontSize: 13, fontWeight: '800', color: '#38bdf8', marginVertical: 6 },
  cardDetail: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.divider },
  amountText: { color: '#4ade80', fontSize: 14, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 10 },

  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, width: '100%', maxHeight: '85%', borderWidth: 1, borderColor: colors.cardBorder },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16.5, fontWeight: '800', color: colors.textPrimary },
  inputLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: colors.textPrimary, fontSize: 13, marginBottom: 4 },
  pickerSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.inputBackground, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.inputBorder, marginBottom: 4 },
  pickerSelectorText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 14 },
  modalButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.buttonSecondary, marginRight: 8 },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '850', fontSize: 12.5 },
  submitBtn: { backgroundColor: '#38bdf8' },
  submitBtnText: { color: '#0f172a', fontWeight: '850', fontSize: 12.5 },

  // Picker Dropdown Modal Options
  pickerModalContent: { backgroundColor: colors.surface, borderRadius: 16, width: '80%', padding: 16, borderWidth: 1, borderColor: colors.cardBorder },
  pickerModalTitle: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  pickerOptionRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  pickerOptionText: { color: colors.textSecondary, fontSize: 13.5, fontWeight: '700' },
  closePickerBtn: { marginTop: 14, paddingVertical: 10, backgroundColor: '#ef4444', borderRadius: 10, alignItems: 'center' },
  closePickerBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
});

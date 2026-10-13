import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
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

export const CompaniesScreen = () => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  // States
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('Pro Plan');
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/superadmin/companies', logout, refreshAccessToken);
      let list = [];
      if (res) {
        list = Array.isArray(res) ? res : (res.data || []);
      }
      
      if (list.length === 0) {
        list = [
          { id: '1', name: 'Apex Property Management', code: 'APEX', contactName: 'Sarah Davis', email: 'staff@gmail.com', planName: 'Pro Plan', status: 'Active', phone: '555-0199', createdAt: '2026-08-01' },
          { id: '2', name: 'Metro Housing Solutions', code: 'METR', contactName: 'John Doe', email: 'john@metro.com', planName: 'Enterprise Plan', status: 'Active', phone: '555-0244', createdAt: '2026-08-01' },
        ];
      }
      setCompanies(list);
      applyFilter(list, searchQuery);
    } catch (e) {
      console.log('Error fetching companies:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const applyFilter = (list, query) => {
    if (!query.trim()) {
      setFilteredCompanies(list);
      return;
    }
    const q = query.toLowerCase();
    const filtered = list.filter(
      c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.code || '').toLowerCase().includes(q) ||
        (c.contactName || '').toLowerCase().includes(q)
    );
    setFilteredCompanies(filtered);
  };

  useEffect(() => {
    applyFilter(companies, searchQuery);
  }, [searchQuery, companies]);

  const handleCreateCompany = async () => {
    if (!companyName || !email || !contactName) {
      Alert.alert('Error', 'Please fill in Company Name, Primary Contact and Email.');
      return;
    }
    setSubmitting(true);
    try {
      const code = companyCode || companyName.substring(0, 4).toUpperCase();
      const payload = {
        name: companyName,
        legalName: legalName || companyName,
        code,
        contactName,
        email,
        password: password || 'admin123',
        phone: phone || '555-0100',
        planName: selectedPlan,
      };

      await apiClient.post('/superadmin/companies', payload, logout, refreshAccessToken);
      Alert.alert('Success', `Company "${companyName}" created successfully.`);
      setCreateModalOpen(false);
      
      // Reset form
      setCompanyName('');
      setLegalName('');
      setCompanyCode('');
      setContactName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setSelectedPlan('Pro Plan');
      
      fetchCompanies();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create company.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (companyId, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    Alert.alert(
      'Confirm Status Change',
      `Are you sure you want to change company status to ${nextStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await apiClient.put(`/superadmin/companies/${companyId}`, { status: nextStatus }, logout, refreshAccessToken);
              Alert.alert('Success', `Company status updated to ${nextStatus}`);
              fetchCompanies();
            } catch (error) {
              Alert.alert('Error', 'Could not update company status.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCompany = async (companyId, compName) => {
    Alert.alert(
      'Delete Company',
      `Are you sure you want to permanently delete "${compName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/superadmin/companies/${companyId}`, logout, refreshAccessToken);
              Alert.alert('Success', 'Company deleted successfully.');
              fetchCompanies();
            } catch (error) {
              Alert.alert('Error', 'Could not delete company.');
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
        <Text style={styles.loadingText} allowFontScaling={false}>Loading Companies Directory...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchCompanies} tintColor="#38bdf8" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} allowFontScaling={false}>Companies Directory</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalOpen(true)}>
            <Text style={styles.createBtnText} allowFontScaling={false}>+ Add Company</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search companies..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Companies List Grid/Cards */}
      {filteredCompanies.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateText} allowFontScaling={false}>
            No client companies found.
          </Text>
        </View>
      ) : (
        filteredCompanies.map((c) => (
          <View key={c.id} style={styles.companyCard}>
            <View style={styles.cardHeader}>
              <View style={styles.nameContainer}>
                <Text style={styles.compName} allowFontScaling={false}>{c.name || c.email}</Text>
                <Text style={styles.compCode} allowFontScaling={false}>{c.code || 'CODE'}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.statusBadge, c.status === 'Active' ? styles.statusActive : styles.statusSuspended]}
                onPress={() => handleUpdateStatus(c.id, c.status)}
              >
                <Text style={[styles.statusText, c.status === 'Active' ? styles.statusActiveText : styles.statusSuspendedText]} allowFontScaling={false}>
                  {c.status || 'Active'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel} allowFontScaling={false}>Primary Contact</Text>
              <Text style={styles.detailValue} allowFontScaling={false}>{c.contactName || 'Sarah Davis'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel} allowFontScaling={false}>Email Address</Text>
              <Text style={styles.detailValue} allowFontScaling={false}>{c.email}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel} allowFontScaling={false}>Phone Number</Text>
              <Text style={styles.detailValue} allowFontScaling={false}>{c.phone || '555-0100'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel} allowFontScaling={false}>Plan & Cycle</Text>
              <Text style={[styles.detailValue, { color: '#38bdf8', fontWeight: '800' }]} allowFontScaling={false}>
                {c.planName || 'Pro Plan'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel} allowFontScaling={false}>Created Date</Text>
              <Text style={styles.detailValue} allowFontScaling={false}>
                {c.createdAt ? c.createdAt.split('T')[0] : '2026-08-01'}
              </Text>
            </View>

            <View style={styles.cardFooterActions}>
              <TouchableOpacity 
                style={styles.actionBtnSecondary} 
                onPress={() => {
                  Alert.alert(
                    'Change Subscription Plan',
                    'Select plan to assign to this company:',
                    [
                      { text: 'Basic Plan', onPress: () => apiClient.put(`/superadmin/companies/${c.id}`, { planName: 'Basic Plan' }, logout, refreshAccessToken).then(() => fetchCompanies()) },
                      { text: 'Pro Plan', onPress: () => apiClient.put(`/superadmin/companies/${c.id}`, { planName: 'Pro Plan' }, logout, refreshAccessToken).then(() => fetchCompanies()) },
                      { text: 'Enterprise Plan', onPress: () => apiClient.put(`/superadmin/companies/${c.id}`, { planName: 'Enterprise Plan' }, logout, refreshAccessToken).then(() => fetchCompanies()) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
              >
                <Ionicons name="create-outline" size={14} color="#38bdf8" />
                <Text style={styles.actionBtnTextSecondary} allowFontScaling={false}>Edit Plan</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtnDanger} onPress={() => handleDeleteCompany(c.id, c.name)}>
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                <Text style={styles.actionBtnTextDanger} allowFontScaling={false}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Create Company Modal */}
      <Modal visible={createModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>Create New Company</Text>
              <TouchableOpacity onPress={() => setCreateModalOpen(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle} allowFontScaling={false}>Register a new subscriber tenant onto the SaaS platform.</Text>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.inputLabel} allowFontScaling={false}>COMPANY NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Apex Property Management"
                placeholderTextColor="#64748b"
                value={companyName}
                onChangeText={setCompanyName}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>BUSINESS NAME (LEGAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="Apex PM LLC"
                placeholderTextColor="#64748b"
                value={legalName}
                onChangeText={setLegalName}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>COMPANY CODE</Text>
              <TextInput
                style={styles.input}
                placeholder="APEX"
                placeholderTextColor="#64748b"
                autoCapitalize="characters"
                value={companyCode}
                onChangeText={setCompanyCode}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>PRIMARY CONTACT PERSON</Text>
              <TextInput
                style={styles.input}
                placeholder="Sarah Davis"
                placeholderTextColor="#64748b"
                value={contactName}
                onChangeText={setContactName}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                placeholder="staff@gmail.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>PHONE NUMBER</Text>
              <TextInput
                style={styles.input}
                placeholder="555-0199"
                placeholderTextColor="#64748b"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>SUBSCRIPTION PLAN</Text>
              <TouchableOpacity style={styles.pickerSelector} onPress={() => setPlanDropdownOpen(true)}>
                <Text style={styles.pickerSelectorText} allowFontScaling={false}>{selectedPlan}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setCreateModalOpen(false)}>
                <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitBtn]} onPress={handleCreateCompany} disabled={submitting}>
                <Text style={styles.submitBtnText} allowFontScaling={false}>
                  {submitting ? 'Creating...' : 'Create Company'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Plan Select Dropdown Modal */}
        <Modal visible={planDropdownOpen} transparent animationType="fade">
          <View style={styles.modalBg}>
            <View style={styles.pickerModalContent}>
              <Text style={styles.pickerModalTitle} allowFontScaling={false}>Select Subscription Plan</Text>
              {['Basic Plan', 'Pro Plan', 'Enterprise Plan'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={styles.pickerOptionRow}
                  onPress={() => {
                    setSelectedPlan(p);
                    setPlanDropdownOpen(false);
                  }}
                >
                  <Text style={styles.pickerOptionText} allowFontScaling={false}>{p}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.closePickerBtn} onPress={() => setPlanDropdownOpen(false)}>
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

  header: { marginBottom: 18, paddingTop: 6 },
  breadcrumb: { color: '#38bdf8', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, flex: 1 },
  subtitle: { fontSize: 11.5, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },

  createBtn: { backgroundColor: '#38bdf8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  createBtnText: { color: '#0f172a', fontSize: 12, fontWeight: '800' },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13, height: '100%', padding: 0 },

  emptyStateCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  emptyStateText: { color: colors.textSecondary, fontSize: 13 },

  // Company list cards
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  companyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  nameContainer: { flex: 1, marginRight: 8 },
  compName: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary },
  compCode: { fontSize: 10, fontWeight: '800', color: '#38bdf8', marginTop: 2, letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 10.5, fontWeight: '800' },
  statusActive: { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.3)' },
  statusActiveText: { color: '#4ade80' },
  statusSuspended: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  statusSuspendedText: { color: '#f87171' },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 },
  detailLabel: { fontSize: 12, color: colors.textSecondary },
  detailValue: { fontSize: 12, color: colors.textPrimary, fontWeight: '600' },
  cardFooterActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  actionBtnSecondary: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.buttonSecondary, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  actionBtnTextSecondary: { color: '#38bdf8', fontSize: 11, fontWeight: '700' },
  actionBtnDanger: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239, 68, 68, 0.12)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  actionBtnTextDanger: { color: '#f87171', fontSize: 11, fontWeight: '700' },

  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, width: '100%', maxHeight: '85%', borderWidth: 1, borderColor: colors.cardBorder },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 16.5, fontWeight: '800', color: colors.textPrimary },
  modalSubtitle: { fontSize: 12, color: colors.textSecondary, marginBottom: 14 },
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

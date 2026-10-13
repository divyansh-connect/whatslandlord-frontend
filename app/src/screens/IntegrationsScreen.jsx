import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export const IntegrationsScreen = ({ onNavigate }) => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  const [loading, setLoading] = useState(true);
  const [dbIntegrations, setDbIntegrations] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');

  // Selected config details modal
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [accountSidValue, setAccountSidValue] = useState('');
  const [senderIdValue, setSenderIdValue] = useState('');
  const [authTokenValue, setAuthTokenValue] = useState('');
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [enableStatus, setEnableStatus] = useState('Inactive');

  // Test & Save states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchIntegrations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await apiClient.get('/integrations', logout, refreshAccessToken);
      setDbIntegrations(res?.data || res || []);
    } catch (e) {
      console.log('Failed fetching integrations:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const openConfigModal = (integration) => {
    setSelectedIntegration(integration);
    setAccountSidValue(integration.accountSid || '');
    setSenderIdValue(integration.senderId || '');
    setAuthTokenValue(integration.hasToken ? '******' : '');
    setEnableStatus(integration.status || 'Inactive');
    setShowAuthToken(false);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!selectedIntegration?.provider) return;
    const isPayment = ['STRIPE', 'AUTHORIZE_NET', 'RAZORPAY'].includes(selectedIntegration.provider);
    
    // Validate required fields
    if (!accountSidValue.trim() || (!isPayment && !senderIdValue.trim()) || !authTokenValue.trim()) {
      setTestResult({ success: false, message: 'Please fill in all credentials before testing.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await apiClient.post('/integrations/test', {
        provider: selectedIntegration.provider,
        accountSid: accountSidValue.trim(),
        senderId: senderIdValue.trim(),
        authToken: authTokenValue.trim(),
      }, logout, refreshAccessToken);
      
      const data = res?.data || res || {};
      setTestResult({
        success: data.success ?? true,
        message: res.message || 'Connection successful!'
      });
    } catch (e) {
      setTestResult({ success: false, message: e.message || 'Connection test failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveIntegration = async () => {
    if (!selectedIntegration?.provider) return;
    
    setIsSaving(true);
    try {
      const payload = {
        provider: selectedIntegration.provider,
        accountSid: accountSidValue.trim(),
        senderId: senderIdValue.trim(),
        status: enableStatus,
      };

      // Only send authToken if it has been updated
      if (authTokenValue !== '******') {
        payload.authToken = authTokenValue.trim();
      }

      await apiClient.post('/integrations/update', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Integration configurations saved successfully.');
      setSelectedIntegration(null);
      fetchIntegrations(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save integration settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const categories = ['All', 'Payments', 'Communications'];
  const filtered = activeCategory === 'All'
    ? dbIntegrations
    : dbIntegrations.filter((i) => i.category === activeCategory);

  const getPlaceholderSid = (provider) => {
    if (provider === 'STRIPE') return 'Publishable Key (pk_test_...)';
    if (provider === 'AUTHORIZE_NET') return 'API Login ID';
    if (provider === 'RAZORPAY') return 'Key ID';
    if (provider === 'TWILIO') return 'Account SID';
    if (provider === 'WHATSAPP') return 'Phone Number ID';
    return 'Account Account / Client ID';
  };

  const getPlaceholderToken = (provider) => {
    if (provider === 'STRIPE') return 'Secret Key (sk_test_...)';
    if (provider === 'AUTHORIZE_NET') return 'Transaction Key';
    if (provider === 'RAZORPAY') return 'Key Secret';
    if (provider === 'TWILIO') return 'Auth Token';
    if (provider === 'WHATSAPP') return 'Permanent Access Token';
    return 'API Access Token / Secret Key';
  };

  const getPlaceholderSender = (provider) => {
    if (provider === 'TWILIO') return 'Twilio Phone Number / Messaging Service SID';
    if (provider === 'WHATSAPP') return 'WhatsApp Business Account ID';
    return 'Sender ID';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>Loading marketplace integrations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      {/* FIXED NAVIGATION HEADER */}
      <View style={styles.fixedHeader}>
        <TouchableOpacity onPress={() => onNavigate && onNavigate('more')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} style={{ marginRight: 6 }} />
          <Text style={styles.title} allowFontScaling={false}>Integrations Marketplace</Text>
        </TouchableOpacity>
        <Text style={styles.subtitle} allowFontScaling={false}>Configure third-party service gateways</Text>
      </View>

      {/* FILTER CHIPS */}
      <View style={styles.filtersContainer}>
        {categories.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.filterChip, activeCategory === c && styles.filterChipActive]}
            onPress={() => setActiveCategory(c)}
          >
            <Text style={[styles.filterChipText, activeCategory === c && styles.filterChipTextActive]} allowFontScaling={false}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* INTEGRATIONS LIST */}
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filtered.length > 0 ? (
          filtered.map((item) => {
            const isActive = item.status === 'Active';
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.integrationCard}
                onPress={() => openConfigModal(item)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.logoCircle}>
                    <Text style={styles.logoEmoji} allowFontScaling={false}>{item.logo || '🧩'}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.integrationName} allowFontScaling={false}>{item.name}</Text>
                    <Text style={styles.integrationCategory} allowFontScaling={false}>{item.category.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
                    <Text style={isActive ? styles.statusTextActive : styles.statusTextInactive} allowFontScaling={false}>
                      {item.status || 'Inactive'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.description} allowFontScaling={false}>{item.description}</Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="apps-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText} allowFontScaling={false}>No integrations found in this category.</Text>
          </View>
        )}
      </ScrollView>

      {/* CONFIGURATION MODAL */}
      {selectedIntegration && (
        <Modal visible={!!selectedIntegration} animationType="slide" transparent>
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, marginRight: 8 }} allowFontScaling={false}>
                    {selectedIntegration.logo || '🧩'}
                  </Text>
                  <View>
                    <Text style={styles.modalTitle} allowFontScaling={false}>{selectedIntegration.name}</Text>
                    <Text style={{ fontSize: 10, color: colors.textSecondary }} allowFontScaling={false}>
                      PROVIDER ID: {selectedIntegration.provider}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedIntegration(null)}>
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Status Toggle */}
                <View style={styles.toggleRow}>
                  <Text style={styles.fieldLabel} allowFontScaling={false}>INTEGRATION STATUS</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.toggleText, { color: enableStatus === 'Active' ? '#10b981' : colors.textSecondary }]} allowFontScaling={false}>
                      {enableStatus === 'Active' ? 'Enabled' : 'Disabled'}
                    </Text>
                    <Switch
                      value={enableStatus === 'Active'}
                      onValueChange={(val) => setEnableStatus(val ? 'Active' : 'Inactive')}
                      trackColor={{ false: colors.cardBorder, true: '#38bdf8' }}
                      thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
                    />
                  </View>
                </View>

                {/* Input accountSid */}
                <Text style={styles.fieldLabel} allowFontScaling={false}>
                  {selectedIntegration.provider === 'STRIPE' ? 'PUBLISHABLE KEY (SID) *' : 'ACCOUNT SID / API KEY *'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={getPlaceholderSid(selectedIntegration.provider)}
                  placeholderTextColor="#64748b"
                  value={accountSidValue}
                  onChangeText={setAccountSidValue}
                />

                {/* Input senderId (only for twilio & whatsapp) */}
                {!['STRIPE', 'AUTHORIZE_NET', 'RAZORPAY'].includes(selectedIntegration.provider) && (
                  <>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>SENDER ID / SENDER NUMBER *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={getPlaceholderSender(selectedIntegration.provider)}
                      placeholderTextColor="#64748b"
                      value={senderIdValue}
                      onChangeText={setSenderIdValue}
                    />
                  </>
                )}

                {/* Input authToken */}
                <Text style={styles.fieldLabel} allowFontScaling={false}>
                  {selectedIntegration.provider === 'STRIPE' ? 'SECRET KEY (TOKEN) *' : 'AUTHENTICATION TOKEN / KEY SECRET *'}
                </Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[styles.input, { paddingRight: 40 }]}
                    placeholder={getPlaceholderToken(selectedIntegration.provider)}
                    placeholderTextColor="#64748b"
                    secureTextEntry={authTokenValue === '******' ? true : !showAuthToken}
                    value={authTokenValue}
                    onChangeText={setAuthTokenValue}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => {
                      if (authTokenValue === '******') {
                        setAuthTokenValue('');
                      } else {
                        setShowAuthToken(!showAuthToken);
                      }
                    }}
                  >
                    <Ionicons
                      name={authTokenValue === '******' || !showAuthToken ? 'eye-off' : 'eye'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Test results banner */}
                {testResult && (
                  <View style={[styles.resultBanner, testResult.success ? styles.resultSuccess : styles.resultFailed]}>
                    <Ionicons
                      name={testResult.success ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                      size={18}
                      color={testResult.success ? '#10b981' : '#ef4444'}
                    />
                    <Text style={[styles.resultText, { color: testResult.success ? '#10b981' : '#ef4444' }]} allowFontScaling={false}>
                      {testResult.message}
                    </Text>
                  </View>
                )}

                {/* MODAL ACTIONS */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.testBtn, { borderColor: colors.cardBorder }]}
                    onPress={handleTestConnection}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <ActivityIndicator size="small" color="#38bdf8" />
                    ) : (
                      <>
                        <Ionicons name="git-network-outline" size={16} color="#38bdf8" style={{ marginRight: 4 }} />
                        <Text style={styles.testBtnText} allowFontScaling={false}>Test Connection</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: '#38bdf8' }]}
                    onPress={handleSaveIntegration}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#0f172a" />
                    ) : (
                      <Text style={[styles.submitBtnText, { color: '#0f172a', fontWeight: '800' }]} allowFontScaling={false}>
                        Save Settings
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, fontSize: 13, marginTop: 8 },

  fixedHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },

  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  filterChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },

  integrationCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: { fontSize: 22 },
  integrationName: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  integrationCategory: { fontSize: 9, fontWeight: '800', color: '#38bdf8', marginTop: 2 },
  
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  statusInactive: { backgroundColor: colors.cardBorder },
  statusTextActive: { fontSize: 10, color: '#10b981', fontWeight: '800' },
  statusTextInactive: { fontSize: 10, color: colors.textSecondary, fontWeight: '700' },

  description: { fontSize: 11.5, color: colors.textSecondary, marginTop: 12, lineHeight: 16 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 10 },
  emptyText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },

  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.cardBorder, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, paddingBottom: 12 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, backgroundColor: colors.background, padding: 10, borderRadius: 8 },
  toggleText: { fontSize: 12, fontWeight: '800', marginRight: 8 },

  fieldLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 12.5,
    marginBottom: 8,
  },
  eyeIcon: { position: 'absolute', right: 10, top: 12 },

  resultBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, padding: 10, marginVertical: 8, gap: 8 },
  resultSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  resultFailed: { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  resultText: { fontSize: 11, fontWeight: '700', flex: 1 },

  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  testBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, paddingVertical: 12 },
  testBtnText: { color: '#38bdf8', fontSize: 12, fontWeight: '800' },
  submitBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingVertical: 12 },
  submitBtnText: { fontSize: 12 },
});

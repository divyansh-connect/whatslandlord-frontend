import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { AppActivityIndicator as ActivityIndicator } from '../components/AppActivityIndicator';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export const IntegrationsScreen = ({ onNavigate, onBack }) => {
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
  const [isEditing, setIsEditing] = useState(false);

  // Test & Save states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const DEFAULT_LIST = [
    {
      id: 'int-twilio',
      name: 'Twilio SMS',
      provider: 'TWILIO',
      category: 'Communications',
      description: 'Configure Twilio to send tenant notices, announcements, and booking alerts via SMS.',
      logo: '💬',
      status: 'Inactive',
      accountSid: '',
      senderId: '',
      hasToken: false,
    },
    {
      id: 'int-whatsapp',
      name: 'WhatsApp Business (Meta API)',
      provider: 'WHATSAPP',
      category: 'Communications',
      description: 'Configure Meta Cloud API to broadcast automated messages directly to tenant WhatsApp accounts.',
      logo: '📱',
      status: 'Inactive',
      accountSid: '',
      senderId: '',
      hasToken: false,
    },
    {
      id: 'int-sendgrid',
      name: 'Twilio SendGrid (Email)',
      provider: 'SENDGRID',
      category: 'Communications',
      description: 'Connect Twilio SendGrid to dispatch automated emails for tenant registrations, leases, and invoices.',
      logo: '📧',
      status: 'Inactive',
      accountSid: '',
      senderId: '',
      hasToken: false,
    },
    {
      id: 'int-stripe',
      name: 'Stripe Payments',
      provider: 'STRIPE',
      category: 'Payments',
      description: 'Connect Stripe to accept credit cards, debit cards, and Apple Pay from tenants directly.',
      logo: '💳',
      status: 'Inactive',
      accountSid: '',
      senderId: '',
      hasToken: false,
    },
    {
      id: 'int-authorizenet',
      name: 'Authorize.Net Merchant',
      provider: 'AUTHORIZE_NET',
      category: 'Payments',
      description: 'Configure Authorize.Net to process credit cards and electronic checks (eChecks) safely.',
      logo: '🔒',
      status: 'Inactive',
      accountSid: '',
      senderId: '',
      hasToken: false,
    },
    {
      id: 'int-razorpay',
      name: 'Razorpay Gateway',
      provider: 'RAZORPAY',
      category: 'Payments',
      description: 'Integrate Razorpay to accept UPI, netbanking, credit cards, and wallets from international/local tenants.',
      logo: '⚡',
      status: 'Inactive',
      accountSid: '',
      senderId: '',
      hasToken: false,
    },
  ];

  const mergedIntegrations = React.useMemo(() => {
    const list = Array.isArray(dbIntegrations) && dbIntegrations.length > 0 ? [...dbIntegrations] : DEFAULT_LIST;
    if (!list.some((i) => i.provider === 'SENDGRID')) {
      const commIdx = list.findIndex((i) => i.provider === 'WHATSAPP');
      const insertAt = commIdx !== -1 ? commIdx + 1 : 2;
      list.splice(insertAt, 0, DEFAULT_LIST[2]);
    }
    return list;
  }, [dbIntegrations]);

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
    setIsEditing(integration.status !== 'Active');
  };

  const handleTestConnection = async () => {
    if (!selectedIntegration?.provider) return;
    const isPayment = ['STRIPE', 'AUTHORIZE_NET', 'RAZORPAY'].includes(selectedIntegration.provider);
    
    // Validate required fields
    if (selectedIntegration.provider === 'SENDGRID') {
      if (!senderIdValue.trim() || !authTokenValue.trim()) {
        setTestResult({ success: false, message: 'Please provide both Sender Email and SendGrid API Key.' });
        return;
      }
    } else if (!accountSidValue.trim() || (!isPayment && !senderIdValue.trim()) || !authTokenValue.trim()) {
      setTestResult({ success: false, message: 'Please fill in all credentials before testing.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await apiClient.post('/integrations/test', {
        provider: selectedIntegration.provider,
        accountSid: accountSidValue.trim() || 'Property Management',
        senderId: isPayment ? 'N/A' : senderIdValue.trim(),
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

  const handleAutoVerifyAndSave = async () => {
    if (!selectedIntegration?.provider) return;
    const isPayment = ['STRIPE', 'AUTHORIZE_NET', 'RAZORPAY'].includes(selectedIntegration.provider);

    if (selectedIntegration.provider === 'SENDGRID') {
      if (!senderIdValue.trim()) {
        Alert.alert('Required', 'Verified Sender Email is required.');
        return;
      }
      if (authTokenValue !== '******' && !authTokenValue.trim()) {
        Alert.alert('Required', 'SendGrid API Key is required.');
        return;
      }
    } else if (!accountSidValue.trim() || (!isPayment && !senderIdValue.trim())) {
      Alert.alert('Required', isPayment ? 'Key / ID is required.' : 'Account ID and Sender ID are required.');
      return;
    }

    setIsSaving(true);
    setTestResult(null);

    // Auto-verify if authToken provided
    if (authTokenValue && authTokenValue !== '******') {
      try {
        const testRes = await apiClient.post('/integrations/test', {
          provider: selectedIntegration.provider,
          accountSid: accountSidValue.trim() || 'Property Management',
          senderId: isPayment ? 'N/A' : senderIdValue.trim(),
          authToken: authTokenValue.trim(),
        }, logout, refreshAccessToken);

        const testData = testRes?.data || testRes || {};
        if (testData.success === false) {
          setTestResult({ success: false, message: testRes.message || 'Verification failed. Please check credentials.' });
          Alert.alert('Verification Failed', testRes.message || 'The credentials could not be verified by the provider API. Integration remained Inactive.');
          setIsSaving(false);
          return;
        }
      } catch (testErr) {
        setTestResult({ success: false, message: testErr.message || 'API validation failed.' });
        Alert.alert('Verification Error', testErr.message || 'Could not verify credentials. Integration not activated.');
        setIsSaving(false);
        return;
      }
    }

    // Verified -> Save as Active
    try {
      const payload = {
        provider: selectedIntegration.provider,
        accountSid: accountSidValue.trim() || 'Property Management',
        senderId: isPayment ? 'N/A' : senderIdValue.trim(),
        status: 'Active',
      };

      if (authTokenValue !== '******') {
        payload.authToken = authTokenValue.trim();
      }

      await apiClient.post('/integrations/update', payload, logout, refreshAccessToken);
      Alert.alert('Connected & Active', `${selectedIntegration.name} credentials verified and activated successfully!`);
      setSelectedIntegration(null);
      fetchIntegrations(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save integration settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!selectedIntegration?.provider) return;
    Alert.alert(
      'Disconnect Integration',
      `Are you sure you want to disconnect ${selectedIntegration.name}? Automated services using this integration will be paused.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              await apiClient.post('/integrations/update', {
                provider: selectedIntegration.provider,
                accountSid: accountSidValue || 'Property Management',
                senderId: senderIdValue || 'N/A',
                status: 'Inactive',
              }, logout, refreshAccessToken);
              Alert.alert('Disconnected', `${selectedIntegration.name} has been disconnected.`);
              setSelectedIntegration(null);
              fetchIntegrations(true);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to disconnect integration.');
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  const categories = ['All', 'Payments', 'Communications'];
  const filtered = activeCategory === 'All'
    ? mergedIntegrations
    : mergedIntegrations.filter((i) => i.category === activeCategory);

  const getPlaceholderSid = (provider) => {
    if (provider === 'STRIPE') return 'Publishable Key (pk_test_...)';
    if (provider === 'AUTHORIZE_NET') return 'API Login ID';
    if (provider === 'RAZORPAY') return 'Key ID';
    if (provider === 'TWILIO') return 'Account SID';
    if (provider === 'WHATSAPP') return 'Phone Number ID';
    if (provider === 'SENDGRID') return 'e.g. Property Management (Sender From Name)';
    return 'Account ID / Client ID';
  };

  const getPlaceholderToken = (provider) => {
    if (provider === 'STRIPE') return 'Secret Key (sk_test_...)';
    if (provider === 'AUTHORIZE_NET') return 'Transaction Key';
    if (provider === 'RAZORPAY') return 'Key Secret';
    if (provider === 'TWILIO') return 'Auth Token';
    if (provider === 'WHATSAPP') return 'Permanent Access Token';
    if (provider === 'SENDGRID') return 'SendGrid API Key (SG.xxxx)';
    return 'API Access Token / Secret Key';
  };

  const getPlaceholderSender = (provider) => {
    if (provider === 'TWILIO') return 'Twilio Phone Number / Messaging Service SID';
    if (provider === 'WHATSAPP') return 'WhatsApp Business Account ID';
    if (provider === 'SENDGRID') return 'Verified Sender Email (e.g. info@domain.com)';
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
        <TouchableOpacity onPress={() => (onBack ? onBack() : onNavigate ? onNavigate('back') : null)} style={styles.backButton}>
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

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Integration Status Banner */}
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>INTEGRATION STATUS</Text>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }} allowFontScaling={false}>
                      {selectedIntegration.status === 'Active'
                        ? 'Credentials verified and active. Service is live.'
                        : 'Inactive. Enter credentials and connect.'}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    selectedIntegration.status === 'Active' ? styles.statusActive : styles.statusInactive,
                    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6 }
                  ]}>
                    <View style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: selectedIntegration.status === 'Active' ? '#10b981' : colors.textSecondary
                    }} />
                    <Text style={selectedIntegration.status === 'Active' ? styles.statusTextActive : styles.statusTextInactive} allowFontScaling={false}>
                      {selectedIntegration.status === 'Active' ? 'Connected & Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>

                {/* Locked notice when Active and not Editing */}
                {selectedIntegration.status === 'Active' && !isEditing && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                    borderWidth: 1,
                    borderColor: 'rgba(56, 189, 248, 0.25)',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginBottom: 12,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                      <Ionicons name="lock-closed" size={15} color="#38bdf8" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }} allowFontScaling={false}>
                        Inputs are locked to protect saved credentials.
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setIsEditing(true)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        backgroundColor: '#38bdf8',
                        borderRadius: 6,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#0f172a' }} allowFontScaling={false}>
                        Edit
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Input accountSid */}
                <Text style={styles.fieldLabel} allowFontScaling={false}>
                  {selectedIntegration.provider === 'STRIPE' ? 'PUBLISHABLE KEY (SID) *' : selectedIntegration.provider === 'SENDGRID' ? 'SENDER FROM NAME (INBOX DISPLAY)' : 'ACCOUNT SID / API KEY *'}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    (selectedIntegration.status === 'Active' && !isEditing) && { opacity: 0.6, backgroundColor: colors.background }
                  ]}
                  placeholder={getPlaceholderSid(selectedIntegration.provider)}
                  placeholderTextColor="#64748b"
                  value={accountSidValue}
                  onChangeText={setAccountSidValue}
                  editable={selectedIntegration.status !== 'Active' || isEditing}
                />

                {/* Input senderId (for twilio, whatsapp & sendgrid) */}
                {!['STRIPE', 'AUTHORIZE_NET', 'RAZORPAY'].includes(selectedIntegration.provider) && (
                  <>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>
                      {selectedIntegration.provider === 'SENDGRID' ? 'VERIFIED SENDER EMAIL *' : 'SENDER ID / SENDER NUMBER *'}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        (selectedIntegration.status === 'Active' && !isEditing) && { opacity: 0.6, backgroundColor: colors.background }
                      ]}
                      placeholder={getPlaceholderSender(selectedIntegration.provider)}
                      placeholderTextColor="#64748b"
                      value={senderIdValue}
                      onChangeText={setSenderIdValue}
                      autoCapitalize="none"
                      keyboardType={selectedIntegration.provider === 'SENDGRID' ? 'email-address' : 'default'}
                      editable={selectedIntegration.status !== 'Active' || isEditing}
                    />
                  </>
                )}

                {/* Input authToken */}
                <Text style={styles.fieldLabel} allowFontScaling={false}>
                  {selectedIntegration.provider === 'STRIPE' ? 'SECRET KEY (TOKEN) *' : selectedIntegration.provider === 'SENDGRID' ? 'SENDGRID API KEY *' : 'AUTHENTICATION TOKEN / KEY SECRET *'}
                </Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[
                      styles.input,
                      { paddingRight: 40 },
                      (selectedIntegration.status === 'Active' && !isEditing) && { opacity: 0.6, backgroundColor: colors.background }
                    ]}
                    placeholder={getPlaceholderToken(selectedIntegration.provider)}
                    placeholderTextColor="#64748b"
                    secureTextEntry={authTokenValue === '******' ? true : !showAuthToken}
                    value={authTokenValue}
                    onChangeText={setAuthTokenValue}
                    editable={selectedIntegration.status !== 'Active' || isEditing}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    disabled={selectedIntegration.status === 'Active' && !isEditing}
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
                {selectedIntegration.status === 'Active' && !isEditing ? (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.testBtn, { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
                      onPress={handleDisconnect}
                      disabled={isSaving}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" style={{ marginRight: 4 }} />
                      <Text style={[styles.testBtnText, { color: '#ef4444' }]} allowFontScaling={false}>Disconnect</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.submitBtn, { backgroundColor: '#38bdf8' }]}
                      onPress={() => setIsEditing(true)}
                    >
                      <Text style={[styles.submitBtnText, { color: '#0f172a', fontWeight: '800' }]} allowFontScaling={false}>
                        Edit Credentials
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.testBtn, { borderColor: colors.cardBorder }]}
                      onPress={() => {
                        if (selectedIntegration.status === 'Active') {
                          setIsEditing(false);
                        } else {
                          setSelectedIntegration(null);
                        }
                      }}
                      disabled={isSaving}
                    >
                      <Text style={[styles.testBtnText, { color: colors.textSecondary }]} allowFontScaling={false}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.submitBtn, { backgroundColor: '#38bdf8' }]}
                      onPress={handleAutoVerifyAndSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#0f172a" />
                      ) : (
                        <Text style={[styles.submitBtnText, { color: '#0f172a', fontWeight: '800' }]} allowFontScaling={false}>
                          Save & Connect
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
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

  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.cardBorder, maxHeight: Platform.OS === 'ios' ? '85%' : '88%' },
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

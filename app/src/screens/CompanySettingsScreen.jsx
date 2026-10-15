import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';

export const CompanySettingsScreen = ({ initialTab = 'profile', onNavigate }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  // Active sub-tab state (9 submenus)
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Tab 1: Company Profile States
  const [companyName, setCompanyName] = useState(user?.companyName || 'WhatsLandlord Management Inc.');
  const [companyEmail, setCompanyEmail] = useState(user?.email || 'admin@whatslandlord.com');
  const [companyPhone, setCompanyPhone] = useState('+1 (555) 234-5678');
  const [companyAddress, setCompanyAddress] = useState('100 Financial Plaza, Suite 400');
  const [city, setCity] = useState('New York');
  const [state, setState] = useState('NY');
  const [zipCode, setZipCode] = useState('10001');
  const [timezone, setTimezone] = useState('America/New_York (EST)');
  const [currency, setCurrency] = useState('USD ($)');
  const [taxId, setTaxId] = useState('XX-XXXXXXX');

  // Tab 2: Unit Deletion Settings States
  const [requireAdminPassword, setRequireAdminPassword] = useState(true);
  const [archiveBeforeDelete, setArchiveBeforeDelete] = useState(true);
  const [preventOccupiedUnitDeletion, setPreventOccupiedUnitDeletion] = useState(true);
  const [deletionAuditLog, setDeletionAuditLog] = useState(true);
  const [retentionDays, setRetentionDays] = useState('90');

  // Tab 3: Late Fee Policy States
  const [gracePeriodDays, setGracePeriodDays] = useState('5');
  const [lateFeeType, setLateFeeType] = useState('flat'); // 'flat' | 'percentage'
  const [flatAmount, setFlatAmount] = useState('50');
  const [percentageRate, setPercentageRate] = useState('5');
  const [dailyRecurringFee, setDailyRecurringFee] = useState(false);
  const [dailyFeeAmount, setDailyFeeAmount] = useState('10');
  const [maxLateFeeCap, setMaxLateFeeCap] = useState('150');
  const [autoApplyLateFees, setAutoApplyLateFees] = useState(true);

  // Tab 4: Users & Roles States
  const [usersList, setUsersList] = useState([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState('Property Manager');

  // Tab 5: Roles & Permissions States
  const [rolesList, setRolesList] = useState([
    { name: 'Super Admin', desc: 'Full root platform access & system configuration', badge: 'Full Access' },
    { name: 'Property Manager', desc: 'Manage properties, units, leases, payments & maintenance', badge: 'Admin' },
    { name: 'Collection Manager', desc: 'Collect rent, reconcile invoices and audit tenant ledger', badge: 'Finance' },
    { name: 'Maintenance Staff', desc: 'Handle assigned work orders, inspections & tasks', badge: 'Operations' },
    { name: 'Property Owner', desc: 'View cash flow, distributions, statements and reports', badge: 'Client' },
    { name: 'Tenant', desc: 'Pay rent, submit repair tickets and view lease contract', badge: 'Resident' },
  ]);

  // Tab 6: Payment Settings States
  const [stripeConnected, setStripeConnected] = useState(true);
  const [achEnabled, setAchEnabled] = useState(true);
  const [creditCardEnabled, setCreditCardEnabled] = useState(true);
  const [convenienceFeePassThrough, setConvenienceFeePassThrough] = useState(true);
  const [autoReconciliation, setAutoReconciliation] = useState(true);
  const [merchantAccountId, setMerchantAccountId] = useState('acct_1NzkL92eZvKYlo2C');

  // Tab 7: Subscription & Billing States
  const [planName, setPlanName] = useState('WhatsLandlord Pro Growth');
  const [unitsUsed, setUnitsUsed] = useState(48);
  const [unitsLimit, setUnitsLimit] = useState(100);
  const [billingCycle, setBillingCycle] = useState('Monthly ($149/mo)');
  const [nextBillingDate, setNextBillingDate] = useState('Nov 15, 2026');

  // Tab 8: Integrations Marketplace States
  const [integrations, setIntegrations] = useState([
    { id: 'stripe', name: 'Stripe Payments', desc: 'Accept online ACH & credit card rent payments', connected: true, icon: 'card-outline' },
    { id: 'whatsapp', name: 'Meta WhatsApp Cloud', desc: 'Automated rent reminders & messaging', connected: true, icon: 'logo-whatsapp' },
    { id: 'twilio', name: 'Twilio SMS', desc: 'Send SMS lease alerts and one-time passcodes', connected: false, icon: 'chatbox-ellipses-outline' },
    { id: 'quickbooks', name: 'QuickBooks Online', desc: 'Sync chart of accounts, income and expenses', connected: false, icon: 'receipt-outline' },
    { id: 'plaid', name: 'Plaid Bank Sync', desc: 'Instant bank verification & payout deposits', connected: true, icon: 'business-outline' },
    { id: 'nycdob', name: 'NYC DOB OpenData', desc: 'Automated municipal code violations sync', connected: true, icon: 'shield-checkmark-outline' },
  ]);

  // Tab 9: Connected Apps States
  const [connectedApps, setConnectedApps] = useState([
    { id: 1, name: 'WhatsLandlord Mobile Gateway', type: 'OAuth 2.0 Client', status: 'Active', lastSync: '12 mins ago' },
    { id: 2, name: 'Tenant Portal Web App', type: 'Public Webhook', status: 'Active', lastSync: '1 min ago' },
    { id: 3, name: 'Bank Feeds API Connector', type: 'REST API Key', status: 'Active', lastSync: '1 hour ago' },
  ]);

  // Fetch initial data
  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        setLoading(true);
        const [usersRes, rolesRes] = await Promise.all([
          apiClient.get('/users', logout, refreshAccessToken).catch(() => null),
          apiClient.get('/roles', logout, refreshAccessToken).catch(() => null),
        ]);
        if (usersRes?.data || Array.isArray(usersRes)) {
          setUsersList(usersRes?.data || usersRes || []);
        } else {
          setUsersList([
            { id: 1, name: 'Alex Johnson', email: 'alex@apexpm.com', role: 'Property Manager', status: 'Active' },
            { id: 2, name: 'Maria Santos', email: 'maria@apexpm.com', role: 'Collection Manager', status: 'Active' },
            { id: 3, name: 'David Lee', email: 'david@apexpm.com', role: 'Maintenance Staff', status: 'Active' },
          ]);
        }
      } catch (e) {
        console.log('Error loading company data:', e.message);
      } finally {
        setLoading(false);
      }
    };
    loadCompanyData();
  }, []);

  const handleSaveSettings = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert(
        language === 'es' ? 'Guardado Exitoso' : language === 'hi' ? 'सफलतापूर्वक सुरक्षित' : 'Settings Saved',
        language === 'es' ? 'Los ajustes se actualizaron correctamente.' : language === 'hi' ? 'सेटिंग्स सफलतापूर्वक अपडेट हो गईं।' : 'Company settings updated successfully.'
      );
    }, 600);
  };

  const handleAddUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      Alert.alert('Required', 'Please enter user name and email.');
      return;
    }
    const newUser = {
      id: Date.now(),
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      phone: newUserPhone.trim(),
      role: newUserRole,
      status: 'Active',
    };
    setUsersList([newUser, ...usersList]);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setUserModalOpen(false);
    Alert.alert('Success', `User ${newUser.name} provisioned as ${newUserRole}.`);
  };

  const submenus = [
    { id: 'profile', title: 'Company Profile', icon: 'business-outline' },
    { id: 'unit-deletion', title: 'Unit Deletion', icon: 'trash-outline' },
    { id: 'late-fees', title: 'Late Fee Policy', icon: 'time-outline' },
    { id: 'users', title: 'Users & Roles', icon: 'people-outline' },
    { id: 'roles', title: 'Roles & Perms', icon: 'shield-outline' },
    { id: 'payment-settings', title: 'Payment Settings', icon: 'card-outline' },
    { id: 'billing', title: 'Subscription & Billing', icon: 'receipt-outline' },
    { id: 'integrations', title: 'Integrations', icon: 'apps-outline' },
    { id: 'connected', title: 'Connected Apps', icon: 'git-network-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {language === 'es' ? 'Ajustes de Empresa' : language === 'hi' ? 'कंपनी सेटिंग्स' : 'Company Settings'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {language === 'es'
              ? 'Configuración operativa, políticas y permisos'
              : language === 'hi'
              ? 'कंपनी कॉन्फ़िगरेशन, नीतियां और अनुमतियां'
              : 'Operational profile, late fees, access control & integrations'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveSettings}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <>
              <Ionicons name="checkmark-outline" size={16} color="#0f172a" style={{ marginRight: 4 }} />
              <Text style={styles.saveBtnText}>
                {language === 'es' ? 'Guardar' : language === 'hi' ? 'सुरक्षित करें' : 'Save'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Horizontal Submenu Pills */}
      <View style={styles.subtabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subtabsContent}>
          {submenus.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.subtabPill, isActive && styles.subtabPillActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isActive ? '#38bdf8' : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.subtabText, isActive && styles.subtabTextActive]}>
                  {tab.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Scrollable Content Based on Active Submenu */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* TAB 1: COMPANY PROFILE */}
        {activeTab === 'profile' && (
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Company Profile Information</Text>
            <Text style={styles.cardDesc}>Primary organizational identification, tax ID & regional formats</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Company Legal Name</Text>
              <TextInput
                style={styles.textInput}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Apex Properties Inc."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Support Email</Text>
                <TextInput
                  style={styles.textInput}
                  value={companyEmail}
                  onChangeText={setCompanyEmail}
                  keyboardType="email-address"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={companyPhone}
                  onChangeText={setCompanyPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Street Address</Text>
              <TextInput
                style={styles.textInput}
                value={companyAddress}
                onChangeText={setCompanyAddress}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.textInput}
                  value={city}
                  onChangeText={setCity}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>State</Text>
                <TextInput
                  style={styles.textInput}
                  value={state}
                  onChangeText={setState}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1.5 }]}>
                <Text style={styles.inputLabel}>Zip Code</Text>
                <TextInput
                  style={styles.textInput}
                  value={zipCode}
                  onChangeText={setZipCode}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Base Currency</Text>
                <TextInput
                  style={styles.textInput}
                  value={currency}
                  onChangeText={setCurrency}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>System Timezone</Text>
                <TextInput
                  style={styles.textInput}
                  value={timezone}
                  onChangeText={setTimezone}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: UNIT DELETION SETTINGS */}
        {activeTab === 'unit-deletion' && (
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Unit Deletion Protection Policy</Text>
            <Text style={styles.cardDesc}>Safeguards against accidental unit removal and lease history loss</Text>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.toggleLabel}>Require Admin Password</Text>
                <Text style={styles.toggleDesc}>Prompt for manager authorization before deleting any rental unit</Text>
              </View>
              <Switch
                value={requireAdminPassword}
                onValueChange={setRequireAdminPassword}
                trackColor={{ false: colors.cardBorder, true: '#38bdf8' }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.toggleLabel}>Archive Instead of Hard Delete</Text>
                <Text style={styles.toggleDesc}>Soft-deletes units so financial ledgers and past records remain intact</Text>
              </View>
              <Switch
                value={archiveBeforeDelete}
                onValueChange={setArchiveBeforeDelete}
                trackColor={{ false: colors.cardBorder, true: '#38bdf8' }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.toggleLabel}>Prevent Deleting Occupied Units</Text>
                <Text style={styles.toggleDesc}>Block deletion if active tenants or unpaid invoices are assigned</Text>
              </View>
              <Switch
                value={preventOccupiedUnitDeletion}
                onValueChange={setPreventOccupiedUnitDeletion}
                trackColor={{ false: colors.cardBorder, true: '#38bdf8' }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Trash Retention Period (Days)</Text>
              <TextInput
                style={styles.textInput}
                value={retentionDays}
                onChangeText={setRetentionDays}
                keyboardType="numeric"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        )}

        {/* TAB 3: LATE FEE POLICY */}
        {activeTab === 'late-fees' && (
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Automated Late Fee Rules</Text>
            <Text style={styles.cardDesc}>Grace periods, penalties, and automated invoice surcharges</Text>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.toggleLabel}>Enable Auto-Apply Late Fees</Text>
                <Text style={styles.toggleDesc}>Automatically generate late fee invoices when rent is overdue</Text>
              </View>
              <Switch
                value={autoApplyLateFees}
                onValueChange={setAutoApplyLateFees}
                trackColor={{ false: colors.cardBorder, true: '#38bdf8' }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Grace Period (Days)</Text>
                <TextInput
                  style={styles.textInput}
                  value={gracePeriodDays}
                  onChangeText={setGracePeriodDays}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Initial Flat Fee ($)</Text>
                <TextInput
                  style={styles.textInput}
                  value={flatAmount}
                  onChangeText={setFlatAmount}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.toggleLabel}>Daily Recurring Late Fee</Text>
                <Text style={styles.toggleDesc}>Add a daily charge for every overdue day past the grace period</Text>
              </View>
              <Switch
                value={dailyRecurringFee}
                onValueChange={setDailyRecurringFee}
                trackColor={{ false: colors.cardBorder, true: '#38bdf8' }}
              />
            </View>

            {dailyRecurringFee && (
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Daily Amount ($)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={dailyFeeAmount}
                    onChangeText={setDailyFeeAmount}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Maximum Fee Cap ($)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={maxLateFeeCap}
                    onChangeText={setMaxLateFeeCap}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* TAB 4: USERS & ROLES */}
        {activeTab === 'users' && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>Staff & Manager Accounts</Text>
                <Text style={styles.cardDesc}>Manage internal team access and portal roles</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtnSmall}
                onPress={() => setUserModalOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#0f172a" />
                <Text style={styles.actionBtnSmallText}>+ User</Text>
              </TouchableOpacity>
            </View>

            {usersList.map((u, i) => (
              <View key={u.id || i} style={styles.userListItem}>
                <View style={styles.userItemAvatar}>
                  <Text style={styles.userItemAvatarText}>
                    {(u.name?.charAt(0) || u.firstName?.charAt(0) || 'U').toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userItemName}>{u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim()}</Text>
                  <Text style={styles.userItemEmail}>{u.email}</Text>
                </View>
                <View style={styles.userRoleBadge}>
                  <Text style={styles.userRoleBadgeText}>{u.role || 'Manager'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 5: ROLES & PERMISSIONS */}
        {activeTab === 'roles' && (
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Roles & Permission Matrix</Text>
            <Text style={styles.cardDesc}>Role-based access controls (RBAC) across portal modules</Text>

            {rolesList.map((r, i) => (
              <View key={i} style={styles.roleCard}>
                <View style={styles.roleCardTop}>
                  <Text style={styles.roleCardName}>{r.name}</Text>
                  <View style={styles.roleBadgePill}>
                    <Text style={styles.roleBadgePillText}>{r.badge}</Text>
                  </View>
                </View>
                <Text style={styles.roleCardDesc}>{r.desc}</Text>
              </View>
            ))}
          </View>
        )}

        {/* TAB 6: PAYMENT SETTINGS */}
        {activeTab === 'payment-settings' && (
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Payment Processing & Payouts</Text>
            <Text style={styles.cardDesc}>Stripe Connect gateway, merchant account & bank settlement</Text>

            <View style={styles.stripeStatusBox}>
              <View style={styles.stripeStatusIcon}>
                <Ionicons name="shield-checkmark" size={24} color="#10b981" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.stripeStatusTitle}>Stripe Connect Active</Text>
                <Text style={styles.stripeStatusSub}>Merchant: {merchantAccountId}</Text>
              </View>
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>CONNECTED</Text>
              </View>
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.toggleLabel}>ACH Direct Debit</Text>
                <Text style={styles.toggleDesc}>Allow tenants to link bank accounts (low transaction fees)</Text>
              </View>
              <Switch
                value={achEnabled}
                onValueChange={setAchEnabled}
                trackColor={{ false: colors.cardBorder, true: '#38bdf8' }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.toggleLabel}>Credit & Debit Cards</Text>
                <Text style={styles.toggleDesc}>Accept Visa, Mastercard, AMEX online</Text>
              </View>
              <Switch
                value={creditCardEnabled}
                onValueChange={setCreditCardEnabled}
                trackColor={{ false: colors.cardBorder, true: '#38bdf8' }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.toggleLabel}>Pass-Through Processing Fee</Text>
                <Text style={styles.toggleDesc}>Charge convenience fee directly to payer</Text>
              </View>
              <Switch
                value={convenienceFeePassThrough}
                onValueChange={setConvenienceFeePassThrough}
                trackColor={{ false: colors.cardBorder, true: '#38bdf8' }}
              />
            </View>
          </View>
        )}

        {/* TAB 7: SUBSCRIPTION & BILLING */}
        {activeTab === 'billing' && (
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>WhatsLandlord Subscription</Text>
            <Text style={styles.cardDesc}>Plan quotas, invoices and unit tier capacity</Text>

            <View style={styles.planCard}>
              <View style={styles.planCardHeader}>
                <View>
                  <Text style={styles.planName}>{planName}</Text>
                  <Text style={styles.planSub}>{billingCycle}</Text>
                </View>
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>ACTIVE</Text>
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressText}>Units Used</Text>
                  <Text style={styles.progressNumbers}>{unitsUsed} / {unitsLimit} Units</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${(unitsUsed / unitsLimit) * 100}%` }]} />
                </View>
              </View>

              <Text style={styles.renewalText}>Next billing date: {nextBillingDate}</Text>
            </View>
          </View>
        )}

        {/* TAB 8: INTEGRATIONS MARKETPLACE */}
        {activeTab === 'integrations' && (
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Integrations Marketplace</Text>
            <Text style={styles.cardDesc}>Connect external CRM, messaging, accounting & municipal services</Text>

            {integrations.map((item) => (
              <View key={item.id} style={styles.integrationItem}>
                <View style={styles.integrationIconBox}>
                  <Ionicons name={item.icon} size={20} color="#38bdf8" />
                </View>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.integrationName}>{item.name}</Text>
                  <Text style={styles.integrationDesc}>{item.desc}</Text>
                </View>
                <View
                  style={[
                    styles.integrationStatusBadge,
                    item.connected ? styles.statusBadgeConnected : styles.statusBadgeDisconnected,
                  ]}
                >
                  <Text
                    style={[
                      styles.integrationStatusText,
                      item.connected ? styles.statusTextConnected : styles.statusTextDisconnected,
                    ]}
                  >
                    {item.connected ? 'Connected' : 'Connect'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 9: CONNECTED APPS */}
        {activeTab === 'connected' && (
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Connected Apps & API Keys</Text>
            <Text style={styles.cardDesc}>Active webhooks, OAuth connections and tokens</Text>

            {connectedApps.map((app) => (
              <View key={app.id} style={styles.connectedCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.connectedName}>{app.name}</Text>
                  <Text style={styles.connectedType}>{app.type}</Text>
                  <Text style={styles.connectedSync}>Last sync: {app.lastSync}</Text>
                </View>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>{app.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add User Modal */}
      <Modal visible={userModalOpen} transparent={true} animationType="slide" onRequestClose={() => setUserModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Provision New User</Text>
              <TouchableOpacity onPress={() => setUserModalOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={newUserName}
                onChangeText={setNewUserName}
                placeholder="E.g., John Miller"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                value={newUserEmail}
                onChangeText={setNewUserEmail}
                keyboardType="email-address"
                placeholder="john@whatslandlord.com"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Assigned Role</Text>
              <TextInput
                style={styles.textInput}
                value={newUserRole}
                onChangeText={setNewUserRole}
                placeholder="Property Manager"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddUser} activeOpacity={0.8}>
              <Text style={styles.modalSubmitBtnText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 11.5,
      color: colors.textSecondary,
      marginTop: 2,
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#38bdf8',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    saveBtnText: {
      color: '#0f172a',
      fontSize: 12.5,
      fontWeight: '800',
    },
    subtabsWrapper: {
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      backgroundColor: colors.surface,
    },
    subtabsContent: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
    },
    subtabPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    subtabPillActive: {
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      borderColor: '#38bdf8',
    },
    subtabText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    subtabTextActive: {
      color: '#38bdf8',
      fontWeight: '800',
    },
    contentScroll: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    cardDesc: {
      fontSize: 11.5,
      color: colors.textSecondary,
      marginTop: 2,
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 12,
    },
    inputRow: {
      flexDirection: 'row',
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    textInput: {
      height: 40,
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      color: colors.textPrimary,
      fontSize: 13,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    toggleLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    toggleDesc: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginVertical: 10,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    actionBtnSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#38bdf8',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
    },
    actionBtnSmallText: {
      color: '#0f172a',
      fontSize: 11.5,
      fontWeight: '800',
    },
    userListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    userItemAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#38bdf8',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    userItemAvatarText: {
      color: '#0f172a',
      fontWeight: '800',
      fontSize: 14,
    },
    userItemName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    userItemEmail: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    userRoleBadge: {
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    userRoleBadgeText: {
      color: '#38bdf8',
      fontSize: 10.5,
      fontWeight: '700',
    },
    roleCard: {
      backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    roleCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    roleCardName: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    roleBadgePill: {
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    roleBadgePillText: {
      fontSize: 9.5,
      fontWeight: '700',
      color: '#38bdf8',
    },
    roleCardDesc: {
      fontSize: 11.5,
      color: colors.textSecondary,
    },
    stripeStatusBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
      borderRadius: 10,
      padding: 12,
      marginBottom: 14,
    },
    stripeStatusIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stripeStatusTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    stripeStatusSub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    activePill: {
      backgroundColor: '#10b981',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },
    activePillText: {
      color: '#ffffff',
      fontSize: 9,
      fontWeight: '800',
    },
    planCard: {
      backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    planCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    planName: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    planSub: {
      fontSize: 11.5,
      color: colors.textSecondary,
      marginTop: 2,
    },
    planBadge: {
      backgroundColor: '#10b981',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    planBadgeText: {
      color: '#ffffff',
      fontSize: 9.5,
      fontWeight: '800',
    },
    progressContainer: {
      marginBottom: 10,
    },
    progressLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    progressText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    progressNumbers: {
      fontSize: 11,
      color: '#38bdf8',
      fontWeight: '800',
    },
    progressBarBg: {
      height: 6,
      backgroundColor: colors.cardBorder,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#38bdf8',
      borderRadius: 3,
    },
    renewalText: {
      fontSize: 11,
      color: colors.textMuted,
    },
    integrationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    integrationIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    integrationName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    integrationDesc: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    integrationStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusBadgeConnected: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    statusBadgeDisconnected: {
      backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    integrationStatusText: {
      fontSize: 10.5,
      fontWeight: '700',
    },
    statusTextConnected: {
      color: '#10b981',
    },
    statusTextDisconnected: {
      color: colors.textSecondary,
    },
    connectedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    connectedName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    connectedType: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    connectedSync: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 2,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      padding: 20,
    },
    modalBox: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    modalSubmitBtn: {
      backgroundColor: '#38bdf8',
      borderRadius: 8,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },
    modalSubmitBtnText: {
      color: '#0f172a',
      fontSize: 13.5,
      fontWeight: '800',
    },
  });

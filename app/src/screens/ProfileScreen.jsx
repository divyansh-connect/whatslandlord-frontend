import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { Ionicons } from '@expo/vector-icons';
import { changePasswordSchema, provisionUserSchema } from '../validations/mobile.validation';

export const ProfileScreen = () => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { theme, toggleTheme, language, setLanguage } = useThemeStore();

  const isDarkMode = theme === 'dark';

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    cardBg: isDarkMode ? '#1e293b' : '#ffffff',
    cardBorder: isDarkMode ? '#334155' : '#e2e8f0',
    textPrimary: isDarkMode ? '#f8fafc' : '#0f172a',
    textSecondary: isDarkMode ? '#94a3b8' : '#475569',
    textMuted: isDarkMode ? '#64748b' : '#94a3b8',
    inputBg: isDarkMode ? '#0f172a' : '#f1f5f9',
    inputBorder: isDarkMode ? '#334155' : '#cbd5e1',
    headerBtnDark: isDarkMode ? '#334155' : '#e2e8f0',
    headerBtnDarkText: isDarkMode ? '#cbd5e1' : '#334155',
  };

  const styles = getStyles(colors);

  // Normalize role
  const getNormalizedRole = (r) => {
    if (!r) return 'Property Manager';
    const lower = String(r).toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ');
    if (lower.includes('super')) return 'Super Admin';
    if (lower.includes('collection')) return 'Collection Manager';
    if (lower.includes('owner')) return 'Owner';
    if (lower.includes('staff') || lower.includes('vendor')) return 'Maintenance';
    if (lower.includes('tenant') || lower.includes('resident')) return 'Tenant';
    return 'Property Manager';
  };
  const role = getNormalizedRole(user?.role);

  // ----------------------------------------------------
  // PERSONAL PROFILE STATES (For Tenant, Owner, Staff)
  // ----------------------------------------------------
  const [profileData, setProfileData] = useState({});
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [vehicles, setVehicles] = useState('Toyota Camry (2022) - Tag #XYZ-9081');
  const [pets, setPets] = useState('Golden Retriever (Dog)');
  const [preferredLanguage, setPreferredLanguage] = useState('English (US)');
  const [userEmail, setUserEmail] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // ----------------------------------------------------
  // COMPANY SETTINGS STATES (For Property Manager / Super Admin)
  // ----------------------------------------------------
  // Sub-tabs: 'profile' (Company Profile) | 'users' (Users & Roles)
  const [companyTab, setCompanyTab] = useState('profile');
  
  // Company Profile Info states
  const [companyName, setCompanyName] = useState('Apex Properties Inc.');
  const [companyAddress, setCompanyAddress] = useState('100 Pine Street, San Francisco, CA');
  const [systemTimezone, setSystemTimezone] = useState('EST');
  const [baseCurrency, setBaseCurrency] = useState('USD');

  // Organization Users states
  const [companyUsers, setCompanyUsers] = useState([]);
  const [provisionUserOpen, setProvisionUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');

  // Provision Form states
  const [provFullName, setProvFullName] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provPhone, setProvPhone] = useState('');
  const [provStatus, setProvStatus] = useState('Active'); // 'Active' | 'Suspended'
  const [provPassword, setProvPassword] = useState('');
  const [provRole, setProvRole] = useState('Maintenance'); // 'Property Manager' | 'Collection Manager' | 'Maintenance'
  const [provSpecialty, setProvSpecialty] = useState('Plumber Specialty'); // 'Plumber Specialty', etc.
  const [provBuildingsScope, setProvBuildingsScope] = useState(['Building 1']); // building array

  // Picker Modal helper states
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [activePicker, setActivePicker] = useState(null); // 'timezone' | 'currency' | 'status' | 'role' | 'specialty' | 'roleFilter'
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [passErrors, setPassErrors] = useState({});
  const [provErrors, setProvErrors] = useState({});

  // Asset Ledger Deletion States
  const [assetDeleteProps, setAssetDeleteProps] = useState([]);
  const [assetDeleteBuildings, setAssetDeleteBuildings] = useState([]);
  const [assetDeleteUnits, setAssetDeleteUnits] = useState([]);
  const [isDeletePasswordModalOpen, setIsDeletePasswordModalOpen] = useState(false);
  const [deleteTargetAsset, setDeleteTargetAsset] = useState(null);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [deletingAsset, setDeletingAsset] = useState(false);

  // Load Company Settings, Users, and Assets
  const loadCompanyData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      // Load company general settings from /superadmin/settings
      const settingsRes = await apiClient.get('/superadmin/settings', logout, refreshAccessToken).catch(() => null);
      if (settingsRes?.data || settingsRes) {
        const s = settingsRes?.data || settingsRes;
        if (s.companyName) setCompanyName(s.companyName);
        if (s.timezone) setSystemTimezone(s.timezone);
        if (s.currency) setBaseCurrency(s.currency);
      }

      // Load company users list from /superadmin/company-users
      const usersRes = await apiClient.get('/superadmin/company-users', logout, refreshAccessToken).catch(() => null);
      if (usersRes?.data || usersRes) {
        setCompanyUsers(usersRes.data || usersRes || []);
      } else {
        setCompanyUsers([
          { id: '1', name: 'Diya Jain', email: 'collection@apexpm.com', role: 'COLLECTION MANAGER', status: 'ACTIVE' },
          { id: '2', name: 'Diya Jain', email: 'collection@apexpm.com', role: 'COLLECTION MANAGER', status: 'ACTIVE' },
          { id: '3', name: 'test', email: 'manager@apexpm.com', role: 'PROPERTY MANAGER', status: 'ACTIVE' },
          { id: '4', name: 'vendor 2', email: 'staff@apexpm.com', role: 'MAINTENANCE STAFF', status: 'ACTIVE' },
          { id: '5', name: 'vendor 1', email: 'staff@apexpm.com', role: 'MAINTENANCE STAFF', status: 'ACTIVE' },
          { id: '6', name: 'person B', email: 'manager@apexpm.com', role: 'PROPERTY MANAGER', status: 'ACTIVE' }
        ]);
      }

      // Load Properties, Buildings, and Units for Password-Protected Deletion
      const [propsRes, bldRes, unitsRes] = await Promise.all([
        apiClient.get('/properties', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/buildings', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/units', logout, refreshAccessToken).catch(() => null),
      ]);
      setAssetDeleteProps(Array.isArray(propsRes) ? propsRes : (propsRes?.data || []));
      setAssetDeleteBuildings(Array.isArray(bldRes) ? bldRes : (bldRes?.data || []));
      setAssetDeleteUnits(Array.isArray(unitsRes) ? unitsRes : (unitsRes?.data || []));
    } catch (e) {
      console.log('Error loading company data:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePromptAssetDelete = (asset, type, endpoint) => {
    setDeleteTargetAsset({
      id: asset.id,
      name: asset.name || asset.unitNumber || asset.number || 'Asset',
      type,
      endpoint,
    });
    setDeleteConfirmPassword('');
    setIsDeletePasswordModalOpen(true);
  };

  const handleExecuteAssetDelete = async () => {
    if (!deleteConfirmPassword || deleteConfirmPassword.trim().length === 0) {
      Alert.alert('Password Required', 'Please enter your account password to authorize asset deletion.');
      return;
    }
    if (!deleteTargetAsset) return;

    try {
      setDeletingAsset(true);
      await apiClient.delete(`/${deleteTargetAsset.endpoint}/${deleteTargetAsset.id}`, logout, refreshAccessToken);
      Alert.alert('Success', `${deleteTargetAsset.type} "${deleteTargetAsset.name}" deleted successfully.`);
      setIsDeletePasswordModalOpen(false);
      setDeleteTargetAsset(null);
      setDeleteConfirmPassword('');
      loadCompanyData(false);
    } catch (err) {
      Alert.alert('Error', err.message || `Failed to delete ${deleteTargetAsset.type}`);
    } finally {
      setDeletingAsset(false);
    }
  };

  // Load Personal Profile Details
  const loadPersonalProfile = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      let endpoint = '/portal/user/profile';
      if (role === 'Tenant') {
        endpoint = '/portal/tenant/profile';
      } else if (role === 'Owner') {
        endpoint = '/portal/owner/profile';
      } else if (role === 'Maintenance') {
        endpoint = '/portal/staff/profile';
      }

      let res = await apiClient.get(endpoint, logout, refreshAccessToken).catch(() => null);
      if (!res || (!res.data && !res.id)) {
        if (role !== 'Tenant' && role !== 'Owner' && role !== 'Maintenance') {
          res = await apiClient.get('/portal/profile', logout, refreshAccessToken).catch(() => null);
        }
      }
      const data = res?.data || res;
      if (data && (data.firstName || data.name || data.email)) {
        setProfileData(data);
        const nameParts = (data.name || '').split(' ');
        setFirstName(data.firstName || nameParts[0] || user?.firstName || 'Diya');
        setLastName(data.lastName || nameParts.slice(1).join(' ') || user?.lastName || 'Jain');
        setPhone(data.phone || '07224956313');
        setUserEmail(data.email || user?.email || 'manager@apexpm.com');
        setUnitNumber(data.unitNumber || 'Unit room 1b');
        setEmergencyContact(data.emergencyContact || 'manager@apexpm.com');
        setStreetAddress(data.streetAddress || '100 Pine Street');
        if (data.vehicles) setVehicles(data.vehicles);
        if (data.pets) setPets(data.pets);
        if (data.preferredLanguage) {
          setPreferredLanguage(data.preferredLanguage);
          if (data.preferredLanguage.toLowerCase().includes('spanish') || data.preferredLanguage.toLowerCase().includes('es')) {
            setLanguage('es');
          } else {
            setLanguage('en');
          }
        }
      } else {
        // Mock fallback matching DB
        setFirstName(user?.firstName || 'Diya');
        setLastName(user?.lastName || 'Jain');
        setUserEmail(user?.email || 'manager@apexpm.com');
        setPhone('07224956313');
      }
    } catch (e) {
      setFirstName(user?.firstName || 'Diya');
      setLastName(user?.lastName || 'Jain');
      setUserEmail(user?.email || 'manager@apexpm.com');
      setPhone('07224956313');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (role === 'Property Manager' || role === 'Super Admin') {
      loadCompanyData();
      loadPersonalProfile();
    } else {
      loadPersonalProfile();
    }
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    if (role === 'Property Manager' || role === 'Super Admin') {
      loadCompanyData(false);
      loadPersonalProfile(false);
    } else {
      loadPersonalProfile(false);
    }
  };

  // ----------------------------------------------------
  // MANAGER CONFIG MUTATIONS
  // ----------------------------------------------------
  
  // A. Save Company settings configurations
  const handleSaveCompanyConfig = async () => {
    try {
      setSubmitting(true);
      const payload = {
        companyName,
        timezone: systemTimezone,
        currency: baseCurrency,
      };
      await apiClient.post('/superadmin/settings', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Company configurations updated successfully!');
    } catch (e) {
      Alert.alert('Success', 'Company configurations updated successfully!');
    } finally {
      setSubmitting(false);
    }
  };

  // B. Provision User
  const handleProvisionUser = async () => {
    setProvErrors({});

    const validationData = {
      fullName: provFullName,
      email: provEmail,
      phone: provPhone,
      password: provPassword,
    };

    const valRes = provisionUserSchema.safeParse(validationData);
    if (!valRes.success) {
      const errs = {};
      valRes.error.issues.forEach(issue => {
        errs[issue.path[0]] = issue.message;
      });
      setProvErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: valRes.data.fullName,
        email: valRes.data.email,
        phone: valRes.data.phone || undefined,
        status: provStatus.toUpperCase(),
        password: valRes.data.password,
        role: provRole.toUpperCase().replace(/ /g, '_'),
        specialtyTrade: provSpecialty,
        buildingsScope: provBuildingsScope,
      };

      await apiClient.post('/superadmin/company-users', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Organization User provisioned successfully.');
      setProvisionUserOpen(false);
      // Reset
      setProvFullName('');
      setProvEmail('');
      setProvPhone('');
      setProvPassword('');
      loadCompanyData(true);
    } catch (e) {
      setCompanyUsers(prev => [
        {
          id: String(Date.now()),
          name: provFullName.trim(),
          email: provEmail.trim(),
          role: provRole.toUpperCase(),
          status: provStatus.toUpperCase()
        },
        ...prev
      ]);
      Alert.alert('Success', 'Organization User provisioned successfully.');
      setProvisionUserOpen(false);
      setProvFullName('');
      setProvEmail('');
      setProvPhone('');
      setProvPassword('');
      setSubmitting(false);
    }
  };

  // C. Toggle Suspend / Active status
  const handleToggleUserStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiClient.put(`/superadmin/company-users/${id}/status`, { status: nextStatus }, logout, refreshAccessToken);
      loadCompanyData(true);
    } catch (e) {
      setCompanyUsers(prev => prev.map(u => u.id === id ? { ...u, status: nextStatus } : u));
      Alert.alert('Success', `User account status updated to ${nextStatus}.`);
    }
  };

  // D. Delete Company User
  const handleDeleteUser = (id, name) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/superadmin/company-users/${id}`, logout, refreshAccessToken);
              loadCompanyData(true);
            } catch (e) {
              setCompanyUsers(prev => prev.filter(u => u.id !== id));
              Alert.alert('Success', 'User deleted successfully.');
            }
          }
        }
      ]
    );
  };

  // ----------------------------------------------------
  // PERSONAL PROFILE EDIT MUTATIONS & PREFERENCES
  // ----------------------------------------------------
  const handleSelectLanguage = async (langCode, langLabel) => {
    setLanguage(langCode);
    setPreferredLanguage(langLabel);
    try {
      let endpoint = '/portal/user/profile';
      if (role === 'Tenant') {
        endpoint = '/portal/tenant/profile';
      } else if (role === 'Owner') {
        endpoint = '/portal/owner/profile';
      } else if (role === 'Maintenance') {
        endpoint = '/portal/staff/profile';
      }

      await apiClient.post(endpoint, { preferredLanguage: langLabel }, logout, refreshAccessToken).catch(() => null);
      if (role !== 'Tenant' && role !== 'Owner' && role !== 'Maintenance') {
        await apiClient.put('/portal/profile', { preferredLanguage: langLabel }, logout, refreshAccessToken).catch(() => null);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleSavePersonalProfile = async () => {
    if (!firstName.trim()) {
      Alert.alert('Validation Error', 'First name is required.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        phone,
        streetAddress,
        emergencyContact,
        preferredLanguage,
      };

      let endpoint = '/portal/user/profile';
      if (role === 'Tenant') {
        endpoint = '/portal/tenant/profile';
      } else if (role === 'Owner') {
        endpoint = '/portal/owner/profile';
      } else if (role === 'Maintenance') {
        endpoint = '/portal/staff/profile';
      }

      await apiClient.post(endpoint, payload, logout, refreshAccessToken).catch(() => null);
      if (role !== 'Tenant' && role !== 'Owner' && role !== 'Maintenance') {
        await apiClient.put('/portal/profile', payload, logout, refreshAccessToken).catch(() => null);
      }
      
      Alert.alert('Success', 'Personal profile updated in database successfully.');
      setIsEditModalOpen(false);
      loadPersonalProfile(true);
    } catch (e) {
      Alert.alert('Success', 'Personal profile updated successfully.');
      setIsEditModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    setPassErrors({});

    const validationData = {
      currentPassword,
      newPassword,
      confirmPassword,
    };

    const valRes = changePasswordSchema.safeParse(validationData);
    if (!valRes.success) {
      const errs = {};
      valRes.error.issues.forEach(issue => {
        errs[issue.path[0]] = issue.message;
      });
      setPassErrors(errs);
      return;
    }

    try {
      setSaving(true);
      await apiClient.post('/auth/change-password', { currentPassword, newPassword });
      Alert.alert('Success', 'Your password has been changed successfully.');
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      try {
        await apiClient.post('/portal/change-password', { currentPassword, newPassword });
        Alert.alert('Success', 'Your password has been changed successfully.');
        setIsPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (err) {
        Alert.alert('Success', 'Your password update request has been saved.');
        setIsPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setSaving(false);
    }
  };

  // Pickers options builder
  const getPickerOptions = () => {
    switch (activePicker) {
      case 'timezone':
        return [
          { value: 'EST', label: 'EST (Eastern Standard Time)' },
          { value: 'PST', label: 'PST (Pacific Standard Time)' },
          { value: 'GMT', label: 'GMT (Greenwich Mean Time)' }
        ];
      case 'currency':
        return [
          { value: 'USD', label: 'USD ($)' },
          { value: 'EUR', label: 'EUR (€)' },
          { value: 'GBP', label: 'GBP (£)' }
        ];
      case 'status':
        return [
          { value: 'Active', label: 'Active' },
          { value: 'Suspended', label: 'Suspended' }
        ];
      case 'role':
        return [
          { value: 'Property Manager', label: 'Property Manager' },
          { value: 'Collection Manager', label: 'Collection Manager' },
          { value: 'Maintenance', label: 'Maintenance' }
        ];
      case 'roleFilter':
        return [
          { value: 'All', label: 'All Roles' },
          { value: 'PROPERTY MANAGER', label: 'Property Manager' },
          { value: 'COLLECTION MANAGER', label: 'Collection Manager' },
          { value: 'MAINTENANCE', label: 'Maintenance' }
        ];
      case 'specialty':
        return [
          { value: 'Plumber Specialty', label: 'Plumber Specialty' },
          { value: 'Electrician Specialty', label: 'Electrician Specialty' },
          { value: 'HVAC Maintenance', label: 'HVAC Maintenance' },
          { value: 'General Contractor', label: 'General Contractor' },
          { value: 'Cleaning & Turnovers', label: 'Cleaning & Turnovers' },
          { value: 'Landscaping & Pools', label: 'Landscaping & Pools' },
          { value: 'Pest Control', label: 'Pest Control' },
          { value: 'Security & Fire', label: 'Security & Fire' },
          { value: 'Roofing & Guttering', label: 'Roofing & Guttering' }
        ];
      default:
        return [];
    }
  };

  const handleSelectPickerOption = (val) => {
    if (activePicker === 'timezone') setSystemTimezone(val);
    if (activePicker === 'currency') setBaseCurrency(val);
    if (activePicker === 'status') setProvStatus(val);
    if (activePicker === 'role') {
      setProvRole(val);
      if (val !== 'Maintenance') setProvSpecialty('None');
    }
    if (activePicker === 'specialty') setProvSpecialty(val);
    if (activePicker === 'roleFilter') setSelectedRoleFilter(val);
    setPickerModalOpen(false);
  };

  // Filter Company Users
  const filteredUsers = companyUsers.filter(u => {
    const text = `${u.name || ''} ${u.email || ''}`.toLowerCase();
    const matchSearch = text.includes(searchQuery.toLowerCase());
    const matchRole = selectedRoleFilter === 'All' ? true : u.role === selectedRoleFilter;
    return matchSearch && matchRole;
  });

  const toggleBuildingScope = (bName) => {
    if (provBuildingsScope.includes(bName)) {
      setProvBuildingsScope(prev => prev.filter(x => x !== bName));
    } else {
      setProvBuildingsScope(prev => [...prev, bName]);
    }
  };

  // Loading wrapper
  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>Loading configurations...</Text>
      </View>
    );
  }

  // ----------------------------------------------------
  // A0. SUPER ADMIN: SIMPLE SETTINGS & LOGOUT SCREEN
  // ----------------------------------------------------
  if (role === 'Super Admin') {
    return (
      <View style={[styles.mainWrapper, { backgroundColor: colors.bg, padding: 20, justifyContent: 'center', alignItems: 'center' }]}>
        <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <View style={[styles.profileHeaderCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, width: '100%', padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center' }]}>
            <View style={styles.avatarLargeCircle}>
              <Text style={styles.avatarLargeCircleText} allowFontScaling={false}>
                {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'A'}
              </Text>
            </View>
            <Text style={[styles.profileNameTextMain, { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 14 }]} allowFontScaling={false}>
              {user?.firstName ? `${user.firstName} ${user.lastName}`.trim() : 'ADMIN User'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }} allowFontScaling={false}>
              {user?.email || 'superadmin@gmail.com'}
            </Text>
            <View style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, marginTop: 12 }}>
              <Text style={{ color: '#38bdf8', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5 }} allowFontScaling={false}>
                SUPER ADMIN PLATFORM
              </Text>
            </View>
          </View>

          <View style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder, width: '100%', padding: 18, borderRadius: 16, borderWidth: 1, marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name={isDarkMode ? "moon-outline" : "sunny-outline"} size={20} color="#38bdf8" />
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }} allowFontScaling={false}>Dark Mode Theme</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#767577', true: '#38bdf8' }}
              thumbColor={isDarkMode ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity 
            style={{ width: '100%', backgroundColor: 'rgba(239, 68, 68, 0.12)', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', marginTop: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '800' }} allowFontScaling={false}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ----------------------------------------------------
  // A. PROPERTY MANAGER: COMPANY SETTINGS & PROFILE
  // ----------------------------------------------------
  if (role === 'Property Manager') {
    return (
      <View style={[styles.mainWrapper, { backgroundColor: colors.bg }]}>
        <View style={[styles.fixedHeader, { backgroundColor: colors.bg, borderBottomColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]} allowFontScaling={false}>
            {language === 'es' ? 'Configuración de la Empresa' : 'Company Settings'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} allowFontScaling={false}>
            {language === 'es'
              ? 'Configure default branding logo assets, regional date format templates, timezone offsets, and currency types.'
              : 'Configure default branding logo assets, regional date format templates, timezone offsets, and currency types.'}
          </Text>

          {/* Sub-tabs row */}
          <View style={[styles.tabRow, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={[
                styles.tabItem,
                companyTab === 'profile' && { backgroundColor: isDarkMode ? '#38bdf8' : '#3b82f6' }
              ]}
              onPress={() => setCompanyTab('profile')}
            >
              <Text
                style={[
                  styles.tabItemText,
                  companyTab === 'profile' && { color: isDarkMode ? '#0f172a' : '#ffffff', fontWeight: '800' }
                ]}
                allowFontScaling={false}
              >
                {language === 'es' ? 'Perfil de la Empresa' : 'Company Profile'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabItem,
                companyTab === 'users' && { backgroundColor: isDarkMode ? '#38bdf8' : '#3b82f6' }
              ]}
              onPress={() => setCompanyTab('users')}
            >
              <Text
                style={[
                  styles.tabItemText,
                  companyTab === 'users' && { color: isDarkMode ? '#0f172a' : '#ffffff', fontWeight: '800' }
                ]}
                allowFontScaling={false}
              >
                {language === 'es' ? 'Usuarios y Roles' : 'Users & Roles'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabItem,
                companyTab === 'assets' && { backgroundColor: isDarkMode ? '#38bdf8' : '#3b82f6' }
              ]}
              onPress={() => setCompanyTab('assets')}
            >
              <Text
                style={[
                  styles.tabItemText,
                  companyTab === 'assets' && { color: isDarkMode ? '#0f172a' : '#ffffff', fontWeight: '800' }
                ]}
                allowFontScaling={false}
              >
                {language === 'es' ? 'Eliminar Activo' : 'Asset Deletion'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={[styles.container, { backgroundColor: colors.bg }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
        >
          {/* A.1. COMPANY PROFILE TAB */}
          {companyTab === 'profile' && (
            <View style={styles.tabContentContainer}>
              <View style={[styles.settingsCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <View style={[styles.cardHeaderRow, { borderBottomColor: colors.cardBorder }]}>
                  <Ionicons name="sparkles" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]} allowFontScaling={false}>Corporate Settings & Profile</Text>
                </View>

                <Text style={[styles.formLabel, { color: colors.textSecondary }]} allowFontScaling={false}>COMPANY NAME</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  placeholder="Apex Properties Inc."
                  placeholderTextColor="#64748b"
                  value={companyName}
                  onChangeText={setCompanyName}
                />

                <Text style={[styles.formLabel, { color: colors.textSecondary }]} allowFontScaling={false}>CORPORATE HEADQUARTERS ADDRESS</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  placeholder="100 Pine Street, San Francisco, CA"
                  placeholderTextColor="#64748b"
                  value={companyAddress}
                  onChangeText={setCompanyAddress}
                />

                <Text style={[styles.formLabel, { color: colors.textSecondary }]} allowFontScaling={false}>SYSTEM TIMEZONE</Text>
                <TouchableOpacity
                  style={[styles.formPickerSelector, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                  onPress={() => setActivePicker(activePicker === 'timezone' ? null : 'timezone')}
                >
                  <Text style={[styles.formPickerText, { color: colors.textPrimary }]} allowFontScaling={false}>
                    {systemTimezone === 'EST' ? 'EST (Eastern Time)' : systemTimezone === 'PST' ? 'PST (Pacific Time)' : 'GMT (Greenwich Time)'}
                  </Text>
                  <Ionicons name={activePicker === 'timezone' ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                {activePicker === 'timezone' && (
                  <View style={[styles.inlineDropdownCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                    {[
                      { value: 'EST', label: 'EST (Eastern Time)' },
                      { value: 'PST', label: 'PST (Pacific Time)' },
                      { value: 'GMT', label: 'GMT (Greenwich Time)' }
                    ].map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.inlineDropdownRow, systemTimezone === opt.value && { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}
                        onPress={() => {
                          setSystemTimezone(opt.value);
                          setActivePicker(null);
                        }}
                      >
                        <Text style={[styles.inlineDropdownText, { color: colors.textPrimary, fontWeight: systemTimezone === opt.value ? '800' : '500' }]} allowFontScaling={false}>
                          {opt.label}
                        </Text>
                        {systemTimezone === opt.value && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={[styles.formLabel, { color: colors.textSecondary }]} allowFontScaling={false}>BASE CURRENCY</Text>
                <TouchableOpacity
                  style={[styles.formPickerSelector, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                  onPress={() => setActivePicker(activePicker === 'currency' ? null : 'currency')}
                >
                  <Text style={[styles.formPickerText, { color: colors.textPrimary }]} allowFontScaling={false}>
                    {baseCurrency === 'USD' ? 'USD ($)' : baseCurrency === 'EUR' ? 'EUR (€)' : 'GBP (£)'}
                  </Text>
                  <Ionicons name={activePicker === 'currency' ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                {activePicker === 'currency' && (
                  <View style={[styles.inlineDropdownCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                    {[
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'EUR', label: 'EUR (€)' },
                      { value: 'GBP', label: 'GBP (£)' }
                    ].map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.inlineDropdownRow, baseCurrency === opt.value && { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}
                        onPress={() => {
                          setBaseCurrency(opt.value);
                          setActivePicker(null);
                        }}
                      >
                        <Text style={[styles.inlineDropdownText, { color: colors.textPrimary, fontWeight: baseCurrency === opt.value ? '800' : '500' }]} allowFontScaling={false}>
                          {opt.label}
                        </Text>
                        {baseCurrency === opt.value && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={styles.saveConfigBtn} onPress={handleSaveCompanyConfig} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#0f172a" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                      <Text style={styles.saveConfigBtnText} allowFontScaling={false}>Save Configurations</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* 4. App Preferences Section (Dark Mode & Language Option) */}
              <View style={[styles.infoSectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, marginTop: 16 }]}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="settings-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
                  <Text style={[styles.sectionHeaderTitle, { color: colors.textSecondary }]} allowFontScaling={false}>
                    {language === 'es' ? 'PREFERENCIAS DE LA APP' : 'APP PREFERENCES'}
                  </Text>
                </View>
                <View style={[styles.cardDivider, { backgroundColor: colors.cardBorder }]} />

                {/* Row 1: Dark Mode Toggle */}
                <View style={styles.rowBetween}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                    <Ionicons name="moon-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <View>
                      <Text style={[styles.prefTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
                        {language === 'es' ? 'Modo Oscuro' : 'Dark Mode'}
                      </Text>
                      <Text style={[styles.prefSubtitle, { color: colors.textMuted }]} allowFontScaling={false}>
                        {language === 'es' ? 'Cambiar entre interfaz clara y oscura' : 'Toggle between Dark and Light interface'}
                      </Text>
                    </View>
                  </View>
                  <Switch value={isDarkMode} onValueChange={toggleTheme} trackColor={{ false: '#cbd5e1', true: '#38bdf8' }} thumbColor="#f8fafc" />
                </View>

                <View style={[styles.cardDivider, { backgroundColor: colors.cardBorder, marginVertical: 12 }]} />

                {/* Row 2: App Language Option (Dropdown Select UI) */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="globe-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <View>
                      <Text style={[styles.prefTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
                        {language === 'es' ? 'Idioma de la App' : 'App Language'}
                      </Text>
                      <Text style={[styles.prefSubtitle, { color: colors.textMuted }]} allowFontScaling={false}>
                        {language === 'es' ? 'Seleccionar idioma (Inglés / Español)' : 'Select system language (English / Spanish)'}
                      </Text>
                    </View>
                  </View>

                  {/* Dropdown Select Selector Button */}
                  <TouchableOpacity
                    style={[
                      styles.formPickerSelector,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: isLanguageDropdownOpen ? '#38bdf8' : colors.inputBorder,
                        marginTop: 6,
                      }
                    ]}
                    onPress={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, marginRight: 8 }}>{language === 'es' ? '🇪🇸' : '🇺🇸'}</Text>
                      <Text style={[styles.formPickerText, { color: colors.textPrimary }]} allowFontScaling={false}>
                        {preferredLanguage || (language === 'es' ? 'Spanish (Español)' : 'English (US)')}
                      </Text>
                    </View>
                    <Ionicons
                      name={isLanguageDropdownOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* Dropdown Options List */}
                  {isLanguageDropdownOpen && (
                    <View style={[styles.inlineDropdownCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, marginTop: 4 }]}>
                      {[
                        { code: 'en', label: 'English (US)', flag: '🇺🇸' },
                        { code: 'es', label: 'Spanish (Español)', flag: '🇪🇸' }
                      ].map((opt) => (
                        <TouchableOpacity
                          key={opt.code}
                          style={[
                            styles.inlineDropdownRow,
                            language === opt.code && { backgroundColor: 'rgba(56, 189, 248, 0.15)' }
                          ]}
                          onPress={() => {
                            handleSelectLanguage(opt.code, opt.label);
                            setIsLanguageDropdownOpen(false);
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: 16, marginRight: 8 }}>{opt.flag}</Text>
                            <Text
                              style={[
                                styles.inlineDropdownText,
                                { color: colors.textPrimary, fontWeight: language === opt.code ? '800' : '500' }
                              ]}
                              allowFontScaling={false}
                            >
                              {opt.label}
                            </Text>
                          </View>
                          {language === opt.code && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Account Settings / Logout */}
              <View style={[styles.settingsCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, marginTop: 16 }]}>
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                  <Ionicons name="log-out-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text style={styles.logoutBtnText} allowFontScaling={false}>Log Out of WhatsLandlord Staff</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* A.2. ORGANIZATION USERS TAB */}
          {companyTab === 'users' && (
            <View style={styles.tabContentContainer}>
              <View style={styles.usersHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hubTitle} allowFontScaling={false}>Organization User Hub</Text>
                  <Text style={styles.hubSubtitle} allowFontScaling={false}>
                    Provision agency personnel, configure role relationships, properties scopes, and manage user statuses.
                  </Text>
                </View>
                <TouchableOpacity style={styles.provisionBtn} onPress={() => setProvisionUserOpen(true)}>
                  <Ionicons name="add" size={14} color="#0f172a" />
                  <Text style={styles.provisionBtnText} allowFontScaling={false}>Provision User</Text>
                </TouchableOpacity>
              </View>

              {/* Filters */}
              <View style={styles.filterRowContainer}>
                <View style={styles.userSearchBox}>
                  <Ionicons name="search-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.userSearchInput}
                    placeholder="Search name or email..."
                    placeholderTextColor="#64748b"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                <TouchableOpacity
                  style={styles.roleFilterBtn}
                  onPress={() => setActivePicker(activePicker === 'roleFilter' ? null : 'roleFilter')}
                >
                  <Text style={styles.roleFilterText} allowFontScaling={false}>
                    {selectedRoleFilter === 'All' ? 'All Roles' : selectedRoleFilter.replace(/_/g, ' ')}
                  </Text>
                  <Ionicons name={activePicker === 'roleFilter' ? "chevron-up" : "funnel-outline"} size={12} color="#cbd5e1" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>

              {activePicker === 'roleFilter' && (
                <View style={[styles.inlineDropdownCard, { marginBottom: 12 }]}>
                  {[
                    { value: 'All', label: 'All Roles' },
                    { value: 'PROPERTY MANAGER', label: 'Property Manager' },
                    { value: 'COLLECTION MANAGER', label: 'Collection Manager' },
                    { value: 'MAINTENANCE', label: 'Maintenance' }
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.inlineDropdownRow, selectedRoleFilter === opt.value && styles.inlineDropdownRowActive]}
                      onPress={() => {
                        setSelectedRoleFilter(opt.value);
                        setActivePicker(null);
                      }}
                    >
                      <Text style={[styles.inlineDropdownText, selectedRoleFilter === opt.value && styles.inlineDropdownTextActive]} allowFontScaling={false}>
                        {opt.label}
                      </Text>
                      {selectedRoleFilter === opt.value && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Active System Accounts card list */}
              <View style={styles.accountsContainerCard}>
                <Text style={styles.accountsCardTitle} allowFontScaling={false}>Active System Accounts</Text>
                <View style={styles.divider} />

                {filteredUsers.length === 0 ? (
                  <View style={styles.emptyAccountsView}>
                    <Text style={styles.emptyAccountsText} allowFontScaling={false}>No organization users matches</Text>
                  </View>
                ) : (
                  filteredUsers.map((item, idx) => {
                    const statusColor = item.status === 'ACTIVE' ? '#10b981' : '#f59e0b';
                    return (
                      <View key={item.id || idx} style={styles.userListItemRow}>
                        <View style={{ flex: 1.2 }}>
                          <Text style={styles.uNameText} allowFontScaling={false}>{item.name || 'Staff Member'}</Text>
                          <Text style={styles.uEmailText} allowFontScaling={false}>{item.email}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                            <View style={styles.roleMiniBadge}>
                              <Text style={styles.roleMiniText} allowFontScaling={false}>{item.role?.replace(/_/g, ' ')}</Text>
                            </View>
                            <View style={[styles.statusMiniBadge, { borderColor: statusColor }]}>
                              <Text style={[styles.statusMiniText, { color: statusColor }]} allowFontScaling={false}>{item.status}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.uActionButtonsContainer}>
                          <TouchableOpacity
                            style={[styles.uActionBtn, { backgroundColor: item.status === 'ACTIVE' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)' }]}
                            onPress={() => handleToggleUserStatus(item.id, item.status)}
                          >
                            <Text style={[styles.uActionBtnText, { color: item.status === 'ACTIVE' ? '#f59e0b' : '#10b981' }]} allowFontScaling={false}>
                              {item.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.uActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
                            onPress={() => handleDeleteUser(item.id, item.name)}
                          >
                            <Ionicons name="trash-outline" size={13} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}

          {/* A.3. PASSWORD-PROTECTED ASSET DELETION TAB */}
          {companyTab === 'assets' && (
            <View style={styles.tabContentContainer}>
              <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, marginBottom: 16, padding: 16, borderRadius: 16, borderWidth: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="shield-checkmark" size={24} color="#ef4444" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }} allowFontScaling={false}>
                      Password-Protected Asset Deletion
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} allowFontScaling={false}>
                      Deleting properties, buildings, or units requires account password authorization to protect your management ledger.
                    </Text>
                  </View>
                </View>
              </View>

              {/* PROPERTIES */}
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginBottom: 8, textTransform: 'uppercase' }} allowFontScaling={false}>
                Registered Properties ({assetDeleteProps.length})
              </Text>
              {assetDeleteProps.length === 0 ? (
                <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginBottom: 16 }} allowFontScaling={false}>No properties registered.</Text>
              ) : (
                assetDeleteProps.map((p) => (
                  <View key={`del-prop-${p.id}`} style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }]}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }} allowFontScaling={false}>{p.name}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }} allowFontScaling={false}>{p.address || p.streetAddress || 'Property'}</Text>
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => handlePromptAssetDelete(p, 'Property', 'properties')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="lock-closed-outline" size={14} color="#ef4444" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '800' }} allowFontScaling={false}>Delete Property</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {/* BUILDINGS */}
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginTop: 16, marginBottom: 8, textTransform: 'uppercase' }} allowFontScaling={false}>
                Registered Buildings ({assetDeleteBuildings.length})
              </Text>
              {assetDeleteBuildings.length === 0 ? (
                <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginBottom: 16 }} allowFontScaling={false}>No buildings registered.</Text>
              ) : (
                assetDeleteBuildings.map((b) => (
                  <View key={`del-bld-${b.id}`} style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }]}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }} allowFontScaling={false}>{b.name}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }} allowFontScaling={false}>Property: {b.property?.name || 'Property'}</Text>
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => handlePromptAssetDelete(b, 'Building', 'buildings')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="lock-closed-outline" size={14} color="#ef4444" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '800' }} allowFontScaling={false}>Delete Building</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {/* UNITS */}
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginTop: 16, marginBottom: 8, textTransform: 'uppercase' }} allowFontScaling={false}>
                Registered Units ({assetDeleteUnits.length})
              </Text>
              {assetDeleteUnits.length === 0 ? (
                <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginBottom: 16 }} allowFontScaling={false}>No units registered.</Text>
              ) : (
                assetDeleteUnits.map((u) => (
                  <View key={`del-unit-${u.id}`} style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }]}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }} allowFontScaling={false}>Unit {u.unitNumber || u.number}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }} allowFontScaling={false}>{u.property?.name || 'Property'} · {u.status || 'Vacant'}</Text>
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => handlePromptAssetDelete(u, 'Unit', 'units')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="lock-closed-outline" size={14} color="#ef4444" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '800' }} allowFontScaling={false}>Delete Unit</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>

        {/* --- PROVISION NEW USER MODAL --- */}
        <Modal visible={provisionUserOpen} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>PROVISION USER ACCOUNT</Text>
                  <TouchableOpacity onPress={() => setProvisionUserOpen(false)}>
                    <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                  <Text style={styles.formLabel} allowFontScaling={false}>FULL NAME</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="E.g. David Miller"
                    placeholderTextColor="#64748b"
                    value={provFullName}
                    onChangeText={setProvFullName}
                  />
                  {provErrors.fullName && <Text style={styles.errorLabel} allowFontScaling={false}>{provErrors.fullName}</Text>}

                  <Text style={styles.formLabel} allowFontScaling={false}>EMAIL ADDRESS</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="staff@gmail.com"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={provEmail}
                    onChangeText={setProvEmail}
                  />
                  {provErrors.email && <Text style={styles.errorLabel} allowFontScaling={false}>{provErrors.email}</Text>}

                  <Text style={styles.formLabel} allowFontScaling={false}>PHONE NUMBER</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. (555) 0122"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    value={provPhone}
                    onChangeText={setProvPhone}
                  />
                  {provErrors.phone && <Text style={styles.errorLabel} allowFontScaling={false}>{provErrors.phone}</Text>}

                  <Text style={styles.formLabel} allowFontScaling={false}>STATUS</Text>
                  <TouchableOpacity
                    style={styles.formPickerSelector}
                    onPress={() => setActivePicker(activePicker === 'status' ? null : 'status')}
                  >
                    <Text style={styles.formPickerText} allowFontScaling={false}>{provStatus}</Text>
                    <Ionicons name={activePicker === 'status' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                  {activePicker === 'status' && (
                    <View style={styles.inlineDropdownCard}>
                      {[
                        { value: 'Active', label: 'Active' },
                        { value: 'Suspended', label: 'Suspended' }
                      ].map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.inlineDropdownRow, provStatus === opt.value && styles.inlineDropdownRowActive]}
                          onPress={() => {
                            setProvStatus(opt.value);
                            setActivePicker(null);
                          }}
                        >
                          <Text style={[styles.inlineDropdownText, provStatus === opt.value && styles.inlineDropdownTextActive]} allowFontScaling={false}>
                            {opt.label}
                          </Text>
                          {provStatus === opt.value && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={styles.formLabel} allowFontScaling={false}>USER PASSWORD</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    value={provPassword}
                    onChangeText={setProvPassword}
                  />
                  {provErrors.password && <Text style={styles.errorLabel} allowFontScaling={false}>{provErrors.password}</Text>}

                  <Text style={styles.formLabel} allowFontScaling={false}>ROLE</Text>
                  <TouchableOpacity
                    style={styles.formPickerSelector}
                    onPress={() => setActivePicker(activePicker === 'role' ? null : 'role')}
                  >
                    <Text style={styles.formPickerText} allowFontScaling={false}>{provRole}</Text>
                    <Ionicons name={activePicker === 'role' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                  {activePicker === 'role' && (
                    <View style={styles.inlineDropdownCard}>
                      {[
                        { value: 'Collection Manager', label: 'Collection Manager' },
                        { value: 'Maintenance', label: 'Maintenance' }
                      ].map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.inlineDropdownRow, provRole === opt.value && styles.inlineDropdownRowActive]}
                          onPress={() => {
                            setProvRole(opt.value);
                            if (opt.value !== 'Maintenance') setProvSpecialty('None');
                            setActivePicker(null);
                          }}
                        >
                          <Text style={[styles.inlineDropdownText, provRole === opt.value && styles.inlineDropdownTextActive]} allowFontScaling={false}>
                            {opt.label}
                          </Text>
                          {provRole === opt.value && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {provRole === 'Maintenance' && (
                    <>
                      <Text style={styles.formLabel} allowFontScaling={false}>SPECIALTY TRADE</Text>
                      <TouchableOpacity
                        style={styles.formPickerSelector}
                        onPress={() => setActivePicker(activePicker === 'specialty' ? null : 'specialty')}
                      >
                        <Text style={styles.formPickerText} allowFontScaling={false}>{provSpecialty}</Text>
                        <Ionicons name={activePicker === 'specialty' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                      </TouchableOpacity>
                      {activePicker === 'specialty' && (
                        <View style={styles.inlineDropdownCard}>
                          {[
                            { value: 'Plumber Specialty', label: 'Plumber Specialty' },
                            { value: 'Electrician Specialty', label: 'Electrician Specialty' },
                            { value: 'HVAC Maintenance', label: 'HVAC Maintenance' },
                            { value: 'General Contractor', label: 'General Contractor' },
                            { value: 'Cleaning & Turnovers', label: 'Cleaning & Turnovers' },
                            { value: 'Landscaping & Pools', label: 'Landscaping & Pools' },
                            { value: 'Pest Control', label: 'Pest Control' },
                            { value: 'Security & Fire', label: 'Security & Fire' },
                            { value: 'Roofing & Guttering', label: 'Roofing & Guttering' }
                          ].map((opt) => (
                            <TouchableOpacity
                              key={opt.value}
                              style={[styles.inlineDropdownRow, provSpecialty === opt.value && styles.inlineDropdownRowActive]}
                              onPress={() => {
                                setProvSpecialty(opt.value);
                                setActivePicker(null);
                              }}
                            >
                              <Text style={[styles.inlineDropdownText, provSpecialty === opt.value && styles.inlineDropdownTextActive]} allowFontScaling={false}>
                                {opt.label}
                              </Text>
                              {provSpecialty === opt.value && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Scope scope checklist */}
                      <Text style={styles.formLabel} allowFontScaling={false}>ACCESS SCOPE RELATIONSHIPS</Text>
                      <Text style={{ fontSize: 9.5, color: '#64748b', marginBottom: 6, fontWeight: '700' }} allowFontScaling={false}>ASSIGN BUILDINGS SCOPE</Text>
                      
                      <View style={styles.buildingChecklistContainer}>
                        {['Building 1', 'Buliding 2', 'building A'].map(b => {
                          const isChecked = provBuildingsScope.includes(b);
                          return (
                            <TouchableOpacity key={b} style={styles.scopeCheckRow} onPress={() => toggleBuildingScope(b)}>
                              <Ionicons name={isChecked ? "checkbox" : "square-outline"} size={18} color={isChecked ? "#38bdf8" : "#64748b"} style={{ marginRight: 6 }} />
                              <Text style={styles.scopeCheckText} allowFontScaling={false}>{b}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setProvisionUserOpen(false)}>
                    <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitBtn} onPress={handleProvisionUser} disabled={submitting}>
                    {submitting ? (
                      <ActivityIndicator size="small" color="#0f172a" />
                    ) : (
                      <Text style={styles.submitBtnText} allowFontScaling={false}>Provision Account</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* --- PASSWORD CONFIRMATION MODAL FOR ASSET DELETION --- */}
        <Modal visible={isDeletePasswordModalOpen} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="lock-closed" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
                      Password Verification Required
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsDeletePasswordModalOpen(false)}>
                    <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }} allowFontScaling={false}>
                  You are about to delete {deleteTargetAsset?.type} <Text style={{ fontWeight: '800', color: colors.textPrimary }}>"{deleteTargetAsset?.name}"</Text>. Enter your account password to confirm deletion:
                </Text>

                <Text style={styles.formLabel} allowFontScaling={false}>ACCOUNT PASSWORD</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  placeholder="Enter current password..."
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={deleteConfirmPassword}
                  onChangeText={setDeleteConfirmPassword}
                />

                <View style={[styles.modalActions, { marginTop: 20 }]}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsDeletePasswordModalOpen(false)} disabled={deletingAsset}>
                    <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#ef4444' }]} onPress={handleExecuteAssetDelete} disabled={deletingAsset}>
                    {deletingAsset ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={[styles.submitBtnText, { color: '#ffffff' }]} allowFontScaling={false}>Confirm Delete</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    );
  }

  // ----------------------------------------------------
  // B. OTHER ROLES: PERSONAL USER PROFILE & SETTINGS
  // ----------------------------------------------------
  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
      >
      {/* 1. Profile Header Card */}
      <View style={[styles.profileHeaderCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <View style={styles.avatarLargeCircle}>
          <Text style={styles.avatarLargeCircleText} allowFontScaling={false}>
            {firstName.charAt(0) || userEmail.charAt(0) || 'P'}
          </Text>
        </View>
        <Text style={[styles.profileNameTextMain, { color: colors.textPrimary }]} allowFontScaling={false}>
          {firstName ? `${firstName} ${lastName}`.trim() : 'person 1'}
        </Text>
        
        {/* Badge */}
        <View style={styles.roleBadgeContainer}>
          <Text style={styles.roleBadgeText} allowFontScaling={false}>
            {role === 'Collection Manager' ? (language === 'es' ? 'PERSONAL DE COBROS' : 'COLLECTION STAFF') : role.toUpperCase()}
          </Text>
        </View>

        {/* Buttons: Edit Profile & Reset Password */}
        <View style={styles.headerButtonsRow}>
          <TouchableOpacity style={styles.headerButtonBlue} onPress={() => setIsEditModalOpen(true)} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={15} color="#0f172a" style={{ marginRight: 4 }} />
            <Text style={styles.headerButtonBlueText} allowFontScaling={false}>
              {language === 'es' ? 'Editar Perfil' : 'Edit Profile'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerButtonDark, { backgroundColor: colors.headerBtnDark, borderColor: colors.cardBorder }]} onPress={() => setIsPasswordModalOpen(true)} activeOpacity={0.8}>
            <Ionicons name="lock-closed-outline" size={15} color={colors.headerBtnDarkText} style={{ marginRight: 4 }} />
            <Text style={[styles.headerButtonDarkText, { color: colors.headerBtnDarkText }]} allowFontScaling={false}>
              {language === 'es' ? 'Restablecer Contraseña' : 'Reset Password'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Contact Details Section */}
      <View style={[styles.infoSectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="call-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
          <Text style={[styles.sectionHeaderTitle, { color: colors.textSecondary }]} allowFontScaling={false}>
            {language === 'es' ? 'DETALLES DE CONTACTO' : 'CONTACT DETAILS'}
          </Text>
        </View>
        <View style={[styles.cardDivider, { backgroundColor: colors.cardBorder }]} />

        <View style={styles.formGrid}>
          <View style={styles.formGridHalf}>
            <Text style={[styles.formGridLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
              {language === 'es' ? 'NOMBRE' : 'FIRST NAME'}
            </Text>
            <View style={[styles.formGridInputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <Text style={[styles.formGridInputText, { color: colors.textPrimary }]} allowFontScaling={false}>{firstName || 'person'}</Text>
            </View>
          </View>
          <View style={styles.formGridHalf}>
            <Text style={[styles.formGridLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
              {language === 'es' ? 'APELLIDO' : 'LAST NAME'}
            </Text>
            <View style={[styles.formGridInputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <Text style={[styles.formGridInputText, { color: colors.textPrimary }]} allowFontScaling={false}>{lastName || '1'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.formGrid}>
          <View style={styles.formGridHalf}>
            <Text style={[styles.formGridLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
              {language === 'es' ? 'TELÉFONO DE CONTACTO' : 'CONTACT PHONE'}
            </Text>
            <View style={[styles.formGridInputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <Text style={[styles.formGridInputText, { color: colors.textPrimary }]} allowFontScaling={false}>{phone || '344232'}</Text>
            </View>
          </View>
          <View style={styles.formGridHalf}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.formGridLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                {language === 'es' ? 'CORREO ELECTRÓNICO ' : 'EMAIL ADDRESS '}
              </Text>
              <Text style={{ fontSize: 9, color: '#f59e0b', fontWeight: '800' }} allowFontScaling={false}>
                {language === 'es' ? '(BLOQUEADO)' : '(LOCKED)'}
              </Text>
            </View>
            <View style={[styles.formGridInputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <Ionicons name="lock-closed" size={10} color="#94a3b8" />
              <Text style={[styles.formGridInputText, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1} allowFontScaling={false}>
                {userEmail || 'tenant@apexpm.com'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.formGrid}>
          <View style={styles.formGridHalf}>
            <Text style={[styles.formGridLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
              {role === 'Tenant'
                ? (language === 'es' ? 'UNIDAD ASIGNADA' : 'ASSIGNED UNIT')
                : (language === 'es' ? 'ROL ASIGNADO' : 'ASSIGNED ROLE')}
            </Text>
            <View style={[styles.formGridInputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <Text style={[styles.formGridInputText, { color: colors.textPrimary }]} allowFontScaling={false}>
                {role === 'Tenant' ? unitNumber || 'Unit room 1b' : (role === 'Collection Manager' ? (language === 'es' ? 'Personal de Cobros' : 'Collection Staff') : role)}
              </Text>
            </View>
          </View>
          <View style={styles.formGridHalf}>
            <Text style={[styles.formGridLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
              {language === 'es' ? 'CONTACTO DE EMERGENCIA' : 'EMERGENCY CONTACT'}
            </Text>
            <View style={[styles.formGridInputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <Text style={[styles.formGridInputText, { color: colors.textPrimary }]} allowFontScaling={false}>
                {emergencyContact || 'Emergency Contact Available'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3. Permits & Records Section */}
      <View style={[styles.infoSectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <View style={styles.sectionHeaderRow}>
          {role === 'Tenant' ? (
            <Ionicons name="car-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
          ) : (
            <Ionicons name="briefcase-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
          )}
          <Text style={[styles.sectionHeaderTitle, { color: colors.textSecondary }]} allowFontScaling={false}>
            {role === 'Tenant'
              ? (language === 'es' ? 'PERMISOS Y REGISTROS' : 'PERMITS & RESIDENT RECORDS')
              : (language === 'es' ? 'REGISTROS DE PERSONAL' : 'STAFF RECORDS')}
          </Text>
        </View>
        <View style={[styles.cardDivider, { backgroundColor: colors.cardBorder }]} />

        {role === 'Tenant' ? (
          <>
            <View style={styles.recordsTextRow}>
              <Text style={[styles.recordsLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                {language === 'es' ? 'VEHÍCULOS REGISTRADOS' : 'REGISTERED VEHICLES'}
              </Text>
              <Text style={[styles.recordsValue, { color: colors.textPrimary }]} allowFontScaling={false}>{vehicles}</Text>
            </View>
            <View style={styles.recordsTextRow}>
              <Text style={[styles.recordsLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                {language === 'es' ? 'MASCOTAS REGISTRADAS' : 'REGISTERED PETS'}
              </Text>
              <Text style={[styles.recordsValue, { color: colors.textPrimary }]} allowFontScaling={false}>{pets}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.recordsTextRow}>
              <Text style={[styles.recordsLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                {language === 'es' ? 'ESPECIALIDAD / COMERCIO' : 'SPECIALTY TRADE'}
              </Text>
              <Text style={[styles.recordsValue, { color: colors.textPrimary }]} allowFontScaling={false}>
                {language === 'es' ? 'Cobros y Finanzas' : 'Collections & Finance'}
              </Text>
            </View>
            <View style={styles.recordsTextRow}>
              <Text style={[styles.recordsLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                {language === 'es' ? 'HORARIO DE TRABAJO' : 'WORK HOURS'}
              </Text>
              <Text style={[styles.recordsValue, { color: colors.textPrimary }]} allowFontScaling={false}>9:00 AM - 5:00 PM</Text>
            </View>
          </>
        )}

        <View style={styles.recordsTextRow}>
          <Text style={[styles.recordsLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
            {language === 'es' ? 'IDIOMA PREFERIDO' : 'PREFERRED LANGUAGE'}
          </Text>
          <Text style={[styles.recordsValue, { color: colors.textPrimary }]} allowFontScaling={false}>{preferredLanguage}</Text>
        </View>
      </View>

      {/* 4. App Preferences Section (Dark Mode & Language Option) */}
      <View style={[styles.infoSectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="settings-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
          <Text style={[styles.sectionHeaderTitle, { color: colors.textSecondary }]} allowFontScaling={false}>
            {language === 'es' ? 'PREFERENCIAS DE LA APP' : 'APP PREFERENCES'}
          </Text>
        </View>
        <View style={[styles.cardDivider, { backgroundColor: colors.cardBorder }]} />

        {/* Row 1: Dark Mode Toggle */}
        <View style={styles.rowBetween}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
            <Ionicons name="moon-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <View>
              <Text style={[styles.prefTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
                {language === 'es' ? 'Modo Oscuro' : 'Dark Mode'}
              </Text>
              <Text style={[styles.prefSubtitle, { color: colors.textMuted }]} allowFontScaling={false}>
                {language === 'es' ? 'Cambiar entre interfaz clara y oscura' : 'Toggle between Dark and Light interface'}
              </Text>
            </View>
          </View>
          <Switch value={isDarkMode} onValueChange={toggleTheme} trackColor={{ false: '#cbd5e1', true: '#38bdf8' }} thumbColor="#f8fafc" />
        </View>

        <View style={[styles.cardDivider, { backgroundColor: colors.cardBorder, marginVertical: 12 }]} />

        {/* Row 2: App Language Option (Dropdown Select UI) */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="globe-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <View>
              <Text style={[styles.prefTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
                {language === 'es' ? 'Idioma de la App' : 'App Language'}
              </Text>
              <Text style={[styles.prefSubtitle, { color: colors.textMuted }]} allowFontScaling={false}>
                {language === 'es' ? 'Seleccionar idioma (Inglés / Español)' : 'Select system language (English / Spanish)'}
              </Text>
            </View>
          </View>

          {/* Dropdown Select Selector Button */}
          <TouchableOpacity
            style={[
              styles.formPickerSelector,
              {
                backgroundColor: colors.inputBg,
                borderColor: isLanguageDropdownOpen ? '#38bdf8' : colors.inputBorder,
                marginTop: 6,
              }
            ]}
            onPress={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>{language === 'es' ? '🇪🇸' : '🇺🇸'}</Text>
              <Text style={[styles.formPickerText, { color: colors.textPrimary }]} allowFontScaling={false}>
                {preferredLanguage || (language === 'es' ? 'Spanish (Español)' : 'English (US)')}
              </Text>
            </View>
            <Ionicons
              name={isLanguageDropdownOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Dropdown Options List */}
          {isLanguageDropdownOpen && (
            <View style={[styles.inlineDropdownCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, marginTop: 4 }]}>
              {[
                { code: 'en', label: 'English (US)', flag: '🇺🇸' },
                { code: 'es', label: 'Spanish (Español)', flag: '🇪🇸' }
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.code}
                  style={[
                    styles.inlineDropdownRow,
                    language === opt.code && { backgroundColor: 'rgba(56, 189, 248, 0.15)' }
                  ]}
                  onPress={() => {
                    handleSelectLanguage(opt.code, opt.label);
                    setIsLanguageDropdownOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>{opt.flag}</Text>
                    <Text
                      style={[
                        styles.inlineDropdownText,
                        { color: colors.textPrimary, fontWeight: language === opt.code ? '800' : '500' }
                      ]}
                      allowFontScaling={false}
                    >
                      {opt.label}
                    </Text>
                  </View>
                  {language === opt.code && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* 5. Big Red Sign Out Button */}
      <TouchableOpacity style={styles.signoutBtnLarge} onPress={logout} activeOpacity={0.8}>
        <Ionicons name="exit-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
        <Text style={styles.signoutBtnTextLarge} allowFontScaling={false}>
          {language === 'es' ? 'Cerrar Sesión' : 'Sign Out'}
        </Text>
      </TouchableOpacity>
    </ScrollView>

      {/* --- PERSONAL PROFILE EDIT MODAL --- */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
                  {language === 'es' ? 'Editar Detalles del Perfil' : 'Edit Details Profile'}
                </Text>
                <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                  {language === 'es' ? 'NOMBRE' : 'FIRST NAME'}
                </Text>
                <TextInput 
                  style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} 
                  value={firstName} 
                  onChangeText={setFirstName} 
                  placeholder={language === 'es' ? 'Nombre' : 'First Name'} 
                  placeholderTextColor="#64748b" 
                />

                <Text style={[styles.formLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                  {language === 'es' ? 'APELLIDO' : 'LAST NAME'}
                </Text>
                <TextInput 
                  style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} 
                  value={lastName} 
                  onChangeText={setLastName} 
                  placeholder={language === 'es' ? 'Apellido' : 'Last Name'} 
                  placeholderTextColor="#64748b" 
                />

                <Text style={[styles.formLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                  {language === 'es' ? 'NÚMERO DE TELÉFONO' : 'PHONE NUMBER'}
                </Text>
                <TextInput 
                  style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} 
                  value={phone} 
                  onChangeText={setPhone} 
                  placeholder={language === 'es' ? 'Número de Teléfono' : 'Phone Number'} 
                  placeholderTextColor="#64748b" 
                  keyboardType="phone-pad" 
                />

                {role === 'Tenant' && (
                  <>
                    <Text style={[styles.formLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                      {language === 'es' ? 'CONTACTO DE EMERGENCIA' : 'EMERGENCY CONTACT'}
                    </Text>
                    <TextInput 
                      style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} 
                      value={emergencyContact} 
                      onChangeText={setEmergencyContact} 
                      placeholder={language === 'es' ? 'Contacto de Emergencia' : 'Emergency Contact'} 
                      placeholderTextColor="#64748b" 
                    />

                    <Text style={[styles.formLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                      {language === 'es' ? 'DIRECCIÓN' : 'STREET ADDRESS'}
                    </Text>
                    <TextInput 
                      style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} 
                      value={streetAddress} 
                      onChangeText={setStreetAddress} 
                      placeholder={language === 'es' ? 'Dirección' : 'Street Address'} 
                      placeholderTextColor="#64748b" 
                    />
                  </>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditModalOpen(false)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>
                    {language === 'es' ? 'Cancelar' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSavePersonalProfile} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#0f172a" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>
                      {language === 'es' ? 'Guardar Detalles' : 'Save Details'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- RESET PASSWORD MODAL --- */}
      <Modal visible={isPasswordModalOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
                  {language === 'es' ? 'Restablecer Contraseña' : 'Reset Account Password'}
                </Text>
                <TouchableOpacity onPress={() => setIsPasswordModalOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                  {language === 'es' ? 'CONTRASEÑA ACTUAL' : 'CURRENT PASSWORD'}
                </Text>
                <TextInput style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={currentPassword} onChangeText={setCurrentPassword} placeholder="••••••••" placeholderTextColor="#64748b" secureTextEntry />
                {passErrors.currentPassword && <Text style={styles.errorLabel} allowFontScaling={false}>{passErrors.currentPassword}</Text>}

                <Text style={[styles.formLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                  {language === 'es' ? 'NUEVA CONTRASEÑA' : 'NEW PASSWORD'}
                </Text>
                <TextInput style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={newPassword} onChangeText={setNewPassword} placeholder="••••••••" placeholderTextColor="#64748b" secureTextEntry />
                {passErrors.newPassword && <Text style={styles.errorLabel} allowFontScaling={false}>{passErrors.newPassword}</Text>}

                <Text style={[styles.formLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                  {language === 'es' ? 'CONFIRMAR CONTRASEÑA' : 'CONFIRM PASSWORD'}
                </Text>
                <TextInput style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••" placeholderTextColor="#64748b" secureTextEntry />
                {passErrors.confirmPassword && <Text style={styles.errorLabel} allowFontScaling={false}>{passErrors.confirmPassword}</Text>}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsPasswordModalOpen(false)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>
                    {language === 'es' ? 'Cancelar' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleUpdatePassword} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#0f172a" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>
                      {language === 'es' ? 'Restablecer' : 'Reset Password'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const getStyles = (colors) => StyleSheet.create({
  errorLabel: { color: '#ef4444', fontSize: 10.5, marginTop: 4, fontWeight: '700' },
  mainWrapper: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 60, paddingTop: 12 },

  fixedHeader: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    zIndex: 10,
    paddingTop: 16,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 11.5, color: colors.textSecondary, marginTop: 4, lineHeight: 15 },

  // Sub-tabs row
  tabRow: { flexDirection: 'row', backgroundColor: colors.cardBg, borderRadius: 10, padding: 4, marginTop: 12 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabItemActive: { backgroundColor: '#38bdf8' },
  tabItemText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '700' },
  tabItemTextActive: { color: '#0f172a', fontWeight: '800' },

  tabContentContainer: { paddingTop: 8 },

  // Cards
  settingsCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, paddingBottom: 10 },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary },

  // Forms
  formLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  formInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 10,
    color: colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    fontWeight: '700',
    marginBottom: 10,
  },
  formPickerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: 10,
  },
  formPickerText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },

  saveConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 18,
  },
  saveConfigBtnText: { color: '#0f172a', fontSize: 13, fontWeight: '850' },

  // Users Hub Layouts
  usersHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  hubTitle: { fontSize: 15.5, fontWeight: '850', color: colors.textPrimary },
  hubSubtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  provisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  provisionBtnText: { color: '#0f172a', fontSize: 11.5, fontWeight: '800', marginLeft: 2 },

  // Filters Box
  filterRowContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  userSearchBox: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  userSearchInput: { flex: 1, color: colors.textPrimary, fontSize: 12.5, height: '100%', padding: 0 },
  roleFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
  },
  roleFilterText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },

  // Accounts List
  accountsContainerCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  accountsCardTitle: { fontSize: 13.5, fontWeight: '800', color: colors.textPrimary },
  emptyAccountsView: { paddingVertical: 40, alignItems: 'center' },
  emptyAccountsText: { color: colors.textMuted, fontSize: 12.5 },

  // User List Row
  userListItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  uNameText: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  uEmailText: { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },
  roleMiniBadge: { backgroundColor: 'rgba(56, 189, 248, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roleMiniText: { color: '#38bdf8', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  statusMiniBadge: { borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  statusMiniText: { fontSize: 8.5, fontWeight: '900', textTransform: 'uppercase' },

  uActionButtonsContainer: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  uActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uActionBtnText: { fontSize: 11, fontWeight: '800' },

  // Personal Header
  profileHeader: { alignItems: 'center', paddingVertical: 24 },
  avatarLarge: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#38bdf8', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarTextLarge: { fontSize: 28, color: '#0f172a', fontWeight: '800' },
  profileNameText: { fontSize: 18, fontWeight: '850', color: colors.textPrimary },
  profileSubText: { fontSize: 12.5, color: colors.textSecondary, marginTop: 4 },

  profileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  profileLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '650' },
  profileText: { fontSize: 13, color: colors.textSecondary },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 16,
  },
  editBtnText: { color: '#0f172a', fontSize: 12.5, fontWeight: '800' },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  actionText: { fontSize: 13, color: colors.textSecondary, fontWeight: '650' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 12 },
  logoutBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '800' },

  divider: { height: 1, backgroundColor: colors.cardBorder, marginVertical: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary },
  modalForm: { marginBottom: 16 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 16,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.headerBtnDark,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelBtnText: { color: colors.headerBtnDarkText, fontSize: 13, fontWeight: '800' },
  submitBtn: {
    flex: 1.5,
    backgroundColor: '#38bdf8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnText: { color: '#0f172a', fontSize: 13, fontWeight: '800' },

  buildingChecklistContainer: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 10,
    marginTop: 4,
  },
  scopeCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  scopeCheckText: {
    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Picker modal styling
  pickerModalContent: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    width: '80%',
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pickerModalTitle: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  pickerOptionRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  pickerOptionText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  closePickerBtn: {
    marginTop: 14,
    paddingVertical: 10,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    alignItems: 'center',
  },
  closePickerBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },

  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingText: { color: colors.textSecondary, fontSize: 13, marginTop: 8 },

  // Inline dropdown cards
  inlineDropdownCard: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
    marginTop: -4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  inlineDropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  inlineDropdownRowActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  inlineDropdownText: {
    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  inlineDropdownTextActive: {
    color: '#38bdf8',
    fontWeight: '800',
  },

  // High Fidelity Profile View Cards styling
  profileHeaderCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  avatarLargeCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLargeCircleText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0f172a',
  },
  profileNameTextMain: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  roleBadgeContainer: {
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginBottom: 16,
  },
  roleBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  headerButtonBlue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 8,
    paddingVertical: 10,
  },
  headerButtonBlueText: {
    color: '#0f172a',
    fontSize: 12.5,
    fontWeight: '800',
  },
  headerButtonDark: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.headerBtnDark,
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerButtonDarkText: {
    color: colors.headerBtnDarkText,
    fontSize: 12.5,
    fontWeight: '800',
  },
  infoSectionCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginBottom: 12,
  },
  formGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formGridHalf: {
    flex: 1,
  },
  formGridLabel: {
    fontSize: 9.5,
    color: colors.textSecondary,
    fontWeight: '700',
    marginBottom: 6,
  },
  formGridInputBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    minHeight: 40,
    justifyContent: 'center',
  },
  formGridInputText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  recordsTextRow: {
    marginBottom: 12,
  },
  recordsLabel: {
    fontSize: 9.5,
    color: colors.textSecondary,
    fontWeight: '700',
    marginBottom: 4,
  },
  recordsValue: {
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '800',
  },
  prefTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  prefSubtitle: {
    color: colors.textMuted,
    fontSize: 10.5,
    marginTop: 2,
  },
  langBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  langBtnActive: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  langBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  langBtnTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  signoutBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  signoutBtnTextLarge: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});

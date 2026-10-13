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

export const PlatformUsersScreen = () => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  // States
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [selectedRole, setSelectedRole] = useState('Property Manager');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchPlatformUsersData = async () => {
    try {
      setLoading(true);
      const [usersRes, compRes] = await Promise.all([
        apiClient.get('/superadmin/company-users', logout, refreshAccessToken),
        apiClient.get('/superadmin/companies', logout, refreshAccessToken),
      ]);

      if (usersRes && usersRes.data) {
        setUsers(usersRes.data);
      } else {
        setUsers([]);
      }

      if (compRes) {
        const list = Array.isArray(compRes) ? compRes : (compRes.data || []);
        setCompanies(list);
      } else {
        setCompanies([]);
      }
    } catch (e) {
      console.log('Error fetching platform users directory:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlatformUsersData();
  }, []);

  const handleCreateUser = async () => {
    if (!fullName || !emailAddress || !selectedCompany) {
      Alert.alert('Error', 'Please fill in Name, Email and select Company.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: fullName,
        email: emailAddress,
        role: selectedRole,
        companyId: selectedCompany.id,
        password: password || 'admin123',
      };
      await apiClient.post('/superadmin/company-users', payload, logout, refreshAccessToken);
      Alert.alert('Success', `User "${fullName}" created successfully.`);
      setCreateModalOpen(false);

      // Reset Form
      setFullName('');
      setEmailAddress('');
      setSelectedRole('Property Manager');
      setSelectedCompany(null);
      setPassword('');

      fetchPlatformUsersData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUserStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    Alert.alert(
      'Confirm Status Change',
      `Change account status to ${nextStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await apiClient.put(`/superadmin/company-users/${userId}/status`, { status: nextStatus }, logout, refreshAccessToken);
              Alert.alert('Success', 'User status updated successfully.');
              fetchPlatformUsersData();
            } catch (error) {
              Alert.alert('Error', 'Could not update user status.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = async (userId, userName) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to permanently delete user "${userName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/superadmin/company-users/${userId}`, logout, refreshAccessToken);
              Alert.alert('Success', 'User deleted successfully.');
              fetchPlatformUsersData();
            } catch (error) {
              Alert.alert('Error', 'Could not delete user.');
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
        <Text style={styles.loadingText} allowFontScaling={false}>Loading Platform Users...</Text>
      </View>
    );
  }

  const roleList = ['Admin', 'Property Manager', 'Collection Manager', 'Maintenance Staff', 'Owner', 'Tenant'];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchPlatformUsersData} tintColor="#38bdf8" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} allowFontScaling={false}>Platform Users</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalOpen(true)}>
            <Text style={styles.createBtnText} allowFontScaling={false}>+ Add User</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Users List Cards */}
      {users.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateText} allowFontScaling={false}>
            No platform users found.
          </Text>
        </View>
      ) : (
        users.map((item, idx) => (
          <View key={item.id || `user-${idx}`} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.userName} allowFontScaling={false}>
                  {item.name || item.firstName || item.email}
                </Text>
                <Text style={styles.emailText} allowFontScaling={false}>{item.email}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.badge, item.status === 'Active' ? styles.badgeActive : styles.badgeInactive]}
                onPress={() => handleUpdateUserStatus(item.id, item.status)}
              >
                <Text style={[styles.badgeText, item.status === 'Active' ? styles.badgeTextActive : styles.badgeTextInactive]} allowFontScaling={false}>
                  {item.status || 'Active'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel} allowFontScaling={false}>Platform Role</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText} allowFontScaling={false}>
                  {item.role || item.roleName || 'Property Manager'}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel} allowFontScaling={false}>Assigned Company</Text>
              <Text style={styles.infoValue} allowFontScaling={false}>
                {item.company?.name || item.companyName || 'Apex Property Management'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel} allowFontScaling={false}>Last Login</Text>
              <Text style={styles.infoValue} allowFontScaling={false}>
                {item.lastLogin || '2026-08-01'}
              </Text>
            </View>

            <View style={styles.cardFooterActions}>
              <TouchableOpacity 
                style={[styles.actionBtn, item.status === 'Active' ? styles.actionSuspend : styles.actionActivate]} 
                onPress={() => handleUpdateUserStatus(item.id, item.status)}
              >
                <Ionicons name={item.status === 'Active' ? 'ban-outline' : 'checkmark-circle-outline'} size={14} color={item.status === 'Active' ? '#f87171' : '#4ade80'} />
                <Text style={[styles.actionBtnText, { color: item.status === 'Active' ? '#f87171' : '#4ade80' }]} allowFontScaling={false}>
                  {item.status === 'Active' ? 'Suspend' : 'Activate'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, styles.actionDelete]} onPress={() => handleDeleteUser(item.id, item.name || item.email)}>
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                <Text style={[styles.actionBtnText, { color: '#ef4444' }]} allowFontScaling={false}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* CREATE NEW PLATFORM USER MODAL */}
      <Modal visible={createModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>Create Platform User</Text>
              <TouchableOpacity onPress={() => setCreateModalOpen(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle} allowFontScaling={false}>Add new platform user record & credential access settings.</Text>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.inputLabel} allowFontScaling={false}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#64748b"
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                placeholder="john@example.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                value={emailAddress}
                onChangeText={setEmailAddress}
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

              <Text style={styles.inputLabel} allowFontScaling={false}>PLATFORM ROLE</Text>
              <TouchableOpacity style={styles.pickerSelector} onPress={() => setRoleDropdownOpen(true)}>
                <Text style={styles.pickerSelectorText} allowFontScaling={false}>{selectedRole}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textPrimary} />
              </TouchableOpacity>

              <Text style={styles.inputLabel} allowFontScaling={false}>ASSIGNED COMPANY</Text>
              <TouchableOpacity style={styles.pickerSelector} onPress={() => setCompanyDropdownOpen(true)}>
                <Text style={styles.pickerSelectorText} allowFontScaling={false}>
                  {selectedCompany ? `${selectedCompany.name || selectedCompany.email} (${selectedCompany.code || 'CODE'})` : 'Select Company'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setCreateModalOpen(false)}>
                <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitBtn]} onPress={handleCreateUser} disabled={submitting}>
                <Text style={styles.submitBtnText} allowFontScaling={false}>
                  {submitting ? 'Creating...' : 'Create User'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Platform Role Selector Modal */}
        <Modal visible={roleDropdownOpen} transparent animationType="fade">
          <View style={styles.modalBg}>
            <View style={styles.pickerModalContent}>
              <Text style={styles.pickerModalTitle} allowFontScaling={false}>Select Platform Role</Text>
              {roleList.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={styles.pickerOptionRow}
                  onPress={() => {
                    setSelectedRole(role);
                    setRoleDropdownOpen(false);
                  }}
                >
                  <Text style={styles.pickerOptionText} allowFontScaling={false}>{role}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.closePickerBtn} onPress={() => setRoleDropdownOpen(false)}>
                <Text style={styles.closePickerBtnText} allowFontScaling={false}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, flex: 1 },
  subtitle: { fontSize: 11.5, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },

  createBtn: { backgroundColor: '#38bdf8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  createBtnText: { color: '#0f172a', fontSize: 11.5, fontWeight: '800' },

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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userName: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary },
  emailText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 10 },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  infoLabel: { fontSize: 12, color: colors.textSecondary },
  infoValue: { fontSize: 12, color: colors.textPrimary, fontWeight: '600' },

  roleBadge: { backgroundColor: 'rgba(56, 189, 248, 0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleBadgeText: { color: '#38bdf8', fontSize: 11, fontWeight: '700' },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 10.5, fontWeight: '800' },
  badgeActive: { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.3)' },
  badgeTextActive: { color: '#4ade80' },
  badgeInactive: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  badgeTextInactive: { color: '#f87171' },

  cardFooterActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  actionBtnText: { fontSize: 11, fontWeight: '700' },
  actionSuspend: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  actionActivate: { backgroundColor: 'rgba(34, 197, 94, 0.12)' },
  actionDelete: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },

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

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
  Alert,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export const OwnersScreen = () => {
  const logout = useAuthStore((state) => state.logout);
  const refreshAccessToken = useAuthStore((state) => state.refreshAccessToken);
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  const [owners, setOwners] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // View Details Modal State
  const [viewingOwner, setViewingOwner] = useState(null);

  // Add / Edit Owner Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('ACH/Direct Deposit');
  const [selectedPropertyIds, setSelectedPropertyIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPayoutDropdown, setShowPayoutDropdown] = useState(false);

  // Delete Confirm Modal State
  const [deleteOwner, setDeleteOwner] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const runEntryAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
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

  // Fetch live owners & properties matching web frontend API endpoints
  const fetchLiveOwnersData = async () => {
    try {
      setLoading(true);
      const [ownersRes, propsRes] = await Promise.all([
        apiClient.get('/owners', logout, refreshAccessToken).catch((err) => {
          console.log('Owners fetch error:', err?.message || err);
          return null;
        }),
        apiClient.get('/properties', logout, refreshAccessToken).catch((err) => {
          console.log('Properties fetch error:', err?.message || err);
          return null;
        }),
      ]);

      const rawOwners = Array.isArray(ownersRes)
        ? ownersRes
        : (Array.isArray(ownersRes?.data) ? ownersRes.data : []);
      const rawProps = Array.isArray(propsRes)
        ? propsRes
        : (Array.isArray(propsRes?.data) ? propsRes.data : []);

      setOwners(rawOwners);
      setProperties(rawProps);
    } catch (e) {
      console.log('Error fetching owners/properties:', e?.message || e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveOwnersData();
    runEntryAnimation();
  }, []);

  // Safe property matching logic supporting both Prisma object owner and string owner
  const getPropertiesForOwner = (ownerItem) => {
    if (!ownerItem || !Array.isArray(properties)) return [];
    const itemOwnerName = ownerItem.name ? String(ownerItem.name).trim().toLowerCase() : '';
    const itemOwnerId = ownerItem.id;
    const ownedIds = Array.isArray(ownerItem.propertiesOwned) ? ownerItem.propertiesOwned : [];
    const relPropIds = Array.isArray(ownerItem.properties)
      ? ownerItem.properties.map((op) => op?.id).filter(Boolean)
      : [];

    return properties.filter((p) => {
      if (!p) return false;
      const matchId = p.ownerId && itemOwnerId && p.ownerId === itemOwnerId;

      let pOwnerStr = '';
      if (typeof p.owner === 'string') {
        pOwnerStr = p.owner.trim().toLowerCase();
      } else if (p.owner && typeof p.owner.name === 'string') {
        pOwnerStr = p.owner.name.trim().toLowerCase();
      }

      const matchName = itemOwnerName && pOwnerStr && pOwnerStr === itemOwnerName;
      const matchOwnedList = p.id && ownedIds.includes(p.id);
      const matchPropRelation = p.id && relPropIds.includes(p.id);

      return Boolean(matchId || matchName || matchOwnedList || matchPropRelation);
    });
  };

  const getOwnerPropertiesCount = (ownerItem) => {
    const list = getPropertiesForOwner(ownerItem);
    return (
      list.length ||
      ownerItem.propertiesOwnedCount ||
      (Array.isArray(ownerItem.properties) ? ownerItem.properties.length : 0)
    );
  };

  // Open Add Owner Modal
  const handleOpenAdd = () => {
    setEditingOwner(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setPayoutMethod('ACH/Direct Deposit');
    setSelectedPropertyIds([]);
    setShowPayoutDropdown(false);
    setIsFormModalOpen(true);
  };

  // Open Edit Owner Modal
  const handleOpenEdit = (ownerItem) => {
    setEditingOwner(ownerItem);
    setFullName(ownerItem.name || '');
    setEmail(ownerItem.email || '');
    setPassword('');
    setPhone(ownerItem.phone || '');
    setPayoutMethod(ownerItem.payoutMethod || 'ACH/Direct Deposit');
    const assigned = getPropertiesForOwner(ownerItem);
    setSelectedPropertyIds(assigned.map((p) => p.id));
    setShowPayoutDropdown(false);
    setIsFormModalOpen(true);
  };

  // Open View Details Modal
  const handleOpenView = (ownerItem) => {
    setViewingOwner(ownerItem);
  };

  // Toggle Property Checkbox
  const togglePropertySelection = (propId) => {
    if (selectedPropertyIds.includes(propId)) {
      setSelectedPropertyIds(selectedPropertyIds.filter((id) => id !== propId));
    } else {
      setSelectedPropertyIds([...selectedPropertyIds, propId]);
    }
  };

  // Submit Add or Edit Owner
  const handleSubmitForm = async () => {
    if (!fullName || !fullName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    if (!email || !email.trim()) {
      Alert.alert('Validation Error', 'Email address is required.');
      return;
    }

    try {
      setSubmitting(true);
      const [first = '', ...lastParts] = fullName.trim().split(' ');
      const last = lastParts.join(' ');

      const payload = {
        name: fullName.trim(),
        firstName: first,
        lastName: last || 'Owner',
        email: email.trim(),
        phone: phone && phone.trim() ? phone.trim() : undefined,
        payoutMethod,
        role: 'Owner',
        propertiesOwned: selectedPropertyIds,
      };

      if (password && password.trim()) {
        payload.password = password.trim();
      }

      if (editingOwner) {
        await apiClient.put(`/owners/${editingOwner.id}`, payload, logout, refreshAccessToken);
        Alert.alert('Success', 'Property Owner updated successfully.');
      } else {
        await apiClient.post('/owners', payload, logout, refreshAccessToken);
        Alert.alert('Success', 'Property Owner created successfully.');
      }

      setIsFormModalOpen(false);
      setEditingOwner(null);
      fetchLiveOwnersData();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Operation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Owner Handler
  const confirmDelete = async () => {
    if (!deleteOwner) return;
    try {
      setDeleting(true);
      await apiClient.delete(`/owners/${deleteOwner.id}`, logout, refreshAccessToken);
      Alert.alert('Success', 'Owner deleted successfully.');
      setDeleteOwner(null);
      fetchLiveOwnersData();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to delete owner.');
    } finally {
      setDeleting(false);
    }
  };

  // Filter Owners safely
  const filteredOwners = (Array.isArray(owners) ? owners : []).filter((item) => {
    if (!item) return false;
    const text = `${item.name || ''} ${item.email || ''} ${item.phone || ''}`.toLowerCase();
    const q = (searchQuery || '').toLowerCase();
    return text.includes(q);
  });

  const payoutOptions = ['ACH/Direct Deposit', 'Wire Transfer', 'Check'];

  if (loading && owners.length === 0 && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>
          Loading Property Owners...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      {/* Top Header section */}
      <View style={styles.topSection}>
        <View style={styles.header}>
          <Text style={styles.title} allowFontScaling={false}>Property Owners</Text>
          <Text style={styles.subtitle} allowFontScaling={false}>
            Manage owner contacts, properties owned, and payout preferences.
          </Text>
        </View>

        {/* Search Bar & + Add Owner Button */}
        <View style={styles.actionRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search owners..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addBtnText} allowFontScaling={false}>Add Owner</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main List */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchLiveOwnersData} tintColor="#38bdf8" />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Summary Count Bar */}
          <View style={styles.countRow}>
            <Text style={styles.countText} allowFontScaling={false}>
              SHOWING {filteredOwners.length} {filteredOwners.length === 1 ? 'OWNER' : 'OWNERS'}
            </Text>
          </View>

          {/* List or Empty State */}
          {filteredOwners.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={48} color="#64748b" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText} allowFontScaling={false}>No Owners Found</Text>
              <Text style={styles.emptySubText} allowFontScaling={false}>
                {searchQuery ? 'Try clearing your search query.' : 'Tap "+ Add Owner" to create a new property owner.'}
              </Text>
            </View>
          ) : (
            filteredOwners.map((item, idx) => {
              const count = getOwnerPropertiesCount(item);
              const initial =
                item && item.name && typeof item.name === 'string' && item.name.length > 0
                  ? item.name.charAt(0).toUpperCase()
                  : 'O';

              return (
                <View key={item.id || `owner-${idx}`} style={styles.card}>
                  {/* Card Header: Avatar, Name, Payout */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText} allowFontScaling={false}>{initial}</Text>
                    </View>

                    <View style={styles.ownerInfo}>
                      <Text style={styles.ownerName} allowFontScaling={false}>{item.name}</Text>
                      <View style={styles.payoutBadge}>
                        <Ionicons name="card-outline" size={11} color="#38bdf8" style={{ marginRight: 4 }} />
                        <Text style={styles.payoutText} allowFontScaling={false}>
                          {item.payoutMethod || 'ACH/Direct Deposit'}
                        </Text>
                      </View>
                    </View>

                    {/* 3 Action Buttons matching Web: View (Green), Edit (Blue), Delete (Red) */}
                    <View style={styles.actionsContainer}>
                      <TouchableOpacity
                        style={styles.actionBtnView}
                        onPress={() => handleOpenView(item)}
                        activeOpacity={0.7}
                        title="View Details"
                      >
                        <Ionicons name="eye-outline" size={17} color="#10b981" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtnEdit}
                        onPress={() => handleOpenEdit(item)}
                        activeOpacity={0.7}
                        title="Edit Owner"
                      >
                        <Ionicons name="pencil-outline" size={16} color="#3b82f6" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtnDelete}
                        onPress={() => setDeleteOwner(item)}
                        activeOpacity={0.7}
                        title="Delete Owner"
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  {/* Metadata: Email, Phone & Properties Count */}
                  <View style={styles.metaGrid}>
                    <View style={styles.metaItem}>
                      <Ionicons name="mail-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                      <Text style={styles.metaLabel} numberOfLines={1} allowFontScaling={false}>
                        {item.email || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.metaItem}>
                      <Ionicons name="call-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                      <Text style={styles.metaLabel} numberOfLines={1} allowFontScaling={false}>
                        {item.phone || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.propertiesOwnedRow}>
                    <View style={styles.propertiesCountBadge}>
                      <Ionicons name="business" size={13} color="#38bdf8" style={{ marginRight: 6 }} />
                      <Text style={styles.propertiesCountText} allowFontScaling={false}>
                        <Text style={{ fontWeight: '900', color: '#38bdf8' }}>{count}</Text> Properties Owned
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>

      {/* VIEW OWNER DETAILS MODAL */}
      <Modal visible={viewingOwner !== null} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.viewModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="person-circle-outline" size={24} color="#38bdf8" />
                <Text style={styles.modalTitle} allowFontScaling={false}>Owner Details</Text>
              </View>
              <TouchableOpacity onPress={() => setViewingOwner(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {viewingOwner && (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel} allowFontScaling={false}>FULL NAME</Text>
                  <Text style={styles.detailValue} allowFontScaling={false}>{viewingOwner.name}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel} allowFontScaling={false}>EMAIL ADDRESS</Text>
                  <Text style={styles.detailValue} allowFontScaling={false}>{viewingOwner.email}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel} allowFontScaling={false}>PHONE NUMBER</Text>
                  <Text style={styles.detailValue} allowFontScaling={false}>{viewingOwner.phone || 'N/A'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel} allowFontScaling={false}>PAYOUT METHOD</Text>
                  <Text style={styles.detailValue} allowFontScaling={false}>
                    {viewingOwner.payoutMethod || 'ACH/Direct Deposit'}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel} allowFontScaling={false}>
                    OWNED PROPERTIES ({getPropertiesForOwner(viewingOwner).length})
                  </Text>
                  <View style={styles.propsTagContainer}>
                    {getPropertiesForOwner(viewingOwner).length === 0 ? (
                      <Text style={styles.noPropsText} allowFontScaling={false}>No properties assigned.</Text>
                    ) : (
                      getPropertiesForOwner(viewingOwner).map((p) => (
                        <View key={p.id} style={styles.propTag}>
                          <Ionicons name="business-outline" size={12} color="#38bdf8" style={{ marginRight: 4 }} />
                          <Text style={styles.propTagText} allowFontScaling={false}>{p.name}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.primaryCloseBtn} onPress={() => setViewingOwner(null)}>
                <Text style={styles.primaryCloseBtnText} allowFontScaling={false}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD / EDIT OWNER MODAL */}
      <Modal visible={isFormModalOpen} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.formModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>
                {editingOwner ? 'Edit Property Owner' : 'Add Property Owner'}
              </Text>
              <TouchableOpacity onPress={() => setIsFormModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
                {/* Full Name */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>FULL NAME *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Jane Doe"
                    placeholderTextColor="#64748b"
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>

                {/* Email */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>EMAIL ADDRESS *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="jane.doe@example.com"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                {/* Password */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>
                    PASSWORD {editingOwner ? '(leave blank to keep current)' : ''}
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    autoCapitalize="none"
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                {/* Phone */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>PHONE NUMBER</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="(555) 555-0100"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                {/* Payout Method */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>PAYOUT METHOD</Text>
                  <TouchableOpacity
                    style={styles.dropdownBtn}
                    onPress={() => setShowPayoutDropdown(!showPayoutDropdown)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownBtnText} allowFontScaling={false}>{payoutMethod}</Text>
                    <Ionicons
                      name={showPayoutDropdown ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>

                  {showPayoutDropdown && (
                    <View style={styles.dropdownMenu}>
                      {payoutOptions.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.dropdownItem, payoutMethod === opt && styles.dropdownItemActive]}
                          onPress={() => {
                            setPayoutMethod(opt);
                            setShowPayoutDropdown(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              payoutMethod === opt && { color: '#38bdf8', fontWeight: '700' },
                            ]}
                            allowFontScaling={false}
                          >
                            {opt}
                          </Text>
                          {payoutMethod === opt && (
                            <Ionicons name="checkmark" size={16} color="#38bdf8" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Assign Properties */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>ASSIGN PROPERTIES</Text>
                  <View style={styles.propsCheckContainer}>
                    <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {properties.length === 0 ? (
                        <Text style={styles.noPropsText} allowFontScaling={false}>No properties created yet.</Text>
                      ) : (
                        properties.map((p) => {
                          const isChecked = selectedPropertyIds.includes(p.id);
                          return (
                            <TouchableOpacity
                              key={p.id}
                              style={styles.propCheckRow}
                              onPress={() => togglePropertySelection(p.id)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.checkBox, isChecked && styles.checkBoxActive]}>
                                {isChecked && <Ionicons name="checkmark" size={12} color="#ffffff" />}
                              </View>
                              <Text style={styles.propCheckName} allowFontScaling={false}>{p.name}</Text>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.formFooter}>
                <TouchableOpacity
                  style={styles.cancelFormBtn}
                  onPress={() => setIsFormModalOpen(false)}
                  disabled={submitting}
                >
                  <Text style={styles.cancelFormBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitFormBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleSubmitForm}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitFormBtnText} allowFontScaling={false}>
                      {editingOwner ? 'Save Changes' : 'Create Owner'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <Modal visible={deleteOwner !== null} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.deleteModalCard}>
            <View style={styles.deleteIconWrap}>
              <Ionicons name="warning-outline" size={32} color="#ef4444" />
            </View>
            <Text style={styles.deleteTitle} allowFontScaling={false}>Delete Owner</Text>
            <Text style={styles.deleteDesc} allowFontScaling={false}>
              Are you sure you want to delete owner "{deleteOwner?.name}"? This action cannot be undone.
            </Text>

            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.deleteCancelBtn}
                onPress={() => setDeleteOwner(null)}
                disabled={deleting}
              >
                <Text style={styles.deleteCancelBtnText} allowFontScaling={false}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteConfirmBtn, deleting && { opacity: 0.6 }]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.deleteConfirmBtnText} allowFontScaling={false}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default OwnersScreen;

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 60 },
    center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: colors.textSecondary, marginTop: 10, fontSize: 13, fontWeight: '600' },

    topSection: {
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 48 : 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    header: { marginBottom: 12 },
    title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
    subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 3, lineHeight: 17 },

    actionRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 42,
    },
    searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13, padding: 0 },
    addBtn: {
      backgroundColor: '#2563eb',
      paddingHorizontal: 14,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 42,
      shadowColor: '#2563eb',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

    countRow: { marginVertical: 12 },
    countText: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },

    emptyCard: {
      backgroundColor: colors.surface,
      padding: 36,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginTop: 20,
    },
    emptyText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
    emptySubText: { color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' },

    // Owner Card
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    cardTopRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#38bdf8',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: { color: '#0f172a', fontSize: 18, fontWeight: '800' },
    ownerInfo: { flex: 1 },
    ownerName: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    payoutBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
    payoutText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },

    actionsContainer: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    actionBtnView: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnEdit: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnDelete: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    cardDivider: { height: 1, backgroundColor: colors.divider, marginVertical: 12 },

    metaGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    metaItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    metaLabel: { fontSize: 12, color: colors.textSecondary },

    propertiesOwnedRow: { marginTop: 10 },
    propertiesCountBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.25)',
      borderRadius: 8,
      paddingVertical: 5,
      paddingHorizontal: 10,
      alignSelf: 'flex-start',
    },
    propertiesCountText: { fontSize: 12, color: colors.textPrimary, fontWeight: '600' },

    // Modal Styling
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 44 : 20,
    },
    viewModalCard: {
      width: '100%',
      maxWidth: 440,
      maxHeight: '88%',
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    formModalCard: {
      width: '100%',
      maxWidth: 440,
      maxHeight: '88%',
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      paddingBottom: 14,
      marginBottom: 14,
    },
    modalTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
    modalCloseBtn: { padding: 4 },

    detailSection: { marginBottom: 14 },
    detailLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, marginBottom: 4 },
    detailValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      backgroundColor: colors.inputBackground,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    propsTagContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      backgroundColor: colors.inputBackground,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    propTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      borderColor: 'rgba(56, 189, 248, 0.3)',
      borderWidth: 1,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    propTagText: { fontSize: 11, color: '#38bdf8', fontWeight: '700' },
    noPropsText: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },

    modalFooter: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 14, alignItems: 'flex-end' },
    primaryCloseBtn: { backgroundColor: '#38bdf8', paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10 },
    primaryCloseBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 13 },

    // Form inputs
    formGroup: { marginBottom: 14 },
    formLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, marginBottom: 6 },
    formInput: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 42,
      color: colors.textPrimary,
      fontSize: 13,
    },

    dropdownBtn: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 42,
    },
    dropdownBtnText: { fontSize: 13, color: colors.textPrimary },
    dropdownMenu: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      marginTop: 4,
      overflow: 'hidden',
    },
    dropdownItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    dropdownItemActive: { backgroundColor: 'rgba(56, 189, 248, 0.08)' },
    dropdownItemText: { fontSize: 12.5, color: colors.textSecondary },

    propsCheckContainer: {
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      padding: 10,
      maxHeight: 140,
    },
    propCheckRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
    checkBox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: colors.textMuted,
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkBoxActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
    propCheckName: { fontSize: 12.5, color: colors.textPrimary, fontWeight: '600' },

    formFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingTop: 14,
    },
    cancelFormBtn: {
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cancelFormBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
    submitFormBtn: {
      backgroundColor: '#2563eb',
      paddingVertical: 9,
      paddingHorizontal: 18,
      borderRadius: 10,
      minWidth: 110,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitFormBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },

    // Delete Modal
    deleteModalCard: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 22,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    deleteIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    deleteTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
    deleteDesc: { fontSize: 12.5, color: colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
    deleteActions: { flexDirection: 'row', gap: 10, width: '100%' },
    deleteCancelBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
    },
    deleteCancelBtnText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
    deleteConfirmBtn: {
      flex: 1,
      backgroundColor: '#ef4444',
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteConfirmBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  });

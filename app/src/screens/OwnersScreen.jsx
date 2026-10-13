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

export const OwnersScreen = () => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const [owners, setOwners] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState(null);

  // Add Owner Modal Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('ACH/Direct Deposit');
  const [selectedPropertyIds, setSelectedPropertyIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown selector state
  const [showPayoutDropdown, setShowPayoutDropdown] = useState(false);

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

  // Fetch live owners & properties
  const fetchLiveOwnersData = async () => {
    try {
      setLoading(true);
      const [ownersRes, propsRes] = await Promise.all([
        apiClient.get('/owners', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/properties', logout, refreshAccessToken).catch(() => null),
      ]);

      const rawOwners = Array.isArray(ownersRes) ? ownersRes : (ownersRes?.data || []);
      const rawProps = Array.isArray(propsRes) ? propsRes : (propsRes?.data || []);

      setOwners(rawOwners);
      setProperties(rawProps);
    } catch (e) {
      console.log('Error fetching owners/properties:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  useEffect(() => {
    fetchLiveOwnersData();
  }, []);

  const handleDeleteOwner = (id, name) => {
    Alert.alert(
      'Delete Owner',
      `Are you sure you want to delete owner "${name}"? This will clear all associated properties, distributions and documents from the portfolio.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await apiClient.delete(`/owners/${id}`, logout, refreshAccessToken);
              Alert.alert('Success', 'Owner deleted successfully');
              fetchLiveOwnersData();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete owner');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateOwner = async () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert('Validation Error', 'Full Name and Email are required.');
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
        password: password.trim() || undefined,
        phone: phone.trim() || undefined,
        payoutMethod,
        propertiesOwned: selectedPropertyIds,
      };

      await apiClient.post('/owners', payload, logout, refreshAccessToken);
      
      Alert.alert('Success', 'Property Owner registered successfully.');
      setIsAddOpen(false);
      
      // Reset state
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setPayoutMethod('ACH/Direct Deposit');
      setSelectedPropertyIds([]);
      
      // Refresh
      fetchLiveOwnersData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to register property owner');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePropertySelection = (propId) => {
    if (selectedPropertyIds.includes(propId)) {
      setSelectedPropertyIds(selectedPropertyIds.filter(id => id !== propId));
    } else {
      setSelectedPropertyIds([...selectedPropertyIds, propId]);
    }
  };

  // --- Edit Owner Handlers ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOwnerId, setEditingOwnerId] = useState(null);

  const handleOpenEditOwner = (item) => {
    setEditingOwnerId(item.id);
    setFullName(item.name || '');
    setEmail(item.email || '');
    setPassword(''); // blank keeps current
    setPhone(item.phone || '');
    setPayoutMethod(item.payoutMethod || 'ACH/Direct Deposit');
    const assignedIds = (item.properties || []).map(p => p.id);
    setSelectedPropertyIds(assignedIds);
    setIsEditOpen(true);
  };

  const handleUpdateOwner = async () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert('Validation Error', 'Full Name and Email are required.');
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
        password: password.trim() ? password.trim() : undefined,
        phone: phone.trim() || undefined,
        payoutMethod,
        propertiesOwned: selectedPropertyIds,
      };

      await apiClient.put(`/owners/${editingOwnerId}`, payload, logout, refreshAccessToken);
      
      Alert.alert('Success', 'Property Owner updated successfully.');
      setIsEditOpen(false);
      
      // Reset state
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setPayoutMethod('ACH/Direct Deposit');
      setSelectedPropertyIds([]);
      
      fetchLiveOwnersData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update property owner');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOwners = owners.filter((item) => {
    const text = `${item.name || ''} ${item.email || ''} ${item.phone || ''}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const payoutOptions = ['ACH/Direct Deposit', 'Wire Transfer', 'Check'];

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>Loading Owners Directory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      {/* Header & Search controls (Fixed) */}
      <View style={{ paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 48 : 16 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} allowFontScaling={false}>Property Owners</Text>
          <Text style={styles.subtitle} allowFontScaling={false}>
            Manage investor contacts, portfolios properties, payout accounts, and active profiles.
          </Text>
        </View>

        {/* Search Bar & Add Button */}
        <View style={[styles.searchBarRow, { marginBottom: 12 }]}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search owners by name or email..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddOpen(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color="#0f172a" />
            <Text style={styles.addBtnText} allowFontScaling={false}>Add Owner</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLiveOwnersData} tintColor="#38bdf8" />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Section title */}

          {/* Section title */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} allowFontScaling={false}>
              REGISTERED INVESTORS ({filteredOwners.length})
            </Text>
          </View>

          {/* Owners Cards List */}
          {filteredOwners.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="person-remove-outline" size={48} color="#475569" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyText} allowFontScaling={false}>No owners registered</Text>
              <Text style={styles.emptySubText} allowFontScaling={false}>Tap "Add Owner" to create a new profile.</Text>
            </View>
          ) : (
            filteredOwners.map((item, idx) => {
              const initial = item.name ? item.name.charAt(0).toUpperCase() : 'O';
              const pCount = item.properties?.length || item.propertiesOwnedCount || 0;
              return (
                <View key={item.id || `owner-${idx}`} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText} allowFontScaling={false}>{initial}</Text>
                    </View>
                    <View style={styles.ownerInfo}>
                      <Text style={styles.ownerName} allowFontScaling={false}>{item.name}</Text>
                      <Text style={styles.ownerSubText} allowFontScaling={false}>Payout: {item.payoutMethod || 'Direct Deposit'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => handleOpenEditOwner(item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="create-outline" size={18} color="#f59e0b" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteOwner(item.id, item.name)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Owner specs fields */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaCol}>
                      <Ionicons name="mail-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                      <Text style={styles.metaText} allowFontScaling={false} numberOfLines={1}>
                        {item.email}
                      </Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Ionicons name="call-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                      <Text style={styles.metaText} allowFontScaling={false} numberOfLines={1}>
                        {item.phone || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.metaRow, { marginTop: 6 }]}>
                    <View style={styles.metaCol}>
                      <Ionicons name="business-outline" size={13} color="#38bdf8" style={{ marginRight: 6 }} />
                      <Text style={[styles.metaText, { color: '#38bdf8', fontWeight: '800' }]} allowFontScaling={false}>
                        {pCount} Properties Managed
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>

      {/* MODAL: Add Property Owner */}
      <Modal visible={isAddOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBg}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Add Property Owner</Text>
                <TouchableOpacity onPress={() => setIsAddOpen(false)}>
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalScroll} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Form Input fields */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>FULL NAME</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Jane Doe"
                    placeholderTextColor="#64748b"
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>EMAIL</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="staff@gmail.com"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>PASSWORD</Text>
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

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>PHONE</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="(555) 555-0100"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                {/* PAYOUT METHOD Selector */}
                <View style={[styles.formGroup, showPayoutDropdown && { zIndex: 9999, position: 'relative' }]}>
                  <Text style={styles.formLabel} allowFontScaling={false}>PAYOUT METHOD</Text>
                  <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={() => setShowPayoutDropdown(!showPayoutDropdown)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownTriggerText} allowFontScaling={false}>{payoutMethod}</Text>
                    <Ionicons name={showPayoutDropdown ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                  </TouchableOpacity>

                  {showPayoutDropdown && (
                    <View style={styles.dropdownContainer}>
                      {payoutOptions.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setPayoutMethod(opt);
                            setShowPayoutDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText} allowFontScaling={false}>{opt}</Text>
                          {payoutMethod === opt && (
                            <Ionicons name="checkmark" size={16} color="#38bdf8" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* ASSIGN PROPERTIES Checkbox List */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>ASSIGN PROPERTIES</Text>
                  <View style={styles.checkboxContainer}>
                    {properties.length === 0 ? (
                      <Text style={styles.noPropertiesText} allowFontScaling={false}>No properties created yet.</Text>
                    ) : (
                      properties.map((prop) => {
                        const isChecked = selectedPropertyIds.includes(prop.id);
                        return (
                          <TouchableOpacity
                            key={prop.id}
                            style={styles.checkboxRow}
                            onPress={() => togglePropertySelection(prop.id)}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.checkboxBox, isChecked && styles.checkboxBoxChecked]}>
                              {isChecked && (
                                <Ionicons name="checkmark" size={12} color="#0f172a" />
                              )}
                            </View>
                            <Text style={styles.checkboxLabel} allowFontScaling={false}>{prop.name}</Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                </View>

                {/* Cancel & Create Buttons inside ScrollView */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setIsAddOpen(false)}
                    disabled={submitting}
                  >
                    <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                    onPress={handleCreateOwner}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#0f172a" />
                    ) : (
                      <Text style={styles.submitBtnText} allowFontScaling={false}>Create Owner</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: Edit Property Owner */}
      <Modal visible={isEditOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBg}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Edit Property Owner</Text>
                <TouchableOpacity onPress={() => setIsEditOpen(false)}>
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalScroll} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Form Input fields */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>FULL NAME</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Jane Doe"
                    placeholderTextColor="#64748b"
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>EMAIL</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="staff@gmail.com"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>PASSWORD (leave blank to keep current)</Text>
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

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>PHONE</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="(555) 555-0100"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                {/* PAYOUT METHOD Selector */}
                <View style={[styles.formGroup, showPayoutDropdown && { zIndex: 9999, position: 'relative' }]}>
                  <Text style={styles.formLabel} allowFontScaling={false}>PAYOUT METHOD</Text>
                  <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={() => setShowPayoutDropdown(!showPayoutDropdown)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownTriggerText} allowFontScaling={false}>{payoutMethod}</Text>
                    <Ionicons name={showPayoutDropdown ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                  </TouchableOpacity>

                  {showPayoutDropdown && (
                    <View style={styles.dropdownContainer}>
                      {payoutOptions.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setPayoutMethod(opt);
                            setShowPayoutDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText} allowFontScaling={false}>{opt}</Text>
                          {payoutMethod === opt && (
                            <Ionicons name="checkmark" size={16} color="#38bdf8" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* ASSIGN PROPERTIES Checkbox List */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>ASSIGN PROPERTIES</Text>
                  <View style={styles.checkboxContainer}>
                    {properties.length === 0 ? (
                      <Text style={styles.noPropertiesText} allowFontScaling={false}>No properties created yet.</Text>
                    ) : (
                      properties.map((prop) => {
                        const isChecked = selectedPropertyIds.includes(prop.id);
                        return (
                          <TouchableOpacity
                            key={prop.id}
                            style={styles.checkboxRow}
                            onPress={() => togglePropertySelection(prop.id)}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.checkboxBox, isChecked && styles.checkboxBoxChecked]}>
                              {isChecked && (
                                <Ionicons name="checkmark" size={12} color="#0f172a" />
                              )}
                            </View>
                            <Text style={styles.checkboxLabel} allowFontScaling={false}>{prop.name}</Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                </View>

                {/* Cancel & Update Buttons inside ScrollView */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setIsEditOpen(false)}
                    disabled={submitting}
                  >
                    <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                    onPress={handleUpdateOwner}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#0f172a" />
                    ) : (
                      <Text style={styles.submitBtnText} allowFontScaling={false}>Update Owner</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 8 },

  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 11.5, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },

  searchBarRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchInput: {
    color: colors.textPrimary,
    fontSize: 12,
    flex: 1,
    height: 40,
    padding: 0,
  },
  addBtn: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 40,
  },
  addBtnText: { color: '#0f172a', fontSize: 12, fontWeight: '800' },

  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },

  emptyCard: { backgroundColor: colors.surface, padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  emptyText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  emptySubText: { color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  ownerInfo: { flex: 1 },
  ownerName: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  ownerSubText: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(239, 68, 68, 0.12)', alignItems: 'center', justifyContent: 'center' },
  editBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(245, 158, 11, 0.12)', alignItems: 'center', justifyContent: 'center' },

  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 12 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaCol: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  metaText: { fontSize: 12, color: colors.textSecondary },

  // MODAL STYLING
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.cardBorder, maxHeight: '85%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },

  modalScroll: { marginBottom: 16 },
  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 6 },
  formInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: colors.textPrimary,
    fontSize: 13,
  },

  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  dropdownTriggerText: { color: colors.textPrimary, fontSize: 13 },
  dropdownContainer: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    zIndex: 9999,
    elevation: 5,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  dropdownItemText: { color: colors.textSecondary, fontSize: 12.5 },

  checkboxContainer: {
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 10,
  },
  noPropertiesText: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    borderColor: '#38bdf8',
    backgroundColor: '#38bdf8',
  },
  checkboxLabel: { color: colors.textSecondary, fontSize: 12.5 },

  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 14 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.inputBorder },
  cancelBtnText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '700' },
  submitBtn: { backgroundColor: '#38bdf8', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, minWidth: 100, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#0f172a', fontSize: 12.5, fontWeight: '800' },
});

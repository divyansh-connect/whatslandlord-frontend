import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

// Animated Touchable with spring effect
const AnimatedTouchable = ({ children, onPress, style, disabled }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 25,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 4,
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

export const RestoreBinScreen = ({ onNavigate }) => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [processingId, setProcessingId] = useState(null);
  const [isEmptying, setIsEmptying] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const toastAnim = useRef(new Animated.Value(-60)).current;

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 10,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(toastAnim, {
        toValue: -60,
        duration: 250,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastMessage(null);
    });
  };

  const runEntryAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Fetch soft-deleted items from live API
  const fetchBinItems = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/restore-bin', logout, refreshAccessToken);
      const rawList = Array.isArray(res) ? res : res?.data || [];
      setItems(rawList);
      runEntryAnimation();
    } catch (e) {
      console.warn('Failed to fetch restore-bin items:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBinItems();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBinItems();
  };

  // Restore an item
  const handleRestore = async (item) => {
    try {
      setProcessingId(item.id);
      await apiClient.post(
        `/restore-bin/${item.id}/restore`,
        {
          entityType: item.entityType,
          entityId: item.entityId,
          data: item.data,
        },
        logout,
        refreshAccessToken
      );

      // Optimistic update
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast(`Restored "${item.title || item.entityType}" successfully!`, 'success');
    } catch (e) {
      Alert.alert('Restore Failed', e?.message || 'Could not restore this item.');
    } finally {
      setProcessingId(null);
    }
  };

  // Permanent Delete an item
  const handlePermanentDelete = (item) => {
    Alert.alert(
      'Permanent Delete',
      `Are you sure you want to permanently delete "${item.title || item.entityType}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingId(item.id);
              await apiClient.delete(`/restore-bin/${item.id}`, logout, refreshAccessToken);
              setItems((prev) => prev.filter((i) => i.id !== item.id));
              showToast(`"${item.title || item.entityType}" permanently deleted.`, 'info');
            } catch (e) {
              Alert.alert('Delete Failed', e?.message || 'Could not delete item.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  // Empty Entire Bin
  const handleEmptyBin = () => {
    if (items.length === 0) return;
    Alert.alert(
      'Empty Restore Bin',
      `Are you sure you want to permanently delete ALL ${items.length} items? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty All',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsEmptying(true);
              await apiClient.delete('/restore-bin/actions/empty', logout, refreshAccessToken);
              setItems([]);
              showToast('Restore bin has been emptied.', 'info');
            } catch (e) {
              Alert.alert('Failed', e?.message || 'Could not empty restore bin.');
            } finally {
              setIsEmptying(false);
            }
          },
        },
      ]
    );
  };

  // Category Configuration & Count Map
  const categories = [
    { key: 'all', label: 'All', icon: 'layers-outline' },
    { key: 'property', label: 'Properties', icon: 'business-outline' },
    { key: 'unit', label: 'Units', icon: 'home-outline' },
    { key: 'tenant', label: 'Tenants', icon: 'people-outline' },
    { key: 'owner', label: 'Owners', icon: 'person-circle-outline' },
    { key: 'lease', label: 'Leases', icon: 'document-text-outline' },
    { key: 'invoice', label: 'Invoices', icon: 'receipt-outline' },
    { key: 'workorder', label: 'Work Orders', icon: 'hammer-outline' },
    { key: 'payment', label: 'Payments', icon: 'card-outline' },
  ];

  // Entity metadata styling helper
  const getEntityMeta = (entityType = '') => {
    const type = entityType.toLowerCase();
    switch (type) {
      case 'property':
        return {
          label: 'Property',
          icon: 'business-outline',
          badgeBg: isDarkMode ? 'rgba(56, 189, 248, 0.18)' : '#e0f2fe',
          badgeText: '#0284c7',
        };
      case 'unit':
        return {
          label: 'Unit',
          icon: 'home-outline',
          badgeBg: isDarkMode ? 'rgba(99, 102, 241, 0.18)' : '#ede9fe',
          badgeText: '#6366f1',
        };
      case 'tenant':
        return {
          label: 'Tenant',
          icon: 'people-outline',
          badgeBg: isDarkMode ? 'rgba(16, 185, 129, 0.18)' : '#d1fae5',
          badgeText: '#059669',
        };
      case 'owner':
        return {
          label: 'Owner',
          icon: 'person-circle-outline',
          badgeBg: isDarkMode ? 'rgba(168, 85, 247, 0.18)' : '#f3e8ff',
          badgeText: '#9333ea',
        };
      case 'lease':
        return {
          label: 'Lease',
          icon: 'document-text-outline',
          badgeBg: isDarkMode ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7',
          badgeText: '#d97706',
        };
      case 'invoice':
        return {
          label: 'Invoice',
          icon: 'receipt-outline',
          badgeBg: isDarkMode ? 'rgba(244, 63, 94, 0.18)' : '#ffe4e6',
          badgeText: '#e11d48',
        };
      case 'payment':
        return {
          label: 'Payment',
          icon: 'card-outline',
          badgeBg: isDarkMode ? 'rgba(20, 184, 166, 0.18)' : '#ccfbf1',
          badgeText: '#0d9488',
        };
      case 'workorder':
      case 'servicerequest':
        return {
          label: 'Maintenance',
          icon: 'hammer-outline',
          badgeBg: isDarkMode ? 'rgba(249, 115, 22, 0.18)' : '#ffedd5',
          badgeText: '#ea580c',
        };
      default:
        return {
          label: entityType || 'Item',
          icon: 'cube-outline',
          badgeBg: isDarkMode ? 'rgba(148, 163, 184, 0.18)' : '#f1f5f9',
          badgeText: '#64748b',
        };
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!item) return false;
      const typeMatch =
        selectedType === 'all' ||
        (item.entityType || '').toLowerCase().replace(/[\s_-]/g, '') ===
          selectedType.toLowerCase().replace(/[\s_-]/g, '');

      const q = searchQuery.toLowerCase().trim();
      const searchMatch =
        !q ||
        (item.title || '').toLowerCase().includes(q) ||
        (item.subtitle || '').toLowerCase().includes(q) ||
        (item.entityType || '').toLowerCase().includes(q) ||
        (item.deletedBy || '').toLowerCase().includes(q);

      return typeMatch && searchMatch;
    });
  }, [items, selectedType, searchQuery]);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText} allowFontScaling={false}>
          Loading Restore Bin...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <Animated.View
          style={[
            styles.toastBanner,
            toastMessage.type === 'info' ? styles.toastInfo : styles.toastSuccess,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <Ionicons
            name={toastMessage.type === 'info' ? 'information-circle' : 'checkmark-circle'}
            size={18}
            color="#ffffff"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.toastText} allowFontScaling={false} numberOfLines={2}>
            {toastMessage.text}
          </Text>
        </Animated.View>
      )}

      <ScrollView
        style={styles.mainWrapper}
        contentContainerStyle={styles.outerContentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <View style={styles.titleArea}>
                {!!onNavigate && (
                  <TouchableOpacity
                    onPress={() => onNavigate('dashboard')}
                    style={styles.backBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
                  </TouchableOpacity>
                )}
                <View style={styles.titleRow}>
                  <Text style={styles.title} allowFontScaling={false}>
                    Restore Bin
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText} allowFontScaling={false}>
                      {items.length}
                    </Text>
                  </View>
                </View>
              </View>

              {items.length > 0 && (
                <TouchableOpacity
                  style={[styles.emptyBinBtn, isEmptying && { opacity: 0.6 }]}
                  onPress={handleEmptyBin}
                  disabled={isEmptying}
                  activeOpacity={0.7}
                >
                  {isEmptying ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={15} color="#ef4444" style={{ marginRight: 5 }} />
                      <Text style={styles.emptyBinBtnText} allowFontScaling={false}>
                        Empty Bin
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.subtitle, { marginLeft: onNavigate ? 44 : 0 }]} allowFontScaling={false}>
              Recover or permanently purge deleted items
            </Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by title, entity, or who deleted..."
              placeholderTextColor={colors.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
              autoCapitalize="none"
              autoCorrect={false}
              allowFontScaling={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsContainer}
            style={styles.filterPillsScroll}
          >
            {categories.map((cat) => {
              const isActive = selectedType === cat.key;
              const count =
                cat.key === 'all'
                  ? items.length
                  : items.filter(
                      (i) =>
                        (i.entityType || '').toLowerCase().replace(/[\s_-]/g, '') ===
                        cat.key.replace(/[\s_-]/g, '')
                    ).length;

              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setSelectedType(cat.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={cat.icon}
                    size={14}
                    color={isActive ? '#ffffff' : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[styles.filterPillText, isActive && styles.filterPillTextActive]}
                    allowFontScaling={false}
                  >
                    {cat.label}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.pillBadge, isActive && styles.pillBadgeActive]}>
                      <Text
                        style={[styles.pillBadgeText, isActive && styles.pillBadgeTextActive]}
                        allowFontScaling={false}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Items Section */}
          {filteredItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="refresh-circle-outline" size={48} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle} allowFontScaling={false}>
                Restore Bin is Empty
              </Text>
              <Text style={styles.emptySubtitle} allowFontScaling={false}>
                {searchQuery || selectedType !== 'all'
                  ? 'No deleted items found matching your filters.'
                  : 'Items deleted from Properties, Tenants, Invoices, etc. will appear here and can be recovered anytime.'}
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {filteredItems.map((item) => {
                const meta = getEntityMeta(item.entityType);
                const isProcessing = processingId === item.id;

                return (
                  <View key={item.id} style={styles.itemCard}>
                    {/* Card Top: Type Badge & Date */}
                    <View style={styles.cardTopRow}>
                      <View style={[styles.entityBadge, { backgroundColor: meta.badgeBg }]}>
                        <Ionicons
                          name={meta.icon}
                          size={13}
                          color={meta.badgeText}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[styles.entityBadgeText, { color: meta.badgeText }]}
                          allowFontScaling={false}
                        >
                          {meta.label.toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.dateRow}>
                        <Ionicons name="time-outline" size={13} color={colors.textMuted} style={{ marginRight: 3 }} />
                        <Text style={styles.dateText} allowFontScaling={false}>
                          {formatDate(item.deletedAt || item.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {/* Card Middle: Title & Subtitle */}
                    <View style={styles.cardBody}>
                      <Text style={styles.itemTitle} numberOfLines={2} allowFontScaling={false}>
                        {item.title || `${item.entityType} #${(item.entityId || '').substring(0, 8)}`}
                      </Text>

                      {!!item.subtitle && (
                        <Text style={styles.itemSubtitle} numberOfLines={2} allowFontScaling={false}>
                          {item.subtitle}
                        </Text>
                      )}

                      {/* Deleted By Attribution */}
                      <View style={styles.attributionRow}>
                        <Ionicons name="person-outline" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                        <Text style={styles.attributionText} allowFontScaling={false}>
                          Deleted by <Text style={{ fontWeight: '700', color: colors.textSecondary }}>{item.deletedBy || 'Property Manager'}</Text>
                        </Text>
                      </View>
                    </View>

                    {/* Card Bottom: Actions */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={[styles.permanentDeleteBtn, isProcessing && { opacity: 0.5 }]}
                        onPress={() => handlePermanentDelete(item)}
                        disabled={isProcessing}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={15} color="#ef4444" style={{ marginRight: 4 }} />
                        <Text style={styles.permanentDeleteBtnText} allowFontScaling={false}>
                          Delete
                        </Text>
                      </TouchableOpacity>

                      <AnimatedTouchable
                        style={[styles.restoreBtn, isProcessing && { opacity: 0.7 }]}
                        onPress={() => handleRestore(item)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="refresh-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                            <Text style={styles.restoreBtnText} allowFontScaling={false}>
                              Restore Item
                            </Text>
                          </>
                        )}
                      </AnimatedTouchable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 60 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    mainWrapper: {
      flex: 1,
      backgroundColor: colors.background,
    },
    outerContentContainer: {
      padding: 16,
      paddingTop: Platform.OS === 'ios' ? 56 : ((StatusBar.currentHeight || 24) + 14),
      paddingBottom: 60,
    },
    center: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loadingText: {
      color: colors.textSecondary,
      marginTop: 12,
      fontSize: 14,
      fontWeight: '600',
    },

    // Toast Banner
    toastBanner: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : 20,
      left: 16,
      right: 16,
      zIndex: 999,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    toastSuccess: {
      backgroundColor: '#10b981',
    },
    toastInfo: {
      backgroundColor: '#0284c7',
    },
    toastText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
      flex: 1,
    },

    // Header
    header: {
      marginBottom: 16,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    titleArea: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 10,
    },
    backBtn: {
      marginRight: 10,
      padding: 6,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    countBadge: {
      backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.2)' : '#e0f2fe',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    countBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
    emptyBinBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fee2e2',
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5',
    },
    emptyBinBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#ef4444',
    },

    // Search
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
      padding: 0,
    },

    // Filters
    filterPillsScroll: {
      marginBottom: 16,
    },
    filterPillsContainer: {
      gap: 8,
      paddingVertical: 2,
    },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    filterPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    filterPillTextActive: {
      color: '#ffffff',
    },
    pillBadge: {
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f1f5f9',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 10,
      marginLeft: 6,
    },
    pillBadgeActive: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    pillBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    pillBadgeTextActive: {
      color: '#ffffff',
    },

    // Empty state
    emptyContainer: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 36,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginTop: 8,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.1)' : '#e0f2fe',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },

    // Items List & Cards
    itemsList: {
      gap: 12,
    },
    itemCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDarkMode ? 0.3 : 0.04,
          shadowRadius: 6,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    entityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    entityBadgeText: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dateText: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '500',
    },

    // Card Body
    cardBody: {
      marginBottom: 14,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    itemSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 17,
    },
    attributionRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    attributionText: {
      fontSize: 11,
      color: colors.textMuted,
    },

    // Card Actions
    cardActionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      gap: 10,
    },
    permanentDeleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2',
    },
    permanentDeleteBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#ef4444',
    },
    restoreBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 10,
      ...Platform.select({
        ios: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    restoreBtnText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '800',
    },
  });

export default RestoreBinScreen;

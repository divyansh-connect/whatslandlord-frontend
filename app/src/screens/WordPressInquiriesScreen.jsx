import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../api/client';
import { useThemeColors } from '../theme';

export const WordPressInquiriesScreen = () => {
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/superadmin/wordpress-inquiries');
      if (res && res.data) {
        setInquiries(res.data);
      } else if (Array.isArray(res)) {
        setInquiries(res);
      } else {
        setInquiries([]);
      }
    } catch (err) {
      console.log('WordPress Inquiries fetch error:', err.message);
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedInquiry) return;
    setUpdating(true);
    try {
      await apiClient.put(`/superadmin/wordpress-inquiries/${selectedInquiry.id}`, { status: newStatus });
      setInquiries((prev) =>
        prev.map((item) => (item.id === selectedInquiry.id ? { ...item, status: newStatus } : item))
      );
      setSelectedInquiry((prev) => (prev ? { ...prev, status: newStatus } : null));
      Alert.alert('Success', `Status updated to ${newStatus}`);
    } catch (err) {
      // Local state update fallback
      setInquiries((prev) =>
        prev.map((item) => (item.id === selectedInquiry.id ? { ...item, status: newStatus } : item))
      );
      setSelectedInquiry((prev) => (prev ? { ...prev, status: newStatus } : null));
    } finally {
      setUpdating(false);
    }
  };

  const filteredInquiries = inquiries.filter((item) => {
    const matchesFilter = selectedFilter === 'All' || item.status === selectedFilter;
    const matchesSearch =
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.company || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'New':
        return '#3b82f6';
      case 'Contacted':
        return '#f59e0b';
      case 'Converted':
        return '#10b981';
      case 'Rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.title} allowFontScaling={false}>WordPress Inquiries</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchInquiries}>
          <Ionicons name="refresh-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search leads by name, email, company..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Status Filter Chips */}
      <View style={styles.filterContainer}>
        {['All', 'New', 'Contacted', 'Converted', 'Rejected'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[styles.filterChipText, selectedFilter === filter && styles.filterChipTextActive]}
              allowFontScaling={false}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Inquiries...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInquiries}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => {
                setSelectedInquiry(item);
                setModalVisible(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={styles.nameContainer}>
                  <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
                  <Text style={styles.cardTitle} allowFontScaling={false}>{item.name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(item.status) }]}>
                  <Text style={styles.statusText} allowFontScaling={false}>{item.status}</Text>
                </View>
              </View>

              <Text style={styles.cardSubtitle} allowFontScaling={false}>
                {item.company ? `🏢 ${item.company}` : `✉️ ${item.email}`}
              </Text>
              <Text style={styles.cardMessage} numberOfLines={2} allowFontScaling={false}>
                "{item.message}"
              </Text>
              <Text style={styles.cardDate} allowFontScaling={false}>
                Received: {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbox-ellipses-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyText} allowFontScaling={false}>No inquiries found.</Text>
            </View>
          }
        />
      )}

      {/* Inquiry Detail Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>Inquiry Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedInquiry && (
              <ScrollView contentContainerStyle={styles.modalContent}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{selectedInquiry.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{selectedInquiry.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{selectedInquiry.phone || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Company:</Text>
                  <Text style={styles.detailValue}>{selectedInquiry.company || 'N/A'}</Text>
                </View>

                <Text style={styles.sectionHeader}>Message:</Text>
                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>{selectedInquiry.message}</Text>
                </View>

                <Text style={styles.sectionHeader}>Update Status:</Text>
                <View style={styles.statusButtonGrid}>
                  {['New', 'Contacted', 'Converted', 'Rejected'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusBtn,
                        selectedInquiry.status === st && styles.statusBtnActive,
                        { borderColor: getStatusBadgeColor(st) },
                      ]}
                      onPress={() => handleUpdateStatus(st)}
                      disabled={updating}
                    >
                      <Text
                        style={[
                          styles.statusBtnText,
                          selectedInquiry.status === st && { color: '#ffffff', fontWeight: 'bold' },
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
    },
    refreshButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      height: 44,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.card,
      marginRight: 8,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: '#ffffff',
      fontWeight: 'bold',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    nameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: 'bold',
    },
    cardSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    cardMessage: {
      fontSize: 13,
      color: colors.text,
      fontStyle: 'italic',
      marginBottom: 8,
    },
    cardDate: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 8,
      color: colors.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      marginTop: 40,
    },
    emptyText: {
      marginTop: 10,
      color: colors.textSecondary,
      fontSize: 15,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
      padding: 18,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    modalContent: {
      paddingBottom: 20,
    },
    detailRow: {
      flexDirection: 'row',
      marginVertical: 4,
    },
    detailLabel: {
      width: 80,
      fontWeight: 'bold',
      color: colors.textSecondary,
    },
    detailValue: {
      flex: 1,
      color: colors.text,
    },
    sectionHeader: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 14,
      marginBottom: 6,
    },
    messageBox: {
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    messageText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
    },
    statusButtonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 6,
    },
    statusBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1.5,
      backgroundColor: colors.card,
    },
    statusBtnActive: {
      backgroundColor: colors.primary,
    },
    statusBtnText: {
      fontSize: 12,
      color: colors.text,
    },
  });

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { AppActivityIndicator as ActivityIndicator } from '../components/AppActivityIndicator';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme';
import { useAuthStore } from '../store/useStore';
import { apiClient } from '../api/client';

const defaultStarterRooms = [
  {
    name: 'Living Room',
    sortOrder: 0,
    items: [
      { label: 'Walls & Ceiling', required: true, sortOrder: 0 },
      { label: 'Flooring / Carpeting', required: true, sortOrder: 1 },
      { label: 'Windows & Blinds', required: true, sortOrder: 2 },
      { label: 'Electrical Outlets & Switches', required: true, sortOrder: 3 },
      { label: 'Smoke Detector', required: true, sortOrder: 4 },
    ],
  },
  {
    name: 'Kitchen',
    sortOrder: 1,
    items: [
      { label: 'Stove / Oven Condition', required: true, sortOrder: 0 },
      { label: 'Refrigerator & Freezer', required: true, sortOrder: 1 },
      { label: 'Sink, Faucet & Under-Sink Plumbing', required: true, sortOrder: 2 },
      { label: 'Cabinets & Countertops', required: true, sortOrder: 3 },
      { label: 'Exhaust Fan / Range Hood', required: true, sortOrder: 4 },
    ],
  },
  {
    name: 'Master Bathroom',
    sortOrder: 2,
    items: [
      { label: 'Toilet Functionality & Base Seal', required: true, sortOrder: 0 },
      { label: 'Shower / Bathtub & Caulking', required: true, sortOrder: 1 },
      { label: 'Vanity, Mirror & Sink Drain', required: true, sortOrder: 2 },
      { label: 'Ventilation Fan', required: true, sortOrder: 3 },
    ],
  },
  {
    name: 'Bedroom 1',
    sortOrder: 3,
    items: [
      { label: 'Door & Lock Hardware', required: true, sortOrder: 0 },
      { label: 'Closet Doors & Shelving', required: true, sortOrder: 1 },
      { label: 'Flooring Condition', required: true, sortOrder: 2 },
      { label: 'Windows & Screens', required: true, sortOrder: 3 },
    ],
  },
];

export const InspectionTemplatesScreen = ({ onNavigate }) => {
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const { logout, refreshAccessToken } = useAuthStore();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Designer Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Move-In');
  const [newDesc, setNewDesc] = useState('');
  const [builderRooms, setBuilderRooms] = useState([]);

  const fetchTemplates = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await apiClient.get('/inspection-templates', logout, refreshAccessToken);
      let list = [];
      if (Array.isArray(res)) list = res;
      else if (res?.data && Array.isArray(res.data)) list = res.data;
      else if (res?.templates && Array.isArray(res.templates)) list = res.templates;

      if (list.length > 0) {
        setTemplates(
          list.map((t) => ({
            id: t.id,
            title: t.name || t.title || 'Checklist Template',
            category: t.type === 'MOVE_IN' ? 'Move-In' : t.type === 'MOVE_OUT' ? 'Move-Out' : t.type === 'ROUTINE' ? 'Routine' : t.category || 'Move-In',
            itemsCount: Array.isArray(t.rooms)
              ? t.rooms.reduce((acc, r) => acc + (Array.isArray(r.items) ? r.items.length : 0), 0)
              : t.itemsCount || 10,
            description: t.description || 'Inspection checklist protocol.',
            rooms: t.rooms || [],
            raw: t,
          }))
        );
      } else {
        // Fallback default templates if database empty
        setTemplates([
          {
            id: 'tmpl-1',
            title: 'Move-In Apartment Standard Checklist',
            category: 'Move-In',
            itemsCount: 16,
            description: 'Standard multi-room inspection covering HVAC, plumbing, walls, and fixtures.',
            rooms: defaultStarterRooms,
          },
          {
            id: 'tmpl-2',
            title: 'Move-Out Security Deposit Audit',
            category: 'Move-Out',
            itemsCount: 16,
            description: 'Detailed damage check for security deposit deduction calculations.',
            rooms: defaultStarterRooms,
          },
          {
            id: 'tmpl-3',
            title: 'Annual Commercial Building Safety',
            category: 'Routine',
            itemsCount: 12,
            description: 'Fire extinguisher, smoke alarm, emergency exit lighting check.',
            rooms: defaultStarterRooms.slice(0, 2),
          },
        ]);
      }
    } catch (e) {
      console.log('Error fetching templates:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTemplates(true);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingTemplateId(null);
    setNewTitle('');
    setNewCategory('Move-In');
    setNewDesc('');
    setBuilderRooms(JSON.parse(JSON.stringify(defaultStarterRooms)));
    setModalVisible(true);
  };

  // Open Edit Modal
  const handleOpenEdit = async (item) => {
    try {
      setLoading(true);
      let fullTemplate = item.raw || item;
      try {
        const res = await apiClient.get(`/inspection-templates/${item.id}`, logout, refreshAccessToken);
        if (res?.data || res) fullTemplate = res.data || res;
      } catch (err) {
        console.log('Using cached template data:', err);
      }

      setEditingTemplateId(item.id);
      setNewTitle(fullTemplate.name || fullTemplate.title || item.title || '');
      const typeVal = fullTemplate.type || item.category || 'Move-In';
      setNewCategory(typeVal === 'MOVE_IN' ? 'Move-In' : typeVal === 'MOVE_OUT' ? 'Move-Out' : typeVal === 'ROUTINE' ? 'Routine' : typeVal);
      setNewDesc(fullTemplate.description || item.description || '');

      const incomingRooms = fullTemplate.rooms || item.rooms;
      if (Array.isArray(incomingRooms) && incomingRooms.length > 0) {
        setBuilderRooms(
          incomingRooms.map((r, rIdx) => ({
            id: r.id,
            name: r.name || `Room ${rIdx + 1}`,
            sortOrder: r.sortOrder ?? rIdx,
            items:
              Array.isArray(r.items) && r.items.length > 0
                ? r.items.map((it, itIdx) => ({
                    id: it.id,
                    label: it.label || it.name || '',
                    required: it.required !== undefined ? it.required : true,
                    sortOrder: it.sortOrder ?? itIdx,
                  }))
                : [
                    { label: 'Flooring', required: true, sortOrder: 0 },
                    { label: 'Walls & Ceiling', required: true, sortOrder: 1 },
                  ],
          }))
        );
      } else {
        setBuilderRooms(JSON.parse(JSON.stringify(defaultStarterRooms)));
      }
      setModalVisible(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to load inspection template details.');
    } finally {
      setLoading(false);
    }
  };

  // Room builder actions
  const handleAddRoom = () => {
    setBuilderRooms((prev) => [
      ...prev,
      {
        name: `Room ${prev.length + 1}`,
        sortOrder: prev.length,
        items: [
          { label: 'Walls & Ceiling', required: true, sortOrder: 0 },
          { label: 'Flooring', required: true, sortOrder: 1 },
          { label: 'Electrical & Lighting', required: true, sortOrder: 2 },
        ],
      },
    ]);
  };

  const handleDuplicateRoom = (index) => {
    const roomToDuplicate = builderRooms[index];
    if (!roomToDuplicate) return;
    const duplicated = {
      ...JSON.parse(JSON.stringify(roomToDuplicate)),
      id: undefined,
      name: `${roomToDuplicate.name} (Copy)`,
      sortOrder: builderRooms.length,
      items: (roomToDuplicate.items || []).map((it, itIdx) => ({
        ...it,
        id: undefined,
        sortOrder: itIdx,
      })),
    };
    setBuilderRooms((prev) => [...prev, duplicated]);
  };

  const handleDeleteTemplate = (item) => {
    Alert.alert(
      'Delete Inspection Template',
      `Are you sure you want to delete "${item.title || item.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await apiClient.delete(`/inspection-templates/${item.id}`, logout, refreshAccessToken);
              Alert.alert('Success', 'Inspection template deleted successfully.');
              fetchTemplates(true);
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to delete template.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteRoom = (index) => {
    if (builderRooms.length <= 1) {
      Alert.alert('Notice', 'An inspection template must have at least one room.');
      return;
    }
    setBuilderRooms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRoomName = (index, name) => {
    setBuilderRooms((prev) =>
      prev.map((r, i) => (i === index ? { ...r, name } : r))
    );
  };

  const handleAddItem = (roomIndex) => {
    setBuilderRooms((prev) =>
      prev.map((r, i) => {
        if (i !== roomIndex) return r;
        const currentItems = r.items || [];
        return {
          ...r,
          items: [
            ...currentItems,
            { label: '', required: true, sortOrder: currentItems.length },
          ],
        };
      })
    );
  };

  const handleUpdateItemLabel = (roomIndex, itemIndex, label) => {
    setBuilderRooms((prev) =>
      prev.map((r, rIdx) => {
        if (rIdx !== roomIndex) return r;
        const updatedItems = (r.items || []).map((it, itIdx) =>
          itIdx === itemIndex ? { ...it, label } : it
        );
        return { ...r, items: updatedItems };
      })
    );
  };

  const handleToggleItemRequired = (roomIndex, itemIndex) => {
    setBuilderRooms((prev) =>
      prev.map((r, rIdx) => {
        if (rIdx !== roomIndex) return r;
        const updatedItems = (r.items || []).map((it, itIdx) =>
          itIdx === itemIndex ? { ...it, required: !it.required } : it
        );
        return { ...r, items: updatedItems };
      })
    );
  };

  const handleDeleteItem = (roomIndex, itemIndex) => {
    setBuilderRooms((prev) =>
      prev.map((r, rIdx) => {
        if (rIdx !== roomIndex) return r;
        return {
          ...r,
          items: (r.items || []).filter((_, itIdx) => itIdx !== itemIndex),
        };
      })
    );
  };

  // Save Template
  const handleSaveTemplate = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter a template title.');
      return;
    }
    try {
      setSubmitting(true);
      const apiType =
        newCategory === 'Move-In'
          ? 'MOVE_IN'
          : newCategory === 'Move-Out'
          ? 'MOVE_OUT'
          : newCategory === 'Routine'
          ? 'ROUTINE'
          : 'OTHER';

      const payload = {
        name: newTitle.trim(),
        title: newTitle.trim(),
        type: apiType,
        category: newCategory,
        description: newDesc.trim() || 'Custom property inspection checklist.',
        active: true,
        rooms: builderRooms.map((r, rIdx) => ({
          name: r.name.trim() || `Room ${rIdx + 1}`,
          sortOrder: rIdx,
          items: (r.items || []).map((it, itIdx) => ({
            label: it.label.trim() || 'Checklist Item',
            name: it.label.trim() || 'Checklist Item',
            required: it.required !== false,
            sortOrder: itIdx,
          })),
        })),
      };

      if (editingTemplateId) {
        await apiClient.put(`/inspection-templates/${editingTemplateId}`, payload, logout, refreshAccessToken);
        Alert.alert('Success', 'Inspection template updated successfully.');
      } else {
        await apiClient.post('/inspection-templates', payload, logout, refreshAccessToken);
        Alert.alert('Success', 'Inspection template created successfully.');
      }

      setModalVisible(false);
      setEditingTemplateId(null);
      fetchTemplates(true);
    } catch (e) {
      console.log('Save template error:', e);
      Alert.alert('Error', e.message || 'Failed to save template. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} allowFontScaling={false}>Inspection Templates</Text>
          <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 2 }} allowFontScaling={false}>
            Customize room checklists & item verification rules
          </Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={handleOpenCreate} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.createBtnText} allowFontScaling={false}>New Template</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, fontSize: 12, color: colors.textSecondary }} allowFontScaling={false}>
            Loading inspection templates...
          </Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} allowFontScaling={false}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: isDarkMode ? '#0284c726' : '#e0f2fe' }]}>
                  <Text style={[styles.badgeText, { color: '#0284c7' }]} allowFontScaling={false}>
                    {item.category}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardDesc} allowFontScaling={false}>{item.description}</Text>
              <View style={styles.cardFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="clipboard-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.itemsCount} allowFontScaling={false}>
                    {item.itemsCount} Inspection Items
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[
                      styles.editBtn,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff',
                        borderWidth: 1,
                        borderColor: isDarkMode ? '#38bdf840' : '#bfdbfe',
                        borderRadius: 6,
                        paddingVertical: 5,
                        paddingHorizontal: 10,
                      },
                    ]}
                    onPress={() => handleOpenEdit(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.editBtnText, { color: '#2563eb', fontWeight: '800' }]} allowFontScaling={false}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.editBtn,
                      {
                        backgroundColor: isDarkMode ? '#ef444415' : '#fef2f2',
                        borderWidth: 1,
                        borderColor: isDarkMode ? '#ef444440' : '#fecaca',
                        borderRadius: 6,
                        paddingVertical: 5,
                        paddingHorizontal: 10,
                      },
                    ]}
                    onPress={() => handleDeleteTemplate(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.editBtnText, { color: '#ef4444', fontWeight: '800' }]} allowFontScaling={false}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* FULL TEMPLATE DESIGNER MODAL WITH KEYBOARD AVOIDING */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 10, paddingTop: 4 }}>
                <Text style={styles.modalTitle} allowFontScaling={false}>
                  {editingTemplateId ? 'Edit Checklist Template' : 'Create Inspection Template'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, lineHeight: 15 }} allowFontScaling={false}>
                  Define inspection categories, rooms, and item checks
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle-outline" size={26} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Form Body */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>TEMPLATE TITLE *</Text>
              <TextInput
                style={styles.input}
                placeholder="E.g. Commercial Office Move-In"
                placeholderTextColor="#94a3b8"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.label}>CATEGORY</Text>
              <View style={styles.catGrid}>
                {['Move-In', 'Move-Out', 'Routine', 'Violation'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catBtn, newCategory === cat && styles.catBtnActive]}
                    onPress={() => setNewCategory(cat)}
                  >
                    <Text style={[styles.catBtnText, newCategory === cat && styles.catBtnTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>DESCRIPTION / SCOPE</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                placeholder="Short checklist protocol overview..."
                placeholderTextColor="#94a3b8"
                multiline
                value={newDesc}
                onChangeText={setNewDesc}
              />

              {/* ROOMS & ITEMS DESIGNER SECTION */}
              <View style={{ marginTop: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary, textTransform: 'uppercase' }} allowFontScaling={false}>
                    Inspection Rooms & Items
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }} allowFontScaling={false}>
                    Configure rooms, fixtures, and condition checks
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff',
                    borderColor: isDarkMode ? '#38bdf840' : '#bfdbfe',
                    borderWidth: 1,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    gap: 4,
                  }}
                  onPress={handleAddRoom}
                >
                  <Ionicons name="add" size={14} color="#2563eb" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563eb' }} allowFontScaling={false}>
                    Add Room
                  </Text>
                </TouchableOpacity>
              </View>

              {builderRooms.map((room, rIdx) => (
                <View
                  key={`room-${rIdx}`}
                  style={{
                    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  {/* Room Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: '800',
                        color: colors.textPrimary,
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        borderWidth: 1,
                        borderColor: isDarkMode ? '#475569' : '#cbd5e1',
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        marginRight: 8,
                      }}
                      value={room.name}
                      onChangeText={(val) => handleUpdateRoomName(rIdx, val)}
                      placeholder="Room Name"
                      placeholderTextColor="#94a3b8"
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handleDuplicateRoom(rIdx)}
                        style={{ padding: 4 }}
                        title="Duplicate Room"
                      >
                        <Ionicons name="copy-outline" size={16} color="#38bdf8" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteRoom(rIdx)}
                        style={{ padding: 4 }}
                        title="Delete Room"
                      >
                        <Ionicons name="trash-outline" size={16} color="#f43f5e" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Room Items */}
                  {(room.items || []).map((it, itIdx) => (
                    <View
                      key={`it-${rIdx}-${itIdx}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 6,
                        paddingLeft: 4,
                      }}
                    >
                      <Ionicons name="ellipse" size={6} color="#94a3b8" />
                      <TextInput
                        style={{
                          flex: 1,
                          fontSize: 12,
                          color: colors.textPrimary,
                          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                          borderWidth: 1,
                          borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                        }}
                        value={it.label}
                        onChangeText={(val) => handleUpdateItemLabel(rIdx, itIdx, val)}
                        placeholder="Item label (e.g. Flooring, Walls)"
                        placeholderTextColor="#94a3b8"
                      />
                      <TouchableOpacity
                        onPress={() => handleToggleItemRequired(rIdx, itIdx)}
                        style={{
                          paddingHorizontal: 6,
                          paddingVertical: 3,
                          borderRadius: 4,
                          backgroundColor: it.required ? '#10b98118' : '#64748b18',
                          borderWidth: 1,
                          borderColor: it.required ? '#10b98140' : '#64748b40',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: it.required ? '#10b981' : '#64748b',
                          }}
                          allowFontScaling={false}
                        >
                          {it.required ? 'Required' : 'Optional'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteItem(rIdx, itIdx)} style={{ padding: 3 }}>
                        <Ionicons name="close" size={15} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Add Item to Room */}
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 4,
                      paddingVertical: 4,
                      alignSelf: 'flex-start',
                    }}
                    onPress={() => handleAddItem(rIdx)}
                  >
                    <Ionicons name="add-circle-outline" size={14} color="#0284c7" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284c7' }} allowFontScaling={false}>
                      Add Item
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}08`,
                  marginBottom: 16,
                  gap: 6,
                }}
                onPress={handleAddRoom}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }} allowFontScaling={false}>
                  + Add Another Room
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Modal Actions Footer */}
            <View style={{ flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                }}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary }} allowFontScaling={false}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 2,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: colors.primary,
                }}
                onPress={handleSaveTemplate}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }} allowFontScaling={false}>
                    {editingTemplateId ? 'Update Template' : 'Save Template'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    createBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    createBtnText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: 13,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.text,
      flex: 1,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: 'bold',
    },
    cardDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 10,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      paddingTop: 8,
    },
    itemsCount: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    editBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    editBtnText: {
      fontSize: 13,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 62 : ((StatusBar.currentHeight || 24) + 16),
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },
    modalContainer: {
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 18,
      maxWidth: 580,
      width: '100%',
      maxHeight: '84%',
      overflow: 'hidden',
      flexDirection: 'column',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
      paddingTop: 2,
      paddingBottom: 10,
    },
    modalTitle: {
      fontSize: 17,
      lineHeight: 24,
      fontWeight: 'bold',
      color: colors.text,
      flexShrink: 1,
      marginRight: 8,
    },
    modalBody: {
      paddingBottom: 16,
    },
    label: {
      fontSize: 11,
      fontWeight: 'bold',
      color: colors.textSecondary,
      marginBottom: 4,
      marginTop: 10,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      color: colors.text,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
      fontSize: 13,
    },
    catGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginVertical: 4,
    },
    catBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    },
    catBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    catBtnText: {
      fontSize: 12,
      color: colors.text,
    },
    catBtnTextActive: {
      color: '#ffffff',
      fontWeight: 'bold',
    },
  });
export default InspectionTemplatesScreen;

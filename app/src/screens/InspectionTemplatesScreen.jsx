import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme';

export const InspectionTemplatesScreen = () => {
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  const [templates, setTemplates] = useState([
    {
      id: 'tmpl-1',
      title: 'Move-In Apartment Standard Checklist',
      category: 'Move-In',
      itemsCount: 12,
      description: 'Standard 12-point inspection covering HVAC, plumbing, walls, and locks.',
    },
    {
      id: 'tmpl-2',
      title: 'Move-Out Security Deposit Audit',
      category: 'Move-Out',
      itemsCount: 15,
      description: 'Detailed damage check for security deposit deduction calculations.',
    },
    {
      id: 'tmpl-3',
      title: 'Annual Commercial Building Safety',
      category: 'Routine',
      itemsCount: 8,
      description: 'Fire extinguisher, smoke alarm, emergency exit lighting check.',
    },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Move-In');
  const [newDesc, setNewDesc] = useState('');

  const handleCreateTemplate = () => {
    if (!newTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter a template title.');
      return;
    }
    const newTmpl = {
      id: `tmpl-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      itemsCount: 5,
      description: newDesc || 'Custom property inspection checklist.',
    };
    setTemplates((prev) => [newTmpl, ...prev]);
    setModalVisible(false);
    setNewTitle('');
    setNewDesc('');
    Alert.alert('Success', 'Inspection template created successfully.');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling={false}>Inspection Templates</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.createBtnText} allowFontScaling={false}>New Template</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} allowFontScaling={false}>{item.title}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText} allowFontScaling={false}>{item.category}</Text>
              </View>
            </View>
            <Text style={styles.cardDesc} allowFontScaling={false}>{item.description}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.itemsCount} allowFontScaling={false}>📋 {item.itemsCount} Items</Text>
              <TouchableOpacity style={styles.editBtn}>
                <Text style={styles.editBtnText} allowFontScaling={false}>Edit Checklist</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Create Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>Create Inspection Template</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.label}>Template Title</Text>
              <TextInput
                style={styles.input}
                placeholder="E.g. Commercial Office Move-In"
                placeholderTextColor="#94a3b8"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.label}>Category</Text>
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

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                placeholder="Short checklist overview..."
                placeholderTextColor="#94a3b8"
                multiline
                value={newDesc}
                onChangeText={setNewDesc}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateTemplate}>
                <Text style={styles.saveBtnText}>Save Template</Text>
              </TouchableOpacity>
            </ScrollView>
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
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
      paddingBottom: 24,
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
      backgroundColor: '#38bdf822',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    badgeText: {
      color: colors.primary,
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
      color: colors.text,
      fontWeight: '600',
    },
    editBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    editBtnText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600',
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
    modalBody: {
      paddingBottom: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: 'bold',
      color: colors.textSecondary,
      marginBottom: 4,
      marginTop: 10,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
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
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 18,
    },
    saveBtnText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: 15,
    },
  });

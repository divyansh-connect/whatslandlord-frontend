import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme';

export const RolesPermissionsScreen = () => {
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  const [selectedRole, setSelectedRole] = useState('Collection Manager');
  const [permissions, setPermissions] = useState({
    'Collection Manager': {
      Properties: false,
      Leasing: false,
      RentPayments: true,
      Accounting: true,
      Maintenance: false,
      Reports: true,
    },
    'Maintenance Staff': {
      Properties: false,
      Leasing: false,
      RentPayments: false,
      Accounting: false,
      Maintenance: true,
      Reports: false,
    },
    'Leasing Agent': {
      Properties: true,
      Leasing: true,
      RentPayments: false,
      Accounting: false,
      Maintenance: false,
      Reports: true,
    },
  });

  const handleToggle = (moduleName) => {
    setPermissions((prev) => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [moduleName]: !prev[selectedRole][moduleName],
      },
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling={false}>Roles & Permissions (RBAC)</Text>
      </View>

      {/* Role Picker Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleContainer}>
        {['Collection Manager', 'Maintenance Staff', 'Leasing Agent'].map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.roleChip, selectedRole === role && styles.roleChipActive]}
            onPress={() => setSelectedRole(role)}
          >
            <Ionicons
              name="shield-outline"
              size={14}
              color={selectedRole === role ? '#ffffff' : colors.textSecondary}
            />
            <Text
              style={[styles.roleChipText, selectedRole === role && styles.roleChipTextActive]}
              allowFontScaling={false}
            >
              {role}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Permission Matrix Toggles */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle} allowFontScaling={false}>
          Module Access Matrix ({selectedRole})
        </Text>

        {Object.keys(permissions[selectedRole] || {}).map((mod) => (
          <View key={mod} style={styles.permCard}>
            <View style={styles.permInfo}>
              <Text style={styles.permLabel} allowFontScaling={false}>{mod} Access</Text>
              <Text style={styles.permDesc} allowFontScaling={false}>
                Allow {selectedRole} users to view and manage {mod.toLowerCase()}.
              </Text>
            </View>
            <Switch
              value={permissions[selectedRole][mod]}
              onValueChange={() => handleToggle(mod)}
              trackColor={{ false: '#94a3b8', true: '#3b82f6' }}
            />
          </View>
        ))}
      </ScrollView>
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
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    roleContainer: {
      paddingHorizontal: 16,
      marginBottom: 14,
      maxHeight: 40,
    },
    roleChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.card,
      marginRight: 8,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#cbd5e1',
      gap: 6,
    },
    roleChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    roleChipText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    roleChipTextActive: {
      color: '#ffffff',
      fontWeight: 'bold',
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    permCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    },
    permInfo: {
      flex: 1,
      marginRight: 10,
    },
    permLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    permDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });

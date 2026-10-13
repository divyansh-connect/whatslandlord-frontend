import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../api/client';
import { useThemeColors } from '../theme';

export const PlatformSettingsScreen = () => {
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowRegistrations: true,
    requireEmailVerification: true,
    debugMode: false,
    systemEmail: 'admin@apexpm.com',
  });
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    fetchSettingsAndLogs();
  }, []);

  const fetchSettingsAndLogs = async () => {
    setLoading(true);
    try {
      const settingsRes = await apiClient.get('/platform-settings');
      if (settingsRes && settingsRes.data) {
        setSettings((prev) => ({ ...prev, ...settingsRes.data }));
      }
      const logsRes = await apiClient.get('/platform-security/audit');
      if (logsRes && logsRes.data) {
        setAuditLogs(logsRes.data);
      }
    } catch (err) {
      console.log('Platform settings fetch error:', err.message);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    apiClient.put('/platform-settings', updated).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling={false}>Platform Settings</Text>
      </View>

      {/* Segmented Control Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'general' && styles.tabActive]}
          onPress={() => setActiveTab('general')}
        >
          <Ionicons
            name="options-outline"
            size={16}
            color={activeTab === 'general' ? '#ffffff' : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'general' && styles.tabTextActive]} allowFontScaling={false}>
            General Config
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'audit' && styles.tabActive]}
          onPress={() => setActiveTab('audit')}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color={activeTab === 'audit' ? '#ffffff' : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'audit' && styles.tabTextActive]} allowFontScaling={false}>
            Security Logs
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === 'general' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle} allowFontScaling={false}>System Controls</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel} allowFontScaling={false}>Maintenance Mode</Text>
              <Text style={styles.settingDesc} allowFontScaling={false}>
                Restrict tenant & manager login access for system maintenance.
              </Text>
            </View>
            <Switch
              value={settings.maintenanceMode}
              onValueChange={() => handleToggle('maintenanceMode')}
              trackColor={{ false: '#94a3b8', true: '#3b82f6' }}
            />
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel} allowFontScaling={false}>Allow Public Registrations</Text>
              <Text style={styles.settingDesc} allowFontScaling={false}>
                Enable new tenant self-applications from login page.
              </Text>
            </View>
            <Switch
              value={settings.allowRegistrations}
              onValueChange={() => handleToggle('allowRegistrations')}
              trackColor={{ false: '#94a3b8', true: '#3b82f6' }}
            />
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel} allowFontScaling={false}>Require Email Verification</Text>
              <Text style={styles.settingDesc} allowFontScaling={false}>
                Require new users to verify email before activation.
              </Text>
            </View>
            <Switch
              value={settings.requireEmailVerification}
              onValueChange={() => handleToggle('requireEmailVerification')}
              trackColor={{ false: '#94a3b8', true: '#3b82f6' }}
            />
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel} allowFontScaling={false}>Debug & Verbose Logging</Text>
              <Text style={styles.settingDesc} allowFontScaling={false}>
                Log all network API payloads in backend server logs.
              </Text>
            </View>
            <Switch
              value={settings.debugMode}
              onValueChange={() => handleToggle('debugMode')}
              trackColor={{ false: '#94a3b8', true: '#3b82f6' }}
            />
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle} allowFontScaling={false}>Audit Trail History</Text>
          {auditLogs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <Ionicons name="key-outline" size={18} color={colors.primary} />
                <Text style={styles.logAction} allowFontScaling={false}>{log.action}</Text>
              </View>
              <Text style={styles.logMeta} allowFontScaling={false}>User: {log.user || 'System'}</Text>
              <Text style={styles.logMeta} allowFontScaling={false}>IP Address: {log.ip || 'Local'}</Text>
              <Text style={styles.logTime} allowFontScaling={false}>
                {new Date(log.timestamp).toLocaleString()}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
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
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
    },
    tabContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 14,
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 4,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 8,
      gap: 6,
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: '#ffffff',
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    settingCard: {
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
    settingInfo: {
      flex: 1,
      marginRight: 10,
    },
    settingLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    settingDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    logCard: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    },
    logHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    logAction: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.primary,
    },
    logMeta: {
      fontSize: 12,
      color: colors.text,
    },
    logTime: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

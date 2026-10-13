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
import { useAuthStore, useThemeStore } from '../store/useStore';
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

export const AdminDashboard = ({ onNavigate }) => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';

  // States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    activeCompanies: 0,
    activeUsers: 0,
    mrrRevenue: 0,
    activeSubscriptions: 0,
    storageUsed: '0.0 GB',
  });
  const [companies, setCompanies] = useState([]);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);

  // Invite Form States
  const [companyName, setCompanyName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('Pro Plan');
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, companiesRes] = await Promise.all([
        apiClient.get('/superadmin/stats', logout, refreshAccessToken),
        apiClient.get('/superadmin/companies', logout, refreshAccessToken),
      ]);

      if (statsRes && statsRes.data) {
        setStats({
          activeCompanies: statsRes.data.activeCompanies !== undefined ? statsRes.data.activeCompanies : (statsRes.data.totalCompanies !== undefined ? statsRes.data.totalCompanies : 0),
          activeUsers: statsRes.data.totalUsers !== undefined ? statsRes.data.totalUsers : (statsRes.data.activeUsers !== undefined ? statsRes.data.activeUsers : 0),
          mrrRevenue: statsRes.data.totalArr !== undefined ? statsRes.data.totalArr : (statsRes.data.mrrRevenue !== undefined ? statsRes.data.mrrRevenue : 0),
          activeSubscriptions: statsRes.data.activeSubscriptions !== undefined ? statsRes.data.activeSubscriptions : (statsRes.data.activeCompanies !== undefined ? statsRes.data.activeCompanies : 0),
          storageUsed: statsRes.data.storageUsed || '0.0 GB',
        });
      }

      if (companiesRes && (Array.isArray(companiesRes) || companiesRes.data)) {
        const list = Array.isArray(companiesRes) ? companiesRes : companiesRes.data;
        setCompanies(list);
      } else {
        setCompanies([]);
      }
    } catch (e) {
      console.log('Error fetching superadmin dashboard data:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegisterCompany = async () => {
    if (!companyName || !email || !contactName) {
      Alert.alert('Error', 'Please fill in Company Name, Primary Contact and Email.');
      return;
    }
    setSubmitting(true);
    try {
      const code = companyCode || companyName.substring(0, 4).toUpperCase();
      const payload = {
        name: companyName,
        legalName: legalName || companyName,
        code,
        contactName,
        email,
        password: password || 'admin123',
        phone: phone || '555-0100',
        planName: selectedPlan,
      };

      await apiClient.post('/superadmin/companies', payload, logout, refreshAccessToken);
      Alert.alert('Success', `Registered new company "${companyName}" successfully.`);
      setInviteModalVisible(false);
      
      // Reset form
      setCompanyName('');
      setLegalName('');
      setCompanyCode('');
      setContactName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setSelectedPlan('Pro Plan');
      
      loadData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to register company.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (companyId, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    Alert.alert(
      'Confirm Status Change',
      `Are you sure you want to change company status to ${nextStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await apiClient.put(`/superadmin/companies/${companyId}`, { status: nextStatus }, logout, refreshAccessToken);
              Alert.alert('Success', `Company status updated to ${nextStatus}`);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Could not update company status.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCompany = async (companyId, compName) => {
    Alert.alert(
      'Delete Company',
      `Are you sure you want to permanently delete "${compName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/superadmin/companies/${companyId}`, logout, refreshAccessToken);
              Alert.alert('Success', 'Company deleted successfully.');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Could not delete company.');
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
        <Text style={styles.loadingText} allowFontScaling={false}>{es ? 'Cargando Panel de Super Admin...' : 'Loading Super Admin SaaS Portal...'}</Text>
      </View>
    );
  }

  // Plan progress counts calculation
  const totalCompCount = companies.length || 1;
  const proCount = companies.filter(c => (c.planName || '').toLowerCase().includes('pro')).length || 1;
  const enterpriseCount = companies.filter(c => (c.planName || '').toLowerCase().includes('enter')).length || 0;
  const starterCount = companies.filter(c => (c.planName || '').toLowerCase().includes('start') || (c.planName || '').toLowerCase().includes('basic')).length || 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor="#38bdf8" />}
    >
      {/* Super Admin Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} allowFontScaling={false}>{es ? 'Panel de Control de la Plataforma' : 'SaaS Platform Control Panel'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity style={styles.syncBtn} onPress={loadData}>
              <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.syncText} allowFontScaling={false}>{es ? 'Sincronizar' : 'Sync Metrics'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bellBtn} onPress={() => onNavigate && onNavigate('notifications')}>
              <Ionicons name="notifications-outline" size={24} color={colors.textSecondary} />
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText} allowFontScaling={false}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* SaaS STATS GRID matching Web App layout */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeaderRow}>
            <Text style={styles.kpiLabel} allowFontScaling={false}>{es ? 'EMPRESAS ACTIVAS' : 'ACTIVE COMPANIES'}</Text>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
              <Ionicons name="business-outline" size={14} color="#38bdf8" />
            </View>
          </View>
          <Text style={styles.kpiVal} allowFontScaling={false}>{stats.activeCompanies}</Text>
          <View style={styles.kpiFooterRow}>
            <View style={styles.badgeGreen}>
              <Text style={styles.badgeGreenText} allowFontScaling={false}>+12 {es ? 'nuevas' : 'new'}</Text>
            </View>
            <Text style={styles.kpiSubText} allowFontScaling={false}>{es ? 'este mes' : 'this month'}</Text>
          </View>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeaderRow}>
            <Text style={styles.kpiLabel} allowFontScaling={false}>{es ? 'USUARIOS ACTIVOS' : 'ACTIVE USERS'}</Text>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Ionicons name="people-outline" size={14} color="#10b981" />
            </View>
          </View>
          <Text style={styles.kpiVal} allowFontScaling={false}>{stats.activeUsers}</Text>
          <View style={styles.kpiFooterRow}>
            <View style={styles.badgeGreen}>
              <Text style={styles.badgeGreenText} allowFontScaling={false}>+142 {es ? 'nuevos' : 'new'}</Text>
            </View>
            <Text style={styles.kpiSubText} allowFontScaling={false}>{es ? 'registros semanales' : 'weekly signups'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeaderRow}>
            <Text style={styles.kpiLabel} allowFontScaling={false}>{es ? 'MRR (INGRESOS)' : 'MRR (REVENUE)'}</Text>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(129, 140, 248, 0.12)' }]}>
              <Ionicons name="card-outline" size={14} color="#818cf8" />
            </View>
          </View>
          <Text style={styles.kpiVal} allowFontScaling={false}>
            ${stats.mrrRevenue.toLocaleString()}
          </Text>
          <View style={styles.kpiFooterRow}>
            <View style={styles.badgeGreen}>
              <Text style={styles.badgeGreenText} allowFontScaling={false}>+8.4%</Text>
            </View>
            <Text style={styles.kpiSubText} allowFontScaling={false}>{es ? 'crecimiento m/m' : 'm/m growth'}</Text>
          </View>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeaderRow}>
            <Text style={styles.kpiLabel} allowFontScaling={false}>{es ? 'SUSCRIPCIONES ACTIVAS' : 'ACTIVE SUBSCRIPTIONS'}</Text>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(250, 204, 21, 0.12)' }]}>
              <Ionicons name="bar-chart-outline" size={14} color="#facc15" />
            </View>
          </View>
          <Text style={styles.kpiVal} allowFontScaling={false}>{stats.activeSubscriptions}</Text>
          <View style={styles.kpiFooterRow}>
            <View style={styles.badgeGreen}>
              <Text style={styles.badgeGreenText} allowFontScaling={false}>98.5%</Text>
            </View>
            <Text style={styles.kpiSubText} allowFontScaling={false}>{es ? 'retención' : 'retention'}</Text>
          </View>
        </View>
      </View>

      {/* MRR Growth Chart Card */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle} allowFontScaling={false}>{es ? 'Crecimiento de Ingresos Recurrentes (MRR)' : 'Monthly Recurring Revenue (MRR) Growth'}</Text>
        <Text style={styles.chartSubtitle} allowFontScaling={false}>{es ? 'Comparación ciclo anterior vs métricas ARR actuales' : 'Comparison of previous cycle vs current ARR metrics'}</Text>
        
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendText} allowFontScaling={false}>
              Prev Month (${Math.round(stats.mrrRevenue * 0.8).toLocaleString()})
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText} allowFontScaling={false}>
              Current Month (${stats.mrrRevenue.toLocaleString()})
            </Text>
          </View>
        </View>

        <View style={styles.graphContainer}>
          <View style={styles.yAxis}>
            <Text style={styles.yAxisText} allowFontScaling={false}>{stats.mrrRevenue > 0 ? `$${Math.round((stats.mrrRevenue > 0 ? stats.mrrRevenue : 800)/1000)}k` : '800'}</Text>
            <Text style={styles.yAxisText} allowFontScaling={false}>{stats.mrrRevenue > 0 ? `$${Math.round((stats.mrrRevenue > 0 ? stats.mrrRevenue : 800)*0.75/1000)}k` : '600'}</Text>
            <Text style={styles.yAxisText} allowFontScaling={false}>{stats.mrrRevenue > 0 ? `$${Math.round((stats.mrrRevenue > 0 ? stats.mrrRevenue : 800)*0.5/1000)}k` : '400'}</Text>
            <Text style={styles.yAxisText} allowFontScaling={false}>{stats.mrrRevenue > 0 ? `$${Math.round((stats.mrrRevenue > 0 ? stats.mrrRevenue : 800)*0.25/1000)}k` : '200'}</Text>
            <Text style={styles.yAxisText} allowFontScaling={false}>0</Text>
          </View>
          <View style={styles.graphArea}>
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />

            {/* Comparative Bars Container */}
            <View style={styles.barsContainer}>
              <View style={styles.barCol}>
                <View style={[styles.graphBar, { height: `${stats.mrrRevenue > 0 ? 80 : 0}%`, backgroundColor: '#3b82f6' }]} />
                <Text style={styles.barLabel} allowFontScaling={false}>Prev</Text>
              </View>
              <View style={styles.barCol}>
                <View style={[styles.graphBar, { height: `${stats.mrrRevenue > 0 ? 100 : 0}%`, backgroundColor: '#10b981' }]} />
                <Text style={styles.barLabel} allowFontScaling={false}>Current</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Subscription Plan Distribution Card */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle} allowFontScaling={false}>{es ? 'Distribución de Planes de Suscripción' : 'Subscription Plan Distribution'}</Text>
        <Text style={styles.chartSubtitle} allowFontScaling={false}>{es ? 'Desglose de empresas activas por nivel SaaS' : 'Breakdown of active companies by SaaS tier'}</Text>

        <View style={styles.planProgressContainer}>
          <View style={styles.planProgressItem}>
            <View style={styles.planProgressTextRow}>
              <Text style={styles.planProgressLabel} allowFontScaling={false}>Pro Plan</Text>
              <Text style={styles.planProgressVal} allowFontScaling={false}>{proCount} Org ({Math.round(proCount/totalCompCount*100)}%)</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.round(proCount/totalCompCount*100)}%`, backgroundColor: '#38bdf8' }]} />
            </View>
          </View>

          <View style={styles.planProgressItem}>
            <View style={styles.planProgressTextRow}>
              <Text style={styles.planProgressLabel} allowFontScaling={false}>Enterprise Plan</Text>
              <Text style={styles.planProgressVal} allowFontScaling={false}>{enterpriseCount} Org ({Math.round(enterpriseCount/totalCompCount*100)}%)</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.round(enterpriseCount/totalCompCount*100)}%`, backgroundColor: '#10b981' }]} />
            </View>
          </View>

          <View style={styles.planProgressItem}>
            <View style={styles.planProgressTextRow}>
              <Text style={styles.planProgressLabel} allowFontScaling={false}>Starter / Basic Plan</Text>
              <Text style={styles.planProgressVal} allowFontScaling={false}>{starterCount} Org ({Math.round(starterCount/totalCompCount*100)}%)</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.round(starterCount/totalCompCount*100)}%`, backgroundColor: '#a855f7' }]} />
            </View>
          </View>
        </View>
      </View>

      {/* Companies Directory */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle} allowFontScaling={false}>Companies Directory</Text>
          <Text style={styles.sectionSubtitle} allowFontScaling={false}>Manage SaaS client companies details</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setInviteModalVisible(true)}>
          <Text style={styles.addBtnText} allowFontScaling={false}>+ Add Company</Text>
        </TouchableOpacity>
      </View>

      {companies.map((c, idx) => (
        <View key={c.id || `comp-${idx}`} style={styles.companyCard}>
          <View style={styles.cardHeader}>
            <View style={styles.nameContainer}>
              <Text style={styles.compName} allowFontScaling={false}>{c.name || c.email}</Text>
              <Text style={styles.compCode} allowFontScaling={false}>{c.code || 'CODE'}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.statusBadge, c.status === 'Active' ? styles.statusActive : styles.statusSuspended]}
              onPress={() => handleUpdateStatus(c.id, c.status)}
            >
              <Text style={[styles.statusText, c.status === 'Active' ? styles.statusActiveText : styles.statusSuspendedText]} allowFontScaling={false}>
                {c.status || 'Active'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel} allowFontScaling={false}>Primary Contact</Text>
            <Text style={styles.detailValue} allowFontScaling={false}>{c.contactName || 'Sarah Davis'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel} allowFontScaling={false}>Email Address</Text>
            <Text style={styles.detailValue} allowFontScaling={false}>{c.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel} allowFontScaling={false}>Phone Number</Text>
            <Text style={styles.detailValue} allowFontScaling={false}>{c.phone || '555-0100'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel} allowFontScaling={false}>Plan & Cycle</Text>
            <Text style={[styles.detailValue, { color: '#38bdf8', fontWeight: '800' }]} allowFontScaling={false}>
              {c.planName || 'Pro Plan'}
            </Text>
          </View>

          <View style={styles.cardFooterActions}>
            <TouchableOpacity 
              style={styles.actionBtnSecondary} 
              onPress={() => {
                setSelectedPlan(c.planName || 'Pro Plan');
                Alert.alert(
                  'Change Subscription Plan',
                  'Select plan to assign to this company:',
                  [
                    { text: 'Basic Plan', onPress: () => apiClient.put(`/superadmin/companies/${c.id}`, { planName: 'Basic Plan' }, logout, refreshAccessToken).then(() => loadData()) },
                    { text: 'Pro Plan', onPress: () => apiClient.put(`/superadmin/companies/${c.id}`, { planName: 'Pro Plan' }, logout, refreshAccessToken).then(() => loadData()) },
                    { text: 'Enterprise Plan', onPress: () => apiClient.put(`/superadmin/companies/${c.id}`, { planName: 'Enterprise Plan' }, logout, refreshAccessToken).then(() => loadData()) },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }}
            >
              <Ionicons name="create-outline" size={14} color="#38bdf8" />
              <Text style={styles.actionBtnTextSecondary} allowFontScaling={false}>Edit Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnDanger} onPress={() => handleDeleteCompany(c.id, c.name)}>
              <Ionicons name="trash-outline" size={14} color="#ef4444" />
              <Text style={styles.actionBtnTextDanger} allowFontScaling={false}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Register Company Modal */}
      <Modal visible={inviteModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>Create New Company</Text>
              <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle} allowFontScaling={false}>Register a new subscriber tenant onto the SaaS platform.</Text>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.inputLabel} allowFontScaling={false}>COMPANY NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Apex Property Management"
                placeholderTextColor="#64748b"
                value={companyName}
                onChangeText={setCompanyName}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>BUSINESS NAME (LEGAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="Apex PM LLC"
                placeholderTextColor="#64748b"
                value={legalName}
                onChangeText={setLegalName}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>COMPANY CODE</Text>
              <TextInput
                style={styles.input}
                placeholder="APEX"
                placeholderTextColor="#64748b"
                autoCapitalize="characters"
                value={companyCode}
                onChangeText={setCompanyCode}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>PRIMARY CONTACT PERSON</Text>
              <TextInput
                style={styles.input}
                placeholder="Sarah Davis"
                placeholderTextColor="#64748b"
                value={contactName}
                onChangeText={setContactName}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                placeholder="staff@gmail.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
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

              <Text style={styles.inputLabel} allowFontScaling={false}>PHONE NUMBER</Text>
              <TextInput
                style={styles.input}
                placeholder="555-0199"
                placeholderTextColor="#64748b"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.inputLabel} allowFontScaling={false}>SUBSCRIPTION PLAN</Text>
              <TouchableOpacity style={styles.pickerSelector} onPress={() => setPlanDropdownOpen(true)}>
                <Text style={styles.pickerSelectorText} allowFontScaling={false}>{selectedPlan}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setInviteModalVisible(false)}>
                <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitBtn]} onPress={handleRegisterCompany} disabled={submitting}>
                <Text style={styles.submitBtnText} allowFontScaling={false}>
                  {submitting ? 'Creating...' : 'Create Company'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Plan Select Dropdown Modal */}
        <Modal visible={planDropdownOpen} transparent animationType="fade">
          <View style={styles.modalBg}>
            <View style={styles.pickerModalContent}>
              <Text style={styles.pickerModalTitle} allowFontScaling={false}>Select Subscription Plan</Text>
              {['Basic Plan', 'Pro Plan', 'Enterprise Plan'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={styles.pickerOptionRow}
                  onPress={() => {
                    setSelectedPlan(p);
                    setPlanDropdownOpen(false);
                  }}
                >
                  <Text style={styles.pickerOptionText} allowFontScaling={false}>{p}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.closePickerBtn} onPress={() => setPlanDropdownOpen(false)}>
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
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, flex: 1 },
  subtitle: { fontSize: 11.5, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },

  syncBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: colors.cardBorder },
  syncText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginLeft: 4 },

  kpiGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  kpiHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiLabel: { fontSize: 9.5, color: colors.textSecondary, fontWeight: '800', letterSpacing: 0.5 },
  iconCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  kpiVal: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, marginVertical: 6 },
  kpiFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeGreen: { backgroundColor: 'rgba(74, 222, 128, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeGreenText: { color: '#4ade80', fontSize: 9.5, fontWeight: '800' },
  kpiSubText: { fontSize: 10, color: colors.textSecondary },

  // Charts
  chartCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.cardBorder },
  chartTitle: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary },
  chartSubtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 2, marginBottom: 12 },
  legendRow: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10.5, color: colors.textSecondary, fontWeight: '600' },

  graphContainer: { height: 120, flexDirection: 'row', alignItems: 'flex-end', paddingTop: 10 },
  yAxis: { width: 40, justifyContent: 'space-between', height: '100%', paddingBottom: 6 },
  yAxisText: { color: colors.textMuted, fontSize: 9.5, fontWeight: '700' },
  graphArea: { flex: 1, height: '100%', justifyContent: 'space-between', position: 'relative', borderLeftWidth: 1, borderBottomWidth: 1, borderColor: colors.divider, paddingLeft: 4 },
  gridLine: { height: 1, backgroundColor: colors.divider, width: '100%' },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    width: '100%',
    height: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  barCol: {
    alignItems: 'center',
    width: '40%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  graphBar: {
    width: 26,
    borderRadius: 4,
    opacity: 0.85,
  },
  barLabel: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },

  planProgressContainer: { gap: 12 },
  planProgressItem: {},
  planProgressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  planProgressLabel: { fontSize: 11.5, fontWeight: '700', color: colors.textPrimary },
  planProgressVal: { fontSize: 11.5, color: colors.textSecondary },
  progressBarBg: { height: 8, backgroundColor: colors.inputBackground, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  // Section Headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  sectionSubtitle: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },
  addBtn: { backgroundColor: '#38bdf8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#0f172a', fontSize: 12, fontWeight: '800' },

  // Company list cards
  companyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  nameContainer: { flex: 1, marginRight: 8 },
  compName: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary },
  compCode: { fontSize: 10, fontWeight: '800', color: '#38bdf8', marginTop: 2, letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 10.5, fontWeight: '800' },
  statusActive: { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.3)' },
  statusActiveText: { color: '#4ade80' },
  statusSuspended: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  statusSuspendedText: { color: '#f87171' },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 },
  detailLabel: { fontSize: 12, color: colors.textSecondary },
  detailValue: { fontSize: 12, color: colors.textPrimary, fontWeight: '600' },
  cardFooterActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  actionBtnSecondary: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.buttonSecondary, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  actionBtnTextSecondary: { color: '#38bdf8', fontSize: 11, fontWeight: '700' },
  actionBtnDanger: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239, 68, 68, 0.12)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  actionBtnTextDanger: { color: '#f87171', fontSize: 11, fontWeight: '700' },

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
  bellBtn: {
    position: 'relative',
    padding: 4,
    marginLeft: 6,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 7,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
});

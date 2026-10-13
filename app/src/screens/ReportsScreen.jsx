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

// Animated Touchable Component
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

export const ReportsScreen = () => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  
  // Navigation states
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDesc, setReportDesc] = useState('');

  // Data lists states
  const [reportData, setReportData] = useState([]);
  const [summaryData, setSummaryData] = useState(null); // Specifically for Profit & Loss
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Dropdown options lists
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);

  // Active filters states
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selector Modal state
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [activePicker, setActivePicker] = useState(null); // 'property' | 'unit' | 'tenant' | 'status' | 'method' | 'priority'

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const runEntryAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
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

  const reportsList = [
    {
      id: 'rent-roll',
      title: 'Rent Roll Report',
      desc: 'Detailed breakdown of active rents, security deposits, and unit vacancy status across properties.',
      icon: 'business-outline',
      color: '#38bdf8',
      endpoint: '/reports/rent-roll'
    },
    {
      id: 'occupancy',
      title: 'Occupancy Report',
      desc: 'Understand units performance, vacancies, and visual occupancy ratios across all buildings.',
      icon: 'pie-chart-outline',
      color: '#10b981',
      endpoint: '/reports/occupancy'
    },
    {
      id: 'delinquency',
      title: 'Delinquency Report',
      desc: 'Identifies overdue balances, late days, outstanding values, and tenant contacts info.',
      icon: 'alert-circle-outline',
      color: '#ef4444',
      endpoint: '/reports/delinquency'
    },
    {
      id: 'profit-loss',
      title: 'Profit & Loss Statement',
      desc: 'Attributed general ledger financial statement detailing rental income, expenses, and net profit.',
      icon: 'trending-up-outline',
      color: '#a855f7',
      endpoint: '/reports/profit-loss'
    },
    {
      id: 'maintenance',
      title: 'Maintenance Log Report',
      desc: 'Track maintenance requests, assigned vendors, technicians, completion rates, and actual costs.',
      icon: 'hammer-outline',
      color: '#f59e0b',
      endpoint: '/reports/maintenance'
    },
    {
      id: 'payment-history',
      title: 'Payment History Report',
      desc: 'Audit completed transactions, reference check numbers, payment methods, and statuses.',
      icon: 'card-outline',
      color: '#06b6d4',
      endpoint: '/reports/payment-history'
    }
  ];

  // Fetch dropdown collections once
  const fetchFilterOptions = async () => {
    try {
      const [propsRes, unitsRes, tenantsRes] = await Promise.all([
        apiClient.get('/properties', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/units', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/tenants', logout, refreshAccessToken).catch(() => null),
      ]);
      if (propsRes?.data || propsRes) setProperties(propsRes?.data || propsRes || []);
      if (unitsRes?.data || unitsRes) setUnits(unitsRes?.data || unitsRes || []);
      if (tenantsRes?.data || tenantsRes) setTenants(tenantsRes?.data || tenantsRes || []);
    } catch (e) {
      console.log('Failed fetching filter choices:', e.message);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Main reports compiler
  const fetchReportData = async (showLoadingIndicator = true) => {
    if (!selectedReportId) return;

    try {
      if (showLoadingIndicator) setLoading(true);
      
      // Build query string
      const params = new URLSearchParams();
      if (selectedPropertyId) params.append('propertyId', selectedPropertyId);
      if (selectedUnitId) params.append('unitId', selectedUnitId);
      if (selectedTenantId) params.append('tenantId', selectedTenantId);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedPaymentMethod) params.append('paymentMethod', selectedPaymentMethod);
      if (selectedPriority) params.append('priority', selectedPriority);
      if (searchQuery) params.append('search', searchQuery);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const endpoint = `/reports/${selectedReportId}?${params.toString()}`;
      const res = await apiClient.get(endpoint, logout, refreshAccessToken);
      
      if (selectedReportId === 'profit-loss') {
        const payload = res?.data || res || {};
        setSummaryData(payload.data?.summary || { totalIncome: 0, totalExpenses: 0, netProfit: 0 });
        
        // Merge incomes and expenses into a renderable list
        const incomes = (payload.data?.income || []).map(i => ({ ...i, type: 'Income' }));
        const expenses = (payload.data?.expenses || []).map(e => ({ ...e, type: 'Expense' }));
        setReportData([...incomes, ...expenses]);
      } else {
        setReportData(res?.data || res || []);
      }
    } catch (error) {
      console.log(`Failed loading report ${selectedReportId}:`, error.message);
      Alert.alert('Report Error', `Could not construct ${reportTitle}. Please verify inputs.`);
      setReportData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // Re-fetch report when core parameters change
  useEffect(() => {
    if (selectedReportId) {
      fetchReportData();
    } else {
      runEntryAnimation();
    }
  }, [selectedReportId, selectedPropertyId, selectedUnitId, selectedTenantId, selectedStatus, selectedPaymentMethod, selectedPriority, startDate, endDate]);

  const handleSelectReport = (rep) => {
    setReportTitle(rep.title);
    setReportDesc(rep.desc);
    setSelectedReportId(rep.id);
    
    // Clear selections
    setSelectedPropertyId('');
    setSelectedUnitId('');
    setSelectedTenantId('');
    setSelectedStatus('');
    setSelectedPaymentMethod('');
    setSelectedPriority('');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setReportData([]);
    setSummaryData(null);
  };

  const handleBack = () => {
    setSelectedReportId(null);
    setReportTitle('');
    setReportData([]);
    setSummaryData(null);
  };

  const resetFilters = () => {
    setSelectedPropertyId('');
    setSelectedUnitId('');
    setSelectedTenantId('');
    setSelectedStatus('');
    setSelectedPaymentMethod('');
    setSelectedPriority('');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReportData(false);
  };

  const handleExport = (format) => {
    Alert.alert('Export Document', `Your request to export ${reportTitle} to ${format.toUpperCase()} format has been queued in the background audit logs.`);
  };

  // Render modal picker contents
  const getPickerOptions = () => {
    switch (activePicker) {
      case 'property':
        return [
          { value: '', label: 'All Properties' },
          ...properties.map(p => ({ value: p.id, label: p.name })),
        ];
      case 'unit':
        return [
          { value: '', label: 'All Units' },
          ...units.map(u => ({ value: u.id, label: `Unit ${u.unitNumber} (${u.property?.name || 'Property'})` })),
        ];
      case 'tenant':
        return [
          { value: '', label: 'All Tenants' },
          ...tenants.map(t => ({ value: t.id, label: t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim() })),
        ];
      case 'status':
        if (selectedReportId === 'rent-roll') return [{ value: '', label: 'All Statuses' }, { value: 'Active', label: 'Active' }, { value: 'Draft', label: 'Draft' }, { value: 'Pending_Move_In', label: 'Pending Move In' }, { value: 'Terminated', label: 'Terminated' }];
        if (selectedReportId === 'delinquency') return [{ value: '', label: 'All Statuses' }, { value: 'Overdue', label: 'Overdue' }, { value: 'Paid', label: 'Paid' }, { value: 'Partial', label: 'Partially Paid' }];
        if (selectedReportId === 'maintenance') return [{ value: '', label: 'All Statuses' }, { value: 'Open', label: 'Open' }, { value: 'In_Progress', label: 'In Progress' }, { value: 'Completed', label: 'Completed' }, { value: 'Closed', label: 'Closed' }];
        return [{ value: '', label: 'All Statuses' }, { value: 'Paid', label: 'Paid' }, { value: 'Unpaid', label: 'Unpaid' }, { value: 'Pending', label: 'Pending' }];
      case 'method':
        return [{ value: '', label: 'All Payment Methods' }, { value: 'ACH', label: 'ACH/Direct Deposit' }, { value: 'Cash', label: 'Cash' }, { value: 'Check', label: 'Check' }, { value: 'CreditCard', label: 'Credit Card' }];
      case 'priority':
        return [{ value: '', label: 'All Priorities' }, { value: 'Low', label: 'Low' }, { value: 'Medium', label: 'Medium' }, { value: 'High', label: 'High' }, { value: 'Emergency', label: 'Emergency' }];
      default:
        return [];
    }
  };

  const handleSelectPickerValue = (val) => {
    switch (activePicker) {
      case 'property':
        setSelectedPropertyId(val);
        break;
      case 'unit':
        setSelectedUnitId(val);
        break;
      case 'tenant':
        setSelectedTenantId(val);
        break;
      case 'status':
        setSelectedStatus(val);
        break;
      case 'method':
        setSelectedPaymentMethod(val);
        break;
      case 'priority':
        setSelectedPriority(val);
        break;
    }
    setPickerModalOpen(false);
  };

  const getActivePickerLabel = () => {
    const list = getPickerOptions();
    const val = activePicker === 'property' ? selectedPropertyId
              : activePicker === 'unit' ? selectedUnitId
              : activePicker === 'tenant' ? selectedTenantId
              : activePicker === 'status' ? selectedStatus
              : activePicker === 'method' ? selectedPaymentMethod
              : selectedPriority;
    return list.find(item => item.value === val)?.label || 'Tap to select';
  };

  return (
    <View style={styles.mainWrapper}>
      {/* 1. REPORT MAIN MENU VIEW */}
      {selectedReportId === null ? (
        <>
          {/* Fixed Header */}
          <View style={[styles.fixedHeader, { paddingTop: Platform.OS === 'ios' ? 48 : 16 }]}>
            <Text style={styles.title} allowFontScaling={false}>Operational & Financial Reports</Text>
            <Text style={styles.subtitle} allowFontScaling={false}>
              Audit portfolio metrics, vacancies, delinquencies, profit losses statements, and cash flows.
            </Text>
          </View>

          {/* Scrollable list of Report Cards */}
          <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.scrollContent, { paddingTop: 8 }]}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {reportsList.map((rep) => (
                <AnimatedTouchable
                  key={rep.id}
                  style={styles.repCard}
                  onPress={() => handleSelectReport(rep)}
                >
                  <View style={[styles.cardIconBox, { backgroundColor: `${rep.color}15` }]}>
                    <Ionicons name={rep.icon} size={24} color={rep.color} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} allowFontScaling={false}>{rep.title}</Text>
                    <Text style={styles.cardDesc} allowFontScaling={false}>{rep.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={16} color="#475569" />
                </AnimatedTouchable>
              ))}
            </Animated.View>
          </ScrollView>
        </>
      ) : (
        // 2. DETAILED REPORT VIEWER VIEW
        <>
          {/* Fixed Header with back action, title, search and filters toggle */}
          <View style={[styles.fixedHeader, { paddingTop: Platform.OS === 'ios' ? 48 : 16 }]}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Ionicons name="arrow-back-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
              <Text style={styles.backBtnText} allowFontScaling={false}>Back to Reports</Text>
            </TouchableOpacity>

            <View style={styles.headerTitleRow}>
              <Text style={styles.title} allowFontScaling={false}>{reportTitle}</Text>
              <View style={styles.exportRow}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleExport('pdf')}>
                  <Ionicons name="document-outline" size={16} color="#cbd5e1" />
                  <Text style={styles.iconBtnText} allowFontScaling={false}>PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleExport('csv')}>
                  <Ionicons name="grid-outline" size={16} color="#cbd5e1" />
                  <Text style={styles.iconBtnText} allowFontScaling={false}>CSV</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Actions Row */}
            <View style={[styles.searchBarRow, { marginTop: 10 }]}>
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search records..."
                  placeholderTextColor="#64748b"
                  value={searchQuery}
                  onChangeText={(val) => {
                    setSearchQuery(val);
                  }}
                  onSubmitEditing={() => fetchReportData(true)}
                />
              </View>

              <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterModalOpen(true)}>
                <Ionicons name="funnel-outline" size={14} color="#0f172a" />
                <Text style={styles.filterBtnText} allowFontScaling={false}>Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Ionicons name="refresh-outline" size={14} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Listing content Container */}
          <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.scrollContent, { paddingTop: 12 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
          >
            {loading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={styles.loadingText} allowFontScaling={false}>Processing query logs...</Text>
              </View>
            ) : (
              <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                
                {/* --- A. RENDERING FOR PROFIT & LOSS STATEMENT --- */}
                {selectedReportId === 'profit-loss' && (
                  <View>
                    {/* Summary statistics */}
                    <View style={styles.pnLSummaryRow}>
                      <View style={[styles.pnLSummaryBox, { borderLeftColor: '#10b981' }]}>
                        <Text style={styles.pnLSummaryLabel} allowFontScaling={false}>GROSS INCOME</Text>
                        <Text style={[styles.pnLSummaryVal, { color: '#10b981' }]} allowFontScaling={false}>
                          ${(summaryData?.totalIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </View>
                      <View style={[styles.pnLSummaryBox, { borderLeftColor: '#ef4444' }]}>
                        <Text style={styles.pnLSummaryLabel} allowFontScaling={false}>OPERATING EXPENSES</Text>
                        <Text style={[styles.pnLSummaryVal, { color: '#ef4444' }]} allowFontScaling={false}>
                          -${(summaryData?.totalExpenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </View>
                      <View style={[styles.pnLSummaryBox, { borderLeftColor: '#38bdf8' }]}>
                        <Text style={styles.pnLSummaryLabel} allowFontScaling={false}>NET PROFIT</Text>
                        <Text style={[styles.pnLSummaryVal, { color: '#38bdf8' }]} allowFontScaling={false}>
                          ${(summaryData?.netProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </View>
                    </View>

                    {/* Breakdown */}
                    <Text style={styles.reportSectionHeader} allowFontScaling={false}>FINANCIAL BREAKDOWN JOURNAL</Text>
                    {reportData.length === 0 ? (
                      <View style={styles.emptyView}>
                        <Text style={styles.emptyText} allowFontScaling={false}>No ledger journal transactions matches</Text>
                      </View>
                    ) : (
                      reportData.map((item, idx) => (
                        <View key={idx} style={styles.reportCard}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.recordLabel} allowFontScaling={false}>{item.name}</Text>
                            <Text style={[styles.recordValue, { color: item.type === 'Income' ? '#10b981' : '#f87171' }]} allowFontScaling={false}>
                              {item.type === 'Income' ? '+' : '-'}${Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                          </View>
                          <View style={styles.rowBetween}>
                            <Text style={styles.recordSubText} allowFontScaling={false}>Account Category</Text>
                            <Text style={styles.recordSubText} allowFontScaling={false}>{item.type || 'Operational'}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* --- B. RENDERING FOR OCCUPANCY REPORT --- */}
                {selectedReportId === 'occupancy' && (
                  <View>
                    <Text style={styles.reportSectionHeader} allowFontScaling={false}>BUILDING PERFORMANCE STATISTICS</Text>
                    {reportData.length === 0 ? (
                      <View style={styles.emptyView}>
                        <Text style={styles.emptyText} allowFontScaling={false}>No property occupancy records found</Text>
                      </View>
                    ) : (
                      reportData.map((item, idx) => (
                        <View key={idx} style={styles.reportCard}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.recordLabel} allowFontScaling={false}>{item.propertyName}</Text>
                            <Text style={[styles.recordValue, { color: '#38bdf8' }]} allowFontScaling={false}>
                              {item.occupancyPercentage}% Occupancy
                            </Text>
                          </View>
                          
                          {/* Custom Progress Bar */}
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${Math.min(100, item.occupancyPercentage)}%` }]} />
                          </View>

                          <View style={styles.occMetricsGrid}>
                            <View style={styles.metricItem}>
                              <Text style={styles.metricLabel} allowFontScaling={false}>TOTAL</Text>
                              <Text style={styles.metricVal} allowFontScaling={false}>{item.totalUnits} Units</Text>
                            </View>
                            <View style={styles.metricItem}>
                              <Text style={styles.metricLabel} allowFontScaling={false}>OCCUPIED</Text>
                              <Text style={[styles.metricVal, { color: '#10b981' }]} allowFontScaling={false}>{item.occupiedUnits} Units</Text>
                            </View>
                            <View style={styles.metricItem}>
                              <Text style={styles.metricLabel} allowFontScaling={false}>VACANT</Text>
                              <Text style={[styles.metricVal, { color: '#f59e0b' }]} allowFontScaling={false}>{item.vacantUnits} Units</Text>
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* --- C. RENDERING FOR DELINQUENCY REPORT --- */}
                {selectedReportId === 'delinquency' && (
                  <View>
                    <Text style={styles.reportSectionHeader} allowFontScaling={false}>OVERDUE BALANCES LOG</Text>
                    {reportData.length === 0 ? (
                      <View style={styles.emptyView}>
                        <Text style={styles.emptyText} allowFontScaling={false}>No delinquency outstanding balances found</Text>
                      </View>
                    ) : (
                      reportData.map((item, idx) => (
                        <View key={idx} style={styles.reportCard}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.recordLabel} allowFontScaling={false}>{item.tenantName}</Text>
                            <View style={[styles.badge, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: '#ef4444' }]}>
                              <Text style={[styles.badgeText, { color: '#ef4444' }]} allowFontScaling={false}>{item.daysLate} Days Late</Text>
                            </View>
                          </View>

                          <View style={styles.rowBetween}>
                            <Text style={styles.recordSubText} allowFontScaling={false}>Property Alignment</Text>
                            <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.propertyName} · Unit {item.unitNumber}</Text>
                          </View>

                          <View style={styles.divider} />

                          <View style={styles.occMetricsGrid}>
                            <View style={styles.metricItem}>
                              <Text style={styles.metricLabel} allowFontScaling={false}>AMOUNT DUE</Text>
                              <Text style={styles.metricVal} allowFontScaling={false}>${item.rentAmount?.toLocaleString()}</Text>
                            </View>
                            <View style={styles.metricItem}>
                              <Text style={styles.metricLabel} allowFontScaling={false}>AMOUNT PAID</Text>
                              <Text style={[styles.metricVal, { color: '#10b981' }]} allowFontScaling={false}>${item.paidAmount?.toLocaleString()}</Text>
                            </View>
                            <View style={styles.metricItem}>
                              <Text style={styles.metricLabel} allowFontScaling={false}>OUTSTANDING</Text>
                              <Text style={[styles.metricVal, { color: '#ef4444' }]} allowFontScaling={false}>${item.outstandingBalance?.toLocaleString()}</Text>
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* --- D. RENDERING FOR RENT ROLL REPORT --- */}
                {selectedReportId === 'rent-roll' && (
                  <View>
                    <Text style={styles.reportSectionHeader} allowFontScaling={false}>ACTIVE RENTS & LEASE ALLOCATIONS</Text>
                    {reportData.length === 0 ? (
                      <View style={styles.emptyView}>
                        <Text style={styles.emptyText} allowFontScaling={false}>No lease agreements found</Text>
                      </View>
                    ) : (
                      reportData.map((item, idx) => {
                        const leaseStatusColor = item.leaseStatus === 'Active' ? '#10b981' : '#f59e0b';
                        const unitStatusColor = item.unitStatus === 'Occupied' ? '#10b981' : '#f59e0b';
                        return (
                          <View key={idx} style={styles.reportCard}>
                            <View style={styles.rowBetween}>
                              <View>
                                <Text style={styles.recordLabel} allowFontScaling={false}>{item.propertyName}</Text>
                                <Text style={styles.recordSubText} allowFontScaling={false}>{item.unitNumber}</Text>
                              </View>
                              <View style={[styles.badge, { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: '#38bdf8' }]}>
                                <Text style={[styles.badgeText, { color: '#38bdf8' }]} allowFontScaling={false}>${item.monthlyRent}/mo</Text>
                              </View>
                            </View>

                            <View style={styles.rowBetween}>
                              <Text style={styles.recordSubText} allowFontScaling={false}>Occupant Resident</Text>
                              <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.tenantName}</Text>
                            </View>

                            <View style={styles.rowBetween}>
                              <Text style={styles.recordSubText} allowFontScaling={false}>Lease Timeline</Text>
                              <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.startDate} to {item.endDate}</Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.occMetricsGrid}>
                              <View style={styles.metricItem}>
                                <Text style={styles.metricLabel} allowFontScaling={false}>SECURITY DEPOSIT</Text>
                                <Text style={styles.metricVal} allowFontScaling={false}>${item.securityDeposit?.toLocaleString()}</Text>
                              </View>
                              <View style={styles.metricItem}>
                                <Text style={styles.metricLabel} allowFontScaling={false}>LEASE STATUS</Text>
                                <Text style={[styles.metricVal, { color: leaseStatusColor }]} allowFontScaling={false}>{item.leaseStatus}</Text>
                              </View>
                              <View style={styles.metricItem}>
                                <Text style={styles.metricLabel} allowFontScaling={false}>UNIT STATUS</Text>
                                <Text style={[styles.metricVal, { color: unitStatusColor }]} allowFontScaling={false}>{item.unitStatus}</Text>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* --- E. RENDERING FOR MAINTENANCE LOG REPORT --- */}
                {selectedReportId === 'maintenance' && (
                  <View>
                    <Text style={styles.reportSectionHeader} allowFontScaling={false}>SERVICE WORK ORDERS</Text>
                    {reportData.length === 0 ? (
                      <View style={styles.emptyView}>
                        <Text style={styles.emptyText} allowFontScaling={false}>No maintenance log matches found</Text>
                      </View>
                    ) : (
                      reportData.map((item, idx) => {
                        const priColor = item.priority === 'Emergency' ? '#ef4444' : item.priority === 'High' ? '#f59e0b' : '#38bdf8';
                        const statusColor = item.status === 'Completed' || item.status === 'Closed' ? '#10b981' : '#f59e0b';
                        return (
                          <View key={idx} style={styles.reportCard}>
                            <View style={styles.rowBetween}>
                              <Text style={styles.recordLabel} allowFontScaling={false}>{item.ticketId} · {item.issue}</Text>
                              <View style={[styles.badge, { borderColor: priColor, backgroundColor: `${priColor}15` }]}>
                                <Text style={[styles.badgeText, { color: priColor }]} allowFontScaling={false}>{item.priority}</Text>
                              </View>
                            </View>

                            <View style={styles.rowBetween}>
                              <Text style={styles.recordSubText} allowFontScaling={false}>Property</Text>
                              <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.propertyName} · {item.unitNumber}</Text>
                            </View>
                            <View style={styles.rowBetween}>
                              <Text style={styles.recordSubText} allowFontScaling={false}>Assigned Vendor</Text>
                              <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.vendor}</Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.occMetricsGrid}>
                              <View style={styles.metricItem}>
                                <Text style={styles.metricLabel} allowFontScaling={false}>EST COST</Text>
                                <Text style={styles.metricVal} allowFontScaling={false}>${item.estimatedCost}</Text>
                              </View>
                              <View style={styles.metricItem}>
                                <Text style={styles.metricLabel} allowFontScaling={false}>ACTUAL COST</Text>
                                <Text style={[styles.metricVal, { color: '#10b981' }]} allowFontScaling={false}>${item.actualCost}</Text>
                              </View>
                              <View style={styles.metricItem}>
                                <Text style={styles.metricLabel} allowFontScaling={false}>STATUS</Text>
                                <Text style={[styles.metricVal, { color: statusColor }]} allowFontScaling={false}>{item.status}</Text>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* --- F. RENDERING FOR PAYMENT HISTORY REPORT --- */}
                {selectedReportId === 'payment-history' && (
                  <View>
                    <Text style={styles.reportSectionHeader} allowFontScaling={false}>COMPLETED TRANSACTION REFERENCES</Text>
                    {reportData.length === 0 ? (
                      <View style={styles.emptyView}>
                        <Text style={styles.emptyText} allowFontScaling={false}>No completed rental payments found</Text>
                      </View>
                    ) : (
                      reportData.map((item, idx) => (
                        <View key={idx} style={styles.reportCard}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.recordLabel} allowFontScaling={false}>{item.tenantName}</Text>
                            <Text style={[styles.recordValue, { color: '#10b981' }]} allowFontScaling={false}>
                              +${item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                          </View>

                          <View style={styles.rowBetween}>
                            <Text style={styles.recordSubText} allowFontScaling={false}>Property / Unit</Text>
                            <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.propertyName} · {item.unitNumber}</Text>
                          </View>
                          <View style={styles.rowBetween}>
                            <Text style={styles.recordSubText} allowFontScaling={false}>Cleared Date</Text>
                            <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.paymentDate}</Text>
                          </View>

                          <View style={styles.divider} />

                          <View style={styles.occMetricsGrid}>
                            <View style={styles.metricItem}>
                              <Text style={styles.metricLabel} allowFontScaling={false}>PAYMENT METHOD</Text>
                              <Text style={styles.metricVal} allowFontScaling={false}>{item.paymentMethod}</Text>
                            </View>
                            <View style={styles.metricItem}>
                              <Text style={styles.metricLabel} allowFontScaling={false}>REFERENCE / CHECK</Text>
                              <Text style={styles.metricVal} allowFontScaling={false}>{item.referenceNumber}</Text>
                            </View>
                            <View style={styles.metricItem}>
                              <Text style={styles.metricLabel} allowFontScaling={false}>STATUS</Text>
                              <Text style={[styles.metricVal, { color: '#10b981' }]} allowFontScaling={false}>{item.paymentStatus}</Text>
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

              </Animated.View>
            )}
            <View style={{ height: 60 }} />
          </ScrollView>

          {/* --- FILTERS MODAL POPUP --- */}
          <Modal visible={filterModalOpen} animationType="slide" transparent>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle} allowFontScaling={false}>Report Query Filters</Text>
                    <TouchableOpacity onPress={() => setFilterModalOpen(false)}>
                      <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                    
                    {/* Property filter */}
                    <Text style={styles.filterLabel} allowFontScaling={false}>PROPERTY</Text>
                    <TouchableOpacity
                      style={styles.pickerSelector}
                      onPress={() => {
                        setActivePicker('property');
                        setPickerModalOpen(true);
                      }}
                    >
                      <Text style={styles.pickerSelectorText} allowFontScaling={false}>
                        {selectedPropertyId ? properties.find(p => p.id === selectedPropertyId)?.name : 'All Properties'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                    </TouchableOpacity>

                    {/* Unit filter (Show only if applicable) */}
                    {selectedReportId !== 'occupancy' && (
                      <>
                        <Text style={styles.filterLabel} allowFontScaling={false}>UNIT</Text>
                        <TouchableOpacity
                          style={styles.pickerSelector}
                          onPress={() => {
                            setActivePicker('unit');
                            setPickerModalOpen(true);
                          }}
                        >
                          <Text style={styles.pickerSelectorText} allowFontScaling={false}>
                            {selectedUnitId ? `Unit ${units.find(u => u.id === selectedUnitId)?.unitNumber}` : 'All Units'}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                        </TouchableOpacity>
                      </>
                    )}

                    {/* Tenant filter (Show only if applicable) */}
                    {(selectedReportId === 'delinquency' || selectedReportId === 'rent-roll' || selectedReportId === 'payment-history') && (
                      <>
                        <Text style={styles.filterLabel} allowFontScaling={false}>TENANT</Text>
                        <TouchableOpacity
                          style={styles.pickerSelector}
                          onPress={() => {
                            setActivePicker('tenant');
                            setPickerModalOpen(true);
                          }}
                        >
                          <Text style={styles.pickerSelectorText} allowFontScaling={false}>
                            {selectedTenantId ? tenants.find(t => t.id === selectedTenantId)?.name : 'All Tenants'}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                        </TouchableOpacity>
                      </>
                    )}

                    {/* Status filter */}
                    {(selectedReportId === 'rent-roll' || selectedReportId === 'delinquency' || selectedReportId === 'maintenance' || selectedReportId === 'payment-history') && (
                      <>
                        <Text style={styles.filterLabel} allowFontScaling={false}>STATUS</Text>
                        <TouchableOpacity
                          style={styles.pickerSelector}
                          onPress={() => {
                            setActivePicker('status');
                            setPickerModalOpen(true);
                          }}
                        >
                          <Text style={styles.pickerSelectorText} allowFontScaling={false}>
                            {selectedStatus || 'All Statuses'}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                        </TouchableOpacity>
                      </>
                    )}

                    {/* Payment Method filter (only for payment history) */}
                    {selectedReportId === 'payment-history' && (
                      <>
                        <Text style={styles.filterLabel} allowFontScaling={false}>PAYMENT METHOD</Text>
                        <TouchableOpacity
                          style={styles.pickerSelector}
                          onPress={() => {
                            setActivePicker('method');
                            setPickerModalOpen(true);
                          }}
                        >
                          <Text style={styles.pickerSelectorText} allowFontScaling={false}>
                            {selectedPaymentMethod || 'All Payment Methods'}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                        </TouchableOpacity>
                      </>
                    )}

                    {/* Priority filter (only for maintenance log) */}
                    {selectedReportId === 'maintenance' && (
                      <>
                        <Text style={styles.filterLabel} allowFontScaling={false}>PRIORITY</Text>
                        <TouchableOpacity
                          style={styles.pickerSelector}
                          onPress={() => {
                            setActivePicker('priority');
                            setPickerModalOpen(true);
                          }}
                        >
                          <Text style={styles.pickerSelectorText} allowFontScaling={false}>
                            {selectedPriority || 'All Priorities'}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                        </TouchableOpacity>
                      </>
                    )}

                    {/* Date Filters */}
                    <Text style={styles.filterLabel} allowFontScaling={false}>START DATE (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.dateInput}
                      placeholder="e.g. 2026-01-01"
                      placeholderTextColor="#64748b"
                      value={startDate}
                      onChangeText={setStartDate}
                    />

                    <Text style={styles.filterLabel} allowFontScaling={false}>END DATE (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.dateInput}
                      placeholder="e.g. 2026-12-31"
                      placeholderTextColor="#64748b"
                      value={endDate}
                      onChangeText={setEndDate}
                    />

                  </ScrollView>

                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterModalOpen(false)}>
                      <Text style={styles.applyBtnText} allowFontScaling={false}>Apply Query Filters</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* --- DROP DOWN PICKER SELECTOR OPTIONS MODAL --- */}
          <Modal visible={pickerModalOpen} animationType="fade" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.pickerModalContent}>
                <Text style={styles.pickerModalTitle} allowFontScaling={false}>Select Option</Text>
                <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
                  {getPickerOptions().map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={styles.pickerOptionRow}
                      onPress={() => handleSelectPickerValue(opt.value)}
                    >
                      <Text style={styles.pickerOptionText} allowFontScaling={false}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.closePickerBtn} onPress={() => setPickerModalOpen(false)}>
                  <Text style={styles.closePickerBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 60 },
  
  fixedHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    zIndex: 10,
  },
  breadcrumb: { color: '#38bdf8', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 11.5, color: colors.textSecondary, marginTop: 4, lineHeight: 15 },

  // Main reports menu styles
  repCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary },
  cardDesc: { fontSize: 11.5, color: colors.textSecondary, marginTop: 3, lineHeight: 15 },

  // Detailed Viewer Styles
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  backBtnText: { color: '#38bdf8', fontSize: 13, fontWeight: '700' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exportRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconBtnText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', marginLeft: 4 },

  searchBarRow: { flexDirection: 'row', alignItems: 'center' },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 8,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13, height: '100%', padding: 0 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  filterBtnText: { color: '#0f172a', fontSize: 12.5, fontWeight: '800', marginLeft: 4 },
  resetBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginLeft: 8,
  },

  centerLoading: { paddingVertical: 80, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textSecondary, fontSize: 13, marginTop: 10 },

  reportSectionHeader: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, marginTop: 12, marginBottom: 8 },
  emptyView: { backgroundColor: colors.surface, borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  emptyText: { color: colors.textSecondary, fontSize: 13 },

  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 3 },
  recordLabel: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  recordValue: { fontSize: 14, fontWeight: '900' },
  recordSubText: { fontSize: 12, color: colors.textSecondary },
  recordSubTextVal: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 10 },

  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase' },

  // Profit and Loss Summary Styles
  pnLSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  pnLSummaryBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
  },
  pnLSummaryLabel: { fontSize: 8.5, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
  pnLSummaryVal: { fontSize: 12, fontWeight: '900', marginTop: 4 },

  // Occupancy styles
  progressBarBg: { height: 6, backgroundColor: colors.inputBorder, borderRadius: 3, marginVertical: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#38bdf8', borderRadius: 3 },
  occMetricsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  metricItem: { flex: 1, alignItems: 'flex-start' },
  metricLabel: { fontSize: 8.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
  metricVal: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, marginTop: 2 },

  // Filters Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  modalForm: { flex: 1 },
  filterLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  pickerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  pickerSelectorText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  dateInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 10,
    color: colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    fontWeight: '700',
  },
  modalActions: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 16,
    marginTop: 16,
  },
  applyBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyBtnText: { color: '#0f172a', fontSize: 14, fontWeight: '800' },

  // Picker Modal Options
  pickerModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: '85%',
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pickerModalTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  pickerOptionRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  pickerOptionText: { color: colors.textSecondary, fontSize: 13.5, fontWeight: '700' },
  closePickerBtn: {
    marginTop: 14,
    paddingVertical: 10,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    alignItems: 'center',
  },
  closePickerBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
});

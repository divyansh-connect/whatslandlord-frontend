import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
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
  BackHandler,
} from 'react-native';
import { AppActivityIndicator as ActivityIndicator } from '../components/AppActivityIndicator';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

// Animated Touchable Component
const AnimatedTouchable = ({ children, onPress, style, disabled }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.97,
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

// Helper to format header keys nicely (e.g. "tenantName" -> "Tenant Name")
const formatHeaderKey = (key) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

// Helper to sanitize row objects into clean display values
const sanitizeExportData = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  return data.map((item) => {
    const row = {};
    Object.keys(item).forEach((k) => {
      if (k === 'id' || k.toLowerCase().endsWith('id') || k === '__v') return;
      const val = item[k];
      if (val === null || val === undefined) {
        row[formatHeaderKey(k)] = 'N/A';
      } else if (typeof val === 'object') {
        row[formatHeaderKey(k)] = val.name || val.unitNumber || JSON.stringify(val);
      } else if (typeof val === 'boolean') {
        row[formatHeaderKey(k)] = val ? 'Yes' : 'No';
      } else {
        row[formatHeaderKey(k)] = val;
      }
    });
    return row;
  });
};

export const ReportsScreen = ({ onNavigate, onBack }) => {
  const logout = useAuthStore((state) => state.logout);
  const refreshAccessToken = useAuthStore((state) => state.refreshAccessToken);
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  // Navigation states
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDesc, setReportDesc] = useState('');

  // Data lists states
  const [reportData, setReportData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Selected item for Detailed Modal view
  const [viewingItem, setViewingItem] = useState(null);

  useEffect(() => {
    const onBackPress = () => {
      if (selectedReportId !== null) {
        setSelectedReportId(null);
        setReportData([]);
        setSummaryData(null);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [selectedReportId]);

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

  // Filter Modal state
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [expandedFilterSection, setExpandedFilterSection] = useState(null);

  // Metric Drill-Down Modal state
  const [drillDownModalOpen, setDrillDownModalOpen] = useState(false);
  const [drillDownConfig, setDrillDownConfig] = useState({
    title: '',
    subtitle: '',
    metricValue: '',
    icon: 'list-outline',
    color: '#38bdf8',
    filterType: '',
    items: [],
    bottomBtnText: '',
    targetRoute: '',
    targetParams: {},
  });
  const [drillDownSearch, setDrillDownSearch] = useState('');
  const [drillDownStatusFilter, setDrillDownStatusFilter] = useState('ALL');

  // Helper to ensure "Unit" is never duplicated (e.g. avoid "Unit Unit 1F")
  const formatUnitLabel = (val) => {
    if (!val) return 'Unit N/A';
    let str = String(val).trim();
    str = str.replace(/^(unit\s*)+/i, '').trim();
    return str ? `Unit ${str}` : 'Unit N/A';
  };

  // Animations
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const spinReloadButton = () => {
    rotateAnim.setValue(0);
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  const spinInterpolation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // 6 Core Operational & Financial Reports matching Web Frontend 1-to-1
  const reportsList = [
    {
      id: 'rent-roll',
      title: 'Rent Roll Report',
      desc: 'Detailed breakdown of active rents, security deposits, and unit vacancy status across properties.',
      icon: 'document-text-outline',
      color: '#38bdf8',
      bgColor: 'rgba(56, 189, 248, 0.12)',
      borderColor: 'rgba(56, 189, 248, 0.25)',
      endpoint: '/reports/rent-roll',
    },
    {
      id: 'occupancy',
      title: 'Occupancy Report',
      desc: 'Understand units performance, vacancies, and visual occupancy ratios across all buildings.',
      icon: 'pie-chart-outline',
      color: '#818cf8',
      bgColor: 'rgba(129, 140, 248, 0.12)',
      borderColor: 'rgba(129, 140, 248, 0.25)',
      endpoint: '/reports/occupancy',
    },
    {
      id: 'delinquency',
      title: 'Delinquency Report',
      desc: 'Identifies overdue balances, late days, outstanding values, and tenant contacts info.',
      icon: 'alert-circle-outline',
      color: '#f87171',
      bgColor: 'rgba(248, 113, 113, 0.12)',
      borderColor: 'rgba(248, 113, 113, 0.25)',
      endpoint: '/reports/delinquency',
    },
    {
      id: 'profit-loss',
      title: 'Profit & Loss Statement',
      desc: 'Attributed general ledger financial statement detailing rental income, expenses, and net profit.',
      icon: 'trending-up-outline',
      color: '#34d399',
      bgColor: 'rgba(52, 211, 153, 0.12)',
      borderColor: 'rgba(52, 211, 153, 0.25)',
      endpoint: '/reports/profit-loss',
    },
    {
      id: 'maintenance',
      title: 'Maintenance Log Report',
      desc: 'Track maintenance requests, assigned vendors, technicians, completion rates, and actual costs.',
      icon: 'construct-outline',
      color: '#fbbf24',
      bgColor: 'rgba(251, 191, 36, 0.12)',
      borderColor: 'rgba(251, 191, 36, 0.25)',
      endpoint: '/reports/maintenance',
    },
    {
      id: 'payment-history',
      title: 'Payment History Report',
      desc: 'Audit completed transactions, reference check numbers, payment methods, and statuses.',
      icon: 'card-outline',
      color: '#2dd4bf',
      bgColor: 'rgba(45, 212, 191, 0.12)',
      borderColor: 'rgba(45, 212, 191, 0.25)',
      endpoint: '/reports/payment-history',
    },
  ];

  // Fetch dropdown collections once on mount
  useEffect(() => {
    let active = true;
    const fetchFilterOptions = async () => {
      try {
        const [propsRes, unitsRes, tenantsRes] = await Promise.all([
          apiClient.get('/properties', logout, refreshAccessToken).catch(() => null),
          apiClient.get('/units', logout, refreshAccessToken).catch(() => null),
          apiClient.get('/tenants', logout, refreshAccessToken).catch(() => null),
        ]);
        if (active) {
          if (propsRes?.data || propsRes) setProperties(propsRes?.data || propsRes || []);
          if (unitsRes?.data || unitsRes) setUnits(unitsRes?.data || unitsRes || []);
          if (tenantsRes?.data || tenantsRes) setTenants(tenantsRes?.data || tenantsRes || []);
        }
      } catch (e) {
        console.log('Failed fetching filter choices:', e?.message || e);
      }
    };
    fetchFilterOptions();
    return () => {
      active = false;
    };
  }, []);

  // Main reports compiler calling EXACT same APIs as web frontend
  const fetchReportData = async (showLoadingIndicator = true, queryOverride = null) => {
    if (!selectedReportId) return;

    try {
      if (showLoadingIndicator && reportData.length === 0) setLoading(true);
      spinReloadButton();

      const params = new URLSearchParams();
      if (selectedPropertyId) params.append('propertyId', selectedPropertyId);
      if (selectedUnitId) params.append('unitId', selectedUnitId);
      if (selectedTenantId) params.append('tenantId', selectedTenantId);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedPaymentMethod) params.append('paymentMethod', selectedPaymentMethod);
      if (selectedPriority) params.append('priority', selectedPriority);

      const q = queryOverride !== null ? queryOverride : searchQuery;
      if (q) params.append('search', q);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const endpoint = `/reports/${selectedReportId}?${params.toString()}`;
      const res = await apiClient.get(endpoint, logout, refreshAccessToken);

      if (!isMountedRef.current) return;

      if (selectedReportId === 'profit-loss') {
        const payload = res?.data || res || {};
        const incomes = (payload.income || payload.data?.income || []).map((i) => ({ ...i, type: 'Income' }));
        const expenses = (payload.expenses || payload.data?.expenses || []).map((e) => ({
          ...e,
          type: 'Expense',
        }));
        const transactions = payload.transactions || payload.data?.transactions || [];
        const transIncome = transactions.filter((t) => t.type === 'Income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const transExpenses = transactions.filter((t) => t.type === 'Expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

        const totalIncome = transIncome > 0 ? transIncome : (payload.summary?.totalIncome || payload.data?.summary?.totalIncome || incomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0));
        const totalExpenses = transExpenses > 0 ? transExpenses : (payload.summary?.totalExpenses || payload.data?.summary?.totalExpenses || expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0));
        const plSummary = {
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses,
        };
        setSummaryData(plSummary);
        setReportData(transactions.length > 0 ? transactions : [...incomes, ...expenses]);
      } else {
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];

        // Exact fallback summary logic from Frontend web app
        let summary = res?.summary || null;
        if (!summary) {
          if (selectedReportId === 'rent-roll') {
            const occupiedCount = list.filter((i) => i.unitStatus === 'Occupied' || i.leaseStatus === 'Active').length;
            summary = {
              totalMonthlyRent: list.reduce((acc, curr) => acc + (Number(curr.monthlyRent) || 0), 0),
              totalSecurityDeposits: list.reduce((acc, curr) => acc + (Number(curr.securityDeposit) || 0), 0),
              occupiedCount,
              vacantCount: Math.max(0, list.length - occupiedCount),
              totalUnits: res?.pagination?.totalRecords || list.length,
            };
          } else if (selectedReportId === 'occupancy') {
            const totalUnits = list.reduce((acc, curr) => acc + (Number(curr.totalUnits) || 0), 0);
            const occupiedUnits = list.reduce((acc, curr) => acc + (Number(curr.occupiedUnits) || 0), 0);
            const vacantUnits = list.reduce((acc, curr) => acc + (Number(curr.vacantUnits) || 0), 0);
            summary = {
              portfolioTotalUnits: totalUnits,
              portfolioOccupiedUnits: occupiedUnits,
              portfolioVacantUnits: vacantUnits,
              overallOccupancyPercentage: totalUnits > 0 ? parseFloat(((occupiedUnits / totalUnits) * 100).toFixed(1)) : 0.0,
              totalProperties: res?.pagination?.totalRecords || list.length,
            };
          } else if (selectedReportId === 'delinquency') {
            summary = {
              totalDelinquentBalance: list.reduce((acc, curr) => acc + (Number(curr.outstandingBalance) || 0), 0),
              totalOriginalAmount: list.reduce((acc, curr) => acc + (Number(curr.rentAmount) || 0), 0),
              totalDelinquentTenants: new Set(list.map((i) => i.tenantName)).size,
              totalDelinquentInvoices: res?.pagination?.totalRecords || list.length,
              averageDaysLate: list.length > 0 ? Math.round(list.reduce((acc, curr) => acc + (Number(curr.daysLate) || 0), 0) / list.length) : 0,
            };
          } else if (selectedReportId === 'maintenance') {
            const completedCount = list.filter((i) => i.status === 'Completed' || i.status === 'Closed').length;
            summary = {
              totalWorkOrders: res?.pagination?.totalRecords || list.length,
              totalEstimatedCost: list.reduce((acc, curr) => acc + (Number(curr.estimatedCost) || 0), 0),
              totalActualCost: list.reduce((acc, curr) => acc + (Number(curr.actualCost || curr.estimatedCost) || 0), 0),
              completedCount,
              completionRate: list.length > 0 ? parseFloat(((completedCount / list.length) * 100).toFixed(1)) : 0.0,
            };
          } else if (selectedReportId === 'payment-history') {
            const paidItems = list.filter((i) => !i.paymentStatus || ['Paid', 'Partially Paid', 'PartiallyPaid', 'Cleared'].includes(i.paymentStatus));
            summary = {
              totalCollectedAmount: paidItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0),
              totalTransactions: res?.pagination?.totalRecords || list.length,
              averageTransaction: list.length > 0 ? Math.round(list.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) / list.length) : 0,
            };
          }
        }
        setSummaryData(summary);
        setReportData(list);
      }
    } catch (error) {
      console.log(`Failed loading report ${selectedReportId}:`, error?.message || error);
      if (isMountedRef.current) {
        Alert.alert('Report Notice', `Could not fetch ${reportTitle}. Please verify connection.`);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Re-fetch report when core parameters change
  useEffect(() => {
    if (selectedReportId) {
      fetchReportData(true);
    }
  }, [
    selectedReportId,
    selectedPropertyId,
    selectedUnitId,
    selectedTenantId,
    selectedStatus,
    selectedPaymentMethod,
    selectedPriority,
    startDate,
    endDate,
  ]);

  const handleSelectReport = (rep) => {
    setReportTitle(rep.title);
    setReportDesc(rep.desc);
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
    setViewingItem(null);
    setSelectedReportId(rep.id);
  };

  const handleBack = () => {
    setSelectedReportId(null);
    setReportTitle('');
    setReportDesc('');
    setReportData([]);
    setSummaryData(null);
    setViewingItem(null);
    setExpandedFilterSection(null);
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
    setExpandedFilterSection(null);
  };

  // Helper to open Drill-Down Details Modal for any tapped KPI metric figure
  const handleOpenMetricDrillDown = (metricKey) => {
    setDrillDownSearch('');
    setDrillDownStatusFilter('ALL');

    if (!summaryData) return;

    if (selectedReportId === 'occupancy') {
      if (metricKey === 'OCCUPANCY_RATE') {
        const items = (reportData || []).map((p, idx) => ({
          id: p.id || p.propertyId || idx,
          title: p.propertyName || p.name || `Property #${idx + 1}`,
          subtitle: `${p.occupiedUnits || 0} Occupied / ${p.totalUnits || 0} Total Units (${p.vacantUnits || 0} Vacant)`,
          badgeText: `${p.occupancyPercentage || 0}%`,
          badgeColor: (p.occupancyPercentage || 0) >= 80 ? '#10b981' : (p.occupancyPercentage || 0) >= 50 ? '#f59e0b' : '#ef4444',
          badgeBg: (p.occupancyPercentage || 0) >= 80 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          meta: `Occupancy Ratio: ${p.occupancyPercentage || 0}%`,
          propertyId: p.propertyId || p.id,
          type: 'property',
        }));
        setDrillDownConfig({
          title: 'Overall Occupancy Breakdown',
          subtitle: `${summaryData.overallOccupancyPercentage}% occupied across all portfolio properties`,
          metricValue: `${summaryData.overallOccupancyPercentage}%`,
          icon: 'pie-chart-outline',
          color: '#10b981',
          filterType: 'OCCUPANCY_RATE',
          items,
          bottomBtnText: 'View All Portfolio Units (All)',
          targetRoute: 'properties',
          targetParams: { tab: 'units', statusFilter: 'All' },
        });
        setDrillDownModalOpen(true);
      } else if (metricKey === 'TOTAL_UNITS') {
        const items = (units.length > 0 ? units : reportData).map((u, idx) => {
          const propName = u.propertyName || u.property?.name || properties.find((p) => p.id === u.propertyId)?.name || 'Property';
          const isOcc = String(u.status || '').toLowerCase() === 'occupied';
          return {
            id: u.id || idx,
            title: formatUnitLabel(u.unitNumber || u.number || idx + 1),
            subtitle: propName,
            badgeText: isOcc ? 'Occupied' : 'Vacant',
            badgeColor: isOcc ? '#10b981' : '#f59e0b',
            badgeBg: isOcc ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            amount: u.monthlyRent || u.rentAmount ? `$${Number(u.monthlyRent || u.rentAmount).toLocaleString()}/mo` : null,
            meta: u.tenantName || (u.tenants?.length ? `${u.tenants[0].firstName || ''} ${u.tenants[0].lastName || ''}`.trim() : null),
            unitId: u.id,
            propertyId: u.propertyId || u.property?.id,
            type: 'unit',
            status: isOcc ? 'Occupied' : 'Vacant',
          };
        });
        setDrillDownConfig({
          title: 'All Portfolio Units',
          subtitle: `Total ${summaryData.portfolioTotalUnits} units across all properties`,
          metricValue: `${summaryData.portfolioTotalUnits} Units`,
          icon: 'business-outline',
          color: '#38bdf8',
          filterType: 'TOTAL_UNITS',
          items,
          bottomBtnText: `Manage All Units (${summaryData.portfolioTotalUnits})`,
          targetRoute: 'properties',
          targetParams: { tab: 'units', statusFilter: 'All' },
        });
        setDrillDownModalOpen(true);
      } else if (metricKey === 'OCCUPIED_UNITS') {
        // STRICT FILTER: ONLY Occupied units!
        const occUnits = units.filter((u) => String(u.status || '').toLowerCase() === 'occupied');
        const items = (occUnits.length > 0 ? occUnits : units.slice(0, summaryData.portfolioOccupiedUnits || 0)).map((u, idx) => {
          const propName = u.propertyName || u.property?.name || properties.find((p) => p.id === u.propertyId)?.name || 'Property';
          const tName = u.tenantName || (u.tenants?.length ? `${u.tenants[0].firstName || ''} ${u.tenants[0].lastName || ''}`.trim() : 'Occupied Resident');
          return {
            id: u.id || idx,
            title: formatUnitLabel(u.unitNumber || u.number || idx + 1),
            subtitle: propName,
            badgeText: 'Occupied',
            badgeColor: '#10b981',
            badgeBg: 'rgba(16, 185, 129, 0.15)',
            amount: u.monthlyRent || u.rentAmount ? `$${Number(u.monthlyRent || u.rentAmount).toLocaleString()}/mo` : null,
            meta: `Resident: ${tName}`,
            unitId: u.id,
            propertyId: u.propertyId || u.property?.id,
            type: 'unit',
            status: 'Occupied',
          };
        });
        setDrillDownConfig({
          title: 'Occupied Units',
          subtitle: `${summaryData.portfolioOccupiedUnits} actively occupied units`,
          metricValue: `${summaryData.portfolioOccupiedUnits} Occupied`,
          icon: 'person-outline',
          color: '#818cf8',
          filterType: 'OCCUPIED_UNITS',
          items,
          bottomBtnText: `View All Occupied Units (${summaryData.portfolioOccupiedUnits})`,
          targetRoute: 'properties',
          targetParams: { tab: 'units', statusFilter: 'Occupied' },
        });
        setDrillDownModalOpen(true);
      } else if (metricKey === 'VACANT_UNITS') {
        // STRICT FILTER: ONLY Vacant units!
        const vacUnits = units.filter((u) => String(u.status || '').toLowerCase() === 'vacant');
        const items = (vacUnits.length > 0 ? vacUnits : units.slice(0, summaryData.portfolioVacantUnits || 0)).map((u, idx) => {
          const propName = u.propertyName || u.property?.name || properties.find((p) => p.id === u.propertyId)?.name || 'Property';
          return {
            id: u.id || idx,
            title: formatUnitLabel(u.unitNumber || u.number || idx + 1),
            subtitle: propName,
            badgeText: 'Vacant',
            badgeColor: '#fbbf24',
            badgeBg: 'rgba(251, 191, 36, 0.15)',
            amount: u.monthlyRent || u.rentAmount ? `$${Number(u.monthlyRent || u.rentAmount).toLocaleString()}/mo` : null,
            meta: `${u.bedrooms || 0} Beds • ${u.bathrooms || 0} Baths • Ready to Lease`,
            unitId: u.id,
            propertyId: u.propertyId || u.property?.id,
            type: 'unit',
            status: 'Vacant',
          };
        });
        setDrillDownConfig({
          title: 'Vacant Units',
          subtitle: `${summaryData.portfolioVacantUnits} vacant units available for lease`,
          metricValue: `${summaryData.portfolioVacantUnits} Vacant`,
          icon: 'key-outline',
          color: '#fbbf24',
          filterType: 'VACANT_UNITS',
          items,
          bottomBtnText: `View All Vacant Units (${summaryData.portfolioVacantUnits})`,
          targetRoute: 'properties',
          targetParams: { tab: 'units', statusFilter: 'Vacant' },
        });
        setDrillDownModalOpen(true);
      }
    } else if (selectedReportId === 'rent-roll') {
      if (metricKey === 'TOTAL_MONTHLY_RENT') {
        const items = reportData
          .filter((i) => (Number(i.monthlyRent) || 0) > 0 || i.unitStatus === 'Occupied' || i.leaseStatus === 'Active')
          .map((r, idx) => ({
            id: r.id || r.unitId || idx,
            title: `${r.propertyName || 'Property'} • ${formatUnitLabel(r.unitNumber)}`,
            subtitle: r.tenantName ? `Tenant: ${r.tenantName}` : 'Leased Unit',
            badgeText: r.leaseStatus || 'Active',
            badgeColor: '#10b981',
            badgeBg: 'rgba(16, 185, 129, 0.15)',
            amount: `$${Number(r.monthlyRent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}/mo`,
            meta: r.startDate && r.endDate ? `${new Date(r.startDate).toLocaleDateString()} → ${new Date(r.endDate).toLocaleDateString()}` : null,
            unitId: r.unitId,
            propertyId: r.propertyId,
            tenantId: r.tenantId,
            type: 'unit',
            status: 'Occupied',
          }));
        setDrillDownConfig({
          title: 'Active Monthly Rent Roll',
          subtitle: `Total $${Number(summaryData.totalMonthlyRent || 0).toLocaleString()} across active leases`,
          metricValue: `$${Number(summaryData.totalMonthlyRent || 0).toLocaleString()}`,
          icon: 'cash-outline',
          color: '#10b981',
          filterType: 'TOTAL_MONTHLY_RENT',
          items,
          bottomBtnText: 'Go to Rent Invoices & Leases',
          targetRoute: 'rent',
          targetParams: { tab: 'invoices' },
        });
        setDrillDownModalOpen(true);
      } else if (metricKey === 'SECURITY_DEPOSITS') {
        const items = reportData
          .filter((i) => (Number(i.securityDeposit) || 0) > 0)
          .map((r, idx) => ({
            id: r.id || r.unitId || idx,
            title: `${r.propertyName || 'Property'} • ${formatUnitLabel(r.unitNumber)}`,
            subtitle: `Tenant: ${r.tenantName || 'Active Lease'}`,
            badgeText: 'Deposit Held',
            badgeColor: '#6366f1',
            badgeBg: 'rgba(99, 102, 241, 0.15)',
            amount: `$${Number(r.securityDeposit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            meta: `Security Deposit for ${formatUnitLabel(r.unitNumber)}`,
            unitId: r.unitId,
            propertyId: r.propertyId,
            tenantId: r.tenantId,
            type: 'unit',
            status: 'Occupied',
          }));
        setDrillDownConfig({
          title: 'Security Deposits Held',
          subtitle: `Total $${Number(summaryData.totalSecurityDeposits || 0).toLocaleString()} held in escrow`,
          metricValue: `$${Number(summaryData.totalSecurityDeposits || 0).toLocaleString()}`,
          icon: 'shield-checkmark-outline',
          color: '#6366f1',
          filterType: 'SECURITY_DEPOSITS',
          items,
          bottomBtnText: 'Go to Active Leases',
          targetRoute: 'leads',
          targetParams: { tab: 'leases' },
        });
        setDrillDownModalOpen(true);
      } else if (metricKey === 'PORTFOLIO_UNITS') {
        const items = reportData.map((r, idx) => ({
          id: r.id || r.unitId || idx,
          title: `${r.propertyName || 'Property'} • ${formatUnitLabel(r.unitNumber)}`,
          subtitle: r.tenantName ? `Tenant: ${r.tenantName}` : 'Vacant',
          badgeText: r.unitStatus || 'Unit',
          badgeColor: r.unitStatus === 'Occupied' ? '#10b981' : '#f59e0b',
          badgeBg: r.unitStatus === 'Occupied' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          amount: r.monthlyRent ? `$${Number(r.monthlyRent).toLocaleString()}/mo` : null,
          meta: `Rent: $${Number(r.monthlyRent || 0).toLocaleString()} | Deposit: $${Number(r.securityDeposit || 0).toLocaleString()}`,
          unitId: r.unitId,
          propertyId: r.propertyId,
          type: 'unit',
          status: r.unitStatus || 'All',
        }));
        setDrillDownConfig({
          title: 'Rent Roll Portfolio Units',
          subtitle: `${summaryData.totalUnits} Units in Rent Roll`,
          metricValue: `${summaryData.totalUnits} Units`,
          icon: 'business-outline',
          color: '#94a3b8',
          filterType: 'PORTFOLIO_UNITS',
          items,
          bottomBtnText: 'View All Units in Units Tab',
          targetRoute: 'properties',
          targetParams: { tab: 'units', statusFilter: 'All' },
        });
        setDrillDownModalOpen(true);
      } else if (metricKey === 'OCCUPIED_VACANT') {
        const items = reportData.map((r, idx) => {
          const isOcc = r.unitStatus === 'Occupied' || r.leaseStatus === 'Active';
          return {
            id: r.id || r.unitId || idx,
            title: `${r.propertyName || 'Property'} • ${formatUnitLabel(r.unitNumber)}`,
            subtitle: r.tenantName ? `Tenant: ${r.tenantName}` : 'Vacant Unit',
            badgeText: isOcc ? 'Occupied' : 'Vacant',
            badgeColor: isOcc ? '#10b981' : '#f59e0b',
            badgeBg: isOcc ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            amount: r.monthlyRent ? `$${Number(r.monthlyRent).toLocaleString()}/mo` : null,
            meta: isOcc ? `Active Lease • Rent: $${Number(r.monthlyRent || 0).toLocaleString()}` : 'Available for rent',
            unitId: r.unitId,
            propertyId: r.propertyId,
            type: 'unit',
            status: isOcc ? 'Occupied' : 'Vacant',
          };
        });
        setDrillDownConfig({
          title: 'Occupied vs Vacant Units',
          subtitle: `${summaryData.occupiedCount} Occupied / ${summaryData.vacantCount} Vacant`,
          metricValue: `${summaryData.occupiedCount} Occ / ${summaryData.vacantCount} Vac`,
          icon: 'checkmark-circle-outline',
          color: '#38bdf8',
          filterType: 'OCCUPIED_VACANT',
          items,
          bottomBtnText: 'Manage Units Portfolio',
          targetRoute: 'properties',
          targetParams: { tab: 'units' },
        });
        setDrillDownModalOpen(true);
      }
    } else if (selectedReportId === 'delinquency') {
      if (metricKey === 'DELINQUENT_BALANCE' || metricKey === 'OVERDUE_INVOICES') {
        const items = reportData.map((d, idx) => ({
          id: d.id || d.invoiceId || idx,
          title: `${d.tenantName || 'Tenant'} • ${formatUnitLabel(d.unitNumber)}`,
          subtitle: `${d.propertyName || 'Property'} • ${d.daysLate || 0} Days Late`,
          badgeText: `${d.daysLate || 0}d Overdue`,
          badgeColor: '#ef4444',
          badgeBg: 'rgba(239, 68, 68, 0.15)',
          amount: `$${Number(d.outstandingBalance || 0).toLocaleString()}`,
          meta: `Rent: $${Number(d.rentAmount || 0).toLocaleString()} | Days Late: ${d.daysLate || 0}`,
          invoiceId: d.invoiceId || d.id,
          tenantId: d.tenantId,
          type: 'invoice',
        }));
        setDrillDownConfig({
          title: metricKey === 'DELINQUENT_BALANCE' ? 'Delinquent Balances' : 'Overdue Invoices',
          subtitle: `${summaryData.totalDelinquentInvoices} overdue invoices ($${Number(summaryData.totalDelinquentBalance || 0).toLocaleString()} total)`,
          metricValue: metricKey === 'DELINQUENT_BALANCE' ? `$${Number(summaryData.totalDelinquentBalance || 0).toLocaleString()}` : `${summaryData.totalDelinquentInvoices} Invoices`,
          icon: metricKey === 'DELINQUENT_BALANCE' ? 'alert-circle-outline' : 'receipt-outline',
          color: metricKey === 'DELINQUENT_BALANCE' ? '#ef4444' : '#38bdf8',
          filterType: metricKey,
          items,
          bottomBtnText: 'View Overdue Invoices (Filtered)',
          targetRoute: 'rent',
          targetParams: { tab: 'invoices', statusFilter: 'Overdue' },
        });
        setDrillDownModalOpen(true);
      } else if (metricKey === 'DELINQUENT_TENANTS') {
        // Deduplicate tenants
        const tenantMap = new Map();
        reportData.forEach((d) => {
          const key = d.tenantId || d.tenantName;
          if (key && !tenantMap.has(key)) {
            tenantMap.set(key, d);
          }
        });
        const items = Array.from(tenantMap.values()).map((d, idx) => ({
          id: d.tenantId || d.id || idx,
          title: d.tenantName || 'Delinquent Tenant',
          subtitle: `${d.propertyName || 'Property'} • ${formatUnitLabel(d.unitNumber)}`,
          badgeText: 'Delinquent',
          badgeColor: '#fbbf24',
          badgeBg: 'rgba(251, 191, 36, 0.15)',
          amount: `$${Number(d.outstandingBalance || 0).toLocaleString()}`,
          meta: `Overdue: ${d.daysLate || 0} days late`,
          tenantId: d.tenantId || d.id,
          type: 'tenant',
          status: 'Delinquent',
        }));
        setDrillDownConfig({
          title: 'Delinquent Tenants',
          subtitle: `${summaryData.totalDelinquentTenants} residents with overdue balances`,
          metricValue: `${summaryData.totalDelinquentTenants} Tenants`,
          icon: 'people-outline',
          color: '#fbbf24',
          filterType: 'DELINQUENT_TENANTS',
          items,
          bottomBtnText: 'View Delinquent Tenants in Tenants Tab',
          targetRoute: 'tenants',
          targetParams: { statusFilter: 'Delinquent' },
        });
        setDrillDownModalOpen(true);
      } else if (metricKey === 'AVERAGE_DAYS_LATE') {
        const sorted = [...reportData].sort((a, b) => (Number(b.daysLate) || 0) - (Number(a.daysLate) || 0));
        const items = sorted.map((d, idx) => ({
          id: d.id || d.invoiceId || idx,
          title: `${d.tenantName || 'Tenant'} (${formatUnitLabel(d.unitNumber)})`,
          subtitle: `${d.propertyName || ''} • Balance: $${Number(d.outstandingBalance || 0).toLocaleString()}`,
          badgeText: `${d.daysLate || 0} Days Late`,
          badgeColor: (Number(d.daysLate) || 0) > 30 ? '#ef4444' : '#f59e0b',
          badgeBg: (Number(d.daysLate) || 0) > 30 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          amount: `$${Number(d.outstandingBalance || 0).toLocaleString()}`,
          meta: `Days Past Due: ${d.daysLate || 0} days`,
          invoiceId: d.invoiceId || d.id,
          tenantId: d.tenantId,
          type: 'invoice',
        }));
        setDrillDownConfig({
          title: 'Aging Overdue Balances',
          subtitle: `Average ${summaryData.averageDaysLate} Days Late across overdue invoices`,
          metricValue: `${summaryData.averageDaysLate} Days Late`,
          icon: 'time-outline',
          color: '#a855f7',
          filterType: 'AVERAGE_DAYS_LATE',
          items,
          bottomBtnText: 'Go to Rent Ledger',
          targetRoute: 'rent',
          targetParams: { tab: 'ledger' },
        });
        setDrillDownModalOpen(true);
      }
    } else if (selectedReportId === 'profit-loss') {
      if (metricKey === 'GROSS_INCOME') {
        const items = reportData
          .filter((i) => i.type === 'Income')
          .map((i, idx) => ({
            id: i.id || idx,
            title: i.category || i.description || 'Rental Income',
            subtitle: `${i.propertyName || 'Portfolio'}${i.date ? ` • ${new Date(i.date).toLocaleDateString()}` : ''}`,
            badgeText: 'Income',
            badgeColor: '#10b981',
            badgeBg: 'rgba(16, 185, 129, 0.15)',
            amount: `+$${Number(i.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            type: 'accounting',
            tab: 'income',
          }));
        setDrillDownConfig({
          title: 'Gross Income Ledger',
          subtitle: `Total Revenue: $${Number(summaryData.totalIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          metricValue: `$${Number(summaryData.totalIncome || 0).toLocaleString()}`,
          icon: 'trending-up-outline',
          color: '#10b981',
          filterType: 'GROSS_INCOME',
          items,
          bottomBtnText: 'View Income Ledger (Filtered)',
          targetRoute: 'accounting',
          targetParams: { tab: 'income' },
        });
        setDrillDownModalOpen(true);
      } else if (metricKey === 'TOTAL_EXPENSES') {
        const items = reportData
          .filter((i) => i.type === 'Expense')
          .map((i, idx) => ({
            id: i.id || idx,
            title: i.category || i.description || 'Expense Item',
            subtitle: `${i.propertyName || 'Portfolio'}${i.date ? ` • ${new Date(i.date).toLocaleDateString()}` : ''}`,
            badgeText: 'Expense',
            badgeColor: '#ef4444',
            badgeBg: 'rgba(239, 68, 68, 0.15)',
            amount: `-$${Number(i.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            type: 'accounting',
            tab: 'expenses',
          }));
        setDrillDownConfig({
          title: 'Operating Expenses',
          subtitle: `Total Expenses: -$${Number(summaryData.totalExpenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          metricValue: `-$${Number(summaryData.totalExpenses || 0).toLocaleString()}`,
          icon: 'trending-down-outline',
          color: '#ef4444',
          filterType: 'TOTAL_EXPENSES',
          items,
          bottomBtnText: 'View Expense Ledger (Filtered)',
          targetRoute: 'accounting',
          targetParams: { tab: 'expenses' },
        });
        setDrillDownModalOpen(true);
      } else if (metricKey === 'NET_PROFIT') {
        const items = reportData.map((i, idx) => ({
          id: i.id || idx,
          title: i.category || i.description || i.type,
          subtitle: `${i.propertyName || 'Portfolio'}${i.date ? ` • ${new Date(i.date).toLocaleDateString()}` : ''}`,
          badgeText: i.type,
          badgeColor: i.type === 'Income' ? '#10b981' : '#ef4444',
          badgeBg: i.type === 'Income' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          amount: `${i.type === 'Income' ? '+' : '-'}$${Number(i.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          type: 'accounting',
          tab: i.type === 'Income' ? 'income' : 'expenses',
        }));
        setDrillDownConfig({
          title: 'Net Profit Statement',
          subtitle: `Net Operating Income: $${Number(summaryData.netProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          metricValue: `$${Number(summaryData.netProfit || 0).toLocaleString()}`,
          icon: 'analytics-outline',
          color: '#38bdf8',
          filterType: 'NET_PROFIT',
          items,
          bottomBtnText: 'Go to Chart of Accounts',
          targetRoute: 'accounting',
          targetParams: { tab: 'coa' },
        });
        setDrillDownModalOpen(true);
      }
    } else if (selectedReportId === 'maintenance') {
      if (metricKey === 'TOTAL_WORK_ORDERS') {
        const items = reportData.map((m, idx) => ({
          id: m.id || m.workOrderId || idx,
          title: m.issue || m.title || `Work Order #${idx + 1}`,
          subtitle: `${m.propertyName || 'Property'} ${formatUnitLabel(m.unitNumber)} • Priority: ${m.priority || 'Normal'}`.trim(),
          badgeText: m.status || 'Open',
          badgeColor: m.status === 'Completed' ? '#10b981' : m.priority === 'High' ? '#ef4444' : '#38bdf8',
          badgeBg: 'rgba(56, 189, 248, 0.15)',
          amount: m.actualCost || m.estimatedCost ? `$${Number(m.actualCost || m.estimatedCost).toLocaleString()}` : null,
          meta: `Assigned: ${m.vendorName || m.technician || 'Staff'}`,
          workOrderId: m.id || m.workOrderId,
          type: 'work_order',
        }));
        setDrillDownConfig({
          title: 'All Maintenance Work Orders',
          subtitle: `${summaryData.totalWorkOrders} total maintenance work orders logged`,
          metricValue: `${summaryData.totalWorkOrders} Orders`,
          icon: 'construct-outline',
          color: '#38bdf8',
          filterType: 'TOTAL_WORK_ORDERS',
          items,
          bottomBtnText: 'View All Work Orders',
          targetRoute: 'maintenance',
          targetParams: { tab: 'work_orders' },
        });
        setDrillDownModalOpen(true);
      } else if (metricKey === 'ESTIMATED_COST' || metricKey === 'ACTUAL_COST') {
        const isEst = metricKey === 'ESTIMATED_COST';
        const items = reportData
          .filter((m) => (Number(isEst ? m.estimatedCost : (m.actualCost || m.estimatedCost)) || 0) > 0)
          .map((m, idx) => ({
            id: m.id || m.workOrderId || idx,
            title: m.issue || m.title || 'Work Order',
            subtitle: `${m.propertyName || ''} ${formatUnitLabel(m.unitNumber)} • Status: ${m.status || 'Active'}`.trim(),
            badgeText: isEst ? 'Estimated' : 'Actual Cost',
            badgeColor: isEst ? '#fbbf24' : '#10b981',
            badgeBg: isEst ? 'rgba(251, 191, 36, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            amount: `$${Number(isEst ? m.estimatedCost : (m.actualCost || m.estimatedCost) || 0).toLocaleString()}`,
            meta: `Cost for: ${m.issue || 'Service'}`,
            workOrderId: m.id || m.workOrderId,
            type: 'work_order',
          }));
        setDrillDownConfig({
          title: isEst ? 'Estimated Maintenance Costs' : 'Actual Maintenance Costs',
          subtitle: `Total: $${Number(isEst ? summaryData.totalEstimatedCost : summaryData.totalActualCost || 0).toLocaleString()}`,
          metricValue: `$${Number(isEst ? summaryData.totalEstimatedCost : summaryData.totalActualCost || 0).toLocaleString()}`,
          icon: isEst ? 'cash-outline' : 'wallet-outline',
          color: isEst ? '#fbbf24' : '#10b981',
          filterType: metricKey,
          items,
          bottomBtnText: 'View Maintenance Work Orders',
          targetRoute: 'maintenance',
          targetParams: { tab: 'work_orders' },
        });
        setDrillDownModalOpen(true);
      } else if (metricKey === 'COMPLETION_RATE') {
        const completed = reportData.filter((m) => m.status === 'Completed' || m.status === 'Closed');
        const items = completed.map((m, idx) => ({
          id: m.id || m.workOrderId || idx,
          title: m.issue || m.title || 'Work Order',
          subtitle: `${m.propertyName || ''} ${formatUnitLabel(m.unitNumber)} • Priority: ${m.priority || 'Normal'}`.trim(),
          badgeText: 'Completed',
          badgeColor: '#10b981',
          badgeBg: 'rgba(16, 185, 129, 0.15)',
          amount: m.actualCost ? `$${Number(m.actualCost).toLocaleString()}` : null,
          meta: `Resolved: ${m.completionDate || 'Closed'}`,
          workOrderId: m.id || m.workOrderId,
          type: 'work_order',
        }));
        setDrillDownConfig({
          title: 'Completed Maintenance Orders',
          subtitle: `${summaryData.completedCount || 0} completed orders (${summaryData.completionRate}% completion rate)`,
          metricValue: `${summaryData.completionRate}% Done`,
          icon: 'checkmark-done-circle-outline',
          color: '#a855f7',
          filterType: 'COMPLETION_RATE',
          items,
          bottomBtnText: 'View Completed Work Orders (Filtered)',
          targetRoute: 'maintenance',
          targetParams: { tab: 'work_orders', statusFilter: 'Completed' },
        });
        setDrillDownModalOpen(true);
      }
    } else if (selectedReportId === 'payment-history') {
      if (metricKey === 'TOTAL_COLLECTED' || metricKey === 'TRANSACTIONS' || metricKey === 'AVERAGE_PAYMENT') {
        const items = reportData.map((p, idx) => ({
          id: p.id || p.paymentId || idx,
          title: p.tenantName ? `Payment from ${p.tenantName}` : `Payment #${p.referenceNumber || idx + 1}`,
          subtitle: `${p.propertyName || 'Property'} • ${p.paymentMethod || 'ACH'}${p.paymentDate ? ` • ${p.paymentDate}` : ''}`,
          badgeText: p.status || 'Completed',
          badgeColor: '#10b981',
          badgeBg: 'rgba(16, 185, 129, 0.15)',
          amount: `+$${Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          meta: p.referenceNumber ? `Ref: ${p.referenceNumber}` : null,
          paymentId: p.id || p.paymentId,
          type: 'payment',
        }));
        setDrillDownConfig({
          title: metricKey === 'TOTAL_COLLECTED' ? 'Total Payments Collected' : metricKey === 'TRANSACTIONS' ? 'Recorded Transactions' : 'Payment History Ledger',
          subtitle: `${summaryData.totalTransactions} payments totaling $${Number(summaryData.totalCollectedAmount || 0).toLocaleString()}`,
          metricValue: metricKey === 'TOTAL_COLLECTED' ? `$${Number(summaryData.totalCollectedAmount || 0).toLocaleString()}` : `${summaryData.totalTransactions} Txns`,
          icon: metricKey === 'TOTAL_COLLECTED' ? 'cash-outline' : 'card-outline',
          color: '#10b981',
          filterType: metricKey,
          items,
          bottomBtnText: 'View All Payments in Payments Tab',
          targetRoute: 'rent',
          targetParams: { tab: 'payments' },
        });
        setDrillDownModalOpen(true);
      } else if (metricKey === 'TOP_METHOD') {
        const topMethod = summaryData.topMethod || 'ACH';
        const filtered = reportData.filter((p) => String(p.paymentMethod || '').toLowerCase() === topMethod.toLowerCase());
        const items = (filtered.length > 0 ? filtered : reportData).map((p, idx) => ({
          id: p.id || p.paymentId || idx,
          title: p.tenantName ? `Payment from ${p.tenantName}` : `Payment #${p.referenceNumber || idx + 1}`,
          subtitle: `${p.propertyName || ''} • Method: ${p.paymentMethod || topMethod}`,
          badgeText: topMethod,
          badgeColor: '#fbbf24',
          badgeBg: 'rgba(251, 191, 36, 0.15)',
          amount: `+$${Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          paymentId: p.id || p.paymentId,
          type: 'payment',
        }));
        setDrillDownConfig({
          title: `Payments via ${topMethod}`,
          subtitle: `Most frequent payment method across ${items.length} payments`,
          metricValue: topMethod,
          icon: 'swap-horizontal-outline',
          color: '#fbbf24',
          filterType: 'TOP_METHOD',
          items,
          bottomBtnText: 'View All Payments in Payments Tab',
          targetRoute: 'rent',
          targetParams: { tab: 'payments' },
        });
        setDrillDownModalOpen(true);
      }
    }
  };

  // Deep-link to specific record detail from Drill-down Modal
  const handleDrillDownItemPress = (item) => {
    setDrillDownModalOpen(false);
    if (!item) return;

    if (item.type === 'unit' && item.unitId) {
      onNavigate?.('properties', {
        tab: 'units',
        unitId: item.unitId,
        statusFilter: item.status || 'All',
      });
    } else if (item.type === 'property' && item.propertyId) {
      onNavigate?.('properties', {
        tab: 'units',
        propertyId: item.propertyId,
        statusFilter: 'All',
      });
    } else if (item.type === 'tenant' && item.tenantId) {
      onNavigate?.('tenants', {
        tenantId: item.tenantId,
        statusFilter: item.status || 'Delinquent',
      });
    } else if (item.type === 'invoice' && item.invoiceId) {
      onNavigate?.('rent', {
        tab: 'invoices',
        invoiceId: item.invoiceId,
        statusFilter: 'Overdue',
      });
    } else if (item.type === 'work_order' && item.workOrderId) {
      onNavigate?.('maintenance', {
        tab: 'work_orders',
        workOrderId: item.workOrderId,
      });
    } else if (item.type === 'payment' && item.paymentId) {
      onNavigate?.('rent', {
        tab: 'payments',
        paymentId: item.paymentId,
      });
    } else if (item.type === 'accounting') {
      onNavigate?.('accounting', {
        tab: item.tab || 'income',
      });
    }
  };

  // Deep-link to parent module with pre-applied filter from bottom button
  const handleDrillDownBottomBtnPress = () => {
    setDrillDownModalOpen(false);
    if (drillDownConfig.targetRoute) {
      onNavigate?.(drillDownConfig.targetRoute, drillDownConfig.targetParams);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReportData(false);
  };

  // Export handler matching Frontend web app export functionality
  const handleExport = async (fileType) => {
    if (!reportData || reportData.length === 0) {
      Alert.alert('Notice', 'No report data available to export.');
      return;
    }

    setIsExporting(true);
    const sanitized = sanitizeExportData(reportData);
    if (sanitized.length === 0) {
      setIsExporting(false);
      Alert.alert('Notice', 'No records to export.');
      return;
    }

    const reportSlug = (selectedReportId || 'report').replace(/-/g, '_');
    const timestamp = Date.now();
    const fileName = `${reportSlug}_report_${timestamp}`;

    // Silent background export audit log to backend
    apiClient
      .post(
        '/reports/exports',
        {
          reportType: reportSlug.toUpperCase(),
          filters: {
            propertyId: selectedPropertyId,
            unitId: selectedUnitId,
            tenantId: selectedTenantId,
            status: selectedStatus,
            startDate,
            endDate,
          },
          fileName: `${fileName}.${fileType.toLowerCase()}`,
          fileType,
        },
        logout,
        refreshAccessToken
      )
      .catch((err) => console.log('Audit log export error:', err?.message || err));

    try {
      if (fileType === 'CSV' || fileType === 'XLSX') {
        const headers = Object.keys(sanitized[0]);
        const csvRows = [
          headers.join(','),
          ...sanitized.map((row) =>
            headers
              .map((h) => {
                const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
                return `"${val.replace(/"/g, '""')}"`;
              })
              .join(',')
          ),
        ];

        const csvContent = '\uFEFF' + csvRows.join('\n');
        const ext = fileType === 'CSV' ? 'csv' : 'csv';
        const fileUri = `${FileSystem.cacheDirectory}${fileName}.${ext}`;

        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: fileType === 'CSV' ? 'text/csv' : 'application/vnd.ms-excel',
            dialogTitle: `Export ${reportTitle} (${fileType})`,
          });
        } else {
          Alert.alert('Export Complete', `File saved as ${fileName}.${ext}`);
        }
      } else if (fileType === 'PDF') {
        const headers = Object.keys(sanitized[0]);
        const tableHeaderHtml = headers
          .map(
            (h) =>
              `<th style="border: 1px solid #cbd5e1; padding: 8px 10px; background-color: #f1f5f9; color: #1e293b; font-size: 11px; text-align: left; font-weight: 700;">${h}</th>`
          )
          .join('');

        const tableBodyHtml = sanitized
          .map(
            (row, idx) =>
              `<tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">` +
              headers
                .map(
                  (h) =>
                    `<td style="border: 1px solid #e2e8f0; padding: 7px 10px; font-size: 10px; color: #334155;">${row[h]}</td>`
                )
                .join('') +
              '</tr>'
          )
          .join('');

        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>${reportTitle}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; margin: 0; }
                h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
                p.desc { font-size: 11px; color: #64748b; margin: 0 0 16px 0; }
                .meta { font-size: 9px; color: #94a3b8; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              </style>
            </head>
            <body>
              <h1>${reportTitle}</h1>
              <p class="desc">${reportDesc || 'Run, audit, and export multi-tenant property reports.'}</p>
              <div class="meta">Generated: ${new Date().toLocaleString()} | Total Records: ${sanitized.length}</div>
              <table>
                <thead>
                  <tr>${tableHeaderHtml}</tr>
                </thead>
                <tbody>
                  ${tableBodyHtml}
                </tbody>
              </table>
            </body>
          </html>
        `;

        const { uri } = await Print.printToFileAsync({ html });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Export ${reportTitle} (PDF)`,
          });
        } else {
          Alert.alert('Export Complete', 'PDF generated successfully.');
        }
      }
    } catch (error) {
      console.log('Export failed:', error);
      Alert.alert('Export Error', 'Could not export file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Get active filter count
  const activeFilterCount = [
    selectedPropertyId,
    selectedUnitId,
    selectedTenantId,
    selectedStatus,
    selectedPaymentMethod,
    selectedPriority,
    startDate,
    endDate,
  ].filter(Boolean).length;

  // Cascading filtered units and tenants
  const filteredUnits = selectedPropertyId
    ? units.filter((u) => u.propertyId === selectedPropertyId || u.property?.id === selectedPropertyId)
    : units;

  const filteredTenants = tenants.filter((t) => {
    if (selectedUnitId) {
      return t.unitId === selectedUnitId || t.unit?.id === selectedUnitId;
    }
    if (selectedPropertyId) {
      return (
        t.propertyId === selectedPropertyId ||
        t.unit?.propertyId === selectedPropertyId ||
        t.unit?.property?.id === selectedPropertyId ||
        (Array.isArray(t.leases) && t.leases.some((l) => l.propertyId === selectedPropertyId))
      );
    }
    return true;
  });

  const handleSelectProperty = (propId) => {
    setSelectedPropertyId(propId);
    setSelectedUnitId('');
    setSelectedTenantId('');
    setExpandedFilterSection(null);
  };

  const handleSelectUnit = (unitId) => {
    setSelectedUnitId(unitId);
    setSelectedTenantId('');
    setExpandedFilterSection(null);
  };

  // Real-time client-side filtering across selected Property, Unit, Tenant, Status, Priority, Payment Method, and Search
  const filteredData = reportData.filter((item) => {
    if (!item) return false;

    // Filter by selected Property
    if (selectedPropertyId) {
      const selectedProp = properties.find((p) => p.id === selectedPropertyId);
      const targetPropName = selectedProp?.name?.toLowerCase().trim();
      const itemPropId = item.propertyId || item.property?.id;
      const itemPropName = (item.propertyName || item.property?.name)?.toLowerCase().trim();

      const idMatches = itemPropId && itemPropId === selectedPropertyId;
      const nameMatches = targetPropName && itemPropName && (
        itemPropName === targetPropName ||
        itemPropName.includes(targetPropName) ||
        targetPropName.includes(itemPropName)
      );

      if (!idMatches && !nameMatches) return false;
    }

    // Filter by selected Unit
    if (selectedUnitId) {
      const selectedUnit = units.find((u) => u.id === selectedUnitId);
      const targetUnitNum = selectedUnit?.unitNumber?.toString().toLowerCase().replace(/^unit\s*/i, '').trim();
      const itemUnitId = item.unitId || item.unit?.id;
      const itemUnitNum = (item.unitNumber || item.unit?.unitNumber)?.toString().toLowerCase().replace(/^unit\s*/i, '').trim();

      const idMatches = itemUnitId && itemUnitId === selectedUnitId;
      const numMatches = targetUnitNum && itemUnitNum && (
        itemUnitNum === targetUnitNum ||
        itemUnitNum.endsWith(targetUnitNum) ||
        targetUnitNum.endsWith(itemUnitNum)
      );

      if (!idMatches && !numMatches) return false;
    }

    // Filter by selected Tenant
    if (selectedTenantId) {
      const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
      const targetTenantName = selectedTenant
        ? `${selectedTenant.firstName || ''} ${selectedTenant.lastName || ''}`.toLowerCase().trim()
        : '';
      const itemTenantId = item.tenantId || item.tenant?.id;
      const itemTenantName = (
        item.tenantName ||
        (item.tenant ? `${item.tenant.firstName || ''} ${item.tenant.lastName || ''}` : '')
      )?.toLowerCase().trim();

      const idMatches = itemTenantId && itemTenantId === selectedTenantId;
      const nameMatches = targetTenantName && itemTenantName && (
        itemTenantName === targetTenantName ||
        itemTenantName.includes(targetTenantName) ||
        targetTenantName.includes(itemTenantName)
      );

      if (!idMatches && !nameMatches) return false;
    }

    // Filter by selected Status
    if (selectedStatus) {
      const itemStatus = item.status || item.leaseStatus || item.unitStatus || item.paymentStatus;
      if (itemStatus && String(itemStatus).toLowerCase() !== selectedStatus.toLowerCase()) return false;
    }

    // Filter by selected Priority (Maintenance)
    if (selectedPriority) {
      const itemPriority = item.priority;
      if (itemPriority && String(itemPriority).toLowerCase() !== selectedPriority.toLowerCase()) return false;
    }

    // Filter by selected Payment Method
    if (selectedPaymentMethod) {
      const itemMethod = item.paymentMethod;
      if (itemMethod && String(itemMethod).toLowerCase() !== selectedPaymentMethod.toLowerCase()) return false;
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    return Object.values(item).some((val) => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'object') {
        return Object.values(val).some((nestedVal) =>
          String(nestedVal).toLowerCase().includes(q)
        );
      }
      return String(val).toLowerCase().includes(q);
    });
  });

  // Status choice options
  const getStatusChoices = () => {
    if (selectedReportId === 'rent-roll') {
      return [
        { label: 'All Statuses', value: '' },
        { label: 'Active', value: 'Active' },
        { label: 'Vacant', value: 'Vacant' },
        { label: 'Draft', value: 'Draft' },
        { label: 'Pending Move In', value: 'Pending_Move_In' },
        { label: 'Terminated', value: 'Terminated' },
        { label: 'Expired', value: 'Expired' },
      ];
    }
    if (selectedReportId === 'delinquency') {
      return [
        { label: 'All Statuses', value: '' },
        { label: 'Overdue', value: 'Overdue' },
        { label: 'Paid', value: 'Paid' },
        { label: 'Partially Paid', value: 'Partial' },
      ];
    }
    if (selectedReportId === 'maintenance') {
      return [
        { label: 'All Statuses', value: '' },
        { label: 'Open', value: 'Open' },
        { label: 'In Progress', value: 'InProgress' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Closed', value: 'Closed' },
      ];
    }
    return [
      { label: 'All Statuses', value: '' },
      { label: 'Paid', value: 'Paid' },
      { label: 'Unpaid', value: 'Unpaid' },
      { label: 'Pending', value: 'Pending' },
    ];
  };

  return (
    <View style={styles.mainWrapper}>
      {/* 1. REPORT MAIN DIRECTORY VIEW (MATCHING FRONTEND PHOTO 1) */}
      {selectedReportId === null ? (
        <>
          {/* Header */}
          <View style={[styles.fixedHeader, { paddingTop: Platform.OS === 'ios' ? 48 : 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              {(!!onNavigate || !!onBack) && (
                <TouchableOpacity
                  onPress={() => (onBack ? onBack() : onNavigate ? onNavigate('back') : null)}
                  style={{ marginRight: 8, padding: 4 }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              )}
              <Text style={[styles.title, { flex: 1, marginBottom: 0 }]} allowFontScaling={false}>Reports</Text>
            </View>
            <Text style={styles.subtitle} allowFontScaling={false}>
              Run, audit, and export multi-tenant property reports.
            </Text>
          </View>

          {/* Scrollable list of Report Cards */}
          <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.scrollContent, { paddingTop: 14 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ width: '100%' }}>
              {reportsList.map((rep) => (
                <AnimatedTouchable
                  key={rep.id}
                  style={styles.repCard}
                  onPress={() => handleSelectReport(rep)}
                >
                  <View style={styles.repCardHeader}>
                    <View style={[styles.cardIconBox, { backgroundColor: rep.bgColor, borderColor: rep.borderColor }]}>
                      <Ionicons name={rep.icon} size={24} color={rep.color} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} allowFontScaling={false}>{rep.title}</Text>
                      <Text style={styles.cardDesc} allowFontScaling={false}>{rep.desc}</Text>
                    </View>
                  </View>

                  <View style={styles.generateReportRow}>
                    <Text style={styles.generateReportText} allowFontScaling={false}>Generate Report</Text>
                    <Ionicons name="arrow-forward" size={14} color="#38bdf8" />
                  </View>
                </AnimatedTouchable>
              ))}

              {/* Reporting Export & Audit Center Card */}
              <View style={styles.auditCenterCard}>
                <View style={styles.auditCenterHeader}>
                  <Ionicons name="shield-checkmark" size={18} color="#6366f1" />
                  <Text style={styles.auditCenterTitle} allowFontScaling={false}>Reporting Export & Audit Center</Text>
                </View>
                <Text style={styles.auditCenterDesc} allowFontScaling={false}>
                  Large datasets exceeding local export limits are compiled in the background to ensure fast dashboard rendering. All export jobs are isolated by company access logs and stored securely for audit references.
                </Text>
              </View>
            </View>
          </ScrollView>
        </>
      ) : (
        // 2. DETAILED REPORT VIEWER (MATCHING FRONTEND PHOTO 2)
        <>
          {/* Header with back action, title, subtitle */}
          <View style={[styles.fixedHeader, { paddingTop: Platform.OS === 'ios' ? 48 : 16 }]}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Ionicons name="chevron-back" size={18} color="#38bdf8" style={{ marginRight: 4 }} />
              <Text style={styles.backBtnText} allowFontScaling={false}>Back to Reports</Text>
            </TouchableOpacity>

            <View style={styles.headerTitleRow}>
              <Text style={styles.title} numberOfLines={1} allowFontScaling={false}>
                {reportTitle}
              </Text>
            </View>
            <Text style={styles.subtitle} numberOfLines={2} allowFontScaling={false}>
              {reportDesc}
            </Text>

            {/* Export Options Bar: CSV | Excel | PDF */}
            <View style={styles.exportBar}>
              <Text style={styles.exportLabel} allowFontScaling={false}>Export Options:</Text>
              <View style={styles.exportButtonsRow}>
                <TouchableOpacity
                  style={styles.exportBtn}
                  onPress={() => handleExport('CSV')}
                  disabled={isExporting}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={13} color="#38bdf8" />
                  <Text style={styles.exportBtnText} allowFontScaling={false}>CSV</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exportBtn}
                  onPress={() => handleExport('XLSX')}
                  disabled={isExporting}
                  activeOpacity={0.7}
                >
                  <Ionicons name="grid-outline" size={13} color="#10b981" />
                  <Text style={styles.exportBtnText} allowFontScaling={false}>Excel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exportBtn}
                  onPress={() => handleExport('PDF')}
                  disabled={isExporting}
                  activeOpacity={0.7}
                >
                  <Ionicons name="newspaper-outline" size={13} color="#ef4444" />
                  <Text style={styles.exportBtnText} allowFontScaling={false}>PDF</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Actions Row: Search, Reload, Filters */}
            <View style={[styles.searchBarRow, { marginTop: 8 }]}>
              {/* Realtime Search Bar */}
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={15} color="#64748b" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search accounts, names, units..."
                  placeholderTextColor="#64748b"
                  value={searchQuery}
                  onChangeText={(text) => setSearchQuery(text)}
                  returnKeyType="search"
                  onSubmitEditing={() => fetchReportData(true)}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={15} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Dedicated Reload Button */}
              <TouchableOpacity
                style={styles.reloadBtn}
                onPress={() => fetchReportData(true)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Animated.View style={{ transform: [{ rotate: spinInterpolation }] }}>
                  <Ionicons name="refresh-outline" size={16} color={loading ? '#38bdf8' : '#cbd5e1'} />
                </Animated.View>
              </TouchableOpacity>

              {/* Filters Toggle Button with Active Count Badge */}
              <TouchableOpacity
                style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
                onPress={() => setFilterModalOpen(true)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="funnel-outline"
                  size={13}
                  color={activeFilterCount > 0 ? '#ffffff' : '#0f172a'}
                />
                <Text
                  style={[styles.filterBtnText, activeFilterCount > 0 && { color: '#ffffff' }]}
                  allowFontScaling={false}
                >
                  {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
                </Text>
              </TouchableOpacity>

              {/* Unfilter Button */}
              {activeFilterCount > 0 && (
                <TouchableOpacity
                  style={styles.unfilterBtn}
                  onPress={resetFilters}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={13} color="#f43f5e" />
                  <Text style={styles.unfilterText} allowFontScaling={false}>Unfilter</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Report Content Container */}
          <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.scrollContent, { paddingTop: 12 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
          >
            {loading && reportData.length === 0 ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={styles.loadingText} allowFontScaling={false}>Loading report data...</Text>
              </View>
            ) : (
              <View style={{ width: '100%' }}>
                {/* --- 1. RENT ROLL REPORT SUMMARY CARDS (PHOTO 2 EXACT MATCH) --- */}
                {selectedReportId === 'rent-roll' && summaryData && (
                  <View style={styles.kpiGrid}>
                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(16, 185, 129, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('TOTAL_MONTHLY_RENT')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#10b981' }]} allowFontScaling={false}>TOTAL MONTHLY RENT</Text>
                        <Text style={[styles.kpiValue, { color: isDarkMode ? '#ecfdf5' : '#064e3b' }]} allowFontScaling={false}>
                          ${Number(summaryData.totalMonthlyRent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#10b981' }]} allowFontScaling={false}>View list</Text>
                          <Ionicons name="chevron-forward" size={10} color="#10b981" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <Ionicons name="cash-outline" size={20} color="#10b981" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(99, 102, 241, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('SECURITY_DEPOSITS')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#6366f1' }]} allowFontScaling={false}>SECURITY DEPOSITS HELD</Text>
                        <Text style={[styles.kpiValue, { color: isDarkMode ? '#eef2ff' : '#1e1b4b' }]} allowFontScaling={false}>
                          ${Number(summaryData.totalSecurityDeposits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#6366f1' }]} allowFontScaling={false}>View list</Text>
                          <Ionicons name="chevron-forward" size={10} color="#6366f1" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                        <Ionicons name="shield-checkmark-outline" size={20} color="#6366f1" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(148, 163, 184, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('PORTFOLIO_UNITS')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#94a3b8' }]} allowFontScaling={false}>PORTFOLIO UNITS</Text>
                        <Text style={[styles.kpiValue, { color: colors.textPrimary }]} allowFontScaling={false}>
                          {summaryData.totalUnits} Units
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#94a3b8' }]} allowFontScaling={false}>View list</Text>
                          <Ionicons name="chevron-forward" size={10} color="#94a3b8" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(148, 163, 184, 0.15)' }]}>
                        <Ionicons name="business-outline" size={20} color="#94a3b8" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(56, 189, 248, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('OCCUPIED_VACANT')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#38bdf8' }]} allowFontScaling={false}>OCCUPIED / VACANT</Text>
                        <Text style={[styles.kpiValue, { color: colors.textPrimary }]} allowFontScaling={false}>
                          {summaryData.occupiedCount} Occ / {summaryData.vacantCount} Vac
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#38bdf8' }]} allowFontScaling={false}>Filter units</Text>
                          <Ionicons name="chevron-forward" size={10} color="#38bdf8" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#38bdf8" />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* --- 2. OCCUPANCY REPORT SUMMARY CARDS (PHOTO 1 / PHOTO 3 MATCH) --- */}
                {selectedReportId === 'occupancy' && summaryData && (
                  <View style={styles.kpiGrid}>
                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(16, 185, 129, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('OCCUPANCY_RATE')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#10b981' }]} allowFontScaling={false}>OVERALL OCCUPANCY</Text>
                        <Text style={[styles.kpiValue, { color: '#10b981' }]} allowFontScaling={false}>
                          {summaryData.overallOccupancyPercentage}%
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#10b981' }]} allowFontScaling={false}>Breakdown</Text>
                          <Ionicons name="chevron-forward" size={10} color="#10b981" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <Ionicons name="pie-chart-outline" size={20} color="#10b981" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(56, 189, 248, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('TOTAL_UNITS')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#38bdf8' }]} allowFontScaling={false}>TOTAL UNITS</Text>
                        <Text style={[styles.kpiValue, { color: colors.textPrimary }]} allowFontScaling={false}>
                          {summaryData.portfolioTotalUnits}
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#38bdf8' }]} allowFontScaling={false}>View all</Text>
                          <Ionicons name="chevron-forward" size={10} color="#38bdf8" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                        <Ionicons name="business-outline" size={20} color="#38bdf8" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(129, 140, 248, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('OCCUPIED_UNITS')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#818cf8' }]} allowFontScaling={false}>OCCUPIED UNITS</Text>
                        <Text style={[styles.kpiValue, { color: '#818cf8' }]} allowFontScaling={false}>
                          {summaryData.portfolioOccupiedUnits}
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#818cf8' }]} allowFontScaling={false}>Occupied only</Text>
                          <Ionicons name="chevron-forward" size={10} color="#818cf8" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(129, 140, 248, 0.15)' }]}>
                        <Ionicons name="person-outline" size={20} color="#818cf8" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(251, 191, 36, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('VACANT_UNITS')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#fbbf24' }]} allowFontScaling={false}>VACANT UNITS</Text>
                        <Text style={[styles.kpiValue, { color: '#fbbf24' }]} allowFontScaling={false}>
                          {summaryData.portfolioVacantUnits}
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#fbbf24' }]} allowFontScaling={false}>Vacant only</Text>
                          <Ionicons name="chevron-forward" size={10} color="#fbbf24" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                        <Ionicons name="key-outline" size={20} color="#fbbf24" />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* --- 3. DELINQUENCY REPORT SUMMARY CARDS --- */}
                {selectedReportId === 'delinquency' && summaryData && (
                  <View style={styles.kpiGrid}>
                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(239, 68, 68, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('DELINQUENT_BALANCE')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#ef4444' }]} allowFontScaling={false}>DELINQUENT BALANCE</Text>
                        <Text style={[styles.kpiValue, { color: '#ef4444' }]} allowFontScaling={false}>
                          ${Number(summaryData.totalDelinquentBalance || 0).toLocaleString()}
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#ef4444' }]} allowFontScaling={false}>View balances</Text>
                          <Ionicons name="chevron-forward" size={10} color="#ef4444" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                        <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(251, 191, 36, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('DELINQUENT_TENANTS')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#fbbf24' }]} allowFontScaling={false}>DELINQUENT TENANTS</Text>
                        <Text style={[styles.kpiValue, { color: '#fbbf24' }]} allowFontScaling={false}>
                          {summaryData.totalDelinquentTenants}
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#fbbf24' }]} allowFontScaling={false}>View tenants</Text>
                          <Ionicons name="chevron-forward" size={10} color="#fbbf24" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                        <Ionicons name="people-outline" size={20} color="#fbbf24" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(56, 189, 248, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('OVERDUE_INVOICES')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#38bdf8' }]} allowFontScaling={false}>OVERDUE INVOICES</Text>
                        <Text style={[styles.kpiValue, { color: '#38bdf8' }]} allowFontScaling={false}>
                          {summaryData.totalDelinquentInvoices}
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#38bdf8' }]} allowFontScaling={false}>View invoices</Text>
                          <Ionicons name="chevron-forward" size={10} color="#38bdf8" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                        <Ionicons name="receipt-outline" size={20} color="#38bdf8" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(168, 85, 247, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('AVERAGE_DAYS_LATE')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#a855f7' }]} allowFontScaling={false}>AVERAGE DAYS LATE</Text>
                        <Text style={[styles.kpiValue, { color: '#a855f7' }]} allowFontScaling={false}>
                          {summaryData.averageDaysLate} Days
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#a855f7' }]} allowFontScaling={false}>View aging</Text>
                          <Ionicons name="chevron-forward" size={10} color="#a855f7" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                        <Ionicons name="time-outline" size={20} color="#a855f7" />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* --- 4. PROFIT & LOSS STATEMENT SUMMARY CARDS --- */}
                {selectedReportId === 'profit-loss' && summaryData && (
                  <View style={styles.pnLSummaryRow}>
                    <TouchableOpacity
                      style={[styles.pnLSummaryBox, { borderColor: 'rgba(16, 185, 129, 0.4)' }]}
                      onPress={() => handleOpenMetricDrillDown('GROSS_INCOME')}
                      activeOpacity={0.72}
                    >
                      <Text style={[styles.pnLSummaryLabel, { color: '#10b981' }]} allowFontScaling={false}>GROSS INCOME</Text>
                      <Text style={[styles.pnLSummaryVal, { color: '#10b981' }]} allowFontScaling={false}>
                        ${Number(summaryData.totalIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                      <View style={styles.kpiTapHintRow}>
                        <Text style={[styles.kpiTapHintText, { color: '#10b981' }]} allowFontScaling={false}>View ledger</Text>
                        <Ionicons name="chevron-forward" size={10} color="#10b981" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.pnLSummaryBox, { borderColor: 'rgba(239, 68, 68, 0.4)' }]}
                      onPress={() => handleOpenMetricDrillDown('TOTAL_EXPENSES')}
                      activeOpacity={0.72}
                    >
                      <Text style={[styles.pnLSummaryLabel, { color: '#ef4444' }]} allowFontScaling={false}>TOTAL EXPENSES</Text>
                      <Text style={[styles.pnLSummaryVal, { color: '#ef4444' }]} allowFontScaling={false}>
                        -${Number(summaryData.totalExpenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                      <View style={styles.kpiTapHintRow}>
                        <Text style={[styles.kpiTapHintText, { color: '#ef4444' }]} allowFontScaling={false}>View ledger</Text>
                        <Ionicons name="chevron-forward" size={10} color="#ef4444" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.pnLSummaryBox, { borderColor: 'rgba(56, 189, 248, 0.4)' }]}
                      onPress={() => handleOpenMetricDrillDown('NET_PROFIT')}
                      activeOpacity={0.72}
                    >
                      <Text style={[styles.pnLSummaryLabel, { color: '#38bdf8' }]} allowFontScaling={false}>NET PROFIT</Text>
                      <Text style={[styles.pnLSummaryVal, { color: '#38bdf8' }]} allowFontScaling={false}>
                        ${Number(summaryData.netProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                      <View style={styles.kpiTapHintRow}>
                        <Text style={[styles.kpiTapHintText, { color: '#38bdf8' }]} allowFontScaling={false}>Breakdown</Text>
                        <Ionicons name="chevron-forward" size={10} color="#38bdf8" />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* --- 5. MAINTENANCE REPORT SUMMARY CARDS --- */}
                {selectedReportId === 'maintenance' && summaryData && (
                  <View style={styles.kpiGrid}>
                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(56, 189, 248, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('TOTAL_WORK_ORDERS')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#38bdf8' }]} allowFontScaling={false}>TOTAL WORK ORDERS</Text>
                        <Text style={[styles.kpiValue, { color: '#38bdf8' }]} allowFontScaling={false}>
                          {summaryData.totalWorkOrders}
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#38bdf8' }]} allowFontScaling={false}>View orders</Text>
                          <Ionicons name="chevron-forward" size={10} color="#38bdf8" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                        <Ionicons name="construct-outline" size={20} color="#38bdf8" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(251, 191, 36, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('ESTIMATED_COST')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#fbbf24' }]} allowFontScaling={false}>ESTIMATED COST</Text>
                        <Text style={[styles.kpiValue, { color: '#fbbf24' }]} allowFontScaling={false}>
                          ${Number(summaryData.totalEstimatedCost || 0).toLocaleString()}
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#fbbf24' }]} allowFontScaling={false}>View costs</Text>
                          <Ionicons name="chevron-forward" size={10} color="#fbbf24" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                        <Ionicons name="cash-outline" size={20} color="#fbbf24" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(16, 185, 129, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('ACTUAL_COST')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#10b981' }]} allowFontScaling={false}>ACTUAL COST</Text>
                        <Text style={[styles.kpiValue, { color: '#10b981' }]} allowFontScaling={false}>
                          ${Number(summaryData.totalActualCost || 0).toLocaleString()}
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#10b981' }]} allowFontScaling={false}>View costs</Text>
                          <Ionicons name="chevron-forward" size={10} color="#10b981" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <Ionicons name="wallet-outline" size={20} color="#10b981" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(168, 85, 247, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('COMPLETION_RATE')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#a855f7' }]} allowFontScaling={false}>COMPLETION RATE</Text>
                        <Text style={[styles.kpiValue, { color: '#a855f7' }]} allowFontScaling={false}>
                          {summaryData.completionRate}%
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#a855f7' }]} allowFontScaling={false}>Completed list</Text>
                          <Ionicons name="chevron-forward" size={10} color="#a855f7" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                        <Ionicons name="checkmark-done-circle-outline" size={20} color="#a855f7" />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* --- 6. PAYMENT HISTORY REPORT SUMMARY CARDS --- */}
                {selectedReportId === 'payment-history' && summaryData && (
                  <View style={styles.kpiGrid}>
                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(16, 185, 129, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('TOTAL_COLLECTED')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#10b981' }]} allowFontScaling={false}>TOTAL COLLECTED</Text>
                        <Text style={[styles.kpiValue, { color: '#10b981' }]} allowFontScaling={false}>
                          ${Number(summaryData.totalCollectedAmount || 0).toLocaleString()}
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#10b981' }]} allowFontScaling={false}>View payments</Text>
                          <Ionicons name="chevron-forward" size={10} color="#10b981" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <Ionicons name="cash-outline" size={20} color="#10b981" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.kpiCard, { borderColor: 'rgba(56, 189, 248, 0.35)' }]}
                      onPress={() => handleOpenMetricDrillDown('TRANSACTIONS')}
                      activeOpacity={0.72}
                    >
                      <View style={styles.kpiTextCol}>
                        <Text style={[styles.kpiLabel, { color: '#38bdf8' }]} allowFontScaling={false}>TRANSACTIONS</Text>
                        <Text style={[styles.kpiValue, { color: '#38bdf8' }]} allowFontScaling={false}>
                          {summaryData.totalTransactions}
                        </Text>
                        <View style={styles.kpiTapHintRow}>
                          <Text style={[styles.kpiTapHintText, { color: '#38bdf8' }]} allowFontScaling={false}>View list</Text>
                          <Ionicons name="chevron-forward" size={10} color="#38bdf8" />
                        </View>
                      </View>
                      <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                        <Ionicons name="card-outline" size={20} color="#38bdf8" />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* SECTION TITLE & RECORD COUNT */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.reportSectionHeader} allowFontScaling={false}>
                    RECORDS ({filteredData.length}{filteredData.length !== reportData.length ? ` of ${reportData.length}` : ''})
                  </Text>
                </View>

                {/* EMPTY VIEW */}
                {filteredData.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Ionicons name="document-text-outline" size={40} color="#64748b" style={{ marginBottom: 10 }} />
                    <Text style={styles.emptyText} allowFontScaling={false}>No records matching filter criteria.</Text>
                    <Text style={styles.emptySubText} allowFontScaling={false}>Try adjusting or resetting active filters.</Text>
                    {(activeFilterCount > 0 || searchQuery.length > 0) && (
                      <TouchableOpacity style={styles.emptyResetBtn} onPress={() => resetFilters()}>
                        <Text style={styles.emptyResetBtnText} allowFontScaling={false}>Reset All Filters</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  // RECORD CARDS (MATCHING FRONTEND TABLE ROWS IN PHOTO 2)
                  filteredData.map((item, idx) => (
                    <View key={item.id || idx} style={styles.reportCard}>
                      {/* Top Header of Card */}
                      <View style={styles.rowBetween}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.recordLabel} numberOfLines={1} allowFontScaling={false}>
                            {item.propertyName || item.name || `Property #${idx + 1}`}
                          </Text>
                          {item.unitNumber && (
                            <Text style={styles.recordSubText} allowFontScaling={false}>
                              {formatUnitLabel(item.unitNumber)}
                            </Text>
                          )}
                        </View>

                        {/* View Details Eye Icon Button */}
                        <TouchableOpacity
                          style={styles.eyeBtn}
                          onPress={() => setViewingItem(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="eye-outline" size={17} color="#38bdf8" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.cardDivider} />

                      {/* --- RENT ROLL ROW FIELDS (PHOTO 2 EXACT MATCH) --- */}
                      {selectedReportId === 'rent-roll' && (
                        <View>
                          <View style={styles.cardDetailRow}>
                            <View style={styles.detailItem}>
                              <Text style={styles.detailLabel} allowFontScaling={false}>TENANT NAME</Text>
                              <Text style={styles.detailValue} numberOfLines={1} allowFontScaling={false}>
                                {item.tenantName || 'Vacant'}
                              </Text>
                            </View>
                            <View style={[styles.detailItem, { alignItems: 'flex-end' }]}>
                              <Text style={styles.detailLabel} allowFontScaling={false}>LEASE STATUS</Text>
                              <View
                                style={[
                                  styles.statusBadge,
                                  item.leaseStatus === 'Active'
                                    ? styles.statusActive
                                    : item.leaseStatus === 'Pending_Move_In'
                                    ? styles.statusPending
                                    : item.leaseStatus === 'Vacant'
                                    ? styles.statusVacant
                                    : styles.statusTerminated,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.statusText,
                                    item.leaseStatus === 'Active'
                                      ? styles.statusTextActive
                                      : item.leaseStatus === 'Pending_Move_In'
                                      ? styles.statusTextPending
                                      : item.leaseStatus === 'Vacant'
                                      ? styles.statusTextVacant
                                      : styles.statusTextTerminated,
                                  ]}
                                  allowFontScaling={false}
                                >
                                  {item.leaseStatus || 'N/A'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View style={[styles.cardDetailRow, { marginTop: 8 }]}>
                            <View style={styles.detailItem}>
                              <Text style={styles.detailLabel} allowFontScaling={false}>MONTHLY RENT</Text>
                              <Text style={[styles.detailValue, { color: '#10b981', fontWeight: '900' }]} allowFontScaling={false}>
                                ${Number(item.monthlyRent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </Text>
                            </View>

                            <View style={styles.detailItem}>
                              <Text style={styles.detailLabel} allowFontScaling={false}>SECURITY DEPOSIT</Text>
                              <Text style={[styles.detailValue, { color: '#6366f1', fontWeight: '900' }]} allowFontScaling={false}>
                                ${Number(item.securityDeposit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </Text>
                            </View>

                            <View style={[styles.detailItem, { alignItems: 'flex-end' }]}>
                              <Text style={styles.detailLabel} allowFontScaling={false}>UNIT STATUS</Text>
                              <View
                                style={[
                                  styles.unitStatusBadge,
                                  item.unitStatus === 'Occupied' ? styles.unitOccupied : styles.unitVacant,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.unitStatusText,
                                    item.unitStatus === 'Occupied' ? styles.unitTextOccupied : styles.unitTextVacant,
                                  ]}
                                  allowFontScaling={false}
                                >
                                  {item.unitStatus || 'N/A'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {(item.startDate || item.endDate) && (
                            <View style={[styles.cardDetailRow, { marginTop: 8 }]}>
                              <View style={styles.detailItem}>
                                <Text style={styles.detailLabel} allowFontScaling={false}>TERM DATES</Text>
                                <Text style={[styles.detailValue, { fontSize: 11, color: colors.textSecondary }]} allowFontScaling={false}>
                                  {item.startDate && item.startDate !== 'N/A' ? new Date(item.startDate).toLocaleDateString() : 'N/A'}
                                  {'  →  '}
                                  {item.endDate && item.endDate !== 'N/A' ? new Date(item.endDate).toLocaleDateString() : 'N/A'}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                      )}

                      {/* --- OCCUPANCY FIELDS --- */}
                      {selectedReportId === 'occupancy' && (
                        <View>
                          <View style={styles.rowBetween}>
                            <Text style={styles.recordSubText} allowFontScaling={false}>Occupancy Rate</Text>
                            <Text style={[styles.detailValue, { color: '#10b981', fontWeight: '900' }]} allowFontScaling={false}>
                              {item.occupancyPercentage}%
                            </Text>
                          </View>
                          <View style={styles.progressBarBg}>
                            <View
                              style={[
                                styles.progressBarFill,
                                {
                                  width: `${Math.min(100, item.occupancyPercentage || 0)}%`,
                                  backgroundColor:
                                    item.occupancyPercentage >= 80
                                      ? '#10b981'
                                      : item.occupancyPercentage >= 50
                                      ? '#f59e0b'
                                      : '#ef4444',
                                },
                              ]}
                            />
                          </View>
                          <View style={styles.fieldsGrid}>
                            <View style={styles.fieldItem}>
                              <Text style={styles.detailLabel} allowFontScaling={false}>TOTAL</Text>
                              <Text style={styles.detailValue} allowFontScaling={false}>{item.totalUnits} Units</Text>
                            </View>
                            <View style={styles.fieldItem}>
                              <Text style={styles.detailLabel} allowFontScaling={false}>OCCUPIED</Text>
                              <Text style={[styles.detailValue, { color: '#10b981' }]} allowFontScaling={false}>
                                {item.occupiedUnits} Units
                              </Text>
                            </View>
                            <View style={styles.fieldItem}>
                              <Text style={styles.detailLabel} allowFontScaling={false}>VACANT</Text>
                              <Text style={[styles.detailValue, { color: '#f59e0b' }]} allowFontScaling={false}>
                                {item.vacantUnits} Units
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* --- DELINQUENCY FIELDS --- */}
                      {selectedReportId === 'delinquency' && (
                        <View style={styles.fieldsGrid}>
                          <View style={styles.fieldItem}>
                            <Text style={styles.detailLabel} allowFontScaling={false}>TENANT</Text>
                            <Text style={styles.detailValue} numberOfLines={1} allowFontScaling={false}>{item.tenantName || 'N/A'}</Text>
                          </View>
                          <View style={styles.fieldItem}>
                            <Text style={styles.detailLabel} allowFontScaling={false}>DAYS LATE</Text>
                            <Text style={[styles.detailValue, { color: '#ef4444', fontWeight: '900' }]} allowFontScaling={false}>
                              {item.daysLate} Days
                            </Text>
                          </View>
                          <View style={styles.fieldItem}>
                            <Text style={styles.detailLabel} allowFontScaling={false}>BALANCE</Text>
                            <Text style={[styles.detailValue, { color: '#ef4444', fontWeight: '900' }]} allowFontScaling={false}>
                              ${Number(item.outstandingBalance || 0).toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* --- PROFIT & LOSS FIELDS --- */}
                      {selectedReportId === 'profit-loss' && (
                        <View>
                          <View style={styles.rowBetween}>
                            <Text style={[styles.recordSubText, { flex: 1, marginRight: 8 }]} numberOfLines={1} allowFontScaling={false}>
                              {item.description || item.name || 'Transaction'}
                            </Text>
                            <Text
                              style={[
                                styles.detailValue,
                                { color: item.type === 'Income' ? '#10b981' : '#ef4444', fontWeight: '900' },
                              ]}
                              allowFontScaling={false}
                            >
                              {item.type === 'Income' ? '+' : '-'}${Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                          </View>
                          <View style={[styles.cardDetailRow, { marginTop: 4 }]}>
                            <Text style={[styles.recordSubText, { fontSize: 11 }]} allowFontScaling={false}>
                              {item.date && item.date !== 'N/A' ? `${new Date(item.date).toLocaleDateString()} • ` : ''}{item.category || item.type}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* --- MAINTENANCE FIELDS --- */}
                      {selectedReportId === 'maintenance' && (
                        <View style={styles.fieldsGrid}>
                          <View style={styles.fieldItem}>
                            <Text style={styles.detailLabel} allowFontScaling={false}>ISSUE</Text>
                            <Text style={styles.detailValue} numberOfLines={1} allowFontScaling={false}>{item.issue || 'Service'}</Text>
                          </View>
                          <View style={styles.fieldItem}>
                            <Text style={styles.detailLabel} allowFontScaling={false}>PRIORITY</Text>
                            <Text style={[styles.detailValue, { color: item.priority === 'High' ? '#ef4444' : '#38bdf8' }]} allowFontScaling={false}>
                              {item.priority || 'Normal'}
                            </Text>
                          </View>
                          <View style={styles.fieldItem}>
                            <Text style={styles.detailLabel} allowFontScaling={false}>ACTUAL COST</Text>
                            <Text style={[styles.detailValue, { color: '#10b981', fontWeight: '900' }]} allowFontScaling={false}>
                              ${Number(item.actualCost || 0).toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* --- PAYMENT HISTORY FIELDS --- */}
                      {selectedReportId === 'payment-history' && (
                        <View style={styles.fieldsGrid}>
                          <View style={styles.fieldItem}>
                            <Text style={styles.detailLabel} allowFontScaling={false}>DATE</Text>
                            <Text style={styles.detailValue} allowFontScaling={false}>{item.paymentDate || 'N/A'}</Text>
                          </View>
                          <View style={styles.fieldItem}>
                            <Text style={styles.detailLabel} allowFontScaling={false}>METHOD</Text>
                            <Text style={styles.detailValue} allowFontScaling={false}>{item.paymentMethod || 'ACH'}</Text>
                          </View>
                          <View style={styles.fieldItem}>
                            <Text style={styles.detailLabel} allowFontScaling={false}>AMOUNT</Text>
                            <Text style={[styles.detailValue, { color: '#10b981', fontWeight: '900' }]} allowFontScaling={false}>
                              +${Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* --- METRIC DRILL-DOWN DETAILS MODAL --- */}
      <Modal visible={drillDownModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.drillDownModalCard}>
            {/* Modal Header */}
            <View style={styles.drillDownHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
                <View style={[styles.kpiIconBox, { backgroundColor: `${drillDownConfig.color}25` }]}>
                  <Ionicons name={drillDownConfig.icon} size={20} color={drillDownConfig.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.drillDownTitle} numberOfLines={1} allowFontScaling={false}>
                    {drillDownConfig.title}
                  </Text>
                  <Text style={styles.drillDownSubtitle} numberOfLines={1} allowFontScaling={false}>
                    {drillDownConfig.subtitle}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setDrillDownModalOpen(false)}
                style={styles.drillDownCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick Search inside Drill-Down */}
            {drillDownConfig.items && drillDownConfig.items.length > 2 && (
              <View style={styles.drillDownSearchBar}>
                <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.drillDownSearchInput}
                  placeholder="Search in this drill-down..."
                  placeholderTextColor={colors.textMuted}
                  value={drillDownSearch}
                  onChangeText={setDrillDownSearch}
                  clearButtonMode="while-editing"
                  allowFontScaling={false}
                />
                {drillDownSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setDrillDownSearch('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Scrollable Filtered List */}
            <ScrollView
              style={styles.drillDownList}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {(() => {
                const list = (drillDownConfig.items || []).filter((item) => {
                  if (!drillDownSearch) return true;
                  const q = drillDownSearch.toLowerCase();
                  return (
                    (item.title && item.title.toLowerCase().includes(q)) ||
                    (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
                    (item.meta && item.meta.toLowerCase().includes(q)) ||
                    (item.amount && item.amount.toLowerCase().includes(q)) ||
                    (item.badgeText && item.badgeText.toLowerCase().includes(q))
                  );
                });

                if (list.length === 0) {
                  return (
                    <View style={styles.drillDownEmptyBox}>
                      <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                      <Text style={styles.drillDownEmptyText} allowFontScaling={false}>No matching items found.</Text>
                      {drillDownSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setDrillDownSearch('')}>
                          <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '700', marginTop: 6 }} allowFontScaling={false}>
                            Clear Search
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }

                return list.map((item, idx) => (
                  <TouchableOpacity
                    key={item.id || idx}
                    style={styles.drillDownItemCard}
                    onPress={() => handleDrillDownItemPress(item)}
                    activeOpacity={0.72}
                  >
                    <View style={{ flex: 1, marginRight: 10, minWidth: 0, overflow: 'hidden' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'nowrap' }}>
                        <Text style={[styles.drillDownItemTitle, { flexShrink: 1 }]} numberOfLines={1} allowFontScaling={false}>
                          {item.title}
                        </Text>
                        {item.badgeText && (
                          <View
                            style={[
                              styles.drillDownItemBadge,
                              { flexShrink: 0, backgroundColor: item.badgeBg || 'rgba(56, 189, 248, 0.15)' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.drillDownItemBadgeText,
                                { color: item.badgeColor || '#38bdf8' },
                              ]}
                              allowFontScaling={false}
                            >
                              {item.badgeText}
                            </Text>
                          </View>
                        )}
                      </View>

                      {item.subtitle && (
                        <Text style={styles.drillDownItemSubtitle} numberOfLines={1} allowFontScaling={false}>
                          {item.subtitle}
                        </Text>
                      )}

                      {item.meta && (
                        <Text style={styles.drillDownItemMeta} numberOfLines={1} allowFontScaling={false}>
                          {item.meta}
                        </Text>
                      )}
                    </View>

                    <View style={{ minWidth: 85, flexShrink: 0, alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 4 }}>
                      {item.amount && (
                        <Text style={styles.drillDownItemAmount} allowFontScaling={false}>
                          {item.amount}
                        </Text>
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 }}>
                        <Text style={styles.drillDownItemTapLabel} allowFontScaling={false}>View</Text>
                        <Ionicons name="chevron-forward" size={14} color="#38bdf8" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ));
              })()}
            </ScrollView>

            {/* Bottom Action Section with strictly isolated filtered route */}
            <View style={styles.drillDownFooter}>
              <TouchableOpacity
                style={styles.drillDownPrimaryBtn}
                onPress={handleDrillDownBottomBtnPress}
                activeOpacity={0.8}
              >
                <Text style={styles.drillDownPrimaryBtnText} allowFontScaling={false}>
                  {drillDownConfig.bottomBtnText || 'View in Module'}
                </Text>
                <Ionicons name="arrow-forward-outline" size={16} color="#0f172a" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* DETAIL VIEW MODAL */}
      <Modal visible={viewingItem !== null} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="document-text-outline" size={20} color="#38bdf8" />
                <Text style={styles.modalTitle} allowFontScaling={false}>Record Details</Text>
              </View>
              <TouchableOpacity onPress={() => setViewingItem(null)}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {viewingItem && (
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {Object.entries(viewingItem)
                  .filter(([key, val]) => !key.toLowerCase().endsWith('id') && val !== null && val !== undefined)
                  .map(([key, val]) => {
                    const formattedLabel = key.replace(/([A-Z])/g, ' $1').trim().toUpperCase();
                    let displayVal = val;
                    if (typeof val === 'number') {
                      displayVal =
                        key.toLowerCase().includes('amount') ||
                        key.toLowerCase().includes('rent') ||
                        key.toLowerCase().includes('cost') ||
                        key.toLowerCase().includes('balance') ||
                        key.toLowerCase().includes('deposit')
                          ? `$${val.toLocaleString()}`
                          : val.toString();
                    } else if (typeof val === 'object') {
                      displayVal = JSON.stringify(val);
                    } else {
                      displayVal = String(val);
                    }

                    return (
                      <View key={key} style={styles.detailItemRow}>
                        <Text style={styles.detailItemLabel} allowFontScaling={false}>{formattedLabel}</Text>
                        <Text style={styles.detailItemValue} allowFontScaling={false}>{displayVal}</Text>
                      </View>
                    );
                  })}
              </ScrollView>
            )}

            <View style={styles.detailModalFooter}>
              <TouchableOpacity style={styles.closeDetailBtn} onPress={() => setViewingItem(null)}>
                <Text style={styles.closeDetailBtnText} allowFontScaling={false}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FILTER MODAL */}
      <Modal visible={filterModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="funnel-outline" size={18} color="#38bdf8" />
                  <Text style={styles.modalTitle} allowFontScaling={false}>Filter Report</Text>
                </View>
                <TouchableOpacity onPress={() => setFilterModalOpen(false)}>
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                {/* 1. Property Filter Accordion */}
                <Text style={styles.filterLabel} allowFontScaling={false}>PROPERTY</Text>
                <TouchableOpacity
                  style={[
                    styles.accordionHeader,
                    expandedFilterSection === 'property' && styles.accordionHeaderActive,
                  ]}
                  onPress={() =>
                    setExpandedFilterSection(expandedFilterSection === 'property' ? null : 'property')
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.accordionHeaderText} allowFontScaling={false}>
                    {properties.find((p) => p.id === selectedPropertyId)?.name || 'All Properties'}
                  </Text>
                  <Ionicons
                    name={expandedFilterSection === 'property' ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
                {expandedFilterSection === 'property' && (
                  <View style={styles.accordionList}>
                    <TouchableOpacity
                      style={styles.accordionOption}
                      onPress={() => handleSelectProperty('')}
                    >
                      <Ionicons
                        name={selectedPropertyId === '' ? 'radio-button-on' : 'radio-button-off'}
                        size={16}
                        color={selectedPropertyId === '' ? '#38bdf8' : '#64748b'}
                      />
                      <Text style={[styles.accordionOptionText, selectedPropertyId === '' && styles.optionSelectedText]}>
                        All Properties
                      </Text>
                    </TouchableOpacity>
                    {properties.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.accordionOption}
                        onPress={() => handleSelectProperty(p.id)}
                      >
                        <Ionicons
                          name={selectedPropertyId === p.id ? 'radio-button-on' : 'radio-button-off'}
                          size={16}
                          color={selectedPropertyId === p.id ? '#38bdf8' : '#64748b'}
                        />
                        <Text style={[styles.accordionOptionText, selectedPropertyId === p.id && styles.optionSelectedText]}>
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 2. Unit Filter Accordion */}
                <Text style={styles.filterLabel} allowFontScaling={false}>UNIT</Text>
                <TouchableOpacity
                  style={[
                    styles.accordionHeader,
                    expandedFilterSection === 'unit' && styles.accordionHeaderActive,
                  ]}
                  onPress={() =>
                    setExpandedFilterSection(expandedFilterSection === 'unit' ? null : 'unit')
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.accordionHeaderText} allowFontScaling={false}>
                    {filteredUnits.find((u) => u.id === selectedUnitId)?.unitNumber
                      ? formatUnitLabel(filteredUnits.find((u) => u.id === selectedUnitId)?.unitNumber)
                      : 'All Units'}
                  </Text>
                  <Ionicons
                    name={expandedFilterSection === 'unit' ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
                {expandedFilterSection === 'unit' && (
                  <View style={styles.accordionList}>
                    <TouchableOpacity
                      style={styles.accordionOption}
                      onPress={() => handleSelectUnit('')}
                    >
                      <Ionicons
                        name={selectedUnitId === '' ? 'radio-button-on' : 'radio-button-off'}
                        size={16}
                        color={selectedUnitId === '' ? '#38bdf8' : '#64748b'}
                      />
                      <Text style={[styles.accordionOptionText, selectedUnitId === '' && styles.optionSelectedText]}>
                        All Units
                      </Text>
                    </TouchableOpacity>
                    {filteredUnits.map((u) => (
                      <TouchableOpacity
                        key={u.id}
                        style={styles.accordionOption}
                        onPress={() => handleSelectUnit(u.id)}
                      >
                        <Ionicons
                          name={selectedUnitId === u.id ? 'radio-button-on' : 'radio-button-off'}
                          size={16}
                          color={selectedUnitId === u.id ? '#38bdf8' : '#64748b'}
                        />
                        <Text style={[styles.accordionOptionText, selectedUnitId === u.id && styles.optionSelectedText]}>
                          Unit {u.unitNumber} {u.propertyName || u.property?.name ? `(${u.propertyName || u.property?.name})` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 3. Tenant Filter Accordion */}
                <Text style={styles.filterLabel} allowFontScaling={false}>TENANT</Text>
                <TouchableOpacity
                  style={[
                    styles.accordionHeader,
                    expandedFilterSection === 'tenant' && styles.accordionHeaderActive,
                  ]}
                  onPress={() =>
                    setExpandedFilterSection(expandedFilterSection === 'tenant' ? null : 'tenant')
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.accordionHeaderText} allowFontScaling={false}>
                    {filteredTenants.find((t) => t.id === selectedTenantId)?.name ||
                      (filteredTenants.find((t) => t.id === selectedTenantId)
                        ? `${filteredTenants.find((t) => t.id === selectedTenantId)?.firstName || ''} ${filteredTenants.find((t) => t.id === selectedTenantId)?.lastName || ''}`.trim()
                        : null) ||
                      'All Tenants'}
                  </Text>
                  <Ionicons
                    name={expandedFilterSection === 'tenant' ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
                {expandedFilterSection === 'tenant' && (
                  <View style={styles.accordionList}>
                    <TouchableOpacity
                      style={styles.accordionOption}
                      onPress={() => {
                        setSelectedTenantId('');
                        setExpandedFilterSection(null);
                      }}
                    >
                      <Ionicons
                        name={selectedTenantId === '' ? 'radio-button-on' : 'radio-button-off'}
                        size={16}
                        color={selectedTenantId === '' ? '#38bdf8' : '#64748b'}
                      />
                      <Text style={[styles.accordionOptionText, selectedTenantId === '' && styles.optionSelectedText]}>
                        All Tenants
                      </Text>
                    </TouchableOpacity>
                    {filteredTenants.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={styles.accordionOption}
                        onPress={() => {
                          setSelectedTenantId(t.id);
                          setExpandedFilterSection(null);
                        }}
                      >
                        <Ionicons
                          name={selectedTenantId === t.id ? 'radio-button-on' : 'radio-button-off'}
                          size={16}
                          color={selectedTenantId === t.id ? '#38bdf8' : '#64748b'}
                        />
                        <Text style={[styles.accordionOptionText, selectedTenantId === t.id && styles.optionSelectedText]}>
                          {t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim()} {t.unit?.unitNumber ? `(${formatUnitLabel(t.unit.unitNumber)})` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 4. Status Filter Accordion */}
                <Text style={styles.filterLabel} allowFontScaling={false}>STATUS</Text>
                <TouchableOpacity
                  style={[
                    styles.accordionHeader,
                    expandedFilterSection === 'status' && styles.accordionHeaderActive,
                  ]}
                  onPress={() =>
                    setExpandedFilterSection(expandedFilterSection === 'status' ? null : 'status')
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.accordionHeaderText} allowFontScaling={false}>
                    {getStatusChoices().find((s) => s.value === selectedStatus)?.label || 'All Statuses'}
                  </Text>
                  <Ionicons
                    name={expandedFilterSection === 'status' ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
                {expandedFilterSection === 'status' && (
                  <View style={styles.accordionList}>
                    {getStatusChoices().map((s) => (
                      <TouchableOpacity
                        key={s.value || 'all'}
                        style={styles.accordionOption}
                        onPress={() => {
                          setSelectedStatus(s.value);
                          setExpandedFilterSection(null);
                        }}
                      >
                        <Ionicons
                          name={selectedStatus === s.value ? 'radio-button-on' : 'radio-button-off'}
                          size={16}
                          color={selectedStatus === s.value ? '#38bdf8' : '#64748b'}
                        />
                        <Text style={[styles.accordionOptionText, selectedStatus === s.value && styles.optionSelectedText]}>
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>

              {/* Action Buttons inside Filter Modal */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.resetModalBtn}
                  onPress={resetFilters}
                >
                  <Text style={styles.resetModalBtnText} allowFontScaling={false}>Clear All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => setFilterModalOpen(false)}
                >
                  <Text style={styles.applyBtnText} allowFontScaling={false}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default ReportsScreen;

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 60,
      width: '100%',
      maxWidth: 1024,
      alignSelf: 'center',
    },
    fixedHeader: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      backgroundColor: colors.background,
      width: '100%',
      maxWidth: 1024,
      alignSelf: 'center',
    },
    title: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
    subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },

    // Main Reports Directory
    repCard: {
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
    repCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    cardIconBox: {
      width: 46,
      height: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
      borderWidth: 1,
    },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    cardDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },

    generateReportRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    generateReportText: {
      color: '#38bdf8',
      fontSize: 12.5,
      fontWeight: '800',
    },

    auditCenterCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginTop: 4,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    auditCenterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      paddingBottom: 8,
      marginBottom: 8,
    },
    auditCenterTitle: {
      fontSize: 13.5,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    auditCenterDesc: {
      fontSize: 11.5,
      color: colors.textSecondary,
      lineHeight: 16,
    },

    // Viewer Header
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    backBtnText: { color: '#38bdf8', fontSize: 13, fontWeight: '800' },
    headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    // Export Options Bar
    exportBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    exportLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    exportButtonsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.inputBackground,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    exportBtnText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: colors.textPrimary,
    },

    // Search, Reload and Filters bar
    searchBarRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 38,
    },
    searchInput: { flex: 1, color: colors.textPrimary, fontSize: 12, padding: 0 },
    reloadBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 38,
      gap: 4,
    },
    filterBtnActive: {
      backgroundColor: '#0284c7',
      borderColor: '#0284c7',
    },
    filterBtnText: { color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
    unfilterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      height: 38,
      borderRadius: 10,
      backgroundColor: 'rgba(244, 63, 94, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(244, 63, 94, 0.25)',
    },
    unfilterText: {
      color: '#f43f5e',
      fontSize: 11,
      fontWeight: '800',
    },

    centerLoading: { paddingVertical: 40, alignItems: 'center' },
    loadingText: { color: colors.textSecondary, fontSize: 13, marginTop: 10, fontWeight: '600' },

    // KPI Cards Grid (Matching Photo 2)
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    kpiCard: {
      width: '48.5%',
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    kpiTextCol: { flex: 1, marginRight: 6 },
    kpiLabel: { fontSize: 8.5, fontWeight: '900', letterSpacing: 0.5 },
    kpiValue: { fontSize: 16, fontWeight: '900', marginTop: 4, color: isDarkMode ? '#ffffff' : '#0f172a' },
    kpiIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // P&L Summary Cards
    pnLSummaryRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
    pnLSummaryBox: {
      flex: 1,
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    pnLSummaryLabel: { fontSize: 8.5, fontWeight: '900', letterSpacing: 0.5 },
    pnLSummaryVal: { fontSize: 13, fontWeight: '900', marginTop: 4, color: isDarkMode ? '#ffffff' : '#0f172a' },

    sectionHeaderRow: { marginBottom: 10 },
    reportSectionHeader: { fontSize: 11, fontWeight: '800', color: isDarkMode ? '#94a3b8' : colors.textMuted, letterSpacing: 0.8 },

    emptyView: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: 16,
      padding: 30,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
      marginTop: 10,
    },
    emptyText: { color: isDarkMode ? '#ffffff' : colors.textPrimary, fontSize: 14, fontWeight: '700' },
    emptySubText: { color: isDarkMode ? '#94a3b8' : colors.textMuted, fontSize: 11.5, marginTop: 4, textAlign: 'center' },
    emptyResetBtn: {
      marginTop: 14,
      backgroundColor: '#38bdf8',
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    emptyResetBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 12 },

    // Report Card (Matching Photo 2 rows)
    reportCard: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    recordLabel: { fontSize: 15, fontWeight: '800', color: isDarkMode ? '#ffffff' : colors.textPrimary },
    recordSubText: { fontSize: 12, color: isDarkMode ? '#94a3b8' : colors.textSecondary, marginTop: 2, fontWeight: '600' },
    eyeBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardDivider: { height: 1, backgroundColor: isDarkMode ? '#334155' : colors.divider, marginVertical: 10 },
    cardDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailItem: { alignItems: 'flex-start' },
    detailLabel: { fontSize: 9.5, fontWeight: '800', color: isDarkMode ? '#94a3b8' : colors.textMuted, letterSpacing: 0.5, marginBottom: 2 },
    detailValue: { fontSize: 13, color: isDarkMode ? '#f8fafc' : colors.textPrimary, fontWeight: '700' },

    // Badges
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      borderRadius: 6,
      borderWidth: 1,
    },
    statusActive: {
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    statusTextActive: {
      color: '#10b981',
      fontSize: 10,
      fontWeight: '800',
    },
    statusPending: {
      backgroundColor: 'rgba(251, 191, 36, 0.12)',
      borderColor: 'rgba(251, 191, 36, 0.3)',
    },
    statusTextPending: {
      color: '#fbbf24',
      fontSize: 10,
      fontWeight: '800',
    },
    statusVacant: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    statusTextVacant: {
      color: '#f59e0b',
      fontSize: 10,
      fontWeight: '800',
    },
    statusTerminated: {
      backgroundColor: 'rgba(244, 63, 94, 0.12)',
      borderColor: 'rgba(244, 63, 94, 0.3)',
    },
    statusTextTerminated: {
      color: '#f43f5e',
      fontSize: 10,
      fontWeight: '800',
    },

    unitStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      borderRadius: 6,
      borderWidth: 1,
    },
    unitOccupied: {
      backgroundColor: 'rgba(99, 102, 241, 0.12)',
      borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    unitTextOccupied: {
      color: '#818cf8',
      fontSize: 10,
      fontWeight: '800',
    },
    unitVacant: {
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      borderColor: 'rgba(148, 163, 184, 0.3)',
    },
    unitTextVacant: {
      color: '#94a3b8',
      fontSize: 10,
      fontWeight: '800',
    },

    fieldsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    fieldItem: { flex: 1 },

    // Occupancy Progress
    progressBarBg: { height: 6, backgroundColor: colors.inputBackground, borderRadius: 3, marginVertical: 8, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 3 },

    // Detail Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    detailModalCard: {
      width: '100%',
      maxWidth: 440,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    detailItemRow: {
      marginBottom: 8,
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      padding: 10,
    },
    detailItemLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
    detailItemValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
    detailModalFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingTop: 14,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 8,
    },
    detailDeepLinkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.3)',
    },
    detailDeepLinkBtnText: { color: '#38bdf8', fontWeight: '800', fontSize: 12 },
    closeDetailBtn: { backgroundColor: '#38bdf8', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
    closeDetailBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 13 },

    // KPI Tap Hint row
    kpiTapHintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginTop: 4,
    },
    kpiTapHintText: {
      fontSize: 9,
      fontWeight: '700',
    },

    // Metric Drill-Down Modal
    drillDownModalCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      width: '100%',
      maxWidth: 480,
      maxHeight: '88%',
      padding: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 12,
    },
    drillDownHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      paddingBottom: 12,
      marginBottom: 10,
    },
    drillDownTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    drillDownSubtitle: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
    drillDownCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.inputBackground,
    },
    drillDownSearchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 10,
      height: 38,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      marginBottom: 10,
      gap: 6,
    },
    drillDownSearchInput: {
      flex: 1,
      fontSize: 12,
      color: colors.textPrimary,
      paddingVertical: 0,
    },
    drillDownList: {
      flexGrow: 0,
      maxHeight: 380,
    },
    drillDownItemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.inputBackground,
      borderRadius: 14,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    drillDownItemTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    drillDownItemSubtitle: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 2,
    },
    drillDownItemMeta: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: 2,
    },
    drillDownItemBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    drillDownItemBadgeText: {
      fontSize: 9,
      fontWeight: '800',
    },
    drillDownItemAmount: {
      fontSize: 13,
      fontWeight: '900',
      color: '#10b981',
    },
    drillDownItemTapLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: '#38bdf8',
    },
    drillDownEmptyBox: {
      paddingVertical: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    drillDownEmptyText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      marginTop: 8,
    },
    drillDownFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingTop: 12,
      marginTop: 6,
    },
    drillDownPrimaryBtn: {
      backgroundColor: '#38bdf8',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowColor: '#38bdf8',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    drillDownPrimaryBtnText: {
      color: '#0f172a',
      fontSize: 13,
      fontWeight: '800',
    },

    // Filters Modal
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      width: '100%',
      maxWidth: 440,
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
      borderBottomColor: colors.divider,
      paddingBottom: 12,
      marginBottom: 10,
    },
    modalTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
    modalForm: { flex: 1 },
    filterLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, marginTop: 12, marginBottom: 5 },
    accordionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    accordionHeaderActive: {
      borderColor: '#38bdf8',
    },
    accordionHeaderText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
    accordionList: {
      marginTop: 4,
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      maxHeight: 180,
      paddingVertical: 4,
    },
    accordionOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      paddingHorizontal: 12,
      gap: 10,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.divider,
    },
    accordionOptionText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '600', flex: 1 },
    optionSelectedText: { color: '#38bdf8', fontWeight: '800' },

    modalActions: {
      flexDirection: 'row',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingTop: 14,
      marginTop: 12,
    },
    resetModalBtn: {
      flex: 1,
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    resetModalBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '800' },
    applyBtn: { flex: 1, backgroundColor: '#38bdf8', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    applyBtnText: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  });

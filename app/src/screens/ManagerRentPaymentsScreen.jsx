import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  BackHandler,
} from 'react-native';
import { AppActivityIndicator as ActivityIndicator } from '../components/AppActivityIndicator';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { paymentSchema, invoiceSchema } from '../validations/mobile.validation';
import { CustomDatePicker } from '../components/CustomDatePicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

const PAGE_SIZE = 10;
const CHART_COLORS = ['#10b981', '#38bdf8', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  if (num < 0) {
    return `-$${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const ManagerRentPaymentsScreen = ({
  onNavigate,
  onBack,
  initialTab = 'payments',
  targetPaymentId = null,
  targetInvoiceId = null,
  initialStatusFilter = null,
}) => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  // Sub-tab: 'dashboard' | 'payments' | 'invoices' | 'ledger'
  const [activeTab, setActiveTab] = useState(
    initialTab === 'rent-dashboard' || initialTab === 'rent' ? 'dashboard' : initialTab
  );
  const [tabHistory, setTabHistory] = useState([]);

  const switchTab = (tabName) => {
    if (tabName !== activeTab) {
      setTabHistory((prev) => [...prev, activeTab]);
      setActiveTab(tabName);
    }
  };

  const handleBackNavigation = () => {
    if (tabHistory.length > 0) {
      const prevTab = tabHistory[tabHistory.length - 1];
      setTabHistory((prev) => prev.slice(0, -1));
      setActiveTab(prevTab);
      return;
    }
    const baseTab = (initialTab === 'rent-dashboard' || initialTab === 'rent') ? 'dashboard' : initialTab;
    if (activeTab !== 'dashboard' && activeTab !== baseTab) {
      setActiveTab('dashboard');
      return;
    }
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('back');
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      const baseTab = (initialTab === 'rent-dashboard' || initialTab === 'rent') ? 'dashboard' : initialTab;
      if (tabHistory.length > 0 || (activeTab !== 'dashboard' && activeTab !== baseTab)) {
        handleBackNavigation();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [tabHistory, activeTab, initialTab]);

  // Drill-down metric modal state (Matching Web / ManagerDashboard)
  const [selectedRentMetric, setSelectedRentMetric] = useState(null);
  const [rentMetricSearch, setRentMetricSearch] = useState('');
  const [exportingType, setExportingType] = useState(null); // 'PDF' | 'EXCEL' | null

  // Item deletion loading states (for button spinner & instant optimistic update)
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab === 'rent-dashboard' || initialTab === 'rent' ? 'dashboard' : initialTab);
    }
  }, [initialTab]);

  // Unified Data State matching Web 1-to-1
  const [paymentsList, setPaymentsList] = useState([]);
  const [invoicesList, setInvoicesList] = useState([]);
  const [ledgerList, setLedgerList] = useState([]);

  // Auto-open specific payment receipt when deep-linked from notification
  useEffect(() => {
    if (targetPaymentId && paymentsList.length > 0) {
      const found = paymentsList.find((p) => String(p.id) === String(targetPaymentId));
      if (found) {
        setSelectedReceipt(found);
        setActiveTab('payments');
      }
    }
  }, [targetPaymentId, paymentsList]);

  // Auto-open specific invoice details when deep-linked from notification
  useEffect(() => {
    if (targetInvoiceId && invoicesList.length > 0) {
      const found = invoicesList.find((inv) => String(inv.id) === String(targetInvoiceId));
      if (found) {
        setSelectedInvoice(found);
        setActiveTab('invoices');
      }
    }
  }, [targetInvoiceId, invoicesList]);

  // Selections state
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(initialStatusFilter || '');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedTxType, setSelectedTxType] = useState('');

  useEffect(() => {
    if (initialStatusFilter !== undefined && initialStatusFilter !== null) {
      setSelectedStatus(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Pagination states (10 items per page matching Web DataTable)
  const [pagePayments, setPagePayments] = useState(1);
  const [pageInvoices, setPageInvoices] = useState(1);
  const [pageLedger, setPageLedger] = useState(1);

  // Reset page when filters change
  useEffect(() => {
    setPagePayments(1);
    setPageInvoices(1);
    setPageLedger(1);
  }, [searchQuery, selectedPropertyId, selectedStatus, selectedMethod, selectedTxType, activeTab]);

  // 1. Record Payment modal form states
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [payTenantId, setPayTenantId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payChannel, setPayChannel] = useState('ACH Direct');
  const [payDate, setPayDate] = useState('');
  const [payDueDateRef, setPayDueDateRef] = useState('');
  const [payRefNo, setPayRefNo] = useState('');
  const [allocRent, setAllocRent] = useState('');
  const [allocUtilities, setAllocUtilities] = useState('');
  const [allocParking, setAllocParking] = useState('');
  const [allocPet, setAllocPet] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // 2. Create Invoice modal form states
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [invTenantId, setInvTenantId] = useState('');
  const [invDueDate, setInvDueDate] = useState('');
  const [invLineItems, setInvLineItems] = useState([
    { id: 1, description: 'Rent Charge', amount: '0' }
  ]);
  const [invNotes, setInvNotes] = useState('');

  // 3. View modals
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedStatementTenant, setSelectedStatementTenant] = useState(null);
  const [statementModalOpen, setStatementModalOpen] = useState(false);

  // Dropdown Picker modal state
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [activePicker, setActivePicker] = useState(null);

  const [payErrors, setPayErrors] = useState({});
  const [invErrors, setInvErrors] = useState({});
  const [showPayDatePicker, setShowPayDatePicker] = useState(false);
  const [showPayDueDateRefPicker, setShowPayDueDateRefPicker] = useState(false);
  const [showInvDatePicker, setShowInvDatePicker] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const runEntryAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Auto-populate rent amount when tenant is selected in Invoice Modal (Matching Web 1:1)
  useEffect(() => {
    if (invTenantId) {
      const selectedTenant = tenants.find((t) => t.id === invTenantId);
      const matchedUnit =
        selectedTenant?.unit ||
        units.find((u) => u.id === selectedTenant?.unitId || (selectedTenant?.unitNumber && u.unitNumber === selectedTenant.unitNumber));

      const rentAmount = Number(
        matchedUnit?.rentAmount ||
        selectedTenant?.unit?.rentAmount ||
        selectedTenant?.rentAmount ||
        matchedUnit?.rent ||
        0
      );

      if (rentAmount > 0) {
        setInvLineItems((prev) => {
          const rentIdx = prev.findIndex((item) => item.description.toLowerCase().includes('rent'));
          if (rentIdx !== -1) {
            const updated = [...prev];
            updated[rentIdx] = { ...updated[rentIdx], amount: String(rentAmount) };
            return updated;
          }
          return [{ id: Date.now(), description: 'Rent Charge', amount: String(rentAmount) }, ...prev];
        });
      }
    }
  }, [invTenantId, tenants, units]);

  // Auto-populate rent amount when tenant is selected in Record Payment Modal
  useEffect(() => {
    if (payTenantId) {
      const selectedTenant = tenants.find((t) => t.id === payTenantId);
      const rentAmount = Number(
        selectedTenant?.unit?.rentAmount ||
        selectedTenant?.rentAmount ||
        selectedTenant?.unit?.rent ||
        0
      );
      if (rentAmount > 0) {
        setPayAmount(String(rentAmount));
        setAllocRent(String(rentAmount));
      }
    }
  }, [payTenantId, tenants]);

  // ==============================================================
  // EXACT API DATA FETCHER (Identical to Web Frontend)
  // Endpoints: GET /payments, GET /invoices, GET /properties, GET /units, GET /tenants
  // ==============================================================
  const loadAllData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const [paymentsRes, invoicesRes, propsRes, unitsRes, tenantsRes] = await Promise.all([
        apiClient.get('/payments', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/invoices', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/properties', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/units', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/tenants', logout, refreshAccessToken).catch(() => null),
      ]);

      const rawPayments = Array.isArray(paymentsRes) ? paymentsRes : (paymentsRes?.data || []);
      const rawInvoices = Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes?.data || []);
      const rawProps = Array.isArray(propsRes) ? propsRes : (propsRes?.data || []);
      const rawUnits = Array.isArray(unitsRes) ? unitsRes : (unitsRes?.data || []);
      const rawTenants = Array.isArray(tenantsRes) ? tenantsRes : (tenantsRes?.data || []);

      if (rawProps.length > 0) setProperties(rawProps);
      if (rawUnits.length > 0) setUnits(rawUnits);
      if (rawTenants.length > 0) setTenants(rawTenants);

      // 1. Map Payments identically to Web api.payments.getAll()
      const parsedPayments = rawPayments.map((p, idx) => {
        const tenantObj = rawTenants.find((t) => t.id === p.tenantId) || p.tenant;
        const tenantFullName = tenantObj
          ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim() || tenantObj.name
          : '';
        const propObj = rawProps.find((pr) => pr.id === p.propertyId) || p.property;
        const unitObj = rawUnits.find((u) => u.id === p.unitId) || p.unit;

        return {
          id: p.id,
          receiptNumber: p.receiptNumber || `#${idx + 1}`,
          tenantId: p.tenantId || p.tenant?.id || '',
          tenantName: tenantFullName || (p.tenantName && p.tenantName !== 'Unknown Tenant' ? p.tenantName : (p.tenant ? `${p.tenant.firstName || ''} ${p.tenant.lastName || ''}`.trim() : 'Resident')),
          propertyName: propObj?.name || p.propertyName || 'Property',
          unitNumber: unitObj?.unitNumber || p.unitNumber || 'Unassigned',
          amount: Number(p.amount) || 0,
          paidDate: p.paidDate ? p.paidDate.split('T')[0] : (p.createdAt ? p.createdAt.split('T')[0] : ''),
          paymentMethod: p.paymentMethod || 'ACH',
          status: p.status || 'Paid',
          propertyId: p.propertyId || p.property?.id || '',
          referenceNumber: p.referenceNumber || '',
          notes: p.notes || '',
          rawPayment: p,
        };
      });

      // Sort latest payments first so newly recorded payments appear at top #1
      parsedPayments.sort((a, b) => {
        const dateA = new Date(a.paidDate || a.rawPayment?.createdAt || 0).getTime();
        const dateB = new Date(b.paidDate || b.rawPayment?.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setPaymentsList(parsedPayments);

      // 2. Map Invoices identically to Web api.invoices.getAll()
      const parsedInvoices = rawInvoices.map((inv, idx) => {
        let lineItems = [];
        if (Array.isArray(inv.lineItems)) {
          lineItems = inv.lineItems;
        } else if (typeof inv.lineItems === 'string') {
          try {
            lineItems = JSON.parse(inv.lineItems);
          } catch {
            lineItems = [{ description: 'Rent Charge', amount: inv.amount || 0 }];
          }
        } else {
          lineItems = [{ description: 'Rent Charge', amount: inv.amount || 0 }];
        }

        const invAmount = Number(inv.amount) || 0;
        const paidAmount = Number(inv.paidAmount) || 0;
        const balance =
          inv.balance !== undefined && inv.balance !== null
            ? Number(inv.balance)
            : invAmount - paidAmount;

        const tenantObj = rawTenants.find((t) => t.id === inv.tenantId) || inv.tenant;
        const tenantFullName = tenantObj
          ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim() || tenantObj.name
          : '';
        const resolvedTenantName =
          (inv.tenantName && inv.tenantName !== 'Unknown Tenant')
            ? inv.tenantName
            : (tenantFullName || 'Resident');

        const propObj =
          rawProps.find((p) => p.id === inv.propertyId || p.id === tenantObj?.propertyId || p.id === tenantObj?.unit?.propertyId) ||
          inv.property ||
          tenantObj?.unit?.property;
        const unitObj =
          rawUnits.find((u) => u.id === tenantObj?.unitId || (u.unitNumber && u.unitNumber === inv.unitNumber)) ||
          inv.unit ||
          tenantObj?.unit;

        const resolvedPropertyName =
          (inv.propertyName && inv.propertyName !== 'Unknown Property')
            ? inv.propertyName
            : (propObj?.name || tenantObj?.propertyName || 'Property');

        const resolvedUnitNumber =
          (inv.unitNumber && inv.unitNumber !== '')
            ? inv.unitNumber
            : (unitObj?.unitNumber || tenantObj?.unitNumber || '101');

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber || `INV-${String(idx + 1).padStart(4, '0')}`,
          tenantId: inv.tenantId || inv.tenant?.id || '',
          tenantName: resolvedTenantName,
          tenantEmail: inv.tenantEmail || inv.tenant?.email || tenantObj?.email || '',
          propertyName: resolvedPropertyName,
          unitNumber: resolvedUnitNumber,
          amount: invAmount,
          paidAmount,
          balance,
          dueDate: inv.dueDate ? inv.dueDate.split('T')[0] : 'N/A',
          status: inv.status || 'Sent',
          lineItems,
          propertyId: inv.propertyId || inv.property?.id || propObj?.id || '',
          notes: inv.notes || '',
        };
      });
      setInvoicesList(parsedInvoices);

      // 3. Compile Rent Ledger identically to Web api.rentLedger.getAll()
      // Applies PER-TENANT running balance map
      const tenantRunningBalances = {};
      const allTransactions = [];

      parsedInvoices.forEach((inv) => {
        const rawDate = inv.dueDate || '';
        const invDate = rawDate && rawDate !== 'N/A' ? new Date(rawDate) : new Date();
        const isValidDate = !isNaN(invDate.getTime());
        const monthName = isValidDate ? invDate.toLocaleString('en-US', { month: 'long' }) : 'Monthly';
        const year = isValidDate ? invDate.getFullYear() : new Date().getFullYear();

        const isLateFee =
          (inv.notes || '').toLowerCase().includes('late fee') ||
          (inv.status || '').toLowerCase().includes('late') ||
          inv.lineItems.some((item) => (item.description || '').toLowerCase().includes('late fee'));

        const description = isLateFee
          ? `Late Fee — ${monthName} ${year}`
          : `Monthly Rent Invoice — ${monthName} ${year}`;
        const transactionType = isLateFee ? 'Late Fee' : 'Rent Charge';

        allTransactions.push({
          type: 'charge',
          date: inv.dueDate && inv.dueDate !== 'N/A' ? inv.dueDate : new Date().toISOString().split('T')[0],
          amount: inv.amount,
          tenantId: inv.tenantId,
          tenantName: inv.tenantName,
          propertyName: inv.propertyName,
          unitNumber: inv.unitNumber,
          description,
          transactionType,
          id: `led-chg-${inv.id}`,
          invoiceStatus: inv.status,
          invoicePaidAmount: inv.paidAmount,
          invoiceBalance: inv.balance,
        });
      });

      parsedPayments.forEach((pay) => {
        const method = pay.paymentMethod ? ` via ${String(pay.paymentMethod).replace(/_/g, ' ')}` : '';
        const ref = pay.referenceNumber ? ` · Ref# ${pay.referenceNumber}` : '';
        allTransactions.push({
          type: 'payment',
          date: pay.paidDate || new Date().toISOString().split('T')[0],
          amount: pay.amount,
          tenantId: pay.tenantId,
          tenantName: pay.tenantName,
          propertyName: pay.propertyName,
          unitNumber: pay.unitNumber,
          description: `Payment Received${method}${ref}`,
          transactionType: 'Payment',
          id: `led-pay-${pay.id}`,
        });
      });

      // Safety fallback: reflect any invoice paidAmount > 0 as credit if payment not in parsedPayments
      parsedInvoices.forEach((inv) => {
        const invPaid = Number(inv.paidAmount) || 0;
        if (invPaid > 0) {
          const hasPayment = parsedPayments.some((p) =>
            p.invoiceId === inv.id ||
            (p.tenantId === inv.tenantId && Math.abs(Number(p.amount) - invPaid) < 0.01 && (String(p.dueDate || '').slice(0, 7) === String(inv.dueDate || '').slice(0, 7) || String(p.paidDate || '').slice(0, 7) === String(inv.dueDate || '').slice(0, 7)))
          );
          if (!hasPayment) {
            allTransactions.push({
              type: 'payment',
              date: inv.dueDate && inv.dueDate !== 'N/A' ? inv.dueDate : new Date().toISOString().split('T')[0],
              amount: invPaid,
              tenantId: inv.tenantId,
              tenantName: inv.tenantName,
              propertyName: inv.propertyName,
              unitNumber: inv.unitNumber,
              description: `Payment Received via Offline (Partial) · Ref# RCP-OCCUPIED-AUTO`,
              transactionType: 'Payment',
              id: `led-pay-inv-${inv.id}`,
            });
          }
        }
      });

      // Chronological sort ascending
      allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const ledgerItems = [];
      allTransactions.forEach((tx) => {
        const tenantKey = tx.tenantId || tx.tenantName || 'unknown';
        if (tenantRunningBalances[tenantKey] === undefined) {
          tenantRunningBalances[tenantKey] = 0;
        }

        if (tx.type === 'charge') {
          tenantRunningBalances[tenantKey] += tx.amount;
          ledgerItems.push({
            ...tx,
            debit: tx.amount,
            credit: null,
            balance: tenantRunningBalances[tenantKey],
          });
        } else {
          tenantRunningBalances[tenantKey] -= tx.amount;
          ledgerItems.push({
            ...tx,
            debit: null,
            credit: tx.amount,
            balance: tenantRunningBalances[tenantKey],
          });
        }
      });

      setLedgerList(ledgerItems.reverse()); // Latest first
    } catch (e) {
      console.log('Error loading rent & payments data:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData(false);
  };

  // Helper to accurately match today's date in local and ISO UTC format
  const isTransactionToday = (dateVal) => {
    if (!dateVal) return false;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const localToday = `${year}-${month}-${day}`;
    const utcToday = now.toISOString().split('T')[0];

    const s = String(dateVal);
    if (s.startsWith(localToday) || s.startsWith(utcToday)) return true;

    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }
    return false;
  };

  // ==============================================================
  // REAL DASHBOARD METRIC CALCULATIONS (Identical to Web RentDashboardPage.tsx)
  // ==============================================================
  const dashboardMetrics = useMemo(() => {
    const paidPayments = paymentsList.filter((p) => p.status === 'Paid' || Number(p.amount) > 0);
    const monthlyCollected = paidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const overdueInvoices = invoicesList.filter(
      (i) => i.status === 'Overdue' || (i.status !== 'Paid' && (Number(i.balance) > 0 || Number(i.amount) > Number(i.paidAmount || 0)))
    );
    const outstandingBalance = overdueInvoices.reduce((sum, i) => {
      const bal = i.balance !== undefined && i.balance !== null ? Number(i.balance) : (Number(i.amount) || 0) - (Number(i.paidAmount) || 0);
      return sum + (bal || 0);
    }, 0);

    const todayTransactions = paidPayments.filter(
      (p) => isTransactionToday(p.paidDate) || isTransactionToday(p.createdAt)
    );

    const collectedToday = todayTransactions.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const latePayments = overdueInvoices.length;

    // Daily Collection Trends grouped by day of week
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daySums = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    paidPayments.forEach((p) => {
      if (p.paidDate) {
        const d = new Date(p.paidDate);
        if (!isNaN(d.getTime())) {
          const dayName = days[d.getDay()];
          if (daySums[dayName] !== undefined) {
            daySums[dayName] += Number(p.amount) || 0;
          }
        }
      }
    });

    const maxDaySum = Math.max(...Object.values(daySums), 1);
    const collectionTrends = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
      day,
      amount: daySums[day] || 0,
      pct: Math.min(100, Math.round(((daySums[day] || 0) / maxDaySum) * 100)),
    }));

    // Payment Channels Distribution
    const methodCounts = {};
    paidPayments.forEach((p) => {
      const m = p.paymentMethod || 'ACH/Direct';
      methodCounts[m] = (methodCounts[m] || 0) + 1;
    });

    const totalPaidCount = paidPayments.length || 0;
    const methodDistribution = Object.entries(methodCounts).map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / (totalPaidCount || 1)) * 100),
    }));

    const recentPayments = paidPayments.slice(0, 5);
    const largestOverdue = overdueInvoices.slice(0, 3);

    return {
      monthlyCollected,
      outstandingBalance,
      collectedToday,
      latePayments,
      totalPaidCount: paidPayments.length,
      collectionTrends,
      methodDistribution,
      recentPayments,
      largestOverdue,
    };
  }, [paymentsList, invoicesList]);

  // ==============================================================
  // ACTIONS: DELETE PAYMENT & DELETE INVOICE (With live API calls & Instant Optimistic UI)
  // ==============================================================
  const handleDeletePayment = (payment) => {
    Alert.alert(
      language === 'es' ? 'Eliminar Pago' : language === 'hi' ? 'भुगतान हटाएं' : 'Delete Payment',
      language === 'es'
        ? `¿Está seguro de que desea eliminar el recibo ${payment.receiptNumber} por $${Number(payment.amount).toLocaleString()}?`
        : language === 'hi'
        ? `क्या आप वाकई $${Number(payment.amount).toLocaleString()} का रसीद ${payment.receiptNumber} हटाना चाहते हैं?`
        : `Are you sure you want to delete payment receipt ${payment.receiptNumber} for $${Number(payment.amount).toLocaleString()}?`,
      [
        { text: language === 'es' ? 'Cancelar' : language === 'hi' ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: language === 'es' ? 'Eliminar' : language === 'hi' ? 'हटाएं' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingPaymentId(payment.id);
              await apiClient.delete(`/payments/${payment.id}`, logout, refreshAccessToken);
              // Optimistic instant removal: list updates immediately!
              setPaymentsList((prev) => prev.filter((p) => p.id !== payment.id));
              if (selectedReceipt?.id === payment.id) {
                setSelectedReceipt(null);
              }
              Alert.alert('Success', 'Payment receipt deleted successfully.');
              loadAllData(false);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete payment.');
            } finally {
              setDeletingPaymentId(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteInvoice = (invoice) => {
    Alert.alert(
      language === 'es' ? 'Eliminar Factura' : language === 'hi' ? 'चालान हटाएं' : 'Delete Invoice',
      language === 'es'
        ? `¿Está seguro de que desea eliminar la factura ${invoice.invoiceNumber} por $${Number(invoice.amount).toLocaleString()}?`
        : language === 'hi'
        ? `क्या आप वाकई $${Number(invoice.amount).toLocaleString()} का चालान ${invoice.invoiceNumber} हटाना चाहते हैं?`
        : `Are you sure you want to delete invoice ${invoice.invoiceNumber} for $${Number(invoice.amount).toLocaleString()}?`,
      [
        { text: language === 'es' ? 'Cancelar' : language === 'hi' ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: language === 'es' ? 'Eliminar' : language === 'hi' ? 'हटाएं' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingInvoiceId(invoice.id);
              await apiClient.delete(`/invoices/${invoice.id}`, logout, refreshAccessToken);
              // Optimistic instant removal: list updates immediately!
              setInvoicesList((prev) => prev.filter((i) => i.id !== invoice.id));
              if (selectedInvoice?.id === invoice.id) {
                setSelectedInvoice(null);
              }
              Alert.alert('Success', 'Invoice deleted successfully.');
              loadAllData(false);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete invoice.');
            } finally {
              setDeletingInvoiceId(null);
            }
          },
        },
      ]
    );
  };

  const getRentModalItems = () => {
    const q = rentMetricSearch.toLowerCase().trim();
    const todayStr = new Date().toISOString().split('T')[0];

    switch (selectedRentMetric) {
      case 'collectedToday': {
        const todayItems = paymentsList.filter(
          (p) => isTransactionToday(p.paidDate) || isTransactionToday(p.createdAt)
        );
        return todayItems
          .filter((p) => !q || (p.tenantName && p.tenantName.toLowerCase().includes(q)) || (p.propertyName && p.propertyName.toLowerCase().includes(q)))
          .map((p) => ({
            id: p.id,
            title: p.tenantName || 'Resident Payment',
            subtitle: `${p.paidDate || p.createdAt || 'Today'} · ${p.propertyName || 'Property'} (Unit ${p.unitNumber || 'N/A'})`,
            badge: formatCurrency(p.amount),
            badgeColor: '#10b981',
            raw: p,
            type: 'payment',
          }));
      }

      case 'monthlyCollected':
        return paymentsList
          .filter((p) => p.status === 'Paid' || Number(p.amount) > 0)
          .filter((p) => !q || (p.tenantName && p.tenantName.toLowerCase().includes(q)) || (p.propertyName && p.propertyName.toLowerCase().includes(q)))
          .map((p) => ({
            id: p.id,
            title: p.tenantName || 'Resident Payment',
            subtitle: `${p.paidDate || p.createdAt || 'Cleared'} · ${p.propertyName || 'Property'} (Unit ${p.unitNumber || 'N/A'})`,
            badge: formatCurrency(p.amount),
            badgeColor: '#10b981',
            raw: p,
            type: 'payment',
          }));

      case 'outstandingBalance': {
        const unpaidInvoices = invoicesList.filter(
          (inv) =>
            inv.status === 'Overdue' ||
            inv.status === 'Pending' ||
            inv.status === 'Unpaid' ||
            (inv.status !== 'Paid' && (Number(inv.balance) > 0 || Number(inv.amount) > Number(inv.paidAmount || 0)))
        );
        return unpaidInvoices
          .filter((inv) => !q || (inv.tenantName && inv.tenantName.toLowerCase().includes(q)) || (inv.propertyName && inv.propertyName.toLowerCase().includes(q)))
          .map((inv) => {
            const bal = inv.balance !== undefined && inv.balance !== null ? Number(inv.balance) : (Number(inv.amount) || 0) - (Number(inv.paidAmount) || 0);
            return {
              id: inv.id,
              title: inv.tenantName || 'Tenant Invoice',
              subtitle: `Due: ${inv.dueDate || 'Pending'} · ${inv.propertyName || 'Property'} (Unit ${inv.unitNumber || 'N/A'})`,
              badge: formatCurrency(bal > 0 ? bal : inv.amount),
              badgeColor: '#ef4444',
              raw: inv,
              type: 'invoice',
            };
          });
      }

      case 'totalTransactions':
        return paymentsList
          .filter((p) => !q || (p.tenantName && p.tenantName.toLowerCase().includes(q)) || (p.receiptNumber && p.receiptNumber.toLowerCase().includes(q)) || (p.propertyName && p.propertyName.toLowerCase().includes(q)))
          .map((p) => ({
            id: p.id,
            title: p.tenantName || 'Tenant Payment',
            subtitle: `${p.receiptNumber || '#RCPT'} · ${p.paidDate || 'Cleared'} · ${p.paymentMethod || 'ACH'}`,
            badge: formatCurrency(p.amount),
            badgeColor: '#38bdf8',
            raw: p,
            type: 'payment',
          }));

      default:
        return [];
    }
  };

  const getRentModalMeta = () => {
    switch (selectedRentMetric) {
      case 'collectedToday':
        return { name: 'Collected Today', count: `${getRentModalItems().length} Transactions`, destTab: 'payments', destFilter: 'Paid', destLabel: 'View Cleared Payments' };
      case 'monthlyCollected':
        return { name: 'Monthly Rent Collections', count: `${paymentsList.length} Payments`, destTab: 'payments', destFilter: 'Paid', destLabel: 'View Cleared Payments' };
      case 'outstandingBalance':
        return { name: 'Outstanding Rent Balances', count: `${invoicesList.filter((i) => i.status !== 'Paid').length} Unpaid Invoices`, destTab: 'invoices', destFilter: 'Overdue', destLabel: 'View Overdue Invoices' };
      case 'totalTransactions':
        return { name: 'Cleared Rent Transactions', count: `${paymentsList.length} Records`, destTab: 'payments', destFilter: '', destLabel: 'View All Payments' };
      default:
        return { name: 'Metric Details', count: '', destTab: 'payments', destFilter: '', destLabel: 'View Tab' };
    }
  };

  const handleExportRentMetric = async (format) => {
    const items = getRentModalItems();
    const meta = getRentModalMeta();
    if (items.length === 0) {
      Alert.alert('No Records', 'There are currently no items to export for this report.');
      return;
    }

    try {
      setExportingType(format);
      const dateStr = new Date().toISOString().split('T')[0];
      const reportTitle = meta.name;
      const fileName = `${reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}`;

      if (format === 'EXCEL') {
        const headers = ['Record / Title', 'Details', 'Status / Amount'];
        const rows = items.map((item) => [
          `"${(item.title || '').replace(/"/g, '""')}"`,
          `"${(item.subtitle || '').replace(/"/g, '""')}"`,
          `"${(item.badge || '').replace(/"/g, '""')}"`,
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const fileUri = `${FileSystem.cacheDirectory}${fileName}.csv`;

        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: `Export ${reportTitle} (Excel/CSV)`,
          });
        } else {
          Alert.alert('Export Complete', `File saved as ${fileName}.csv`);
        }
      } else if (format === 'PDF') {
        const tableRowsHtml = items
          .map(
            (item, idx) => `
          <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 11px; font-weight: 700; color: #1e293b;">${item.title}</td>
            <td style="border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 10px; color: #64748b;">${item.subtitle}</td>
            <td style="border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 11px; font-weight: 800; color: ${item.badgeColor || '#0284c7'}; text-align: right;">${item.badge}</td>
          </tr>
        `
          )
          .join('');

        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>${reportTitle}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #0f172a; margin: 0; }
                h1 { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0 0 6px 0; }
                .meta { font-size: 10px; color: #64748b; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { border: 1px solid #cbd5e1; padding: 9px 10px; background-color: #f1f5f9; color: #1e293b; font-size: 11px; text-align: left; font-weight: 700; }
              </style>
            </head>
            <body>
              <h1>${reportTitle}</h1>
              <div class="meta">Generated: ${new Date().toLocaleString()} | Total Records: ${items.length}</div>
              <table>
                <thead>
                  <tr>
                    <th>Record / Title</th>
                    <th>Details</th>
                    <th style="text-align: right;">Status / Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml}
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
      Alert.alert('Export Error', 'Could not export report. Please try again.');
    } finally {
      setExportingType(null);
    }
  };

  // ==============================================================
  // ACTIONS: RECORD PAYMENT & CREATE INVOICE & PDF DOWNLOAD
  // ==============================================================
  const handleDownloadLedgerPdf = async (tenant, txs, totalOutstanding) => {
    if (!tenant) return;
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Tenant Ledger Statement</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 28px; color: #1e293b; background: #fff; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start; }
            .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
            .subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }
            .badge { background: #dcfce7; color: #15803d; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 18px; }
            .recipient-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .recipient-name { font-size: 16px; font-weight: 800; color: #0f172a; margin: 3px 0; }
            .recipient-loc { font-size: 11px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th { background: #0f172a; color: #ffffff; text-align: left; padding: 8px 6px; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            td { padding: 8px 6px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            .debit { color: #ef4444; font-weight: 700; text-align: right; }
            .credit { color: #10b981; font-weight: 700; text-align: right; }
            .balance { font-weight: 800; text-align: right; }
            .total-box { margin-top: 18px; padding: 12px; background: #f1f5f9; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
            .total-val { font-size: 18px; font-weight: 900; color: ${totalOutstanding > 0 ? '#ef4444' : '#10b981'}; }
            .footer { margin-top: 24px; text-align: center; font-size: 9.5px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Official Tenant Ledger Statement</h1>
              <div class="subtitle">Property Management Corporate Office · Statement of Account</div>
            </div>
            <span class="badge">Verified Record</span>
          </div>

          <div class="card">
            <div class="recipient-label">Statement Recipient</div>
            <div class="recipient-name">${tenant.firstName || ''} ${tenant.lastName || ''}</div>
            <div class="recipient-loc">${tenant.unit ? `${tenant.unit.property?.name || 'Property'} · Unit ${tenant.unit.unitNumber || 'Unassigned'}` : (tenant.propertyName || 'Property Location')}</div>
            ${tenant.phone ? `<div class="recipient-loc">Phone: ${tenant.phone}</div>` : ''}
            ${tenant.email ? `<div class="recipient-loc">Email: ${tenant.email}</div>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th style="text-align: right;">Debit (+)</th>
                <th style="text-align: right;">Credit (-)</th>
                <th style="text-align: right;">Running Bal</th>
              </tr>
            </thead>
            <tbody>
              ${(txs || []).map(tx => `
                <tr>
                  <td>${tx.date || '—'}</td>
                  <td>${tx.description || '—'}</td>
                  <td class="debit">${tx.debit ? formatCurrency(tx.debit) : '—'}</td>
                  <td class="credit">${tx.credit ? formatCurrency(tx.credit) : '—'}</td>
                  <td class="balance">${formatCurrency(tx.balance)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-box">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: #475569;">SYSTEM AUDITED TENANT LEDGER</div>
              <div style="font-size: 10px; color: #64748b;">Total Records: ${(txs || []).length}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Outstanding Balance</div>
              <div class="total-val">${formatCurrency(totalOutstanding)}</div>
            </div>
          </div>

          <div class="footer">
            Generated on ${new Date().toLocaleDateString()} · WhatsLandlord Property Ledger
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: 'Download or Share Statement PDF',
      });
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to generate PDF statement.');
    }
  };

  const handleRecordPayment = async () => {
    setPayErrors({});
    if (!payTenantId) {
      Alert.alert('Validation Error', 'Tenant selection is required.');
      return;
    }

    const allocRentVal = parseFloat(allocRent || '0') || 0;
    const allocUtilVal = parseFloat(allocUtilities || '0') || 0;
    const allocParkVal = parseFloat(allocParking || '0') || 0;
    const allocPetVal = parseFloat(allocPet || '0') || 0;
    const allocSum = allocRentVal + allocUtilVal + allocParkVal + allocPetVal;
    const finalAmount = parseFloat(payAmount || '0') || allocSum;

    if (finalAmount <= 0) {
      Alert.alert('Validation Error', 'Payment amount must be greater than zero.');
      return;
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const validationData = {
      amount: finalAmount,
      date: payDate || todayDate,
      dueDate: payDueDateRef || todayDate,
      allocRent: allocRentVal,
      allocUtilities: allocUtilVal,
      allocParking: allocParkVal,
      allocPet: allocPetVal,
    };

    const valRes = paymentSchema.safeParse(validationData);
    if (!valRes.success) {
      const errs = {};
      valRes.error.issues.forEach((issue) => {
        errs[issue.path[0]] = issue.message;
      });
      setPayErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      // Map UI payment channel to backend Zod enum: 'ACH' | 'CreditCard' | 'DebitCard' | 'Cash' | 'Check' | 'Zelle' | 'WireTransfer'
      const channelMap = {
        'ACH Direct': 'ACH',
        'ACH': 'ACH',
        'Credit Card': 'CreditCard',
        'CreditCard': 'CreditCard',
        'Debit Card': 'DebitCard',
        'DebitCard': 'DebitCard',
        'Cash': 'Cash',
        'Check': 'Check',
        'Zelle': 'Zelle',
        'Wire Transfer': 'WireTransfer',
        'WireTransfer': 'WireTransfer',
        'Bank Transfer': 'BankTransfer',
        'BankTransfer': 'BankTransfer',
        'Money Order': 'MoneyOrder',
        'MoneyOrder': 'MoneyOrder',
        'Offline': 'Offline',
      };
      const validPaymentMethod = channelMap[payChannel] || 'ACH';

      const selTenant = (tenants || []).find((t) => t.id === payTenantId);
      const selUnit = selTenant?.unit || (units || []).find((u) => u.id === selTenant?.unitId);

      const payload = {
        amount: Number(finalAmount),
        paymentMethod: validPaymentMethod,
        referenceNumber: payRefNo?.trim() || `RCP-${Math.floor(100000 + Math.random() * 900000)}-ZTR`,
      };

      if (isUUID(payTenantId)) {
        payload.tenantId = payTenantId;
      }
      const rawPropId = selTenant?.propertyId || selUnit?.propertyId;
      if (isUUID(rawPropId)) {
        payload.propertyId = rawPropId;
      }
      const rawUnitId = selTenant?.unitId || selUnit?.id;
      if (isUUID(rawUnitId)) {
        payload.unitId = rawUnitId;
      }
      if (valRes.data.date) {
        payload.paidDate = new Date(valRes.data.date).toISOString().split('T')[0];
      }
      if (valRes.data.dueDate) {
        payload.dueDate = new Date(valRes.data.dueDate).toISOString().split('T')[0];
      }

      await apiClient.post('/payments', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Rent payment receipt recorded successfully.');
      setRecordPaymentOpen(false);
      setPayAmount('');
      setPayRefNo('');
      setPayNotes('');
      setAllocRent('');
      setAllocUtilities('');
      setAllocParking('');
      setAllocPet('');
      loadAllData(false);
    } catch (e) {
      let errMsg = e.message || 'Failed to record payment receipt.';
      if (e.response?.data?.issues?.length) {
        errMsg = e.response.data.issues.map((i) => i.message || `${i.field} is invalid`).join('\n');
      } else if (e.response?.data?.error?.message) {
        errMsg = e.response.data.error.message;
      }
      Alert.alert('Payment Error', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async () => {
    setInvErrors({});
    const validationData = {
      tenantId: invTenantId,
      dueDate: invDueDate,
    };

    const valRes = invoiceSchema.safeParse(validationData);
    if (!valRes.success) {
      const errs = {};
      valRes.error.issues.forEach((issue) => {
        errs[issue.path[0]] = issue.message;
      });
      setInvErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      const totalAmount = invLineItems.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);
      const selectedTenant = tenants.find((t) => t.id === valRes.data.tenantId);
      const tenantName = selectedTenant
        ? `${selectedTenant.firstName || ''} ${selectedTenant.lastName || ''}`.trim() || selectedTenant.name || 'Resident'
        : 'Resident';
      const propertyId = selectedTenant?.propertyId || selectedTenant?.unit?.propertyId || selectedTenant?.unit?.property?.id || '';
      const propertyName = selectedTenant?.unit?.property?.name || selectedTenant?.propertyName || selectedTenant?.property?.name || 'Property';
      const unitNumber = selectedTenant?.unit?.unitNumber || selectedTenant?.unitNumber || '';

      const payload = {
        tenantId: valRes.data.tenantId,
        tenantName,
        propertyId,
        propertyName,
        unitNumber,
        dueDate: valRes.data.dueDate ? new Date(valRes.data.dueDate).toISOString() : new Date().toISOString(),
        amount: totalAmount,
        notes: invNotes,
        lineItems: invLineItems,
        status: 'Draft',
      };

      await apiClient.post('/invoices', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Invoice created successfully.');
      setCreateInvoiceOpen(false);
      setInvNotes('');
      loadAllData(false);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLineItem = () => {
    setInvLineItems((prev) => [
      ...prev,
      { id: Date.now(), description: 'Itemized Charge', amount: '0' },
    ]);
  };

  const handleUpdateLineItem = (id, field, value) => {
    setInvLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteLineItem = (id) => {
    setInvLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const getSubtotal = () => {
    return invLineItems.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);
  };

  const getTenantUnitLocationLabel = (tenantId) => {
    const t = tenants.find((item) => item.id === tenantId);
    if (!t) return 'Select Resident to update location';
    const propName = t.unit?.property?.name || t.propertyName || 'Unassigned';
    const unitNo = t.unit?.unitNumber || t.unitNumber || 'Unassigned';
    return propName !== 'Unassigned' || unitNo !== 'Unassigned'
      ? `${propName}${unitNo !== 'Unassigned' ? ` · Unit ${unitNo}` : ''}`
      : 'Unassigned Location';
  };

  const getStatementData = () => {
    if (!selectedStatementTenant) return { txs: [], tenant: {}, totalOutstanding: 0 };
    const nameToMatch = selectedStatementTenant.tenantName.toLowerCase().trim();
    const tDetail =
      tenants.find(
        (t) => `${t.firstName || ''} ${t.lastName || ''}`.trim().toLowerCase() === nameToMatch
      ) || {};
    const filteredTxs = [...ledgerList]
      .filter((tx) => tx.tenantName.toLowerCase().trim() === nameToMatch)
      .reverse();

    let running = 0;
    const computedTxs = filteredTxs.map((tx) => {
      if (tx.debit) {
        running += tx.debit;
      } else if (tx.credit) {
        running -= tx.credit;
      }
      return {
        ...tx,
        runningBalance: running,
      };
    });

    computedTxs.reverse();
    return {
      txs: computedTxs,
      tenant: tDetail,
      totalOutstanding: Math.max(0, running),
    };
  };

  // ==============================================================
  // FILTERING LOGIC
  // ==============================================================
  const filteredPayments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return paymentsList.filter((item) => {
      const text = `${item.receiptNumber || ''} ${item.tenantName || ''} ${item.propertyName || ''} ${item.unitNumber || ''} ${item.referenceNumber || ''} ${item.notes || ''}`.toLowerCase();
      const matchesSearch = !q || text.includes(q);
      const matchesProperty = selectedPropertyId ? item.propertyId === selectedPropertyId : true;
      const matchesStatus = selectedStatus ? String(item.status || '').toLowerCase() === selectedStatus.toLowerCase() : true;
      const matchesMethod = selectedMethod ? String(item.paymentMethod || '').toLowerCase() === selectedMethod.toLowerCase() : true;
      return matchesSearch && matchesProperty && matchesStatus && matchesMethod;
    });
  }, [paymentsList, searchQuery, selectedPropertyId, selectedStatus, selectedMethod]);

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return invoicesList.filter((item) => {
      if (!item) return false;
      const text = `${item.invoiceNumber || ''} ${item.tenantName || ''} ${item.propertyName || ''}`.toLowerCase();
      const matchesSearch = !q || text.includes(q);
      const itemStatus = String(item.status || '').toLowerCase().replace(/[\s_]/g, '');
      const selStatus = selectedStatus.toLowerCase().replace(/[\s_]/g, '');
      const matchesStatus = selectedStatus ? itemStatus === selStatus : true;
      return matchesSearch && matchesStatus;
    });
  }, [invoicesList, searchQuery, selectedStatus]);

  const filteredLedger = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ledgerList.filter((item) => {
      if (!item) return false;
      const text = `${item.tenantName || ''} ${item.propertyName || ''} ${item.description || ''} ${item.transactionType || ''}`.toLowerCase();
      const matchesSearch = !q || text.includes(q);
      const propObj = properties.find((p) => p.id === selectedPropertyId);
      const matchesProperty = selectedPropertyId
        ? String(item.propertyName || '').toLowerCase().includes(
            (propObj?.name || '').toLowerCase()
          )
        : true;
      const matchesTxType = selectedTxType ? String(item.transactionType || '').toLowerCase() === selectedTxType.toLowerCase() : true;
      return matchesSearch && matchesProperty && matchesTxType;
    });
  }, [ledgerList, searchQuery, selectedPropertyId, selectedTxType, properties]);

  // Paginated views
  const totalPaymentPages = Math.ceil(filteredPayments.length / PAGE_SIZE) || 1;
  const paginatedPayments = filteredPayments.slice((pagePayments - 1) * PAGE_SIZE, pagePayments * PAGE_SIZE);

  const totalInvoicePages = Math.ceil(filteredInvoices.length / PAGE_SIZE) || 1;
  const paginatedInvoices = filteredInvoices.slice((pageInvoices - 1) * PAGE_SIZE, pageInvoices * PAGE_SIZE);

  const totalLedgerPages = Math.ceil(filteredLedger.length / PAGE_SIZE) || 1;
  const paginatedLedger = filteredLedger.slice((pageLedger - 1) * PAGE_SIZE, pageLedger * PAGE_SIZE);

  return (
    <View style={styles.mainWrapper}>
      {/* FIXED HEADER */}
      <View style={[styles.fixedHeader, { paddingTop: 16 }]}>
        <View style={styles.rowBetween}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {(!!onNavigate || !!onBack) && (
              <TouchableOpacity
                onPress={handleBackNavigation}
                style={{ marginRight: 8, padding: 4 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.title} allowFontScaling={false}>
                {language === 'es' ? 'Alquiler y Pagos' : language === 'hi' ? 'किराया और भुगतान' : 'Rent & Payments'}
              </Text>
              <Text style={styles.subtitle} allowFontScaling={false}>
                {language === 'es'
                  ? 'Registre recibos, facture mensualidades y audite el libro mayor'
                  : language === 'hi'
                  ? 'किराया रसीदें दर्ज करें, चालान बनाएं और खाता बही का मिलान करें'
                  : 'Track rent receipts, monthly invoices, and tenant ledgers'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.refreshIconBtn} onPress={() => loadAllData(true)} activeOpacity={0.7}>
            <Ionicons name="sync-outline" size={18} color="#38bdf8" />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher - 4 Submenus identical to Web */}
        <View style={{ marginTop: 10 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 10 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'dashboard' && styles.tabItemActive]}
              onPress={() => switchTab('dashboard')}
            >
              <Text
                style={[styles.tabItemText, activeTab === 'dashboard' && styles.tabItemTextActive]}
                allowFontScaling={false}
              >
                {language === 'es' ? 'Panel' : language === 'hi' ? 'डैशबोर्ड' : 'Dashboard'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'payments' && styles.tabItemActive]}
              onPress={() => switchTab('payments')}
            >
              <Text
                style={[styles.tabItemText, activeTab === 'payments' && styles.tabItemTextActive]}
                allowFontScaling={false}
              >
                {language === 'es' ? 'Pagos' : language === 'hi' ? 'भुगतान' : 'Payments'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'invoices' && styles.tabItemActive]}
              onPress={() => switchTab('invoices')}
            >
              <Text
                style={[styles.tabItemText, activeTab === 'invoices' && styles.tabItemTextActive]}
                allowFontScaling={false}
              >
                {language === 'es' ? 'Facturas' : language === 'hi' ? 'चालान' : 'Invoices'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'ledger' && styles.tabItemActive]}
              onPress={() => switchTab('ledger')}
            >
              <Text
                style={[styles.tabItemText, activeTab === 'ledger' && styles.tabItemTextActive]}
                allowFontScaling={false}
              >
                {language === 'es' ? 'Libro' : language === 'hi' ? 'खाता बही' : 'Rent Ledger'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Search bar & Primary CTA button */}
        <View style={[styles.searchBarRow, { marginTop: 10 }]}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                activeTab === 'payments'
                  ? language === 'es' ? 'Buscar pagos (#, residente)...' : 'Search payments (#, resident)...'
                  : activeTab === 'invoices'
                  ? language === 'es' ? 'Buscar facturas (INV, residente)...' : 'Search invoices (INV, resident)...'
                  : activeTab === 'dashboard'
                  ? language === 'es' ? 'Buscar en rentas...' : 'Search rent overview...'
                  : language === 'es' ? 'Buscar por residente...' : 'Search ledger by resident...'
              }
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {activeTab === 'invoices' && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setCreateInvoiceOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#0f172a" />
              <Text style={styles.addBtnText} allowFontScaling={false}>
                {language === 'es' ? 'Factura' : 'Invoice'}
              </Text>
            </TouchableOpacity>
          )}

          {activeTab === 'payments' && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setRecordPaymentOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#0f172a" />
              <Text style={styles.addBtnText} allowFontScaling={false}>
                {language === 'es' ? 'Pago' : 'Record Payment'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        {activeTab !== 'dashboard' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16, alignItems: 'center' }}
            style={styles.filterPillsScroll}
          >
            {/* Status Filter Pill */}
            {(activeTab === 'payments' || activeTab === 'invoices') && (
              <View style={styles.pillContainer}>
                {['', 'Paid', 'Overdue', 'Draft', 'Partially Paid'].filter(s => activeTab === 'payments' ? s !== 'Overdue' && s !== 'Draft' : true).map((st) => (
                  <TouchableOpacity
                    key={st || 'all-st'}
                    style={[styles.pillItem, selectedStatus === st && styles.pillItemActive]}
                    onPress={() => setSelectedStatus(st)}
                  >
                    <Text style={[styles.pillText, selectedStatus === st && styles.pillTextActive]} allowFontScaling={false}>
                      {st || (language === 'es' ? 'Todos Estados' : 'All Statuses')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Method Filter Pill for Payments */}
            {activeTab === 'payments' && (
              <View style={styles.pillContainer}>
                <View style={styles.filterDivider} />
                {['', 'Zelle', 'Cash', 'Check', 'ACH'].map((m) => (
                  <TouchableOpacity
                    key={m || 'all-m'}
                    style={[styles.pillItem, selectedMethod === m && styles.pillItemActive]}
                    onPress={() => setSelectedMethod(m)}
                  >
                    <Text style={[styles.pillText, selectedMethod === m && styles.pillTextActive]} allowFontScaling={false}>
                      {m || (language === 'es' ? 'Todos Métodos' : 'All Methods')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* TxType Filter Pill for Ledger */}
            {activeTab === 'ledger' && (
              <View style={styles.pillContainer}>
                {['', 'Payment', 'Rent Charge', 'Late Fee'].map((tt) => (
                  <TouchableOpacity
                    key={tt || 'all-tt'}
                    style={[styles.pillItem, selectedTxType === tt && styles.pillItemActive]}
                    onPress={() => setSelectedTxType(tt)}
                  >
                    <Text style={[styles.pillText, selectedTxType === tt && styles.pillTextActive]} allowFontScaling={false}>
                      {tt || (language === 'es' ? 'Todos Tipos' : 'All Types')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* SCROLL CONTENT */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 14 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
      >
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText} allowFontScaling={false}>
              {language === 'es' ? 'Cargando datos en vivo...' : 'Loading live rent & payments data...'}
            </Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            {/* ============================================================== */}
            {/* 1. DASHBOARD TAB (Identical to Web RentDashboardPage.tsx) */}
            {/* ============================================================== */}
            {activeTab === 'dashboard' && (
              <View>
                {/* 5-Metric Top Grid matching Web */}
                <View style={styles.metricsGrid}>
                  {/* Collected Today */}
                  <TouchableOpacity
                    style={styles.metricCard}
                    onPress={() => setSelectedRentMetric('collectedToday')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.metricCardLabel} allowFontScaling={false}>COLLECTED TODAY</Text>
                    <Text style={[styles.metricCardValue, { color: '#10b981' }]} allowFontScaling={false}>
                      ${dashboardMetrics.collectedToday.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </Text>
                    <Text style={styles.metricCardSub} allowFontScaling={false}>Daily bank clearing →</Text>
                  </TouchableOpacity>

                  {/* Monthly Collected */}
                  <TouchableOpacity
                    style={styles.metricCard}
                    onPress={() => setSelectedRentMetric('monthlyCollected')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.metricCardLabel} allowFontScaling={false}>MONTHLY COLLECTED</Text>
                    <Text style={[styles.metricCardValue, { color: '#10b981' }]} allowFontScaling={false}>
                      ${dashboardMetrics.monthlyCollected.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </Text>
                    <View style={styles.rowTrend}>
                      <Ionicons name="trending-up" size={12} color="#10b981" />
                      <Text style={[styles.metricCardSub, { color: '#10b981', fontWeight: '800', marginLeft: 3 }]} allowFontScaling={false}>
                        {(() => {
                          const totalBilled = (dashboardMetrics.monthlyCollected || 0) + (dashboardMetrics.outstandingBalance || 0);
                          const rate = totalBilled > 0 ? Math.round(((dashboardMetrics.monthlyCollected || 0) / totalBilled) * 100) : 100;
                          return `${rate}% Rate →`;
                        })()}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Outstanding Balance */}
                  <TouchableOpacity
                    style={styles.metricCard}
                    onPress={() => setSelectedRentMetric('outstandingBalance')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.metricCardLabel} allowFontScaling={false}>OUTSTANDING BALANCE</Text>
                    <Text style={[styles.metricCardValue, { color: '#ef4444' }]} allowFontScaling={false}>
                      ${dashboardMetrics.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </Text>
                    <View style={styles.rowTrend}>
                      <Ionicons name="alert-circle" size={12} color="#ef4444" />
                      <Text style={[styles.metricCardSub, { color: '#ef4444', fontWeight: '800', marginLeft: 3 }]} allowFontScaling={false}>
                        {dashboardMetrics.latePayments} Overdue →
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Total Cleared Transactions */}
                  <TouchableOpacity
                    style={styles.metricCard}
                    onPress={() => setSelectedRentMetric('totalTransactions')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.metricCardLabel} allowFontScaling={false}>TOTAL TRANSACTIONS</Text>
                    <Text style={[styles.metricCardValue, { color: '#38bdf8' }]} allowFontScaling={false}>
                      {dashboardMetrics.totalPaidCount}
                    </Text>
                    <Text style={styles.metricCardSub} allowFontScaling={false}>Cleared payments →</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick Actions Bar */}
                <View style={[styles.rowBetween, { marginTop: 8, marginBottom: 16 }]}>
                  <TouchableOpacity
                    style={[styles.addBtn, { flex: 1, marginRight: 8, height: 42, justifyContent: 'center' }]}
                    onPress={() => setRecordPaymentOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="card" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                    <Text style={styles.addBtnText} allowFontScaling={false}>Record Payment</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.addBtn,
                      {
                        flex: 1,
                        height: 42,
                        justifyContent: 'center',
                        backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
                      },
                    ]}
                    onPress={() => setCreateInvoiceOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="document-text" size={16} color={colors.textPrimary} style={{ marginRight: 6 }} />
                    <Text style={[styles.addBtnText, { color: colors.textPrimary }]} allowFontScaling={false}>
                      Create Invoice
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Daily Collection Trends */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle} allowFontScaling={false}>DAILY COLLECTION TRENDS</Text>
                  <Text style={styles.sectionCardSub} allowFontScaling={false}>Grouped collection by day of week</Text>
                  <View style={styles.chartBarRow}>
                    {dashboardMetrics.collectionTrends.map((t) => (
                      <View key={t.day} style={styles.chartCol}>
                        <View style={styles.chartBarTrack}>
                          <View style={[styles.chartBarFill, { height: `${Math.max(t.pct, 8)}%` }]} />
                        </View>
                        <Text style={styles.chartDayText} allowFontScaling={false}>{t.day}</Text>
                        <Text style={styles.chartAmountText} allowFontScaling={false}>
                          ${t.amount > 0 ? (t.amount > 1000 ? `${Math.round(t.amount / 1000)}k` : t.amount) : '0'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Payment Channels Breakdown */}
                <View style={[styles.sectionCard, { marginTop: 14 }]}>
                  <Text style={styles.sectionCardTitle} allowFontScaling={false}>PAYMENT CHANNELS</Text>
                  <Text style={styles.sectionCardSub} allowFontScaling={false}>Distribution across payment rails</Text>
                  <View style={{ marginTop: 10 }}>
                    {dashboardMetrics.methodDistribution.map((m, idx) => {
                      const color = CHART_COLORS[idx % CHART_COLORS.length];
                      return (
                        <View key={m.name} style={{ marginBottom: 8 }}>
                          <View style={styles.rowBetween}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <View style={[styles.colorDot, { backgroundColor: color }]} />
                              <Text style={styles.channelLabel} allowFontScaling={false}>{m.name}</Text>
                            </View>
                            <Text style={styles.channelValue} allowFontScaling={false}>
                              {m.count} txs ({m.pct}%)
                            </Text>
                          </View>
                          <View style={styles.channelBarTrack}>
                            <View style={[styles.channelBarFill, { width: `${m.pct}%`, backgroundColor: color }]} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Recent Cleared Payments */}
                <View style={[styles.sectionCard, { marginTop: 14 }]}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionCardTitle} allowFontScaling={false}>RECENT CLEARED PAYMENTS</Text>
                    <TouchableOpacity onPress={() => setActiveTab('payments')}>
                      <Text style={styles.viewAllText} allowFontScaling={false}>View All ({paymentsList.length}) →</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ marginTop: 8 }}>
                    {dashboardMetrics.recentPayments.length === 0 ? (
                      <Text style={styles.emptyInlineText} allowFontScaling={false}>No recent payments found.</Text>
                    ) : (
                      dashboardMetrics.recentPayments.map((p) => (
                        <View key={p.id} style={styles.recentPayRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.recentPayTenant} allowFontScaling={false}>{p.tenantName}</Text>
                            <Text style={styles.recentPaySub} allowFontScaling={false}>
                              Unit {p.unitNumber} • {p.paymentMethod} • {p.receiptNumber}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.recentPayAmount} allowFontScaling={false}>
                              +${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                            <Text style={styles.recentPayDate} allowFontScaling={false}>{p.paidDate || 'Paid'}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>

                {/* Largest Outstanding Overdue Accounts */}
                {dashboardMetrics.largestOverdue.length > 0 && (
                  <View style={[styles.sectionCard, { marginTop: 14 }]}>
                    <View style={styles.rowBetween}>
                      <Text style={[styles.sectionCardTitle, { color: '#ef4444' }]} allowFontScaling={false}>
                        LARGEST OUTSTANDING BALANCES
                      </Text>
                      <TouchableOpacity onPress={() => setActiveTab('invoices')}>
                        <Text style={styles.viewAllText} allowFontScaling={false}>View Invoices →</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ marginTop: 8 }}>
                      {dashboardMetrics.largestOverdue.map((inv) => (
                        <View key={inv.id} style={styles.recentPayRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.recentPayTenant} allowFontScaling={false}>{inv.tenantName}</Text>
                            <Text style={styles.recentPaySub} allowFontScaling={false}>
                              {inv.propertyName} • Unit {inv.unitNumber}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.recentPayAmount, { color: '#ef4444' }]} allowFontScaling={false}>
                              ${inv.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                            <Text style={[styles.recentPayDate, { color: '#ef4444' }]} allowFontScaling={false}>
                              Due {inv.dueDate}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* ============================================================== */}
            {/* 2. PAYMENTS TAB (Identical to Web PaymentsPage.tsx) */}
            {/* ============================================================== */}
            {activeTab === 'payments' && (
              <View>
                <View style={styles.listHeaderRow}>
                  <Text style={styles.listCountText} allowFontScaling={false}>
                    Showing {filteredPayments.length === 0 ? 0 : (pagePayments - 1) * PAGE_SIZE + 1} -{' '}
                    {Math.min(pagePayments * PAGE_SIZE, filteredPayments.length)} of {filteredPayments.length} Payments
                  </Text>
                </View>

                {paginatedPayments.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Ionicons name="card-outline" size={36} color="#64748b" style={{ marginBottom: 8 }} />
                    <Text style={styles.emptyText} allowFontScaling={false}>
                      {language === 'es' ? 'No se encontraron recibos de pago' : 'No payment receipts found'}
                    </Text>
                  </View>
                ) : (
                  paginatedPayments.map((item) => (
                    <View key={item.id} style={styles.recordsCard}>
                      {/* Top Header Row: Receipt # on Left, Badges on Right */}
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.numTag}>
                          <Text style={styles.coaNum} allowFontScaling={false}>{item.receiptNumber}</Text>
                        </View>
                        <View style={styles.badgesRow}>
                          <View style={[styles.badge, { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                            <Text style={[styles.badgeText, { color: '#10b981' }]} allowFontScaling={false}>{item.paymentMethod}</Text>
                          </View>
                          <View style={[styles.badge, { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.12)', marginLeft: 6 }]}>
                            <Text style={[styles.badgeText, { color: '#38bdf8' }]} allowFontScaling={false}>{item.status}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Resident Info */}
                      <View style={{ marginTop: 8, marginBottom: 8 }}>
                        <Text style={styles.recordLabel} allowFontScaling={false}>{item.tenantName}</Text>
                        <Text style={styles.recordSubText} allowFontScaling={false}>
                          {item.propertyName} · Unit {item.unitNumber}
                        </Text>
                      </View>

                      <View style={styles.divider} />

                      {/* Key-Value Details */}
                      <View style={styles.rowBetween}>
                        <Text style={styles.detailLabelText} allowFontScaling={false}>
                          {language === 'es' ? 'Fecha de Cobro' : 'Date Paid'}
                        </Text>
                        <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.paidDate || 'N/A'}</Text>
                      </View>

                      <View style={[styles.rowBetween, { marginTop: 4 }]}>
                        <Text style={styles.detailLabelText} allowFontScaling={false}>
                          {language === 'es' ? 'Monto Recibido' : 'Amount Paid'}
                        </Text>
                        <Text style={[styles.recordValue, { color: '#10b981' }]} allowFontScaling={false}>
                          ${Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Text>
                      </View>

                      {/* Action buttons matching Web DataTable */}
                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={styles.cardActionBtn}
                          onPress={() => setSelectedReceipt(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="eye-outline" size={14} color="#38bdf8" style={{ marginRight: 4 }} />
                          <Text style={[styles.cardActionBtnText, { color: '#38bdf8' }]} allowFontScaling={false}>
                            View Receipt
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.cardActionBtn, { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.06)' }]}
                          onPress={() => handleDeletePayment(item)}
                          disabled={deletingPaymentId === item.id}
                          activeOpacity={0.7}
                        >
                          {deletingPaymentId === item.id ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                          ) : (
                            <>
                              <Ionicons name="trash-outline" size={14} color="#ef4444" style={{ marginRight: 4 }} />
                              <Text style={[styles.cardActionBtnText, { color: '#ef4444' }]} allowFontScaling={false}>
                                Delete
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}

                {/* Pagination Controls */}
                {totalPaymentPages > 1 && (
                  <View style={styles.paginationRow}>
                    <TouchableOpacity
                      style={[styles.pageBtn, pagePayments <= 1 && styles.pageBtnDisabled]}
                      disabled={pagePayments <= 1}
                      onPress={() => setPagePayments((p) => Math.max(1, p - 1))}
                    >
                      <Ionicons name="chevron-back" size={16} color={pagePayments <= 1 ? '#64748b' : '#38bdf8'} />
                      <Text style={[styles.pageBtnText, pagePayments <= 1 && styles.pageBtnTextDisabled]} allowFontScaling={false}>
                        Prev
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.pageIndicatorText} allowFontScaling={false}>
                      Page {pagePayments} of {totalPaymentPages}
                    </Text>

                    <TouchableOpacity
                      style={[styles.pageBtn, pagePayments >= totalPaymentPages && styles.pageBtnDisabled]}
                      disabled={pagePayments >= totalPaymentPages}
                      onPress={() => setPagePayments((p) => Math.min(totalPaymentPages, p + 1))}
                    >
                      <Text style={[styles.pageBtnText, pagePayments >= totalPaymentPages && styles.pageBtnTextDisabled]} allowFontScaling={false}>
                        Next
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={pagePayments >= totalPaymentPages ? '#64748b' : '#38bdf8'} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* ============================================================== */}
            {/* 3. INVOICES TAB (Identical to Web InvoicesPage.tsx) */}
            {/* ============================================================== */}
            {activeTab === 'invoices' && (
              <View>
                <View style={styles.listHeaderRow}>
                  <Text style={styles.listCountText} allowFontScaling={false}>
                    Showing {filteredInvoices.length === 0 ? 0 : (pageInvoices - 1) * PAGE_SIZE + 1} -{' '}
                    {Math.min(pageInvoices * PAGE_SIZE, filteredInvoices.length)} of {filteredInvoices.length} Invoices
                  </Text>
                </View>

                {paginatedInvoices.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Ionicons name="document-text-outline" size={36} color="#64748b" style={{ marginBottom: 8 }} />
                    <Text style={styles.emptyText} allowFontScaling={false}>
                      {language === 'es' ? 'No se encontraron facturas registradas' : 'No invoices recorded'}
                    </Text>
                  </View>
                ) : (
                  paginatedInvoices.map((item) => {
                    const statusColor =
                      item.status === 'Paid'
                        ? '#10b981'
                        : item.status === 'Partially Paid'
                        ? '#f59e0b'
                        : item.status === 'Overdue'
                        ? '#ef4444'
                        : '#38bdf8';
                    const isPaid = item.status?.toLowerCase() === 'paid';
                    const outstanding = isPaid ? 0 : item.balance;

                    return (
                      <View key={item.id} style={styles.recordsCard}>
                        {/* Top Header Row: Invoice # on Left, Status Badge on Right */}
                        <View style={styles.cardHeaderRow}>
                          <View style={styles.numTag}>
                            <Text style={styles.coaNum} allowFontScaling={false}>{item.invoiceNumber}</Text>
                          </View>
                          <View style={[styles.badge, { borderColor: statusColor, backgroundColor: `${statusColor}14` }]}>
                            <Text style={[styles.badgeText, { color: statusColor }]} allowFontScaling={false}>
                              {item.status}
                            </Text>
                          </View>
                        </View>

                        {/* Resident Info */}
                        <View style={{ marginTop: 8, marginBottom: 8 }}>
                          <Text style={styles.recordLabel} allowFontScaling={false}>{item.tenantName}</Text>
                          <Text style={styles.recordSubText} allowFontScaling={false}>
                            {item.propertyName} · Unit {item.unitNumber}
                          </Text>
                        </View>

                        <View style={styles.divider} />

                        {/* Key-Value Details */}
                        <View style={styles.rowBetween}>
                          <Text style={styles.detailLabelText} allowFontScaling={false}>
                            {language === 'es' ? 'Fecha Vencimiento' : 'Due Date'}
                          </Text>
                          <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.dueDate}</Text>
                        </View>

                        <View style={[styles.rowBetween, { marginTop: 4 }]}>
                          <Text style={styles.detailLabelText} allowFontScaling={false}>
                            {language === 'es' ? 'Monto de Factura' : 'Invoice Amount'}
                          </Text>
                          <Text style={styles.recordSubTextVal} allowFontScaling={false}>
                            ${Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </Text>
                        </View>

                        <View style={[styles.rowBetween, { marginTop: 4 }]}>
                          <Text style={styles.detailLabelText} allowFontScaling={false}>
                            {language === 'es' ? 'Saldo Pendiente' : 'Outstanding Balance'}
                          </Text>
                          <Text
                            style={[
                              styles.recordValue,
                              { color: outstanding > 0 ? '#ef4444' : '#10b981' },
                            ]}
                            allowFontScaling={false}
                          >
                            ${Number(outstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </Text>
                        </View>

                        {/* Action buttons matching Web DataTable */}
                        <View style={styles.cardActionsRow}>
                          <TouchableOpacity
                            style={styles.cardActionBtn}
                            onPress={() => setSelectedInvoice(item)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="eye-outline" size={14} color="#38bdf8" style={{ marginRight: 4 }} />
                            <Text style={[styles.cardActionBtnText, { color: '#38bdf8' }]} allowFontScaling={false}>
                              View Details
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.cardActionBtn, { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.06)' }]}
                            onPress={() => handleDeleteInvoice(item)}
                            disabled={deletingInvoiceId === item.id}
                            activeOpacity={0.7}
                          >
                            {deletingInvoiceId === item.id ? (
                              <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                              <>
                                <Ionicons name="trash-outline" size={14} color="#ef4444" style={{ marginRight: 4 }} />
                                <Text style={[styles.cardActionBtnText, { color: '#ef4444' }]} allowFontScaling={false}>
                                  Delete
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}

                {/* Pagination Controls */}
                {totalInvoicePages > 1 && (
                  <View style={styles.paginationRow}>
                    <TouchableOpacity
                      style={[styles.pageBtn, pageInvoices <= 1 && styles.pageBtnDisabled]}
                      disabled={pageInvoices <= 1}
                      onPress={() => setPageInvoices((p) => Math.max(1, p - 1))}
                    >
                      <Ionicons name="chevron-back" size={16} color={pageInvoices <= 1 ? '#64748b' : '#38bdf8'} />
                      <Text style={[styles.pageBtnText, pageInvoices <= 1 && styles.pageBtnTextDisabled]} allowFontScaling={false}>
                        Prev
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.pageIndicatorText} allowFontScaling={false}>
                      Page {pageInvoices} of {totalInvoicePages}
                    </Text>

                    <TouchableOpacity
                      style={[styles.pageBtn, pageInvoices >= totalInvoicePages && styles.pageBtnDisabled]}
                      disabled={pageInvoices >= totalInvoicePages}
                      onPress={() => setPageInvoices((p) => Math.min(totalInvoicePages, p + 1))}
                    >
                      <Text style={[styles.pageBtnText, pageInvoices >= totalInvoicePages && styles.pageBtnTextDisabled]} allowFontScaling={false}>
                        Next
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={pageInvoices >= totalInvoicePages ? '#64748b' : '#38bdf8'} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* ============================================================== */}
            {/* 4. RENT LEDGER TAB (Identical to Web RentLedgerPage.tsx) */}
            {/* ============================================================== */}
            {activeTab === 'ledger' && (
              <View>
                <View style={styles.listHeaderRow}>
                  <Text style={styles.listCountText} allowFontScaling={false}>
                    Showing {filteredLedger.length === 0 ? 0 : (pageLedger - 1) * PAGE_SIZE + 1} -{' '}
                    {Math.min(pageLedger * PAGE_SIZE, filteredLedger.length)} of {filteredLedger.length} Ledger Transactions
                  </Text>
                </View>

                {paginatedLedger.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Ionicons name="book-outline" size={36} color="#64748b" style={{ marginBottom: 8 }} />
                    <Text style={styles.emptyText} allowFontScaling={false}>
                      {language === 'es' ? 'No se encontraron registros de libro mayor' : 'No rent ledger items found'}
                    </Text>
                  </View>
                ) : (
                  paginatedLedger.map((item, idx) => {
                    const isPayment = item.debit === null;
                    const badgeColor = isPayment ? '#10b981' : item.transactionType === 'Late Fee' ? '#f59e0b' : '#38bdf8';

                    return (
                      <TouchableOpacity
                        key={item.id || idx}
                        style={styles.recordsCard}
                        activeOpacity={0.85}
                        onPress={() => {
                          setSelectedStatementTenant(item);
                          setStatementModalOpen(true);
                        }}
                      >
                        {/* Top Header Row: Date on Left, Badge on Right */}
                        <View style={styles.cardHeaderRow}>
                          <View style={styles.numTag}>
                            <Text style={styles.coaNum} allowFontScaling={false}>{item.date}</Text>
                          </View>
                          <View style={[styles.badge, { borderColor: badgeColor, backgroundColor: `${badgeColor}14` }]}>
                            <Text style={[styles.badgeText, { color: badgeColor }]} allowFontScaling={false}>
                              {item.transactionType}
                            </Text>
                          </View>
                        </View>

                        {/* Resident Info & Health Badge */}
                        <View style={{ marginTop: 8, marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.recordLabel} allowFontScaling={false}>{item.tenantName}</Text>
                            <View
                              style={[
                                styles.healthBadge,
                                { backgroundColor: item.balance <= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.healthBadgeText,
                                  { color: item.balance <= 0 ? '#10b981' : '#f59e0b' },
                                ]}
                                allowFontScaling={false}
                              >
                                {item.balance <= 0 ? '98%' : 'Due'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.recordSubText} allowFontScaling={false}>
                            {item.propertyName} · Unit {item.unitNumber}
                          </Text>
                          {Boolean(item.description) && (
                            <Text style={styles.ledgerDesc} allowFontScaling={false} numberOfLines={1}>
                              {item.description}
                            </Text>
                          )}
                          {Boolean(item.invoiceStatus) && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                              <View
                                style={[
                                  styles.badge,
                                  {
                                    paddingVertical: 1.5,
                                    paddingHorizontal: 7,
                                    borderColor: item.invoiceStatus === 'Paid' ? '#10b981' : item.invoiceStatus === 'Partially Paid' ? '#f59e0b' : '#ef4444',
                                    backgroundColor: item.invoiceStatus === 'Paid' ? 'rgba(16, 185, 129, 0.12)' : item.invoiceStatus === 'Partially Paid' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                  },
                                ]}
                              >
                                <Text
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: '800',
                                    color: item.invoiceStatus === 'Paid' ? '#10b981' : item.invoiceStatus === 'Partially Paid' ? '#f59e0b' : '#ef4444',
                                  }}
                                  allowFontScaling={false}
                                >
                                  {item.invoiceStatus === 'Partially Paid'
                                    ? `Partially Paid: $${Number(item.invoicePaidAmount || 0).toLocaleString()} Paid`
                                    : item.invoiceStatus === 'Paid'
                                    ? 'Fully Paid'
                                    : 'Unpaid / Overdue'}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>

                        {/* Financial Ledger Metrics Grid */}
                        <View style={styles.ledgerBox}>
                          <View style={styles.ledgerGridItem}>
                            <Text style={styles.ledgerGridLabel} allowFontScaling={false}>DEBIT (+)</Text>
                            <Text style={[styles.ledgerGridVal, { color: item.debit ? '#ef4444' : colors.textSecondary }]} allowFontScaling={false}>
                              {item.debit ? `+$${Number(item.debit).toLocaleString()}` : '-'}
                            </Text>
                          </View>
                          <View style={styles.ledgerGridItem}>
                            <Text style={styles.ledgerGridLabel} allowFontScaling={false}>CREDIT (-)</Text>
                            <Text style={[styles.ledgerGridVal, { color: item.credit ? '#10b981' : colors.textSecondary }]} allowFontScaling={false}>
                              {item.credit ? `-$${Number(item.credit).toLocaleString()}` : '-'}
                            </Text>
                          </View>
                          <View style={styles.ledgerGridItem}>
                            <Text style={styles.ledgerGridLabel} allowFontScaling={false}>RUNNING BAL</Text>
                            <Text style={[styles.ledgerGridVal, { color: '#38bdf8' }]} allowFontScaling={false}>
                              ${Number(item.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                          </View>
                        </View>

                        {/* Statement link footer */}
                        <View style={styles.statementLinkRow}>
                          <Text style={styles.statementLinkText} allowFontScaling={false}>Tap to view official statement</Text>
                          <Ionicons name="arrow-forward-outline" size={14} color="#38bdf8" />
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}

                {/* Pagination Controls */}
                {totalLedgerPages > 1 && (
                  <View style={styles.paginationRow}>
                    <TouchableOpacity
                      style={[styles.pageBtn, pageLedger <= 1 && styles.pageBtnDisabled]}
                      disabled={pageLedger <= 1}
                      onPress={() => setPageLedger((p) => Math.max(1, p - 1))}
                    >
                      <Ionicons name="chevron-back" size={16} color={pageLedger <= 1 ? '#64748b' : '#38bdf8'} />
                      <Text style={[styles.pageBtnText, pageLedger <= 1 && styles.pageBtnTextDisabled]} allowFontScaling={false}>
                        Prev
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.pageIndicatorText} allowFontScaling={false}>
                      Page {pageLedger} of {totalLedgerPages}
                    </Text>

                    <TouchableOpacity
                      style={[styles.pageBtn, pageLedger >= totalLedgerPages && styles.pageBtnDisabled]}
                      disabled={pageLedger >= totalLedgerPages}
                      onPress={() => setPageLedger((p) => Math.min(totalLedgerPages, p + 1))}
                    >
                      <Text style={[styles.pageBtnText, pageLedger >= totalLedgerPages && styles.pageBtnTextDisabled]} allowFontScaling={false}>
                        Next
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={pageLedger >= totalLedgerPages ? '#64748b' : '#38bdf8'} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

          </Animated.View>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL 1: VIEW RECEIPT MODAL */}
      {/* ============================================================== */}
      <Modal visible={!!selectedReceipt} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>
                Payment Receipt Details
              </Text>
              <TouchableOpacity onPress={() => setSelectedReceipt(null)}>
                <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedReceipt && (
              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxLabel} allowFontScaling={false}>RECEIPT NUMBER</Text>
                  <Text style={styles.detailBoxValue} allowFontScaling={false}>{selectedReceipt.receiptNumber}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxLabel} allowFontScaling={false}>RESIDENT / TENANT</Text>
                  <Text style={styles.detailBoxValue} allowFontScaling={false}>{selectedReceipt.tenantName}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxLabel} allowFontScaling={false}>PROPERTY & UNIT</Text>
                  <Text style={styles.detailBoxValue} allowFontScaling={false}>
                    {selectedReceipt.propertyName} · Unit {selectedReceipt.unitNumber}
                  </Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxLabel} allowFontScaling={false}>AMOUNT PAID</Text>
                  <Text style={[styles.detailBoxValue, { color: '#10b981', fontSize: 18, fontWeight: '900' }]} allowFontScaling={false}>
                    ${Number(selectedReceipt.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={styles.rowBetween}>
                  <View style={[styles.detailBox, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.detailBoxLabel} allowFontScaling={false}>PAYMENT METHOD</Text>
                    <Text style={styles.detailBoxValue} allowFontScaling={false}>{selectedReceipt.paymentMethod}</Text>
                  </View>
                  <View style={[styles.detailBox, { flex: 1 }]}>
                    <Text style={styles.detailBoxLabel} allowFontScaling={false}>DATE PAID</Text>
                    <Text style={styles.detailBoxValue} allowFontScaling={false}>{selectedReceipt.paidDate || 'N/A'}</Text>
                  </View>
                </View>

                {selectedReceipt.referenceNumber ? (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailBoxLabel} allowFontScaling={false}>REFERENCE NUMBER</Text>
                    <Text style={styles.detailBoxValue} allowFontScaling={false}>{selectedReceipt.referenceNumber}</Text>
                  </View>
                ) : null}

                {selectedReceipt.notes ? (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailBoxLabel} allowFontScaling={false}>TRANSACTION NOTES</Text>
                    <Text style={styles.detailBoxValue} allowFontScaling={false}>{selectedReceipt.notes}</Text>
                  </View>
                ) : null}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedReceipt(null)}>
                    <Text style={styles.cancelBtnText} allowFontScaling={false}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: '#ef4444' }]}
                    onPress={() => {
                      const p = selectedReceipt;
                      setSelectedReceipt(null);
                      handleDeletePayment(p);
                    }}
                  >
                    <Ionicons name="trash-outline" size={15} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={[styles.submitBtnText, { color: '#ffffff' }]} allowFontScaling={false}>Delete Payment</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: VIEW INVOICE MODAL */}
      {/* ============================================================== */}
      <Modal visible={!!selectedInvoice} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>
                Invoice Details
              </Text>
              <TouchableOpacity onPress={() => setSelectedInvoice(null)}>
                <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedInvoice && (
              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxLabel} allowFontScaling={false}>INVOICE NUMBER</Text>
                  <Text style={styles.detailBoxValue} allowFontScaling={false}>{selectedInvoice.invoiceNumber}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxLabel} allowFontScaling={false}>RESIDENT</Text>
                  <Text style={styles.detailBoxValue} allowFontScaling={false}>{selectedInvoice.tenantName}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxLabel} allowFontScaling={false}>PROPERTY & UNIT</Text>
                  <Text style={styles.detailBoxValue} allowFontScaling={false}>
                    {selectedInvoice.propertyName} · Unit {selectedInvoice.unitNumber}
                  </Text>
                </View>

                <View style={styles.rowBetween}>
                  <View style={[styles.detailBox, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.detailBoxLabel} allowFontScaling={false}>DUE DATE</Text>
                    <Text style={styles.detailBoxValue} allowFontScaling={false}>{selectedInvoice.dueDate}</Text>
                  </View>
                  <View style={[styles.detailBox, { flex: 1 }]}>
                    <Text style={styles.detailBoxLabel} allowFontScaling={false}>STATUS</Text>
                    <Text style={[styles.detailBoxValue, { color: selectedInvoice.status === 'Paid' ? '#10b981' : '#ef4444' }]} allowFontScaling={false}>
                      {selectedInvoice.status}
                    </Text>
                  </View>
                </View>

                {/* Line Items Table */}
                <Text style={styles.formSectionTitle} allowFontScaling={false}>ITEMIZED CHARGES</Text>
                <View style={styles.stmtTableContainer}>
                  <View style={styles.stmtTableHeaderRow}>
                    <Text style={[styles.stmtTableHeaderCol, { flex: 2 }]} allowFontScaling={false}>DESCRIPTION</Text>
                    <Text style={[styles.stmtTableHeaderCol, { flex: 1, textAlign: 'right' }]} allowFontScaling={false}>AMOUNT</Text>
                  </View>
                  {selectedInvoice.lineItems.map((item, idx) => (
                    <View key={item.id || idx} style={styles.stmtTableRow}>
                      <Text style={[styles.stmtTableColText, { flex: 2, color: colors.textPrimary }]} allowFontScaling={false}>
                        {item.description || 'Charge'}
                      </Text>
                      <Text style={[styles.stmtTableColText, { flex: 1, textAlign: 'right', fontWeight: '700' }]} allowFontScaling={false}>
                        ${Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.rowBetween}>
                  <Text style={styles.detailBoxLabel} allowFontScaling={false}>TOTAL AMOUNT</Text>
                  <Text style={[styles.detailBoxValue, { fontSize: 16, fontWeight: '900' }]} allowFontScaling={false}>
                    ${Number(selectedInvoice.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={styles.rowBetween}>
                  <Text style={styles.detailBoxLabel} allowFontScaling={false}>OUTSTANDING BALANCE</Text>
                  <Text
                    style={[
                      styles.detailBoxValue,
                      { color: selectedInvoice.balance > 0 ? '#ef4444' : '#10b981', fontSize: 16, fontWeight: '900' },
                    ]}
                    allowFontScaling={false}
                  >
                    ${Number(selectedInvoice.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedInvoice(null)}>
                    <Text style={styles.cancelBtnText} allowFontScaling={false}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: '#ef4444' }]}
                    onPress={() => {
                      const inv = selectedInvoice;
                      setSelectedInvoice(null);
                      handleDeleteInvoice(inv);
                    }}
                  >
                    <Ionicons name="trash-outline" size={15} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={[styles.submitBtnText, { color: '#ffffff' }]} allowFontScaling={false}>Delete Invoice</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: RECORD PAYMENT RECEIPT MODAL */}
      {/* ============================================================== */}
      <Modal visible={recordPaymentOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Record Payment Receipt</Text>
                <TouchableOpacity onPress={() => setRecordPaymentOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.formSectionTitle} allowFontScaling={false}>RESIDENT ACCOUNT</Text>

                <Text style={styles.formLabel} allowFontScaling={false}>TENANT</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => setActivePicker(activePicker === 'tenant_pay' ? null : 'tenant_pay')}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {payTenantId
                      ? tenants.find((t) => t.id === payTenantId)?.name ||
                        `${tenants.find((t) => t.id === payTenantId)?.firstName || ''} ${tenants.find((t) => t.id === payTenantId)?.lastName || ''}`.trim()
                      : 'Select Resident...'}
                  </Text>
                  <Ionicons name={activePicker === 'tenant_pay' ? 'chevron-up' : 'chevron-down'} size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {activePicker === 'tenant_pay' && (
                  <View style={styles.inlineDropdownCard}>
                    {tenants.map((opt) => {
                      const label = `${opt.firstName || ''} ${opt.lastName || ''}`.trim();
                      const isActive = payTenantId === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[styles.inlineDropdownRow, isActive && styles.inlineDropdownRowActive]}
                          onPress={() => {
                            setPayTenantId(opt.id);
                            setActivePicker(null);
                          }}
                        >
                          <Text style={[styles.inlineDropdownText, isActive && styles.inlineDropdownTextActive]} allowFontScaling={false}>
                            {label}
                          </Text>
                          {isActive && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <Text style={styles.formLabel} allowFontScaling={false}>UNIT LOCATION</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, color: colors.textSecondary }]}
                  editable={false}
                  value={getTenantUnitLocationLabel(payTenantId)}
                />

                <Text style={styles.formSectionTitle} allowFontScaling={false}>PAYMENT PARAMETERS</Text>

                <Text style={styles.formLabel} allowFontScaling={false}>PAYMENT AMOUNT ($)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="$ 1500"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                  value={payAmount}
                  onChangeText={(val) => {
                    setPayAmount(val);
                    if (!allocRent || allocRent === '0') {
                      setAllocRent(val);
                    }
                  }}
                />
                {payErrors.amount && <Text style={styles.errorLabel} allowFontScaling={false}>{payErrors.amount}</Text>}

                <Text style={styles.formLabel} allowFontScaling={false}>PAYMENT CHANNEL</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => setActivePicker(activePicker === 'channel_pay' ? null : 'channel_pay')}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>{payChannel}</Text>
                  <Ionicons name={activePicker === 'channel_pay' ? 'chevron-up' : 'chevron-down'} size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {activePicker === 'channel_pay' && (
                  <View style={styles.inlineDropdownCard}>
                    {['Zelle', 'Cash', 'Check', 'ACH Direct', 'Credit Card'].map((c) => {
                      const isActive = payChannel === c;
                      return (
                        <TouchableOpacity
                          key={c}
                          style={[styles.inlineDropdownRow, isActive && styles.inlineDropdownRowActive]}
                          onPress={() => {
                            setPayChannel(c);
                            setActivePicker(null);
                          }}
                        >
                          <Text style={[styles.inlineDropdownText, isActive && styles.inlineDropdownTextActive]} allowFontScaling={false}>
                            {c}
                          </Text>
                          {isActive && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <Text style={styles.formLabel} allowFontScaling={false}>PAYMENT DATE</Text>
                <TouchableOpacity style={styles.formPickerSelector} onPress={() => setShowPayDatePicker(true)}>
                  <Text style={styles.formPickerText} allowFontScaling={false}>{payDate || 'Select Date...'}</Text>
                  <Ionicons name="calendar-outline" size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {payErrors.date && <Text style={styles.errorLabel} allowFontScaling={false}>{payErrors.date}</Text>}
                <CustomDatePicker
                  visible={showPayDatePicker}
                  value={payDate}
                  onSelect={(date) => setPayDate(date)}
                  onClose={() => setShowPayDatePicker(false)}
                />

                <Text style={styles.formLabel} allowFontScaling={false}>DUE DATE REFERENCE</Text>
                <TouchableOpacity style={styles.formPickerSelector} onPress={() => setShowPayDueDateRefPicker(true)}>
                  <Text style={styles.formPickerText} allowFontScaling={false}>{payDueDateRef || 'Select Date...'}</Text>
                  <Ionicons name="calendar-outline" size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {payErrors.dueDate && <Text style={styles.errorLabel} allowFontScaling={false}>{payErrors.dueDate}</Text>}
                <CustomDatePicker
                  visible={showPayDueDateRefPicker}
                  value={payDueDateRef}
                  onSelect={(date) => setPayDueDateRef(date)}
                  onClose={() => setShowPayDueDateRefPicker(false)}
                />

                <Text style={styles.formLabel} allowFontScaling={false}>REFERENCE NUMBER</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Check # / Wire ID / Confirmation #"
                  placeholderTextColor="#64748b"
                  value={payRefNo}
                  onChangeText={setPayRefNo}
                />

                <Text style={styles.formSectionTitle} allowFontScaling={false}>BILLING ALLOCATIONS</Text>

                <View style={styles.rowFormGroup}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.formLabel} allowFontScaling={false}>RENT ($)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="$ 1400"
                      placeholderTextColor="#64748b"
                      keyboardType="decimal-pad"
                      value={allocRent}
                      onChangeText={(val) => {
                        setAllocRent(val);
                        const sum = (parseFloat(val) || 0) + (parseFloat(allocUtilities) || 0) + (parseFloat(allocParking) || 0) + (parseFloat(allocPet) || 0);
                        if (sum > 0) setPayAmount(String(sum));
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel} allowFontScaling={false}>UTILITIES ($)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="$ 100"
                      placeholderTextColor="#64748b"
                      keyboardType="decimal-pad"
                      value={allocUtilities}
                      onChangeText={(val) => {
                        setAllocUtilities(val);
                        const sum = (parseFloat(allocRent) || 0) + (parseFloat(val) || 0) + (parseFloat(allocParking) || 0) + (parseFloat(allocPet) || 0);
                        if (sum > 0) setPayAmount(String(sum));
                      }}
                    />
                  </View>
                </View>

                <View style={styles.rowFormGroup}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.formLabel} allowFontScaling={false}>PARKING ($)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="$ 0"
                      placeholderTextColor="#64748b"
                      keyboardType="decimal-pad"
                      value={allocParking}
                      onChangeText={(val) => {
                        setAllocParking(val);
                        const sum = (parseFloat(allocRent) || 0) + (parseFloat(allocUtilities) || 0) + (parseFloat(val) || 0) + (parseFloat(allocPet) || 0);
                        if (sum > 0) setPayAmount(String(sum));
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel} allowFontScaling={false}>PET FEE ($)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="$ 0"
                      placeholderTextColor="#64748b"
                      keyboardType="decimal-pad"
                      value={allocPet}
                      onChangeText={(val) => {
                        setAllocPet(val);
                        const sum = (parseFloat(allocRent) || 0) + (parseFloat(allocUtilities) || 0) + (parseFloat(allocParking) || 0) + (parseFloat(val) || 0);
                        if (sum > 0) setPayAmount(String(sum));
                      }}
                    />
                  </View>
                </View>

                <Text style={styles.formLabel} allowFontScaling={false}>TRANSACTION NOTES</Text>
                <TextInput
                  style={[styles.formInput, { height: 75, textAlignVertical: 'top', paddingTop: 8 }]}
                  placeholder="Add receipt notes..."
                  placeholderTextColor="#64748b"
                  multiline
                  value={payNotes}
                  onChangeText={setPayNotes}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setRecordPaymentOpen(false)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
                  onPress={handleRecordPayment}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>Record Receipt</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4: CREATE INVOICE MODAL */}
      {/* ============================================================== */}
      <Modal visible={createInvoiceOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Create Invoice</Text>
                <TouchableOpacity onPress={() => setCreateInvoiceOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.formLabel} allowFontScaling={false}>TENANT</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => setActivePicker(activePicker === 'tenant_inv' ? null : 'tenant_inv')}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {invTenantId
                      ? (() => {
                          const t = tenants.find((item) => item.id === invTenantId);
                          const u = units.find((item) => item.id === t?.unitId) || t?.unit;
                          const uStr = u?.unitNumber ? ` (Unit ${u.unitNumber})` : (t?.unitNumber ? ` (Unit ${t.unitNumber})` : '');
                          return (t?.name || `${t?.firstName || ''} ${t?.lastName || ''}`.trim()) + uStr;
                        })()
                      : 'Select Resident...'}
                  </Text>
                  <Ionicons name={activePicker === 'tenant_inv' ? 'chevron-up' : 'chevron-down'} size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {activePicker === 'tenant_inv' && (
                  <View style={styles.inlineDropdownCard}>
                    {tenants.filter((t) => t.unitId || t.unit).length === 0 ? (
                      <View style={{ padding: 12 }}>
                        <Text style={[styles.inlineDropdownText, { color: '#94a3b8' }]} allowFontScaling={false}>
                          No residents with assigned units found
                        </Text>
                      </View>
                    ) : (
                      tenants
                        .filter((t) => t.unitId || t.unit)
                        .map((opt) => {
                          const unitObj = units.find((u) => u.id === opt.unitId) || opt.unit;
                          const unitStr = unitObj?.unitNumber ? ` (Unit ${unitObj.unitNumber})` : (opt.unitNumber ? ` (Unit ${opt.unitNumber})` : '');
                          const label = `${opt.firstName || ''} ${opt.lastName || ''}`.trim() + unitStr;
                          const isActive = invTenantId === opt.id;
                          return (
                            <TouchableOpacity
                              key={opt.id}
                              style={[styles.inlineDropdownRow, isActive && styles.inlineDropdownRowActive]}
                              onPress={() => {
                                setInvTenantId(opt.id);
                                setActivePicker(null);
                              }}
                            >
                              <Text style={[styles.inlineDropdownText, isActive && styles.inlineDropdownTextActive]} allowFontScaling={false}>
                                {label}
                              </Text>
                              {isActive && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                            </TouchableOpacity>
                          );
                        })
                    )}
                  </View>
                )}

                <Text style={styles.formLabel} allowFontScaling={false}>DUE DATE</Text>
                <TouchableOpacity style={styles.formPickerSelector} onPress={() => setShowInvDatePicker(true)}>
                  <Text style={styles.formPickerText} allowFontScaling={false}>{invDueDate || 'Select Date...'}</Text>
                  <Ionicons name="calendar-outline" size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {invErrors.dueDate && <Text style={styles.errorLabel} allowFontScaling={false}>{invErrors.dueDate}</Text>}
                <CustomDatePicker
                  visible={showInvDatePicker}
                  value={invDueDate}
                  onSelect={(date) => setInvDueDate(date)}
                  onClose={() => setShowInvDatePicker(false)}
                />

                <View style={[styles.rowBetween, { marginTop: 16, marginBottom: 8 }]}>
                  <Text style={styles.formSectionTitle} allowFontScaling={false}>ITEMIZED LINE ITEMS</Text>
                  <TouchableOpacity style={styles.addItemLineBtn} onPress={handleAddLineItem}>
                    <Ionicons name="add" size={14} color="#0f172a" />
                    <Text style={styles.addItemLineBtnText} allowFontScaling={false}>Add Line Item</Text>
                  </TouchableOpacity>
                </View>

                {invLineItems.map((item) => (
                  <View key={item.id} style={styles.lineItemRow}>
                    <View style={{ flex: 2, marginRight: 8 }}>
                      <Text style={styles.formLabel} allowFontScaling={false}>ITEM DESCRIPTION</Text>
                      <TextInput
                        style={styles.formInput}
                        value={item.description}
                        onChangeText={(val) => handleUpdateLineItem(item.id, 'description', val)}
                      />
                    </View>
                    <View style={{ flex: 1.2, marginRight: 8 }}>
                      <Text style={styles.formLabel} allowFontScaling={false}>CHARGE AMOUNT ($)</Text>
                      <TextInput
                        style={styles.formInput}
                        keyboardType="decimal-pad"
                        value={item.amount}
                        onChangeText={(val) => handleUpdateLineItem(item.id, 'amount', val)}
                      />
                    </View>
                    <TouchableOpacity style={styles.lineTrashBtn} onPress={() => handleDeleteLineItem(item.id)}>
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.subtotalBox}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.subtotalLabel} allowFontScaling={false}>Subtotal</Text>
                    <Text style={styles.subtotalVal} allowFontScaling={false}>${getSubtotal()}</Text>
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.totalLabel} allowFontScaling={false}>Total Amount</Text>
                    <Text style={styles.totalVal} allowFontScaling={false}>${getSubtotal()}</Text>
                  </View>
                </View>

                <Text style={styles.formLabel} allowFontScaling={false}>INVOICE NOTES</Text>
                <TextInput
                  style={[styles.formInput, { height: 75, textAlignVertical: 'top', paddingTop: 8 }]}
                  placeholder="Add notes shown on PDF..."
                  placeholderTextColor="#64748b"
                  multiline
                  value={invNotes}
                  onChangeText={setInvNotes}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateInvoiceOpen(false)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
                  onPress={handleCreateInvoice}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>Save & Send Invoice</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 5: OFFICIAL TENANT LEDGER STATEMENT MODAL */}
      {/* ============================================================== */}
      <Modal visible={statementModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="receipt-outline" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle} allowFontScaling={false}>Tenant Ledger Statement</Text>
              </View>
              <TouchableOpacity onPress={() => setStatementModalOpen(false)}>
                <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedStatementTenant ? (() => {
              const { txs, tenant, totalOutstanding } = getStatementData();
              return (
                <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                  {/* STATEMENT RECIPIENT & COMPANY HEADER */}
                  <View style={styles.stmtHeaderCard}>
                    <View style={styles.stmtHeaderTopRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.stmtBadgeText} allowFontScaling={false}>OFFICIAL TENANT LEDGER</Text>
                        <Text style={styles.stmtCompanyName} allowFontScaling={false}>Property Management</Text>
                        <Text style={styles.stmtCompanyAddress} allowFontScaling={false}>Corporate Office · Statement of Account</Text>
                      </View>
                      <View style={styles.stmtAuditedBadge}>
                        <Ionicons name="shield-checkmark" size={12} color="#10b981" style={{ marginRight: 4 }} />
                        <Text style={styles.stmtAuditedText} allowFontScaling={false}>VERIFIED</Text>
                      </View>
                    </View>

                    <View style={styles.stmtDivider} />

                    <View style={styles.stmtRecipientSection}>
                      <Text style={styles.stmtRecipientLabel} allowFontScaling={false}>STATEMENT RECIPIENT</Text>
                      <Text style={styles.stmtRecipientName} allowFontScaling={false}>{selectedStatementTenant.tenantName}</Text>

                      <View style={styles.stmtMetaContainer}>
                        <View style={styles.stmtMetaRow}>
                          <Ionicons name="location-outline" size={13} color="#38bdf8" style={{ marginRight: 6 }} />
                          <Text style={styles.stmtMetaText} allowFontScaling={false}>
                            {tenant.unit
                              ? `${tenant.unit.property?.name || 'Unassigned'} · Unit ${tenant.unit.unitNumber || 'Unassigned'}`
                              : selectedStatementTenant.propertyName}
                          </Text>
                        </View>

                        {(tenant.email || tenant.phone) ? (
                          <View style={styles.stmtMetaContactRow}>
                            {tenant.phone ? (
                              <View style={[styles.stmtMetaRow, { flex: 1, marginRight: 8 }]}>
                                <Ionicons name="call-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                                <Text style={styles.stmtMetaText} allowFontScaling={false}>{tenant.phone}</Text>
                              </View>
                            ) : null}
                            {tenant.email ? (
                              <View style={[styles.stmtMetaRow, { flex: 1.2 }]}>
                                <Ionicons name="mail-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                                <Text style={styles.stmtMetaText} numberOfLines={1} ellipsizeMode="middle" allowFontScaling={false}>{tenant.email}</Text>
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {/* SCROLLABLE TABLE HINT */}
                  <View style={styles.stmtScrollHintRow}>
                    <Text style={styles.stmtScrollHintText} allowFontScaling={false}>
                      TRANSACTION HISTORY ({txs.length})
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.stmtSwipeHintText} allowFontScaling={false}>Swipe to view all</Text>
                      <Ionicons name="arrow-forward" size={11} color="#64748b" style={{ marginLeft: 3 }} />
                    </View>
                  </View>

                  {/* HORIZONTALLY SCROLLABLE TABLE */}
                  <View style={styles.stmtTableContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={true} nestedScrollEnabled={true}>
                      <View style={styles.stmtTableInner}>
                        <View style={styles.stmtTableHeaderRow}>
                          <Text style={[styles.stmtTableHeaderCol, styles.stmtColDate]} allowFontScaling={false}>DATE</Text>
                          <Text style={[styles.stmtTableHeaderCol, styles.stmtColDesc]} allowFontScaling={false}>DESCRIPTION</Text>
                          <Text style={[styles.stmtTableHeaderCol, styles.stmtColDebit]} allowFontScaling={false}>DEBIT (+)</Text>
                          <Text style={[styles.stmtTableHeaderCol, styles.stmtColCredit]} allowFontScaling={false}>CREDIT (-)</Text>
                          <Text style={[styles.stmtTableHeaderCol, styles.stmtColBal]} allowFontScaling={false}>RUNNING BAL</Text>
                        </View>

                        {txs.map((tx, idx) => (
                          <View key={tx.id || idx} style={[styles.stmtTableRow, idx % 2 === 1 && styles.stmtTableRowAlt]}>
                            <Text style={[styles.stmtTableColText, styles.stmtColDate]} allowFontScaling={false}>{tx.date}</Text>
                            <Text style={[styles.stmtTableColText, styles.stmtColDesc, { color: colors.textPrimary }]} allowFontScaling={false} numberOfLines={2}>
                              {tx.description}
                            </Text>
                            <Text style={[styles.stmtTableColText, styles.stmtColDebit, { color: tx.debit ? '#ef4444' : '#64748b' }]} allowFontScaling={false}>
                              {tx.debit ? formatCurrency(tx.debit) : '—'}
                            </Text>
                            <Text style={[styles.stmtTableColText, styles.stmtColCredit, { color: tx.credit ? '#10b981' : '#64748b' }]} allowFontScaling={false}>
                              {tx.credit ? formatCurrency(tx.credit) : '—'}
                            </Text>
                            <Text
                              style={[
                                styles.stmtTableColText,
                                styles.stmtColBal,
                                {
                                  color: tx.runningBalance > 0 ? '#ef4444' : tx.runningBalance < 0 ? '#38bdf8' : '#10b981',
                                  fontWeight: '800',
                                },
                              ]}
                              allowFontScaling={false}
                            >
                              {formatCurrency(tx.runningBalance)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {/* SUMMARY FOOTER */}
                  <View style={styles.stmtFooterRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stmtGeneratedText} allowFontScaling={false}>System Audited Tenant Ledger</Text>
                      <Text style={[styles.stmtGeneratedText, { fontSize: 8.5, marginTop: 2 }]} allowFontScaling={false}>
                        Total Records: {txs.length}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.stmtOutstandingLabel} allowFontScaling={false}>OUTSTANDING BALANCE</Text>
                      <Text
                        style={[
                          styles.stmtOutstandingValue,
                          { color: totalOutstanding > 0 ? '#ef4444' : '#10b981' }
                        ]}
                        allowFontScaling={false}
                      >
                        {formatCurrency(totalOutstanding)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.modalActions, { borderTopWidth: 0, marginTop: 12 }]}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setStatementModalOpen(false)}>
                      <Text style={styles.cancelBtnText} allowFontScaling={false}>Close Statement</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.submitBtn}
                      onPress={() => handleDownloadLedgerPdf(selectedStatementTenant, txs, totalOutstanding)}
                    >
                      <Ionicons name="download-outline" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                      <Text style={styles.submitBtnText} allowFontScaling={false}>Download PDF</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              );
            })() : null}
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 6: DRILL-DOWN METRIC DETAILS MODAL */}
      {/* ============================================================== */}
      <Modal
        visible={selectedRentMetric !== null}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setSelectedRentMetric(null);
          setRentMetricSearch('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', paddingTop: 20 }]}>
            <View style={[styles.modalHeader, { paddingTop: 4, alignItems: 'flex-start' }]}>
              <View style={{ flex: 1, flexShrink: 1, marginRight: 8 }}>
                <Text style={[styles.modalTitle, { lineHeight: 22, flexShrink: 1 }]} numberOfLines={2} allowFontScaling={false}>
                  {getRentModalMeta().name}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#38bdf8', fontWeight: '800', marginTop: 3 }} allowFontScaling={false}>
                  {getRentModalMeta().count}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedRentMetric(null);
                  setRentMetricSearch('');
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { flex: 0, height: 42, minHeight: 42, maxHeight: 42, marginHorizontal: 16, marginBottom: 8 }]}>
              <Ionicons name="search-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.searchInput, { height: 42, padding: 0 }]}
                placeholder="Search items..."
                placeholderTextColor="#64748b"
                value={rentMetricSearch}
                onChangeText={setRentMetricSearch}
              />
              {rentMetricSearch.length > 0 && (
                <TouchableOpacity onPress={() => setRentMetricSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Export Actions (PDF & Excel) */}
            <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#ef444415' : '#fef2f2',
                  borderColor: isDarkMode ? '#ef444440' : '#fecaca',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingVertical: 7,
                  paddingHorizontal: 10,
                  gap: 5,
                }}
                onPress={() => handleExportRentMetric('PDF')}
                disabled={exportingType !== null}
                activeOpacity={0.7}
              >
                {exportingType === 'PDF' ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={14} color="#ef4444" />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#ef4444' }} allowFontScaling={false}>
                      Export PDF
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#10b98115' : '#f0fdf4',
                  borderColor: isDarkMode ? '#10b98140' : '#bbf7d0',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingVertical: 7,
                  paddingHorizontal: 10,
                  gap: 5,
                }}
                onPress={() => handleExportRentMetric('EXCEL')}
                disabled={exportingType !== null}
                activeOpacity={0.7}
              >
                {exportingType === 'EXCEL' ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <>
                    <Ionicons name="grid-outline" size={14} color="#10b981" />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#10b981' }} allowFontScaling={false}>
                      Export Excel
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 16, maxHeight: 360 }} showsVerticalScrollIndicator={true}>
              {getRentModalItems().length === 0 ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Ionicons name="folder-open-outline" size={36} color="#64748b" style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }} allowFontScaling={false}>
                    No Records Found
                  </Text>
                  <Text style={{ fontSize: 11.5, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }} allowFontScaling={false}>
                    {rentMetricSearch
                      ? 'No items match your search filter.'
                      : selectedRentMetric === 'collectedToday'
                      ? 'No rent payments collected today.'
                      : 'There are currently no records for this metric.'}
                  </Text>
                </View>
              ) : (
                getRentModalItems().map((item, idx) => (
                  <TouchableOpacity
                    key={`rent-metric-item-${item.id || idx}`}
                    style={[
                      styles.inlineDropdownRow,
                      {
                        paddingVertical: 12,
                        paddingHorizontal: 8,
                        borderBottomColor: colors.cardBorder,
                      },
                    ]}
                    onPress={() => {
                      const type = item.type;
                      const raw = item.raw;
                      setSelectedRentMetric(null);
                      setRentMetricSearch('');
                      if (type === 'payment') {
                        setSelectedReceipt(raw);
                      } else if (type === 'invoice') {
                        setSelectedInvoice(raw);
                      } else if (type === 'ledger') {
                        setSelectedStatementTenant(raw);
                        setStatementModalOpen(true);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1} allowFontScaling={false}>
                        {item.title}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1} allowFontScaling={false}>
                        {item.subtitle}
                      </Text>
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: `${item.badgeColor}18` }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: item.badgeColor }} allowFontScaling={false}>
                        {item.badge}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={[styles.modalActions, { paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.cardBorder, marginTop: 8 }]}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setSelectedRentMetric(null);
                  setRentMetricSearch('');
                }}
              >
                <Text style={styles.cancelBtnText} allowFontScaling={false}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => {
                  const meta = getRentModalMeta();
                  setSelectedRentMetric(null);
                  setRentMetricSearch('');
                  if (meta.destFilter !== undefined) {
                    setSelectedStatus(meta.destFilter);
                  }
                  setActiveTab(meta.destTab);
                }}
              >
                <Text style={styles.submitBtnText} allowFontScaling={false}>
                  {getRentModalMeta().destLabel} →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    errorLabel: { color: '#ef4444', fontSize: 10.5, marginTop: 4, fontWeight: '700' },
    mainWrapper: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 60, width: '100%', maxWidth: 1024, alignSelf: 'center' },

    fixedHeader: {
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      zIndex: 10,
      width: '100%',
      maxWidth: 1024,
      alignSelf: 'center',
    },
    title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    subtitle: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2, lineHeight: 15 },
    refreshIconBtn: {
      width: 34,
      height: 34,
      borderRadius: 9,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },

    // Tab switcher
    tabItem: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: colors.surface,
      marginRight: 6,
    },
    tabItemActive: { backgroundColor: '#38bdf8' },
    tabItemText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
    tabItemTextActive: { color: '#0f172a', fontWeight: '800' },

    // Filter divider
    filterDivider: {
      width: 1,
      height: 20,
      backgroundColor: colors.cardBorder,
      marginHorizontal: 8,
    },

    // Search bar
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
    searchInput: { flex: 1, color: colors.textPrimary, fontSize: 12.5, height: '100%', padding: 0 },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#38bdf8',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 38,
    },
    addBtnText: { color: '#0f172a', fontSize: 12, fontWeight: '800', marginLeft: 2 },

    // Filter pills
    filterPillsScroll: { marginTop: 8 },
    pillContainer: { flexDirection: 'row', marginRight: 10 },
    pillItem: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginRight: 6,
    },
    pillItemActive: {
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      borderColor: '#38bdf8',
    },
    pillText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
    pillTextActive: { color: '#38bdf8', fontWeight: '800' },

    // Metrics grid
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    metricCard: {
      width: '48.5%',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    metricCardLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
    metricCardValue: { fontSize: 20, fontWeight: '900', marginTop: 4 },
    metricCardSub: { fontSize: 10, color: colors.textSecondary, marginTop: 4 },
    rowTrend: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },

    // Section cards
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    sectionCardTitle: { fontSize: 11, fontWeight: '900', color: '#38bdf8', letterSpacing: 0.6 },
    sectionCardSub: { fontSize: 10.5, color: colors.textSecondary, marginTop: 2 },
    viewAllText: { fontSize: 11, fontWeight: '800', color: '#38bdf8' },

    // Chart visualizer
    chartBarRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: 110,
      marginTop: 14,
      paddingBottom: 4,
    },
    chartCol: { flex: 1, alignItems: 'center', marginHorizontal: 2 },
    chartBarTrack: {
      width: 14,
      height: 70,
      backgroundColor: 'rgba(56, 189, 248, 0.08)',
      borderRadius: 6,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    chartBarFill: {
      width: '100%',
      backgroundColor: '#38bdf8',
      borderRadius: 6,
    },
    chartDayText: { fontSize: 9.5, fontWeight: '700', color: colors.textSecondary, marginTop: 6 },
    chartAmountText: { fontSize: 8.5, fontWeight: '800', color: colors.textMuted, marginTop: 1 },

    // Channel progress bar
    colorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    channelLabel: { fontSize: 11.5, fontWeight: '700', color: colors.textPrimary },
    channelValue: { fontSize: 11, color: colors.textSecondary, fontWeight: '700' },
    channelBarTrack: {
      height: 6,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 3,
      marginTop: 4,
      overflow: 'hidden',
    },
    channelBarFill: { height: '100%', borderRadius: 3 },

    // Recent items rows
    recentPayRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    recentPayTenant: { fontSize: 12.5, fontWeight: '800', color: colors.textPrimary },
    recentPaySub: { fontSize: 10.5, color: colors.textSecondary, marginTop: 1 },
    recentPayAmount: { fontSize: 13, fontWeight: '900', color: '#10b981' },
    recentPayDate: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
    emptyInlineText: { fontSize: 11, color: colors.textSecondary, paddingVertical: 10, textAlign: 'center' },

    // Records card layouts
    listHeaderRow: { marginBottom: 8 },
    listCountText: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },
    recordsCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    numTag: {
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.25)',
    },
    coaNum: { fontSize: 11, fontWeight: '800', color: '#38bdf8', letterSpacing: 0.5 },
    recordLabel: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
    recordValue: { fontSize: 15, fontWeight: '900' },
    recordSubText: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },
    recordSubTextVal: { fontSize: 12, color: colors.textPrimary, fontWeight: '700' },
    detailLabelText: { fontSize: 11.5, color: colors.textSecondary },
    divider: { height: 1, backgroundColor: colors.divider, marginVertical: 8 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badgesRow: { flexDirection: 'row', alignItems: 'center' },
    badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2.5 },
    badgeText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },

    // Health badge
    healthBadge: {
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 1,
      marginLeft: 6,
    },
    healthBadgeText: { fontSize: 9, fontWeight: '900' },

    // Card action buttons
    cardActionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    cardActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.3)',
      backgroundColor: 'rgba(56, 189, 248, 0.06)',
      marginLeft: 8,
    },
    cardActionBtnText: { fontSize: 11.5, fontWeight: '800' },

    // Ledger specific
    ledgerDesc: { fontSize: 11.5, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
    ledgerBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
      borderRadius: 10,
      padding: 10,
      marginTop: 4,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    ledgerGridItem: { flex: 1, alignItems: 'flex-start' },
    ledgerGridLabel: { fontSize: 8.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
    ledgerGridVal: { fontSize: 12.5, fontWeight: '800', marginTop: 2 },
    statementLinkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    statementLinkText: { fontSize: 11.5, fontWeight: '700', color: '#38bdf8' },

    // Pagination
    paginationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      marginTop: 4,
      marginBottom: 20,
    },
    pageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    pageBtnDisabled: { opacity: 0.4 },
    pageBtnText: { fontSize: 12, fontWeight: '800', color: '#38bdf8' },
    pageBtnTextDisabled: { color: '#64748b' },
    pageIndicatorText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },

    // Empty and loading
    centerLoading: { paddingVertical: 80, alignItems: 'center' },
    loadingText: { color: colors.textSecondary, fontSize: 13, marginTop: 8 },
    emptyView: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    emptyText: { color: colors.textSecondary, fontSize: 13 },

    // Detail Boxes in View Modals
    detailBox: {
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      padding: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    detailBoxLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
    detailBoxValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },

    // Modal Common Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      paddingTop: Platform.OS === 'android' ? 36 : 24,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      width: '100%',
      maxWidth: 580,
      alignSelf: 'center',
      maxHeight: '90%',
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      paddingTop: 4,
      paddingBottom: 12,
      marginBottom: 12,
    },
    modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, flexShrink: 1, lineHeight: 22, marginRight: 8 },
    modalForm: { marginBottom: 12 },
    formSectionTitle: { fontSize: 10, fontWeight: '800', color: '#38bdf8', letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
    formLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, marginTop: 8, marginBottom: 4 },
    formInput: {
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      padding: 10,
      color: colors.textPrimary,
      fontSize: 13,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      fontWeight: '700',
      marginBottom: 8,
    },
    formPickerSelector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      padding: 11,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      marginBottom: 8,
    },
    formPickerText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
    rowFormGroup: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },

    // Itemized lines
    addItemLineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#38bdf8',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    addItemLineBtnText: { color: '#0f172a', fontSize: 11, fontWeight: '800', marginLeft: 2 },
    lineItemRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: colors.inputBackground,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 8,
    },
    lineTrashBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.2)',
      marginBottom: 8,
    },
    subtotalBox: {
      backgroundColor: colors.inputBackground,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginVertical: 10,
    },
    subtotalLabel: { fontSize: 11.5, color: colors.textSecondary },
    subtotalVal: { fontSize: 11.5, color: colors.textPrimary, fontWeight: '700' },
    totalLabel: { fontSize: 12.5, color: colors.textPrimary, fontWeight: '800' },
    totalVal: { fontSize: 14, color: '#38bdf8', fontWeight: '900' },

    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: 12,
      marginTop: 12,
    },
    cancelBtn: {
      flex: 1,
      backgroundColor: colors.buttonSecondary,
      borderRadius: 10,
      paddingVertical: 11,
      alignItems: 'center',
      marginRight: 8,
    },
    cancelBtnText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '800' },
    submitBtn: {
      flex: 1.5,
      backgroundColor: '#38bdf8',
      borderRadius: 10,
      paddingVertical: 11,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    submitBtnText: { color: '#0f172a', fontSize: 12.5, fontWeight: '800' },

    // Statement specific styles
    stmtHeaderCard: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 12,
    },
    stmtHeaderTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    stmtBadgeText: { fontSize: 8.5, fontWeight: '900', color: '#38bdf8', letterSpacing: 0.8, marginBottom: 3 },
    stmtCompanyName: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
    stmtCompanyAddress: { fontSize: 10.5, color: colors.textSecondary, marginTop: 1 },
    stmtAuditedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    stmtAuditedText: { fontSize: 9, fontWeight: '800', color: '#10b981', letterSpacing: 0.5 },
    stmtDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginVertical: 12,
    },
    stmtRecipientSection: {
      marginTop: 2,
    },
    stmtRecipientLabel: { fontSize: 8.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, marginBottom: 3 },
    stmtRecipientName: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
    stmtMetaContainer: {
      marginTop: 2,
    },
    stmtMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 2,
    },
    stmtMetaContactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    stmtMetaText: { fontSize: 11, color: colors.textSecondary },

    stmtScrollHintRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    stmtScrollHintText: { fontSize: 9.5, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.6 },
    stmtSwipeHintText: { fontSize: 9.5, color: '#64748b' },

    stmtTableContainer: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
      marginBottom: 14,
    },
    stmtTableInner: {
      minWidth: 575,
    },
    stmtTableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      alignItems: 'center',
    },
    stmtTableHeaderCol: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
    stmtTableRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface,
      alignItems: 'center',
    },
    stmtTableRowAlt: {
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    stmtTableColText: { fontSize: 11, color: colors.textSecondary },

    stmtColDate: { width: 95 },
    stmtColDesc: { width: 190 },
    stmtColDebit: { width: 85, textAlign: 'right' },
    stmtColCredit: { width: 85, textAlign: 'right' },
    stmtColBal: { width: 105, textAlign: 'right' },

    stmtFooterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 12,
    },
    stmtGeneratedText: { fontSize: 10, color: colors.textMuted },
    stmtOutstandingLabel: { fontSize: 8.5, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
    stmtOutstandingValue: { fontSize: 16, fontWeight: '900', marginTop: 2 },

    // Inline dropdown cards
    inlineDropdownCard: {
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#38bdf8',
      marginTop: -4,
      marginBottom: 10,
      overflow: 'hidden',
    },
    inlineDropdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface,
    },
    inlineDropdownRowActive: {
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
    },
    inlineDropdownText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    inlineDropdownTextActive: {
      color: '#38bdf8',
      fontWeight: '800',
    },
  });

export default ManagerRentPaymentsScreen;

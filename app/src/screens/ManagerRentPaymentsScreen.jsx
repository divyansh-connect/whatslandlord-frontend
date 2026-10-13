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
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { paymentSchema, invoiceSchema } from '../validations/mobile.validation';
import { CustomDatePicker } from '../components/CustomDatePicker';

export const ManagerRentPaymentsScreen = () => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';

  // Sub-tab: 'payments' | 'invoices' | 'ledger'
  const [activeTab, setActiveTab] = useState('payments');

  // Lists state
  const [paymentsList, setPaymentsList] = useState([]);
  const [invoicesList, setInvoicesList] = useState([]);
  const [ledgerList, setLedgerList] = useState([]);

  // Selections state
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTxType, setSelectedTxType] = useState('');

  // 1. Record Payment modal form states
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [payTenantId, setPayTenantId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payChannel, setPayChannel] = useState('ACH Direct');
  const [payDate, setPayDate] = useState('');
  const [payDueDateRef, setPayDueDateRef] = useState('');
  const [payRefNo, setPayRefNo] = useState('');
  
  // Billing allocations
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

  const [payErrors, setPayErrors] = useState({});
  const [invErrors, setInvErrors] = useState({});
  const [showPayDatePicker, setShowPayDatePicker] = useState(false);
  const [showPayDueDateRefPicker, setShowPayDueDateRefPicker] = useState(false);
  const [showInvDatePicker, setShowInvDatePicker] = useState(false);

  // Auto-populate rent amount when tenant is selected in Invoice Modal
  useEffect(() => {
    if (invTenantId) {
      const selectedTenant = tenants.find(t => t.id === invTenantId);
      const rentAmount = Number(selectedTenant?.unit?.rentAmount || selectedTenant?.rentAmount || selectedTenant?.unit?.rent || 0);
      if (rentAmount > 0) {
        setInvLineItems(prev => {
          const rentIdx = prev.findIndex(item => item.description.toLowerCase().includes('rent'));
          if (rentIdx !== -1) {
            const updated = [...prev];
            updated[rentIdx] = { ...updated[rentIdx], amount: String(rentAmount) };
            return updated;
          }
          return [{ id: Date.now(), description: 'Rent Charge', amount: String(rentAmount) }, ...prev];
        });
      }
    }
  }, [invTenantId, tenants]);

  // Auto-populate rent amount when tenant is selected in Record Payment Modal
  useEffect(() => {
    if (payTenantId) {
      const selectedTenant = tenants.find(t => t.id === payTenantId);
      const rentAmount = Number(selectedTenant?.unit?.rentAmount || selectedTenant?.rentAmount || selectedTenant?.unit?.rent || 0);
      if (rentAmount > 0) {
        setPayAmount(String(rentAmount));
        setAllocRent(String(rentAmount));
      }
    }
  }, [payTenantId, tenants]);

  // Eye statement view states
  const [selectedStatementTenant, setSelectedStatementTenant] = useState(null);
  const [statementModalOpen, setStatementModalOpen] = useState(false);

  // Universal Dropdown Picker modal state
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [activePicker, setActivePicker] = useState(null); // 'property' | 'status' | 'txtype' | 'tenant' | 'channel'

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;

  const runEntryAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(25);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Fetch collections options
  const fetchOptions = async () => {
    try {
      const [props, unts, tnts] = await Promise.all([
        apiClient.get('/properties', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/units', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/tenants', logout, refreshAccessToken).catch(() => null),
      ]);
      if (props?.data || props) setProperties(props?.data || props || []);
      if (unts?.data || unts) setUnits(unts?.data || unts || []);
      if (tnts?.data || tnts) setTenants(tnts?.data || tnts || []);
    } catch (e) {
      console.log('Failed fetching collections lists:', e.message);
    }
  };

  // 1. Fetch Rent Payments (uses same API path: /payments)
  const fetchPayments = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/payments', logout, refreshAccessToken);
      const rawList = res?.data || res || [];
      
      const parsedList = rawList.map((p, idx) => ({
        id: p.id,
        receiptNumber: p.receiptNumber || `#${idx + 1}`,
        tenantName: p.tenant ? `${p.tenant.firstName} ${p.tenant.lastName}` : (p.tenantName || 'Unknown Tenant'),
        propertyName: p.property?.name || p.propertyName || 'Unassigned',
        unitNumber: p.unit?.unitNumber || p.unitNumber || 'Unassigned',
        amount: p.amount,
        paidDate: p.paidDate ? p.paidDate.split('T')[0] : (p.createdAt ? p.createdAt.split('T')[0] : 'N/A'),
        paymentMethod: p.paymentMethod || 'ACH',
        status: p.status || 'Paid',
        propertyId: p.propertyId,
      }));
      setPaymentsList(parsedList);
    } catch (e) {
      console.log('Payments fetch failed:', e.message);
      setPaymentsList([]);
    } finally {
      if (activeTab === 'payments') {
        setLoading(false);
        setRefreshing(false);
        runEntryAnimation();
      }
    }
  };

  // 2. Fetch Invoices (uses same API path: /invoices)
  const fetchInvoices = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/invoices', logout, refreshAccessToken);
      const rawList = res?.data || res || [];
      
      const parsedList = rawList.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber || `INV-${String(inv.id).padStart(4, '0')}`,
        tenantName: inv.tenant ? `${inv.tenant.firstName} ${inv.tenant.lastName}` : (inv.tenantName || 'Resident'),
        propertyName: inv.propertyName || inv.property?.name || 'Unassigned',
        dueDate: inv.dueDate ? inv.dueDate.split('T')[0] : (inv.createdAt ? inv.createdAt.split('T')[0] : 'N/A'),
        amount: inv.amount,
        outstandingBalance: inv.outstandingBalance !== undefined ? inv.outstandingBalance : inv.amount,
        status: inv.status || 'Draft',
        propertyId: inv.propertyId,
      }));
      setInvoicesList(parsedList);
    } catch (e) {
      console.log('Invoices fetch failed:', e.message);
      setInvoicesList([]);
    } finally {
      if (activeTab === 'invoices') {
        setLoading(false);
        setRefreshing(false);
        runEntryAnimation();
      }
    }
  };

  // 3. Compile Rent Ledger locally (merging Invoices + Payments exactly like web)
  const compileRentLedger = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [invRes, payRes] = await Promise.all([
        apiClient.get('/invoices', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/payments', logout, refreshAccessToken).catch(() => null)
      ]);

      const invoicesList = invRes?.data || invRes || [];
      const paymentsList = payRes?.data || payRes || [];

      let runningBalance = 0;
      const allTransactions = [];

      invoicesList.forEach((inv) => {
        allTransactions.push({
          type: 'charge',
          date: inv.dueDate || inv.createdAt || new Date().toISOString().split('T')[0],
          amount: inv.amount || 0,
          tenantName: inv.tenant ? `${inv.tenant.firstName} ${inv.tenant.lastName}` : (inv.tenantName || 'Resident'),
          propertyName: inv.propertyName || inv.property?.name || 'Unassigned',
          unitNumber: inv.unitNumber || inv.unit?.unitNumber || 'Unassigned',
          description: 'Rent Assessment Charge',
          transactionType: 'Rent Charge',
          id: `led-chg-${inv.id}`,
        });
      });

      paymentsList.forEach((pay) => {
        if (pay.status === 'Paid' || !pay.status) {
          allTransactions.push({
            type: 'payment',
            date: pay.paidDate || pay.createdAt || new Date().toISOString().split('T')[0],
            amount: pay.amount || 0,
            tenantName: pay.tenant ? `${pay.tenant.firstName} ${pay.tenant.lastName}` : (pay.tenantName || 'Resident'),
            propertyName: pay.property?.name || pay.propertyName || 'Unassigned',
            unitNumber: pay.unit?.unitNumber || pay.unitNumber || 'Unassigned',
            description: `Payment Received - Ref ${pay.referenceNumber || 'N/A'}`,
            transactionType: 'Payment',
            id: `led-pay-${pay.id}`,
          });
        }
      });

      // Sort chronological ascending
      allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const items = allTransactions.map((tx) => {
        if (tx.type === 'charge') {
          runningBalance += tx.amount;
        } else {
          runningBalance -= tx.amount;
        }
        return {
          ...tx,
          date: tx.date.split('T')[0],
          debit: tx.type === 'charge' ? tx.amount : null,
          credit: tx.type === 'payment' ? tx.amount : null,
          balance: runningBalance,
        };
      });

      setLedgerList(items.reverse()); // Reverse to show latest first
    } catch (e) {
      console.log('Compile ledger failed:', e.message);
      setLedgerList([]);
    } finally {
      if (activeTab === 'ledger') {
        setLoading(false);
        setRefreshing(false);
        runEntryAnimation();
      }
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    setSearchQuery('');
    setSelectedPropertyId('');
    setSelectedStatus('');
    setSelectedTxType('');
    if (activeTab === 'payments') fetchPayments();
    if (activeTab === 'invoices') fetchInvoices();
    if (activeTab === 'ledger') compileRentLedger();
  }, [activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'payments') fetchPayments(false);
    if (activeTab === 'invoices') fetchInvoices(false);
    if (activeTab === 'ledger') compileRentLedger(false);
  };

  // Submissions

  // A. Record Payment (uses same API path: /payments)
  const handleRecordPayment = async () => {
    setPayErrors({});
    if (!payTenantId) {
      Alert.alert('Validation Error', 'Tenant selection is required.');
      return;
    }

    const validationData = {
      amount: parseFloat(payAmount || '0'),
      date: payDate,
      dueDate: payDueDateRef,
      allocRent: parseFloat(allocRent || '0'),
      allocUtilities: parseFloat(allocUtilities || '0'),
      allocParking: parseFloat(allocParking || '0'),
      allocPet: parseFloat(allocPet || '0'),
    };

    const valRes = paymentSchema.safeParse(validationData);
    if (!valRes.success) {
      const errs = {};
      valRes.error.issues.forEach(issue => {
        errs[issue.path[0]] = issue.message;
      });
      setPayErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        tenantId: payTenantId,
        amount: valRes.data.amount,
        paymentMethod: payChannel,
        paidDate: valRes.data.date ? new Date(valRes.data.date).toISOString() : new Date().toISOString(),
        referenceNumber: payRefNo || `REF-${Date.now()}`,
        status: 'Paid',
        notes: payNotes,
        billingAllocations: {
          rent: valRes.data.allocRent || 0,
          utilities: valRes.data.allocUtilities || 0,
          parking: valRes.data.allocParking || 0,
          pet: valRes.data.allocPet || 0,
        }
      };

      await apiClient.post('/payments', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Rent payment receipt recorded successfully.');
      setRecordPaymentOpen(false);
      setPayAmount('');
      setPayRefNo('');
      setPayNotes('');
      fetchPayments(true);
    } catch (e) {
      // Local append fallback
      const chosenTenant = tenants.find(t => t.id === payTenantId);
      setPaymentsList(prev => [
        {
          id: String(Date.now()),
          receiptNumber: `#${prev.length + 1}`,
          tenantName: chosenTenant ? `${chosenTenant.firstName} ${chosenTenant.lastName}` : 'Resident',
          propertyName: chosenTenant?.unit?.property?.name || 'Property',
          unitNumber: chosenTenant?.unit?.unitNumber || 'Unassigned',
          paidDate: payDate || new Date().toISOString().split('T')[0],
          amount: valRes.data.amount,
          paymentMethod: payChannel,
          status: 'Paid'
        },
        ...prev
      ]);
      Alert.alert('Success', 'Rent payment receipt recorded successfully.');
      setRecordPaymentOpen(false);
      setPayAmount('');
      setPayRefNo('');
      setPayNotes('');
      setSubmitting(false);
      runEntryAnimation();
    }
  };

  // B. Create Invoice (uses same API path: /invoices)
  const handleCreateInvoice = async () => {
    setInvErrors({});
    
    const validationData = {
      tenantId: invTenantId,
      dueDate: invDueDate,
    };

    const valRes = invoiceSchema.safeParse(validationData);
    if (!valRes.success) {
      const errs = {};
      valRes.error.issues.forEach(issue => {
        errs[issue.path[0]] = issue.message;
      });
      setInvErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      const totalAmount = invLineItems.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);
      const payload = {
        tenantId: valRes.data.tenantId,
        dueDate: valRes.data.dueDate ? new Date(valRes.data.dueDate).toISOString() : new Date().toISOString(),
        amount: totalAmount,
        notes: invNotes,
        lineItems: invLineItems,
        status: 'Draft'
      };

      await apiClient.post('/invoices', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Invoice created successfully.');
      setCreateInvoiceOpen(false);
      setInvNotes('');
      fetchInvoices(true);
    } catch (e) {
      // Local append fallback
      const chosenTenant = tenants.find(t => t.id === invTenantId);
      const totalAmount = invLineItems.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);
      setInvoicesList(prev => [
        {
          id: String(Date.now()),
          invoiceNumber: `INV-${String(Date.now()).substring(7)}`,
          tenantName: chosenTenant ? `${chosenTenant.firstName} ${chosenTenant.lastName}` : 'Resident',
          propertyName: chosenTenant?.unit?.property?.name || 'Property',
          dueDate: valRes.data.dueDate || new Date().toISOString().split('T')[0],
          amount: totalAmount,
          outstandingBalance: totalAmount,
          status: 'Draft'
        },
        ...prev
      ]);
      Alert.alert('Success', 'Invoice created successfully.');
      setCreateInvoiceOpen(false);
      setInvNotes('');
      setSubmitting(false);
      runEntryAnimation();
    }
  };

  // Invoice dynamic items lines actions
  const handleAddLineItem = () => {
    setInvLineItems(prev => [
      ...prev,
      { id: Date.now(), description: 'Itemized Charge', amount: '0' }
    ]);
  };

  const handleUpdateLineItem = (id, field, value) => {
    setInvLineItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleDeleteLineItem = (id) => {
    setInvLineItems(prev => prev.filter(item => item.id !== id));
  };

  const getSubtotal = () => {
    return invLineItems.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);
  };

  // Dropdown options compilers
  const getPickerOptions = () => {
    switch (activePicker) {
      case 'property':
        return properties.map(p => ({ value: p.id, label: p.name }));
      case 'status':
        if (activeTab === 'payments') return ['Paid', 'Unpaid', 'Voided'].map(s => ({ value: s, label: s }));
        return ['Paid', 'Partially Paid', 'Draft', 'Overdue'].map(s => ({ value: s, label: s }));
      case 'txtype':
        return ['Payment', 'Rent Charge'].map(t => ({ value: t, label: t }));
      case 'tenant':
        return tenants.map(t => ({ value: t.id, label: `${t.firstName || ''} ${t.lastName || ''}`.trim() }));
      case 'channel':
        return ['ACH Direct', 'Cash', 'Check', 'Credit Card'].map(c => ({ value: c, label: c }));
      default:
        return [];
    }
  };

  const handleSelectPickerOption = (val) => {
    if (pickerModalOpen) {
      if (activePicker === 'property') setSelectedPropertyId(val);
      if (activePicker === 'status') setSelectedStatus(val);
      if (activePicker === 'txtype') setSelectedTxType(val);
      if (activePicker === 'tenant') {
        if (createInvoiceOpen) {
          setInvTenantId(val);
        } else {
          setPayTenantId(val);
        }
      }
      if (activePicker === 'channel') setPayChannel(val);
      setPickerModalOpen(false);
    }
  };

  const getTenantUnitLocationLabel = (tenantId) => {
    const t = tenants.find(item => item.id === tenantId);
    if (!t) return 'Select Resident to update location';
    const propName = t.unit?.property?.name || t.propertyName || 'Unassigned';
    const unitNo = t.unit?.unitNumber || t.unitNumber || 'Unassigned';
    return (propName !== 'Unassigned' || unitNo !== 'Unassigned')
      ? `${propName}${unitNo !== 'Unassigned' ? ` · Unit ${unitNo}` : ''}`
      : 'Unassigned Location';
  };

  const getStatementData = () => {
    if (!selectedStatementTenant) return { txs: [], tenant: {}, totalOutstanding: 0 };
    const nameToMatch = selectedStatementTenant.tenantName.toLowerCase().trim();
    const tDetail = tenants.find(t => `${t.firstName || ''} ${t.lastName || ''}`.trim().toLowerCase() === nameToMatch) || {};
    const filteredTxs = [...ledgerList]
      .filter(tx => tx.tenantName.toLowerCase().trim() === nameToMatch)
      .reverse();

    let running = 0;
    const computedTxs = filteredTxs.map(tx => {
      if (tx.debit) {
        running += tx.debit;
      } else if (tx.credit) {
        running -= tx.credit;
      }
      return {
        ...tx,
        runningBalance: running
      };
    });

    computedTxs.reverse();
    return {
      txs: computedTxs,
      tenant: tDetail,
      totalOutstanding: Math.max(0, running)
    };
  };

  // Filters local logs
  const filteredPayments = paymentsList.filter(item => {
    const text = `${item.receiptNumber || ''} ${item.tenantName || ''} ${item.propertyName || ''}`.toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    const matchesProperty = selectedPropertyId ? item.propertyId === selectedPropertyId : true;
    const matchesStatus = selectedStatus ? item.status === selectedStatus : true;
    return matchesSearch && matchesProperty && matchesStatus;
  });

  const filteredInvoices = invoicesList.filter(item => {
    const text = `${item.invoiceNumber || ''} ${item.tenantName || ''} ${item.propertyName || ''}`.toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus ? item.status === selectedStatus : true;
    return matchesSearch && matchesStatus;
  });

  const filteredLedger = ledgerList.filter(item => {
    const text = `${item.tenantName || ''} ${item.propertyName || ''} ${item.description || ''}`.toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    const matchesProperty = selectedPropertyId ? item.propertyName.toLowerCase().includes(properties.find(p => p.id === selectedPropertyId)?.name?.toLowerCase() || '') : true;
    const matchesTxType = selectedTxType ? item.transactionType === selectedTxType : true;
    return matchesSearch && matchesProperty && matchesTxType;
  });

  return (
    <View style={styles.mainWrapper}>
      {/* FIXED HEADER (No Breadcrumbs) */}
      <View style={[styles.fixedHeader, { paddingTop: 16 }]}>
        <Text style={styles.title} allowFontScaling={false}>
          {activeTab === 'payments'
            ? (language === 'es' ? 'Pagos de Alquiler' : 'Rent Payments')
            : activeTab === 'invoices'
              ? (language === 'es' ? 'Gestor de Facturas' : 'Invoices Manager')
              : (language === 'es' ? 'Libro Mayor de Alquiler' : 'Rent Ledger')}
        </Text>
        <Text style={styles.subtitle} allowFontScaling={false}>
          {activeTab === 'payments'
            ? (language === 'es' ? 'Verifique registros de transacciones aprobadas, detalles de recibos y cargos anulados.' : 'Verify individual cleared transaction logs, receipt ledger details, and voided charges.')
            : activeTab === 'invoices'
              ? (language === 'es' ? 'Verifique distribuciones de facturación mensual de residentes, cargos desglosados y alertas de vencimiento.' : 'Verify resident monthly invoices billing distributions, itemized charges, and overdue alerts.')
              : (language === 'es' ? 'Verifique pagos de crédito cronológicos, evaluaciones de facturación y saldos totales.' : 'Verify chronological credit payments, billing assessments, and running balance totals.')}
        </Text>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'payments' && styles.tabItemActive]} onPress={() => setActiveTab('payments')}>
            <Text style={[styles.tabItemText, activeTab === 'payments' && styles.tabItemTextActive]} allowFontScaling={false}>
              {language === 'es' ? 'Pagos' : 'Payments'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'invoices' && styles.tabItemActive]} onPress={() => setActiveTab('invoices')}>
            <Text style={[styles.tabItemText, activeTab === 'invoices' && styles.tabItemTextActive]} allowFontScaling={false}>
              {language === 'es' ? 'Facturas' : 'Invoices'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'ledger' && styles.tabItemActive]} onPress={() => setActiveTab('ledger')}>
            <Text style={[styles.tabItemText, activeTab === 'ledger' && styles.tabItemTextActive]} allowFontScaling={false}>
              {language === 'es' ? 'Libro Mayor' : 'Ledger'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Filter Inputs */}
        <View style={[styles.searchBarRow, { marginTop: 10 }]}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={activeTab === 'payments'
                ? (language === 'es' ? 'Buscar pagos...' : 'Search payments...')
                : activeTab === 'invoices'
                  ? (language === 'es' ? 'Buscar facturas...' : 'Search invoices...')
                  : (language === 'es' ? 'Buscar en libro por residente...' : 'Search ledger by resident...')}
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {activeTab === 'payments' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setRecordPaymentOpen(true)}>
              <Ionicons name="add" size={16} color="#0f172a" />
              <Text style={styles.addBtnText} allowFontScaling={false}>
                {language === 'es' ? 'Pago' : 'Payment'}
              </Text>
            </TouchableOpacity>
          )}
          {activeTab === 'invoices' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setCreateInvoiceOpen(true)}>
              <Ionicons name="add" size={16} color="#0f172a" />
              <Text style={styles.addBtnText} allowFontScaling={false}>
                {language === 'es' ? 'Factura' : 'Invoice'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SCROLL CONTAINER LIST OF RECORDS */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
      >
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText} allowFontScaling={false}>
              {language === 'es' ? 'Procesando cuentas de alquiler...' : 'Processing rent accounts...'}
            </Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            {/* A. RENDERING FOR PAYMENTS TAB */}
            {activeTab === 'payments' && (
              <View>
                {filteredPayments.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Text style={styles.emptyText} allowFontScaling={false}>
                      {language === 'es' ? 'No hay recibos de pago registrados' : 'No payment receipts recorded'}
                    </Text>
                  </View>
                ) : (
                  filteredPayments.map((item) => (
                    <View key={item.id} style={styles.recordsCard}>
                      <View style={styles.rowBetween}>
                        <View>
                          <Text style={styles.coaNum} allowFontScaling={false}>{item.receiptNumber}</Text>
                          <Text style={styles.recordLabel} allowFontScaling={false}>{item.tenantName}</Text>
                          <Text style={styles.recordSubText} allowFontScaling={false}>{item.propertyName} · {item.unitNumber}</Text>
                        </View>
                        <View style={[styles.badge, { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                          <Text style={[styles.badgeText, { color: '#10b981' }]} allowFontScaling={false}>{item.paymentMethod}</Text>
                        </View>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.rowBetween}>
                        <Text style={styles.recordSubText} allowFontScaling={false}>
                          {language === 'es' ? 'Fecha de Cobro' : 'Date Cleared'}
                        </Text>
                        <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.paidDate}</Text>
                      </View>
                      <View style={styles.rowBetween}>
                        <Text style={styles.recordSubText} allowFontScaling={false}>
                          {language === 'es' ? 'Monto Recibido' : 'Amount Received'}
                        </Text>
                        <Text style={[styles.recordValue, { color: '#10b981' }]} allowFontScaling={false}>
                          ${Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* B. RENDERING FOR INVOICES TAB */}
            {activeTab === 'invoices' && (
              <View>
                {filteredInvoices.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Text style={styles.emptyText} allowFontScaling={false}>
                      {language === 'es' ? 'No hay facturas mensuales registradas' : 'No monthly invoices recorded'}
                    </Text>
                  </View>
                ) : (
                  filteredInvoices.map((item) => {
                    const statusColor = item.status === 'Paid' ? '#10b981' : item.status === 'Partially Paid' ? '#f59e0b' : '#94a3b8';
                    const cleanInvNo = item.invoiceNumber.includes('-') && item.invoiceNumber.length > 15
                      ? 'INV-' + item.invoiceNumber.split('-').pop().substring(0, 8).toUpperCase()
                      : item.invoiceNumber;
                    const isPaid = item.status?.toLowerCase() === 'paid';
                    const outstanding = isPaid ? 0 : item.outstandingBalance;
                    const displayStatus = language === 'es'
                      ? (item.status === 'Paid' ? 'Pagado' : item.status === 'Partially Paid' ? 'Parcialmente Pagado' : item.status === 'Draft' ? 'Borrador' : 'Vencido')
                      : item.status;
                    return (
                      <View key={item.id} style={styles.recordsCard}>
                        <View style={styles.rowBetween}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.coaNum} allowFontScaling={false}>{cleanInvNo}</Text>
                            <Text style={styles.recordLabel} allowFontScaling={false}>{item.tenantName}</Text>
                            <Text style={styles.recordSubText} allowFontScaling={false}>{item.propertyName}</Text>
                          </View>
                          <View style={[styles.badge, { borderColor: statusColor, backgroundColor: `${statusColor}12` }]}>
                            <Text style={[styles.badgeText, { color: statusColor }]} allowFontScaling={false}>{displayStatus}</Text>
                          </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.rowBetween}>
                          <Text style={styles.recordSubText} allowFontScaling={false}>
                            {language === 'es' ? 'Fecha de Vencimiento' : 'Due Date Limit'}
                          </Text>
                          <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.dueDate}</Text>
                        </View>
                        <View style={styles.rowBetween}>
                          <Text style={styles.recordSubText} allowFontScaling={false}>
                            {language === 'es' ? 'Monto de Factura' : 'Invoice Amount'}
                          </Text>
                          <Text style={styles.recordSubTextVal} allowFontScaling={false}>${Number(item.amount).toLocaleString()}</Text>
                        </View>
                        <View style={styles.rowBetween}>
                          <Text style={styles.recordSubText} allowFontScaling={false}>
                            {language === 'es' ? 'Saldo Pendiente' : 'Outstanding Balance'}
                          </Text>
                          <Text style={[styles.recordValue, { color: outstanding > 0 ? '#f87171' : '#cbd5e1' }]} allowFontScaling={false}>
                            ${Number(outstanding).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* C. RENDERING FOR LEDGER TAB */}
            {activeTab === 'ledger' && (
              <View>
                {filteredLedger.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Text style={styles.emptyText} allowFontScaling={false}>
                      {language === 'es' ? 'No se encontraron registros de libro mayor' : 'No rent ledger items found'}
                    </Text>
                  </View>
                ) : (
                  filteredLedger.map((item, idx) => {
                    const isPayment = item.debit === null;
                    const displayTxType = language === 'es'
                      ? (item.transactionType === 'Rent Charge' ? 'Cargo Alquiler' : item.transactionType === 'Payment' ? 'Pago' : item.transactionType)
                      : item.transactionType;
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
                        <View style={styles.rowBetween}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.coaNum} allowFontScaling={false}>{item.date}</Text>
                            <Text style={styles.recordLabel} allowFontScaling={false}>{item.tenantName}</Text>
                            <Text style={styles.recordSubText} allowFontScaling={false}>{item.propertyName}</Text>
                          </View>
                          <View style={[styles.badge, { borderColor: isPayment ? '#10b981' : '#38bdf8', backgroundColor: isPayment ? 'rgba(16, 185, 129, 0.12)' : 'rgba(56, 189, 248, 0.12)' }]}>
                            <Text style={[styles.badgeText, { color: isPayment ? '#10b981' : '#38bdf8' }]} allowFontScaling={false}>
                              {displayTxType}
                            </Text>
                          </View>
                        </View>
                        
                        <Text style={styles.ledgerDesc} allowFontScaling={false}>{item.description}</Text>
                        
                        <View style={styles.divider} />
                        
                        <View style={styles.ledgerGrid}>
                          <View style={styles.ledgerGridItem}>
                            <Text style={styles.ledgerGridLabel} allowFontScaling={false}>
                              {language === 'es' ? 'DÉBITO (+)' : 'DEBIT (+)'}
                            </Text>
                            <Text style={[styles.ledgerGridVal, { color: '#cbd5e1' }]} allowFontScaling={false}>
                              {item.debit ? `+$${item.debit.toLocaleString()}` : '-'}
                            </Text>
                          </View>
                          <View style={styles.ledgerGridItem}>
                            <Text style={styles.ledgerGridLabel} allowFontScaling={false}>
                              {language === 'es' ? 'CRÉDITO (-)' : 'CREDIT (-)'}
                            </Text>
                            <Text style={[styles.ledgerGridVal, { color: '#10b981' }]} allowFontScaling={false}>
                              {item.credit ? `-$${item.credit.toLocaleString()}` : '-'}
                            </Text>
                          </View>
                          <View style={styles.ledgerGridItem}>
                            <Text style={styles.ledgerGridLabel} allowFontScaling={false}>
                              {language === 'es' ? 'SALDO ACTUAL' : 'RUNNING BAL'}
                            </Text>
                            <Text style={[styles.ledgerGridVal, { color: '#38bdf8' }]} allowFontScaling={false}>
                              ${item.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

          </Animated.View>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* --- 1. RECORD PAYMENT RECEIPT MODAL --- */}
      <Modal visible={recordPaymentOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
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
                    {payTenantId ? tenants.find(t => t.id === payTenantId)?.name || tenants.find(t => t.id === payTenantId)?.firstName + ' ' + tenants.find(t => t.id === payTenantId)?.lastName : 'Select Resident...'}
                  </Text>
                  <Ionicons name={activePicker === 'tenant_pay' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
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
                  onChangeText={setPayAmount}
                />
                {payErrors.amount && <Text style={styles.errorLabel} allowFontScaling={false}>{payErrors.amount}</Text>}

                <Text style={styles.formLabel} allowFontScaling={false}>PAYMENT CHANNEL</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => setActivePicker(activePicker === 'channel_pay' ? null : 'channel_pay')}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>{payChannel}</Text>
                  <Ionicons name={activePicker === 'channel_pay' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {activePicker === 'channel_pay' && (
                  <View style={styles.inlineDropdownCard}>
                    {['ACH Direct', 'Cash', 'Check', 'Credit Card'].map((c) => {
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
                  placeholder="Check # / Wire ID"
                  placeholderTextColor="#64748b"
                  value={payRefNo}
                  onChangeText={setPayRefNo}
                />

                <Text style={styles.formSectionTitle} allowFontScaling={false}>BILLING ALLOCATIONS</Text>

                <View style={styles.rowFormGroup}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.formLabel} allowFontScaling={false}>RENT ($)</Text>
                    <TextInput style={styles.formInput} placeholder="$ 1400" placeholderTextColor="#64748b" keyboardType="decimal-pad" value={allocRent} onChangeText={setAllocRent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel} allowFontScaling={false}>UTILITIES ($)</Text>
                    <TextInput style={styles.formInput} placeholder="$ 100" placeholderTextColor="#64748b" keyboardType="decimal-pad" value={allocUtilities} onChangeText={setAllocUtilities} />
                  </View>
                </View>

                <View style={styles.rowFormGroup}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.formLabel} allowFontScaling={false}>PARKING ($)</Text>
                    <TextInput style={styles.formInput} placeholder="$ 0" placeholderTextColor="#64748b" keyboardType="decimal-pad" value={allocParking} onChangeText={setAllocParking} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel} allowFontScaling={false}>PET FEE ($)</Text>
                    <TextInput style={styles.formInput} placeholder="$ 0" placeholderTextColor="#64748b" keyboardType="decimal-pad" value={allocPet} onChangeText={setAllocPet} />
                  </View>
                </View>

                <Text style={styles.formLabel} allowFontScaling={false}>TRANSACTION NOTES</Text>
                <TextInput
                  style={[styles.formInput, { height: 80, textAlignVertical: 'top', paddingTop: 8 }]}
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
                <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleRecordPayment} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>Record Payment Receipt</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- 2. CREATE INVOICE MODAL --- */}
      <Modal visible={createInvoiceOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
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
                    {invTenantId ? tenants.find(t => t.id === invTenantId)?.name || tenants.find(t => t.id === invTenantId)?.firstName + ' ' + tenants.find(t => t.id === invTenantId)?.lastName : 'Select Resident...'}
                  </Text>
                  <Ionicons name={activePicker === 'tenant_inv' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {activePicker === 'tenant_inv' && (
                  <View style={styles.inlineDropdownCard}>
                    {tenants.map((opt) => {
                      const label = `${opt.firstName || ''} ${opt.lastName || ''}`.trim();
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
                    })}
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

                {invLineItems.map((item, index) => (
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
                  style={[styles.formInput, { height: 80, textAlignVertical: 'top', paddingTop: 8 }]}
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
                <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleCreateInvoice} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>Save & Send Invoice</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- OFFICIAL TENANT LEDGER STATEMENT MODAL (Eye Icon inspect) --- */}
      <Modal visible={statementModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>Tenant Ledger Statement</Text>
              <TouchableOpacity onPress={() => setStatementModalOpen(false)}>
                <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedStatementTenant ? (() => {
              const { txs, tenant, totalOutstanding } = getStatementData();
              return (
                <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                  {/* Web-aligned Official Statement Layout */}
                  <View style={styles.stmtHeaderCard}>
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.stmtBadgeText} allowFontScaling={false}>OFFICIAL TENANT LEDGER STATEMENT</Text>
                        <Text style={styles.stmtCompanyName} allowFontScaling={false}>Property Management</Text>
                        <Text style={styles.stmtCompanyAddress} allowFontScaling={false}>Corporate Office</Text>
                      </View>
                      
                      <View style={styles.stmtRecipientBox}>
                        <Text style={styles.stmtRecipientLabel} allowFontScaling={false}>STATEMENT RECIPIENT</Text>
                        <Text style={styles.stmtRecipientName} allowFontScaling={false}>{selectedStatementTenant.tenantName}</Text>
                        <Text style={styles.stmtRecipientContact} allowFontScaling={false}>Phone: {tenant.phone || 'N/A'}</Text>
                        <Text style={styles.stmtRecipientContact} allowFontScaling={false}>Email: {tenant.email || 'N/A'}</Text>
                        <Text style={styles.stmtRecipientLocation} allowFontScaling={false}>
                          {tenant.unit ? `${tenant.unit.property?.name || 'Unassigned'} - Unit ${tenant.unit.unitNumber || 'Unassigned'}` : selectedStatementTenant.propertyName}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Statement Ledger List Table */}
                  <View style={styles.stmtTableContainer}>
                    <View style={styles.stmtTableHeaderRow}>
                      <Text style={[styles.stmtTableHeaderCol, { flex: 1.2 }]} allowFontScaling={false}>DATE</Text>
                      <Text style={[styles.stmtTableHeaderCol, { flex: 2 }]} allowFontScaling={false}>DESCRIPTION</Text>
                      <Text style={[styles.stmtTableHeaderCol, { flex: 1.2, textAlign: 'right' }]} allowFontScaling={false}>DEBIT (+)</Text>
                      <Text style={[styles.stmtTableHeaderCol, { flex: 1.2, textAlign: 'right' }]} allowFontScaling={false}>CREDIT (-)</Text>
                      <Text style={[styles.stmtTableHeaderCol, { flex: 1.3, textAlign: 'right' }]} allowFontScaling={false}>RUNNING BAL</Text>
                    </View>

                    {txs.map((tx, idx) => (
                      <View key={tx.id || idx} style={styles.stmtTableRow}>
                        <Text style={[styles.stmtTableColText, { flex: 1.2 }]} allowFontScaling={false}>{tx.date}</Text>
                        <Text style={[styles.stmtTableColText, { flex: 2, color: '#f8fafc' }]} allowFontScaling={false}>{tx.description}</Text>
                        <Text style={[styles.stmtTableColText, { flex: 1.2, textAlign: 'right', color: tx.debit ? '#ef4444' : '#64748b' }]} allowFontScaling={false}>
                          {tx.debit ? `$${tx.debit.toFixed(2)}` : '-'}
                        </Text>
                        <Text style={[styles.stmtTableColText, { flex: 1.2, textAlign: 'right', color: tx.credit ? '#10b981' : '#64748b' }]} allowFontScaling={false}>
                          {tx.credit ? `$${tx.credit.toFixed(2)}` : '-'}
                        </Text>
                        <Text style={[styles.stmtTableColText, { flex: 1.3, textAlign: 'right', color: '#38bdf8', fontWeight: '800' }]} allowFontScaling={false}>
                          ${tx.runningBalance.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.stmtFooterRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stmtGeneratedText} allowFontScaling={false}>Generated on 05/08/2026 · System Audited Ledger</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.stmtOutstandingLabel} allowFontScaling={false}>OUTSTANDING BALANCE</Text>
                      <Text style={styles.stmtOutstandingValue} allowFontScaling={false}>${totalOutstanding.toFixed(2)}</Text>
                    </View>
                  </View>

                  <View style={[styles.modalActions, { borderTopWidth: 0, marginTop: 12 }]}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setStatementModalOpen(false)}>
                      <Text style={styles.cancelBtnText} allowFontScaling={false}>Close Statement</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.submitBtn} onPress={() => Alert.alert('Print Statement', 'Document sent to mobile printer successfully.')}>
                      <Ionicons name="print-outline" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                      <Text style={styles.submitBtnText} allowFontScaling={false}>Print Statement</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              );
            })() : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  errorLabel: { color: '#ef4444', fontSize: 10.5, marginTop: 4, fontWeight: '700' },
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
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 11.5, color: colors.textSecondary, marginTop: 4, lineHeight: 15 },

  // Tab switcher
  tabRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 4, marginTop: 12 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabItemActive: { backgroundColor: '#38bdf8' },
  tabItemText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  tabItemTextActive: { color: '#0f172a', fontWeight: '800' },

  // Search input and buttons
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  addBtnText: { color: '#0f172a', fontSize: 12.5, fontWeight: '800', marginLeft: 2 },

  // Records card layouts
  recordsCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  coaNum: { fontSize: 11, fontWeight: '800', color: '#38bdf8', letterSpacing: 0.5, marginBottom: 2 },
  recordLabel: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary },
  recordValue: { fontSize: 15, fontWeight: '900' },
  recordSubText: { fontSize: 12, color: colors.textSecondary },
  recordSubTextVal: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 3 },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  // Ledger elements
  ledgerDesc: { fontSize: 12.5, color: colors.textSecondary, marginTop: 6 },
  ledgerGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  ledgerGridItem: { flex: 1, alignItems: 'flex-start' },
  ledgerGridLabel: { fontSize: 8.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
  ledgerGridVal: { fontSize: 12.5, fontWeight: '800', marginTop: 2 },

  centerLoading: { paddingVertical: 80, alignItems: 'center' },
  loadingText: { color: colors.textSecondary, fontSize: 13, marginTop: 8 },
  emptyView: { backgroundColor: colors.surface, borderRadius: 14, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  emptyText: { color: colors.textSecondary, fontSize: 13 },

  // Modals Styles
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
  modalForm: { marginBottom: 16 },
  formSectionTitle: { fontSize: 10, fontWeight: '800', color: '#38bdf8', letterSpacing: 0.8, marginTop: 14, marginBottom: 8 },
  formLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, marginTop: 10, marginBottom: 4 },
  formInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 10,
    color: colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    fontWeight: '700',
    marginBottom: 10,
  },
  formPickerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: 10,
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
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: 10,
  },
  subtotalBox: {
    backgroundColor: colors.inputBackground,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginVertical: 12,
  },
  subtotalLabel: { fontSize: 12, color: colors.textSecondary },
  subtotalVal: { fontSize: 12, color: colors.textPrimary, fontWeight: '700' },
  totalLabel: { fontSize: 13, color: colors.textPrimary, fontWeight: '800' },
  totalVal: { fontSize: 14.5, color: '#38bdf8', fontWeight: '900' },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 16,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.buttonSecondary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '800' },
  submitBtn: {
    flex: 1.5,
    backgroundColor: '#38bdf8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnText: { color: '#0f172a', fontSize: 13, fontWeight: '800' },

  // Picker modal styling
  pickerModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: '80%',
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pickerModalTitle: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  pickerOptionRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  pickerOptionText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  closePickerBtn: {
    marginTop: 14,
    paddingVertical: 10,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    alignItems: 'center',
  },
  closePickerBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },

  // Statement specific styles
  stmtHeaderCard: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  stmtBadgeText: { fontSize: 8.5, fontWeight: '900', color: '#38bdf8', letterSpacing: 0.8, marginBottom: 4 },
  stmtCompanyName: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary },
  stmtCompanyAddress: { fontSize: 10.5, color: colors.textSecondary },
  stmtRecipientBox: { alignItems: 'flex-end', flex: 1, marginLeft: 8 },
  stmtRecipientLabel: { fontSize: 8, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 3 },
  stmtRecipientName: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  stmtRecipientContact: { fontSize: 10, color: colors.textSecondary },
  stmtRecipientLocation: { fontSize: 10, color: colors.textSecondary, fontWeight: 'bold', marginTop: 2 },
  stmtTableContainer: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    marginBottom: 16,
  },
  stmtTableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  stmtTableHeaderCol: { fontSize: 8.5, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
  stmtTableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
    alignItems: 'center',
  },
  stmtTableColText: { fontSize: 10.5, color: colors.textSecondary },
  stmtFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  stmtGeneratedText: { fontSize: 9.5, color: colors.textMuted },
  stmtOutstandingLabel: { fontSize: 8, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
  stmtOutstandingValue: { fontSize: 15, fontWeight: '900', color: '#10b981', marginTop: 2 },

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
    fontSize: 12.5,
    fontWeight: '600',
  },
  inlineDropdownTextActive: {
    color: '#38bdf8',
    fontWeight: '800',
  },
});

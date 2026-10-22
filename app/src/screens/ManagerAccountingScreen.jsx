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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../api/client';

export const ManagerAccountingScreen = ({ initialTab = 'coa' }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';

  // Sub-tab: 'dashboard' | 'coa' | 'income' | 'expenses'
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Decode JWT companyId helper if not directly on user object
  const decodeJwtCompanyId = (token) => {
    try {
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let str = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (str.length % 4) str += '=';
      let output = '';
      for (let bc = 0, bs = 0, buffer, idx = 0; (buffer = str.charAt(idx++)); ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4) ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))) : 0) {
        buffer = chars.indexOf(buffer);
      }
      const payload = JSON.parse(output);
      return payload.companyId || null;
    } catch {
      return null;
    }
  };

  const getActiveCompanyId = () => {
    if (!user) return null;
    if (user.companyId) return user.companyId;
    if (user.user?.companyId) return user.user.companyId;
    return decodeJwtCompanyId(user.token || user.accessToken);
  };

  const isDemoManager = () => {
    if (!user) return false;
    const email = (user.email || user.user?.email || '').toLowerCase();
    const companyName = (user.companyName || user.company?.name || user.user?.companyName || '').toLowerCase();
    return email === 'admin@apexpm.com' || email === 'manager@apexpm.com' || (companyName.includes('apex') && !email.includes('divine'));
  };

  const DEMO_COA_NAMES = [
    'Operating Checking Account',
    'Security Deposit Escrow Account',
    'Accounts Payable (AP)',
    'Tenant Security Deposit Liability',
    "Owner's Equity Capital",
    'Rental Revenue Income',
    'Late Fee & Penalty Income',
    'Application & Screening Fee Income',
    'Maintenance & Repair Expense',
    'Property Insurance Expense',
    'Management & Administrative Fee',
  ];

  // Lists state
  const [coaList, setCoaList] = useState([]);
  const [incomeList, setIncomeList] = useState([]);
  const [expenseList, setExpenseList] = useState([]);

  // Fetch dropdown collections
  const [properties, setProperties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [staff, setStaff] = useState([]);
  const [owners, setOwners] = useState([]);
  const [vendors, setVendors] = useState([]);

  // Dropdowns definitions matching Web Frontend exactly
  const INCOME_SOURCE_TYPES = [
    { value: 'Tenant', label: 'Tenant / Resident' },
    { value: 'Owner', label: 'Property Owner (Contribution)' },
    { value: 'Miscellaneous', label: 'Miscellaneous / Vending / Other' },
  ];

  const INCOME_CATEGORIES = [
    { value: 'Rent', label: 'Rent Revenue' },
    { value: 'Utilities', label: 'Utilities Reimbursement' },
    { value: 'Late Fees', label: 'Late Fees Penalty' },
    { value: 'Parking', label: 'Parking Space Rent' },
    { value: 'Storage', label: 'Storage Lockers Rent' },
    { value: 'Pet Fees', label: 'Pet Rent Fee' },
  ];

  const EXPENSE_PAYEE_TYPES = [
    { value: 'VendorMaintenance', label: 'Vendor / Staff Payee' },
    { value: 'Tenant', label: 'Tenant (Refund / Return)' },
    { value: 'Owner', label: 'Property Owner (Distribution)' },
  ];

  const EXPENSE_CATEGORIES = [
    { value: 'Repairs', label: 'Repairs & Diagnostics' },
    { value: 'Maintenance', label: 'General Maintenance' },
    { value: 'Utilities', label: 'Public Utilities' },
    { value: 'Insurance', label: 'Property Insurance Premium' },
    { value: 'Property Taxes', label: 'Property Taxes Levies' },
    { value: 'Payroll', label: 'Staff Payroll' },
    { value: 'Landscaping', label: 'Landscaping Servicing' },
    { value: 'Office', label: 'Office Supplies & Tools' },
  ];

  // Loading states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // 1. CoA Creator form states
  const [createCoaOpen, setCreateCoaOpen] = useState(false);
  const [coaNumber, setCoaNumber] = useState('');
  const [coaName, setCoaName] = useState('');
  const [coaType, setCoaType] = useState('Assets');
  const [coaBalance, setCoaBalance] = useState('');

  // 2. Income Creator form states (Matching web screenshot fields)
  const [createIncomeOpen, setCreateIncomeOpen] = useState(false);
  const [incomeSourceType, setIncomeSourceType] = useState('Tenant');
  const [incomeTenantId, setIncomeTenantId] = useState('');
  const [incomeOwnerId, setIncomeOwnerId] = useState('');
  const [incomeMiscDesc, setIncomeMiscDesc] = useState('');
  const [incomePropertyId, setIncomePropertyId] = useState('');
  const [incomeBuildingId, setIncomeBuildingId] = useState('');
  const [incomeUnitId, setIncomeUnitId] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('Rent');
  const [incomeAmount, setIncomeAmount] = useState('150');

  // 3. Expense Creator form states (Matching web screenshot fields)
  const [createExpenseOpen, setCreateExpenseOpen] = useState(false);
  const [expensePayeeType, setExpensePayeeType] = useState('VendorMaintenance');
  const [expenseVendorId, setExpenseVendorId] = useState('');
  const [expenseTenantId, setExpenseTenantId] = useState('');
  const [expenseOwnerId, setExpenseOwnerId] = useState('');
  const [expensePropertyId, setExpensePropertyId] = useState('');
  const [expenseBuildingId, setExpenseBuildingId] = useState('');
  const [expenseUnitId, setExpenseUnitId] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Maintenance');
  const [expenseAmount, setExpenseAmount] = useState('250');

  // Universal Picker Options Modal state
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [activePicker, setActivePicker] = useState(null); // 'property' | 'building' | 'unit' | 'tenant' | 'vendor' | 'owner' | 'incomeSourceType' | 'expensePayeeType' | 'coaType' | 'incomeCat' | 'expenseCat'

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

  // 1. Fetch Chart of Accounts - EXACT SAME API & LOGIC AS WEB APP (Frontend api.accounts.getAll)
  const fetchCoaList = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [accountsRes, incomeRes, payRes, expRes] = await Promise.all([
        apiClient.get('/accounting/accounts', logout, refreshAccessToken).catch(() => []),
        apiClient.get('/portal/income', logout, refreshAccessToken).catch(() => []),
        apiClient.get('/payments', logout, refreshAccessToken).catch(() => apiClient.get('/portal/payments', logout, refreshAccessToken).catch(() => [])),
        apiClient.get('/portal/expenses', logout, refreshAccessToken).catch(() => []),
      ]);

      const rawAccounts = Array.isArray(accountsRes) ? accountsRes : (accountsRes?.data || []);
      const liveIncome = Array.isArray(incomeRes) ? incomeRes : (incomeRes?.data || []);
      const livePayments = (Array.isArray(payRes) ? payRes : (payRes?.data || [])).filter((p) => p.status === 'Paid');
      const liveExpenses = Array.isArray(expRes) ? expRes : (expRes?.data || []);

      const isDemo = isDemoManager();
      const userCompanyId = getActiveCompanyId();

      let userCreatedIds = [];
      let deletedCoaIds = [];
      try {
        const uStr = await AsyncStorage.getItem('user_created_coa_ids');
        if (uStr) userCreatedIds = JSON.parse(uStr);
      } catch {}
      try {
        const dStr = await AsyncStorage.getItem('deleted_coa_ids');
        if (dStr) deletedCoaIds = JSON.parse(dStr);
      } catch {}

      // If NOT demo manager, new managers/companies must see clean empty CoA until they create accounts (Matching Web Frontend)
      const filteredDbAccounts = rawAccounts.filter((a) => {
        if (deletedCoaIds.includes(a.id)) return false;
        if (userCreatedIds.includes(a.id)) return true;
        if (!isDemo && DEMO_COA_NAMES.includes(a.accountName)) return false;
        if (userCompanyId && a.companyId && a.companyId !== userCompanyId) return false;
        return true;
      });

      const mappedDbAccounts = filteredDbAccounts.map((a) => ({
        id: a.id,
        companyId: a.companyId,
        accountNumber: a.accountCode || a.accountNumber || '',
        accountName: a.accountName || '',
        accountType: a.type === 'Asset' ? 'Assets' : a.type === 'Revenue' ? 'Income' : a.type === 'Expense' ? 'Expenses' : (a.type || a.accountType || 'Assets'),
        balance: Number(a.balance) || 0,
        status: a.isActive !== false ? 'Active' : 'Inactive',
      }));

      // Standard category mappings to CoA codes and descriptive titles (matching Web App 1-to-1)
      const INCOME_MAPPINGS = {
        'Rent': { code: '4010', name: 'Rental Revenue Income' },
        'Late Fees': { code: '4020', name: 'Late Fees & Penalty Income' },
        'Parking': { code: '4030', name: 'Parking Space Income' },
        'Utilities': { code: '4040', name: 'Utilities Reimbursement' },
        'Storage': { code: '4050', name: 'Storage Lockers Income' },
        'Pet Fees': { code: '4060', name: 'Pet Rent Fee Income' },
      };

      const EXPENSE_MAPPINGS = {
        'Maintenance': { code: '5010', name: 'General Maintenance Expense' },
        'Repairs': { code: '5020', name: 'Repairs & Diagnostics Expense' },
        'Utilities': { code: '5030', name: 'Public Utilities Expense' },
        'Insurance': { code: '5040', name: 'Property Insurance Expense' },
        'Property Taxes': { code: '5050', name: 'Property Taxes Expense' },
        'Payroll': { code: '5060', name: 'Staff Payroll Expense' },
        'Landscaping': { code: '5070', name: 'Landscaping Expense' },
        'Office': { code: '5080', name: 'Office Supplies Expense' },
      };

      // Filter live income transactions by company and demo properties
      const scopedIncome = liveIncome.filter((i) => {
        let parsed = {};
        try { parsed = typeof i.description === 'string' ? JSON.parse(i.description) : (i.description || {}); } catch { parsed = {}; }
        if (userCompanyId && parsed.companyId && parsed.companyId !== userCompanyId) return false;
        if (!isDemo && ['Sunset Heights', 'Highland Tower', 'Grand View Apartments', 'Property'].includes(parsed.propertyName) && !parsed.propertyId) return false;
        return true;
      });

      // Filter live payments
      const scopedPayments = livePayments.filter((p) => {
        if (userCompanyId && p.companyId && p.companyId !== userCompanyId) return false;
        return true;
      });

      // Filter live expenses by company and demo properties
      const scopedExpenses = liveExpenses.filter((e) => {
        let parsed = {};
        try { parsed = typeof e.description === 'string' ? JSON.parse(e.description) : (e.description || {}); } catch { parsed = {}; }
        if (userCompanyId && parsed.companyId && parsed.companyId !== userCompanyId) return false;
        if (!isDemo && ['Sunset Heights', 'Highland Tower', 'Grand View Apartments', 'Property'].includes(parsed.propertyName) && !parsed.propertyId) return false;
        return true;
      });

      const incomeTotalsByCategory = {};
      for (const inc of scopedIncome) {
        const cat = inc.category || 'Rent';
        incomeTotalsByCategory[cat] = (incomeTotalsByCategory[cat] || 0) + (Number(inc.amount) || 0);
      }
      for (const pay of scopedPayments) {
        incomeTotalsByCategory['Rent'] = (incomeTotalsByCategory['Rent'] || 0) + (Number(pay.amount) || 0);
      }

      const expenseTotalsByCategory = {};
      for (const exp of scopedExpenses) {
        const cat = exp.category || 'Maintenance';
        expenseTotalsByCategory[cat] = (expenseTotalsByCategory[cat] || 0) + (Number(exp.amount) || 0);
      }

      let dynamicIncomeCodeIdx = 100;
      const derivedIncomeAccounts = [];
      for (const [cat, totalAmount] of Object.entries(incomeTotalsByCategory)) {
        if (totalAmount <= 0) continue;
        const mapping = INCOME_MAPPINGS[cat];
        const accNumber = mapping ? mapping.code : `4${dynamicIncomeCodeIdx++}`;
        const accName = mapping ? mapping.name : (cat.toLowerCase().includes('income') ? cat : `${cat} Income`);
        const accountId = `coa-income-${cat.toLowerCase().replace(/\s+/g, '-')}`;

        if (deletedCoaIds.includes(accountId)) continue;

        const existing = mappedDbAccounts.find((a) =>
          a.accountNumber === accNumber ||
          a.accountName.toLowerCase() === accName.toLowerCase() ||
          a.accountName.toLowerCase() === cat.toLowerCase()
        );

        if (existing) {
          existing.balance = (existing.balance || 0) + totalAmount;
        } else {
          derivedIncomeAccounts.push({
            id: accountId,
            accountNumber: accNumber,
            accountName: accName,
            accountType: 'Income',
            balance: totalAmount,
            status: 'Active',
          });
        }
      }

      let dynamicExpenseCodeIdx = 100;
      const derivedExpenseAccounts = [];
      for (const [cat, totalAmount] of Object.entries(expenseTotalsByCategory)) {
        if (totalAmount <= 0) continue;
        const mapping = EXPENSE_MAPPINGS[cat];
        const accNumber = mapping ? mapping.code : `5${dynamicExpenseCodeIdx++}`;
        const accName = mapping ? mapping.name : (cat.toLowerCase().includes('expense') ? cat : `${cat} Expense`);
        const accountId = `coa-expense-${cat.toLowerCase().replace(/\s+/g, '-')}`;

        if (deletedCoaIds.includes(accountId)) continue;

        const existing = mappedDbAccounts.find((a) =>
          a.accountNumber === accNumber ||
          a.accountName.toLowerCase() === accName.toLowerCase() ||
          a.accountName.toLowerCase() === cat.toLowerCase()
        );

        if (existing) {
          existing.balance = (existing.balance || 0) + totalAmount;
        } else {
          derivedExpenseAccounts.push({
            id: accountId,
            accountNumber: accNumber,
            accountName: accName,
            accountType: 'Expenses',
            balance: totalAmount,
            status: 'Active',
          });
        }
      }

      const combinedAccounts = [...mappedDbAccounts, ...derivedIncomeAccounts, ...derivedExpenseAccounts];
      combinedAccounts.sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''));

      setCoaList(combinedAccounts);
    } catch (e) {
      console.log('Failed fetching CoA:', e.message);
      setCoaList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // 2. Fetch Income Transactions (using same API path as web: /portal/income)
  const fetchIncomeTransactions = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/portal/income', logout, refreshAccessToken);
      const rawList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      const isDemo = isDemoManager();
      const userCompanyId = getActiveCompanyId();

      const filteredList = rawList.filter((i) => {
        let parsed = {};
        try {
          parsed = typeof i.description === 'string' ? JSON.parse(i.description) : (i.description || {});
        } catch {
          parsed = {};
        }
        if (userCompanyId && parsed.companyId && parsed.companyId !== userCompanyId) return false;
        if (!isDemo && ['Sunset Heights', 'Highland Tower', 'Grand View Apartments', 'Property'].includes(parsed.propertyName) && !parsed.propertyId) return false;
        return true;
      });

      const parsedList = filteredList.map((i) => {
        let parsed = { propertyName: 'Property', tenantName: 'Resident', propertyId: '', buildingId: '', unitId: '', sourceType: 'Tenant', sourceId: '' };
        try {
          parsed = typeof i.description === 'string' ? JSON.parse(i.description) : (i.description || {});
        } catch {
          parsed.propertyName = i.description || 'Property';
        }
        return {
          id: i.id,
          category: i.category || 'Rent Revenue',
          amount: i.amount || 0,
          clearingDate: i.date ? i.date.split('T')[0] : 'N/A',
          residentName: parsed.tenantName || i.tenantName || 'Resident',
          propertyLocation: parsed.propertyName || i.propertyName || 'Property',
          status: i.status || 'Cleared'
        };
      });
      setIncomeList(parsedList);
    } catch (e) {
      console.log('Failed fetching incomes:', e.message);
      setIncomeList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // 3. Fetch Expenses Tracker (using same API path as web: /portal/expenses)
  const fetchExpensesList = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/portal/expenses', logout, refreshAccessToken);
      const rawList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      const isDemo = isDemoManager();
      const userCompanyId = getActiveCompanyId();

      const filteredList = rawList.filter((e) => {
        let parsed = {};
        try {
          parsed = typeof e.description === 'string' ? JSON.parse(e.description) : (e.description || {});
        } catch {
          parsed = {};
        }
        if (userCompanyId && parsed.companyId && parsed.companyId !== userCompanyId) return false;
        if (!isDemo && ['Sunset Heights', 'Highland Tower', 'Grand View Apartments', 'Property'].includes(parsed.propertyName) && !parsed.propertyId) return false;
        return true;
      });

      const parsedList = filteredList.map((e) => {
        let parsed = { vendorName: 'Vendor', propertyName: 'Property', propertyId: '', buildingId: '', unitId: '', payeeType: 'Vendor', payeeId: '' };
        try {
          parsed = typeof e.description === 'string' ? JSON.parse(e.description) : (e.description || {});
        } catch {
          parsed.vendorName = e.description || 'Vendor';
        }
        return {
          id: e.id,
          category: e.category || 'General Maintenance',
          amountPaid: e.amount || 0,
          expenseDate: e.date ? e.date.split('T')[0] : 'N/A',
          vendorPartner: parsed.vendorName || e.vendorName || 'Vendor',
          propertyLocation: parsed.propertyName || e.propertyName || 'Property',
          status: 'Cleared',
          approvalAction: 'Audited'
        };
      });
      setExpenseList(parsedList);
    } catch (e) {
      console.log('Failed fetching expenses:', e.message);
      setExpenseList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // 4. Fetch dropdown choices (Cascading selections)
  const fetchOptions = async () => {
    try {
      const [props, bldgs, unts, tnts, staffRes, ownersRes, vendorsRes] = await Promise.all([
        apiClient.get('/properties', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/buildings', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/units', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/tenants', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/superadmin/company-users', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/owners', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/vendors', logout, refreshAccessToken).catch(() => null),
      ]);
      if (props?.data || props) setProperties(Array.isArray(props?.data) ? props.data : (Array.isArray(props) ? props : []));
      if (bldgs?.data || bldgs) setBuildings(Array.isArray(bldgs?.data) ? bldgs.data : (Array.isArray(bldgs) ? bldgs : []));

      const rawUnits = Array.isArray(unts?.data) ? unts.data : (Array.isArray(unts) ? unts : []);
      const normalizedUnits = rawUnits.map((u) => ({
        ...u,
        id: u.id,
        unitNumber: u.unitNumber || u.number || 'Unit',
        propertyId: u.propertyId || u.property?.id || '',
        buildingId: u.buildingId || u.building?.id || '',
        status: u.status || 'Occupied',
      }));
      setUnits(normalizedUnits);

      const rawTenants = Array.isArray(tnts?.data) ? tnts.data : (Array.isArray(tnts) ? tnts : []);
      const normalizedTenants = rawTenants.map((t) => {
        const uId = t.unitId || t.unit?.id || '';
        const matchingUnit = normalizedUnits.find(u => u.id === uId);
        const pId = t.propertyId || t.unit?.propertyId || t.unit?.property?.id || matchingUnit?.propertyId || '';
        const bId = t.buildingId || t.unit?.buildingId || matchingUnit?.buildingId || '';
        const uNum = t.unit?.unitNumber || matchingUnit?.unitNumber || t.unitNumber || '';
        const fName = t.firstName || '';
        const lName = t.lastName || '';
        const fullName = `${fName} ${lName}`.trim() || t.name || 'Tenant';
        return {
          ...t,
          id: t.id,
          firstName: fName,
          lastName: lName,
          name: fullName,
          unitId: uId,
          propertyId: pId,
          buildingId: bId,
          unitNumber: uNum,
        };
      });
      setTenants(normalizedTenants);
      
      const staffList = staffRes?.data || staffRes || [];
      const filteredStaff = Array.isArray(staffList) ? staffList.filter(u => u.role === 'Maintenance Staff' || u.role === 'Maintenance') : [];
      setStaff(filteredStaff);

      const rawOwners = Array.isArray(ownersRes) ? ownersRes : (ownersRes?.data || []);
      setOwners(rawOwners);

      const rawVendors = Array.isArray(vendorsRes) ? vendorsRes : (vendorsRes?.data || []);
      setVendors(rawVendors);
    } catch (e) {
      console.log('Failed loading selections:', e.message);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    setSearchQuery('');
    setSelectedType('');
    if (activeTab === 'dashboard') {
      fetchCoaList(false);
      fetchIncomeTransactions(false);
      fetchExpensesList(false);
    } else if (activeTab === 'coa') {
      fetchCoaList();
    } else if (activeTab === 'income') {
      fetchIncomeTransactions();
    } else if (activeTab === 'expenses') {
      fetchExpensesList();
    }
  }, [activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'dashboard') {
      fetchCoaList(false);
      fetchIncomeTransactions(false);
      fetchExpensesList(false);
    } else if (activeTab === 'coa') {
      fetchCoaList(false);
    } else if (activeTab === 'income') {
      fetchIncomeTransactions(false);
    } else if (activeTab === 'expenses') {
      fetchExpensesList(false);
    }
  };

  // Submissions

  // A. Create Chart Account (Exact API /accounting/accounts matching web app)
  const handleCreateAccount = async () => {
    if (!coaNumber.trim() || !coaName.trim()) {
      Alert.alert('Validation Error', 'Account Number and Name are required.');
      return;
    }

    try {
      setSubmitting(true);
      const mappedType =
        coaType === 'Assets' ? 'Asset' :
        coaType === 'Liabilities' ? 'Liability' :
        coaType === 'Equity' ? 'Equity' :
        coaType === 'Income' ? 'Revenue' :
        coaType === 'Expenses' ? 'Expense' : coaType;

      const payload = {
        accountCode: coaNumber.trim(),
        accountNumber: coaNumber.trim(),
        accountName: coaName.trim(),
        type: mappedType,
        accountType: coaType,
        balance: parseFloat(coaBalance) || 0,
      };
      const createdRes = await apiClient.post('/accounting/accounts', payload, logout, refreshAccessToken);
      if (createdRes?.data?.id || createdRes?.id) {
        const newId = createdRes?.data?.id || createdRes?.id;
        try {
          const uStr = await AsyncStorage.getItem('user_created_coa_ids');
          const ids = uStr ? JSON.parse(uStr) : [];
          if (!ids.includes(newId)) {
            ids.push(newId);
            await AsyncStorage.setItem('user_created_coa_ids', JSON.stringify(ids));
          }
        } catch {}
      }
      Alert.alert('Success', 'Chart of Account created successfully.');
      setCreateCoaOpen(false);
      setCoaNumber('');
      setCoaName('');
      setCoaBalance('');
      fetchCoaList(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create chart of account.');
    } finally {
      setSubmitting(false);
    }
  };

  // B. Delete Chart Account
  const handleDeleteAccount = async (id, name) => {
    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (id && !id.startsWith('coa-income-') && !id.startsWith('coa-expense-')) {
                await apiClient.delete(`/accounting/accounts/${id}`, logout, refreshAccessToken);
              }
              try {
                const dStr = await AsyncStorage.getItem('deleted_coa_ids');
                const ids = dStr ? JSON.parse(dStr) : [];
                if (!ids.includes(id)) {
                  ids.push(id);
                  await AsyncStorage.setItem('deleted_coa_ids', JSON.stringify(ids));
                }
              } catch {}
              setCoaList((prev) => prev.filter((x) => x.id !== id));
              Alert.alert('Success', 'Account deleted successfully.');
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to delete account.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteIncome = (id, residentName) => {
    Alert.alert(
      'Delete Income Entry',
      `Are you sure you want to remove this record?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/portal/income/${id}`, logout, refreshAccessToken);
              setIncomeList((prev) => prev.filter((x) => x.id !== id));
              Alert.alert('Deleted', 'Income record deleted.');
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to delete income.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteExpense = (id, vendorName) => {
    Alert.alert(
      'Delete Expense Entry',
      `Are you sure you want to remove this record?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/portal/expenses/${id}`, logout, refreshAccessToken);
              setExpenseList((prev) => prev.filter((x) => x.id !== id));
              Alert.alert('Deleted', 'Expense record deleted.');
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to delete expense.');
            }
          },
        },
      ]
    );
  };

  // C. Record Miscellaneous Income (Uses web payload structures exactly)
  const handleSaveIncome = async () => {
    if (!incomeAmount || isNaN(parseFloat(incomeAmount)) || parseFloat(incomeAmount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }

    try {
      setSubmitting(true);
      let resolvedName = '';
      let sourceId = '';
      let resolvedPropertyId = '';
      let resolvedBuildingId = '';
      let resolvedUnitId = '';

      if (incomeSourceType === 'Tenant') {
        if (!incomeTenantId) {
          Alert.alert('Validation Error', 'Please select a Resident / Tenant.');
          setSubmitting(false);
          return;
        }
        const tenant = tenants.find((t) => t.id === incomeTenantId);
        resolvedName = tenant ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || tenant.name || 'Tenant' : 'Tenant';
        sourceId = incomeTenantId;
        resolvedPropertyId = tenant ? tenant.propertyId || '' : '';
        resolvedUnitId = tenant ? tenant.unitId || '' : '';
        if (tenant && tenant.unitId) {
          const matchingUnit = units.find((u) => u.id === tenant.unitId);
          resolvedBuildingId = matchingUnit ? matchingUnit.buildingId || '' : '';
        }
      } else if (incomeSourceType === 'Owner') {
        if (!incomeOwnerId) {
          Alert.alert('Validation Error', 'Please select a Property Owner.');
          setSubmitting(false);
          return;
        }
        if (!incomePropertyId) {
          Alert.alert('Validation Error', 'Please select a Property.');
          setSubmitting(false);
          return;
        }
        const owner = owners.find((o) => o.id === incomeOwnerId);
        resolvedName = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.name || 'Owner' : 'Owner';
        sourceId = incomeOwnerId;
        resolvedPropertyId = incomePropertyId;
        resolvedBuildingId = '';
        resolvedUnitId = '';
      } else {
        if (!incomeMiscDesc.trim()) {
          Alert.alert('Validation Error', 'Please enter a Source / Payee Name.');
          setSubmitting(false);
          return;
        }
        if (!incomePropertyId) {
          Alert.alert('Validation Error', 'Please select a Property.');
          setSubmitting(false);
          return;
        }
        resolvedName = incomeMiscDesc.trim();
        resolvedPropertyId = incomePropertyId;
        resolvedBuildingId = incomeBuildingId;
        resolvedUnitId = incomeUnitId;
      }

      const chosenProp = properties.find((p) => p.id === resolvedPropertyId);

      const description = JSON.stringify({
        propertyName: chosenProp ? chosenProp.name : 'Property',
        tenantName: resolvedName,
        propertyId: resolvedPropertyId,
        buildingId: resolvedBuildingId,
        unitId: resolvedUnitId,
        sourceType: incomeSourceType,
        sourceId,
        companyId: getActiveCompanyId() || '',
      });

      await apiClient.post(
        '/portal/income',
        {
          category: incomeCategory,
          amount: parseFloat(incomeAmount),
          date: new Date().toISOString().split('T')[0],
          description,
        },
        logout,
        refreshAccessToken
      );

      Alert.alert('Success', 'Miscellaneous Income recorded successfully.');
      setCreateIncomeOpen(false);
      setIncomeAmount('150');
      setIncomeMiscDesc('');
      setIncomeTenantId('');
      setIncomeOwnerId('');
      setIncomePropertyId('');
      setIncomeBuildingId('');
      setIncomeUnitId('');
      setIncomeSourceType('Tenant');
      setIncomeCategory('Rent');
      fetchIncomeTransactions(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to record income.');
    } finally {
      setSubmitting(false);
    }
  };

  // D. Record Expense (Uses web payload structures exactly)
  const handleSaveExpense = async () => {
    if (!expenseAmount || isNaN(parseFloat(expenseAmount)) || parseFloat(expenseAmount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }

    try {
      setSubmitting(true);
      let payeeName = '';
      let payeeId = '';
      let resolvedPropertyId = '';
      let resolvedBuildingId = '';
      let resolvedUnitId = '';
      let finalPayeeType = 'Vendor';

      if (expensePayeeType === 'VendorMaintenance') {
        if (!expenseVendorId) {
          Alert.alert('Validation Error', 'Please select a Payee.');
          setSubmitting(false);
          return;
        }
        if (!expensePropertyId) {
          Alert.alert('Validation Error', 'Please select a Property.');
          setSubmitting(false);
          return;
        }

        resolvedPropertyId = expensePropertyId;
        resolvedBuildingId = expenseBuildingId;
        resolvedUnitId = expenseUnitId;

        if (expenseVendorId.startsWith('staff-')) {
          finalPayeeType = 'Maintenance';
          const staffId = expenseVendorId.replace('staff-', '');
          payeeId = staffId;
          const staffMember = staff.find((s) => s.id === staffId);
          payeeName = staffMember
            ? `${staffMember.firstName || ''} ${staffMember.lastName || ''}`.trim() || staffMember.name || 'Maintenance Staff'
            : 'Maintenance Staff';
        } else {
          finalPayeeType = 'Vendor';
          const vendorId = expenseVendorId.replace('vendor-', '');
          payeeId = vendorId;
          const vendor = vendors.find((v) => v.id === vendorId);
          payeeName = vendor ? vendor.name || vendor.companyName || 'Vendor' : 'Vendor';
        }
      } else if (expensePayeeType === 'Tenant') {
        if (!expenseTenantId) {
          Alert.alert('Validation Error', 'Please select a Resident / Tenant.');
          setSubmitting(false);
          return;
        }
        finalPayeeType = 'Tenant';
        const tenant = tenants.find((t) => t.id === expenseTenantId);
        payeeName = tenant
          ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || tenant.name || 'Tenant'
          : 'Tenant';
        payeeName = `${payeeName} (Tenant)`;
        payeeId = expenseTenantId;
        resolvedPropertyId = tenant ? tenant.propertyId || '' : '';
        resolvedUnitId = tenant ? tenant.unitId || '' : '';
        if (tenant && tenant.unitId) {
          const matchingUnit = units.find((u) => u.id === tenant.unitId);
          resolvedBuildingId = matchingUnit ? matchingUnit.buildingId || '' : '';
        }
      } else if (expensePayeeType === 'Owner') {
        if (!expenseOwnerId) {
          Alert.alert('Validation Error', 'Please select a Property Owner.');
          setSubmitting(false);
          return;
        }
        if (!expensePropertyId) {
          Alert.alert('Validation Error', 'Please select a Property.');
          setSubmitting(false);
          return;
        }
        finalPayeeType = 'Owner';
        const owner = owners.find((o) => o.id === expenseOwnerId);
        payeeName = owner
          ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.name || 'Owner'
          : 'Owner';
        payeeName = `${payeeName} (Owner)`;
        payeeId = expenseOwnerId;
        resolvedPropertyId = expensePropertyId;
        resolvedBuildingId = '';
        resolvedUnitId = '';
      }

      const chosenProp = properties.find((p) => p.id === resolvedPropertyId);

      const description = JSON.stringify({
        vendorName: payeeName,
        propertyName: chosenProp ? chosenProp.name : 'Property',
        propertyId: resolvedPropertyId,
        buildingId: resolvedBuildingId,
        unitId: resolvedUnitId,
        payeeType: finalPayeeType,
        payeeId,
        companyId: getActiveCompanyId() || '',
      });

      await apiClient.post(
        '/portal/expenses',
        {
          category: expenseCategory,
          amount: parseFloat(expenseAmount),
          date: new Date().toISOString().split('T')[0],
          description,
        },
        logout,
        refreshAccessToken
      );

      Alert.alert('Success', 'Expense recorded successfully.');
      setCreateExpenseOpen(false);
      setExpenseAmount('250');
      setExpenseVendorId('');
      setExpenseTenantId('');
      setExpenseOwnerId('');
      setExpensePropertyId('');
      setExpenseBuildingId('');
      setExpenseUnitId('');
      setExpensePayeeType('VendorMaintenance');
      setExpenseCategory('Maintenance');
      fetchExpensesList(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  // Dynamic Picker Options list compiler
  const getPickerTitle = () => {
    switch (activePicker) {
      case 'incomeSourceType': return 'Select Source Type';
      case 'expensePayeeType': return 'Select Payee Type';
      case 'property': return 'Select Property Portfolio';
      case 'building': return 'Select Building';
      case 'unit': return 'Select Rentable Unit';
      case 'tenant': return 'Select Resident / Tenant Payee';
      case 'owner': return 'Select Property Owner';
      case 'vendor': return 'Select Payee (Staff / Vendor)';
      case 'coaType': return 'Select Account Type';
      case 'incomeCat': return 'Select Income Category';
      case 'expenseCat': return 'Select Expense Category';
      default: return 'Select Option';
    }
  };

  const isOptionSelected = (val) => {
    if (activePicker === 'incomeSourceType') return incomeSourceType === val;
    if (activePicker === 'expensePayeeType') return expensePayeeType === val;
    if (activePicker === 'incomeCat') return incomeCategory === val;
    if (activePicker === 'expenseCat') return expenseCategory === val;
    if (activePicker === 'coaType') return coaType === val;
    if (createIncomeOpen) {
      if (activePicker === 'property') return incomePropertyId === val;
      if (activePicker === 'building') return incomeBuildingId === val;
      if (activePicker === 'unit') return incomeUnitId === val;
      if (activePicker === 'tenant') return incomeTenantId === val;
      if (activePicker === 'owner') return incomeOwnerId === val;
    }
    if (createExpenseOpen) {
      if (activePicker === 'property') return expensePropertyId === val;
      if (activePicker === 'building') return expenseBuildingId === val;
      if (activePicker === 'unit') return expenseUnitId === val;
      if (activePicker === 'vendor') return expenseVendorId === val;
      if (activePicker === 'tenant') return expenseTenantId === val;
      if (activePicker === 'owner') return expenseOwnerId === val;
    }
    return false;
  };

  const getPickerOptions = () => {
    switch (activePicker) {
      case 'incomeSourceType':
        return INCOME_SOURCE_TYPES;

      case 'expensePayeeType':
        return EXPENSE_PAYEE_TYPES;

      case 'property': {
        if (createIncomeOpen && incomeSourceType === 'Owner' && incomeOwnerId) {
          const ownedProps = properties.filter(p => p.ownerId === incomeOwnerId);
          if (ownedProps.length > 0) return ownedProps.map(p => ({ value: p.id, label: p.name }));
        }
        if (createExpenseOpen && expensePayeeType === 'Owner' && expenseOwnerId) {
          const ownedProps = properties.filter(p => p.ownerId === expenseOwnerId);
          if (ownedProps.length > 0) return ownedProps.map(p => ({ value: p.id, label: p.name }));
        }
        if (properties.length === 0) {
          return [{ value: '', label: 'No Properties Found' }];
        }
        return properties.map(p => ({ value: p.id, label: p.name }));
      }

      case 'building': {
        const activePropId = createIncomeOpen ? incomePropertyId : expensePropertyId;
        const filteredBldgs = activePropId ? buildings.filter(b => b.propertyId === activePropId) : buildings;
        if (filteredBldgs.length === 0) {
          return [{ value: '', label: 'No Buildings Found' }];
        }
        return filteredBldgs.map(b => ({ value: b.id, label: b.name || `Building` }));
      }

      case 'unit': {
        const actPropId = createIncomeOpen ? incomePropertyId : expensePropertyId;
        if (!actPropId) {
          return [{ value: '', label: 'Select Property Portfolio first...' }];
        }
        const filteredUnits = units.filter(u => u.propertyId === actPropId);
        if (filteredUnits.length === 0) {
          return [{ value: '', label: 'No Units found for this Property' }];
        }
        return filteredUnits.map(u => ({
          value: u.id,
          label: `Unit ${u.unitNumber}${u.status ? ` - ${u.status}` : ''}`
        }));
      }

      case 'tenant': {
        const assignedTenants = tenants.filter(t => t.unitId || t.unit?.id);
        const listToUse = assignedTenants.length > 0 ? assignedTenants : tenants;
        if (listToUse.length === 0) {
          return [{ value: '', label: 'No Tenants Found' }];
        }
        return listToUse.map(t => ({
          value: t.id,
          label: `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.name || 'Tenant',
        }));
      }

      case 'owner': {
        if (owners.length === 0) {
          return [{ value: '', label: 'No Owners Found' }];
        }
        return owners.map(o => ({
          value: o.id,
          label: `${o.firstName || ''} ${o.lastName || ''}`.trim() || o.name || 'Owner',
        }));
      }

      case 'vendor': {
        const staffOpts = staff.map(s => ({
          value: `staff-${s.id}`,
          label: `Staff: ${(`${s.firstName || ''} ${s.lastName || ''}`).trim() || s.name || 'Staff'}`
        }));
        const vendorOpts = vendors.map(v => ({
          value: `vendor-${v.id}`,
          label: `Vendor: ${v.name || v.companyName || 'Vendor'}`
        }));
        const combined = [...staffOpts, ...vendorOpts];
        if (combined.length > 0) return combined;
        return [
          { value: 'staff-maint-1', label: 'Staff: General Maintenance Team' },
          { value: 'vendor-pro-fix', label: 'Vendor: ProFix Solutions' },
          { value: 'vendor-apex-plumbing', label: 'Vendor: Apex Pro Plumbing & Maintenance Co.' },
          { value: 'vendor-pro-electric', label: 'Vendor: Pro Electrician Services Inc' },
          { value: 'vendor-metro-hvac', label: 'Vendor: Metro HVAC & Cooling Specialists' },
        ];
      }

      case 'coaType':
        return ['Assets', 'Liability', 'Equity', 'Income', 'Expenses'].map(t => ({ value: t, label: t }));

      case 'incomeCat':
        return INCOME_CATEGORIES;

      case 'expenseCat':
        return EXPENSE_CATEGORIES;

      default:
        return [];
    }
  };

  const handleSelectPickerOption = (val) => {
    if (!val) {
      setPickerModalOpen(false);
      return;
    }
    if (activePicker === 'incomeSourceType') {
      setIncomeSourceType(val);
      setIncomeTenantId('');
      setIncomeOwnerId('');
      setIncomeMiscDesc('');
      setIncomePropertyId('');
      setIncomeBuildingId('');
      setIncomeUnitId('');
    } else if (activePicker === 'expensePayeeType') {
      setExpensePayeeType(val);
      setExpenseVendorId('');
      setExpenseTenantId('');
      setExpenseOwnerId('');
      setExpensePropertyId('');
      setExpenseBuildingId('');
      setExpenseUnitId('');
    } else if (createIncomeOpen) {
      if (activePicker === 'tenant') {
        setIncomeTenantId(val);
        const t = tenants.find(item => item.id === val);
        if (t) {
          const uId = t.unitId || t.unit?.id || '';
          const matchingUnit = units.find(u => u.id === uId);
          const pId = t.propertyId || t.unit?.propertyId || matchingUnit?.propertyId || '';
          const bId = t.buildingId || t.unit?.buildingId || matchingUnit?.buildingId || '';
          setIncomePropertyId(pId);
          setIncomeUnitId(uId);
          setIncomeBuildingId(bId);
        }
      }
      if (activePicker === 'owner') {
        setIncomeOwnerId(val);
        const ownedProps = properties.filter(p => p.ownerId === val);
        if (ownedProps.length === 1) {
          setIncomePropertyId(ownedProps[0].id);
        } else {
          setIncomePropertyId('');
        }
        setIncomeUnitId('');
      }
      if (activePicker === 'property') {
        setIncomePropertyId(val);
        const matchingBld = buildings.find(b => b.propertyId === val);
        setIncomeBuildingId(matchingBld ? matchingBld.id : '');
        setIncomeUnitId('');
      }
      if (activePicker === 'building') {
        setIncomeBuildingId(val);
        setIncomeUnitId('');
      }
      if (activePicker === 'unit') {
        setIncomeUnitId(val);
      }
      if (activePicker === 'incomeCat') setIncomeCategory(val);
    } else if (createExpenseOpen) {
      if (activePicker === 'vendor') setExpenseVendorId(val);
      if (activePicker === 'tenant') {
        setExpenseTenantId(val);
        const t = tenants.find(item => item.id === val);
        if (t) {
          const uId = t.unitId || t.unit?.id || '';
          const matchingUnit = units.find(u => u.id === uId);
          const pId = t.propertyId || t.unit?.propertyId || matchingUnit?.propertyId || '';
          const bId = t.buildingId || t.unit?.buildingId || matchingUnit?.buildingId || '';
          setExpensePropertyId(pId);
          setExpenseUnitId(uId);
          setExpenseBuildingId(bId);
        }
      }
      if (activePicker === 'owner') {
        setExpenseOwnerId(val);
        const ownedProps = properties.filter(p => p.ownerId === val);
        if (ownedProps.length === 1) {
          setExpensePropertyId(ownedProps[0].id);
        } else {
          setExpensePropertyId('');
        }
        setExpenseUnitId('');
      }
      if (activePicker === 'property') {
        setExpensePropertyId(val);
        const matchingBld = buildings.find(b => b.propertyId === val);
        setExpenseBuildingId(matchingBld ? matchingBld.id : '');
        setExpenseUnitId('');
      }
      if (activePicker === 'building') {
        setExpenseBuildingId(val);
        setExpenseUnitId('');
      }
      if (activePicker === 'unit') setExpenseUnitId(val);
      if (activePicker === 'expenseCat') setExpenseCategory(val);
    } else {
      if (activePicker === 'coaType') setCoaType(val);
    }
    setPickerModalOpen(false);
  };

  // Render Universal Picker Overlay (Floating clean card on top of modal backdrop)
  const renderPickerOverlay = () => {
    if (!pickerModalOpen) return null;
    const options = getPickerOptions();
    return (
      <View style={styles.pickerBackdrop}>
        <View style={styles.pickerPopupCard}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle} allowFontScaling={false}>
              {getPickerTitle()}
            </Text>
            <TouchableOpacity
              style={styles.pickerCloseIcon}
              onPress={() => setPickerModalOpen(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.pickerScrollView}
            contentContainerStyle={{ paddingVertical: 4 }}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {options.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }} allowFontScaling={false}>
                  No options available
                </Text>
              </View>
            ) : (
              options.map((opt) => {
                const isSelected = isOptionSelected(opt.value);
                const isSelectable = Boolean(opt.value);
                return (
                  <TouchableOpacity
                    key={String(opt.value || opt.label)}
                    style={[styles.pickerOptionRow, isSelected && styles.pickerOptionRowSelected]}
                    onPress={() => isSelectable && handleSelectPickerOption(opt.value)}
                    activeOpacity={isSelectable ? 0.7 : 1}
                    disabled={!isSelectable}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        isSelected && styles.pickerOptionTextSelected,
                        !isSelectable && { color: colors.textSecondary, fontStyle: 'italic' },
                      ]}
                      allowFontScaling={false}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color="#38bdf8" />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.closePickerBtn}
            onPress={() => setPickerModalOpen(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.closePickerBtnText} allowFontScaling={false}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Filter listings
  const filteredCoA = coaList.filter(item => {
    const text = `${item.accountNumber || item.accountCode || ''} ${item.accountName || ''} ${item.accountType || item.type || ''}`.toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    const matchesType = selectedType ? (item.accountType || item.type || '').toLowerCase() === selectedType.toLowerCase() : true;
    return matchesSearch && matchesType;
  });

  const filteredIncome = incomeList.filter(item => {
    const text = `${item.residentName || ''} ${item.propertyLocation || ''} ${item.category || ''}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const filteredExpense = expenseList.filter(item => {
    const text = `${item.vendorPartner || ''} ${item.propertyLocation || ''} ${item.category || ''}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  // Location card resolver for dynamic display (Tenant Location - matching Web UI)
  const renderLocationCard = (tenantId) => {
    if (!tenantId) return null;
    const t = tenants.find(item => item.id === tenantId);
    if (!t) return null;

    const unitId = t.unitId || t.unit?.id;
    const unitObj = units.find(u => u.id === unitId) || (t.unit ? { unitNumber: t.unit.unitNumber, buildingId: t.unit.buildingId, propertyId: t.unit.propertyId } : null);
    const propId = t.propertyId || t.unit?.propertyId || unitObj?.propertyId;
    const prop = properties.find(p => p.id === propId);
    const bldgId = t.buildingId || unitObj?.buildingId;
    const bldg = buildings.find(b => b.id === bldgId);
    const unitDisplay = unitObj?.unitNumber ? `Unit ${unitObj.unitNumber}` : (t.unitNumber ? `Unit ${t.unitNumber}` : 'N/A');

    return (
      <View style={styles.associatedCard}>
        <View style={styles.associatedHeader}>
          <Ionicons name="person-circle-outline" size={14} color="#6366f1" />
          <Text style={styles.associatedTitle} allowFontScaling={false}>ASSOCIATED LOCATION DETAILS</Text>
        </View>
        <View style={styles.associatedRow}>
          <View style={styles.associatedCol}>
            <Text style={styles.associatedLabel} allowFontScaling={false}>PROPERTY</Text>
            <View style={styles.associatedValRow}>
              <Ionicons name="home-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.associatedVal} numberOfLines={1} allowFontScaling={false}>{prop ? prop.name : 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.associatedCol}>
            <Text style={styles.associatedLabel} allowFontScaling={false}>BUILDING</Text>
            <View style={styles.associatedValRow}>
              <Ionicons name="business-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.associatedVal} numberOfLines={1} allowFontScaling={false}>{bldg ? bldg.name : 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.associatedCol}>
            <Text style={styles.associatedLabel} allowFontScaling={false}>UNIT</Text>
            <View style={styles.associatedValRow}>
              <Ionicons name="key-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.associatedVal} numberOfLines={1} allowFontScaling={false}>{unitDisplay}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Property card resolver for dynamic display (Owner Property - matching Web UI)
  const renderOwnerPropertyCard = (ownerId, propId) => {
    if (!ownerId) return null;
    const ownerObj = owners.find(o => o.id === ownerId);
    if (!ownerObj) return null;
    const ownedProps = properties.filter(p => p.ownerId === ownerId);
    const selectedProp = properties.find(p => p.id === propId) || ownedProps[0];
    if (!selectedProp) return null;

    return (
      <View style={styles.associatedCard}>
        <View style={styles.associatedHeader}>
          <Ionicons name="home-outline" size={14} color="#6366f1" />
          <Text style={styles.associatedTitle} allowFontScaling={false}>ASSOCIATED PROPERTY DETAILS</Text>
        </View>
        <View style={styles.associatedRow}>
          <View style={[styles.associatedCol, { flex: 1 }]}>
            <Text style={styles.associatedLabel} allowFontScaling={false}>PROPERTY NAME</Text>
            <Text style={styles.associatedVal} numberOfLines={1} allowFontScaling={false}>{selectedProp.name || 'N/A'}</Text>
          </View>
          <View style={[styles.associatedCol, { flex: 1.5 }]}>
            <Text style={styles.associatedLabel} allowFontScaling={false}>ADDRESS</Text>
            <Text style={styles.associatedVal} numberOfLines={1} allowFontScaling={false}>{selectedProp.address || selectedProp.streetAddress || 'N/A'}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.mainWrapper}>
      {/* FIXED HEADER WITH SWITCHER */}
      <View style={[styles.fixedHeader, { paddingTop: 16 }]}>
        <Text style={styles.title} allowFontScaling={false}>
          {activeTab === 'dashboard'
            ? (language === 'es' ? 'Panel de Contabilidad' : language === 'hi' ? 'लेखांकन डैशबोर्ड' : 'Accounting Overview')
            : activeTab === 'coa'
            ? (language === 'es' ? 'Plan de Cuentas (CoA)' : language === 'hi' ? 'खातों का चार्ट (CoA)' : 'Chart of Accounts (CoA)')
            : activeTab === 'income'
              ? (language === 'es' ? 'Transacciones de Ingresos' : language === 'hi' ? 'आय लेनदेन' : 'Income Transactions')
              : (language === 'es' ? 'Rastreador de Gastos' : language === 'hi' ? 'व्यय ट्रैकर' : 'Expense Tracker')}
        </Text>
        <Text style={styles.subtitle} allowFontScaling={false}>
          {activeTab === 'dashboard'
            ? (language === 'es' ? 'Beneficio neto, efectivo total, ingresos y gastos acumulados' : language === 'hi' ? 'शुद्ध लाभ, कुल नकदी, कुल राजस्व और परिचालन व्यय' : 'Net profit, total cash, total revenue & operating expenses')
            : activeTab === 'coa'
            ? (language === 'es' ? 'Verifique categorías de activos, reservas de pasivos y libro mayor' : language === 'hi' ? 'संपत्ति श्रेणियां, देनदारी और बहीखाता शेष' : 'Verify asset categories, liability reserves, and ledger balances')
            : activeTab === 'income'
              ? (language === 'es' ? 'Registre y audite ingresos por alquileres, moras y servicios' : language === 'hi' ? 'किराया, विलंब शुल्क और उपयोगिता आय दर्ज करें' : 'Record rental revenue, late fees, parking and utility payments')
              : (language === 'es' ? 'Registre y apruebe desembolsos de proveedores, reparaciones y nómina' : language === 'hi' ? 'विक्रेता भुगतान, रखरखाव और परिचालन खर्च दर्ज करें' : 'Record and approve vendor disbursements, repairs, and payroll')}
        </Text>

        {/* Tab Selection Row - 4 Submenus */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'dashboard' && styles.tabItemActive]} onPress={() => setActiveTab('dashboard')}>
            <Text style={[styles.tabItemText, activeTab === 'dashboard' && styles.tabItemTextActive]} allowFontScaling={false}>
              {language === 'es' ? 'Panel' : language === 'hi' ? 'डैशबोर्ड' : 'Dashboard'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'coa' && styles.tabItemActive]} onPress={() => setActiveTab('coa')}>
            <Text style={[styles.tabItemText, activeTab === 'coa' && styles.tabItemTextActive]} allowFontScaling={false}>
              {language === 'es' ? 'Cuentas' : language === 'hi' ? 'खाते' : 'Chart of Accounts'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'income' && styles.tabItemActive]} onPress={() => setActiveTab('income')}>
            <Text style={[styles.tabItemText, activeTab === 'income' && styles.tabItemTextActive]} allowFontScaling={false}>
              {language === 'es' ? 'Ingresos' : language === 'hi' ? 'आय' : 'Income'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'expenses' && styles.tabItemActive]} onPress={() => setActiveTab('expenses')}>
            <Text style={[styles.tabItemText, activeTab === 'expenses' && styles.tabItemTextActive]} allowFontScaling={false}>
              {language === 'es' ? 'Gastos' : language === 'hi' ? 'व्यय' : 'Expenses'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Filter Controls row */}
        <View style={[styles.searchBarRow, { marginTop: 10 }]}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={activeTab === 'coa'
                ? (language === 'es' ? 'Buscar cuenta...' : 'Search accounts...')
                : activeTab === 'income'
                  ? (language === 'es' ? 'Buscar ingresos...' : 'Search income...')
                  : activeTab === 'dashboard'
                    ? (language === 'es' ? 'Filtrar métricas...' : 'Filter accounting...')
                    : (language === 'es' ? 'Buscar gastos...' : 'Search expenses...')}
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {activeTab === 'coa' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setCreateCoaOpen(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color="#0f172a" />
              <Text style={styles.addBtnText} allowFontScaling={false}>
                {language === 'es' ? '+ Cuenta' : language === 'hi' ? '+ खाता' : '+ Create Ledger Account'}
              </Text>
            </TouchableOpacity>
          )}
          {activeTab === 'income' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setCreateIncomeOpen(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color="#0f172a" />
              <Text style={styles.addBtnText} allowFontScaling={false}>
                {language === 'es' ? '+ Ingreso' : language === 'hi' ? '+ आय दर्ज करें' : '+ Record Income'}
              </Text>
            </TouchableOpacity>
          )}
          {activeTab === 'expenses' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setCreateExpenseOpen(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color="#0f172a" />
              <Text style={styles.addBtnText} allowFontScaling={false}>
                {language === 'es' ? '+ Gasto' : language === 'hi' ? '+ खर्च दर्ज करें' : '+ Record Expense'}
              </Text>
            </TouchableOpacity>
          )}
          {activeTab === 'dashboard' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setCreateIncomeOpen(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color="#0f172a" />
              <Text style={styles.addBtnText} allowFontScaling={false}>
                {language === 'es' ? '+ Transacción' : '+ Record Entry'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SCROLLABLE LIST OF ITEMS */}
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
              {language === 'es' ? 'Procesando diarios del libro mayor...' : 'Processing ledger journals...'}
            </Text>
          </View>
        ) : (
          <View style={{ width: '100%' }}>
            {/* DASHBOARD TAB RENDERING */}
            {/* DASHBOARD TAB RENDERING */}
            {activeTab === 'dashboard' && (() => {
              const totalIncome = incomeList.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
              const totalExpenses = expenseList.reduce((acc, e) => acc + (Number(e.amountPaid || e.amount) || 0), 0);
              const netProfit = totalIncome - totalExpenses;
              return (
                <View>
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricCardLabel}>NET PROFIT</Text>
                      <Text style={[styles.metricCardValue, { color: netProfit >= 0 ? '#10b981' : '#ef4444' }]}>
                        ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.metricCardSub}>Operating Net Yield</Text>
                    </View>

                    <View style={styles.metricCard}>
                      <Text style={styles.metricCardLabel}>TOTAL CASH</Text>
                      <Text style={[styles.metricCardValue, { color: '#38bdf8' }]}>
                        $128,400.00
                      </Text>
                      <Text style={styles.metricCardSub}>Operating Bank Reserves</Text>
                    </View>

                    <View style={styles.metricCard}>
                      <Text style={styles.metricCardLabel}>TOTAL REVENUE</Text>
                      <Text style={[styles.metricCardValue, { color: '#38bdf8' }]}>
                        ${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.metricCardSub}>Current Fiscal Period</Text>
                    </View>

                    <View style={styles.metricCard}>
                      <Text style={styles.metricCardLabel}>TOTAL EXPENSES</Text>
                      <Text style={[styles.metricCardValue, { color: '#ef4444' }]}>
                        ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.metricCardSub}>Disbursements & Invoices</Text>
                    </View>
                  </View>

                  {/* 6-Month Income vs Expense Bar Chart */}
                  <View style={styles.chartCard}>
                    <View style={styles.chartHeaderRow}>
                      <Text style={styles.chartTitle}>6-Month Income vs Expense Graph</Text>
                      <View style={styles.legendRow}>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                          <Text style={styles.legendText}>Income</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                          <Text style={styles.legendText}>Expense</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.chartBarsArea}>
                      {[
                        { m: 'May', inc: 54000, exp: 12000 },
                        { m: 'Jun', inc: 58000, exp: 14500 },
                        { m: 'Jul', inc: 61000, exp: 13000 },
                        { m: 'Aug', inc: 59000, exp: 15500 },
                        { m: 'Sep', inc: 63000, exp: 16000 },
                        { m: 'Oct', inc: totalIncome || 64250, exp: totalExpenses || 14800 },
                      ].map((bar, i) => (
                        <View key={i} style={styles.barGroup}>
                          <View style={styles.barPair}>
                            <View style={[styles.bar, { height: Math.max(8, Math.min(85, (bar.inc / 70000) * 85)), backgroundColor: '#10b981' }]} />
                            <View style={[styles.bar, { height: Math.max(8, Math.min(85, (bar.exp / 70000) * 85)), backgroundColor: '#ef4444' }]} />
                          </View>
                          <Text style={styles.barLabel}>{bar.m}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              );
            })()}

            {activeTab === 'coa' && (
              <View>
                {filteredCoA.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="journal-outline" size={40} color="#64748b" />
                    <Text style={styles.emptyTitle} allowFontScaling={false}>No Chart of Accounts</Text>
                    <Text style={styles.emptyDesc} allowFontScaling={false}>No ledger account journals found matching your filter.</Text>
                  </View>
                ) : (
                  filteredCoA.map((item) => (
                    <View key={item.id} style={styles.dataCard}>
                      <View style={styles.cardHeader}>
                        <View style={styles.accountNumberBadge}>
                          <Text style={styles.accountNumberText} allowFontScaling={false}>
                            {item.accountNumber || item.accountCode || '----'}
                          </Text>
                        </View>
                        <Text style={styles.cardTitle} allowFontScaling={false}>
                          {item.accountName || 'Ledger Account'}
                        </Text>
                        <TouchableOpacity style={{ padding: 4 }} onPress={() => handleDeleteAccount(item.id, item.accountName)}>
                          <Ionicons name="trash-outline" size={18} color="#f43f5e" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.cardDivider} />
                      <View style={styles.cardDetailRow}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel} allowFontScaling={false}>Type</Text>
                          <Text style={styles.detailValue} allowFontScaling={false}>{item.accountType || item.type || 'Income'}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel} allowFontScaling={false}>Balance</Text>
                          <Text style={[styles.detailValue, { color: '#38bdf8', fontWeight: '800' }]} allowFontScaling={false}>
                            ${item.balance !== undefined ? Number(item.balance).toLocaleString() : '0'}
                          </Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel} allowFontScaling={false}>Status</Text>
                          <View style={styles.statusBadgeActive}>
                            <Text style={styles.statusTextActive} allowFontScaling={false}>{item.status || 'Active'}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'income' && (
              <View>
                {filteredIncome.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="cash-outline" size={40} color="#64748b" />
                    <Text style={styles.emptyTitle} allowFontScaling={false}>No Income Transactions</Text>
                    <Text style={styles.emptyDesc} allowFontScaling={false}>No revenue disbursements or clearing deposits recorded yet.</Text>
                  </View>
                ) : (
                  filteredIncome.map((item) => (
                    <View key={item.id} style={styles.dataCard}>
                      <View style={styles.cardHeader}>
                        <View style={styles.incomeIconBadge}>
                          <Ionicons name="trending-up-outline" size={16} color="#10b981" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
                          <Text style={styles.cardTitle} allowFontScaling={false}>{item.residentName}</Text>
                          <Text style={styles.cardSubTitle} allowFontScaling={false}>{item.propertyLocation}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 6 }}>
                          <Text style={styles.incomeAmountText} allowFontScaling={false}>+${Number(item.amount).toLocaleString()}</Text>
                          <TouchableOpacity style={{ padding: 4 }} onPress={() => handleDeleteIncome(item.id, item.residentName)}>
                            <Ionicons name="trash-outline" size={17} color="#f43f5e" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.cardDivider} />
                      <View style={styles.cardDetailRow}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel} allowFontScaling={false}>Clearing Date</Text>
                          <Text style={styles.detailValue} allowFontScaling={false}>{item.clearingDate}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel} allowFontScaling={false}>Category</Text>
                          <View style={styles.categoryChip}>
                            <Text style={styles.categoryChipText} allowFontScaling={false}>{item.category}</Text>
                          </View>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel} allowFontScaling={false}>Status</Text>
                          <View style={styles.statusBadgeActive}>
                            <Text style={styles.statusTextActive} allowFontScaling={false}>{item.status}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'expenses' && (
              <View>
                {filteredExpense.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="receipt-outline" size={40} color="#64748b" />
                    <Text style={styles.emptyTitle} allowFontScaling={false}>No Expense Records</Text>
                    <Text style={styles.emptyDesc} allowFontScaling={false}>No vendor maintenance invoices or property bills found.</Text>
                  </View>
                ) : (
                  filteredExpense.map((item) => (
                    <View key={item.id} style={styles.dataCard}>
                      <View style={styles.cardHeader}>
                        <View style={styles.expenseIconBadge}>
                          <Ionicons name="trending-down-outline" size={16} color="#f43f5e" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
                          <Text style={styles.cardTitle} allowFontScaling={false}>{item.vendorPartner}</Text>
                          <Text style={styles.cardSubTitle} allowFontScaling={false}>{item.propertyLocation}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 6 }}>
                          <Text style={styles.expenseAmountText} allowFontScaling={false}>-${Number(item.amountPaid).toLocaleString()}</Text>
                          <TouchableOpacity style={{ padding: 4 }} onPress={() => handleDeleteExpense(item.id, item.vendorPartner)}>
                            <Ionicons name="trash-outline" size={17} color="#f43f5e" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.cardDivider} />
                      <View style={styles.cardDetailRow}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel} allowFontScaling={false}>Expense Date</Text>
                          <Text style={styles.detailValue} allowFontScaling={false}>{item.expenseDate}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel} allowFontScaling={false}>Category</Text>
                          <View style={[styles.categoryChip, { backgroundColor: 'rgba(244, 63, 94, 0.12)', borderColor: 'rgba(244, 63, 94, 0.25)' }]}>
                            <Text style={[styles.categoryChipText, { color: '#f43f5e' }]} allowFontScaling={false}>{item.category}</Text>
                          </View>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel} allowFontScaling={false}>Action</Text>
                          <Text style={[styles.detailValue, { color: '#94a3b8' }]} allowFontScaling={false}>{item.approvalAction}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* --- 1. CREATE CHART OF ACCOUNT MODAL --- */}
      <Modal visible={createCoaOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>New Chart of Account</Text>
                <TouchableOpacity onPress={() => setCreateCoaOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.formLabel} allowFontScaling={false}>ACCOUNT NUMBER</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="E.g. 1010, 2020, 3010..."
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={coaNumber}
                  onChangeText={setCoaNumber}
                />

                <Text style={styles.formLabel} allowFontScaling={false}>ACCOUNT NAME</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="E.g. Operating Checking Account"
                  placeholderTextColor="#64748b"
                  value={coaName}
                  onChangeText={setCoaName}
                />

                <Text style={styles.formLabel} allowFontScaling={false}>ACCOUNT TYPE</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => {
                    setActivePicker('coaType');
                    setPickerModalOpen(true);
                  }}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>{coaType}</Text>
                  <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                </TouchableOpacity>

                <Text style={styles.formLabel} allowFontScaling={false}>INITIAL BALANCE AMOUNT ($)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="E.g. 150000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={coaBalance}
                  onChangeText={setCoaBalance}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateCoaOpen(false)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleCreateAccount}>
                  <Text style={styles.submitBtnText} allowFontScaling={false}>Save Account</Text>
                </TouchableOpacity>
              </View>
            </View>
            {renderPickerOverlay()}
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- 2. RECORD MISCELLANEOUS INCOME MODAL --- */}
      <Modal visible={createIncomeOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Record Miscellaneous Income</Text>
                <TouchableOpacity onPress={() => setCreateIncomeOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.formLabel} allowFontScaling={false}>SOURCE TYPE</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => {
                    setActivePicker('incomeSourceType');
                    setPickerModalOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {INCOME_SOURCE_TYPES.find(t => t.value === incomeSourceType)?.label || 'Tenant / Resident'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                </TouchableOpacity>

                {/* Conditional Fields based on SOURCE TYPE */}
                {incomeSourceType === 'Tenant' && (
                  <View>
                    <Text style={styles.formLabel} allowFontScaling={false}>RESIDENT / TENANT PAYEE</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('tenant');
                        setPickerModalOpen(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.formPickerText, !incomeTenantId && styles.formPickerPlaceholder]} allowFontScaling={false}>
                        {incomeTenantId
                          ? tenants.find(t => t.id === incomeTenantId)
                            ? `${tenants.find(t => t.id === incomeTenantId).firstName || ''} ${tenants.find(t => t.id === incomeTenantId).lastName || ''}`.trim() || 'Tenant'
                            : 'Select Tenant...'
                          : 'Select Tenant...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>

                    {renderLocationCard(incomeTenantId)}
                  </View>
                )}

                {incomeSourceType === 'Owner' && (
                  <View>
                    <Text style={styles.formLabel} allowFontScaling={false}>PROPERTY OWNER PAYEE</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('owner');
                        setPickerModalOpen(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.formPickerText, !incomeOwnerId && styles.formPickerPlaceholder]} allowFontScaling={false}>
                        {incomeOwnerId
                          ? owners.find(o => o.id === incomeOwnerId)
                            ? `${owners.find(o => o.id === incomeOwnerId).firstName || ''} ${owners.find(o => o.id === incomeOwnerId).lastName || ''}`.trim() || 'Owner'
                            : 'Select Owner...'
                          : 'Select Owner...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>

                    {incomeOwnerId ? (
                      <View>
                        {properties.filter(p => p.ownerId === incomeOwnerId).length > 1 && (
                          <View>
                            <Text style={styles.formLabel} allowFontScaling={false}>SELECT PROPERTY</Text>
                            <TouchableOpacity
                              style={styles.formPickerSelector}
                              onPress={() => {
                                setActivePicker('property');
                                setPickerModalOpen(true);
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.formPickerText, !incomePropertyId && styles.formPickerPlaceholder]} allowFontScaling={false}>
                                {incomePropertyId ? properties.find(p => p.id === incomePropertyId)?.name : 'Choose Property...'}
                              </Text>
                              <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                            </TouchableOpacity>
                          </View>
                        )}
                        {renderOwnerPropertyCard(incomeOwnerId, incomePropertyId)}
                      </View>
                    ) : null}
                  </View>
                )}

                {incomeSourceType === 'Miscellaneous' && (
                  <View>
                    <Text style={styles.formLabel} allowFontScaling={false}>SOURCE / PAYEE NAME</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="E.g., Laundry machine collection"
                      placeholderTextColor="#94a3b8"
                      value={incomeMiscDesc}
                      onChangeText={setIncomeMiscDesc}
                    />

                    <Text style={styles.formLabel} allowFontScaling={false}>PROPERTY PORTFOLIO</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('property');
                        setPickerModalOpen(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.formPickerText, !incomePropertyId && styles.formPickerPlaceholder]} allowFontScaling={false}>
                        {incomePropertyId ? properties.find(p => p.id === incomePropertyId)?.name : 'Select Property...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>

                    <Text style={styles.formLabel} allowFontScaling={false}>RENTABLE UNIT</Text>
                    <TouchableOpacity
                      style={[styles.formPickerSelector, !incomePropertyId && { opacity: 0.5 }]}
                      disabled={!incomePropertyId}
                      onPress={() => {
                        setActivePicker('unit');
                        setPickerModalOpen(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.formPickerText, !incomeUnitId && styles.formPickerPlaceholder]} allowFontScaling={false}>
                        {incomeUnitId
                          ? (() => {
                              const u = units.find(unit => unit.id === incomeUnitId);
                              return u ? `Unit ${u.unitNumber}${u.status ? ` - ${u.status}` : ''}` : 'Select Unit...';
                            })()
                          : (incomePropertyId ? 'Select Unit...' : 'Select Property first...')}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.formLabel} allowFontScaling={false}>INCOME CATEGORY</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => {
                    setActivePicker('incomeCat');
                    setPickerModalOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {INCOME_CATEGORIES.find(c => c.value === incomeCategory)?.label || 'Rent Revenue'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                </TouchableOpacity>

                <Text style={styles.formLabel} allowFontScaling={false}>PAYMENT AMOUNT ($)</Text>
                <View style={styles.currencyInputContainer}>
                  <Text style={styles.currencyPrefix} allowFontScaling={false}>$</Text>
                  <TextInput
                    style={styles.currencyInput}
                    placeholder="150"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    value={incomeAmount}
                    onChangeText={setIncomeAmount}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setCreateIncomeOpen(false)}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (submitting ||
                      !incomeAmount ||
                      (incomeSourceType === 'Tenant' && !incomeTenantId) ||
                      (incomeSourceType === 'Owner' && (!incomeOwnerId || !incomePropertyId)) ||
                      (incomeSourceType === 'Miscellaneous' && (!incomeMiscDesc.trim() || !incomePropertyId))) &&
                      styles.submitBtnDisabled,
                  ]}
                  onPress={handleSaveIncome}
                  disabled={
                    submitting ||
                    !incomeAmount ||
                    (incomeSourceType === 'Tenant' && !incomeTenantId) ||
                    (incomeSourceType === 'Owner' && (!incomeOwnerId || !incomePropertyId)) ||
                    (incomeSourceType === 'Miscellaneous' && (!incomeMiscDesc.trim() || !incomePropertyId))
                  }
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>Save Income</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            {renderPickerOverlay()}
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- 3. RECORD EXPENSE TRANSACTION MODAL --- */}
      <Modal visible={createExpenseOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Record Expense Transaction</Text>
                <TouchableOpacity onPress={() => setCreateExpenseOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.formLabel} allowFontScaling={false}>PAYEE TYPE</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => {
                    setActivePicker('expensePayeeType');
                    setPickerModalOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {EXPENSE_PAYEE_TYPES.find(p => p.value === expensePayeeType)?.label || 'Vendor / Staff Payee'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                </TouchableOpacity>

                {/* Conditional Fields based on PAYEE TYPE */}
                {expensePayeeType === 'VendorMaintenance' && (
                  <View>
                    <Text style={styles.formLabel} allowFontScaling={false}>PAYEE (STAFF)</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('vendor');
                        setPickerModalOpen(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.formPickerText, !expenseVendorId && styles.formPickerPlaceholder]} allowFontScaling={false}>
                        {expenseVendorId
                          ? (() => {
                              if (expenseVendorId.startsWith('staff-')) {
                                const s = staff.find(st => st.id === expenseVendorId.replace('staff-', ''));
                                return s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.name || 'Staff' : 'Select Payee...';
                              }
                              const v = vendors.find(vn => vn.id === expenseVendorId.replace('vendor-', ''));
                              return v ? v.name || v.companyName || 'Vendor' : 'Select Payee...';
                            })()
                          : 'Select Payee...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>

                    <Text style={styles.formLabel} allowFontScaling={false}>PROPERTY PORTFOLIO</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('property');
                        setPickerModalOpen(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.formPickerText, !expensePropertyId && styles.formPickerPlaceholder]} allowFontScaling={false}>
                        {expensePropertyId
                          ? properties.find(p => p.id === expensePropertyId)?.name || 'Select Property...'
                          : 'Select Property...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>

                    <Text style={styles.formLabel} allowFontScaling={false}>RENTABLE UNIT</Text>
                    <TouchableOpacity
                      style={[styles.formPickerSelector, !expensePropertyId && { opacity: 0.5 }]}
                      disabled={!expensePropertyId}
                      onPress={() => {
                        setActivePicker('unit');
                        setPickerModalOpen(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.formPickerText, !expenseUnitId && styles.formPickerPlaceholder]} allowFontScaling={false}>
                        {expenseUnitId
                          ? (() => {
                              const u = units.find(unit => unit.id === expenseUnitId);
                              return u ? `Unit ${u.unitNumber}${u.status ? ` - ${u.status}` : ''}` : 'Select Unit...';
                            })()
                          : (expensePropertyId ? 'Select Unit...' : 'Select Property first...')}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                )}

                {expensePayeeType === 'Tenant' && (
                  <View>
                    <Text style={styles.formLabel} allowFontScaling={false}>RESIDENT / TENANT PAYEE</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('tenant');
                        setPickerModalOpen(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.formPickerText, !expenseTenantId && styles.formPickerPlaceholder]} allowFontScaling={false}>
                        {expenseTenantId
                          ? tenants.find(t => t.id === expenseTenantId)
                            ? `${tenants.find(t => t.id === expenseTenantId).firstName || ''} ${tenants.find(t => t.id === expenseTenantId).lastName || ''}`.trim() || 'Tenant'
                            : 'Select Tenant...'
                          : 'Select Tenant...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>

                    {renderLocationCard(expenseTenantId)}
                  </View>
                )}

                {expensePayeeType === 'Owner' && (
                  <View>
                    <Text style={styles.formLabel} allowFontScaling={false}>PROPERTY OWNER PAYEE</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('owner');
                        setPickerModalOpen(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.formPickerText, !expenseOwnerId && styles.formPickerPlaceholder]} allowFontScaling={false}>
                        {expenseOwnerId
                          ? owners.find(o => o.id === expenseOwnerId)
                            ? `${owners.find(o => o.id === expenseOwnerId).firstName || ''} ${owners.find(o => o.id === expenseOwnerId).lastName || ''}`.trim() || 'Owner'
                            : 'Select Owner...'
                          : 'Select Owner...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>

                    {expenseOwnerId ? (
                      <View>
                        {properties.filter(p => p.ownerId === expenseOwnerId).length > 1 && (
                          <View>
                            <Text style={styles.formLabel} allowFontScaling={false}>SELECT PROPERTY</Text>
                            <TouchableOpacity
                              style={styles.formPickerSelector}
                              onPress={() => {
                                setActivePicker('property');
                                setPickerModalOpen(true);
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.formPickerText, !expensePropertyId && styles.formPickerPlaceholder]} allowFontScaling={false}>
                                {expensePropertyId ? properties.find(p => p.id === expensePropertyId)?.name : 'Choose Property...'}
                              </Text>
                              <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                            </TouchableOpacity>
                          </View>
                        )}
                        {renderOwnerPropertyCard(expenseOwnerId, expensePropertyId)}
                      </View>
                    ) : null}
                  </View>
                )}

                <Text style={styles.formLabel} allowFontScaling={false}>EXPENSE CATEGORY</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => {
                    setActivePicker('expenseCat');
                    setPickerModalOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {EXPENSE_CATEGORIES.find(c => c.value === expenseCategory)?.label || 'General Maintenance'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                </TouchableOpacity>

                <Text style={styles.formLabel} allowFontScaling={false}>EXPENSE AMOUNT ($)</Text>
                <View style={styles.currencyInputContainer}>
                  <Text style={styles.currencyPrefix} allowFontScaling={false}>$</Text>
                  <TextInput
                    style={styles.currencyInput}
                    placeholder="250"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    value={expenseAmount}
                    onChangeText={setExpenseAmount}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setCreateExpenseOpen(false)}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (submitting ||
                      !expenseAmount ||
                      (expensePayeeType === 'VendorMaintenance' && (!expenseVendorId || !expensePropertyId)) ||
                      (expensePayeeType === 'Tenant' && !expenseTenantId) ||
                      (expensePayeeType === 'Owner' && (!expenseOwnerId || !expensePropertyId))) &&
                      styles.submitBtnDisabled,
                  ]}
                  onPress={handleSaveExpense}
                  disabled={
                    submitting ||
                    !expenseAmount ||
                    (expensePayeeType === 'VendorMaintenance' && (!expenseVendorId || !expensePropertyId)) ||
                    (expensePayeeType === 'Tenant' && !expenseTenantId) ||
                    (expensePayeeType === 'Owner' && (!expenseOwnerId || !expensePropertyId))
                  }
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>Save Expense</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            {renderPickerOverlay()}
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 60,
    width: '100%',
    maxWidth: 1024,
    alignSelf: 'center',
  },

  fixedHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    zIndex: 10,
    width: '100%',
    maxWidth: 1024,
    alignSelf: 'center',
  },
  breadcrumb: { color: '#38bdf8', fontSize: 11, fontWeight: '700', marginBottom: 2 },
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
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    height: 38,
  },
  addBtnText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  // Card layouts
  dataCard: {
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountNumberBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    marginRight: 10,
  },
  accountNumberText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cardSubTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
    marginVertical: 10,
  },
  cardDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusTextActive: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  incomeIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  incomeAmountText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#10b981',
  },
  expenseIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  expenseAmountText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f43f5e',
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
  },
  emptyCard: {
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 14,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDarkMode ? 0.2 : 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  metricCardLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  metricCardValue: {
    fontSize: 16,
    fontWeight: '900',
    marginVertical: 4,
  },
  metricCardSub: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    marginBottom: 14,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 10.5,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  chartBarsArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
    paddingBottom: 4,
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
  },
  barPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 85,
  },
  bar: {
    width: 9,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 6,
    fontWeight: '700',
  },
  ledgerCard: {
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
  centerLoading: { paddingVertical: 80, alignItems: 'center' },
  loadingText: { color: colors.textSecondary, fontSize: 13, marginTop: 8 },

  // Modals Styles (matching Web UI design)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalContent: {
    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
    borderRadius: 22,
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    maxHeight: '88%',
    padding: 22,
    borderWidth: 1,
    borderColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#1e293b' : '#f1f5f9',
  },
  modalTitle: { fontSize: 16.5, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.2 },
  modalForm: { marginBottom: 12 },
  formLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: isDarkMode ? '#94a3b8' : '#64748b',
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  formInput: {
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 13.5,
    borderWidth: 1.2,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    fontWeight: '600',
  },
  formPickerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.2,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
  },
  formPickerText: { color: colors.textPrimary, fontSize: 13.5, fontWeight: '600' },
  formPickerPlaceholder: { color: isDarkMode ? '#64748b' : '#94a3b8', fontWeight: '500' },

  // Associated Location/Property Details Cards (matching Web)
  associatedCard: {
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
  },
  associatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  associatedTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: isDarkMode ? '#94a3b8' : '#64748b',
    letterSpacing: 0.6,
  },
  associatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  associatedCol: {
    flex: 1,
  },
  associatedLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: isDarkMode ? '#64748b' : '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  associatedValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  associatedVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Currency input matching web
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: isDarkMode ? '#94a3b8' : '#64748b',
    marginRight: 6,
  },
  currencyInput: {
    flex: 1,
    paddingVertical: 11,
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingTop: 16,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#1e293b' : '#f1f5f9',
  },
  cancelBtn: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  submitBtn: {
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: '#6366f1', // Web primary indigo
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.45,
    backgroundColor: '#a5b4fc',
  },
  submitBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },

  // Universal picker overlay styles (Floating clean card on top of modal backdrop)
  pickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 99999,
    elevation: 99999,
  },
  pickerPopupCard: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    maxHeight: 460,
    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 30,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#1e293b' : '#f1f5f9',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  pickerCloseIcon: {
    padding: 4,
  },
  pickerScrollView: {
    maxHeight: 280,
    marginVertical: 8,
  },
  pickerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#1e293b' : '#f1f5f9',
  },
  pickerOptionRowSelected: {
    backgroundColor: isDarkMode ? '#1e293b' : '#f0f9ff',
  },
  pickerOptionText: {
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  pickerOptionTextSelected: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  closePickerBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
  },
  closePickerBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});

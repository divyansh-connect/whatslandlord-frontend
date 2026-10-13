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
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../api/client';

export const ManagerAccountingScreen = () => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';

  // Sub-tab: 'coa' | 'income' | 'expenses'
  const [activeTab, setActiveTab] = useState('coa');

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
  const [incomeSourceType, setIncomeSourceType] = useState('Tenant / Resident'); // 'Tenant / Resident' | 'Property Owner (Contribution)' | 'Miscellaneous / Vending / Other'
  const [incomeTenantId, setIncomeTenantId] = useState('');
  const [incomeOwnerId, setIncomeOwnerId] = useState('');
  const [incomeMiscDesc, setIncomeMiscDesc] = useState('');
  const [incomePropertyId, setIncomePropertyId] = useState('');
  const [incomeBuildingId, setIncomeBuildingId] = useState('');
  const [incomeUnitId, setIncomeUnitId] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('Rent Revenue');
  const [incomeAmount, setIncomeAmount] = useState('');

  // 3. Expense Creator form states (Matching web screenshot fields)
  const [createExpenseOpen, setCreateExpenseOpen] = useState(false);
  const [expensePayeeType, setExpensePayeeType] = useState('Vendor / Staff Payee'); // 'Vendor / Staff Payee' | 'Tenant (Refund / Return)' | 'Property Owner (Distribution)'
  const [expenseVendorId, setExpenseVendorId] = useState('');
  const [expenseTenantId, setExpenseTenantId] = useState('');
  const [expenseOwnerId, setExpenseOwnerId] = useState('');
  const [expensePropertyId, setExpensePropertyId] = useState('');
  const [expenseBuildingId, setExpenseBuildingId] = useState('');
  const [expenseUnitId, setExpenseUnitId] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('General Maintenance');
  const [expenseAmount, setExpenseAmount] = useState('');

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

  // 1. Fetch Chart of Accounts (live backend connection)
  const fetchCoaList = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/accounts', logout, refreshAccessToken);
      const list = res?.data || res || [];
      setCoaList(list);
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
      
      const parsedList = rawList.map((i) => {
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
      
      const parsedList = rawList.map((e) => {
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
      if (unts?.data || unts) setUnits(Array.isArray(unts?.data) ? unts.data : (Array.isArray(unts) ? unts : []));
      if (tnts?.data || tnts) setTenants(Array.isArray(tnts?.data) ? tnts.data : (Array.isArray(tnts) ? tnts : []));
      
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
    if (activeTab === 'coa') fetchCoaList();
    if (activeTab === 'income') fetchIncomeTransactions();
    if (activeTab === 'expenses') fetchExpensesList();
  }, [activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'coa') fetchCoaList(false);
    if (activeTab === 'income') fetchIncomeTransactions(false);
    if (activeTab === 'expenses') fetchExpensesList(false);
  };

  // Submissions

  // A. Create Chart Account
  const handleCreateAccount = async () => {
    if (!coaNumber.trim() || !coaName.trim()) {
      Alert.alert('Validation Error', 'Account Number and Name are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        accountNumber: coaNumber.trim(),
        accountName: coaName.trim(),
        accountType: coaType,
        balance: coaBalance || '0',
      };
      await apiClient.post('/accounts', payload, logout, refreshAccessToken);
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
              await apiClient.delete(`/accounts/${id}`, logout, refreshAccessToken);
              fetchCoaList(true);
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to delete account.');
            }
          }
        }
      ]
    );
  };

  // C. Record Miscellaneous Income (Uses web payload structures exactly)
  const handleSaveIncome = async () => {
    if (!incomeAmount.trim()) {
      Alert.alert('Validation Error', 'Amount is required.');
      return;
    }

    try {
      setSubmitting(true);
      let resolvedName = '';
      let sourceId = '';
      let resolvedPropertyId = '';
      let resolvedBuildingId = '';
      let resolvedUnitId = '';

      if (incomeSourceType === 'Tenant / Resident') {
        if (!incomeTenantId) {
          Alert.alert('Validation Error', 'Please select a Resident / Tenant.');
          setSubmitting(false);
          return;
        }
        const tenant = tenants.find((t) => t.id === incomeTenantId);
        resolvedName = tenant ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || tenant.name : 'Tenant';
        sourceId = incomeTenantId;
        resolvedPropertyId = tenant ? tenant.propertyId || '' : '';
        resolvedUnitId = tenant ? tenant.unitId || '' : '';
        if (tenant && tenant.unitId) {
          const matchingUnit = units.find((u) => u.id === tenant.unitId);
          resolvedBuildingId = matchingUnit ? matchingUnit.buildingId || '' : '';
        }
      } else if (incomeSourceType === 'Property Owner (Contribution)') {
        if (!incomeOwnerId) {
          Alert.alert('Validation Error', 'Please select a Property Owner.');
          setSubmitting(false);
          return;
        }
        const owner = owners.find((o) => o.id === incomeOwnerId);
        resolvedName = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.name : 'Owner';
        sourceId = incomeOwnerId;
        resolvedPropertyId = incomePropertyId;
        resolvedBuildingId = incomeBuildingId;
        resolvedUnitId = incomeUnitId;
      } else {
        resolvedName = incomeMiscDesc.trim() || 'Miscellaneous Source';
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
      });

      await apiClient.post(
        '/portal/income',
        {
          category: incomeCategory,
          amount: parseFloat(incomeAmount),
          date: new Date().toISOString(),
          description,
        },
        logout,
        refreshAccessToken
      );

      Alert.alert('Success', 'Miscellaneous Income recorded successfully.');
      setCreateIncomeOpen(false);
      setIncomeAmount('');
      setIncomeMiscDesc('');
      setIncomeTenantId('');
      setIncomeOwnerId('');
      setIncomePropertyId('');
      setIncomeBuildingId('');
      setIncomeUnitId('');
      fetchIncomeTransactions(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to record income.');
    } finally {
      setSubmitting(false);
    }
  };

  // D. Record Expense (Uses web payload structures exactly)
  const handleSaveExpense = async () => {
    if (!expenseAmount.trim()) {
      Alert.alert('Validation Error', 'Amount is required.');
      return;
    }

    try {
      setSubmitting(true);
      let payeeName = '';
      let payeeId = '';
      let resolvedPropertyId = '';
      let resolvedBuildingId = '';
      let resolvedUnitId = '';

      if (expensePayeeType === 'Vendor / Staff Payee') {
        if (!expenseVendorId) {
          Alert.alert('Validation Error', 'Please select a Payee / Staff member.');
          setSubmitting(false);
          return;
        }
        const staffMember = staff.find((s) => s.id === expenseVendorId);
        payeeName = staffMember
          ? `${staffMember.firstName || ''} ${staffMember.lastName || ''}`.trim() || staffMember.name
          : 'Staff';
        payeeId = expenseVendorId;
        resolvedPropertyId = expensePropertyId;
        resolvedBuildingId = expenseBuildingId;
        resolvedUnitId = expenseUnitId;
      } else if (expensePayeeType === 'Tenant (Refund / Return)') {
        if (!expenseTenantId) {
          Alert.alert('Validation Error', 'Please select a Resident / Tenant.');
          setSubmitting(false);
          return;
        }
        const tenant = tenants.find((t) => t.id === expenseTenantId);
        payeeName = tenant ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || tenant.name : 'Tenant';
        payeeId = expenseTenantId;
        resolvedPropertyId = tenant ? tenant.propertyId || '' : '';
        resolvedUnitId = tenant ? tenant.unitId || '' : '';
        if (tenant && tenant.unitId) {
          const matchingUnit = units.find((u) => u.id === tenant.unitId);
          resolvedBuildingId = matchingUnit ? matchingUnit.buildingId || '' : '';
        }
      } else if (expensePayeeType === 'Property Owner (Distribution)') {
        if (!expenseOwnerId) {
          Alert.alert('Validation Error', 'Please select a Property Owner.');
          setSubmitting(false);
          return;
        }
        const owner = owners.find((o) => o.id === expenseOwnerId);
        payeeName = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.name : 'Owner';
        payeeId = expenseOwnerId;
        resolvedPropertyId = expensePropertyId;
        resolvedBuildingId = expenseBuildingId;
        resolvedUnitId = expenseUnitId;
      }

      const chosenProp = properties.find((p) => p.id === resolvedPropertyId);

      const description = JSON.stringify({
        vendorName: payeeName,
        propertyName: chosenProp ? chosenProp.name : 'Property',
        propertyId: resolvedPropertyId,
        buildingId: resolvedBuildingId,
        unitId: resolvedUnitId,
        payeeType: expensePayeeType,
        payeeId,
      });

      await apiClient.post(
        '/portal/expenses',
        {
          category: expenseCategory,
          amount: parseFloat(expenseAmount),
          date: new Date().toISOString(),
          description,
        },
        logout,
        refreshAccessToken
      );

      Alert.alert('Success', 'Expense recorded successfully.');
      setCreateExpenseOpen(false);
      setExpenseAmount('');
      setExpenseVendorId('');
      setExpenseTenantId('');
      setExpenseOwnerId('');
      setExpensePropertyId('');
      setExpenseBuildingId('');
      setExpenseUnitId('');
      fetchExpensesList(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  // Dynamic Picker Options list compiler
  const getPickerOptions = () => {
    switch (activePicker) {
      case 'incomeSourceType':
        return [
          { value: 'Tenant / Resident', label: 'Tenant / Resident' },
          { value: 'Property Owner (Contribution)', label: 'Property Owner (Contribution)' },
          { value: 'Miscellaneous / Vending / Other', label: 'Miscellaneous / Vending / Other' },
        ];

      case 'expensePayeeType':
        return [
          { value: 'Vendor / Staff Payee', label: 'Vendor / Staff Payee' },
          { value: 'Tenant (Refund / Return)', label: 'Tenant (Refund / Return)' },
          { value: 'Property Owner (Distribution)', label: 'Property Owner (Distribution)' },
        ];

      case 'property': {
        if (createIncomeOpen && incomeSourceType === 'Property Owner (Contribution)' && incomeOwnerId) {
          const ownedProps = properties.filter(p => p.ownerId === incomeOwnerId);
          if (ownedProps.length > 0) return ownedProps.map(p => ({ value: p.id, label: p.name }));
        }
        if (createExpenseOpen && expensePayeeType === 'Property Owner (Distribution)' && expenseOwnerId) {
          const ownedProps = properties.filter(p => p.ownerId === expenseOwnerId);
          if (ownedProps.length > 0) return ownedProps.map(p => ({ value: p.id, label: p.name }));
        }
        return properties.map(p => ({ value: p.id, label: p.name }));
      }

      case 'building': {
        const activePropId = createIncomeOpen ? incomePropertyId : expensePropertyId;
        const filteredBldgs = activePropId ? buildings.filter(b => b.propertyId === activePropId) : buildings;
        return filteredBldgs.map(b => ({ value: b.id, label: b.name || `Building` }));
      }

      case 'unit': {
        const actPropId = createIncomeOpen ? incomePropertyId : expensePropertyId;
        const actBldgId = createIncomeOpen ? incomeBuildingId : expenseBuildingId;
        let filteredUnits = units;
        if (actBldgId) {
          filteredUnits = units.filter(u => u.buildingId === actBldgId);
        } else if (actPropId) {
          filteredUnits = units.filter(u => u.propertyId === actPropId);
        }
        return filteredUnits.map(u => ({ value: u.id, label: `Unit ${u.unitNumber}` }));
      }

      case 'tenant': {
        return tenants.map(t => ({
          value: t.id,
          label: `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.name || 'Tenant',
        }));
      }

      case 'owner': {
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
          label: `Vendor: ${v.name || 'Vendor'}`
        }));
        const combined = [...staffOpts, ...vendorOpts];
        return combined.length > 0 ? combined : [{ value: '', label: 'No Payees Found' }];
      }

      case 'coaType':
        return ['Assets', 'Liability', 'Equity', 'Income', 'Expenses'].map(t => ({ value: t, label: t }));

      case 'incomeCat':
        return [
          { value: 'Rent', label: 'Rent Revenue' },
          { value: 'Utilities', label: 'Utilities Reimbursement' },
          { value: 'Late Fees', label: 'Late Fees Penalty' },
          { value: 'Parking', label: 'Parking Space Rent' },
          { value: 'Storage', label: 'Storage Lockers Rent' },
          { value: 'Pet Fees', label: 'Pet Rent Fee' },
        ];

      case 'expenseCat':
        return [
          { value: 'Maintenance', label: 'General Maintenance' },
          { value: 'Repairs', label: 'Repairs' },
          { value: 'Utilities', label: 'Utilities' },
          { value: 'Insurance', label: 'Insurance' },
          { value: 'Property Taxes', label: 'Property Taxes' },
          { value: 'Payroll', label: 'Payroll' },
          { value: 'Management Fee', label: 'Management Fee' },
          { value: 'Other Expense', label: 'Other Expense' },
        ];

      default:
        return [];
    }
  };

  const handleSelectPickerOption = (val) => {
    if (!val) return;
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
          setIncomePropertyId(t.propertyId || '');
          setIncomeUnitId(t.unitId || '');
          if (t.unitId) {
            const u = units.find(unitItem => unitItem.id === t.unitId);
            setIncomeBuildingId(u ? u.buildingId || '' : '');
          }
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
      }
      if (activePicker === 'property') {
        setIncomePropertyId(val);
        setIncomeBuildingId('');
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
          setExpensePropertyId(t.propertyId || '');
          setExpenseUnitId(t.unitId || '');
          if (t.unitId) {
            const u = units.find(unitItem => unitItem.id === t.unitId);
            setExpenseBuildingId(u ? u.buildingId || '' : '');
          }
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
      }
      if (activePicker === 'property') {
        setExpensePropertyId(val);
        setExpenseBuildingId('');
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

  // Filter listings
  const filteredCoA = coaList.filter(item => {
    const text = `${item.accountNumber || item.accountCode || ''} ${item.accountName || ''} ${item.type || ''}`.toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    const matchesType = selectedType ? (item.type || '').toLowerCase() === selectedType.toLowerCase() : true;
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

  // Location card resolver for dynamic display (Tenant Location)
  const renderLocationCard = (tenantId) => {
    if (!tenantId) return null;
    const t = tenants.find(item => item.id === tenantId);
    if (!t) return null;
    const prop = properties.find(p => p.id === t.propertyId);
    const unitObj = units.find(u => u.id === t.unitId);
    const bldg = buildings.find(b => b.id === unitObj?.buildingId);

    return (
      <View style={styles.locationCard}>
        <Text style={styles.locationTitle} allowFontScaling={false}>ASSOCIATED LOCATION DETAILS</Text>
        <View style={styles.locationRow}>
          <View style={styles.locationItem}>
            <Text style={styles.locationItemLabel} allowFontScaling={false}>Property</Text>
            <Text style={styles.locationItemValue} allowFontScaling={false}>{prop ? prop.name : 'N/A'}</Text>
          </View>
          <View style={styles.locationItem}>
            <Text style={styles.locationItemLabel} allowFontScaling={false}>Building</Text>
            <Text style={styles.locationItemValue} allowFontScaling={false}>{bldg ? bldg.name : 'N/A'}</Text>
          </View>
          <View style={styles.locationItem}>
            <Text style={styles.locationItemLabel} allowFontScaling={false}>Unit</Text>
            <Text style={styles.locationItemValue} allowFontScaling={false}>{unitObj ? `Unit ${unitObj.unitNumber}` : 'N/A'}</Text>
          </View>
        </View>
      </View>
    );
  };

  // Property card resolver for dynamic display (Owner Property)
  const renderOwnerPropertyCard = (ownerId, propId) => {
    if (!ownerId) return null;
    const ownerObj = owners.find(o => o.id === ownerId);
    if (!ownerObj) return null;
    const ownedProps = properties.filter(p => p.ownerId === ownerId);
    const selectedProp = properties.find(p => p.id === propId) || ownedProps[0];

    return (
      <View style={styles.locationCard}>
        <Text style={styles.locationTitle} allowFontScaling={false}>ASSOCIATED PROPERTY DETAILS</Text>
        <View style={styles.locationRow}>
          <View style={styles.locationItem}>
            <Text style={styles.locationItemLabel} allowFontScaling={false}>Property Name</Text>
            <Text style={styles.locationItemValue} allowFontScaling={false}>{selectedProp ? selectedProp.name : 'N/A'}</Text>
          </View>
          <View style={styles.locationItem}>
            <Text style={styles.locationItemLabel} allowFontScaling={false}>Address</Text>
            <Text style={styles.locationItemValue} allowFontScaling={false}>{selectedProp ? (selectedProp.address || selectedProp.streetAddress || 'N/A') : 'N/A'}</Text>
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
          {activeTab === 'coa'
            ? (language === 'es' ? 'Plan de Cuentas (CoA)' : 'Chart of Accounts (CoA)')
            : activeTab === 'income'
              ? (language === 'es' ? 'Transacciones de Ingresos' : 'Income Transactions')
              : (language === 'es' ? 'Rastreador de Gastos' : 'Expense Tracker')}
        </Text>
        <Text style={styles.subtitle} allowFontScaling={false}>
          {activeTab === 'coa'
            ? (language === 'es' ? 'Verifique las categorías de activos, reservas de pasivos y subdivisiones de patrimonio.' : 'Verify property portfolios asset categories, liability reserves, and equity subdivisions.')
            : activeTab === 'income'
              ? (language === 'es' ? 'Verifique desembolsos de servicios, pagos de mora, evaluaciones de mascotas e ingresos de alquiler.' : 'Verify utility disbursements, late fees payments, pet assessments, and rental revenue.')
              : (language === 'es' ? 'Verifique facturas de jardinería, facturas de servicios, reparaciones y distribución de nómina.' : 'Verify property business landscaping bills, utility invoices, repairs, and payroll distributions.')}
        </Text>

        {/* Tab Selection Row */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'coa' && styles.tabItemActive]} onPress={() => setActiveTab('coa')}>
            <Text style={[styles.tabItemText, activeTab === 'coa' && styles.tabItemTextActive]} allowFontScaling={false}>
              {language === 'es' ? 'Cuentas' : 'Accounts'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'income' && styles.tabItemActive]} onPress={() => setActiveTab('income')}>
            <Text style={[styles.tabItemText, activeTab === 'income' && styles.tabItemTextActive]} allowFontScaling={false}>
              {language === 'es' ? 'Ingresos' : 'Income'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'expenses' && styles.tabItemActive]} onPress={() => setActiveTab('expenses')}>
            <Text style={[styles.tabItemText, activeTab === 'expenses' && styles.tabItemTextActive]} allowFontScaling={false}>
              {language === 'es' ? 'Gastos' : 'Expenses'}
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
                ? (language === 'es' ? 'Buscar nombre o número de cuenta...' : 'Search accounts name or number...')
                : activeTab === 'income'
                  ? (language === 'es' ? 'Buscar ingresos por residente...' : 'Search income by resident...')
                  : (language === 'es' ? 'Buscar gastos por proveedor...' : 'Search expenses by vendor...')}
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {activeTab === 'income' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setCreateIncomeOpen(true)}>
              <Ionicons name="add" size={16} color="#0f172a" />
              <Text style={styles.addBtnText} allowFontScaling={false}>
                {language === 'es' ? 'Ingreso' : 'Income'}
              </Text>
            </TouchableOpacity>
          )}
          {activeTab === 'expenses' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setCreateExpenseOpen(true)}>
              <Ionicons name="add" size={16} color="#0f172a" />
              <Text style={styles.addBtnText} allowFontScaling={false}>
                {language === 'es' ? 'Gasto' : 'Expense'}
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
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
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
                          <Text style={styles.accountNumberText} allowFontScaling={false}>{item.accountNumber || item.accountCode || '----'}</Text>
                        </View>
                        <Text style={styles.cardTitle} allowFontScaling={false}>{item.accountName || 'Ledger Account'}</Text>
                        <TouchableOpacity style={{ padding: 4 }} onPress={() => handleDeleteAccount(item.id, item.accountName)}>
                          <Ionicons name="trash-outline" size={18} color="#f43f5e" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.cardDivider} />
                      <View style={styles.cardDetailRow}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel} allowFontScaling={false}>Type</Text>
                          <Text style={styles.detailValue} allowFontScaling={false}>{item.type || 'Assets'}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel} allowFontScaling={false}>Balance</Text>
                          <Text style={[styles.detailValue, { color: '#38bdf8', fontWeight: '800' }]} allowFontScaling={false}>
                            ${item.balance ? Number(item.balance).toLocaleString() : '0'}
                          </Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel} allowFontScaling={false}>Status</Text>
                          <View style={styles.statusBadgeActive}>
                            <Text style={styles.statusTextActive} allowFontScaling={false}>Active</Text>
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
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.cardTitle} allowFontScaling={false}>{item.residentName}</Text>
                          <Text style={styles.cardSubTitle} allowFontScaling={false}>{item.propertyLocation}</Text>
                        </View>
                        <Text style={styles.incomeAmountText} allowFontScaling={false}>+${Number(item.amount).toLocaleString()}</Text>
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
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.cardTitle} allowFontScaling={false}>{item.vendorPartner}</Text>
                          <Text style={styles.cardSubTitle} allowFontScaling={false}>{item.propertyLocation}</Text>
                        </View>
                        <Text style={styles.expenseAmountText} allowFontScaling={false}>-${Number(item.amountPaid).toLocaleString()}</Text>
                      </View>
                      <View style={styles.cardDivider} />
                      <View style={styles.cardDetailRow}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel} allowFontScaling={false}>Expense Date</Text>
                          <Text style={styles.detailValue} allowFontScaling={false}>{item.expenseDate}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel} allowFontScaling={false}>Category</Text>
                          <View style={styles.categoryChip}>
                            <Text style={styles.categoryChipText} allowFontScaling={false}>{item.category}</Text>
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
          </Animated.View>
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
                <TouchableOpacity onPress={() => setCreateIncomeOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
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
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>{incomeSourceType}</Text>
                  <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                </TouchableOpacity>

                {/* Conditional Fields based on SOURCE TYPE */}
                {incomeSourceType === 'Tenant / Resident' && (
                  <View>
                    <Text style={styles.formLabel} allowFontScaling={false}>RESIDENT / TENANT PAYEE</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('tenant');
                        setPickerModalOpen(true);
                      }}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false}>
                        {incomeTenantId
                          ? tenants.find(t => t.id === incomeTenantId)
                            ? `${tenants.find(t => t.id === incomeTenantId).firstName || ''} ${tenants.find(t => t.id === incomeTenantId).lastName || ''}`.trim()
                            : 'Select Tenant...'
                          : 'Select Tenant...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                    </TouchableOpacity>

                    {renderLocationCard(incomeTenantId)}
                  </View>
                )}

                {incomeSourceType === 'Property Owner (Contribution)' && (
                  <View>
                    <Text style={styles.formLabel} allowFontScaling={false}>PROPERTY OWNER PAYEE</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('owner');
                        setPickerModalOpen(true);
                      }}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false}>
                        {incomeOwnerId
                          ? owners.find(o => o.id === incomeOwnerId)
                            ? `${owners.find(o => o.id === incomeOwnerId).firstName || ''} ${owners.find(o => o.id === incomeOwnerId).lastName || ''}`.trim()
                            : 'Select Owner...'
                          : 'Select Owner...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                    </TouchableOpacity>

                    {incomeOwnerId ? (
                      <View>
                        <Text style={styles.formLabel} allowFontScaling={false}>SELECT PROPERTY</Text>
                        <TouchableOpacity
                          style={styles.formPickerSelector}
                          onPress={() => {
                            setActivePicker('property');
                            setPickerModalOpen(true);
                          }}
                        >
                          <Text style={styles.formPickerText} allowFontScaling={false}>
                            {incomePropertyId ? properties.find(p => p.id === incomePropertyId)?.name : 'Choose Property...'}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                        </TouchableOpacity>
                        {renderOwnerPropertyCard(incomeOwnerId, incomePropertyId)}
                      </View>
                    ) : null}
                  </View>
                )}

                {incomeSourceType === 'Miscellaneous / Vending / Other' && (
                  <View>
                    <Text style={styles.formLabel} allowFontScaling={false}>SOURCE DESCRIPTION</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="E.g. Vending Machine Inc., Laundry Fee..."
                      placeholderTextColor="#64748b"
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
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false}>
                        {incomePropertyId ? properties.find(p => p.id === incomePropertyId)?.name : 'Select Property...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                    </TouchableOpacity>

                    <Text style={styles.formLabel} allowFontScaling={false}>BUILDING PORTFOLIO</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('building');
                        setPickerModalOpen(true);
                      }}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false}>
                        {incomeBuildingId ? buildings.find(b => b.id === incomeBuildingId)?.name : 'Select Building...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                    </TouchableOpacity>

                    <Text style={styles.formLabel} allowFontScaling={false}>RENTABLE UNIT</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('unit');
                        setPickerModalOpen(true);
                      }}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false}>
                        {incomeUnitId ? `Unit ${units.find(u => u.id === incomeUnitId)?.unitNumber}` : 'Select Unit...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
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
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>{incomeCategory}</Text>
                  <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                </TouchableOpacity>

                <Text style={styles.formLabel} allowFontScaling={false}>PAYMENT AMOUNT ($)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="$ 150"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={incomeAmount}
                  onChangeText={setIncomeAmount}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateIncomeOpen(false)} disabled={submitting}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleSaveIncome} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#0f172a" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>Save Income</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- 3. RECORD EXPENSE MODAL --- */}
      <Modal visible={createExpenseOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Record Expense Transaction</Text>
                <TouchableOpacity onPress={() => setCreateExpenseOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
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
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>{expensePayeeType}</Text>
                  <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                </TouchableOpacity>

                {/* Conditional Fields based on PAYEE TYPE */}
                {expensePayeeType === 'Vendor / Staff Payee' && (
                  <View>
                    <Text style={styles.formLabel} allowFontScaling={false}>PAYEE (STAFF / VENDOR)</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('vendor');
                        setPickerModalOpen(true);
                      }}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false}>
                        {expenseVendorId
                          ? (() => {
                              const s = staff.find(st => `staff-${st.id}` === expenseVendorId || st.id === expenseVendorId);
                              if (s) return `Staff: ${(`${s.firstName || ''} ${s.lastName || ''}`).trim() || s.name}`;
                              const v = vendors.find(vd => `vendor-${vd.id}` === expenseVendorId || vd.id === expenseVendorId);
                              if (v) return `Vendor: ${v.name}`;
                              return 'Select Payee...';
                            })()
                          : 'Select Payee...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                    </TouchableOpacity>

                    <Text style={styles.formLabel} allowFontScaling={false}>PROPERTY PORTFOLIO</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('property');
                        setPickerModalOpen(true);
                      }}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false}>
                        {expensePropertyId ? properties.find(p => p.id === expensePropertyId)?.name : 'Select Property...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                    </TouchableOpacity>

                    <Text style={styles.formLabel} allowFontScaling={false}>BUILDING PORTFOLIO</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('building');
                        setPickerModalOpen(true);
                      }}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false}>
                        {expenseBuildingId ? buildings.find(b => b.id === expenseBuildingId)?.name : 'Select Building...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                    </TouchableOpacity>

                    <Text style={styles.formLabel} allowFontScaling={false}>RENTABLE UNIT</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('unit');
                        setPickerModalOpen(true);
                      }}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false}>
                        {expenseUnitId ? `Unit ${units.find(u => u.id === expenseUnitId)?.unitNumber}` : 'Select Unit...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                  </View>
                )}

                {expensePayeeType === 'Tenant (Refund / Return)' && (
                  <View>
                    <Text style={styles.formLabel} allowFontScaling={false}>RESIDENT / TENANT PAYEE</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('tenant');
                        setPickerModalOpen(true);
                      }}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false}>
                        {expenseTenantId
                          ? tenants.find(t => t.id === expenseTenantId)
                            ? `${tenants.find(t => t.id === expenseTenantId).firstName || ''} ${tenants.find(t => t.id === expenseTenantId).lastName || ''}`.trim()
                            : 'Select Tenant...'
                          : 'Select Tenant...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                    </TouchableOpacity>

                    {renderLocationCard(expenseTenantId)}
                  </View>
                )}

                {expensePayeeType === 'Property Owner (Distribution)' && (
                  <View>
                    <Text style={styles.formLabel} allowFontScaling={false}>PROPERTY OWNER PAYEE</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('owner');
                        setPickerModalOpen(true);
                      }}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false}>
                        {expenseOwnerId
                          ? owners.find(o => o.id === expenseOwnerId)
                            ? `${owners.find(o => o.id === expenseOwnerId).firstName || ''} ${owners.find(o => o.id === expenseOwnerId).lastName || ''}`.trim()
                            : 'Select Owner...'
                          : 'Select Owner...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                    </TouchableOpacity>

                    {expenseOwnerId ? (
                      <View>
                        <Text style={styles.formLabel} allowFontScaling={false}>SELECT PROPERTY</Text>
                        <TouchableOpacity
                          style={styles.formPickerSelector}
                          onPress={() => {
                            setActivePicker('property');
                            setPickerModalOpen(true);
                          }}
                        >
                          <Text style={styles.formPickerText} allowFontScaling={false}>
                            {expensePropertyId ? properties.find(p => p.id === expensePropertyId)?.name : 'Choose Property...'}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                        </TouchableOpacity>
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
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>{expenseCategory}</Text>
                  <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                </TouchableOpacity>

                <Text style={styles.formLabel} allowFontScaling={false}>EXPENSE AMOUNT ($)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="$ 250"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateExpenseOpen(false)} disabled={submitting}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleSaveExpense} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#0f172a" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>Save Expense</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- SELECTION DROP DOWN PICKER SELECTOR OPTIONS --- */}
      <Modal visible={pickerModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle} allowFontScaling={false}>Select Option</Text>
            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={true}>
              {getPickerOptions().map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.pickerOptionRow}
                  onPress={() => handleSelectPickerOption(opt.value)}
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
  formLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  formInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 10,
    color: colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    fontWeight: '700',
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
  },
  formPickerText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
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
});

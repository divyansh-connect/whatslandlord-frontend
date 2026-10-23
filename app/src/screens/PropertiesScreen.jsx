import React, { useState, useEffect, useMemo } from 'react';
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
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore, safeStorage } from '../store/useStore';
import { useThemeColors } from '../theme';
import { propertySchema, unitSchema } from '../validations/mobile.validation';
import { CustomDatePicker } from '../components/CustomDatePicker';

const PROPERTY_TYPES = [
  'Apartment',
  'Single Family',
  'Multi Family',
  'Commercial',
  'Industrial',
  'Condo',
  'Townhouse',
  'Mixed-Use Property (MUP)',
  'HOA',
  'Other',
];
const PROPERTY_STATUSES = ['Active', 'Inactive', 'Under Review', 'Draft'];
const PAYMENT_ACCOUNT_SETUPS = [
  { label: '🏢 Use Company Default (Company Settings)', value: 'COMPANY_DEFAULT' },
  { label: '⚙️ Other (Custom Payment Gateway)', value: 'OTHER' },
];
const CUSTOM_GATEWAY_PROVIDERS = [
  { label: '💳 Stripe (Credit/Debit/Apple Pay)', value: 'STRIPE' },
  { label: '⚡ Razorpay (Cards, UPI & NetBanking)', value: 'RAZORPAY' },
  { label: '🔒 Authorize.Net (Credit Card & eCheck)', value: 'AUTHORIZE_NET' },
];
const GATEWAY_STATUSES = [
  { label: 'Active (Accepting Tenant Payments)', value: 'Active' },
  { label: 'Inactive (Temporarily Disabled)', value: 'Inactive' },
];
const UNIT_STATUSES = ['Occupied', 'Vacant', 'Reserved', 'Under Maintenance'];
const ID_TYPES = ['Driver License', 'Passport', 'State ID'];
const EMPLOYMENT_STATUSES = [
  'Full-Time',
  'Part-Time',
  'Self-Employed',
  'Unemployed',
  'Student',
  'Retired',
];
const OWNER_PAYOUT_METHODS = ['ACH/Direct Deposit', 'Wire Transfer', 'Check'];
const GENDERS = ['Male', 'Female', 'Other'];

export const normalizeGender = (g) => {
  if (!g) return 'Male';
  const s = String(g).trim().toLowerCase();
  if (s === 'female') return 'Female';
  if (s === 'other' || s.startsWith('oth')) return 'Other';
  return 'Male';
};

const parseDateSafe = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
      } else {
        // MM/DD/YYYY
        const m = parseInt(parts[0], 10) - 1;
        const d = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
      }
    }
  }
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
      } else {
        // MM-DD-YYYY
        const m = parseInt(parts[0], 10) - 1;
        const d = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
      }
    }
  }
  const dt = new Date(trimmed);
  return isNaN(dt.getTime()) ? null : dt;
};

// Helper to generate past months list (Matching Web NewUnitPage.tsx)
const generateMonthListFromMoveIn = (dateStr) => {
  if (!dateStr) return [];
  const start = parseDateSafe(dateStr);
  if (!start) return [];
  const now = new Date();
  // Ensure reference end date covers at least 2026-10-21 (matching Web 10 months past demo dataset)
  let refYear = Math.max(now.getFullYear(), 2026);
  let refMonth = 9; // October (index 9)
  if (now.getFullYear() > 2026) {
    refMonth = now.getMonth();
  } else if (now.getFullYear() === 2026) {
    refMonth = Math.max(now.getMonth(), 9);
  }

  let currentYear = start.getFullYear();
  let currentMonth = start.getMonth();

  if (currentYear > refYear || (currentYear === refYear && currentMonth > refMonth)) {
    return [];
  }

  const months = [];
  while (currentYear < refYear || (currentYear === refYear && currentMonth <= refMonth)) {
    const d = new Date(currentYear, currentMonth, 1);
    const id = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    months.push({ id, label });
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    if (months.length >= 36) break;
  }
  return months;
};

export const PropertiesScreen = ({ initialTab = 'properties' }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);

  // Tab State: 'properties' | 'units' | 'drafts'
  const [activeTab, setActiveTab] = useState(
    initialTab === 'units' ? 'units' : initialTab === 'drafts' ? 'drafts' : 'properties'
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data Collections (Live from Backend)
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [owners, setOwners] = useState([]);
  const [tenants, setTenants] = useState([]);

  // Selected for Details
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  // Quick Action Modals
  const [assignTenantUnit, setAssignTenantUnit] = useState(null);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [statusChangeUnit, setStatusChangeUnit] = useState(null);
  const [newStatusValue, setNewStatusValue] = useState('Vacant');

  // Form Modals (Add / Edit)
  const [isPropModalOpen, setIsPropModalOpen] = useState(false);
  const [editingPropId, setEditingPropId] = useState(null);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [editingTenantId, setEditingTenantId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Property Form Inputs (Matching Web 1:1 - Blank by default)
  const [pName, setPName] = useState('');
  const [pType, setPType] = useState('Apartment');
  const [pStatus, setPStatus] = useState('Active');
  const [pStreet, setPStreet] = useState('');
  const [pCity, setPCity] = useState('');
  const [pState, setPState] = useState('');
  const [pCountry, setPCountry] = useState('USA');
  const [pZip, setPZip] = useState('');
  const [pNycBin, setPNycBin] = useState('');
  const [pFloors, setPFloors] = useState('1');
  const [pUnitsCount, setPUnitsCount] = useState('1');
  const [pOwnerId, setPOwnerId] = useState('');
  const [pShare, setPShare] = useState('100');
  const [pManagementCompany, setPManagementCompany] = useState('');

  // Payment Integration & Merchant Account (Matching Web 1:1)
  const [pPaymentAccountSetup, setPPaymentAccountSetup] = useState('COMPANY_DEFAULT'); // 'COMPANY_DEFAULT' | 'OTHER'
  const [pCustomGateway, setPCustomGateway] = useState('RAZORPAY'); // 'STRIPE' | 'RAZORPAY' | 'AUTHORIZE_NET'
  const [pPaymentStatus, setPPaymentStatus] = useState('Active'); // 'Active' | 'Inactive'
  const [pPaymentAccountId, setPPaymentAccountId] = useState('');
  const [pPaymentAuthToken, setPPaymentAuthToken] = useState('');
  const [showPaymentSecret, setShowPaymentSecret] = useState(false);

  // Additional Details (Optional - blank by default)
  const [showPropAdditional, setShowPropAdditional] = useState(false);
  const [pYearBuilt, setPYearBuilt] = useState('');
  const [pSqft, setPSqft] = useState('');
  const [pPurchasePrice, setPPurchasePrice] = useState('');
  const [pCurrentValue, setPCurrentValue] = useState('');
  const [pExpenses, setPExpenses] = useState('');
  const [pPhotoUrl, setPPhotoUrl] = useState('');
  const [pNotes, setPNotes] = useState('');

  // Dropdown Picker Modal state for Property Form
  const [activePropDropdown, setActivePropDropdown] = useState(null); // 'type' | 'status' | 'owner' | 'paymentAccountSetup' | 'customGateway' | 'gatewayStatus' | null

  // Quick Add Owner Modal inside Property Form (Matching Web 1:1)
  const [isQuickAddOwnerOpen, setIsQuickAddOwnerOpen] = useState(false);
  const [newOwnerFullName, setNewOwnerFullName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPassword, setNewOwnerPassword] = useState('');
  const [showNewOwnerPassword, setShowNewOwnerPassword] = useState(false);
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newOwnerPayoutMethod, setNewOwnerPayoutMethod] = useState('ACH/Direct Deposit');
  const [showOwnerPayoutDropdown, setShowOwnerPayoutDropdown] = useState(false);
  const [creatingOwner, setCreatingOwner] = useState(false);

  // Unit Form Inputs
  const [uPropId, setUPropId] = useState('');
  const [showUnitPropDropdown, setShowUnitPropDropdown] = useState(false);
  const [uNumber, setUNumber] = useState('');
  const [uFloor, setUFloor] = useState('1');
  const [uBeds, setUBeds] = useState('');
  const [uBaths, setUBaths] = useState('');
  const [uSqft, setUSqft] = useState('');
  const [uRent, setURent] = useState('');
  const [uDeposit, setUDeposit] = useState('');
  const [uStatus, setUStatus] = useState('Vacant');

  // Late Fee & Grace Period
  const [uLateFeeEnabled, setULateFeeEnabled] = useState(false);
  const [uLateFeeType, setULateFeeType] = useState('FLAT');
  const [uLateFeeAmount, setULateFeeAmount] = useState('');
  const [uLateFeeGraceDays, setULateFeeGraceDays] = useState('');

  // Vacant Advertising
  const [uWantToAdvertise, setUWantToAdvertise] = useState('yes');
  const [uAdvertiseTime, setUAdvertiseTime] = useState('now');

  // Occupied Tenant Onboarding (Matching Web Screenshot)
  const [uProvideTenantInfo, setUProvideTenantInfo] = useState('now');
  const [tFirstName, setTFirstName] = useState('');
  const [tLastName, setTLastName] = useState('');
  const [tPreferredName, setTPreferredName] = useState('');
  const [tDob, setTDob] = useState('');
  const [tGender, setTGender] = useState('Male');
  const [tEmail, setTEmail] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tAltPhone, setTAltPhone] = useState('');
  const [tPassword, setTPassword] = useState('');
  const [tShowPassword, setTShowPassword] = useState(false);
  const [tMoveInDate, setTMoveInDate] = useState('');
  const [tInvoiceStartDate, setTInvoiceStartDate] = useState('');
  const [tOutstandingBalance, setTOutstandingBalance] = useState('0');

  // Calendar Date Picker Modal States
  const [showMoveInPicker, setShowMoveInPicker] = useState(false);
  const [showInvoiceStartPicker, setShowInvoiceStartPicker] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);

  // Monthly Billing Status States (Matching Web Screenshot 3)
  const [includeMonthlyLateFee, setIncludeMonthlyLateFee] = useState(false);
  const [monthPaymentDetails, setMonthPaymentDetails] = useState({});
  const [activeMonthPopover, setActiveMonthPopover] = useState(null); // { id, label }
  const [partialAmountInput, setPartialAmountInput] = useState('');

  // Tenant Additional Optional Accordion (Matching Web 1:1)
  const [showTenantExtra, setShowTenantExtra] = useState(false);
  const [tSsn, setTSsn] = useState('');
  const [tIdType, setTIdType] = useState('Driver License');
  const [tIdNumber, setTIdNumber] = useState('');
  const [tEmergencyName, setTEmergencyName] = useState('');
  const [tEmergencyRelationship, setTEmergencyRelationship] = useState('');
  const [tEmergencyPhone, setTEmergencyPhone] = useState('');
  const [tEmployer, setTEmployer] = useState('');
  const [tPosition, setTPosition] = useState('');
  const [tEmployerPhone, setTEmployerPhone] = useState('');
  const [tMonthlyIncome, setTMonthlyIncome] = useState('');
  const [tEmploymentStatus, setTEmploymentStatus] = useState('Full-Time');
  const [tCurrentAddress, setTCurrentAddress] = useState('');
  const [tPreviousAddress, setTPreviousAddress] = useState('');
  const [activeUnitDropdown, setActiveUnitDropdown] = useState(null); // 'idType' | 'employmentStatus' | null

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab === 'units' ? 'units' : initialTab === 'drafts' ? 'drafts' : 'properties');
    }
  }, [initialTab]);

  // Live Data Fetch (Exact Web APIs)
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [propsRes, unitsRes, ownersRes, tenantsRes] = await Promise.all([
        apiClient.get('/properties', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/units', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/owners', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/tenants', logout, refreshAccessToken).catch(() => null),
      ]);

      setProperties(Array.isArray(propsRes) ? propsRes : (propsRes?.data || []));
      setUnits(Array.isArray(unitsRes) ? unitsRes : (unitsRes?.data || []));
      setOwners(Array.isArray(ownersRes) ? ownersRes : (ownersRes?.data || []));
      setTenants(Array.isArray(tenantsRes) ? tenantsRes : (tenantsRes?.data || []));
    } catch (e) {
      console.log('Error fetching properties data:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  // Helper address
  const formatAddress = (addr) => {
    if (!addr) return 'Austin, TX';
    return String(addr).split(',').slice(0, 2).join(', ').trim();
  };

  // --------------------------------------------------------------------------
  // MONTHLY BILLING STATUS LOGIC (Matching Web Screenshot 3)
  // --------------------------------------------------------------------------
  const pastMonths = useMemo(() => {
    return generateMonthListFromMoveIn(tInvoiceStartDate || tMoveInDate);
  }, [tInvoiceStartDate, tMoveInDate]);

  // Recalculate Outstanding Balance
  useEffect(() => {
    const rentVal = Number(uRent) || 1500;
    const lateFeeVal = includeMonthlyLateFee ? 50 : 0;
    let totalUnpaid = 0;

    pastMonths.forEach((m) => {
      const d = monthPaymentDetails[m.id] || { status: 'Unpaid', paidAmount: 0 };
      if (d.status === 'Paid') {
        // paid
      } else if (d.status === 'Partial') {
        const p = Math.min(rentVal, Number(d.paidAmount || 0));
        totalUnpaid += Math.max(0, rentVal + lateFeeVal - p);
      } else {
        totalUnpaid += (rentVal + lateFeeVal);
      }
    });

    setTOutstandingBalance(String(totalUnpaid));
  }, [pastMonths, monthPaymentDetails, includeMonthlyLateFee, uRent]);

  // Counts for Badges
  const { paidCount, paidTotal, unpaidCount, unpaidTotal, partialCount } = useMemo(() => {
    const rentVal = Number(uRent) || 1500;
    const lateFeeVal = includeMonthlyLateFee ? 50 : 0;
    let pCount = 0;
    let pTotal = 0;
    let uCount = 0;
    let uTotal = 0;
    let partCount = 0;

    pastMonths.forEach((m) => {
      const d = monthPaymentDetails[m.id] || { status: 'Unpaid', paidAmount: 0 };
      if (d.status === 'Paid') {
        pCount++;
        pTotal += rentVal;
      } else if (d.status === 'Partial') {
        partCount++;
        const p = Math.min(rentVal, Number(d.paidAmount || 0));
        pTotal += p;
        uCount++;
        uTotal += Math.max(0, rentVal + lateFeeVal - p);
      } else {
        uCount++;
        uTotal += (rentVal + lateFeeVal);
      }
    });

    return { paidCount: pCount, paidTotal: pTotal, unpaidCount: uCount, unpaidTotal: uTotal, partialCount: partCount };
  }, [pastMonths, monthPaymentDetails, includeMonthlyLateFee, uRent]);

  const handleSetMonthStatus = (monthId, newStatus, paidAmount = 0) => {
    const rentVal = Number(uRent) || 1500;
    const finalPaid = newStatus === 'Paid' ? rentVal : newStatus === 'Partial' ? Math.min(rentVal, Number(paidAmount)) : 0;
    setMonthPaymentDetails((prev) => ({
      ...prev,
      [monthId]: {
        status: newStatus,
        paidAmount: finalPaid,
      },
    }));
    setActiveMonthPopover(null);
  };

  // Filtered lists
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (p.status === 'Draft' || p.status === 'Inactive') return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q) ||
        (p.type || '').toLowerCase().includes(q)
      );
    });
  }, [properties, searchQuery]);

  const filteredDrafts = useMemo(() => {
    return properties.filter((p) => {
      if (p.status !== 'Draft') return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (p.name || '').toLowerCase().includes(q);
    });
  }, [properties, searchQuery]);

  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const uNum = String(u.unitNumber || '');
      const pName = u.propertyName || (u.property ? u.property.name : '');
      if (!q) return true;
      return uNum.toLowerCase().includes(q) || pName.toLowerCase().includes(q);
    });
  }, [units, searchQuery]);

  // --------------------------------------------------------------------------
  // PROPERTY ACTIONS (Matching Web 1:1)
  // --------------------------------------------------------------------------
  const handleOpenAddProperty = () => {
    setEditingPropId(null);
    setPName('');
    setPType('Apartment');
    setPStatus('Active');
    setPStreet('');
    setPCity('');
    setPState('');
    setPCountry('USA');
    setPZip('');
    setPNycBin('');
    setPOwnerId('');
    setPShare('100');
    setPManagementCompany('');
    setPFloors('1');
    setPUnitsCount('1');
    setPPaymentAccountSetup('COMPANY_DEFAULT');
    setPCustomGateway('RAZORPAY');
    setPPaymentStatus('Active');
    setPPaymentAccountId('');
    setPPaymentAuthToken('');
    setShowPaymentSecret(false);
    setShowPropAdditional(false);
    setPYearBuilt('');
    setPSqft('');
    setPPurchasePrice('');
    setPCurrentValue('');
    setPExpenses('');
    setPPhotoUrl('');
    setPNotes('');
    setFormErrors({});
    setIsPropModalOpen(true);
  };

  const handleOpenEditProperty = (prop) => {
    setEditingPropId(prop.id);
    setPName(prop.name || '');
    setPType(prop.type || 'Apartment');
    setPStatus(prop.status || 'Active');
    setPStreet(prop.streetAddress || prop.address || '');
    setPCity(prop.city || '');
    setPState(prop.state || '');
    setPCountry(prop.country || 'USA');
    setPZip(prop.zip || '');
    setPNycBin(prop.nycBin || prop.bin || '');
    setPOwnerId(prop.ownerId || (typeof prop.owner === 'object' ? prop.owner?.id : prop.owner) || '');
    setPShare(String(prop.ownershipPercentage ?? 100));
    setPManagementCompany(prop.managementCompany || '');
    setPFloors(String(prop.totalFloors || prop.floors || 1));
    setPUnitsCount(String(prop.totalUnits || prop.unitsCount || 1));

    const isCompanyDefault = !prop.paymentProvider || prop.paymentProvider === 'COMPANY_DEFAULT';
    setPPaymentAccountSetup(isCompanyDefault ? 'COMPANY_DEFAULT' : 'OTHER');
    setPCustomGateway(isCompanyDefault ? 'RAZORPAY' : (prop.paymentProvider || 'RAZORPAY'));
    setPPaymentStatus(prop.paymentStatus || 'Active');
    setPPaymentAccountId(prop.paymentAccountId || '');
    setPPaymentAuthToken('');
    setShowPaymentSecret(false);

    setShowPropAdditional(false);
    setPYearBuilt(prop.yearBuilt ? String(prop.yearBuilt) : '');
    setPSqft(prop.squareFootage ? String(prop.squareFootage) : '');
    setPPurchasePrice(prop.purchasePrice ? String(prop.purchasePrice) : '');
    setPCurrentValue(prop.currentValue ? String(prop.currentValue) : '');
    setPExpenses(prop.monthlyExpenses ? String(prop.monthlyExpenses) : '');
    setPPhotoUrl(prop.photoUrl || prop.photo || '');
    setPNotes(prop.notes || prop.description || '');
    setFormErrors({});
    setIsPropModalOpen(true);
  };

  // Add Property Owner Action (Matching Web 1:1)
  const handleQuickAddOwner = async () => {
    if (!newOwnerFullName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    if (!newOwnerEmail.trim() || !newOwnerEmail.includes('@')) {
      Alert.alert('Validation Error', 'Invalid email address.');
      return;
    }
    if (!newOwnerPhone.trim()) {
      Alert.alert('Validation Error', 'Phone is required.');
      return;
    }
    try {
      setCreatingOwner(true);
      const [first = '', ...rest] = newOwnerFullName.trim().split(' ');
      const payload = {
        name: newOwnerFullName.trim(),
        firstName: first,
        lastName: rest.join(' ') || 'Owner',
        email: newOwnerEmail.trim(),
        phone: newOwnerPhone.trim(),
        payoutMethod: newOwnerPayoutMethod || 'ACH/Direct Deposit',
        password: newOwnerPassword.trim() || 'Password123!',
        role: 'Owner',
      };
      const res = await apiClient.post('/owners', payload, logout, refreshAccessToken);
      const newOwner = res?.data || res;
      // Refresh owners list
      const ownersRes = await apiClient.get('/owners', logout, refreshAccessToken).catch(() => null);
      const updatedOwners = Array.isArray(ownersRes) ? ownersRes : (ownersRes?.data || []);
      setOwners(updatedOwners);
      if (newOwner?.id) {
        setPOwnerId(newOwner.id);
      } else if (updatedOwners.length > 0) {
        setPOwnerId(updatedOwners[updatedOwners.length - 1].id);
      }
      setIsQuickAddOwnerOpen(false);
      setNewOwnerFullName('');
      setNewOwnerEmail('');
      setNewOwnerPhone('');
      setNewOwnerPassword('');
      setShowNewOwnerPassword(false);
      setNewOwnerPayoutMethod('ACH/Direct Deposit');
      setShowOwnerPayoutDropdown(false);
      Alert.alert('Success', 'Owner added and selected successfully!');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add owner.');
    } finally {
      setCreatingOwner(false);
    }
  };

  const handleSaveProperty = async (saveAsDraft = false) => {
    setFormErrors({});
    const targetStatus = saveAsDraft ? 'Draft' : pStatus;
    const finalPaymentProvider = pPaymentAccountSetup === 'COMPANY_DEFAULT' ? 'COMPANY_DEFAULT' : pCustomGateway;
    const payload = {
      name: pName.trim(),
      type: pType,
      status: targetStatus,
      streetAddress: pStreet.trim() || undefined,
      city: pCity.trim() || undefined,
      state: pState.trim() || undefined,
      country: pCountry.trim() || 'USA',
      zip: pZip.trim() || undefined,
      nycBin: pNycBin.trim() || undefined,
      address: pStreet.trim()
        ? `${pStreet.trim()}, ${pCity.trim()}, ${pState.trim()}`
        : pCity.trim()
        ? `${pCity.trim()}, ${pState.trim()}`
        : undefined,
      ownerId: pOwnerId.trim() || undefined,
      ownershipPercentage: pShare.trim() ? Number(pShare) : 100,
      managementCompany: pManagementCompany.trim() || undefined,
      yearBuilt: pYearBuilt.trim() ? Number(pYearBuilt) : undefined,
      totalFloors: pFloors.trim() ? Number(pFloors) : 1,
      totalBuildings: pFloors.trim() ? Number(pFloors) : 1,
      totalUnits: pUnitsCount.trim() ? Number(pUnitsCount) : 1,
      squareFootage: pSqft.trim() ? Number(pSqft) : undefined,
      purchasePrice: pPurchasePrice.trim() ? Number(pPurchasePrice) : undefined,
      currentValue: pCurrentValue.trim() ? Number(pCurrentValue) : undefined,
      monthlyExpenses: pExpenses.trim() ? Number(pExpenses) : undefined,
      paymentProvider: finalPaymentProvider,
      paymentAccountId: pPaymentAccountSetup === 'COMPANY_DEFAULT' ? undefined : (pPaymentAccountId.trim() || undefined),
      paymentAuthToken: pPaymentAccountSetup === 'COMPANY_DEFAULT' ? undefined : (pPaymentAuthToken.trim() || undefined),
      paymentStatus: pPaymentAccountSetup === 'COMPANY_DEFAULT' ? 'Active' : pPaymentStatus,
      photoUrl: pPhotoUrl.trim() || undefined,
      notes: pNotes.trim() || undefined,
    };

    const valResult = propertySchema.safeParse(payload);
    if (!valResult.success) {
      const errMap = {};
      valResult.error.issues.forEach((issue) => {
        errMap[issue.path[0]] = issue.message;
      });
      setFormErrors(errMap);
      return;
    }

    try {
      setSubmitting(true);
      if (editingPropId) {
        await apiClient.put(`/properties/${editingPropId}`, valResult.data, logout, refreshAccessToken);
        Alert.alert('Success', 'Property updated successfully.');
      } else {
        await apiClient.post('/properties', valResult.data, logout, refreshAccessToken);
        Alert.alert('Success', saveAsDraft ? 'Draft saved.' : 'Property added successfully.');
      }
      setIsPropModalOpen(false);
      fetchAllData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save property');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProperty = (id, name) => {
    Alert.alert('Delete Property', `Delete "${name}"? This action cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await apiClient.delete(`/properties/${id}`, logout, refreshAccessToken);
            fetchAllData();
          } catch (err) {
            Alert.alert('Error', err.message || 'Failed to delete');
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handlePublishDraft = async (id, name) => {
    try {
      setLoading(true);
      await apiClient.put(`/properties/${id}`, { status: 'Active' }, logout, refreshAccessToken);
      Alert.alert('Success', `"${name}" is now Active.`);
      fetchAllData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to publish');
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // UNIT ACTIONS (Matching Web 1:1)
  // --------------------------------------------------------------------------
  const handleOpenAddUnit = (preselectedPropId = null) => {
    setEditingUnitId(null);
    setEditingTenantId(null);
    setUPropId(preselectedPropId || '');
    setShowUnitPropDropdown(false);
    setUNumber('');
    setUFloor('1');
    setUBeds('');
    setUBaths('');
    setUSqft('');
    setURent('');
    setUDeposit('');
    setUStatus('Vacant'); // Clean Vacant by default

    setULateFeeEnabled(false);
    setULateFeeType('FLAT');
    setULateFeeAmount('');
    setULateFeeGraceDays('');

    setUProvideTenantInfo('now');
    setTFirstName('');
    setTLastName('');
    setTPreferredName('');
    setTDob('');
    setTGender('Male');
    setTEmail('');
    setTPhone('');
    setTAltPhone('');
    setTPassword('');
    setTShowPassword(false);
    setTMoveInDate('');
    setTInvoiceStartDate('');
    setTOutstandingBalance('0');

    setIncludeMonthlyLateFee(false);
    setMonthPaymentDetails({});
    setActiveMonthPopover(null);
    setShowTenantExtra(false);
    setTSsn('');
    setTIdType('Driver License');
    setTIdNumber('');
    setTEmergencyName('');
    setTEmergencyRelationship('');
    setTEmergencyPhone('');
    setTEmployer('');
    setTPosition('');
    setTEmployerPhone('');
    setTMonthlyIncome('');
    setTEmploymentStatus('Full-Time');
    setTCurrentAddress('');
    setTPreviousAddress('');

    setFormErrors({});
    setIsUnitModalOpen(true);
  };

  const handleOpenEditUnit = async (unit) => {
    setEditingUnitId(unit.id);
    setUPropId(unit.propertyId || properties[0]?.id || '');
    setUNumber(String(unit.unitNumber || ''));
    setUFloor(String(unit.floor || '1'));
    setUBeds(unit.bedrooms !== undefined && unit.bedrooms !== null ? String(unit.bedrooms) : '');
    setUBaths(unit.bathrooms !== undefined && unit.bathrooms !== null ? String(unit.bathrooms) : '');
    setUSqft(unit.squareFootage !== undefined && unit.squareFootage !== null ? String(unit.squareFootage) : '');
    setURent(unit.rentAmount !== undefined && unit.rentAmount !== null ? String(unit.rentAmount) : '');
    setUDeposit(unit.securityDeposit !== undefined && unit.securityDeposit !== null ? String(unit.securityDeposit) : '');
    setUStatus(unit.status || 'Vacant');

    setULateFeeEnabled(Boolean(unit.isLateFeeEnabled));
    setULateFeeType(unit.lateFeeType || 'FLAT');
    setULateFeeAmount(unit.lateFeeAmount ? String(unit.lateFeeAmount) : '');
    setULateFeeGraceDays(unit.lateFeeGraceDays ? String(unit.lateFeeGraceDays) : '');

    setUProvideTenantInfo('now');

    // Fetch live unit data from backend to ensure changes from Web are immediately visible in App
    let liveUnit = unit;
    try {
      const freshRes = await apiClient.get(`/units/${unit.id}`, logout, refreshAccessToken);
      if (freshRes?.data || freshRes) {
        liveUnit = freshRes.data || freshRes;
      }
    } catch (e) {
      console.debug('[PropertiesScreen] Using cached unit data:', e.message);
    }

    const existingT = (liveUnit.tenants && liveUnit.tenants[0]) || liveUnit.tenant || tenants.find((item) => item.unitId === liveUnit.id || item.id === liveUnit.tenantId);
    const tId = existingT?.id || liveUnit.tenantId || (liveUnit.tenants && liveUnit.tenants[0]?.id) || null;
    setEditingTenantId(tId);

    if (existingT) {
      setTFirstName(existingT.firstName || '');
      setTLastName(existingT.lastName || '');
      setTPreferredName(existingT.preferredName || '');
      setTDob(existingT.dob ? String(existingT.dob).split('T')[0] : '');

      const cachedG = tId ? await safeStorage.getItem('tenant_gender_' + tId) : null;
      const unitCachedG = await safeStorage.getItem('unit_tenant_gender_' + unit.id);
      const resolvedGender = normalizeGender(cachedG || unitCachedG || existingT.gender || (['Male', 'Female', 'Other'].includes(existingT.nationality) ? existingT.nationality : null) || 'Male');
      setTGender(resolvedGender);

      setTEmail(existingT.email || '');
      setTPhone(existingT.phone || '');
      setTAltPhone(existingT.altPhone || '');
      setTPassword('');
      setTMoveInDate(existingT.moveInDate ? String(existingT.moveInDate).split('T')[0] : '');
      setTInvoiceStartDate(existingT.invoiceStartDate ? String(existingT.invoiceStartDate).split('T')[0] : (existingT.moveInDate ? String(existingT.moveInDate).split('T')[0] : ''));
      setTOutstandingBalance(String(existingT.openingBalance ?? existingT.previousBalance ?? '0'));
      setTSsn(existingT.ssn || '');
      setTIdType(existingT.idType || 'Driver License');
      setTIdNumber(existingT.idNumber || '');
      setTEmergencyName(existingT.emergencyName || '');
      setTEmergencyRelationship(existingT.emergencyRelationship || '');
      setTEmergencyPhone(existingT.emergencyPhone || '');
      setTEmployer(existingT.employer || '');
      setTPosition(existingT.position || '');
      setTEmployerPhone(existingT.employerPhone || existingT.jobPhone || '');
      setTMonthlyIncome(existingT.monthlyIncome ? String(existingT.monthlyIncome) : '');
      setTEmploymentStatus(existingT.employmentStatus || 'Full-Time');
      setTCurrentAddress(existingT.currentAddress || '');
      setTPreviousAddress(existingT.previousAddress || '');
    } else {
      setTFirstName('');
      setTLastName('');
      setTPreferredName('');
      setTDob('');
      setTGender('Male');
      setTEmail('');
      setTPhone('');
      setTAltPhone('');
      setTPassword('');
      setTMoveInDate('');
      setTInvoiceStartDate('');
      setTOutstandingBalance('0');
      setTSsn('');
      setTIdType('Driver License');
      setTIdNumber('');
      setTEmergencyName('');
      setTEmergencyRelationship('');
      setTEmergencyPhone('');
      setTEmployer('');
      setTPosition('');
      setTEmployerPhone('');
      setTMonthlyIncome('');
      setTEmploymentStatus('Full-Time');
      setTCurrentAddress('');
      setTPreviousAddress('');
    }

    setIncludeMonthlyLateFee(false);
    setMonthPaymentDetails({});
    setActiveMonthPopover(null);
    setShowTenantExtra(false);
    setFormErrors({});
    setIsUnitModalOpen(true);
  };

  const handleSaveUnit = async () => {
    setFormErrors({});
    const errMap = {};

    if (!uPropId) {
      errMap.propertyId = 'Please select a property.';
    }
    if (!uNumber.trim()) {
      errMap.unitNumber = 'Unit Number is required.';
    }

    if (uStatus === 'Occupied') {
      if (!tFirstName.trim()) errMap.tFirstName = 'First Name is required.';
      if (!tLastName.trim()) errMap.tLastName = 'Last Name is required.';
      if (!tEmail.trim() && !tPhone.trim()) {
        errMap.tContact = 'Email or Mobile Phone is required for the resident.';
      }
    }

    if (Object.keys(errMap).length > 0) {
      setFormErrors(errMap);
      return;
    }

    const selectedProp = properties.find((p) => p.id === uPropId);

    const unitPayload = {
      propertyId: uPropId,
      unitNumber: uNumber.trim(),
      floor: Number(uFloor) || 1,
      bedrooms: Number(uBeds) || 0,
      bathrooms: Number(uBaths) || 0,
      squareFootage: Number(uSqft) || 0,
      rentAmount: Number(uRent) || 0,
      securityDeposit: Number(uDeposit) || 0,
      status: uStatus,
      propertyName: selectedProp ? selectedProp.name : 'Property',
      isLateFeeEnabled: uLateFeeEnabled,
      lateFeeType: uLateFeeType,
      lateFeeAmount: uLateFeeEnabled ? Number(uLateFeeAmount) : null,
      lateFeeGraceDays: uLateFeeEnabled ? Number(uLateFeeGraceDays) : null,
      advertiseListing: uStatus === 'Vacant' && uWantToAdvertise === 'yes' && uAdvertiseTime === 'now',
    };

    try {
      setSubmitting(true);

      if (editingUnitId) {
        await apiClient.put(`/units/${editingUnitId}`, unitPayload, logout, refreshAccessToken);

        if (uStatus === 'Occupied' && tFirstName && tLastName) {
          try {
            const finalGender = normalizeGender(tGender);
            const tenantPayload = {
              firstName: tFirstName.trim(),
              lastName: tLastName.trim(),
              preferredName: tPreferredName.trim() || undefined,
              email: tEmail.trim() || undefined,
              phone: tPhone.trim() || undefined,
              altPhone: tAltPhone.trim() || undefined,
              dob: tDob || undefined,
              gender: finalGender,
              nationality: finalGender,
              status: 'Active',
              unitId: editingUnitId,
              propertyId: uPropId,
              propertyName: selectedProp?.name || 'Property',
              unitNumber: uNumber.trim(),
              moveInDate: tMoveInDate,
              invoiceStartDate: tInvoiceStartDate || tMoveInDate,
              previousBalance: Number(tOutstandingBalance) || 0,
              openingBalance: Number(tOutstandingBalance) || 0,
              ssn: tSsn.trim() || undefined,
              idType: tIdType || 'Driver License',
              idNumber: tIdNumber.trim() || undefined,
              emergencyName: tEmergencyName.trim() || undefined,
              emergencyRelationship: tEmergencyRelationship.trim() || undefined,
              emergencyPhone: tEmergencyPhone.trim() || undefined,
              employer: tEmployer.trim() || undefined,
              employerPhone: tEmployerPhone.trim() || undefined,
              jobPhone: tEmployerPhone.trim() || undefined,
              position: tPosition.trim() || undefined,
              monthlyIncome: tMonthlyIncome.trim() ? Number(tMonthlyIncome) : undefined,
              employmentStatus: tEmploymentStatus || 'Full-Time',
              currentAddress: tCurrentAddress.trim() || undefined,
              previousAddress: tPreviousAddress.trim() || undefined,
            };

            let targetTenantId = editingTenantId;
            if (!targetTenantId) {
              const existingTenant = tenants.find((item) => item.unitId === editingUnitId || (item.email && item.email.toLowerCase() === tEmail.trim().toLowerCase()));
              targetTenantId = existingTenant?.id;
            }

            if (targetTenantId) {
              await apiClient.put(`/tenants/${targetTenantId}`, tenantPayload, logout, refreshAccessToken);
              await safeStorage.setItem('tenant_gender_' + targetTenantId, finalGender);
              await safeStorage.setItem('unit_tenant_gender_' + editingUnitId, finalGender);
            } else {
              const createdTenantRes = await apiClient.post('/tenants', tenantPayload, logout, refreshAccessToken).catch(() => null);
              const createdTenant = createdTenantRes?.data || createdTenantRes;
              if (createdTenant?.id) {
                await safeStorage.setItem('tenant_gender_' + createdTenant.id, finalGender);
                await safeStorage.setItem('unit_tenant_gender_' + editingUnitId, finalGender);
                await apiClient.post(
                  `/units/${editingUnitId}/assign-tenant`,
                  { tenantId: createdTenant.id },
                  logout,
                  refreshAccessToken
                ).catch(() => null);
              }
            }
          } catch (tErr) {
            console.warn('Tenant update/create error:', tErr.message);
          }
        }

        Alert.alert('Success', 'Unit updated successfully.');
      } else {
        const createdUnitRes = await apiClient.post('/units', unitPayload, logout, refreshAccessToken);
        const createdUnit = createdUnitRes?.data || createdUnitRes;

        if (uStatus === 'Occupied' && tFirstName && tLastName) {
          try {
            const finalGender = normalizeGender(tGender);
            const tenantPayload = {
              firstName: tFirstName.trim(),
              lastName: tLastName.trim(),
              preferredName: tPreferredName.trim() || undefined,
              email: tEmail.trim() || undefined,
              phone: tPhone.trim() || undefined,
              altPhone: tAltPhone.trim() || undefined,
              password: tPassword.trim() || '123456',
              dob: tDob || undefined,
              gender: finalGender,
              nationality: finalGender,
              status: 'Active',
              unitId: createdUnit?.id,
              propertyId: uPropId,
              propertyName: selectedProp?.name || 'Property',
              unitNumber: uNumber.trim(),
              moveInDate: tMoveInDate,
              invoiceStartDate: tInvoiceStartDate || tMoveInDate,
              previousBalance: Number(tOutstandingBalance) || 0,
              openingBalance: Number(tOutstandingBalance) || 0,
              ssn: tSsn.trim() || undefined,
              idType: tIdType || 'Driver License',
              idNumber: tIdNumber.trim() || undefined,
              emergencyName: tEmergencyName.trim() || undefined,
              emergencyRelationship: tEmergencyRelationship.trim() || undefined,
              emergencyPhone: tEmergencyPhone.trim() || undefined,
              employer: tEmployer.trim() || undefined,
              employerPhone: tEmployerPhone.trim() || undefined,
              jobPhone: tEmployerPhone.trim() || undefined,
              position: tPosition.trim() || undefined,
              monthlyIncome: tMonthlyIncome.trim() ? Number(tMonthlyIncome) : undefined,
              employmentStatus: tEmploymentStatus || 'Full-Time',
              currentAddress: tCurrentAddress.trim() || undefined,
              previousAddress: tPreviousAddress.trim() || undefined,
            };

            const createdTenantRes = await apiClient.post('/tenants', tenantPayload, logout, refreshAccessToken);
            const createdTenant = createdTenantRes?.data || createdTenantRes;

            if (createdTenant?.id) {
              await safeStorage.setItem('tenant_gender_' + createdTenant.id, finalGender);
              if (createdUnit?.id) {
                await safeStorage.setItem('unit_tenant_gender_' + createdUnit.id, finalGender);
              }
            }

            if (createdUnit?.id && createdTenant?.id) {
              await apiClient.post(
                `/units/${createdUnit.id}/assign-tenant`,
                { tenantId: createdTenant.id },
                logout,
                refreshAccessToken
              ).catch(() => null);

              const moveInParsed = parseDateSafe(tMoveInDate) || new Date();
              const endDate = new Date(moveInParsed);
              endDate.setFullYear(endDate.getFullYear() + 1);
              await apiClient.post(
                '/leases',
                {
                  tenantId: createdTenant.id,
                  tenantName: `${tFirstName} ${tLastName}`.trim(),
                  propertyId: uPropId,
                  propertyName: selectedProp?.name || 'Property',
                  unitId: createdUnit.id,
                  unitNumber: uNumber.trim(),
                  rentAmount: Number(uRent) || 1500,
                  securityDeposit: Number(uDeposit) || 1500,
                  startDate: tMoveInDate,
                  endDate: endDate.toISOString().split('T')[0],
                  status: 'Active',
                },
                logout,
                refreshAccessToken
              ).catch(() => null);
            }
          } catch (tErr) {
            console.warn('Tenant creation error:', tErr.message);
          }
        }

        Alert.alert('Success', 'Unit created successfully with resident & lease!');
      }

      setIsUnitModalOpen(false);
      fetchAllData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save unit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTenant = async () => {
    if (!assignTenantUnit || !selectedTenantId) return;
    try {
      setSubmitting(true);
      await apiClient.post(`/units/${assignTenantUnit.id}/assign-tenant`, { tenantId: selectedTenantId }, logout, refreshAccessToken);
      Alert.alert('Success', 'Tenant assigned.');
      setAssignTenantUnit(null);
      setSelectedTenantId('');
      fetchAllData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to assign tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUnitStatus = async () => {
    if (!statusChangeUnit) return;
    try {
      setSubmitting(true);
      await apiClient.put(`/units/${statusChangeUnit.id}`, { status: newStatusValue }, logout, refreshAccessToken);
      Alert.alert('Success', 'Status updated.');
      setStatusChangeUnit(null);
      fetchAllData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUnit = (id, number) => {
    Alert.alert('Delete Unit', `Delete Unit "${number}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await apiClient.delete(`/units/${id}`, logout, refreshAccessToken);
            fetchAllData();
          } catch (err) {
            Alert.alert('Error', err.message || 'Failed to delete unit');
            setLoading(false);
          }
        },
      },
    ]);
  };

  // --------------------------------------------------------------------------
  // RENDER LOADING
  // --------------------------------------------------------------------------
  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.mutedText} allowFontScaling={false}>Loading data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {/* TOP BAR: TITLE + ACTION */}
        <View style={styles.topHeader}>
          <Text style={styles.screenTitle} allowFontScaling={false}>
            {activeTab === 'properties' ? 'Properties' : activeTab === 'units' ? 'Units' : 'Drafts'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={activeTab === 'units' ? () => handleOpenAddUnit() : handleOpenAddProperty}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#0f172a" />
              <Text style={styles.addBtnText} allowFontScaling={false}>
                {activeTab === 'units' ? 'Add Unit' : 'Add Property'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SIMPLE TABS (Properties | Units | Drafts) */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'properties' && styles.tabActive]}
            onPress={() => {
              setActiveTab('properties');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'properties' && styles.tabTextActive]} allowFontScaling={false}>
              Properties ({properties.filter((p) => p.status !== 'Draft' && p.status !== 'Inactive').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'units' && styles.tabActive]}
            onPress={() => {
              setActiveTab('units');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'units' && styles.tabTextActive]} allowFontScaling={false}>
              Units ({units.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'drafts' && styles.tabActive]}
            onPress={() => {
              setActiveTab('drafts');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'drafts' && styles.tabTextActive]} allowFontScaling={false}>
              Drafts ({properties.filter((p) => p.status === 'Draft').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH INPUT */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'units' ? 'Search by unit number or property...' : 'Search by name, address, city...'}
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            allowFontScaling={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* LIST VIEW */}
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        >
          {/* TAB 1: PROPERTIES */}
          {activeTab === 'properties' && (
            <>
              {filteredProperties.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText} allowFontScaling={false}>No properties found</Text>
                </View>
              ) : (
                filteredProperties.map((p) => {
                  const totalUnits = p.units?.length || p.unitsCount || 0;
                  const occUnits = p.units?.filter((u) => u.status === 'Occupied').length || p.occupiedUnits || 0;
                  const revenue = p.units?.reduce((sum, u) => sum + (Number(u.rentAmount) || 0), 0) || p.monthlyRevenue || 0;
                  const ownerName = p.owner ? (typeof p.owner === 'object' ? p.owner.name : p.owner) : (owners.find((o) => o.id === p.ownerId)?.name || 'Owner');

                  return (
                    <View key={p.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle} allowFontScaling={false} numberOfLines={1}>
                            {p.name}
                          </Text>
                          <Text style={styles.cardAddress} allowFontScaling={false} numberOfLines={1}>
                            {formatAddress(p.address)} · {p.type || 'Apartment'}
                          </Text>
                        </View>
                        <View style={[styles.badge, p.status === 'Active' ? styles.badgeActive : styles.badgeMuted]}>
                          <Text style={[styles.badgeText, p.status === 'Active' ? styles.badgeTextActive : styles.badgeTextMuted]} allowFontScaling={false}>
                            {p.status || 'Active'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel} allowFontScaling={false}>UNITS</Text>
                          <Text style={styles.infoValue} allowFontScaling={false}>{totalUnits} ({occUnits} Occ)</Text>
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel} allowFontScaling={false}>REVENUE</Text>
                          <Text style={[styles.infoValue, { color: colors.success }]} allowFontScaling={false}>
                            ${Number(revenue).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel} allowFontScaling={false}>OWNER</Text>
                          <Text style={styles.infoValue} allowFontScaling={false} numberOfLines={1}>{ownerName}</Text>
                        </View>
                      </View>

                      <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.btnSmall} onPress={() => setSelectedProperty(p)}>
                          <Ionicons name="eye-outline" size={14} color={colors.primary} />
                          <Text style={[styles.btnSmallText, { color: colors.primary }]} allowFontScaling={false}>View</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.btnSmall} onPress={() => handleOpenEditProperty(p)}>
                          <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
                          <Text style={styles.btnSmallText} allowFontScaling={false}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.btnSmall} onPress={() => handleDeleteProperty(p.id, p.name)}>
                          <Ionicons name="trash-outline" size={14} color={colors.danger} />
                          <Text style={[styles.btnSmallText, { color: colors.danger }]} allowFontScaling={false}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}

          {/* TAB 2: UNITS */}
          {activeTab === 'units' && (
            <>
              {filteredUnits.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText} allowFontScaling={false}>No units found</Text>
                </View>
              ) : (
                filteredUnits.map((u) => {
                  const isOcc = u.status === 'Occupied';
                  const tenantName = u.tenantName || (u.tenants?.length ? `${u.tenants[0].firstName} ${u.tenants[0].lastName}` : null);
                  const propName = u.propertyName || (u.property ? u.property.name : 'Property');

                  return (
                    <View key={u.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle} allowFontScaling={false}>
                            Unit {u.unitNumber}
                          </Text>
                          <Text style={styles.cardAddress} allowFontScaling={false} numberOfLines={1}>
                            {propName} · Floor {u.floor || 1}
                          </Text>
                        </View>
                        <View style={[styles.badge, isOcc ? styles.badgeActive : styles.badgeMuted]}>
                          <Text style={[styles.badgeText, isOcc ? styles.badgeTextActive : styles.badgeTextMuted]} allowFontScaling={false}>
                            {u.status || 'Vacant'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel} allowFontScaling={false}>SPECS</Text>
                          <Text style={styles.infoValue} allowFontScaling={false}>{u.bedrooms || 0}B / {u.bathrooms || 0}B ({u.squareFootage || 0} sqft)</Text>
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel} allowFontScaling={false}>RENT</Text>
                          <Text style={[styles.infoValue, { color: colors.success }]} allowFontScaling={false}>
                            ${(Number(u.rentAmount) || 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel} allowFontScaling={false}>RESIDENT</Text>
                          <Text style={styles.infoValue} allowFontScaling={false} numberOfLines={1}>
                            {tenantName || 'Vacant'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.btnSmall} onPress={() => setSelectedUnit(u)}>
                          <Ionicons name="eye-outline" size={14} color={colors.primary} />
                          <Text style={[styles.btnSmallText, { color: colors.primary }]} allowFontScaling={false}>View</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.btnSmall} onPress={() => handleOpenEditUnit(u)}>
                          <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
                          <Text style={styles.btnSmallText} allowFontScaling={false}>Edit</Text>
                        </TouchableOpacity>

                        {!isOcc && (
                          <TouchableOpacity
                            style={styles.btnSmall}
                            onPress={() => {
                              setAssignTenantUnit(u);
                              setSelectedTenantId('');
                            }}
                          >
                            <Ionicons name="person-add-outline" size={14} color={colors.success} />
                            <Text style={[styles.btnSmallText, { color: colors.success }]} allowFontScaling={false}>Assign</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.btnSmall}
                          onPress={() => {
                            setStatusChangeUnit(u);
                            setNewStatusValue(u.status || 'Vacant');
                          }}
                        >
                          <Ionicons name="swap-horizontal-outline" size={14} color={colors.textSecondary} />
                          <Text style={styles.btnSmallText} allowFontScaling={false}>Status</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.btnSmall} onPress={() => handleDeleteUnit(u.id, u.unitNumber)}>
                          <Ionicons name="trash-outline" size={14} color={colors.danger} />
                          <Text style={[styles.btnSmallText, { color: colors.danger }]} allowFontScaling={false}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}

          {/* TAB 3: DRAFTS */}
          {activeTab === 'drafts' && (
            <>
              {filteredDrafts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText} allowFontScaling={false}>No draft properties</Text>
                </View>
              ) : (
                filteredDrafts.map((d) => (
                  <View key={d.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} allowFontScaling={false}>{d.name}</Text>
                        <Text style={styles.cardAddress} allowFontScaling={false}>{formatAddress(d.address)}</Text>
                      </View>
                      <View style={[styles.badge, styles.badgeMuted]}>
                        <Text style={[styles.badgeText, styles.badgeTextMuted]} allowFontScaling={false}>Draft</Text>
                      </View>
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.btnSmall, { backgroundColor: colors.primary, paddingHorizontal: 12, borderRadius: 6 }]}
                        onPress={() => handlePublishDraft(d.id, d.name)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={14} color="#0f172a" />
                        <Text style={[styles.btnSmallText, { color: '#0f172a', fontWeight: '700' }]} allowFontScaling={false}>Publish</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.btnSmall} onPress={() => handleOpenEditProperty(d)}>
                        <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.btnSmallText} allowFontScaling={false}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.btnSmall} onPress={() => handleDeleteProperty(d.id, d.name)}>
                        <Ionicons name="trash-outline" size={14} color={colors.danger} />
                        <Text style={[styles.btnSmallText, { color: colors.danger }]} allowFontScaling={false}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>

        {/* -------------------------------------------------------------------------- */}
        {/* VIEW PROPERTY DETAILS MODAL */}
        {/* -------------------------------------------------------------------------- */}
        <Modal visible={!!selectedProperty} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>{selectedProperty?.name}</Text>
                  <Text style={styles.cardAddress} allowFontScaling={false}>{selectedProperty?.address}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedProperty(null)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380, marginVertical: 10 }}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>Type</Text>
                  <Text style={styles.detailVal} allowFontScaling={false}>{selectedProperty?.type || 'Apartment'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>Status</Text>
                  <Text style={styles.detailVal} allowFontScaling={false}>{selectedProperty?.status || 'Active'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>Total Units</Text>
                  <Text style={styles.detailVal} allowFontScaling={false}>{selectedProperty?.totalUnits || selectedProperty?.unitsCount || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>Occupancy</Text>
                  <Text style={styles.detailVal} allowFontScaling={false}>{selectedProperty?.occupancyRate || 0}%</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>Monthly Revenue</Text>
                  <Text style={[styles.detailVal, { color: colors.success }]} allowFontScaling={false}>
                    ${Number(selectedProperty?.monthlyRevenue || 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>NYC BIN #</Text>
                  <Text style={styles.detailVal} allowFontScaling={false}>{selectedProperty?.nycBin || selectedProperty?.bin || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>Owner</Text>
                  <Text style={styles.detailVal} allowFontScaling={false}>
                    {selectedProperty?.owner ? (typeof selectedProperty.owner === 'object' ? selectedProperty.owner.name : selectedProperty.owner) : 'Owner'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>Year Built</Text>
                  <Text style={styles.detailVal} allowFontScaling={false}>{selectedProperty?.yearBuilt || 2020}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>Square Footage</Text>
                  <Text style={styles.detailVal} allowFontScaling={false}>{Number(selectedProperty?.squareFootage || 8500).toLocaleString()} sqft</Text>
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedProperty(null)}>
                <Text style={styles.closeBtnText} allowFontScaling={false}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* -------------------------------------------------------------------------- */}
        {/* VIEW UNIT DETAILS MODAL */}
        {/* -------------------------------------------------------------------------- */}
        <Modal visible={!!selectedUnit} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>Unit {selectedUnit?.unitNumber}</Text>
                  <Text style={styles.cardAddress} allowFontScaling={false}>{selectedUnit?.propertyName || 'Property'}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedUnit(null)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380, marginVertical: 10 }}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>Status</Text>
                  <Text style={styles.detailVal} allowFontScaling={false}>{selectedUnit?.status || 'Vacant'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>Monthly Rent</Text>
                  <Text style={[styles.detailVal, { color: colors.success }]} allowFontScaling={false}>
                    ${(Number(selectedUnit?.rentAmount) || 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>Security Deposit</Text>
                  <Text style={styles.detailVal} allowFontScaling={false}>
                    ${(Number(selectedUnit?.securityDeposit) || 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>Bedrooms / Bathrooms</Text>
                  <Text style={styles.detailVal} allowFontScaling={false}>{selectedUnit?.bedrooms || 0} Beds / {selectedUnit?.bathrooms || 0} Baths</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>Square Footage</Text>
                  <Text style={styles.detailVal} allowFontScaling={false}>{selectedUnit?.squareFootage || 0} sqft</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>Floor</Text>
                  <Text style={styles.detailVal} allowFontScaling={false}>Floor {selectedUnit?.floor || 1}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey} allowFontScaling={false}>Resident</Text>
                  <Text style={styles.detailVal} allowFontScaling={false}>
                    {selectedUnit?.tenantName || (selectedUnit?.tenants?.length ? `${selectedUnit.tenants[0].firstName} ${selectedUnit.tenants[0].lastName}` : 'Vacant')}
                  </Text>
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedUnit(null)}>
                <Text style={styles.closeBtnText} allowFontScaling={false}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* -------------------------------------------------------------------------- */}
        {/* ASSIGN TENANT MODAL */}
        {/* -------------------------------------------------------------------------- */}
        <Modal visible={!!assignTenantUnit} animationType="fade" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle} allowFontScaling={false}>Assign Tenant to Unit {assignTenantUnit?.unitNumber}</Text>
              <Text style={[styles.cardAddress, { marginTop: 4 }]} allowFontScaling={false}>Select tenant:</Text>

              <ScrollView style={{ maxHeight: 200, marginVertical: 10 }}>
                {tenants.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.pickerRow, selectedTenantId === t.id && styles.pickerRowSelected]}
                    onPress={() => setSelectedTenantId(t.id)}
                  >
                    <Text style={styles.detailVal} allowFontScaling={false}>{t.firstName} {t.lastName}</Text>
                    {selectedTenantId === t.id && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setAssignTenantUnit(null)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleAssignTenant} disabled={submitting}>
                  <Text style={styles.submitBtnText} allowFontScaling={false}>Assign</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* -------------------------------------------------------------------------- */}
        {/* STATUS CHANGE MODAL */}
        {/* -------------------------------------------------------------------------- */}
        <Modal visible={!!statusChangeUnit} animationType="fade" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle} allowFontScaling={false}>Change Status — Unit {statusChangeUnit?.unitNumber}</Text>
              <View style={{ marginVertical: 10 }}>
                {UNIT_STATUSES.map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.pickerRow, newStatusValue === st && styles.pickerRowSelected]}
                    onPress={() => setNewStatusValue(st)}
                  >
                    <Text style={styles.detailVal} allowFontScaling={false}>{st}</Text>
                    {newStatusValue === st && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setStatusChangeUnit(null)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateUnitStatus} disabled={submitting}>
                  <Text style={styles.submitBtnText} allowFontScaling={false}>Update</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>



        {/* -------------------------------------------------------------------------- */}
        {/* ADD / EDIT PROPERTY MODAL (Web 1:1 Matching) */}
        {/* -------------------------------------------------------------------------- */}
        <Modal visible={isPropModalOpen} animationType="slide" transparent>
          <KeyboardAvoidingView
            style={styles.modalBackdrop}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.modalCard, styles.propFullModalCard]}>
              {/* Header Matching Web */}
              <View style={styles.propHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.propMainTitle} allowFontScaling={false}>
                    {editingPropId ? 'Edit Property' : 'Add Property'}
                  </Text>
                  <Text style={styles.propSubtitle} allowFontScaling={false}>
                    Register a new property asset in your management ledger.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsPropModalOpen(false)}
                  style={styles.propCloseBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Form Content */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* PROPERTY NAME */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel} allowFontScaling={false}>
                    PROPERTY NAME <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.propInput, formErrors.name && styles.propInputError]}
                    placeholder="Oakridge Heights"
                    placeholderTextColor={colors.placeholder}
                    value={pName}
                    onChangeText={setPName}
                    allowFontScaling={false}
                  />
                  {formErrors.name && <Text style={styles.errorText}>{formErrors.name}</Text>}
                </View>

                {/* PROPERTY TYPE & STATUS (2 Columns) */}
                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>
                      PROPERTY TYPE <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.propSelectTrigger}
                      onPress={() => setActivePropDropdown('type')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.propSelectValue} numberOfLines={1} allowFontScaling={false}>
                        {pType || 'Apartment'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>
                      STATUS <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.propSelectTrigger}
                      onPress={() => setActivePropDropdown('status')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.propSelectValue} numberOfLines={1} allowFontScaling={false}>
                        {pStatus || 'Active'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* STREET ADDRESS */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel} allowFontScaling={false}>
                    STREET ADDRESS <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.propInput}
                    placeholder="124 Oakridge Blvd"
                    placeholderTextColor={colors.placeholder}
                    value={pStreet}
                    onChangeText={setPStreet}
                    allowFontScaling={false}
                  />
                </View>

                {/* CITY & STATE (2 Columns) */}
                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>
                      CITY <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.propInput}
                      placeholder="Austin"
                      placeholderTextColor={colors.placeholder}
                      value={pCity}
                      onChangeText={setPCity}
                      allowFontScaling={false}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>
                      STATE <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.propInput}
                      placeholder="TX"
                      placeholderTextColor={colors.placeholder}
                      value={pState}
                      onChangeText={setPState}
                      allowFontScaling={false}
                    />
                  </View>
                </View>

                {/* COUNTRY & ZIP CODE (2 Columns) */}
                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>
                      COUNTRY <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.propInput}
                      placeholder="USA"
                      placeholderTextColor={colors.placeholder}
                      value={pCountry}
                      onChangeText={setPCountry}
                      allowFontScaling={false}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>
                      ZIP CODE <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.propInput}
                      placeholder="78701"
                      placeholderTextColor={colors.placeholder}
                      value={pZip}
                      onChangeText={setPZip}
                      allowFontScaling={false}
                    />
                  </View>
                </View>

                {/* NYC BIN (BUILDING ID) (OPTIONAL) */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel} allowFontScaling={false}>
                    NYC BIN (BUILDING ID) <Text style={styles.optionalTag}>(OPTIONAL)</Text>
                  </Text>
                  <TextInput
                    style={styles.propInput}
                    placeholder="e.g. 1000000"
                    placeholderTextColor={colors.placeholder}
                    value={pNycBin}
                    onChangeText={setPNycBin}
                    allowFontScaling={false}
                  />
                </View>

                {/* TOTAL FLOORS & TOTAL UNITS (2 Columns) */}
                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>TOTAL FLOORS</Text>
                    <TextInput
                      style={styles.propInput}
                      keyboardType="numeric"
                      placeholder="1"
                      placeholderTextColor={colors.placeholder}
                      value={pFloors}
                      onChangeText={setPFloors}
                      allowFontScaling={false}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>TOTAL UNITS</Text>
                    <TextInput
                      style={styles.propInput}
                      keyboardType="numeric"
                      placeholder="1"
                      placeholderTextColor={colors.placeholder}
                      value={pUnitsCount}
                      onChangeText={setPUnitsCount}
                      allowFontScaling={false}
                    />
                  </View>
                </View>

                {/* OWNER WITH + ADD OWNER */}
                <View style={styles.formGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>
                      OWNER <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TouchableOpacity
                      onPress={() => setIsQuickAddOwnerOpen(true)}
                      style={styles.addOwnerLink}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={13} color="#2563eb" />
                      <Text style={styles.addOwnerLinkText} allowFontScaling={false}>Add Owner</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.propSelectTrigger}
                    onPress={() => setActivePropDropdown('owner')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.propSelectValue} numberOfLines={1} allowFontScaling={false}>
                      {(() => {
                        const matched = owners.find((o) => (o.id === pOwnerId || o._id === pOwnerId));
                        if (!matched) return 'Select Owner...';
                        return matched.name || `${matched.firstName || ''} ${matched.lastName || ''}`.trim() || matched.email || 'Select Owner...';
                      })()}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* OWNERSHIP PERCENTAGE (%) & MANAGEMENT COMPANY (2 Columns) */}
                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>
                      OWNERSHIP PERCENTAGE (%) <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.propInput}
                      keyboardType="numeric"
                      placeholder="100"
                      placeholderTextColor={colors.placeholder}
                      value={pShare}
                      onChangeText={setPShare}
                      allowFontScaling={false}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>MANAGEMENT COMPANY</Text>
                    <TextInput
                      style={styles.propInput}
                      placeholder="Enter management company name"
                      placeholderTextColor={colors.placeholder}
                      value={pManagementCompany}
                      onChangeText={setPManagementCompany}
                      allowFontScaling={false}
                    />
                  </View>
                </View>

                {/* PAYMENT INTEGRATION & MERCHANT ACCOUNT CARD */}
                <View style={styles.propPaymentBox}>
                  <View style={styles.propPaymentHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 6 }}>
                      <Ionicons name="card" size={15} color="#2563eb" />
                      <Text style={styles.propPaymentTitle} allowFontScaling={false} numberOfLines={1}>
                        PAYMENT INTEGRATION & MERCHANT ACCOUNT
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.companyDefaultBadge,
                        pPaymentAccountSetup !== 'COMPANY_DEFAULT' && styles.customGatewayBadge,
                      ]}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={11}
                        color={pPaymentAccountSetup === 'COMPANY_DEFAULT' ? colors.textMuted : '#059669'}
                      />
                      <Text
                        style={[
                          styles.companyDefaultBadgeText,
                          pPaymentAccountSetup !== 'COMPANY_DEFAULT' && { color: '#059669' },
                          pPaymentAccountSetup === 'COMPANY_DEFAULT' && { color: colors.textSecondary },
                        ]}
                        allowFontScaling={false}
                      >
                        {pPaymentAccountSetup === 'COMPANY_DEFAULT'
                          ? 'Company Default (Option 1)'
                          : `Custom Gateway: ${pCustomGateway}`}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.propPaymentSubtitle} allowFontScaling={false}>
                    Configure property-specific payment gateway to receive tenant rent in this account, or use Company Default as fallback.
                  </Text>

                  {/* PAYMENT ACCOUNT SETUP */}
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.propPaymentLabel} allowFontScaling={false}>
                      PAYMENT ACCOUNT SETUP
                    </Text>
                    <TouchableOpacity
                      style={styles.propPaymentDropdown}
                      onPress={() => setActivePropDropdown('paymentAccountSetup')}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Ionicons
                          name={pPaymentAccountSetup === 'COMPANY_DEFAULT' ? 'business-outline' : 'settings-outline'}
                          size={15}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.propPaymentDropdownVal} numberOfLines={1} allowFontScaling={false}>
                          {pPaymentAccountSetup === 'COMPANY_DEFAULT'
                            ? '🏢 Use Company Default (Company Settings)'
                            : '⚙️ Other (Custom Payment Gateway)'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                    <Text style={styles.propPaymentHint} allowFontScaling={false}>
                      {pPaymentAccountSetup === 'COMPANY_DEFAULT'
                        ? 'Tenant rent for this property will flow through the global gateway configured under Company Settings.'
                        : 'Configure property-specific custom payment gateway credentials.'}
                    </Text>
                  </View>

                  {/* CONDITIONAL EXTRA INPUTS WHEN 'OTHER' IS SELECTED (Matching Web 1:1) */}
                  {pPaymentAccountSetup !== 'COMPANY_DEFAULT' && (
                    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
                      
                      {/* SELECT CUSTOM GATEWAY PROVIDER */}
                      <View style={{ marginBottom: 12 }}>
                        <Text style={styles.propPaymentLabel} allowFontScaling={false}>
                          SELECT CUSTOM GATEWAY PROVIDER
                        </Text>
                        <TouchableOpacity
                          style={styles.propPaymentDropdown}
                          onPress={() => setActivePropDropdown('customGateway')}
                          activeOpacity={0.7}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <Ionicons
                              name={
                                pCustomGateway === 'STRIPE'
                                  ? 'card-outline'
                                  : pCustomGateway === 'RAZORPAY'
                                  ? 'flash-outline'
                                  : 'lock-closed-outline'
                              }
                              size={15}
                              color={colors.textSecondary}
                            />
                            <Text style={styles.propPaymentDropdownVal} numberOfLines={1} allowFontScaling={false}>
                              {pCustomGateway === 'STRIPE'
                                ? '💳 Stripe (Credit/Debit/Apple Pay)'
                                : pCustomGateway === 'RAZORPAY'
                                ? '⚡ Razorpay (Cards, UPI & NetBanking)'
                                : '🔒 Authorize.Net (Credit Card & eCheck)'}
                            </Text>
                          </View>
                          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                        <Text style={styles.propPaymentHint} allowFontScaling={false}>
                          Tenant rent will bypass Company Settings and deposit directly into this gateway.
                        </Text>
                      </View>

                      {/* GATEWAY STATUS */}
                      <View style={{ marginBottom: 12 }}>
                        <Text style={styles.propPaymentLabel} allowFontScaling={false}>
                          GATEWAY STATUS
                        </Text>
                        <TouchableOpacity
                          style={styles.propPaymentDropdown}
                          onPress={() => setActivePropDropdown('gatewayStatus')}
                          activeOpacity={0.7}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <Ionicons
                              name={pPaymentStatus === 'Active' ? 'checkmark-circle-outline' : 'pause-circle-outline'}
                              size={15}
                              color={pPaymentStatus === 'Active' ? '#10b981' : '#f59e0b'}
                            />
                            <Text style={styles.propPaymentDropdownVal} numberOfLines={1} allowFontScaling={false}>
                              {pPaymentStatus === 'Active'
                                ? 'Active (Accepting Tenant Payments)'
                                : 'Inactive (Temporarily Disabled)'}
                            </Text>
                          </View>
                          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                        <Text style={styles.propPaymentHint} allowFontScaling={false}>
                          Inactive status temporarily routes payments to Company Default until re-activated.
                        </Text>
                      </View>

                      {/* CREDENTIALS - STRIPE */}
                      {pCustomGateway === 'STRIPE' && (
                        <View style={{ marginTop: 2 }}>
                          <View style={{ marginBottom: 10 }}>
                            <Text style={styles.propPaymentLabel} allowFontScaling={false}>
                              STRIPE PUBLISHABLE KEY
                            </Text>
                            <TextInput
                              style={[styles.propInput, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12.5 }]}
                              placeholder="pk_live_... or pk_test_..."
                              placeholderTextColor={colors.placeholder}
                              value={pPaymentAccountId}
                              onChangeText={setPPaymentAccountId}
                              autoCapitalize="none"
                              autoCorrect={false}
                              allowFontScaling={false}
                            />
                          </View>
                          <View>
                            <Text style={styles.propPaymentLabel} allowFontScaling={false}>
                              STRIPE SECRET KEY (ENCRYPTED IN DB)
                            </Text>
                            <View style={styles.passwordInputContainer}>
                              <TextInput
                                style={[styles.passwordInput, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12.5 }]}
                                placeholder="sk_live_... or sk_test_..."
                                placeholderTextColor={colors.placeholder}
                                value={pPaymentAuthToken}
                                onChangeText={setPPaymentAuthToken}
                                secureTextEntry={!showPaymentSecret}
                                autoCapitalize="none"
                                autoCorrect={false}
                                allowFontScaling={false}
                              />
                              <TouchableOpacity
                                onPress={() => setShowPaymentSecret(!showPaymentSecret)}
                                style={styles.eyeBtn}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={showPaymentSecret ? 'eye-off-outline' : 'eye-outline'}
                                  size={16}
                                  color={colors.textMuted}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* CREDENTIALS - RAZORPAY (Exact match to Web Screenshot 2) */}
                      {pCustomGateway === 'RAZORPAY' && (
                        <View style={{ marginTop: 2 }}>
                          <View style={{ marginBottom: 10 }}>
                            <Text style={styles.propPaymentLabel} allowFontScaling={false}>
                              RAZORPAY KEY ID
                            </Text>
                            <TextInput
                              style={[styles.propInput, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12.5 }]}
                              placeholder="rzp_live_... or rzp_test_..."
                              placeholderTextColor={colors.placeholder}
                              value={pPaymentAccountId}
                              onChangeText={setPPaymentAccountId}
                              autoCapitalize="none"
                              autoCorrect={false}
                              allowFontScaling={false}
                            />
                          </View>
                          <View>
                            <Text style={styles.propPaymentLabel} allowFontScaling={false}>
                              RAZORPAY KEY SECRET (ENCRYPTED IN DB)
                            </Text>
                            <View style={styles.passwordInputContainer}>
                              <TextInput
                                style={[styles.passwordInput, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12.5 }]}
                                placeholder="Enter Razorpay Key Secret"
                                placeholderTextColor={colors.placeholder}
                                value={pPaymentAuthToken}
                                onChangeText={setPPaymentAuthToken}
                                secureTextEntry={!showPaymentSecret}
                                autoCapitalize="none"
                                autoCorrect={false}
                                allowFontScaling={false}
                              />
                              <TouchableOpacity
                                onPress={() => setShowPaymentSecret(!showPaymentSecret)}
                                style={styles.eyeBtn}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={showPaymentSecret ? 'eye-off-outline' : 'eye-outline'}
                                  size={16}
                                  color={colors.textMuted}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* CREDENTIALS - AUTHORIZE_NET */}
                      {pCustomGateway === 'AUTHORIZE_NET' && (
                        <View style={{ marginTop: 2 }}>
                          <View style={{ marginBottom: 10 }}>
                            <Text style={styles.propPaymentLabel} allowFontScaling={false}>
                              API LOGIN ID
                            </Text>
                            <TextInput
                              style={[styles.propInput, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12.5 }]}
                              placeholder="e.g. 2Aja8R5p"
                              placeholderTextColor={colors.placeholder}
                              value={pPaymentAccountId}
                              onChangeText={setPPaymentAccountId}
                              autoCapitalize="none"
                              autoCorrect={false}
                              allowFontScaling={false}
                            />
                          </View>
                          <View>
                            <Text style={styles.propPaymentLabel} allowFontScaling={false}>
                              TRANSACTION KEY (ENCRYPTED IN DB)
                            </Text>
                            <View style={styles.passwordInputContainer}>
                              <TextInput
                                style={[styles.passwordInput, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12.5 }]}
                                placeholder="Enter 16-character Transaction Key"
                                placeholderTextColor={colors.placeholder}
                                value={pPaymentAuthToken}
                                onChangeText={setPPaymentAuthToken}
                                secureTextEntry={!showPaymentSecret}
                                autoCapitalize="none"
                                autoCorrect={false}
                                allowFontScaling={false}
                              />
                              <TouchableOpacity
                                onPress={() => setShowPaymentSecret(!showPaymentSecret)}
                                style={styles.eyeBtn}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={showPaymentSecret ? 'eye-off-outline' : 'eye-outline'}
                                  size={16}
                                  color={colors.textMuted}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      )}

                    </View>
                  )}
                </View>

                {/* ADDITIONAL DETAILS (OPTIONAL) ACCORDION */}
                <View style={styles.propAccordionBox}>
                  <TouchableOpacity
                    style={styles.propAccordionHeader}
                    onPress={() => setShowPropAdditional(!showPropAdditional)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.propAccordionTitle} allowFontScaling={false}>
                        ADDITIONAL DETAILS <Text style={styles.optionalTag}>(OPTIONAL)</Text>
                      </Text>
                      <Text style={styles.propAccordionSub} allowFontScaling={false} numberOfLines={1}>
                        Financial Valuation, Property Photo & Documents
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <Text style={styles.propAccordionToggleText} allowFontScaling={false}>
                        {showPropAdditional ? 'Hide Details' : 'Show Details'}
                      </Text>
                      <Ionicons
                        name={showPropAdditional ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color="#2563eb"
                      />
                    </View>
                  </TouchableOpacity>

                  {showPropAdditional && (
                    <View style={styles.propAccordionBody}>
                      {/* PURCHASE PRICE & CURRENT VALUATION */}
                      <View style={styles.twoColRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel} allowFontScaling={false}>PURCHASE PRICE ($)</Text>
                          <TextInput
                            style={styles.propInput}
                            keyboardType="numeric"
                            placeholder="e.g. 2000000"
                            placeholderTextColor={colors.placeholder}
                            value={pPurchasePrice}
                            onChangeText={setPPurchasePrice}
                            allowFontScaling={false}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel} allowFontScaling={false}>CURRENT VALUATION ($)</Text>
                          <TextInput
                            style={styles.propInput}
                            keyboardType="numeric"
                            placeholder="e.g. 2200000"
                            placeholderTextColor={colors.placeholder}
                            value={pCurrentValue}
                            onChangeText={setPCurrentValue}
                            allowFontScaling={false}
                          />
                        </View>
                      </View>

                      {/* MONTHLY EXPENSES */}
                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel} allowFontScaling={false}>MONTHLY EXPENSES ($)</Text>
                        <TextInput
                          style={styles.propInput}
                          keyboardType="numeric"
                          placeholder="e.g. 4500"
                          placeholderTextColor={colors.placeholder}
                          value={pExpenses}
                          onChangeText={setPExpenses}
                          allowFontScaling={false}
                        />
                      </View>

                      {/* PROPERTY PHOTO URL */}
                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel} allowFontScaling={false}>PROPERTY PHOTO URL</Text>
                        <TextInput
                          style={styles.propInput}
                          placeholder="https://images.unsplash.com/photo-..."
                          placeholderTextColor={colors.placeholder}
                          value={pPhotoUrl}
                          onChangeText={setPPhotoUrl}
                          allowFontScaling={false}
                        />
                      </View>

                      {/* NOTES / DESCRIPTION */}
                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel} allowFontScaling={false}>NOTES / DESCRIPTION</Text>
                        <TextInput
                          style={[styles.propInput, { minHeight: 60, textAlignVertical: 'top' }]}
                          multiline
                          numberOfLines={3}
                          placeholder="Property amenities, ledger notes, or details..."
                          placeholderTextColor={colors.placeholder}
                          value={pNotes}
                          onChangeText={setPNotes}
                          allowFontScaling={false}
                        />
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* FOOTER ACTIONS MATCHING WEB */}
              <View style={styles.propFooterBar}>
                <TouchableOpacity
                  style={styles.propCancelBtn}
                  onPress={() => setIsPropModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back-outline" size={15} color={colors.textSecondary} />
                  <Text style={styles.propCancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TouchableOpacity
                    style={styles.propDraftBtn}
                    onPress={() => handleSaveProperty(true)}
                    disabled={submitting}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.propDraftBtnText} allowFontScaling={false}>Save Draft</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.propSubmitBtn}
                    onPress={() => handleSaveProperty(false)}
                    disabled={submitting}
                    activeOpacity={0.8}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.propSubmitBtnText} allowFontScaling={false}>
                        {editingPropId ? 'Update Property' : 'Create Property'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              {/* ------------------------------------------------------------------ */}
              {/* IN-MODAL DROPDOWN SELECTOR OVERLAY (Guaranteed to work on iOS & Android) */}
              {/* ------------------------------------------------------------------ */}
              {!!activePropDropdown && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.72)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 99999,
                    elevation: 99999,
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={() => setActivePropDropdown(null)}
                  />
                  <View
                    style={[
                      styles.modalCard,
                      {
                        maxHeight: 440,
                        width: '100%',
                        maxWidth: 420,
                        zIndex: 100000,
                        elevation: 100000,
                        backgroundColor: colors.surface,
                        borderColor: colors.cardBorder,
                        borderWidth: 1,
                        padding: 16,
                        borderRadius: 14,
                      },
                    ]}
                  >
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle} allowFontScaling={false}>
                        {activePropDropdown === 'type'
                          ? 'Select Property Type'
                          : activePropDropdown === 'status'
                          ? 'Select Status'
                          : activePropDropdown === 'owner'
                          ? 'Select Owner'
                          : activePropDropdown === 'paymentAccountSetup'
                          ? 'Payment Account Setup'
                          : activePropDropdown === 'customGateway'
                          ? 'Select Custom Gateway Provider'
                          : activePropDropdown === 'gatewayStatus'
                          ? 'Gateway Status'
                          : 'Select Option'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setActivePropDropdown(null)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Ionicons name="close" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView
                      style={{ marginVertical: 8, maxHeight: 330 }}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                    >
                      {activePropDropdown === 'type' &&
                        PROPERTY_TYPES.map((t) => {
                          const isSelected = pType === t;
                          return (
                            <TouchableOpacity
                              key={t}
                              style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                              onPress={() => {
                                setPType(t);
                                setActivePropDropdown(null);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[styles.detailVal, isSelected && { color: colors.primary, fontWeight: '700' }]}
                                allowFontScaling={false}
                              >
                                {t}
                              </Text>
                              {isSelected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                            </TouchableOpacity>
                          );
                        })}

                      {activePropDropdown === 'status' &&
                        PROPERTY_STATUSES.map((st) => {
                          const isSelected = pStatus === st;
                          return (
                            <TouchableOpacity
                              key={st}
                              style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                              onPress={() => {
                                setPStatus(st);
                                setActivePropDropdown(null);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[styles.detailVal, isSelected && { color: colors.primary, fontWeight: '700' }]}
                                allowFontScaling={false}
                              >
                                {st}
                              </Text>
                              {isSelected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                            </TouchableOpacity>
                          );
                        })}

                      {activePropDropdown === 'owner' && (
                        <>
                          {owners.length === 0 ? (
                            <View style={{ padding: 16, alignItems: 'center' }}>
                              <Text style={{ color: colors.textMuted, fontSize: 13 }} allowFontScaling={false}>
                                No owners found. Please add an owner.
                              </Text>
                            </View>
                          ) : (
                            owners.map((o) => {
                              const oId = o.id || o._id;
                              const isSelected = pOwnerId === oId;
                              const oName = o.name || `${o.firstName || ''} ${o.lastName || ''}`.trim() || 'Owner';
                              return (
                                <TouchableOpacity
                                  key={oId}
                                  style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                                  onPress={() => {
                                    setPOwnerId(oId);
                                    setActivePropDropdown(null);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <View style={{ flex: 1, paddingRight: 8 }}>
                                    <Text
                                      style={[styles.detailVal, isSelected && { color: colors.primary, fontWeight: '700' }]}
                                      allowFontScaling={false}
                                    >
                                      {oName}
                                    </Text>
                                    {o.email && (
                                      <Text style={{ fontSize: 11, color: colors.textMuted }} allowFontScaling={false}>
                                        {o.email}
                                      </Text>
                                    )}
                                  </View>
                                  {isSelected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                                </TouchableOpacity>
                              );
                            })
                          )}
                          <TouchableOpacity
                            style={[styles.closeBtn, { backgroundColor: '#2563eb', marginTop: 12, borderRadius: 8, paddingVertical: 10 }]}
                            onPress={() => {
                              setActivePropDropdown(null);
                              setIsQuickAddOwnerOpen(true);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.closeBtnText, { color: '#ffffff', fontWeight: '700' }]} allowFontScaling={false}>
                              + Add New Owner
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {activePropDropdown === 'paymentAccountSetup' &&
                        PAYMENT_ACCOUNT_SETUPS.map((opt) => {
                          const isSelected = pPaymentAccountSetup === opt.value;
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                              onPress={() => {
                                setPPaymentAccountSetup(opt.value);
                                setActivePropDropdown(null);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[styles.detailVal, isSelected && { color: colors.primary, fontWeight: '700' }]}
                                allowFontScaling={false}
                              >
                                {opt.label}
                              </Text>
                              {isSelected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                            </TouchableOpacity>
                          );
                        })}

                      {activePropDropdown === 'customGateway' &&
                        CUSTOM_GATEWAY_PROVIDERS.map((opt) => {
                          const isSelected = pCustomGateway === opt.value;
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                              onPress={() => {
                                setPCustomGateway(opt.value);
                                setActivePropDropdown(null);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[styles.detailVal, isSelected && { color: colors.primary, fontWeight: '700' }]}
                                allowFontScaling={false}
                              >
                                {opt.label}
                              </Text>
                              {isSelected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                            </TouchableOpacity>
                          );
                        })}

                      {activePropDropdown === 'gatewayStatus' &&
                        GATEWAY_STATUSES.map((opt) => {
                          const isSelected = pPaymentStatus === opt.value;
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                              onPress={() => {
                                setPPaymentStatus(opt.value);
                                setActivePropDropdown(null);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[styles.detailVal, isSelected && { color: colors.primary, fontWeight: '700' }]}
                                allowFontScaling={false}
                              >
                                {opt.label}
                              </Text>
                              {isSelected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                            </TouchableOpacity>
                          );
                        })}
                    </ScrollView>
                  </View>
                </View>
              )}

              {/* ------------------------------------------------------------------ */}
              {/* IN-MODAL QUICK ADD OWNER OVERLAY (Guaranteed to work on iOS & Android) */}
              {/* ------------------------------------------------------------------ */}
              {isQuickAddOwnerOpen && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.78)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 100001,
                    elevation: 100001,
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={() => setIsQuickAddOwnerOpen(false)}
                  />
                  <View
                    style={[
                      styles.modalCard,
                      {
                        width: '100%',
                        maxWidth: 420,
                        zIndex: 100002,
                        elevation: 100002,
                        backgroundColor: colors.surface,
                        borderColor: colors.cardBorder,
                        borderWidth: 1,
                        padding: 16,
                        borderRadius: 14,
                      },
                    ]}
                  >
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle} allowFontScaling={false}>Add Property Owner</Text>
                      <TouchableOpacity
                        onPress={() => setIsQuickAddOwnerOpen(false)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Ionicons name="close" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
                      <Text style={styles.fieldLabel} allowFontScaling={false}>
                        FULL NAME <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.propInput}
                        placeholder="e.g. Jane Doe"
                        placeholderTextColor={colors.placeholder}
                        value={newOwnerFullName}
                        onChangeText={setNewOwnerFullName}
                        allowFontScaling={false}
                      />

                      <Text style={[styles.fieldLabel, { marginTop: 10 }]} allowFontScaling={false}>
                        EMAIL <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.propInput}
                        placeholder="jane.doe@example.com"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={newOwnerEmail}
                        onChangeText={setNewOwnerEmail}
                        allowFontScaling={false}
                      />

                      <Text style={[styles.fieldLabel, { marginTop: 10 }]} allowFontScaling={false}>
                        PASSWORD
                      </Text>
                      <View style={styles.passwordContainer}>
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="••••••••"
                          placeholderTextColor={colors.placeholder}
                          secureTextEntry={!showNewOwnerPassword}
                          value={newOwnerPassword}
                          onChangeText={setNewOwnerPassword}
                          allowFontScaling={false}
                        />
                        <TouchableOpacity
                          style={styles.passwordEyeBtn}
                          onPress={() => setShowNewOwnerPassword(!showNewOwnerPassword)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={showNewOwnerPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={18}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.fieldLabel, { marginTop: 10 }]} allowFontScaling={false}>
                        PHONE <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.propInput}
                        placeholder="(555) 555-0100"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="phone-pad"
                        value={newOwnerPhone}
                        onChangeText={setNewOwnerPhone}
                        allowFontScaling={false}
                      />

                      <Text style={[styles.fieldLabel, { marginTop: 10 }]} allowFontScaling={false}>
                        PAYOUT METHOD
                      </Text>
                      <TouchableOpacity
                        style={styles.cleanDropdownTrigger}
                        onPress={() => setShowOwnerPayoutDropdown(!showOwnerPayoutDropdown)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cleanDropdownText} allowFontScaling={false} numberOfLines={1}>
                          {newOwnerPayoutMethod || 'ACH/Direct Deposit'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>

                      {showOwnerPayoutDropdown && (
                        <View
                          style={{
                            marginTop: 4,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: colors.cardBorder,
                            backgroundColor: colors.background,
                            overflow: 'hidden',
                          }}
                        >
                          {OWNER_PAYOUT_METHODS.map((pm) => {
                            const isSelected = newOwnerPayoutMethod === pm;
                            return (
                              <TouchableOpacity
                                key={pm}
                                style={[
                                  styles.pickerRow,
                                  isSelected && { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' },
                                ]}
                                onPress={() => {
                                  setNewOwnerPayoutMethod(pm);
                                  setShowOwnerPayoutDropdown(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.cleanDropdownText,
                                    isSelected && { color: colors.primary, fontWeight: '700' },
                                  ]}
                                  allowFontScaling={false}
                                >
                                  {pm}
                                </Text>
                                {isSelected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </ScrollView>

                    <View style={styles.modalBtnRow}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setIsQuickAddOwnerOpen(false)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: '#2563eb' }]}
                        onPress={handleQuickAddOwner}
                        disabled={creatingOwner}
                        activeOpacity={0.8}
                      >
                        {creatingOwner ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={[styles.submitBtnText, { color: '#ffffff' }]} allowFontScaling={false}>
                            Save Owner
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* -------------------------------------------------------------------------- */}
        {/* ADD / EDIT UNIT MODAL WITH FULL OCCUPIED ONBOARDING & MONTHLY BILLING STATUS */}
        {/* -------------------------------------------------------------------------- */}
        <Modal visible={isUnitModalOpen} animationType="slide" transparent>
          <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modalCard, styles.unitFullModalCard]}>
              {/* Header */}
              <View style={styles.modalHeaderClean}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.unitModalTitle} allowFontScaling={false}>
                    {editingUnitId ? 'Edit Unit' : 'Add Unit'}
                  </Text>
                  <Text style={styles.unitModalSubtitle} allowFontScaling={false}>
                    {editingUnitId ? 'Update unit configuration and lease details.' : 'Register single or multiple rentable unit layouts to a property.'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.unitCloseBtn}
                  onPress={() => setIsUnitModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1, marginVertical: 8 }} showsVerticalScrollIndicator={false}>
                {/* Target Property Card (Matching Web 1:1) */}
                <View style={styles.targetPropCard}>
                  <View style={styles.targetPropHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="business" size={15} color={colors.primary} />
                      <Text style={styles.targetPropTitle} allowFontScaling={false}>TARGET PROPERTY</Text>
                    </View>
                    {uPropId ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={styles.targetPropBadge}>
                          <Ionicons name="lock-closed" size={10} color={colors.success} />
                          <Text style={styles.targetPropBadgeText} allowFontScaling={false}>Selected</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.changePropBtn}
                          onPress={() => setShowUnitPropDropdown(true)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.changePropBtnText} allowFontScaling={false}>Change</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.cleanFieldLabel} allowFontScaling={false}>PROPERTY *</Text>
                  <TouchableOpacity
                    style={[styles.cleanDropdownTrigger, formErrors.propertyId && styles.inputErrorBorder]}
                    onPress={() => setShowUnitPropDropdown(true)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Ionicons
                        name="business-outline"
                        size={16}
                        color={uPropId ? colors.primary : colors.placeholder}
                      />
                      <Text
                        style={[styles.cleanDropdownText, !uPropId && { color: colors.placeholder }]}
                        numberOfLines={1}
                        allowFontScaling={false}
                      >
                        {properties.find((p) => p.id === uPropId)?.name || 'Select Property...'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  {formErrors.propertyId && <Text style={styles.errorText}>{formErrors.propertyId}</Text>}
                </View>

                {/* IF NO PROPERTY IS SELECTED YET: PLACEHOLDER NOTICE (Matching Web 1:1) */}
                {!uPropId ? (
                  <View style={styles.unitEmptyNoticeCard}>
                    <View style={styles.unitEmptyNoticeIconWrapper}>
                      <Ionicons name="business" size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.unitEmptyNoticeTitle} allowFontScaling={false}>
                      Select a Target Property First
                    </Text>
                    <Text style={styles.unitEmptyNoticeSubtitle} allowFontScaling={false}>
                      Please select a property from the dropdown above. Once selected, the unit configuration details will unlock automatically.
                    </Text>
                  </View>
                ) : (
                  <>

                {/* Unit Number & Floor */}
                <View style={styles.twoColRow}>
                  <View style={styles.twoColField}>
                    <Text style={styles.cleanFieldLabel} allowFontScaling={false}>UNIT NUMBER *</Text>
                    <TextInput
                      style={[styles.cleanInput, formErrors.unitNumber && styles.inputErrorBorder]}
                      placeholder="e.g. 101"
                      placeholderTextColor={colors.placeholder}
                      value={uNumber}
                      onChangeText={setUNumber}
                      allowFontScaling={false}
                    />
                    {formErrors.unitNumber && <Text style={styles.errorText}>{formErrors.unitNumber}</Text>}
                  </View>
                  <View style={styles.twoColField}>
                    <Text style={styles.cleanFieldLabel} allowFontScaling={false}>FLOOR</Text>
                    <TextInput
                      style={styles.cleanInput}
                      keyboardType="numeric"
                      placeholder="1"
                      placeholderTextColor={colors.placeholder}
                      value={uFloor}
                      onChangeText={setUFloor}
                      allowFontScaling={false}
                    />
                  </View>
                </View>

                {/* Beds & Baths */}
                <View style={styles.twoColRow}>
                  <View style={styles.twoColField}>
                    <Text style={styles.cleanFieldLabel} allowFontScaling={false}>BEDROOMS</Text>
                    <TextInput
                      style={styles.cleanInput}
                      keyboardType="numeric"
                      placeholder="e.g. 2"
                      placeholderTextColor={colors.placeholder}
                      value={uBeds}
                      onChangeText={setUBeds}
                      allowFontScaling={false}
                    />
                  </View>
                  <View style={styles.twoColField}>
                    <Text style={styles.cleanFieldLabel} allowFontScaling={false}>BATHROOMS</Text>
                    <TextInput
                      style={styles.cleanInput}
                      keyboardType="numeric"
                      placeholder="e.g. 2"
                      placeholderTextColor={colors.placeholder}
                      value={uBaths}
                      onChangeText={setUBaths}
                      allowFontScaling={false}
                    />
                  </View>
                </View>

                {/* Rent & Deposit */}
                <View style={styles.twoColRow}>
                  <View style={styles.twoColField}>
                    <Text style={styles.cleanFieldLabel} allowFontScaling={false}>MONTHLY RENT ($) *</Text>
                    <TextInput
                      style={styles.cleanInput}
                      keyboardType="numeric"
                      placeholder="e.g. 1500"
                      placeholderTextColor={colors.placeholder}
                      value={uRent}
                      onChangeText={setURent}
                      allowFontScaling={false}
                    />
                  </View>
                  <View style={styles.twoColField}>
                    <Text style={styles.cleanFieldLabel} allowFontScaling={false}>SECURITY DEPOSIT ($)</Text>
                    <TextInput
                      style={styles.cleanInput}
                      keyboardType="numeric"
                      placeholder="e.g. 1500"
                      placeholderTextColor={colors.placeholder}
                      value={uDeposit}
                      onChangeText={setUDeposit}
                      allowFontScaling={false}
                    />
                  </View>
                </View>

                {/* Status Selection */}
                <View style={{ marginTop: 12, marginBottom: 8 }}>
                  <Text style={styles.cleanFieldLabel} allowFontScaling={false}>STATUS *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                    {UNIT_STATUSES.map((st) => {
                      const isActive = uStatus === st;
                      const isOccupied = st === 'Occupied';
                      return (
                        <TouchableOpacity
                          key={st}
                          style={[
                            styles.unitStatusChip,
                            isActive && (isOccupied ? styles.unitStatusChipOccupied : styles.unitStatusChipActive)
                          ]}
                          onPress={() => setUStatus(st)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={
                              isOccupied ? "person-circle" :
                              st === 'Vacant' ? "radio-button-off" :
                              st === 'Under Maintenance' ? "construct-outline" : "ellipse"
                            }
                            size={13}
                            color={
                              isActive
                                ? (isOccupied ? colors.success : colors.primary)
                                : colors.textMuted
                            }
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.unitStatusChipText,
                              isActive && (isOccupied ? { color: colors.success, fontWeight: '700' } : styles.unitStatusChipTextActive)
                            ]}
                            allowFontScaling={false}
                          >
                            {st}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* LATE FEE & GRACE PERIOD (OPTIONAL) */}
                <View style={styles.sectionCard}>
                  <TouchableOpacity
                    style={styles.sectionCardHeader}
                    onPress={() => setULateFeeEnabled(!uLateFeeEnabled)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.sectionCardTitle} allowFontScaling={false}>LATE FEE & GRACE PERIOD</Text>
                      <Text style={styles.sectionCardSubtitle} allowFontScaling={false}>Automated overdue penalty rules for this unit</Text>
                    </View>
                    <View style={[styles.toggleBadge, uLateFeeEnabled && styles.toggleBadgeActive]}>
                      <Text style={[styles.toggleBadgeText, uLateFeeEnabled && styles.toggleBadgeTextActive]} allowFontScaling={false}>
                        {uLateFeeEnabled ? 'Enabled' : 'Disabled'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {uLateFeeEnabled && (
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                        <TouchableOpacity
                          style={[styles.unitPropChip, uLateFeeType === 'FLAT' && styles.unitPropChipActive, { flex: 1, justifyContent: 'center' }]}
                          onPress={() => setULateFeeType('FLAT')}
                        >
                          <Text style={[styles.unitPropChipText, uLateFeeType === 'FLAT' && styles.unitPropChipTextActive]} allowFontScaling={false}>Flat ($)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.unitPropChip, uLateFeeType === 'PERCENTAGE' && styles.unitPropChipActive, { flex: 1, justifyContent: 'center' }]}
                          onPress={() => setULateFeeType('PERCENTAGE')}
                        >
                          <Text style={[styles.unitPropChipText, uLateFeeType === 'PERCENTAGE' && styles.unitPropChipTextActive]} allowFontScaling={false}>Percentage (%)</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.twoColRow}>
                        <View style={styles.twoColField}>
                          <Text style={styles.cleanFieldLabel} allowFontScaling={false}>FEE AMOUNT</Text>
                          <TextInput style={styles.cleanInput} keyboardType="numeric" placeholder="50" placeholderTextColor={colors.placeholder} value={uLateFeeAmount} onChangeText={setULateFeeAmount} allowFontScaling={false} />
                        </View>
                        <View style={styles.twoColField}>
                          <Text style={styles.cleanFieldLabel} allowFontScaling={false}>GRACE DAYS</Text>
                          <TextInput style={styles.cleanInput} keyboardType="numeric" placeholder="5" placeholderTextColor={colors.placeholder} value={uLateFeeGraceDays} onChangeText={setULateFeeGraceDays} allowFontScaling={false} />
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* OCCUPIED TENANT ONBOARDING SECTION */}
                {uStatus === 'Occupied' && (
                  <View style={[styles.sectionCard, { borderColor: colors.primary, borderWidth: 1.5, marginTop: 12 }]}>
                    <View style={styles.occupiedHeaderRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Ionicons name="person-circle" size={16} color={colors.primary} />
                          <Text style={styles.occupiedSectionTitle} allowFontScaling={false} numberOfLines={1}>
                            OCCUPIED TENANT INFO
                          </Text>
                        </View>
                        <Text style={styles.sectionCardSubtitle} allowFontScaling={false} numberOfLines={1}>
                          Auto-generates lease & completed move-in
                        </Text>
                      </View>
                      <View style={styles.activeResidentBadge}>
                        <View style={styles.statusDotGreen} />
                        <Text style={styles.activeResidentBadgeText} allowFontScaling={false}>ACTIVE RESIDENT</Text>
                      </View>
                    </View>

                    {/* PERSONAL INFORMATION */}
                    <View style={styles.subSectionDivider}>
                      <Text style={styles.subSectionTitle} allowFontScaling={false}>PERSONAL INFORMATION</Text>
                    </View>

                    <View style={styles.twoColRow}>
                      <View style={styles.twoColField}>
                        <Text style={styles.cleanFieldLabel} allowFontScaling={false}>FIRST NAME *</Text>
                        <TextInput style={styles.cleanInput} placeholder="e.g. John" placeholderTextColor={colors.placeholder} value={tFirstName} onChangeText={setTFirstName} allowFontScaling={false} />
                        {formErrors.tFirstName && <Text style={styles.errorText}>{formErrors.tFirstName}</Text>}
                      </View>
                      <View style={styles.twoColField}>
                        <Text style={styles.cleanFieldLabel} allowFontScaling={false}>LAST NAME *</Text>
                        <TextInput style={styles.cleanInput} placeholder="e.g. Doe" placeholderTextColor={colors.placeholder} value={tLastName} onChangeText={setTLastName} allowFontScaling={false} />
                        {formErrors.tLastName && <Text style={styles.errorText}>{formErrors.tLastName}</Text>}
                      </View>
                    </View>

                    <View style={styles.twoColRow}>
                      <View style={styles.twoColField}>
                        <Text style={styles.cleanFieldLabel} allowFontScaling={false}>PREFERRED NAME</Text>
                        <TextInput style={styles.cleanInput} placeholder="e.g. Johnny" placeholderTextColor={colors.placeholder} value={tPreferredName} onChangeText={setTPreferredName} allowFontScaling={false} />
                      </View>
                      <View style={styles.twoColField}>
                        <Text style={styles.cleanFieldLabel} allowFontScaling={false}>GENDER</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                          {GENDERS.map((g) => (
                            <TouchableOpacity
                              key={g}
                              style={[styles.unitPropChip, normalizeGender(tGender) === g && styles.unitPropChipActive, { paddingHorizontal: 9, paddingVertical: 6 }]}
                              onPress={() => setTGender(g)}
                            >
                              <Text style={[styles.unitPropChipText, normalizeGender(tGender) === g && styles.unitPropChipTextActive]} allowFontScaling={false}>{g}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>

                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.cleanFieldLabel} allowFontScaling={false}>DATE OF BIRTH (YYYY-MM-DD)</Text>
                      <TouchableOpacity
                        style={styles.cleanDatePickerBtn}
                        onPress={() => setShowDobPicker(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.cleanDatePickerText, !tDob && { color: colors.placeholder }]} allowFontScaling={false}>
                          {tDob || 'Select Date of Birth'}
                        </Text>
                        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <CustomDatePicker
                        visible={showDobPicker}
                        value={tDob || '2000-01-01'}
                        onSelect={(date) => setTDob(date)}
                        onClose={() => setShowDobPicker(false)}
                      />
                    </View>

                    {/* CONTACT & PORTAL ACCESS */}
                    <View style={styles.subSectionDivider}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                        <Text style={styles.subSectionTitle} allowFontScaling={false}>CONTACT & PORTAL ACCESS</Text>
                        <View style={styles.portalAccessBadge}>
                          <Ionicons name="key-outline" size={11} color={colors.primary} />
                          <Text style={styles.portalAccessBadgeText} allowFontScaling={false}>PORTAL READY</Text>
                        </View>
                      </View>
                    </View>

                    <View style={{ marginTop: 4 }}>
                      <Text style={styles.cleanFieldLabel} allowFontScaling={false}>EMAIL ADDRESS *</Text>
                      <TextInput style={styles.cleanInput} keyboardType="email-address" placeholder="e.g. john@example.com" placeholderTextColor={colors.placeholder} value={tEmail} onChangeText={setTEmail} autoCapitalize="none" allowFontScaling={false} />
                    </View>

                    <View style={styles.twoColRow}>
                      <View style={styles.twoColField}>
                        <Text style={styles.cleanFieldLabel} allowFontScaling={false}>MOBILE PHONE *</Text>
                        <TextInput style={styles.cleanInput} keyboardType="phone-pad" placeholder="(512) 555-0199" placeholderTextColor={colors.placeholder} value={tPhone} onChangeText={setTPhone} allowFontScaling={false} />
                      </View>
                      <View style={styles.twoColField}>
                        <Text style={styles.cleanFieldLabel} allowFontScaling={false}>ALTERNATE PHONE</Text>
                        <TextInput style={styles.cleanInput} keyboardType="phone-pad" placeholder="(512) 555-4321" placeholderTextColor={colors.placeholder} value={tAltPhone} onChangeText={setTAltPhone} allowFontScaling={false} />
                      </View>
                    </View>
                    {formErrors.tContact && <Text style={styles.errorText}>{formErrors.tContact}</Text>}

                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.cleanFieldLabel} allowFontScaling={false}>TENANT PORTAL PASSWORD *</Text>
                      <View style={styles.passwordContainer}>
                        <TextInput
                          style={styles.passwordInput}
                          secureTextEntry={!tShowPassword}
                          placeholder="••••••••"
                          placeholderTextColor={colors.placeholder}
                          value={tPassword}
                          onChangeText={setTPassword}
                          allowFontScaling={false}
                        />
                        <TouchableOpacity style={styles.passwordEyeBtn} onPress={() => setTShowPassword(!tShowPassword)}>
                          <Ionicons name={tShowPassword ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* TENANCY DATES & OUTSTANDING BALANCE */}
                    <View style={styles.subSectionDivider}>
                      <Text style={styles.subSectionTitle} allowFontScaling={false}>TENANCY DATES & OUTSTANDING BALANCE</Text>
                    </View>

                    <View style={styles.twoColRow}>
                      <View style={styles.twoColField}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name="calendar-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                          <Text style={[styles.cleanFieldLabel, { marginBottom: 0 }]} allowFontScaling={false} numberOfLines={1}>MOVE-IN DATE *</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.cleanDatePickerBtn}
                          onPress={() => setShowMoveInPicker(true)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.cleanDatePickerText, !tMoveInDate && { color: colors.placeholder }]} numberOfLines={1} allowFontScaling={false}>
                            {tMoveInDate || 'Select Date'}
                          </Text>
                          <Ionicons name="calendar" size={15} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.cleanHelperText} allowFontScaling={false} numberOfLines={1}>Resident residing from</Text>
                        <CustomDatePicker
                          visible={showMoveInPicker}
                          value={tMoveInDate || new Date().toISOString().split('T')[0]}
                          onSelect={(date) => {
                            setTMoveInDate(date);
                            if (!tInvoiceStartDate || tInvoiceStartDate === tMoveInDate) {
                              setTInvoiceStartDate(date);
                            }
                          }}
                          onClose={() => setShowMoveInPicker(false)}
                        />
                      </View>
                      <View style={styles.twoColField}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name="calendar-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                          <Text style={[styles.cleanFieldLabel, { marginBottom: 0 }]} allowFontScaling={false} numberOfLines={1}>INVOICES FROM *</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.cleanDatePickerBtn}
                          onPress={() => setShowInvoiceStartPicker(true)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.cleanDatePickerText, !tInvoiceStartDate && { color: colors.placeholder }]} numberOfLines={1} allowFontScaling={false}>
                            {tInvoiceStartDate || 'Select Date'}
                          </Text>
                          <Ionicons name="calendar" size={15} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.cleanHelperText} allowFontScaling={false} numberOfLines={1}>Invoices start date</Text>
                        <CustomDatePicker
                          visible={showInvoiceStartPicker}
                          value={tInvoiceStartDate || tMoveInDate || new Date().toISOString().split('T')[0]}
                          onSelect={(date) => setTInvoiceStartDate(date)}
                          onClose={() => setShowInvoiceStartPicker(false)}
                        />
                      </View>
                    </View>

                    <View style={{ marginTop: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, color: '#f59e0b', fontWeight: 'bold', marginRight: 4 }}>$</Text>
                        <Text style={[styles.cleanFieldLabel, { marginBottom: 0 }]} allowFontScaling={false}>OUTSTANDING BALANCE ($)</Text>
                      </View>
                      <TextInput style={styles.cleanInput} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.placeholder} value={tOutstandingBalance} onChangeText={setTOutstandingBalance} allowFontScaling={false} />
                      <Text style={styles.cleanHelperText} allowFontScaling={false}>Initial balance logged in ledger</Text>
                    </View>

                    {/* MONTHLY BILLING STATUS */}
                    {pastMonths.length > 0 && (
                      <View style={styles.billingStatusBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                          <Ionicons name="calendar" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.billingBoxTitle} allowFontScaling={false}>
                            MONTHLY BILLING STATUS ({pastMonths.length} MONTHS PAST)
                          </Text>
                        </View>
                        <Text style={styles.cleanHelperText} allowFontScaling={false}>
                          Tap any month to set status: <Text style={{ color: colors.success, fontWeight: '700' }}>Paid</Text>, <Text style={{ color: colors.warning, fontWeight: '700' }}>Partial</Text>, or <Text style={{ color: colors.danger, fontWeight: '700' }}>Unpaid</Text>.
                        </Text>

                        {/* Late Fee Checkbox Row */}
                        <TouchableOpacity
                          style={[
                            styles.monthlyLateFeeBtn,
                            includeMonthlyLateFee && styles.monthlyLateFeeBtnActive
                          ]}
                          onPress={() => setIncludeMonthlyLateFee(!includeMonthlyLateFee)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={includeMonthlyLateFee ? "checkbox" : "square-outline"}
                            size={16}
                            color={includeMonthlyLateFee ? "#d97706" : colors.textMuted}
                          />
                          <Text style={[styles.monthlyLateFeeText, includeMonthlyLateFee && { color: "#d97706" }]} allowFontScaling={false}>
                            Include $50 Late Fee for Unpaid Months
                          </Text>
                        </TouchableOpacity>

                        {/* Summary Badges Row */}
                        <View style={styles.billingStatsRow}>
                          <View style={styles.paidBadge}>
                            <Ionicons name="checkmark-circle" size={11} color={colors.success} style={{ marginRight: 3 }} />
                            <Text style={styles.paidBadgeText} allowFontScaling={false}>
                              Paid: {paidCount} (${paidTotal.toLocaleString()})
                            </Text>
                          </View>
                          {partialCount > 0 && (
                            <View style={styles.partialBadge}>
                              <Ionicons name="time" size={11} color={colors.warning} style={{ marginRight: 3 }} />
                              <Text style={styles.partialBadgeText} allowFontScaling={false}>
                                Partial: {partialCount}
                              </Text>
                            </View>
                          )}
                          <View style={styles.unpaidBadge}>
                            <Ionicons name="alert-circle" size={11} color={colors.danger} style={{ marginRight: 3 }} />
                            <Text style={styles.unpaidBadgeText} allowFontScaling={false}>
                              Unpaid: {unpaidCount} (${unpaidTotal.toLocaleString()})
                            </Text>
                          </View>
                        </View>

                        {/* Month Chips Grid */}
                        <View style={styles.monthChipsGrid}>
                          {pastMonths.map((m) => {
                            const d = monthPaymentDetails[m.id] || { status: 'Unpaid', paidAmount: 0 };
                            const isPaid = d.status === 'Paid';
                            const isPartial = d.status === 'Partial';
                            const rentVal = Number(uRent) || 1500;
                            const lateVal = includeMonthlyLateFee ? 50 : 0;
                            const due = isPaid ? 0 : isPartial ? Math.max(0, rentVal + lateVal - d.paidAmount) : (rentVal + lateVal);

                            return (
                              <TouchableOpacity
                                key={m.id}
                                style={[
                                  styles.monthChipClean,
                                  isPaid ? styles.monthChipCleanPaid : isPartial ? styles.monthChipCleanPartial : styles.monthChipCleanUnpaid,
                                  activeMonthPopover?.id === m.id && { borderWidth: 1.5, borderColor: colors.primary }
                                ]}
                                onPress={() => {
                                  if (activeMonthPopover?.id === m.id) {
                                    setActiveMonthPopover(null);
                                  } else {
                                    setActiveMonthPopover(m);
                                    setPartialAmountInput(isPartial ? String(d.paidAmount) : String(Math.round(rentVal / 2)));
                                  }
                                }}
                                activeOpacity={0.7}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, marginRight: 4 }}>
                                  <Ionicons
                                    name={isPaid ? "checkmark-circle" : isPartial ? "time" : "close-circle"}
                                    size={12}
                                    color={isPaid ? colors.success : isPartial ? colors.warning : colors.danger}
                                  />
                                  <Text style={styles.monthChipLabel} allowFontScaling={false} numberOfLines={1}>
                                    {m.label}
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.monthChipStatusText,
                                    isPaid ? { color: colors.success } : isPartial ? { color: colors.warning } : { color: colors.danger }
                                  ]}
                                  allowFontScaling={false}
                                  numberOfLines={1}
                                >
                                  {isPaid ? 'Paid' : isPartial ? `$${due} Due` : `$${due}`}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Inline Popover Panel for active month */}
                        {activeMonthPopover && (
                          <View style={styles.monthPopoverCard}>
                            <View style={styles.monthPopoverHeader}>
                              <Text style={styles.monthPopoverTitle} allowFontScaling={false}>
                                {activeMonthPopover.label} PAYMENT STATUS
                              </Text>
                              <TouchableOpacity onPress={() => setActiveMonthPopover(null)}>
                                <Ionicons name="close" size={18} color={colors.textMuted} />
                              </TouchableOpacity>
                            </View>
                            <Text style={styles.monthPopoverSub} allowFontScaling={false}>
                              Monthly Rent: ${(Number(uRent) || 1500).toLocaleString()} {includeMonthlyLateFee ? '+ $50 Late Fee' : ''}
                            </Text>

                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                              <TouchableOpacity
                                style={[styles.popoverActionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: colors.success }]}
                                onPress={() => handleSetMonthStatus(activeMonthPopover.id, 'Paid')}
                              >
                                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                                <Text style={[styles.popoverActionText, { color: colors.success }]} allowFontScaling={false}>
                                  Paid ($0 Due)
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.popoverActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: colors.danger }]}
                                onPress={() => handleSetMonthStatus(activeMonthPopover.id, 'Unpaid')}
                              >
                                <Ionicons name="close-circle" size={14} color={colors.danger} />
                                <Text style={[styles.popoverActionText, { color: colors.danger }]} allowFontScaling={false}>
                                  Unpaid
                                </Text>
                              </TouchableOpacity>
                            </View>

                            <View style={{ marginTop: 8 }}>
                              <Text style={styles.cleanFieldLabel} allowFontScaling={false}>Partial Payment Amount ($):</Text>
                              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                <TextInput
                                  style={[styles.cleanInput, { flex: 1, minHeight: 36, height: 36, paddingVertical: 4 }]}
                                  keyboardType="numeric"
                                  placeholder="e.g. 500"
                                  placeholderTextColor={colors.placeholder}
                                  value={partialAmountInput}
                                  onChangeText={setPartialAmountInput}
                                  allowFontScaling={false}
                                />
                                <TouchableOpacity
                                  style={[styles.popoverActionBtn, { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: colors.warning, height: 36 }]}
                                  onPress={() => handleSetMonthStatus(activeMonthPopover.id, 'Partial', Number(partialAmountInput) || 0)}
                                >
                                  <Text style={[styles.popoverActionText, { color: colors.warning }]} allowFontScaling={false}>
                                    Save Partial
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* ADDITIONAL DETAILS (OPTIONAL) - Matching Web 1:1 */}
                    <View style={styles.extraAccordionHeader}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.subSectionTitle} allowFontScaling={false}>
                          ADDITIONAL DETAILS (OPTIONAL)
                        </Text>
                        <Text style={styles.cleanHelperText} allowFontScaling={false} numberOfLines={1}>
                          Government IDs, Emergency Contacts, Employment Parameters & Address History
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.accordionToggleBtn}
                        onPress={() => setShowTenantExtra(!showTenantExtra)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.accordionToggleText} allowFontScaling={false}>
                          {showTenantExtra ? 'Hide Details ⌃' : 'Show Details ⌵'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {showTenantExtra && (
                      <View style={{ marginTop: 6 }}>
                        {/* 1. GOVERNMENT IDS (OPTIONAL) */}
                        <Text style={styles.subSectionDividerHeader} allowFontScaling={false}>
                          Government IDs (Optional)
                        </Text>
                        <View style={styles.twoColRow}>
                          <View style={styles.twoColField}>
                            <Text style={styles.cleanFieldLabel} allowFontScaling={false}>ID TYPE</Text>
                            <TouchableOpacity
                              style={styles.cleanDropdownTrigger}
                              onPress={() => setActiveUnitDropdown('idType')}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.cleanDropdownText} allowFontScaling={false} numberOfLines={1}>
                                {tIdType || 'Driver License'}
                              </Text>
                              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                          </View>
                          <View style={styles.twoColField}>
                            <Text style={styles.cleanFieldLabel} allowFontScaling={false}>ID NUMBER</Text>
                            <TextInput
                              style={styles.cleanInput}
                              placeholder="A1234567"
                              placeholderTextColor={colors.placeholder}
                              value={tIdNumber}
                              onChangeText={setTIdNumber}
                              allowFontScaling={false}
                            />
                          </View>
                        </View>

                        {/* 2. EMERGENCY CONTACT (OPTIONAL) */}
                        <Text style={styles.subSectionDividerHeader} allowFontScaling={false}>
                          Emergency Contact (Optional)
                        </Text>
                        <View style={styles.twoColRow}>
                          <View style={styles.twoColField}>
                            <Text style={styles.cleanFieldLabel} allowFontScaling={false}>CONTACT NAME</Text>
                            <TextInput
                              style={styles.cleanInput}
                              placeholder="Mary Doe"
                              placeholderTextColor={colors.placeholder}
                              value={tEmergencyName}
                              onChangeText={setTEmergencyName}
                              allowFontScaling={false}
                            />
                          </View>
                          <View style={styles.twoColField}>
                            <Text style={styles.cleanFieldLabel} allowFontScaling={false}>RELATIONSHIP</Text>
                            <TextInput
                              style={styles.cleanInput}
                              placeholder="Spouse / Parent"
                              placeholderTextColor={colors.placeholder}
                              value={tEmergencyRelationship}
                              onChangeText={setTEmergencyRelationship}
                              allowFontScaling={false}
                            />
                          </View>
                        </View>
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.cleanFieldLabel} allowFontScaling={false}>EMERGENCY PHONE</Text>
                          <TextInput
                            style={styles.cleanInput}
                            keyboardType="phone-pad"
                            placeholder="(512) 555-9876"
                            placeholderTextColor={colors.placeholder}
                            value={tEmergencyPhone}
                            onChangeText={setTEmergencyPhone}
                            allowFontScaling={false}
                          />
                        </View>

                        {/* 3. EMPLOYMENT PARAMETERS (OPTIONAL) */}
                        <Text style={styles.subSectionDividerHeader} allowFontScaling={false}>
                          Employment Parameters (Optional)
                        </Text>
                        <View style={styles.twoColRow}>
                          <View style={styles.twoColField}>
                            <Text style={styles.cleanFieldLabel} allowFontScaling={false}>EMPLOYER NAME (CURRENT JOB)</Text>
                            <TextInput
                              style={styles.cleanInput}
                              placeholder="Google Inc."
                              placeholderTextColor={colors.placeholder}
                              value={tEmployer}
                              onChangeText={setTEmployer}
                              allowFontScaling={false}
                            />
                          </View>
                          <View style={styles.twoColField}>
                            <Text style={styles.cleanFieldLabel} allowFontScaling={false}>POSITION</Text>
                            <TextInput
                              style={styles.cleanInput}
                              placeholder="Staff Engineer"
                              placeholderTextColor={colors.placeholder}
                              value={tPosition}
                              onChangeText={setTPosition}
                              allowFontScaling={false}
                            />
                          </View>
                        </View>
                        <View style={[styles.twoColRow, { marginTop: 8 }]}>
                          <View style={styles.twoColField}>
                            <Text style={styles.cleanFieldLabel} allowFontScaling={false}>JOB PHONE NUMBER</Text>
                            <TextInput
                              style={styles.cleanInput}
                              keyboardType="phone-pad"
                              placeholder="(512) 555-1122 (Optional)"
                              placeholderTextColor={colors.placeholder}
                              value={tEmployerPhone}
                              onChangeText={setTEmployerPhone}
                              allowFontScaling={false}
                            />
                          </View>
                          <View style={styles.twoColField}>
                            <Text style={styles.cleanFieldLabel} allowFontScaling={false}>MONTHLY INCOME ($)</Text>
                            <TextInput
                              style={styles.cleanInput}
                              keyboardType="numeric"
                              placeholder="e.g. 3500"
                              placeholderTextColor={colors.placeholder}
                              value={tMonthlyIncome}
                              onChangeText={setTMonthlyIncome}
                              allowFontScaling={false}
                            />
                          </View>
                        </View>
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.cleanFieldLabel} allowFontScaling={false}>STATUS</Text>
                          <TouchableOpacity
                            style={styles.cleanDropdownTrigger}
                            onPress={() => setActiveUnitDropdown('employmentStatus')}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.cleanDropdownText} allowFontScaling={false} numberOfLines={1}>
                              {tEmploymentStatus || 'Full-Time'}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>

                        {/* 4. ADDRESS HISTORY (OPTIONAL) */}
                        <Text style={styles.subSectionDividerHeader} allowFontScaling={false}>
                          Address History (Optional)
                        </Text>
                        <View style={{ gap: 8 }}>
                          <View>
                            <Text style={styles.cleanFieldLabel} allowFontScaling={false}>CURRENT ADDRESS</Text>
                            <TextInput
                              style={styles.cleanInput}
                              placeholder="789 Pine Rd, Austin, TX"
                              placeholderTextColor={colors.placeholder}
                              value={tCurrentAddress}
                              onChangeText={setTCurrentAddress}
                              allowFontScaling={false}
                            />
                          </View>
                          <View>
                            <Text style={styles.cleanFieldLabel} allowFontScaling={false}>PREVIOUS ADDRESS (OPTIONAL)</Text>
                            <TextInput
                              style={styles.cleanInput}
                              placeholder="456 Elm St, Dallas, TX"
                              placeholderTextColor={colors.placeholder}
                              value={tPreviousAddress}
                              onChangeText={setTPreviousAddress}
                              allowFontScaling={false}
                            />
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Automated Workflow Execution Banner */}
                    <View style={styles.workflowBannerClean}>
                      <Ionicons name="shield-checkmark" size={18} color={colors.success} style={{ marginTop: 2, marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.workflowBannerTitle} allowFontScaling={false}>
                          Automated Workflow Execution:
                        </Text>
                        <Text style={styles.workflowBannerText} allowFontScaling={false}>
                          Submitting will automatically create the Active Tenant account with portal password, generate an Active Lease agreement, auto-bypass screening, and mark Move-In Workflow as COMPLETED.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* VACANT ADVERTISING PREFERENCE */}
                {uStatus === 'Vacant' && !editingUnitId && (
                  <View style={[styles.sectionCard, { marginTop: 12 }]}>
                    <Text style={styles.sectionCardTitle} allowFontScaling={false}>VACANT ADVERTISING</Text>
                    <Text style={styles.sectionCardSubtitle} allowFontScaling={false}>
                      Do you want to advertise this vacant unit on rental portals?
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <TouchableOpacity
                        style={[styles.unitPropChip, uWantToAdvertise === 'yes' && styles.unitPropChipActive, { flex: 1, justifyContent: 'center' }]}
                        onPress={() => setUWantToAdvertise('yes')}
                      >
                        <Text style={[styles.unitPropChipText, uWantToAdvertise === 'yes' && styles.unitPropChipTextActive]} allowFontScaling={false}>Yes, Advertise</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.unitPropChip, uWantToAdvertise === 'no' && styles.unitPropChipActive, { flex: 1, justifyContent: 'center' }]}
                        onPress={() => setUWantToAdvertise('no')}
                      >
                        <Text style={[styles.unitPropChipText, uWantToAdvertise === 'no' && styles.unitPropChipTextActive]} allowFontScaling={false}>No</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                  </>
                )}
              </ScrollView>

              {/* Fixed Footer Buttons */}
              <View style={styles.unitModalFooter}>
                <TouchableOpacity
                  style={styles.unitCancelBtn}
                  onPress={() => setIsUnitModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.unitCancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitSubmitBtn, !uPropId && { opacity: 0.5 }]}
                  onPress={handleSaveUnit}
                  disabled={submitting || !uPropId}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.unitSubmitBtnText} allowFontScaling={false}>
                      {editingUnitId ? 'Update Unit' : 'Save Unit'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* ------------------------------------------------------------------ */}
              {/* IN-MODAL UNIT TARGET PROPERTY DROPDOWN OVERLAY */}
              {/* ------------------------------------------------------------------ */}
              {showUnitPropDropdown && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 100001,
                    elevation: 100001,
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={() => setShowUnitPropDropdown(false)}
                  />
                  <View
                    style={[
                      styles.modalCard,
                      {
                        width: '100%',
                        maxWidth: 420,
                        maxHeight: '75%',
                        zIndex: 100002,
                        elevation: 100002,
                        backgroundColor: colors.surface,
                        borderColor: colors.cardBorder,
                        borderWidth: 1,
                        padding: 16,
                        borderRadius: 14,
                      },
                    ]}
                  >
                    <View style={styles.modalHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="business" size={18} color={colors.primary} />
                        <Text style={styles.modalTitle} allowFontScaling={false}>
                          Select Target Property
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowUnitPropDropdown(false)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Ionicons name="close" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={{ marginVertical: 10 }} showsVerticalScrollIndicator={false}>
                      {properties.length === 0 ? (
                        <View style={{ padding: 16, alignItems: 'center' }}>
                          <Text style={{ color: colors.textMuted, fontSize: 13 }} allowFontScaling={false}>
                            No properties found. Please create a property first.
                          </Text>
                        </View>
                      ) : (
                        properties.map((p) => {
                          const isSelected = uPropId === p.id;
                          return (
                            <TouchableOpacity
                              key={p.id}
                              style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                              onPress={() => {
                                setUPropId(p.id);
                                setFormErrors((prev) => ({ ...prev, propertyId: undefined }));
                                setShowUnitPropDropdown(false);
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text
                                  style={[styles.detailVal, isSelected && { color: colors.primary, fontWeight: '700' }]}
                                  allowFontScaling={false}
                                >
                                  {p.name}
                                </Text>
                                {p.address && (
                                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }} allowFontScaling={false} numberOfLines={1}>
                                    {formatAddress(p.address)}
                                  </Text>
                                )}
                              </View>
                              {isSelected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>

                    <TouchableOpacity
                      style={styles.closeBtn}
                      onPress={() => setShowUnitPropDropdown(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.closeBtnText} allowFontScaling={false}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ------------------------------------------------------------------ */}
              {/* IN-MODAL UNIT ADDITIONAL DROPDOWN OVERLAY (ID TYPE / STATUS) */}
              {/* ------------------------------------------------------------------ */}
              {!!activeUnitDropdown && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 100003,
                    elevation: 100003,
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={() => setActiveUnitDropdown(null)}
                  />
                  <View
                    style={[
                      styles.modalCard,
                      {
                        width: '100%',
                        maxWidth: 420,
                        maxHeight: '70%',
                        zIndex: 100004,
                        elevation: 100004,
                        backgroundColor: colors.surface,
                        borderColor: colors.cardBorder,
                        borderWidth: 1,
                        padding: 16,
                        borderRadius: 14,
                      },
                    ]}
                  >
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle} allowFontScaling={false}>
                        {activeUnitDropdown === 'idType' ? 'Select ID Type' : 'Select Employment Status'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setActiveUnitDropdown(null)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Ionicons name="close" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 280, marginVertical: 8 }} showsVerticalScrollIndicator={false}>
                      {(activeUnitDropdown === 'idType' ? ID_TYPES : EMPLOYMENT_STATUSES).map((itemVal) => {
                        const isSelected = activeUnitDropdown === 'idType' ? tIdType === itemVal : tEmploymentStatus === itemVal;
                        return (
                          <TouchableOpacity
                            key={itemVal}
                            style={[
                              styles.pickerRow,
                              isSelected && { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' },
                            ]}
                            onPress={() => {
                              if (activeUnitDropdown === 'idType') {
                                setTIdType(itemVal);
                              } else {
                                setTEmploymentStatus(itemVal);
                              }
                              setActiveUnitDropdown(null);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.cleanDropdownText,
                                isSelected && { color: colors.primary, fontWeight: '700' },
                              ]}
                              allowFontScaling={false}
                            >
                              {itemVal}
                            </Text>
                            {isSelected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <TouchableOpacity
                      style={styles.closeBtn}
                      onPress={() => setActiveUnitDropdown(null)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.closeBtnText} allowFontScaling={false}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </View>
  );
};

// ----------------------------------------------------------------------------
// STYLESHEET
// ----------------------------------------------------------------------------
const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mutedText: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 8,
    },

    // Header
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    screenTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
    },
    addBtnText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#0f172a',
      marginLeft: 4,
    },

    // Tabs
    tabsRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 3,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 7,
      borderRadius: 6,
    },
    tabActive: {
      backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    tabText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.textPrimary,
      fontWeight: '700',
    },

    // Search
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 38,
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: colors.textPrimary,
      paddingVertical: 0,
    },

    // List
    scrollList: {
      flex: 1,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 12,
      marginBottom: 10,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    cardAddress: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 5,
    },
    badgeActive: {
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
    },
    badgeMuted: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
    },
    badgeText: {
      fontSize: 10.5,
      fontWeight: '700',
    },
    badgeTextActive: {
      color: colors.success,
    },
    badgeTextMuted: {
      color: colors.warning,
    },

    // Info Row
    infoRow: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: 6,
      padding: 8,
      marginVertical: 4,
    },
    infoItem: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 2,
    },
    infoValue: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },

    // Card Actions
    cardActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    btnSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    },
    btnSmallText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },

    // Empty State
    emptyState: {
      alignItems: 'center',
      paddingVertical: 30,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
    },

    // Modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      padding: 16,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    detailKey: {
      fontSize: 12.5,
      color: colors.textMuted,
    },
    detailVal: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    closeBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 8,
      paddingVertical: 9,
      alignItems: 'center',
      marginTop: 10,
    },
    closeBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },

    // Section Boxes inside Add Unit Modal
    sectionBox: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 10,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    sectionBoxTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.3,
    },
    subSectionHeader: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginTop: 6,
    },
    helperText: {
      fontSize: 9.5,
      color: colors.textMuted,
      marginTop: 1,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    toggleBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    toggleBadgeActive: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      borderColor: colors.success,
    },
    toggleBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textMuted,
    },
    toggleBadgeTextActive: {
      color: colors.success,
    },

    // Monthly Billing Status Box (Screenshot 3)
    billingStatusBox: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 10,
      marginTop: 10,
    },
    billingBoxTitle: {
      fontSize: 10.5,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    lateFeeToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginVertical: 6,
    },
    lateFeeToggleText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    paidBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    paidBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.success,
    },
    unpaidBadge: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    unpaidBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.danger,
    },
    partialBadge: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    partialBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.warning,
    },
    monthChipsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 6,
    },
    monthChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 5,
      paddingHorizontal: 7,
      paddingVertical: 4,
    },
    monthChipPaid: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    monthChipUnpaid: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    monthChipPartial: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    monthChipText: {
      fontSize: 10,
      fontWeight: '600',
    },
    monthPopoverCard: {
      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
      padding: 10,
      marginTop: 8,
    },
    monthPopoverHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    monthPopoverTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    monthPopoverSub: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 2,
    },
    popoverActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 7,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
    },
    popoverActionText: {
      fontSize: 11,
      fontWeight: '700',
    },

    // Workflow Banner (Screenshot 3)
    workflowBanner: {
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      marginTop: 12,
    },
    workflowBannerTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.success,
    },
    workflowBannerText: {
      fontSize: 10,
      color: colors.textSecondary,
      lineHeight: 14,
    },

    // Picker
    pickerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    pickerRowSelected: {
      backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
    },
    modalBtnRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 12,
    },
    cancelBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cancelBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#0f172a',
    },

    // Inputs
    inputLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 4,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      fontSize: 13,
      color: colors.textPrimary,
    },
    datePickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 9,
      minHeight: 38,
    },
    datePickerBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    errorText: {
      fontSize: 10.5,
      color: colors.danger,
      marginTop: 2,
    },
    chip: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      marginRight: 6,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
    },
    chipText: {
      fontSize: 11.5,
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },

    // Add Property Form Full Modal (Web 1:1 Matching)
    propFullModalCard: {
      maxHeight: '94%',
      height: '92%',
      padding: 16,
      borderRadius: 14,
      backgroundColor: colors.surface,
      display: 'flex',
      flexDirection: 'column',
    },
    propHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    propMainTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    propSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    propCloseBtn: {
      padding: 4,
    },
    formGroup: {
      marginTop: 11,
    },
    twoColRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 11,
    },
    fieldLabel: {
      fontSize: 10.5,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 5,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    fieldLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 5,
    },
    requiredStar: {
      color: colors.danger || '#ef4444',
      fontWeight: '700',
    },
    optionalTag: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    addOwnerLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    addOwnerLinkText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#2563eb',
    },
    propInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13.5,
      color: colors.textPrimary,
      minHeight: 40,
    },
    propInputError: {
      borderColor: colors.danger || '#ef4444',
    },
    propSelectTrigger: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      minHeight: 40,
    },
    propSelectValue: {
      fontSize: 13.5,
      color: colors.textPrimary,
      fontWeight: '500',
      flex: 1,
    },
    // Payment Integration Box
    propPaymentBox: {
      backgroundColor: isDarkMode ? '#1e293b' : '#f0f9ff',
      borderColor: isDarkMode ? '#334155' : '#bae6fd',
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginTop: 14,
    },
    propPaymentHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      marginBottom: 3,
    },
    propPaymentTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: '#0284c7',
      letterSpacing: 0.3,
    },
    companyDefaultBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDarkMode ? 'rgba(100, 116, 139, 0.15)' : '#f1f5f9',
      borderColor: isDarkMode ? '#334155' : '#cbd5e1',
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
      flexShrink: 0,
    },
    companyDefaultBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    propPaymentSubtitle: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 4,
      lineHeight: 15,
    },
    propPaymentLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 5,
      letterSpacing: 0.3,
    },
    propPaymentDropdown: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 9,
      minHeight: 40,
    },
    propPaymentDropdownVal: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    propPaymentHint: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 4,
      lineHeight: 14,
    },
    customGatewayBadge: {
      backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
      borderColor: 'rgba(16, 185, 129, 0.4)',
    },
    passwordInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderColor: colors.inputBorder,
      borderWidth: 1,
      borderRadius: 8,
      paddingRight: 6,
    },
    passwordInput: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13,
      color: colors.textPrimary,
    },
    eyeBtn: {
      padding: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Additional Details Accordion Box
    propAccordionBox: {
      backgroundColor: colors.background,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      marginTop: 14,
      overflow: 'hidden',
    },
    propAccordionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.surface,
    },
    propAccordionTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.3,
    },
    propAccordionSub: {
      fontSize: 10.5,
      color: colors.textMuted,
      marginTop: 2,
    },
    propAccordionToggleText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#2563eb',
    },
    propAccordionBody: {
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    // Bottom Footer Actions Bar
    propFooterBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      marginTop: 4,
    },
    propCancelBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    propCancelBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    propDraftBtn: {
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
    },
    propDraftBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    propSubmitBtn: {
      backgroundColor: '#2563eb',
      paddingVertical: 9,
      paddingHorizontal: 18,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 110,
    },
    propSubmitBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },

    // Unit Full Modal & Clean Form Styles
    unitFullModalCard: {
      maxHeight: '94%',
      height: '92%',
      padding: 16,
    },
    modalHeaderClean: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    unitModalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    unitModalSubtitle: {
      fontSize: 11.5,
      color: colors.textMuted,
      marginTop: 2,
    },
    unitCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cleanFieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.3,
      marginBottom: 5,
    },
    cleanInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 7,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
      color: colors.textPrimary,
      minHeight: 40,
    },
    inputErrorBorder: {
      borderColor: colors.danger,
    },
    twoColRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    twoColField: {
      flex: 1,
    },
    unitPropChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 7,
    },
    unitPropChipActive: {
      borderColor: colors.primary,
      backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
    },
    unitPropChipText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    unitPropChipTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    unitStatusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 7,
    },
    unitStatusChipActive: {
      borderColor: colors.primary,
      backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
    },
    unitStatusChipOccupied: {
      borderColor: colors.success,
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
    },
    unitStatusChipText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    unitStatusChipTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 12,
      marginTop: 12,
    },
    sectionCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionCardTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.3,
    },
    sectionCardSubtitle: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 2,
    },
    occupiedHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    occupiedSectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.4,
    },
    activeResidentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      borderWidth: 1,
      borderRadius: 5,
      paddingHorizontal: 7,
      paddingVertical: 3,
      flexShrink: 0,
    },
    activeResidentBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.success,
      letterSpacing: 0.3,
    },
    statusDotGreen: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.success,
      marginRight: 4,
    },
    subSectionDivider: {
      marginTop: 14,
      marginBottom: 6,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    subSectionTitle: {
      fontSize: 10.5,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    portalAccessBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.1)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    portalAccessBadgeText: {
      fontSize: 9.5,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.3,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 7,
      paddingHorizontal: 4,
    },
    passwordInput: {
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 8,
      fontSize: 13,
      color: colors.textPrimary,
      minHeight: 40,
    },
    passwordEyeBtn: {
      padding: 8,
    },
    cleanDatePickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 7,
      paddingHorizontal: 12,
      paddingVertical: 9,
      minHeight: 40,
    },
    cleanDatePickerText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textPrimary,
      flex: 1,
    },
    cleanHelperText: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 3,
    },
    monthlyLateFeeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.background,
      marginTop: 8,
      marginBottom: 8,
    },
    monthlyLateFeeBtnActive: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: '#f59e0b',
    },
    monthlyLateFeeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    billingStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    monthChipClean: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '48.5%',
      paddingVertical: 7,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
    },
    monthChipCleanPaid: {
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    monthChipCleanPartial: {
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
      borderColor: 'rgba(245, 158, 11, 0.25)',
    },
    monthChipCleanUnpaid: {
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      borderColor: 'rgba(239, 68, 68, 0.25)',
    },
    monthChipLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    monthChipStatusText: {
      fontSize: 10,
      fontWeight: '700',
    },
    extraAccordionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    accordionToggleBtn: {
      backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 5,
      flexShrink: 0,
    },
    accordionToggleText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subSectionDividerHeader: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      paddingBottom: 4,
      marginTop: 12,
      marginBottom: 8,
    },
    workflowBannerClean: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.25)',
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      marginTop: 12,
    },
    unitModalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 10,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      marginTop: 6,
    },
    unitCancelBtn: {
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    unitCancelBtnText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    unitSubmitBtn: {
      backgroundColor: '#2563eb',
      paddingVertical: 9,
      paddingHorizontal: 20,
      borderRadius: 8,
      minWidth: 110,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unitSubmitBtnText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#ffffff',
    },
    // Target Property Card (Matching Web 1:1)
    targetPropCard: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 12,
      marginBottom: 12,
    },
    targetPropHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    targetPropTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.5,
    },
    targetPropBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      gap: 3,
    },
    targetPropBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.success,
    },
    changePropBtn: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
    },
    changePropBtnText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    cleanDropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 42,
    },
    cleanDropdownText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      flex: 1,
    },
    // Empty State Card when no Property Selected (Matching Web 1:1)
    unitEmptyNoticeCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.cardBorder,
      paddingVertical: 36,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      marginBottom: 16,
    },
    unitEmptyNoticeIconWrapper: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.2)',
    },
    unitEmptyNoticeTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 6,
      textAlign: 'center',
    },
    unitEmptyNoticeSubtitle: {
      fontSize: 11.5,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 17,
      maxWidth: 290,
    },
  });

export default PropertiesScreen;

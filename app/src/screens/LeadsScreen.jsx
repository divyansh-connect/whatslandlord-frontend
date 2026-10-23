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
  Linking,
} from 'react-native';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { leadSchema, screeningSchema, leaseSchema, moveInSchema, moveOutSchema } from '../validations/mobile.validation';
import { CustomDatePicker } from '../components/CustomDatePicker';

const moveInStatusFilters = [
  { label: 'All Moves', value: 'ALL' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Inspection In Progress', value: 'INSPECTION_IN_PROGRESS' },
  { label: 'Inspection Completed', value: 'INSPECTION_COMPLETED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const moveOutStatusFilters = [
  { label: 'All Moves', value: 'ALL' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Inspection In Progress', value: 'INSPECTION_IN_PROGRESS' },
  { label: 'Inspection Completed', value: 'INSPECTION_COMPLETED' },
  { label: 'Damage Review', value: 'DAMAGE_REVIEW' },
  { label: 'Ready for Completion', value: 'READY_FOR_COMPLETION' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export const LeadsScreen = ({ onNavigate, initialTab = 'leads' }) => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  // Sub-tab selector: 'leads' | 'applications' | 'screening' | 'leases' | 'renewals' | 'movein' | 'moveout' | 'templates'
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Lists state
  const [leadsList, setLeadsList] = useState([]);
  const [applicationsList, setApplicationsList] = useState([]);
  const [screeningList, setScreeningList] = useState([]);
  const [leasesList, setLeasesList] = useState([]);
  const [moveInList, setMoveInList] = useState([]);
  const [moveOutList, setMoveOutList] = useState([]);
  const [templatesList, setTemplatesList] = useState([]);

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

  // 1. Leads modal form states
  const [recordLeadOpen, setRecordLeadOpen] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadPropertyId, setLeadPropertyId] = useState('');
  const [leadStage, setLeadStage] = useState('NEW');

  // 2. Screening modal form states
  const [recordScreeningOpen, setRecordScreeningOpen] = useState(false);
  const [screenTenantId, setScreenTenantId] = useState('');
  const [screenName, setScreenName] = useState('');
  const [screenEmail, setScreenEmail] = useState('');
  const [screenPhone, setScreenPhone] = useState('');
  const [screenPropertyId, setScreenPropertyId] = useState('');
  const [screenUnitId, setScreenUnitId] = useState('');
  const [screenPackage, setScreenPackage] = useState('Basic');
  const [screenPaymentResponsibility, setScreenPaymentResponsibility] = useState('Applicant');

  // 3. Leases modal form states
  const [recordLeaseOpen, setRecordLeaseOpen] = useState(false);
  const [leasePropertyId, setLeasePropertyId] = useState('');
  const [leaseTenantId, setLeaseTenantId] = useState('');
  const [leaseUnitId, setLeaseUnitId] = useState('');
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [leaseMonthlyRent, setLeaseMonthlyRent] = useState('');
  const [leaseDepositAmount, setLeaseDepositAmount] = useState('');

  // 4. Move In and Move Out filter states (Auto-generated from Leases)
  const [moveInFilter, setMoveInFilter] = useState('ALL');
  const [moveOutFilter, setMoveOutFilter] = useState('ALL');

  // 6. Template modal form states
  const [recordTemplateOpen, setRecordTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateRooms, setTemplateRooms] = useState('4');

  // 7. Renewals state & action modals
  const [renewalsList, setRenewalsList] = useState([]);
  const [editRenewalModalOpen, setEditRenewalModalOpen] = useState(false);
  const [editingRenewal, setEditingRenewal] = useState(null);
  const [renewalNewRent, setRenewalNewRent] = useState('');
  const [renewalTermMonths, setRenewalTermMonths] = useState('12');
  const [renewalActionLoadingId, setRenewalActionLoadingId] = useState(null);
  const [skipActionLoadingId, setSkipActionLoadingId] = useState(null);

  // Universal Picker selector modal state
  const [activePicker, setActivePicker] = useState(null); // 'property' | 'unit' | 'tenant' | 'stage' | 'package' | 'paymentResp' | 'leaseProperty' | 'leaseUnit' | 'leaseTenant' | 'renewalTerm'

  // 7. Background screening details modal states
  const [selectedScreening, setSelectedScreening] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [screeningDocFile, setScreeningDocFile] = useState(null);
  const [screeningDob, setScreeningDob] = useState('');
  const [screeningSsn, setScreeningSsn] = useState('');
  const [screeningConsent, setScreeningConsent] = useState(false);

  // 8. Move In / Move Out start inspection states
  const [selectedMoveInOrOut, setSelectedMoveInOrOut] = useState(null);
  const [startInspectionModalOpen, setStartInspectionModalOpen] = useState(false);
  const [startInspectionTemplateId, setStartInspectionTemplateId] = useState('');
  const [leadErrors, setLeadErrors] = useState({});
  const [appErrors, setAppErrors] = useState({});
  const [scrErrors, setScrErrors] = useState({});
  const [leaseErrors, setLeaseErrors] = useState({});

  // Date picker modal states
  const [showScrDobPicker, setShowScrDobPicker] = useState(false);
  const [showLeaseStartPicker, setShowLeaseStartPicker] = useState(false);
  const [showLeaseEndPicker, setShowLeaseEndPicker] = useState(false);

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

  // Fetch dropdown helper choices
  const fetchOptions = async () => {
    try {
      const [props, unts, tnts] = await Promise.all([
        apiClient.get('/properties', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/units', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/tenants', logout, refreshAccessToken).catch(() => null),
      ]);
      const pData = Array.isArray(props) ? props : (Array.isArray(props?.data) ? props.data : (Array.isArray(props?.properties) ? props.properties : []));
      const uData = Array.isArray(unts) ? unts : (Array.isArray(unts?.data) ? unts.data : (Array.isArray(unts?.units) ? unts.units : []));
      const tData = Array.isArray(tnts) ? tnts : (Array.isArray(tnts?.data) ? tnts.data : (Array.isArray(tnts?.tenants) ? tnts.tenants : []));
      setProperties(pData);
      setUnits(uData);
      setTenants(tData);
    } catch (e) {
      console.log('Failed loading selections:', e.message);
    }
  };

  // 1. Fetch CRM Leads
  const fetchLeads = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/portal/crm/leads', logout, refreshAccessToken);
      const rawList = res?.data || res || [];
      setLeadsList(rawList.map(item => ({
        id: item.id,
        name: item.name || 'Prospect',
        email: item.email || 'N/A',
        phone: item.phone || 'N/A',
        propertyName: item.property?.name || item.propertyName || 'Property',
        propertyId: item.propertyId || '',
        stage: item.stage || 'NEW'
      })));
    } catch (e) {
      console.log('Leads fetch failed:', e.message);
      setLeadsList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // 2. Fetch Background Applications
  const fetchApplications = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/applications', logout, refreshAccessToken);
      const rawList = res?.data || res || [];
      setApplicationsList(rawList.map(item => ({
        id: item.id,
        applicantName: item.applicantName || 'Applicant',
        propertyName: item.property?.name || item.propertyName || 'Property',
        unitNumber: item.unitNumber || 'Room 1B',
        submissionDate: item.submissionDate ? item.submissionDate.split('T')[0] : (item.createdAt ? item.createdAt.split('T')[0] : 'N/A'),
        creditScore: item.creditScore || '720',
        proposedRent: item.proposedRent || 1500,
        status: item.status || 'Under Review',
        propertyId: item.propertyId || '',
      })));
    } catch (e) {
      console.log('Applications fetch failed:', e.message);
      setApplicationsList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // 3. Fetch Screening Reports
  const fetchScreening = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/portal/screening/reports', logout, refreshAccessToken);
      const rawList = res?.data || res || [];
      setScreeningList(rawList.map(s => ({
        id: s.id,
        applicantName: s.applicantName || s.name || 'Applicant',
        email: s.email || 'N/A',
        propertyName: s.property?.name || s.propertyName || 'Property',
        unitNumber: s.unit?.unitNumber || s.unitNumber || 'Unassigned',
        screeningPackage: s.screeningPackage || 'Basic',
        screeningStatus: s.status || s.screeningStatus || 'Processing',
      })));
    } catch (e) {
      console.log('Screening fetch failed:', e.message);
      setScreeningList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // 4. Fetch Leases
  const fetchLeases = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/leases', logout, refreshAccessToken);
      const rawList = res?.data || res || [];
      setLeasesList(rawList.map((l, idx) => ({
        id: l.id,
        leaseNumber: l.leaseNumber || `#${idx + 1}`,
        tenantName: l.tenant ? `${l.tenant.firstName} ${l.tenant.lastName}` : (l.tenantName || 'Resident'),
        propertyName: l.property?.name || l.propertyName || 'Property',
        unitNumber: l.unit?.unitNumber || l.unitNumber || 'Unassigned',
        startDate: l.startDate ? l.startDate.split('T')[0] : 'N/A',
        endDate: l.endDate ? l.endDate.split('T')[0] : 'N/A',
        monthlyRent: l.monthlyRent || l.rent || 1200,
        propertyId: l.propertyId,
      })));
    } catch (e) {
      console.log('Leases fetch failed:', e.message);
      setLeasesList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // 5. Fetch Move Ins
  const fetchMoveIns = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/move-ins', logout, refreshAccessToken);
      const rawList = res?.data || res || [];
      setMoveInList(rawList.map(m => ({
        id: m.id,
        tenantName: m.tenant ? `${m.tenant.firstName} ${m.tenant.lastName}` : (m.tenantName || 'Resident'),
        propertyName: m.property?.name || m.propertyName || 'Property',
        unitNumber: m.unit?.unitNumber || m.unitNumber || 'Unassigned',
        scheduledDate: m.scheduledDate ? m.scheduledDate.split('T')[0] : 'N/A',
        workflowStatus: m.status || m.workflowStatus || 'Scheduled',
        propertyId: m.propertyId,
      })));
    } catch (e) {
      console.log('Move-ins fetch failed:', e.message);
      setMoveInList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // 6. Fetch Move Outs (Uses same API endpoint path: /move-outs)
  const fetchMoveOuts = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/move-outs', logout, refreshAccessToken);
      const rawList = res?.data || res || [];
      setMoveOutList(rawList.map(m => ({
        id: m.id,
        tenantName: m.tenant ? `${m.tenant.firstName} ${m.tenant.lastName}` : (m.tenantName || 'Resident'),
        propertyName: m.propertyName || 'Property 1',
        unitNumber: m.unitNumber || 'Room 1A',
        scheduledDate: m.scheduledDate ? m.scheduledDate.split('T')[0] : 'N/A',
        workflowStatus: m.status || m.workflowStatus || 'Scheduled',
      })));
    } catch (e) {
      console.log('Move-outs fetch failed:', e.message);
      setMoveOutList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // 7. Fetch Inspection Templates (Uses same API endpoint path: /inspection-templates)
  const fetchTemplates = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/inspection-templates', logout, refreshAccessToken);
      const rawList = res?.data || res || [];
      setTemplatesList(rawList.map(t => ({
        id: t.id,
        name: t.name || 'Template',
        roomsCount: t.roomsCount || 4,
        createdBy: t.createdBy || 'manager@apexpm.com',
      })));
    } catch (e) {
      console.log('Templates fetch failed:', e.message);
      setTemplatesList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // 7.5. Fetch Lease Renewals (Combines database renewals and expiring active leases matching Web)
  const fetchRenewals = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [renewalsRes, leasesRes] = await Promise.all([
        apiClient.get('/renewals', logout, refreshAccessToken).catch(() => []),
        apiClient.get('/leases', logout, refreshAccessToken).catch(() => []),
      ]);
      const rawRenewals = Array.isArray(renewalsRes?.data) ? renewalsRes.data : (Array.isArray(renewalsRes) ? renewalsRes : []);
      const rawLeases = Array.isArray(leasesRes?.data) ? leasesRes.data : (Array.isArray(leasesRes) ? leasesRes : []);

      const processedIds = new Set();
      const combined = [];

      rawRenewals.forEach((r) => {
        const lid = r.leaseId || r.id;
        if (!lid) return;
        processedIds.add(lid);
        combined.push({
          id: r.id || `renew-${lid}`,
          leaseId: lid,
          tenantName: r.lease?.tenant ? `${r.lease.tenant.firstName} ${r.lease.tenant.lastName}` : (r.tenantName || 'Resident'),
          propertyName: r.lease?.property?.name || r.propertyName || 'Property',
          unitNumber: r.lease?.unit?.unitNumber ? `Unit ${r.lease.unit.unitNumber}` : (r.unitNumber || 'Unit'),
          currentRent: r.lease?.rentAmount || r.currentRent || 0,
          newRent: r.newRentAmount || r.newRent || (r.lease?.rentAmount || 0),
          expirationDate: r.lease?.endDate ? r.lease.endDate.split('T')[0] : (r.expirationDate ? r.expirationDate.split('T')[0] : 'N/A'),
          termMonths: r.termMonths || 12,
          status: r.status || 'PENDING',
        });
      });

      const now = new Date();
      const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      rawLeases.forEach((l) => {
        if (l.status !== 'Active' || !l.endDate) return;
        const end = new Date(l.endDate);
        if (end > sixtyDays) return;
        if (processedIds.has(l.id)) return;
        processedIds.add(l.id);
        combined.push({
          id: `renew-${l.id}`,
          leaseId: l.id,
          tenantName: l.tenantName || (l.tenant ? `${l.tenant.firstName} ${l.tenant.lastName}` : 'Resident'),
          propertyName: l.propertyName || l.property?.name || 'Property',
          unitNumber: l.unit?.unitNumber ? `Unit ${l.unit.unitNumber}` : (l.unitNumber || 'Unit'),
          currentRent: l.rentAmount || l.rent || 0,
          newRent: Math.round(Number(l.rentAmount || l.rent || 1500) * 1.05),
          expirationDate: l.endDate.split('T')[0],
          termMonths: 12,
          status: 'PENDING',
        });
      });

      setRenewalsList(combined);
    } catch (e) {
      console.log('Renewals fetch failed:', e.message);
      setRenewalsList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // Tab switching router refresh
  useEffect(() => {
    setSearchQuery('');
    setSelectedPropertyId('');
    fetchOptions();
    if (activeTab === 'leads') fetchLeads();
    if (activeTab === 'applications') fetchApplications();
    if (activeTab === 'screening') fetchScreening();
    if (activeTab === 'leases') fetchLeases();
    if (activeTab === 'renewals') fetchRenewals();
    if (activeTab === 'movein') fetchMoveIns();
    if (activeTab === 'moveout') fetchMoveOuts();
    if (activeTab === 'templates') fetchTemplates();
  }, [activeTab]);

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOptions();
    if (activeTab === 'leads') fetchLeads(false);
    if (activeTab === 'applications') fetchApplications(false);
    if (activeTab === 'screening') fetchScreening(false);
    if (activeTab === 'leases') fetchLeases(false);
    if (activeTab === 'renewals') fetchRenewals(false);
    if (activeTab === 'movein') fetchMoveIns(false);
    if (activeTab === 'moveout') fetchMoveOuts(false);
    if (activeTab === 'templates') fetchTemplates(false);
  };

  // Submissions

  // A. Save new CRM lead
  const handleSaveLead = async () => {
    setLeadErrors({});

    const validationData = {
      name: leadName.trim(),
      email: leadEmail.trim(),
      phone: leadPhone.trim(),
    };

    const valRes = leadSchema.safeParse(validationData);
    if (!valRes.success) {
      const errs = {};
      valRes.error.issues.forEach(issue => {
        errs[issue.path[0]] = issue.message;
      });
      setLeadErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: valRes.data.name,
        email: valRes.data.email || undefined,
        phone: valRes.data.phone || undefined,
        propertyId: leadPropertyId || undefined,
        stage: leadStage
      };

      await apiClient.post('/portal/crm/leads', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Lead Pipeline record created successfully.');
      setRecordLeadOpen(false);
      setLeadName('');
      setLeadEmail('');
      setLeadPhone('');
      fetchLeads(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create lead.');
    } finally {
      setSubmitting(false);
    }
  };

  // C. Save screening check (Send invitation)
  const handleRequestScreening = async () => {
    setScrErrors({});

    if (!screenTenantId && !screenName.trim()) {
      setScrErrors({ applicantName: 'Applicant selection or name is required' });
      return;
    }

    try {
      setSubmitting(true);
      const selectedProp = properties.find((p) => p.id === screenPropertyId);
      const selectedUnit = units.find((u) => u.id === screenUnitId);
      const payload = {
        tenantId: screenTenantId || undefined,
        applicantName: screenName.trim(),
        firstName: screenName.trim().split(' ')[0] || screenName.trim(),
        lastName: screenName.trim().split(' ').slice(1).join(' ') || '',
        email: screenEmail.trim() || undefined,
        phoneNumber: screenPhone.trim() || undefined,
        propertyId: screenPropertyId || undefined,
        propertyName: selectedProp ? selectedProp.name : 'Unknown Property',
        unitId: screenUnitId || undefined,
        unitNumber: selectedUnit ? selectedUnit.unitNumber : '101',
        screeningPackage: screenPackage,
        paymentResponsibility: screenPaymentResponsibility,
        status: 'Pending',
      };

      await apiClient.post('/portal/screening/reports', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Screening invitation dispatched to applicant.');
      setRecordScreeningOpen(false);
      setScreenTenantId('');
      setScreenName('');
      setScreenEmail('');
      setScreenPhone('');
      setScreenPropertyId('');
      setScreenUnitId('');
      fetchScreening(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to request screening check.');
    } finally {
      setSubmitting(false);
    }
  };

  // C2. Skip Screening (Auto-approves directly matching Web)
  const handleSkipScreening = async () => {
    setScrErrors({});

    if (!screenTenantId && !screenName.trim()) {
      setScrErrors({ applicantName: 'Applicant selection or name is required' });
      return;
    }

    try {
      setSubmitting(true);
      const selectedProp = properties.find((p) => p.id === screenPropertyId);
      const selectedUnit = units.find((u) => u.id === screenUnitId);
      const payload = {
        tenantId: screenTenantId || undefined,
        applicantName: screenName.trim(),
        firstName: screenName.trim().split(' ')[0] || screenName.trim(),
        lastName: screenName.trim().split(' ').slice(1).join(' ') || '',
        email: screenEmail.trim() || undefined,
        phoneNumber: screenPhone.trim() || undefined,
        propertyId: screenPropertyId || undefined,
        propertyName: selectedProp ? selectedProp.name : 'Unknown Property',
        unitId: screenUnitId || undefined,
        unitNumber: selectedUnit ? selectedUnit.unitNumber : '101',
        screeningPackage: screenPackage,
        paymentResponsibility: screenPaymentResponsibility,
        status: 'Approved',
        screeningStatus: 'Approved',
      };

      await apiClient.post('/portal/screening/reports', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Screening check auto-approved (Skipped).');
      setRecordScreeningOpen(false);
      setScreenTenantId('');
      setScreenName('');
      setScreenEmail('');
      setScreenPhone('');
      setScreenPropertyId('');
      setScreenUnitId('');
      fetchScreening(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to auto-approve screening.');
    } finally {
      setSubmitting(false);
    }
  };

  // D. Selected Screening Details fetcher
  const handleSelectScreening = async (item) => {
    try {
      setLoadingDetail(true);
      setSelectedScreening(item); // Temporary set list values
      setScreeningDob('');
      setScreeningSsn('');
      setScreeningConsent(false);
      setScreeningDocFile(null);

      const res = await apiClient.get(`/portal/screening/reports/${item.id}`, logout, refreshAccessToken);
      const detail = res?.data || res;
      if (detail) {
        setSelectedScreening({
          id: detail.id,
          applicantName: detail.applicantName || (detail.tenant ? `${detail.tenant.firstName || ''} ${detail.tenant.lastName || ''}`.trim() : 'Applicant'),
          email: detail.email || detail.applicantEmail || detail.tenant?.email || 'N/A',
          propertyName: detail.propertyName || detail.tenant?.unit?.property?.name || 'Property',
          unitNumber: detail.unitNumber || (detail.tenant?.unit?.unitNumber ? `Unit ${detail.tenant.unit.unitNumber}` : 'Unassigned'),
          screeningPackage: detail.screeningPackage || 'Basic',
          screeningStatus: detail.status || detail.screeningStatus || 'Processing',
          creditScore: detail.creditScore !== undefined ? detail.creditScore : 'N/A',
          criminalBackground: detail.criminalBackground || (detail.criminalPass ? 'Passed' : 'Flagged') || 'N/A',
          evictionHistory: detail.evictionHistory || (detail.evictionPass ? 'No Records' : 'Flagged') || 'N/A',
          dob: detail.dob || '—',
          ssn: detail.ssn || '—',
          authorized: detail.authorized || false,
          documentUrl: detail.documentUrl || '',
          documentName: detail.documentName || '',
        });
        if (detail.dob) setScreeningDob(detail.dob);
        if (detail.ssn) setScreeningSsn(detail.ssn);
        if (detail.authorized) setScreeningConsent(detail.authorized);
      }
    } catch (e) {
      console.log('Error fetching screening details:', e.message);
      Alert.alert('Error', 'Failed to load live screening details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // E. Submit screening decisions (Approve, Decline, Generate/Complete)
  const handleUpdateScreeningStatus = async (id, statusVal) => {
    try {
      setSubmitting(true);
      await apiClient.put(`/portal/screening/reports/${id}`, { status: statusVal }, logout, refreshAccessToken);
      Alert.alert('Success', `Screening status updated to ${statusVal}.`);
      setSelectedScreening(null);
      fetchScreening(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update screening status.');
    } finally {
      setSubmitting(false);
    }
  };

  // F. Upload document / Complete screening check flow
  const handleCompleteScreeningFlow = async () => {
    if (!screeningConsent) {
      Alert.alert('Consent Required', 'Applicant must authorize and give consent.');
      return;
    }
    if (!screeningDob.trim() || !screeningSsn.trim()) {
      Alert.alert('Validation Error', 'DOB and SSN are required.');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Save details (dob, ssn, authorized) and advance status to 'Processing' matching Web
      await apiClient.put(`/portal/screening/reports/${selectedScreening.id}`, {
        dob: screeningDob.trim(),
        ssn: screeningSsn.trim(),
        authorized: true,
        status: 'Processing',
      }, logout, refreshAccessToken);

      // 2. Upload document file if selected
      if (screeningDocFile) {
        const formData = new FormData();
        formData.append('document', {
          uri: Platform.OS === 'ios' ? screeningDocFile.uri.replace('file://', '') : screeningDocFile.uri,
          name: screeningDocFile.name || 'screening_doc.pdf',
          type: screeningDocFile.mimeType || 'application/pdf',
        });

        await apiClient.post(`/portal/screening/reports/${selectedScreening.id}/upload`, formData, logout, refreshAccessToken);
      }

      Alert.alert('Success', 'Screening details verified. Status moved to Processing.', [
        {
          text: 'Run Check Now',
          onPress: () => handleUpdateScreeningStatus(selectedScreening.id, 'Completed'),
        },
        {
          text: 'Close',
          onPress: () => {
            setSelectedScreening(null);
            fetchScreening(true);
          },
        },
      ]);
      fetchScreening(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to submit screening documents.');
    } finally {
      setSubmitting(false);
    }
  };

  // G. Document Picker for screening
  const handlePickScreeningDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setScreeningDocFile(res.assets[0]);
      }
    } catch (err) {
      console.log('DocumentPicker Error:', err);
    }
  };

  const openCreateLeaseModal = () => {
    fetchOptions();
    if (!leaseStartDate) {
      setLeaseStartDate(new Date().toISOString().split('T')[0]);
    }
    if (!leaseEndDate) {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setLeaseEndDate(nextYear.toISOString().split('T')[0]);
    }
    if (!leaseMonthlyRent) {
      setLeaseMonthlyRent('1500');
    }
    if (!leaseDepositAmount) {
      setLeaseDepositAmount('1500');
    }
    setRecordLeaseOpen(true);
  };

  // D. Create Lease agreement
  const handleCreateLease = async () => {
    setLeaseErrors({});

    if (!leaseTenantId) {
      setLeaseErrors({ tenantId: 'Resident selection is required' });
      return;
    }
    if (!leaseUnitId) {
      setLeaseErrors({ unitId: 'Rentable Unit selection is required' });
      return;
    }
    const selectedUnit = units.find((u) => u.id === leaseUnitId);
    if (selectedUnit && (selectedUnit.status?.toLowerCase() === 'occupied' || selectedUnit.isOccupied)) {
      setLeaseErrors({ unitId: 'Already occupied cannot create lease again' });
      Alert.alert('Unit Occupied', 'Already occupied cannot create lease again');
      return;
    }
    if (!leaseStartDate) {
      setLeaseErrors({ startDate: 'Start date is required' });
      return;
    }
    if (!leaseEndDate) {
      setLeaseErrors({ endDate: 'End date is required' });
      return;
    }
    if (leaseStartDate && leaseEndDate) {
      const start = new Date(leaseStartDate);
      const end = new Date(leaseEndDate);
      if (start >= end) {
        setLeaseErrors({ endDate: 'Lease Start Date must be before End Date' });
        Alert.alert('Invalid Date Range', 'Lease Start Date must be before End Date');
        return;
      }
    }
    if (!leaseMonthlyRent) {
      setLeaseErrors({ monthlyRent: 'Monthly rent is required' });
      return;
    }

    try {
      setSubmitting(true);
      const selTenant = tenants.find((t) => t.id === leaseTenantId);
      const selProp = properties.find((p) => p.id === leasePropertyId);
      const selUnit = units.find((u) => u.id === leaseUnitId);

      const payload = {
        tenantId: leaseTenantId,
        tenantName: selTenant ? `${selTenant.firstName || ''} ${selTenant.lastName || ''}`.trim() : 'Resident',
        propertyId: leasePropertyId || selUnit?.propertyId || undefined,
        propertyName: selProp ? selProp.name : (selUnit?.property?.name || 'Property'),
        unitId: leaseUnitId,
        unitNumber: selUnit ? selUnit.unitNumber : 'Unit',
        startDate: new Date(leaseStartDate).toISOString(),
        endDate: new Date(leaseEndDate).toISOString(),
        rentAmount: parseFloat(leaseMonthlyRent || '0'),
        depositAmount: parseFloat(leaseDepositAmount || leaseMonthlyRent || '0'),
        rent: parseFloat(leaseMonthlyRent || '0'),
        status: 'Active',
      };

      await apiClient.post('/leases', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Lease created and Move In scheduled successfully!');
      setRecordLeaseOpen(false);
      setLeasePropertyId('');
      setLeaseTenantId('');
      setLeaseUnitId('');
      setLeaseStartDate('');
      setLeaseEndDate('');
      setLeaseMonthlyRent('');
      setLeaseDepositAmount('');
      fetchLeases(true);
      fetchMoveIns(false);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create lease agreement.');
    } finally {
      setSubmitting(false);
    }
  };

  // Skip Move In Inspection (Direct Complete matching Web)
  const handleSkipMoveIn = async (item) => {
    Alert.alert(
      'Skip Inspection',
      `Auto-complete Move In for ${item.tenantName}? This will set Unit to Occupied and Lease to Active.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip & Complete',
          onPress: async () => {
            try {
              setSkipActionLoadingId(item.id);
              await apiClient.post(`/move-ins/${item.id}/complete`, {}, logout, refreshAccessToken);
              Alert.alert('Success', 'Move In auto-completed successfully!');
              fetchMoveIns(false);
              fetchLeases(false);
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to complete Move In.');
            } finally {
              setSkipActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // Skip Move Out Inspection (Direct Complete matching Web)
  const handleSkipMoveOut = async (item) => {
    Alert.alert(
      'Skip Inspection',
      `Auto-complete Move Out for ${item.tenantName}? This will terminate the lease and return unit to Vacant.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip & Complete',
          onPress: async () => {
            try {
              setSkipActionLoadingId(item.id);
              await apiClient.post(`/move-outs/${item.id}/complete`, {}, logout, refreshAccessToken);
              Alert.alert('Success', 'Move Out auto-completed successfully!');
              fetchMoveOuts(false);
              fetchLeases(false);
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to complete Move Out.');
            } finally {
              setSkipActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // Renewals Action Handlers matching Web
  const handleSendRenewalOffer = async (item) => {
    try {
      setRenewalActionLoadingId(item.id);
      await apiClient.post('/renewals/send-offer', { leaseId: item.leaseId }, logout, refreshAccessToken);
      Alert.alert('Success', `Renewal offer sent to ${item.tenantName}!`);
      setRenewalsList((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: 'OFFER_SENT' } : r)));
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to send renewal offer.');
    } finally {
      setRenewalActionLoadingId(null);
    }
  };

  const handleAcceptRenewal = async (item) => {
    try {
      setRenewalActionLoadingId(item.id);
      await apiClient.post('/renewals/accept', { leaseId: item.leaseId, termMonths: item.termMonths || 12 }, logout, refreshAccessToken);
      Alert.alert('Success', `Renewal accepted for ${item.tenantName}! Lease contract rolled over.`);
      setRenewalsList((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: 'ACCEPTED' } : r)));
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to accept renewal.');
    } finally {
      setRenewalActionLoadingId(null);
    }
  };

  const handleRejectRenewal = async (item) => {
    try {
      setRenewalActionLoadingId(item.id);
      await apiClient.post('/renewals/reject', { leaseId: item.leaseId }, logout, refreshAccessToken);
      Alert.alert('Success', `Renewal declined for ${item.tenantName}. Move-out scheduled.`);
      setRenewalsList((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: 'REJECTED' } : r)));
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to decline renewal.');
    } finally {
      setRenewalActionLoadingId(null);
    }
  };

  const handleSaveRenewalTerms = async () => {
    if (!editingRenewal || !renewalNewRent) return;
    try {
      setSubmitting(true);
      await apiClient.post(
        '/renewals/update',
        {
          leaseId: editingRenewal.leaseId,
          newRentAmount: Number(renewalNewRent),
          termMonths: Number(renewalTermMonths || '12'),
        },
        logout,
        refreshAccessToken
      );
      Alert.alert('Success', 'Renewal terms updated successfully.');
      setRenewalsList((prev) =>
        prev.map((r) =>
          r.id === editingRenewal.id ? { ...r, newRent: Number(renewalNewRent), termMonths: Number(renewalTermMonths) } : r
        )
      );
      setEditRenewalModalOpen(false);
      setEditingRenewal(null);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update renewal terms.');
    } finally {
      setSubmitting(false);
    }
  };

  // G. Create Inspection Template
  const handleCreateTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Validation Error', 'Template Name is required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: templateName.trim(),
        roomsCount: parseInt(templateRooms || '4'),
      };

      await apiClient.post('/inspection-templates', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Inspection checklist template created.');
      setRecordTemplateOpen(false);
      setTemplateName('');
      fetchTemplates(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create template.');
    } finally {
      setSubmitting(false);
    }
  };

  // H. Duplicate Inspection Template
  const handleDuplicateTemplate = async (id) => {
    try {
      setLoading(true);
      await apiClient.post(`/inspection-templates/${id}/duplicate`, {}, logout, refreshAccessToken);
      Alert.alert('Success', 'Inspection checklist template duplicated successfully.');
      fetchTemplates(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to duplicate template.');
    } finally {
      setLoading(false);
    }
  };

  // I. Start Inspection Flow
  const handleStartInspectionFlow = async () => {
    if (!startInspectionTemplateId) {
      Alert.alert('Validation Error', 'Please select an inspection template.');
      return;
    }

    try {
      setSubmitting(true);
      const isMoveIn = selectedMoveInOrOut.type === 'movein';
      const endpoint = isMoveIn 
        ? `/move-ins/${selectedMoveInOrOut.id}/start-inspection`
        : `/move-outs/${selectedMoveInOrOut.id}/start-inspection`;

      const res = await apiClient.post(endpoint, { templateId: startInspectionTemplateId }, logout, refreshAccessToken);
      const inspection = res?.data || res;
      if (inspection && inspection.id) {
        Alert.alert('Success', 'Inspection started successfully.');
        setStartInspectionModalOpen(false);
        if (onNavigate) {
          onNavigate('inspection', { inspectionId: inspection.id });
        }
      } else {
        throw new Error('Failed to retrieve started inspection details.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to start inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  const isPickerOptionSelected = (opt) => {
    const val = opt.value !== undefined ? opt.value : opt;
    if (activePicker === 'property') return (recordLeadOpen ? leadPropertyId : screenPropertyId) === val;
    if (activePicker === 'leaseProperty') return leasePropertyId === val;
    if (activePicker === 'unit') return (recordScreeningOpen ? screenUnitId : leaseUnitId) === val;
    if (activePicker === 'leaseUnit') return leaseUnitId === val;
    if (activePicker === 'tenant' || activePicker === 'leaseTenant') return leaseTenantId === val;
    if (activePicker === 'screeningApplicant') return screenTenantId === val;
    if (activePicker === 'paymentResp') return screenPaymentResponsibility === val;
    if (activePicker === 'package') return screenPackage === val;
    if (activePicker === 'stage') return leadStage === val;
    if (activePicker === 'renewalTerm') return Number(renewalTermMonths) === Number(val);
    return false;
  };

  const getPickerOptions = () => {
    switch (activePicker) {
      case 'property':
      case 'leaseProperty':
        return properties.map(p => ({
          value: p.id,
          label: `${p.name}${p.type ? ` (${p.type})` : ''}`,
        }));
      case 'unit': {
        const currentPropId = recordScreeningOpen ? screenPropertyId : leasePropertyId;
        const filteredUnits = currentPropId
          ? units.filter(u => u.propertyId === currentPropId || u.property_id === currentPropId || u.property?.id === currentPropId)
          : units;
        return filteredUnits.map(u => ({
          value: u.id,
          label: `Unit ${u.unitNumber || u.name || u.id} (${u.property?.name || properties.find(p => p.id === (u.propertyId || u.property_id))?.name || 'Property'})`
        }));
      }
      case 'leaseUnit': {
        const propUnits = leasePropertyId
          ? units.filter(u => u.propertyId === leasePropertyId || u.property_id === leasePropertyId || u.property?.id === leasePropertyId)
          : units;
        return propUnits.map(u => {
          const isOccupied = u.status?.toLowerCase() === 'occupied' || Boolean(u.isOccupied);
          const statusText = u.status || (isOccupied ? 'Occupied' : 'Vacant');
          const bedBath = (u.bedrooms || u.bathrooms) ? ` (${u.bedrooms || 0}B / ${u.bathrooms || 0}Ba)` : '';
          const occupiedWarning = isOccupied ? ' - Already occupied cannot create lease again' : '';
          return {
            value: u.id,
            disabled: isOccupied,
            isOccupied,
            rent: u.rentAmount ?? u.rent ?? u.monthlyRent,
            deposit: u.securityDeposit ?? u.deposit ?? (u.rentAmount ?? u.rent ?? u.monthlyRent),
            label: `Unit ${u.unitNumber || u.name || u.id} - ${statusText}${bedBath}${occupiedWarning}`,
          };
        });
      }
      case 'tenant':
        return tenants.map(t => ({
          value: t.id,
          label: t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim() || `Tenant #${t.id}`
        }));
      case 'leaseTenant':
        return tenants.map(t => {
          const isApproved = Boolean(
            t.screeningReports?.some((r) => r.status === 'Completed' || r.status === 'Approved') ||
            t.screeningStatus === 'Approved' ||
            t.screeningStatus === 'Completed'
          );
          const fullName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.name || `Tenant #${t.id}`;
          const email = t.email ? ` (${t.email})` : ' (No email)';
          const approvedTag = isApproved ? ' - Screening Approved' : '';
          return {
            value: t.id,
            isApproved,
            label: `${fullName}${email}${approvedTag}`,
          };
        });
      case 'screeningApplicant': {
        const list = tenants.map(t => ({
          value: t.id,
          label: `${t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim() || `Applicant #${t.id}`} (${t.email || 'Resident'})`.trim(),
        }));
        list.unshift({ value: 'custom_walkin', label: '+ Enter Custom Walk-in Applicant' });
        return list;
      }
      case 'paymentResp':
        return [
          { value: 'Applicant', label: 'Applicant Pays ($29.99)' },
          { value: 'Manager', label: 'Property Manager Pays (Waived)' },
        ];
      case 'renewalTerm':
        return [
          { value: 3, label: '3 Months Extension' },
          { value: 6, label: '6 Months Extension' },
          { value: 9, label: '9 Months Extension' },
          { value: 12, label: '12 Months Extension' },
        ];
      case 'stage':
        return ['NEW', 'CONTACTED', 'TOUR SCHEDULED', 'APPLICATION SUBMITTED', 'LEASE SIGNED'].map(s => ({ value: s, label: s }));
      case 'package':
        return [
          { value: 'Basic', label: 'Basic Check' },
          { value: 'Premium', label: 'Comprehensive Check' },
        ];
      default:
        return [];
    }
  };

  const handleSelectPickerOption = (val) => {
    if (activePicker === 'property') {
      if (recordLeadOpen) setLeadPropertyId(val);
      if (recordScreeningOpen) {
        setScreenPropertyId(val);
        setScreenUnitId('');
      }
    }
    if (activePicker === 'leaseProperty') {
      setLeasePropertyId(val);
      setLeaseUnitId('');
    }
    if (activePicker === 'unit') {
      if (recordScreeningOpen) setScreenUnitId(val);
      if (recordLeaseOpen) setLeaseUnitId(val);
    }
    if (activePicker === 'leaseUnit') {
      const chosenUnit = units.find(u => u.id === val);
      if (chosenUnit?.status?.toLowerCase() === 'occupied' || chosenUnit?.isOccupied) {
        setLeaseErrors({ unitId: 'Already occupied cannot create lease again' });
        Alert.alert('Unit Occupied', 'Already occupied cannot create lease again');
        return;
      }
      setLeaseUnitId(val);
      setLeaseErrors(prev => ({ ...prev, unitId: undefined }));
      const rent = chosenUnit?.rentAmount ?? chosenUnit?.rent ?? chosenUnit?.monthlyRent;
      const deposit = chosenUnit?.securityDeposit ?? chosenUnit?.deposit ?? rent;
      if (rent !== undefined && rent !== null && rent !== '') setLeaseMonthlyRent(String(rent));
      if (deposit !== undefined && deposit !== null && deposit !== '') setLeaseDepositAmount(String(deposit));
      if (chosenUnit?.propertyId) setLeasePropertyId(chosenUnit.propertyId);
    }
    if (activePicker === 'tenant' || activePicker === 'leaseTenant') {
      setLeaseTenantId(val);
    }
    if (activePicker === 'screeningApplicant') {
      if (val === 'custom_walkin') {
        setScreenTenantId('');
        setScreenName('Walk-in Applicant');
        setScreenEmail('');
        setScreenPhone('');
      } else {
        const t = tenants.find(item => item.id === val);
        if (t) {
          setScreenTenantId(t.id);
          setScreenName(t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Resident');
          setScreenEmail(t.email || '');
          setScreenPhone(t.phone || '');
          if (t.unit?.property?.id) setScreenPropertyId(t.unit.property.id);
          else if (t.propertyId) setScreenPropertyId(t.propertyId);
          if (t.unit?.id) setScreenUnitId(t.unit.id);
          else if (t.unitId) setScreenUnitId(t.unitId);
        }
      }
    }
    if (activePicker === 'paymentResp') {
      setScreenPaymentResponsibility(val);
    }
    if (activePicker === 'renewalTerm') {
      setRenewalTermMonths(val);
    }
    if (activePicker === 'stage') setLeadStage(val);
    if (activePicker === 'package') setScreenPackage(val);
    setActivePicker(null);
  };

  const renderInlinePicker = (pickerType) => {
    if (activePicker !== pickerType) return null;
    const options = getPickerOptions();
    return (
      <View style={styles.inlinePickerContainer}>
        {options.length === 0 ? (
          <View style={styles.inlinePickerEmpty}>
            <Text style={styles.inlinePickerEmptyText} allowFontScaling={false}>
              No options available
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ maxHeight: 200 }}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {options.map((opt, idx) => {
              const isSelected = isPickerOptionSelected(opt);
              const isDisabled = Boolean(opt.disabled);
              return (
                <TouchableOpacity
                  key={idx}
                  disabled={isDisabled}
                  style={[
                    styles.inlinePickerOptionRow,
                    isSelected && { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : 'rgba(14, 165, 233, 0.12)' },
                    isDisabled && { opacity: 0.6, backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)' },
                  ]}
                  onPress={() => {
                    if (isDisabled) {
                      Alert.alert('Unit Occupied', 'Already occupied cannot create lease again');
                      return;
                    }
                    handleSelectPickerOption(opt.value !== undefined ? opt.value : opt);
                  }}
                  activeOpacity={isDisabled ? 1 : 0.7}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={[
                        styles.inlinePickerOptionText,
                        isSelected && { color: '#38bdf8', fontWeight: '800' },
                        isDisabled && { color: isDarkMode ? '#94a3b8' : '#64748b' },
                      ]}
                      allowFontScaling={false}
                      numberOfLines={2}
                    >
                      {opt.label || opt.name || opt}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={17} color="#38bdf8" />}
                  {isDisabled && <Ionicons name="lock-closed" size={15} color="#ef4444" />}
                  {opt.isApproved && !isSelected && <Ionicons name="shield-checkmark" size={15} color="#10b981" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  };

  // Filter listings local
  const filteredLeads = leadsList.filter(item => {
    const text = `${item.name} ${item.email} ${item.propertyName} ${item.stage}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const filteredApps = applicationsList.filter(item => {
    const text = `${item.applicantName} ${item.propertyName} ${item.unitNumber} ${item.status}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const filteredScreening = screeningList.filter(item => {
    const text = `${item.applicantName} ${item.email} ${item.propertyName} ${item.unitNumber} ${item.screeningStatus}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const filteredLeases = leasesList.filter(item => {
    const text = `${item.tenantName} ${item.propertyName} ${item.unitNumber}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const filteredRenewals = renewalsList.filter(item => {
    const text = `${item.tenantName} ${item.propertyName} ${item.unitNumber} ${item.status}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const filteredMoveIns = moveInList.filter(item => {
    const text = `${item.tenantName} ${item.propertyName} ${item.unitNumber} ${item.workflowStatus}`.toLowerCase();
    const matchSearch = text.includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (!moveInFilter || moveInFilter === 'ALL') return true;
    const itemNorm = (item.workflowStatus || '').toUpperCase().replace(/[\s-]/g, '_');
    const filterNorm = moveInFilter.toUpperCase().replace(/[\s-]/g, '_');
    return itemNorm === filterNorm;
  });

  const filteredMoveOuts = moveOutList.filter(item => {
    const text = `${item.tenantName} ${item.propertyName} ${item.unitNumber} ${item.workflowStatus}`.toLowerCase();
    const matchSearch = text.includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (!moveOutFilter || moveOutFilter === 'ALL') return true;
    const itemNorm = (item.workflowStatus || '').toUpperCase().replace(/[\s-]/g, '_');
    const filterNorm = moveOutFilter.toUpperCase().replace(/[\s-]/g, '_');
    return itemNorm === filterNorm;
  });

  const filteredTemplates = templatesList.filter(item => {
    const text = `${item.name} ${item.createdBy}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  return (
    <View style={styles.mainWrapper}>
      {/* FIXED HEADER WITH SWITCHER - Fixed minHeight layout prevents content shifting */}
      <View style={[styles.fixedHeader, { paddingTop: 16 }]}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title} allowFontScaling={false}>
            {activeTab === 'leads' ? 'Leads Pipeline' : activeTab === 'applications' ? 'Background Applications' : activeTab === 'screening' ? 'Tenant Screening & Applications' : activeTab === 'leases' ? 'Lease Agreements' : activeTab === 'renewals' ? 'Lease Renewals Directory' : activeTab === 'movein' ? 'Move In Workflow Registry' : activeTab === 'moveout' ? 'Move Out Workflow Registry' : 'Inspection Templates'}
          </Text>
          <Text style={styles.subtitle} allowFontScaling={false} numberOfLines={2}>
            {activeTab === 'leads'
              ? 'Verify visitors pipeline interest, schedule viewing tours, and track conversions.'
              : activeTab === 'applications'
                ? 'Oversee applicant credit evaluations, income streams, and screening logs.'
                : activeTab === 'screening'
                  ? 'Verify background checks, TransUnion credit recommendations, and eviction registries.'
                  : activeTab === 'leases'
                    ? 'Verify active tenancies, renewal windows, and security deposits logs.'
                    : activeTab === 'renewals'
                      ? 'Verify upcoming expirations, dispatch proposal rates, and track acceptances.'
                      : activeTab === 'movein'
                        ? 'Monitor upcoming tenant move-in schedules, checklist templates, and condition review signoffs.'
                        : activeTab === 'moveout'
                          ? 'Monitor upcoming tenant move-out schedules, inspect damages, and signoff final security deposit refunds.'
                          : 'Manage reusable structural checklists for move-ins, move-outs, and periodic inspections.'}
          </Text>
        </View>

        {/* Tab switcher row in horizontal scrollview to handle 8 tabs smoothly */}
        <View style={{ marginTop: 10 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 10 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            <TouchableOpacity style={[styles.tabItem, activeTab === 'leads' && styles.tabItemActive]} onPress={() => setActiveTab('leads')}>
              <Text style={[styles.tabItemText, activeTab === 'leads' && styles.tabItemTextActive]} allowFontScaling={false}>Leads</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabItem, activeTab === 'applications' && styles.tabItemActive]} onPress={() => setActiveTab('applications')}>
              <Text style={[styles.tabItemText, activeTab === 'applications' && styles.tabItemTextActive]} allowFontScaling={false}>Applications</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabItem, activeTab === 'screening' && styles.tabItemActive]} onPress={() => setActiveTab('screening')}>
              <Text style={[styles.tabItemText, activeTab === 'screening' && styles.tabItemTextActive]} allowFontScaling={false}>Tenant Screening</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabItem, activeTab === 'leases' && styles.tabItemActive]} onPress={() => setActiveTab('leases')}>
              <Text style={[styles.tabItemText, activeTab === 'leases' && styles.tabItemTextActive]} allowFontScaling={false}>Leases</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabItem, activeTab === 'renewals' && styles.tabItemActive]} onPress={() => setActiveTab('renewals')}>
              <Text style={[styles.tabItemText, activeTab === 'renewals' && styles.tabItemTextActive]} allowFontScaling={false}>Renewals</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabItem, activeTab === 'movein' && styles.tabItemActive]} onPress={() => setActiveTab('movein')}>
              <Text style={[styles.tabItemText, activeTab === 'movein' && styles.tabItemTextActive]} allowFontScaling={false}>Move In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabItem, activeTab === 'moveout' && styles.tabItemActive]} onPress={() => setActiveTab('moveout')}>
              <Text style={[styles.tabItemText, activeTab === 'moveout' && styles.tabItemTextActive]} allowFontScaling={false}>Move Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabItem, activeTab === 'templates' && styles.tabItemActive]} onPress={() => setActiveTab('templates')}>
              <Text style={[styles.tabItemText, activeTab === 'templates' && styles.tabItemTextActive]} allowFontScaling={false}>Templates</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Search controls */}
        <View style={[styles.searchBarRow, { marginTop: 12 }]}>
          <View style={[styles.searchContainer, { marginRight: 0 }]}>
            <Ionicons name="search-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search details..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Web-aligned Dedicated Action Button */}
        {activeTab === 'leads' && (
          <TouchableOpacity style={styles.dedicatedAddBtn} onPress={() => { fetchOptions(); setRecordLeadOpen(true); }}>
            <Ionicons name="add" size={18} color="#0f172a" />
            <Text style={styles.dedicatedAddBtnText} allowFontScaling={false}>Add Lead</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'screening' && (
          <TouchableOpacity style={styles.dedicatedAddBtn} onPress={() => { fetchOptions(); setRecordScreeningOpen(true); }}>
            <Ionicons name="add" size={18} color="#0f172a" />
            <Text style={styles.dedicatedAddBtnText} allowFontScaling={false}>Request Tenant Screening Check</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'leases' && (
          <TouchableOpacity style={styles.dedicatedAddBtn} onPress={() => openCreateLeaseModal()}>
            <Ionicons name="add" size={18} color="#0f172a" />
            <Text style={styles.dedicatedAddBtnText} allowFontScaling={false}>Create Lease Wizard</Text>
          </TouchableOpacity>
        )}

        {/* Move In / Move Out Web Action: Refresh Registry */}
        {(activeTab === 'movein' || activeTab === 'moveout') && (
          <TouchableOpacity
            style={[styles.dedicatedAddBtn, { backgroundColor: '#0284c7' }]}
            onPress={() => handleRefresh()}
          >
            <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={[styles.dedicatedAddBtnText, { color: '#ffffff' }]} allowFontScaling={false}>
              Refresh Registry
            </Text>
          </TouchableOpacity>
        )}

        {activeTab === 'templates' && (
          <TouchableOpacity style={styles.dedicatedAddBtn} onPress={() => setRecordTemplateOpen(true)}>
            <Ionicons name="add" size={18} color="#0f172a" />
            <Text style={styles.dedicatedAddBtnText} allowFontScaling={false}>Create Template</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 12 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
      >
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText} allowFontScaling={false}>Processing leads registry...</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            {/* 1. CRM LEADS LIST */}
            {activeTab === 'leads' && (
              <View>
                {filteredLeads.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Text style={styles.emptyText} allowFontScaling={false}>No pipeline leads found</Text>
                  </View>
                ) : (
                  filteredLeads.map((item) => (
                    <View key={item.id} style={styles.recordsCard}>
                      <View style={styles.rowBetween}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={styles.recordLabel} allowFontScaling={false}>{item.name}</Text>
                          <Text style={styles.recordSubText} allowFontScaling={false}>{item.propertyName}</Text>
                        </View>
                        <View style={[styles.badge, { borderColor: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                          <Text style={[styles.badgeText, { color: '#a855f7' }]} allowFontScaling={false}>{item.stage}</Text>
                        </View>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.rowBetween}>
                        <Text style={styles.recordSubText} allowFontScaling={false}>Email Contact</Text>
                        <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.email}</Text>
                      </View>
                      <View style={styles.rowBetween}>
                        <Text style={styles.recordSubText} allowFontScaling={false}>Phone Number</Text>
                        <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.phone}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* 2. BACKGROUND APPLICATIONS LIST */}
            {activeTab === 'applications' && (
              <View>
                {filteredApps.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Text style={styles.emptyText} allowFontScaling={false}>No background applications found</Text>
                  </View>
                ) : (
                  filteredApps.map((item) => {
                    const statusColor = item.status === 'Approved' ? '#10b981' : item.status === 'Declined' ? '#ef4444' : '#f59e0b';
                    return (
                      <View key={item.id} style={styles.recordsCard}>
                        <View style={styles.rowBetween}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.recordLabel} allowFontScaling={false}>{item.applicantName}</Text>
                            <Text style={styles.recordSubText} allowFontScaling={false}>{item.propertyName} · {item.unitNumber}</Text>
                          </View>
                          <View style={[styles.badge, { borderColor: statusColor, backgroundColor: `${statusColor}12` }]}>
                            <Text style={[styles.badgeText, { color: statusColor }]} allowFontScaling={false}>{item.status}</Text>
                          </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.rowBetween}>
                          <Text style={styles.recordSubText} allowFontScaling={false}>Submission Date</Text>
                          <Text style={styles.recordSubTextVal} allowFontScaling={false}>
                            {item.submissionDate ? (item.submissionDate.includes('T') ? item.submissionDate.split('T')[0] : item.submissionDate) : 'N/A'}
                          </Text>
                        </View>
                        <View style={styles.rowBetween}>
                          <Text style={styles.recordSubText} allowFontScaling={false}>Credit Score Index</Text>
                          <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.creditScore}</Text>
                        </View>
                        <View style={styles.rowBetween}>
                          <Text style={styles.recordSubText} allowFontScaling={false}>Proposed Rent</Text>
                          <Text style={[styles.recordValue, { color: '#38bdf8' }]} allowFontScaling={false}>
                            ${Number(item.proposedRent).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* 3. TENANT SCREENING LIST */}
            {activeTab === 'screening' && (
              <View>
                {filteredScreening.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Text style={styles.emptyText} allowFontScaling={false}>No background checks registered</Text>
                  </View>
                ) : (
                  filteredScreening.map((item) => {
                    const statusColor = item.screeningStatus === 'Approved' ? '#10b981' : item.screeningStatus === 'Declined' ? '#ef4444' : '#f59e0b';
                    return (
                      <TouchableOpacity key={item.id} style={styles.recordsCard} onPress={() => handleSelectScreening(item)}>
                        <View style={styles.rowBetween}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.recordLabel} allowFontScaling={false}>{item.applicantName}</Text>
                            <Text style={styles.recordSubText} allowFontScaling={false}>{item.propertyName} · {item.unitNumber}</Text>
                          </View>
                          <View style={[styles.badge, { borderColor: statusColor, backgroundColor: `${statusColor}12` }]}>
                            <Text style={[styles.badgeText, { color: statusColor }]} allowFontScaling={false}>{item.screeningStatus}</Text>
                          </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.rowBetween}>
                          <Text style={styles.recordSubText} allowFontScaling={false}>Email ID</Text>
                          <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.email}</Text>
                        </View>
                        <View style={styles.rowBetween}>
                          <Text style={styles.recordSubText} allowFontScaling={false}>Screening Package</Text>
                          <Text style={[styles.recordSubTextVal, { color: '#38bdf8' }]} allowFontScaling={false}>{item.screeningPackage}</Text>
                        </View>

                        {/* Quick Action Buttons matching Web */}
                        {item.screeningStatus === 'Processing' && (
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              borderWidth: 1,
                              borderColor: 'rgba(16, 185, 129, 0.3)',
                              borderRadius: 8,
                              paddingVertical: 8,
                              marginTop: 10,
                            }}
                            onPress={() => handleUpdateScreeningStatus(item.id, 'Completed')}
                          >
                            <Ionicons name="play" size={13} color="#10b981" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 11.5 }} allowFontScaling={false}>Run Check & Generate Report</Text>
                          </TouchableOpacity>
                        )}

                        {item.screeningStatus === 'Completed' && (
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                            <TouchableOpacity
                              style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                borderWidth: 1,
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                                borderRadius: 8,
                                paddingVertical: 8,
                              }}
                              onPress={() => handleUpdateScreeningStatus(item.id, 'Declined')}
                            >
                              <Ionicons name="close-circle-outline" size={13} color="#ef4444" style={{ marginRight: 4 }} />
                              <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 11.5 }} allowFontScaling={false}>Decline</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#10b981',
                                borderRadius: 8,
                                paddingVertical: 8,
                              }}
                              onPress={() => handleUpdateScreeningStatus(item.id, 'Approved')}
                            >
                              <Ionicons name="checkmark-circle-outline" size={13} color="#ffffff" style={{ marginRight: 4 }} />
                              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 11.5 }} allowFontScaling={false}>Approve</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* 4. LEASE AGREEMENTS LIST */}
            {activeTab === 'leases' && (
              <View>
                {filteredLeases.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Text style={styles.emptyText} allowFontScaling={false}>No active lease covenants found</Text>
                  </View>
                ) : (
                  filteredLeases.map((item) => (
                    <View key={item.id} style={styles.recordsCard}>
                      <View style={styles.rowBetween}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={styles.recordLabel} allowFontScaling={false}>{item.tenantName}</Text>
                          <Text style={styles.recordSubText} allowFontScaling={false}>{item.propertyName} · Unit {item.unitNumber}</Text>
                        </View>
                        <View style={[styles.badge, { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                          <Text style={[styles.badgeText, { color: '#10b981' }]} allowFontScaling={false}>Active</Text>
                        </View>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.rowBetween}>
                        <Text style={styles.recordSubText} allowFontScaling={false}>Lease Duration</Text>
                        <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.startDate} to {item.endDate}</Text>
                      </View>
                      <View style={styles.rowBetween}>
                        <Text style={styles.recordSubText} allowFontScaling={false}>Monthly Base Rent</Text>
                        <Text style={[styles.recordValue, { color: '#38bdf8' }]} allowFontScaling={false}>
                          ${Number(item.monthlyRent).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* 4.5 LEASE RENEWALS LIST */}
            {activeTab === 'renewals' && (
              <View>
                {filteredRenewals.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Text style={styles.emptyText} allowFontScaling={false}>No upcoming renewals requiring attention</Text>
                  </View>
                ) : (
                  filteredRenewals.map((item) => {
                    const isAccepted = item.status === 'ACCEPTED';
                    const isRejected = item.status === 'REJECTED';
                    const isOfferSent = item.status === 'OFFER_SENT';
                    const statusColor = isAccepted ? '#10b981' : isRejected ? '#ef4444' : isOfferSent ? '#38bdf8' : '#f59e0b';
                    const statusLabel = isAccepted ? 'Accepted' : isRejected ? 'Declined' : isOfferSent ? 'Offer Sent' : 'Pending Offer';
                    const isActionLoading = renewalActionLoadingId === item.id;

                    return (
                      <View key={item.id} style={styles.recordsCard}>
                        <View style={styles.rowBetween}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.recordLabel} allowFontScaling={false}>{item.tenantName}</Text>
                            <Text style={styles.recordSubText} allowFontScaling={false}>{item.propertyName} · {item.unitNumber}</Text>
                          </View>
                          <View style={[styles.badge, { borderColor: statusColor, backgroundColor: `${statusColor}18` }]}>
                            <Text style={[styles.badgeText, { color: statusColor }]} allowFontScaling={false}>{statusLabel}</Text>
                          </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.rowBetween}>
                          <Text style={styles.recordSubText} allowFontScaling={false}>Current Lease End</Text>
                          <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.expirationDate || 'N/A'}</Text>
                        </View>
                        <View style={styles.rowBetween}>
                          <Text style={styles.recordSubText} allowFontScaling={false}>Current Rent</Text>
                          <Text style={styles.recordSubTextVal} allowFontScaling={false}>${Number(item.currentRent).toLocaleString()}/mo</Text>
                        </View>
                        <View style={styles.rowBetween}>
                          <Text style={styles.recordSubText} allowFontScaling={false}>Proposed Rent</Text>
                          <Text style={[styles.recordValue, { color: '#10b981' }]} allowFontScaling={false}>
                            ${Number(item.newRent).toLocaleString()}/mo ({item.termMonths || 12} Mos)
                          </Text>
                        </View>

                        {/* Renewal Action Buttons matching Web */}
                        <View style={[styles.actionRowContainer, { marginTop: 12, flexWrap: 'wrap', gap: 6 }]}>
                          <TouchableOpacity
                            style={[styles.smallActionBtn, { backgroundColor: 'rgba(100, 116, 139, 0.18)', flex: 1, minWidth: 70 }]}
                            onPress={() => {
                              fetchOptions();
                              setEditingRenewal(item);
                              setRenewalNewRent(String(item.newRent));
                              setRenewalTermMonths(item.termMonths || 12);
                              setEditRenewalModalOpen(true);
                            }}
                          >
                            <Ionicons name="create-outline" size={13} color="#cbd5e1" style={{ marginRight: 4 }} />
                            <Text style={[styles.smallActionText, { color: '#cbd5e1' }]} allowFontScaling={false}>Edit</Text>
                          </TouchableOpacity>

                          {/* When PENDING (Pending Offer): Only Send Offer + Edit */}
                          {item.status === 'PENDING' && (
                            <TouchableOpacity
                              style={[styles.smallActionBtn, { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 1, borderColor: '#38bdf8', flex: 1.5, minWidth: 105 }]}
                              onPress={() => handleSendRenewalOffer(item)}
                              disabled={isActionLoading}
                            >
                              {isActionLoading ? (
                                <ActivityIndicator size="small" color="#38bdf8" />
                              ) : (
                                <>
                                  <Ionicons name="mail-outline" size={13} color="#38bdf8" style={{ marginRight: 4 }} />
                                  <Text style={[styles.smallActionText, { color: '#38bdf8' }]} allowFontScaling={false}>Send Offer</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          )}

                          {/* When OFFER_SENT (Sent): Accept & Reject + Edit */}
                          {isOfferSent && (
                            <>
                              <TouchableOpacity
                                style={[styles.smallActionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderWidth: 1, borderColor: '#10b981', flex: 1.1, minWidth: 75 }]}
                                onPress={() => handleAcceptRenewal(item)}
                                disabled={isActionLoading}
                              >
                                <Ionicons name="checkmark" size={13} color="#10b981" style={{ marginRight: 4 }} />
                                <Text style={[styles.smallActionText, { color: '#10b981' }]} allowFontScaling={false}>Accept</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.smallActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.18)', borderWidth: 1, borderColor: '#ef4444', flex: 1.1, minWidth: 75 }]}
                                onPress={() => handleRejectRenewal(item)}
                                disabled={isActionLoading}
                              >
                                <Ionicons name="close" size={13} color="#ef4444" style={{ marginRight: 4 }} />
                                <Text style={[styles.smallActionText, { color: '#ef4444' }]} allowFontScaling={false}>Reject</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* 5. MOVE IN WORKFLOW REGISTRY */}
            {activeTab === 'movein' && (
              <View>
                {/* Status Filter Tabs matching Web */}
                <View style={{ marginBottom: 12 }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterPillsContainer}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                  >
                    {moveInStatusFilters.map((filter) => {
                      const isActive = moveInFilter === filter.value;
                      return (
                        <TouchableOpacity
                          key={filter.value}
                          style={[styles.filterPill, isActive && styles.filterPillActive]}
                          onPress={() => setMoveInFilter(filter.value)}
                        >
                          <Text
                            style={[styles.filterPillText, isActive && styles.filterPillTextActive]}
                            allowFontScaling={false}
                          >
                            {filter.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {filteredMoveIns.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Ionicons name="clipboard-outline" size={36} color="#64748b" style={{ marginBottom: 10 }} />
                    <Text style={[styles.emptyText, { fontWeight: '800', color: '#f8fafc', fontSize: 15 }]} allowFontScaling={false}>
                      No Moves Found
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 6, textAlign: 'center', lineHeight: 18, maxWidth: 300 }} allowFontScaling={false}>
                      Create a lease agreement to schedule and generate a move-in checklist record automatically.
                    </Text>
                  </View>
                ) : (
                  filteredMoveIns.map((item) => {
                    const normStatus = (item.workflowStatus || '').toUpperCase().replace(/[\s-]/g, '_');
                    const isScheduled = normStatus === 'SCHEDULED';
                    const isCompleted = normStatus === 'COMPLETED';
                    const isProgress = normStatus === 'INSPECTION_IN_PROGRESS';
                    const isCancelled = normStatus === 'CANCELLED';

                    const statusColor = isCompleted ? '#10b981' : isProgress ? '#a855f7' : isCancelled ? '#ef4444' : '#64748b';
                    const inspectionId = item.inspectionId || item.inspection?.id;
                    const isSkipping = skipActionLoadingId === item.id;

                    return (
                      <View key={item.id} style={styles.recordsCard}>
                        <View style={styles.rowBetween}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={[styles.recordLabel, { color: '#38bdf8' }]} allowFontScaling={false}>{item.tenantName}</Text>
                            <Text style={styles.recordSubText} allowFontScaling={false}>{item.propertyName} · Unit {item.unitNumber}</Text>
                          </View>
                          <View style={[styles.badge, { borderColor: statusColor, backgroundColor: `${statusColor}18` }]}>
                            <Text style={[styles.badgeText, { color: statusColor }]} allowFontScaling={false}>
                              {item.workflowStatus?.toUpperCase() || 'SCHEDULED'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.rowBetween}>
                          <Text style={styles.recordSubText} allowFontScaling={false}>Scheduled Date</Text>
                          <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.scheduledDate}</Text>
                        </View>

                        <View style={[styles.actionRowContainer, { marginTop: 12, gap: 8, justifyContent: 'flex-end' }]}>
                          {/* Skip Inspection Action matching Web: Only for SCHEDULED */}
                          {isScheduled && (
                            <TouchableOpacity
                              style={[styles.smallActionBtn, { borderColor: '#10b981', borderWidth: 1, backgroundColor: 'rgba(16, 185, 129, 0.08)', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                              onPress={() => handleSkipMoveIn(item)}
                              disabled={isSkipping}
                            >
                              {isSkipping ? (
                                <ActivityIndicator size="small" color="#10b981" />
                              ) : (
                                <>
                                  <Ionicons name="checkmark-circle-outline" size={15} color="#10b981" style={{ marginRight: 4 }} />
                                  <Text style={[styles.smallActionText, { color: '#10b981', fontWeight: '800' }]} allowFontScaling={false}>
                                    Skip Inspection
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          )}

                          {/* View Workflow Action: Always present on every row matching Web */}
                          <TouchableOpacity
                            style={[styles.smallActionBtn, { backgroundColor: 'rgba(56, 189, 248, 0.12)', flex: isScheduled ? 1 : undefined, minWidth: 125, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                            onPress={() => {
                              if (inspectionId) {
                                onNavigate && onNavigate('inspection', { inspectionId });
                              } else if (isCompleted) {
                                Alert.alert('Move In Workflow', `Tenant: ${item.tenantName}\nProperty: ${item.propertyName} · Unit ${item.unitNumber}\nStatus: Completed\nMove-in has been finalized.`);
                              } else {
                                setSelectedMoveInOrOut({ type: 'movein', id: item.id });
                                setStartInspectionTemplateId('');
                                setStartInspectionModalOpen(true);
                              }
                            }}
                          >
                            <Ionicons name="eye-outline" size={15} color="#38bdf8" style={{ marginRight: 4 }} />
                            <Text style={[styles.smallActionText, { color: '#38bdf8', fontWeight: '800' }]} allowFontScaling={false}>
                              View Workflow
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* 6. MOVE OUT WORKFLOW REGISTRY */}
            {activeTab === 'moveout' && (
              <View>
                {/* Status Filter Tabs matching Web */}
                <View style={{ marginBottom: 12 }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterPillsContainer}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                  >
                    {moveOutStatusFilters.map((filter) => {
                      const isActive = moveOutFilter === filter.value;
                      return (
                        <TouchableOpacity
                          key={filter.value}
                          style={[styles.filterPill, isActive && styles.filterPillActive]}
                          onPress={() => setMoveOutFilter(filter.value)}
                        >
                          <Text
                            style={[styles.filterPillText, isActive && styles.filterPillTextActive]}
                            allowFontScaling={false}
                          >
                            {filter.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {filteredMoveOuts.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Ionicons name="clipboard-outline" size={36} color="#64748b" style={{ marginBottom: 10 }} />
                    <Text style={[styles.emptyText, { fontWeight: '800', color: '#f8fafc', fontSize: 15 }]} allowFontScaling={false}>
                      No Move Outs Found
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 6, textAlign: 'center', lineHeight: 18, maxWidth: 300 }} allowFontScaling={false}>
                      Create a move-out record from the active leases page to schedule a checklist.
                    </Text>
                  </View>
                ) : (
                  filteredMoveOuts.map((item) => {
                    const normStatus = (item.workflowStatus || '').toUpperCase().replace(/[\s-]/g, '_');
                    const isScheduled = normStatus === 'SCHEDULED';
                    const isCompleted = normStatus === 'COMPLETED';
                    const isProgress = normStatus === 'INSPECTION_IN_PROGRESS';
                    const isCancelled = normStatus === 'CANCELLED';

                    const statusColor = isCompleted ? '#10b981' : isProgress ? '#a855f7' : isCancelled ? '#ef4444' : '#64748b';
                    const inspectionId = item.inspectionId || item.inspection?.id;
                    const isSkipping = skipActionLoadingId === item.id;

                    return (
                      <View key={item.id} style={styles.recordsCard}>
                        <View style={styles.rowBetween}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={[styles.recordLabel, { color: '#38bdf8' }]} allowFontScaling={false}>{item.tenantName}</Text>
                            <Text style={styles.recordSubText} allowFontScaling={false}>{item.propertyName} · Unit {item.unitNumber}</Text>
                          </View>
                          <View style={[styles.badge, { borderColor: statusColor, backgroundColor: `${statusColor}18` }]}>
                            <Text style={[styles.badgeText, { color: statusColor }]} allowFontScaling={false}>
                              {item.workflowStatus?.toUpperCase() || 'SCHEDULED'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.rowBetween}>
                          <Text style={styles.recordSubText} allowFontScaling={false}>Scheduled Date</Text>
                          <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.scheduledDate}</Text>
                        </View>

                        <View style={[styles.actionRowContainer, { marginTop: 12, gap: 8, justifyContent: 'flex-end' }]}>
                          {/* Skip Inspection Action matching Web: Only for SCHEDULED */}
                          {isScheduled && (
                            <TouchableOpacity
                              style={[styles.smallActionBtn, { borderColor: '#10b981', borderWidth: 1, backgroundColor: 'rgba(16, 185, 129, 0.08)', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                              onPress={() => handleSkipMoveOut(item)}
                              disabled={isSkipping}
                            >
                              {isSkipping ? (
                                <ActivityIndicator size="small" color="#10b981" />
                              ) : (
                                <>
                                  <Ionicons name="checkmark-circle-outline" size={15} color="#10b981" style={{ marginRight: 4 }} />
                                  <Text style={[styles.smallActionText, { color: '#10b981', fontWeight: '800' }]} allowFontScaling={false}>
                                    Skip Inspection
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          )}

                          {/* View Workflow Action: Always present on every row matching Web */}
                          <TouchableOpacity
                            style={[styles.smallActionBtn, { backgroundColor: 'rgba(56, 189, 248, 0.12)', flex: isScheduled ? 1 : undefined, minWidth: 125, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                            onPress={() => {
                              if (inspectionId) {
                                onNavigate && onNavigate('inspection', { inspectionId });
                              } else if (isCompleted) {
                                Alert.alert('Move Out Workflow', `Tenant: ${item.tenantName}\nProperty: ${item.propertyName} · Unit ${item.unitNumber}\nStatus: Completed\nMove-out and deposit signoff finalized.`);
                              } else {
                                setSelectedMoveInOrOut({ type: 'moveout', id: item.id });
                                setStartInspectionTemplateId('');
                                setStartInspectionModalOpen(true);
                              }
                            }}
                          >
                            <Ionicons name="eye-outline" size={15} color="#38bdf8" style={{ marginRight: 4 }} />
                            <Text style={[styles.smallActionText, { color: '#38bdf8', fontWeight: '800' }]} allowFontScaling={false}>
                              View Workflow
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* 7. INSPECTION TEMPLATES LIST */}
            {activeTab === 'templates' && (
              <View>
                {filteredTemplates.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Text style={styles.emptyText} allowFontScaling={false}>No inspection templates registered</Text>
                  </View>
                ) : (
                  <View style={styles.templatesFlexContainer}>
                    {filteredTemplates.map((item) => (
                      <View key={item.id} style={styles.templateGridCard}>
                        <View style={styles.rowBetween}>
                          <View style={[styles.badge, { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                            <Text style={[styles.badgeText, { color: '#38bdf8' }]} allowFontScaling={false}>INSPECTION ASSIGN</Text>
                          </View>
                          <Ionicons name="checkbox-outline" size={16} color="#10b981" />
                        </View>

                        <Text style={styles.tmplTitle} allowFontScaling={false}>{item.name}</Text>
                        <Text style={styles.tmplDesc} allowFontScaling={false}>No description provided.</Text>

                        <View style={styles.divider} />

                        <View style={styles.rowBetween}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="layers-outline" size={12} color="#cbd5e1" style={{ marginRight: 4 }} />
                            <Text style={styles.tmplMetaText} allowFontScaling={false}>{item.roomsCount} Rooms</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.tmplMetaLabel} allowFontScaling={false}>Created By:</Text>
                            <Text style={styles.tmplMetaText} allowFontScaling={false}>{item.createdBy}</Text>
                          </View>
                        </View>

                        <View style={styles.tmplActionRow}>
                          <TouchableOpacity style={styles.tmplActionBtn} onPress={() => Alert.alert('Edit Template', 'Loading inspection designer details...')}>
                            <Ionicons name="create-outline" size={13} color="#cbd5e1" style={{ marginRight: 4 }} />
                            <Text style={styles.tmplActionBtnText} allowFontScaling={false}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.tmplActionBtn} onPress={() => handleDuplicateTemplate(item.id)}>
                            <Ionicons name="copy-outline" size={13} color="#cbd5e1" style={{ marginRight: 4 }} />
                            <Text style={styles.tmplActionBtnText} allowFontScaling={false}>Duplicate</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

          </Animated.View>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* --- 1. RECORD CRM LEAD MODAL --- */}
      <Modal visible={recordLeadOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Add Prospect Lead</Text>
                <TouchableOpacity onPress={() => setRecordLeadOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                 <Text style={styles.formLabel} allowFontScaling={false}>PROSPECT NAME</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="E.g. John Doe"
                  placeholderTextColor="#64748b"
                  value={leadName}
                  onChangeText={setLeadName}
                />
                {leadErrors.name && <Text style={styles.errorLabel} allowFontScaling={false}>{leadErrors.name}</Text>}

                <Text style={styles.formLabel} allowFontScaling={false}>EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="johndoe@example.com"
                  placeholderTextColor="#64748b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={leadEmail}
                  onChangeText={setLeadEmail}
                />
                {leadErrors.email && <Text style={styles.errorLabel} allowFontScaling={false}>{leadErrors.email}</Text>}

                <Text style={styles.formLabel} allowFontScaling={false}>PHONE NUMBER</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="555-0101"
                  placeholderTextColor="#64748b"
                  keyboardType="phone-pad"
                  value={leadPhone}
                  onChangeText={setLeadPhone}
                />
                {leadErrors.phone && <Text style={styles.errorLabel} allowFontScaling={false}>{leadErrors.phone}</Text>}

                <Text style={styles.formLabel} allowFontScaling={false}>INTERESTED PROPERTY</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => setActivePicker(activePicker === 'property' ? null : 'property')}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {leadPropertyId ? properties.find(p => p.id === leadPropertyId)?.name : 'Select Property...'}
                  </Text>
                  <Ionicons name={activePicker === 'property' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {renderInlinePicker('property')}

                <Text style={styles.formLabel} allowFontScaling={false}>PIPELINE STAGE</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => setActivePicker(activePicker === 'stage' ? null : 'stage')}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>{leadStage}</Text>
                  <Ionicons name={activePicker === 'stage' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {renderInlinePicker('stage')}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setActivePicker(null);
                    setRecordLeadOpen(false);
                  }}
                >
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleSaveLead} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>Add Lead</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- 2. REQUEST TENANT SCREENING CHECK MODAL (100% Web Aligned) --- */}
      <Modal visible={recordScreeningOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Request Tenant Screening Check</Text>
                <TouchableOpacity
                  onPress={() => {
                    setActivePicker(null);
                    setRecordScreeningOpen(false);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* 1. APPLICANT DETAILS */}
                <Text style={styles.sectionHeaderLabel} allowFontScaling={false}>APPLICANT DETAILS</Text>
                <View style={styles.sectionDivider} />

                <Text style={styles.formLabel} allowFontScaling={false}>SELECT APPLICANT / TENANT *</Text>
                <TouchableOpacity
                  style={[styles.formPickerSelector, { borderColor: screenTenantId ? '#38bdf8' : colors.inputBorder }]}
                  onPress={() => setActivePicker(activePicker === 'screeningApplicant' ? null : 'screeningApplicant')}
                >
                  <Text style={[styles.formPickerText, !screenTenantId && !screenName && { color: colors.textMuted }]} allowFontScaling={false} numberOfLines={1}>
                    {screenTenantId
                      ? (tenants.find(t => t.id === screenTenantId)?.name || `${tenants.find(t => t.id === screenTenantId)?.firstName || ''} ${tenants.find(t => t.id === screenTenantId)?.lastName || ''}`.trim())
                      : (screenName ? screenName : 'Choose Applicant...')}
                  </Text>
                  <Ionicons name={activePicker === 'screeningApplicant' ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
                </TouchableOpacity>
                {renderInlinePicker('screeningApplicant')}
                {scrErrors.applicantName && <Text style={styles.errorLabel} allowFontScaling={false}>{scrErrors.applicantName}</Text>}

                {/* 2. APPLIED PROPERTY LOCATION */}
                <Text style={[styles.sectionHeaderLabel, { marginTop: 14 }]} allowFontScaling={false}>APPLIED PROPERTY LOCATION</Text>
                <View style={styles.sectionDivider} />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel} allowFontScaling={false}>SELECT PROPERTY *</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => setActivePicker(activePicker === 'property' ? null : 'property')}
                    >
                      <Text style={[styles.formPickerText, !screenPropertyId && { color: colors.textMuted }]} allowFontScaling={false} numberOfLines={1}>
                        {screenPropertyId ? properties.find(p => p.id === screenPropertyId)?.name : 'Choose Property...'}
                      </Text>
                      <Ionicons name={activePicker === 'property' ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel} allowFontScaling={false}>SELECT UNIT *</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => setActivePicker(activePicker === 'unit' ? null : 'unit')}
                    >
                      <Text style={[styles.formPickerText, !screenUnitId && { color: colors.textMuted }]} allowFontScaling={false} numberOfLines={1}>
                        {screenUnitId ? `Unit ${units.find(u => u.id === screenUnitId)?.unitNumber || screenUnitId}` : 'Choose Unit...'}
                      </Text>
                      <Ionicons name={activePicker === 'unit' ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>
                {renderInlinePicker('property')}
                {renderInlinePicker('unit')}

                {/* 3. SCREENING PARAMETERS */}
                <Text style={[styles.sectionHeaderLabel, { marginTop: 14 }]} allowFontScaling={false}>SCREENING PARAMETERS</Text>
                <View style={styles.sectionDivider} />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel} allowFontScaling={false}>SCREENING PACKAGE *</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => setActivePicker(activePicker === 'package' ? null : 'package')}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false} numberOfLines={1}>
                        {screenPackage === 'Basic' ? 'Basic Check' : (screenPackage === 'Premium' ? 'Comprehensive Check' : screenPackage)}
                      </Text>
                      <Ionicons name={activePicker === 'package' ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel} allowFontScaling={false}>PAYMENT RESPONSIBILITY *</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => setActivePicker(activePicker === 'paymentResp' ? null : 'paymentResp')}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false} numberOfLines={1}>
                        {screenPaymentResponsibility === 'Applicant' ? 'Applicant Pays ($29.99)' : 'Property Manager Pays'}
                      </Text>
                      <Ionicons name={activePicker === 'paymentResp' ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>
                {renderInlinePicker('package')}
                {renderInlinePicker('paymentResp')}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setActivePicker(null);
                    setRecordScreeningOpen(false);
                  }}
                >
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.skipBtn, submitting && { opacity: 0.5 }]}
                  onPress={handleSkipScreening}
                  disabled={submitting}
                >
                  <Text style={styles.skipBtnText} allowFontScaling={false}>Skip Screening</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sendInviteBtn, submitting && { opacity: 0.5 }]}
                  onPress={handleRequestScreening}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.sendInviteBtnText} allowFontScaling={false}>Send Invitation</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- 3. CREATE LEASE MODAL --- */}
      <Modal visible={recordLeaseOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Create Lease Agreement</Text>
                <TouchableOpacity onPress={() => { setActivePicker(null); setRecordLeaseOpen(false); }}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.formLabel} allowFontScaling={false}>PROPERTY</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => setActivePicker(activePicker === 'leaseProperty' ? null : 'leaseProperty')}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {leasePropertyId ? (() => {
                      const p = properties.find(item => item.id === leasePropertyId);
                      return p ? `${p.name}${p.type ? ` (${p.type})` : ''}` : 'Select Property...';
                    })() : 'Select Property...'}
                  </Text>
                  <Ionicons name={activePicker === 'leaseProperty' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {renderInlinePicker('leaseProperty')}

                <Text style={styles.formLabel} allowFontScaling={false}>RENTABLE UNIT</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => setActivePicker(activePicker === 'leaseUnit' ? null : 'leaseUnit')}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {leaseUnitId ? (() => {
                      const u = units.find(item => item.id === leaseUnitId);
                      if (!u) return 'Select Unit...';
                      const isOccupied = u.status?.toLowerCase() === 'occupied' || Boolean(u.isOccupied);
                      const statusText = u.status || (isOccupied ? 'Occupied' : 'Vacant');
                      const bedBath = (u.bedrooms || u.bathrooms) ? ` (${u.bedrooms || 0}B / ${u.bathrooms || 0}Ba)` : '';
                      return `Unit ${u.unitNumber || u.name || u.id} - ${statusText}${bedBath}`;
                    })() : 'Select Unit...'}
                  </Text>
                  <Ionicons name={activePicker === 'leaseUnit' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {renderInlinePicker('leaseUnit')}
                {leaseErrors.unitId && <Text style={styles.errorLabel} allowFontScaling={false}>{leaseErrors.unitId}</Text>}

                <Text style={styles.formLabel} allowFontScaling={false}>RESIDENT / TENANT</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => setActivePicker(activePicker === 'leaseTenant' ? null : 'leaseTenant')}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {leaseTenantId ? (() => {
                      const t = tenants.find(item => item.id === leaseTenantId);
                      if (!t) return 'Select Tenant...';
                      const fullName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.name || `Tenant #${t.id}`;
                      const isApproved = Boolean(
                        t.screeningReports?.some((r) => r.status === 'Completed' || r.status === 'Approved') ||
                        t.screeningStatus === 'Approved' ||
                        t.screeningStatus === 'Completed'
                      );
                      const email = t.email ? ` (${t.email})` : ' (No email)';
                      const approvedTag = isApproved ? ' - Screening Approved' : '';
                      return `${fullName}${email}${approvedTag}`;
                    })() : 'Select Tenant...'}
                  </Text>
                  <Ionicons name={activePicker === 'leaseTenant' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {renderInlinePicker('leaseTenant')}
                {leaseErrors.tenantId && <Text style={styles.errorLabel} allowFontScaling={false}>{leaseErrors.tenantId}</Text>}

                <Text style={styles.formLabel} allowFontScaling={false}>START DATE</Text>
                <TouchableOpacity style={styles.formPickerSelector} onPress={() => setShowLeaseStartPicker(true)}>
                  <Text style={styles.formPickerText} allowFontScaling={false}>{leaseStartDate || 'Select Start Date...'}</Text>
                  <Ionicons name="calendar-outline" size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {leaseErrors.startDate && <Text style={styles.errorLabel} allowFontScaling={false}>{leaseErrors.startDate}</Text>}
                <CustomDatePicker
                  visible={showLeaseStartPicker}
                  value={leaseStartDate}
                  onSelect={(date) => setLeaseStartDate(date)}
                  onClose={() => setShowLeaseStartPicker(false)}
                />

                <Text style={styles.formLabel} allowFontScaling={false}>END DATE</Text>
                <TouchableOpacity style={styles.formPickerSelector} onPress={() => setShowLeaseEndPicker(true)}>
                  <Text style={styles.formPickerText} allowFontScaling={false}>{leaseEndDate || 'Select End Date...'}</Text>
                  <Ionicons name="calendar-outline" size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {leaseErrors.endDate && <Text style={styles.errorLabel} allowFontScaling={false}>{leaseErrors.endDate}</Text>}
                <CustomDatePicker
                  visible={showLeaseEndPicker}
                  value={leaseEndDate}
                  onSelect={(date) => setLeaseEndDate(date)}
                  onClose={() => setShowLeaseEndPicker(false)}
                />

                <Text style={styles.formLabel} allowFontScaling={false}>MONTHLY RENT AMOUNT ($)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="$ 1500"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                  value={leaseMonthlyRent}
                  onChangeText={setLeaseMonthlyRent}
                />
                {leaseErrors.monthlyRent && <Text style={styles.errorLabel} allowFontScaling={false}>{leaseErrors.monthlyRent}</Text>}

                <Text style={styles.formLabel} allowFontScaling={false}>SECURITY DEPOSIT ($)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="$ 1500"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                  value={leaseDepositAmount}
                  onChangeText={setLeaseDepositAmount}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setActivePicker(null);
                    setRecordLeaseOpen(false);
                  }}
                >
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleCreateLease} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false} numberOfLines={1}>Create Lease & Schedule Move In</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- 3.5. EDIT RENEWAL TERMS MODAL --- */}
      <Modal visible={editRenewalModalOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Update Renewal Terms</Text>
                <TouchableOpacity onPress={() => { setActivePicker(null); setEditRenewalModalOpen(false); }}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.formLabel} allowFontScaling={false}>RESIDENT & UNIT</Text>
                <Text style={[styles.formPickerText, { marginBottom: 12, color: '#f8fafc', fontWeight: '700' }]} allowFontScaling={false}>
                  {editingRenewal?.tenantName} · {editingRenewal?.propertyName} ({editingRenewal?.unitNumber})
                </Text>

                <Text style={styles.formLabel} allowFontScaling={false}>PROPOSED MONTHLY RENT ($)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="2500"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                  value={renewalNewRent}
                  onChangeText={setRenewalNewRent}
                />

                <Text style={styles.formLabel} allowFontScaling={false}>PROPOSED LEASE TERM</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => setActivePicker(activePicker === 'renewalTerm' ? null : 'renewalTerm')}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {renewalTermMonths} Months Extension
                  </Text>
                  <Ionicons name={activePicker === 'renewalTerm' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {renderInlinePicker('renewalTerm')}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setActivePicker(null);
                    setEditRenewalModalOpen(false);
                  }}
                >
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleSaveRenewalTerms} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- 6. CREATE INSPECTION TEMPLATE MODAL --- */}
      <Modal visible={recordTemplateOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Create Inspection Template</Text>
                <TouchableOpacity onPress={() => setRecordTemplateOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.formLabel} allowFontScaling={false}>TEMPLATE NAME</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="E.g. Move Out Checklist"
                  placeholderTextColor="#64748b"
                  value={templateName}
                  onChangeText={setTemplateName}
                />

                <Text style={styles.formLabel} allowFontScaling={false}>ROOMS COUNT</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="4"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={templateRooms}
                  onChangeText={setTemplateRooms}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setRecordTemplateOpen(false)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleCreateTemplate}>
                  <Text style={styles.submitBtnText} allowFontScaling={false}>Create Template</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- BACKGROUND SCREENING DETAILS MODAL --- */}
      <Modal visible={!!selectedScreening} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => setSelectedScreening(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Screening Check Details</Text>
                <TouchableOpacity onPress={() => setSelectedScreening(null)}>
                  <Ionicons name="close" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {loadingDetail ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#38bdf8" />
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }} allowFontScaling={false}>
                    Fetching live screening details...
                  </Text>
                </View>
              ) : selectedScreening && (
                <ScrollView style={{ marginBottom: 10 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.modalForm}>
                    <Text style={styles.formLabel} allowFontScaling={false}>APPLICANT NAME</Text>
                    <Text style={styles.formPickerText} allowFontScaling={false}>{selectedScreening.applicantName}</Text>

                    <Text style={styles.formLabel} allowFontScaling={false}>EMAIL ADDRESS</Text>
                    <Text style={styles.formPickerText} allowFontScaling={false}>{selectedScreening.email}</Text>

                    <Text style={styles.formLabel} allowFontScaling={false}>PROPERTY & UNIT</Text>
                    <Text style={styles.formPickerText} allowFontScaling={false}>
                      {selectedScreening.propertyName} · {selectedScreening.unitNumber}
                    </Text>

                    <Text style={styles.formLabel} allowFontScaling={false}>SCREENING PACKAGE</Text>
                    <Text style={styles.formPickerText} allowFontScaling={false}>{selectedScreening.screeningPackage}</Text>

                    <Text style={styles.formLabel} allowFontScaling={false}>STATUS</Text>
                    <View style={[styles.badge, { alignSelf: 'flex-start', marginTop: 4, borderColor: selectedScreening.screeningStatus === 'Approved' ? '#10b981' : selectedScreening.screeningStatus === 'Declined' ? '#ef4444' : '#f59e0b', backgroundColor: 'rgba(56, 189, 248, 0.05)' }]}>
                      <Text style={{ color: selectedScreening.screeningStatus === 'Approved' ? '#10b981' : selectedScreening.screeningStatus === 'Declined' ? '#ef4444' : '#f59e0b', fontSize: 11, fontWeight: '800' }} allowFontScaling={false}>
                        {selectedScreening.screeningStatus}
                      </Text>
                    </View>

                    <Text style={styles.formLabel} allowFontScaling={false}>DATE OF BIRTH (DOB)</Text>
                    <Text style={styles.formPickerText} allowFontScaling={false}>{selectedScreening.dob || '—'}</Text>

                    <Text style={styles.formLabel} allowFontScaling={false}>SOCIAL SECURITY NUMBER (SSN)</Text>
                    <Text style={styles.formPickerText} allowFontScaling={false}>
                      {selectedScreening.ssn ? (selectedScreening.ssn.length > 4 ? `***-**-${selectedScreening.ssn.slice(-4)}` : selectedScreening.ssn) : '—'}
                    </Text>

                    <Text style={styles.formLabel} allowFontScaling={false}>CREDIT SCORE INDEX</Text>
                    <Text style={styles.formPickerText} allowFontScaling={false}>{selectedScreening.creditScore}</Text>

                    <Text style={styles.formLabel} allowFontScaling={false}>CRIMINAL BACKGROUND</Text>
                    <Text style={styles.formPickerText} allowFontScaling={false}>{selectedScreening.criminalBackground}</Text>

                    <Text style={styles.formLabel} allowFontScaling={false}>EVICTION HISTORY</Text>
                    <Text style={styles.formPickerText} allowFontScaling={false}>{selectedScreening.evictionHistory}</Text>

                    {selectedScreening.documentUrl ? (
                      <>
                        <Text style={styles.formLabel} allowFontScaling={false}>VERIFICATION DOCUMENT</Text>
                        <TouchableOpacity 
                          style={styles.formPickerSelector}
                          onPress={() => Linking.openURL(selectedScreening.documentUrl)}
                        >
                          <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '700' }} allowFontScaling={false}>
                            📄 {selectedScreening.documentName || 'Download Document'}
                          </Text>
                          <Ionicons name="download-outline" size={16} color="#38bdf8" />
                        </TouchableOpacity>
                      </>
                    ) : null}

                    {/* Document Uploader flow for Manager if Pending Consent/Documents */}
                    {(selectedScreening.screeningStatus === 'Pending Documents' || selectedScreening.screeningStatus === 'Pending Consent' || selectedScreening.screeningStatus === 'Processing') && (
                      <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 16 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#f8fafc', marginBottom: 12 }} allowFontScaling={false}>
                          Upload Missing Verification Documents
                        </Text>

                        <Text style={styles.formLabel} allowFontScaling={false}>DATE OF BIRTH (DOB) *</Text>
                        <TouchableOpacity style={styles.formPickerSelector} onPress={() => setShowScrDobPicker(true)}>
                          <Text style={styles.formPickerText} allowFontScaling={false}>{screeningDob || 'Select Date...'}</Text>
                          <Ionicons name="calendar-outline" size={16} color="#cbd5e1" />
                        </TouchableOpacity>
                        <CustomDatePicker
                          visible={showScrDobPicker}
                          value={screeningDob}
                          onSelect={(date) => setScreeningDob(date)}
                          onClose={() => setShowScrDobPicker(false)}
                        />

                        <Text style={styles.formLabel} allowFontScaling={false}>SOCIAL SECURITY NUMBER (SSN) *</Text>
                        <TextInput
                          style={styles.formInput}
                          placeholder="XXX-XX-XXXX"
                          placeholderTextColor="#64748b"
                          value={screeningSsn}
                          onChangeText={setScreeningSsn}
                        />

                        <TouchableOpacity 
                          style={[styles.formPickerSelector, { marginTop: 8 }]} 
                          onPress={handlePickScreeningDocument}
                        >
                          <Text style={styles.formPickerText} allowFontScaling={false}>
                            {screeningDocFile ? `📄 ${screeningDocFile.name}` : 'Choose ID / W2 Proof Document...'}
                          </Text>
                          <Ionicons name="document-attach-outline" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 8 }}
                          onPress={() => setScreeningConsent(!screeningConsent)}
                        >
                          <Ionicons 
                            name={screeningConsent ? 'checkbox' : 'square-outline'} 
                            size={18} 
                            color={screeningConsent ? '#38bdf8' : colors.textSecondary} 
                            style={{ marginRight: 8 }}
                          />
                          <Text style={{ fontSize: 11.5, color: colors.textSecondary, fontWeight: '600' }} allowFontScaling={false}>
                            I certify that the applicant has authorized this background check.
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.submitBtn, { width: '100%', marginTop: 12, backgroundColor: '#38bdf8' }]}
                          onPress={handleCompleteScreeningFlow}
                          disabled={submitting}
                        >
                          {submitting ? (
                            <ActivityIndicator size="small" color="#0f172a" />
                          ) : (
                            <Text style={styles.submitBtnText} allowFontScaling={false}>Submit Screening Documents</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}

              {/* Modal actions matching Web parity */}
              {!loadingDetail && selectedScreening && (
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedScreening(null)}>
                    <Text style={styles.cancelBtnText} allowFontScaling={false}>Close</Text>
                  </TouchableOpacity>

                  {/* Run Check button for Processing / Pending Approval */}
                  {(selectedScreening.screeningStatus === 'Processing' || selectedScreening.screeningStatus === 'Pending Approval') && (
                    <TouchableOpacity 
                      style={[styles.submitBtn, { backgroundColor: '#10b981', flex: 1.5 }]} 
                      onPress={() => handleUpdateScreeningStatus(selectedScreening.id, 'Completed')}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Ionicons name="play-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                          <Text style={[styles.submitBtnText, { color: '#ffffff' }]} allowFontScaling={false}>Run Check & Report</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Skip Screening / Direct Approve for Pending Documents matching Web Skip Option */}
                  {(selectedScreening.screeningStatus === 'Pending Documents' || selectedScreening.screeningStatus === 'Pending') && (
                    <TouchableOpacity 
                      style={[styles.submitBtn, { backgroundColor: '#38bdf8', flex: 1.5 }]} 
                      onPress={() => {
                        Alert.alert(
                          'Skip Screening?',
                          'Do you want to skip background verification and directly approve this applicant?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Skip & Approve', onPress: () => handleUpdateScreeningStatus(selectedScreening.id, 'Approved') },
                          ]
                        );
                      }}
                      disabled={submitting}
                    >
                      <Ionicons name="flash-outline" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                      <Text style={styles.submitBtnText} allowFontScaling={false}>Skip & Approve</Text>
                    </TouchableOpacity>
                  )}

                  {/* Approve & Decline buttons - ONLY WHEN REPORT IS COMPLETED */}
                  {selectedScreening.screeningStatus === 'Completed' && (
                    <View style={{ flexDirection: 'row', gap: 8, flex: 2 }}>
                      <TouchableOpacity 
                        style={[styles.submitBtn, { flex: 1, backgroundColor: '#ef4444' }]} 
                        onPress={() => {
                          Alert.alert('Decline Application', 'Are you sure you want to decline this applicant?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Decline', style: 'destructive', onPress: () => handleUpdateScreeningStatus(selectedScreening.id, 'Declined') },
                          ]);
                        }}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="close-circle-outline" size={15} color="#ffffff" style={{ marginRight: 4 }} />
                            <Text style={[styles.submitBtnText, { color: '#ffffff' }]} allowFontScaling={false}>Decline</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.submitBtn, { flex: 1, backgroundColor: '#10b981' }]} 
                        onPress={() => handleUpdateScreeningStatus(selectedScreening.id, 'Approved')}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={15} color="#ffffff" style={{ marginRight: 4 }} />
                            <Text style={[styles.submitBtnText, { color: '#ffffff' }]} allowFontScaling={false}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Status Banner for Approved */}
                  {selectedScreening.screeningStatus === 'Approved' && (
                    <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16, 185, 129, 0.12)', borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 12 }} allowFontScaling={false}>Applicant Approved</Text>
                    </View>
                  )}

                  {/* Status Banner for Declined */}
                  {selectedScreening.screeningStatus === 'Declined' && (
                    <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.12)', borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                      <Ionicons name="close-circle" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 12 }} allowFontScaling={false}>Application Declined</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- START INSPECTION TEMPLATE SELECTOR MODAL --- */}
      <Modal visible={startInspectionModalOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => setStartInspectionModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Select Inspection Template</Text>
                <TouchableOpacity onPress={() => setStartInspectionModalOpen(false)}>
                  <Ionicons name="close" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalForm}>
                <Text style={styles.formLabel} allowFontScaling={false}>CHOOSE TEMPLATE *</Text>
                {templatesList.length === 0 ? (
                  <Text style={[styles.formPickerText, { color: '#ef4444' }]} allowFontScaling={false}>
                    No templates available. Please create a template first under the "Checklist Templates" tab.
                  </Text>
                ) : (
                  <ScrollView style={{ maxHeight: 200, marginVertical: 10 }}>
                    {templatesList.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.pickerOptionRow,
                          startInspectionTemplateId === t.id && { backgroundColor: 'rgba(56, 189, 248, 0.15)' }
                        ]}
                        onPress={() => setStartInspectionTemplateId(t.id)}
                      >
                        <Text 
                          style={[
                            styles.pickerOptionText, 
                            startInspectionTemplateId === t.id && { color: '#38bdf8', fontWeight: '800' }
                          ]} 
                          allowFontScaling={false}
                        >
                          {t.name} ({t.roomsCount || 4} rooms)
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setStartInspectionModalOpen(false)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.submitBtn, { backgroundColor: '#38bdf8' }]} 
                  onPress={handleStartInspectionFlow}
                  disabled={submitting || !startInspectionTemplateId}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#0f172a" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>Start</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  errorLabel: { color: '#ef4444', fontSize: 10.5, marginTop: 4, fontWeight: '700' },
  mainWrapper: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120, width: '100%', maxWidth: 1024, alignSelf: 'center' },

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
  headerTextContainer: {
    minHeight: 85,
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 11.5, color: colors.textSecondary, marginTop: 4, lineHeight: 15 },

  // Tab switcher
  tabItem: { paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center', borderRadius: 8, backgroundColor: colors.surface, marginRight: 6 },
  tabItemActive: { backgroundColor: '#38bdf8' },
  tabItemText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '700' },
  tabItemTextActive: { color: '#0f172a', fontWeight: '800' },

  // Filter pills row (Move In / Move Out Web style)
  filterPillsContainer: {
    flexDirection: 'row',
    paddingVertical: 2,
    paddingRight: 10,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },

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
  dedicatedAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 10,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  dedicatedAddBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },

  // Records card layouts
  recordsCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recordLabel: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary },
  recordValue: { fontSize: 15, fontWeight: '900' },
  recordSubText: { fontSize: 12, color: colors.textSecondary },
  recordSubTextVal: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 3 },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  // Templates grid card styling
  templatesFlexContainer: { flexDirection: 'column' },
  templateGridCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tmplTitle: { fontSize: 15, fontWeight: '850', color: colors.textPrimary, marginTop: 10 },
  tmplDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  tmplMetaText: { fontSize: 11.5, color: colors.textSecondary, fontWeight: '600' },
  tmplMetaLabel: { fontSize: 9.5, color: colors.textMuted, fontWeight: '700' },
  tmplActionRow: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: 12, gap: 10 },
  tmplActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  tmplActionBtnText: { color: colors.textSecondary, fontSize: 11.5, fontWeight: '700' },

  // Actions Container for background check approvals
  actionRowContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 10 },
  smallActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  smallActionText: { fontSize: 12, fontWeight: '800' },

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
    maxWidth: 580,
    maxHeight: '85%',
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignSelf: 'center',
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 16,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.buttonSecondary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cancelBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  submitBtn: {
    flex: 1,
    backgroundColor: '#38bdf8',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: '#0f172a', fontSize: 12, fontWeight: '800', textAlign: 'center' },

  // Section headers matching Web
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 6,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginBottom: 10,
  },
  skipBtn: {
    backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  skipBtnText: {
    color: isDarkMode ? '#cbd5e1' : '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  sendInviteBtn: {
    flex: 1.5,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  sendInviteBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  // Inline dropdown container styles (matches Maintenance / Web dropdowns)
  inlinePickerContainer: {
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    marginTop: 6,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inlinePickerOptionRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inlinePickerOptionText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  inlinePickerEmpty: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  inlinePickerEmptyText: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontStyle: 'italic',
  },
});

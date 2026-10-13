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

export const LeadsScreen = ({ onNavigate }) => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  // Sub-tab selector: 'leads' | 'applications' | 'screening' | 'leases' | 'movein' | 'moveout' | 'templates'
  const [activeTab, setActiveTab] = useState('leads');

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
  const [screenName, setScreenName] = useState('');
  const [screenEmail, setScreenEmail] = useState('');
  const [screenPropertyId, setScreenPropertyId] = useState('');
  const [screenUnitId, setScreenUnitId] = useState('');
  const [screenPackage, setScreenPackage] = useState('Basic');

  // 3. Leases modal form states
  const [recordLeaseOpen, setRecordLeaseOpen] = useState(false);
  const [leaseTenantId, setLeaseTenantId] = useState('');
  const [leaseUnitId, setLeaseUnitId] = useState('');
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [leaseMonthlyRent, setLeaseMonthlyRent] = useState('');

  // 4. Move In modal form states
  const [recordMoveInOpen, setRecordMoveInOpen] = useState(false);
  const [moveTenantId, setMoveTenantId] = useState('');
  const [moveDate, setMoveDate] = useState('');

  // 5. Move Out modal form states
  const [recordMoveOutOpen, setRecordMoveOutOpen] = useState(false);
  const [outTenantId, setOutTenantId] = useState('');
  const [outDate, setOutDate] = useState('');

  // 6. Template modal form states
  const [recordTemplateOpen, setRecordTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateRooms, setTemplateRooms] = useState('4');

  // Universal Picker selector modal state
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [activePicker, setActivePicker] = useState(null); // 'property' | 'unit' | 'tenant' | 'stage' | 'package'

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
  const [showInDatePicker, setShowInDatePicker] = useState(false);
  const [showOutDatePicker, setShowOutDatePicker] = useState(false);
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
      if (props?.data || props) setProperties(props?.data || props || []);
      if (unts?.data || unts) setUnits(unts?.data || unts || []);
      if (tnts?.data || tnts) setTenants(tnts?.data || tnts || []);
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
      if (activeTab === 'leads') {
        setLoading(false);
        setRefreshing(false);
        runEntryAnimation();
      }
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
      if (activeTab === 'applications') {
        setLoading(false);
        setRefreshing(false);
        runEntryAnimation();
      }
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
      if (activeTab === 'screening') {
        setLoading(false);
        setRefreshing(false);
        runEntryAnimation();
      }
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
      if (activeTab === 'leases') {
        setLoading(false);
        setRefreshing(false);
        runEntryAnimation();
      }
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
      if (activeTab === 'movein') {
        setLoading(false);
        setRefreshing(false);
        runEntryAnimation();
      }
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
      if (activeTab === 'moveout') {
        setLoading(false);
        setRefreshing(false);
        runEntryAnimation();
      }
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
      if (activeTab === 'templates') {
        setLoading(false);
        setRefreshing(false);
        runEntryAnimation();
      }
    }
  };

  // Tab switching router refresh
  useEffect(() => {
    setSearchQuery('');
    setSelectedPropertyId('');
    if (activeTab === 'leads') fetchLeads();
    if (activeTab === 'applications') fetchApplications();
    if (activeTab === 'screening') fetchScreening();
    if (activeTab === 'leases') fetchLeases();
    if (activeTab === 'movein') fetchMoveIns();
    if (activeTab === 'moveout') fetchMoveOuts();
    if (activeTab === 'templates') fetchTemplates();
  }, [activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'leads') fetchLeads(false);
    if (activeTab === 'applications') fetchApplications(false);
    if (activeTab === 'screening') fetchScreening(false);
    if (activeTab === 'leases') fetchLeases(false);
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

  // C. Save screening check
  const handleRequestScreening = async () => {
    setScrErrors({});

    const validationData = {
      applicantName: screenName.trim(),
      email: screenEmail.trim(),
    };

    const valRes = screeningSchema.safeParse(validationData);
    if (!valRes.success) {
      const errs = {};
      valRes.error.issues.forEach(issue => {
        errs[issue.path[0]] = issue.message;
      });
      setScrErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        applicantName: valRes.data.applicantName,
        email: valRes.data.email,
        propertyId: screenPropertyId || undefined,
        unitId: screenUnitId || undefined,
        status: 'Processing'
      };

      await apiClient.post('/portal/screening/reports', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Screening check report generated.');
      setRecordScreeningOpen(false);
      setScreenName('');
      setScreenEmail('');
      fetchScreening(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to request screening check.');
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
    if (!screeningDocFile) {
      Alert.alert('Document Required', 'Please select an Identity/Income verification document.');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Save details (dob, ssn, authorized)
      await apiClient.put(`/portal/screening/reports/${selectedScreening.id}`, {
        dob: screeningDob.trim(),
        ssn: screeningSsn.trim(),
        authorized: true,
        status: 'Pending Documents',
      }, logout, refreshAccessToken);

      // 2. Upload document file
      const formData = new FormData();
      formData.append('document', {
        uri: Platform.OS === 'ios' ? screeningDocFile.uri.replace('file://', '') : screeningDocFile.uri,
        name: screeningDocFile.name || 'screening_doc.pdf',
        type: screeningDocFile.mimeType || 'application/pdf',
      });

      await apiClient.post(`/portal/screening/reports/${selectedScreening.id}/upload`, formData, logout, refreshAccessToken);

      Alert.alert('Success', 'Screening documents uploaded and submitted for review.');
      setSelectedScreening(null);
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

  // D. Create Lease agreement
  const handleCreateLease = async () => {
    setLeaseErrors({});

    const validationData = {
      tenantId: leaseTenantId,
      unitId: leaseUnitId,
      startDate: leaseStartDate,
      endDate: leaseEndDate,
      monthlyRent: parseFloat(leaseMonthlyRent || '0'),
    };

    const valRes = leaseSchema.safeParse(validationData);
    if (!valRes.success) {
      const errs = {};
      valRes.error.issues.forEach(issue => {
        errs[issue.path[0]] = issue.message;
      });
      setLeaseErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        tenantId: valRes.data.tenantId,
        unitId: valRes.data.unitId,
        startDate: new Date(valRes.data.startDate).toISOString(),
        endDate: new Date(valRes.data.endDate).toISOString(),
        rent: valRes.data.monthlyRent,
        status: 'Active'
      };

      await apiClient.post('/leases', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Lease Agreement wizard configured.');
      setRecordLeaseOpen(false);
      setLeaseMonthlyRent('');
      fetchLeases(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create lease agreement.');
    } finally {
      setSubmitting(false);
    }
  };

  // E. Schedule Move In
  const handleCreateMoveIn = async () => {
    setAppErrors({});
    if (!moveTenantId) {
      Alert.alert('Validation Error', 'Resident selection is required.');
      return;
    }

    const valRes = moveInSchema.safeParse({ tenantId: moveTenantId, date: moveDate });
    if (!valRes.success) {
      const errs = {};
      valRes.error.issues.forEach(issue => {
        errs[issue.path[0]] = issue.message;
      });
      setAppErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      const chosenTenant = tenants.find(t => t.id === valRes.data.tenantId);
      const payload = {
        tenantId: valRes.data.tenantId,
        propertyId: chosenTenant?.unit?.property?.id,
        unitId: chosenTenant?.unit?.id,
        scheduledDate: valRes.data.date ? new Date(valRes.data.date).toISOString() : new Date().toISOString(),
        status: 'Scheduled'
      };

      await apiClient.post('/move-ins', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Move In workflow registry created.');
      setRecordMoveInOpen(false);
      fetchMoveIns(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to schedule move in.');
    } finally {
      setSubmitting(false);
    }
  };

  // F. Schedule Move Out
  const handleCreateMoveOut = async () => {
    setAppErrors({});
    if (!outTenantId) {
      Alert.alert('Validation Error', 'Resident selection is required.');
      return;
    }

    const valRes = moveOutSchema.safeParse({ tenantId: outTenantId, date: outDate });
    if (!valRes.success) {
      const errs = {};
      valRes.error.issues.forEach(issue => {
        errs[issue.path[0]] = issue.message;
      });
      setAppErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        tenantId: valRes.data.tenantId,
        scheduledDate: valRes.data.date ? new Date(valRes.data.date).toISOString() : new Date().toISOString(),
        status: 'Scheduled'
      };

      await apiClient.post('/move-outs', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Move Out workflow registry created.');
      setRecordMoveOutOpen(false);
      fetchMoveOuts(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to schedule move out.');
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

  const getPickerOptions = () => {
    switch (activePicker) {
      case 'property':
        return properties.map(p => ({ value: p.id, label: p.name }));
      case 'unit':
        const currentPropId = recordScreeningOpen ? screenPropertyId : leaseUnitId;
        const filteredUnits = currentPropId ? units.filter(u => u.propertyId === currentPropId) : units;
        return filteredUnits.map(u => ({ value: u.id, label: `Unit ${u.unitNumber} (${u.property?.name || 'Property'})` }));
      case 'tenant':
        return tenants.map(t => ({ value: t.id, label: `${t.firstName || ''} ${t.lastName || ''}`.trim() }));
      case 'stage':
        return ['NEW', 'CONTACTED', 'TOUR SCHEDULED', 'APPLICATION SUBMITTED', 'LEASE SIGNED'].map(s => ({ value: s, label: s }));
      case 'package':
        return ['Basic', 'Premium'].map(p => ({ value: p, label: p }));
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
    if (activePicker === 'unit') {
      if (recordScreeningOpen) setScreenUnitId(val);
      if (recordLeaseOpen) setLeaseUnitId(val);
    }
    if (activePicker === 'tenant') {
      if (recordLeaseOpen) setLeaseTenantId(val);
      if (recordMoveInOpen) setMoveTenantId(val);
      if (recordMoveOutOpen) setOutTenantId(val);
    }
    if (activePicker === 'stage') setLeadStage(val);
    if (activePicker === 'package') setScreenPackage(val);
    setPickerModalOpen(false);
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

  const filteredMoveIns = moveInList.filter(item => {
    const text = `${item.tenantName} ${item.propertyName} ${item.unitNumber} ${item.workflowStatus}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const filteredMoveOuts = moveOutList.filter(item => {
    const text = `${item.tenantName} ${item.propertyName} ${item.unitNumber} ${item.workflowStatus}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
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
            {activeTab === 'leads' ? 'Leads Pipeline' : activeTab === 'applications' ? 'Background Applications' : activeTab === 'screening' ? 'Tenant Screening' : activeTab === 'leases' ? 'Lease Agreements' : activeTab === 'movein' ? 'Move In Workflow' : activeTab === 'moveout' ? 'Move Out Registry' : 'Inspection Templates'}
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
                    : activeTab === 'movein'
                      ? 'Monitor tenant move-in schedules, checklist templates, and review signoffs.'
                      : activeTab === 'moveout'
                        ? 'Monitor tenant move-out schedules, inspect damages, and signoff final security deposit refunds.'
                        : 'Manage reusable structural checklists for move-ins, move-outs, and periodic inspections.'}
          </Text>
        </View>

        {/* Tab switcher row in horizontal scrollview to handle 7 tabs smoothly */}
        <View style={{ marginTop: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 10 }}>
            <TouchableOpacity style={[styles.tabItem, activeTab === 'leads' && styles.tabItemActive]} onPress={() => setActiveTab('leads')}>
              <Text style={[styles.tabItemText, activeTab === 'leads' && styles.tabItemTextActive]} allowFontScaling={false}>Leads</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabItem, activeTab === 'applications' && styles.tabItemActive]} onPress={() => setActiveTab('applications')}>
              <Text style={[styles.tabItemText, activeTab === 'applications' && styles.tabItemTextActive]} allowFontScaling={false}>Apps</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabItem, activeTab === 'screening' && styles.tabItemActive]} onPress={() => setActiveTab('screening')}>
              <Text style={[styles.tabItemText, activeTab === 'screening' && styles.tabItemTextActive]} allowFontScaling={false}>Screening</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabItem, activeTab === 'leases' && styles.tabItemActive]} onPress={() => setActiveTab('leases')}>
              <Text style={[styles.tabItemText, activeTab === 'leases' && styles.tabItemTextActive]} allowFontScaling={false}>Leases</Text>
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
          <TouchableOpacity style={styles.dedicatedAddBtn} onPress={() => setRecordLeadOpen(true)}>
            <Ionicons name="add" size={18} color="#0f172a" />
            <Text style={styles.dedicatedAddBtnText} allowFontScaling={false}>+ Add Lead</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'screening' && (
          <TouchableOpacity style={styles.dedicatedAddBtn} onPress={() => setRecordScreeningOpen(true)}>
            <Ionicons name="add" size={18} color="#0f172a" />
            <Text style={styles.dedicatedAddBtnText} allowFontScaling={false}>+ Request Screening Check</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'leases' && (
          <TouchableOpacity style={styles.dedicatedAddBtn} onPress={() => setRecordLeaseOpen(true)}>
            <Ionicons name="add" size={18} color="#0f172a" />
            <Text style={styles.dedicatedAddBtnText} allowFontScaling={false}>+ Create Lease Wizard</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'movein' && (
          <TouchableOpacity style={styles.dedicatedAddBtn} onPress={() => setRecordMoveInOpen(true)}>
            <Ionicons name="add" size={18} color="#0f172a" />
            <Text style={styles.dedicatedAddBtnText} allowFontScaling={false}>+ Schedule Move In</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'moveout' && (
          <TouchableOpacity style={styles.dedicatedAddBtn} onPress={() => setRecordMoveOutOpen(true)}>
            <Ionicons name="add" size={18} color="#0f172a" />
            <Text style={styles.dedicatedAddBtnText} allowFontScaling={false}>+ Schedule Move Out</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'templates' && (
          <TouchableOpacity style={styles.dedicatedAddBtn} onPress={() => setRecordTemplateOpen(true)}>
            <Ionicons name="add" size={18} color="#0f172a" />
            <Text style={styles.dedicatedAddBtnText} allowFontScaling={false}>+ Create Template</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 12 }]}
        showsVerticalScrollIndicator={false}
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

            {/* 5. MOVE IN WORKFLOW LIST */}
            {activeTab === 'movein' && (
              <View>
                {filteredMoveIns.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Text style={styles.emptyText} allowFontScaling={false}>No move in schedules registered</Text>
                  </View>
                ) : (
                  filteredMoveIns.map((item) => {
                    const statusColor = item.workflowStatus === 'Completed' ? '#10b981' : item.workflowStatus === 'Inspection in Progress' ? '#a855f7' : '#f59e0b';
                    const inspectionId = item.inspectionId || item.inspection?.id;
                    return (
                      <View key={item.id} style={styles.recordsCard}>
                        <View style={styles.rowBetween}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.recordLabel} allowFontScaling={false}>{item.tenantName}</Text>
                            <Text style={styles.recordSubText} allowFontScaling={false}>{item.propertyName} · Unit {item.unitNumber}</Text>
                          </View>
                          <View style={[styles.badge, { borderColor: statusColor, backgroundColor: `${statusColor}12` }]}>
                            <Text style={[styles.badgeText, { color: statusColor }]} allowFontScaling={false}>{item.workflowStatus}</Text>
                          </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.rowBetween}>
                          <Text style={styles.recordSubText} allowFontScaling={false}>Move In Target Date</Text>
                          <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.scheduledDate}</Text>
                        </View>
                        {item.workflowStatus !== 'Completed' && (
                          <View style={[styles.actionRowContainer, { marginTop: 10 }]}>
                            {item.workflowStatus === 'Inspection in Progress' && inspectionId ? (
                              <TouchableOpacity
                                style={[styles.smallActionBtn, { backgroundColor: 'rgba(168, 85, 247, 0.15)', flex: 1 }]}
                                onPress={() => onNavigate && onNavigate('inspection', { inspectionId })}
                              >
                                <Text style={[styles.smallActionText, { color: '#a855f7' }]} allowFontScaling={false}>Continue Inspection</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={[styles.smallActionBtn, { backgroundColor: 'rgba(56, 189, 248, 0.15)', flex: 1 }]}
                                onPress={() => {
                                  setSelectedMoveInOrOut({ type: 'movein', id: item.id });
                                  setStartInspectionTemplateId('');
                                  setStartInspectionModalOpen(true);
                                }}
                              >
                                <Text style={[styles.smallActionText, { color: '#38bdf8' }]} allowFontScaling={false}>Start Inspection</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* 6. MOVE OUT WORKFLOW LIST */}
            {activeTab === 'moveout' && (
              <View>
                {filteredMoveOuts.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Ionicons name="clipboard-outline" size={32} color="#475569" style={{ marginBottom: 8 }} />
                    <Text style={[styles.emptyText, { fontWeight: '700', color: '#f8fafc' }]} allowFontScaling={false}>No Move Outs Found</Text>
                    <Text style={{ fontSize: 10.5, color: '#64748b', marginTop: 4, textAlign: 'center' }} allowFontScaling={false}>
                      Create a move-out record from the active leases page to schedule a checklist.
                    </Text>
                  </View>
                ) : (
                  filteredMoveOuts.map((item) => {
                    const statusColor = item.workflowStatus === 'Completed' ? '#10b981' : item.workflowStatus === 'Inspection in Progress' ? '#a855f7' : '#f59e0b';
                    const inspectionId = item.inspectionId || item.inspection?.id;
                    return (
                      <View key={item.id} style={styles.recordsCard}>
                        <View style={styles.rowBetween}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.recordLabel} allowFontScaling={false}>{item.tenantName}</Text>
                            <Text style={styles.recordSubText} allowFontScaling={false}>{item.propertyName} · Unit {item.unitNumber}</Text>
                          </View>
                          <View style={[styles.badge, { borderColor: statusColor, backgroundColor: `${statusColor}12` }]}>
                            <Text style={[styles.badgeText, { color: statusColor }]} allowFontScaling={false}>{item.workflowStatus}</Text>
                          </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.rowBetween}>
                          <Text style={styles.recordSubText} allowFontScaling={false}>Move Out Date</Text>
                          <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.scheduledDate}</Text>
                        </View>
                        {item.workflowStatus !== 'Completed' && (
                          <View style={[styles.actionRowContainer, { marginTop: 10 }]}>
                            {item.workflowStatus === 'Inspection in Progress' && inspectionId ? (
                              <TouchableOpacity
                                style={[styles.smallActionBtn, { backgroundColor: 'rgba(168, 85, 247, 0.15)', flex: 1 }]}
                                onPress={() => onNavigate && onNavigate('inspection', { inspectionId })}
                              >
                                <Text style={[styles.smallActionText, { color: '#a855f7' }]} allowFontScaling={false}>Continue Inspection</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={[styles.smallActionBtn, { backgroundColor: 'rgba(56, 189, 248, 0.15)', flex: 1 }]}
                                onPress={() => {
                                  setSelectedMoveInOrOut({ type: 'moveout', id: item.id });
                                  setStartInspectionTemplateId('');
                                  setStartInspectionModalOpen(true);
                                }}
                              >
                                <Text style={[styles.smallActionText, { color: '#38bdf8' }]} allowFontScaling={false}>Start Inspection</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
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
                  onPress={() => {
                    setActivePicker('property');
                    setPickerModalOpen(true);
                  }}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {leadPropertyId ? properties.find(p => p.id === leadPropertyId)?.name : 'Select Property...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                </TouchableOpacity>

                <Text style={styles.formLabel} allowFontScaling={false}>PIPELINE STAGE</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => {
                    setActivePicker('stage');
                    setPickerModalOpen(true);
                  }}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>{leadStage}</Text>
                  <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setRecordLeadOpen(false)}>
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

      {/* --- 2. REQUEST SCREENING MODAL --- */}
      <Modal visible={recordScreeningOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Request Screening Check</Text>
                <TouchableOpacity onPress={() => setRecordScreeningOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.formLabel} allowFontScaling={false}>APPLICANT NAME</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Applicant full name..."
                  placeholderTextColor="#64748b"
                  value={screenName}
                  onChangeText={setScreenName}
                />
                {scrErrors.applicantName && <Text style={styles.errorLabel} allowFontScaling={false}>{scrErrors.applicantName}</Text>}

                <Text style={styles.formLabel} allowFontScaling={false}>APPLICANT EMAIL</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="applicant@example.com"
                  placeholderTextColor="#64748b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={screenEmail}
                  onChangeText={setScreenEmail}
                />
                {scrErrors.email && <Text style={styles.errorLabel} allowFontScaling={false}>{scrErrors.email}</Text>}

                <Text style={styles.formLabel} allowFontScaling={false}>PROPERTY</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => {
                    setActivePicker('property');
                    setPickerModalOpen(true);
                  }}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {screenPropertyId ? properties.find(p => p.id === screenPropertyId)?.name : 'Select Property...'}
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
                    {screenUnitId ? `Unit ${units.find(u => u.id === screenUnitId)?.unitNumber}` : 'Select Unit...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                </TouchableOpacity>

                <Text style={styles.formLabel} allowFontScaling={false}>SCREENING PACKAGE</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => {
                    setActivePicker('package');
                    setPickerModalOpen(true);
                  }}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>{screenPackage}</Text>
                  <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setRecordScreeningOpen(false)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleRequestScreening} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>Request Check</Text>
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
                <Text style={styles.modalTitle} allowFontScaling={false}>Create Lease Agreements</Text>
                <TouchableOpacity onPress={() => setRecordLeaseOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.formLabel} allowFontScaling={false}>RESIDENT</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => {
                    setActivePicker('tenant');
                    setPickerModalOpen(true);
                  }}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {leaseTenantId ? tenants.find(t => t.id === leaseTenantId)?.name || `${tenants.find(t => t.id === leaseTenantId)?.firstName} ${tenants.find(t => t.id === leaseTenantId)?.lastName}` : 'Select Resident...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                </TouchableOpacity>

                {leaseErrors.tenantId && <Text style={styles.errorLabel} allowFontScaling={false}>{leaseErrors.tenantId}</Text>}

                <Text style={styles.formLabel} allowFontScaling={false}>UNIT LOCATION</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => {
                    setActivePicker('unit');
                    setPickerModalOpen(true);
                  }}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {leaseUnitId ? `Unit ${units.find(u => u.id === leaseUnitId)?.unitNumber} (${units.find(u => u.id === leaseUnitId)?.property?.name})` : 'Select Unit...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {leaseErrors.unitId && <Text style={styles.errorLabel} allowFontScaling={false}>{leaseErrors.unitId}</Text>}

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
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setRecordLeaseOpen(false)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleCreateLease} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>Create Lease</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- 4. CREATE MOVE IN WORKFLOW MODAL --- */}
      <Modal visible={recordMoveInOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Add Move In Workflow</Text>
                <TouchableOpacity onPress={() => setRecordMoveInOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.formLabel} allowFontScaling={false}>RESIDENT</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => {
                    setActivePicker('tenant');
                    setPickerModalOpen(true);
                  }}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {moveTenantId ? tenants.find(t => t.id === moveTenantId)?.name || `${tenants.find(t => t.id === moveTenantId)?.firstName} ${tenants.find(t => t.id === moveTenantId)?.lastName}` : 'Select Resident...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                </TouchableOpacity>

                {appErrors.tenantId && <Text style={styles.errorLabel} allowFontScaling={false}>{appErrors.tenantId}</Text>}

                <Text style={styles.formLabel} allowFontScaling={false}>MOVE IN DATE</Text>
                <TouchableOpacity style={styles.formPickerSelector} onPress={() => setShowInDatePicker(true)}>
                  <Text style={styles.formPickerText} allowFontScaling={false}>{moveDate || 'Select Date...'}</Text>
                  <Ionicons name="calendar-outline" size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {appErrors.date && <Text style={styles.errorLabel} allowFontScaling={false}>{appErrors.date}</Text>}
                <CustomDatePicker
                  visible={showInDatePicker}
                  value={moveDate}
                  onSelect={(date) => setMoveDate(date)}
                  onClose={() => setShowInDatePicker(false)}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setRecordMoveInOpen(false)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleCreateMoveIn} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>Schedule Move In</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- 5. CREATE MOVE OUT WORKFLOW MODAL --- */}
      <Modal visible={recordMoveOutOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Add Move Out Workflow</Text>
                <TouchableOpacity onPress={() => setRecordMoveOutOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.formLabel} allowFontScaling={false}>RESIDENT</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => {
                    setActivePicker('tenant');
                    setPickerModalOpen(true);
                  }}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>
                    {outTenantId ? tenants.find(t => t.id === outTenantId)?.name || `${tenants.find(t => t.id === outTenantId)?.firstName} ${tenants.find(t => t.id === outTenantId)?.lastName}` : 'Select Resident...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                </TouchableOpacity>

                {appErrors.tenantId && <Text style={styles.errorLabel} allowFontScaling={false}>{appErrors.tenantId}</Text>}

                <Text style={styles.formLabel} allowFontScaling={false}>MOVE OUT DATE</Text>
                <TouchableOpacity style={styles.formPickerSelector} onPress={() => setShowOutDatePicker(true)}>
                  <Text style={styles.formPickerText} allowFontScaling={false}>{outDate || 'Select Date...'}</Text>
                  <Ionicons name="calendar-outline" size={16} color="#cbd5e1" />
                </TouchableOpacity>
                {appErrors.date && <Text style={styles.errorLabel} allowFontScaling={false}>{appErrors.date}</Text>}
                <CustomDatePicker
                  visible={showOutDatePicker}
                  value={outDate}
                  onSelect={(date) => setOutDate(date)}
                  onClose={() => setShowOutDatePicker(false)}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setRecordMoveOutOpen(false)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleCreateMoveOut} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>Schedule Move Out</Text>
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

              {/* Modal actions */}
              {!loadingDetail && selectedScreening && (
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedScreening(null)}>
                    <Text style={styles.cancelBtnText} allowFontScaling={false}>Close</Text>
                  </TouchableOpacity>

                  {/* Generate / Run check button */}
                  {(selectedScreening.screeningStatus === 'Processing' || selectedScreening.screeningStatus === 'Pending Approval') && (
                    <TouchableOpacity 
                      style={[styles.submitBtn, { backgroundColor: '#10b981' }]} 
                      onPress={() => handleUpdateScreeningStatus(selectedScreening.id, 'Completed')}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={[styles.submitBtnText, { color: '#ffffff' }]} allowFontScaling={false}>Run Check</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Approve & Decline buttons */}
                  {selectedScreening.screeningStatus === 'Completed' && (
                    <View style={{ flexDirection: 'row', gap: 8, flex: 2 }}>
                      <TouchableOpacity 
                        style={[styles.submitBtn, { flex: 1, backgroundColor: '#ef4444' }]} 
                        onPress={() => handleUpdateScreeningStatus(selectedScreening.id, 'Declined')}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={[styles.submitBtnText, { color: '#ffffff' }]} allowFontScaling={false}>Decline</Text>
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
                          <Text style={[styles.submitBtnText, { color: '#ffffff' }]} allowFontScaling={false}>Approve</Text>
                        )}
                      </TouchableOpacity>
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

      {/* --- SELECTION DROP DOWN PICKER SELECTOR OPTIONS --- */}
      <Modal visible={pickerModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle} allowFontScaling={false}>Select Option</Text>
            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={true}>
              {getPickerOptions().map((opt, idx) => (
                <TouchableOpacity
                  key={idx}
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

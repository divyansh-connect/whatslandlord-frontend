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
  Linking,
  StatusBar,
  Image,
} from 'react-native';
import { AppActivityIndicator as ActivityIndicator } from '../components/AppActivityIndicator';
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

const leadStageOptions = [
  { label: 'All Stages', value: 'ALL' },
  { label: 'New', value: 'NEW' },
  { label: 'Contacted', value: 'CONTACTED' },
  { label: 'Showing Scheduled', value: 'SHOWING_SCHEDULED' },
  { label: 'Application Sent', value: 'APPLICATION_SENT' },
  { label: 'Application Submitted', value: 'APPLICATION_SUBMITTED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Converted', value: 'CONVERTED' },
];

const appStatusOptions = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Under Review', value: 'UNDER_REVIEW' },
];

const screeningStatusOptions = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Declined', value: 'DECLINED' },
];

const leaseStatusOptions = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Terminated', value: 'TERMINATED' },
];

const renewalStatusOptions = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Eligible', value: 'ELIGIBLE' },
  { label: 'Offered', value: 'OFFERED' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Declined', value: 'DECLINED' },
];

const defaultStarterRooms = [
  {
    name: 'Kitchen',
    sortOrder: 0,
    items: [
      { label: 'Walls & Baseboards', required: true, sortOrder: 0 },
      { label: 'Ceiling & Light Fixtures', required: true, sortOrder: 1 },
      { label: 'Flooring', required: true, sortOrder: 2 },
      { label: 'Countertops & Cabinets', required: true, sortOrder: 3 },
      { label: 'Sink, Faucet & Disposal', required: true, sortOrder: 4 },
      { label: 'Refrigerator & Freezer', required: true, sortOrder: 5 },
      { label: 'Stove, Oven & Range Hood', required: true, sortOrder: 6 },
      { label: 'Microwave & Dishwasher', required: false, sortOrder: 7 },
    ],
  },
  {
    name: 'Living Room',
    sortOrder: 1,
    items: [
      { label: 'Walls, Doors & Windows', required: true, sortOrder: 0 },
      { label: 'Flooring (Carpet/Hardwood)', required: true, sortOrder: 1 },
      { label: 'Outlets & Light Switches', required: true, sortOrder: 2 },
      { label: 'Smoke Detector & AC Vents', required: true, sortOrder: 3 },
    ],
  },
  {
    name: 'Master Bedroom',
    sortOrder: 2,
    items: [
      { label: 'Walls, Trim & Doors', required: true, sortOrder: 0 },
      { label: 'Windows & Blinds', required: true, sortOrder: 1 },
      { label: 'Closet Shelves & Rods', required: true, sortOrder: 2 },
      { label: 'Light Fixtures & Outlets', required: true, sortOrder: 3 },
    ],
  },
  {
    name: 'Bathroom',
    sortOrder: 3,
    items: [
      { label: 'Toilet & Flusher', required: true, sortOrder: 0 },
      { label: 'Sink, Faucet & Vanity', required: true, sortOrder: 1 },
      { label: 'Shower, Tub & Tiles', required: true, sortOrder: 2 },
      { label: 'Exhaust Fan & Mirror', required: true, sortOrder: 3 },
    ],
  },
];

export const LeadsScreen = ({ onNavigate, initialTab = 'leads', targetLeaseId }) => {
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
  const [selectedLease, setSelectedLease] = useState(null);
  const [leaseDetailModalOpen, setLeaseDetailModalOpen] = useState(false);
  const [moveInList, setMoveInList] = useState([]);
  const [moveOutList, setMoveOutList] = useState([]);
  const [templatesList, setTemplatesList] = useState([]);

  // Auto-open specific lease details from deep link / notification
  useEffect(() => {
    if (targetLeaseId && leasesList.length > 0) {
      const match = leasesList.find((l) => l.id === targetLeaseId);
      if (match) {
        setSelectedLease(match);
        setLeaseDetailModalOpen(true);
        setActiveTab('leases');
      }
    }
  }, [targetLeaseId, leasesList]);

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

  // 1. Leads modal form states (100% Web Aligned)
  const [recordLeadOpen, setRecordLeadOpen] = useState(false);
  const [leadFirstName, setLeadFirstName] = useState('');
  const [leadLastName, setLeadLastName] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadPropertyId, setLeadPropertyId] = useState('');
  const [leadBudget, setLeadBudget] = useState('1600');
  const [leadMoveInDate, setLeadMoveInDate] = useState(new Date().toISOString().split('T')[0]);
  const [leadSource, setLeadSource] = useState('Zillow');
  const [leadPriority, setLeadPriority] = useState('Medium');
  const [leadAssignedAgent, setLeadAssignedAgent] = useState('Agent Smith');
  const [leadNotes, setLeadNotes] = useState('');
  const [leadStage, setLeadStage] = useState('NEW');

  // Damage Review modal state for Move Out
  const [damageReviewModalOpen, setDamageReviewModalOpen] = useState(false);
  const [activeMoveOutItem, setActiveMoveOutItem] = useState(null);

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
  const [leadStageFilter, setLeadStageFilter] = useState('ALL');
  const [appStatusFilter, setAppStatusFilter] = useState('ALL');
  const [screeningStatusFilter, setScreeningStatusFilter] = useState('ALL');
  const [leaseStatusFilter, setLeaseStatusFilter] = useState('ALL');
  const [renewalStatusFilter, setRenewalStatusFilter] = useState('ALL');
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // 6. Template modal form states (Web parity template designer)
  const [recordTemplateOpen, setRecordTemplateOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('MOVE_IN');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateBuilderRooms, setTemplateBuilderRooms] = useState([]);

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
  const [showLeadDatePicker, setShowLeadDatePicker] = useState(false);
  const [showLeaseStartPicker, setShowLeaseStartPicker] = useState(false);
  const [showLeaseEndPicker, setShowLeaseEndPicker] = useState(false);

  // Workflow Details & Damage Review modal states (Matching Web Photo 4)
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [selectedWorkflowItem, setSelectedWorkflowItem] = useState(null);
  const [workflowType, setWorkflowType] = useState('moveout'); // 'movein' | 'moveout'
  const [workflowDamageItems, setWorkflowDamageItems] = useState([]);
  const [loadingWorkflowDetail, setLoadingWorkflowDetail] = useState(false);
  const [damageChargeInputs, setDamageChargeInputs] = useState({});
  const [submittingWorkflowAction, setSubmittingWorkflowAction] = useState(false);

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
        propertyName: item.property || item.propertyName || item.property?.name || 'Property',
        propertyId: item.propertyId || '',
        stage: item.status || item.stage || 'NEW',
        budget: item.budget || 1500,
        raw: item,
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
      setApplicationsList(rawList.map(item => {
        const tenantObj = (tenants || []).find(t => t.id === item.tenantId || t.email === item.email);
        const propObj = item.property || (properties || []).find(p => p.id === (item.propertyId || tenantObj?.propertyId));
        const unitObj = item.unit || (units || []).find(u => u.id === (item.unitId || tenantObj?.unitId));

        const applicantName = item.tenantName || item.applicantName || (tenantObj ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim() : '') || (item.email ? item.email.split('@')[0] : 'Applicant');
        const propertyName = propObj?.name || item.propertyName || 'Property';
        const rawUnit = unitObj?.unitNumber || item.unitNumber || 'TBD';
        const unitNumber = String(rawUnit).toLowerCase().startsWith('unit') ? rawUnit : `Unit ${rawUnit}`;

        return {
          id: item.id,
          applicantName,
          email: item.email || tenantObj?.email || '',
          propertyName,
          unitNumber,
          submissionDate: item.submittedDate ? item.submittedDate.split('T')[0] : (item.createdAt ? item.createdAt.split('T')[0] : 'N/A'),
          creditScore: item.creditScore || '720',
          proposedRent: item.proposedRent || item.rentProposed || 1500,
          status: item.status || 'Pending',
          propertyId: item.propertyId || '',
        };
      }));
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
      const [res, tntsRes, propsRes, unitsRes] = await Promise.all([
        apiClient.get('/portal/screening/reports', logout, refreshAccessToken),
        apiClient.get('/tenants', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/properties', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/units', logout, refreshAccessToken).catch(() => null),
      ]);

      const rawList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      const allTenants = Array.isArray(tntsRes?.data) ? tntsRes.data : (Array.isArray(tntsRes) ? tntsRes : (Array.isArray(tntsRes?.tenants) ? tntsRes.tenants : tenants));
      const allProps = Array.isArray(propsRes?.data) ? propsRes.data : (Array.isArray(propsRes) ? propsRes : (Array.isArray(propsRes?.properties) ? propsRes.properties : properties));
      const allUnits = Array.isArray(unitsRes?.data) ? unitsRes.data : (Array.isArray(unitsRes) ? unitsRes : (Array.isArray(unitsRes?.units) ? unitsRes.units : units));

      if (allTenants?.length > 0 && tenants.length === 0) setTenants(allTenants);
      if (allProps?.length > 0 && properties.length === 0) setProperties(allProps);
      if (allUnits?.length > 0 && units.length === 0) setUnits(allUnits);

      setScreeningList(rawList.map(s => {
        const tenantObj = s.tenant || (allTenants || []).find(t => t.id === s.tenantId);
        const tenantFullName = tenantObj
          ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim() || tenantObj.name || ''
          : '';

        const matchedUnit = (allUnits || []).find(u => u.id === (s.unitId || tenantObj?.unitId || tenantObj?.unit?.id));
        const matchedProp = (allProps || []).find(p => p.id === (s.propertyId || tenantObj?.propertyId || matchedUnit?.propertyId || matchedUnit?.property?.id));

        const propObj = s.property || tenantObj?.unit?.property || tenantObj?.property || matchedUnit?.property || matchedProp;
        const unitObj = s.unit || tenantObj?.unit || matchedUnit;

        const applicantName = s.applicantName || s.name || tenantFullName || (s.email ? s.email.split('@')[0] : 'Applicant');
        const email = s.email || s.applicantEmail || tenantObj?.email || 'N/A';
        const propertyName = propObj?.name || s.propertyName || (tenantObj?.propertyName || 'Property');
        const rawUnit = unitObj?.unitNumber || s.unitNumber || (tenantObj?.unitNumber || 'Unassigned');
        const unitNumber = rawUnit && rawUnit !== 'Unassigned'
          ? (String(rawUnit).toLowerCase().startsWith('unit') ? rawUnit : `Unit ${rawUnit}`)
          : 'Unassigned';

        let mappedStatus = s.status || s.screeningStatus || 'Processing';
        if (mappedStatus === 'Completed' || (s.documentUrl && mappedStatus === 'Processing')) {
          mappedStatus = 'Pending Approval';
        }

        return {
          id: s.id,
          applicantName,
          email,
          propertyName,
          unitNumber,
          screeningPackage: s.screeningPackage || 'Basic',
          screeningStatus: mappedStatus,
          raw: s,
        };
      }));
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
        monthlyRent: l.rentAmount !== undefined && l.rentAmount !== null ? Number(l.rentAmount) : Number(l.monthlyRent || l.rent || 0),
        securityDeposit: l.securityDeposit || l.depositAmount || 0,
        status: l.status || 'Active',
        notes: l.terms || l.notes || '',
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

  // 5. Fetch Move Ins (Extracts real tenant and property names matching Web 1:1)
  const fetchMoveIns = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [res, leaseRes] = await Promise.allSettled([
        apiClient.get('/move-ins', logout, refreshAccessToken),
        apiClient.get('/leases', logout, refreshAccessToken),
      ]);

      const rawList = res.status === 'fulfilled' ? (res.value?.data || res.value || []) : [];
      const leases = leaseRes.status === 'fulfilled' ? (leaseRes.value?.data || leaseRes.value || []) : [];

      const registeredLeaseIds = new Set();
      const validRawList = (Array.isArray(rawList) ? rawList : []).filter(m => Boolean(m.lease || m.unit || m.leaseId || m.unitId));
      const mappedMoveIns = validRawList.map(m => {
        const lease = m.lease || {};
        const tenant = lease.tenant || m.tenant || {};
        const unit = m.unit || lease.unit || {};
        const property = unit.property || lease.property || m.property || {};
        
        if (m.leaseId) registeredLeaseIds.add(m.leaseId);
        if (lease.id) registeredLeaseIds.add(lease.id);

        const tenantName = (tenant.firstName || tenant.lastName)
          ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim()
          : (tenant.name || lease.tenantName || m.tenantName || 'Resident');
        const propertyName = property.name || property.address || lease.propertyName || m.propertyName || 'Property';
        const rawUnit = unit.unitNumber || lease.unitNumber || m.unitNumber || 'Unassigned';
        const unitNumber = String(rawUnit).startsWith('Unit') ? String(rawUnit).replace(/^Unit\s*/i, '') : rawUnit;

        return {
          id: m.id,
          tenantName,
          email: tenant.email || m.email || '',
          phone: tenant.phone || m.phone || '',
          propertyName,
          unitNumber,
          rentAmount: lease.rentAmount || lease.monthlyRent || m.rentAmount || '1,500',
          depositAmount: lease.depositAmount || lease.securityDeposit || m.depositAmount || '1,500',
          notes: m.notes || lease.notes || '',
          scheduledDate: m.scheduledDate ? m.scheduledDate.split('T')[0] : 'N/A',
          workflowStatus: m.status || m.workflowStatus || 'Scheduled',
          propertyId: m.propertyId || property.id,
          inspectionId: m.inspectionId || m.inspection?.id,
          lease,
          unit,
          raw: m,
        };
      });

      // Seamlessly merge any Lease that is in Pending_Move_In status
      if (Array.isArray(leases)) {
        leases.forEach((l) => {
          const lStatus = String(l.status || '').trim();
          const isPending = lStatus === 'Pending_Move_In' || lStatus === 'Pending Move In' || lStatus.toLowerCase().includes('pending');
          if (isPending && !registeredLeaseIds.has(l.id)) {
            const tenant = l.tenant || {};
            const unit = l.unit || {};
            const property = unit.property || l.property || {};
            const tenantName = tenant.firstName ? `${tenant.firstName} ${tenant.lastName || ''}`.trim() : (l.tenantName || 'Resident');
            const propertyName = property.name || l.propertyName || 'Property';
            const unitNumber = unit.unitNumber || l.unitNumber || '101';

            mappedMoveIns.push({
              id: `lease-movein-${l.id}`,
              tenantName,
              email: tenant.email || '',
              phone: tenant.phone || '',
              propertyName,
              unitNumber,
              rentAmount: l.rentAmount || l.monthlyRent || '1,500',
              depositAmount: l.depositAmount || l.securityDeposit || '1,500',
              notes: l.notes || '',
              scheduledDate: l.startDate ? l.startDate.split('T')[0] : 'N/A',
              workflowStatus: 'Scheduled',
              propertyId: l.propertyId,
              inspectionId: null,
              lease: l,
              unit: { ...unit, unitNumber },
              raw: { leaseId: l.id, isVirtual: true },
            });
          }
        });
      }

      setMoveInList(mappedMoveIns);
    } catch (e) {
      console.log('Move-ins fetch failed:', e.message);
      setMoveInList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // 6. Fetch Move Outs (Uses same API endpoint path: /move-outs, extracting tenant & property)
  const fetchMoveOuts = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [moveOutsRes, leasesRes] = await Promise.allSettled([
        apiClient.get('/move-outs', logout, refreshAccessToken),
        apiClient.get('/leases', logout, refreshAccessToken),
      ]);

      const rawList = moveOutsRes.status === 'fulfilled' ? (moveOutsRes.value?.data || moveOutsRes.value || []) : [];
      const leases = leasesRes.status === 'fulfilled' ? (leasesRes.value?.data || leasesRes.value || []) : [];

      const existingLeaseIds = new Set(
        rawList.map(m => m.leaseId || m.lease?.id).filter(Boolean)
      );

      leases.forEach(l => {
        const isTerminatedOrEnded = ['Terminated', 'Ended', 'Expired', 'Cancelled'].includes(l.status);
        if (isTerminatedOrEnded && !existingLeaseIds.has(l.id)) {
          rawList.push({
            id: `lease-moveout-${l.id}`,
            leaseId: l.id,
            unitId: l.unitId,
            scheduledDate: l.endDate || l.createdAt || new Date().toISOString(),
            status: 'SCHEDULED',
            workflowStatus: 'Scheduled',
            notes: 'Auto-detected from lease status',
            lease: l,
            unit: l.unit,
            tenant: l.tenant,
          });
        }
      });

      setMoveOutList(rawList.map(m => {
        const lease = m.lease || {};
        const tenant = lease.tenant || m.tenant || {};
        const unit = m.unit || lease.unit || {};
        const property = unit.property || lease.property || m.property || {};

        const tenantName = tenant.firstName ? `${tenant.firstName} ${tenant.lastName || ''}`.trim() : (m.tenantName || 'Resident');
        const propertyName = property.name || property.address || m.propertyName || 'Property';
        const rawUnit = unit.unitNumber || m.unitNumber || 'Unassigned';
        const unitNumber = String(rawUnit).startsWith('Unit') ? String(rawUnit).replace(/^Unit\s*/i, '') : rawUnit;

        return {
          id: m.id,
          tenantName,
          email: tenant.email || m.email || '',
          phone: tenant.phone || m.phone || '',
          propertyName,
          unitNumber,
          rentAmount: lease.rentAmount || lease.monthlyRent || m.rentAmount || '1,500',
          depositAmount: lease.depositAmount || lease.securityDeposit || m.depositAmount || '1,500',
          notes: m.notes || lease.notes || '',
          scheduledDate: m.scheduledDate ? m.scheduledDate.split('T')[0] : 'N/A',
          workflowStatus: m.status || m.workflowStatus || 'Scheduled',
          inspectionId: m.inspectionId || m.inspection?.id,
          lease,
          unit,
          raw: m,
        };
      }));
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
      const res = await apiClient.get('/inspection-templates', logout, refreshAccessToken).catch(() => null);
      let rawList = [];
      if (Array.isArray(res)) {
        rawList = res;
      } else if (Array.isArray(res?.data)) {
        rawList = res.data;
      } else if (Array.isArray(res?.templates)) {
        rawList = res.templates;
      } else if (Array.isArray(res?.data?.templates)) {
        rawList = res.data.templates;
      } else if (Array.isArray(res?.data?.data)) {
        rawList = res.data.data;
      }

      const formatted = rawList.map(t => ({
        id: t.id || t._id,
        name: t.name || t.title || 'Template',
        type: t.type || 'MOVE_IN',
        description: t.description || '',
        rooms: Array.isArray(t.rooms) ? t.rooms : [],
        roomsCount: (Array.isArray(t.rooms) ? t.rooms.length : t.roomsCount) || 4,
        createdBy: t.createdBy || 'manager@apexpm.com',
        active: t.active !== undefined ? t.active : true,
      }));

      const finalList = formatted.length > 0 ? formatted : [
        {
          id: 'standard-movein-template',
          name: 'Move-In Apartment Standard Checklist',
          type: 'MOVE_IN',
          description: 'Standard 4-room structural condition checklist for incoming tenant move-ins.',
          rooms: defaultStarterRooms,
          roomsCount: 4,
          createdBy: 'system@apexpm.com',
          active: true,
        },
        {
          id: 'standard-moveout-template',
          name: 'Move-Out Security Deposit Audit Checklist',
          type: 'MOVE_OUT',
          description: 'Comprehensive security deposit damage assessment and appliance audit.',
          rooms: defaultStarterRooms,
          roomsCount: 4,
          createdBy: 'system@apexpm.com',
          active: true,
        },
      ];

      setTemplatesList(finalList);
      return finalList;
    } catch (e) {
      console.log('Templates fetch failed:', e.message);
      const fallback = [
        {
          id: 'standard-movein-template',
          name: 'Move-In Apartment Standard Checklist',
          type: 'MOVE_IN',
          description: 'Standard 4-room structural condition checklist for incoming tenant move-ins.',
          rooms: defaultStarterRooms,
          roomsCount: 4,
          createdBy: 'system@apexpm.com',
          active: true,
        },
      ];
      setTemplatesList(fallback);
      return fallback;
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  const handleOpenStartInspectionModal = async (type, id) => {
    setSelectedMoveInOrOut({ type, id });
    let list = templatesList;
    if (!list || list.length === 0) {
      list = await fetchTemplates(false);
    }
    if (list && list.length > 0) {
      const activeTpl = list.find(t => t.active !== false) || list[0];
      setStartInspectionTemplateId(activeTpl.id);
    }
    setStartInspectionModalOpen(true);
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
    if (activeTab === 'movein') {
      fetchMoveIns();
      fetchTemplates(false);
    }
    if (activeTab === 'moveout') {
      fetchMoveOuts();
      fetchTemplates(false);
    }
    if (activeTab === 'templates') fetchTemplates();
  }, [activeTab]);

  useEffect(() => {
    fetchOptions();
    fetchTemplates(false);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOptions();
    if (activeTab === 'leads') fetchLeads(false);
    if (activeTab === 'applications') fetchApplications(false);
    if (activeTab === 'screening') fetchScreening(false);
    if (activeTab === 'leases') fetchLeases(false);
    if (activeTab === 'renewals') fetchRenewals(false);
    if (activeTab === 'movein') {
      fetchMoveIns(false);
      fetchTemplates(false);
    }
    if (activeTab === 'moveout') {
      fetchMoveOuts(false);
      fetchTemplates(false);
    }
    if (activeTab === 'templates') fetchTemplates(false);
  };

  // Submissions

  // A. Save new CRM lead (100% Web Aligned)
  const handleSaveLead = async () => {
    setLeadErrors({});

    const firstName = leadFirstName.trim();
    const lastName = leadLastName.trim();
    const fullName = firstName ? `${firstName} ${lastName}`.trim() : leadName.trim();

    const errs = {};
    if (!firstName && !leadName.trim()) {
      errs.firstName = 'First Name is required';
    }
    if (!leadEmail.trim() || !leadEmail.includes('@')) {
      errs.email = 'Valid Email Address is required';
    }
    if (!leadPhone.trim()) {
      errs.phone = 'Phone Number is required';
    }

    if (Object.keys(errs).length > 0) {
      setLeadErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      const chosenProp = properties.find((p) => p.id === leadPropertyId);
      const payload = {
        firstName: firstName || fullName.split(' ')[0],
        lastName: lastName || fullName.split(' ').slice(1).join(' ') || 'Prospect',
        name: fullName || 'Prospect',
        email: leadEmail.trim(),
        phone: leadPhone.trim(),
        propertyId: leadPropertyId || undefined,
        property: chosenProp ? chosenProp.name : undefined,
        budget: parseFloat(leadBudget) || 1600,
        moveInDate: leadMoveInDate || new Date().toISOString().split('T')[0],
        source: leadSource || 'Zillow',
        priority: leadPriority || 'Medium',
        assignedAgent: leadAssignedAgent.trim() || 'Agent Smith',
        notes: leadNotes.trim() || undefined,
        stage: leadStage || 'NEW',
        status: leadStage || 'NEW',
      };

      await apiClient.post('/portal/crm/leads', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Lead Pipeline record created successfully.');
      setRecordLeadOpen(false);
      setLeadFirstName('');
      setLeadLastName('');
      setLeadName('');
      setLeadEmail('');
      setLeadPhone('');
      setLeadPropertyId('');
      setLeadBudget('1600');
      setLeadMoveInDate(new Date().toISOString().split('T')[0]);
      setLeadSource('Zillow');
      setLeadPriority('Medium');
      setLeadAssignedAgent('Agent Smith');
      setLeadNotes('');
      setLeadStage('NEW');
      fetchLeads(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create lead.');
    } finally {
      setSubmitting(false);
    }
  };

  // B2. Convert Lead to Application (Matching Web Workflow)
  const handleConvertLead = async (item) => {
    try {
      setSubmitting(true);
      const resolvedName = item.name || 'Unnamed Lead';
      let resolvedProperty = item.propertyName || item.property || 'Unknown Property';
      let resolvedUnit = 'Unit 101';

      if (resolvedProperty.includes(' · Unit ')) {
        const parts = resolvedProperty.split(' · Unit ');
        resolvedProperty = parts[0];
        resolvedUnit = `Unit ${parts[1]}`;
      } else if (resolvedProperty.includes(' · ')) {
        const parts = resolvedProperty.split(' · ');
        resolvedProperty = parts[0];
        resolvedUnit = parts[1];
      } else if (item.notes && item.notes.includes('Unit:')) {
        const match = item.notes.match(/Unit:\s*([^\s|]+)/i);
        if (match && match[1]) resolvedUnit = match[1].startsWith('Unit') ? match[1] : `Unit ${match[1]}`;
      }

      // 1. Create Application
      await apiClient.post('/applications', {
        tenantName: resolvedName,
        email: item.email,
        propertyName: resolvedProperty,
        unitNumber: resolvedUnit,
        rentProposed: item.budget ? Number(item.budget) : 1500,
        status: 'Pending',
      }, logout, refreshAccessToken);

      // 2. Update Lead status to 'Application Sent'
      await apiClient.post('/portal/crm/leads', {
        id: item.id,
        status: 'Application Sent',
        email: item.email,
        name: resolvedName,
      }, logout, refreshAccessToken);

      Alert.alert('Success', `Lead converted to Application for ${resolvedName}!`);
      fetchLeads(false);
      fetchApplications(false);
      setActiveTab('applications');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to convert lead.');
    } finally {
      setSubmitting(false);
    }
  };

  // B3. Accept Application -> Mark Approved & Auto-Create Screening Check (Matching Web Workflow)
  const handleAcceptApplication = async (appItem) => {
    try {
      setSubmitting(true);
      // 1. Approve application
      await apiClient.put(`/applications/${appItem.id}`, { status: 'Approved' }, logout, refreshAccessToken);

      // 2. Create Screening check in backend
      const names = (appItem.applicantName || 'Applicant').trim().split(' ');
      const first = names[0] || 'Applicant';
      const last = names.slice(1).join(' ') || 'Tenant';
      try {
        await apiClient.post('/portal/screening/reports', {
          email: appItem.email,
          firstName: first,
          lastName: last,
          propertyName: appItem.propertyName,
          unitNumber: appItem.unitNumber,
          status: 'Processing',
        }, logout, refreshAccessToken);
      } catch (e) {
        console.log('Screening auto-create info:', e.message);
      }

      Alert.alert('Success', 'Application accepted & sent to Screening!');
      fetchApplications(false);
      fetchScreening(false);
      setActiveTab('screening');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to accept application.');
    } finally {
      setSubmitting(false);
    }
  };

  // B4. Reject Application
  const handleRejectApplication = async (appItem) => {
    try {
      setSubmitting(true);
      await apiClient.put(`/applications/${appItem.id}`, { status: 'Rejected' }, logout, refreshAccessToken);
      Alert.alert('Success', 'Application rejected.');
      fetchApplications(false);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to reject application.');
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
        const tenantObj = detail.tenant || (tenants || []).find(t => t.id === detail.tenantId);
        const tenantFullName = tenantObj
          ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim() || tenantObj.name || ''
          : '';
        const matchedUnit = (units || []).find(u => u.id === (detail.unitId || tenantObj?.unitId || tenantObj?.unit?.id));
        const matchedProp = (properties || []).find(p => p.id === (detail.propertyId || tenantObj?.propertyId || matchedUnit?.propertyId || matchedUnit?.property?.id));
        const propObj = detail.property || tenantObj?.unit?.property || tenantObj?.property || matchedUnit?.property || matchedProp;
        const unitObj = detail.unit || tenantObj?.unit || matchedUnit;

        const applicantName = detail.applicantName || detail.name || tenantFullName || (detail.email ? detail.email.split('@')[0] : 'Applicant');
        const email = detail.email || detail.applicantEmail || tenantObj?.email || 'N/A';
        const propertyName = propObj?.name || detail.propertyName || (tenantObj?.propertyName || 'Property');
        const rawUnit = unitObj?.unitNumber || detail.unitNumber || (tenantObj?.unitNumber || 'Unassigned');
        const unitNumber = rawUnit && rawUnit !== 'Unassigned'
          ? (String(rawUnit).toLowerCase().startsWith('unit') ? rawUnit : `Unit ${rawUnit}`)
          : 'Unassigned';

        setSelectedScreening({
          id: detail.id,
          applicantName,
          email,
          propertyName,
          unitNumber,
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
    if (!screeningDob.trim()) {
      Alert.alert('Validation Error', 'DOB is required.');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Save details (dob, authorized) and advance status to 'Processing' matching Web
      await apiClient.put(`/portal/screening/reports/${selectedScreening.id}`, {
        dob: screeningDob.trim(),
        ssn: screeningSsn ? screeningSsn.trim() : undefined,
        authorized: true,
        status: 'Processing',
      }, logout, refreshAccessToken);

      // 2. Upload document file if selected
      if (screeningDocFile) {
        await apiClient.uploadFile(
          `/portal/screening/reports/${selectedScreening.id}/upload`,
          screeningDocFile,
          {
            fieldName: 'document',
            fileName: screeningDocFile.name,
          },
          logout,
          refreshAccessToken
        );
      }

      Alert.alert('Success', 'Screening details verified. Status moved to Pending Approval.', [
        {
          text: 'Review & Decide',
          onPress: () => handleUpdateScreeningStatus(selectedScreening.id, 'Pending Approval'),
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
        status: 'Pending_Move_In',
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
    if (!item) return;
    Alert.alert(
      'Skip Inspection',
      `Auto-complete Move In for ${item.tenantName || 'Resident'}? This will set Unit to Occupied and Lease to Active.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip & Complete',
          onPress: async () => {
            try {
              setSkipActionLoadingId(item.id);
              const isVirtual = String(item.id).startsWith('lease-movein-') || item.raw?.isVirtual;
              const realLeaseId = isVirtual
                ? String(item.id).replace('lease-movein-', '')
                : (item.lease?.id || item.raw?.leaseId);
              const targetUnitId = item.unit?.id || item.lease?.unitId || item.raw?.unitId;

              let completed = false;

              // 1. Try real moveIn complete if we have a real moveIn ID
              if (item.id && !String(item.id).startsWith('lease-movein-')) {
                try {
                  await apiClient.post(`/move-ins/${item.id}/complete`, {}, logout, refreshAccessToken);
                  completed = true;
                } catch (apiErr) {
                  console.log('MoveIn complete endpoint note:', apiErr.message);
                }
              }

              // 2. If it was virtual or complete endpoint failed, ensure moveIn is created & completed or fallback
              if (!completed && realLeaseId) {
                try {
                  const createdRes = await apiClient.post('/move-ins', {
                    leaseId: realLeaseId,
                    unitId: targetUnitId,
                    scheduledDate: item.scheduledDate || new Date().toISOString(),
                    status: 'SCHEDULED',
                  }, logout, refreshAccessToken);
                  const newId = createdRes?.data?.id || createdRes?.id;
                  if (newId) {
                    await apiClient.post(`/move-ins/${newId}/complete`, {}, logout, refreshAccessToken);
                    completed = true;
                  }
                } catch (createErr) {
                  console.log('Virtual moveIn creation note:', createErr.message);
                }
              }

              // 3. ALWAYS guarantee Lease is Active and Unit is Occupied (matching Web exactly)
              if (realLeaseId) {
                await apiClient.put(`/leases/${realLeaseId}`, { status: 'Active' }, logout, refreshAccessToken).catch(() => {});
              }
              if (targetUnitId) {
                await apiClient.put(`/units/${targetUnitId}`, { status: 'Occupied' }, logout, refreshAccessToken).catch(() => {});
              }

              Alert.alert('Success', 'Move In auto-completed successfully!');
              await Promise.allSettled([
                fetchMoveIns(false),
                fetchLeases(false),
              ]);
            } catch (e) {
              console.log('handleSkipMoveIn failed:', e.message);
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
              let completedSuccessfully = false;

              // 1. If real move-out record, try direct completion
              if (item.id && !item.id.startsWith('lease-moveout-')) {
                try {
                  const compRes = await apiClient.post(`/move-outs/${item.id}/complete`, {}, logout, refreshAccessToken);
                  if (compRes) completedSuccessfully = true;
                } catch (apiErr) {
                  console.log('Direct move-out completion failed, proceeding to fallback:', apiErr?.message);
                }
              }

              // 2. Identify lease, unit, and tenant
              const realLeaseId = (item.lease?.id || item.leaseId || item.id || '').replace('lease-moveout-', '');
              const targetUnitId = item.unit?.id || item.unitId || item.lease?.unitId;
              const targetTenantId = item.tenant?.id || item.lease?.tenantId;

              if (realLeaseId) {
                // If MoveOut record was missing in backend, create & complete it
                try {
                  const createdRes = await apiClient.post('/move-outs', {
                    leaseId: realLeaseId,
                    unitId: targetUnitId,
                    scheduledDate: new Date().toISOString(),
                    notes: 'Direct Move Out completion via Mobile App',
                  }, logout, refreshAccessToken).catch(() => null);

                  const moveOutId = createdRes?.data?.id || createdRes?.id;
                  if (moveOutId) {
                    await apiClient.post(`/move-outs/${moveOutId}/complete`, {}, logout, refreshAccessToken).catch(() => {});
                  }
                } catch (createErr) {}

                // Directly ensure Lease is Ended
                await apiClient.put(`/leases/${realLeaseId}`, { status: 'Ended' }, logout, refreshAccessToken).catch(() => {});
                // Directly ensure Unit is Vacant
                if (targetUnitId) {
                  await apiClient.put(`/units/${targetUnitId}`, { status: 'Vacant' }, logout, refreshAccessToken).catch(() => {});
                }
                // Directly ensure Tenant is Inactive
                if (targetTenantId) {
                  await apiClient.put(`/tenants/${targetTenantId}`, { status: 'Inactive', unitId: null }, logout, refreshAccessToken).catch(() => {});
                }
                completedSuccessfully = true;
              }

              if (completedSuccessfully) {
                Alert.alert('Success', 'Move Out auto-completed successfully! Lease closed and unit is now vacant.');
                await Promise.allSettled([
                  fetchMoveOuts(false),
                  fetchLeases(false),
                  fetchOptions(),
                ]);
              } else {
                throw new Error('Could not identify target lease to complete move-out.');
              }
            } catch (e) {
              console.log('handleSkipMoveOut failed:', e.message);
              Alert.alert('Error', e.message || 'Failed to complete Move Out.');
            } finally {
              setSkipActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // Workflow Details & Damage Review Actions (Matching Web Photo 4)
  const handleOpenWorkflowDetails = async (type, item) => {
    setSelectedWorkflowItem(item);
    setWorkflowType(type);
    setWorkflowModalOpen(true);
    setWorkflowDamageItems([]);
    setDamageChargeInputs({});

    if (type === 'moveout') {
      try {
        setLoadingWorkflowDetail(true);
        const res = await apiClient.get(`/move-outs/${item.id}`, logout, refreshAccessToken);
        const full = res?.data || res;
        if (full) {
          const lease = full.lease || {};
          const tenant = lease.tenant || full.tenant || {};
          const unit = full.unit || lease.unit || {};
          const property = unit.property || lease.property || full.property || {};

          const inspections = Array.isArray(full.inspections) ? full.inspections : (full.inspection ? [full.inspection] : []);
          const latestInsp = inspections[0] || null;

          setSelectedWorkflowItem(prev => ({
            ...prev,
            ...full,
            inspections,
            latestInspection: latestInsp,
            inspectionId: latestInsp?.id || full.inspectionId,
            inspectionCode: latestInsp?.inspectionNumber || latestInsp?.code || (latestInsp?.id ? `MO-${String(latestInsp.id).slice(-8).toUpperCase()}` : (full.id ? `MO-${String(full.id).slice(-8).toUpperCase()}` : 'MO-INSP')),
            inspectionStatus: latestInsp?.status || 'COMPLETED',
            templateName: latestInsp?.templateName || (latestInsp?.template ? latestInsp.template.name : (full.templateName || 'astoria3')),
            templateVersion: latestInsp?.templateVersion || (latestInsp?.template ? latestInsp.template.version : 1),
            tenantName: tenant.firstName ? `${tenant.firstName} ${tenant.lastName || ''}`.trim() : prev?.tenantName,
            propertyName: property.name || property.address || prev?.propertyName,
            unitNumber: unit.unitNumber || prev?.unitNumber,
            rentAmount: lease.rentAmount || lease.monthlyRent || prev?.rentAmount || '1,500',
            depositAmount: lease.depositAmount || lease.securityDeposit || prev?.depositAmount || '1,500',
            email: tenant.email || prev?.email || '',
            phone: tenant.phone || prev?.phone || '',
            scheduledDate: full.scheduledDate ? full.scheduledDate.split('T')[0] : prev?.scheduledDate,
            workflowStatus: full.status || full.workflowStatus || prev?.workflowStatus,
          }));

          // Gather damaged items from inspections
          const damages = [];
          inspections.forEach(ins => {
            (ins.rooms || []).forEach(room => {
              (room.items || []).forEach(it => {
                if (it.condition === 'POOR' || it.condition === 'FAIR') {
                  damages.push({
                    id: it.id,
                    roomName: room.name,
                    label: it.label || it.name || 'Room Item',
                    condition: it.condition,
                    notes: it.notes || '',
                    chargeAmount: it.chargeAmount || 50,
                  });
                }
              });
            });
          });

          // Also check direct damageItems if any
          if (Array.isArray(full.damageItems) && full.damageItems.length > 0) {
            full.damageItems.forEach(di => {
              if (!damages.some(d => d.id === di.id || d.id === di.inspectionItemId)) {
                damages.push({
                  id: di.id,
                  roomName: di.roomName || 'Unit Area',
                  label: di.itemLabel || 'Damaged Fixture',
                  condition: di.condition || 'POOR',
                  notes: di.notes || '',
                  chargeAmount: di.chargeAmount || 50,
                });
              }
            });
          }

          setWorkflowDamageItems(damages);
        }
      } catch (err) {
        console.log('Error fetching move out detail:', err.message);
      } finally {
        setLoadingWorkflowDetail(false);
      }
    } else if (type === 'movein') {
      try {
        setLoadingWorkflowDetail(true);
        if (item.id && !String(item.id).startsWith('lease-movein-')) {
          const res = await apiClient.get(`/move-ins/${item.id}`, logout, refreshAccessToken);
          const full = res?.data || res;
          if (full) {
            const lease = full.lease || {};
            const tenant = lease.tenant || full.tenant || {};
            const unit = full.unit || lease.unit || {};
            const property = unit.property || lease.property || full.property || {};
            const inspections = Array.isArray(full.inspections) ? full.inspections : (full.inspection ? [full.inspection] : []);
            const latestInsp = inspections[0];

            setSelectedWorkflowItem(prev => ({
              ...prev,
              ...full,
              tenantName: tenant.firstName ? `${tenant.firstName} ${tenant.lastName || ''}`.trim() : prev?.tenantName,
              propertyName: property.name || property.address || prev?.propertyName,
              unitNumber: unit.unitNumber || prev?.unitNumber,
              rentAmount: lease.rentAmount || lease.monthlyRent || prev?.rentAmount || '1,500',
              depositAmount: lease.depositAmount || lease.securityDeposit || prev?.depositAmount || '1,500',
              email: tenant.email || prev?.email || '',
              phone: tenant.phone || prev?.phone || '',
              scheduledDate: full.scheduledDate ? full.scheduledDate.split('T')[0] : prev?.scheduledDate,
              workflowStatus: full.status || full.workflowStatus || prev?.workflowStatus,
              inspections,
              inspectionId: latestInsp?.id || prev?.inspectionId,
              inspectionCode: latestInsp?.inspectionNumber || latestInsp?.code || (latestInsp?.id ? `MI-${String(latestInsp.id).slice(-8).toUpperCase()}` : null),
              templateName: latestInsp?.templateName || latestInsp?.template?.name || 'New (v1)',
              inspectionStatus: latestInsp?.status || 'COMPLETED',
            }));
          }
        }
      } catch (err) {
        console.log('Error fetching move in detail:', err.message);
      } finally {
        setLoadingWorkflowDetail(false);
      }
    }
  };

  const handleCompleteMoveIn = async (item) => {
    if (!item) return;
    try {
      setSubmittingWorkflowAction(true);
      const isVirtual = String(item.id).startsWith('lease-movein-') || item.raw?.isVirtual;
      const realLeaseId = isVirtual
        ? String(item.id).replace('lease-movein-', '')
        : (item.lease?.id || item.raw?.leaseId);
      const targetUnitId = item.unit?.id || item.lease?.unitId || item.raw?.unitId;

      let completed = false;

      // 1. Try real moveIn complete endpoint
      if (item.id && !String(item.id).startsWith('lease-movein-')) {
        try {
          await apiClient.post(`/move-ins/${item.id}/complete`, {}, logout, refreshAccessToken);
          completed = true;
        } catch (apiErr) {
          console.log('MoveIn complete endpoint note:', apiErr.message);
        }
      }

      // 2. If virtual or complete failed, ensure created & completed
      if (!completed && realLeaseId) {
        try {
          const createdRes = await apiClient.post('/move-ins', {
            leaseId: realLeaseId,
            unitId: targetUnitId,
            scheduledDate: item.scheduledDate || new Date().toISOString(),
            status: 'SCHEDULED',
          }, logout, refreshAccessToken);
          const newId = createdRes?.data?.id || createdRes?.id;
          if (newId) {
            await apiClient.post(`/move-ins/${newId}/complete`, {}, logout, refreshAccessToken);
            completed = true;
          }
        } catch (createErr) {
          console.log('Virtual moveIn creation note:', createErr.message);
        }
      }

      // 3. Guarantee lease is Active and Unit is Occupied
      if (realLeaseId) {
        await apiClient.put(`/leases/${realLeaseId}`, { status: 'Active' }, logout, refreshAccessToken).catch(() => {});
      }
      if (targetUnitId) {
        await apiClient.put(`/units/${targetUnitId}`, { status: 'Occupied' }, logout, refreshAccessToken).catch(() => {});
      }

      Alert.alert('Move In Finalized!', 'Move in completed and keys handed to resident. Lease is now Active.');
      setWorkflowModalOpen(false);
      await Promise.allSettled([
        fetchMoveIns(false),
        fetchLeases(false),
      ]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to complete Move In.');
    } finally {
      setSubmittingWorkflowAction(false);
    }
  };

  const handleSubmitDamageReview = async () => {
    if (!selectedWorkflowItem) return;
    try {
      setSubmittingWorkflowAction(true);
      const itemsPayload = workflowDamageItems.map(item => ({
        inspectionItemId: item.id,
        roomName: item.roomName,
        itemLabel: item.label,
        condition: item.condition,
        notes: item.notes,
        decision: (damageChargeInputs[item.id] !== undefined ? (Number(damageChargeInputs[item.id]) > 0 ? 'CHARGE_TENANT' : 'NO_CHARGE') : 'CHARGE_TENANT'),
        chargeAmount: Number(damageChargeInputs[item.id] !== undefined ? damageChargeInputs[item.id] : (item.chargeAmount || 50)),
      }));

      const totalCharges = itemsPayload.reduce((acc, curr) => acc + curr.chargeAmount, 0);
      const originalDeposit = Number(String(selectedWorkflowItem.depositAmount || 1500).replace(/[^0-9.]/g, '')) || 1500;
      const refundAmount = Math.max(0, originalDeposit - totalCharges);

      await apiClient.post(`/move-outs/${selectedWorkflowItem.id}/review-damage`, { items: itemsPayload }, logout, refreshAccessToken);
      await apiClient.post(`/move-outs/${selectedWorkflowItem.id}/deposit-summary`, {
        originalDeposit,
        totalCharges,
        refundAmount,
        notes: 'Damage assessment finalized via Mobile App',
        approvedBy: 'Property Manager',
      }, logout, refreshAccessToken);

      Alert.alert('Success', `Damage review submitted!\nTotal Damage Charges: $${totalCharges}\nDeposit Refund: $${refundAmount}`);
      setWorkflowModalOpen(false);
      fetchMoveOuts(false);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to submit damage review');
    } finally {
      setSubmittingWorkflowAction(false);
    }
  };

  const handleFinalizeMoveOut = async () => {
    if (!selectedWorkflowItem) return;
    try {
      setSubmittingWorkflowAction(true);
      if (selectedWorkflowItem.id && !selectedWorkflowItem.id.startsWith('lease-moveout-')) {
        await apiClient.post(`/move-outs/${selectedWorkflowItem.id}/complete`, {}, logout, refreshAccessToken).catch(() => {});
      }
      const realLeaseId = (selectedWorkflowItem.lease?.id || selectedWorkflowItem.leaseId || selectedWorkflowItem.id || '').replace('lease-moveout-', '');
      const targetUnitId = selectedWorkflowItem.unit?.id || selectedWorkflowItem.unitId || selectedWorkflowItem.lease?.unitId;
      const targetTenantId = selectedWorkflowItem.tenant?.id || selectedWorkflowItem.lease?.tenantId;
      if (realLeaseId) {
        await apiClient.put(`/leases/${realLeaseId}`, { status: 'Ended' }, logout, refreshAccessToken).catch(() => {});
        if (targetUnitId) await apiClient.put(`/units/${targetUnitId}`, { status: 'Vacant' }, logout, refreshAccessToken).catch(() => {});
        if (targetTenantId) await apiClient.put(`/tenants/${targetTenantId}`, { status: 'Inactive', unitId: null }, logout, refreshAccessToken).catch(() => {});
      }
      Alert.alert('Success', 'Move Out completed successfully! Lease closed and unit is now vacant.');
      setWorkflowModalOpen(false);
      await Promise.allSettled([
        fetchMoveOuts(false),
        fetchLeases(false),
        fetchOptions(),
      ]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to finalize move out');
    } finally {
      setSubmittingWorkflowAction(false);
    }
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

  // G. Template Builder Handlers (Matching Web InspectionTemplatesPage 1:1)
  const handleOpenCreateTemplate = () => {
    setEditingTemplateId(null);
    setTemplateName('');
    setTemplateType('MOVE_IN');
    setTemplateDescription('');
    setTemplateBuilderRooms(JSON.parse(JSON.stringify(defaultStarterRooms)));
    setRecordTemplateOpen(true);
  };

  const handleOpenEditTemplate = async (item) => {
    try {
      setLoading(true);
      let fullTemplate = item;
      try {
        const res = await apiClient.get(`/inspection-templates/${item.id}`, logout, refreshAccessToken);
        if (res?.data || res) {
          fullTemplate = res.data || res;
        }
      } catch (err) {
        console.log('Using list item template data:', err?.message);
      }

      setEditingTemplateId(item.id);
      setTemplateName(fullTemplate.name || fullTemplate.title || item.name || '');
      setTemplateType(fullTemplate.type || item.type || 'MOVE_IN');
      setTemplateDescription(fullTemplate.description || item.description || '');

      const incomingRooms = fullTemplate.rooms || item.rooms;
      if (Array.isArray(incomingRooms) && incomingRooms.length > 0) {
        setTemplateBuilderRooms(incomingRooms.map((r, rIdx) => ({
          id: r.id,
          name: r.name || `Room ${rIdx + 1}`,
          sortOrder: r.sortOrder ?? rIdx,
          items: Array.isArray(r.items) && r.items.length > 0 ? r.items.map((it, itIdx) => ({
            id: it.id,
            label: it.label || it.name || '',
            required: it.required !== undefined ? it.required : true,
            sortOrder: it.sortOrder ?? itIdx,
          })) : [
            { label: 'Flooring', required: true, sortOrder: 0 },
            { label: 'Walls & Ceiling', required: true, sortOrder: 1 },
          ]
        })));
      } else {
        setTemplateBuilderRooms(JSON.parse(JSON.stringify(defaultStarterRooms)));
      }
      setRecordTemplateOpen(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to load inspection template details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Validation Error', 'Template Name is required.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        name: templateName.trim(),
        type: templateType,
        description: templateDescription.trim(),
        active: true,
        rooms: templateBuilderRooms.map((r, rIdx) => ({
          name: r.name.trim() || `Room ${rIdx + 1}`,
          sortOrder: rIdx,
          items: (r.items || []).map((it, itIdx) => ({
            label: it.label.trim() || 'Item',
            required: it.required !== false,
            sortOrder: itIdx,
          }))
        }))
      };

      if (editingTemplateId) {
        await apiClient.put(`/inspection-templates/${editingTemplateId}`, payload, logout, refreshAccessToken);
        Alert.alert('Success', 'Inspection template updated successfully.');
      } else {
        await apiClient.post('/inspection-templates', payload, logout, refreshAccessToken);
        Alert.alert('Success', 'Inspection checklist template created.');
      }
      setRecordTemplateOpen(false);
      setEditingTemplateId(null);
      fetchTemplates(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save template.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTemplateRoom = () => {
    setTemplateBuilderRooms(prev => [
      ...prev,
      {
        name: `Room ${prev.length + 1}`,
        sortOrder: prev.length,
        items: [
          { label: 'Walls & Ceiling', required: true, sortOrder: 0 },
          { label: 'Flooring', required: true, sortOrder: 1 },
          { label: 'Electrical & Lighting', required: true, sortOrder: 2 },
        ],
      }
    ]);
  };

  const handleDuplicateTemplateRoom = (index) => {
    const roomToDuplicate = templateBuilderRooms[index];
    if (!roomToDuplicate) return;
    const newRoom = {
      ...roomToDuplicate,
      name: `${roomToDuplicate.name} (Copy)`,
      sortOrder: templateBuilderRooms.length,
      items: (roomToDuplicate.items || []).map(it => ({ ...it })),
    };
    setTemplateBuilderRooms(prev => [...prev, newRoom]);
  };

  const handleRemoveTemplateRoom = (index) => {
    setTemplateBuilderRooms(prev => prev.filter((_, i) => i !== index));
  };

  const handleRoomNameChange = (index, newName) => {
    setTemplateBuilderRooms(prev => prev.map((r, i) => i === index ? { ...r, name: newName } : r));
  };

  const handleAddTemplateItem = (roomIndex) => {
    setTemplateBuilderRooms(prev => prev.map((r, rIdx) => {
      if (rIdx !== roomIndex) return r;
      return {
        ...r,
        items: [
          ...(r.items || []),
          { label: 'New Checklist Item', required: true, sortOrder: (r.items || []).length }
        ]
      };
    }));
  };

  const handleRemoveTemplateItem = (roomIndex, itemIndex) => {
    setTemplateBuilderRooms(prev => prev.map((r, rIdx) => {
      if (rIdx !== roomIndex) return r;
      return {
        ...r,
        items: (r.items || []).filter((_, i) => i !== itemIndex)
      };
    }));
  };

  const handleTemplateItemChange = (roomIndex, itemIndex, field, value) => {
    setTemplateBuilderRooms(prev => prev.map((r, rIdx) => {
      if (rIdx !== roomIndex) return r;
      return {
        ...r,
        items: (r.items || []).map((item, i) => i === itemIndex ? { ...item, [field]: value } : item)
      };
    }));
  };

  // H. Delete Inspection Template
  const handleDeleteTemplate = (item) => {
    Alert.alert(
      'Delete Inspection Template',
      `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await apiClient.delete(`/inspection-templates/${item.id}`, logout, refreshAccessToken);
              Alert.alert('Success', 'Inspection checklist template deleted successfully.');
              fetchTemplates(true);
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to delete template.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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
    if (activePicker === 'leadSource') return leadSource === val;
    if (activePicker === 'leadPriority') return leadPriority === val;
    if (activePicker === 'renewalTerm') return Number(renewalTermMonths) === Number(val);
    return false;
  };

  const getPickerOptions = () => {
    switch (activePicker) {
      case 'leadSource':
        return ['Zillow', 'Apartments.com', 'Website', 'Referral', 'Walk-in', 'Craigslist', 'Other'].map(s => ({ value: s, label: s }));
      case 'leadPriority':
        return ['Low', 'Medium', 'High', 'Urgent'].map(p => ({ value: p, label: p }));
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
        return filteredUnits.map(u => {
          const isOccupied = u.status?.toLowerCase() === 'occupied' || Boolean(u.isOccupied);
          const statusText = u.status || (isOccupied ? 'Occupied' : 'Vacant');
          const occupiedWarning = isOccupied ? ' (Occupied)' : ' (Vacant)';
          return {
            value: u.id,
            disabled: isOccupied,
            isOccupied,
            label: `Unit ${u.unitNumber || u.name || u.id} - ${statusText}${occupiedWarning}`
          };
        });
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
      const chosenUnit = units.find(u => u.id === val);
      if (chosenUnit?.status?.toLowerCase() === 'occupied' || chosenUnit?.isOccupied) {
        Alert.alert('Unit Occupied', 'Unit is currently occupied. Screening requests are disabled for occupied units.');
        return;
      }
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
    if (activePicker === 'leadSource') setLeadSource(val);
    if (activePicker === 'leadPriority') setLeadPriority(val);
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
    if (!item) return false;
    if (leadStageFilter && leadStageFilter !== 'ALL') {
      const stageNorm = String(item.stage || '').toUpperCase().replace(/[\s-]/g, '_');
      const filterNorm = leadStageFilter.toUpperCase().replace(/[\s-]/g, '_');
      if (stageNorm !== filterNorm) return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const text = `${item.name || ''} ${item.email || ''} ${item.propertyName || ''} ${item.stage || ''}`.toLowerCase();
    return text.includes(q);
  });

  const filteredApps = applicationsList.filter(item => {
    if (!item) return false;
    if (appStatusFilter && appStatusFilter !== 'ALL') {
      const statusNorm = String(item.status || '').toUpperCase().replace(/[\s-]/g, '_');
      const filterNorm = appStatusFilter.toUpperCase().replace(/[\s-]/g, '_');
      if (statusNorm !== filterNorm) return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const text = `${item.applicantName || ''} ${item.propertyName || ''} ${item.unitNumber || ''} ${item.status || ''}`.toLowerCase();
    return text.includes(q);
  });

  const filteredScreening = screeningList.filter(item => {
    if (!item) return false;
    if (screeningStatusFilter && screeningStatusFilter !== 'ALL') {
      const statusNorm = String(item.screeningStatus || '').toUpperCase().replace(/[\s-]/g, '_');
      const filterNorm = screeningStatusFilter.toUpperCase().replace(/[\s-]/g, '_');
      if (statusNorm !== filterNorm) return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const text = `${item.applicantName || ''} ${item.email || ''} ${item.propertyName || ''} ${item.unitNumber || ''} ${item.screeningStatus || ''}`.toLowerCase();
    return text.includes(q);
  });

  const filteredLeases = leasesList.filter(item => {
    if (!item) return false;
    if (leaseStatusFilter && leaseStatusFilter !== 'ALL') {
      const statusNorm = String(item.status || '').toUpperCase().replace(/[\s-]/g, '_');
      const filterNorm = leaseStatusFilter.toUpperCase().replace(/[\s-]/g, '_');
      if (statusNorm !== filterNorm) return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const text = `${item.tenantName || ''} ${item.propertyName || ''} ${item.unitNumber || ''} ${item.leaseNumber || ''} ${item.monthlyRent || ''} ${item.status || ''}`.toLowerCase();
    return text.includes(q);
  });

  const filteredRenewals = renewalsList.filter(item => {
    if (!item) return false;
    if (renewalStatusFilter && renewalStatusFilter !== 'ALL') {
      const statusNorm = String(item.status || '').toUpperCase().replace(/[\s-]/g, '_');
      const filterNorm = renewalStatusFilter.toUpperCase().replace(/[\s-]/g, '_');
      if (statusNorm !== filterNorm) return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const text = `${item.tenantName || ''} ${item.propertyName || ''} ${item.unitNumber || ''} ${item.status || ''}`.toLowerCase();
    return text.includes(q);
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

  const activeFilterValue = 
    activeTab === 'leads' ? leadStageFilter :
    activeTab === 'applications' ? appStatusFilter :
    activeTab === 'screening' ? screeningStatusFilter :
    activeTab === 'leases' ? leaseStatusFilter :
    activeTab === 'renewals' ? renewalStatusFilter :
    activeTab === 'movein' ? moveInFilter :
    activeTab === 'moveout' ? moveOutFilter : 'ALL';
  const hasActiveLeasingFilter = activeFilterValue && activeFilterValue !== 'ALL';

  const handleClearActiveFilter = () => {
    if (activeTab === 'leads') setLeadStageFilter('ALL');
    else if (activeTab === 'applications') setAppStatusFilter('ALL');
    else if (activeTab === 'screening') setScreeningStatusFilter('ALL');
    else if (activeTab === 'leases') setLeaseStatusFilter('ALL');
    else if (activeTab === 'renewals') setRenewalStatusFilter('ALL');
    else if (activeTab === 'movein') setMoveInFilter('ALL');
    else if (activeTab === 'moveout') setMoveOutFilter('ALL');
  };

  const getFilterLabel = () => {
    if (activeTab === 'leads') {
      const opt = leadStageOptions.find(o => o.value === leadStageFilter);
      return opt ? `Stage: ${opt.label}` : `Stage: ${leadStageFilter}`;
    }
    if (activeTab === 'applications') {
      const opt = appStatusOptions.find(o => o.value === appStatusFilter);
      return opt ? `Status: ${opt.label}` : `Status: ${appStatusFilter}`;
    }
    if (activeTab === 'screening') {
      const opt = screeningStatusOptions.find(o => o.value === screeningStatusFilter);
      return opt ? `Status: ${opt.label}` : `Status: ${screeningStatusFilter}`;
    }
    if (activeTab === 'leases') {
      const opt = leaseStatusOptions.find(o => o.value === leaseStatusFilter);
      return opt ? `Status: ${opt.label}` : `Status: ${leaseStatusFilter}`;
    }
    if (activeTab === 'renewals') {
      const opt = renewalStatusOptions.find(o => o.value === renewalStatusFilter);
      return opt ? `Status: ${opt.label}` : `Status: ${renewalStatusFilter}`;
    }
    if (activeTab === 'movein') {
      const opt = moveInStatusFilters.find(o => o.value === moveInFilter);
      return opt ? `Status: ${opt.label}` : `Status: ${moveInFilter}`;
    }
    if (activeTab === 'moveout') {
      const opt = moveOutStatusFilters.find(o => o.value === moveOutFilter);
      return opt ? `Status: ${opt.label}` : `Status: ${moveOutFilter}`;
    }
    return '';
  };

  return (
    <View style={styles.mainWrapper}>
      {/* FIXED HEADER WITH SWITCHER - Fixed minHeight layout prevents content shifting */}
      <View style={[styles.fixedHeader, { paddingTop: 16 }]}>
        <View style={styles.headerTextContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            {!!onNavigate && (
              <TouchableOpacity
                onPress={() => onNavigate('dashboard')}
                style={{ marginRight: 8, padding: 4 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
            <Text style={[styles.title, { flex: 1, marginBottom: 0 }]} allowFontScaling={false}>
              {activeTab === 'leads' ? 'Leads Pipeline' : activeTab === 'applications' ? 'Background Applications' : activeTab === 'screening' ? 'Tenant Screening & Applications' : activeTab === 'leases' ? 'Lease Agreements' : activeTab === 'renewals' ? 'Lease Renewals Directory' : activeTab === 'movein' ? 'Move In Workflow Registry' : activeTab === 'moveout' ? 'Move Out Workflow Registry' : 'Inspection Templates'}
            </Text>
          </View>
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

        {/* Search & Filter controls */}
        <View style={[styles.searchBarRow, { marginTop: 12, gap: 8 }]}>
          <View style={[styles.searchContainer, { marginRight: 0 }]}>
            <Ionicons name="search-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search details..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#64748b" />
              </TouchableOpacity>
            ) : null}
          </View>
          {activeTab !== 'templates' && (
            <TouchableOpacity
              style={[
                styles.filterBtn,
                hasActiveLeasingFilter && styles.filterBtnActive,
              ]}
              onPress={() => setFilterModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="filter"
                size={18}
                color={hasActiveLeasingFilter ? '#FFFFFF' : colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Active Filter Pill */}
        {hasActiveLeasingFilter && (
          <View style={styles.activeFiltersRow}>
            <TouchableOpacity
              style={styles.activePill}
              onPress={handleClearActiveFilter}
              activeOpacity={0.7}
            >
              <Text style={styles.activePillText} allowFontScaling={false}>
                {getFilterLabel()}
              </Text>
              <Ionicons name="close" size={14} color="#38bdf8" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearActiveFilter} style={styles.clearFiltersBtn}>
              <Text style={styles.clearFiltersText} allowFontScaling={false}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

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
          <TouchableOpacity style={styles.dedicatedAddBtn} onPress={handleOpenCreateTemplate}>
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
                          <Text style={styles.recordSubText} allowFontScaling={false}>{item.email}</Text>
                        </View>
                        <View style={[styles.badge, { borderColor: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                          <Text style={[styles.badgeText, { color: '#a855f7' }]} allowFontScaling={false}>{item.stage}</Text>
                        </View>
                      </View>
                      
                      {/* Highlighted Property & Unit & Budget */}
                      <View style={{
                        backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.08)' : 'rgba(56, 189, 248, 0.1)',
                        borderRadius: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        marginVertical: 6,
                        borderWidth: 1,
                        borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.2)' : 'rgba(56, 189, 248, 0.3)',
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                            <Ionicons name="home" size={15} color={isDarkMode ? '#38bdf8' : '#0284c7'} style={{ marginRight: 6 }} />
                            <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '800' }} numberOfLines={1}>
                              {item.propertyName || 'Property / Unit Pending'}
                            </Text>
                          </View>
                          {item.budget ? (
                            <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '800' }}>
                              ${Number(item.budget).toLocaleString()}<Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: 'normal' }}>/mo</Text>
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.divider} />
                      <View style={styles.rowBetween}>
                        <Text style={styles.recordSubText} allowFontScaling={false}>Phone Number</Text>
                        <Text style={styles.recordSubTextVal} allowFontScaling={false}>{item.phone || 'N/A'}</Text>
                      </View>
                      {item.stage !== 'Application Sent' && item.stage !== 'Lease Signed' && (
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(56, 189, 248, 0.12)',
                            borderWidth: 1,
                            borderColor: 'rgba(56, 189, 248, 0.3)',
                            borderRadius: 8,
                            paddingVertical: 8,
                            marginTop: 10,
                          }}
                          onPress={() => handleConvertLead(item)}
                          disabled={submitting}
                        >
                          <Ionicons name="arrow-forward-circle-outline" size={14} color="#38bdf8" style={{ marginRight: 6 }} />
                          <Text style={{ color: '#38bdf8', fontWeight: '800', fontSize: 11.5 }} allowFontScaling={false}>
                            Convert to Application
                          </Text>
                        </TouchableOpacity>
                      )}
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
                    const statusColor = item.status === 'Approved' ? '#10b981' : item.status === 'Declined' || item.status === 'Rejected' ? '#ef4444' : '#f59e0b';
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

                        {/* Quick Accept & Reject matching Web */}
                        {item.status === 'Pending' && (
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
                              onPress={() => handleRejectApplication(item)}
                              disabled={submitting}
                            >
                              <Ionicons name="close-circle-outline" size={13} color="#ef4444" style={{ marginRight: 4 }} />
                              <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 11.5 }} allowFontScaling={false}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{
                                flex: 1.5,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                borderWidth: 1,
                                borderColor: 'rgba(16, 185, 129, 0.3)',
                                borderRadius: 8,
                                paddingVertical: 8,
                              }}
                              onPress={() => handleAcceptApplication(item)}
                              disabled={submitting}
                            >
                              <Ionicons name="checkmark-circle-outline" size={13} color="#10b981" style={{ marginRight: 4 }} />
                              <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 11.5 }} allowFontScaling={false}>Accept & Screen</Text>
                            </TouchableOpacity>
                          </View>
                        )}
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
                    const statusColor = item.screeningStatus === 'Approved' || item.screeningStatus === 'Completed' ? '#10b981' : item.screeningStatus === 'Declined' ? '#ef4444' : '#f59e0b';
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
                    <TouchableOpacity
                      key={item.id}
                      style={styles.recordsCard}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedLease(item);
                        setLeaseDetailModalOpen(true);
                      }}
                    >
                      <View style={styles.rowBetween}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={styles.recordLabel} allowFontScaling={false}>{item.tenantName}</Text>
                          <Text style={styles.recordSubText} allowFontScaling={false}>{item.propertyName} · Unit {item.unitNumber}</Text>
                        </View>
                        <View style={[styles.badge, { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                          <Text style={[styles.badgeText, { color: '#10b981' }]} allowFontScaling={false}>{item.status || 'Active'}</Text>
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
                    </TouchableOpacity>
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
                            style={[
                              styles.smallActionBtn,
                              {
                                backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#eff6ff',
                                borderWidth: 1,
                                borderColor: isDarkMode ? '#38bdf8' : '#2563eb',
                                flex: 1,
                                minWidth: 70
                              }
                            ]}
                            onPress={() => {
                              fetchOptions();
                              setEditingRenewal(item);
                              setRenewalNewRent(String(item.newRent));
                              setRenewalTermMonths(item.termMonths || 12);
                              setEditRenewalModalOpen(true);
                            }}
                          >
                            <Ionicons name="create-outline" size={13} color={isDarkMode ? "#38bdf8" : "#2563eb"} style={{ marginRight: 4 }} />
                            <Text style={[styles.smallActionText, { color: isDarkMode ? "#38bdf8" : "#2563eb", fontWeight: '800' }]} allowFontScaling={false}>Edit</Text>
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
                            onPress={() => handleOpenWorkflowDetails('movein', item)}
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

                          {/* Review Damage Items Action matching Web Photo 4 */}
                          {(normStatus === 'INSPECTION_COMPLETED' || normStatus === 'DAMAGE_REVIEW') && (
                            <TouchableOpacity
                              style={[styles.smallActionBtn, { backgroundColor: '#38bdf8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                              onPress={() => handleOpenWorkflowDetails('moveout', item)}
                            >
                              <Ionicons name="document-text-outline" size={15} color="#0f172a" style={{ marginRight: 4 }} />
                              <Text style={[styles.smallActionText, { color: '#0f172a', fontWeight: '800' }]} allowFontScaling={false}>
                                Review Damage Items
                              </Text>
                            </TouchableOpacity>
                          )}

                          {/* View Workflow Action: Always present on every row matching Web */}
                          <TouchableOpacity
                            style={[styles.smallActionBtn, { backgroundColor: 'rgba(56, 189, 248, 0.12)', flex: isScheduled ? 1 : undefined, minWidth: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                            onPress={() => handleOpenWorkflowDetails('moveout', item)}
                          >
                            <Ionicons name="git-network-outline" size={14} color="#38bdf8" style={{ marginRight: 4 }} />
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
                            <Text style={[styles.badgeText, { color: '#38bdf8' }]} allowFontScaling={false}>
                              {(item.type || 'INSPECTION ASSIGN').replace('_', ' ').toUpperCase()}
                            </Text>
                          </View>
                          <Ionicons name="checkbox-outline" size={16} color="#10b981" />
                        </View>

                        <Text style={styles.tmplTitle} allowFontScaling={false}>{item.name}</Text>
                        <Text style={styles.tmplDesc} allowFontScaling={false}>{item.description || 'No description provided.'}</Text>

                        <View style={styles.divider} />

                        <View style={styles.rowBetween}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="layers-outline" size={12} color="#cbd5e1" style={{ marginRight: 4 }} />
                            <Text style={styles.tmplMetaText} allowFontScaling={false}>{item.roomsCount || item.rooms?.length || 4} Rooms</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.tmplMetaLabel} allowFontScaling={false}>Created By:</Text>
                            <Text style={styles.tmplMetaText} allowFontScaling={false}>{item.createdBy}</Text>
                          </View>
                        </View>

                        <View style={styles.tmplActionRow}>
                          <TouchableOpacity
                            style={[
                              styles.tmplActionBtn,
                              { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#eff6ff', borderWidth: 1, borderColor: isDarkMode ? '#38bdf8' : '#2563eb' }
                            ]}
                            onPress={() => handleOpenEditTemplate(item)}
                          >
                            <Ionicons name="create-outline" size={13} color={isDarkMode ? "#38bdf8" : "#2563eb"} style={{ marginRight: 4 }} />
                            <Text style={[styles.tmplActionBtnText, { color: isDarkMode ? "#38bdf8" : "#2563eb", fontWeight: '700' }]} allowFontScaling={false}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.tmplActionBtn,
                              { backgroundColor: isDarkMode ? '#ef444415' : '#fef2f2', borderWidth: 1, borderColor: isDarkMode ? '#ef444440' : '#fecaca' }
                            ]}
                            onPress={() => handleDeleteTemplate(item)}
                          >
                            <Ionicons name="trash-outline" size={13} color="#ef4444" style={{ marginRight: 4 }} />
                            <Text style={[styles.tmplActionBtnText, { color: '#ef4444', fontWeight: '700' }]} allowFontScaling={false}>Delete</Text>
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

      {/* --- LEASING FILTER MODAL --- */}
      <Modal visible={filterModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '75%', width: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 10, paddingTop: 2 }}>
                <Text style={styles.modalTitle} allowFontScaling={false}>
                  Filter {activeTab === 'leads' ? 'Leads' : activeTab === 'applications' ? 'Applications' : activeTab === 'screening' ? 'Screening' : activeTab === 'leases' ? 'Leases' : activeTab === 'renewals' ? 'Renewals' : activeTab === 'movein' ? 'Move In' : activeTab === 'moveout' ? 'Move Out' : 'List'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFilterModalOpen(false)}>
                <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {activeTab === 'leads' && leadStageOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.filterChip, leadStageFilter === opt.value && styles.filterChipActive]}
                    onPress={() => setLeadStageFilter(opt.value)}
                  >
                    <Text style={[styles.filterChipText, leadStageFilter === opt.value && styles.filterChipTextActive]} allowFontScaling={false}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                {activeTab === 'applications' && appStatusOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.filterChip, appStatusFilter === opt.value && styles.filterChipActive]}
                    onPress={() => setAppStatusFilter(opt.value)}
                  >
                    <Text style={[styles.filterChipText, appStatusFilter === opt.value && styles.filterChipTextActive]} allowFontScaling={false}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                {activeTab === 'screening' && screeningStatusOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.filterChip, screeningStatusFilter === opt.value && styles.filterChipActive]}
                    onPress={() => setScreeningStatusFilter(opt.value)}
                  >
                    <Text style={[styles.filterChipText, screeningStatusFilter === opt.value && styles.filterChipTextActive]} allowFontScaling={false}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                {activeTab === 'leases' && leaseStatusOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.filterChip, leaseStatusFilter === opt.value && styles.filterChipActive]}
                    onPress={() => setLeaseStatusFilter(opt.value)}
                  >
                    <Text style={[styles.filterChipText, leaseStatusFilter === opt.value && styles.filterChipTextActive]} allowFontScaling={false}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                {activeTab === 'renewals' && renewalStatusOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.filterChip, renewalStatusFilter === opt.value && styles.filterChipActive]}
                    onPress={() => setRenewalStatusFilter(opt.value)}
                  >
                    <Text style={[styles.filterChipText, renewalStatusFilter === opt.value && styles.filterChipTextActive]} allowFontScaling={false}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                {activeTab === 'movein' && moveInStatusFilters.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.filterChip, moveInFilter === opt.value && styles.filterChipActive]}
                    onPress={() => setMoveInFilter(opt.value)}
                  >
                    <Text style={[styles.filterChipText, moveInFilter === opt.value && styles.filterChipTextActive]} allowFontScaling={false}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                {activeTab === 'moveout' && moveOutStatusFilters.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.filterChip, moveOutFilter === opt.value && styles.filterChipActive]}
                    onPress={() => setMoveOutFilter(opt.value)}
                  >
                    <Text style={[styles.filterChipText, moveOutFilter === opt.value && styles.filterChipTextActive]} allowFontScaling={false}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder, gap: 10 }}>
              <TouchableOpacity
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder }}
                onPress={handleClearActiveFilter}
              >
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }} allowFontScaling={false}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#38bdf8', alignItems: 'center' }}
                onPress={() => setFilterModalOpen(false)}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }} allowFontScaling={false}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- 1. RECORD CRM LEAD MODAL --- */}
      <Modal visible={recordLeadOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 10, paddingTop: 2 }}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>Add Prospect Lead</Text>
                </View>
                <TouchableOpacity onPress={() => setRecordLeadOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalForm}
                contentContainerStyle={{ paddingBottom: 160 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets={true}
              >
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel} allowFontScaling={false}>FIRST NAME *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Alice"
                      placeholderTextColor="#64748b"
                      value={leadFirstName}
                      onChangeText={setLeadFirstName}
                    />
                    {leadErrors.firstName && <Text style={styles.errorLabel} allowFontScaling={false}>{leadErrors.firstName}</Text>}
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel} allowFontScaling={false}>LAST NAME</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Smith"
                      placeholderTextColor="#64748b"
                      value={leadLastName}
                      onChangeText={setLeadLastName}
                    />
                  </View>
                </View>

                <Text style={styles.formLabel} allowFontScaling={false}>EMAIL ADDRESS *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="alice.smith@gmail.com"
                  placeholderTextColor="#64748b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={leadEmail}
                  onChangeText={setLeadEmail}
                />
                {leadErrors.email && <Text style={styles.errorLabel} allowFontScaling={false}>{leadErrors.email}</Text>}

                <Text style={styles.formLabel} allowFontScaling={false}>PHONE NUMBER *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="(512) 555-0155"
                  placeholderTextColor="#64748b"
                  keyboardType="phone-pad"
                  value={leadPhone}
                  onChangeText={setLeadPhone}
                />
                {leadErrors.phone && <Text style={styles.errorLabel} allowFontScaling={false}>{leadErrors.phone}</Text>}

                <View style={styles.formRow}>
                  <View style={[styles.formCol, { flex: 1.2 }]}>
                    <Text style={styles.formLabel} allowFontScaling={false}>INTERESTED PROPERTY</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => setActivePicker(activePicker === 'property' ? null : 'property')}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false} numberOfLines={1}>
                        {leadPropertyId ? properties.find(p => p.id === leadPropertyId)?.name : 'Select Property...'}
                      </Text>
                      <Ionicons name={activePicker === 'property' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                    {renderInlinePicker('property')}
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel} allowFontScaling={false}>MONTHLY BUDGET ($)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="1600"
                      placeholderTextColor="#64748b"
                      keyboardType="numeric"
                      value={leadBudget}
                      onChangeText={setLeadBudget}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel} allowFontScaling={false}>MOVE-IN DATE</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => setShowLeadDatePicker(true)}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false} numberOfLines={1}>
                        {leadMoveInDate || 'Select Date'}
                      </Text>
                      <Ionicons name="calendar-outline" size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                    <CustomDatePicker
                      visible={showLeadDatePicker}
                      value={leadMoveInDate}
                      onSelect={(date) => {
                        setShowLeadDatePicker(false);
                        if (date) setLeadMoveInDate(date);
                      }}
                      onClose={() => setShowLeadDatePicker(false)}
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel} allowFontScaling={false}>ACQUISITION SOURCE</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => setActivePicker(activePicker === 'leadSource' ? null : 'leadSource')}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false} numberOfLines={1}>{leadSource}</Text>
                      <Ionicons name={activePicker === 'leadSource' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                    {renderInlinePicker('leadSource')}
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel} allowFontScaling={false}>PRIORITY</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => setActivePicker(activePicker === 'leadPriority' ? null : 'leadPriority')}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false}>{leadPriority}</Text>
                      <Ionicons name={activePicker === 'leadPriority' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                    {renderInlinePicker('leadPriority')}
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel} allowFontScaling={false}>PIPELINE STAGE</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => setActivePicker(activePicker === 'stage' ? null : 'stage')}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false}>{leadStage}</Text>
                      <Ionicons name={activePicker === 'stage' ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                    {renderInlinePicker('stage')}
                  </View>
                </View>

                <Text style={styles.formLabel} allowFontScaling={false}>ASSIGNED AGENT</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Agent Smith"
                  placeholderTextColor="#64748b"
                  value={leadAssignedAgent}
                  onChangeText={setLeadAssignedAgent}
                />

                <Text style={styles.formLabel} allowFontScaling={false}>CLIENT PREFERENCES / NOTES</Text>
                <TextInput
                  style={[styles.formInput, { height: 75, textAlignVertical: 'top' }]}
                  placeholder="E.g. Prefers ground floor, quiet neighborhood..."
                  placeholderTextColor="#64748b"
                  multiline
                  numberOfLines={3}
                  value={leadNotes}
                  onChangeText={setLeadNotes}
                />
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
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- 2. REQUEST TENANT SCREENING CHECK MODAL (100% Web Aligned) --- */}
      <Modal visible={recordScreeningOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 10, paddingTop: 2 }}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>Request Tenant Screening Check</Text>
                </View>
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
                {renderInlinePicker('package')}

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
                {renderInlinePicker('paymentResp')}
              </ScrollView>

              <View style={styles.screeningModalActions}>
                {/* 1st: Send Invitation Button on Top */}
                <TouchableOpacity
                  style={[styles.sendInviteBtn, submitting && { opacity: 0.5 }]}
                  onPress={handleRequestScreening}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={15} color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.sendInviteBtnText} allowFontScaling={false}>Send Invitation</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* 2nd: Bottom Row with Cancel & Skip Screening (Green) */}
                <View style={styles.screeningBottomRow}>
                  <TouchableOpacity
                    style={styles.screeningCancelBtn}
                    onPress={() => {
                      setActivePicker(null);
                      setRecordScreeningOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.screeningCancelBtnText} allowFontScaling={false}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.skipBtn, submitting && { opacity: 0.5 }]}
                    onPress={handleSkipScreening}
                    disabled={submitting}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="play-forward-outline" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.skipBtnText} allowFontScaling={false}>Skip Screening</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- 3. CREATE LEASE MODAL --- */}
      <Modal visible={recordLeaseOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 10, paddingTop: 2 }}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>Create Lease Agreement</Text>
                </View>
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
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- 3.5. EDIT RENEWAL TERMS MODAL --- */}
      <Modal visible={editRenewalModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 10, paddingTop: 2 }}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>Update Renewal Terms</Text>
                </View>
                <TouchableOpacity onPress={() => { setActivePicker(null); setEditRenewalModalOpen(false); }}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.formLabel} allowFontScaling={false}>RESIDENT & UNIT</Text>
                <Text style={[styles.formPickerText, { marginBottom: 12, color: colors.textPrimary, fontWeight: '700' }]} allowFontScaling={false}>
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
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- 6. CREATE / EDIT INSPECTION TEMPLATE DESIGNER MODAL (Web parity 1:1) --- */}
      <Modal visible={recordTemplateOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 10, paddingTop: 4 }}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>
                    {editingTemplateId ? 'Modify Inspection Template' : 'Create Inspection Template'}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, lineHeight: 15 }} allowFontScaling={false}>
                    Define rooms and checklist items (stoves, floors, etc.)
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setRecordTemplateOpen(false); setEditingTemplateId(null); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.formLabel} allowFontScaling={false}>TEMPLATE NAME</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="E.g. Standard 2 Bedroom Apartment"
                  placeholderTextColor="#64748b"
                  value={templateName}
                  onChangeText={setTemplateName}
                />

                <Text style={styles.formLabel} allowFontScaling={false}>INSPECTION CATEGORY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {[
                    { label: 'Move In', value: 'MOVE_IN' },
                    { label: 'Move Out', value: 'MOVE_OUT' },
                    { label: 'Routine', value: 'ROUTINE' },
                    { label: 'Inspection Assign', value: 'INSPECTION_ASSIGN' },
                  ].map((cat) => {
                    const isSelected = templateType === cat.value;
                    return (
                      <TouchableOpacity
                        key={cat.value}
                        style={[
                          styles.filterPill,
                          isSelected && styles.filterPillActive,
                          { paddingHorizontal: 12, paddingVertical: 6 }
                        ]}
                        onPress={() => setTemplateType(cat.value)}
                      >
                        <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive, { fontSize: 11.5 }]} allowFontScaling={false}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.formLabel} allowFontScaling={false}>DESCRIPTION (OPTIONAL)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Brief summary of template scope..."
                  placeholderTextColor="#64748b"
                  value={templateDescription}
                  onChangeText={setTemplateDescription}
                />

                <View style={[styles.rowBetween, { marginTop: 14, marginBottom: 10 }]}>
                  <Text style={[styles.formLabel, { marginTop: 0, marginBottom: 0 }]} allowFontScaling={false}>
                    CHECKLIST CONFIGURATION ({templateBuilderRooms.length} ROOMS)
                  </Text>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
                    onPress={handleAddTemplateRoom}
                  >
                    <Ionicons name="add-circle-outline" size={14} color="#0284c7" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 11.5, color: '#0284c7', fontWeight: '800' }} allowFontScaling={false}>
                      Add Room
                    </Text>
                  </TouchableOpacity>
                </View>

                {templateBuilderRooms.map((room, rIdx) => (
                  <View key={rIdx} style={styles.roomCard}>
                    <View style={styles.roomHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        <Ionicons name="home-outline" size={15} color="#38bdf8" style={{ marginRight: 6 }} />
                        <TextInput
                          style={styles.roomInput}
                          value={room.name}
                          onChangeText={(text) => handleRoomNameChange(rIdx, text)}
                          placeholder="Room name..."
                          placeholderTextColor="#94a3b8"
                        />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          style={{ padding: 4 }}
                          onPress={() => handleAddTemplateItem(rIdx)}
                          title="Add Item"
                        >
                          <Ionicons name="add-circle" size={18} color="#10b981" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ padding: 4 }}
                          onPress={() => handleDuplicateTemplateRoom(rIdx)}
                          title="Duplicate Room"
                        >
                          <Ionicons name="copy-outline" size={16} color="#38bdf8" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ padding: 4 }}
                          onPress={() => handleRemoveTemplateRoom(rIdx)}
                          title="Delete Room"
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={{ paddingVertical: 4 }}>
                      {(room.items || []).length === 0 ? (
                        <View style={{ padding: 12, alignItems: 'center' }}>
                          <Text style={{ fontSize: 11, color: colors.textMuted }} allowFontScaling={false}>
                            No items yet. Tap + to add floors, stoves, etc.
                          </Text>
                        </View>
                      ) : (
                        (room.items || []).map((item, itIdx) => (
                          <View key={itIdx} style={styles.builderItemRow}>
                            <TextInput
                              style={styles.builderItemInput}
                              value={item.label}
                              onChangeText={(val) => handleTemplateItemChange(rIdx, itIdx, 'label', val)}
                              placeholder="E.g. Flooring, Stove, Walls..."
                              placeholderTextColor="#94a3b8"
                            />
                            <TouchableOpacity
                              style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}
                              onPress={() => handleTemplateItemChange(rIdx, itIdx, 'required', !item.required)}
                            >
                              <Ionicons
                                name={item.required ? "checkbox" : "square-outline"}
                                size={16}
                                color={item.required ? "#38bdf8" : "#94a3b8"}
                              />
                              <Text style={{ fontSize: 10, color: colors.textMuted, marginLeft: 3, fontWeight: '700' }} allowFontScaling={false}>
                                Req
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleRemoveTemplateItem(rIdx, itIdx)}
                              style={{ padding: 4 }}
                            >
                              <Ionicons name="close" size={16} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setRecordTemplateOpen(false);
                    setEditingTemplateId(null);
                  }}
                >
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
                  onPress={handleSaveTemplate}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#0f172a" />
                  ) : (
                    <Text style={styles.submitBtnText} allowFontScaling={false}>
                      {editingTemplateId ? 'Update Template' : 'Save Template'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- BACKGROUND SCREENING DETAILS MODAL --- */}
      <Modal visible={!!selectedScreening} animationType="slide" transparent onRequestClose={() => setSelectedScreening(null)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setSelectedScreening(null)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 10, paddingTop: 2 }}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>Screening Check Details</Text>
                </View>
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
                    {/* 1. APPLICANT HERO IDENTITY CARD */}
                    <View style={{
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                      borderRadius: 16,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                      marginBottom: 12,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                          <View style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                            borderWidth: 1,
                            borderColor: 'rgba(56, 189, 248, 0.3)',
                          }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#38bdf8' }}>
                              {(selectedScreening.applicantName || 'Applicant').split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
                              {selectedScreening.applicantName}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                              <Ionicons name="mail-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                              <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
                                {selectedScreening.email}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View style={[
                          styles.badge,
                          {
                            borderColor: selectedScreening.screeningStatus === 'Approved' ? '#10b981' : selectedScreening.screeningStatus === 'Declined' ? '#ef4444' : '#f59e0b',
                            backgroundColor: selectedScreening.screeningStatus === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : selectedScreening.screeningStatus === 'Declined' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                          }
                        ]}>
                          <Text style={{
                            color: selectedScreening.screeningStatus === 'Approved' ? '#10b981' : selectedScreening.screeningStatus === 'Declined' ? '#ef4444' : '#f59e0b',
                            fontSize: 11,
                            fontWeight: '800'
                          }}>
                            {selectedScreening.screeningStatus}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* PENDING APPROVAL NOTICE BANNER */}
                    {(selectedScreening.screeningStatus === 'Pending Approval' || selectedScreening.screeningStatus === 'Completed' || Boolean(selectedScreening.documentUrl)) && selectedScreening.screeningStatus !== 'Approved' && selectedScreening.screeningStatus !== 'Declined' && (
                      <View style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderColor: 'rgba(245, 158, 11, 0.3)',
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#f59e0b' }} allowFontScaling={false}>
                            Pending Approval (Decision Required)
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} allowFontScaling={false}>
                            Verification documents uploaded. Accept (Approve) or Reject (Decline) this applicant below.
                          </Text>
                        </View>
                        <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#f59e0b' }} allowFontScaling={false}>Action Required</Text>
                        </View>
                      </View>
                    )}

                    {/* 2. PROPERTY, UNIT & TENANCY DETAILS CARD */}
                    <View style={{
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                      borderRadius: 16,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                      marginBottom: 12,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#38bdf8', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
                        APPLIED HOME & TENANCY DETAILS
                      </Text>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9', gap: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginTop: 1 }}>
                          <Ionicons name="home-outline" size={15} color={colors.textSecondary} style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }} allowFontScaling={false}>Property & Unit</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '800', color: colors.textPrimary, textAlign: 'right', lineHeight: 18 }} allowFontScaling={false}>
                          {selectedScreening.propertyName}{selectedScreening.unitNumber ? ` · ${selectedScreening.unitNumber}` : ''}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9', gap: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
                          <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }} allowFontScaling={false}>Date of Birth (DOB)</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.textPrimary, textAlign: 'right' }} allowFontScaling={false}>
                          {selectedScreening.dob || '—'}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, gap: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
                          <Ionicons name="shield-outline" size={15} color={colors.textSecondary} style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }} allowFontScaling={false}>Screening Tier</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#38bdf8', textAlign: 'right' }} allowFontScaling={false}>
                          {selectedScreening.screeningPackage || 'Standard Verification'}
                        </Text>
                      </View>
                    </View>

                    {/* 3. VERIFICATION DOCUMENTS (REAL ONLY) */}
                    <View style={{
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                      borderRadius: 16,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                      marginBottom: 8,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#38bdf8', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
                        IDENTITY VERIFICATION DOCUMENT
                      </Text>

                      {selectedScreening.documentUrl ? (
                        <View style={{
                          backgroundColor: 'rgba(56, 189, 248, 0.08)',
                          borderRadius: 12,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: 'rgba(56, 189, 248, 0.25)',
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <Ionicons name="document-text" size={24} color="#38bdf8" style={{ marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
                                {selectedScreening.documentName || 'Identity_Verification_Document.pdf'}
                              </Text>
                              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                                Uploaded by applicant for identity verification
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#38bdf8',
                              borderRadius: 8,
                              paddingVertical: 9,
                            }}
                            onPress={() => Linking.openURL(selectedScreening.documentUrl)}
                          >
                            <Ionicons name="cloud-download-outline" size={15} color="#0f172a" style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>
                              View & Download Document
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.08)',
                          borderRadius: 12,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: 'rgba(245, 158, 11, 0.2)',
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}>
                          <Ionicons name="alert-circle-outline" size={20} color="#f59e0b" style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 11.5, color: '#f59e0b', fontWeight: '600', flex: 1 }}>
                            No verification document uploaded yet by the applicant.
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </ScrollView>
              )}

              {/* Modal actions matching Web parity */}
              {!loadingDetail && selectedScreening && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  borderTopWidth: 1,
                  borderTopColor: colors.cardBorder,
                  paddingTop: 14,
                  marginTop: 6,
                }}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { paddingHorizontal: 16, paddingVertical: 11, minWidth: 70, alignItems: 'center' }]}
                    onPress={() => setSelectedScreening(null)}
                  >
                    <Text style={styles.cancelBtnText} allowFontScaling={false}>Close</Text>
                  </TouchableOpacity>

                  {/* Action buttons: When Pending Approval or documents submitted => Decline / Approve */}
                  {(() => {
                    const isSubmitted = Boolean(selectedScreening.documentUrl || selectedScreening.authorized || selectedScreening.dob);
                    const isPendingDecision =
                      (selectedScreening.screeningStatus === 'Pending Approval' ||
                       selectedScreening.screeningStatus === 'Completed' ||
                       isSubmitted) &&
                      selectedScreening.screeningStatus !== 'Approved' &&
                      selectedScreening.screeningStatus !== 'Declined';

                    if (isPendingDecision) {
                      return (
                        <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                          <TouchableOpacity 
                            style={[styles.submitBtn, { flex: 1, backgroundColor: '#ef4444', paddingVertical: 11 }]} 
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
                                <Ionicons name="close-circle-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                                <Text style={[styles.submitBtnText, { color: '#ffffff', fontSize: 12 }]} allowFontScaling={false}>Decline</Text>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.submitBtn, { flex: 1.2, backgroundColor: '#10b981', paddingVertical: 11 }]} 
                            onPress={() => {
                              Alert.alert('Approve Applicant', 'Do you want to accept and approve this applicant?', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Approve', onPress: () => handleUpdateScreeningStatus(selectedScreening.id, 'Approved') },
                              ]);
                            }}
                            disabled={submitting}
                          >
                            {submitting ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-circle-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                                <Text style={[styles.submitBtnText, { color: '#ffffff', fontSize: 12 }]} allowFontScaling={false}>Approve</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    }

                    if (selectedScreening.screeningStatus === 'Pending' || selectedScreening.screeningStatus === 'Pending Documents' || selectedScreening.screeningStatus === 'Processing') {
                      return (
                        <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                          <TouchableOpacity 
                            style={[styles.submitBtn, { backgroundColor: '#f59e0b', flex: 1, paddingVertical: 11, paddingHorizontal: 6 }]} 
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
                            <Ionicons name="play-forward-outline" size={13} color="#0f172a" style={{ marginRight: 4 }} />
                            <Text style={[styles.submitBtnText, { color: '#0f172a', fontSize: 11.5 }]} allowFontScaling={false} numberOfLines={1}>
                              Skip & Approve
                            </Text>
                          </TouchableOpacity>
                          <View style={[styles.submitBtn, { backgroundColor: isDarkMode ? '#334155' : '#cbd5e1', flex: 1.2, paddingVertical: 11, opacity: 0.7 }]}>
                            <Ionicons name="time-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                            <Text style={[styles.submitBtnText, { color: '#64748b', fontSize: 11 }]} allowFontScaling={false} numberOfLines={1}>
                              Waiting for Tenant
                            </Text>
                          </View>
                        </View>
                      );
                    }

                    return null;
                  })()}

                  {/* Status Banner for Approved */}
                  {selectedScreening.screeningStatus === 'Approved' && (
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16, 185, 129, 0.12)', borderRadius: 10, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 12 }} allowFontScaling={false}>Applicant Approved</Text>
                    </View>
                  )}

                  {/* Status Banner for Declined */}
                  {selectedScreening.screeningStatus === 'Declined' && (
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.12)', borderRadius: 10, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                      <Ionicons name="close-circle" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 12 }} allowFontScaling={false}>Application Declined</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </Modal>

      {/* --- START INSPECTION TEMPLATE SELECTOR MODAL --- */}
      <Modal visible={startInspectionModalOpen} animationType="slide" transparent onRequestClose={() => setStartInspectionModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setStartInspectionModalOpen(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 10, paddingTop: 2 }}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>Select Inspection Template</Text>
                </View>
                <TouchableOpacity onPress={() => setStartInspectionModalOpen(false)}>
                  <Ionicons name="close" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalForm}>
                <Text style={styles.formLabel} allowFontScaling={false}>CHOOSE TEMPLATE *</Text>
                {templatesList.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 14 }}>
                    <Text style={[styles.formPickerText, { color: '#ef4444', textAlign: 'center', marginBottom: 10 }]} allowFontScaling={false}>
                      No templates available. Please create a template first under the "Checklist Templates" tab.
                    </Text>
                    <TouchableOpacity
                      onPress={() => fetchTemplates(false)}
                      style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(56, 189, 248, 0.15)', borderRadius: 8, borderWidth: 1, borderColor: '#38bdf8' }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#38bdf8' }} allowFontScaling={false}>Reload Templates</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 220, marginVertical: 10 }} showsVerticalScrollIndicator={true}>
                    {templatesList.map((t) => {
                      const isSelected = startInspectionTemplateId === t.id;
                      return (
                        <TouchableOpacity
                          key={t.id}
                          style={[
                            styles.pickerOptionRow,
                            { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, marginVertical: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                            isSelected && { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 1, borderColor: '#38bdf8' }
                          ]}
                          onPress={() => setStartInspectionTemplateId(t.id)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text 
                              style={[
                                styles.pickerOptionText, 
                                isSelected && { color: '#38bdf8', fontWeight: '800' }
                              ]} 
                              allowFontScaling={false}
                            >
                              {t.name}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} allowFontScaling={false}>
                              {t.roomsCount || 4} rooms · {t.createdBy || 'Apex PM'}
                            </Text>
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={20} color="#38bdf8" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
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
        </Modal>

      {/* --- LEASE COVENANT DETAILS MODAL --- */}
      <Modal visible={leaseDetailModalOpen && !!selectedLease} animationType="slide" transparent onRequestClose={() => setLeaseDetailModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setLeaseDetailModalOpen(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 10, paddingTop: 2 }}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>Lease Agreement Details</Text>
                </View>
                <TouchableOpacity onPress={() => setLeaseDetailModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {selectedLease && (
                <ScrollView style={{ marginBottom: 10 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.modalForm}>
                    <Text style={styles.formLabel} allowFontScaling={false}>RESIDENT / TENANT</Text>
                    <Text style={[styles.formPickerText, { fontSize: 15, fontWeight: '800' }]} allowFontScaling={false}>{selectedLease.tenantName}</Text>

                    <Text style={styles.formLabel} allowFontScaling={false}>PROPERTY & UNIT</Text>
                    <Text style={styles.formPickerText} allowFontScaling={false}>
                      {selectedLease.propertyName} · Unit {selectedLease.unitNumber}
                    </Text>

                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.formLabel} allowFontScaling={false}>START DATE</Text>
                        <Text style={styles.formPickerText} allowFontScaling={false}>{selectedLease.startDate}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.formLabel} allowFontScaling={false}>END DATE</Text>
                        <Text style={styles.formPickerText} allowFontScaling={false}>{selectedLease.endDate}</Text>
                      </View>
                    </View>

                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.formLabel} allowFontScaling={false}>MONTHLY BASE RENT</Text>
                        <Text style={[styles.formPickerText, { color: '#38bdf8', fontWeight: '800', fontSize: 16 }]} allowFontScaling={false}>
                          ${Number(selectedLease.monthlyRent).toLocaleString()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.formLabel} allowFontScaling={false}>SECURITY DEPOSIT</Text>
                        <Text style={[styles.formPickerText, { fontWeight: '800' }]} allowFontScaling={false}>
                          ${Number(selectedLease.securityDeposit || 0).toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.formLabel} allowFontScaling={false}>STATUS</Text>
                    <View style={[styles.badge, { alignSelf: 'flex-start', marginTop: 4, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                      <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }} allowFontScaling={false}>
                        {selectedLease.status || 'Active'}
                      </Text>
                    </View>

                    {selectedLease.notes ? (
                      <>
                        <Text style={styles.formLabel} allowFontScaling={false}>TERMS & COVENANTS</Text>
                        <Text style={[styles.formPickerText, { color: colors.textSecondary, fontSize: 12 }]} allowFontScaling={false}>
                          {selectedLease.notes}
                        </Text>
                      </>
                    ) : null}
                  </View>
                </ScrollView>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: '#38bdf8', flex: 1 }]}
                  onPress={() => setLeaseDetailModalOpen(false)}
                >
                  <Text style={styles.submitBtnText} allowFontScaling={false}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      {/* --- 8. WORKFLOW DETAILS & DAMAGE REVIEW MODAL (Matching Web Photo 4 1:1) --- */}
      <Modal visible={workflowModalOpen && !!selectedWorkflowItem} animationType="slide" transparent onRequestClose={() => setWorkflowModalOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <TouchableWithoutFeedback onPress={() => setWorkflowModalOpen(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 10, paddingTop: 4 }}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>
                    {workflowType === 'moveout' ? 'Move Out Workflow' : 'Move In Workflow'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 4, lineHeight: 15 }} allowFontScaling={false}>
                    {selectedWorkflowItem?.tenantName} · {selectedWorkflowItem?.propertyName} (Unit {selectedWorkflowItem?.unitNumber})
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setWorkflowModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {selectedWorkflowItem && (
                <ScrollView
                  style={{ marginBottom: 10 }}
                  contentContainerStyle={{ paddingBottom: 160 }}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  automaticallyAdjustKeyboardInsets={true}
                >
                  {/* Timeline Stepper matching Web Photo 4 */}
                  <View style={{ backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(241, 245, 249, 0.9)', padding: 12, borderRadius: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.cardBorder }}>
                    <Text style={[styles.formLabel, { marginTop: 0, marginBottom: 10, color: '#38bdf8' }]} allowFontScaling={false}>
                      WORKFLOW PROGRESSION TIMELINE
                    </Text>
                    {workflowType === 'moveout' ? (
                      (() => {
                        const norm = (selectedWorkflowItem.workflowStatus || '').toUpperCase().replace(/[\s-]/g, '_');
                        const isDoneScheduled = norm !== 'CANCELLED';
                        const isDoneInsp = norm === 'INSPECTION_COMPLETED' || norm === 'DAMAGE_REVIEW' || norm === 'READY_FOR_COMPLETION' || norm === 'COMPLETED';
                        const isDoneDamage = norm === 'READY_FOR_COMPLETION' || norm === 'COMPLETED';
                        const isDoneCompleted = norm === 'COMPLETED';
                        const isActiveDamage = norm === 'INSPECTION_COMPLETED' || norm === 'DAMAGE_REVIEW';

                        const steps = [
                          { label: 'LEASE ACTIVE', done: true },
                          { label: 'SCHEDULED', done: isDoneScheduled },
                          { label: 'INSPECTION', done: isDoneInsp },
                          { label: 'DAMAGE REVIEW', done: isDoneDamage, active: isActiveDamage },
                          { label: 'MOVE OUT COMPLETE', done: isDoneCompleted },
                        ];

                        return (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                            {steps.map((st, i) => (
                              <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ alignItems: 'center' }}>
                                  <View style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 13,
                                    backgroundColor: st.done ? '#10b981' : st.active ? '#38bdf8' : (isDarkMode ? '#334155' : '#cbd5e1'),
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 4,
                                  }}>
                                    {st.done ? (
                                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                                    ) : (
                                      <Text style={{ fontSize: 11, fontWeight: '800', color: st.active ? '#0f172a' : '#94a3b8' }} allowFontScaling={false}>
                                        {i + 1}
                                      </Text>
                                    )}
                                  </View>
                                  <Text style={{ fontSize: 9, fontWeight: '800', color: st.done ? '#10b981' : st.active ? '#38bdf8' : colors.textSecondary }} allowFontScaling={false}>
                                    {st.label}
                                  </Text>
                                </View>
                                {i < steps.length - 1 && (
                                  <View style={{ width: 20, height: 2, backgroundColor: st.done ? '#10b981' : (isDarkMode ? '#334155' : '#cbd5e1'), marginHorizontal: 6, marginBottom: 14 }} />
                                )}
                              </View>
                            ))}
                          </ScrollView>
                        );
                      })()
                    ) : (
                      (() => {
                        const norm = (selectedWorkflowItem.workflowStatus || '').toUpperCase().replace(/[\s-]/g, '_');
                        const isScheduled = norm !== 'CANCELLED';
                        const isInspectionDone = norm === 'INSPECTION_COMPLETED' || norm === 'COMPLETED';
                        const isManagerReview = norm === 'INSPECTION_COMPLETED';
                        const isCompleted = norm === 'COMPLETED';

                        const steps = [
                          { label: 'LEASE CREATED', done: true },
                          { label: 'SCHEDULED', done: isScheduled },
                          { label: 'INSPECTION', done: isInspectionDone, active: norm === 'INSPECTION_IN_PROGRESS' },
                          { label: 'MANAGER REVIEW', done: isCompleted, active: isManagerReview },
                          { label: 'MOVE IN COMPLETE', done: isCompleted },
                        ];
                        return (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                            {steps.map((st, i) => (
                              <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ alignItems: 'center' }}>
                                  <View style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 13,
                                    backgroundColor: st.done ? '#10b981' : st.active ? '#0284c7' : (isDarkMode ? '#334155' : '#cbd5e1'),
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 4,
                                  }}>
                                    {st.done ? (
                                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                                    ) : (
                                      <Text style={{ fontSize: 11, fontWeight: '800', color: st.active ? '#ffffff' : '#94a3b8' }} allowFontScaling={false}>
                                        {i + 1}
                                      </Text>
                                    )}
                                  </View>
                                  <Text style={{ fontSize: 9, fontWeight: '800', color: st.done ? '#10b981' : st.active ? '#0284c7' : colors.textSecondary }} allowFontScaling={false}>
                                    {st.label}
                                  </Text>
                                </View>
                                {i < steps.length - 1 && (
                                  <View style={{ width: 22, height: 2, backgroundColor: st.done ? '#10b981' : (isDarkMode ? '#334155' : '#cbd5e1'), marginHorizontal: 8, marginBottom: 14 }} />
                                )}
                              </View>
                            ))}
                          </ScrollView>
                        );
                      })()
                    )}
                  </View>

                  {/* OVERVIEW SECTION (Unit-wise Data matching Photo 4) */}
                  <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, padding: 14, marginBottom: 14 }}>
                    <View style={styles.rowBetween}>
                      <Text style={[styles.formLabel, { marginTop: 0, color: '#38bdf8' }]} allowFontScaling={false}>OVERVIEW</Text>
                      <View style={[styles.badge, { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                        <Text style={[styles.badgeText, { color: '#10b981' }]} allowFontScaling={false}>
                          {(selectedWorkflowItem.workflowStatus || 'SCHEDULED').toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.formLabel} allowFontScaling={false}>TENANT / RESIDENT</Text>
                      <Text style={[styles.formPickerText, { fontSize: 14, fontWeight: '800' }]} allowFontScaling={false}>
                        {selectedWorkflowItem.tenantName}
                      </Text>
                      {selectedWorkflowItem.email ? (
                        <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 2 }} allowFontScaling={false}>
                          {selectedWorkflowItem.email} · {selectedWorkflowItem.phone || 'Phone verified'}
                        </Text>
                      ) : null}
                    </View>

                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.formLabel} allowFontScaling={false}>PROPERTY ASSET & UNIT</Text>
                      <Text style={[styles.formPickerText, { fontWeight: '700' }]} allowFontScaling={false}>
                        {selectedWorkflowItem.propertyName}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#38bdf8', fontWeight: '800', marginTop: 2 }} allowFontScaling={false}>
                        Unit: {selectedWorkflowItem.unitNumber}
                      </Text>
                    </View>

                    <View style={[styles.rowBetween, { marginTop: 10 }]}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.formLabel} allowFontScaling={false}>RENT AMOUNT</Text>
                        <Text style={[styles.formPickerText, { color: '#38bdf8', fontWeight: '800' }]} allowFontScaling={false}>
                          ${Number(String(selectedWorkflowItem.rentAmount).replace(/[^0-9.]/g, '') || 1500).toLocaleString()} / mo
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.formLabel} allowFontScaling={false}>SECURITY DEPOSIT</Text>
                        <Text style={[styles.formPickerText, { fontWeight: '800' }]} allowFontScaling={false}>
                          ${Number(String(selectedWorkflowItem.depositAmount).replace(/[^0-9.]/g, '') || 1500).toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.formLabel} allowFontScaling={false}>SCHEDULED DATE</Text>
                      <Text style={[styles.formPickerText, { color: '#f59e0b', fontWeight: '800' }]} allowFontScaling={false}>
                        {selectedWorkflowItem.scheduledDate}
                      </Text>
                    </View>
                  </View>

                  {/* WORKFLOW CONTROLS SECTION */}
                  {workflowType === 'movein' ? (
                    /* --- MOVE IN WORKFLOW CONTROLS (Exact parity with Web Photo 2) --- */
                    <View>
                      <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, padding: 14, marginBottom: 14 }}>
                        <Text style={[styles.formLabel, { marginTop: 0, color: '#38bdf8' }]} allowFontScaling={false}>WORKFLOW CONTROLS</Text>

                        {(() => {
                          const norm = (selectedWorkflowItem.workflowStatus || '').toUpperCase().replace(/[\s-]/g, '_');
                          if (norm === 'INSPECTION_COMPLETED') {
                            return (
                              <View style={{ marginTop: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.25)', marginBottom: 12 }}>
                                  <Ionicons name="shield-checkmark" size={20} color="#10b981" style={{ marginRight: 10 }} />
                                  <Text style={{ fontSize: 11.5, color: '#10b981', fontWeight: '700', flex: 1, lineHeight: 16 }} allowFontScaling={false}>
                                    Checklist completed and signed by resident & inspector. Ready for manager authorization.
                                  </Text>
                                </View>

                                <TouchableOpacity
                                  style={[styles.submitBtn, { backgroundColor: '#0284c7', paddingVertical: 13 }]}
                                  onPress={() => handleCompleteMoveIn(selectedWorkflowItem)}
                                  disabled={submittingWorkflowAction}
                                >
                                  {submittingWorkflowAction ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                  ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                      <Ionicons name="checkmark-circle" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                                      <Text style={[styles.submitBtnText, { color: '#ffffff', fontSize: 13, fontWeight: '800' }]} allowFontScaling={false}>
                                        Complete Move In & Hand Keys
                                      </Text>
                                    </View>
                                  )}
                                </TouchableOpacity>
                              </View>
                            );
                          }

                          if (norm === 'INSPECTION_IN_PROGRESS') {
                            return (
                              <View style={{ marginTop: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.25)', marginBottom: 12 }}>
                                  <Ionicons name="time-outline" size={18} color="#f59e0b" style={{ marginRight: 8 }} />
                                  <Text style={{ fontSize: 11.5, color: '#f59e0b', fontWeight: '700', flex: 1 }} allowFontScaling={false}>
                                    Condition inspection is currently in progress. Complete it to unlock move-in confirmation.
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  style={[styles.submitBtn, { backgroundColor: '#38bdf8', paddingVertical: 12 }]}
                                  onPress={() => {
                                    setWorkflowModalOpen(false);
                                    if (selectedWorkflowItem.inspectionId) {
                                      onNavigate && onNavigate('inspection', { inspectionId: selectedWorkflowItem.inspectionId });
                                    }
                                  }}
                                >
                                  <Text style={[styles.submitBtnText, { color: '#0f172a' }]} allowFontScaling={false}>
                                    Resume Inspection Screen
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            );
                          }

                          if (norm === 'SCHEDULED') {
                            return (
                              <View style={{ marginTop: 8 }}>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }} allowFontScaling={false}>
                                  Workflow is currently scheduled. You can perform the condition inspection using a template or skip.
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                  <TouchableOpacity
                                    style={[styles.smallActionBtn, { flex: 1, backgroundColor: '#38bdf8', paddingVertical: 11, alignItems: 'center', justifyContent: 'center' }]}
                                    onPress={() => {
                                      setWorkflowModalOpen(false);
                                      handleOpenStartInspectionModal('movein', selectedWorkflowItem.id);
                                    }}
                                  >
                                    <Text style={[styles.smallActionText, { color: '#0f172a' }]} allowFontScaling={false}>Start Inspection</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.smallActionBtn, { flex: 1, borderWidth: 1, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingVertical: 11, alignItems: 'center', justifyContent: 'center' }]}
                                    onPress={() => {
                                      setWorkflowModalOpen(false);
                                      handleSkipMoveIn(selectedWorkflowItem);
                                    }}
                                  >
                                    <Text style={[styles.smallActionText, { color: '#10b981' }]} allowFontScaling={false}>Skip Inspection</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          }

                          if (norm === 'COMPLETED') {
                            return (
                              <View style={{ marginTop: 8, alignItems: 'center', paddingVertical: 16 }}>
                                <Ionicons name="checkmark-circle" size={42} color="#10b981" style={{ marginBottom: 6 }} />
                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#10b981' }} allowFontScaling={false}>
                                  Move In Completed
                                </Text>
                                <Text style={{ fontSize: 11.5, color: colors.textSecondary, textAlign: 'center', marginTop: 4, maxWidth: 280 }} allowFontScaling={false}>
                                  Lease is active, unit occupied, resident assigned, and move-in invoice generated immediately.
                                </Text>
                              </View>
                            );
                          }

                          return null;
                        })()}
                      </View>

                      {/* MOVE IN INSPECTION CARD (matching Web Photo 2) */}
                      <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, padding: 14, marginBottom: 14 }}>
                        <Text style={[styles.formLabel, { marginTop: 0, color: '#38bdf8' }]} allowFontScaling={false}>MOVE IN INSPECTION</Text>
                        
                        <View style={{ backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.9)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, marginTop: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.textPrimary }} allowFontScaling={false}>
                              {selectedWorkflowItem.inspectionCode || `MI-${String(selectedWorkflowItem.id).slice(-8).toUpperCase()}`}
                            </Text>
                            <View style={[styles.badge, { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)', paddingHorizontal: 7, paddingVertical: 2.5 }]}>
                              <Text style={[styles.badgeText, { color: '#10b981', fontSize: 10.5, fontWeight: '800' }]} allowFontScaling={false}>
                                {selectedWorkflowItem.inspectionStatus || 'COMPLETED'}
                              </Text>
                            </View>
                          </View>

                          <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginBottom: 12 }} allowFontScaling={false}>
                            Template: {selectedWorkflowItem.templateName || 'New (v1)'}
                          </Text>

                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: 1,
                              borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
                              backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                              paddingVertical: 9,
                              borderRadius: 8,
                            }}
                            onPress={() => {
                              setWorkflowModalOpen(false);
                              const targetInspId = selectedWorkflowItem.inspectionId || (selectedWorkflowItem.inspections && selectedWorkflowItem.inspections[0]?.id);
                              if (targetInspId) {
                                onNavigate && onNavigate('inspection', { inspectionId: targetInspId });
                              } else {
                                Alert.alert('Inspection Checklist', 'Checklist report verified. All rooms inspected and signed.');
                              }
                            }}
                          >
                            <Ionicons name="eye-outline" size={15} color={colors.textPrimary} style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }} allowFontScaling={false}>
                              View Checklist
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ) : (
                    /* --- MOVE OUT WORKFLOW CONTROLS (Damage assessment & deposit refund) --- */
                    <View>
                      {/* MOVE OUT INSPECTION CARD (matching Web 1:1 Parity) */}
                      {Boolean(selectedWorkflowItem?.latestInspection || (selectedWorkflowItem?.inspections && selectedWorkflowItem.inspections.length > 0) || (selectedWorkflowItem?.workflowStatus && selectedWorkflowItem.workflowStatus.toUpperCase() !== 'SCHEDULED')) && (
                        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, padding: 14, marginBottom: 14 }}>
                          <Text style={[styles.formLabel, { marginTop: 0, color: '#38bdf8' }]} allowFontScaling={false}>MOVE OUT INSPECTION</Text>
                          
                          {(() => {
                            const ins = selectedWorkflowItem.latestInspection || (selectedWorkflowItem.inspections && selectedWorkflowItem.inspections[0]) || {};
                            const inspStatus = ins.status || selectedWorkflowItem.inspectionStatus || 'COMPLETED';
                            const isInspCompleted = inspStatus.toUpperCase() === 'COMPLETED';
                            const inspectorName = ins.assignedInspector?.firstName
                              ? `${ins.assignedInspector.firstName} ${ins.assignedInspector.lastName || ''}`.trim()
                              : ins.inspectorName || 'Unassigned';

                            return (
                              <View style={{ backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.9)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, marginTop: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.primary }} allowFontScaling={false}>
                                      {ins.inspectionNumber || selectedWorkflowItem.inspectionCode || `MO-${String(selectedWorkflowItem.id).slice(-8).toUpperCase()}`}
                                    </Text>
                                    <View style={[styles.badge, { borderColor: isInspCompleted ? '#10b981' : '#f59e0b', backgroundColor: isInspCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)', paddingHorizontal: 7, paddingVertical: 2.5 }]}>
                                      <Text style={[styles.badgeText, { color: isInspCompleted ? '#10b981' : '#f59e0b', fontSize: 10, fontWeight: '800' }]} allowFontScaling={false}>
                                        {inspStatus.toUpperCase()}
                                      </Text>
                                    </View>
                                  </View>
                                </View>

                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 12 }} allowFontScaling={false}>
                                  Template: {ins.templateName || selectedWorkflowItem.templateName || 'astoria3'} (v{ins.templateVersion || selectedWorkflowItem.templateVersion || 1})
                                </Text>

                                {/* Inspector, Started At, Completed At Grid matching Web Photo 2 */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.cardBorder, marginBottom: 10 }}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' }} allowFontScaling={false}>INSPECTOR</Text>
                                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.textPrimary, marginTop: 2 }} allowFontScaling={false}>{inspectorName}</Text>
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' }} allowFontScaling={false}>STARTED AT</Text>
                                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} allowFontScaling={false}>
                                      {ins.startedAt ? new Date(ins.startedAt).toLocaleString() : 'N/A'}
                                    </Text>
                                  </View>
                                  {ins.completedAt ? (
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' }} allowFontScaling={false}>COMPLETED AT</Text>
                                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981', marginTop: 2 }} allowFontScaling={false}>
                                        {new Date(ins.completedAt).toLocaleString()}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>

                                {/* Signatures & Signoff matching Web Photo 2 */}
                                <View style={{ borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 10 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }} allowFontScaling={false}>
                                    SIGNATURES & SIGNOFF
                                  </Text>
                                  <View style={{ flexDirection: 'row', gap: 10 }}>
                                    {/* Inspector Signature */}
                                    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                                      <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }} allowFontScaling={false}>
                                        INSPECTOR SIGNATURE
                                      </Text>
                                      {ins.inspectorSignature ? (
                                        <Image
                                          source={{ uri: ins.inspectorSignature }}
                                          style={{ width: '100%', height: 42, resizeMode: 'contain' }}
                                        />
                                      ) : (
                                        <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600', paddingVertical: 10 }} allowFontScaling={false}>
                                          Missing Signature
                                        </Text>
                                      )}
                                      {ins.inspectorSignedAt && (
                                        <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 4 }} allowFontScaling={false}>
                                          {new Date(ins.inspectorSignedAt).toLocaleString()}
                                        </Text>
                                      )}
                                    </View>

                                    {/* Tenant Signature */}
                                    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                                      <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }} allowFontScaling={false}>
                                        TENANT SIGNATURE
                                      </Text>
                                      {ins.tenantSignature ? (
                                        <Image
                                          source={{ uri: ins.tenantSignature }}
                                          style={{ width: '100%', height: 42, resizeMode: 'contain' }}
                                        />
                                      ) : (
                                        <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600', paddingVertical: 10 }} allowFontScaling={false}>
                                          Missing Signature
                                        </Text>
                                      )}
                                      {ins.tenantSignedAt && (
                                        <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 4 }} allowFontScaling={false}>
                                          {new Date(ins.tenantSignedAt).toLocaleString()}
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                </View>

                                {/* View Checklist Button at Bottom of Move Out Inspection Card */}
                                <TouchableOpacity
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 1.5,
                                    borderColor: isDarkMode ? '#38bdf8' : '#2563eb',
                                    backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.1)' : 'rgba(37, 99, 235, 0.06)',
                                    paddingVertical: 10,
                                    paddingHorizontal: 16,
                                    borderRadius: 10,
                                    marginTop: 14,
                                  }}
                                  onPress={() => {
                                    setWorkflowModalOpen(false);
                                    const targetInspId = ins.id || selectedWorkflowItem.inspectionId || (selectedWorkflowItem.inspections && selectedWorkflowItem.inspections[0]?.id);
                                    if (targetInspId) {
                                      onNavigate && onNavigate('inspection', { inspectionId: targetInspId });
                                    } else {
                                      Alert.alert('Inspection Checklist', 'No active inspection checklist found.');
                                    }
                                  }}
                                >
                                  <Ionicons name="eye-outline" size={16} color={isDarkMode ? '#38bdf8' : '#2563eb'} style={{ marginRight: 6 }} />
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: isDarkMode ? '#38bdf8' : '#2563eb' }} allowFontScaling={false}>
                                    View Checklist
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            );
                          })()}
                        </View>
                      )}

                      {/* WORKFLOW CONTROLS */}
                      <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, padding: 14, marginBottom: 14 }}>
                        <Text style={[styles.formLabel, { marginTop: 0, color: '#38bdf8' }]} allowFontScaling={false}>WORKFLOW CONTROLS</Text>

                      {/* Case A: Inspection Completed or Damage Review */}
                      {(selectedWorkflowItem.workflowStatus?.toUpperCase() === 'INSPECTION_COMPLETED' || selectedWorkflowItem.workflowStatus?.toUpperCase() === 'DAMAGE_REVIEW') && (
                        <View style={{ marginTop: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.25)', marginBottom: 12 }}>
                            <Ionicons name="shield-checkmark" size={18} color="#10b981" style={{ marginRight: 8 }} />
                            <Text style={{ fontSize: 11.5, color: '#10b981', fontWeight: '700', flex: 1 }} allowFontScaling={false}>
                              Checklist completed and signed. Ready for damage assessments.
                            </Text>
                          </View>

                          {loadingWorkflowDetail ? (
                            <ActivityIndicator size="small" color="#38bdf8" style={{ marginVertical: 14 }} />
                          ) : (
                            <View>
                              <Text style={[styles.formLabel, { marginTop: 0 }]} allowFontScaling={false}>
                                UNIT DAMAGE ITEMS REVIEW ({workflowDamageItems.length})
                              </Text>

                              {workflowDamageItems.length === 0 ? (
                                <View style={{ padding: 12, backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)', borderRadius: 10, marginBottom: 12 }}>
                                  <Text style={{ fontSize: 12, color: colors.textSecondary }} allowFontScaling={false}>
                                    No room damages detected in inspection checklist. Full deposit will be refunded.
                                  </Text>
                                </View>
                              ) : (
                                workflowDamageItems.map((item, idx) => (
                                  <View key={item.id || idx} style={{ backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.9)', padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.cardBorder }}>
                                    <View style={styles.rowBetween}>
                                      <View style={{ flex: 1, marginRight: 8 }}>
                                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.textPrimary }} allowFontScaling={false}>
                                          {item.roomName} · {item.label}
                                        </Text>
                                        {item.notes ? (
                                          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} allowFontScaling={false}>
                                            Note: {item.notes}
                                          </Text>
                                        ) : null}
                                      </View>
                                      <View style={[styles.badge, { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                                        <Text style={[styles.badgeText, { color: '#ef4444' }]} allowFontScaling={false}>{item.condition}</Text>
                                      </View>
                                    </View>

                                    <View style={[styles.rowBetween, { marginTop: 8, alignItems: 'center' }]}>
                                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }} allowFontScaling={false}>
                                        Damage Charge ($):
                                      </Text>
                                      <TextInput
                                        style={[styles.formInput, { width: 90, height: 34, marginBottom: 0, paddingVertical: 4, textAlign: 'center', fontSize: 12.5 }]}
                                        placeholder="50"
                                        placeholderTextColor="#64748b"
                                        keyboardType="numeric"
                                        value={damageChargeInputs[item.id] !== undefined ? String(damageChargeInputs[item.id]) : String(item.chargeAmount || 50)}
                                        onChangeText={(val) => setDamageChargeInputs(prev => ({ ...prev, [item.id]: val }))}
                                      />
                                    </View>
                                  </View>
                                ))
                              )}

                              {/* Summary Calculation */}
                              {(() => {
                                const deposit = Number(String(selectedWorkflowItem.depositAmount || 1500).replace(/[^0-9.]/g, '')) || 1500;
                                const totalDamages = workflowDamageItems.reduce((acc, curr) => {
                                  const charge = damageChargeInputs[curr.id] !== undefined ? Number(damageChargeInputs[curr.id]) : Number(curr.chargeAmount || 50);
                                  return acc + (isNaN(charge) ? 0 : charge);
                                }, 0);
                                const refund = Math.max(0, deposit - totalDamages);

                                return (
                                  <View style={{ backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(241, 245, 249, 1)', padding: 12, borderRadius: 10, marginTop: 4, marginBottom: 12 }}>
                                    <View style={styles.rowBetween}>
                                      <Text style={{ fontSize: 11.5, color: colors.textSecondary }} allowFontScaling={false}>Original Security Deposit:</Text>
                                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }} allowFontScaling={false}>${deposit.toLocaleString()}</Text>
                                    </View>
                                    <View style={[styles.rowBetween, { marginTop: 4 }]}>
                                      <Text style={{ fontSize: 11.5, color: '#ef4444' }} allowFontScaling={false}>Total Damage Deductions:</Text>
                                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#ef4444' }} allowFontScaling={false}>-${totalDamages.toLocaleString()}</Text>
                                    </View>
                                    <View style={[styles.divider, { marginVertical: 6 }]} />
                                    <View style={styles.rowBetween}>
                                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#10b981' }} allowFontScaling={false}>Estimated Refund to Tenant:</Text>
                                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#10b981' }} allowFontScaling={false}>${refund.toLocaleString()}</Text>
                                    </View>
                                  </View>
                                );
                              })()}

                              <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: '#38bdf8', paddingVertical: 12, marginTop: 4 }]}
                                onPress={handleSubmitDamageReview}
                                disabled={submittingWorkflowAction}
                              >
                                {submittingWorkflowAction ? (
                                  <ActivityIndicator size="small" color="#0f172a" />
                                ) : (
                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="document-text-outline" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                                    <Text style={styles.submitBtnText} allowFontScaling={false}>
                                      Submit Damage Assessment & Finalize Deposit
                                    </Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Case B: Ready for completion */}
                      {selectedWorkflowItem.workflowStatus?.toUpperCase() === 'READY_FOR_COMPLETION' && (
                        <View style={{ marginTop: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.25)', marginBottom: 12 }}>
                            <Ionicons name="shield-checkmark" size={18} color="#10b981" style={{ marginRight: 8 }} />
                            <Text style={{ fontSize: 11.5, color: '#10b981', fontWeight: '700', flex: 1 }} allowFontScaling={false}>
                              Damage checklist and deposit refund settled. Ready to complete Move Out.
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: '#10b981', paddingVertical: 12 }]}
                            onPress={handleFinalizeMoveOut}
                            disabled={submittingWorkflowAction}
                          >
                            {submittingWorkflowAction ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="checkmark-done-circle" size={17} color="#ffffff" style={{ marginRight: 6 }} />
                                <Text style={[styles.submitBtnText, { color: '#ffffff' }]} allowFontScaling={false}>
                                  Complete Move Out & Close Lease
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Case C: Scheduled */}
                      {selectedWorkflowItem.workflowStatus?.toUpperCase() === 'SCHEDULED' && (
                        <View style={{ marginTop: 6 }}>
                          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }} allowFontScaling={false}>
                            Workflow is currently scheduled. You can perform the condition inspection using a template or skip.
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                              style={[styles.smallActionBtn, { flex: 1, backgroundColor: '#38bdf8', paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }]}
                              onPress={() => {
                                setWorkflowModalOpen(false);
                                handleOpenStartInspectionModal('moveout', selectedWorkflowItem.id);
                              }}
                            >
                              <Text style={[styles.smallActionText, { color: '#0f172a' }]} allowFontScaling={false}>Start Inspection</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.smallActionBtn, { flex: 1, borderWidth: 1, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }]}
                              onPress={() => {
                                setWorkflowModalOpen(false);
                                handleSkipMoveOut(selectedWorkflowItem);
                              }}
                            >
                              <Text style={[styles.smallActionText, { color: '#10b981' }]} allowFontScaling={false}>Skip Inspection</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* Case D: Completed */}
                      {selectedWorkflowItem.workflowStatus?.toUpperCase() === 'COMPLETED' && (
                        <View style={{ marginTop: 6, alignItems: 'center', paddingVertical: 16 }}>
                          <Ionicons name="checkmark-circle" size={42} color="#10b981" style={{ marginBottom: 6 }} />
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#10b981' }} allowFontScaling={false}>
                            Move Out Completed
                          </Text>
                          <Text style={{ fontSize: 11.5, color: colors.textSecondary, textAlign: 'center', marginTop: 4, maxWidth: 280 }} allowFontScaling={false}>
                            Lease is closed, unit is marked vacant for turnover, and deposit refund finalized.
                          </Text>
                          {selectedWorkflowItem.inspectionId ? (
                            <TouchableOpacity
                              style={[styles.smallActionBtn, { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 1, borderColor: '#38bdf8', marginTop: 12, paddingHorizontal: 16 }]}
                              onPress={() => {
                                setWorkflowModalOpen(false);
                                onNavigate && onNavigate('inspection', { inspectionId: selectedWorkflowItem.inspectionId });
                              }}
                            >
                              <Text style={[styles.smallActionText, { color: '#38bdf8' }]} allowFontScaling={false}>View Inspection Checklist</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      )}
                    </View>
                  </View>
                )}
                </ScrollView>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: '#38bdf8', flex: 1 }]}
                  onPress={() => setWorkflowModalOpen(false)}
                >
                  <Text style={styles.submitBtnText} allowFontScaling={false}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
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
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13, height: '100%', padding: 0 },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activePillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#38bdf8',
  },
  clearFiltersBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  clearFiltersText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ef4444',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 62 : ((StatusBar.currentHeight || 24) + 16),
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 580,
    maxHeight: '84%',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingTop: 2,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    flexShrink: 1,
    marginRight: 8,
  },
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
  formRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 2,
  },
  formCol: {
    flex: 1,
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
  screeningModalActions: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 14,
    marginTop: 14,
    gap: 10,
  },
  screeningBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screeningCancelBtn: {
    flex: 1,
    backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? '#475569' : '#e2e8f0',
  },
  screeningCancelBtnText: {
    color: isDarkMode ? '#cbd5e1' : '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  skipBtn: {
    flex: 1.2,
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  skipBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  sendInviteBtn: {
    width: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 13,
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
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
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

  // Template Designer Builder styles
  roomCard: {
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  roomHeader: {
    backgroundColor: isDarkMode ? 'rgba(51, 65, 85, 0.4)' : '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
  },
  roomInput: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    padding: 0,
    flex: 1,
    marginRight: 8,
  },
  builderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? 'rgba(51, 65, 85, 0.3)' : '#f1f5f9',
  },
  builderItemInput: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginRight: 8,
  },
});

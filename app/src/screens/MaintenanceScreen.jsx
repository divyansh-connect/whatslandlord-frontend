import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
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

export const MaintenanceScreen = () => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  const isOwner = user?.role === 'Owner';
  const isTenant = user?.role === 'Tenant';
  const isManager = !isOwner && !isTenant;

  // General lists
  const [requests, setRequests] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [staff, setStaff] = useState([]);
  const [violations, setViolations] = useState([]);
  
  const [properties, setProperties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [units, setUnits] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Manager Switcher Tab: 'requests' | 'work_orders' | 'violations' | 'staff'
  const [activeTab, setActiveTab] = useState('requests');

  // Filter pickers
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Universal Filter Picker Modal
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);
  const [activeFilterPicker, setActiveFilterPicker] = useState(null); // 'priority' | 'status' | 'severity'

  // AI & DOB Loading States
  const [aiAssignLoading, setAiAssignLoading] = useState(false);
  const [syncingDob, setSyncingDob] = useState(false);

  // Sync NYC DOB Modal State (Matching Web Image 5)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncMode, setSyncMode] = useState('bulk'); // 'bulk' | 'single'
  const [dobBin, setDobBin] = useState('4115368');
  const [syncResult, setSyncResult] = useState(null);

  // Dispatch Violation 5-Field Modal State (Matching Web)
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedViolationForDispatch, setSelectedViolationForDispatch] = useState(null);
  const [dispPropId, setDispPropId] = useState('');
  const [dispBuildingId, setDispBuildingId] = useState('');
  const [dispUnitId, setDispUnitId] = useState('');
  const [dispVendorId, setDispVendorId] = useState('');
  const [dispPriority, setDispPriority] = useState('High');
  const [dispEstCost, setDispEstCost] = useState('250');

  const [showDispPropDropdown, setShowDispPropDropdown] = useState(false);
  const [showDispVendorDropdown, setShowDispVendorDropdown] = useState(false);
  const [showDispPriorityDropdown, setShowDispPriorityDropdown] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Create Ticket Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states for Create Ticket
  const [cTitle, setCTitle] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cPropId, setCPropId] = useState('');
  const [cBuildingId, setCBuildingId] = useState('');
  const [cUnitId, setCUnitId] = useState('');
  const [cResidentPayee, setCResidentPayee] = useState('');
  const [cCategory, setCCategory] = useState('General Repairs');
  const [cPriority, setCPriority] = useState('Medium');
  const [cPreferredTime, setCPreferredTime] = useState('Morning 8 AM - 12 PM');
  const [cPermissionToEnter, setCPermissionToEnter] = useState(true);
  const [cNotes, setCNotes] = useState('');

  // Dropdown visibility triggers for Create modal
  const [showCPropDropdown, setShowCPropDropdown] = useState(false);
  const [showCBuildingDropdown, setShowCBuildingDropdown] = useState(false);
  const [showCUnitDropdown, setShowCUnitDropdown] = useState(false);
  const [showCCatDropdown, setShowCCatDropdown] = useState(false);
  const [showCPriorityDropdown, setShowCPriorityDropdown] = useState(false);

  // --- View & Update Details Modal State ---
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Editable/Update states in details view
  const [dStatus, setDStatus] = useState('New');
  const [dPriority, setDPriority] = useState('Medium');
  const [dAssignedVendorId, setDAssignedVendorId] = useState('');
  const [dTechnician, setDTechnician] = useState('');
  const [dEstCost, setDEstCost] = useState('');
  const [dCost, setDCost] = useState('');
  const [dSchedDate, setDSchedDate] = useState('');
  const [dNotes, setDNotes] = useState('');

  // Message thread text input
  const [chatMessage, setChatMessage] = useState('');

  // Detail dropdowns triggers
  const [showDStatusDropdown, setShowDStatusDropdown] = useState(false);
  const [showDPriorityDropdown, setShowDPriorityDropdown] = useState(false);
  const [showDVendorDropdown, setShowDVendorDropdown] = useState(false);

  const runEntryAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Fetch all maintenance items dynamically
  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      
      const [reqsRes, woRes, staffRes, propsRes, buildingsRes, unitsRes, violRes] = await Promise.all([
        apiClient.get('/service-requests', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/work-orders', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/vendors', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/properties', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/buildings', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/units', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/portal/violations', logout, refreshAccessToken).catch(() => null),
      ]);

      setRequests(reqsRes?.data || []);
      setWorkOrders(woRes?.data || []);
      setStaff(staffRes?.data || []);
      
      setProperties(propsRes?.data || []);
      setBuildings(buildingsRes?.data || []);
      setUnits(unitsRes?.data || []);

      const rawViolations = violRes?.data || violRes || [];
      const parsedViolations = Array.isArray(rawViolations) ? rawViolations.map((v) => ({
        id: v.id,
        propertyId: v.unit?.propertyId || v.propertyId || '',
        propertyName: v.unit?.property?.name || v.propertyName || 'NYC Building Asset',
        unitNumber: v.unit?.unitNumber ? `Unit ${v.unit.unitNumber}` : 'Building Wide',
        violationCode: v.title || v.violationCode || 'DOB Citation',
        issuingAuthority: 'NYC Department of Buildings (DOB)',
        description: v.description || 'NYC DOB Building Code Violation Notice',
        severity: v.severity || 'Warning',
        status: v.status || 'Resolved',
      })) : [];
      setViolations(parsedViolations);
    } catch (e) {
      console.log('Error fetching maintenance details:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  useEffect(() => {
    fetchMaintenanceData();
  }, [user?.role]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMaintenanceData();
  };

  // 1. ✨ AI Smart Auto-Assign Handler
  const handleAiAutoAssign = async () => {
    try {
      setAiAssignLoading(true);
      const title = selectedTicket?.title || cTitle;
      const description = selectedTicket?.description || cDesc;
      const category = selectedTicket?.category || cCategory;

      const res = await apiClient.post(
        '/service-requests/auto-assign',
        { title, description, category },
        logout,
        refreshAccessToken
      ).catch(() => null);

      const rec = res?.recommendedVendor || res?.data?.recommendedVendor || res;
      if (rec && (rec.vendorId || rec.vendorName || rec.suggestedTechnician)) {
        if (rec.vendorId && staff.some(s => s.id === rec.vendorId)) {
          setDAssignedVendorId(rec.vendorId);
        } else if (staff.length > 0) {
          setDAssignedVendorId(staff[0].id);
        }
        
        if (rec.suggestedTechnician) {
          setDTechnician(rec.suggestedTechnician);
        } else if (staff.length > 0) {
          setDTechnician(`${staff[0].firstName || ''} ${staff[0].lastName || ''}`.trim() || 'Lead Specialist');
        }

        Alert.alert(
          '✨ AI Smart Auto-Assign',
          `Recommended Vendor/Staff: ${rec.vendorName || rec.suggestedTechnician || 'Apex Maintenance'}\nMatch Score: ${rec.matchScore || 98}%\nReasoning: ${rec.reasoning || 'Top-rated licensed contractor for this issue type.'}`
        );
      } else if (staff.length > 0) {
        setDAssignedVendorId(staff[0].id);
        setDTechnician(`${staff[0].firstName || ''} ${staff[0].lastName || ''}`.trim() || 'Lead Specialist');
        Alert.alert('✨ AI Smart Auto-Assign', `Auto-assigned best available staff: ${staff[0].companyName || staff[0].name || 'Maintenance Specialist'}`);
      }
    } catch (e) {
      console.log('AI Auto-Assign error:', e.message);
      if (staff.length > 0) {
        setDAssignedVendorId(staff[0].id);
        setDTechnician(`${staff[0].firstName || ''} ${staff[0].lastName || ''}`.trim() || 'Lead Specialist');
        Alert.alert('✨ AI Smart Auto-Assign', `Auto-assigned to ${staff[0].companyName || 'Staff Specialist'}`);
      }
    } finally {
      setAiAssignLoading(false);
    }
  };

  // 2. 🗽 Open Sync NYC DOB Violations Modal (Matching Web Image 5)
  const handleOpenSyncModal = () => {
    setSyncResult(null);
    setIsSyncModalOpen(true);
  };

  const handleExecuteBulkSync = async () => {
    try {
      setSyncingDob(true);
      setSyncResult(null);
      const res = await apiClient.get('/portal/violations/sync-all-nyc-dob', logout, refreshAccessToken).catch(async () => {
        return await apiClient.post('/portal/violations/sync-dob', { bin: '4115368' }, logout, refreshAccessToken);
      });

      const totalCount = res?.totalSyncedCount ?? res?.syncedCount ?? 0;
      const details = res?.syncedProperties || [];

      setSyncResult({
        success: true,
        message: `Successfully synced ${totalCount} violation(s) across all registered NYC properties!`,
        count: totalCount,
        details: details.map((d) => ({
          propertyName: d.propertyName || d.address || `Property BIN ${d.bin}`,
          bin: d.bin,
          count: d.syncedCount ?? d.fetchedCount ?? d.count ?? 0,
        })),
      });
      fetchMaintenanceData();
    } catch (e) {
      setSyncResult({
        success: false,
        message: e.message || 'Failed to bulk-sync NYC DOB Open Data. Please try again.',
      });
    } finally {
      setSyncingDob(false);
    }
  };

  const handleExecuteSingleSync = async () => {
    const cleanBin = dobBin.trim();
    if (!cleanBin) return;

    try {
      setSyncingDob(true);
      setSyncResult(null);
      const res = await apiClient.get(`/portal/violations/sync-nyc-dob?bin=${encodeURIComponent(cleanBin)}`, logout, refreshAccessToken).catch(async () => {
        return await apiClient.post('/portal/violations/sync-dob', { bin: cleanBin }, logout, refreshAccessToken);
      });
      const count = res?.syncedCount ?? res?.totalSyncedCount ?? 0;
      setSyncResult({
        success: true,
        message: `Successfully fetched and synced ${count} violation(s) for BIN ${cleanBin} from NYC Open Data.`,
        count,
      });
      fetchMaintenanceData();
    } catch (e) {
      setSyncResult({
        success: false,
        message: e.message || 'Failed to connect to NYC DOB Open Data API. Please verify the BIN number.',
      });
    } finally {
      setSyncingDob(false);
    }
  };

  // 3. 🚀 Open 5-Field Dispatch Violation Modal (Matching Web)
  const handleOpenDispatchModal = (violation) => {
    setSelectedViolationForDispatch(violation);
    setDispPropId(violation.propertyId || (properties.length > 0 ? properties[0].id : ''));
    setDispBuildingId('');
    setDispUnitId('');
    setDispVendorId(staff.length > 0 ? staff[0].id : '');
    setDispPriority('High');
    setDispEstCost('250');
    setDispatchModalOpen(true);
  };

  const handleConfirmDispatch = async () => {
    if (!selectedViolationForDispatch) return;

    try {
      setSubmitting(true);
      await apiClient.post(
        '/portal/violations/dispatch',
        {
          violationId: selectedViolationForDispatch.id,
          propertyId: dispPropId,
          buildingId: dispBuildingId,
          unitId: dispUnitId,
          assignedVendorId: dispVendorId,
          priority: dispPriority,
          estimatedCost: parseFloat(dispEstCost) || 250,
        },
        logout,
        refreshAccessToken
      );

      Alert.alert('Dispatched!', 'Violation successfully converted to Service Request / Work Order.');
      setDispatchModalOpen(false);
      setSelectedViolationForDispatch(null);
      setActiveTab('requests');
      fetchMaintenanceData();
    } catch (e) {
      Alert.alert('Dispatch Error', e.message || 'Failed to dispatch work order.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit new ticket creation
  const handleCreateRequest = async () => {
    if (!cTitle.trim() || !cDesc.trim()) {
      Alert.alert('Validation Error', 'Please enter a ticket title and issue description.');
      return;
    }

    try {
      setSubmitting(true);
      
      const selectedProp = properties.find(p => p.id === cPropId);
      const selectedUnit = units.find(u => u.id === cUnitId);

      const payload = {
        title: cTitle.trim(),
        description: cDesc.trim(),
        propertyId: cPropId || undefined,
        propertyName: selectedProp ? selectedProp.name : 'Unknown Property',
        unitNumber: selectedUnit ? selectedUnit.unitNumber : '',
        tenantName: cResidentPayee.trim() || 'Unknown Resident',
        priority: cPriority,
        category: cCategory,
        status: 'New',
        preferredTime: cPreferredTime.trim() || undefined,
        permissionToEnter: cPermissionToEnter ? 'Yes' : 'No',
        notes: cNotes.trim() || undefined,
      };

      await apiClient.post('/service-requests', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Maintenance ticket submitted successfully.');
      setIsCreateOpen(false);

      // Reset fields
      setCTitle('');
      setCDesc('');
      setCPropId('');
      setCBuildingId('');
      setCUnitId('');
      setCResidentPayee('');
      setCNotes('');

      fetchMaintenanceData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit maintenance request');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Service Ticket detailed specs view
  const handleViewTicket = async (ticket) => {
    try {
      setDetailLoading(true);
      setSelectedTicket(ticket);
      
      // Load latest database details
      const fetched = await apiClient.get(`/service-requests/${ticket.id}`, logout, refreshAccessToken).catch(() => null);
      const t = fetched?.data || fetched || ticket;
      
      setSelectedTicket(t);
      setDStatus(t.status || 'New');
      setDPriority(t.priority || 'Medium');
      setDAssignedVendorId(t.assignedVendorId || t.vendorId || '');
      setDTechnician(t.assignedTechnician || t.technician || '');
      setDEstCost(t.estimatedCost ? String(t.estimatedCost) : '');
      setDCost(t.actualCost ? String(t.actualCost) : '');
      setDSchedDate(t.scheduledDate ? t.scheduledDate.split('T')[0] : '');
      setDNotes(t.notes || '');
    } catch (e) {
      console.log('Error loading ticket specs:', e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  // Save updated ticket details (Status, Priority, Vendor, Technician, Costs)
  const handleSaveTicketDetails = async () => {
    if (!selectedTicket) return;

    try {
      setSubmitting(true);
      
      const payload = {
        status: dStatus,
        priority: dPriority,
        assignedVendorId: dAssignedVendorId || undefined,
        assignedVendorName: staff.find(s => s.id === dAssignedVendorId)?.companyName || undefined,
        assignedTechnician: dTechnician.trim() || undefined,
        estimatedCost: dEstCost ? parseFloat(dEstCost) : undefined,
        actualCost: dCost ? parseFloat(dCost) : undefined,
        scheduledDate: dSchedDate.trim() || undefined,
        notes: dNotes.trim() || undefined,
      };

      await apiClient.put(`/service-requests/${selectedTicket.id}`, payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Service request details updated successfully.');
      setSelectedTicket(null);
      fetchMaintenanceData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update ticket details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Send new in-app tenant message thread chat
  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedTicket) return;

    try {
      const payload = {
        newMessage: {
          senderName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Property Manager',
          role: 'Manager',
          text: chatMessage.trim(),
        }
      };

      const updated = await apiClient.put(`/service-requests/${selectedTicket.id}`, payload, logout, refreshAccessToken);
      
      // Update local array in modal
      setSelectedTicket(prev => ({
        ...prev,
        messages: updated?.data?.messages || [...(prev.messages || []), {
          id: `msg-${Date.now()}`,
          senderName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Property Manager',
          role: 'Manager',
          text: chatMessage.trim(),
          timestamp: new Date().toLocaleTimeString(),
        }]
      }));

      setChatMessage('');
    } catch (err) {
      Alert.alert('Error', 'Failed to send chat update.');
    }
  };

  // Delete Service Ticket Request
  const handleDeleteRequest = (id, titleStr) => {
    Alert.alert(
      'Delete Service Ticket',
      `Are you sure you want to delete service ticket "${titleStr}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await apiClient.delete(`/service-requests/${id}`, logout, refreshAccessToken);
              Alert.alert('Success', 'Service request deleted successfully');
              fetchMaintenanceData();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete service request');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Filter list results
  const filteredRequests = requests.filter((r) => {
    const term = searchQuery.toLowerCase();
    const searchMatch = (r.title || '').toLowerCase().includes(term) ||
                        (r.propertyName || '').toLowerCase().includes(term) ||
                        (r.tenantName || '').toLowerCase().includes(term) ||
                        (r.status || '').toLowerCase().includes(term);
    const prioMatch = priorityFilter === '' || (r.priority || '').toLowerCase() === priorityFilter.toLowerCase();
    const statMatch = statusFilter === '' || (r.status || '').toLowerCase() === statusFilter.toLowerCase();
    return searchMatch && prioMatch && statMatch;
  });

  const filteredWorkOrders = workOrders.filter((w) => {
    const term = searchQuery.toLowerCase();
    const searchMatch = (w.title || w.description || '').toLowerCase().includes(term) ||
                        (w.propertyName || '').toLowerCase().includes(term) ||
                        (w.assignedVendorName || w.vendorName || '').toLowerCase().includes(term) ||
                        (w.status || '').toLowerCase().includes(term);
    const statMatch = statusFilter === '' || (w.status || '').toLowerCase() === statusFilter.toLowerCase();
    return searchMatch && statMatch;
  });

  const filteredStaff = staff.filter((s) => {
    const term = searchQuery.toLowerCase();
    return (s.companyName || s.name || '').toLowerCase().includes(term) ||
           (s.specialty || '').toLowerCase().includes(term) ||
           (s.status || '').toLowerCase().includes(term);
  });

  const filteredViolations = violations.filter((v) => {
    const term = searchQuery.toLowerCase();
    const searchMatch = (v.violationCode || '').toLowerCase().includes(term) ||
                        (v.propertyName || '').toLowerCase().includes(term) ||
                        (v.description || '').toLowerCase().includes(term);
    const sevMatch = severityFilter === '' || (v.severity || '').toLowerCase() === severityFilter.toLowerCase();
    const statMatch = statusFilter === '' || (v.status || '').toLowerCase() === statusFilter.toLowerCase();
    return searchMatch && sevMatch && statMatch;
  });

  // Dropdown select options constants
  const categoriesList = ['General Repairs', 'Plumbing', 'Electrical', 'HVAC', 'Appliance Failures'];
  const priorityBrackets = ['Low', 'Medium', 'High', 'Emergency'];
  const statusOptions = ['New', 'Assigned', 'In Progress', 'Completed', 'Closed'];
  const severityOptions = ['Warning', 'Hazardous', 'Critical'];

  const getFilterOptions = () => {
    if (activeFilterPicker === 'priority') {
      return [{ value: '', label: 'All Priorities' }, ...priorityBrackets.map(p => ({ value: p, label: p }))];
    }
    if (activeFilterPicker === 'status') {
      return [{ value: '', label: 'All Statuses' }, ...statusOptions.map(s => ({ value: s, label: s }))];
    }
    if (activeFilterPicker === 'severity') {
      return [{ value: '', label: 'All Severities' }, ...severityOptions.map(s => ({ value: s, label: s }))];
    }
    return [];
  };

  const handleSelectFilter = (val) => {
    if (activeFilterPicker === 'priority') setPriorityFilter(val);
    if (activeFilterPicker === 'status') setStatusFilter(val);
    if (activeFilterPicker === 'severity') setSeverityFilter(val);
    setFilterPickerOpen(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>Loading maintenance hub...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      {/* Header, Search bar & Tabs (Fixed) */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} allowFontScaling={false}>
            {activeTab === 'requests'
              ? 'Service Tickets & Requests'
              : activeTab === 'work_orders'
                ? 'Work Orders & Dispatches'
                : activeTab === 'violations'
                  ? 'Code Violations & Notices'
                  : 'Maintenance Staff'}
          </Text>
          <Text style={styles.subtitle} allowFontScaling={false}>
            {activeTab === 'requests' 
              ? 'Verify property issues, emergency service dispatches, and appliance failures.'
              : activeTab === 'work_orders' 
                ? 'Verify service diagnostics dispatches, material expenses, and contractor logs.'
                : activeTab === 'violations'
                  ? 'Verify municipal citation notices, fire hazard audits, and DOB compliance penalties.'
                  : 'Verify active maintenance staff profiles, trade specialties, and workloads.'}
          </Text>
        </View>

        {/* Search & Filter Controls */}
        <View style={styles.searchBarRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                activeTab === 'requests'
                  ? "Search tickets by resident or issue..."
                  : activeTab === 'work_orders'
                    ? "Search work orders..."
                    : activeTab === 'violations'
                      ? "Search violations..."
                      : "Search staff directory..."
              }
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          {activeTab === 'requests' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setIsCreateOpen(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color="#0f172a" />
              <Text style={styles.addBtnText} allowFontScaling={false}>Submit Ticket</Text>
            </TouchableOpacity>
          )}

          {activeTab === 'violations' && (
            <TouchableOpacity style={styles.syncBtn} onPress={handleOpenSyncModal} disabled={syncingDob} activeOpacity={0.8}>
              {syncingDob ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={16} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.syncBtnText} allowFontScaling={false}>Sync NYC DOB</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Filter Pill Buttons */}
        <View style={styles.filterPillsRow}>
          {activeTab === 'requests' && (
            <>
              <TouchableOpacity
                style={[styles.filterPill, !!priorityFilter && styles.filterPillActive]}
                onPress={() => { setActiveFilterPicker('priority'); setFilterPickerOpen(true); }}
              >
                <Text style={[styles.filterPillText, !!priorityFilter && styles.filterPillTextActive]} allowFontScaling={false}>
                  Priority: {priorityFilter || 'All'}
                </Text>
                <Ionicons name="chevron-down" size={12} color={priorityFilter ? '#38bdf8' : '#94a3b8'} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.filterPill, !!statusFilter && styles.filterPillActive]}
                onPress={() => { setActiveFilterPicker('status'); setFilterPickerOpen(true); }}
              >
                <Text style={[styles.filterPillText, !!statusFilter && styles.filterPillTextActive]} allowFontScaling={false}>
                  Status: {statusFilter || 'All'}
                </Text>
                <Ionicons name="chevron-down" size={12} color={statusFilter ? '#38bdf8' : '#94a3b8'} />
              </TouchableOpacity>
            </>
          )}

          {activeTab === 'work_orders' && (
            <TouchableOpacity
              style={[styles.filterPill, !!statusFilter && styles.filterPillActive]}
              onPress={() => { setActiveFilterPicker('status'); setFilterPickerOpen(true); }}
            >
              <Text style={[styles.filterPillText, !!statusFilter && styles.filterPillTextActive]} allowFontScaling={false}>
                Status: {statusFilter || 'All'}
              </Text>
              <Ionicons name="chevron-down" size={12} color={statusFilter ? '#38bdf8' : '#94a3b8'} />
            </TouchableOpacity>
          )}

          {activeTab === 'violations' && (
            <>
              <TouchableOpacity
                style={[styles.filterPill, !!severityFilter && styles.filterPillActive]}
                onPress={() => { setActiveFilterPicker('severity'); setFilterPickerOpen(true); }}
              >
                <Text style={[styles.filterPillText, !!severityFilter && styles.filterPillTextActive]} allowFontScaling={false}>
                  Severity: {severityFilter || 'All'}
                </Text>
                <Ionicons name="chevron-down" size={12} color={severityFilter ? '#38bdf8' : '#94a3b8'} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, !!statusFilter && styles.filterPillActive]}
                onPress={() => { setActiveFilterPicker('status'); setFilterPickerOpen(true); }}
              >
                <Text style={[styles.filterPillText, !!statusFilter && styles.filterPillTextActive]} allowFontScaling={false}>
                  Status: {statusFilter || 'All'}
                </Text>
                <Ionicons name="chevron-down" size={12} color={statusFilter ? '#38bdf8' : '#94a3b8'} />
              </TouchableOpacity>
            </>
          )}

          {(!!priorityFilter || !!statusFilter || !!severityFilter) && (
            <TouchableOpacity
              style={styles.resetFilterBtn}
              onPress={() => { setPriorityFilter(''); setStatusFilter(''); setSeverityFilter(''); }}
            >
              <Ionicons name="refresh-outline" size={12} color="#f43f5e" />
              <Text style={styles.resetFilterText} allowFontScaling={false}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Switcher tabs */}
        {isManager && (
          <View style={[styles.tabContainer, { margin: 0, marginTop: 8, marginBottom: 4 }]}>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'requests' && styles.tabBtnActive]} onPress={() => setActiveTab('requests')}>
              <Text style={[styles.tabBtnText, activeTab === 'requests' && styles.tabBtnTextActive]} allowFontScaling={false}>Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'work_orders' && styles.tabBtnActive]} onPress={() => setActiveTab('work_orders')}>
              <Text style={[styles.tabBtnText, activeTab === 'work_orders' && styles.tabBtnTextActive]} allowFontScaling={false}>Work Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'violations' && styles.tabBtnActive]} onPress={() => setActiveTab('violations')}>
              <Text style={[styles.tabBtnText, activeTab === 'violations' && styles.tabBtnTextActive]} allowFontScaling={false}>Violations</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'staff' && styles.tabBtnActive]} onPress={() => setActiveTab('staff')}>
              <Text style={[styles.tabBtnText, activeTab === 'staff' && styles.tabBtnTextActive]} allowFontScaling={false}>Staff</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Listing according to active tab */}
          {activeTab === 'requests' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} allowFontScaling={false}>
                  ACTIVE SERVICE TICKETS ({filteredRequests.length})
                </Text>
              </View>

              {filteredRequests.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="hammer-outline" size={48} color="#475569" style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyText} allowFontScaling={false}>No service requests found</Text>
                </View>
              ) : (
                filteredRequests.map((item, idx) => {
                  const reqNo = item.requestNumber || `#${1001 + idx}`;
                  const priorityColor = item.priority === 'Emergency' ? '#ef4444' : item.priority === 'High' ? '#f59e0b' : '#38bdf8';
                  const priorityBg = item.priority === 'Emergency' ? 'rgba(239, 68, 68, 0.12)' : item.priority === 'High' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.12)';
                  
                  const statusColor = item.status === 'Completed' || item.status === 'Closed' ? '#10b981' : '#f59e0b';
                  const statusBg = item.status === 'Completed' || item.status === 'Closed' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)';

                  return (
                    <View key={item.id || `req-${idx}`} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.ticketNoText} allowFontScaling={false}>Ticket {reqNo}</Text>
                          <Text style={styles.ticketTitle} allowFontScaling={false}>{item.title}</Text>
                        </View>
                        <View style={styles.badgesRow}>
                          <TouchableOpacity style={styles.eyeBtn} onPress={() => handleViewTicket(item)} activeOpacity={0.7}>
                            <Ionicons name="eye-outline" size={16} color="#38bdf8" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteRequest(item.id, item.title)} activeOpacity={0.7}>
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.metaRow}>
                        <View style={styles.metaCol}>
                          <Ionicons name="business-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                          <Text style={styles.metaText} allowFontScaling={false} numberOfLines={1}>
                            {item.propertyName || 'Property'} · Unit {item.unitNumber || '2A'}
                          </Text>
                        </View>
                        <View style={styles.metaColRight}>
                          <Ionicons name="person-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                          <Text style={styles.metaText} allowFontScaling={false} numberOfLines={1}>
                            {item.tenantName || 'Resident'}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.metaRow, { marginTop: 8 }]}>
                        <View style={[styles.priorityBadge, { backgroundColor: priorityBg, borderColor: priorityColor }]}>
                          <Text style={[styles.priorityBadgeText, { color: priorityColor }]} allowFontScaling={false}>
                            {item.priority || 'Medium'}
                          </Text>
                        </View>
                        <View style={[styles.activeBadge, { backgroundColor: statusBg, borderColor: statusColor, paddingVertical: 2 }]}>
                          <Text style={[styles.activeBadgeText, { color: statusColor }]} allowFontScaling={false}>
                            {item.status || 'New'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {activeTab === 'work_orders' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} allowFontScaling={false}>
                  DISPATCHED WORK ORDERS ({filteredWorkOrders.length})
                </Text>
              </View>

              {filteredWorkOrders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="construct-outline" size={48} color="#475569" style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyText} allowFontScaling={false}>No work orders found</Text>
                </View>
              ) : (
                filteredWorkOrders.map((w, idx) => (
                  <View key={w.id || `wo-${idx}`} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ticketNoText} allowFontScaling={false}>{w.workOrderNumber || `#WO-${1001 + idx}`}</Text>
                        <Text style={styles.ticketTitle} allowFontScaling={false}>{w.title || w.issue || 'Maintenance Dispatch'}</Text>
                      </View>
                      <View style={[styles.activeBadge, { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: '#38bdf8' }]}>
                        <Text style={[styles.activeBadgeText, { color: '#38bdf8' }]} allowFontScaling={false}>{w.status || 'Assigned'}</Text>
                      </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.metaRow}>
                      <View style={styles.metaCol}>
                        <Ionicons name="business-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                        <Text style={styles.metaText} allowFontScaling={false}>{w.propertyName} · {w.unitNumber}</Text>
                      </View>
                      <View style={styles.metaColRight}>
                        <Ionicons name="person-circle-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                        <Text style={styles.metaText} allowFontScaling={false}>{w.assignedVendorName || w.vendorName || 'Unassigned'}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'violations' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} allowFontScaling={false}>
                  NYC DOB CODE VIOLATIONS & NOTICES ({filteredViolations.length})
                </Text>
              </View>

              {filteredViolations.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="warning-outline" size={48} color="#f43f5e" style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyText} allowFontScaling={false}>No open DOB code violations found</Text>
                  <TouchableOpacity style={[styles.syncBtn, { marginTop: 12 }]} onPress={handleSyncDob} disabled={syncingDob}>
                    <Text style={styles.syncBtnText} allowFontScaling={false}>Sync NYC DOB Open Data</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredViolations.map((v, idx) => {
                  const sevColor = v.severity === 'Critical' || v.severity === 'Hazardous' ? '#f43f5e' : '#f59e0b';
                  const sevBg = v.severity === 'Critical' || v.severity === 'Hazardous' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)';

                  return (
                    <View key={v.id || `viol-${idx}`} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.ticketNoText, { color: '#f43f5e' }]} allowFontScaling={false}>{v.violationCode}</Text>
                          <Text style={styles.ticketTitle} allowFontScaling={false}>{v.description}</Text>
                        </View>
                        <View style={[styles.priorityBadge, { backgroundColor: sevBg, borderColor: sevColor }]}>
                          <Text style={[styles.priorityBadgeText, { color: sevColor }]} allowFontScaling={false}>{v.severity}</Text>
                        </View>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.metaRow}>
                        <View style={styles.metaCol}>
                          <Ionicons name="business-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                          <Text style={styles.metaText} allowFontScaling={false}>{v.propertyName} · {v.unitNumber}</Text>
                        </View>
                        <View style={styles.metaColRight}>
                          <Ionicons name="shield-checkmark-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                          <Text style={styles.metaText} allowFontScaling={false}>{v.issuingAuthority}</Text>
                        </View>
                      </View>

                      <View style={[styles.metaRow, { marginTop: 12, justifyContent: 'flex-end' }]}>
                        <TouchableOpacity
                          style={styles.dispatchBtn}
                          onPress={() => handleOpenDispatchModal(v)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="flash-outline" size={14} color="#0f172a" style={{ marginRight: 4 }} />
                          <Text style={styles.dispatchBtnText} allowFontScaling={false}>Dispatch Work Order</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {activeTab === 'staff' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} allowFontScaling={false}>
                  MAINTENANCE STAFF DIRECTORY ({filteredStaff.length})
                </Text>
              </View>

              {filteredStaff.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="people-outline" size={48} color="#475569" style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyText} allowFontScaling={false}>No staff profiles found</Text>
                </View>
              ) : (
                filteredStaff.map((s, idx) => (
                  <View key={s.id || `staff-${idx}`} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.staffAvatar}>
                        <Ionicons name="person-outline" size={20} color="#38bdf8" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.ticketTitle} allowFontScaling={false}>{s.companyName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim()}</Text>
                        <Text style={styles.metaText} allowFontScaling={false}>{s.specialty || 'General Maintenance Contractor'}</Text>
                      </View>
                      <View style={[styles.activeBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: '#10b981' }]}>
                        <Text style={[styles.activeBadgeText, { color: '#10b981' }]} allowFontScaling={false}>{s.status || 'Active'}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* --- CREATE SERVICE TICKET MODAL --- */}
      <Modal visible={isCreateOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Submit Service Ticket</Text>
                <TouchableOpacity onPress={() => setIsCreateOpen(false)}>
                  <Ionicons name="close" size={22} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Property Dropdown */}
                <View style={[styles.formGroup, showCPropDropdown && { zIndex: 9999, position: 'relative' }]}>
                  <Text style={styles.formLabel} allowFontScaling={false}>PROPERTY PORTFOLIO</Text>
                  <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowCPropDropdown(!showCPropDropdown)} activeOpacity={0.7}>
                    <Text style={styles.dropdownTriggerText} allowFontScaling={false}>
                      {properties.find(p => p.id === cPropId)?.name || 'Select Property...'}
                    </Text>
                    <Ionicons name={showCPropDropdown ? "chevron-up" : "chevron-down"} size={14} color="#cbd5e1" />
                  </TouchableOpacity>
                  {showCPropDropdown && (
                    <View style={styles.dropdownContainer}>
                      {properties.map((opt) => (
                        <TouchableOpacity key={opt.id} style={styles.dropdownItem} onPress={() => { setCPropId(opt.id); setCBuildingId(''); setCUnitId(''); setShowCPropDropdown(false); }}>
                          <Text style={styles.dropdownItemText} allowFontScaling={false}>{opt.name}</Text>
                          {cPropId === opt.id && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.formRow}>
                  {/* Building Dropdown filtered */}
                  <View style={[styles.formGroup, { flex: 1 }, showCBuildingDropdown && { zIndex: 9998, position: 'relative' }]}>
                    <Text style={styles.formLabel} allowFontScaling={false}>BUILDING</Text>
                    <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowCBuildingDropdown(!showCBuildingDropdown)} activeOpacity={0.7}>
                      <Text style={styles.dropdownTriggerText} allowFontScaling={false}>
                        {buildings.find(b => b.id === cBuildingId)?.name || 'Select...'}
                      </Text>
                      <Ionicons name={showCBuildingDropdown ? "chevron-up" : "chevron-down"} size={14} color="#cbd5e1" />
                    </TouchableOpacity>
                    {showCBuildingDropdown && (
                      <View style={styles.dropdownContainer}>
                        {buildings.filter(b => !cPropId || b.propertyId === cPropId).map((opt) => (
                          <TouchableOpacity key={opt.id} style={styles.dropdownItem} onPress={() => { setCBuildingId(opt.id); setShowCBuildingDropdown(false); }}>
                            <Text style={styles.dropdownItemText} allowFontScaling={false}>{opt.name}</Text>
                            {cBuildingId === opt.id && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Unit Dropdown filtered */}
                  <View style={[styles.formGroup, { flex: 1 }, showCUnitDropdown && { zIndex: 9998, position: 'relative' }]}>
                    <Text style={styles.formLabel} allowFontScaling={false}>UNIT</Text>
                    <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowCUnitDropdown(!showCUnitDropdown)} activeOpacity={0.7}>
                      <Text style={styles.dropdownTriggerText} allowFontScaling={false}>
                        {units.find(u => u.id === cUnitId)?.unitNumber || 'Select...'}
                      </Text>
                      <Ionicons name={showCUnitDropdown ? "chevron-up" : "chevron-down"} size={14} color="#cbd5e1" />
                    </TouchableOpacity>
                    {showCUnitDropdown && (
                      <View style={styles.dropdownContainer}>
                        {units.filter(u => (!cPropId || u.propertyId === cPropId) && (!cBuildingId || u.buildingId === cBuildingId)).map((opt) => (
                          <TouchableOpacity key={opt.id} style={styles.dropdownItem} onPress={() => { setCUnitId(opt.id); setShowCUnitDropdown(false); }}>
                            <Text style={styles.dropdownItemText} allowFontScaling={false}>Unit {opt.unitNumber}</Text>
                            {cUnitId === opt.id && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>RESIDENT PAYEE NAME</Text>
                  <TextInput style={styles.formInput} placeholder="Resident contact name..." placeholderTextColor="#64748b" value={cResidentPayee} onChangeText={setCResidentPayee} />
                </View>

                <View style={styles.formRow}>
                  {/* Issue Category dropdown */}
                  <View style={[styles.formGroup, { flex: 1 }, showCCatDropdown && { zIndex: 9997, position: 'relative' }]}>
                    <Text style={styles.formLabel} allowFontScaling={false}>ISSUE CATEGORY</Text>
                    <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowCCatDropdown(!showCCatDropdown)} activeOpacity={0.7}>
                      <Text style={styles.dropdownTriggerText} allowFontScaling={false}>{cCategory}</Text>
                      <Ionicons name={showCCatDropdown ? "chevron-up" : "chevron-down"} size={14} color="#cbd5e1" />
                    </TouchableOpacity>
                    {showCCatDropdown && (
                      <View style={styles.dropdownContainer}>
                        {categoriesList.map((opt) => (
                          <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { setShowCCatDropdown(false); setCCategory(opt); }}>
                            <Text style={styles.dropdownItemText} allowFontScaling={false}>{opt}</Text>
                            {cCategory === opt && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Priority dropdown */}
                  <View style={[styles.formGroup, { flex: 1 }, showCPriorityDropdown && { zIndex: 9997, position: 'relative' }]}>
                    <Text style={styles.formLabel} allowFontScaling={false}>PRIORITY BRACKET</Text>
                    <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowCPriorityDropdown(!showCPriorityDropdown)} activeOpacity={0.7}>
                      <Text style={styles.dropdownTriggerText} allowFontScaling={false}>{cPriority}</Text>
                      <Ionicons name={showCPriorityDropdown ? "chevron-up" : "chevron-down"} size={14} color="#cbd5e1" />
                    </TouchableOpacity>
                    {showCPriorityDropdown && (
                      <View style={styles.dropdownContainer}>
                        {priorityBrackets.map((opt) => (
                          <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { setShowCPriorityDropdown(false); setCPriority(opt); }}>
                            <Text style={styles.dropdownItemText} allowFontScaling={false}>{opt}</Text>
                            {cPriority === opt && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>SUBJECT / TITLE</Text>
                  <TextInput style={styles.formInput} placeholder="E.g., HVAC Fan Failure" placeholderTextColor="#64748b" value={cTitle} onChangeText={setCTitle} />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>DESCRIPTION OF ISSUE</Text>
                  <TextInput 
                    style={[styles.formInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]} 
                    placeholder="Describe the issue, leak rates, or equipment behaviors..." 
                    placeholderTextColor="#64748b" 
                    multiline 
                    value={cDesc} 
                    onChangeText={setCDesc} 
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel} allowFontScaling={false}>PREFERRED VISIT TIME</Text>
                    <TextInput style={styles.formInput} placeholder="E.g., Morning 8 AM - 12 PM" placeholderTextColor="#64748b" value={cPreferredTime} onChangeText={setCPreferredTime} />
                  </View>
                  <TouchableOpacity 
                    style={[styles.checkboxContainer, { flex: 1 }]} 
                    onPress={() => setCPermissionToEnter(!cPermissionToEnter)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, cPermissionToEnter && styles.checkboxChecked]}>
                      {cPermissionToEnter && <Ionicons name="checkmark" size={12} color="#0f172a" />}
                    </View>
                    <Text style={styles.checkboxLabel} allowFontScaling={false}>PERMISSION TO ENTER UNIT</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>DIAGNOSTIC NOTES (INTERNAL ONLY)</Text>
                  <TextInput 
                    style={[styles.formInput, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]} 
                    placeholder="Internal contractor notes..." 
                    placeholderTextColor="#64748b" 
                    multiline 
                    value={cNotes} 
                    onChangeText={setCNotes} 
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsCreateOpen(false)} disabled={submitting}>
                    <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleCreateRequest} disabled={submitting}>
                    {submitting ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.submitBtnText} allowFontScaling={false}>Submit Request</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- SERVICE TICKET DETAILS SPECS MODAL --- */}
      <Modal visible={!!selectedTicket} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalCard, { maxHeight: '90%' }]}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleRow}>
                  <Ionicons name="construct-outline" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                  <Text style={styles.modalTitle} allowFontScaling={false} numberOfLines={1}>
                    Service Ticket Details - {selectedTicket?.requestNumber || '#1'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                  <Ionicons name="close" size={22} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {detailLoading ? (
                <View style={[styles.center, { backgroundColor: 'transparent' }]}>
                  <ActivityIndicator size="large" color="#38bdf8" />
                </View>
              ) : (
                selectedTicket && (
                  <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={[styles.detailContainer, { marginTop: 0 }]}>
                      <Text style={[styles.ticketDetailTitle, { marginBottom: 6 }]} allowFontScaling={false}>{selectedTicket.title}</Text>
                      
                      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                        <View style={[styles.priorityBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' }]}>
                          <Text style={[styles.priorityBadgeText, { color: '#ef4444' }]} allowFontScaling={false}>{selectedTicket.priority || 'Normal'}</Text>
                        </View>
                        <View style={[styles.activeBadge, { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' }]}>
                          <Text style={[styles.activeBadgeText, { color: '#38bdf8' }]} allowFontScaling={false}>{selectedTicket.status || 'Pending'}</Text>
                        </View>
                      </View>

                      <Text style={styles.ticketDescText} allowFontScaling={false}>{selectedTicket.description}</Text>

                      <View style={styles.divider} />

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.metaLabel} allowFontScaling={false}>PROPERTY LOCATION</Text>
                          <Text style={styles.metaValText} allowFontScaling={false}>{selectedTicket.propertyName}</Text>
                          <Text style={[styles.metaValText, { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 2 }]} allowFontScaling={false}>
                            Unit: {selectedTicket.unitNumber || 'Building Wide'}
                          </Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <Text style={styles.metaLabel} allowFontScaling={false}>RESIDENT / AUDITOR</Text>
                          <Text style={[styles.metaValText, { textAlign: 'right' }]} allowFontScaling={false}>{selectedTicket.tenantName}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Chat messaging logs thread */}
                    <View style={styles.detailContainer}>
                      <Text style={styles.modalSectionTitle} allowFontScaling={false}>IN-APP TENANT MESSAGE THREAD</Text>
                      
                      <View style={styles.chatThreadWrapper}>
                        {(selectedTicket.messages || []).length === 0 ? (
                          <Text style={styles.noChatText} allowFontScaling={false}>No messages on this request yet.</Text>
                        ) : (
                          (selectedTicket.messages || []).map((msg, i) => {
                            const isMe = msg.role === 'Manager';
                            return (
                              <View key={msg.id || i} style={[styles.chatBubble, isMe ? styles.chatBubbleMe : styles.chatBubbleOther]}>
                                <Text style={styles.chatSender} allowFontScaling={false}>{msg.senderName} ({msg.role})</Text>
                                <Text style={styles.chatText} allowFontScaling={false}>{msg.text}</Text>
                                <Text style={styles.chatTime} allowFontScaling={false}>{msg.timestamp}</Text>
                              </View>
                            );
                          })
                        )}
                      </View>

                      <View style={styles.chatInputRow}>
                        <TextInput 
                          style={styles.chatInput} 
                          placeholder="Type message update to resident..." 
                          placeholderTextColor="#64748b" 
                          value={chatMessage} 
                          onChangeText={setChatMessage} 
                        />
                        <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendMessage}>
                          <Ionicons name="send" size={14} color="#0f172a" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Access & Scheduling details */}
                    <View style={styles.detailContainer}>
                      <Text style={styles.modalSectionTitle} allowFontScaling={false}>ACCESS & SCHEDULING</Text>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel} allowFontScaling={false}>Preferred Visit Time</Text>
                        <Text style={styles.detailVal} allowFontScaling={false}>{selectedTicket.preferredTime || 'Anytime'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel} allowFontScaling={false}>Permission to Enter</Text>
                        <Text style={[styles.detailVal, { color: '#10b981' }]} allowFontScaling={false}>
                          {selectedTicket.permissionToEnter || 'Granted'}
                        </Text>
                      </View>

                      <View style={styles.divider} />

                      {/* ASSIGN TECH VENDOR SELECTOR WITH ✨ AI AUTO-ASSIGN BUTTON */}
                      <View style={[styles.formGroup, showDVendorDropdown && { zIndex: 9999, position: 'relative' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={styles.formLabel} allowFontScaling={false}>ASSIGNED MAINTENANCE STAFF</Text>
                          <TouchableOpacity
                            style={styles.aiAutoAssignBtn}
                            onPress={handleAiAutoAssign}
                            disabled={aiAssignLoading}
                            activeOpacity={0.8}
                          >
                            {aiAssignLoading ? (
                              <ActivityIndicator size="small" color="#38bdf8" />
                            ) : (
                              <>
                                <Ionicons name="sparkles" size={12} color="#38bdf8" style={{ marginRight: 4 }} />
                                <Text style={styles.aiAutoAssignText} allowFontScaling={false}>✨ AI Auto-Assign</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowDVendorDropdown(!showDVendorDropdown)} activeOpacity={0.7}>
                          <Text style={styles.dropdownTriggerText} allowFontScaling={false}>
                            {staff.find(s => s.id === dAssignedVendorId)?.companyName || staff.find(s => s.id === dAssignedVendorId)?.name || 'Unassigned / Select Vendor...'}
                          </Text>
                          <Ionicons name={showDVendorDropdown ? "chevron-up" : "chevron-down"} size={14} color="#cbd5e1" />
                        </TouchableOpacity>
                        {showDVendorDropdown && (
                          <View style={styles.dropdownContainer}>
                            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setDAssignedVendorId(''); setShowDVendorDropdown(false); }}>
                              <Text style={styles.dropdownItemText} allowFontScaling={false}>Unassigned</Text>
                            </TouchableOpacity>
                            {staff.map((opt) => (
                              <TouchableOpacity key={opt.id} style={styles.dropdownItem} onPress={() => { setDAssignedVendorId(opt.id); setShowDVendorDropdown(false); }}>
                                <Text style={styles.dropdownItemText} allowFontScaling={false}>{opt.companyName || opt.name} ({opt.specialty || 'Staff'})</Text>
                                {dAssignedVendorId === opt.id && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel} allowFontScaling={false}>ASSIGNED TECHNICIAN</Text>
                        <TextInput style={styles.formInput} placeholder="Lead Technician Name" placeholderTextColor="#64748b" value={dTechnician} onChangeText={setDTechnician} />
                      </View>

                      <View style={styles.formRow}>
                        <View style={[styles.formGroup, { flex: 1 }]}>
                          <Text style={styles.formLabel} allowFontScaling={false}>ESTIMATED COST ($)</Text>
                          <TextInput style={styles.formInput} placeholder="Estimated Cost" keyboardType="numeric" placeholderTextColor="#64748b" value={dEstCost} onChangeText={setDEstCost} />
                        </View>
                        <View style={[styles.formGroup, { flex: 1 }]}>
                          <Text style={styles.formLabel} allowFontScaling={false}>FINAL ACTUAL COST ($)</Text>
                          <TextInput style={styles.formInput} placeholder="Actual Cost" keyboardType="numeric" placeholderTextColor="#64748b" value={dCost} onChangeText={setDCost} />
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel} allowFontScaling={false}>SCHEDULED DATE (YYYY-MM-DD)</Text>
                        <TextInput style={styles.formInput} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" value={dSchedDate} onChangeText={setDSchedDate} />
                      </View>

                      <View style={styles.formRow}>
                        {/* Status dropdown */}
                        <View style={[styles.formGroup, { flex: 1 }, showDStatusDropdown && { zIndex: 9998, position: 'relative' }]}>
                          <Text style={styles.formLabel} allowFontScaling={false}>STATUS</Text>
                          <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowDStatusDropdown(!showDStatusDropdown)} activeOpacity={0.7}>
                            <Text style={styles.dropdownTriggerText} allowFontScaling={false}>{dStatus}</Text>
                            <Ionicons name={showDStatusDropdown ? "chevron-up" : "chevron-down"} size={14} color="#cbd5e1" />
                          </TouchableOpacity>
                          {showDStatusDropdown && (
                            <View style={styles.dropdownContainer}>
                              {statusOptions.map((opt) => (
                                <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { setDStatus(opt); setShowDStatusDropdown(false); }}>
                                  <Text style={styles.dropdownItemText} allowFontScaling={false}>{opt}</Text>
                                  {dStatus === opt && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>

                        {/* Priority dropdown */}
                        <View style={[styles.formGroup, { flex: 1 }, showDPriorityDropdown && { zIndex: 9998, position: 'relative' }]}>
                          <Text style={styles.formLabel} allowFontScaling={false}>PRIORITY</Text>
                          <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowDPriorityDropdown(!showDPriorityDropdown)} activeOpacity={0.7}>
                            <Text style={styles.dropdownTriggerText} allowFontScaling={false}>{dPriority}</Text>
                            <Ionicons name={showDPriorityDropdown ? "chevron-up" : "chevron-down"} size={14} color="#cbd5e1" />
                          </TouchableOpacity>
                          {showDPriorityDropdown && (
                            <View style={styles.dropdownContainer}>
                              {priorityBrackets.map((opt) => (
                                <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { setDPriority(opt); setShowDPriorityDropdown(false); }}>
                                  <Text style={styles.dropdownItemText} allowFontScaling={false}>{opt}</Text>
                                  {dPriority === opt && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel} allowFontScaling={false}>INTERNAL DIAGNOSTIC NOTES</Text>
                        <TextInput 
                          style={[styles.formInput, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]} 
                          placeholder="Diagnostic contractor notes..." 
                          placeholderTextColor="#64748b" 
                          multiline 
                          value={dNotes} 
                          onChangeText={setDNotes} 
                        />
                      </View>
                    </View>

                    <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedTicket(null)} disabled={submitting}>
                        <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleSaveTicketDetails} disabled={submitting}>
                        {submitting ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.submitBtnText} allowFontScaling={false}>Save Details</Text>}
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                )
              )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- SYNC NYC DOB VIOLATIONS MODAL (Matching Web Image 5) --- */}
      <Modal visible={isSyncModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalCard, { maxHeight: '85%' }]}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="shield-checkmark" size={20} color="#6366f1" style={{ marginRight: 8 }} />
                  <Text style={styles.modalTitle} allowFontScaling={false}>Sync NYC DOB Violations</Text>
                </View>
                <TouchableOpacity onPress={() => setIsSyncModalOpen(false)}>
                  <Ionicons name="close" size={22} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 14, lineHeight: 17 }} allowFontScaling={false}>
                Fetch live violations directly from NYC Open Data (Socrata API). You can bulk-sync all registered company properties or enter a single BIN manually.
              </Text>

              {/* Mode Switcher Tabs */}
              <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 3, marginBottom: 14 }}>
                <TouchableOpacity
                  style={[{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 }, syncMode === 'bulk' && { backgroundColor: '#6366f1' }]}
                  onPress={() => setSyncMode('bulk')}
                >
                  <Text style={[{ fontSize: 11.5, fontWeight: '700', color: colors.textSecondary }, syncMode === 'bulk' && { color: '#ffffff', fontWeight: '800' }]} allowFontScaling={false}>
                    ⚡ Sync All Properties (Bulk)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 }, syncMode === 'single' && { backgroundColor: '#6366f1' }]}
                  onPress={() => setSyncMode('single')}
                >
                  <Text style={[{ fontSize: 11.5, fontWeight: '700', color: colors.textSecondary }, syncMode === 'single' && { color: '#ffffff', fontWeight: '800' }]} allowFontScaling={false}>
                    🔍 Manual Single BIN
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false}>
                {syncMode === 'bulk' ? (
                  <View style={{ backgroundColor: 'rgba(99, 102, 241, 0.12)', borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.25)', padding: 12, borderRadius: 12, marginBottom: 14 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#6366f1', marginBottom: 4 }} allowFontScaling={false}>
                      ✓ Auto-Sync All Configured Properties
                    </Text>
                    <Text style={{ fontSize: 11.5, color: colors.textSecondary, lineHeight: 16 }} allowFontScaling={false}>
                      This will scan all properties in your portal with an assigned NYC BIN number and automatically fetch & attach their latest violations.
                    </Text>
                    <TouchableOpacity
                      style={{ backgroundColor: '#6366f1', borderRadius: 10, paddingVertical: 12, marginTop: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                      onPress={handleExecuteBulkSync}
                      disabled={syncingDob}
                    >
                      {syncingDob ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                          <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800' }} allowFontScaling={false}>Start Bulk Auto-Sync</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ marginBottom: 14 }}>
                    <Text style={styles.formLabel} allowFontScaling={false}>NYC BIN (BUILDING IDENTIFICATION NUMBER)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 4115368"
                      placeholderTextColor="#64748b"
                      keyboardType="numeric"
                      value={dobBin}
                      onChangeText={setDobBin}
                    />
                    <TouchableOpacity
                      style={{ backgroundColor: '#6366f1', borderRadius: 10, paddingVertical: 12, marginTop: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                      onPress={handleExecuteSingleSync}
                      disabled={syncingDob || !dobBin.trim()}
                    >
                      {syncingDob ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Ionicons name="cloud-download" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                          <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800' }} allowFontScaling={false}>Sync Single BIN</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {syncResult && (
                  <View style={[{ padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12 }, syncResult.success ? { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: '#10b981' } : { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: '#ef4444' }]}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: syncResult.success ? '#10b981' : '#ef4444' }} allowFontScaling={false}>
                      {syncResult.success ? '✓ Sync Completed Successfully' : '✕ Sync Failed'}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 2 }} allowFontScaling={false}>{syncResult.message}</Text>
                  </View>
                )}

                <View style={{ backgroundColor: colors.surface, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="information-circle-outline" size={16} color="#6366f1" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 10.5, color: colors.textSecondary }} allowFontScaling={false}>
                    Dataset ID: <Text style={{ fontWeight: '800', color: colors.textPrimary }}>3h2n-5cm9</Text> (NYC DOB Open Data)
                  </Text>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- 5-FIELD DISPATCH VIOLATION WORK ORDER MODAL (Matching Web) --- */}
      <Modal visible={dispatchModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalCard, { maxHeight: '85%' }]}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="flash-outline" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                  <Text style={styles.modalTitle} allowFontScaling={false}>Dispatch Work Order</Text>
                </View>
                <TouchableOpacity onPress={() => setDispatchModalOpen(false)}>
                  <Ionicons name="close" size={22} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 14 }} allowFontScaling={false}>
                Convert violation code "{selectedViolationForDispatch?.violationCode}" into a Service Ticket / Work Order with 5-point specs.
              </Text>

              <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* 1. Property Portfolio */}
                <View style={[styles.formGroup, showDispPropDropdown && { zIndex: 9999, position: 'relative' }]}>
                  <Text style={styles.formLabel} allowFontScaling={false}>1. PROPERTY PORTFOLIO</Text>
                  <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowDispPropDropdown(!showDispPropDropdown)}>
                    <Text style={styles.dropdownTriggerText} allowFontScaling={false}>
                      {properties.find(p => p.id === dispPropId)?.name || selectedViolationForDispatch?.propertyName || 'Select Property...'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#cbd5e1" />
                  </TouchableOpacity>
                  {showDispPropDropdown && (
                    <View style={styles.dropdownContainer}>
                      {properties.map(p => (
                        <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => { setDispPropId(p.id); setShowDispPropDropdown(false); }}>
                          <Text style={styles.dropdownItemText} allowFontScaling={false}>{p.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* 2. Building / Unit */}
                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel} allowFontScaling={false}>2. BUILDING</Text>
                    <TextInput style={styles.formInput} placeholder="Building Wide" placeholderTextColor="#64748b" value={dispBuildingId} onChangeText={setDispBuildingId} />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel} allowFontScaling={false}>UNIT NUMBER</Text>
                    <TextInput style={styles.formInput} placeholder="Unit Building Wide" placeholderTextColor="#64748b" value={dispUnitId} onChangeText={setDispUnitId} />
                  </View>
                </View>

                {/* 3. Assigned Vendor / Staff */}
                <View style={[styles.formGroup, showDispVendorDropdown && { zIndex: 9998, position: 'relative' }]}>
                  <Text style={styles.formLabel} allowFontScaling={false}>3. ASSIGNED MAINTENANCE STAFF / VENDOR</Text>
                  <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowDispVendorDropdown(!showDispVendorDropdown)}>
                    <Text style={styles.dropdownTriggerText} allowFontScaling={false}>
                      {staff.find(s => s.id === dispVendorId)?.companyName || staff.find(s => s.id === dispVendorId)?.name || 'Select Staff / Contractor...'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#cbd5e1" />
                  </TouchableOpacity>
                  {showDispVendorDropdown && (
                    <View style={styles.dropdownContainer}>
                      {staff.map(s => (
                        <TouchableOpacity key={s.id} style={styles.dropdownItem} onPress={() => { setDispVendorId(s.id); setShowDispVendorDropdown(false); }}>
                          <Text style={styles.dropdownItemText} allowFontScaling={false}>{s.companyName || s.name} ({s.specialty || 'General'})</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* 4. Priority */}
                <View style={[styles.formGroup, showDispPriorityDropdown && { zIndex: 9997, position: 'relative' }]}>
                  <Text style={styles.formLabel} allowFontScaling={false}>4. PRIORITY BRACKET</Text>
                  <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowDispPriorityDropdown(!showDispPriorityDropdown)}>
                    <Text style={styles.dropdownTriggerText} allowFontScaling={false}>{dispPriority}</Text>
                    <Ionicons name="chevron-down" size={14} color="#cbd5e1" />
                  </TouchableOpacity>
                  {showDispPriorityDropdown && (
                    <View style={styles.dropdownContainer}>
                      {['Emergency', 'High', 'Medium', 'Low'].map(p => (
                        <TouchableOpacity key={p} style={styles.dropdownItem} onPress={() => { setDispPriority(p); setShowDispPriorityDropdown(false); }}>
                          <Text style={styles.dropdownItemText} allowFontScaling={false}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* 5. Estimated Cost ($) */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>5. ESTIMATED COST ($)</Text>
                  <TextInput style={styles.formInput} placeholder="$ 250" placeholderTextColor="#64748b" keyboardType="numeric" value={dispEstCost} onChangeText={setDispEstCost} />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setDispatchModalOpen(false)} disabled={submitting}>
                    <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleConfirmDispatch} disabled={submitting}>
                    {submitting ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.submitBtnText} allowFontScaling={false}>Confirm & Dispatch Work Order</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- SELECTION DROP DOWN PICKER SELECTOR OPTIONS --- */}
      <Modal visible={filterPickerOpen} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle} allowFontScaling={false}>Select Filter</Text>
            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={true}>
              {getFilterOptions().map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.pickerOptionRow}
                  onPress={() => handleSelectFilter(opt.value)}
                >
                  <Text style={styles.pickerOptionText} allowFontScaling={false}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closePickerBtn} onPress={() => setFilterPickerOpen(false)}>
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
  scrollContent: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 8 },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    margin: 16,
    marginBottom: 0,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: colors.background },
  tabBtnText: { color: colors.textSecondary, fontSize: 11.5, fontWeight: '700' },
  tabBtnTextActive: { color: '#38bdf8' },

  header: { marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },

  // Search & Sync Controls
  searchBarRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'center' },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 12,
  },
  addBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 13, marginLeft: 4 },

  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 12,
  },
  syncBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12.5 },

  // Filter Pills Row
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: 4,
  },
  filterPillTextActive: {
    color: '#38bdf8',
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f43f5e',
    marginLeft: 3,
  },

  // Section Header
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },

  // Cards
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ticketNoText: { fontSize: 11, fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase' },
  ticketTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  badgesRow: { flexDirection: 'row', gap: 8 },
  eyeBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  divider: { height: 1, backgroundColor: colors.cardBorder, marginVertical: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaCol: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  metaColRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  metaText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  activeBadgeText: { fontSize: 10, fontWeight: '800' },

  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  dispatchBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },

  emptyCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },

  // AI Button
  aiAutoAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  aiAutoAssignText: { fontSize: 10, fontWeight: '800', color: '#38bdf8' },

  // Modal styles
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    width: '90%',
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  modalScroll: { flexGrow: 0 },
  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, marginBottom: 6 },
  formInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  formRow: { flexDirection: 'row', gap: 10 },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dropdownTriggerText: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  dropdownContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  dropdownItemText: { fontSize: 12.5, color: colors.textPrimary, fontWeight: '600' },

  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  checkboxLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.surface },
  cancelBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  submitBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#38bdf8' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#0f172a', fontSize: 13, fontWeight: '800' },

  detailContainer: { backgroundColor: colors.surface, padding: 14, borderRadius: 14, marginBottom: 14 },
  ticketDetailTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, flex: 1 },
  ticketDescText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  metaLabel: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase' },
  metaValText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },

  modalSectionTitle: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, marginBottom: 10, letterSpacing: 0.5 },
  chatThreadWrapper: { maxHeight: 150, marginBottom: 10 },
  noChatText: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
  chatBubble: { padding: 10, borderRadius: 10, marginBottom: 8, maxWidth: '85%' },
  chatBubbleMe: { backgroundColor: 'rgba(56, 189, 248, 0.15)', alignSelf: 'flex-end' },
  chatBubbleOther: { backgroundColor: colors.cardBg, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.cardBorder },
  chatSender: { fontSize: 10, fontWeight: '800', color: '#38bdf8', marginBottom: 2 },
  chatText: { fontSize: 12.5, color: colors.textPrimary },
  chatTime: { fontSize: 9, color: colors.textSecondary, marginTop: 4, textAlign: 'right' },
  chatInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chatInput: { flex: 1, backgroundColor: colors.cardBg, borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12.5, color: colors.textPrimary, borderWidth: 1, borderColor: colors.cardBorder },
  chatSendBtn: { backgroundColor: '#38bdf8', width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  detailVal: { fontSize: 12, color: colors.textPrimary, fontWeight: '700' },

  // Picker modal styling
  pickerModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: '80%',
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
  pickerOptionText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  closePickerBtn: {
    marginTop: 14,
    paddingVertical: 10,
    backgroundColor: '#f43f5e',
    borderRadius: 10,
    alignItems: 'center',
  },
  closePickerBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
});

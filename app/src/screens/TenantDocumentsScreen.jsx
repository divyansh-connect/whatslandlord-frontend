import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
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

export const TenantDocumentsScreen = () => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';
  
  // App role evaluation
  const isOwnerPortal = user?.role === 'Owner';
  const isTenantPortal = user?.role === 'Tenant';
  const isManager = !isOwnerPortal && !isTenantPortal;

  // General States
  const [documents, setDocuments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [ownersList, setOwnersList] = useState([]);
  const [tenantsList, setTenantsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tabs for Manager: 'all', 'owner', 'tenant'
  const [activeTab, setActiveTab] = useState('all');

  // Trigger dropdown for Manager upload button
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);

  // Upload Form Modals States
  const [isOwnerUploadOpen, setIsOwnerUploadOpen] = useState(false);
  const [isTenantUploadOpen, setIsTenantUploadOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // --- Upload Owner Document Form States ---
  const [oDocName, setODocName] = useState('');
  const [oCategory, setOCategory] = useState('Statement');
  const [oPropId, setOPropId] = useState('');
  const [oOwnerId, setOOwnerId] = useState('');
  const [showOPropDropdown, setShowOPropDropdown] = useState(false);
  const [showOOwnerDropdown, setShowOOwnerDropdown] = useState(false);
  const [showOCatDropdown, setShowOCatDropdown] = useState(false);

  // Auto-set owner info when property is selected in Upload Owner Document modal
  useEffect(() => {
    if (oPropId) {
      const selectedProp = properties.find((p) => p.id === oPropId);
      if (selectedProp) {
        const foundOwner = ownersList.find(
          (o) => o.id === selectedProp.ownerId || o.id === selectedProp.owner?.id
        );
        if (foundOwner) {
          setOOwnerId(foundOwner.id);
        } else if (selectedProp.ownerId) {
          setOOwnerId(selectedProp.ownerId);
        } else {
          setOOwnerId('');
        }
      }
    } else {
      setOOwnerId('');
    }
  }, [oPropId, properties, ownersList]);

  // --- Upload Tenant Document Form States ---
  const [tDocName, setTDocName] = useState('');
  const [tCategory, setTCategory] = useState('Lease');
  const [tPropId, setTPropId] = useState('');
  const [tTenantId, setTTenantId] = useState('');
  const [showTPropDropdown, setShowTPropDropdown] = useState(false);
  const [showTTenantDropdown, setShowTTenantDropdown] = useState(false);
  const [showTCatDropdown, setShowTCatDropdown] = useState(false);

  // Auto-set property info when tenant is selected in Upload Tenant Document modal
  useEffect(() => {
    if (tTenantId) {
      const selectedTenant = tenantsList.find((t) => t.id === tTenantId);
      if (selectedTenant) {
        setTPropId(selectedTenant.propertyId || selectedTenant.unit?.propertyId || '');
      }
    } else {
      setTPropId('');
    }
  }, [tTenantId, tenantsList]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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

  const fetchDocumentsData = async () => {
    try {
      setLoading(true);

      // Fetch according to role
      if (isManager) {
        const [ownerDocsRes, tenantDocsRes, propsRes, ownersRes, tenantsRes] = await Promise.all([
          apiClient.get('/documents/owner', logout, refreshAccessToken).catch(() => null),
          apiClient.get('/documents/tenant', logout, refreshAccessToken).catch(() => null),
          apiClient.get('/properties', logout, refreshAccessToken).catch(() => null),
          apiClient.get('/owners', logout, refreshAccessToken).catch(() => null),
          apiClient.get('/tenants', logout, refreshAccessToken).catch(() => null),
        ]);

        const oDocs = (ownerDocsRes?.data || []).map(d => ({ ...d, folder: 'Owners', type: 'owner' }));
        const tDocs = (tenantDocsRes?.data || []).map(d => ({ ...d, folder: 'Tenants', type: 'tenant' }));
        
        setDocuments([...oDocs, ...tDocs]);
        setProperties(propsRes?.data || []);
        setOwnersList(ownersRes?.data || []);
        setTenantsList(tenantsRes?.data || []);
      } else if (isOwnerPortal) {
        const res = await apiClient.get('/portal/owner/documents', logout, refreshAccessToken).catch(() => null);
        setDocuments(res?.data || []);
      } else {
        const [tenantDocsRes, allDocsRes] = await Promise.all([
          apiClient.get('/documents/tenant', logout, refreshAccessToken).catch(() => null),
          apiClient.get('/documents', logout, refreshAccessToken).catch(() => null),
        ]);
        const tDocs = tenantDocsRes?.data || [];
        const aDocs = allDocsRes?.data || [];
        setDocuments([...tDocs, ...aDocs]);
      }
    } catch (e) {
      console.log('Error fetching documents:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  useEffect(() => {
    fetchDocumentsData();
  }, [user?.role]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDocumentsData();
  };

  const handleDownload = (fileName) => {
    Alert.alert('Download File', `Downloading file "${fileName}" directly to your device storage.`);
  };

  // --- Submit Upload Owner Document ---
  const handleUploadOwnerSubmit = async () => {
    if (!oDocName.trim()) {
      Alert.alert('Validation Error', 'Document display name is required.');
      return;
    }

    try {
      setSubmitting(true);
      const finalDocName = oDocName.endsWith('.pdf') ? oDocName.trim() : `${oDocName.trim()}.pdf`;

      // Construct Multipart Form Data
      const formData = new FormData();
      formData.append('name', finalDocName);
      formData.append('category', oCategory);
      if (oOwnerId) formData.append('ownerId', oOwnerId);
      if (oPropId) formData.append('propertyId', oPropId);
      
      // Simulate/Attach file binary
      formData.append('file', {
        uri: 'data:application/pdf;base64,JVBERi0xLjQKJ...',
        name: finalDocName,
        type: 'application/pdf',
      });

      await apiClient.post('/documents/owner/upload', formData, logout, refreshAccessToken, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Alert.alert('Success', 'Owner document uploaded successfully.');
      setIsOwnerUploadOpen(false);
      setODocName('');
      setOOwnerId('');
      setOPropId('');
      fetchDocumentsData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to upload owner document');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Submit Upload Tenant Document ---
  const handleUploadTenantSubmit = async () => {
    if (!tDocName.trim()) {
      Alert.alert('Validation Error', 'Document display name is required.');
      return;
    }

    try {
      setSubmitting(true);
      const finalDocName = tDocName.endsWith('.pdf') ? tDocName.trim() : `${tDocName.trim()}.pdf`;

      // Construct Multipart Form Data
      const formData = new FormData();
      formData.append('name', finalDocName);
      formData.append('category', tCategory);
      if (tTenantId) formData.append('tenantId', tTenantId);
      if (tPropId) formData.append('propertyId', tPropId);
      
      formData.append('file', {
        uri: 'data:application/pdf;base64,JVBERi0xLjQKJ...',
        name: finalDocName,
        type: 'application/pdf',
      });

      await apiClient.post('/documents/tenant/upload', formData, logout, refreshAccessToken, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Alert.alert('Success', 'Tenant document uploaded successfully.');
      setIsTenantUploadOpen(false);
      setTDocName('');
      setTTenantId('');
      setTPropId('');
      fetchDocumentsData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to upload tenant document');
    } finally {
      setSubmitting(false);
    }
  };

  // Filters for Manager view tabs and search term
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = (doc.name || doc.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesTab = true;
    if (isManager) {
      if (activeTab === 'owner') matchesTab = doc.type === 'owner';
      if (activeTab === 'tenant') matchesTab = doc.type === 'tenant';
    }

    return matchesSearch && matchesTab;
  });

  const oCatOptions = ['Statement', 'Tax', 'Contracts', 'Other'];
  const tCatOptions = ['Lease', 'Receipt', 'Notice', 'Other'];

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>
          {es ? 'Cargando biblioteca de documentos...' : 'Loading documents library...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      {/* Header, Search bar & Tabs (Fixed) */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, zIndex: 10 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} allowFontScaling={false}>
            {isManager 
              ? (es ? 'Biblioteca de Todos los Documentos' : 'All Documents Library')
              : isOwnerPortal 
                ? (es ? 'Documentos del Propietario' : 'Owner Documents')
                : (es ? 'Mis Documentos' : 'My Documents')}
          </Text>
          <Text style={styles.subtitle} allowFontScaling={false}>
            {isManager 
              ? (es ? 'Examine, busque, filtre y gestione todos los archivos cargados de propiedades, inquilinos y contratos.' : 'Browse, search, filter, and manage all uploaded files across properties, tenants, and leases.')
              : (es ? 'Acceda a contratos de arrendamiento activos, avisos, estados de cuenta e informes fiscales.' : 'Access active lease agreements, notices, invoices statements and tax files.')}
          </Text>
        </View>

        {/* Search Controls & Upload Dropdown */}
        <View style={[styles.searchBarRow, { zIndex: 10, marginBottom: 12 }]}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={es ? 'Buscar documentos por nombre...' : 'Search documents by name...'}
              placeholderTextColor="#64748b"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
          
          {isManager ? (
            <View style={{ position: 'relative', zIndex: 9999 }}>
              <TouchableOpacity 
                style={styles.uploadBtn} 
                onPress={() => setShowUploadDropdown(!showUploadDropdown)}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload-outline" size={16} color="#0f172a" />
                <Text style={styles.uploadBtnText} allowFontScaling={false}>Upload</Text>
                <Ionicons name="chevron-down" size={12} color="#0f172a" />
              </TouchableOpacity>

              {showUploadDropdown && (
                <View style={styles.uploadDropdownContainer}>
                  <TouchableOpacity 
                    style={styles.uploadDropdownItem}
                    onPress={() => {
                      setShowUploadDropdown(false);
                      setIsOwnerUploadOpen(true);
                    }}
                  >
                    <Ionicons name="person-outline" size={14} color="#cbd5e1" style={{ marginRight: 8 }} />
                    <Text style={styles.uploadDropdownItemText} allowFontScaling={false}>Owner Document</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.uploadDropdownItem}
                    onPress={() => {
                      setShowUploadDropdown(false);
                      setIsTenantUploadOpen(true);
                    }}
                  >
                    <Ionicons name="people-outline" size={14} color="#cbd5e1" style={{ marginRight: 8 }} />
                    <Text style={styles.uploadDropdownItemText} allowFontScaling={false}>Tenant Document</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBtn} onPress={() => setIsOwnerUploadOpen(true)} activeOpacity={0.8}>
              <Ionicons name="cloud-upload-outline" size={16} color="#0f172a" />
              <Text style={styles.uploadBtnText} allowFontScaling={false}>Upload</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Manager Tab Selector */}
        {isManager && (
          <View style={[styles.tabContainer, { margin: 0, marginTop: 4, marginBottom: 4 }]}>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]} onPress={() => setActiveTab('all')}>
              <Text style={[styles.tabBtnText, activeTab === 'all' && styles.tabBtnTextActive]} allowFontScaling={false}>All Documents</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'owner' && styles.tabBtnActive]} onPress={() => setActiveTab('owner')}>
              <Text style={[styles.tabBtnText, activeTab === 'owner' && styles.tabBtnTextActive]} allowFontScaling={false}>Owner Docs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'tenant' && styles.tabBtnActive]} onPress={() => setActiveTab('tenant')}>
              <Text style={[styles.tabBtnText, activeTab === 'tenant' && styles.tabBtnTextActive]} allowFontScaling={false}>Tenant Docs</Text>
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

          {/* Section title */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} allowFontScaling={false}>
              UPLOADED LIBRARY ARCHIVE ({filteredDocs.length})
            </Text>
          </View>

          {/* Documents card listing */}
          {filteredDocs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={48} color="#475569" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyText} allowFontScaling={false}>No documents found</Text>
            </View>
          ) : (
            filteredDocs.map((item, idx) => {
              const isPdf = String(item.name || '').toLowerCase().endsWith('.pdf');
              return (
                <View key={item.id || `doc-${idx}`} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.docIconWrapper}>
                      <Ionicons 
                        name={isPdf ? "document-text" : "image"} 
                        size={20} 
                        color={isPdf ? "#ef4444" : "#38bdf8"} 
                      />
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docName} allowFontScaling={false} numberOfLines={1}>
                        {item.name || item.title || 'Statement.pdf'}
                      </Text>
                      <Text style={styles.docSubText} allowFontScaling={false}>
                        {item.size || item.fileSize || '1.4 MB'} · Uploaded: {item.uploadedDate || String(item.createdAt).split('T')[0] || '2026-08-01'}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.downloadBtn} 
                      onPress={() => handleDownload(item.name || item.title || 'Statement.pdf')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="download-outline" size={18} color="#cbd5e1" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.divider} />

                  {/* Metadata labels row */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel} allowFontScaling={false}>CATEGORY</Text>
                      <View style={styles.catBadge}>
                        <Text style={styles.catBadgeText} allowFontScaling={false}>{item.category || 'Statements'}</Text>
                      </View>
                    </View>
                    
                    {isManager && (
                      <>
                        <View style={styles.metaCol}>
                          <Text style={styles.metaLabel} allowFontScaling={false}>FOLDER</Text>
                          <Text style={styles.metaValText} allowFontScaling={false}>{item.folder || 'Archive'}</Text>
                        </View>
                        <View style={styles.metaColRight}>
                          <Text style={styles.metaLabel} allowFontScaling={false}>PROPERTY</Text>
                          <Text style={styles.metaValText} allowFontScaling={false} numberOfLines={1}>
                            {properties.find(p => p.id === item.propertyId)?.name || 'N/A'}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>

      {/* --- UPLOAD OWNER DOCUMENT MODAL --- */}
      <Modal visible={isOwnerUploadOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Upload Document for Owner</Text>
                <TouchableOpacity onPress={() => setIsOwnerUploadOpen(false)}>
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalSubHeader} allowFontScaling={false}>Upload tax, statement, or contract documents associated directly with property owners.</Text>
                
                {/* Property Selector */}
                <View style={[styles.formGroup, showOPropDropdown && { zIndex: 9999, position: 'relative' }]}>
                  <Text style={styles.formLabel} allowFontScaling={false}>PROPERTY</Text>
                  <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowOPropDropdown(!showOPropDropdown)} activeOpacity={0.7}>
                    <Text style={styles.dropdownTriggerText} allowFontScaling={false}>
                      {properties.find(p => p.id === oPropId)?.name || 'Select Property...'}
                    </Text>
                    <Ionicons name={showOPropDropdown ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                  {showOPropDropdown && (
                    <View style={styles.dropdownContainer}>
                      {properties.map((opt) => (
                        <TouchableOpacity key={opt.id} style={styles.dropdownItem} onPress={() => { 
                          setOPropId(opt.id); 
                          const foundOwner = ownersList.find((o) => o.id === opt.ownerId || o.id === opt.owner?.id);
                          setOOwnerId(foundOwner ? foundOwner.id : (opt.ownerId || ''));
                          setShowOPropDropdown(false); 
                        }}>
                          <Text style={styles.dropdownItemText} allowFontScaling={false}>{opt.name}</Text>
                          {oPropId === opt.id && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Associated Owner (Auto-filled & disabled read-only) */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>ASSOCIATED OWNER</Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0',
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        opacity: 0.75,
                      }
                    ]}
                    placeholder={oPropId ? 'No owner assigned to this property' : 'Select a property first'}
                    placeholderTextColor="#64748b"
                    value={(() => {
                      if (!oPropId) return 'Select a property first';
                      const selectedProp = properties.find((p) => p.id === oPropId);
                      if (!selectedProp) return 'Select a property first';
                      const ownerObj = ownersList.find((o) => o.id === oOwnerId || o.id === selectedProp.ownerId || o.id === selectedProp.owner?.id) || selectedProp.owner;
                      if (ownerObj) {
                        const fullName = ownerObj.name || `${ownerObj.firstName || ''} ${ownerObj.lastName || ''}`.trim() || 'Unknown Owner';
                        return `${fullName} (${ownerObj.companyName || 'Individual'})`;
                      }
                      return 'No owner assigned to this property';
                    })()}
                    editable={false}
                  />
                </View>

                {/* Category Selector */}
                <View style={[styles.formGroup, showOCatDropdown && { zIndex: 9997, position: 'relative' }]}>
                  <Text style={styles.formLabel} allowFontScaling={false}>CATEGORY</Text>
                  <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowOCatDropdown(!showOCatDropdown)} activeOpacity={0.7}>
                    <Text style={styles.dropdownTriggerText} allowFontScaling={false}>{oCategory}</Text>
                    <Ionicons name={showOCatDropdown ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                  {showOCatDropdown && (
                    <View style={styles.dropdownContainer}>
                      {oCatOptions.map((opt) => (
                        <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { setOCategory(opt); setShowOCatDropdown(false); }}>
                          <Text style={styles.dropdownItemText} allowFontScaling={false}>{opt}</Text>
                          {oCategory === opt && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>DOCUMENT DISPLAY NAME</Text>
                  <TextInput style={styles.formInput} placeholder="E.g., Statement_2026" placeholderTextColor="#64748b" value={oDocName} onChangeText={setODocName} />
                </View>

                {/* Drag and Drop simulator box */}
                <View style={styles.dragDropBox}>
                  <Ionicons name="cloud-upload-outline" size={32} color="#94a3b8" />
                  <Text style={styles.dragDropTitle} allowFontScaling={false}>Mock_Document_File.pdf</Text>
                  <Text style={styles.dragDropSub} allowFontScaling={false}>Tap to confirm selector. Max size 1 MB</Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsOwnerUploadOpen(false)} disabled={submitting}>
                    <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleUploadOwnerSubmit} disabled={submitting}>
                    {submitting ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.submitBtnText} allowFontScaling={false}>Upload File</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- UPLOAD TENANT DOCUMENT MODAL --- */}
      <Modal visible={isTenantUploadOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Upload Document for Tenant</Text>
                <TouchableOpacity onPress={() => setIsTenantUploadOpen(false)}>
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalSubHeader} allowFontScaling={false}>Upload lease, receipt, or notice documents associated with tenant accounts.</Text>

                {/* Tenant Selector (First, matching Web UI) */}
                <View style={[styles.formGroup, showTTenantDropdown && { zIndex: 9999, position: 'relative' }]}>
                  <Text style={styles.formLabel} allowFontScaling={false}>TENANT</Text>
                  <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowTTenantDropdown(!showTTenantDropdown)} activeOpacity={0.7}>
                    <Text style={styles.dropdownTriggerText} allowFontScaling={false}>
                      {tenantsList.find(t => t.id === tTenantId) ? `${tenantsList.find(t => t.id === tTenantId).firstName} ${tenantsList.find(t => t.id === tTenantId).lastName}` : 'Select Tenant...'}
                    </Text>
                    <Ionicons name={showTTenantDropdown ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                  {showTTenantDropdown && (
                    <View style={styles.dropdownContainer}>
                      {tenantsList.map((opt) => (
                        <TouchableOpacity key={opt.id} style={styles.dropdownItem} onPress={() => { 
                          setTTenantId(opt.id); 
                          setTPropId(opt.propertyId || opt.unit?.propertyId || '');
                          setShowTTenantDropdown(false); 
                        }}>
                          <Text style={styles.dropdownItemText} allowFontScaling={false}>
                            {opt.firstName} {opt.lastName} {opt.unit?.unitNumber ? `(Unit ${opt.unit.unitNumber})` : ''}
                          </Text>
                          {tTenantId === opt.id && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Category Selector */}
                <View style={[styles.formGroup, showTCatDropdown && { zIndex: 9997, position: 'relative' }]}>
                  <Text style={styles.formLabel} allowFontScaling={false}>CATEGORY</Text>
                  <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowTCatDropdown(!showTCatDropdown)} activeOpacity={0.7}>
                    <Text style={styles.dropdownTriggerText} allowFontScaling={false}>{tCategory}</Text>
                    <Ionicons name={showTCatDropdown ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                  {showTCatDropdown && (
                    <View style={styles.dropdownContainer}>
                      {tCatOptions.map((opt) => (
                        <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { setTCategory(opt); setShowTCatDropdown(false); }}>
                          <Text style={styles.dropdownItemText} allowFontScaling={false}>{opt}</Text>
                          {tCategory === opt && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>DOCUMENT DISPLAY NAME</Text>
                  <TextInput style={styles.formInput} placeholder="E.g., Lease_Agreement_2026" placeholderTextColor="#64748b" value={tDocName} onChangeText={setTDocName} />
                </View>

                {/* Drag and Drop simulator box */}
                <View style={styles.dragDropBox}>
                  <Ionicons name="cloud-upload-outline" size={32} color="#94a3b8" />
                  <Text style={styles.dragDropTitle} allowFontScaling={false}>Mock_Lease_File.pdf</Text>
                  <Text style={styles.dragDropSub} allowFontScaling={false}>Tap to confirm selector. Max size 1 MB</Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsTenantUploadOpen(false)} disabled={submitting}>
                    <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleUploadTenantSubmit} disabled={submitting}>
                    {submitting ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.submitBtnText} allowFontScaling={false}>Upload File</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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

  // Tabs for Manager
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
  tabBtnText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  tabBtnTextActive: { color: '#38bdf8' },

  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 11.5, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },

  // Search Controls
  searchBarRow: { flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'center' },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: { color: colors.textPrimary, fontSize: 12, flex: 1, padding: 0 },
  uploadBtn: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 40,
  },
  uploadBtnText: { color: '#0f172a', fontSize: 12, fontWeight: '800' },

  // Upload dropdown menu
  uploadDropdownContainer: {
    position: 'absolute',
    top: 45,
    right: 0,
    width: 160,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    zIndex: 9999,
    overflow: 'hidden',
  },
  uploadDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  uploadDropdownItemText: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },

  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },

  emptyCard: { backgroundColor: colors.surface, padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  emptyText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },

  // Cards
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.cardBorder },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  docIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  docInfo: { flex: 1 },
  docName: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary },
  docSubText: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  downloadBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center' },

  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 12 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaCol: { flex: 1, marginRight: 8 },
  metaColRight: { flex: 1, alignItems: 'flex-end' },
  metaLabel: { fontSize: 8.5, color: colors.textMuted, fontWeight: '850', letterSpacing: 0.5, marginBottom: 4 },
  metaValText: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
  catBadge: { backgroundColor: 'rgba(56, 189, 248, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#38bdf8', alignSelf: 'flex-start' },
  catBadgeText: { color: '#38bdf8', fontSize: 9, fontWeight: '800' },

  // Modal styling
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.cardBorder, maxHeight: '85%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  modalSubHeader: { fontSize: 11, color: colors.textSecondary, lineHeight: 16, marginTop: 4, marginBottom: 14 },
  modalScroll: { marginBottom: 16 },

  formGroup: { marginBottom: 14 },
  formRow: { flexDirection: 'row', gap: 10 },
  formLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 6 },
  formInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: colors.textPrimary,
    fontSize: 13,
  },

  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  dropdownTriggerText: { color: colors.textSecondary, fontSize: 13 },
  dropdownContainer: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    zIndex: 9999,
    elevation: 5,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  dropdownItemText: { color: colors.textSecondary, fontSize: 12.5 },

  dragDropBox: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  dragDropTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '800', marginTop: 8 },
  dragDropSub: { color: colors.textMuted, fontSize: 11, marginTop: 4 },

  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 14, marginTop: 10 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.inputBorder },
  cancelBtnText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '700' },
  submitBtn: { backgroundColor: '#38bdf8', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, minWidth: 110, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#0f172a', fontSize: 12.5, fontWeight: '800' },
});

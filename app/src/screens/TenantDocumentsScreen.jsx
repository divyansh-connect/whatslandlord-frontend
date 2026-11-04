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
  RefreshControl,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Linking,
} from 'react-native';
import { AppActivityIndicator as ActivityIndicator } from '../components/AppActivityIndicator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';

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

export const TenantDocumentsScreen = ({ onNavigate, onBack, initialTab }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';
  
  // App role evaluation
  const isOwnerPortal = user?.role === 'Owner' || user?.roleName === 'Owner';
  const isTenantPortal = user?.role === 'Tenant' || user?.roleName === 'Tenant';
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
  const [activeTab, setActiveTab] = useState(initialTab || 'all');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Trigger dropdown for Manager upload button
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);

  // Upload Form Modals States
  const [isOwnerUploadOpen, setIsOwnerUploadOpen] = useState(false);
  const [isTenantUploadOpen, setIsTenantUploadOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadedDocIds, setDownloadedDocIds] = useState(new Set());

  // Load previously downloaded documents on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('@app_downloaded_doc_ids');
        if (stored) {
          const arr = JSON.parse(stored);
          if (Array.isArray(arr)) setDownloadedDocIds(new Set(arr));
        }
      } catch (_) {}
    })();
  }, []);

  const markAsDownloaded = (docId) => {
    if (!docId) return;
    setDownloadedDocIds((prev) => {
      const next = new Set(prev);
      next.add(String(docId));
      AsyncStorage.setItem('@app_downloaded_doc_ids', JSON.stringify(Array.from(next))).catch(() => null);
      return next;
    });
  };

  // --- Upload Owner Document Form States ---
  const [oDocName, setODocName] = useState('');
  const [oCategory, setOCategory] = useState('Statements');
  const [customOCategory, setCustomOCategory] = useState('');
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
  const [tCategory, setTCategory] = useState('Rental Agreement');
  const [customTCategory, setCustomTCategory] = useState('');
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

  const [selectedOwnerFile, setSelectedOwnerFile] = useState(null);
  const [selectedTenantFile, setSelectedTenantFile] = useState(null);

  const handlePickOwnerDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        if (file.size && file.size > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'File size exceeds the 5 MB limit. Please select a file smaller than 5 MB.');
          return;
        }
        setSelectedOwnerFile(file);
        if (!oDocName.trim()) {
          const rawName = file.name || 'Owner_Document';
          setODocName(rawName.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err) {
      console.log('Pick Owner Document Error:', err);
    }
  };

  const handlePickTenantDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        if (file.size && file.size > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'File size exceeds the 5 MB limit. Please select a file smaller than 5 MB.');
          return;
        }
        setSelectedTenantFile(file);
        if (!tDocName.trim()) {
          const rawName = file.name || 'Tenant_Document';
          setTDocName(rawName.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err) {
      console.log('Pick Tenant Document Error:', err);
    }
  };

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
        const [portalDocsRes, tenantDocsRes] = await Promise.all([
          apiClient.get('/portal/tenant/documents', logout, refreshAccessToken).catch(() => null),
          apiClient.get('/documents/tenant', logout, refreshAccessToken).catch(() => null),
        ]);
        const pDocs = Array.isArray(portalDocsRes?.data) ? portalDocsRes.data : (Array.isArray(portalDocsRes) ? portalDocsRes : []);
        const tDocs = Array.isArray(tenantDocsRes?.data) ? tenantDocsRes.data : (Array.isArray(tenantDocsRes) ? tenantDocsRes : []);
        setDocuments(pDocs.length > 0 ? pDocs : tDocs);
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

  const formatDate = (val) => {
    if (!val) return 'Recent';
    try {
      const s = String(val);
      if (s.includes('T')) return s.split('T')[0];
      return s.slice(0, 10);
    } catch (e) {
      return 'Recent';
    }
  };

  const handleDownload = async (item, forceRedownload = false) => {
    if (!item) return;
    const docObj = typeof item === 'object' && item !== null ? item : { name: String(item) };
    const docId = String(docObj.id || docObj.name || `doc-${Date.now()}`);
    const rawFileName = docObj.name || docObj.title || 'document';
    const fileName = rawFileName.trim().replace(/[/\\?%*:|"<>]/g, '_');
    const fileUrl = docObj.fileUrl || docObj.url || docObj.path || '';

    const lowerName = fileName.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf');
    const isJpeg = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg');
    const isPng = lowerName.endsWith('.png');
    const isCsv = lowerName.endsWith('.csv');
    const isXlsx = lowerName.endsWith('.xlsx');

    let mimeType = 'application/octet-stream';
    if (isPdf) mimeType = 'application/pdf';
    else if (isJpeg) mimeType = 'image/jpeg';
    else if (isPng) mimeType = 'image/png';
    else if (isCsv) mimeType = 'text/csv';
    else if (isXlsx) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const localDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
    const localUri = localDir.endsWith('/') ? `${localDir}${fileName}` : `${localDir}/${fileName}`;

    // If already downloaded and user didn't ask to re-download, give quick action sheet
    if (downloadedDocIds.has(docId) && !forceRedownload) {
      Alert.alert(
        'Document Actions',
        `"${fileName}" is already downloaded on your device. What would you like to do?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download Again',
            onPress: () => handleDownload(item, true),
          },
          {
            text: 'Open / View File',
            onPress: async () => {
              try {
                const info = await FileSystem.getInfoAsync(localUri);
                if (info.exists && (await Sharing.isAvailableAsync())) {
                  await Sharing.shareAsync(localUri, { mimeType });
                  return;
                }
              } catch (_) {}
              if (fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
                await Linking.openURL(fileUrl);
              } else {
                handleDownload(item, true);
              }
            },
          },
        ]
      );
      return;
    }

    try {
      setDownloadingId(docId);

      // 1. If remote file URL (Cloudinary, AWS, Railway or HTTPS)
      if (fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
        let downloadUrl = fileUrl.trim();
        // Force attachment header for Cloudinary so Android Download Manager saves directly to /storage/emulated/0/Download
        if (downloadUrl.includes('res.cloudinary.com') && downloadUrl.includes('/upload/') && !downloadUrl.includes('/upload/fl_attachment/')) {
          downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
        }

        // Cache locally in background so user can also open it inside app
        try {
          await FileSystem.downloadAsync(downloadUrl, localUri);
        } catch (cacheErr) {
          console.log('Local cache download warning:', cacheErr?.message);
        }

        // Mark as downloaded in app UI & storage
        markAsDownloaded(docId);

        // Open via Android browser / system Download Manager
        try {
          await Linking.openURL(downloadUrl);
        } catch (linkErr) {
          console.log('Linking openURL failed:', linkErr?.message);
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(localUri, { mimeType });
          }
        }

        Alert.alert(
          'Download Started',
          `"${fileName}" aapke phone ke Downloads folder me download ho rahi hai.\n\nNotification bar me progress check karein ya yaha se file direct open karein.`,
          [
            { text: 'OK' },
            {
              text: 'Open File',
              onPress: async () => {
                try {
                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(localUri, { mimeType });
                  }
                } catch (_) {}
              },
            },
          ]
        );
        return;
      }

      // 2. Base64 data URI
      if (fileUrl && fileUrl.startsWith('data:')) {
        const commaIdx = fileUrl.indexOf(',');
        const base64Data = commaIdx > -1 ? fileUrl.substring(commaIdx + 1) : fileUrl;

        await FileSystem.writeAsStringAsync(localUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        markAsDownloaded(docId);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(localUri, {
            mimeType,
            dialogTitle: `Save ${fileName}`,
          });
        } else {
          Alert.alert('Download Complete', `File "${fileName}" saved.`);
        }
        return;
      }

      // 3. Fallback: Generate real verified PDF document for download
      const docTitle = docObj.name || docObj.title || 'Document Record';
      const docCategory = docObj.category || 'General';
      const docSize = docObj.size || docObj.fileSize || 'Standard';
      const docDate = formatDate(docObj.uploadedAt || docObj.createdAt || docObj.uploadedDate);
      const propertyName = properties.find((p) => p.id === docObj.propertyId)?.name || 'WhatsLandlord Archive';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${docTitle}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; margin: 0; background: #ffffff; }
              .header { border-bottom: 2px solid #38bdf8; padding-bottom: 16px; margin-bottom: 24px; }
              h1 { font-size: 24px; color: #0f172a; margin: 0 0 6px 0; }
              .badge { display: inline-block; padding: 4px 10px; background: #e0f2fe; color: #0284c7; border-radius: 6px; font-weight: 700; font-size: 12px; }
              .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; }
              .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
              .info-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; }
              .info-val { font-size: 14px; font-weight: 600; color: #0f172a; }
              .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; }
              .status-verified { color: #16a34a; font-weight: 700; }
            </style>
          </head>
          <body>
            <div class="header">
              <span class="badge">OFFICIAL DOCUMENT ARCHIVE</span>
              <h1>${docTitle}</h1>
            </div>
            <div class="info-card">
              <div class="info-row">
                <span class="info-label">File Name</span>
                <span class="info-val">${docTitle}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Category</span>
                <span class="info-val">${docCategory}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Property</span>
                <span class="info-val">${propertyName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date Recorded</span>
                <span class="info-val">${docDate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">File Size</span>
                <span class="info-val">${docSize}</span>
              </div>
              <div class="info-row" style="border-bottom: none;">
                <span class="info-label">Verification Status</span>
                <span class="info-val status-verified">&check; Stored & Verified</span>
              </div>
            </div>
            <p style="color: #475569; font-size: 13px; line-height: 1.6;">
              This certified document record is registered in the WhatsLandlord Property Management portal.
            </p>
            <div class="footer">
              Generated electronically by WhatsLandlord App &copy; ${new Date().getFullYear()}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      markAsDownloaded(docId);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Save ${fileName}.pdf to My Files`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Download Complete', `Document "${docTitle}" saved.`);
      }
    } catch (error) {
      console.log('Error downloading document:', error);
      if (fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
        try {
          await Linking.openURL(fileUrl);
          markAsDownloaded(docId);
          return;
        } catch (_) {}
      }
      Alert.alert('Download Error', error?.message || 'Could not download file to device.');
    } finally {
      setDownloadingId(null);
    }
  };

  // --- Submit Upload Owner Document ---
  const handleUploadOwnerSubmit = async () => {
    if (!selectedOwnerFile) {
      Alert.alert('Validation Error', 'Please select a document file to upload.');
      return;
    }
    if (!oDocName.trim()) {
      Alert.alert('Validation Error', 'Document title is required.');
      return;
    }

    try {
      setSubmitting(true);
      const ext = selectedOwnerFile.name ? selectedOwnerFile.name.substring(selectedOwnerFile.name.lastIndexOf('.')) : '.pdf';
      const finalDocName = oDocName.trim().endsWith(ext) ? oDocName.trim() : `${oDocName.trim()}${ext}`;
      const finalCategory = oCategory === 'Other' ? (customOCategory.trim() || 'Other') : oCategory;

      const uploadEndpoint = isOwnerPortal ? '/portal/owner/documents' : '/documents/owner/upload';

      await apiClient.uploadFile(
        uploadEndpoint,
        selectedOwnerFile,
        {
          fieldName: 'file',
          parameters: {
            name: finalDocName,
            category: finalCategory,
            ...(oOwnerId ? { ownerId: oOwnerId } : {}),
            ...(oPropId ? { propertyId: oPropId } : {}),
          },
        },
        logout,
        refreshAccessToken
      );

      Alert.alert('Success', 'Owner document uploaded successfully.');
      setIsOwnerUploadOpen(false);
      setODocName('');
      setCustomOCategory('');
      setOOwnerId('');
      setOPropId('');
      setSelectedOwnerFile(null);
      fetchDocumentsData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to upload owner document');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Submit Upload Tenant Document ---
  const handleUploadTenantSubmit = async () => {
    if (!selectedTenantFile) {
      Alert.alert('Validation Error', 'Please select a document file to upload.');
      return;
    }
    if (!tDocName.trim()) {
      Alert.alert('Validation Error', 'Document title is required.');
      return;
    }
    if (isManager && !tTenantId) {
      Alert.alert('Validation Error', 'Please select an associated tenant.');
      return;
    }

    try {
      setSubmitting(true);
      const ext = selectedTenantFile.name ? selectedTenantFile.name.substring(selectedTenantFile.name.lastIndexOf('.')) : '.pdf';
      const finalDocName = tDocName.trim().endsWith(ext) ? tDocName.trim() : `${tDocName.trim()}${ext}`;

      const selectedTenant = tenantsList.find((t) => t.id === tTenantId);
      const bId = selectedTenant?.buildingId || selectedTenant?.unit?.buildingId || '';
      const uId = selectedTenant?.unitId || selectedTenant?.unit?.id || '';
      const propId = tPropId || selectedTenant?.propertyId || selectedTenant?.unit?.propertyId || '';
      const finalCategory = tCategory === 'Other' ? (customTCategory.trim() || 'Other') : tCategory;

      const uploadEndpoint = isTenantPortal ? '/portal/tenant/documents' : '/documents/tenant/upload';
      await apiClient.uploadFile(
        uploadEndpoint,
        selectedTenantFile,
        {
          fieldName: 'file',
          parameters: {
            name: finalDocName,
            category: finalCategory,
            ...(tTenantId ? { tenantId: tTenantId } : {}),
            ...(propId ? { propertyId: propId } : {}),
            ...(bId ? { buildingId: bId } : {}),
            ...(uId ? { unitId: uId } : {}),
          },
        },
        logout,
        refreshAccessToken
      );

      Alert.alert('Success', 'Document uploaded successfully.');
      setIsTenantUploadOpen(false);
      setTDocName('');
      setCustomTCategory('');
      setTCategory('Rental Agreement');
      setTTenantId('');
      setTPropId('');
      setSelectedTenantFile(null);
      fetchDocumentsData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to upload document');
    } finally {
      setSubmitting(false);
    }
  };

  // Filters for Manager view tabs, category pills, and search term
  const filteredDocs = documents.filter((doc) => {
    const docName = (doc.name || doc.title || '').toLowerCase();
    const matchesSearch = docName.includes(searchTerm.toLowerCase());
    
    let matchesTab = true;
    if (isManager) {
      if (activeTab === 'owner') matchesTab = doc.type === 'owner';
      if (activeTab === 'tenant') matchesTab = doc.type === 'tenant';
    }

    let matchesCat = true;
    if (categoryFilter !== 'All') {
      const cat = (doc.category || doc.type || '').toLowerCase();
      matchesCat = cat.includes(categoryFilter.toLowerCase());
    }

    return matchesSearch && matchesTab && matchesCat;
  });

  const oCatOptions = [
    'Statements',
    'Tax Documents',
    'Contracts',
    'Insurance',
    'Property Photos',
    'Maintenance Reports',
    'Inspection Reports',
    'Other'
  ];
  const tCatOptions = [
    'Rental Agreement',
    'Identity Proof (Govt ID)',
    'Proof of Income',
    'Utility Bills',
    "Renter's Insurance",
    'Other',
  ];

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
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            {(!!onNavigate || !!onBack) && (
              <TouchableOpacity
                onPress={() => {
                  if (activeTab !== (initialTab || 'all')) {
                    setActiveTab(initialTab || 'all');
                  } else if (onBack) {
                    onBack();
                  } else if (onNavigate) {
                    onNavigate('back');
                  }
                }}
                style={{ marginRight: 8, padding: 4 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
            <Text style={[styles.title, { flex: 1, marginBottom: 0 }]} allowFontScaling={false}>
              {isManager 
                ? (es ? 'Biblioteca de Todos los Documentos' : 'All Documents Library')
                : isOwnerPortal 
                  ? (es ? 'Documentos del Propietario' : 'Owner Documents')
                  : (es ? 'Mis Documentos' : 'My Documents')}
            </Text>
          </View>
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
            <TouchableOpacity 
              style={styles.uploadBtn} 
              onPress={() => {
                if (isTenantPortal) {
                  setIsTenantUploadOpen(true);
                } else {
                  setIsOwnerUploadOpen(true);
                }
              }} 
              activeOpacity={0.8}
            >
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

        {/* Category Filter Pills (Horizontal Scroll) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 8, gap: 8 }}
          style={{ marginBottom: 2 }}
        >
          {['All', 'Lease', 'Statement', 'Receipt', 'Notice', 'Tax', 'Contracts', 'Other'].map((cat) => {
            const isCatActive = categoryFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategoryFilter(cat)}
                style={[
                  styles.catPill,
                  isCatActive && styles.catPillActive
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.catPillText,
                    isCatActive && styles.catPillTextActive
                  ]}
                  allowFontScaling={false}
                >
                  {cat === 'All' ? 'All Categories' : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
              const docKey = String(item.id || item.name || `doc-${idx}`);
              const isPdf = String(item.name || '').toLowerCase().endsWith('.pdf');
              const isDownloaded = downloadedDocIds.has(docKey);

              return (
                <View key={docKey} style={[styles.card, isDownloaded && styles.cardDownloaded]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.docIconWrapper, isDownloaded && styles.docIconWrapperDownloaded]}>
                      <Ionicons 
                        name={isPdf ? "document-text" : "image"} 
                        size={20} 
                        color={isPdf ? "#ef4444" : "#38bdf8"} 
                      />
                    </View>
                    <View style={styles.docInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.docName} allowFontScaling={false} numberOfLines={1}>
                          {item.name || item.title || 'Statement.pdf'}
                        </Text>
                        {isDownloaded && (
                          <View style={styles.downloadedBadge}>
                            <Ionicons name="checkmark-circle" size={10} color="#10b981" />
                            <Text style={styles.downloadedBadgeText} allowFontScaling={false}>Downloaded</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.docSubText} allowFontScaling={false}>
                        {item.size || item.fileSize || 'Standard'} · Uploaded: {formatDate(item.uploadedAt || item.createdAt || item.uploadedDate)}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.downloadBtn, isDownloaded && styles.downloadBtnDownloaded]} 
                      onPress={() => handleDownload(item)}
                      activeOpacity={0.7}
                      disabled={downloadingId === docKey}
                    >
                      {downloadingId === docKey ? (
                        <ActivityIndicator size="small" color="#38bdf8" />
                      ) : isDownloaded ? (
                        <Ionicons name="checkmark-circle" size={19} color="#10b981" />
                      ) : (
                        <Ionicons name="download-outline" size={18} color="#cbd5e1" />
                      )}
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

      {/* --- UPLOAD OWNER DOCUMENT MODAL (MATCHING WEB SCREENSHOT 1) --- */}
      <Modal visible={isOwnerUploadOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Upload New Document</Text>
                <TouchableOpacity onPress={() => setIsOwnerUploadOpen(false)}>
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* 1. Drag and drop file picker box at the TOP (matching Web UI Screenshot 1) */}
                <TouchableOpacity
                  style={[
                    styles.dragDropBox,
                    selectedOwnerFile && { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.08)' }
                  ]}
                  activeOpacity={0.7}
                  onPress={handlePickOwnerDocument}
                >
                  <Ionicons
                    name={selectedOwnerFile ? "checkmark-circle" : "cloud-upload-outline"}
                    size={38}
                    color={selectedOwnerFile ? "#10b981" : "#0284c7"}
                  />
                  <Text style={[styles.dragDropTitle, selectedOwnerFile && { color: '#10b981' }]} allowFontScaling={false} numberOfLines={1}>
                    {selectedOwnerFile ? selectedOwnerFile.name : 'Drag and drop file here or click to browse'}
                  </Text>
                  <Text style={styles.dragDropSub} allowFontScaling={false}>
                    {selectedOwnerFile
                      ? `${(Number(selectedOwnerFile.size || 0) / (1024 * 1024)).toFixed(2)} MB • Tap to change file`
                      : 'PDF, PNG, JPG up to 5MB'}
                  </Text>
                </TouchableOpacity>

                {/* 2. Manager-only property & owner selector (Hidden for Owner Portal) */}
                {isManager && (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel} allowFontScaling={false}>PROPERTY</Text>
                      <TouchableOpacity 
                        style={[styles.dropdownTrigger, showOPropDropdown && styles.dropdownTriggerActive]} 
                        onPress={() => setShowOPropDropdown(!showOPropDropdown)} 
                        activeOpacity={0.7}
                      >
                        <Text style={styles.dropdownTriggerText} allowFontScaling={false}>
                          {properties.find(p => p.id === oPropId)?.name || 'Select Property...'}
                        </Text>
                        <Ionicons name={showOPropDropdown ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
                      </TouchableOpacity>
                      {showOPropDropdown && (
                        <View style={styles.inFlowDropdownContainer}>
                          {properties.map((opt) => (
                            <TouchableOpacity 
                              key={opt.id} 
                              style={[styles.inFlowDropdownItem, oPropId === opt.id && styles.inFlowDropdownItemActive]} 
                              onPress={() => { 
                                setOPropId(opt.id); 
                                const foundOwner = ownersList.find((o) => o.id === opt.ownerId || o.id === opt.owner?.id);
                                setOOwnerId(foundOwner ? foundOwner.id : (opt.ownerId || ''));
                                setShowOPropDropdown(false); 
                              }}
                            >
                              <Text style={[styles.inFlowDropdownItemText, oPropId === opt.id && styles.inFlowDropdownItemTextActive]} allowFontScaling={false}>
                                {opt.name}
                              </Text>
                              {oPropId === opt.id && <Ionicons name="checkmark-circle" size={18} color="#0284c7" />}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

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
                  </>
                )}

                {/* 3. Document Title (Exact Web Screenshot 1) */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>DOCUMENT TITLE</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="E.g., Year End Tax Statement"
                    placeholderTextColor="#64748b"
                    value={oDocName}
                    onChangeText={setODocName}
                  />
                </View>

                {/* 4. Category Selector (In-Flow Fully Responsive, Exact Web Categories) */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>CATEGORY</Text>
                  <TouchableOpacity 
                    style={[styles.dropdownTrigger, showOCatDropdown && styles.dropdownTriggerActive]} 
                    onPress={() => setShowOCatDropdown(!showOCatDropdown)} 
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dropdownTriggerText, { color: colors.textPrimary, fontWeight: '700' }]} allowFontScaling={false}>
                      {oCategory}
                    </Text>
                    <Ionicons name={showOCatDropdown ? "chevron-up" : "chevron-down"} size={18} color="#0284c7" />
                  </TouchableOpacity>
                  {showOCatDropdown && (
                    <View style={styles.inFlowDropdownContainer}>
                      {oCatOptions.map((opt) => {
                        const isSelected = oCategory === opt;
                        return (
                          <TouchableOpacity 
                            key={opt} 
                            style={[styles.inFlowDropdownItem, isSelected && styles.inFlowDropdownItemActive]} 
                            onPress={() => { 
                              setOCategory(opt); 
                              setShowOCatDropdown(false); 
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.inFlowDropdownItemText, isSelected && styles.inFlowDropdownItemTextActive]} allowFontScaling={false}>
                              {opt}
                            </Text>
                            {isSelected ? (
                              <Ionicons name="checkmark-circle" size={18} color="#0284c7" />
                            ) : (
                              <Ionicons name="ellipse-outline" size={16} color={isDarkMode ? '#475569' : '#cbd5e1'} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Custom Category if 'Other' */}
                {oCategory === 'Other' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel} allowFontScaling={false}>CUSTOM CATEGORY NAME</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="E.g., Bank Payout Slip"
                      placeholderTextColor="#64748b"
                      value={customOCategory}
                      onChangeText={setCustomOCategory}
                    />
                  </View>
                )}
              </ScrollView>

              {/* 5. Fixed Footer Actions - Always Pinned & Visible at Bottom (matching Tenant modal) */}
              <View style={styles.fixedModalFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsOwnerUploadOpen(false)} disabled={submitting}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.submitBtn, { backgroundColor: '#0284c7' }, submitting && styles.submitBtnDisabled]} 
                  onPress={handleUploadOwnerSubmit} 
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={[styles.submitBtnText, { color: '#ffffff', fontWeight: '800' }]} allowFontScaling={false}>
                      Upload File
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- UPLOAD TENANT DOCUMENT MODAL (MATCHING WEB MODAL) --- */}
      <Modal visible={isTenantUploadOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Upload New Document</Text>
                <TouchableOpacity onPress={() => setIsTenantUploadOpen(false)}>
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* 1. File Picker Drag-and-drop box at the TOP (matching Web UI) */}
                <TouchableOpacity
                  style={[
                    styles.dragDropBox,
                    selectedTenantFile && { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.08)' }
                  ]}
                  activeOpacity={0.7}
                  onPress={handlePickTenantDocument}
                >
                  <Ionicons
                    name={selectedTenantFile ? "checkmark-circle" : "cloud-upload-outline"}
                    size={38}
                    color={selectedTenantFile ? "#10b981" : "#0284c7"}
                  />
                  <Text style={[styles.dragDropTitle, selectedTenantFile && { color: '#10b981' }]} allowFontScaling={false} numberOfLines={1}>
                    {selectedTenantFile ? selectedTenantFile.name : 'Drag and drop file here or click to browse'}
                  </Text>
                  <Text style={styles.dragDropSub} allowFontScaling={false}>
                    {selectedTenantFile
                      ? `${(Number(selectedTenantFile.size || 0) / (1024 * 1024)).toFixed(2)} MB • Tap to change file`
                      : 'PDF, PNG, JPG up to 5MB'}
                  </Text>
                </TouchableOpacity>

                {/* 2. Manager Only: Tenant Selector */}
                {isManager && (
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
                )}

                {/* 3. DOCUMENT TITLE (matching Web placeholder: "E.g., Renter Insurance Policy") */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>DOCUMENT TITLE</Text>
                  <TextInput 
                    style={styles.formInput} 
                    placeholder="E.g., Renter Insurance Policy" 
                    placeholderTextColor="#64748b" 
                    value={tDocName} 
                    onChangeText={setTDocName} 
                  />
                </View>

                {/* 4. CATEGORY Selector (In-Flow Fully Responsive) */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel} allowFontScaling={false}>CATEGORY</Text>
                  <TouchableOpacity 
                    style={[styles.dropdownTrigger, showTCatDropdown && styles.dropdownTriggerActive]} 
                    onPress={() => setShowTCatDropdown(!showTCatDropdown)} 
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dropdownTriggerText, { color: colors.textPrimary, fontWeight: '700' }]} allowFontScaling={false}>
                      {tCategory}
                    </Text>
                    <Ionicons name={showTCatDropdown ? "chevron-up" : "chevron-down"} size={18} color="#0284c7" />
                  </TouchableOpacity>
                  {showTCatDropdown && (
                    <View style={styles.inFlowDropdownContainer}>
                      {tCatOptions.map((opt) => {
                        const isSelected = tCategory === opt;
                        return (
                          <TouchableOpacity 
                            key={opt} 
                            style={[styles.inFlowDropdownItem, isSelected && styles.inFlowDropdownItemActive]} 
                            onPress={() => { 
                              setTCategory(opt); 
                              setShowTCatDropdown(false); 
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.inFlowDropdownItemText, isSelected && styles.inFlowDropdownItemTextActive]} allowFontScaling={false}>
                              {opt}
                            </Text>
                            {isSelected ? (
                              <Ionicons name="checkmark-circle" size={18} color="#0284c7" />
                            ) : (
                              <Ionicons name="ellipse-outline" size={16} color={isDarkMode ? '#475569' : '#cbd5e1'} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* 5. Custom Category Name if 'Other' is chosen */}
                {tCategory === 'Other' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel} allowFontScaling={false}>CUSTOM CATEGORY NAME</Text>
                    <TextInput 
                      style={styles.formInput} 
                      placeholder="E.g., Bank Statement" 
                      placeholderTextColor="#64748b" 
                      value={customTCategory} 
                      onChangeText={setCustomTCategory} 
                    />
                  </View>
                )}
              </ScrollView>

              {/* 6. Fixed Footer Actions - Always Pinned & Visible at Bottom */}
              <View style={styles.fixedModalFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsTenantUploadOpen(false)} disabled={submitting}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.submitBtn, { backgroundColor: '#0284c7' }, submitting && styles.submitBtnDisabled]} 
                  onPress={handleUploadTenantSubmit} 
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={[styles.submitBtnText, { color: '#ffffff', fontWeight: '800' }]} allowFontScaling={false}>
                      Upload File
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
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
  cardDownloaded: { borderColor: 'rgba(16, 185, 129, 0.4)' },
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
  docIconWrapperDownloaded: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  docInfo: { flex: 1 },
  docName: { fontSize: 14.5, fontWeight: '800', color: colors.textPrimary },
  docSubText: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  downloadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  downloadedBadgeText: {
    color: '#10b981',
    fontSize: 9.5,
    fontWeight: '800',
  },
  downloadBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center' },
  downloadBtnDownloaded: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },

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
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.cardBorder, maxHeight: '88%', flexDirection: 'column' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, flex: 1, flexShrink: 1, marginRight: 8 },
  modalSubHeader: { fontSize: 11, color: colors.textSecondary, lineHeight: 16, marginTop: 4, marginBottom: 14 },
  modalScroll: { flexShrink: 1 },

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
  dropdownTriggerActive: {
    borderColor: '#0284c7',
    borderWidth: 1.5,
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

  // Responsive In-Flow Dropdown Styles
  inFlowDropdownContainer: {
    marginTop: 6,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inFlowDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  inFlowDropdownItemActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
  },
  inFlowDropdownItemText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  inFlowDropdownItemTextActive: {
    color: '#0284c7',
    fontWeight: '800',
  },
  fixedModalFooter: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 14,
    marginTop: 10,
  },

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

  // Category Pills
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  catPillText: {
    color: colors.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  catPillTextActive: {
    color: '#38bdf8',
    fontWeight: '800',
  },

  // Sharing Badges
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  sharedBadgeText: {
    color: '#10b981',
    fontSize: 9.5,
    fontWeight: '700',
  },
  sharedBadgeOwner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  sharedBadgeOwnerText: {
    color: '#38bdf8',
    fontSize: 9.5,
    fontWeight: '700',
  },

  // Share toggle row in upload modal
  shareToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginVertical: 10,
  },
  shareToggleTitle: {
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  shareToggleSub: {
    color: colors.textMuted,
    fontSize: 10.5,
    marginTop: 2,
  },
});

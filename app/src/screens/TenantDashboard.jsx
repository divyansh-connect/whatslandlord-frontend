import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { isNoticeForTenant } from '../utils/tenantNoticeHelper';

export const TenantDashboard = ({ onNavigate }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live Tenant Data matching Web Frontend /portal/tenant/metrics & /portal/tenant/leases
  const [tenantData, setTenantData] = useState({
    name: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Resident',
    propertyName: 'No Active Lease',
    unitNumber: 'N/A',
    currentRent: 0,
    outstandingBalance: 0,
    nextDueDate: 'N/A',
    leaseExpiration: 'N/A',
    activeVisitors: 0,
    packagesWaiting: 0,
  });

  const [screeningReport, setScreeningReport] = useState(null);
  const [latestNotice, setLatestNotice] = useState(null);
  const [recentTicket, setRecentTicket] = useState(null);
  const [noticeModalVisible, setNoticeModalVisible] = useState(false);

  // Modals
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [screeningModalOpen, setScreeningModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Ticket Form
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');

  // Screening Form
  const [screeningDob, setScreeningDob] = useState('');
  const [screeningSsn, setScreeningSsn] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [consent, setConsent] = useState(false);

  // Notice Parsers
  const getNoticeSubject = (notice) => {
    if (!notice) return 'Management Notice';
    if (notice.title) return notice.title;
    const msg = String(notice.message || '');
    if (msg.startsWith('Subject:')) {
      const endLine = msg.indexOf('\n');
      return endLine > -1 ? msg.substring(8, endLine).trim() : msg.substring(8).trim();
    }
    return 'Urgent Rent Payment Reminder';
  };

  const getNoticeShortPreview = (notice) => {
    if (!notice) return '';
    const msg = String(notice.message || '');
    const clean = msg.replace(/^Subject:.*\n*/i, '').trim();
    const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
    const bodyLine = lines.find(l => !l.toLowerCase().startsWith('dear') && !l.toLowerCase().startsWith('best'));
    return bodyLine || lines[0] || 'Click to view notice details';
  };

  // Fetch live data matching Web APIs
  const fetchTenantPortalData = async () => {
    try {
      setLoading(true);
      const [metricsRes, leaseRes, leasesRes, profileRes, screeningRes, notifsRes, maintenanceRes] = await Promise.all([
        apiClient.get('/portal/tenant/metrics', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/portal/tenant/lease', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/portal/tenant/leases', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/portal/tenant/profile', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/portal/screening/reports', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/portal/tenant/notifications', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/portal/tenant/maintenance', logout, refreshAccessToken).catch(() => null),
      ]);

      const metrics = metricsRes?.data || metricsRes || {};
      const singleLease = leaseRes?.data || leaseRes || null;
      const allLeases = leasesRes?.data || leasesRes || [];
      const profile = profileRes?.data || profileRes || {};
      const reports = screeningRes?.data || screeningRes || [];
      const notifs = notifsRes?.data || notifsRes || [];
      const maintenance = maintenanceRes?.data || maintenanceRes || [];

      const lease = (singleLease && singleLease.id) ? singleLease : (Array.isArray(allLeases) && allLeases.length > 0 ? allLeases[0] : null);
      const hasActiveLease = !!lease;
      const propName = lease?.property?.name || lease?.propertyName || (hasActiveLease ? 'Property' : 'No Active Lease');
      const unitNum = lease?.unit?.unitNumber ? `Unit ${lease.unit.unitNumber}` : (lease?.unitNumber || (hasActiveLease ? 'Unit' : 'N/A'));

      // Match tenant screening report
      const myEmail = user?.email || profile?.email || '';
      const myReport = Array.isArray(reports)
        ? reports.find(
            (r) =>
              (r.email && r.email.toLowerCase() === myEmail.toLowerCase()) ||
              (r.tenant?.email && r.tenant.email.toLowerCase() === myEmail.toLowerCase())
          )
        : null;
      setScreeningReport(myReport);

      const tenantCtx = {
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.name,
        profileId: profile?.id,
        profileEmail: profile?.email,
        profileFirstName: profile?.firstName,
        profileLastName: profile?.lastName,
        unitNumber: profile?.unitNumber,
      };

      const isolatedNotifs = (Array.isArray(notifs) ? notifs : []).filter((n) => isNoticeForTenant(n, tenantCtx));

      // Check for unread management notices
      if (isolatedNotifs.length > 0) {
        const unread = isolatedNotifs.find((n) => !n.read && !n.isRead);
        setLatestNotice(unread || isolatedNotifs[0] || null);
      } else {
        setLatestNotice(null);
      }

      // Check for recent maintenance ticket
      if (Array.isArray(maintenance) && maintenance.length > 0) {
        setRecentTicket(maintenance[0]);
      } else {
        setRecentTicket(null);
      }

      const rentAmount = Number(metrics.currentRent || metrics.currentRentDue || lease?.rentAmount || 0);
      const outBal = Number(metrics.outstandingBalance ?? 0);

      setTenantData({
        name:
          user?.name ||
          `${profile.firstName || user?.firstName || ''} ${profile.lastName || user?.lastName || ''}`.trim() ||
          'Resident',
        hasActiveLease,
        propertyName: propName,
        unitNumber: unitNum,
        currentRent: rentAmount,
        outstandingBalance: outBal,
        nextDueDate: metrics.nextDueDate && metrics.nextDueDate !== 'N/A' ? String(metrics.nextDueDate).split('T')[0] : (hasActiveLease ? '1st of next month' : 'N/A'),
        leaseExpiration: metrics.leaseExpiration || (lease?.endDate ? String(lease.endDate).split('T')[0] : 'N/A'),
        activeVisitors: Number(metrics.activeVisitors || 0),
        packagesWaiting: Number(metrics.packagesWaiting || 0),
      });
    } catch (e) {
      console.log('Error fetching live tenant data:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTenantPortalData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTenantPortalData();
  };

  const handlePayRent = async () => {
    const payAmount = tenantData.outstandingBalance > 0 ? tenantData.outstandingBalance : tenantData.currentRent;
    if (payAmount <= 0) return;
    try {
      setSubmitting(true);
      await apiClient.post(
        '/payments',
        {
          amount: Number(payAmount),
          baseAmount: Number(payAmount),
          paymentMethod: 'ACH',
          status: 'Paid',
          paidDate: new Date().toISOString(),
          referenceNumber: `RCP-${Math.floor(100000 + Math.random() * 900000)}-ZTR`,
          tenantId: user?.id && user.id.length > 10 ? user.id : undefined,
        },
        logout,
        refreshAccessToken
      );
      setPayModalVisible(false);
      Alert.alert(
        'Payment Successful',
        `Thank you! Your rent payment of $${payAmount.toLocaleString()} has been processed successfully.`
      );
      fetchTenantPortalData();
    } catch (e) {
      Alert.alert('Payment Error', e.message || 'Payment processing failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!ticketTitle.trim() || !ticketDesc.trim()) {
      Alert.alert('Error', 'Please fill in both title and description.');
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.post(
        '/portal/tenant/maintenance',
        {
          title: ticketTitle.trim(),
          description: ticketDesc.trim(),
          priority: 'Medium',
          category: 'Plumbing',
        },
        logout,
        refreshAccessToken
      ).catch(() => null);

      setTicketModalVisible(false);
      setTicketTitle('');
      setTicketDesc('');
      Alert.alert('Success', 'Repair request submitted to property management.');
      fetchTenantPortalData();
    } catch (e) {
      Alert.alert('Error', 'Could not submit repair ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setDocFile(res.assets[0]);
      }
    } catch (err) {
      console.log('DocumentPicker Error:', err);
    }
  };

  const handleSubmitDocuments = async () => {
    if (!consent) {
      Alert.alert('Consent Required', 'Please authorize background verification.');
      return;
    }
    if (!screeningDob.trim() || !screeningSsn.trim() || !docFile) {
      Alert.alert('Validation Error', 'Please complete all fields and select a file.');
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.put(
        `/portal/screening/reports/${screeningReport.id}`,
        {
          dob: screeningDob.trim(),
          ssn: screeningSsn.trim(),
          authorized: true,
          status: 'Pending Documents',
        },
        logout,
        refreshAccessToken
      );

      const formData = new FormData();
      formData.append('document', {
        uri: Platform.OS === 'ios' ? docFile.uri.replace('file://', '') : docFile.uri,
        name: docFile.name || 'id_proof.pdf',
        type: docFile.mimeType || 'application/pdf',
      });

      await apiClient.post(
        `/portal/screening/reports/${screeningReport.id}/upload`,
        formData,
        logout,
        refreshAccessToken
      );

      Alert.alert('Success', 'Verification documents uploaded successfully.');
      setScreeningModalOpen(false);
      fetchTenantPortalData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to submit documents.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Tenant Portal...</Text>
      </View>
    );
  }

  const amountToPay = tenantData.outstandingBalance > 0 ? tenantData.outstandingBalance : tenantData.currentRent;
  const isOverdue = tenantData.outstandingBalance > 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
    >
      {/* Welcome Header */}
      <View style={styles.welcomeSection}>
        <Text style={[styles.welcomeGreeting, { color: colors.textPrimary }]} allowFontScaling={false}>
          Hello, {tenantData.name} 👋
        </Text>
        <View style={styles.unitLocationRow}>
          <Ionicons name="location-sharp" size={13} color="#38bdf8" style={{ marginRight: 4 }} />
          <Text style={[styles.welcomeLocation, { color: colors.textSecondary }]} allowFontScaling={false}>
            {tenantData.propertyName} {tenantData.unitNumber && tenantData.unitNumber !== 'N/A' ? `· Unit ${tenantData.unitNumber}` : ''}
          </Text>
        </View>
      </View>

      {/* Compact Management Notice Strip (1-Line Only, Click to Read) */}
      {latestNotice && (
        <TouchableOpacity
          style={[styles.noticeStrip, { backgroundColor: colors.card, borderColor: 'rgba(245, 158, 11, 0.35)' }]}
          onPress={() => setNoticeModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.noticeIconWrapper}>
            <Ionicons name="notifications" size={16} color="#f59e0b" />
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.noticeStripBadge}>NOTICE</Text>
              <Text style={[styles.noticeStripTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {getNoticeSubject(latestNotice)}
              </Text>
            </View>
            <Text style={[styles.noticeStripPreview, { color: colors.textSecondary }]} numberOfLines={1}>
              {getNoticeShortPreview(latestNotice)}
            </Text>
          </View>
          <View style={styles.noticeReadPill}>
            <Text style={styles.noticeReadText}>Read</Text>
            <Ionicons name="chevron-forward" size={12} color="#38bdf8" />
          </View>
        </TouchableOpacity>
      )}

      {/* Screening Verification Banner (If pending) */}
      {screeningReport &&
        (screeningReport.status === 'Pending Documents' || screeningReport.status === 'Pending Consent') && (
          <TouchableOpacity
            style={[styles.alertBanner, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
            onPress={() => setScreeningModalOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="alert-circle" size={18} color="#ef4444" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#ef4444' }}>Verification Required</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                Upload ID/W2 proof to complete tenant screening.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ef4444" />
          </TouchableOpacity>
        )}

      {/* =========================================================================
          TOP HERO: TOTAL AMOUNT DUE & 1-TAP PAY BUTTON
          ========================================================================= */}
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.heroHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.heroDot, { backgroundColor: isOverdue ? '#ef4444' : (amountToPay > 0 ? '#f59e0b' : '#10b981') }]} />
            <Text style={[styles.heroCardLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
              TOTAL AMOUNT DUE
            </Text>
          </View>

          <View style={[styles.heroStatusBadge, { 
            backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.15)' : (amountToPay > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)') 
          }]}>
            <Text style={[styles.heroStatusText, { 
              color: isOverdue ? '#ef4444' : (amountToPay > 0 ? '#f59e0b' : '#10b981') 
            }]} allowFontScaling={false}>
              {isOverdue ? 'Overdue' : (amountToPay > 0 ? 'Due Soon' : 'Paid in Full')}
            </Text>
          </View>
        </View>

        <View style={styles.heroAmountRow}>
          <Text style={[styles.heroAmountText, { color: isOverdue ? '#ef4444' : (amountToPay > 0 ? colors.textPrimary : '#10b981') }]} allowFontScaling={false}>
            ${amountToPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        <Text style={[styles.heroDueDateText, { color: colors.textSecondary }]} allowFontScaling={false}>
          {amountToPay > 0 
            ? (isOverdue 
                ? `Due Date: ${tenantData.nextDueDate !== 'N/A' ? tenantData.nextDueDate : 'Immediate'} · Outstanding balance pending`
                : `Due Date: ${tenantData.nextDueDate}`)
            : 'No pending charges · Thank you for paying on time! 🎉'}
        </Text>

        <TouchableOpacity
          style={[styles.heroPayBtn, { backgroundColor: amountToPay > 0 ? '#0284c7' : '#10b981' }]}
          onPress={() => setPayModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name={amountToPay > 0 ? "card" : "checkmark-circle"} size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.heroPayBtnText} allowFontScaling={false}>
            {amountToPay > 0 ? `Pay $${amountToPay.toLocaleString()} Now` : 'Make Advance Payment'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* =========================================================================
          CARD 1: MAINTENANCE & REPAIRS
          ========================================================================= */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Ionicons name="construct" size={17} color="#ef4444" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
              Maintenance & Repairs
            </Text>
          </View>

          <TouchableOpacity
            style={styles.cardHeaderActionBtn}
            onPress={() => setTicketModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={14} color="#38bdf8" style={{ marginRight: 2 }} />
            <Text style={styles.cardHeaderActionText} allowFontScaling={false}>New Request</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          {recentTicket ? (
            <View style={[styles.ticketRow, { backgroundColor: colors.surface || colors.background, borderColor: colors.cardBorder }]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.ticketTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {recentTicket.title}
                </Text>
                <Text style={[styles.ticketDate, { color: colors.textSecondary }]}>
                  Reported on {recentTicket.date || 'Recent'}
                </Text>
              </View>
              <View style={[styles.ticketStatusPill, { 
                backgroundColor: recentTicket.status === 'Completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)' 
              }]}>
                <Text style={[styles.ticketStatusText, { 
                  color: recentTicket.status === 'Completed' ? '#10b981' : '#38bdf8' 
                }]}>
                  {recentTicket.status || 'In Progress'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyMaintenanceBox}>
              <Ionicons name="checkmark-done-circle-outline" size={28} color="#10b981" style={{ marginBottom: 4 }} />
              <Text style={[styles.emptyMaintenanceText, { color: colors.textSecondary }]}>
                No active repair requests. Need something fixed?
              </Text>
              <TouchableOpacity
                style={[styles.outlineActionBtn, { borderColor: colors.cardBorder, marginTop: 8 }]}
                onPress={() => setTicketModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="hammer-outline" size={15} color="#38bdf8" style={{ marginRight: 6 }} />
                <Text style={styles.outlineActionText}>Report an Issue</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* =========================================================================
          CARD 2: MY HOME & LEASE DETAILS
          ========================================================================= */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
              <Ionicons name="home" size={17} color="#0284c7" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
              My Home & Lease Details
            </Text>
          </View>

          {onNavigate && (
            <TouchableOpacity
              style={styles.cardHeaderActionBtn}
              onPress={() => onNavigate('lease')}
              activeOpacity={0.7}
            >
              <Text style={styles.cardHeaderActionText} allowFontScaling={false}>View Full</Text>
              <Ionicons name="chevron-forward" size={13} color="#38bdf8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardBody}>
          {!tenantData.hasActiveLease ? (
            <View style={{ alignItems: 'center', paddingVertical: 18 }}>
              <Ionicons name="document-text-outline" size={34} color={colors.textSecondary} style={{ marginBottom: 8 }} />
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>No active lease found.</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11.5, marginTop: 4 }}>You currently have no active residential lease assigned.</Text>
            </View>
          ) : (
            <>
              <View style={styles.leaseGrid}>
                <View style={[styles.leaseBox, { backgroundColor: colors.surface || colors.background, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.leaseBoxLabel, { color: colors.textSecondary }]}>PROPERTY</Text>
                  <Text style={[styles.leaseBoxVal, { color: colors.textPrimary }]} numberOfLines={1}>
                    {tenantData.propertyName}
                  </Text>
                </View>

                <View style={[styles.leaseBox, { backgroundColor: colors.surface || colors.background, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.leaseBoxLabel, { color: colors.textSecondary }]}>ASSIGNED UNIT</Text>
                  <Text style={[styles.leaseBoxVal, { color: colors.textPrimary }]} numberOfLines={1}>
                    {tenantData.unitNumber && tenantData.unitNumber !== 'N/A' ? `Unit ${tenantData.unitNumber}` : 'Standard'}
                  </Text>
                </View>

                <View style={[styles.leaseBox, { backgroundColor: colors.surface || colors.background, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.leaseBoxLabel, { color: colors.textSecondary }]}>MONTHLY RENT</Text>
                  <Text style={[styles.leaseBoxVal, { color: '#38bdf8' }]} numberOfLines={1}>
                    ${(tenantData.currentRent || 0).toLocaleString()} / mo
                  </Text>
                </View>

                <View style={[styles.leaseBox, { backgroundColor: colors.surface || colors.background, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.leaseBoxLabel, { color: colors.textSecondary }]}>LEASE EXPIRES</Text>
                  <Text style={[styles.leaseBoxVal, { color: colors.textPrimary }]} numberOfLines={1}>
                    {tenantData.leaseExpiration}
                  </Text>
                </View>
              </View>

              {onNavigate && (
                <TouchableOpacity
                  style={[styles.outlineActionBtn, { borderColor: colors.cardBorder, marginTop: 12 }]}
                  onPress={() => onNavigate('lease')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={15} color="#38bdf8" style={{ marginRight: 6 }} />
                  <Text style={styles.outlineActionText}>Download Signed Agreement PDF</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      {/* =========================================================================
          BOTTOM QUICK ACTIONS: CHAT, DOCUMENTS, HISTORY
          ========================================================================= */}
      <View style={styles.quickFooterRow}>
        <TouchableOpacity
          style={[styles.quickFooterBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => onNavigate && onNavigate('messages')}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubbles-outline" size={18} color="#10b981" />
          <Text style={[styles.quickFooterBtnText, { color: colors.textPrimary }]}>Manager Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickFooterBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => onNavigate && onNavigate('documents')}
          activeOpacity={0.7}
        >
          <Ionicons name="folder-outline" size={18} color="#f59e0b" />
          <Text style={[styles.quickFooterBtnText, { color: colors.textPrimary }]}>Documents</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickFooterBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => setPayModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="receipt-outline" size={18} color="#a855f7" />
          <Text style={[styles.quickFooterBtnText, { color: colors.textPrimary }]}>Receipts</Text>
        </TouchableOpacity>
      </View>

      {/* =========================================================================
          PAY RENT MODAL
          ========================================================================= */}
      <Modal visible={payModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalIconCenter}>
              <Ionicons name="card-outline" size={40} color="#0284c7" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
              Confirm Rent Payment
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]} allowFontScaling={false}>
              Amount to pay: $
              {(tenantData.outstandingBalance > 0
                ? tenantData.outstandingBalance
                : tenantData.currentRent
              ).toLocaleString()}
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setPayModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText} allowFontScaling={false}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirmBtn]}
                onPress={handlePayRent}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText} allowFontScaling={false}>
                    Pay Now
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          SUBMIT REPAIR MODAL
          ========================================================================= */}
      <Modal visible={ticketModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
              Request Maintenance Repair
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]} allowFontScaling={false}>
              Our team will review and dispatch a technician.
            </Text>

            <TextInput
              style={[styles.inputField, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.cardBorder }]}
              placeholder="What is the issue? (e.g. Leaking faucet)"
              placeholderTextColor="#94a3b8"
              value={ticketTitle}
              onChangeText={setTicketTitle}
            />

            <TextInput
              style={[
                styles.inputField,
                { height: 80, textAlignVertical: 'top', backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.cardBorder },
              ]}
              placeholder="Describe the issue in detail..."
              placeholderTextColor="#94a3b8"
              multiline
              value={ticketDesc}
              onChangeText={setTicketDesc}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setTicketModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText} allowFontScaling={false}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirmBtn]}
                onPress={handleCreateTicket}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText} allowFontScaling={false}>
                    Submit Request
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          SCREENING VERIFICATION MODAL
          ========================================================================= */}
      <Modal visible={screeningModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
              Tenant Screening Verification
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]} allowFontScaling={false}>
              Please verify identity details and upload proof.
            </Text>

            <TextInput
              style={[styles.inputField, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.cardBorder }]}
              placeholder="Date of Birth (YYYY-MM-DD)"
              placeholderTextColor="#94a3b8"
              value={screeningDob}
              onChangeText={setScreeningDob}
            />

            <TextInput
              style={[styles.inputField, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.cardBorder }]}
              placeholder="SSN (Last 4 digits or Full)"
              placeholderTextColor="#94a3b8"
              value={screeningSsn}
              onChangeText={setScreeningSsn}
            />

            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: colors.cardBorder, marginBottom: 14 }]}
              onPress={handlePickDocument}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#0284c7" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0284c7' }}>
                {docFile ? docFile.name : 'Choose ID / W2 Document'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
              onPress={() => setConsent(!consent)}
            >
              <Ionicons
                name={consent ? 'checkbox' : 'square-outline'}
                size={20}
                color={consent ? '#10b981' : colors.textSecondary}
                style={{ marginRight: 8 }}
              />
              <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>
                I authorize background verification and identity screening.
              </Text>
            </TouchableOpacity>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setScreeningModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText} allowFontScaling={false}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirmBtn]}
                onPress={handleSubmitDocuments}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText} allowFontScaling={false}>
                    Submit Proof
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          NOTICE READER MODAL (Clean Full Text on demand)
          ========================================================================= */}
      <Modal visible={noticeModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                <Ionicons name="megaphone-outline" size={20} color="#f59e0b" style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: colors.textPrimary, marginBottom: 0, textAlign: 'left' }]} numberOfLines={1}>
                  {getNoticeSubject(latestNotice)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setNoticeModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280, marginVertical: 8 }} showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 13.5, color: colors.textPrimary, lineHeight: 22 }}>
                {latestNotice?.message || latestNotice?.title}
              </Text>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setNoticeModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </TouchableOpacity>
              {amountToPay > 0 && (
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalConfirmBtn]}
                  onPress={() => {
                    setNoticeModalVisible(false);
                    setPayModalVisible(true);
                  }}
                >
                  <Text style={styles.modalConfirmBtnText}>Pay Now</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 40,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      fontWeight: '600',
    },

    // Header
    welcomeSection: {
      marginBottom: 14,
      paddingHorizontal: 4,
    },
    welcomeGreeting: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    unitLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    welcomeLocation: {
      fontSize: 13,
      fontWeight: '600',
    },

    // Notice Strip (1-Line Compact Banner)
    noticeStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 14,
      elevation: 1,
    },
    noticeIconWrapper: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    noticeStripBadge: {
      fontSize: 9.5,
      fontWeight: '800',
      color: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginRight: 6,
    },
    noticeStripTitle: {
      fontSize: 13,
      fontWeight: '700',
      flex: 1,
    },
    noticeStripPreview: {
      fontSize: 11.5,
      marginTop: 2,
    },
    noticeReadPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    noticeReadText: {
      color: '#38bdf8',
      fontSize: 11.5,
      fontWeight: '700',
      marginRight: 2,
    },

    // Screening Banner
    alertBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      marginBottom: 14,
    },

    // TOP HERO FINANCIAL CARD
    heroCard: {
      borderRadius: 18,
      borderWidth: 1,
      padding: 20,
      marginBottom: 16,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.05,
      shadowRadius: 8,
    },
    heroHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    heroDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    heroCardLabel: {
      fontSize: 11.5,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    heroStatusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    heroStatusText: {
      fontSize: 11,
      fontWeight: '800',
    },
    heroAmountRow: {
      marginVertical: 4,
    },
    heroAmountText: {
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: -0.6,
    },
    heroDueDateText: {
      fontSize: 12.5,
      fontWeight: '500',
      marginTop: 4,
    },
    heroPayBtn: {
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      marginTop: 16,
      elevation: 2,
    },
    heroPayBtnText: {
      color: '#ffffff',
      fontSize: 14.5,
      fontWeight: '800',
    },

    // GENERAL CARD (Maintenance & Lease)
    card: {
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 14,
      overflow: 'hidden',
      elevation: 1,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 8,
    },
    cardIconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    cardTitle: {
      fontSize: 14.5,
      fontWeight: '700',
    },
    cardHeaderActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    cardHeaderActionText: {
      color: '#38bdf8',
      fontSize: 12,
      fontWeight: '700',
    },
    cardBody: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      paddingTop: 4,
    },

    // Maintenance ticket row
    ticketRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
    },
    ticketTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      marginBottom: 3,
    },
    ticketDate: {
      fontSize: 11.5,
    },
    ticketStatusPill: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
    },
    ticketStatusText: {
      fontSize: 11,
      fontWeight: '700',
    },
    emptyMaintenanceBox: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    emptyMaintenanceText: {
      fontSize: 12.5,
      textAlign: 'center',
    },
    outlineActionBtn: {
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    outlineActionText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#38bdf8',
    },

    // Lease 2x2 Grid
    leaseGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    leaseBox: {
      flex: 1,
      minWidth: '46%',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
    },
    leaseBoxLabel: {
      fontSize: 10.5,
      fontWeight: '700',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    leaseBoxVal: {
      fontSize: 13.5,
      fontWeight: '700',
    },

    // Quick Footer Row
    quickFooterRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
      marginBottom: 10,
    },
    quickFooterBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 12,
      gap: 6,
    },
    quickFooterBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },

    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    modalBox: {
      borderRadius: 18,
      borderWidth: 1,
      padding: 22,
      elevation: 5,
    },
    modalIconCenter: {
      alignItems: 'center',
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 6,
    },
    modalSub: {
      fontSize: 13,
      textAlign: 'center',
      marginBottom: 18,
    },
    inputField: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 13.5,
      marginBottom: 12,
    },
    outlineBtn: {
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBtnRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 10,
    },
    modalBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    modalCancelBtn: {
      backgroundColor: 'rgba(100, 116, 139, 0.15)',
    },
    modalCancelBtnText: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    modalConfirmBtn: {
      backgroundColor: '#0284c7',
    },
    modalConfirmBtnText: {
      fontSize: 13.5,
      fontWeight: '800',
      color: '#ffffff',
    },
  });

export default TenantDashboard;

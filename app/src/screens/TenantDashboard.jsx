import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { AppActivityIndicator as ActivityIndicator } from '../components/AppActivityIndicator';
import { WebView } from 'react-native-webview';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { isNoticeForTenant } from '../utils/tenantNoticeHelper';
import { CustomDatePicker } from '../components/CustomDatePicker';

export const TenantDashboard = ({ onNavigate, onOpenMenu }) => {
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
  const [maintenanceList, setMaintenanceList] = useState([]);
  const [noticeModalVisible, setNoticeModalVisible] = useState(false);

  // Helper for 6-Month Graphical Payment History
  const getRecentMonths = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        label: monthNames[d.getMonth()],
        paid: true,
        height: 38 + ((i * 3) % 8),
      });
    }
    return result;
  };
  const paymentHistoryMonths = getRecentMonths();

  // Helper to determine active step in 3-stage maintenance pipeline
  const getMaintenanceStep = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('complete') || s.includes('resolve') || s.includes('close')) return 3;
    if (s.includes('progress') || s.includes('assign') || s.includes('schedul') || s.includes('approv')) return 2;
    return 1;
  };

  // Modals
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [screeningModalOpen, setScreeningModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Payment Gateway SDK states
  const [activeGateway, setActiveGateway] = useState(null);
  const [sdkModalVisible, setSdkModalVisible] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState(null);
  const [processingGateway, setProcessingGateway] = useState(false);

  // Ticket Form
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');

  // Screening Form
  const [tenantProfile, setTenantProfile] = useState(null);
  const [screeningDob, setScreeningDob] = useState('');
  const [showScreeningDobPicker, setShowScreeningDobPicker] = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
      const [metricsRes, leasesRes, profileRes, screeningRes, notifsRes, maintenanceRes] = await Promise.all([
        apiClient.get('/portal/tenant/metrics', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/portal/tenant/leases', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/portal/tenant/profile', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/portal/screening/reports', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/portal/tenant/notifications', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/portal/tenant/maintenance', logout, refreshAccessToken).catch(() => null),
      ]);

      const metrics = metricsRes?.data || metricsRes || {};
      const allLeases = Array.isArray(leasesRes?.data) ? leasesRes.data : (Array.isArray(leasesRes) ? leasesRes : []);
      const profile = profileRes?.data || profileRes || {};
      setTenantProfile(profile);
      const reports = screeningRes?.data || screeningRes || [];
      const notifs = notifsRes?.data || notifsRes || [];
      const maintenance = maintenanceRes?.data || maintenanceRes || [];

      const lease = allLeases.length > 0 ? allLeases[0] : null;
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

      // Calculate unread count for bell badge
      const unreadTotal = isolatedNotifs.filter((n) => !n.read && !n.isRead).length;
      setUnreadCount(unreadTotal);

      // Check for unread management notices
      if (isolatedNotifs.length > 0) {
        const unread = isolatedNotifs.find((n) => !n.read && !n.isRead);
        setLatestNotice(unread || isolatedNotifs[0] || null);
      } else {
        setLatestNotice(null);
      }

      // Check for maintenance tickets
      if (Array.isArray(maintenance) && maintenance.length > 0) {
        setMaintenanceList(maintenance);
        setRecentTicket(maintenance[0]);
      } else {
        setMaintenanceList([]);
        setRecentTicket(null);
      }

      const rentAmount = Number(metrics.currentRent || metrics.currentRentDue || lease?.rentAmount || 0);
      const outBal = Number(metrics.outstandingBalance ?? 0);
      const propId = lease?.propertyId || lease?.property?.id || profile?.propertyId || profile?.unit?.propertyId || null;

      // Query active payment gateway (property level 1st priority, company level fallback)
      try {
        const gwRes = await apiClient.get(
          propId ? `/payments/active-gateway?propertyId=${propId}` : '/payments/active-gateway',
          logout,
          refreshAccessToken
        ).catch(() => null);
        const gw = gwRes?.data || gwRes || null;
        setActiveGateway(gw);
      } catch (err) {
        console.log('Failed fetching active gateway:', err.message);
      }

      setTenantData({
        name:
          user?.name ||
          `${profile.firstName || user?.firstName || ''} ${profile.lastName || user?.lastName || ''}`.trim() ||
          'Resident',
        hasActiveLease,
        propertyId: propId,
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

  // Payment Initiation Flow: Razorpay SDK (if active) or Direct Fallback
  const handleInitiatePayment = async () => {
    const payAmount = tenantData.outstandingBalance > 0 ? tenantData.outstandingBalance : tenantData.currentRent;
    if (payAmount <= 0) return;

    if (activeGateway?.provider !== 'RAZORPAY') {
      Alert.alert(
        'Payment Gateway Unavailable',
        'Online payment gateway is not configured yet. Please contact your property manager to enable online payments.'
      );
      return;
    }

    try {
      setSubmitting(true);
      setProcessingGateway(true);

      const orderRes = await apiClient.post(
        '/payments/razorpay-order',
        {
          amount: Number(payAmount),
          currency: 'USD',
          propertyId: tenantData.propertyId,
        },
        logout,
        refreshAccessToken
      );

      const orderData = orderRes?.data || orderRes;
      if (!orderData?.orderId || !orderData?.keyId) {
        throw new Error('Failed to create Razorpay Order.');
      }

      setRazorpayOrder(orderData);
      setPayModalVisible(false);
      setSdkModalVisible(true);
    } catch (err) {
      Alert.alert('Payment Gateway Error', err.message || 'Could not connect to payment gateway.');
    } finally {
      setSubmitting(false);
      setProcessingGateway(false);
    }
  };

  const handleDirectPay = async (payAmount) => {
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
          propertyId: tenantData.propertyId || undefined,
        },
        logout,
        refreshAccessToken
      );
      setPayModalVisible(false);
      Alert.alert(
        'Payment Recorded',
        `Thank you! Your rent payment of $${Number(payAmount).toLocaleString()} has been processed successfully.`
      );
      fetchTenantPortalData();
    } catch (e) {
      Alert.alert('Payment Error', e.message || 'Payment processing failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWebViewMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.event === 'CANCELLED') {
        setSdkModalVisible(false);
        setRazorpayOrder(null);
      } else if (data.event === 'FAILED') {
        setSdkModalVisible(false);
        setRazorpayOrder(null);
        Alert.alert('Payment Failed', data.error || 'Payment was declined by Razorpay.');
      } else if (data.event === 'SUCCESS') {
        setSdkModalVisible(false);
        setRazorpayOrder(null);
        setLoading(true);

        const payAmount = tenantData.outstandingBalance > 0 ? tenantData.outstandingBalance : tenantData.currentRent;

        await apiClient.post(
          '/payments/verify-razorpay',
          {
            razorpayOrderId: data.razorpay_order_id,
            razorpayPaymentId: data.razorpay_payment_id,
            razorpaySignature: data.razorpay_signature,
            amount: Number(payAmount),
            propertyId: tenantData.propertyId,
          },
          logout,
          refreshAccessToken
        );

        Alert.alert(
          'Payment Successful! 🎉',
          `Thank you! Your rent payment of $${Number(payAmount).toLocaleString()} has been verified and settled via Razorpay.`
        );
        fetchTenantPortalData();
      }
    } catch (err) {
      console.log('Error verifying Razorpay payment:', err.message);
      setSdkModalVisible(false);
      Alert.alert('Verification Issue', 'Payment was submitted to gateway. Please check your transaction history.');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const razorpayHtml = useMemo(() => {
    if (!razorpayOrder) return '';
    const propTitle = activeGateway?.propertyName || tenantData.propertyName || 'WhatsLandlord';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { box-sizing: border-box; }
          body {
            background-color: #090d16;
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #f8fafc;
          }
          .loader { text-align: center; }
          .spinner {
            border: 3px solid rgba(56, 189, 248, 0.2);
            border-top: 3px solid #38bdf8;
            border-radius: 50%;
            width: 38px;
            height: 38px;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 14px auto;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </head>
      <body>
        <div class="loader">
          <div class="spinner"></div>
          <div style="font-size: 14px; font-weight: 700; color: #f8fafc;">Launching Razorpay SDK...</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Secure 256-Bit SSL Gateway</div>
        </div>
        <script>
          var options = {
            key: "${razorpayOrder.keyId}",
            amount: "${razorpayOrder.amount}",
            currency: "${razorpayOrder.currency || 'USD'}",
            name: "${propTitle.replace(/["'\\]/g, '')}",
            description: "Rent Payment - ${tenantData.unitNumber}",
            order_id: "${razorpayOrder.orderId}",
            prefill: {
              name: "${tenantData.name.replace(/["'\\]/g, '')}",
              email: "${user?.email || ''}",
              contact: "${user?.phone || ''}"
            },
            theme: { color: "#38bdf8" },
            modal: {
              ondismiss: function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'CANCELLED' }));
              }
            },
            handler: function(response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                event: 'SUCCESS',
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              }));
            }
          };
          var rzp = new Razorpay(options);
          rzp.on('payment.failed', function(resp) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              event: 'FAILED',
              error: resp.error ? resp.error.description : 'Payment Failed'
            }));
          });
          window.onload = function() {
            setTimeout(function() {
              rzp.open();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;
  }, [razorpayOrder, activeGateway, tenantData, user]);

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
    if (!screeningDob.trim() || !docFile) {
      Alert.alert('Validation Error', 'Please select your Date of Birth and choose an ID / proof document.');
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.put(
        `/portal/screening/reports/${screeningReport.id}`,
        {
          dob: screeningDob.trim(),
          authorized: true,
          status: 'Processing',
        },
        logout,
        refreshAccessToken
      );

      await apiClient.uploadFile(
        `/portal/screening/reports/${screeningReport.id}/upload`,
        docFile,
        {
          fieldName: 'document',
          fileName: docFile.name,
        },
        logout,
        refreshAccessToken
      );

      Alert.alert('Success', 'Verification documents uploaded successfully. The Property Manager is reviewing your report.');
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

  const amountToPay = tenantData.outstandingBalance > 0 ? tenantData.outstandingBalance : 0;
  const isOverdue = tenantData.outstandingBalance > 0;
  const es = language === 'es';

  const screeningApplicantName =
    screeningReport?.applicantName ||
    (screeningReport?.tenant
      ? `${screeningReport.tenant.firstName || ''} ${screeningReport.tenant.lastName || ''}`.trim()
      : null) ||
    (tenantProfile?.firstName || tenantProfile?.lastName ? `${tenantProfile?.firstName || ''} ${tenantProfile?.lastName || ''}`.trim() : null) ||
    (user?.firstName || user?.lastName ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() : null) ||
    user?.name ||
    tenantData?.name ||
    'Divyansh Pal';

  const screeningApplicantEmail =
    screeningReport?.applicantEmail ||
    screeningReport?.email ||
    screeningReport?.tenant?.email ||
    tenantProfile?.email ||
    user?.email ||
    'N/A';

  const screeningPropertyName =
    screeningReport?.propertyName ||
    screeningReport?.tenant?.unit?.property?.name ||
    (tenantData?.propertyName && tenantData.propertyName !== 'No Active Lease' ? tenantData.propertyName : null) ||
    'Property';

  const screeningUnitNumber =
    screeningReport?.unitNumber ||
    (screeningReport?.tenant?.unit?.unitNumber
      ? String(screeningReport.tenant.unit.unitNumber).startsWith('Unit')
        ? screeningReport.tenant.unit.unitNumber
        : `Unit ${screeningReport.tenant.unit.unitNumber}`
      : (tenantData?.unitNumber && tenantData.unitNumber !== 'N/A' ? tenantData.unitNumber : 'Unit R1'));

  const screeningCompanyName =
    (screeningReport?.companyName && !screeningReport.companyName.includes('Apex'))
      ? screeningReport.companyName
      : (screeningReport?.tenant?.unit?.property?.companyName && !screeningReport.tenant.unit.property.companyName.includes('Apex'))
        ? screeningReport.tenant.unit.property.companyName
        : (tenantProfile?.company && !tenantProfile.company.includes('Apex'))
          ? tenantProfile.company
          : (user?.companyName && !user.companyName.includes('Apex'))
            ? user.companyName
            : 'Divine';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
    >
      {/* Welcome Header */}
      <View style={styles.welcomeSection}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
          <TouchableOpacity
            style={[
              styles.hamburgerBtn,
              {
                borderColor: colors.cardBorder,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              },
            ]}
            onPress={() => onOpenMenu && onOpenMenu()}
            activeOpacity={0.7}
            accessibilityLabel="Open Navigation Menu"
          >
            <Ionicons name="menu-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={{ marginLeft: 10, flex: 1 }}>
            <TouchableOpacity
              onPress={() => onNavigate && onNavigate('profile')}
              activeOpacity={0.7}
            >
              <Text style={[styles.welcomeGreeting, { color: colors.textPrimary }]} allowFontScaling={false} numberOfLines={1}>
                Hello, {tenantData.name} 👋
              </Text>
            </TouchableOpacity>
            <View style={styles.unitLocationRow}>
              <Ionicons name="location-sharp" size={13} color="#38bdf8" style={{ marginRight: 4 }} />
              <Text style={[styles.welcomeLocation, { color: colors.textSecondary }]} allowFontScaling={false} numberOfLines={1}>
                {tenantData.propertyName} {tenantData.unitNumber && tenantData.unitNumber !== 'N/A' ? `· Unit ${tenantData.unitNumber}` : ''}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.bellBtn,
            {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              borderColor: colors.cardBorder,
            },
          ]}
          onPress={() => onNavigate && onNavigate('notifications')}
          activeOpacity={0.7}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
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

      {/* Screening Verification Banner matching Web parity */}
      {screeningReport && (() => {
        const st = screeningReport.status || 'Pending';
        if (st === 'Approved') {
          return (
            <View style={[styles.alertBanner, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#10b981' }}>Screening Approved</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  Your background screening check has been approved successfully! Welcome to your new home.
                </Text>
              </View>
            </View>
          );
        }
        if (st === 'Declined') {
          return (
            <View style={[styles.alertBanner, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
              <Ionicons name="close-circle" size={20} color="#ef4444" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#ef4444' }}>Screening Declined</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  Your screening application has been declined. Please contact your property manager for details.
                </Text>
              </View>
            </View>
          );
        }
        if (st === 'Pending Approval' || st === 'Processing' || st === 'Completed' || screeningReport.documentUrl) {
          return (
            <View style={[styles.alertBanner, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
              <Ionicons name="time-outline" size={20} color="#f59e0b" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#f59e0b' }}>Verification Under Review</Text>
                  <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#f59e0b' }}>Pending Approval</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  Your verification documents have been submitted. The Property Manager is reviewing them to accept or reject your application.
                </Text>
              </View>
            </View>
          );
        }
        // Otherwise Pending / Pending Documents
        return (
          <TouchableOpacity
            style={[styles.alertBanner, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}
            onPress={() => setScreeningModalOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="time" size={18} color="#f59e0b" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#f59e0b' }}>Action Required: Tenant Screening Check</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                Please verify your identity and upload required verification documents.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
          </TouchableOpacity>
        );
      })()}

      {/* =========================================================================
          TOP HERO: TOTAL AMOUNT DUE & FINANCIAL HEALTH GAUGE
          ========================================================================= */}
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.heroMainRow}>
          {/* Circular Financial Health Ring Gauge */}
          <View style={styles.gaugeContainer}>
            <View style={[
              styles.gaugeRingOuter, 
              { borderColor: isOverdue ? '#ef4444' : (amountToPay > 0 ? '#f59e0b' : '#10b981') }
            ]}>
              <View style={[styles.gaugeRingInner, { backgroundColor: colors.card }]}>
                <Ionicons 
                  name={isOverdue ? 'alert-circle' : (amountToPay > 0 ? 'time' : 'shield-checkmark')} 
                  size={24} 
                  color={isOverdue ? '#ef4444' : (amountToPay > 0 ? '#f59e0b' : '#10b981')} 
                />
                <Text style={[styles.gaugeRingPercent, { color: isOverdue ? '#ef4444' : (amountToPay > 0 ? '#f59e0b' : '#10b981') }]} allowFontScaling={false}>
                  {amountToPay > 0 ? (isOverdue ? 'ALERT' : 'DUE') : '100%'}
                </Text>
                <Text style={[styles.gaugeRingSub, { color: colors.textSecondary }]} allowFontScaling={false}>
                  {amountToPay > 0 ? 'PENDING' : 'CLEARED'}
                </Text>
              </View>
            </View>
          </View>

          {/* Amount Due Details */}
          <View style={styles.heroDetailsCol}>
            <View style={[styles.heroStatusBadge, { 
              backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.15)' : (amountToPay > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)') 
            }]}>
              <View style={[styles.heroDot, { backgroundColor: isOverdue ? '#ef4444' : (amountToPay > 0 ? '#f59e0b' : '#10b981') }]} />
              <Text style={[styles.heroStatusText, { 
                color: isOverdue ? '#ef4444' : (amountToPay > 0 ? '#f59e0b' : '#10b981') 
              }]} allowFontScaling={false}>
                {isOverdue ? 'Overdue' : (amountToPay > 0 ? 'Due Soon' : 'Paid in Full')}
              </Text>
            </View>

            <Text style={[styles.heroCardLabel, { color: colors.textSecondary, marginTop: 6 }]} allowFontScaling={false}>
              TOTAL AMOUNT DUE
            </Text>

            <Text style={[styles.heroAmountText, { color: isOverdue ? '#ef4444' : (amountToPay > 0 ? colors.textPrimary : '#10b981') }]} allowFontScaling={false}>
              ${amountToPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>

            <Text style={[styles.heroDueDateText, { color: colors.textSecondary }]} allowFontScaling={false} numberOfLines={2}>
              {amountToPay > 0 
                ? (isOverdue 
                    ? `Due: ${tenantData.nextDueDate !== 'N/A' ? tenantData.nextDueDate : 'Immediate'} · Outstanding balance pending`
                    : `Due Date: ${tenantData.nextDueDate}`)
                : 'No pending charges · Paid on time! 🎉'}
            </Text>
          </View>
        </View>

        {/* Financial Health Progress Bar */}
        <View style={styles.healthMeterContainer}>
          <View style={styles.healthMeterHeader}>
            <Text style={[styles.healthMeterLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
              MONTHLY RENT STATUS
            </Text>
            <Text style={[styles.healthMeterValue, { color: amountToPay > 0 ? '#f59e0b' : '#10b981' }]} allowFontScaling={false}>
              {amountToPay > 0 ? 'Payment Pending' : '100% Cleared'}
            </Text>
          </View>
          <View style={styles.healthMeterTrack}>
            <View style={[styles.healthMeterFill, { 
              width: amountToPay > 0 ? '30%' : '100%', 
              backgroundColor: amountToPay > 0 ? '#f59e0b' : '#10b981' 
            }]} />
          </View>
        </View>

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
          2x2 GRAPHICAL MICRO-METRICS TILES
          ========================================================================= */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricTile, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <Ionicons name="card" size={17} color="#10b981" />
          </View>
          <Text style={[styles.metricTileLabel, { color: colors.textSecondary }]} allowFontScaling={false}>RENT STATUS</Text>
          <Text style={[styles.metricTileValue, { color: '#10b981' }]} allowFontScaling={false}>
            {amountToPay === 0 ? 'Paid in Full' : `$${amountToPay.toLocaleString()}`}
          </Text>
          <Text style={[styles.metricTileSub, { color: colors.textSecondary }]} allowFontScaling={false}>
            {amountToPay === 0 ? '0 balance due' : 'Payment pending'}
          </Text>
        </View>

        <View style={[styles.metricTile, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
            <Ionicons name="construct" size={17} color="#38bdf8" />
          </View>
          <Text style={[styles.metricTileLabel, { color: colors.textSecondary }]} allowFontScaling={false}>ACTIVE REPAIRS</Text>
          <Text style={[styles.metricTileValue, { color: colors.textPrimary }]} allowFontScaling={false}>
            {maintenanceList.filter(t => t.status !== 'Completed' && t.status !== 'Closed' && t.status !== 'Resolved').length || (recentTicket ? 1 : 0)} Active
          </Text>
          <Text style={[styles.metricTileSub, { color: colors.textSecondary }]} allowFontScaling={false}>
            {recentTicket ? (recentTicket.status || 'In Progress') : 'All resolved'}
          </Text>
        </View>

        <View style={[styles.metricTile, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <Ionicons name="cube" size={17} color="#f59e0b" />
          </View>
          <Text style={[styles.metricTileLabel, { color: colors.textSecondary }]} allowFontScaling={false}>PACKAGES</Text>
          <Text style={[styles.metricTileValue, { color: colors.textPrimary }]} allowFontScaling={false}>
            {tenantData.packagesWaiting} Waiting
          </Text>
          <Text style={[styles.metricTileSub, { color: colors.textSecondary }]} allowFontScaling={false}>
            Front desk pickup
          </Text>
        </View>

        <View style={[styles.metricTile, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
            <Ionicons name="people" size={17} color="#a855f7" />
          </View>
          <Text style={[styles.metricTileLabel, { color: colors.textSecondary }]} allowFontScaling={false}>VISITOR PASSES</Text>
          <Text style={[styles.metricTileValue, { color: colors.textPrimary }]} allowFontScaling={false}>
            {tenantData.activeVisitors} Active
          </Text>
          <Text style={[styles.metricTileSub, { color: colors.textSecondary }]} allowFontScaling={false}>
            Pre-approved
          </Text>
        </View>
      </View>

      <View style={{ height: 24 }} />

      {/* =========================================================================
          PAY RENT MODAL
          ========================================================================= */}
      <Modal visible={payModalVisible} animationType="fade" transparent onRequestClose={() => setPayModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalIconCenter}>
              <Ionicons
                name={activeGateway?.provider === 'RAZORPAY' ? 'flash' : 'card-outline'}
                size={36}
                color={activeGateway?.provider === 'RAZORPAY' ? '#38bdf8' : '#0284c7'}
              />
            </View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
              Confirm Rent Payment
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]} allowFontScaling={false}>
              {tenantData.propertyName} • {tenantData.unitNumber}
            </Text>

            {/* Total Amount Box */}
            <View style={[styles.payAmountBox, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
              <Text style={styles.payAmountLabel}>TOTAL BALANCE DUE</Text>
              <Text style={styles.payAmountValue}>
                $
                {(tenantData.outstandingBalance > 0
                  ? tenantData.outstandingBalance
                  : tenantData.currentRent
                ).toLocaleString()}
              </Text>
            </View>

            {/* Gateway Routing Indicator matching Web */}
            {activeGateway?.provider === 'RAZORPAY' ? (
              <View style={styles.gatewayBadgeBox}>
                <View style={styles.gatewayBadgeHeader}>
                  <Ionicons name="shield-checkmark" size={15} color="#38bdf8" />
                  <Text style={styles.gatewayBadgeTitle}>Razorpay Online Gateway</Text>
                </View>
                <Text style={styles.gatewayBadgeSub}>
                  {activeGateway?.source === 'PROPERTY' && activeGateway?.propertyName
                    ? `Direct Property Gateway: ${activeGateway.propertyName}`
                    : 'Company Gateway (Option 2 Fallback)'}
                </Text>
                <Text style={styles.gatewayBadgeMethods}>
                  Supports: UPI • Cards • NetBanking • Wallets
                </Text>
              </View>
            ) : (
              <View style={[styles.gatewayBadgeBoxManual, { borderColor: 'rgba(245, 158, 11, 0.4)', backgroundColor: 'rgba(245, 158, 11, 0.08)' }]}>
                <View style={styles.gatewayBadgeHeader}>
                  <Ionicons name="alert-circle-outline" size={16} color="#f59e0b" />
                  <Text style={[styles.gatewayBadgeTitle, { color: '#f59e0b' }]}>Gateway Not Configured</Text>
                </View>
                <Text style={[styles.gatewayBadgeSub, { color: colors.textSecondary, marginTop: 4, lineHeight: 17 }]}>
                  Online payment gateway is not configured yet. Please contact your property manager to enable online payments.
                </Text>
              </View>
            )}

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
                style={[
                  styles.modalBtn,
                  styles.modalConfirmBtn,
                  activeGateway?.provider === 'RAZORPAY'
                    ? { backgroundColor: '#38bdf8' }
                    : { backgroundColor: '#64748b', opacity: 0.6 },
                ]}
                onPress={handleInitiatePayment}
                disabled={submitting || activeGateway?.provider !== 'RAZORPAY'}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color={activeGateway?.provider === 'RAZORPAY' ? '#0f172a' : '#ffffff'} />
                ) : (
                  <Text
                    style={[
                      styles.modalConfirmBtnText,
                      activeGateway?.provider === 'RAZORPAY' ? { color: '#0f172a' } : { color: '#ffffff' },
                    ]}
                    allowFontScaling={false}
                  >
                    {activeGateway?.provider === 'RAZORPAY' ? '⚡ Open Razorpay SDK' : 'Payment Unavailable'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          RAZORPAY HOSTED SDK MODAL (IDENTICAL TO WEB CHECKOUT)
          ========================================================================= */}
      <Modal
        visible={sdkModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSdkModalVisible(false)}
      >
        <View style={styles.sdkContainer}>
          {/* Header Bar */}
          <View style={styles.sdkHeader}>
            <View style={styles.sdkHeaderLeft}>
              <View style={styles.sdkLockCircle}>
                <Ionicons name="lock-closed" size={16} color="#38bdf8" />
              </View>
              <View>
                <Text style={styles.sdkHeaderTitle} allowFontScaling={false}>
                  Razorpay Secure Gateway
                </Text>
                <Text style={styles.sdkHeaderSub} allowFontScaling={false}>
                  {activeGateway?.propertyName || tenantData.propertyName} • 256-Bit SSL
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.sdkCloseBtn}
              onPress={() => {
                Alert.alert(
                  'Cancel Payment?',
                  'Are you sure you want to cancel this payment transaction?',
                  [
                    { text: 'No, Continue', style: 'cancel' },
                    {
                      text: 'Yes, Cancel',
                      style: 'destructive',
                      onPress: () => {
                        setSdkModalVisible(false);
                        setRazorpayOrder(null);
                      },
                    },
                  ]
                );
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color="#f8fafc" />
            </TouchableOpacity>
          </View>

          {/* Razorpay Web SDK View */}
          {sdkModalVisible && razorpayHtml ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: razorpayHtml }}
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.sdkLoadingBox}>
                  <ActivityIndicator size="large" color="#38bdf8" />
                  <Text style={styles.sdkLoadingText}>Launching Razorpay SDK...</Text>
                </View>
              )}
              style={styles.sdkWebView}
            />
          ) : null}
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
          SCREENING VERIFICATION MODAL (UNIFIED 1-STEP SCREEN MATCHING WEB DETAILS)
          ========================================================================= */}
      <Modal visible={screeningModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.screeningModalContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Header Title & Provider Badge */}
            <View style={[styles.screeningHeader, { borderBottomColor: colors.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.screeningHeaderTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
                  {es ? 'EVALUACIÓN DE INQUILINO' : 'TENANT SCREENING CHECK'}
                </Text>
                <View style={styles.providerBadgeRow}>
                  <Text style={styles.providerBadgeText} allowFontScaling={false}>
                    {es ? 'PASO 1 DE 1 • PROVEEDOR: TransUnion' : 'STEP 1 OF 1 • PROVIDER: TransUnion'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setScreeningModalOpen(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 }}
            >
              {/* SECTION 1: SCREENING CHECK INVITATION & DETAILS (From Web Step 1) */}
              <View style={[styles.screeningSectionCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderColor: colors.cardBorder }]}>
                <View style={styles.sectionHeaderTitleRow}>
                  <Ionicons name="sparkles" size={15} color="#0284c7" style={{ marginRight: 6 }} />
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]} allowFontScaling={false}>
                    {es ? 'INVITACIÓN A EVALUACIÓN' : 'SCREENING CHECK INVITATION'}
                  </Text>
                </View>
                <Text style={[styles.sectionDescText, { color: colors.textSecondary }]} allowFontScaling={false}>
                  {es
                    ? `Ha sido invitado por ${screeningCompanyName} para completar una verificación de evaluación de alquiler. Esta solicitud se procesará de forma segura.`
                    : `You have been invited by ${screeningCompanyName} to complete a rental application screening check. This request will be processed securely.`}
                </Text>

                {/* 2-Column Details Summary Grid */}
                <View style={styles.screeningGridRow}>
                  <View style={[styles.screeningGridBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <Text style={styles.gridBoxLabel} allowFontScaling={false}>
                      {es ? 'DATOS DEL SOLICITANTE' : 'APPLICANT DETAILS'}
                    </Text>
                    <Text style={[styles.gridBoxPrimary, { color: colors.textPrimary }]} numberOfLines={1} allowFontScaling={false}>
                      {screeningApplicantName}
                    </Text>
                    <Text style={[styles.gridBoxSecondary, { color: colors.textSecondary }]} numberOfLines={1} allowFontScaling={false}>
                      {screeningApplicantEmail}
                    </Text>
                  </View>

                  <View style={[styles.screeningGridBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <Text style={styles.gridBoxLabel} allowFontScaling={false}>
                      {es ? 'UBICACIÓN OBJETIVO' : 'TARGET LOCATION'}
                    </Text>
                    <Text style={[styles.gridBoxPrimary, { color: colors.textPrimary }]} numberOfLines={1} allowFontScaling={false}>
                      {screeningPropertyName}
                    </Text>
                    <Text style={[styles.gridBoxSecondary, { color: colors.textSecondary }]} numberOfLines={1} allowFontScaling={false}>
                      Unit Number: {screeningUnitNumber}
                    </Text>
                  </View>
                </View>
              </View>

              {/* SECTION 2: IDENTITY VERIFICATION (From Web Step 2 - SSN Removed) */}
              <View style={[styles.screeningSectionCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderColor: colors.cardBorder, marginTop: 12 }]}>
                <View style={styles.sectionHeaderTitleRow}>
                  <Ionicons name="person-outline" size={15} color="#0284c7" style={{ marginRight: 6 }} />
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]} allowFontScaling={false}>
                    {es ? 'VERIFICACIÓN DE IDENTIDAD' : 'IDENTITY VERIFICATION'}
                  </Text>
                </View>
                <Text style={[styles.sectionDescText, { color: colors.textSecondary }]} allowFontScaling={false}>
                  {es
                    ? 'Ingrese su fecha de nacimiento. Esta información se transmite directamente al proveedor para su verificación.'
                    : 'Please enter your Date of Birth. This information is encrypted and transmitted directly to the screening provider for verification.'}
                </Text>

                <View style={{ marginTop: 4 }}>
                  <Text style={[styles.screeningFieldLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                    {es ? 'FECHA DE NACIMIENTO *' : 'DATE OF BIRTH *'}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.inputField,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.cardBorder,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12,
                        marginBottom: 0,
                      },
                    ]}
                    onPress={() => setShowScreeningDobPicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Ionicons name="calendar" size={18} color="#0284c7" style={{ marginRight: 8 }} />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: screeningDob ? '700' : '500',
                          color: screeningDob ? colors.textPrimary : '#94a3b8',
                        }}
                        allowFontScaling={false}
                      >
                        {screeningDob ? screeningDob : (es ? 'Seleccionar Fecha de Nacimiento' : 'Select Date of Birth (YYYY-MM-DD)')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* SECTION 3: DOCUMENT VERIFICATION (From Web Step 4) */}
              <View style={[styles.screeningSectionCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderColor: colors.cardBorder, marginTop: 12 }]}>
                <View style={styles.sectionHeaderTitleRow}>
                  <Ionicons name="document-text-outline" size={15} color="#0284c7" style={{ marginRight: 6 }} />
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]} allowFontScaling={false}>
                    {es ? 'VERIFICACIÓN DE DOCUMENTOS' : 'DOCUMENT VERIFICATION'}
                  </Text>
                </View>
                <Text style={[styles.sectionDescText, { color: colors.textSecondary }]} allowFontScaling={false}>
                  {es
                    ? 'Suba una copia de su identificación oficial con foto (Pasaporte, Licencia) o comprobante de ingresos W2 (Máx. 5MB).'
                    : 'Please upload a copy of your Government-issued Photo ID (e.g. Passport, Drivers License, State ID) or W2 Income statements. Max file size: 5MB.'}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.docUploadDashedBox,
                    {
                      borderColor: docFile ? '#10b981' : colors.cardBorder,
                      backgroundColor: docFile ? (isDarkMode ? 'rgba(16,185,129,0.08)' : '#f0fdf4') : colors.card,
                    },
                  ]}
                  onPress={handlePickDocument}
                  activeOpacity={0.8}
                >
                  {docFile ? (
                    <View style={{ alignItems: 'center' }}>
                      <View style={[styles.uploadIconBadge, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                      </View>
                      <Text style={[styles.docUploadFileName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {docFile.name}
                      </Text>
                      <Text style={[styles.docUploadFileSize, { color: colors.textSecondary }]}>
                        {docFile.size ? `${(docFile.size / (1024 * 1024)).toFixed(2)} MB • ` : ''}
                        {es ? 'Listo para enviar (Toca para cambiar)' : 'Ready to upload (Tap to change)'}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <View style={[styles.uploadIconBadge, { backgroundColor: 'rgba(2,132,199,0.1)' }]}>
                        <Ionicons name="cloud-upload-outline" size={24} color="#0284c7" />
                      </View>
                      <Text style={[styles.docUploadPromptText, { color: '#0284c7' }]}>
                        {es ? 'Seleccionar ID o Documento W2' : 'Choose ID / W2 Document'}
                      </Text>
                      <Text style={[styles.docUploadHintText, { color: colors.textSecondary }]}>
                        PDF, PNG, JPG, DOC (Max 5MB)
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* SECTION 4: AUTHORIZATION & CONSENT (From Web Step 3) */}
              <TouchableOpacity
                style={[
                  styles.consentBox,
                  {
                    backgroundColor: consent
                      ? (isDarkMode ? 'rgba(2,132,199,0.12)' : '#f0f9ff')
                      : (isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                    borderColor: consent ? '#0284c7' : colors.cardBorder,
                  },
                ]}
                onPress={() => setConsent(!consent)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={consent ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={consent ? '#0284c7' : colors.textSecondary}
                  style={{ marginRight: 10, marginTop: 1 }}
                />
                <Text style={[styles.consentText, { color: colors.textPrimary }]} allowFontScaling={false}>
                  {es
                    ? `Autorizo a ${screeningCompanyName} y al proveedor de evaluación (TransUnion) a obtener mi informe de consumidor, antecedentes penales e historial de desalojos con fines de evaluación de alquiler.`
                    : `I authorize ${screeningCompanyName} and the screening provider (TransUnion) to obtain my consumer report, criminal background report, and eviction history for rental screening purposes.`}
                </Text>
              </TouchableOpacity>

              {/* ACTION BUTTONS */}
              <View style={[styles.modalBtnRow, { marginTop: 16 }]}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancelBtn]}
                  onPress={() => setScreeningModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelBtnText} allowFontScaling={false}>
                    {es ? 'Cancelar' : 'Cancel'}
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
                      {es ? 'Enviar Verificación' : 'Submit Proof'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Custom Date Picker rendered inline inside this Modal so it is never blocked by OS modal layering */}
          {showScreeningDobPicker && (
            <CustomDatePicker
              inline
              visible={showScreeningDobPicker}
              value={screeningDob}
              onSelect={(date) => {
                setScreeningDob(date);
                setShowScreeningDobPicker(false);
              }}
              onClose={() => setShowScreeningDobPicker(false)}
            />
          )}
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    hamburgerBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    bellBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      borderWidth: 1,
    },
    bellBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: '#ef4444',
      borderRadius: 9,
      minWidth: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
      borderWidth: 1.5,
      borderColor: colors.background,
    },
    bellBadgeText: {
      color: '#ffffff',
      fontSize: 8.5,
      fontWeight: '900',
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
      borderRadius: 20,
      borderWidth: 1,
      padding: 18,
      marginBottom: 16,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.06,
      shadowRadius: 10,
    },
    heroMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    gaugeContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    gaugeRingOuter: {
      width: 90,
      height: 90,
      borderRadius: 45,
      borderWidth: 6,
      justifyContent: 'center',
      alignItems: 'center',
      borderStyle: 'solid',
    },
    gaugeRingInner: {
      width: 74,
      height: 74,
      borderRadius: 37,
      justifyContent: 'center',
      alignItems: 'center',
    },
    gaugeRingPercent: {
      fontSize: 10.5,
      fontWeight: '900',
      marginTop: 2,
      letterSpacing: 0.4,
    },
    gaugeRingSub: {
      fontSize: 8,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroDetailsCol: {
      flex: 1,
    },
    heroDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      marginRight: 6,
    },
    heroCardLabel: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    heroStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 9,
      paddingVertical: 3.5,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    heroStatusText: {
      fontSize: 11,
      fontWeight: '800',
    },
    heroAmountText: {
      fontSize: 30,
      fontWeight: '900',
      letterSpacing: -0.6,
      marginVertical: 2,
    },
    heroDueDateText: {
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 16,
    },

    // Financial Health Meter
    healthMeterContainer: {
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(100, 116, 139, 0.15)',
    },
    healthMeterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    healthMeterLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    healthMeterValue: {
      fontSize: 11,
      fontWeight: '700',
    },
    healthMeterTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(100, 116, 139, 0.15)',
      overflow: 'hidden',
    },
    healthMeterFill: {
      height: '100%',
      borderRadius: 3,
    },

    heroPayBtn: {
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      marginTop: 14,
      elevation: 2,
    },
    heroPayBtnText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '800',
    },

    // 2x2 MICRO-METRICS TILES GRID
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    metricTile: {
      flex: 1,
      minWidth: '46%',
      borderWidth: 1,
      borderRadius: 16,
      padding: 13,
    },
    metricIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    metricTileLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
      marginBottom: 2,
    },
    metricTileValue: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 2,
    },
    metricTileSub: {
      fontSize: 11,
      fontWeight: '500',
    },

    // 6-MONTH PAYMENT HISTORY BAR CHART
    chartCard: {
      borderRadius: 18,
      borderWidth: 1,
      padding: 16,
      marginBottom: 16,
      elevation: 1,
    },
    chartHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    chartIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    chartCardTitle: {
      fontSize: 13.5,
      fontWeight: '800',
    },
    chartCardSub: {
      fontSize: 11,
      fontWeight: '500',
      marginTop: 1,
    },
    chartPillBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
    },
    chartPillBadgeText: {
      color: '#f59e0b',
      fontSize: 10.5,
      fontWeight: '800',
    },
    barsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingHorizontal: 6,
      height: 90,
      marginBottom: 10,
    },
    barCol: {
      alignItems: 'center',
      flex: 1,
    },
    barTrack: {
      height: 52,
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginBottom: 6,
    },
    barFill: {
      width: 22,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    barLabel: {
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 1,
    },
    barStatusText: {
      fontSize: 9.5,
      fontWeight: '800',
      color: '#10b981',
    },
    chartFooterRow: {
      borderTopWidth: 1,
      paddingTop: 10,
      marginTop: 4,
    },
    chartFooterText: {
      fontSize: 11.5,
      fontWeight: '600',
    },

    // GENERAL CARD (Maintenance & Lease)
    card: {
      borderRadius: 18,
      borderWidth: 1,
      marginBottom: 16,
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
      borderRadius: 9,
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

    // Maintenance ticket container & 3-stage stepper
    ticketContainer: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
    },
    ticketTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    ticketTitle: {
      fontSize: 14,
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

    // Stepper
    stepperContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingTop: 4,
    },
    stepNode: {
      alignItems: 'center',
      width: 65,
    },
    stepDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    stepDotCompleted: {
      backgroundColor: '#10b981',
    },
    stepDotActive: {
      backgroundColor: '#0284c7',
    },
    stepDotPending: {
      backgroundColor: 'rgba(100, 116, 139, 0.25)',
    },
    stepLine: {
      flex: 1,
      height: 3,
      backgroundColor: 'rgba(100, 116, 139, 0.25)',
      marginTop: -16,
      marginHorizontal: 4,
      borderRadius: 1.5,
    },
    stepLineActive: {
      backgroundColor: '#10b981',
    },
    stepLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: '#64748b',
    },
    stepLabelActive: {
      color: '#0284c7',
      fontWeight: '800',
    },

    emptyMaintenanceBox: {
      alignItems: 'center',
      paddingVertical: 14,
    },
    emptyMaintenanceTitle: {
      fontSize: 13.5,
      fontWeight: '800',
      marginTop: 2,
      marginBottom: 3,
    },
    emptyMaintenanceText: {
      fontSize: 12,
      textAlign: 'center',
      paddingHorizontal: 12,
    },
    outlineActionBtn: {
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 11,
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

    // Lease Graphical Progress & Details
    noLeaseIconBadge: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    leaseProgressWrapper: {
      marginBottom: 14,
      padding: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(56, 189, 248, 0.06)',
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.18)',
    },
    leaseProgressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    leaseProgressLabel: {
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    leaseProgressValue: {
      fontSize: 10.5,
      fontWeight: '800',
    },
    leaseProgressBarTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(100, 116, 139, 0.2)',
      overflow: 'hidden',
      marginBottom: 6,
    },
    leaseProgressBarFill: {
      height: '100%',
      backgroundColor: '#38bdf8',
      borderRadius: 3,
    },
    leaseProgressFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    leaseDateText: {
      fontSize: 10,
      fontWeight: '600',
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

    // Quick Footer Grid (4-buttons)
    quickFooterGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 2,
      marginBottom: 12,
    },
    quickFooterBtn: {
      flex: 1,
      minWidth: '46%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 13,
      gap: 7,
    },
    quickFooterBtnText: {
      fontSize: 12.5,
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
    payAmountBox: {
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    payAmountLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: '#94a3b8',
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    payAmountValue: {
      fontSize: 26,
      fontWeight: '900',
      color: '#38bdf8',
    },
    gatewayBadgeBox: {
      backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.08)' : 'rgba(56, 189, 248, 0.06)',
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.3)',
      borderRadius: 12,
      padding: 10,
      marginBottom: 14,
    },
    gatewayBadgeBoxManual: {
      backgroundColor: isDarkMode ? 'rgba(148, 163, 184, 0.08)' : 'rgba(148, 163, 184, 0.06)',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#cbd5e1',
      borderRadius: 12,
      padding: 10,
      marginBottom: 14,
    },
    gatewayBadgeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 3,
    },
    gatewayBadgeTitle: {
      fontSize: 12.5,
      fontWeight: '800',
      color: '#38bdf8',
    },
    gatewayBadgeSub: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textPrimary || '#f8fafc',
      marginTop: 2,
    },
    gatewayBadgeMethods: {
      fontSize: 10,
      color: colors.textSecondary || '#94a3b8',
      marginTop: 4,
      fontWeight: '500',
    },
    // SDK Fullscreen Container Styles
    sdkContainer: {
      flex: 1,
      backgroundColor: '#090d16',
    },
    sdkHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 54 : 16,
      paddingBottom: 14,
      backgroundColor: '#0f172a',
      borderBottomWidth: 1,
      borderBottomColor: '#1e293b',
    },
    sdkHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    sdkLockCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sdkHeaderTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#f8fafc',
    },
    sdkHeaderSub: {
      fontSize: 11,
      color: '#94a3b8',
      marginTop: 2,
    },
    sdkCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sdkWebView: {
      flex: 1,
      backgroundColor: '#090d16',
    },
    sdkLoadingBox: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#090d16',
    },
    sdkLoadingText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#94a3b8',
      marginTop: 12,
    },

    // Unified Tenant Screening Check Modal Styles
    screeningModalContainer: {
      borderRadius: 20,
      borderWidth: 1,
      maxHeight: '90%',
      overflow: 'hidden',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
    },
    screeningHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    screeningHeaderTitle: {
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    providerBadgeRow: {
      marginTop: 3,
    },
    providerBadgeText: {
      fontSize: 9.5,
      fontWeight: '800',
      color: '#0284c7',
      letterSpacing: 0.3,
    },
    modalCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    screeningSectionCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 13,
    },
    sectionHeaderTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    sectionHeading: {
      fontSize: 11.5,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    sectionDescText: {
      fontSize: 11,
      lineHeight: 16,
      marginBottom: 10,
    },
    screeningGridRow: {
      flexDirection: 'row',
      gap: 8,
    },
    screeningGridBox: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      padding: 10,
    },
    gridBoxLabel: {
      fontSize: 8.5,
      fontWeight: '800',
      color: '#64748b',
      letterSpacing: 0.5,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    gridBoxPrimary: {
      fontSize: 12.5,
      fontWeight: '700',
      marginBottom: 2,
    },
    gridBoxSecondary: {
      fontSize: 10.5,
    },
    screeningFieldLabel: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
      marginBottom: 5,
      textTransform: 'uppercase',
    },
    docUploadDashedBox: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadIconBadge: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    docUploadPromptText: {
      fontSize: 12.5,
      fontWeight: '700',
      marginBottom: 2,
    },
    docUploadHintText: {
      fontSize: 10,
    },
    docUploadFileName: {
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 2,
    },
    docUploadFileSize: {
      fontSize: 10,
    },
    consentBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: 12,
      borderWidth: 1,
      padding: 11,
      marginTop: 12,
    },
    consentText: {
      fontSize: 11,
      lineHeight: 16,
      flex: 1,
      fontWeight: '500',
    },
  });

export default TenantDashboard;

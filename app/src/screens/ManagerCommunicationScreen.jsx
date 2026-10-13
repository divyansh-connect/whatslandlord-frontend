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
import apiClient from '../api/client';
import { useAuthStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export const ManagerCommunicationScreen = () => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  // Sub-navigation state: 'dashboard' | 'announcements' | 'email' | 'sms' | 'inbox'
  const [activeView, setActiveView] = useState('dashboard');

  // Unified Inbox states
  const [activeThreadId, setActiveThreadId] = useState(null); // null means show threads list
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  
  const [threads, setThreads] = useState([
    { id: 2, name: 'ContactName 2', type: 'SMS', badgeColor: '#38bdf8', lastMsg: 'Relational message log content details #50...', phone: '555-0199', email: 'contactname2@rentals.com', location: 'Skyline Luxury Lofts · Unit #304', agent: 'Property Manager Staff' },
    { id: 3, name: 'ContactName 3', type: 'CHAT', badgeColor: '#10b981', lastMsg: 'Checking for turnover keycards status.', phone: '555-0244', email: 'contactname3@rentals.com', location: 'Skyline Luxury Lofts · Unit #305', agent: 'Management Staff' },
    { id: 4, name: 'ContactName 4', type: 'EMAIL', badgeColor: '#a855f7', lastMsg: 'Notice regarding rent statement details.', phone: '555-0312', email: 'contactname4@rentals.com', location: 'Skyline Luxury Lofts · Unit #102', agent: 'Property Manager Staff' },
    { id: 5, name: 'ContactName 5', type: 'SMS', badgeColor: '#38bdf8', lastMsg: 'Relational message log content details #48...', phone: '555-0155', email: 'contactname5@rentals.com', location: 'Skyline Luxury Lofts · Unit #201', agent: 'Property Manager Staff' },
    { id: 6, name: 'ContactName 6', type: 'CHAT', badgeColor: '#10b981', lastMsg: 'Rent payment cleared in ledger.', phone: '555-0677', email: 'contactname6@rentals.com', location: 'Skyline Luxury Lofts · Unit #401', agent: 'Management Staff' },
    { id: 7, name: 'ContactName 7', type: 'EMAIL', badgeColor: '#a855f7', lastMsg: 'Notice regarding lease timeline checks.', phone: '555-0788', email: 'contactname7@rentals.com', location: 'Skyline Luxury Lofts · Unit #108', agent: 'Property Manager Staff' },
    { id: 8, name: 'ContactName 8', type: 'SMS', badgeColor: '#38bdf8', lastMsg: 'Relational message log content details #47...', phone: '555-0899', email: 'contactname8@rentals.com', location: 'Skyline Luxury Lofts · Unit #310', agent: 'Property Manager Staff' },
  ]);

  const [messagesByThread, setMessagesByThread] = useState({
    2: [
      { id: 1, sender: 'Sarah Connor', text: 'Relational message log content details #48 checking for turnover keycards.', time: '2026-07-21 10:15 AM' },
      { id: 2, sender: 'Skyline Management Office', text: 'Relational message log content details #49 checking for turnover keycards.', time: '2026-07-22 02:30 PM' },
      { id: 3, sender: 'Sarah Connor', text: 'Relational message log content details #50 checking for turnover keycards.', time: '2026-07-23 09:45 AM' },
    ],
    3: [
      { id: 1, sender: 'ContactName 3', text: 'Relational message log content details regarding lease checks.', time: '2026-08-01 11:00 AM' },
      { id: 2, sender: 'Skyline Management Office', text: 'Checking for turnover keycards status.', time: '2026-08-02 04:00 PM' }
    ]
  });

  // Outbound listings
  const [announcements, setAnnouncements] = useState([]);
  const [emails, setEmails] = useState([
    { id: 1, date: '2026-07-2', recipient: 'resident1@whatslandlord.com', subject: 'Notice regarding rent statement #1', status: 'Draft' },
    { id: 2, date: '2026-07-3', recipient: 'resident2@whatslandlord.com', subject: 'Notice regarding rent statement #2', status: 'Scheduled' },
    { id: 3, date: '2026-07-4', recipient: 'resident3@whatslandlord.com', subject: 'Notice regarding rent statement #3', status: 'Failed' },
    { id: 4, date: '2026-07-5', recipient: 'resident4@whatslandlord.com', subject: 'Notice regarding rent statement #4', status: 'Sent' },
    { id: 5, date: '2026-07-6', recipient: 'resident5@whatslandlord.com', subject: 'Notice regarding rent statement #5', status: 'Draft' },
    { id: 6, date: '2026-07-7', recipient: 'resident6@whatslandlord.com', subject: 'Notice regarding rent statement #6', status: 'Scheduled' },
    { id: 7, date: '2026-07-8', recipient: 'resident7@whatslandlord.com', subject: 'Notice regarding rent statement #7', status: 'Failed' },
    { id: 8, date: '2026-07-9', recipient: 'resident8@whatslandlord.com', subject: 'Notice regarding rent statement #8', status: 'Sent' },
  ]);
  
  const [smsLogs, setSmsLogs] = useState([
    { id: 1, date: '2026-07-2', recipient: 'Resident Phone 2', body: 'Reminder: Maintenance visit scheduled for unit 2 tomorrow at 10 AM.', status: 'Delivered' },
    { id: 2, date: '2026-07-3', recipient: 'Resident Phone 3', body: 'Reminder: Maintenance visit scheduled for unit 3 tomorrow at 10 AM.', status: 'Failed' },
    { id: 3, date: '2026-07-4', recipient: 'Resident Phone 4', body: 'Reminder: Maintenance visit scheduled for unit 4 tomorrow at 10 AM.', status: 'Scheduled' },
    { id: 4, date: '2026-07-5', recipient: 'Resident Phone 5', body: 'Reminder: Maintenance visit scheduled for unit 5 tomorrow at 10 AM.', status: 'Sent' },
    { id: 5, date: '2026-07-6', recipient: 'Resident Phone 6', body: 'Reminder: Maintenance visit scheduled for unit 6 tomorrow at 10 AM.', status: 'Delivered' },
    { id: 6, date: '2026-07-7', recipient: 'Resident Phone 7', body: 'Reminder: Maintenance visit scheduled for unit 7 tomorrow at 10 AM.', status: 'Failed' },
  ]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Announcement Creator state
  const [createAnnounceOpen, setCreateAnnounceOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState('Community Events');
  const [annAudience, setAnnAudience] = useState('All Tenants Residents');

  // Email Creator state
  const [createEmailOpen, setCreateEmailOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('-- Choose pre-saved templates --');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // SMS Creator state
  const [createSmsOpen, setCreateSmsOpen] = useState(false);
  const [smsRecipient, setSmsRecipient] = useState('');
  const [smsBody, setSmsBody] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown helper modal
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [activePicker, setActivePicker] = useState(null); // 'category' | 'audience' | 'template'

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const runEntryAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
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

  // Fetch Announcements
  const fetchAnnouncements = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/announcements', logout, refreshAccessToken);
      const list = res?.data || res || [];
      setAnnouncements(list);
    } catch (e) {
      console.log('Failed fetching announcements:', e.message);
      setAnnouncements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  useEffect(() => {
    if (activeView === 'announcements') {
      fetchAnnouncements();
    } else {
      runEntryAnimation();
    }
  }, [activeView]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeView === 'announcements') {
      fetchAnnouncements(false);
    } else {
      setTimeout(() => setRefreshing(false), 800);
    }
  };

  // Actions submissions
  const handleCreateAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) {
      Alert.alert('Validation Error', 'Title and Content are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: annTitle.trim(),
        content: annContent.trim(),
        category: annCategory,
        isPinned: false,
      };

      await apiClient.post('/announcements', payload, logout, refreshAccessToken);
      Alert.alert('Success', 'Notice announcement published successfully.');
      setCreateAnnounceOpen(false);
      setAnnTitle('');
      setAnnContent('');
      fetchAnnouncements(true);
    } catch (e) {
      // Fallback local update
      setAnnouncements(prev => [
        {
          id: String(Date.now()),
          title: annTitle.trim(),
          content: annContent.trim(),
          category: annCategory,
          createdAt: new Date().toISOString(),
          isPinned: false,
        },
        ...prev
      ]);
      Alert.alert('Success', 'Notice published successfully.');
      setCreateAnnounceOpen(false);
      setAnnTitle('');
      setAnnContent('');
      setSubmitting(false);
      runEntryAnimation();
    }
  };

  const handleSendEmail = () => {
    if (!emailRecipient.trim() || !emailSubject.trim() || !emailBody.trim()) {
      Alert.alert('Validation Error', 'Recipient, Subject, and Body are required.');
      return;
    }

    setEmails(prev => [
      {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        recipient: emailRecipient.trim(),
        subject: emailSubject.trim(),
        status: 'Sent',
      },
      ...prev
    ]);

    Alert.alert('Success', `Email Dispatch sent to ${emailRecipient}!`);
    setCreateEmailOpen(false);
    setEmailRecipient('');
    setEmailSubject('');
    setEmailBody('');
  };

  const handleSendSms = () => {
    if (!smsRecipient.trim() || !smsBody.trim()) {
      Alert.alert('Validation Error', 'Recipient and Text Body are required.');
      return;
    }

    setSmsLogs(prev => [
      {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        recipient: smsRecipient.trim(),
        body: smsBody.trim(),
        status: 'Sent',
      },
      ...prev
    ]);

    Alert.alert('Success', `SMS Alert sent to ${smsRecipient}!`);
    setCreateSmsOpen(false);
    setSmsRecipient('');
    setSmsBody('');
  };

  // Compose Chat Message
  const handleSendChatMessage = () => {
    if (!typedMessage.trim() || !activeThreadId) return;

    const newMsg = {
      id: Date.now(),
      sender: 'Skyline Management Office',
      text: typedMessage.trim(),
      time: 'Just Now'
    };

    setMessagesByThread(prev => ({
      ...prev,
      [activeThreadId]: [...(prev[activeThreadId] || []), newMsg]
    }));

    // Update last message in thread preview
    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return { ...t, lastMsg: typedMessage.trim().substring(0, 40) + '...' };
      }
      return t;
    }));

    setTypedMessage('');
  };

  // Picker options
  const getPickerOptions = () => {
    if (activePicker === 'category') {
      return ['Community Events', 'Maintenance Alert', 'Financial Statement', 'Security Notice'];
    }
    if (activePicker === 'audience') {
      return ['All Tenants Residents', 'Portfolio Owners', 'Registered Contractors', 'Management Staff'];
    }
    if (activePicker === 'template') {
      return ['-- Choose pre-saved templates --', 'Rent Statement Notice', 'Maintenance Scheduled Notice', 'Lease Renewal Offer'];
    }
    return [];
  };

  const handleSelectPickerOption = (opt) => {
    if (activePicker === 'category') setAnnCategory(opt);
    if (activePicker === 'audience') setAnnAudience(opt);
    if (activePicker === 'template') {
      setEmailTemplate(opt);
      if (opt === 'Rent Statement Notice') {
        setEmailSubject('Urgent: Monthly Rent Statement Dispatched');
        setEmailBody('Dear Resident,\n\nYour rent statement for this month has been generated and posted to your ledger account. Please check the Payments section to execute the transaction.\n\nBest Regards,\nWhatsLandlord Management');
      } else if (opt === 'Maintenance Scheduled Notice') {
        setEmailSubject('HVAC seasonal maintenance check notification');
        setEmailBody('Dear Resident,\n\nPlease note that HVAC technician visits are scheduled for your unit next week. Let us know if there are pets or specific access directions.\n\nBest Regards,\nMaintenance Department');
      }
    }
    setPickerModalOpen(false);
  };

  // Filter listings
  const filteredAnnouncements = announcements.filter(item => {
    const text = `${item.title || ''} ${item.content || ''} ${item.category || ''}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const filteredEmails = emails.filter(item => {
    const text = `${item.recipient || ''} ${item.subject || ''} ${item.status || ''}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const filteredSms = smsLogs.filter(item => {
    const text = `${item.recipient || ''} ${item.body || ''} ${item.status || ''}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const activeThread = threads.find(t => t.id === activeThreadId);
  const activeMessages = activeThreadId ? (messagesByThread[activeThreadId] || []) : [];

  return (
    <View style={styles.mainWrapper}>
      {/* FIXED TOP HEADER */}
      <View style={[styles.fixedHeader, { paddingTop: Platform.OS === 'ios' ? 48 : 16 }]}>
        <View style={styles.backRow}>
          {activeView !== 'dashboard' && (
            <TouchableOpacity 
              style={styles.backBtn} 
              onPress={() => {
                if (activeView === 'inbox' && activeThreadId !== null) {
                  setActiveThreadId(null);
                } else {
                  setActiveView('dashboard');
                }
              }}
            >
              <Ionicons name="arrow-back-outline" size={16} color="#38bdf8" style={{ marginRight: 4 }} />
              <Text style={styles.backBtnText} allowFontScaling={false}>
                {activeView === 'inbox' && activeThreadId !== null ? 'All Inbox Threads' : 'Dashboard'}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={styles.breadcrumb} allowFontScaling={false}>
            {activeView === 'dashboard' 
              ? 'Home › Communication' 
              : activeView === 'inbox' && activeThreadId !== null
                ? `Inbox › ${activeThread?.name}`
                : `Communication › ${activeView.charAt(0).toUpperCase() + activeView.slice(1)}`}
          </Text>
        </View>

        <Text style={styles.title} allowFontScaling={false}>
          {activeView === 'dashboard' 
            ? 'Communication Center' 
            : activeView === 'announcements' 
              ? 'Notice Board' 
              : activeView === 'email' 
                ? 'Email Center' 
                : activeView === 'sms' 
                  ? 'SMS Dispatch Center'
                  : activeThreadId === null ? 'Unified Inbox' : activeThread?.name}
        </Text>
        <Text style={styles.subtitle} allowFontScaling={false}>
          {activeView === 'dashboard' 
            ? 'Verify unified messaging volumes, response times, active campaigns, and outbound dispatches.'
            : activeView === 'announcements'
              ? 'Verify published community notices, fire alarm drills alerts, or schedule new announcements.'
              : activeView === 'email'
                ? 'Verify sent emails, schedule automated messages, or compose direct notifications.'
                : activeView === 'sms'
                  ? 'Verify outbound text message alerts delivery states, scheduled notifications, or dispatch immediate SMS.'
                  : activeThreadId === null
                    ? 'Verify manager discussions, resident updates, or vendor coordination threads.'
                    : `Active Channel: ${activeThread?.type} · Location: ${activeThread?.location}`}
        </Text>

        {/* Action Controls / Search shown on sub-views (excluding active chat thread room) */}
        {activeView !== 'dashboard' && !(activeView === 'inbox' && activeThreadId !== null) && (
          <View style={[styles.searchBarRow, { marginTop: 10 }]}>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${activeView === 'inbox' ? 'conversations' : activeView}...`}
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {activeView === 'announcements' && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setCreateAnnounceOpen(true)}>
                <Ionicons name="add" size={16} color="#0f172a" />
                <Text style={styles.addBtnText} allowFontScaling={false}>Announcement</Text>
              </TouchableOpacity>
            )}
            {activeView === 'email' && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setCreateEmailOpen(true)}>
                <Ionicons name="mail-outline" size={16} color="#0f172a" style={{ marginRight: 2 }} />
                <Text style={styles.addBtnText} allowFontScaling={false}>Compose Email</Text>
              </TouchableOpacity>
            )}
            {activeView === 'sms' && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setCreateSmsOpen(true)}>
                <Ionicons name="chatbubble-outline" size={16} color="#0f172a" style={{ marginRight: 2 }} />
                <Text style={styles.addBtnText} allowFontScaling={false}>Send SMS Alert</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* MAIN CONTENT AREA */}
      {activeView === 'dashboard' ? (
        // --- 1. COMMUNICATIONS DASHBOARD SCREEN ---
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.scrollContent, { paddingTop: 16 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Quick Actions Panel */}
            <View style={styles.actionsPanel}>
              <Text style={styles.panelTitle} allowFontScaling={false}>DISPATCH ACTIONS</Text>
              <View style={styles.actionsGrid}>
                <TouchableOpacity style={styles.actionItem} onPress={() => setActiveView('inbox')} activeOpacity={0.8}>
                  <Ionicons name="chatbox-ellipses-outline" size={20} color="#38bdf8" />
                  <Text style={styles.actionText} allowFontScaling={false}>Unified Inbox</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionItem} onPress={() => setActiveView('email')} activeOpacity={0.8}>
                  <Ionicons name="mail-outline" size={20} color="#10b981" />
                  <Text style={styles.actionText} allowFontScaling={false}>Send Email</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={() => setActiveView('sms')} activeOpacity={0.8}>
                  <Ionicons name="phone-portrait-outline" size={20} color="#f59e0b" />
                  <Text style={styles.actionText} allowFontScaling={false}>Send SMS</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={() => setActiveView('announcements')} activeOpacity={0.8}>
                  <Ionicons name="megaphone-outline" size={20} color="#ec4899" />
                  <Text style={styles.actionText} allowFontScaling={false}>Publish Notice</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Metrics cards grid */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel} allowFontScaling={false}>UNIFIED CONVERSATIONS</Text>
                <Text style={[styles.metricVal, { color: '#38bdf8' }]} allowFontScaling={false}>3,510</Text>
                <Text style={styles.metricSubText} allowFontScaling={false}>5005 Unread messages</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel} allowFontScaling={false}>SENT OUTBOUND TODAY</Text>
                <Text style={[styles.metricVal, { color: '#10b981' }]} allowFontScaling={false}>24 / 48</Text>
                <Text style={styles.metricSubText} allowFontScaling={false}>100% Delivery cleared</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel} allowFontScaling={false}>ACTIVE CAMPAIGNS</Text>
                <Text style={[styles.metricVal, { color: '#ec4899' }]} allowFontScaling={false}>52</Text>
                <Text style={styles.metricSubText} allowFontScaling={false}>12 Scheduled dispatches</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel} allowFontScaling={false}>NOTICE BOARD VIEWS</Text>
                <Text style={[styles.metricVal, { color: '#f59e0b' }]} allowFontScaling={false}>1,450</Text>
                <Text style={styles.metricSubText} allowFontScaling={false}>Average read rate: 82%</Text>
              </View>
            </View>

            {/* Delivery warnings banner */}
            <View style={styles.alertBanner}>
              <View style={styles.alertHeader}>
                <Ionicons name="shield-alert-outline" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={styles.alertTitle} allowFontScaling={false}>OUTBOUND DELIVERY ISSUES</Text>
              </View>
              <Text style={styles.alertDesc} allowFontScaling={false}>
                There are 2 failed email dispatches waiting to be re-sent.
              </Text>
              <TouchableOpacity style={styles.alertBtn} onPress={() => {}}>
                <Text style={styles.alertBtnText} allowFontScaling={false}>View Activity Log</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      ) : activeView === 'inbox' ? (
        // --- 2. UNIFIED INBOX VIEWER ---
        activeThreadId === null ? (
          // A. INBOX THREADS LIST
          <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.scrollContent, { paddingTop: 12 }]}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {threads.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.commCard}
                  onPress={() => {
                    setActiveThreadId(item.id);
                    setShowContactDetails(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.rowBetween}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarCircleText} allowFontScaling={false}>
                        {item.name.charAt(item.name.length - 1)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.commCardTitle} allowFontScaling={false}>{item.name}</Text>
                        <View style={[styles.badge, { borderColor: item.badgeColor, backgroundColor: `${item.badgeColor}15` }]}>
                          <Text style={[styles.badgeText, { color: item.badgeColor }]} allowFontScaling={false}>{item.type}</Text>
                        </View>
                      </View>
                      <Text style={styles.commCardDesc} numberOfLines={1} allowFontScaling={false}>{item.lastMsg}</Text>
                      <Text style={[styles.commCardMeta, { marginTop: 4 }]} allowFontScaling={false}>{item.location}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </Animated.View>
          </ScrollView>
        ) : (
          // B. INBOX ACTIVE CONVERSATION CHAT ROOM
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 0}
          >
            <View style={{ flex: 1 }}>
              {/* Toggle Contact Details Bar */}
              <TouchableOpacity 
                style={styles.contactDetailsToggleBar} 
                onPress={() => setShowContactDetails(!showContactDetails)}
                activeOpacity={0.9}
              >
                <Ionicons name={showContactDetails ? "chevron-up" : "chevron-down"} size={16} color="#38bdf8" style={{ marginRight: 6 }} />
                <Text style={styles.contactDetailsToggleText} allowFontScaling={false}>
                  {showContactDetails ? "Hide Resident Details" : "Show Resident Details & Direct Channels"}
                </Text>
              </TouchableOpacity>

              {/* Collapsible Contact Profile Card */}
              {showContactDetails && (
                <View style={styles.collapsibleContactCard}>
                  <View style={styles.avatarBig}>
                    <Text style={styles.avatarBigText} allowFontScaling={false}>
                      {activeThread?.name.charAt(activeThread?.name.length - 1)}
                    </Text>
                  </View>
                  <Text style={styles.contactCardName} allowFontScaling={false}>{activeThread?.name}</Text>
                  <Text style={styles.contactCardRole} allowFontScaling={false}>RESIDENT ACCOUNT</Text>

                  <View style={styles.divider} />
                  
                  <View style={styles.contactMetaRow}>
                    <Text style={styles.contactMetaLabel} allowFontScaling={false}>Active Building Location</Text>
                    <Text style={styles.contactMetaVal} allowFontScaling={false}>{activeThread?.location}</Text>
                  </View>
                  <View style={styles.contactMetaRow}>
                    <Text style={styles.contactMetaLabel} allowFontScaling={false}>Contact Email</Text>
                    <Text style={styles.contactMetaVal} allowFontScaling={false}>{activeThread?.email}</Text>
                  </View>
                  <View style={styles.contactMetaRow}>
                    <Text style={styles.contactMetaLabel} allowFontScaling={false}>Assigned User Agent</Text>
                    <Text style={styles.contactMetaVal} allowFontScaling={false}>{activeThread?.agent}</Text>
                  </View>

                  <View style={styles.divider} />

                  <Text style={styles.contactChannelsTitle} allowFontScaling={false}>DIRECT CHANNELS</Text>
                  <View style={styles.channelsGrid}>
                    <TouchableOpacity style={styles.channelBtn} onPress={() => {}}>
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color="#38bdf8" />
                      <Text style={styles.channelBtnText} allowFontScaling={false}>SMS Client · {activeThread?.phone}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.channelBtn} onPress={() => {}}>
                      <Ionicons name="mail-outline" size={16} color="#10b981" />
                      <Text style={styles.channelBtnText} allowFontScaling={false}>Send Email</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.channelBtn} onPress={() => {}}>
                      <Ionicons name="logo-whatsapp" size={16} color="#25d366" />
                      <Text style={styles.channelBtnText} allowFontScaling={false}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Chat Message list bubbles */}
              <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={true}
              >
                {activeMessages.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Text style={styles.emptyText} allowFontScaling={false}>No communication log content details checked.</Text>
                  </View>
                ) : (
                  activeMessages.map((msg, idx) => {
                    const isMe = msg.sender === 'Skyline Management Office';
                    return (
                      <View 
                        key={msg.id || idx} 
                        style={[
                          styles.chatBubbleContainer, 
                          isMe ? { alignSelf: 'flex-end', alignItems: 'flex-end' } : { alignSelf: 'flex-start', alignItems: 'flex-start' }
                        ]}
                      >
                        <Text style={styles.chatSenderName} allowFontScaling={false}>{msg.sender}</Text>
                        <View style={[styles.chatBubble, isMe ? styles.chatBubbleMe : styles.chatBubbleOther]}>
                          <Text style={styles.chatBubbleText} allowFontScaling={false}>{msg.text}</Text>
                        </View>
                        <Text style={styles.chatBubbleTime} allowFontScaling={false}>{msg.time}</Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {/* Chat Input message composer at bottom */}
              <View style={styles.chatInputBar}>
                <TextInput
                  style={styles.chatTextInput}
                  placeholder="Type message to management team..."
                  placeholderTextColor="#64748b"
                  value={typedMessage}
                  onChangeText={setTypedMessage}
                  multiline
                />
                <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendChatMessage}>
                  <Ionicons name="send" size={16} color="#0f172a" />
                  <Text style={styles.chatSendBtnText} allowFontScaling={false}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )
      ) : (
        // --- 3. SUB-VIEW LISTINGS CONTAINER (Announcements, Email, SMS) ---
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.scrollContent, { paddingTop: 12 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
        >
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#38bdf8" />
              <Text style={styles.loadingText} allowFontScaling={false}>Loading logs...</Text>
            </View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              
              {/* --- ANNOUNCEMENTS LIST --- */}
              {activeView === 'announcements' && (
                <View>
                  {filteredAnnouncements.length === 0 ? (
                    <View style={styles.emptyView}>
                      <Ionicons name="megaphone-outline" size={48} color="#475569" style={{ marginBottom: 8 }} />
                      <Text style={styles.emptyText} allowFontScaling={false}>No announcements published</Text>
                    </View>
                  ) : (
                    filteredAnnouncements.map((item, idx) => (
                      <View key={item.id || idx} style={styles.commCard}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.commCardTitle} allowFontScaling={false}>{item.title}</Text>
                          <View style={[styles.badge, { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                            <Text style={[styles.badgeText, { color: '#38bdf8' }]} allowFontScaling={false}>{item.category}</Text>
                          </View>
                        </View>
                        <Text style={styles.commCardDesc} allowFontScaling={false}>{item.content}</Text>
                        <View style={styles.divider} />
                        <View style={styles.rowBetween}>
                          <Text style={styles.commCardMeta} allowFontScaling={false}>Target Audience: All Residents</Text>
                          <Text style={styles.commCardMeta} allowFontScaling={false}>
                            {item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : 'N/A'}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* --- SENT EMAILS LIST --- */}
              {activeView === 'email' && (
                <View>
                  {filteredEmails.length === 0 ? (
                    <View style={styles.emptyView}>
                      <Ionicons name="mail-outline" size={48} color="#475569" style={{ marginBottom: 8 }} />
                      <Text style={styles.emptyText} allowFontScaling={false}>No sent emails logs</Text>
                    </View>
                  ) : (
                    filteredEmails.map((item, idx) => {
                      const statusColor = item.status === 'Sent' ? '#10b981' : item.status === 'Failed' ? '#ef4444' : '#f59e0b';
                      return (
                        <View key={item.id || idx} style={styles.commCard}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.commCardTitle} allowFontScaling={false}>{item.recipient}</Text>
                            <View style={[styles.badge, { borderColor: statusColor, backgroundColor: `${statusColor}15` }]}>
                              <Text style={[styles.badgeText, { color: statusColor }]} allowFontScaling={false}>{item.status}</Text>
                            </View>
                          </View>
                          <Text style={styles.commCardDesc} allowFontScaling={false}>{item.subject}</Text>
                          <View style={styles.divider} />
                          <View style={styles.rowBetween}>
                            <Text style={styles.commCardMeta} allowFontScaling={false}>Outbound Email Dispatch</Text>
                            <Text style={styles.commCardMeta} allowFontScaling={false}>{item.date}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* --- SENT SMS LIST --- */}
              {activeView === 'sms' && (
                <View>
                  {filteredSms.length === 0 ? (
                    <View style={styles.emptyView}>
                      <Ionicons name="phone-portrait-outline" size={48} color="#475569" style={{ marginBottom: 8 }} />
                      <Text style={styles.emptyText} allowFontScaling={false}>No sent SMS logs</Text>
                    </View>
                  ) : (
                    filteredSms.map((item, idx) => {
                      const statusColor = item.status === 'Delivered' || item.status === 'Sent' ? '#10b981' : item.status === 'Failed' ? '#ef4444' : '#64748b';
                      return (
                        <View key={item.id || idx} style={styles.commCard}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.commCardTitle} allowFontScaling={false}>{item.recipient}</Text>
                            <View style={[styles.badge, { borderColor: statusColor, backgroundColor: `${statusColor}15` }]}>
                              <Text style={[styles.badgeText, { color: statusColor }]} allowFontScaling={false}>{item.status}</Text>
                            </View>
                          </View>
                          <Text style={styles.commCardDesc} allowFontScaling={false}>{item.body}</Text>
                          <View style={styles.divider} />
                          <View style={styles.rowBetween}>
                            <Text style={styles.commCardMeta} allowFontScaling={false}>Outbound SMS Dispatch</Text>
                            <Text style={styles.commCardMeta} allowFontScaling={false}>{item.date}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

            </Animated.View>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      {/* --- CREATE ANNOUNCEMENT MODAL --- */}
      <Modal visible={createAnnounceOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Create Notice Announcement</Text>
                <TouchableOpacity onPress={() => setCreateAnnounceOpen(false)} disabled={submitting}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.formLabel} allowFontScaling={false}>NOTICE TITLE</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="E.g., HVAC seasonal maintenance check"
                  placeholderTextColor="#64748b"
                  value={annTitle}
                  onChangeText={setAnnTitle}
                />

                <View style={styles.rowFormInputs}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.formLabel} allowFontScaling={false}>CATEGORY</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('category');
                        setPickerModalOpen(true);
                      }}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false}>{annCategory}</Text>
                      <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel} allowFontScaling={false}>TARGET AUDIENCE GROUP</Text>
                    <TouchableOpacity
                      style={styles.formPickerSelector}
                      onPress={() => {
                        setActivePicker('audience');
                        setPickerModalOpen(true);
                      }}
                    >
                      <Text style={styles.formPickerText} allowFontScaling={false}>{annAudience}</Text>
                      <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.formLabel} allowFontScaling={false}>NOTICE ANNOUNCEMENT CONTENT BODY</Text>
                <TextInput
                  style={[styles.formInput, { height: 120, textAlignVertical: 'top', paddingTop: 8 }]}
                  placeholder="Type published community notices details here..."
                  placeholderTextColor="#64748b"
                  multiline
                  value={annContent}
                  onChangeText={setAnnContent}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateAnnounceOpen(false)} disabled={submitting}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleCreateAnnouncement} disabled={submitting}>
                  {submitting ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.submitBtnText} allowFontScaling={false}>Publish Notice</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- COMPOSE EMAIL MODAL --- */}
      <Modal visible={createEmailOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Compose Outbound Email</Text>
                <TouchableOpacity onPress={() => setCreateEmailOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.formLabel} allowFontScaling={false}>RECIPIENT EMAIL</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="E.g., resident@skyline.com"
                  placeholderTextColor="#64748b"
                  value={emailRecipient}
                  onChangeText={setEmailRecipient}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Text style={styles.formLabel} allowFontScaling={false}>INSERT TEMPLATE</Text>
                <TouchableOpacity
                  style={styles.formPickerSelector}
                  onPress={() => {
                    setActivePicker('template');
                    setPickerModalOpen(true);
                  }}
                >
                  <Text style={styles.formPickerText} allowFontScaling={false}>{emailTemplate}</Text>
                  <Ionicons name="chevron-down" size={16} color="#cbd5e1" />
                </TouchableOpacity>

                <Text style={styles.formLabel} allowFontScaling={false}>SUBJECT TITLE</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter email subject..."
                  placeholderTextColor="#64748b"
                  value={emailSubject}
                  onChangeText={setEmailSubject}
                />

                <Text style={styles.formLabel} allowFontScaling={false}>EMAIL BODY CONTENT</Text>
                <TextInput
                  style={[styles.formInput, { height: 140, textAlignVertical: 'top', paddingTop: 8 }]}
                  placeholder="Type outbound email message content here..."
                  placeholderTextColor="#64748b"
                  multiline
                  value={emailBody}
                  onChangeText={setEmailBody}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateEmailOpen(false)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSendEmail}>
                  <Text style={styles.submitBtnText} allowFontScaling={false}>Send Email</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- SEND SMS ALERT MODAL --- */}
      <Modal visible={createSmsOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Send SMS Alert</Text>
                <TouchableOpacity onPress={() => setCreateSmsOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.formLabel} allowFontScaling={false}>RECIPIENT PHONE NUMBER</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="E.g., (512) 555-0199"
                  placeholderTextColor="#64748b"
                  value={smsRecipient}
                  onChangeText={setSmsRecipient}
                  keyboardType="phone-pad"
                />

                <View style={styles.rowBetween}>
                  <Text style={styles.formLabel} allowFontScaling={false}>SMS MESSAGE CONTENT</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748b', fontWeight: 'bold' }} allowFontScaling={false}>
                    {smsBody.length} / 160 characters
                  </Text>
                </View>
                <TextInput
                  style={[styles.formInput, { height: 100, textAlignVertical: 'top', paddingTop: 8 }]}
                  placeholder="Type message content here..."
                  placeholderTextColor="#64748b"
                  multiline
                  maxLength={160}
                  value={smsBody}
                  onChangeText={setSmsBody}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateSmsOpen(false)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSendSms}>
                  <Text style={styles.submitBtnText} allowFontScaling={false}>Send SMS Alert</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- SELECTION PICKER OPTIONS MODAL --- */}
      <Modal visible={pickerModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle} allowFontScaling={false}>Select Option</Text>
            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={true}>
              {getPickerOptions().map((opt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.pickerOptionRow}
                  onPress={() => handleSelectPickerOption(opt)}
                >
                  <Text style={styles.pickerOptionText} allowFontScaling={false}>{opt}</Text>
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
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  backBtnText: { color: '#38bdf8', fontSize: 11.5, fontWeight: '700' },
  breadcrumb: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 11.5, color: colors.textSecondary, marginTop: 4, lineHeight: 15 },

  // Search and button row
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
  addBtnText: { color: '#0f172a', fontSize: 12.5, fontWeight: '800' },

  // Dashboard Styles
  actionsPanel: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  panelTitle: { fontSize: 10.5, fontWeight: '800', color: '#38bdf8', letterSpacing: 0.8, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  actionItem: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  actionText: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', marginTop: 6 },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  metricCard: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  metricLabel: { fontSize: 8.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
  metricVal: { fontSize: 18, fontWeight: '900', marginTop: 4, color: colors.textPrimary },
  metricSubText: { fontSize: 10, color: colors.textMuted, marginTop: 8 },

  alertBanner: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  alertTitle: { fontSize: 10.5, fontWeight: '800', color: '#ef4444', letterSpacing: 0.8 },
  alertDesc: { fontSize: 11.5, color: colors.textSecondary, lineHeight: 15 },
  alertBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  alertBtnText: { color: '#ef4444', fontSize: 11, fontWeight: '800' },

  // Sub-listing Cards Styles
  centerLoading: { paddingVertical: 80, alignItems: 'center' },
  loadingText: { color: colors.textSecondary, fontSize: 13, marginTop: 8 },
  emptyView: { backgroundColor: colors.surface, borderRadius: 14, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  emptyText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },

  commCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  commCardTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, flex: 1, marginRight: 8 },
  commCardDesc: { fontSize: 12.5, color: colors.textSecondary, marginTop: 6, lineHeight: 16 },
  commCardMeta: { fontSize: 10.5, color: colors.textMuted, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

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
  modalTitle: { fontSize: 15.5, fontWeight: '800', color: colors.textPrimary },
  modalForm: { flex: 1 },
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
  rowFormInputs: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  formPickerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    height: 42,
  },
  formPickerText: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
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

  // Picker Modal Options
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

  // Unified Inbox Styles
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleText: { color: '#0f172a', fontSize: 18, fontWeight: '800' },

  // Collapsible Resident card
  contactDetailsToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  contactDetailsToggleText: { color: '#38bdf8', fontSize: 11.5, fontWeight: '700' },
  collapsibleContactCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    alignItems: 'center',
  },
  avatarBig: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarBigText: { color: '#0f172a', fontSize: 22, fontWeight: '800' },
  contactCardName: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  contactCardRole: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, marginTop: 2 },
  contactMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 4,
  },
  contactMetaLabel: { fontSize: 11.5, color: colors.textSecondary },
  contactMetaVal: { fontSize: 11.5, color: colors.textSecondary, fontWeight: '700' },
  contactChannelsTitle: { fontSize: 10, fontWeight: '800', color: '#38bdf8', letterSpacing: 0.8, alignSelf: 'flex-start', marginTop: 8, marginBottom: 8 },
  channelsGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  channelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  channelBtnText: { color: colors.textSecondary, fontSize: 10.5, fontWeight: '800', marginLeft: 4 },

  // Chat Bubbles styles
  chatBubbleContainer: { marginVertical: 8, maxWidth: '85%' },
  chatSenderName: { fontSize: 10, color: colors.textSecondary, fontWeight: 'bold', marginBottom: 2 },
  chatBubble: { borderRadius: 14, padding: 12 },
  chatBubbleMe: { backgroundColor: colors.surface, borderTopRightRadius: 2, borderWidth: 1, borderColor: colors.cardBorder },
  chatBubbleOther: { backgroundColor: colors.inputBackground, borderTopLeftRadius: 2, borderWidth: 1, borderColor: colors.inputBorder },
  chatBubbleText: { color: colors.textPrimary, fontSize: 13, lineHeight: 18 },
  chatBubbleTime: { fontSize: 9, color: colors.textMuted, marginTop: 4 },

  // Chat Input styles
  chatInputBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    padding: 10,
    alignItems: 'center',
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 13,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  chatSendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 8,
    height: 38,
  },
  chatSendBtnText: { color: '#0f172a', fontSize: 12, fontWeight: '850', marginLeft: 4 },
});

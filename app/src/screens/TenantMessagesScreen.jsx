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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export const TenantMessagesScreen = ({ onNavigate, onBack }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  // All roles except Property Manager communicate directly with Property Manager
  const defaultManagerContact = 'Property Manager Office';

  const [activeContactName, setActiveContactName] = useState(null); // null means show conversation list
  const [activeView, setActiveView] = useState('inbox'); // 'inbox' | 'announcements'
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // New Chat Modal state
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [newChatBody, setNewChatBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const chatScrollRef = useRef(null);

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
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setAnnouncements(list);
    } catch (e) {
      console.log('Failed fetching tenant announcements:', e.message);
      setAnnouncements([]);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch Messages for current user
  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const isTenant = user?.role === 'Tenant';
      const isOwner = user?.role === 'Owner';
      const endpoint = isTenant ? '/portal/tenant/messages' : (isOwner ? '/portal/owner/messages' : '/messages');

      const [res, annRes] = await Promise.all([
        apiClient.get(endpoint, logout, refreshAccessToken).catch(() => null),
        apiClient.get('/announcements', logout, refreshAccessToken).catch(() => null),
      ]);

      const rawMsgs = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      const rawAnns = Array.isArray(annRes?.data) ? annRes.data : (Array.isArray(annRes) ? annRes : []);

      setMessages(rawMsgs);
      setAnnouncements(rawAnns);
    } catch (e) {
      console.log('Error fetching messages:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.role]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeView === 'announcements') {
      fetchAnnouncements(false);
    } else {
      fetchData(false);
    }
  };

  // Group messages - Non-managers always talk to Property Manager Office
  const threadMap = {};
  messages.forEach((m) => {
    const contact = defaultManagerContact;
    if (!threadMap[contact]) {
      threadMap[contact] = [];
    }
    threadMap[contact].push(m);
  });

  // Ensure default thread exists for tenant/owner/staff to talk to Manager
  if (!threadMap[defaultManagerContact]) {
    threadMap[defaultManagerContact] = [];
  }

  const conversationThreads = Object.keys(threadMap).map((contactName) => {
    const threadMsgs = threadMap[contactName].sort(
      (a, b) => new Date(a.createdAt || a.timestamp || 0) - new Date(b.createdAt || b.timestamp || 0)
    );
    const lastMsg = threadMsgs[threadMsgs.length - 1];

    return {
      contactName,
      lastMsgText: lastMsg?.body || lastMsg?.message || 'Tap to chat with your Property Manager',
      lastMsgTime: lastMsg?.createdAt ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
      badgeColor: '#f59e0b',
      roleText: 'Manager',
      messages: threadMsgs,
    };
  });

  // Filter threads by search
  const filteredThreads = conversationThreads.filter((t) =>
    t.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.lastMsgText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Send reply in active thread
  const handleSendReply = async () => {
    if (!inputText.trim()) return;
    const bodyText = inputText.trim();
    setInputText('');

    const optimisticMsg = {
      id: String(Date.now()),
      sender: user?.name || user?.email || 'You',
      recipient: defaultManagerContact,
      body: bodyText,
      createdAt: new Date().toISOString(),
      isOutbound: true,
      contactName: defaultManagerContact,
    };

    setMessages((prev) => [optimisticMsg, ...prev]);

    try {
      const isTenant = user?.role === 'Tenant';
      const isOwner = user?.role === 'Owner';
      const endpoint = isTenant ? '/portal/tenant/messages' : (isOwner ? '/portal/owner/messages' : '/messages');

      await apiClient.post(
        endpoint,
        {
          recipient: defaultManagerContact,
          body: bodyText,
          subject: '1-to-1 Chat',
        },
        logout,
        refreshAccessToken
      );
    } catch (e) {
      console.log('Post message fallback:', e.message);
    }
  };

  // Start new conversation from modal
  const handleStartNewChat = async () => {
    if (!newChatBody.trim()) {
      Alert.alert('Required', 'Please enter your message.');
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);
    const bodyText = newChatBody.trim();

    try {
      const isTenant = user?.role === 'Tenant';
      const isOwner = user?.role === 'Owner';
      const endpoint = isTenant ? '/portal/tenant/messages' : (isOwner ? '/portal/owner/messages' : '/messages');

      await apiClient.post(
        endpoint,
        {
          recipient: defaultManagerContact,
          body: bodyText,
          subject: 'General Inquiry',
        },
        logout,
        refreshAccessToken
      );

      const optimisticMsg = {
        id: String(Date.now()),
        sender: user?.name || user?.email || 'You',
        recipient: defaultManagerContact,
        body: bodyText,
        createdAt: new Date().toISOString(),
        isOutbound: true,
        contactName: defaultManagerContact,
      };
      setMessages((prev) => [optimisticMsg, ...prev]);

      setNewChatModalOpen(false);
      setNewChatBody('');
      setActiveContactName(defaultManagerContact);
    } catch (e) {
      const optimisticMsg = {
        id: String(Date.now()),
        sender: user?.name || user?.email || 'You',
        recipient: defaultManagerContact,
        body: bodyText,
        createdAt: new Date().toISOString(),
        isOutbound: true,
        contactName: defaultManagerContact,
      };
      setMessages((prev) => [optimisticMsg, ...prev]);
      setNewChatModalOpen(false);
      setNewChatBody('');
      setActiveContactName(defaultManagerContact);
    } finally {
      setSubmitting(false);
    }
  };

  const activeThreadMessages = activeContactName ? (threadMap[activeContactName] || []) : [];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background || '#090d16' }]}>
      {/* HEADER BAR */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (activeContactName !== null) {
                setActiveContactName(null);
              } else if (onBack) {
                onBack();
              } else if (onNavigate) {
                onNavigate('back');
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary || '#f8fafc'} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title} allowFontScaling={false}>
              {activeContactName !== null ? activeContactName : 'Messages'}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1} allowFontScaling={false}>
              {activeContactName !== null
                ? 'Direct 1-to-1 with Management Office'
                : 'Direct Communication with Property Manager'}
            </Text>
          </View>

          {activeContactName === null && (
            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() => {
                Keyboard.dismiss();
                setNewChatModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={16} color="#0f172a" style={{ marginRight: 4 }} />
              <Text style={styles.newChatBtnText} allowFontScaling={false}>New Chat</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search bar when in conversation list */}
        {activeContactName === null && (
          <View style={styles.searchBarRow}>
            <Ionicons name="search-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversation..."
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
        )}
        {/* SUB-NAV TABS: 1-to-1 Messages | Notices */}
        {activeContactName === null && (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeView === 'inbox' && styles.tabBtnActive]}
              onPress={() => setActiveView('inbox')}
            >
              <Ionicons
                name={activeView === 'inbox' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                size={14}
                color={activeView === 'inbox' ? '#38bdf8' : '#94a3b8'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabBtnText, activeView === 'inbox' && styles.tabBtnTextActive]}>1-to-1 Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeView === 'announcements' && styles.tabBtnActive]}
              onPress={() => {
                setActiveView('announcements');
                if (announcements.length === 0) fetchAnnouncements(true);
              }}
            >
              <Ionicons
                name={activeView === 'announcements' ? 'megaphone' : 'megaphone-outline'}
                size={14}
                color={activeView === 'announcements' ? '#38bdf8' : '#94a3b8'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabBtnText, activeView === 'announcements' && styles.tabBtnTextActive]}>Notices & Bulletins</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* CONTENT AREA */}
      {activeContactName === null ? (
        activeView === 'inbox' ? (
          // CONVERSATIONS LIST
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
          >
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {loading && !refreshing ? (
                <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
              ) : (
                filteredThreads.map((thread, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.threadCard}
                    onPress={() => setActiveContactName(thread.contactName)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.avatarCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <Ionicons name="business" size={22} color="#f59e0b" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.threadName} numberOfLines={1} allowFontScaling={false}>
                          {thread.contactName}
                        </Text>
                        <Text style={styles.threadTime} allowFontScaling={false}>
                          {thread.lastMsgTime}
                        </Text>
                      </View>
                      <View style={[styles.rowBetween, { marginTop: 4 }]}>
                        <Text style={styles.threadLastMsg} numberOfLines={1} allowFontScaling={false}>
                          {thread.lastMsgText}
                        </Text>
                        <View style={[styles.roleBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)' }]}>
                          <Text style={[styles.roleBadgeText, { color: '#f59e0b' }]} allowFontScaling={false}>
                            Management
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </Animated.View>
          </ScrollView>
        ) : (
          // ANNOUNCEMENTS / NOTICES LIST
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
          >
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {loading && !refreshing ? (
                <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
              ) : announcements.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="megaphone-outline" size={54} color="#475569" />
                  <Text style={styles.emptyTitle}>No Community Notices</Text>
                  <Text style={styles.emptySubtitle}>All upcoming elevator repairs, safety drills, or events will appear here.</Text>
                </View>
              ) : (
                announcements.map((ann) => (
                  <View key={ann.id} style={styles.noticeCard}>
                    <View style={styles.rowBetween}>
                      <View style={styles.noticeTag}>
                        <Text style={styles.noticeTagText}>{ann.category || 'General'}</Text>
                      </View>
                      <Text style={styles.noticeDate}>
                        {ann.createdAt ? new Date(ann.createdAt).toISOString().split('T')[0] : 'Recent'}
                      </Text>
                    </View>
                    <Text style={styles.noticeTitle}>{ann.title || 'Notice'}</Text>
                    <Text style={styles.noticeContent}>{ann.content || ann.body || ''}</Text>
                  </View>
                ))
              )}
            </Animated.View>
          </ScrollView>
        )
      ) : (
        // ACTIVE 1-TO-1 CHAT ROOM WITH PROPERTY MANAGER
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 24}
        >
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatScrollContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
          >
            {activeThreadMessages.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color="#475569" />
                <Text style={styles.emptyTitle}>Chat with Property Manager</Text>
                <Text style={styles.emptySubtitle}>Send a private message below. Your Property Manager will respond directly.</Text>
              </View>
            ) : (
              activeThreadMessages.map((m) => {
                const isMe = m.sender === 'user' || m.sender === user?.email || m.isOutbound;
                const bodyText = m.body || m.text || m.message || '';
                return (
                  <View
                    key={m.id || String(Math.random())}
                    style={[
                      styles.chatBubbleWrapper,
                      isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' },
                    ]}
                  >
                    <View
                      style={[
                        styles.chatBubble,
                        isMe ? styles.chatBubbleOutbound : styles.chatBubbleInbound,
                      ]}
                    >
                      <Text style={[styles.chatBubbleText, isMe ? styles.chatTextOutbound : styles.chatTextInbound]}>
                        {bodyText}
                      </Text>
                    </View>
                    <Text style={styles.chatTimeText}>
                      {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (m.time || 'Now')}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* CHAT INPUT BAR */}
          <View style={styles.chatInputBar}>
            <TextInput
              style={styles.chatTextInput}
              placeholder="Type message to Property Manager..."
              placeholderTextColor="#64748b"
              value={inputText}
              onChangeText={setInputText}
              multiline={true}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
              onPress={handleSendReply}
              disabled={!inputText.trim()}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={16} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* NEW CHAT MODAL WITH DISMISSIBLE KEYBOARD AVOIDING VIEW */}
      <Modal visible={newChatModalOpen} animationType="slide" transparent={true} onRequestClose={() => setNewChatModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalSheet}>
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalTitle}>Message Property Manager</Text>
                      <Text style={styles.modalSubTitle}>Direct communication with management office</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Keyboard.dismiss();
                        setNewChatModalOpen(false);
                      }}
                      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                      style={styles.modalCloseBtn}
                    >
                      <Ionicons name="close" size={24} color={colors.textPrimary || '#f8fafc'} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Text style={styles.fieldLabel}>Recipient:</Text>
                    <View style={styles.lockedContactCard}>
                      <View style={[styles.avatarCircle, { backgroundColor: 'rgba(245, 158, 11, 0.2)', width: 34, height: 34, borderRadius: 17 }]}>
                        <Ionicons name="business" size={18} color="#f59e0b" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.lockedContactTitle}>Property Manager Office</Text>
                        <Text style={styles.lockedContactSub}>Official Management Desk</Text>
                      </View>
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    </View>

                    <View style={[styles.rowBetween, { marginTop: 14 }]}>
                      <Text style={styles.fieldLabel}>Your Message:</Text>
                      <TouchableOpacity onPress={Keyboard.dismiss}>
                        <Text style={styles.hideKeyboardLink}>Hide Keyboard ✕</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.modalTextArea}
                      placeholder="Type your message for the Property Manager here..."
                      placeholderTextColor="#64748b"
                      value={newChatBody}
                      onChangeText={setNewChatBody}
                      multiline={true}
                    />

                    <TouchableOpacity
                      style={[styles.primaryActionBtn, (!newChatBody.trim() || submitting) && { opacity: 0.5 }]}
                      onPress={handleStartNewChat}
                      disabled={!newChatBody.trim() || submitting}
                      activeOpacity={0.8}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#0f172a" size="small" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="paper-plane" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                          <Text style={styles.primaryActionBtnText}>Send to Property Manager</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? 56 : 24,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#1e293b' : '#e2e8f0',
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary || '#f8fafc',
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary || '#94a3b8',
      marginTop: 2,
    },
    newChatBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#38bdf8',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
    },
    newChatBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#0f172a',
    },
    searchBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginTop: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: colors.textPrimary || '#f8fafc',
      paddingVertical: 2,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    threadCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    avatarCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    threadName: {
      fontSize: 14.5,
      fontWeight: '700',
      color: colors.textPrimary || '#f8fafc',
      flex: 1,
    },
    threadTime: {
      fontSize: 11,
      color: '#64748b',
      marginLeft: 8,
    },
    threadLastMsg: {
      fontSize: 12.5,
      color: colors.textSecondary || '#94a3b8',
      flex: 1,
      marginRight: 8,
    },
    roleBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
    },
    roleBadgeText: {
      fontSize: 10,
      fontWeight: '700',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary || '#f8fafc',
      marginTop: 14,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textSecondary || '#94a3b8',
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 18,
    },
    chatScroll: {
      flex: 1,
    },
    chatScrollContent: {
      padding: 16,
      paddingBottom: 20,
    },
    chatBubbleWrapper: {
      marginBottom: 12,
    },
    chatBubble: {
      maxWidth: '80%',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
    },
    chatBubbleOutbound: {
      backgroundColor: '#38bdf8',
      borderBottomRightRadius: 2,
    },
    chatBubbleInbound: {
      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      borderBottomLeftRadius: 2,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    chatBubbleText: {
      fontSize: 13.5,
      lineHeight: 19,
    },
    chatTextOutbound: {
      color: '#0f172a',
      fontWeight: '600',
    },
    chatTextInbound: {
      color: colors.textPrimary || '#f8fafc',
    },
    chatTimeText: {
      fontSize: 10,
      color: '#64748b',
      marginTop: 4,
      marginHorizontal: 4,
    },
    chatInputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#1e293b' : '#e2e8f0',
      gap: 8,
    },
    chatTextInput: {
      flex: 1,
      maxHeight: 90,
      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 13.5,
      color: colors.textPrimary || '#f8fafc',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#38bdf8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#1e293b' : '#e2e8f0',
      paddingBottom: 10,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary || '#f8fafc',
    },
    modalSubTitle: {
      fontSize: 12,
      color: colors.textSecondary || '#94a3b8',
      marginTop: 2,
    },
    modalCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary || '#94a3b8',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    lockedContactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    lockedContactTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary || '#f8fafc',
    },
    lockedContactSub: {
      fontSize: 11.5,
      color: colors.textSecondary || '#94a3b8',
      marginTop: 2,
    },
    hideKeyboardLink: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#38bdf8',
    },
    modalTextArea: {
      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 13.5,
      color: colors.textPrimary || '#f8fafc',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#cbd5e1',
      height: 110,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    primaryActionBtn: {
      backgroundColor: '#38bdf8',
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    primaryActionBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#0f172a',
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0',
      borderRadius: 12,
      padding: 4,
      marginTop: 10,
    },
    tabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 9,
    },
    tabBtnActive: {
      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
    },
    tabBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary || '#94a3b8',
    },
    tabBtnTextActive: {
      color: '#38bdf8',
    },
    noticeCard: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    noticeTag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
    },
    noticeTagText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#38bdf8',
    },
    noticeDate: {
      fontSize: 11,
      color: '#94a3b8',
      fontWeight: '600',
    },
    noticeTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary || '#f8fafc',
      marginTop: 8,
      marginBottom: 4,
    },
    noticeContent: {
      fontSize: 13,
      color: colors.textSecondary || '#94a3b8',
      lineHeight: 18,
    },
  });

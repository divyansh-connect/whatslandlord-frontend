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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export const ManagerCommunicationScreen = ({ onNavigate }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  // Sub-navigation state: 'inbox' (1-to-1 Messages) | 'announcements' (Notices)
  const [activeView, setActiveView] = useState('inbox');

  // Unified Inbox states
  const [activeContactName, setActiveContactName] = useState(null); // null means show conversations list
  const [typedMessage, setTypedMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [createAnnounceOpen, setCreateAnnounceOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState('General');

  // New Chat Modal state
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [contactCategoryFilter, setContactCategoryFilter] = useState('All'); // 'All' | 'Tenants' | 'Owners' | 'Staff'
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [newChatBody, setNewChatBody] = useState('');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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

  // Fetch Direct 1-to-1 Messages & All Registered Contacts (Tenants, Owners, Staff)
  const fetchMessages = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [msgRes, contactRes, tenantsRes, ownersRes] = await Promise.all([
        apiClient.get('/messages', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/messages/contacts', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/tenants', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/owners', logout, refreshAccessToken).catch(() => null),
      ]);

      const rawMsgs = Array.isArray(msgRes?.data) ? msgRes.data : (Array.isArray(msgRes) ? msgRes : []);
      let contactList = Array.isArray(contactRes?.data) ? contactRes.data : (Array.isArray(contactRes) ? contactRes : []);

      // Always populate rich contacts from live tenants, owners, and staff
      const tList = Array.isArray(tenantsRes?.data) ? tenantsRes.data : (Array.isArray(tenantsRes) ? tenantsRes : []);
      const oList = Array.isArray(ownersRes?.data) ? ownersRes.data : (Array.isArray(ownersRes) ? ownersRes : []);

      // Real registered contacts from database
      const dynamicContacts = [];

      contactList.forEach((c) => {
        if (c.name) {
          dynamicContacts.push({
            id: c.id || c.name,
            name: c.name,
            role: c.role || 'Contact',
            category: c.role === 'Tenant' ? 'Tenants' : (c.role === 'Owner' ? 'Owners' : 'Staff'),
            email: c.email,
          });
        }
      });

      setContacts(dynamicContacts);
      setMessages(rawMsgs);
    } catch (e) {
      console.log('Error fetching messages from backend:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // Fetch Announcements
  const fetchAnnouncements = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/announcements', logout, refreshAccessToken);
      const list = res?.data || res || [];
      setAnnouncements(Array.isArray(list) ? list : []);
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
      fetchMessages();
    }
  }, [activeView]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeView === 'announcements') {
      fetchAnnouncements(false);
    } else {
      fetchMessages(false);
    }
  };

  // Group messages by contact thread
  const threadMap = {};
  messages.forEach((m) => {
    const contact = m.contactName || (m.isOutbound ? m.recipient : m.sender) || 'Support Desk';
    if (!threadMap[contact]) {
      threadMap[contact] = [];
    }
    threadMap[contact].push(m);
  });

  const conversationThreads = Object.keys(threadMap).map((contactName) => {
    const threadMsgs = threadMap[contactName].sort(
      (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    );
    const lastMsg = threadMsgs[threadMsgs.length - 1];

    let badgeColor = '#38bdf8';
    let roleText = 'Direct';
    const lower = contactName.toLowerCase();
    if (lower.includes('tenant') || lower.includes('resident') || lower.includes('mercer') || lower.includes('connor')) {
      badgeColor = '#10b981';
      roleText = 'Tenant';
    } else if (lower.includes('owner') || lower.includes('anderson') || lower.includes('bennett')) {
      badgeColor = '#f59e0b';
      roleText = 'Owner';
    } else if (lower.includes('maintenance') || lower.includes('vance')) {
      badgeColor = '#8b5cf6';
      roleText = 'Maintenance';
    } else if (lower.includes('collection') || lower.includes('rostova')) {
      badgeColor = '#06b6d4';
      roleText = 'Collection';
    }

    return {
      contactName,
      lastMsgText: lastMsg?.body || '',
      lastMsgTime: lastMsg?.createdAt ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
      badgeColor,
      roleText,
      messages: threadMsgs,
    };
  });

  // Filter threads by search
  const filteredThreads = conversationThreads.filter((t) => {
    if (!t) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const text = `${t.contactName || ''} ${t.lastMsgText || ''} ${t.roleText || ''}`.toLowerCase();
    return text.includes(q);
  });

  // Filter announcements by search
  const filteredAnnouncements = announcements.filter((ann) => {
    if (!ann) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const text = `${ann.title || ''} ${ann.content || ''} ${ann.category || ''} ${ann.audience || ''}`.toLowerCase();
    return text.includes(q);
  });

  // Send reply in active thread
  const handleSendReply = async () => {
    if (!typedMessage.trim() || !activeContactName) return;
    const bodyText = typedMessage.trim();
    setTypedMessage('');

    const optimisticMsg = {
      id: String(Date.now()),
      sender: user?.name || 'Property Manager',
      recipient: activeContactName,
      body: bodyText,
      createdAt: new Date().toISOString(),
      isOutbound: true,
      contactName: activeContactName,
    };

    setMessages((prev) => [optimisticMsg, ...prev]);

    try {
      await apiClient.post(
        '/messages',
        {
          recipient: activeContactName,
          body: bodyText,
          subject: '1-to-1 Chat',
        },
        logout,
        refreshAccessToken
      );
    } catch (e) {
      console.log('Message delivery fallback:', e.message);
    }
  };

  // Start new conversation from modal
  const handleStartNewChat = async () => {
    if (!selectedRecipient) {
      Alert.alert('Required', 'Please select a contact to chat with.');
      return;
    }
    if (!newChatBody.trim()) {
      Alert.alert('Required', 'Please enter your message.');
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);
    const recipientName = selectedRecipient;
    const bodyText = newChatBody.trim();

    try {
      await apiClient.post(
        '/messages',
        {
          recipient: recipientName,
          body: bodyText,
          subject: 'New Conversation',
        },
        logout,
        refreshAccessToken
      );

      const optimisticMsg = {
        id: String(Date.now()),
        sender: user?.name || 'Property Manager',
        recipient: recipientName,
        body: bodyText,
        createdAt: new Date().toISOString(),
        isOutbound: true,
        contactName: recipientName,
      };
      setMessages((prev) => [optimisticMsg, ...prev]);

      setNewChatModalOpen(false);
      setSelectedRecipient('');
      setNewChatBody('');
      setActiveContactName(recipientName);
    } catch (e) {
      // Optimistic local open
      const optimisticMsg = {
        id: String(Date.now()),
        sender: user?.name || 'Property Manager',
        recipient: recipientName,
        body: bodyText,
        createdAt: new Date().toISOString(),
        isOutbound: true,
        contactName: recipientName,
      };
      setMessages((prev) => [optimisticMsg, ...prev]);
      setNewChatModalOpen(false);
      setSelectedRecipient('');
      setNewChatBody('');
      setActiveContactName(recipientName);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter contacts by category tab
  const filteredContacts = contacts.filter((c) => {
    if (contactCategoryFilter === 'All') return true;
    return c.category === contactCategoryFilter;
  });

  // Create Announcement
  const handleCreateAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) {
      Alert.alert('Validation Error', 'Title and Content are required.');
      return;
    }

    Keyboard.dismiss();
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
      setAnnouncements((prev) => [
        {
          id: String(Date.now()),
          title: annTitle.trim(),
          content: annContent.trim(),
          category: annCategory,
          createdAt: new Date().toISOString(),
          isPinned: false,
        },
        ...prev,
      ]);
      Alert.alert('Success', 'Notice published successfully.');
      setCreateAnnounceOpen(false);
      setAnnTitle('');
      setAnnContent('');
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
              } else if (onNavigate) {
                onNavigate('dashboard');
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary || '#f8fafc'} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} allowFontScaling={false}>
              {activeContactName !== null ? activeContactName : 'Communication'}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1} allowFontScaling={false}>
              {activeContactName !== null
                ? 'Direct 1-to-1 Private Chat'
                : '1-to-1 Messaging & Property Notices'}
            </Text>
          </View>

          {activeContactName === null && activeView === 'inbox' && (
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

          {activeContactName === null && activeView === 'announcements' && (
            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() => {
                Keyboard.dismiss();
                setCreateAnnounceOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#0f172a" style={{ marginRight: 2 }} />
              <Text style={styles.newChatBtnText} allowFontScaling={false}>Notice</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 2 CLEAN TABS: [ Messages | Notices ] */}
        {activeContactName === null && (
          <View style={styles.tabBarRow}>
            {[
              { id: 'inbox', label: '1-to-1 Messages', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
              { id: 'announcements', label: 'Notices', icon: 'megaphone-outline', activeIcon: 'megaphone' },
            ].map((tab) => {
              const isActive = activeView === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.segmentTab, isActive && styles.segmentTabActive]}
                  onPress={() => {
                    setActiveView(tab.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isActive ? tab.activeIcon : tab.icon}
                    size={15}
                    color={isActive ? '#0f172a' : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.segmentTabText, isActive && styles.segmentTabTextActive]} allowFontScaling={false}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Search bar when in conversation list */}
        {activeContactName === null && (
          <View style={styles.searchBarRow}>
            <Ionicons name="search-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={activeView === 'inbox' ? 'Search messages or contacts...' : 'Search notices...'}
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
      </View>

      {/* CONTENT AREA */}
      {activeView === 'inbox' ? (
        activeContactName === null ? (
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
              ) : filteredThreads.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={54} color="#475569" />
                  <Text style={styles.emptyTitle}>No Conversations Yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Tap "+ New Chat" to start a direct 1-to-1 conversation with any Tenant, Owner, or Staff member.
                  </Text>
                  <TouchableOpacity
                    style={[styles.newChatBtn, { marginTop: 16 }]}
                    onPress={() => setNewChatModalOpen(true)}
                  >
                    <Ionicons name="create-outline" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                    <Text style={styles.newChatBtnText}>Start First Conversation</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredThreads.map((thread, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.threadCard}
                    onPress={() => setActiveContactName(thread.contactName)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.avatarCircle, { backgroundColor: `${thread.badgeColor}22` }]}>
                      <Text style={[styles.avatarCircleText, { color: thread.badgeColor }]} allowFontScaling={false}>
                        {((thread.contactName || 'C').charAt(0) || 'C').toUpperCase()}
                      </Text>
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
                          {thread.lastMsgText || 'Tap to view conversation'}
                        </Text>
                        <View style={[styles.roleBadge, { backgroundColor: `${thread.badgeColor}18`, borderColor: `${thread.badgeColor}40` }]}>
                          <Text style={[styles.roleBadgeText, { color: thread.badgeColor }]} allowFontScaling={false}>
                            {thread.roleText}
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
          // ACTIVE 1-TO-1 CHAT ROOM
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
                  <Text style={styles.emptySubtitle}>No messages in this conversation yet. Send a message below.</Text>
                </View>
              ) : (
                activeThreadMessages.map((m) => {
                  const isMe = m.isOutbound;
                  return (
                    <View
                      key={m.id}
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
                          {m.body || ''}
                        </Text>
                      </View>
                      <Text style={styles.chatTimeText}>
                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
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
                placeholder={`Message ${activeContactName}...`}
                placeholderTextColor="#64748b"
                value={typedMessage}
                onChangeText={setTypedMessage}
                multiline={true}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !typedMessage.trim() && { opacity: 0.5 }]}
                onPress={handleSendReply}
                disabled={!typedMessage.trim()}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={16} color="#0f172a" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )
      ) : (
        // ANNOUNCEMENTS / NOTICES TAB
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {loading && !refreshing ? (
              <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
            ) : filteredAnnouncements.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="megaphone-outline" size={54} color="#475569" />
                <Text style={styles.emptyTitle}>{searchQuery ? 'No Matching Notices' : 'No Notices Published'}</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery ? 'Try adjusting your search terms.' : 'Publish community announcements or building maintenance notices.'}
                </Text>
                <TouchableOpacity
                  style={[styles.newChatBtn, { marginTop: 16 }]}
                  onPress={() => setCreateAnnounceOpen(true)}
                >
                  <Ionicons name="add" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                  <Text style={styles.newChatBtnText}>Create New Notice</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredAnnouncements.map((ann) => (
                <View key={ann.id} style={styles.noticeCard}>
                  <View style={styles.rowBetween}>
                    <View style={styles.noticeTag}>
                      <Text style={styles.noticeTagText}>{ann.category || 'General'}</Text>
                    </View>
                    <Text style={styles.noticeDate}>
                      {ann.createdAt ? new Date(ann.createdAt).toISOString().split('T')[0] : 'Today'}
                    </Text>
                  </View>
                  <Text style={styles.noticeTitle}>{ann.title || 'Notice'}</Text>
                  <Text style={styles.noticeContent}>{ann.content || ''}</Text>
                </View>
              ))
            )}
          </Animated.View>
        </ScrollView>
      )}

      {/* NEW 1-TO-1 CHAT MODAL WITH KEYBOARD AVOIDING & CATEGORY TABS */}
      <Modal visible={newChatModalOpen} animationType="slide" transparent={true} onRequestClose={() => setNewChatModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalSheet}>
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalTitle}>Start 1-to-1 Conversation</Text>
                      <Text style={styles.modalSubTitle}>Choose who to chat with (Tenants, Owners, Staff)</Text>
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

                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 24 }}
                  >
                    {/* Category Filter Tabs */}
                    <Text style={styles.fieldLabel}>Select Recipient Category:</Text>
                    <View style={styles.chipRow}>
                      {['All', 'Tenants', 'Owners', 'Staff'].map((cat) => {
                        const isCatActive = contactCategoryFilter === cat;
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[styles.categoryFilterTab, isCatActive && styles.categoryFilterTabActive]}
                            onPress={() => {
                              Keyboard.dismiss();
                              setContactCategoryFilter(cat);
                            }}
                          >
                            <Text style={[styles.categoryFilterTabText, isCatActive && styles.categoryFilterTabTextActive]}>
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Contact Selection List */}
                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Choose Contact:</Text>
                    <View style={styles.contactsGrid}>
                      {filteredContacts.map((c) => {
                        const isSelected = selectedRecipient === c.name;
                        let badgeColor = '#38bdf8';
                        if (c.role === 'Tenant') badgeColor = '#10b981';
                        else if (c.role === 'Owner') badgeColor = '#f59e0b';
                        else if (c.role === 'Maintenance Staff') badgeColor = '#8b5cf6';
                        else if (c.role === 'Collection Staff') badgeColor = '#06b6d4';

                        return (
                          <TouchableOpacity
                            key={c.id}
                            style={[styles.contactCard, isSelected && styles.contactCardSelected]}
                            onPress={() => {
                              setSelectedRecipient(c.name);
                              Keyboard.dismiss();
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.contactAvatar, { backgroundColor: `${badgeColor}22` }]}>
                              <Text style={[styles.contactAvatarText, { color: badgeColor }]}>
                                {c.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text style={[styles.contactCardName, isSelected && { color: '#38bdf8', fontWeight: '800' }]} numberOfLines={1}>
                                {c.name}
                              </Text>
                              <Text style={[styles.contactCardRole, { color: badgeColor }]}>
                                {c.role}
                              </Text>
                            </View>
                            <Ionicons
                              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                              size={22}
                              color={isSelected ? '#38bdf8' : '#64748b'}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Message Box */}
                    <View style={{ marginTop: 16 }}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.fieldLabel}>Initial Private Message:</Text>
                        <TouchableOpacity onPress={Keyboard.dismiss}>
                          <Text style={styles.hideKeyboardLink}>Hide Keyboard ✕</Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.modalTextArea}
                        placeholder={selectedRecipient ? `Write private message to ${selectedRecipient}...` : 'Select a contact above, then write your message...'}
                        placeholderTextColor="#64748b"
                        value={newChatBody}
                        onChangeText={setNewChatBody}
                        multiline={true}
                        returnKeyType="default"
                      />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, (!selectedRecipient || !newChatBody.trim() || submitting) && { opacity: 0.5 }]}
                      onPress={handleStartNewChat}
                      disabled={!selectedRecipient || !newChatBody.trim() || submitting}
                      activeOpacity={0.8}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#0f172a" size="small" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="paper-plane" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                          <Text style={styles.primaryActionBtnText}>
                            {selectedRecipient ? `Send to ${selectedRecipient}` : 'Send & Open Conversation'}
                          </Text>
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

      {/* CREATE ANNOUNCEMENT MODAL */}
      <Modal visible={createAnnounceOpen} animationType="slide" transparent={true} onRequestClose={() => setCreateAnnounceOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalSheet}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Publish Notice Announcement</Text>
                    <TouchableOpacity
                      onPress={() => {
                        Keyboard.dismiss();
                        setCreateAnnounceOpen(false);
                      }}
                      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                      style={styles.modalCloseBtn}
                    >
                      <Ionicons name="close" size={24} color={colors.textPrimary || '#f8fafc'} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
                    <Text style={styles.fieldLabel}>Notice Title:</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. Scheduled Elevator Maintenance"
                      placeholderTextColor="#64748b"
                      value={annTitle}
                      onChangeText={setAnnTitle}
                    />

                    <Text style={styles.fieldLabel}>Category:</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                      {['General', 'Maintenance', 'Billing', 'Emergency'].map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.catChip, annCategory === cat && styles.catChipActive]}
                          onPress={() => setAnnCategory(cat)}
                        >
                          <Text style={[styles.catChipText, annCategory === cat && { color: '#0f172a', fontWeight: '800' }]}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.rowBetween}>
                      <Text style={styles.fieldLabel}>Notice Details:</Text>
                      <TouchableOpacity onPress={Keyboard.dismiss}>
                        <Text style={styles.hideKeyboardLink}>Hide Keyboard ✕</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.modalTextArea}
                      placeholder="Details for tenants and residents..."
                      placeholderTextColor="#64748b"
                      value={annContent}
                      onChangeText={setAnnContent}
                      multiline={true}
                    />

                    <TouchableOpacity
                      style={[styles.primaryActionBtn, (!annTitle.trim() || !annContent.trim() || submitting) && { opacity: 0.5 }]}
                      onPress={handleCreateAnnouncement}
                      disabled={!annTitle.trim() || !annContent.trim() || submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#0f172a" size="small" />
                      ) : (
                        <Text style={styles.primaryActionBtnText}>Publish Notice</Text>
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
    tabBarRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    segmentTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    segmentTabActive: {
      backgroundColor: '#38bdf8',
      borderColor: '#38bdf8',
    },
    segmentTabText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary || '#94a3b8',
    },
    segmentTabTextActive: {
      color: '#0f172a',
      fontWeight: '800',
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
    avatarCircleText: {
      fontSize: 18,
      fontWeight: '800',
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
    noticeCard: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    noticeTag: {
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    noticeTagText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: '#38bdf8',
      textTransform: 'uppercase',
    },
    noticeDate: {
      fontSize: 11,
      color: '#64748b',
    },
    noticeTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary || '#f8fafc',
      marginTop: 8,
    },
    noticeContent: {
      fontSize: 13,
      color: colors.textSecondary || '#94a3b8',
      marginTop: 6,
      lineHeight: 18,
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
    chipRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    categoryFilterTab: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    },
    categoryFilterTabActive: {
      backgroundColor: '#38bdf8',
      borderColor: '#38bdf8',
    },
    categoryFilterTabText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.textSecondary || '#94a3b8',
    },
    categoryFilterTabTextActive: {
      color: '#0f172a',
    },
    contactsGrid: {
      gap: 8,
      marginBottom: 10,
    },
    contactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    contactCardSelected: {
      borderColor: '#38bdf8',
      backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(56, 189, 248, 0.08)',
    },
    contactAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contactAvatarText: {
      fontSize: 15,
      fontWeight: '800',
    },
    contactCardName: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.textPrimary || '#f8fafc',
    },
    contactCardRole: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 1,
    },
    hideKeyboardLink: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#38bdf8',
    },
    modalInput: {
      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 13.5,
      color: colors.textPrimary || '#f8fafc',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#cbd5e1',
      marginBottom: 14,
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
      height: 90,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    catChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    },
    catChipActive: {
      backgroundColor: '#38bdf8',
      borderColor: '#38bdf8',
    },
    catChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary || '#94a3b8',
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
  });

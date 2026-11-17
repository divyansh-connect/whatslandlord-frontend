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

export const ManagerCommunicationScreen = ({ onNavigate, onBack }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  // Sub-navigation state: 'inbox' (1-to-1 Messages) | 'announcements' (Notices)
  const [activeView, setActiveView] = useState('inbox');

  // Unified Chat states
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null); // null = conversation list
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'TENANT' | 'OWNER' (Staff hidden)
  const [typedMessage, setTypedMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [createAnnounceOpen, setCreateAnnounceOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState('General');

  // New Chat Modal state
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [modalCategoryFilter, setModalCategoryFilter] = useState('All'); // 'All' | 'Tenants' | 'Owners' (Staff hidden)
  const [modalSearch, setModalSearch] = useState('');
  const [initiatingChat, setInitiatingChat] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Animations & refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const chatScrollRef = useRef(null);
  const pollTimerRef = useRef(null);

  const runEntryAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // 1. Fetch Conversations from Live Chat Backend
  const fetchConversations = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/chat/conversations', logout, refreshAccessToken);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setConversations(list);
    } catch (e) {
      console.log('Error fetching chat conversations:', e?.message || e);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // 2. Fetch Messages for Active Conversation
  const fetchMessages = async (convId, showLoading = false) => {
    if (!convId) return;
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get(`/chat/conversations/${convId}/messages`, logout, refreshAccessToken);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);

      setMessages((prev) => {
        const pending = prev.filter((m) => m.id && String(m.id).startsWith('temp-'));
        const backendIds = new Set(list.map((m) => String(m.id)));
        const stillPending = pending.filter((m) => !backendIds.has(String(m.id)));
        return [...list, ...stillPending];
      });

      // Mark as read in background
      apiClient.post(`/chat/conversations/${convId}/read`, {}, logout, refreshAccessToken).catch(() => {});
    } catch (e) {
      console.log('Error fetching messages for conversation:', e?.message || e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // 3. Fetch Contacts Directory (Tenants & Owners only, Staff hidden)
  const fetchContacts = async () => {
    try {
      const res = await apiClient.get('/chat/contacts', logout, refreshAccessToken);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      // Filter out STAFF completely
      const filtered = list.filter(
        (c) =>
          c.participantType !== 'STAFF' &&
          c.role !== 'Staff' &&
          c.role !== 'Maintenance Staff' &&
          c.role !== 'Collection Staff'
      );
      setContacts(filtered);
    } catch (e) {
      console.log('Error fetching contacts:', e?.message || e);
      setContacts([]);
    }
  };

  // 4. Fetch Announcements / Notices
  const fetchAnnouncements = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/announcements', logout, refreshAccessToken);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setAnnouncements(list);
    } catch (e) {
      console.log('Failed fetching announcements:', e?.message || e);
      setAnnouncements([]);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  // Navigation / View changes
  useEffect(() => {
    if (activeView === 'announcements') {
      fetchAnnouncements();
    } else {
      fetchConversations(true);
    }
  }, [activeView]);

  // Polling: Active conversation gets 3s poll, conversation list gets 6s poll
  useEffect(() => {
    if (activeView === 'inbox') {
      if (activeConversation?.id) {
        pollTimerRef.current = setInterval(() => {
          fetchMessages(activeConversation.id, false);
        }, 3000);
      } else {
        pollTimerRef.current = setInterval(() => {
          fetchConversations(false);
        }, 6000);
      }
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [activeView, activeConversation?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeView === 'announcements') {
      fetchAnnouncements(false);
    } else if (activeConversation?.id) {
      fetchMessages(activeConversation.id, true);
      setRefreshing(false);
    } else {
      fetchConversations(false);
    }
  };

  // Filter Conversations: Staff is COMPLETELY HIDDEN per user request
  const filteredConversations = conversations.filter((c) => {
    if (c.participantType === 'STAFF') return false;

    // Role filter
    if (roleFilter === 'TENANT' && c.participantType !== 'TENANT') return false;
    if (roleFilter === 'OWNER' && c.participantType !== 'OWNER') return false;

    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchName = (c.participantName || '').toLowerCase().includes(q);
    const matchSub = (c.subtitle || '').toLowerCase().includes(q);
    const matchMsg = (c.lastMessage || '').toLowerCase().includes(q);
    return matchName || matchSub || matchMsg;
  });

  // Filter Contacts in New Chat Modal: Staff is COMPLETELY HIDDEN
  const filteredContacts = contacts.filter((c) => {
    if (c.participantType === 'STAFF' || c.role === 'Staff') return false;

    // Category filter
    if (modalCategoryFilter === 'Tenants' && c.participantType !== 'TENANT' && c.role !== 'Tenant') return false;
    if (modalCategoryFilter === 'Owners' && c.participantType !== 'OWNER' && c.role !== 'Owner') return false;

    // Search query
    const q = modalSearch.toLowerCase().trim();
    if (!q) return true;
    const matchName = (c.name || '').toLowerCase().includes(q);
    const matchSub = (c.subtitle || '').toLowerCase().includes(q);
    const matchPhone = (c.phone || '').toLowerCase().includes(q);
    return matchName || matchSub || matchPhone;
  });

  // Open Chat with Conversation
  const handleOpenConversation = (conv) => {
    setActiveConversation(conv);
    setMessages([]);
    fetchMessages(conv.id, true);
  };

  // Send Message in Active Conversation
  const handleSendMessage = async () => {
    if (!typedMessage.trim() || !activeConversation?.id || sendingMessage) return;
    const text = typedMessage.trim();
    setTypedMessage('');
    setSendingMessage(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      conversationId: activeConversation.id,
      body: text,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      isMine: true,
      senderName: user?.name || 'Property Manager',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await apiClient.post(
        `/chat/conversations/${activeConversation.id}/messages`,
        { body: text },
        logout,
        refreshAccessToken
      );
      const savedMsg = res?.data || res;

      if (savedMsg?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...savedMsg, isMine: true } : m))
        );
      }
    } catch (e) {
      console.log('Error sending manager message:', e?.message || e);
    } finally {
      setSendingMessage(false);
    }
  };

  // Start new conversation from contact in modal
  const handleStartChatWithContact = async (contact) => {
    try {
      setInitiatingChat(true);
      const res = await apiClient.post(
        '/chat/conversations/init',
        {
          participantType: contact.participantType || (contact.role === 'Tenant' ? 'TENANT' : 'OWNER'),
          participantId: contact.id,
        },
        logout,
        refreshAccessToken
      );
      const conv = res?.data || res;

      if (conv?.id) {
        setNewChatModalOpen(false);
        setModalSearch('');
        setActiveConversation(conv);
        setMessages([]);
        fetchMessages(conv.id, true);
        fetchConversations(false);
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not initiate conversation.');
    } finally {
      setInitiatingChat(false);
    }
  };

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
      Alert.alert('Error', e?.message || 'Failed to publish notice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background || '#090d16' }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (activeConversation !== null) {
                setActiveConversation(null);
                setMessages([]);
                fetchConversations(false);
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

          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={styles.title} allowFontScaling={false} numberOfLines={1}>
              {activeConversation !== null
                ? activeConversation.participantName
                : 'Communication Hub'}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1} allowFontScaling={false}>
              {activeConversation !== null
                ? `${activeConversation.subtitle || ''} • ${activeConversation.participantType || 'RESIDENT'}`
                : '1-to-1 Messaging with Tenants & Owners'}
            </Text>
          </View>

          {/* SaaS Verified Badge when in active conversation */}
          {activeConversation !== null ? (
            <View style={styles.verifiedHeaderBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#10b981" style={{ marginRight: 4 }} />
              <Text style={styles.verifiedHeaderBadgeText}>Verified</Text>
            </View>
          ) : activeView === 'inbox' ? (
            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() => {
                Keyboard.dismiss();
                fetchContacts();
                setNewChatModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#0f172a" style={{ marginRight: 4 }} />
              <Text style={styles.newChatBtnText} allowFontScaling={false}>New Chat</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() => {
                Keyboard.dismiss();
                setCreateAnnounceOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="megaphone" size={15} color="#0f172a" style={{ marginRight: 4 }} />
              <Text style={styles.newChatBtnText} allowFontScaling={false}>Notice</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 2 MAIN TABS: Messages | Notices (Only shown when not in active chat) */}
        {activeConversation === null && (
          <View style={styles.tabBarRow}>
            {[
              { id: 'inbox', label: '1-to-1 Messages', icon: 'chatbubbles' },
              { id: 'announcements', label: `Notices (${announcements.length})`, icon: 'megaphone' },
            ].map((tab) => {
              const isActive = activeView === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.segmentTab, isActive && styles.segmentTabActive]}
                  onPress={() => setActiveView(tab.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isActive ? tab.icon : `${tab.icon}-outline`}
                    size={15}
                    color={isActive ? '#0f172a' : '#94a3b8'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.segmentTabText, isActive && styles.segmentTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* SEARCH BAR & CATEGORY PILLS (All, Tenants, Owners) - STAFF HIDDEN */}
        {activeConversation === null && activeView === 'inbox' && (
          <>
            <View style={styles.searchBarRow}>
              <Ionicons name="search-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search chats, residents, units..."
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

            {/* Filter Pills matching Web: Alls | Tenants | Owners (NO STAFF) */}
            <View style={styles.filterPillsRow}>
              {[
                { id: 'ALL', label: 'Alls' },
                { id: 'TENANT', label: 'Tenants' },
                { id: 'OWNER', label: 'Owners' },
              ].map((pill) => {
                const isSelected = roleFilter === pill.id;
                return (
                  <TouchableOpacity
                    key={pill.id}
                    style={[styles.rolePill, isSelected && styles.rolePillActive]}
                    onPress={() => setRoleFilter(pill.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.rolePillText, isSelected && styles.rolePillTextActive]}>
                      {pill.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>

      {/* CONTENT AREA */}
      {activeConversation !== null ? (
        // ACTIVE 1-TO-1 CHAT ROOM
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
        >
          {loading && messages.length === 0 ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#38bdf8" />
              <Text style={styles.loadingText}>Loading conversation...</Text>
            </View>
          ) : (
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatScrollContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyChatBox}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#64748b" />
                  <Text style={styles.emptyTitle}>No messages in this discussion yet.</Text>
                  <Text style={styles.emptySubtitle}>
                    Type a message below to begin chatting with {activeConversation.participantName}.
                  </Text>
                </View>
              ) : (
                messages.map((m) => {
                  const isMine = m.isMine === true;
                  const timeStr = m.createdAt
                    ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just now';

                  return (
                    <View
                      key={m.id || String(Math.random())}
                      style={[
                        styles.bubbleWrapper,
                        isMine ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft,
                      ]}
                    >
                      {!isMine && (
                        <Text style={styles.senderLabel}>
                          {m.senderName || activeConversation.participantName}
                        </Text>
                      )}

                      <View
                        style={[
                          styles.bubbleBox,
                          isMine ? styles.bubbleMine : styles.bubbleTheirs,
                        ]}
                      >
                        <Text style={[styles.bubbleText, isMine ? styles.textMine : styles.textTheirs]}>
                          {m.body || ''}
                        </Text>
                      </View>

                      <View style={[styles.timeRow, isMine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                        <Text style={styles.timeText}>{timeStr}</Text>
                        {isMine && (
                          <Ionicons
                            name={m.status === 'READ' ? 'checkmark-done' : 'checkmark'}
                            size={13}
                            color={m.status === 'READ' ? '#38bdf8' : '#94a3b8'}
                            style={{ marginLeft: 3 }}
                          />
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* CHAT INPUT BAR */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder={`Message ${activeConversation.participantName}...`}
              placeholderTextColor="#64748b"
              value={typedMessage}
              onChangeText={setTypedMessage}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!typedMessage.trim() || sendingMessage) && { opacity: 0.5 }]}
              onPress={handleSendMessage}
              disabled={!typedMessage.trim() || sendingMessage}
              activeOpacity={0.8}
            >
              {sendingMessage ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <Ionicons name="send" size={16} color="#0f172a" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : activeView === 'inbox' ? (
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
            ) : filteredConversations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={54} color="#475569" />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No Matching Conversations' : 'No Discussions Yet'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? 'Try searching with another resident or unit name.'
                    : 'Start a direct discussion with verified tenants or property owners.'}
                </Text>
                <TouchableOpacity
                  style={[styles.newChatBtn, { marginTop: 16 }]}
                  onPress={() => {
                    fetchContacts();
                    setNewChatModalOpen(true);
                  }}
                >
                  <Ionicons name="add" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                  <Text style={styles.newChatBtnText}>Start New Chat</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredConversations.map((conv) => {
                const isTenant = conv.participantType === 'TENANT';
                const badgeColor = isTenant ? '#10b981' : '#f59e0b';
                const roleLabel = isTenant ? 'Tenant' : 'Owner';
                const initial = (conv.participantName || 'U').charAt(0).toUpperCase();

                const timeStr = conv.lastMessageAt
                  ? new Date(conv.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                  : '';

                return (
                  <TouchableOpacity
                    key={conv.id}
                    style={styles.convCard}
                    onPress={() => handleOpenConversation(conv)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.avatarCircle, { backgroundColor: `${badgeColor}20` }]}>
                      <Text style={[styles.avatarCircleText, { color: badgeColor }]}>{initial}</Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.convName} numberOfLines={1} allowFontScaling={false}>
                          {conv.participantName}
                        </Text>
                        <Text style={styles.convTime} allowFontScaling={false}>
                          {timeStr}
                        </Text>
                      </View>

                      <Text style={styles.convSubtitle} numberOfLines={1} allowFontScaling={false}>
                        {conv.subtitle || ''} • {roleLabel}
                      </Text>

                      <View style={[styles.rowBetween, { marginTop: 4 }]}>
                        <Text style={styles.convLastMsg} numberOfLines={1} allowFontScaling={false}>
                          {conv.lastMessage || 'No messages yet'}
                        </Text>
                        {conv.unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{conv.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </Animated.View>
        </ScrollView>
      ) : (
        // NOTICES / ANNOUNCEMENTS TAB
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
                <Text style={styles.emptyTitle}>No Notices Published</Text>
                <Text style={styles.emptySubtitle}>
                  Publish community announcements or building maintenance notices.
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
              announcements.map((ann) => (
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

      {/* START 1-TO-1 CONVERSATION MODAL (ONLY TENANTS & OWNERS - STAFF HIDDEN) */}
      <Modal
        visible={newChatModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNewChatModalOpen(false)}
      >
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
                      <Text style={styles.modalSubTitle}>Choose who to chat with (Tenants & Owners)</Text>
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

                  {/* Search inside modal */}
                  <View style={[styles.searchBarRow, { marginTop: 0, marginBottom: 12 }]}>
                    <Ionicons name="search-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search contact by name or unit..."
                      placeholderTextColor="#64748b"
                      value={modalSearch}
                      onChangeText={setModalSearch}
                    />
                    {modalSearch ? (
                      <TouchableOpacity onPress={() => setModalSearch('')}>
                        <Ionicons name="close-circle" size={16} color="#64748b" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Category Filter Tabs: ONLY All, Tenants, Owners (STAFF REMOVED) */}
                  <Text style={styles.fieldLabel}>Select Recipient Category:</Text>
                  <View style={styles.chipRow}>
                    {['All', 'Tenants', 'Owners'].map((cat) => {
                      const isCatActive = modalCategoryFilter === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.categoryFilterTab, isCatActive && styles.categoryFilterTabActive]}
                          onPress={() => {
                            Keyboard.dismiss();
                            setModalCategoryFilter(cat);
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
                  {initiatingChat ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                      <ActivityIndicator size="large" color="#38bdf8" />
                      <Text style={styles.loadingText}>Opening conversation...</Text>
                    </View>
                  ) : (
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      style={{ maxHeight: 300 }}
                      contentContainerStyle={{ paddingBottom: 20 }}
                    >
                      {filteredContacts.length === 0 ? (
                        <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                          <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '600' }}>
                            No matching contacts found
                          </Text>
                        </View>
                      ) : (
                        filteredContacts.map((c) => {
                          const isTenant = c.participantType === 'TENANT' || c.role === 'Tenant';
                          const badgeColor = isTenant ? '#10b981' : '#f59e0b';
                          const roleLabel = isTenant ? 'Tenant' : 'Owner';

                          return (
                            <TouchableOpacity
                              key={c.id}
                              style={styles.contactCard}
                              onPress={() => handleStartChatWithContact(c)}
                              activeOpacity={0.75}
                            >
                              <View style={[styles.contactAvatar, { backgroundColor: `${badgeColor}22` }]}>
                                <Text style={[styles.contactAvatarText, { color: badgeColor }]}>
                                  {c.name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.contactCardName} numberOfLines={1}>
                                  {c.name}
                                </Text>
                                <Text style={[styles.contactCardRole, { color: badgeColor }]}>
                                  {c.subtitle ? `${c.subtitle} • ` : ''}{roleLabel} {c.phone ? `• ${c.phone}` : ''}
                                </Text>
                              </View>
                              <View style={styles.chatActionBtn}>
                                <Text style={styles.chatActionBtnText}>Chat</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>
                  )}
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

                    <Text style={styles.fieldLabel}>Notice Details:</Text>
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
      paddingTop: Platform.OS === 'ios' ? 54 : 24,
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
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    },
    title: {
      fontSize: 16.5,
      fontWeight: '800',
      color: colors.textPrimary || '#f8fafc',
    },
    subtitle: {
      fontSize: 11.5,
      color: colors.textSecondary || '#94a3b8',
      marginTop: 2,
      fontWeight: '500',
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
    verifiedHeaderBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    verifiedHeaderBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#10b981',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tabBarRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    segmentTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
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
      fontSize: 12,
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
    filterPillsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    rolePill: {
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    rolePillActive: {
      backgroundColor: '#38bdf8',
      borderColor: '#38bdf8',
    },
    rolePillText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.textSecondary || '#94a3b8',
    },
    rolePillTextActive: {
      color: '#0f172a',
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    convCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: 14,
      padding: 13,
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
      fontSize: 17,
      fontWeight: '800',
    },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    convName: {
      fontSize: 14.5,
      fontWeight: '700',
      color: colors.textPrimary || '#f8fafc',
      flex: 1,
    },
    convTime: {
      fontSize: 11,
      color: '#64748b',
      marginLeft: 8,
      fontWeight: '500',
    },
    convSubtitle: {
      fontSize: 11.5,
      color: '#64748b',
      marginTop: 2,
      fontWeight: '500',
    },
    convLastMsg: {
      fontSize: 12.5,
      color: colors.textSecondary || '#94a3b8',
      flex: 1,
      marginRight: 8,
    },
    unreadBadge: {
      backgroundColor: '#38bdf8',
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 1,
      minWidth: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadBadgeText: {
      color: '#0f172a',
      fontSize: 10.5,
      fontWeight: '800',
    },
    centerLoading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 12,
      color: '#64748b',
      marginTop: 10,
      fontWeight: '600',
    },
    chatScroll: {
      flex: 1,
    },
    chatScrollContent: {
      padding: 16,
      paddingBottom: 24,
    },
    emptyChatBox: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 60,
      paddingHorizontal: 24,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary || '#f8fafc',
      marginTop: 14,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 12.5,
      color: colors.textSecondary || '#94a3b8',
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 18,
    },
    bubbleWrapper: {
      marginBottom: 12,
      maxWidth: '82%',
    },
    bubbleWrapperLeft: {
      alignSelf: 'flex-start',
    },
    bubbleWrapperRight: {
      alignSelf: 'flex-end',
    },
    senderLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: '#94a3b8',
      marginBottom: 3,
      marginLeft: 4,
    },
    bubbleBox: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 16,
    },
    bubbleMine: {
      backgroundColor: '#0284c7',
      borderBottomRightRadius: 2,
    },
    bubbleTheirs: {
      backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0',
      borderBottomLeftRadius: 2,
    },
    bubbleText: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
    },
    textMine: {
      color: '#ffffff',
    },
    textTheirs: {
      color: isDarkMode ? '#f8fafc' : '#0f172a',
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 3,
      paddingHorizontal: 4,
    },
    timeText: {
      fontSize: 10,
      color: '#64748b',
      fontWeight: '500',
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#1e293b' : '#e2e8f0',
    },
    textInput: {
      flex: 1,
      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      fontSize: 13,
      fontWeight: '500',
      marginRight: 8,
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
      fontSize: 11.5,
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
      paddingHorizontal: 14,
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
    contactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
      borderRadius: 12,
      padding: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    contactAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
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
      marginTop: 2,
    },
    chatActionBtn: {
      backgroundColor: '#38bdf8',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 6,
    },
    chatActionBtnText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: '#0f172a',
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

export default ManagerCommunicationScreen;

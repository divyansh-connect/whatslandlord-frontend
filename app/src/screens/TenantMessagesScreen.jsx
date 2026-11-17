import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
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

  // Active view: 'chat' (Direct 1-to-1 Live Chat) | 'notices' (Announcements)
  const [activeView, setActiveView] = useState('chat');
  const [conversationId, setConversationId] = useState(null);
  const [conversationData, setConversationData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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

  // 1. Initialize & Fetch Conversation
  const initChat = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/chat/conversations', logout, refreshAccessToken);
      const convList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      
      if (convList.length > 0) {
        const conv = convList[0];
        setConversationData(conv);
        setConversationId(conv.id);
        await fetchMessages(conv.id, false);
      }
    } catch (e) {
      console.log('Error initializing chat conversation:', e?.message || e);
    } finally {
      if (showLoading) setLoading(false);
      runEntryAnimation();
    }
  };

  // 2. Fetch Messages for Conversation
  const fetchMessages = async (convId, showLoading = false) => {
    if (!convId) return;
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get(`/chat/conversations/${convId}/messages`, logout, refreshAccessToken);
      const msgList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      
      setMessages((prev) => {
        // Keep optimistic pending messages if not yet in backend
        const pending = prev.filter((m) => m.id && String(m.id).startsWith('temp-'));
        const backendIds = new Set(msgList.map((m) => String(m.id)));
        const stillPending = pending.filter((m) => !backendIds.has(String(m.id)));
        return [...msgList, ...stillPending];
      });

      // Mark as read in background
      apiClient.post(`/chat/conversations/${convId}/read`, {}, logout, refreshAccessToken).catch(() => {});
    } catch (e) {
      console.log('Error fetching chat messages:', e?.message || e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // 3. Fetch Notices / Bulletins
  const fetchAnnouncements = async () => {
    try {
      const res = await apiClient.get('/announcements', logout, refreshAccessToken);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setAnnouncements(list);
    } catch (e) {
      console.log('Error fetching announcements:', e?.message || e);
      setAnnouncements([]);
    }
  };

  // Initial load
  useEffect(() => {
    initChat(true);
    fetchAnnouncements();
  }, [user?.role]);

  // Real-time 3s auto-polling
  useEffect(() => {
    if (activeView === 'chat' && conversationId) {
      pollTimerRef.current = setInterval(() => {
        fetchMessages(conversationId, false);
      }, 3000);
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [activeView, conversationId]);

  // Send message
  const handleSend = async () => {
    if (!inputText.trim() || !conversationId || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      conversationId,
      body: text,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      isMine: true,
      senderName: user?.name || 'You',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await apiClient.post(
        `/chat/conversations/${conversationId}/messages`,
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
      console.log('Error sending message:', e?.message || e);
    } finally {
      setSending(false);
    }
  };

  const roleTitle = user?.role === 'Owner' ? 'Property Owner Portal' : 'Tenant Portal';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background || '#090d16' }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (onBack) onBack();
              else if (onNavigate) onNavigate('back');
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary || '#f8fafc'} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.title} allowFontScaling={false}>
                Property Manager Office
              </Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>
            <Text style={styles.subtitle} numberOfLines={1} allowFontScaling={false}>
              Direct Encrypted Channel • {roleTitle}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => {
              if (conversationId) fetchMessages(conversationId, true);
              else initChat(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color="#38bdf8" />
          </TouchableOpacity>
        </View>

        {/* SUB TABS: Direct Chat | Notices & Bulletins */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeView === 'chat' && styles.tabBtnActive]}
            onPress={() => setActiveView('chat')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeView === 'chat' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={15}
              color={activeView === 'chat' ? '#38bdf8' : '#94a3b8'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabBtnText, activeView === 'chat' && styles.tabBtnTextActive]}>
              1-to-1 Chat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeView === 'notices' && styles.tabBtnActive]}
            onPress={() => {
              setActiveView('notices');
              if (announcements.length === 0) fetchAnnouncements();
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeView === 'notices' ? 'megaphone' : 'megaphone-outline'}
              size={15}
              color={activeView === 'notices' ? '#38bdf8' : '#94a3b8'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabBtnText, activeView === 'notices' && styles.tabBtnTextActive]}>
              Notices ({announcements.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT */}
      {activeView === 'chat' ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
        >
          {loading && messages.length === 0 ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#38bdf8" />
              <Text style={styles.loadingText}>Connecting to Property Manager...</Text>
            </View>
          ) : (
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatScrollContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
            >
              {/* SaaS Verified Notice Banner */}
              <View style={styles.verifiedBanner}>
                <Ionicons name="shield-checkmark" size={14} color="#10b981" style={{ marginRight: 6 }} />
                <Text style={styles.verifiedBannerText}>
                  SaaS Verified • Official Management Communication Channel
                </Text>
              </View>

              {messages.length === 0 ? (
                <View style={styles.emptyChatBox}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#64748b" />
                  <Text style={styles.emptyTitle}>No messages in this discussion yet.</Text>
                  <Text style={styles.emptySubtitle}>
                    Type a message below to begin chatting directly with your Property Manager.
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
                          {m.senderName || 'Property Manager'}
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
              placeholder="Type message to Property Manager..."
              placeholderTextColor="#64748b"
              value={inputText}
              onChangeText={setInputText}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || sending) && { opacity: 0.5 }]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <Ionicons name="send" size={16} color="#0f172a" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        // NOTICES / BULLETINS TAB
        <ScrollView
          style={styles.chatScroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {announcements.length === 0 ? (
            <View style={styles.emptyChatBox}>
              <Ionicons name="megaphone-outline" size={48} color="#64748b" />
              <Text style={styles.emptyTitle}>No Community Notices</Text>
              <Text style={styles.emptySubtitle}>
                Elevator maintenance, building announcements, or general notices will appear here.
              </Text>
            </View>
          ) : (
            announcements.map((ann) => (
              <View key={ann.id} style={styles.noticeCard}>
                <View style={styles.noticeHeader}>
                  <View style={styles.noticeTag}>
                    <Text style={styles.noticeTagText}>{ann.category || 'General'}</Text>
                  </View>
                  <Text style={styles.noticeDate}>
                    {ann.createdAt ? new Date(ann.createdAt).toISOString().split('T')[0] : 'Recent'}
                  </Text>
                </View>
                <Text style={styles.noticeTitle}>{ann.title || 'Notice'}</Text>
                <Text style={styles.noticeBody}>{ann.content || ann.body || ''}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
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
      padding: 4,
      marginRight: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
    },
    subtitle: {
      fontSize: 11,
      fontWeight: '500',
      color: '#64748b',
      marginTop: 2,
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 12,
      marginLeft: 8,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10b981',
      marginRight: 4,
    },
    liveText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#10b981',
    },
    refreshBtn: {
      padding: 8,
      borderRadius: 10,
      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      borderRadius: 10,
      padding: 3,
      marginTop: 12,
    },
    tabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 7,
      borderRadius: 8,
    },
    tabBtnActive: {
      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    tabBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#64748b',
    },
    tabBtnTextActive: {
      color: '#38bdf8',
      fontWeight: '700',
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
    verifiedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      alignSelf: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    verifiedBannerText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#10b981',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    emptyChatBox: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 60,
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      marginTop: 12,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 12,
      color: '#64748b',
      marginTop: 6,
      textAlign: 'center',
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
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    noticeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    noticeTag: {
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    noticeTagText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#38bdf8',
      textTransform: 'uppercase',
    },
    noticeDate: {
      fontSize: 11,
      color: '#64748b',
      fontWeight: '500',
    },
    noticeTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      marginBottom: 4,
    },
    noticeBody: {
      fontSize: 12,
      color: isDarkMode ? '#cbd5e1' : '#475569',
      lineHeight: 18,
    },
  });

export default TenantMessagesScreen;

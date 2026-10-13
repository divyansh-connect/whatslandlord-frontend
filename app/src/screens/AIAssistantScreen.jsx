import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export const AIAssistantScreen = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  const role = user?.role || 'Tenant';
  const isManager = role === 'Property Manager' || role === 'Collection Manager';

  // Active sub-tab for Tenant: 'concierge' | 'lease-qa'
  const [activeTenantTab, setActiveTenantTab] = useState('concierge');

  // Messages lists for different contexts
  const [managerMessages, setManagerMessages] = useState([
    {
      id: 'welcome',
      sender: 'AI',
      text: 'Hello! I am your AI Leasing & Operations Assistant. I can help you analyze MySQL property data, tenant leases, and accounting logs. Ask me anything!',
      timestamp: new Date().toISOString(),
    }
  ]);

  const [conciergeMessages, setConciergeMessages] = useState([
    {
      id: 'welcome',
      sender: 'AI',
      text: 'Hello! I am your Resident Portal Concierge. Ask me anything about building operations, visitor logs, packages, or rent dues!',
      timestamp: new Date().toISOString(),
    }
  ]);

  const [leaseQaMessages, setLeaseQaMessages] = useState([
    {
      id: 'welcome',
      sender: 'AI',
      text: 'Hello! I am your Lease Q&A helper. Ask me questions about your specific lease agreement terms, deposits, or utility policies!',
      timestamp: new Date().toISOString(),
    }
  ]);

  // Input states
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatId] = useState(`chat-${Date.now()}`); // Persist a chatId for the manager session
  const [suggestedActions, setSuggestedActions] = useState(
    isManager ? ['Show properties count', 'Are there any overdue rent invoices?', 'List screening reports'] : []
  );

  const scrollViewRef = useRef(null);

  const getActiveMessages = () => {
    if (isManager) return managerMessages;
    return activeTenantTab === 'concierge' ? conciergeMessages : leaseQaMessages;
  };

  const getTitle = () => {
    if (isManager) return 'AI Leasing Assistant';
    return activeTenantTab === 'concierge' ? 'Property Concierge' : 'Lease Q&A Bot';
  };

  const getSubtitle = () => {
    if (isManager) return 'MySQL-grounded business intelligence';
    return activeTenantTab === 'concierge' ? 'General resident concierge helper' : 'Ask questions about your lease terms';
  };

  const appendMessage = (sender, text, extra = {}) => {
    const newMsg = {
      id: String(Date.now()),
      sender,
      text,
      timestamp: new Date().toISOString(),
      ...extra,
    };

    if (isManager) {
      setManagerMessages((prev) => [...prev, newMsg]);
    } else if (activeTenantTab === 'concierge') {
      setConciergeMessages((prev) => [...prev, newMsg]);
    } else {
      setLeaseQaMessages((prev) => [...prev, newMsg]);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    if (!textToSend) {
      setInputValue('');
    }

    // Append user message
    appendMessage('User', text);
    setLoading(true);

    try {
      if (isManager) {
        // Manager API endpoint: POST /ai/chat
        const res = await apiClient.post('/ai/chat', { prompt: text, chatId });
        const payload = res?.data?.data || res?.data || res || {};
        const replyText = payload.response || payload.text || 'I processed your query against live databases.';
        
        appendMessage('AI', replyText, {
          suggestedActions: payload.suggestedActions || [],
          relatedRecords: payload.relatedRecords || [],
        });

        if (payload.suggestedActions) {
          setSuggestedActions(payload.suggestedActions);
        } else {
          setSuggestedActions([]);
        }
      } else if (activeTenantTab === 'concierge') {
        // Tenant Concierge: POST /portal/tenant/ai-concierge
        const res = await apiClient.post('/portal/tenant/ai-concierge', { message: text });
        const payload = res?.data || res || {};
        const replyText = payload.reply || 'Sorry, I couldn\'t process that at the moment.';
        appendMessage('AI', replyText);
      } else {
        // Tenant Lease Q&A: POST /portal/tenant/lease/ai-qa
        const res = await apiClient.post('/portal/tenant/lease/ai-qa', { question: text });
        const payload = res?.data || res || {};
        const replyText = payload.answer || 'Sorry, I couldn\'t parse your lease terms right now.';
        appendMessage('AI', replyText);
      }
    } catch (e) {
      appendMessage('AI', `Error: ${e.message || 'Server connection issue.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom whenever messages list length changes
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [managerMessages.length, conciergeMessages.length, leaseQaMessages.length, activeTenantTab]);

  const messages = getActiveMessages();

  return (
    <KeyboardAvoidingView
      style={styles.mainWrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
    >
      {/* FIXED NAVIGATION HEADER */}
      <View style={styles.fixedHeader}>
        <TouchableOpacity onPress={() => onNavigate && onNavigate('dashboard')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} style={{ marginRight: 6 }} />
          <View>
            <Text style={styles.title} allowFontScaling={false}>{getTitle()}</Text>
            <Text style={styles.subtitle} allowFontScaling={false}>{getSubtitle()}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* TENANT TABS SELECTOR */}
      {!isManager && (
        <View style={styles.tenantTabs}>
          <TouchableOpacity
            style={[styles.tabItem, activeTenantTab === 'concierge' && styles.tabItemActive]}
            onPress={() => setActiveTenantTab('concierge')}
          >
            <Text style={[styles.tabItemText, activeTenantTab === 'concierge' && styles.tabItemTextActive]} allowFontScaling={false}>
              Concierge Chat
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTenantTab === 'lease-qa' && styles.tabItemActive]}
            onPress={() => setActiveTenantTab('lease-qa')}
          >
            <Text style={[styles.tabItemText, activeTenantTab === 'lease-qa' && styles.tabItemTextActive]} allowFontScaling={false}>
              Lease Q&A
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CHAT MESSAGES SCROLL VIEW */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m) => {
          const isAI = m.sender === 'AI';
          return (
            <View key={m.id} style={[styles.messageBubbleWrapper, isAI ? styles.bubbleAIAlign : styles.bubbleUserAlign]}>
              <View style={[styles.messageBubble, isAI ? styles.bubbleAI : styles.bubbleUser]}>
                <Text style={[styles.messageText, isAI ? styles.textAI : styles.textUser]} allowFontScaling={false}>
                  {m.text}
                </Text>
                
                {/* Related Records Links (Manager only) */}
                {isAI && m.relatedRecords && m.relatedRecords.length > 0 && (
                  <View style={styles.recordsWrapper}>
                    <Text style={styles.recordsTitle} allowFontScaling={false}>RELATED RECORDS:</Text>
                    {m.relatedRecords.map((rec, rIdx) => (
                      <TouchableOpacity
                        key={rIdx}
                        style={styles.recordChip}
                        onPress={() => {
                          if (rec.type === 'property') onNavigate('properties');
                          if (rec.type === 'tenant') onNavigate('tenants');
                          if (rec.type === 'invoice') onNavigate('rent');
                          if (rec.type === 'application') onNavigate('leads');
                        }}
                      >
                        <Ionicons name="link-outline" size={12} color="#38bdf8" />
                        <Text style={styles.recordChipText} allowFontScaling={false}>
                          {rec.label || `${rec.type} #${rec.id}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <Text style={styles.timestamp} allowFontScaling={false}>
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <View style={[styles.messageBubbleWrapper, styles.bubbleAIAlign]}>
            <View style={[styles.messageBubble, styles.bubbleAI, styles.typingBubble]}>
              <ActivityIndicator size="small" color="#38bdf8" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* SUGGESTED ACTIONS BAR */}
      {suggestedActions.length > 0 && !loading && (
        <View style={styles.suggestedActionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedScroll}>
            {suggestedActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestedActionChip}
                onPress={() => handleSendMessage(action)}
              >
                <Text style={styles.suggestedActionText} allowFontScaling={false}>{action}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* INPUT FORM BAR */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder={isManager ? "Query MySQL database records..." : "Ask a question..."}
          placeholderTextColor="#64748b"
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={() => handleSendMessage()}
          returnKeyType="send"
          disabled={loading}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={() => handleSendMessage()} disabled={loading}>
          <Ionicons name="send" size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: colors.background },
  fixedHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  tenantTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabItemActive: {
    backgroundColor: '#38bdf8',
  },
  tabItemText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  tabItemTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },

  chatScroll: { flex: 1 },
  chatScrollContent: { padding: 16, paddingBottom: 24 },

  messageBubbleWrapper: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  bubbleAIAlign: { alignSelf: 'flex-start' },
  bubbleUserAlign: { alignSelf: 'flex-end' },

  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleAI: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
    borderBottomRightRadius: 4,
  },
  typingBubble: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  messageText: { fontSize: 13, lineHeight: 18 },
  textAI: { color: colors.textPrimary },
  textUser: { color: '#0f172a', fontWeight: '500' },
  timestamp: { fontSize: 9, color: colors.textSecondary, marginTop: 4, alignSelf: 'flex-end' },

  recordsWrapper: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 8,
  },
  recordsTitle: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, marginBottom: 6 },
  recordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recordChipText: { fontSize: 11, color: '#38bdf8', marginLeft: 4, fontWeight: '700' },

  suggestedActionsContainer: {
    backgroundColor: colors.background,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  suggestedScroll: { paddingHorizontal: 16, gap: 6 },
  suggestedActionChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  suggestedActionText: { color: '#38bdf8', fontSize: 11, fontWeight: '700' },

  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 13,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

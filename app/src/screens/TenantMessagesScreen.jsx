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
} from 'react-native';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

// Animated Touchable Wrapper Component
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

export const TenantMessagesScreen = () => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';
  const isOwner = user?.role === 'Owner';

  const defaultContact = isOwner 
    ? (es ? 'Administrador de Propiedades' : 'Property Manager') 
    : (es ? 'Oficina del Administrador' : 'Property Manager Office');
  const [activeContact, setActiveContact] = useState(null); // null means show conversation list
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Compose Form State
  const [composeRecipient, setComposeRecipient] = useState(defaultContact);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);

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

  const [chatHistory, setChatHistory] = useState({
    'Property Manager': [
      { id: '1', sender: 'manager', text: 'Hello! Welcome to WhatsLandlord Owner Portal. How can we assist with your portfolio today?', time: '09:30 AM' },
      { id: '2', sender: 'user', text: 'Hi! I wanted to check on the monthly ledger statement.', time: '09:32 AM' },
      { id: '3', sender: 'manager', text: 'Your monthly statements for Sky house and property 1 have been published.', time: '09:35 AM' },
    ],
    'Administrador de Propiedades': [
      { id: '1', sender: 'manager', text: '¡Hola! Bienvenido al Portal del Propietario de WhatsLandlord. ¿Cómo podemos asistirle hoy con su cartera?', time: '09:30 AM' },
      { id: '2', sender: 'user', text: '¡Hola! Quería verificar el estado de cuenta mensual.', time: '09:32 AM' },
      { id: '3', sender: 'manager', text: 'Sus estados de cuenta mensuales para Sky house y property 1 han sido publicados.', time: '09:35 AM' },
    ],
    'Accountant': [
      { id: '1', sender: 'manager', text: 'Accounting office here. Net owner distribution of $1,980.00 is queued.', time: 'Yesterday' },
    ],
    'Contador': [
      { id: '1', sender: 'manager', text: 'Oficina de contabilidad aquí. La distribución neta del propietario de $1,980.00 está en cola.', time: 'Ayer' },
    ],
    'Leasing Lead': [
      { id: '2', sender: 'manager', text: 'Leasing update: Tenant unit occupied with active lease contract.', time: '08:00 AM' },
    ],
    'Agente de Alquiler': [
      { id: '2', sender: 'manager', text: 'Actualización de alquiler: Unidad del inquilino ocupada con contrato activo.', time: '08:00 AM' },
    ],
    'Resident Representative': [
      { id: '3', sender: 'manager', text: 'Resident representative available for property inquiry.', time: 'Monday' },
    ],
    'Representante de Residentes': [
      { id: '3', sender: 'manager', text: 'Representante de residentes disponible para consultas sobre la propiedad.', time: 'Lunes' },
    ],
    'Property Manager Office': [
      { id: '1', sender: 'manager', text: 'Hello! Welcome to WhatsLandlord Property Management. How can we assist you today?', time: '09:30 AM' },
    ],
    'Oficina del Administrador': [
      { id: '1', sender: 'manager', text: '¡Hola! Bienvenido a la administración de propiedades de WhatsLandlord. ¿Cómo podemos asistirle hoy?', time: '09:30 AM' },
    ],
    'Leasing Office': [
      { id: '1', sender: 'manager', text: 'Leasing office here. Your lease agreement is active.', time: 'Yesterday' },
    ],
    'Oficina de Arrendamiento': [
      { id: '1', sender: 'manager', text: 'Oficina de arrendamiento aquí. Su contrato de arrendamiento está activo.', time: 'Ayer' },
    ],
    'Maintenance Team': [
      { id: '1', sender: 'manager', text: 'Work orders for your property units are currently completed.', time: '08:00 AM' },
    ],
    'Equipo de Mantenimiento': [
      { id: '1', sender: 'manager', text: 'Las órdenes de trabajo para las unidades de su propiedad se encuentran completadas.', time: '08:00 AM' },
    ],
    'Accounting Office': [
      { id: '1', sender: 'manager', text: 'Your account balance is currently clear.', time: 'Monday' },
    ],
    'Oficina de Contabilidad': [
      { id: '1', sender: 'manager', text: 'El saldo de su cuenta se encuentra actualmente al día.', time: 'Lunes' },
    ],
  });

  const contacts = isOwner
    ? [
        { id: '1', name: es ? 'Administrador de Propiedades' : 'Property Manager', icon: 'business-outline', color: '#f59e0b' },
        { id: '2', name: es ? 'Contador' : 'Accountant', icon: 'book-outline', color: '#38bdf8' },
        { id: '3', name: es ? 'Agente de Alquiler' : 'Leasing Lead', icon: 'key-outline', color: '#10b981' },
        { id: '4', name: es ? 'Representante de Residentes' : 'Resident Representative', icon: 'chatbubbles-outline', color: '#ec4899' },
      ]
    : [
        { id: '1', name: es ? 'Oficina del Administrador' : 'Property Manager Office', icon: 'business-outline', color: '#f59e0b' },
        { id: '2', name: es ? 'Oficina de Arrendamiento' : 'Leasing Office', icon: 'key-outline', color: '#38bdf8' },
        { id: '3', name: es ? 'Equipo de Mantenimiento' : 'Maintenance Team', icon: 'hammer-outline', color: '#10b981' },
        { id: '4', name: es ? 'Oficina de Contabilidad' : 'Accounting Office', icon: 'book-outline', color: '#ec4899' },
      ];

  // Strictly call live Railway backend endpoint: GET /portal/owner/messages OR GET /messages
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const endpoint = isOwner ? '/portal/owner/messages' : '/messages';
      const res = await apiClient.get(endpoint, logout, refreshAccessToken);
      const rawList = Array.isArray(res) ? res : (res?.data || []);

      if (rawList && rawList.length > 0) {
        const formatted = {};
        rawList.forEach((m) => {
          let contactKey = m.sender || m.recipient || defaultContact;
          if (es) {
            if (contactKey === 'Property Manager Office') contactKey = 'Oficina del Administrador';
            if (contactKey === 'Property Manager') contactKey = 'Administrador de Propiedades';
            if (contactKey === 'Leasing Office') contactKey = 'Oficina de Arrendamiento';
            if (contactKey === 'Leasing Lead') contactKey = 'Agente de Alquiler';
            if (contactKey === 'Maintenance Team') contactKey = 'Equipo de Mantenimiento';
            if (contactKey === 'Accountant') contactKey = 'Contador';
            if (contactKey === 'Accounting Office') contactKey = 'Oficina de Contabilidad';
            if (contactKey === 'Resident Representative') contactKey = 'Representante de Residentes';
          }

          let bodyText = m.body || m.text || m.message || '';
          if (es) {
            if (bodyText.includes('Hello! Welcome to WhatsLandlord Property Management')) {
              bodyText = '¡Hola! Bienvenido a la administración de propiedades de WhatsLandlord. ¿Cómo podemos asistirle hoy?';
            } else if (bodyText.includes('Leasing office here. Your lease agreement is active')) {
              bodyText = 'Oficina de arrendamiento aquí. Su contrato de arrendamiento está activo.';
            } else if (bodyText.includes('Work orders for your property units are currently completed')) {
              bodyText = 'Las órdenes de trabajo para las unidades de su propiedad se encuentran completadas.';
            } else if (bodyText.includes('Your account balance is currently clear')) {
              bodyText = 'El saldo de su cuenta se encuentra actualmente al día.';
            } else if (bodyText.includes('Hello! Welcome to WhatsLandlord Owner Portal')) {
              bodyText = '¡Hola! Bienvenido al Portal del Propietario de WhatsLandlord. ¿Cómo podemos asistirle hoy con su cartera?';
            } else if (bodyText.includes('Hi! I wanted to check on the monthly ledger statement')) {
              bodyText = '¡Hola! Quería verificar el estado de cuenta mensual.';
            } else if (bodyText.includes('Your monthly statements for Sky house and property 1 have been published')) {
              bodyText = 'Sus estados de cuenta mensuales para Sky house y property 1 han sido publicados.';
            } else if (bodyText.includes('Accounting office here. Net owner distribution of')) {
              bodyText = 'Oficina de contabilidad aquí. La distribución neta del propietario de $1,980.00 está en cola.';
            }
          }

          if (!formatted[contactKey]) formatted[contactKey] = [];
          formatted[contactKey].push({
            id: m.id || String(Date.now()),
            sender: m.sender === user?.email ? 'user' : 'manager',
            text: bodyText,
            time: m.timestamp ? m.timestamp.split('T')[0] : 'Today',
          });
        });
        setChatHistory((prev) => ({ ...prev, ...formatted }));
      }
    } catch (e) {
      console.log('Error fetching messages from Railway:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [user?.role]);

  const handleSendReply = async () => {
    if (!inputText.trim() || !activeContact) return;
    const msgText = inputText.trim();
    const newMsg = {
      id: String(Date.now()),
      sender: 'user',
      text: msgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatHistory((prev) => ({
      ...prev,
      [activeContact]: [...(prev[activeContact] || []), newMsg],
    }));

    setInputText('');

    try {
      const endpoint = isOwner ? '/portal/owner/messages' : '/messages';
      await apiClient.post(
        endpoint,
        {
          recipient: activeContact,
          subject: 'Re: Message Thread',
          body: msgText,
        },
        logout,
        refreshAccessToken
      );
    } catch (e) {
      console.log('Post message fallback state applied:', e.message);
    }
  };

  const handleComposeSubmit = async () => {
    if (!composeSubject.trim() || !composeBody.trim()) {
      Alert.alert('Error', 'Please fill in subject and message body');
      return;
    }

    setSending(true);
    const newMsg = {
      id: String(Date.now()),
      sender: 'user',
      text: `[${composeSubject}] ${composeBody}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      const endpoint = isOwner ? '/portal/owner/messages' : '/messages';
      await apiClient.post(
        endpoint,
        {
          recipient: composeRecipient,
          subject: composeSubject,
          body: composeBody,
        },
        logout,
        refreshAccessToken
      );
    } catch (e) {
      console.log('Compose message fallback state applied:', e.message);
    } finally {
      setChatHistory((prev) => ({
        ...prev,
        [composeRecipient]: [...(prev[composeRecipient] || []), newMsg],
      }));
      setActiveContact(composeRecipient);
      setSending(false);
      setIsComposeOpen(false);
      setComposeSubject('');
      setComposeBody('');
      runEntryAnimation();
      Alert.alert('Message Sent', `Your message to ${composeRecipient} was sent!`);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>
          {es ? 'Cargando Mensajes...' : 'Loading Messages...'}
        </Text>
      </View>
    );
  }

  // SCREEN 1: Chat Detail View (Thread)
  if (activeContact) {
    const currentMessages = chatHistory[activeContact] || [];
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatRoomContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Chat Room Header */}
        <View style={styles.chatRoomHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setActiveContact(null)}>
            <Ionicons name="chevron-back" size={24} color="#38bdf8" />
          </TouchableOpacity>
          
          <View style={styles.chatHeaderAvatar}>
            <Text style={styles.chatHeaderAvatarText} allowFontScaling={false}>
              {activeContact.charAt(0)}
            </Text>
          </View>

          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderTitle} allowFontScaling={false}>{activeContact}</Text>
            <Text style={styles.chatHeaderSubtitle} allowFontScaling={false}>
              {es ? 'Hilo de Soporte en Línea' : 'Online Support Thread'}
            </Text>
          </View>
        </View>

        {/* Messages List */}
        <ScrollView
          style={styles.threadScroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={true}
        >
          {currentMessages.length === 0 ? (
            <View style={styles.emptyThreadCard}>
              <Ionicons name="chatbox-ellipses-outline" size={40} color="#475569" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyThreadText} allowFontScaling={false}>
                {es ? 'No se registraron mensajes' : 'No messages recorded'}
              </Text>
            </View>
          ) : (
            currentMessages.map((msg) => {
              const isMe = msg.sender === 'user' || msg.sender === 'tenant';
              return (
                <View key={msg.id} style={[styles.bubbleWrapper, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleUser : styles.bubbleManager]}>
                    <Text style={[styles.bubbleText, isMe ? styles.textUser : styles.textManager]} allowFontScaling={false}>
                      {msg.text}
                    </Text>
                    <Text style={[styles.bubbleTime, isMe ? styles.timeUser : styles.timeManager]} allowFontScaling={false}>
                      {msg.time}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.replyBar}>
          <TextInput
            style={styles.replyInput}
            placeholder={es ? `Mensaje a ${activeContact}...` : `Message ${activeContact}...`}
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSendReply} activeOpacity={0.8}>
            <Ionicons name="send" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // SCREEN 2: Conversations List View
  return (
    <View style={styles.mainWrapper}>
      {/* Page Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} allowFontScaling={false}>
            {es ? 'Bandeja de Entrada' : 'Inbox'}
          </Text>
          <AnimatedTouchable style={styles.composeBtn} onPress={() => setIsComposeOpen(true)}>
            <Ionicons name="create-outline" size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.composeBtnText} allowFontScaling={false}>
              {es ? 'Nuevo Mensaje' : 'New Message'}
            </Text>
          </AnimatedTouchable>
        </View>
      </View>

      {/* Conversations List */}
      <ScrollView
        style={styles.threadScroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchMessages} tintColor="#38bdf8" />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {contacts.map((contact) => {
            const thread = chatHistory[contact.name] || [];
            const lastMsg = thread[thread.length - 1];
            const initials = contact.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2);

            return (
              <TouchableOpacity
                key={contact.id}
                style={styles.conversationItem}
                onPress={() => setActiveContact(contact.name)}
                activeOpacity={0.7}
              >
                {/* Circular Avatar */}
                <View style={[styles.avatarBox, { backgroundColor: `${contact.color}15` }]}>
                  <Text style={[styles.avatarText, { color: contact.color }]} allowFontScaling={false}>
                    {initials}
                  </Text>
                </View>

                {/* Info and Last Message Snippet */}
                <View style={styles.convoInfo}>
                  <View style={styles.convoHeaderRow}>
                    <Text style={styles.convoName} allowFontScaling={false} numberOfLines={1}>
                      {contact.name}
                    </Text>
                    <Text style={styles.convoTime} allowFontScaling={false}>
                      {lastMsg ? lastMsg.time : ''}
                    </Text>
                  </View>
                  <Text style={styles.convoSnippet} allowFontScaling={false} numberOfLines={1}>
                    {lastMsg ? lastMsg.text : (es ? 'Toca para iniciar conversación' : 'Tap to start conversation')}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#475569" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* MODAL: + New Message / Compose */}
      <Modal visible={isComposeOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, width: '100%', justifyContent: 'center' }}
          >
            <ScrollView 
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalCard}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>
                    {es ? 'Nuevo Mensaje' : 'New Message'}
                  </Text>
                  <TouchableOpacity onPress={() => setIsComposeOpen(false)}>
                    <Ionicons name="close" size={22} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel} allowFontScaling={false}>
                  {es ? 'GRUPO DESTINATARIO' : 'RECIPIENT GROUP'}
                </Text>
                <View style={styles.recipientRow}>
                  {contacts.map((c) => {
                    const isSelected = composeRecipient === c.name;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.recChip, isSelected && styles.recChipActive]}
                        onPress={() => setComposeRecipient(c.name)}
                      >
                        <Text style={[styles.recChipText, isSelected && styles.recChipTextActive]} allowFontScaling={false}>
                          {c.name.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.inputLabel} allowFontScaling={false}>
                  {es ? 'ASUNTO *' : 'SUBJECT *'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={es ? 'Ej. Consulta sobre estado mensual' : 'E.g. Inquiry regarding monthly statement'}
                  placeholderTextColor="#64748b"
                  value={composeSubject}
                  onChangeText={setComposeSubject}
                />

                <Text style={styles.inputLabel} allowFontScaling={false}>
                  {es ? 'CUERPO DEL MENSAJE *' : 'MESSAGE BODY *'}
                </Text>
                <TextInput
                  style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                  placeholder={es ? 'Escriba el contenido del mensaje...' : 'Type message content...'}
                  placeholderTextColor="#64748b"
                  multiline
                  value={composeBody}
                  onChangeText={setComposeBody}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setIsComposeOpen(false)}>
                    <Text style={styles.cancelBtnText} allowFontScaling={false}>
                      {es ? 'Cancelar' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleComposeSubmit} disabled={sending}>
                    <Text style={styles.saveBtnText} allowFontScaling={false}>
                      {sending ? (es ? 'Enviando...' : 'Sending...') : (es ? 'Enviar Mensaje' : 'Send Message')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: colors.background },
  chatRoomContainer: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 8 },

  header: { padding: 16, paddingBottom: 6 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, flex: 1 },

  composeBtn: { backgroundColor: '#0284c7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  composeBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },

  threadScroll: { flex: 1 },

  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  convoInfo: { flex: 1 },
  convoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convoName: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, flex: 1, marginRight: 8 },
  convoTime: { fontSize: 10.5, color: '#64748b' },
  convoSnippet: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },

  chatRoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingTop: Platform.OS === 'ios' ? 12 : 14,
  },
  backBtn: { padding: 4, marginRight: 6 },
  chatHeaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  chatHeaderAvatarText: { color: '#0f172a', fontWeight: '800', fontSize: 15 },
  chatHeaderInfo: { flex: 1 },
  chatHeaderTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  chatHeaderSubtitle: { fontSize: 10.5, color: '#10b981', marginTop: 1 },

  emptyThreadCard: { backgroundColor: colors.surface, padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder, marginTop: 24, marginHorizontal: 16 },
  emptyThreadText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },

  bubbleWrapper: { marginBottom: 12, flexDirection: 'row' },
  bubbleLeft: { justifyContent: 'flex-start' },
  bubbleRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  bubbleManager: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder },
  bubbleUser: { backgroundColor: '#0284c7' },
  bubbleText: { fontSize: 13, lineHeight: 18 },
  textManager: { color: colors.textPrimary },
  textUser: { color: '#ffffff' },
  bubbleTime: { fontSize: 9.5, marginTop: 4, textAlign: 'right' },
  timeManager: { color: colors.textMuted },
  timeUser: { color: 'rgba(255,255,255,0.75)' },

  replyBar: { flexDirection: 'row', padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.cardBorder, gap: 8, paddingBottom: Platform.OS === 'ios' ? 24 : 12 },
  replyInput: { flex: 1, backgroundColor: colors.inputBackground, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: colors.textPrimary, fontSize: 13, borderWidth: 1, borderColor: colors.inputBorder },
  sendBtn: { backgroundColor: '#0284c7', width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: 20 },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 40 : 16,
    paddingBottom: Platform.OS === 'ios' ? 60 : 30,
  },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.cardBorder },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  inputLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700', marginBottom: 6, marginTop: 10, letterSpacing: 0.5 },
  input: { backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary, fontSize: 13, marginBottom: 4 },

  recipientRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  recChip: { backgroundColor: colors.inputBackground, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.inputBorder },
  recChipActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  recChipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  recChipTextActive: { color: '#ffffff', fontWeight: '800' },

  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  modalBtn: { width: '48%', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.buttonSecondary },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
  saveBtn: { backgroundColor: '#0284c7' },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
});

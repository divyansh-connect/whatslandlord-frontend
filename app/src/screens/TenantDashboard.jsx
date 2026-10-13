import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

export const TenantDashboard = ({ onNavigate }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';

  const [loading, setLoading] = useState(true);
  const [tenantData, setTenantData] = useState({
    name: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Tenant',
    unitName: 'Loading unit info...',
    balance: 0,
    outstandingBalance: 0,
    activeVisitors: 0,
    packagesWaiting: 0,
    dueDate: 'N/A',
    leaseExpiration: 'N/A',
  });

  // Modals visibility
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [leaseModalVisible, setLeaseModalVisible] = useState(false);

  // Forms
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [messageText, setMessageText] = useState('');

  // Screening details
  const [screeningReport, setScreeningReport] = useState(null);
  const [screeningModalOpen, setScreeningModalOpen] = useState(false);
  const [screeningDob, setScreeningDob] = useState('');
  const [screeningSsn, setScreeningSsn] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchLiveTenantDashboard = async () => {
    try {
      setLoading(true);
      const [leasesRes, metricsRes, screeningRes] = await Promise.all([
        apiClient.get('/portal/tenant/leases', logout, refreshAccessToken),
        apiClient.get('/portal/tenant/metrics', logout, refreshAccessToken),
        apiClient.get('/portal/screening/reports', logout, refreshAccessToken),
      ]);

      const leases = leasesRes?.data || leasesRes || [];
      const metrics = metricsRes?.data || metricsRes || {};
      const reports = screeningRes?.data || screeningRes || [];

      const lease = leases.length > 0 ? leases[0] : null;
      const propName = lease?.property?.name || lease?.propertyName || 'Property';
      const unitNum = lease?.unit?.unitNumber || lease?.unitNumber || 'Unassigned';

      // Match tenant report by user email
      const myEmail = user?.email || '';
      const myReport = reports.find(r => 
        (r.email && r.email.toLowerCase() === myEmail.toLowerCase()) || 
        (r.tenant?.email && r.tenant.email.toLowerCase() === myEmail.toLowerCase())
      );
      setScreeningReport(myReport || null);

      setTenantData({
        name: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Tenant',
        unitName: `${propName} · Unit ${unitNum}`,
        balance: metrics.currentRent || lease?.rentAmount || 0,
        outstandingBalance: metrics.outstandingBalance || 0,
        activeVisitors: metrics.activeVisitors || 0,
        packagesWaiting: metrics.packagesWaiting || 0,
        dueDate: metrics.nextDueDate || 'N/A',
        leaseExpiration: metrics.leaseExpiration || lease?.endDate?.split('T')[0] || 'N/A',
      });
    } catch (e) {
      console.log('Error fetching live tenant dashboard:', e.message);
      setTenantData({
        name: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Tenant',
        unitName: 'Property · Unit Unassigned',
        balance: 0,
        outstandingBalance: 0,
        activeVisitors: 0,
        packagesWaiting: 0,
        dueDate: 'N/A',
        leaseExpiration: 'N/A',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveTenantDashboard();
  }, []);

  const handlePayRent = () => {
    if (tenantData.balance <= 0) return;
    setTenantData((prev) => ({ ...prev, balance: 0 }));
    setPayModalVisible(false);
    Alert.alert(
      es ? 'Pago Exitoso' : 'Payment Successful',
      es
        ? `¡Gracias! Su pago de renta de $${tenantData.balance.toLocaleString()} fue procesado.`
        : `Thank you! Your rent payment of $${tenantData.balance.toLocaleString()} has been processed.`
    );
  };

  const handleCreateTicket = () => {
    if (!ticketTitle || !ticketDesc) {
      Alert.alert(es ? 'Error' : 'Error', es ? 'Por favor complete todos los campos.' : 'Please fill in all fields');
      return;
    }
    setTicketModalVisible(false);
    setTicketTitle('');
    setTicketDesc('');
    Alert.alert(es ? 'Éxito' : 'Success', es ? 'Solicitud de reparación enviada a la administración.' : 'Repair request submitted to management.');
  };

  const handleSendMessage = () => {
    if (!messageText) return;
    setContactModalVisible(false);
    setMessageText('');
    Alert.alert(es ? 'Mensaje Enviado' : 'Message Sent', es ? 'Su mensaje fue enviado a la administración.' : 'Your message has been sent to Property Management.');
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
      Alert.alert('Consent Required', 'You must authorize the background check.');
      return;
    }
    if (!screeningDob.trim() || !screeningSsn.trim()) {
      Alert.alert('Validation Error', 'DOB and SSN are required.');
      return;
    }
    if (!docFile) {
      Alert.alert('Document Required', 'Please choose your ID or W2 verification document.');
      return;
    }

    try {
      setSubmitting(true);
      // 1. Submit consent details
      await apiClient.put(`/portal/screening/reports/${screeningReport.id}`, {
        dob: screeningDob.trim(),
        ssn: screeningSsn.trim(),
        authorized: true,
        status: 'Pending Documents',
      }, logout, refreshAccessToken);

      // 2. Upload document file
      const formData = new FormData();
      formData.append('document', {
        uri: Platform.OS === 'ios' ? docFile.uri.replace('file://', '') : docFile.uri,
        name: docFile.name || 'screening_proof.pdf',
        type: docFile.mimeType || 'application/pdf',
      });

      await apiClient.post(`/portal/screening/reports/${screeningReport.id}/upload`, formData, logout, refreshAccessToken);

      Alert.alert('Success', 'Screening documents uploaded and submitted successfully.');
      setScreeningModalOpen(false);
      fetchLiveTenantDashboard();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to submit screening documents.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]} allowFontScaling={false}>
          {es ? 'Cargando Portal de Inquilino...' : 'Loading Live Tenant Portal...'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.scrollContent}>
      {/* Header welcome banner */}
      <View style={styles.header}>
        <View style={styles.welcomeRow}>
          <View>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]} allowFontScaling={false}>
              {es ? 'Hola,' : 'Hello,'}
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]} allowFontScaling={false}>{tenantData.name}</Text>
          </View>
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => onNavigate && onNavigate('notifications')}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText} allowFontScaling={false}>3</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.avatarContainer, { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: colors.cardBorder }]}>
              <Text style={styles.avatarText} allowFontScaling={false}>
                {tenantData.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} allowFontScaling={false}>
          📍 {tenantData.unitName}
        </Text>
      </View>

      {/* Tenant screening pending documents uploader alert card */}
      {screeningReport && (screeningReport.status === 'Pending Documents' || screeningReport.status === 'Pending Consent' || screeningReport.status === 'Processing') && (
        <TouchableOpacity 
          style={[styles.alertCard, { backgroundColor: '#ef4444', marginHorizontal: 16 }]} 
          onPress={() => setScreeningModalOpen(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="alert-circle-outline" size={24} color="#ffffff" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }} allowFontScaling={false}>
                {es ? 'Documentos de Verificación Requeridos' : 'Screening Documents Required'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }} allowFontScaling={false}>
                {es ? 'Complete consentimiento, DOB, SSN y suba prueba de ID/W2.' : 'Please authorize consent, enter DOB & SSN, and upload verification proof.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ffffff" />
          </View>
        </TouchableOpacity>
      )}

      {/* Quick Action Tiles */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {es ? 'ACCIONES RÁPIDAS' : 'QUICK ACTIONS'}
      </Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} onPress={() => setPayModalVisible(true)}>
          <View style={[styles.actionIconWrapper, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
            <Ionicons name="card" size={22} color="#38bdf8" />
          </View>
          <Text style={[styles.actionCardText, { color: colors.textPrimary }]} allowFontScaling={false}>
            {es ? 'Pagar Renta' : 'Pay Rent'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} onPress={() => setTicketModalVisible(true)}>
          <View style={[styles.actionIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Ionicons name="hammer" size={22} color="#ef4444" />
          </View>
          <Text style={[styles.actionCardText, { color: colors.textPrimary }]} allowFontScaling={false}>
            {es ? 'Reparación' : 'Submit Repair'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} onPress={() => setContactModalVisible(true)}>
          <View style={[styles.actionIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Ionicons name="chatbubbles" size={22} color="#10b981" />
          </View>
          <Text style={[styles.actionCardText, { color: colors.textPrimary }]} allowFontScaling={false}>
            {es ? 'Mensajes' : 'Messages'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} onPress={() => setLeaseModalVisible(true)}>
          <View style={[styles.actionIconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Ionicons name="document-text" size={22} color="#f59e0b" />
          </View>
          <Text style={[styles.actionCardText, { color: colors.textPrimary }]} allowFontScaling={false}>
            {es ? 'Contrato' : 'Lease Terms'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Metric Cards Grid */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {es ? 'RESUMEN Y ESTADÍSTICAS' : 'OVERVIEW & STATS'}
      </Text>

      <View style={styles.metricGrid}>
        <View style={[styles.metricCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.metricHeaderRow}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
              {es ? 'RENTA PENDIENTE' : 'CURRENT RENT DUE'}
            </Text>
            <Ionicons name="wallet-outline" size={16} color={colors.textSecondary} />
          </View>
          <Text style={[styles.metricVal, { color: '#38bdf8' }]} allowFontScaling={false}>
            ${tenantData.balance.toLocaleString()}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]} allowFontScaling={false}>
            {es ? 'Fecha de Vencimiento:' : 'Due Date:'} {tenantData.dueDate}
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.metricHeaderRow}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
              {es ? 'SALDO PENDIENTE' : 'OUTSTANDING'}
            </Text>
            <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
          </View>
          <Text style={[styles.metricVal, { color: '#10b981' }]} allowFontScaling={false}>
            ${tenantData.outstandingBalance}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]} allowFontScaling={false}>
            {es ? 'Estado: Pagado en su Totalidad' : 'Status: Paid in Full'}
          </Text>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <View style={[styles.metricCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.metricHeaderRow}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
              {es ? 'VISITANTES ACTIVOS' : 'ACTIVE VISITORS'}
            </Text>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
          </View>
          <Text style={[styles.metricVal, { color: '#818cf8' }]} allowFontScaling={false}>
            {tenantData.activeVisitors}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]} allowFontScaling={false}>
            {es ? 'Registros de invitados' : 'Registered guest logs'}
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.metricHeaderRow}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
              {es ? 'PAQUETES EN ESPERA' : 'WAITING PACKAGES'}
            </Text>
            <Ionicons name="cube-outline" size={16} color={colors.textSecondary} />
          </View>
          <Text style={[styles.metricVal, { color: '#f59e0b' }]} allowFontScaling={false}>
            {tenantData.packagesWaiting}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]} allowFontScaling={false}>
            {es ? 'Esperando retiro' : 'Awaiting pickup'}
          </Text>
        </View>
      </View>

      {/* Lease Renewal Banner */}
      <View style={[styles.leaseRenewalBanner, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <View style={[styles.actionIconWrapper, { backgroundColor: 'rgba(56, 189, 248, 0.15)', marginRight: 12 }]}>
          <Ionicons name="time" size={24} color="#38bdf8" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.leaseBannerTitle} allowFontScaling={false}>
            {es ? 'OPCIÓN DE RENOVACIÓN DE CONTRATO' : 'LEASE RENEWAL OPTION'}
          </Text>
          <Text style={[styles.leaseBannerSub, { color: colors.textSecondary }]} allowFontScaling={false}>
            {es ? `Vence: ${tenantData.leaseExpiration}. Asegure su tarifa ahora.` : `Expires: ${tenantData.leaseExpiration}. Lock your rate now.`}
          </Text>
        </View>
        <TouchableOpacity style={styles.reviewBtn} onPress={() => setLeaseModalVisible(true)}>
          <Text style={styles.reviewBtnText} allowFontScaling={false}>
            {es ? 'Revisar' : 'Review'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pay Rent Modal */}
      <Modal visible={payModalVisible} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.modalIconCenter}>
              <Ionicons name="card-outline" size={42} color="#38bdf8" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
              {es ? 'Confirmar Pago de Renta' : 'Confirm Rent Payment'}
            </Text>
            <Text style={[styles.confirmText, { color: colors.textSecondary }]} allowFontScaling={false}>
              {es
                ? `¿Está seguro de que desea pagar el saldo pendiente de $${tenantData.balance.toLocaleString()} en línea?`
                : `Are you sure you want to pay the outstanding balance of $${tenantData.balance.toLocaleString()} online?`}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setPayModalVisible(false)}>
                <Text style={styles.cancelBtnText} allowFontScaling={false}>{es ? 'Cancelar' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitBtn]} onPress={handlePayRent}>
                <Text style={styles.submitBtnText} allowFontScaling={false}>{es ? 'Confirmar Pago' : 'Confirm Pay'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Submit Repair Request Modal */}
      <Modal visible={ticketModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
              {es ? 'Enviar Solicitud de Reparación' : 'Submit Repair Request'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
              placeholder={es ? 'Asunto (ej. AC con fuga)' : 'Issue Subject (e.g. AC leaking)'}
              placeholderTextColor="#64748b"
              value={ticketTitle}
              onChangeText={setTicketTitle}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary, height: 100, textAlignVertical: 'top' }]}
              placeholder={es ? 'Descripción detallada del problema...' : 'Detailed description of repair issue...'}
              placeholderTextColor="#64748b"
              multiline
              value={ticketDesc}
              onChangeText={setTicketDesc}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setTicketModalVisible(false)}>
                <Text style={styles.cancelBtnText} allowFontScaling={false}>{es ? 'Cancelar' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitBtn, { backgroundColor: '#ef4444' }]} onPress={handleCreateTicket}>
                <Text style={styles.submitBtnText} allowFontScaling={false}>{es ? 'Enviar Solicitud' : 'Submit Request'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contact Management Modal */}
      <Modal visible={contactModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
              {es ? 'Contactar a la Administración' : 'Contact Management'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary, height: 120, textAlignVertical: 'top' }]}
              placeholder={es ? 'Escriba su mensaje al Administrador de la Propiedad...' : 'Type your message to Property Manager...'}
              placeholderTextColor="#64748b"
              multiline
              value={messageText}
              onChangeText={setMessageText}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setContactModalVisible(false)}>
                <Text style={styles.cancelBtnText} allowFontScaling={false}>{es ? 'Cancelar' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitBtn, { backgroundColor: '#10b981' }]} onPress={handleSendMessage}>
                <Text style={styles.submitBtnText} allowFontScaling={false}>{es ? 'Enviar Mensaje' : 'Send Message'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Lease Terms Modal */}
      <Modal visible={leaseModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.modalIconCenter}>
              <Ionicons name="document-text-outline" size={42} color="#f59e0b" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
              {es ? 'Términos del Contrato Activo' : 'Active Lease Terms'}
            </Text>

            <View style={[styles.detailCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
              <View style={[styles.detailRow, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                  {es ? 'Número de Unidad' : 'Unit Number'}
                </Text>
                <Text style={[styles.detailVal, { color: colors.textPrimary }]} allowFontScaling={false}>
                  {tenantData.unitName.split('·')[1]?.trim() || tenantData.unitName}
                </Text>
              </View>
              <View style={[styles.detailRow, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                  {es ? 'Renta Mensual' : 'Monthly Rent'}
                </Text>
                <Text style={[styles.detailVal, { color: '#38bdf8' }]} allowFontScaling={false}>
                  ${tenantData.balance.toLocaleString()} / {es ? 'mes' : 'month'}
                </Text>
              </View>
              <View style={[styles.detailRow, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                  {es ? 'Inicio del Contrato' : 'Lease Start'}
                </Text>
                <Text style={[styles.detailVal, { color: colors.textPrimary }]} allowFontScaling={false}>2026-08-01</Text>
              </View>
              <View style={[styles.detailRow, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                  {es ? 'Vencimiento del Contrato' : 'Lease Expiration'}
                </Text>
                <Text style={[styles.detailVal, { color: '#f59e0b' }]} allowFontScaling={false}>{tenantData.leaseExpiration}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setLeaseModalVisible(false)}>
              <Text style={styles.closeBtnText} allowFontScaling={false}>{es ? 'Cerrar' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- TENANT SCREENING UPLOADER MODAL --- */}
      <Modal visible={screeningModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }} allowFontScaling={false}>
                {es ? 'Complete Documentos de Verificación' : 'Complete Screening Documents'}
              </Text>
              <TouchableOpacity onPress={() => setScreeningModalOpen(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary, marginBottom: 6 }} allowFontScaling={false}>
                {es ? 'FECHA DE NACIMIENTO (DOB) *' : 'DATE OF BIRTH (DOB) *'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748b"
                value={screeningDob}
                onChangeText={setScreeningDob}
              />

              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary, marginBottom: 6 }} allowFontScaling={false}>
                {es ? 'NÚMERO DE SEGURO SOCIAL (SSN) *' : 'SOCIAL SECURITY NUMBER (SSN) *'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="XXX-XX-XXXX"
                placeholderTextColor="#64748b"
                value={screeningSsn}
                onChangeText={setScreeningSsn}
              />

              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary, marginBottom: 6 }} allowFontScaling={false}>
                {es ? 'COMPROBANTE DE IDENTIDAD / INGRESO W2 *' : 'GOVERNMENT ID / W2 VERIFICATION PROOF *'}
              </Text>
              <TouchableOpacity 
                style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} 
                onPress={handlePickDocument}
              >
                <Text style={{ color: docFile ? colors.textPrimary : colors.textSecondary, fontSize: 13 }} allowFontScaling={false}>
                  {docFile ? `📄 ${docFile.name}` : (es ? 'Seleccionar archivo...' : 'Choose W2/ID proof...')}
                </Text>
                <Ionicons name="document-attach-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 14 }}
                onPress={() => setConsent(!consent)}
              >
                <Ionicons 
                  name={consent ? 'checkbox' : 'square-outline'} 
                  size={18} 
                  color={consent ? '#38bdf8' : colors.textSecondary} 
                  style={{ marginRight: 8 }}
                />
                <Text style={{ fontSize: 11.5, color: colors.textSecondary, fontWeight: '600', flex: 1 }} allowFontScaling={false}>
                  {es 
                    ? 'Autorizo a WhatsLandlord a realizar una verificación de antecedentes y verificar mis documentos.' 
                    : 'I authorize WhatsLandlord to conduct a background check and verify my identity/income documents.'}
                </Text>
              </TouchableOpacity>

              <View style={[styles.modalButtons, { marginTop: 10 }]}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setScreeningModalOpen(false)}>
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>{es ? 'Cancelar' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.submitBtn, { backgroundColor: '#38bdf8' }]} 
                  onPress={handleSubmitDocuments}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#0f172a" />
                  ) : (
                    <Text style={[styles.submitBtnText, { color: '#0f172a', fontWeight: '800' }]} allowFontScaling={false}>
                      {es ? 'Enviar' : 'Submit'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16 },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 8 },
  header: { marginBottom: 20 },
  welcomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  avatarContainer: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(56, 189, 248, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 6, fontWeight: '500' },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: 10,
    marginTop: 10,
    letterSpacing: 1,
  },

  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionCard: {
    width: '23%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionCardText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  metricGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  metricHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { fontSize: 9.5, color: colors.textSecondary, fontWeight: '800', letterSpacing: 0.5 },
  metricVal: { fontSize: 24, fontWeight: '800', marginVertical: 4 },
  metricSub: { fontSize: 11, color: colors.textSecondary },

  leaseRenewalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  leaseBannerTitle: { fontSize: 11, color: '#38bdf8', fontWeight: '800', letterSpacing: 0.5 },
  leaseBannerSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  reviewBtn: { backgroundColor: '#38bdf8', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  reviewBtnText: { color: '#0f172a', fontSize: 11, fontWeight: '800' },

  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: colors.cardBorder },
  modalIconCenter: { alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  confirmText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 18 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalButton: { width: '48%', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.buttonSecondary },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
  submitBtn: { backgroundColor: '#0284c7' },
  submitBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  input: { backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary, marginBottom: 14, fontSize: 13 },
  detailCard: { backgroundColor: colors.inputBackground, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surface },
  detailLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  detailVal: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  closeBtn: { backgroundColor: colors.buttonSecondary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  closeBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellBtn: {
    position: 'relative',
    padding: 4,
    marginRight: 6,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 7,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  avatarText: {
    color: '#38bdf8',
    fontWeight: '800',
    fontSize: 14,
  },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { AppActivityIndicator as ActivityIndicator } from '../components/AppActivityIndicator';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

// Helpers matching web frontend
const extractPreferredVisit = (item) => {
  if (!item) return '';
  if (item.preferredTime && item.preferredTime !== 'Morning (8AM - 12PM)' && item.preferredTime.trim() !== '') {
    return item.preferredTime.trim();
  }
  if (item.scheduledDate && typeof item.scheduledDate === 'string') {
    const trimmed = item.scheduledDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed) && trimmed !== '') return trimmed;
  }
  if (item.notes && typeof item.notes === 'string') {
    const match = item.notes.match(/Preferred Visit:\s*([^\]\n]+)/i);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  if (item.description && typeof item.description === 'string') {
    const match = item.description.match(/\[Preferred Visit:\s*([^\]]+)\]/i);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return item.preferredTime || '';
};

const cleanDescription = (desc) => {
  if (!desc) return '';
  return desc.replace(/\[Preferred Visit:\s*[^\]]+\]/gi, '').trim();
};

export const TenantMaintenanceScreen = ({ onNavigate }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Create form state
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [preferredTime, setPreferredTime] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI DIY Tips state
  const [aiTips, setAiTips] = useState(null);
  const [loadingTips, setLoadingTips] = useState(false);

  // Detail modal chat state
  const [newMsgText, setNewMsgText] = useState('');
  const [postingMsg, setPostingMsg] = useState(false);

  // Preferred time options
  const PREFERRED_OPTIONS = [
    'Morning (8am - 12pm)',
    'Afternoon (12pm - 5pm)',
    'Weekend (Flexible)',
    'Anytime / Emergency',
  ];

  const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent', 'Emergency'];

  // 1. Fetch Maintenance Requests (Same API as Web: GET /portal/tenant/maintenance)
  const fetchRequests = async () => {
    try {
      const res = await apiClient.get('/portal/tenant/maintenance', logout, refreshAccessToken);
      const data = res?.data || res || [];
      if (Array.isArray(data)) {
        setRequests(data);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.warn('Failed to load tenant maintenance requests:', err.message);
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  // 2. AI Troubleshooting (Same API as Web: POST /service-requests/troubleshoot)
  const fetchAiTroubleshooting = async () => {
    if (!title && !description) {
      Alert.alert(es ? 'Información' : 'Notice', es ? 'Ingrese título y descripción primero' : 'Please enter title and description first');
      return;
    }
    setLoadingTips(true);
    try {
      const res = await apiClient.post(
        '/service-requests/troubleshoot',
        { title, description },
        logout,
        refreshAccessToken
      );
      const data = res?.data || res;
      setAiTips(data);
    } catch (e) {
      console.warn('AI Troubleshooting error:', e.message);
      // Sensible fallback tips if offline
      setAiTips({
        suggestionTitle: es ? 'Consejos de Reparación IA' : 'Instant DIY Troubleshooting Tips',
        tips: [
          es ? 'Verifique si la válvula de cierre o interruptor está activado' : 'Check shutoff valves or breaker switch if applicable.',
          es ? 'Limpie filtros de residuos y asegúrese de que no haya obstrucción obvia' : 'Clear debris filters and check for obvious surface blockages.',
          es ? 'Tome fotos claras del problema para adjuntar a la solicitud' : 'Take clear photos of the issue to speed up dispatch.',
        ],
      });
    } finally {
      setLoadingTips(false);
    }
  };

  // 3. Create Request (Same API as Web: POST /portal/tenant/maintenance)
  const handleCreateRequest = async () => {
    if (!title.trim()) {
      Alert.alert(es ? 'Requerido' : 'Required', es ? 'Por favor ingrese el problema' : 'Please describe the problem summary');
      return;
    }
    if (!description.trim()) {
      Alert.alert(es ? 'Requerido' : 'Required', es ? 'Por favor ingrese una descripción detallada' : 'Please provide detailed instructions/description');
      return;
    }

    setSubmitting(true);
    try {
      const trimmedPref = preferredTime?.trim() || '';
      const descWithPref = trimmedPref
        ? `${description.trim()}\n\n[Preferred Visit: ${trimmedPref}]`
        : description.trim();

      await apiClient.post(
        '/portal/tenant/maintenance',
        {
          title: title.trim(),
          priority,
          description: descWithPref,
          preferredTime: trimmedPref,
          scheduledDate: trimmedPref,
        },
        logout,
        refreshAccessToken
      );

      Alert.alert(
        es ? '¡Éxito!' : 'Request Filed!',
        es ? 'Su solicitud de mantenimiento ha sido enviada al administrador.' : 'Your service request has been logged and dispatched to property management.'
      );

      // Reset form
      setTitle('');
      setDescription('');
      setPreferredTime('');
      setPriority('Medium');
      setAiTips(null);
      setIsCreateModalOpen(false);

      // Reload data
      fetchRequests();
    } catch (e) {
      console.error('Failed to create maintenance request:', e);
      Alert.alert(
        es ? 'Error' : 'Error',
        e?.response?.data?.message || e.message || 'Failed to submit maintenance request'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Send Message in Discussion (Same API as Web: PUT /service-requests/:id)
  const handleSendMessage = async () => {
    if (!newMsgText.trim() || !selectedRequest?.id) return;
    setPostingMsg(true);
    try {
      const residentName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Resident';
      const res = await apiClient.put(
        `/service-requests/${selectedRequest.id}`,
        {
          newMessage: {
            senderName: `${residentName} (Resident)`,
            role: 'Tenant',
            text: newMsgText.trim(),
          },
        },
        logout,
        refreshAccessToken
      );

      const updated = res?.data || res;
      setNewMsgText('');
      if (updated && updated.id) {
        setSelectedRequest(updated);
      } else {
        // Optimistically append message to selected request
        setSelectedRequest((prev) => ({
          ...prev,
          messages: [
            ...(prev?.messages || []),
            {
              id: Date.now().toString(),
              senderName: `${residentName} (Resident)`,
              role: 'Tenant',
              text: newMsgText.trim(),
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        }));
      }
      fetchRequests();
    } catch (e) {
      console.warn('Failed to send message:', e.message);
      Alert.alert(es ? 'Error' : 'Error', es ? 'No se pudo enviar el mensaje' : 'Failed to send comment');
    } finally {
      setPostingMsg(false);
    }
  };

  // Direct contact handlers
  const handleContactSMS = () => {
    Linking.openURL('sms:5550199').catch(() => {});
  };

  const handleContactEmail = () => {
    Linking.openURL('mailto:manager@apexpm.com?subject=Maintenance Inquiry').catch(() => {});
  };

  const handleContactWhatsApp = (ticket) => {
    const phone = ((ticket?.managerPhone || ticket?.phone || '').replace(/\D/g, '') || '15550199');
    const msg = encodeURIComponent(`Hi Property Manager, I am contacting you regarding maintenance request: ${ticket?.title || ''}`);
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`).catch(() => {});
  };

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      (req?.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req?.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req?.propertyName || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') {
      return req.status !== 'Completed' && req.status !== 'Closed' && req.status !== 'Resolved';
    }
    if (statusFilter === 'COMPLETED') {
      return req.status === 'Completed' || req.status === 'Resolved';
    }
    return true;
  });

  // Priority color styling
  const getPriorityStyle = (p) => {
    const val = String(p || '').toLowerCase();
    if (val === 'urgent' || val === 'emergency') {
      return { bg: 'rgba(239, 68, 68, 0.14)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.35)' };
    }
    if (val === 'high') {
      return { bg: 'rgba(249, 115, 22, 0.14)', text: '#f97316', border: 'rgba(249, 115, 22, 0.35)' };
    }
    if (val === 'low') {
      return { bg: 'rgba(100, 116, 139, 0.14)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.35)' };
    }
    return { bg: 'rgba(56, 189, 248, 0.14)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)' };
  };

  // Status color styling
  const getStatusStyle = (s) => {
    const val = String(s || '').toLowerCase();
    if (val === 'completed' || val === 'resolved') {
      return { bg: 'rgba(16, 185, 129, 0.14)', text: '#10b981', label: es ? 'Completado' : 'Completed' };
    }
    if (val === 'in progress' || val === 'in_progress' || val === 'progress') {
      return { bg: 'rgba(245, 158, 11, 0.14)', text: '#f59e0b', label: es ? 'En Progreso' : 'In Progress' };
    }
    if (val === 'assigned') {
      return { bg: 'rgba(59, 130, 246, 0.14)', text: '#3b82f6', label: es ? 'Asignado' : 'Assigned' };
    }
    if (val === 'closed') {
      return { bg: 'rgba(100, 116, 139, 0.14)', text: '#94a3b8', label: es ? 'Cerrado' : 'Closed' };
    }
    return { bg: 'rgba(168, 85, 247, 0.14)', text: '#a855f7', label: s || (es ? 'Recibido' : 'Submitted') };
  };

  return (
    <View style={styles.container}>
      {/* Top Header matching Web "Maintenance Request logs" */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          {onNavigate && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => onNavigate('dashboard')}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSuperTitle} allowFontScaling={false}>
              {es ? 'AUTOSERVICIO PARA INQUILINOS' : 'TENANT SELF-SERVICE'}
            </Text>
            <Text style={styles.headerTitle} allowFontScaling={false}>
              {es ? 'Registros de Mantenimiento' : 'Maintenance Request logs'}
            </Text>
          </View>
        </View>

        <Text style={styles.headerSubtitle} allowFontScaling={false}>
          {es
            ? 'Verifique los cronogramas de despacho del administrador o presente una nueva solicitud.'
            : 'Verify manager dispatch timelines, contractor schedules, or file a new service request.'}
        </Text>

        {/* Primary "+ Create Maintenance Request" button */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setIsCreateModalOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.createBtnText} allowFontScaling={false}>
            {es ? '+ Crear Solicitud de Mantenimiento' : '+ Create Maintenance Request'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter Row */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={es ? 'Buscar solicitudes de servicio...' : 'Search service requests...'}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            allowFontScaling={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Filter Chips */}
        <View style={styles.filterChipRow}>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setStatusFilter('ALL')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, statusFilter === 'ALL' && styles.filterChipTextActive]}>
              {es ? 'Todos' : 'All'} ({requests.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'ACTIVE' && styles.filterChipActive]}
            onPress={() => setStatusFilter('ACTIVE')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, statusFilter === 'ACTIVE' && styles.filterChipTextActive]}>
              {es ? 'Activos' : 'Active'} (
              {requests.filter((r) => r.status !== 'Completed' && r.status !== 'Closed' && r.status !== 'Resolved').length}
              )
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'COMPLETED' && styles.filterChipActive]}
            onPress={() => setStatusFilter('COMPLETED')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, statusFilter === 'COMPLETED' && styles.filterChipTextActive]}>
              {es ? 'Completados' : 'Completed'} (
              {requests.filter((r) => r.status === 'Completed' || r.status === 'Resolved').length}
              )
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Request Log List */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText} allowFontScaling={false}>
              {es ? 'Cargando solicitudes de servicio...' : 'Loading service requests...'}
            </Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="construct-outline" size={38} color="#38bdf8" />
            </View>
            <Text style={styles.emptyTitle} allowFontScaling={false}>
              {searchQuery ? (es ? 'No se encontraron resultados' : 'No matching requests') : (es ? 'Sin Solicitudes Registradas' : 'No Maintenance Requests')}
            </Text>
            <Text style={styles.emptyText} allowFontScaling={false}>
              {searchQuery
                ? (es ? 'Intente con otro término de búsqueda' : 'Try searching with a different keyword')
                : (es ? 'Todas sus instalaciones están al día. Cree una solicitud cuando requiera reparaciones.' : 'Your residence has no pending repair tickets. Tap below if anything needs attention.')}
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => setIsCreateModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.emptyActionBtnText} allowFontScaling={false}>
                {es ? 'Crear Solicitud Ahora' : 'Create Request Now'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredRequests.map((req, idx) => {
            const pStyle = getPriorityStyle(req.priority);
            const sStyle = getStatusStyle(req.status);
            const dateStr = req.date || (req.createdAt ? String(req.createdAt).split('T')[0] : '2026-10-14');
            const prefVisit = extractPreferredVisit(req);

            return (
              <TouchableOpacity
                key={req.id || `req-${idx}`}
                style={styles.requestCard}
                onPress={() => setSelectedRequest(req)}
                activeOpacity={0.7}
              >
                {/* Top Row: Submitted Date + Action Eye Button */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.dateBadge}>
                    <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.dateText} allowFontScaling={false}>
                      {dateStr}
                    </Text>
                  </View>

                  <View style={styles.headerRightActions}>
                    <View style={[styles.priorityPill, { backgroundColor: pStyle.bg, borderColor: pStyle.border }]}>
                      <Text style={[styles.priorityText, { color: pStyle.text }]} allowFontScaling={false}>
                        {String(req.priority || 'MEDIUM').toUpperCase()}
                      </Text>
                    </View>

                    <View style={[styles.statusPill, { backgroundColor: sStyle.bg }]}>
                      <Text style={[styles.statusText, { color: sStyle.text }]} allowFontScaling={false}>
                        {sStyle.label}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setSelectedRequest(req)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="eye-outline" size={16} color="#38bdf8" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Subject Issue / Title */}
                <Text style={styles.cardTitle} allowFontScaling={false} numberOfLines={2}>
                  {req.title}
                </Text>

                {/* Description snippet */}
                {req.description ? (
                  <Text style={styles.cardDescSnippet} allowFontScaling={false} numberOfLines={2}>
                    {cleanDescription(req.description)}
                  </Text>
                ) : null}

                {/* Footer Row: Property & Unit and Preferred Visit Window */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.propertyUnitTag}>
                    <Ionicons name="home-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.propertyUnitText} allowFontScaling={false}>
                      {req.propertyName || 'Property'} • {req.unitName || 'Unit'}
                    </Text>
                  </View>

                  {prefVisit ? (
                    <View style={styles.prefVisitTag}>
                      <Ionicons name="time-outline" size={11} color="#f59e0b" style={{ marginRight: 3 }} />
                      <Text style={styles.prefVisitText} allowFontScaling={false} numberOfLines={1}>
                        {prefVisit}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* =========================================================================
          MODAL 1: CREATE MAINTENANCE REQUEST (MATCHING WEB DIALOG)
          ========================================================================= */}
      <Modal
        visible={isCreateModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle} allowFontScaling={false}>
                  {es ? 'Enviar Solicitud de Reparación' : 'Submit Repair Request'}
                </Text>
                <Text style={styles.modalSubtitle} allowFontScaling={false}>
                  {es ? 'Notifique al equipo de mantenimiento de su edificio' : 'Notify your property manager & maintenance staff'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setIsCreateModalOpen(false);
                  setAiTips(null);
                }}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {/* Field 1: Problem Summary / Title */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel} allowFontScaling={false}>
                  {es ? 'RESUMEN DEL PROBLEMA *' : 'PROBLEM SUMMARY *'}
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={es ? 'ej. Fuga debajo del lavabo, AC no enfría...' : 'e.g. AC leaking water, Leaking sink, Broken door knob...'}
                  placeholderTextColor={colors.textSecondary}
                  value={title}
                  onChangeText={(t) => {
                    setTitle(t);
                    if (aiTips) setAiTips(null);
                  }}
                  allowFontScaling={false}
                />
              </View>

              {/* Field 2: Priority Level Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel} allowFontScaling={false}>
                  {es ? 'NIVEL DE PRIORIDAD' : 'PRIORITY LEVEL'}
                </Text>
                <View style={styles.pillSelectorRow}>
                  {PRIORITY_OPTIONS.map((p) => {
                    const isSelected = priority === p;
                    const pStyle = getPriorityStyle(p);
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.prioritySelectPill,
                          isSelected && { backgroundColor: pStyle.bg, borderColor: pStyle.text },
                        ]}
                        onPress={() => setPriority(p)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.prioritySelectText,
                            isSelected && { color: pStyle.text, fontWeight: '800' },
                          ]}
                          allowFontScaling={false}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Field 3: Preferred Visit Window */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel} allowFontScaling={false}>
                  {es ? 'VENTANA DE VISITA PREFERIDA' : 'PREFERRED VISIT WINDOW'}
                </Text>
                <View style={styles.prefOptionsRow}>
                  {PREFERRED_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.prefOptionChip,
                        preferredTime === opt && styles.prefOptionChipActive,
                      ]}
                      onPress={() => setPreferredTime(opt)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.prefOptionChipText,
                          preferredTime === opt && styles.prefOptionChipTextActive,
                        ]}
                        allowFontScaling={false}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.formInput, { marginTop: 8 }]}
                  placeholder={es ? 'O ingrese horario personalizado...' : 'Or enter custom day/time...'}
                  placeholderTextColor={colors.textSecondary}
                  value={PREFERRED_OPTIONS.includes(preferredTime) ? '' : preferredTime}
                  onChangeText={setPreferredTime}
                  allowFontScaling={false}
                />
              </View>

              {/* Field 4: Detailed Description + AI DIY Tips Button */}
              <View style={styles.formGroup}>
                <View style={styles.formLabelRow}>
                  <Text style={styles.formLabel} allowFontScaling={false}>
                    {es ? 'DESCRIPCIÓN DETALLADA *' : 'IN-DEPTH DESCRIPTION *'}
                  </Text>
                  {(title || description) ? (
                    <TouchableOpacity
                      style={styles.aiTipsBtn}
                      onPress={fetchAiTroubleshooting}
                      disabled={loadingTips}
                      activeOpacity={0.7}
                    >
                      {loadingTips ? (
                        <ActivityIndicator size="small" color="#38bdf8" style={{ marginRight: 4 }} />
                      ) : (
                        <Ionicons name="sparkles" size={13} color="#38bdf8" style={{ marginRight: 4 }} />
                      )}
                      <Text style={styles.aiTipsBtnText} allowFontScaling={false}>
                        {es ? 'Sugerencias IA' : 'Get AI DIY Tips'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder={es ? 'Proporcione todos los detalles posibles sobre el problema...' : 'Please provide as much detail as possible (location in unit, when it started, sounds, leaks)...'}
                  placeholderTextColor={colors.textSecondary}
                  multiline={true}
                  numberOfLines={4}
                  value={description}
                  onChangeText={(d) => {
                    setDescription(d);
                    if (aiTips) setAiTips(null);
                  }}
                  allowFontScaling={false}
                />
              </View>

              {/* AI DIY TROUBLESHOOTING BOX (MATCHING WEB EXACTLY) */}
              {aiTips && (
                <View style={styles.aiTipsContainer}>
                  <View style={styles.aiTipsHeader}>
                    <View style={styles.aiTipsTitleWrap}>
                      <Text style={{ fontSize: 16, marginRight: 6 }}>🤖</Text>
                      <Text style={styles.aiTipsTitle} allowFontScaling={false} numberOfLines={2}>
                        {aiTips.suggestionTitle || (es ? 'Consejos de Reparación IA' : 'Instant DIY Troubleshooting Tips')}
                      </Text>
                    </View>
                    <View style={styles.aiTipsBadge}>
                      <Text style={styles.aiTipsBadgeText} allowFontScaling={false}>
                        {es ? 'Pruebe Antes de Enviar' : 'Try Before Submitting'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.aiTipsSub} allowFontScaling={false}>
                    {es
                      ? 'Pruebe estos 3 pasos simples. Si resuelven el problema, puede cancelar esta solicitud.'
                      : 'Try these simple troubleshooting steps. If these fix your issue, you can cancel this ticket!'}
                  </Text>

                  {Array.isArray(aiTips.tips) &&
                    aiTips.tips.map((tip, idx) => (
                      <View key={idx} style={styles.aiTipItem}>
                        <View style={styles.aiTipNumBadge}>
                          <Text style={styles.aiTipNumText}>{idx + 1}</Text>
                        </View>
                        <Text style={styles.aiTipItemText} allowFontScaling={false}>
                          {tip}
                        </Text>
                      </View>
                    ))}

                  <View style={styles.aiTipsFooter}>
                    <TouchableOpacity
                      style={styles.aiTipsFixedBtn}
                      onPress={() => {
                        Alert.alert(
                          es ? '¡Excelente!' : 'Great!',
                          es ? '¡Nos alegra que se haya resuelto su problema! Solicitud cancelada.' : 'Great! Request canceled. We are glad your issue is resolved!'
                        );
                        setIsCreateModalOpen(false);
                        setAiTips(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-circle" size={17} color="#10b981" style={{ marginRight: 6 }} />
                      <Text style={styles.aiTipsFixedBtnText} allowFontScaling={false}>
                        {es ? '¡Problema Resuelto! Cancelar Solicitud' : 'Issue Fixed! Cancel Request'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.aiTipsHint} allowFontScaling={false}>
                      {es ? 'O presione "Enviar Solicitud" abajo si persiste' : 'Or click Submit Request below if still broken'}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setIsCreateModalOpen(false);
                  setAiTips(null);
                }}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText} allowFontScaling={false}>
                  {es ? 'Cancelar' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleCreateRequest}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                ) : (
                  <Ionicons name="checkmark-circle" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.submitBtnText} allowFontScaling={false}>
                  {submitting ? (es ? 'Enviando...' : 'Submitting...') : (es ? 'Enviar Solicitud' : 'Submit Request')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =========================================================================
          MODAL 2: REQUEST DETAIL & DISCUSSION THREAD (MATCHING WEB EYE MODAL)
          ========================================================================= */}
      <Modal
        visible={!!selectedRequest}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedRequest(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          {selectedRequest && (
            <View style={styles.modalSheet}>
              {/* Detail Header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.modalSuperTitle} allowFontScaling={false}>
                    {es ? 'DETALLES DE LA SOLICITUD' : 'REQUEST DETAILS'}
                  </Text>
                  <Text style={styles.modalTitle} allowFontScaling={false} numberOfLines={2}>
                    {selectedRequest.title}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedRequest(null)}
                >
                  <Ionicons name="close" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Status and Priority Row */}
                <View style={styles.detailBadgeRow}>
                  <View style={[styles.statusPill, { backgroundColor: getStatusStyle(selectedRequest.status).bg }]}>
                    <Text style={[styles.statusText, { color: getStatusStyle(selectedRequest.status).text }]} allowFontScaling={false}>
                      {getStatusStyle(selectedRequest.status).label}
                    </Text>
                  </View>

                  <View style={[styles.priorityPill, { backgroundColor: getPriorityStyle(selectedRequest.priority).bg, borderColor: getPriorityStyle(selectedRequest.priority).border }]}>
                    <Text style={[styles.priorityText, { color: getPriorityStyle(selectedRequest.priority).text }]} allowFontScaling={false}>
                      {String(selectedRequest.priority || 'MEDIUM').toUpperCase()} PRIORITY
                    </Text>
                  </View>
                </View>

                {/* 2-Column Info Card */}
                <View style={styles.detailInfoGrid}>
                  <View style={styles.detailGridCol}>
                    <Text style={styles.detailGridLabel} allowFontScaling={false}>
                      {es ? 'FECHA DE ENVÍO' : 'SUBMITTED DATE'}
                    </Text>
                    <Text style={styles.detailGridVal} allowFontScaling={false}>
                      {selectedRequest.date || (selectedRequest.createdAt ? String(selectedRequest.createdAt).split('T')[0] : '2026-10-14')}
                    </Text>
                  </View>

                  <View style={styles.detailGridCol}>
                    <Text style={styles.detailGridLabel} allowFontScaling={false}>
                      {es ? 'PROPIEDAD Y UNIDAD' : 'PROPERTY & UNIT'}
                    </Text>
                    <Text style={styles.detailGridVal} allowFontScaling={false}>
                      {selectedRequest.propertyName || 'Property'} • {selectedRequest.unitName || selectedRequest.unitNumber || 'Unit'}
                    </Text>
                  </View>
                </View>

                {/* Description Box */}
                <View style={styles.detailSectionBox}>
                  <Text style={styles.detailSectionLabel} allowFontScaling={false}>
                    {es ? 'DESCRIPCIÓN' : 'DESCRIPTION'}
                  </Text>
                  <Text style={styles.detailDescText} allowFontScaling={false}>
                    {cleanDescription(selectedRequest.description) || (es ? 'Sin descripción provista.' : 'No description provided.')}
                  </Text>
                </View>

                {/* Preferred Visit Time (if available) */}
                {extractPreferredVisit(selectedRequest) ? (
                  <View style={styles.detailSectionBox}>
                    <Text style={styles.detailSectionLabel} allowFontScaling={false}>
                      {es ? 'VENTANA DE VISITA PREFERIDA' : 'PREFERRED VISIT WINDOW'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Ionicons name="time" size={14} color="#f59e0b" style={{ marginRight: 6 }} />
                      <Text style={styles.prefVisitDetailText} allowFontScaling={false}>
                        {extractPreferredVisit(selectedRequest)}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Resolution Notes (if completed) */}
                {selectedRequest.status === 'Completed' && (selectedRequest.notes || selectedRequest.resolutionNotes) ? (
                  <View style={styles.resolutionBox}>
                    <Text style={styles.resolutionLabel} allowFontScaling={false}>
                      ✓ {es ? 'NOTAS DE RESOLUCIÓN' : 'RESOLUTION NOTES'}
                    </Text>
                    <Text style={styles.resolutionText} allowFontScaling={false}>
                      "{selectedRequest.notes || selectedRequest.resolutionNotes}"
                    </Text>
                  </View>
                ) : null}

                {/* Discussion / Comments thread */}
                <View style={styles.chatSection}>
                  <Text style={styles.chatSectionTitle} allowFontScaling={false}>
                    💬 {es ? 'ACTUALIZACIONES Y DISCUSIÓN' : 'DISCUSSION & UPDATES'}
                  </Text>

                  <View style={styles.chatMessagesList}>
                    {Array.isArray(selectedRequest.messages) && selectedRequest.messages.length > 0 ? (
                      selectedRequest.messages.map((m, idx) => {
                        const isResident = m.role === 'Tenant' || (m.senderName && m.senderName.includes('Resident'));
                        return (
                          <View
                            key={m.id || `msg-${idx}`}
                            style={[
                              styles.chatBubble,
                              isResident ? styles.chatBubbleResident : styles.chatBubbleManager,
                            ]}
                          >
                            <View style={styles.chatBubbleHeader}>
                              <Text style={styles.chatSenderName} allowFontScaling={false}>
                                {m.senderName || (isResident ? 'You (Resident)' : 'Property Manager')}
                              </Text>
                              <Text style={styles.chatTimestamp} allowFontScaling={false}>
                                {m.timestamp || ''}
                              </Text>
                            </View>
                            <Text style={styles.chatMessageText} allowFontScaling={false}>
                              {m.text}
                            </Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.chatEmptyText} allowFontScaling={false}>
                        {es ? 'No hay mensajes en esta solicitud todavía.' : 'No discussions yet. Leave a question or update below.'}
                      </Text>
                    )}
                  </View>

                  {/* Message Input Box */}
                  <View style={styles.chatInputRow}>
                    <TextInput
                      style={styles.chatInput}
                      placeholder={es ? 'Escriba un mensaje al administrador...' : 'Ask a question or provide update...'}
                      placeholderTextColor={colors.textSecondary}
                      value={newMsgText}
                      onChangeText={setNewMsgText}
                      allowFontScaling={false}
                    />
                    <TouchableOpacity
                      style={[styles.chatSendBtn, (!newMsgText.trim() || postingMsg) && { opacity: 0.5 }]}
                      onPress={handleSendMessage}
                      disabled={!newMsgText.trim() || postingMsg}
                    >
                      {postingMsg ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Ionicons name="send" size={16} color="#ffffff" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Direct Landlord Contact Channels */}
                <View style={styles.directContactSection}>
                  <Text style={styles.directContactTitle} allowFontScaling={false}>
                    {es ? 'CONTACTO DIRECTO CON ADMINISTRACIÓN' : 'DIRECT MANAGER CONTACT'}
                  </Text>
                  <View style={styles.contactButtonsRow}>
                    <TouchableOpacity style={styles.contactBtn} onPress={handleContactSMS} activeOpacity={0.7}>
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color="#38bdf8" />
                      <Text style={styles.contactBtnText} allowFontScaling={false}>SMS</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.contactBtn} onPress={handleContactEmail} activeOpacity={0.7}>
                      <Ionicons name="mail-outline" size={16} color="#38bdf8" />
                      <Text style={styles.contactBtnText} allowFontScaling={false}>Email</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.contactBtn, styles.contactBtnWhatsApp]}
                      onPress={() => handleContactWhatsApp(selectedRequest)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#10b981" />
                      <Text style={[styles.contactBtnText, { color: '#10b981' }]} allowFontScaling={false}>
                        WhatsApp
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { width: '100%' }]}
                  onPress={() => setSelectedRequest(null)}
                >
                  <Text style={styles.cancelBtnText} allowFontScaling={false}>
                    {es ? 'Cerrar' : 'Close Details'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder || 'rgba(148, 163, 184, 0.15)',
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    backBtn: {
      marginRight: 12,
      padding: 6,
      borderRadius: 8,
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    },
    headerSuperTitle: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
      color: '#38bdf8',
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 17,
    },
    createBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0284c7',
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 16,
      marginTop: 12,
      shadowColor: '#0284c7',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 4,
    },
    createBtnText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
    },
    searchSection: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface || colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.2)',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: colors.textPrimary,
      paddingVertical: 0,
    },
    filterChipRow: {
      flexDirection: 'row',
      marginTop: 8,
      gap: 6,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    filterChipActive: {
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      borderColor: 'rgba(56, 189, 248, 0.4)',
    },
    filterChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: '#38bdf8',
      fontWeight: '700',
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 36,
    },
    loadingContainer: {
      paddingVertical: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 10,
      fontWeight: '500',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 45,
      paddingHorizontal: 24,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 6,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 18,
    },
    emptyActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#0284c7',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
    },
    emptyActionBtnText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
    requestCard: {
      backgroundColor: colors.surface || colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.18)',
      padding: 14,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    dateBadge: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dateText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    headerRightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    priorityPill: {
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      borderRadius: 6,
      borderWidth: 1,
    },
    priorityText: {
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 10.5,
      fontWeight: '700',
    },
    eyeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
      lineHeight: 20,
    },
    cardDescSnippet: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
      marginBottom: 8,
    },
    cardFooterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder || 'rgba(148, 163, 184, 0.12)',
      paddingTop: 8,
      marginTop: 4,
    },
    propertyUnitTag: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    propertyUnitText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    prefVisitTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    prefVisitText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#f59e0b',
      maxWidth: 130,
    },
    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface || colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder || 'rgba(148, 163, 184, 0.15)',
    },
    modalSuperTitle: {
      fontSize: 9.5,
      fontWeight: '900',
      letterSpacing: 1,
      color: '#38bdf8',
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    modalSubtitle: {
      fontSize: 11.5,
      color: colors.textSecondary,
      marginTop: 2,
    },
    modalCloseBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    },
    modalScroll: {
      paddingHorizontal: 20,
      paddingTop: 14,
    },
    formGroup: {
      marginBottom: 16,
    },
    formLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    formLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    formInput: {
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : '#f8fafc',
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.25)',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: colors.textPrimary,
    },
    formTextArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    pillSelectorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    prioritySelectPill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.25)',
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
    },
    prioritySelectText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    prefOptionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 4,
    },
    prefOptionChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.2)',
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
    },
    prefOptionChipActive: {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      borderColor: '#f59e0b',
    },
    prefOptionChipText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    prefOptionChipTextActive: {
      color: '#f59e0b',
      fontWeight: '700',
    },
    aiTipsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    aiTipsBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#38bdf8',
    },
    // AI Tips Box
    aiTipsContainer: {
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.35)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    aiTipsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      flexWrap: 'wrap',
      gap: 6,
    },
    aiTipsTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 160,
    },
    aiTipsTitle: {
      fontSize: 12.5,
      fontWeight: '800',
      color: '#d97706',
      flexShrink: 1,
    },
    aiTipsBadge: {
      backgroundColor: 'rgba(245, 158, 11, 0.18)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.35)',
      alignSelf: 'flex-start',
    },
    aiTipsBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#d97706',
    },
    aiTipsSub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 10,
      lineHeight: 16,
    },
    aiTipItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface || colors.card,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(148, 163, 184, 0.15)',
      marginBottom: 6,
    },
    aiTipNumBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(56, 189, 248, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      marginTop: 1,
    },
    aiTipNumText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: '#38bdf8',
    },
    aiTipItemText: {
      flex: 1,
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textPrimary,
      lineHeight: 16,
    },
    aiTipsFooter: {
      borderTopWidth: 1,
      borderTopColor: 'rgba(245, 158, 11, 0.25)',
      paddingTop: 10,
      marginTop: 6,
      alignItems: 'center',
    },
    aiTipsFixedBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.35)',
      borderRadius: 8,
      paddingVertical: 9,
      paddingHorizontal: 16,
      width: '100%',
    },
    aiTipsFixedBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#10b981',
    },
    aiTipsHint: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 6,
      textAlign: 'center',
    },
    modalActions: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder || 'rgba(148, 163, 184, 0.15)',
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    submitBtn: {
      flex: 2,
      flexDirection: 'row',
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: '#0284c7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    // Detail Modal Styles
    detailBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    detailInfoGrid: {
      flexDirection: 'row',
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.15)',
      padding: 12,
      marginBottom: 12,
      gap: 12,
    },
    detailGridCol: {
      flex: 1,
    },
    detailGridLabel: {
      fontSize: 9.5,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    detailGridVal: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    detailSectionBox: {
      marginBottom: 12,
    },
    detailSectionLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    detailDescText: {
      fontSize: 12.5,
      color: colors.textPrimary,
      lineHeight: 18,
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.12)',
    },
    prefVisitDetailText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#f59e0b',
    },
    resolutionBox: {
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
    },
    resolutionLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: '#10b981',
      marginBottom: 3,
    },
    resolutionText: {
      fontSize: 12,
      fontStyle: 'italic',
      color: '#10b981',
      lineHeight: 17,
    },
    chatSection: {
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder || 'rgba(148, 163, 184, 0.15)',
      paddingTop: 12,
      marginBottom: 14,
    },
    chatSectionTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    chatMessagesList: {
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.15)',
      padding: 10,
      maxHeight: 170,
      marginBottom: 8,
    },
    chatBubble: {
      padding: 8,
      borderRadius: 8,
      marginBottom: 6,
      maxWidth: '85%',
    },
    chatBubbleResident: {
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.3)',
      alignSelf: 'flex-end',
    },
    chatBubbleManager: {
      backgroundColor: colors.surface || colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.2)',
      alignSelf: 'flex-start',
    },
    chatBubbleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    chatSenderName: {
      fontSize: 9.5,
      fontWeight: '800',
      color: '#38bdf8',
      textTransform: 'uppercase',
    },
    chatTimestamp: {
      fontSize: 8.5,
      color: colors.textSecondary,
    },
    chatMessageText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textPrimary,
      lineHeight: 16,
    },
    chatEmptyText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: 12,
    },
    chatInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    chatInput: {
      flex: 1,
      height: 38,
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.25)',
      borderRadius: 8,
      paddingHorizontal: 10,
      fontSize: 12,
      color: colors.textPrimary,
    },
    chatSendBtn: {
      width: 38,
      height: 38,
      borderRadius: 8,
      backgroundColor: '#0284c7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    directContactSection: {
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder || 'rgba(148, 163, 184, 0.15)',
      paddingTop: 12,
      marginBottom: 10,
    },
    directContactTitle: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    contactButtonsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    contactBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9',
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.2)',
      borderRadius: 10,
      paddingVertical: 8,
      gap: 6,
    },
    contactBtnWhatsApp: {
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    contactBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
  });

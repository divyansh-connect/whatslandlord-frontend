import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useAuthStore, useThemeStore } from '../store/useStore';
import apiClient from '../api/client';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const MaintenanceStaffDashboard = ({ activeSubTab, onNavigate }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { theme, language } = useThemeStore();
  const isDarkMode = theme === 'dark';
  const es = language === 'es';
  const styles = getStyles(isDarkMode);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'assigned' | 'in_progress' | 'completed' | 'rejected'
  const [myTasksFilter, setMyTasksFilter] = useState('all'); // 'all' | 'in_progress' | 'assigned'
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'completed' | 'rejected'
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Job Resolution Form Modal State
  const [resolutionModalVisible, setResolutionModalVisible] = useState(false);
  const [laborCost, setLaborCost] = useState('200');
  const [extraExpenses, setExtraExpenses] = useState('0.00');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Helper to check if status is in progress (handles 'In_Progress', 'In Progress', and 'InProgress')
  const isInProgress = (status) => {
    return ['In_Progress', 'In Progress', 'InProgress'].includes(status);
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      // Fetch /portal/staff/tasks FIRST to get staff-specific work orders with full resolution and cost details
      const [res, notifsRes] = await Promise.all([
        apiClient
          .get('/portal/staff/tasks', logout, refreshAccessToken)
          .catch(() => apiClient.get('/work-orders', logout, refreshAccessToken).catch(() => [])),
        apiClient
          .get('/notifications?role=Maintenance Staff', logout, refreshAccessToken)
          .catch(() => null),
      ]);
      setTasks(res?.data || res || []);

      const rawNotifs = notifsRes?.data !== undefined ? notifsRes.data : notifsRes;
      const notifsList = Array.isArray(rawNotifs) ? rawNotifs : (Array.isArray(rawNotifs?.data) ? rawNotifs.data : []);
      const unreadTotal = notifsList.filter((n) => !n.read && !n.isRead).length;
      setUnreadCount(unreadTotal);
    } catch (e) {
      console.error('Error fetching staff tasks:', e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeSubTab]);

  const handleUpdateStatus = async (id, newStatus, extraData = {}) => {
    try {
      setUpdatingId(id);
      await apiClient.post(
        `/portal/staff/tasks/${id}/status`,
        { status: newStatus, ...extraData },
        logout,
        refreshAccessToken
      );
      Alert.alert('Success', `Task status updated to ${newStatus}`);
      setDetailsModalVisible(false);
      setResolutionModalVisible(false);
      fetchTasks();
    } catch (e) {
      console.error('Failed to update task status:', e);
      Alert.alert('Error', e.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const openResolutionModal = (task) => {
    setSelectedTask(task);
    const estimatedCost = task.estimatedCost || task.estimatedBudget || 200;
    setLaborCost(estimatedCost.toString());
    setExtraExpenses('0.00');
    setResolutionNotes('');
    setResolutionModalVisible(true);
  };

  const submitJobResolution = () => {
    if (!selectedTask) return;
    handleUpdateStatus(selectedTask.id, 'Completed', {
      labourCost: parseFloat(laborCost) || 0,
      extraExpenses: parseFloat(extraExpenses) || 0,
      resolutionNotes: resolutionNotes,
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
      case 'URGENT':
        return '#ef4444';
      case 'MEDIUM':
        return '#0284c7';
      case 'LOW':
        return '#10b981';
      default:
        return '#64748b';
    }
  };

  // Helper to extract visit window and clean description
  const extractVisitAndDescription = (rawDesc, rawPreferredTime) => {
    if (rawPreferredTime) {
      const cleanDesc = (rawDesc || '').replace(/\[Preferred Visit:[^\]]+\]/gi, '').trim();
      return { description: cleanDesc, visitWindow: rawPreferredTime };
    }
    if (!rawDesc) return { description: '', visitWindow: null };
    const visitMatch = rawDesc.match(/\[Preferred Visit:\s*([^\]]+)\]/i);
    const visitWindow = visitMatch ? visitMatch[1].trim() : null;
    const cleanDesc = rawDesc.replace(/\[Preferred Visit:[^\]]+\]/gi, '').trim();
    return { description: cleanDesc, visitWindow };
  };

  // Helper to format unit display cleanly without duplicate 'Unit'
  const formatUnitDisplay = (unit) => {
    if (!unit) return '';
    const clean = String(unit).trim();
    if (clean.toLowerCase().startsWith('unit')) return clean;
    return `Unit ${clean}`;
  };

  // Filter logic based on active tab
  const filteredTasks = tasks.filter((task) => {
    const isCompletedStatus = ['Completed', 'Closed', 'Rejected', 'Cancelled'].includes(task.status);
    const isHistoryTab = activeSubTab === 'history';
    const matchesTab = isHistoryTab ? isCompletedStatus : !isCompletedStatus;

    let matchesFilter = true;
    if (activeSubTab === 'dashboard') {
      if (activeFilter === 'assigned') {
        matchesFilter = ['Assigned', 'Pending'].includes(task.status);
      } else if (activeFilter === 'in_progress') {
        matchesFilter = isInProgress(task.status);
      } else if (activeFilter === 'completed') {
        matchesFilter = task.status === 'Completed';
      } else if (activeFilter === 'rejected') {
        matchesFilter = task.status === 'Rejected';
      }
    } else if (activeSubTab === 'mytasks') {
      if (myTasksFilter === 'in_progress') {
        matchesFilter = isInProgress(task.status);
      } else if (myTasksFilter === 'assigned') {
        matchesFilter = ['Assigned', 'Pending'].includes(task.status);
      }
    } else if (activeSubTab === 'history') {
      if (historyFilter === 'completed') {
        matchesFilter = ['Completed', 'Closed'].includes(task.status);
      } else if (historyFilter === 'rejected') {
        matchesFilter = ['Rejected', 'Cancelled'].includes(task.status);
      }
    }

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      task.workOrderNumber?.toLowerCase().includes(q) ||
      task.propertyName?.toLowerCase().includes(q) ||
      task.unitNumber?.toLowerCase().includes(q) ||
      task.issue?.toLowerCase().includes(q) ||
      task.description?.toLowerCase().includes(q) ||
      task.resolutionNotes?.toLowerCase().includes(q);

    return matchesTab && matchesFilter && matchesSearch;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DASHBOARD TAB VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  const renderDashboardTab = () => {
    const assignedCount = tasks.filter((t) => ['Assigned', 'Pending'].includes(t.status)).length;
    const inProgressCount = tasks.filter((t) => isInProgress(t.status)).length;
    const completedCount = tasks.filter((t) => t.status === 'Completed').length;
    const rejectedCount = tasks.filter((t) => t.status === 'Rejected').length;

    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTasks} tintColor="#38bdf8" />}
      >
        {/* Header Banner */}
        <View style={styles.headerBanner}>
          <View style={styles.headerLeft}>
            <View style={styles.eyebrowRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.eyebrowText}>
                {es ? 'PERSONAL DE MANTENIMIENTO' : 'MAINTENANCE CREW'}
              </Text>
            </View>

            <View style={styles.welcomeRow}>
              <Text style={styles.welcomeGreeting} allowFontScaling={false}>
                {es ? 'Hola,' : 'Welcome back,'}
              </Text>
              <Text style={styles.welcomeName} allowFontScaling={false} numberOfLines={1}>
                {user?.name || user?.firstName || 'Staff'} 👋
              </Text>
            </View>

            <Text style={styles.welcomeSub} allowFontScaling={false}>
              {es ? 'Órdenes de trabajo asignadas y pendientes' : 'Active work orders & assigned tasks'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => onNavigate && onNavigate('notifications')}
              activeOpacity={0.7}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={20} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => onNavigate && onNavigate('messages')}
              activeOpacity={0.7}
              accessibilityLabel="Direct Messages"
            >
              <Ionicons name="chatbubbles-outline" size={20} color={isDarkMode ? '#38bdf8' : '#0284c7'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2x2 Metric Cards Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statCard, activeFilter === 'assigned' && styles.statCardActive]}
            onPress={() => setActiveFilter(activeFilter === 'assigned' ? 'all' : 'assigned')}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
              <Ionicons name="briefcase" size={19} color="#3b82f6" />
            </View>
            <Text style={styles.statLabel}>{es ? 'ASIGNADAS' : 'ASSIGNED'}</Text>
            <Text style={[styles.statVal, { color: '#3b82f6' }]}>{assignedCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, activeFilter === 'in_progress' && styles.statCardActive]}
            onPress={() => setActiveFilter(activeFilter === 'in_progress' ? 'all' : 'in_progress')}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Ionicons name="time" size={19} color="#f59e0b" />
            </View>
            <Text style={styles.statLabel}>{es ? 'EN PROGRESO' : 'IN PROGRESS'}</Text>
            <Text style={[styles.statVal, { color: '#f59e0b' }]}>{inProgressCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, activeFilter === 'completed' && styles.statCardActive]}
            onPress={() => setActiveFilter(activeFilter === 'completed' ? 'all' : 'completed')}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Ionicons name="checkmark-circle" size={19} color="#10b981" />
            </View>
            <Text style={styles.statLabel}>{es ? 'COMPLETADAS' : 'COMPLETED'}</Text>
            <Text style={[styles.statVal, { color: '#10b981' }]}>{completedCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, activeFilter === 'rejected' && styles.statCardActive]}
            onPress={() => setActiveFilter(activeFilter === 'rejected' ? 'all' : 'rejected')}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Ionicons name="close-circle" size={19} color="#ef4444" />
            </View>
            <Text style={styles.statLabel}>{es ? 'RECHAZADAS' : 'REJECTED'}</Text>
            <Text style={[styles.statVal, { color: '#ef4444' }]}>{rejectedCount}</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={es ? 'Buscar por ID, propiedad o problema...' : 'Search by ID, property, unit or issue...'}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>
              {activeFilter !== 'all'
                ? (activeFilter === 'in_progress' ? 'IN PROGRESS TASKS' : `${activeFilter.toUpperCase()} TASKS`)
                : (es ? 'MIS TAREAS' : 'MY TASKS')}
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{filteredTasks.length}</Text>
            </View>
          </View>

          {activeFilter !== 'all' && (
            <TouchableOpacity onPress={() => setActiveFilter('all')} style={styles.clearFilterBtn}>
              <Text style={styles.clearFilterText}>{es ? 'Ver todas' : 'Show All'}</Text>
              <Ionicons name="close" size={12} color="#0284c7" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color="#38bdf8" style={{ marginTop: 28 }} size="large" />
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="file-tray-outline" size={40} color="#94a3b8" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching tasks' : 'No tasks in this view'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try a different search term or property name.'
                : 'All caught up! New assigned tasks will appear here.'}
            </Text>
          </View>
        ) : (
          filteredTasks.slice(0, 10).map((task) => renderTaskItem(task, true))
        )}
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. WORK HISTORY TAB VIEW (Matching Web Image 1 strictly)
  // ─────────────────────────────────────────────────────────────────────────────
  const renderHistoryTab = () => {
    const allArchived = tasks.filter((t) => ['Completed', 'Closed', 'Rejected', 'Cancelled'].includes(t.status));
    const completedArchived = allArchived.filter((t) => ['Completed', 'Closed'].includes(t.status));
    const rejectedArchived = allArchived.filter((t) => ['Rejected', 'Cancelled'].includes(t.status));

    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTasks} tintColor="#38bdf8" />}
      >
        {/* Work History Header Banner matching Web /staff/completed */}
        <View style={styles.subScreenHeader}>
          <View style={styles.eyebrowRow}>
            <View style={[styles.pulseDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.eyebrowText}>
              {es ? 'REGISTRO DE TRABAJO' : 'COMPLETED & ARCHIVED'}
            </Text>
          </View>

          <View style={styles.subScreenTitleRow}>
            <Text style={styles.subScreenTitle}>
              {es ? 'Historial de Trabajo' : 'Work History'}
            </Text>
            <View style={styles.countBadgeLarge}>
              <Text style={styles.countBadgeLargeText}>
                {es ? 'ARCHIVADAS' : 'ARCHIVED'} ({filteredTasks.length})
              </Text>
            </View>
          </View>

          <Text style={styles.subScreenSubtitle}>
            {es
              ? 'Seguimiento de trabajos completados, costos de reparación y notas de resolución.'
              : 'Track completed or rejected jobs, actual repair costs, and resolution details.'}
          </Text>
        </View>

        {/* Quick Filter Chips (All | Completed | Rejected) */}
        <View style={styles.filterChipsRow}>
          <TouchableOpacity
            style={[styles.filterChip, historyFilter === 'all' && styles.filterChipActive]}
            onPress={() => setHistoryFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, historyFilter === 'all' && styles.filterChipTextActive]}>
              {es ? 'Todas' : 'All'} ({allArchived.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, historyFilter === 'completed' && styles.filterChipActive]}
            onPress={() => setHistoryFilter('completed')}
            activeOpacity={0.7}
          >
            <View style={[styles.filterChipDot, { backgroundColor: '#10b981' }]} />
            <Text style={[styles.filterChipText, historyFilter === 'completed' && styles.filterChipTextActive]}>
              {es ? 'Completadas' : 'Completed'} ({completedArchived.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, historyFilter === 'rejected' && styles.filterChipActive]}
            onPress={() => setHistoryFilter('rejected')}
            activeOpacity={0.7}
          >
            <View style={[styles.filterChipDot, { backgroundColor: '#ef4444' }]} />
            <Text style={[styles.filterChipText, historyFilter === 'rejected' && styles.filterChipTextActive]}>
              {es ? 'Rechazadas' : 'Rejected'} ({rejectedArchived.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={es ? 'Buscar por ID, propiedad o problema...' : 'Search tasks by ID, property, or issue...'}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>
          {es ? `REGISTROS ARCHIVADOS (${filteredTasks.length})` : `ARCHIVED LOGS (${filteredTasks.length})`}
        </Text>

        {loading ? (
          <ActivityIndicator color="#38bdf8" style={{ marginTop: 28 }} size="large" />
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="archive-outline" size={40} color="#94a3b8" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching history records' : 'No archived tasks yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try a different search term.'
                : 'Completed work orders will automatically be archived here with repair logs.'}
            </Text>
          </View>
        ) : (
          filteredTasks.map((task) => renderHistoryCard(task))
        )}
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. HISTORY CARD (Matching Web Image 1 with Blue Left Border & Resolution Box)
  // ─────────────────────────────────────────────────────────────────────────────
  const renderHistoryCard = (task) => {
    const isCompleted = ['Completed', 'Closed'].includes(task.status);
    const priorityColor = getPriorityColor(task.priority);
    const { description: cleanDesc, visitWindow } = extractVisitAndDescription(task.description, task.preferredTime);
    const unitText = formatUnitDisplay(task.unitNumber);

    const baseLabor = parseFloat(task.labourCost || task.cost || task.actualCost || task.estimatedCost || 120) || 120;
    const extraExp = parseFloat(task.extraExpenses || 0) || 0;
    const totalCost = baseLabor + extraExp;
    const notesText = task.resolutionNotes || task.notes || (isCompleted ? 'Repairs completed.' : task.rejectReason || 'Work order closed.');

    return (
      <View key={task.id} style={styles.historyCard}>
        {/* Left accent blue bar */}
        <View style={styles.historyCardAccent} />

        <View style={styles.historyCardContent}>
          {/* Top Row: ID, Status, Priority */}
          <View style={styles.cardTopRow}>
            <View style={styles.badgeRow}>
              <View style={styles.idBadge}>
                <Ionicons name="construct-outline" size={12} color="#0284c7" style={{ marginRight: 4 }} />
                <Text style={styles.taskIdText}>
                  {task.workOrderNumber || `SR-${task.id.slice(0, 8).toUpperCase()}`}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    marginLeft: 6,
                  },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: isCompleted ? '#10b981' : '#ef4444' }]}>
                  {isCompleted ? (es ? 'Completado' : 'Completed') : (es ? 'Rechazado' : task.status)}
                </Text>
              </View>
            </View>

            <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}15` }]}>
              <Text style={[styles.priorityBadgeText, { color: priorityColor }]}>
                {`${task.priority?.toUpperCase() || 'MEDIUM'} PRIORITY`}
              </Text>
            </View>
          </View>

          {/* Issue Title & Preferred Visit */}
          <View style={styles.titleAmountRow}>
            <Text style={styles.taskIssue} numberOfLines={2}>
              {task.issue || 'Maintenance Service'}
            </Text>

            {visitWindow ? (
              <View style={styles.visitWindowBadgeSmall}>
                <Ionicons name="time-outline" size={11} color="#d97706" style={{ marginRight: 4 }} />
                <Text style={styles.visitWindowTextSmall}>Pref: {visitWindow}</Text>
              </View>
            ) : null}
          </View>

          {/* Location row */}
          <View style={styles.taskLocationRow}>
            <Ionicons name="location-sharp" size={13} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={styles.taskLocation} numberOfLines={1}>
              {task.propertyName || 'Property'} {unitText ? `· ${unitText}` : ''}
            </Text>
          </View>

          {/* Scheduled Date & Final Cost Meta Strip */}
          <View style={styles.historyMetaStrip}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.metaLabelText}>🗓️ SCHEDULED DATE</Text>
              <Text style={styles.metaValText} numberOfLines={1}>
                {task.scheduledDate || task.dueDate || visitWindow || 'Morning (8am - 12pm)'}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metaLabelText}>💰 FINAL COST</Text>
              <Text style={styles.historyFinalCostText}>
                ${baseLabor} {extraExp > 0 ? `(+${extraExp} extra)` : ''}
              </Text>
            </View>
          </View>

          {/* Greenish Resolution Notes Box matching Web Image 1 */}
          <View style={styles.historyResolutionBox}>
            <Text style={styles.resolutionBoxLabel}>STAFF RESOLUTION NOTES</Text>
            <Text style={styles.resolutionBoxText}>"{notesText}"</Text>
          </View>

          {/* Details Action Button */}
          <View style={{ marginTop: 12, alignItems: 'flex-end' }}>
            <TouchableOpacity
              style={styles.historyDetailsBtn}
              onPress={() => {
                setSelectedTask(task);
                setDetailsModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-outline" size={14} color={isDarkMode ? '#cbd5e1' : '#334155'} style={{ marginRight: 5 }} />
              <Text style={styles.historyDetailsBtnText}>{es ? 'Detalles' : 'Details'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. ACTIVE TASK CARD (For Dashboard & My Tasks)
  // ─────────────────────────────────────────────────────────────────────────────
  const renderTaskItem = (task, isDashboard = false) => {
    const priorityColor = getPriorityColor(task.priority);
    const estimatedBudget = task.estimatedCost || task.estimatedBudget || 200;
    const taskIsActive = isInProgress(task.status);
    const showStartWork = task.status === 'Assigned' || task.status === 'Pending';
    const showMarkCompleted = !isDashboard && taskIsActive;
    const isCompleted = task.status === 'Completed';
    const baseCost = task.labourCost || task.cost || task.actualCost || estimatedBudget;
    const extraExp = task.extraExpenses || 0;

    const { description: cleanDesc, visitWindow } = extractVisitAndDescription(task.description, task.preferredTime);
    const unitText = formatUnitDisplay(task.unitNumber);

    return (
      <View key={task.id} style={styles.taskCard}>
        {/* Row 1: ID on left, Badges on right */}
        <View style={styles.cardTopRow}>
          <View style={styles.idBadge}>
            <Ionicons name="construct-outline" size={12} color="#0284c7" style={{ marginRight: 4 }} />
            <Text style={styles.taskIdText}>
              {task.workOrderNumber || `SR-${task.id.slice(0, 8).toUpperCase()}`}
            </Text>
          </View>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: taskIsActive
                    ? 'rgba(245, 158, 11, 0.12)'
                    : isCompleted
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(56, 189, 248, 0.12)',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: taskIsActive ? '#f59e0b' : isCompleted ? '#10b981' : '#0284c7' },
                ]}
              >
                {taskIsActive
                  ? (es ? 'En Progreso' : 'In Progress')
                  : es && task.status === 'Completed'
                  ? 'Completado'
                  : es && task.status === 'Assigned'
                  ? 'Asignado'
                  : es && task.status === 'Rejected'
                  ? 'Rechazado'
                  : task.status || 'Assigned'}
              </Text>
            </View>

            <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}15` }]}>
              <Text style={[styles.priorityBadgeText, { color: priorityColor }]}>
                {task.priority || 'Medium'}
              </Text>
            </View>
          </View>
        </View>

        {/* Row 2: Title & Estimated / Actual Cost */}
        <View style={styles.titleAmountRow}>
          <Text style={styles.taskIssue} numberOfLines={2}>
            {task.issue || 'General Maintenance Request'}
          </Text>
          <View style={styles.costCol}>
            <Text style={styles.taskAmount}>${baseCost}</Text>
            {isCompleted && extraExp > 0 && (
              <Text style={styles.taskExtraText}>+${extraExp} extra</Text>
            )}
          </View>
        </View>

        {/* Location Row */}
        <View style={styles.taskLocationRow}>
          <Ionicons name="location-sharp" size={13} color="#0284c7" style={{ marginRight: 4 }} />
          <Text style={styles.taskLocation} numberOfLines={1}>
            {task.propertyName || 'Property'} {unitText ? `· ${unitText}` : ''}
          </Text>
        </View>

        {/* Preferred Visit Time Chip */}
        {visitWindow ? (
          <View style={styles.visitWindowBadge}>
            <Ionicons name="time-outline" size={13} color="#0284c7" style={{ marginRight: 5 }} />
            <Text style={styles.visitWindowText} numberOfLines={1}>
              {es ? 'Visita Preferida:' : 'Preferred Visit:'} {visitWindow}
            </Text>
          </View>
        ) : null}

        {/* Clean Description */}
        {cleanDesc ? (
          <Text style={styles.taskDescriptionText} numberOfLines={2}>
            {cleanDesc}
          </Text>
        ) : null}

        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          {showStartWork && (
            <TouchableOpacity
              style={[styles.btnBase, styles.startBtn]}
              onPress={() => handleUpdateStatus(task.id, 'In_Progress')}
              disabled={updatingId !== null}
              activeOpacity={0.8}
            >
              {updatingId === task.id ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="play" size={13} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.startBtnText}>{es ? 'Comenzar' : 'Start Work'}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {showMarkCompleted && (
            <TouchableOpacity
              style={[styles.btnBase, styles.completeBtn]}
              onPress={() => openResolutionModal(task)}
              disabled={updatingId !== null}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done" size={15} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.completeBtnText}>{es ? 'Completar' : 'Mark Completed'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.btnBase, styles.detailsBtn]}
            onPress={() => {
              setSelectedTask(task);
              setDetailsModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={14} color={isDarkMode ? '#cbd5e1' : '#475569'} style={{ marginRight: 5 }} />
            <Text style={styles.detailsBtnText}>{es ? 'Detalles' : 'Details'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. MY TASKS TAB VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  const renderMyTasksTab = () => {
    const activeTasks = tasks.filter((t) => !['Completed', 'Closed', 'Rejected', 'Cancelled'].includes(t.status));

    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTasks} tintColor="#38bdf8" />}
      >
        {/* Dedicated Sub-Screen Header */}
        <View style={styles.subScreenHeader}>
          <View style={styles.eyebrowRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.eyebrowText}>
              {es ? 'ÓRDENES ACTIVAS' : 'ACTIVE ASSIGNMENTS'}
            </Text>
          </View>

          <View style={styles.subScreenTitleRow}>
            <Text style={styles.subScreenTitle}>
              {es ? 'Mis Órdenes de Trabajo' : 'My Work Orders'}
            </Text>
            <View style={styles.countBadgeLarge}>
              <Text style={styles.countBadgeLargeText}>{filteredTasks.length}</Text>
            </View>
          </View>

          <Text style={styles.subScreenSubtitle}>
            {es
              ? 'Revisa detalles, inicia trabajos y completa tus reparaciones'
              : 'Review task details, start work, and submit resolution'}
          </Text>
        </View>

        {/* Quick Sub-Filter Pills */}
        <View style={styles.filterChipsRow}>
          <TouchableOpacity
            style={[styles.filterChip, myTasksFilter === 'all' && styles.filterChipActive]}
            onPress={() => setMyTasksFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, myTasksFilter === 'all' && styles.filterChipTextActive]}>
              {es ? 'Todas' : 'All'} ({activeTasks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, myTasksFilter === 'in_progress' && styles.filterChipActive]}
            onPress={() => setMyTasksFilter('in_progress')}
            activeOpacity={0.7}
          >
            <View style={[styles.filterChipDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={[styles.filterChipText, myTasksFilter === 'in_progress' && styles.filterChipTextActive]}>
              {es ? 'En Progreso' : 'In Progress'} ({tasks.filter((t) => isInProgress(t.status)).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, myTasksFilter === 'assigned' && styles.filterChipActive]}
            onPress={() => setMyTasksFilter('assigned')}
            activeOpacity={0.7}
          >
            <View style={[styles.filterChipDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={[styles.filterChipText, myTasksFilter === 'assigned' && styles.filterChipTextActive]}>
              {es ? 'Asignadas' : 'Assigned'} ({tasks.filter((t) => ['Assigned', 'Pending'].includes(t.status)).length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={es ? 'Buscar por ID, propiedad o problema...' : 'Search by ID, property, unit or issue...'}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color="#38bdf8" style={{ marginTop: 28 }} size="large" />
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={40} color="#94a3b8" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching work orders' : 'No tasks in this view'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try adjusting your search keywords.'
                : 'Great job! You have no pending work orders in this category.'}
            </Text>
          </View>
        ) : (
          filteredTasks.map((task) => renderTaskItem(task, false))
        )}
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {activeSubTab === 'dashboard' && renderDashboardTab()}
      {activeSubTab === 'mytasks' && renderMyTasksTab()}
      {activeSubTab === 'history' && renderHistoryTab()}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 7. FULL TASK DETAILS MODAL (Matching Web Image 2 strictly)            */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {selectedTask && (
        <Modal
          visible={detailsModalVisible}
          animationType="slide"
          presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
          onRequestClose={() => setDetailsModalVisible(false)}
        >
          <View style={styles.detailsModalRoot}>
            {/* Top Navigation Bar with Back Button */}
            <View style={styles.detailsTopBar}>
              <TouchableOpacity
                style={styles.detailsBackBtn}
                onPress={() => setDetailsModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
              </TouchableOpacity>

              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={styles.detailsTopTitle} numberOfLines={1}>
                  Task Details - {selectedTask.workOrderNumber || `SR-${selectedTask.id.slice(0, 8).toUpperCase()}`}
                </Text>
                <Text style={styles.detailsTopSubtitle} numberOfLines={1}>
                  Detailed technician instructions, tenant details, and repair workflow.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.detailsCloseBtn}
                onPress={() => setDetailsModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.detailsScroll}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {/* CARD 1: MAIN TASK OVERVIEW (Left Box in Web Image 2) */}
              <View style={styles.detailsMainCard}>
                {/* Badges Strip */}
                <View style={styles.detailsBadgesRow}>
                  <View style={styles.idBadge}>
                    <Ionicons name="construct-outline" size={12} color="#0284c7" style={{ marginRight: 4 }} />
                    <Text style={styles.taskIdText}>
                      {selectedTask.workOrderNumber || `SR-${selectedTask.id.slice(0, 8).toUpperCase()}`}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: ['Completed', 'Closed'].includes(selectedTask.status)
                          ? 'rgba(16, 185, 129, 0.12)'
                          : isInProgress(selectedTask.status)
                          ? 'rgba(245, 158, 11, 0.12)'
                          : 'rgba(56, 189, 248, 0.12)',
                        marginLeft: 6,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color: ['Completed', 'Closed'].includes(selectedTask.status)
                            ? '#10b981'
                            : isInProgress(selectedTask.status)
                            ? '#f59e0b'
                            : '#0284c7',
                        },
                      ]}
                    >
                      {selectedTask.status || 'Completed'}
                    </Text>
                  </View>

                  {(selectedTask.preferredTime || selectedTask.scheduledDate) && (
                    <View style={[styles.visitWindowBadgeSmall, { marginLeft: 6 }]}>
                      <Ionicons name="time-outline" size={11} color="#d97706" style={{ marginRight: 4 }} />
                      <Text style={styles.visitWindowTextSmall} numberOfLines={1}>
                        Preferred Day: {selectedTask.preferredTime || selectedTask.scheduledDate}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Issue Title */}
                <Text style={styles.detailsIssueTitle}>{selectedTask.issue || 'AC Repair & Diagnostics'}</Text>
                {selectedTask.description ? (
                  <Text style={styles.detailsDescText}>
                    {extractVisitAndDescription(selectedTask.description, selectedTask.preferredTime).description || selectedTask.description}
                  </Text>
                ) : null}

                {/* 2-Column Responsive Information Grid matching Image 2 */}
                <View style={styles.detailsInfoGrid}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoColLabel}>LOCATION</Text>
                    <View style={styles.infoColValRow}>
                      <Ionicons name="location-outline" size={14} color="#0284c7" style={{ marginRight: 4 }} />
                      <Text style={styles.infoColValText}>
                        {selectedTask.propertyName} · {formatUnitDisplay(selectedTask.unitNumber) || 'Unit 1'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoCol}>
                    <Text style={styles.infoColLabel}>SCHEDULED DATE</Text>
                    <View style={styles.infoColValRow}>
                      <Ionicons name="calendar-outline" size={14} color="#0284c7" style={{ marginRight: 4 }} />
                      <Text style={styles.infoColValText}>
                        {selectedTask.scheduledDate || selectedTask.dueDate || 'Morning (8am - 12pm)'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsInfoGrid}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoColLabel}>JOB PRIORITY</Text>
                    <View style={styles.infoColValRow}>
                      <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(selectedTask.priority) }]} />
                      <Text style={[styles.infoColValText, { color: getPriorityColor(selectedTask.priority), fontWeight: '700' }]}>
                        {selectedTask.priority || 'Medium'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoCol}>
                    <Text style={styles.infoColLabel}>PREFERRED VISIT WINDOW / DAY</Text>
                    <View style={styles.infoColValRow}>
                      <Ionicons name="time-outline" size={14} color="#f59e0b" style={{ marginRight: 4 }} />
                      <Text style={[styles.infoColValText, { color: '#d97706', fontWeight: '600' }]}>
                        {selectedTask.preferredTime || extractVisitAndDescription(selectedTask.description).visitWindow || 'Morning (8am - 12pm)'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsInfoGrid}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoColLabel}>ESTIMATED COST</Text>
                    <Text style={[styles.infoColValText, { fontSize: 16, fontWeight: '800', color: '#0284c7' }]}>
                      ${selectedTask.estimatedCost || selectedTask.estimatedBudget || 120}
                    </Text>
                  </View>

                  <View style={styles.infoCol}>
                    <Text style={styles.infoColLabel}>ACTUAL / TOTAL COST</Text>
                    <Text style={[styles.infoColValText, { fontSize: 16, fontWeight: '800', color: '#10b981' }]}>
                      ${(parseFloat(selectedTask.labourCost || selectedTask.cost || selectedTask.actualCost) || 120) + (parseFloat(selectedTask.extraExpenses) || 0)}
                    </Text>
                  </View>
                </View>

                {/* Green Cost Breakdown & Resolution Box matching Web Image 2 */}
                <View style={styles.detailsResolutionBox}>
                  <View style={styles.detailsResCol}>
                    <Text style={styles.resBoxHeading}>COST BREAKDOWN</Text>
                    <Text style={styles.resBreakdownText}>
                      Base Labor: <Text style={{ fontWeight: '800', color: '#10b981' }}>${selectedTask.labourCost || selectedTask.cost || selectedTask.actualCost || 120}</Text>
                    </Text>
                    <Text style={styles.resBreakdownText}>
                      Extra Expenses: <Text style={{ fontWeight: '800', color: '#10b981' }}>${selectedTask.extraExpenses || 0}</Text>
                    </Text>
                  </View>

                  <View style={styles.detailsResCol}>
                    <Text style={styles.resBoxHeading}>RESOLUTION SUMMARY</Text>
                    <Text style={styles.resSummaryText}>
                      "{selectedTask.resolutionNotes || selectedTask.notes || 'Repairs completed and inspected.'}"
                    </Text>
                  </View>
                </View>
              </View>

              {/* CARD 2: WORKFLOW PROGRESS STEPPER (Right Box in Web Image 2) */}
              <View style={styles.detailsProgressCard}>
                <Text style={styles.progressCardTitle}>WORKFLOW PROGRESS</Text>

                <View style={styles.verticalStepper}>
                  {[
                    { title: 'New', subtitle: 'Job created', done: true, active: false },
                    {
                      title: 'Assigned',
                      subtitle: 'Tech assigned',
                      done: ['Assigned', 'In_Progress', 'In Progress', 'InProgress', 'Completed', 'Closed'].includes(selectedTask.status),
                      active: selectedTask.status === 'Assigned',
                    },
                    {
                      title: 'In Progress',
                      subtitle: 'Work active',
                      done: ['In_Progress', 'In Progress', 'InProgress', 'Completed', 'Closed'].includes(selectedTask.status),
                      active: isInProgress(selectedTask.status),
                    },
                    {
                      title: 'Completed',
                      subtitle: 'Job finished',
                      done: ['Completed', 'Closed'].includes(selectedTask.status),
                      active: ['Completed', 'Closed'].includes(selectedTask.status),
                    },
                  ].map((st, idx, arr) => (
                    <View key={st.title} style={styles.verticalStepItem}>
                      <View style={styles.stepLeftIndicator}>
                        <View
                          style={[
                            styles.stepCircle,
                            st.done ? styles.stepCircleDone : styles.stepCirclePending,
                          ]}
                        >
                          <Ionicons
                            name={st.done ? 'checkmark' : 'ellipse'}
                            size={st.done ? 14 : 8}
                            color={st.done ? '#ffffff' : '#94a3b8'}
                          />
                        </View>
                        {idx < arr.length - 1 && (
                          <View
                            style={[
                              styles.stepVerticalLine,
                              arr[idx + 1].done ? styles.stepLineDone : styles.stepLinePending,
                            ]}
                          />
                        )}
                      </View>

                      <View style={styles.stepRightContent}>
                        <Text style={[styles.stepItemTitle, st.done && styles.stepItemTitleDone]}>
                          {st.title}
                        </Text>
                        <Text style={styles.stepItemSubtitle}>{st.subtitle}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Action Buttons if task is not completed */}
              {['Assigned', 'Pending'].includes(selectedTask.status) && (
                <TouchableOpacity
                  style={[styles.btnBase, styles.startBtn, { marginTop: 16 }]}
                  onPress={() => handleUpdateStatus(selectedTask.id, 'In_Progress')}
                >
                  <Ionicons name="play" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.startBtnText}>Start Work</Text>
                </TouchableOpacity>
              )}

              {isInProgress(selectedTask.status) && (
                <TouchableOpacity
                  style={[styles.btnBase, styles.completeBtn, { marginTop: 16 }]}
                  onPress={() => {
                    setDetailsModalVisible(false);
                    openResolutionModal(selectedTask);
                  }}
                >
                  <Ionicons name="checkmark-done" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.completeBtnText}>Mark Completed</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 8. RECORD JOB RESOLUTION MODAL                                        */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <Modal visible={resolutionModalVisible} animationType="slide" transparent onRequestClose={() => setResolutionModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalBg}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardContainer}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            >
              <View style={styles.modalCard}>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={styles.modalHeaderRow}>
                    <View>
                      <Text style={[styles.modalHeaderTitle, { color: '#10b981' }]}>RECORD RESOLUTION</Text>
                      <Text style={styles.modalHeaderSubtitle}>Finalize work order and costs</Text>
                    </View>
                    <TouchableOpacity onPress={() => setResolutionModalVisible(false)}>
                      <Ionicons name="close" size={24} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>LABOR / BASE COST ($)</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={laborCost}
                    onChangeText={setLaborCost}
                    placeholder="120"
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={styles.inputLabel}>EXTRA EXPENSES / MATERIALS ($)</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={extraExpenses}
                    onChangeText={setExtraExpenses}
                    placeholder="0.00"
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={styles.inputLabel}>MATERIALS USED / RESOLUTION NOTES</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 85, textAlignVertical: 'top' }]}
                    multiline
                    numberOfLines={4}
                    placeholder="Describe repairs completed, parts replaced, or notes for property manager..."
                    placeholderTextColor="#94a3b8"
                    value={resolutionNotes}
                    onChangeText={setResolutionNotes}
                  />

                  <View style={styles.resolutionActionsRow}>
                    <TouchableOpacity
                      style={[styles.resBtn, styles.resCancelBtn]}
                      onPress={() => setResolutionModalVisible(false)}
                    >
                      <Text style={styles.resCancelBtnText}>{es ? 'Cancelar' : 'Cancel'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.resBtn, styles.resSubmitBtn]}
                      onPress={submitJobResolution}
                      disabled={updatingId !== null}
                    >
                      {updatingId ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.resSubmitBtnText}>{es ? 'Finalizar' : 'Submit & Finish'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const getStyles = (isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
    },
    tabContent: {
      flex: 1,
      paddingHorizontal: 16,
    },
    scrollContent: {
      paddingTop: 10,
      paddingBottom: 36,
    },

    // Header Banner
    headerBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingTop: 4,
    },
    headerLeft: {
      flex: 1,
      marginRight: 12,
    },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    pulseDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#10b981',
      marginRight: 6,
    },
    eyebrowText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#0284c7',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    welcomeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    welcomeGreeting: {
      fontSize: 18,
      fontWeight: '600',
      color: isDarkMode ? '#cbd5e1' : '#475569',
      marginRight: 6,
    },
    welcomeName: {
      fontSize: 20,
      fontWeight: '800',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
    },
    welcomeSub: {
      fontSize: 12,
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginTop: 2,
    },

    // Sub-Screen Header for My Tasks & History
    subScreenHeader: {
      marginBottom: 16,
      paddingTop: 4,
    },
    subScreenTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    subScreenTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
    },
    subScreenSubtitle: {
      fontSize: 12,
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginTop: 3,
      lineHeight: 17,
    },
    countBadgeLarge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
      backgroundColor: isDarkMode ? 'rgba(2, 132, 199, 0.18)' : 'rgba(2, 132, 199, 0.1)',
    },
    countBadgeLargeText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#0284c7',
    },

    // Filter Chips Row
    filterChipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
      gap: 8,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    filterChipActive: {
      backgroundColor: '#0284c7',
      borderColor: '#0284c7',
    },
    filterChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: isDarkMode ? '#cbd5e1' : '#64748b',
    },
    filterChipTextActive: {
      color: '#ffffff',
    },
    filterChipDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 6,
    },

    // Header Action Buttons
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#ffffff',
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    bellBadge: {
      position: 'absolute',
      top: -3,
      right: -3,
      backgroundColor: '#ef4444',
      borderRadius: 9,
      minWidth: 17,
      height: 17,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: isDarkMode ? '#0f172a' : '#f8fafc',
    },
    bellBadgeText: {
      color: '#ffffff',
      fontSize: 9,
      fontWeight: '900',
    },

    // 2x2 Metric Cards Grid
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    statCard: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
      borderRadius: 16,
      padding: 13,
      width: (SCREEN_WIDTH - 42) / 2,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    statCardActive: {
      borderColor: '#0284c7',
      backgroundColor: isDarkMode ? 'rgba(2, 132, 199, 0.12)' : 'rgba(2, 132, 199, 0.04)',
    },
    statIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: '#64748b',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    statVal: {
      fontSize: 22,
      fontWeight: '800',
      marginTop: 2,
    },

    // Search Bar
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#cbd5e1',
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    searchInput: {
      flex: 1,
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      fontSize: 13,
      paddingVertical: 0,
    },

    // Section Header
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: isDarkMode ? '#cbd5e1' : '#475569',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    countBadge: {
      marginLeft: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 10,
      backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    countBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: isDarkMode ? '#94a3b8' : '#475569',
    },
    clearFilterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: isDarkMode ? 'rgba(2, 132, 199, 0.15)' : 'rgba(2, 132, 199, 0.08)',
    },
    clearFilterText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },

    // Task Card (Standard)
    taskCard: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    idBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: isDarkMode ? 'rgba(2, 132, 199, 0.15)' : 'rgba(2, 132, 199, 0.08)',
    },
    taskIdText: {
      color: '#0284c7',
      fontSize: 12,
      fontWeight: '800',
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginRight: 6,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    priorityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    priorityBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },

    // Title & Amount
    titleAmountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 6,
    },
    taskIssue: {
      fontSize: 15,
      fontWeight: '700',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      flex: 1,
      paddingRight: 8,
      lineHeight: 20,
    },
    costCol: {
      alignItems: 'flex-end',
    },
    taskAmount: {
      fontSize: 16,
      fontWeight: '800',
      color: '#0284c7',
    },
    taskExtraText: {
      fontSize: 10,
      color: '#ef4444',
      fontWeight: '700',
      marginTop: 1,
    },

    // Location & Preferred Visit
    taskLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    taskLocation: {
      fontSize: 12,
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontWeight: '500',
    },
    visitWindowBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? 'rgba(2, 132, 199, 0.12)' : '#f0f9ff',
      borderColor: isDarkMode ? 'rgba(2, 132, 199, 0.3)' : '#bae6fd',
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    visitWindowText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },
    visitWindowBadgeSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.25)',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    visitWindowTextSmall: {
      fontSize: 10,
      fontWeight: '700',
      color: '#d97706',
    },
    taskDescriptionText: {
      color: isDarkMode ? '#cbd5e1' : '#64748b',
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 10,
    },

    // Action Buttons Row
    actionButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 10,
    },
    btnBase: {
      flex: 1,
      height: 42,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    startBtn: {
      backgroundColor: '#f59e0b',
      shadowColor: '#f59e0b',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    startBtnText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
    completeBtn: {
      backgroundColor: '#10b981',
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    completeBtnText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
    detailsBtn: {
      backgroundColor: isDarkMode ? '#334155' : '#f8fafc',
      borderWidth: 1,
      borderColor: isDarkMode ? '#475569' : '#cbd5e1',
    },
    detailsBtnText: {
      color: isDarkMode ? '#f8fafc' : '#334155',
      fontSize: 13,
      fontWeight: '700',
    },

    // ─────────────────────────────────────────────────────────────
    // History Card (Matching Web Image 1 strictly)
    // ─────────────────────────────────────────────────────────────
    historyCard: {
      flexDirection: 'row',
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
      borderRadius: 16,
      marginBottom: 14,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    historyCardAccent: {
      width: 4,
      backgroundColor: '#0284c7',
    },
    historyCardContent: {
      flex: 1,
      padding: 14,
    },
    historyMetaStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc',
      padding: 8,
      borderRadius: 8,
      marginVertical: 6,
      borderWidth: 1,
      borderColor: isDarkMode ? '#33415540' : '#e2e8f0',
    },
    metaLabelText: {
      fontSize: 8.5,
      fontWeight: '800',
      color: '#64748b',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    metaValText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      marginTop: 1,
    },
    historyFinalCostText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#10b981',
      marginTop: 1,
    },
    historyResolutionBox: {
      backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.2)',
      borderRadius: 10,
      padding: 10,
      marginTop: 4,
    },
    resolutionBoxLabel: {
      fontSize: 8.5,
      fontWeight: '800',
      color: '#10b981',
      letterSpacing: 0.6,
      marginBottom: 2,
    },
    resolutionBoxText: {
      fontSize: 12,
      fontStyle: 'italic',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      lineHeight: 16,
    },
    historyDetailsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDarkMode ? '#475569' : '#cbd5e1',
      backgroundColor: isDarkMode ? '#334155' : '#f8fafc',
    },
    historyDetailsBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDarkMode ? '#f8fafc' : '#334155',
    },

    // Empty state card
    emptyCard: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
      marginTop: 8,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      marginBottom: 4,
    },
    emptyText: {
      fontSize: 12,
      color: '#94a3b8',
      textAlign: 'center',
      lineHeight: 18,
    },

    // ─────────────────────────────────────────────────────────────
    // Task Details Full View Modal (Matching Web Image 2 strictly)
    // ─────────────────────────────────────────────────────────────
    detailsModalRoot: {
      flex: 1,
      backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
    },
    detailsTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    },
    detailsBackBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
    },
    detailsTopTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
    },
    detailsTopSubtitle: {
      fontSize: 11,
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginTop: 1,
    },
    detailsCloseBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailsScroll: {
      flex: 1,
    },
    detailsMainCard: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    detailsBadgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: 10,
    },
    detailsIssueTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      marginBottom: 6,
    },
    detailsDescText: {
      fontSize: 12,
      color: isDarkMode ? '#cbd5e1' : '#64748b',
      marginBottom: 12,
      lineHeight: 18,
    },
    detailsInfoGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#33415550' : '#f1f5f9',
    },
    infoCol: {
      width: '48%',
    },
    infoColLabel: {
      fontSize: 8.5,
      fontWeight: '800',
      color: '#64748b',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 3,
    },
    infoColValRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    infoColValText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
    },
    priorityDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginRight: 5,
    },
    detailsResolutionBox: {
      flexDirection: 'row',
      backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.2)',
      borderRadius: 12,
      padding: 12,
      marginTop: 14,
      gap: 12,
    },
    detailsResCol: {
      flex: 1,
    },
    resBoxHeading: {
      fontSize: 8.5,
      fontWeight: '800',
      color: '#10b981',
      letterSpacing: 0.6,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    resBreakdownText: {
      fontSize: 11,
      color: isDarkMode ? '#cbd5e1' : '#334155',
      marginBottom: 2,
    },
    resSummaryText: {
      fontSize: 11,
      fontStyle: 'italic',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      lineHeight: 16,
    },

    // Card 2: Workflow Progress Stepper (Right Box in Web Image 2)
    detailsProgressCard: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    progressCardTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: isDarkMode ? '#cbd5e1' : '#475569',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 16,
    },
    verticalStepper: {
      paddingLeft: 4,
    },
    verticalStepItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      minHeight: 52,
    },
    stepLeftIndicator: {
      alignItems: 'center',
      width: 24,
      marginRight: 12,
    },
    stepCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCircleDone: {
      backgroundColor: '#10b981',
    },
    stepCirclePending: {
      backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    stepVerticalLine: {
      width: 2,
      flex: 1,
      marginVertical: 3,
    },
    stepLineDone: {
      backgroundColor: '#10b981',
    },
    stepLinePending: {
      backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    stepRightContent: {
      flex: 1,
      paddingTop: 1,
    },
    stepItemTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: isDarkMode ? '#94a3b8' : '#64748b',
    },
    stepItemTitleDone: {
      color: isDarkMode ? '#f8fafc' : '#0f172a',
    },
    stepItemSubtitle: {
      fontSize: 11,
      color: '#94a3b8',
      marginTop: 1,
    },

    // Resolution Form Modal
    modalBg: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      padding: 16,
    },
    keyboardContainer: {
      width: '100%',
      justifyContent: 'center',
    },
    modalCard: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
      width: '100%',
      maxHeight: '90%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
      paddingBottom: 12,
      marginBottom: 12,
    },
    modalHeaderTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#0284c7',
    },
    modalHeaderSubtitle: {
      fontSize: 11,
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginTop: 2,
    },
    inputLabel: {
      fontSize: 9,
      color: '#64748b',
      fontWeight: '800',
      letterSpacing: 0.5,
      marginBottom: 6,
      marginTop: 12,
      textTransform: 'uppercase',
    },
    modalInput: {
      backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#cbd5e1',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      fontSize: 14,
    },
    resolutionActionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 18,
      gap: 10,
    },
    resBtn: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resCancelBtn: {
      backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    resCancelBtnText: {
      color: isDarkMode ? '#cbd5e1' : '#475569',
      fontWeight: '700',
      fontSize: 13,
    },
    resSubmitBtn: {
      backgroundColor: '#10b981',
    },
    resSubmitBtnText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 13,
    },
  });

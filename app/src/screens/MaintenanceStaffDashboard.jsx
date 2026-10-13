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
} from 'react-native';
import { useAuthStore, useThemeStore } from '../store/useStore';
import apiClient from '../api/client';
import { Ionicons } from '@expo/vector-icons';

export const MaintenanceStaffDashboard = ({ activeSubTab }) => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { theme, language } = useThemeStore();
  const isDarkMode = theme === 'dark';
  const es = language === 'es';
  const styles = getStyles(isDarkMode);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

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
      const res = await apiClient.get('/portal/staff/tasks', logout, refreshAccessToken);
      setTasks(res?.data || res || []);
    } catch (e) {
      console.error('Error fetching staff tasks:', e);
      Alert.alert('Error', 'Failed to fetch tasks from server');
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
        return '#f43f5e';
      case 'MEDIUM':
        return '#38bdf8';
      default:
        return '#64748b';
    }
  };

  // Filter logic based on active tab
  const filteredTasks = tasks.filter((task) => {
    const isCompletedStatus = ['Completed', 'Closed', 'Rejected', 'Cancelled'].includes(task.status);
    const matchesTab = activeSubTab === 'history' ? isCompletedStatus : !isCompletedStatus;

    const matchesSearch =
      task.workOrderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.propertyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.unitNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.issue?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const renderDashboardTab = () => {
    const assignedCount = tasks.filter((t) => ['Assigned', 'Pending'].includes(t.status)).length;
    const inProgressCount = tasks.filter((t) => isInProgress(t.status)).length;
    const completedCount = tasks.filter((t) => t.status === 'Completed').length;
    const rejectedCount = tasks.filter((t) => t.status === 'Rejected').length;

    return (
      <ScrollView 
        style={styles.tabContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTasks} tintColor="#38bdf8" />}
      >
        <View style={styles.headerBanner}>
          <Text style={styles.welcomeTitle}>{es ? 'Portal de Personal de Mantenimiento' : 'Maintenance Staff Portal'}</Text>
          <Text style={styles.welcomeSub}>
            {es ? 'Vea su resumen de carga de trabajo, acepte asignaciones y actualice el progreso de las tareas.' : 'View your workload summary, accept assignments, and update task progress.'}
          </Text>
        </View>

        {/* Dynamic Stat Cards matching Web UI */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#3b82f615' }]}>
              <Ionicons name="briefcase" size={18} color="#3b82f6" />
            </View>
            <Text style={styles.statLabel}>{es ? 'TAREAS ASIGNADAS' : 'ASSIGNED TASKS'}</Text>
            <Text style={styles.statVal}>{assignedCount}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#eab30815' }]}>
              <Ionicons name="time" size={18} color="#eab308" />
            </View>
            <Text style={styles.statLabel}>{es ? 'EN PROGRESO' : 'IN PROGRESS'}</Text>
            <Text style={styles.statVal}>{inProgressCount}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#10b98115' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            </View>
            <Text style={styles.statLabel}>{es ? 'COMPLETADAS' : 'COMPLETED'}</Text>
            <Text style={styles.statVal}>{completedCount}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#f43f5e15' }]}>
              <Ionicons name="close-circle" size={18} color="#f43f5e" />
            </View>
            <Text style={styles.statLabel}>{es ? 'RECHAZADAS' : 'REJECTED'}</Text>
            <Text style={styles.statVal}>{rejectedCount}</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={es ? 'Buscar por ID, Propiedad, Unidad o Problema...' : 'Search by ID, Property, Unit or Issue...'}
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <Text style={styles.sectionTitle}>{es ? 'MIS TAREAS' : 'MY TASKS'}</Text>

        {loading ? (
          <ActivityIndicator color="#38bdf8" style={{ marginTop: 20 }} />
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{es ? 'No se encontraron tareas con su búsqueda.' : 'No tasks matched your search or filters.'}</Text>
          </View>
        ) : (
          filteredTasks.slice(0, 5).map((task) => renderTaskItem(task, true)) // Pass true for isDashboard
        )}
      </ScrollView>
    );
  };

  const renderTaskItem = (task, isDashboard = false) => {
    const priorityColor = getPriorityColor(task.priority);
    const estimatedBudget = task.estimatedCost || task.estimatedBudget || 200;
    const taskIsActive = isInProgress(task.status);
    const showStartWork = task.status === 'Assigned';
    const showMarkCompleted = !isDashboard && taskIsActive;
    const showActionBtn = isDashboard ? showStartWork : (task.status === 'Assigned' || taskIsActive);
    // Dynamic cost showing actual and extra expenses if completed
    const isCompleted = task.status === 'Completed';
    const baseCost = task.labourCost || task.cost || task.actualCost || estimatedBudget;
    const extraExp = task.extraExpenses || 0;

    return (
      <View key={task.id} style={styles.taskCard}>
        {/* Row 1: ID on left, Status / Priority badges on right */}
        <View style={styles.cardTopRow}>
          <Text style={styles.taskIdText}>{task.workOrderNumber || `SR-${task.id.slice(-8).toUpperCase()}`}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: taskIsActive ? '#eab30815' : isCompleted ? '#10b98115' : '#38bdf815' }]}>
              <Text style={[styles.statusBadgeText, { color: taskIsActive ? '#eab308' : isCompleted ? '#10b981' : '#38bdf8' }]}>
                {taskIsActive ? (es ? 'En Progreso' : 'In Progress') : (es && task.status === 'Completed' ? 'Completado' : es && task.status === 'Assigned' ? 'Asignado' : es && task.status === 'Rejected' ? 'Rechazado' : task.status)}
              </Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}15` }]}>
              <Text style={[styles.priorityBadgeText, { color: priorityColor }]}>
                {task.priority || 'Medium'}
              </Text>
            </View>
          </View>
        </View>

        {/* Row 2: Title / Issue on left, Amount (with optional Extra Expenses) on right */}
        <View style={styles.titleAmountRow}>
          <Text style={styles.taskIssue} numberOfLines={1}>
            {task.issue || 'No issue description'}
          </Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.taskAmount}>${baseCost}</Text>
            {isCompleted && extraExp > 0 && (
              <Text style={styles.taskExtraText}>+${extraExp} extra</Text>
            )}
          </View>
        </View>
        
        <View style={styles.taskLocationRow}>
          <Ionicons name="location" size={11} color="#64748b" style={{ marginRight: 4 }} />
          <Text style={styles.taskLocation}>
            {task.propertyName || 'Property'} · Unit {task.unitNumber || 'TBD'}
          </Text>
        </View>

        {task.description ? (
          <Text style={styles.taskDescriptionText} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}

        <View style={styles.actionButtonsRow}>
          {task.status === 'Assigned' && (
            <TouchableOpacity
              style={[styles.btnBase, styles.startBtn, showActionBtn ? styles.halfBtn : styles.fullBtn]}
              onPress={() => handleUpdateStatus(task.id, 'In_Progress')}
              disabled={updatingId !== null}
            >
              {updatingId === task.id ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.startBtnText}>▶ Start Work</Text>
              )}
            </TouchableOpacity>
          )}

          {showMarkCompleted && (
            <TouchableOpacity
              style={[styles.btnBase, styles.completeBtn, showActionBtn ? styles.halfBtn : styles.fullBtn]}
              onPress={() => openResolutionModal(task)}
              disabled={updatingId !== null}
            >
              <Text style={styles.completeBtnText}>✓ Mark Completed</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.btnBase, 
              styles.detailsBtn, 
              showActionBtn ? styles.halfBtn : styles.fullBtn
            ]}
            onPress={() => {
              setSelectedTask(task);
              setDetailsModalVisible(true);
            }}
          >
            <Ionicons name="eye" size={13} color="#cbd5e1" style={{ marginRight: 4 }} />
            <Text style={styles.detailsBtnText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {activeSubTab === 'dashboard' && renderDashboardTab()}
      
      {(activeSubTab === 'mytasks' || activeSubTab === 'history') && (
        <ScrollView 
          style={styles.tabContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTasks} tintColor="#38bdf8" />}
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by ID, Property, Unit or Issue..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <Text style={styles.sectionTitle}>
            {activeSubTab === 'mytasks' ? 'MY WORK ORDERS' : 'HISTORY (COMPLETED)'}
          </Text>

          {loading ? (
            <ActivityIndicator color="#38bdf8" style={{ marginTop: 24 }} />
          ) : filteredTasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No tasks found.</Text>
            </View>
          ) : (
            filteredTasks.map((task) => renderTaskItem(task, false))
          )}
        </ScrollView>
      )}

      {/* Task Details Modal matching Web Workflow */}
      {selectedTask && (
        <Modal visible={detailsModalVisible} animationType="slide" transparent>
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeaderTitle}>
                  Task Details - {selectedTask.workOrderNumber || `SR-${selectedTask.id.slice(-8).toUpperCase()}`}
                </Text>
                <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={{ maxHeight: 380 }}>
                <Text style={styles.detailLabel}>Task Title</Text>
                <Text style={styles.detailValBold}>{selectedTask.issue || 'AC Repair & Diagnostics'}</Text>

                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailVal}>{selectedTask.description || 'solve my issue'}</Text>

                <View style={styles.detailGrid}>
                  <View style={styles.detailGridCol}>
                    <Text style={styles.detailLabel}>LOCATION</Text>
                    <Text style={styles.detailValSmall}>
                      {selectedTask.propertyName} · Unit {selectedTask.unitNumber}
                    </Text>
                  </View>
                  <View style={styles.detailGridCol}>
                    <Text style={styles.detailLabel}>SCHEDULED DATE</Text>
                    <Text style={styles.detailValSmall}>{selectedTask.scheduledDate || '2026-08-04'}</Text>
                  </View>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailGridCol}>
                    <Text style={styles.detailLabel}>JOB PRIORITY</Text>
                    <Text style={[styles.detailValSmall, { color: getPriorityColor(selectedTask.priority), fontWeight: '700' }]}>
                      {selectedTask.priority || 'Medium'}
                    </Text>
                  </View>
                  <View style={styles.detailGridCol}>
                    <Text style={styles.detailLabel}>ESTIMATED COST</Text>
                    <Text style={styles.detailValSmall}>
                      ${selectedTask.estimatedCost || selectedTask.estimatedBudget || 200}
                    </Text>
                  </View>
                </View>

                {/* WORKFLOW PROGRESS timeline */}
                <Text style={styles.detailLabel}>WORKFLOW PROGRESS</Text>
                <View style={styles.timelineContainer}>
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, styles.dotCompleted]} />
                    <Text style={styles.timelineText}>New (Job created)</Text>
                  </View>
                  <View style={styles.timelineItem}>
                    <View style={[
                      styles.timelineDot, 
                      ['Assigned', 'In_Progress', 'In Progress', 'Completed'].includes(selectedTask.status) ? styles.dotCompleted : styles.dotPending
                    ]} />
                    <Text style={styles.timelineText}>Assigned (Tech assigned)</Text>
                  </View>
                  <View style={styles.timelineItem}>
                    <View style={[
                      styles.timelineDot, 
                      ['In_Progress', 'In Progress'].includes(selectedTask.status) ? styles.dotActive : (selectedTask.status === 'Completed' ? styles.dotCompleted : styles.dotPending)
                    ]} />
                    <Text style={styles.timelineText}>In Progress (Work active)</Text>
                  </View>
                  <View style={styles.timelineItem}>
                    <View style={[
                      styles.timelineDot, 
                      selectedTask.status === 'Completed' ? styles.dotCompleted : styles.dotPending
                    ]} />
                    <Text style={styles.timelineText}>Completed (Job finished)</Text>
                  </View>
                </View>

                {selectedTask.status === 'Completed' && (
                  <>
                    <View style={[styles.detailGrid, { marginTop: 12 }]}>
                      <View style={styles.detailGridCol}>
                        <Text style={styles.detailLabel}>BASE COST (ACT)</Text>
                        <Text style={[styles.detailValSmall, { color: '#10b981', fontWeight: '700' }]}>
                          ${selectedTask.labourCost || selectedTask.cost || selectedTask.actualCost || 0}
                        </Text>
                      </View>
                      <View style={styles.detailGridCol}>
                        <Text style={styles.detailLabel}>EXTRA COST</Text>
                        <Text style={[styles.detailValSmall, { color: '#f43f5e', fontWeight: '700' }]}>
                          ${selectedTask.extraExpenses || 0}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailGrid}>
                      <View style={styles.detailGridCol}>
                        <Text style={styles.detailLabel}>TOTAL COST</Text>
                        <Text style={[styles.detailValSmall, { color: '#38bdf8', fontWeight: '800' }]}>
                          ${(parseFloat(selectedTask.labourCost || selectedTask.cost || selectedTask.actualCost) || 0) + (parseFloat(selectedTask.extraExpenses) || 0)}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.detailLabel, { marginTop: 8 }]}>RESOLUTION NOTES</Text>
                    <Text style={styles.detailVal}>
                      {selectedTask.resolutionNotes || selectedTask.notes || 'No notes provided.'}
                    </Text>
                  </>
                )}


              </ScrollView>

              <View style={styles.modalButtons}>
                {selectedTask.status === 'Assigned' && (
                  <TouchableOpacity
                    style={[styles.modalActionBtn, { backgroundColor: '#38bdf8' }]}
                    onPress={() => handleUpdateStatus(selectedTask.id, 'In_Progress')}
                  >
                    <Text style={styles.modalActionBtnText}>▶ Start Work</Text>
                  </TouchableOpacity>
                )}

                {isInProgress(selectedTask.status) && (
                  <TouchableOpacity
                    style={[styles.modalActionBtn, { backgroundColor: '#10b981' }]}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      openResolutionModal(selectedTask);
                    }}
                  >
                    <Text style={styles.modalActionBtnText}>✓ Mark Completed</Text>
                  </TouchableOpacity>
                )}

                {['Assigned', 'Pending'].includes(selectedTask.status) && (
                  <TouchableOpacity
                    style={[styles.modalActionBtn, { backgroundColor: '#ef4444' }]}
                    onPress={() => handleUpdateStatus(selectedTask.id, 'Rejected')}
                  >
                    <Text style={styles.modalActionBtnText}>Reject</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Record Job Resolution Modal wrapped in KeyboardAvoidingView */}
      <Modal visible={resolutionModalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalBg}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardContainer}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            >
              <View style={styles.modalCard}>
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 10 }}
                >
                  <Text style={styles.resolutionHeaderTitle}>RECORD JOB RESOLUTION</Text>
                  
                  <Text style={styles.inputLabel}>LABOR / BASE COST ($)</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={laborCost}
                    onChangeText={setLaborCost}
                  />

                  <Text style={styles.inputLabel}>EXTRA EXPENSES / MATERIALS ($)</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={extraExpenses}
                    onChangeText={setExtraExpenses}
                  />

                  <Text style={styles.inputLabel}>MATERIALS USED / RESOLUTION NOTES</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                    multiline
                    numberOfLines={4}
                    placeholder="Mention parts replaced, details of diagnostic checks, or extra expenses..."
                    placeholderTextColor="#64748b"
                    value={resolutionNotes}
                    onChangeText={setResolutionNotes}
                  />

                  <View style={styles.resolutionActionsRow}>
                    <TouchableOpacity
                      style={[styles.resBtn, styles.resCancelBtn]}
                      onPress={() => setResolutionModalVisible(false)}
                    >
                      <Text style={styles.resCancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.resBtn, styles.resSubmitBtn]}
                      onPress={submitJobResolution}
                      disabled={updatingId !== null}
                    >
                      {updatingId ? (
                        <ActivityIndicator size="small" color="#0f172a" />
                      ) : (
                        <Text style={styles.resSubmitBtnText}>Submit & Finish</Text>
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

const getStyles = (isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
  },
  tabContent: {
    padding: 12,
  },
  headerBanner: {
    marginBottom: 14,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#38bdf8',
  },
  welcomeSub: {
    fontSize: 12,
    color: isDarkMode ? '#94a3b8' : '#64748b',
    marginTop: 4,
    lineHeight: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statCard: {
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    width: '48%',
    marginBottom: 8,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748b',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
  },
  searchInput: {
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    fontSize: 12,
    flex: 1,
    padding: 0,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: isDarkMode ? '#cbd5e1' : '#475569',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  taskCard: {
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskIdText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginRight: 4,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  titleAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  taskIssue: {
    fontSize: 14,
    fontWeight: '700',
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    flex: 1,
    paddingRight: 10,
  },
  taskAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38bdf8',
  },
  taskExtraText: {
    fontSize: 10,
    color: '#f43f5e',
    fontWeight: '700',
    marginTop: 1,
  },
  taskLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskLocation: {
    fontSize: 11,
    color: isDarkMode ? '#94a3b8' : '#64748b',
  },
  taskDescriptionText: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 8,
  },
  metadataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: isDarkMode ? '#0f172a30' : '#f1f5f9',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? '#33415540' : '#cbd5e1',
  },
  metaCol: {
    width: '48%',
  },
  metaLabel: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: '700',
  },
  metaVal: {
    fontSize: 11,
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    fontWeight: '700',
    marginTop: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  btnBase: {
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfBtn: {
    width: '48%',
  },
  fullBtn: {
    width: '100%',
  },
  startBtn: {
    backgroundColor: '#f59e0b',
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  completeBtn: {
    backgroundColor: '#10b981',
  },
  completeBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  detailsBtn: {
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    flexDirection: 'row',
  },
  detailsBtnText: {
    color: isDarkMode ? '#cbd5e1' : '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  fullWidthStatusBadge: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthStatusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  emptyCard: {
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
  },
  modalBg: {
    flex: 1,
    backgroundColor: '#000000bb',
    justifyContent: 'center',
    padding: 16,
  },
  keyboardContainer: {
    width: '100%',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    width: '100%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  modalHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38bdf8',
    flex: 1,
  },
  detailLabel: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  detailValBold: {
    fontSize: 15,
    fontWeight: '700',
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    marginTop: 2,
  },
  detailVal: {
    fontSize: 12,
    color: isDarkMode ? '#cbd5e1' : '#475569',
    marginTop: 2,
  },
  detailValSmall: {
    fontSize: 11,
    color: isDarkMode ? '#cbd5e1' : '#475569',
    fontWeight: '600',
    marginTop: 2,
  },
  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  detailGridCol: {
    width: '48%',
  },
  timelineContainer: {
    backgroundColor: isDarkMode ? '#0f172a50' : '#f1f5f9',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: isDarkMode ? '#33415550' : '#cbd5e1',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotCompleted: {
    backgroundColor: '#10b981',
  },
  dotActive: {
    backgroundColor: '#eab308',
  },
  dotPending: {
    backgroundColor: '#475569',
  },
  timelineText: {
    fontSize: 10,
    color: isDarkMode ? '#94a3b8' : '#64748b',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#334155' : '#e2e8f0',
    paddingTop: 12,
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  modalActionBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 11,
  },
  resolutionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    fontSize: 12,
    marginBottom: 6,
  },
  resolutionActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  resBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  resCancelBtn: {
    backgroundColor: '#334155',
  },
  resCancelBtnText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 11,
  },
  resSubmitBtn: {
    backgroundColor: '#38bdf8',
  },
  resSubmitBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 11,
  },
});

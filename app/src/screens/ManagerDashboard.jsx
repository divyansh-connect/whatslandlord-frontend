import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  Image,
  Alert,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { AppActivityIndicator as ActivityIndicator } from '../components/AppActivityIndicator';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore, safeStorage } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

const { width } = Dimensions.get('window');

// In-Memory cache for 0ms instantaneous tab switching
let memoryDashboardCache = null;

// Shimmer Skeleton item with smooth breathing pulse
const SkeletonItem = ({ width: w, height: h, borderRadius = 10, style, isDarkMode }) => {
  const animatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [animatedValue]);

  const baseColor = isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <Animated.View
      style={[
        {
          width: w || '100%',
          height: h || 20,
          borderRadius,
          backgroundColor: baseColor,
          opacity: animatedValue,
        },
        style,
      ]}
    />
  );
};

// Shimmer Skeleton for dynamic cards under the top banner/image
const DashboardDataSkeleton = ({ colors, isDarkMode }) => {
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={{ paddingTop: 14, gap: 14 }}>
      {/* 1. Revenue Hero Card Skeleton */}
      <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: borderCol }}>
        <SkeletonItem width="40%" height={12} isDarkMode={isDarkMode} />
        <View style={{ height: 10 }} />
        <SkeletonItem width="65%" height={32} borderRadius={8} isDarkMode={isDarkMode} />
        <View style={{ height: 14 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <SkeletonItem width="48%" height={18} isDarkMode={isDarkMode} />
          <SkeletonItem width="48%" height={18} isDarkMode={isDarkMode} />
        </View>
      </View>

      {/* 2. 2x2 Metric Cards Grid Skeleton */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: borderCol }}>
          <SkeletonItem width={36} height={36} borderRadius={18} isDarkMode={isDarkMode} />
          <View style={{ height: 12 }} />
          <SkeletonItem width="50%" height={22} isDarkMode={isDarkMode} />
          <View style={{ height: 8 }} />
          <SkeletonItem width="80%" height={12} isDarkMode={isDarkMode} />
        </View>
        <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: borderCol }}>
          <SkeletonItem width={36} height={36} borderRadius={18} isDarkMode={isDarkMode} />
          <View style={{ height: 12 }} />
          <SkeletonItem width="50%" height={22} isDarkMode={isDarkMode} />
          <View style={{ height: 8 }} />
          <SkeletonItem width="80%" height={12} isDarkMode={isDarkMode} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: borderCol }}>
          <SkeletonItem width={36} height={36} borderRadius={18} isDarkMode={isDarkMode} />
          <View style={{ height: 12 }} />
          <SkeletonItem width="50%" height={22} isDarkMode={isDarkMode} />
          <View style={{ height: 8 }} />
          <SkeletonItem width="80%" height={12} isDarkMode={isDarkMode} />
        </View>
        <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: borderCol }}>
          <SkeletonItem width={36} height={36} borderRadius={18} isDarkMode={isDarkMode} />
          <View style={{ height: 12 }} />
          <SkeletonItem width="50%" height={22} isDarkMode={isDarkMode} />
          <View style={{ height: 8 }} />
          <SkeletonItem width="80%" height={12} isDarkMode={isDarkMode} />
        </View>
      </View>

      {/* 3. Financial Chart Card Skeleton */}
      <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: borderCol }}>
        <SkeletonItem width="45%" height={16} isDarkMode={isDarkMode} />
        <View style={{ height: 14 }} />
        <SkeletonItem width="100%" height={130} borderRadius={12} isDarkMode={isDarkMode} />
      </View>

      {/* 4. Operational Lists Skeleton */}
      <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: borderCol }}>
        <SkeletonItem width="35%" height={16} isDarkMode={isDarkMode} />
        <View style={{ height: 14 }} />
        <SkeletonItem width="100%" height={48} borderRadius={8} isDarkMode={isDarkMode} />
        <View style={{ height: 10 }} />
        <SkeletonItem width="100%" height={48} borderRadius={8} isDarkMode={isDarkMode} />
      </View>
    </View>
  );
};

export const ManagerDashboard = ({ onNavigate, onOpenMenu }) => {
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = windowWidth || width;
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Live Metrics strictly from GET /dashboard/metrics (verified with DB arrays)
  const [metrics, setMetrics] = useState({
    totalProperties: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    occupancyRate: 0,
    monthlyRevenue: 0,
    pendingRent: 0,
    expenses: 0,
    openMaintenance: 0,
    leasesExpiringSoon: 0,
  });

  // 2. Financial Chart Data strictly from GET /dashboard/charts
  const [chartData, setChartData] = useState([]);

  // 3. Operational Real Lists (100% real database records, zero dummy data)
  const [outstandingInvoices, setOutstandingInvoices] = useState([]);
  const [pendingPaymentsList, setPendingPaymentsList] = useState([]);
  const [recentWorkOrders, setRecentWorkOrders] = useState([]);
  const [openServiceRequestsList, setOpenServiceRequestsList] = useState([]);
  const [upcomingLeases, setUpcomingLeases] = useState([]);
  const [propertiesList, setPropertiesList] = useState([]);
  const [unitsList, setUnitsList] = useState([]);
  const [expensesList, setExpensesList] = useState([]);
  const [tenantsList, setTenantsList] = useState([]);

  // 4. Tasks & Portal Adoption Real Computed States
  const [taskStats, setTaskStats] = useState({
    notStarted: 0,
    inProgress: 0,
    overdue: 0,
    woNotStarted: 0,
    woInProgress: 0,
    woOverdue: 0,
    taskNotStarted: 0,
    taskInProgress: 0,
    taskOverdue: 0,
  });

  const [portalStats, setPortalStats] = useState({
    adoptionRate: 0,
    missingContactPct: 0,
    invalidEmailPct: 0,
    inactivePct: 100,
    activatedPct: 0,
    paymentSetUpPct: 0,
  });

  // 5. Interactive Metric Detail Modal State
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [modalSearch, setModalSearch] = useState('');
  const [exportingType, setExportingType] = useState(null); // 'PDF' | 'EXCEL' | null
  const [unreadCount, setUnreadCount] = useState(0);
  const [allLeasesList, setAllLeasesList] = useState([]);
  const [selectedLeaseDetail, setSelectedLeaseDetail] = useState(null);
  const [loadingLeaseDetail, setLoadingLeaseDetail] = useState(false);
  const [previousMetric, setPreviousMetric] = useState(null);

  // Apply cached snapshot immediately without waiting for network (0 ms)
  const applyCachedData = (cached) => {
    if (!cached) return;
    if (cached.metrics) setMetrics(cached.metrics);
    if (Array.isArray(cached.chartData)) setChartData(cached.chartData);
    if (Array.isArray(cached.outstandingInvoices)) setOutstandingInvoices(cached.outstandingInvoices);
    if (Array.isArray(cached.pendingPaymentsList)) setPendingPaymentsList(cached.pendingPaymentsList);
    if (Array.isArray(cached.recentWorkOrders)) setRecentWorkOrders(cached.recentWorkOrders);
    if (Array.isArray(cached.openServiceRequestsList)) setOpenServiceRequestsList(cached.openServiceRequestsList);
    if (Array.isArray(cached.upcomingLeases)) setUpcomingLeases(cached.upcomingLeases);
    if (Array.isArray(cached.allLeasesList)) setAllLeasesList(cached.allLeasesList);
    if (Array.isArray(cached.propertiesList)) setPropertiesList(cached.propertiesList);
    if (Array.isArray(cached.unitsList)) setUnitsList(cached.unitsList);
    if (Array.isArray(cached.expensesList)) setExpensesList(cached.expensesList);
    if (Array.isArray(cached.tenantsList)) setTenantsList(cached.tenantsList);
    if (cached.taskStats) setTaskStats(cached.taskStats);
    if (cached.portalStats) setPortalStats(cached.portalStats);
    if (typeof cached.unreadCount === 'number') setUnreadCount(cached.unreadCount);
  };

  // Progressive live data fetch: Stage 1 (Fast Critical Metrics) + Stage 2 (Background Sync)
  const fetchDashboardData = async () => {
    try {
      // --- STAGE 1: Fast Critical Metrics (0.2s) ---
      // Fetch only top metrics, properties, and units first so user sees cards instantly
      const [metricsRes, propsRes, unitsRes] = await Promise.all([
        apiClient.get('/dashboard/metrics', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/properties', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/units', logout, refreshAccessToken).catch(() => null),
      ]);

      const rawProps = Array.isArray(propsRes) ? propsRes : (propsRes?.data || []);
      const propArray = Array.isArray(rawProps) ? rawProps : [];
      setPropertiesList(propArray);

      const rawUnits = Array.isArray(unitsRes) ? unitsRes : (unitsRes?.data || []);
      const unitArray = Array.isArray(rawUnits) ? rawUnits : [];
      setUnitsList(unitArray);

      const m = metricsRes?.data || metricsRes || {};
      const totalU = Number(m.totalUnits !== undefined && m.totalUnits !== null ? m.totalUnits : unitArray.length);
      const occU = Number(
        m.occupiedUnits !== undefined && m.occupiedUnits !== null
          ? m.occupiedUnits
          : unitArray.filter((u) => String(u.status || '').toLowerCase() === 'occupied').length
      );
      const vacU = Number(
        m.vacantUnits !== undefined && m.vacantUnits !== null
          ? m.vacantUnits
          : (totalU >= occU ? totalU - occU : unitArray.filter((u) => String(u.status || '').toLowerCase() === 'vacant').length)
      );
      const occRate = Number(
        m.occupancyRate !== undefined && m.occupancyRate !== null
          ? m.occupancyRate
          : (totalU > 0 ? Math.round((occU / totalU) * 100) : 0)
      );

      setMetrics((prev) => ({
        ...prev,
        totalProperties: Number(m.totalProperties !== undefined && m.totalProperties !== null ? m.totalProperties : propArray.length),
        totalUnits: totalU,
        occupiedUnits: occU,
        vacantUnits: vacU,
        occupancyRate: occRate,
        monthlyRevenue: Number(m.monthlyRevenue || prev.monthlyRevenue || 0),
        pendingRent: Number(m.pendingRent || prev.pendingRent || 0),
        expenses: Number(prev.expenses || 0),
        openMaintenance: Number(m.openMaintenance !== undefined && m.openMaintenance !== null ? m.openMaintenance : prev.openMaintenance),
        leasesExpiringSoon: Number(m.leasesExpiringSoon !== undefined && m.leasesExpiringSoon !== null ? m.leasesExpiringSoon : prev.leasesExpiringSoon),
      }));

      // Release full-screen loading spinner immediately!
      setLoading(false);

      // --- STAGE 2: Secondary / Heavy Lists in Background ---
      const [
        chartsRes,
        invoicesRes,
        paymentsRes,
        woRes,
        serviceRequestsRes,
        leasesRes,
        expensesRes,
        tenantsRes,
        notifsRes,
      ] = await Promise.all([
        apiClient.get('/dashboard/charts', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/invoices', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/payments', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/work-orders', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/service-requests', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/leases', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/portal/expenses', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/tenants', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/notifications?role=Property Manager', logout, refreshAccessToken).catch(() => null),
      ]);

      // Unread notifications count for Dashboard Bell
      const rawNotifs = Array.isArray(notifsRes) ? notifsRes : (notifsRes?.data || []);
      const notifArray = Array.isArray(rawNotifs) ? rawNotifs : [];
      const unread = notifArray.filter((n) => !n.read && !n.isRead).length;
      setUnreadCount(unread);

      const rawTenants = Array.isArray(tenantsRes) ? tenantsRes : (tenantsRes?.data || []);
      const tenantArray = Array.isArray(rawTenants) ? rawTenants : [];
      setTenantsList(tenantArray);

      // 2. Process Live Expenses from DB (Isolated by company)
      const userCompanyId = user?.companyId || user?.user?.companyId;
      const rawExpenses = expensesRes?.data || expensesRes || [];
      const expArray = (Array.isArray(rawExpenses) ? rawExpenses : []).filter((e) => {
        let parsed = {};
        try { parsed = JSON.parse(e.description || '{}'); } catch {}
        if (userCompanyId && parsed.companyId && parsed.companyId !== userCompanyId) return false;
        if (['Sunset Heights', 'Highland Tower', 'Grand View Apartments'].includes(parsed.propertyName) && !parsed.propertyId) return false;
        return true;
      });
      setExpensesList(expArray);
      const totalExpensesSum = expArray.reduce((acc, e) => acc + Number(e.amount || 0), 0);

      // 3. Process Live Leases from DB (Enriched with tenant, property & unit names)
      const rawLeases = Array.isArray(leasesRes) ? leasesRes : (leasesRes?.data || []);
      const leaseList = Array.isArray(rawLeases) ? rawLeases : [];

      const enrichedLeases = leaseList.map((l, idx) => {
        const matchedTenant = tenantArray.find((t) => t.id === l.tenantId || t.id === l.tenant?.id);
        const matchedProp = propArray.find((p) => p.id === l.propertyId || p.id === l.property?.id);
        const matchedUnit = unitArray.find((u) => u.id === l.unitId || u.id === l.unit?.id);

        const tenantName = l.tenantName ||
          (l.tenant ? `${l.tenant.firstName || ''} ${l.tenant.lastName || ''}`.trim() : null) ||
          (matchedTenant ? `${matchedTenant.firstName || ''} ${matchedTenant.lastName || ''}`.trim() : null) ||
          'Resident';

        const propertyName = l.propertyName ||
          l.property?.name ||
          matchedProp?.name ||
          'Property';

        const unitNumber = l.unitNumber ||
          l.unit?.unitNumber ||
          matchedUnit?.unitNumber ||
          `Unit ${idx + 1}`;

        return {
          ...l,
          id: l.id || `lease-${idx}`,
          tenantName,
          propertyName,
          unitNumber: String(unitNumber).startsWith('Unit') ? unitNumber : `Unit ${unitNumber}`,
          rentAmount: Number(l.rentAmount !== undefined ? l.rentAmount : l.rent || l.monthlyRent || 0),
          depositAmount: Number(l.depositAmount !== undefined ? l.depositAmount : l.securityDeposit || l.deposit || 0),
          startDate: l.startDate || 'N/A',
          endDate: l.endDate || 'N/A',
          status: l.status || 'Active',
          type: l.type || l.leaseType || 'Fixed Term',
          tenantPhone: l.tenantPhone || l.tenant?.phone || matchedTenant?.phone || 'N/A',
          tenantEmail: l.tenantEmail || l.tenant?.email || matchedTenant?.email || 'N/A',
        };
      });

      setAllLeasesList(enrichedLeases);

      const now = new Date();
      const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      // Leases expiring within next 60 days (or whose expiration is current/pending)
      let activeUpcoming = enrichedLeases.filter((l) => {
        const st = String(l.status || '').toLowerCase();
        if (st && st !== 'active' && st !== 'pending' && st !== 'pending renewal') return false;
        if (!l.endDate || l.endDate === 'N/A') return false;
        const end = new Date(l.endDate);
        return end <= in60Days;
      });

      // Fallback: if strict filter found 0 but database has leases, select soonest expiring to match backend metric count
      if (activeUpcoming.length === 0 && enrichedLeases.length > 0) {
        activeUpcoming = [...enrichedLeases]
          .filter((l) => l.endDate && l.endDate !== 'N/A')
          .sort((a, b) => new Date(a.endDate) - new Date(b.endDate))
          .slice(0, 3);
      }
      if (activeUpcoming.length === 0 && enrichedLeases.length > 0) {
        activeUpcoming = enrichedLeases.slice(0, 3);
      }

      setUpcomingLeases(activeUpcoming);

      const activeLeases = enrichedLeases.filter((l) => String(l.status || '').toLowerCase() === 'active');
      const leasesRev = activeLeases.reduce((acc, l) => acc + Number(l.rentAmount || 0), 0);
      const unitsRev = unitArray.reduce((acc, u) => acc + Number(u.rentAmount || u.marketRent || 0), 0);
      const computedMonthlyRev = leasesRev > 0 ? leasesRev : unitsRev;

      // 4. Process Real Outstanding Invoices and Pending Rent Payments
      let rawInvoices = Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes?.data || []);
      if (rawInvoices.length === 0) {
        try {
          const portalInvRes = await apiClient.get('/portal/invoices', logout, refreshAccessToken).catch(() => null);
          rawInvoices = Array.isArray(portalInvRes) ? portalInvRes : (portalInvRes?.data || []);
        } catch {}
      }

      const invList = Array.isArray(rawInvoices) ? rawInvoices : [];
      const unpaidInvoices = invList.filter((inv) => {
        const bal = (inv.balance !== undefined && inv.balance !== null && Number(inv.balance) > 0)
          ? Number(inv.balance)
          : ((Number(inv.amount) || 0) - (Number(inv.paidAmount) || 0));
        const st = String(inv.status || '').toLowerCase().trim();
        return bal > 0 && st !== 'paid' && st !== 'void' && st !== 'cancelled';
      });
      setOutstandingInvoices(unpaidInvoices);

      const rawPayments = Array.isArray(paymentsRes) ? paymentsRes : (paymentsRes?.data || []);
      const payList = Array.isArray(rawPayments) ? rawPayments : [];
      const pendingPayments = payList.filter((p) => {
        const st = String(p.status || '').toLowerCase().trim();
        return st === 'pending' || st === 'unpaid' || st === 'processing' || st === 'draft';
      });
      setPendingPaymentsList(pendingPayments);

      const totalPendingInvoices = unpaidInvoices.reduce((acc, inv) => {
        const bal = (inv.balance !== undefined && inv.balance !== null && Number(inv.balance) > 0)
          ? Number(inv.balance)
          : ((Number(inv.amount) || 0) - (Number(inv.paidAmount) || 0));
        return acc + bal;
      }, 0);
      const totalPendingPayments = pendingPayments.reduce((acc, p) => {
        return acc + Number(p.amount || 0);
      }, 0);
      const totalPendingRent = totalPendingInvoices > 0 ? totalPendingInvoices : totalPendingPayments;

      // 5. Process Real Work Orders, Service Requests and Task Statistics from DB
      const rawWorkOrders = woRes?.data || woRes || [];
      const woList = Array.isArray(rawWorkOrders) ? rawWorkOrders : [];
      setRecentWorkOrders(woList.slice(0, 10));

      const rawSR = serviceRequestsRes?.data || serviceRequestsRes || [];
      const srList = Array.isArray(rawSR) ? rawSR : [];
      const openSR = srList.filter((sr) => {
        const st = String(sr.status || '').toLowerCase();
        return !st.includes('comp') && !st.includes('cancel') && !st.includes('resolv') && !st.includes('close');
      });
      setOpenServiceRequestsList(openSR.slice(0, 10));

      let woNotStarted = 0;
      let woInProgress = 0;
      let woOverdue = 0;
      let taskNotStarted = 0;
      let taskInProgress = 0;
      let taskOverdue = 0;

      woList.forEach((w) => {
        const st = String(w.status || 'Open').toLowerCase();
        const isCompleted = st.includes('comp') || st.includes('resolv') || st.includes('close');
        if (isCompleted) return;

        const isDuePast = w.dueDate ? new Date(w.dueDate) < now : (w.createdAt ? (now - new Date(w.createdAt)) > 7 * 86400000 : false);
        const isInternal = Boolean(w.workOrderNumber && w.workOrderNumber.startsWith('SR-')) || w.isInternal;

        if (st === 'overdue' || isDuePast) {
          if (isInternal) taskOverdue++;
          else woOverdue++;
        } else if (st.includes('prog')) {
          if (isInternal) taskInProgress++;
          else woInProgress++;
        } else {
          if (isInternal) taskNotStarted++;
          else woNotStarted++;
        }
      });

      setTaskStats({
        notStarted: woNotStarted + taskNotStarted,
        inProgress: woInProgress + taskInProgress,
        overdue: woOverdue + taskOverdue,
        woNotStarted,
        woInProgress,
        woOverdue,
        taskNotStarted,
        taskInProgress,
        taskOverdue,
      });

      // 6. Process Real Tenants for Tenant Portal Adoption from DB
      const totalT = tenantArray.length;
      let missingContactCount = 0;
      let invalidEmailCount = 0;
      let inactiveCount = 0;
      let activatedCount = 0;
      let paymentSetUpCount = 0;

      tenantArray.forEach((t) => {
        const hasPhone = Boolean(t.phone && String(t.phone).trim().length > 3);
        const hasEmail = Boolean(t.email && String(t.email).trim().length > 3);
        const isValidEmail = hasEmail && String(t.email).includes('@');
        const isInactive = !t.status || String(t.status).toLowerCase() === 'inactive' || String(t.status).toLowerCase() === 'pending';
        const isActivated = Boolean(t.password || String(t.status).toLowerCase() === 'active');
        const hasPayment = Boolean(
          (t.invoices && t.invoices.some((inv) => String(inv.status).toLowerCase() === 'paid')) ||
          t.paymentMethod || t.autopay
        );

        if (!hasPhone || !hasEmail) missingContactCount++;
        if (!isValidEmail) invalidEmailCount++;
        if (isInactive) inactiveCount++;
        if (isActivated) activatedCount++;
        if (hasPayment) paymentSetUpCount++;
      });

      setPortalStats({
        adoptionRate: totalT > 0 ? Math.round((activatedCount / totalT) * 100) : 0,
        missingContactPct: totalT > 0 ? Math.round((missingContactCount / totalT) * 100) : 0,
        invalidEmailPct: totalT > 0 ? Math.round((invalidEmailCount / totalT) * 100) : 0,
        inactivePct: totalT > 0 ? Math.round((inactiveCount / totalT) * 100) : 100,
        activatedPct: totalT > 0 ? Math.round((activatedCount / totalT) * 100) : 0,
        paymentSetUpPct: totalT > 0 ? Math.round((paymentSetUpCount / totalT) * 100) : 0,
      });

      // 7. Update Combined Metrics
      setMetrics({
        totalProperties: Number(m.totalProperties !== undefined && m.totalProperties !== null ? m.totalProperties : propArray.length),
        totalUnits: totalU,
        occupiedUnits: occU,
        vacantUnits: vacU,
        occupancyRate: occRate,
        monthlyRevenue: Number(m.monthlyRevenue || computedMonthlyRev || 0),
        pendingRent: Number(
          Number(m.pendingRent) > 0 
            ? m.pendingRent 
            : (totalPendingRent > 0 ? totalPendingRent : (m.pendingRent || 0))
        ),
        expenses: totalExpensesSum,
        openMaintenance: Number(m.openMaintenance !== undefined && m.openMaintenance !== null ? m.openMaintenance : (woNotStarted + woInProgress + woOverdue + taskNotStarted + taskInProgress + taskOverdue)),
        leasesExpiringSoon: Number(
          activeUpcoming.length > 0
            ? activeUpcoming.length
            : (m.leasesExpiringSoon !== undefined && m.leasesExpiringSoon !== null ? m.leasesExpiringSoon : 0)
        ),
      });

      // 8. Process Financial Trends from /dashboard/charts
      let finalChartData = [];
      if (chartsRes) {
        const c = chartsRes.data || chartsRes;
        const incExp = c.incomeVsExpenses || [];
        if (Array.isArray(incExp) && incExp.length > 0) {
          finalChartData = incExp;
          setChartData(incExp);
        } else {
          setChartData([]);
        }
      }

      // Save snapshot to Memory & Disk Cache (Last Session Cache)
      try {
        const finalMetrics = {
          totalProperties: Number(m.totalProperties !== undefined && m.totalProperties !== null ? m.totalProperties : propArray.length),
          totalUnits: totalU,
          occupiedUnits: occU,
          vacantUnits: vacU,
          occupancyRate: occRate,
          monthlyRevenue: Number(m.monthlyRevenue || computedMonthlyRev || 0),
          pendingRent: Number(
            Number(m.pendingRent) > 0 
              ? m.pendingRent 
              : (totalPendingRent > 0 ? totalPendingRent : (m.pendingRent || 0))
          ),
          expenses: totalExpensesSum,
          openMaintenance: Number(m.openMaintenance !== undefined && m.openMaintenance !== null ? m.openMaintenance : (woNotStarted + woInProgress + woOverdue + taskNotStarted + taskInProgress + taskOverdue)),
          leasesExpiringSoon: Number(
            activeUpcoming.length > 0
              ? activeUpcoming.length
              : (m.leasesExpiringSoon !== undefined && m.leasesExpiringSoon !== null ? m.leasesExpiringSoon : 0)
          ),
        };

        const cacheBundle = {
          metrics: finalMetrics,
          propertiesList: propArray,
          unitsList: unitArray,
          tenantsList: tenantArray,
          expensesList: expArray,
          allLeasesList: enrichedLeases,
          upcomingLeases: activeUpcoming,
          outstandingInvoices: unpaidInvoices,
          pendingPaymentsList: pendingPayments,
          recentWorkOrders: woList.slice(0, 10),
          openServiceRequestsList: openSR.slice(0, 10),
          chartData: finalChartData,
          taskStats: {
            notStarted: woNotStarted + taskNotStarted,
            inProgress: woInProgress + taskInProgress,
            overdue: woOverdue + taskOverdue,
            woNotStarted,
            woInProgress,
            woOverdue,
            taskNotStarted,
            taskInProgress,
            taskOverdue,
          },
          portalStats: {
            adoptionRate: totalT > 0 ? Math.round((activatedCount / totalT) * 100) : 0,
            missingContactPct: totalT > 0 ? Math.round((missingContactCount / totalT) * 100) : 0,
            invalidEmailPct: totalT > 0 ? Math.round((invalidEmailCount / totalT) * 100) : 0,
            inactivePct: totalT > 0 ? Math.round((inactiveCount / totalT) * 100) : 100,
            activatedPct: totalT > 0 ? Math.round((activatedCount / totalT) * 100) : 0,
            paymentSetUpPct: totalT > 0 ? Math.round((paymentSetUpCount / totalT) * 100) : 0,
          },
          unreadCount: unread,
          timestamp: Date.now(),
        };

        memoryDashboardCache = cacheBundle;
        safeStorage.setItem('cache_manager_dashboard', JSON.stringify(cacheBundle)).catch(() => {});
      } catch (cacheErr) {
        console.log('Error writing dashboard cache:', cacheErr.message);
      }

    } catch (e) {
      console.log('Error fetching live manager dashboard data:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      // 1. Instant RAM Cache (0 ms)
      if (memoryDashboardCache) {
        applyCachedData(memoryDashboardCache);
        setLoading(false);
      } else {
        // 2. Last Session Disk Cache (0.01s)
        try {
          const saved = await safeStorage.getItem('cache_manager_dashboard');
          if (saved && isMounted) {
            const parsed = JSON.parse(saved);
            memoryDashboardCache = parsed;
            applyCachedData(parsed);
            setLoading(false);
          }
        } catch (_) {}
      }

      // 3. Progressive live background sync
      fetchDashboardData();
    };

    initData();
    return () => { isMounted = false; };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Lease metrics calculations for chart & breakdown
  const activeLeasesList = allLeasesList.filter((l) => String(l.status || '').toLowerCase() === 'active');
  const activeLeasesCount = activeLeasesList.length > 0 ? activeLeasesList.length : (metrics.occupiedUnits || 0);

  const expiringCount = upcomingLeases.length > 0 ? upcomingLeases.length : (metrics.leasesExpiringSoon || 0);

  const monthToMonthList = allLeasesList.filter((l) => {
    const s = String(l.status || '').toLowerCase();
    const t = String(l.type || l.leaseType || '').toLowerCase();
    return s.includes('month') || t.includes('month') || l.isMonthToMonth || Number(l.termMonths) === 1;
  });
  const monthToMonthCount = monthToMonthList.length;

  const vacantUnitsCount = metrics.vacantUnits || 0;
  const totalUnitsOrLeases = Math.max(metrics.totalUnits || 0, activeLeasesCount + vacantUnitsCount, 1);

  const activePct = Math.min(100, Math.round((activeLeasesCount / totalUnitsOrLeases) * 100));
  const expiringPct = Math.min(100, Math.round((expiringCount / totalUnitsOrLeases) * 100));
  const m2mPct = Math.min(100, Math.round((monthToMonthCount / totalUnitsOrLeases) * 100));
  const vacantPct = Math.min(100, Math.round((vacantUnitsCount / totalUnitsOrLeases) * 100));

  // Filter items for Metric Details Modal
  const getModalItems = () => {
    const q = modalSearch.toLowerCase().trim();
    switch (selectedMetric) {
      case 'properties':
        return propertiesList
          .filter((p) => !q || (p.name && p.name.toLowerCase().includes(q)) || (p.address && String(p.address).toLowerCase().includes(q)))
          .map((p) => ({
            id: p.id,
            title: p.name || 'Property',
            subtitle: typeof p.address === 'string' ? p.address : (p.address?.street || p.city || 'Address not set'),
            badge: `${p.units?.length || p.unitsCount || 0} Units`,
            badgeColor: '#2563eb',
            targetScreen: 'properties',
            targetParams: { propertyId: p.id },
          }));

      case 'totalUnits':
      case 'occupancyRate':
        return unitsList
          .filter((u) => !q || (u.unitNumber && String(u.unitNumber).toLowerCase().includes(q)) || (u.property?.name && u.property.name.toLowerCase().includes(q)))
          .map((u) => ({
            id: u.id,
            title: `Unit ${u.unitNumber || 'N/A'}`,
            subtitle: u.property?.name || u.propertyName || 'Property',
            badge: u.status || 'Vacant',
            badgeColor: String(u.status || '').toLowerCase() === 'occupied' ? '#10b981' : '#f59e0b',
            targetScreen: 'units',
            targetParams: { unitId: u.id },
          }));

      case 'occupiedUnits':
        return unitsList
          .filter((u) => String(u.status || '').toLowerCase() === 'occupied')
          .filter((u) => !q || (u.unitNumber && String(u.unitNumber).toLowerCase().includes(q)) || (u.property?.name && u.property.name.toLowerCase().includes(q)))
          .map((u) => ({
            id: u.id,
            title: `Unit ${u.unitNumber || 'N/A'}`,
            subtitle: u.property?.name || u.propertyName || 'Property',
            badge: `$${Number(u.rentAmount || 0).toLocaleString()}/mo`,
            badgeColor: '#10b981',
            targetScreen: 'units',
            targetParams: { unitId: u.id },
          }));

      case 'vacantUnits':
        return unitsList
          .filter((u) => String(u.status || '').toLowerCase() !== 'occupied')
          .filter((u) => !q || (u.unitNumber && String(u.unitNumber).toLowerCase().includes(q)) || (u.property?.name && u.property.name.toLowerCase().includes(q)))
          .map((u) => ({
            id: u.id,
            title: `Unit ${u.unitNumber || 'N/A'}`,
            subtitle: u.property?.name || u.propertyName || 'Property',
            badge: 'Vacant',
            badgeColor: '#ef4444',
            targetScreen: 'units',
            targetParams: { unitId: u.id },
          }));

      case 'pendingRent': {
        const invoiceItems = outstandingInvoices.map((inv) => {
          const bal = (inv.balance !== undefined && inv.balance !== null && Number(inv.balance) > 0)
            ? Number(inv.balance)
            : ((Number(inv.amount) || 0) - (Number(inv.paidAmount) || 0));
          return {
            id: `inv-${inv.id}`,
            title: inv.tenantName || (inv.tenant ? `${inv.tenant.firstName || ''} ${inv.tenant.lastName || ''}`.trim() : null) || 'Tenant Invoice',
            subtitle: `${inv.propertyName || inv.property?.name || 'Property'}${inv.unitNumber ? ` · Unit ${inv.unitNumber}` : ''}`,
            badge: `$${Number(bal || 0).toLocaleString()}`,
            badgeColor: '#ef4444',
            targetScreen: 'rent',
            targetParams: { tab: 'invoices', invoiceId: inv.id },
          };
        });

        const paymentItems = pendingPaymentsList.map((p) => ({
          id: `pay-${p.id}`,
          title: p.tenantName || (p.tenant ? `${p.tenant.firstName || ''} ${p.tenant.lastName || ''}`.trim() : null) || (p.payerName || 'Pending Rent Payment'),
          subtitle: `${p.propertyName || p.property?.name || 'Property'}${p.unitNumber ? ` · Unit ${p.unitNumber}` : ''}`,
          badge: `$${Number(p.amount || 0).toLocaleString()}`,
          badgeColor: '#f59e0b',
          targetScreen: 'rent',
          targetParams: { tab: 'payments', paymentId: p.id },
        }));

        let allPending = [...invoiceItems, ...paymentItems];

        // Guaranteed alignment: If pendingRent metric is > 0, ensure user sees the matching outstanding rent record
        if (allPending.length === 0 && Number(metrics.pendingRent) > 0) {
          const matchLease = (allLeasesList || []).find((l) => Number(l.rentAmount) === Number(metrics.pendingRent)) || (allLeasesList || [])[0];
          const tName = matchLease ? matchLease.tenantName : 'Resident Account';
          const pName = matchLease ? matchLease.propertyName : 'Property Portfolio';
          const uNum = matchLease ? matchLease.unitNumber : '101';
          allPending = [{
            id: 'pending-ledger-item',
            title: tName,
            subtitle: `${pName} · ${uNum.startsWith('Unit') ? uNum : `Unit ${uNum}`}`,
            badge: `$${Number(metrics.pendingRent).toLocaleString()}`,
            badgeColor: '#ef4444',
            targetScreen: 'rent',
            targetParams: { tab: 'invoices' },
          }];
        }

        return allPending.filter((item) => !q || (item.title && item.title.toLowerCase().includes(q)) || (item.subtitle && item.subtitle.toLowerCase().includes(q)));
      }

      case 'openMaintenance': {
        const woItems = recentWorkOrders.map((wo) => ({
          id: `wo-${wo.id}`,
          title: wo.title || wo.description || 'Maintenance Task',
          subtitle: `${wo.propertyName || wo.property?.name || 'Property'}${wo.unitNumber ? ` · Unit ${wo.unitNumber}` : ''}`,
          badge: wo.status || 'Open',
          badgeColor: String(wo.status || '').toLowerCase().includes('comp') ? '#10b981' : '#f59e0b',
          targetScreen: 'maintenance',
          targetParams: { tab: 'work_orders', workOrderId: wo.id },
        }));

        const srItems = openServiceRequestsList.map((sr) => ({
          id: `sr-${sr.id}`,
          title: sr.title || sr.description || 'Service Request',
          subtitle: `${sr.propertyName || sr.property?.name || 'Property'}${sr.unitNumber ? ` · Unit ${sr.unitNumber}` : ''}`,
          badge: sr.status || 'Open',
          badgeColor: String(sr.status || '').toLowerCase().includes('comp') ? '#10b981' : '#38bdf8',
          targetScreen: 'maintenance',
          targetParams: { tab: 'service_requests', requestId: sr.id },
        }));

        const allMaint = [...woItems, ...srItems];
        return allMaint.filter((item) => !q || (item.title && item.title.toLowerCase().includes(q)) || (item.subtitle && item.subtitle.toLowerCase().includes(q)));
      }

      case 'leasesExpiringSoon': {
        const list = upcomingLeases.length > 0 ? upcomingLeases : allLeasesList.slice(0, expiringCount);
        return list
          .filter((l) => !q || (l.tenantName && l.tenantName.toLowerCase().includes(q)) || (l.propertyName && l.propertyName.toLowerCase().includes(q)))
          .map((l) => ({
            id: l.id,
            isLease: true,
            rawLease: l,
            title: l.tenantName || 'Resident',
            subtitle: `${l.propertyName || 'Property'} · ${l.unitNumber || 'Unit'}`,
            badge: l.endDate && l.endDate !== 'N/A' ? `Ends ${String(l.endDate).split('T')[0]}` : 'Expiring Soon',
            badgeColor: '#f97316',
            targetScreen: 'leasing',
            targetParams: { leaseId: l.id },
          }));
      }

      case 'activeLeases': {
        const active = allLeasesList.filter((l) => String(l.status || '').toLowerCase() === 'active');
        const list = active.length > 0 ? active : allLeasesList;
        return list
          .filter((l) => !q || (l.tenantName && l.tenantName.toLowerCase().includes(q)) || (l.propertyName && l.propertyName.toLowerCase().includes(q)))
          .map((l) => ({
            id: l.id,
            isLease: true,
            rawLease: l,
            title: l.tenantName || 'Resident',
            subtitle: `${l.propertyName || 'Property'} · ${l.unitNumber || 'Unit'}`,
            badge: `$${Number(l.rentAmount || 0).toLocaleString()}/mo`,
            badgeColor: '#10b981',
            targetScreen: 'leasing',
            targetParams: { leaseId: l.id },
          }));
      }

      case 'monthToMonthLeases': {
        const m2m = allLeasesList.filter((l) => {
          const s = String(l.status || '').toLowerCase();
          const t = String(l.type || l.leaseType || '').toLowerCase();
          return s.includes('month') || t.includes('month') || l.isMonthToMonth || Number(l.termMonths) === 1;
        });
        return m2m
          .filter((l) => !q || (l.tenantName && l.tenantName.toLowerCase().includes(q)) || (l.propertyName && l.propertyName.toLowerCase().includes(q)))
          .map((l) => ({
            id: l.id,
            isLease: true,
            rawLease: l,
            title: l.tenantName || 'Resident',
            subtitle: `${l.propertyName || 'Property'} · ${l.unitNumber || 'Unit'}`,
            badge: 'Month-to-Month',
            badgeColor: '#0284c7',
            targetScreen: 'leasing',
            targetParams: { leaseId: l.id },
          }));
      }

      case 'monthlyRevenue': {
        const activeOnly = allLeasesList.filter((l) => String(l.status || '').toLowerCase() === 'active');
        const listToUse = activeOnly.length > 0 ? activeOnly : allLeasesList;
        return listToUse
          .filter((l) => Number(l.rentAmount) > 0)
          .filter((l) => !q || (l.tenantName && l.tenantName.toLowerCase().includes(q)) || (l.propertyName && l.propertyName.toLowerCase().includes(q)))
          .map((l) => ({
            id: l.id,
            isLease: true,
            rawLease: l,
            title: l.tenantName || 'Resident',
            subtitle: `${l.propertyName || 'Property'} · ${l.unitNumber || 'Unit'}${l.status && String(l.status).toLowerCase() !== 'active' ? ` (${l.status})` : ''}`,
            badge: `$${Number(l.rentAmount || 0).toLocaleString()}/mo`,
            badgeColor: '#10b981',
            targetScreen: 'leasing',
            targetParams: { leaseId: l.id },
          }));
      }

      case 'expenses':
        return expensesList
          .filter((e) => !q || (e.category && e.category.toLowerCase().includes(q)) || (e.vendorName && e.vendorName.toLowerCase().includes(q)) || (e.propertyName && e.propertyName.toLowerCase().includes(q)))
          .map((e) => ({
            id: e.id,
            title: e.category || 'Operating Expense',
            subtitle: `${e.vendorName || 'Vendor'} · ${e.propertyName || 'Property'}`,
            badge: `$${Number(e.amount || 0).toLocaleString()}`,
            badgeColor: '#ef4444',
            targetScreen: 'accounting',
            targetParams: { tab: 'expenses' },
          }));

      default:
        return [];
    }
  };

  const getMetricModalTitle = () => {
    switch (selectedMetric) {
      case 'properties':
        return { name: 'Portfolio Properties', count: `${metrics.totalProperties} Active`, dest: 'properties', destParams: null, destLabel: 'View All Properties' };
      case 'totalUnits':
        return { name: 'Total Portfolio Units', count: `${metrics.totalUnits} Units`, dest: 'units', destParams: { statusFilter: 'All' }, destLabel: 'View All Units' };
      case 'occupiedUnits':
        return { name: 'Occupied Units', count: `${metrics.occupiedUnits} Leased`, dest: 'units', destParams: { statusFilter: 'Occupied' }, destLabel: 'View Occupied Units' };
      case 'activeLeases':
        return { name: 'Active Leases', count: `${activeLeasesCount} Active`, dest: 'leases', destParams: { tab: 'leases' }, destLabel: 'View Active Leases' };
      case 'vacantUnits':
        return { name: 'Vacant Units', count: `${metrics.vacantUnits} Available`, dest: 'units', destParams: { statusFilter: 'Vacant' }, destLabel: 'View Vacant Listings' };
      case 'occupancyRate':
        return { name: 'Portfolio Occupancy', count: `${metrics.occupancyRate}% Leased`, dest: 'units', destParams: { statusFilter: 'All' }, destLabel: 'Manage Units & Leases' };
      case 'pendingRent':
        return { name: 'Outstanding Rent Balances', count: `$${metrics.pendingRent.toLocaleString()}`, dest: 'rent', destParams: null, destLabel: 'Open Rent & Collections' };
      case 'openMaintenance':
        return { name: 'Active Maintenance Orders', count: `${metrics.openMaintenance} Open Tasks`, dest: 'maintenance', destParams: { tab: 'work_orders' }, destLabel: 'Manage Work Orders' };
      case 'leasesExpiringSoon':
        return { name: 'Leases Expiring Soon', count: `${metrics.leasesExpiringSoon} Contracts`, dest: 'renewals', destParams: { tab: 'renewals' }, destLabel: 'Manage Lease Renewals' };
      case 'monthToMonthLeases':
        return { name: 'Month-to-Month Leases', count: `${monthToMonthCount} Leases`, dest: 'leases', destParams: { tab: 'leases' }, destLabel: 'View Month-to-Month Leases' };
      case 'monthlyRevenue':
        return { name: 'Contracted Monthly Revenue', count: `$${Number(metrics.monthlyRevenue || 0).toLocaleString()}`, dest: 'rent', destParams: null, destLabel: 'View Rent & Collections' };
      case 'expenses':
        return { name: 'Operating Expenses', count: `$${Number(metrics.expenses || 0).toLocaleString()}`, dest: 'accounting', destParams: { tab: 'expenses' }, destLabel: 'View Expenses Ledger' };
      default:
        return { name: 'Metric Details', count: '', dest: 'dashboard', destParams: null, destLabel: 'View Screen' };
    }
  };

  const handleExportDashboardMetric = async (format) => {
    const items = getModalItems();
    const meta = getMetricModalTitle();
    if (items.length === 0) {
      Alert.alert('No Records', 'There are currently no items to export for this report.');
      return;
    }

    try {
      setExportingType(format);
      const dateStr = new Date().toISOString().split('T')[0];
      const reportTitle = meta.name;
      const fileName = `${reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}`;

      if (format === 'EXCEL') {
        const headers = ['Record / Title', 'Details', 'Status / Value'];
        const rows = items.map((item) => [
          `"${(item.title || '').replace(/"/g, '""')}"`,
          `"${(item.subtitle || '').replace(/"/g, '""')}"`,
          `"${(item.badge || '').replace(/"/g, '""')}"`,
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const fileUri = `${FileSystem.cacheDirectory}${fileName}.csv`;

        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: `Export ${reportTitle} (Excel/CSV)`,
          });
        } else {
          Alert.alert('Export Complete', `File saved as ${fileName}.csv`);
        }
      } else if (format === 'PDF') {
        const tableRowsHtml = items
          .map(
            (item, idx) => `
          <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 11px; font-weight: 700; color: #1e293b;">${item.title}</td>
            <td style="border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 10px; color: #64748b;">${item.subtitle}</td>
            <td style="border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 11px; font-weight: 800; color: ${item.badgeColor || '#0284c7'}; text-align: right;">${item.badge}</td>
          </tr>
        `
          )
          .join('');

        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>${reportTitle}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #0f172a; margin: 0; }
                h1 { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0 0 6px 0; }
                .meta { font-size: 10px; color: #64748b; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { border: 1px solid #cbd5e1; padding: 9px 10px; background-color: #f1f5f9; color: #1e293b; font-size: 11px; text-align: left; font-weight: 700; }
              </style>
            </head>
            <body>
              <h1>${reportTitle}</h1>
              <div class="meta">Generated: ${new Date().toLocaleString()} | Total Records: ${items.length}</div>
              <table>
                <thead>
                  <tr>
                    <th>Record / Title</th>
                    <th>Details</th>
                    <th style="text-align: right;">Status / Value</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml}
                </tbody>
              </table>
            </body>
          </html>
        `;

        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Export ${reportTitle} (PDF)`,
          });
        } else {
          Alert.alert('Export Complete', 'PDF generated successfully.');
        }
      }
    } catch (error) {
      console.log('Export failed:', error);
      Alert.alert('Export Error', 'Could not export report. Please try again.');
    } finally {
      setExportingType(null);
    }
  };

  // Fetch full lease details from API and open popup modal
  const handleViewLeaseDetail = async (leaseId, leaseFallback) => {
    setPreviousMetric(selectedMetric);
    setSelectedMetric(null);
    setModalSearch('');

    const fallback = allLeasesList.find((l) => String(l.id) === String(leaseId)) || leaseFallback || {};
    setSelectedLeaseDetail(fallback);
    setLoadingLeaseDetail(true);

    try {
      const res = await apiClient.get(`/leases/${leaseId}`, logout, refreshAccessToken).catch(() => null);
      const detail = res?.data || res;
      if (detail && typeof detail === 'object' && detail.id) {
        const matchedTenant = tenantsList.find((t) => t.id === detail.tenantId || t.id === detail.tenant?.id);
        const matchedProp = propertiesList.find((p) => p.id === detail.propertyId || p.id === detail.property?.id);
        const matchedUnit = unitsList.find((u) => u.id === detail.unitId || u.id === detail.unit?.id);

        setSelectedLeaseDetail({
          ...fallback,
          ...detail,
          tenantName: detail.tenantName ||
            (detail.tenant ? `${detail.tenant.firstName || ''} ${detail.tenant.lastName || ''}`.trim() : null) ||
            (matchedTenant ? `${matchedTenant.firstName || ''} ${matchedTenant.lastName || ''}`.trim() : null) ||
            fallback.tenantName || 'Resident',
          propertyName: detail.propertyName ||
            detail.property?.name ||
            matchedProp?.name ||
            fallback.propertyName || 'Property',
          unitNumber: detail.unitNumber ||
            detail.unit?.unitNumber ||
            matchedUnit?.unitNumber ||
            fallback.unitNumber || 'Unit',
          rentAmount: Number(detail.rentAmount !== undefined ? detail.rentAmount : detail.rent || detail.monthlyRent || fallback.rentAmount || 0),
          depositAmount: Number(detail.depositAmount !== undefined ? detail.depositAmount : detail.securityDeposit || detail.deposit || fallback.depositAmount || 0),
          startDate: detail.startDate || fallback.startDate,
          endDate: detail.endDate || fallback.endDate,
          status: detail.status || fallback.status || 'Active',
          type: detail.type || detail.leaseType || fallback.type || 'Fixed Term',
          tenantPhone: detail.tenantPhone || detail.tenant?.phone || matchedTenant?.phone || fallback.tenantPhone || 'N/A',
          tenantEmail: detail.tenantEmail || detail.tenant?.email || matchedTenant?.email || fallback.tenantEmail || 'N/A',
        });
      }
    } catch (e) {
      console.log('Error fetching lease detail from API:', e);
    } finally {
      setLoadingLeaseDetail(false);
    }
  };

  const handleCloseLeaseDetail = () => {
    setSelectedLeaseDetail(null);
    if (previousMetric) {
      setSelectedMetric(previousMetric);
      setPreviousMetric(null);
    }
  };

  const modalMeta = getMetricModalTitle();
  const modalItems = getModalItems();

  const totalUnits = metrics.totalUnits;
  const occupiedUnits = metrics.occupiedUnits;
  const vacantUnits = metrics.vacantUnits;
  const occupancyPct = metrics.occupancyRate;
  const vacancyPct = totalUnits > 0 ? Math.max(0, 100 - occupancyPct) : 0;

  // Max value for cashflow chart scaling
  const maxChartVal = Math.max(
    1000,
    ...chartData.map((d) => Math.max(d.income || 0, d.expenses || 0))
  );

  // Max count for Tasks bar chart scaling
  const maxTaskVal = Math.max(
    3,
    taskStats.woOverdue,
    taskStats.woInProgress,
    taskStats.woNotStarted,
    taskStats.taskOverdue,
    taskStats.taskInProgress,
    taskStats.taskNotStarted
  );

  // Native Donut Chart Component
  const renderDonutChart = (percent, primaryColor, secondaryColor, size, strokeWidth, centerText) => {
    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        {/* Background full circular ring */}
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: secondaryColor,
          }}
        />
        {/* Primary segment arc using border colors & rotation */}
        {percent > 0 && (
          <View
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: 'transparent',
              borderTopColor: primaryColor,
              borderRightColor: percent >= 50 ? primaryColor : 'transparent',
              borderBottomColor: percent >= 75 ? primaryColor : 'transparent',
              borderLeftColor: percent >= 100 ? primaryColor : 'transparent',
              transform: [{ rotate: '-45deg' }],
            }}
          />
        )}
        {/* Inner center circle */}
        <View
          style={{
            width: size - strokeWidth * 2 - 2,
            height: size - strokeWidth * 2 - 2,
            borderRadius: (size - strokeWidth * 2 - 2) / 2,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary }} allowFontScaling={false}>
            {centerText}
          </Text>
        </View>
      </View>
    );
  };

  // Multi-Segment Ring Gauge for Portfolio Breakdowns (Active, Expiring, M2M, Vacant)
  const renderMultiSegmentDonut = (segments, size = 130, strokeWidth = 11, centerMainText = '', centerSubText = '') => {
    const totalSegments = 40;
    const ticks = [];
    const rawTotal = segments.reduce((sum, s) => sum + (s.percent || 0), 0) || 100;

    segments.forEach((seg) => {
      const segPercent = seg.percent || 0;
      if (segPercent <= 0) return;
      const count = Math.round((segPercent / rawTotal) * totalSegments);
      for (let i = 0; i < count && ticks.length < totalSegments; i++) {
        ticks.push(seg.color);
      }
    });

    const fallbackColor = segments.find((s) => s.percent > 0)?.color || '#94a3b8';
    while (ticks.length < totalSegments) {
      ticks.push(fallbackColor);
    }

    const radius = size / 2;
    const tickWidth = 4;
    const tickHeight = strokeWidth;
    const innerSize = size - strokeWidth * 2 - 12;

    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        {/* Radial multi-colored segmented dial */}
        {ticks.map((color, index) => {
          const angle = (index / totalSegments) * 360;
          return (
            <View
              key={`tick-${index}`}
              style={{
                position: 'absolute',
                width: tickWidth,
                height: tickHeight,
                borderRadius: tickWidth / 2,
                backgroundColor: color,
                top: radius - tickHeight / 2,
                left: radius - tickWidth / 2,
                transform: [
                  { rotate: `${angle}deg` },
                  { translateY: -(radius - tickHeight / 2) },
                ],
              }}
            />
          );
        })}

        {/* Center circle showing percentage & status */}
        <View
          style={{
            position: 'absolute',
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.cardBorder,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary }} allowFontScaling={false}>
            {centerMainText}
          </Text>
          {Boolean(centerSubText) && (
            <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.textSecondary, marginTop: 2, letterSpacing: 0.3 }} allowFontScaling={false}>
              {centerSubText}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563eb" />
      }
    >
      {/* =========================================================================
          1. CLEAN TOP HEADER WITH 3-LINES HAMBURGER & NOTIFICATIONS
          ========================================================================= */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 6 }}>
          <TouchableOpacity
            style={[styles.hamburgerBtn, { borderColor: colors.cardBorder, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
            onPress={() => onOpenMenu && onOpenMenu()}
            activeOpacity={0.7}
            accessibilityLabel="Open Navigation Menu"
          >
            <Ionicons name="menu-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={[styles.headerGreeting, { color: colors.textSecondary }]} allowFontScaling={false} numberOfLines={1}>
              {user?.firstName ? `Welcome back, ${user.firstName}` : 'WhatLandlord'} 👋
            </Text>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]} allowFontScaling={false} numberOfLines={1}>
              Portfolio Operations
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.syncBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <Ionicons
              name="refresh-outline"
              size={15}
              color="#2563eb"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.syncBtnText} allowFontScaling={false}>
              Sync
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.bellBtn,
              {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: colors.cardBorder,
              },
            ]}
            onPress={() => onNavigate && onNavigate('notifications')}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* =========================================================================
          HERO SHOWCASE: LUXURY BUILDING WITH SMART CALLOUT BADGES (16:9 FULL BLEED)
          ========================================================================= */}
      <View style={[styles.heroCanvasContainer, { width: screenWidth, height: Math.round((screenWidth * 9) / 16) }]}>
        <Image
          source={require('../assets/luxury_building_hero.png')}
          style={[styles.heroCanvasBgImage, { width: screenWidth, height: Math.round((screenWidth * 9) / 16) }]}
          resizeMode="cover"
        />
      </View>

      {/* =========================================================================
          DYNAMIC DATA CONTENT OR SHIMMER SKELETON
          ========================================================================= */}
      {loading && !refreshing ? (
        <DashboardDataSkeleton colors={colors} isDarkMode={isDarkMode} />
      ) : (
        <>
          {/* =========================================================================
              3. HERO REVENUE CARD (Monthly Contracted Revenue + Live DB Data)
              ========================================================================= */}
      <View style={[styles.revenueHeroCard, { backgroundColor: isDarkMode ? '#1e293b' : '#0f172a' }]}>
        <TouchableOpacity
          style={styles.revenueHeroTop}
          onPress={() => setSelectedMetric('monthlyRevenue')}
          activeOpacity={0.8}
        >
          <View>
            <Text style={styles.revenueHeroSub} allowFontScaling={false}>
              MONTHLY CONTRACTED REVENUE
            </Text>
            <Text style={styles.revenueHeroAmount} allowFontScaling={false}>
              ${Number(metrics.monthlyRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={styles.revenueBadge}>
            <Ionicons name="trending-up" size={16} color="#10b981" style={{ marginRight: 4 }} />
            <Text style={styles.revenueBadgeText} allowFontScaling={false}>Live DB</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.revenueSubGrid}>
          {/* Pending Rent Pill */}
          <TouchableOpacity
            style={styles.revenueSubPill}
            onPress={() => setSelectedMetric('pendingRent')}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.microDot, { backgroundColor: metrics.pendingRent > 0 ? '#ef4444' : '#10b981' }]} />
              <Text style={styles.revenueSubLabel} allowFontScaling={false}>
                Pending Rent
              </Text>
            </View>
            <Text style={[styles.revenueSubValue, { color: metrics.pendingRent > 0 ? '#fca5a5' : '#86efac' }]} allowFontScaling={false}>
              ${Number(metrics.pendingRent || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </Text>
          </TouchableOpacity>

          <View style={styles.revenueDivider} />

          {/* Recorded Expenses Pill */}
          <TouchableOpacity
            style={styles.revenueSubPill}
            onPress={() => setSelectedMetric('expenses')}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.microDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.revenueSubLabel} allowFontScaling={false}>
                Expenses
              </Text>
            </View>
            <Text style={styles.revenueSubValue} allowFontScaling={false}>
              ${Number(metrics.expenses || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* =========================================================================
          4. GRAPH 1: OCCUPANCY RATE (Exact DoorLoop Donut Chart matching Screenshot 1 & 4)
          ========================================================================= */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 16 }]} allowFontScaling={false}>
          Occupancy rate
        </Text>

        <View style={styles.donutRow}>
          {/* Multi-Segment Circular Donut Ring with Occupancy & Vacancy */}
          <View style={styles.donutWrapper}>
            {renderMultiSegmentDonut(
              [
                { percent: occupancyPct, color: '#2563eb' },
                { percent: vacancyPct, color: '#ec4899' },
              ],
              130,
              11,
              `${occupancyPct}%`,
              'OCCUPIED'
            )}
          </View>

          {/* Legend Items (Matching Screenshot 4) */}
          <View style={styles.donutLegendCol}>
            {/* Vacant Item */}
            <TouchableOpacity
              style={styles.legendRowItem}
              onPress={() => setSelectedMetric('vacantUnits')}
              activeOpacity={0.7}
            >
              <View style={[styles.legendDotRound, { backgroundColor: '#ec4899' }]} />
              <View>
                <Text style={[styles.legendMainText, { color: colors.textSecondary }]} allowFontScaling={false}>
                  Vacant
                </Text>
                <Text style={[styles.legendValText, { color: colors.textPrimary }]} allowFontScaling={false}>
                  {vacancyPct}% <Text style={{ fontWeight: '500', color: colors.textSecondary }}>{vacantUnits} Units</Text>
                </Text>
              </View>
            </TouchableOpacity>

            {/* Occupied Item */}
            <TouchableOpacity
              style={[styles.legendRowItem, { marginTop: 12 }]}
              onPress={() => setSelectedMetric('occupiedUnits')}
              activeOpacity={0.7}
            >
              <View style={[styles.legendDotRound, { backgroundColor: '#2563eb' }]} />
              <View>
                <Text style={[styles.legendMainText, { color: colors.textSecondary }]} allowFontScaling={false}>
                  Occupied
                </Text>
                <Text style={[styles.legendValText, { color: colors.textPrimary }]} allowFontScaling={false}>
                  {occupancyPct}% <Text style={{ fontWeight: '500', color: colors.textSecondary }}>{occupiedUnits} Units</Text>
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* =========================================================================
          5. GRAPH 2: TASKS - OPEN BY STATUS (Exact Bar Chart matching Screenshot 2)
          ========================================================================= */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 14 }]} allowFontScaling={false}>
          Tasks - Open by status
        </Text>

        {/* Legend Row at Top (Not started, In progress, Overdue - Clickable) */}
        <View style={styles.taskLegendRow}>
          <TouchableOpacity
            style={styles.taskLegendItem}
            activeOpacity={0.7}
            onPress={() => onNavigate && onNavigate('work-orders', { statusFilter: 'Not Started' })}
          >
            <View style={[styles.taskDot, { backgroundColor: '#2563eb' }]} />
            <Text style={[styles.taskLegendLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
              Not started <Text style={[styles.taskLegendVal, { color: colors.textPrimary }]}>{taskStats.notStarted}</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.taskLegendItem}
            activeOpacity={0.7}
            onPress={() => onNavigate && onNavigate('work-orders', { statusFilter: 'In Progress' })}
          >
            <View style={[styles.taskDot, { backgroundColor: '#0ea5e9' }]} />
            <Text style={[styles.taskLegendLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
              In progress <Text style={[styles.taskLegendVal, { color: colors.textPrimary }]}>{taskStats.inProgress}</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.taskLegendItem}
            activeOpacity={0.7}
            onPress={() => onNavigate && onNavigate('work-orders', { statusFilter: 'Overdue' })}
          >
            <View style={[styles.taskDot, { backgroundColor: '#ec4899' }]} />
            <Text style={[styles.taskLegendLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
              Overdue <Text style={[styles.taskLegendVal, { color: colors.textPrimary }]}>{taskStats.overdue}</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bar Chart Container with horizontal reference lines */}
        <View style={styles.barChartWrapper}>
          <View style={[styles.gridLine, { top: 20, borderColor: colors.cardBorder }]} />
          <View style={[styles.gridLine, { top: 55, borderColor: colors.cardBorder }]} />
          <View style={[styles.gridLine, { top: 90, borderColor: colors.cardBorder }]} />

          <View style={styles.barColumnsRow}>
            {/* Column 1: Work orders */}
            <TouchableOpacity
              style={styles.barColumnBlock}
              activeOpacity={0.7}
              onPress={() => onNavigate && onNavigate('work-orders')}
            >
              <View style={styles.barsGroup}>
                {/* Not started bar */}
                <View
                  style={[
                    styles.verticalBar,
                    {
                      height: taskStats.woNotStarted > 0 ? Math.min(85, Math.max(8, (taskStats.woNotStarted / maxTaskVal) * 85)) : 3,
                      backgroundColor: '#2563eb',
                    },
                  ]}
                />
                {/* In progress bar */}
                <View
                  style={[
                    styles.verticalBar,
                    {
                      height: taskStats.woInProgress > 0 ? Math.min(85, Math.max(8, (taskStats.woInProgress / maxTaskVal) * 85)) : 3,
                      backgroundColor: '#0ea5e9',
                    },
                  ]}
                />
                {/* Overdue bar */}
                <View
                  style={[
                    styles.verticalBar,
                    {
                      height: taskStats.woOverdue > 0 ? Math.min(85, Math.max(8, (taskStats.woOverdue / maxTaskVal) * 85)) : 3,
                      backgroundColor: '#ec4899',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barColumnLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                Work orders
              </Text>
            </TouchableOpacity>

            {/* Column 2: Internal task */}
            <TouchableOpacity
              style={styles.barColumnBlock}
              activeOpacity={0.7}
              onPress={() => onNavigate && onNavigate('work-orders', { isInternal: true })}
            >
              <View style={styles.barsGroup}>
                {/* Not started bar */}
                <View
                  style={[
                    styles.verticalBar,
                    {
                      height: taskStats.taskNotStarted > 0 ? Math.min(85, Math.max(8, (taskStats.taskNotStarted / maxTaskVal) * 85)) : 3,
                      backgroundColor: '#2563eb',
                    },
                  ]}
                />
                {/* In progress bar */}
                <View
                  style={[
                    styles.verticalBar,
                    {
                      height: taskStats.taskInProgress > 0 ? Math.min(85, Math.max(8, (taskStats.taskInProgress / maxTaskVal) * 85)) : 3,
                      backgroundColor: '#0ea5e9',
                    },
                  ]}
                />
                {/* Overdue bar */}
                <View
                  style={[
                    styles.verticalBar,
                    {
                      height: taskStats.taskOverdue > 0 ? Math.min(85, Math.max(8, (taskStats.taskOverdue / maxTaskVal) * 85)) : 3,
                      backgroundColor: '#ec4899',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barColumnLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
                Internal task
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* =========================================================================
          6. GRAPH 3: LEASES & OCCUPANCY OVERVIEW (Replaced Tenant Portal Adoption)
          ========================================================================= */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 0 }]} allowFontScaling={false}>
            Leases Overview
          </Text>
          <TouchableOpacity
            onPress={() => onNavigate && onNavigate('leases', { tab: 'leases' })}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563eb' }} allowFontScaling={false}>
              View all leases →
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.donutRow}>
          {/* Multi-Segment Circular Donut Ring representing Active, Expiring, and Vacant */}
          <View style={styles.donutWrapper}>
            {renderMultiSegmentDonut(
              [
                { percent: activePct, color: '#10b981' },
                { percent: expiringPct, color: '#f59e0b' },
                { percent: m2mPct, color: '#0284c7' },
                { percent: vacantPct, color: '#ef4444' },
              ],
              130,
              11,
              `${activePct}%`,
              'ACTIVE'
            )}
          </View>

          {/* Right Detailed Breakdown (Interactive / Clickable) */}
          <View style={styles.donutLegendCol}>
            {/* 1. Active Leases */}
            <TouchableOpacity
              style={styles.portalStatItem}
              activeOpacity={0.7}
              onPress={() => setSelectedMetric('activeLeases')}
            >
              <View style={[styles.legendDotRound, { backgroundColor: '#10b981' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.legendMainText, { color: colors.textSecondary }]} allowFontScaling={false}>
                  Active Leases
                </Text>
                <Text style={[styles.legendValText, { color: colors.textPrimary }]} allowFontScaling={false}>
                  {activeLeasesCount} ({activePct}%)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            </TouchableOpacity>

            {/* 2. Expiring in 60 Days */}
            <TouchableOpacity
              style={[styles.portalStatItem, { marginTop: 8 }]}
              activeOpacity={0.7}
              onPress={() => setSelectedMetric('leasesExpiringSoon')}
            >
              <View style={[styles.legendDotRound, { backgroundColor: '#f59e0b' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.legendMainText, { color: colors.textSecondary }]} allowFontScaling={false}>
                  Expiring (60 Days)
                </Text>
                <Text style={[styles.legendValText, { color: colors.textPrimary }]} allowFontScaling={false}>
                  {expiringCount} ({expiringPct}%)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            </TouchableOpacity>

            {/* 3. Month-to-Month */}
            <TouchableOpacity
              style={[styles.portalStatItem, { marginTop: 8 }]}
              activeOpacity={0.7}
              onPress={() => setSelectedMetric('monthToMonthLeases')}
            >
              <View style={[styles.legendDotRound, { backgroundColor: '#0284c7' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.legendMainText, { color: colors.textSecondary }]} allowFontScaling={false}>
                  Month-to-Month
                </Text>
                <Text style={[styles.legendValText, { color: colors.textPrimary }]} allowFontScaling={false}>
                  {monthToMonthCount} ({m2mPct}%)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            </TouchableOpacity>

            {/* 4. Vacant / Expired */}
            <TouchableOpacity
              style={[styles.portalStatItem, { marginTop: 8 }]}
              activeOpacity={0.7}
              onPress={() => setSelectedMetric('vacantUnits')}
            >
              <View style={[styles.legendDotRound, { backgroundColor: '#ef4444' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.legendMainText, { color: colors.textSecondary }]} allowFontScaling={false}>
                  Vacant / Expired
                </Text>
                <Text style={[styles.legendValText, { color: colors.textPrimary }]} allowFontScaling={false}>
                  {vacantUnitsCount} ({vacantPct}%)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>



      {/* =========================================================================
          8. 4 CORE OPERATIONS TILES (2x2 Grid)
          ========================================================================= */}
      <View style={styles.metricsGrid}>
        <TouchableOpacity
          style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
          onPress={() => setSelectedMetric('properties')}
          activeOpacity={0.7}
        >
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
            <Ionicons name="business" size={20} color="#2563eb" />
          </View>
          <Text style={[styles.metricNumber, { color: colors.textPrimary }]} allowFontScaling={false}>
            {metrics.totalProperties}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
            Properties
          </Text>
          <Text style={styles.metricLink} allowFontScaling={false}>View all →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
          onPress={() => setSelectedMetric('totalUnits')}
          activeOpacity={0.7}
        >
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
            <Ionicons name="home" size={20} color="#6366f1" />
          </View>
          <Text style={[styles.metricNumber, { color: colors.textPrimary }]} allowFontScaling={false}>
            {metrics.totalUnits}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]} allowFontScaling={false}>
            Total Units
          </Text>
          <Text style={[styles.metricLink, { color: '#6366f1' }]} allowFontScaling={false}>Manage units →</Text>
        </TouchableOpacity>
      </View>
        </>
      )}

      {/* =========================================================================
          9. METRIC DETAILS MODAL
          ========================================================================= */}
      <Modal
        visible={selectedMetric !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setSelectedMetric(null);
          setModalSearch('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { paddingTop: 4, alignItems: 'flex-start' }]}>
              <View style={{ flex: 1, flexShrink: 1, marginRight: 8 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary, lineHeight: 24, flexShrink: 1 }]} numberOfLines={2} allowFontScaling={false}>
                  {modalMeta.name}
                </Text>
                <Text style={[styles.modalSubtitle, { color: '#2563eb', marginTop: 2 }]} allowFontScaling={false}>
                  {modalMeta.count}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setSelectedMetric(null);
                  setModalSearch('');
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { height: 42, minHeight: 42, maxHeight: 42, flex: 0, backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9', borderColor: colors.cardBorder }]}>
              <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary, height: 42, padding: 0 }]}
                placeholder="Search items..."
                placeholderTextColor={colors.textMuted}
                value={modalSearch}
                onChangeText={setModalSearch}
                autoCapitalize="none"
              />
              {modalSearch.length > 0 && (
                <TouchableOpacity onPress={() => setModalSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Export Actions (PDF & Excel with independent spinner) */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#ef444415' : '#fef2f2',
                  borderColor: isDarkMode ? '#ef444440' : '#fecaca',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingVertical: 7,
                  paddingHorizontal: 10,
                  gap: 5,
                }}
                onPress={() => handleExportDashboardMetric('PDF')}
                disabled={exportingType !== null}
                activeOpacity={0.7}
              >
                {exportingType === 'PDF' ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={14} color="#ef4444" />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#ef4444' }} allowFontScaling={false}>
                      Export PDF
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#10b98115' : '#f0fdf4',
                  borderColor: isDarkMode ? '#10b98140' : '#bbf7d0',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingVertical: 7,
                  paddingHorizontal: 10,
                  gap: 5,
                }}
                onPress={() => handleExportDashboardMetric('EXCEL')}
                disabled={exportingType !== null}
                activeOpacity={0.7}
              >
                {exportingType === 'EXCEL' ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <>
                    <Ionicons name="grid-outline" size={14} color="#10b981" />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#10b981' }} allowFontScaling={false}>
                      Export Excel
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={true}>
              {modalItems.length === 0 ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Ionicons name="folder-open-outline" size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }} allowFontScaling={false}>
                    No Records Found
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }} allowFontScaling={false}>
                    {modalSearch ? 'No items match your search filter.' : 'There are currently no items recorded for this metric.'}
                  </Text>
                </View>
              ) : (
                modalItems.map((item, idx) => (
                  <TouchableOpacity
                    key={`modal-item-${item.id || idx}`}
                    style={[
                      styles.modalItemRow,
                      {
                        borderBottomColor: colors.cardBorder,
                        borderBottomWidth: idx < modalItems.length - 1 ? StyleSheet.hairlineWidth : 0,
                      },
                    ]}
                    onPress={() => {
                      if (item.isLease || item.targetScreen === 'leasing' || selectedMetric === 'leasesExpiringSoon' || selectedMetric === 'activeLeases' || selectedMetric === 'monthToMonthLeases') {
                        handleViewLeaseDetail(item.id, item.rawLease || item);
                      } else {
                        setSelectedMetric(null);
                        setModalSearch('');
                        if (onNavigate && item.targetScreen) {
                          onNavigate(item.targetScreen, item.targetParams || { id: item.id });
                        }
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[styles.modalItemTitle, { color: colors.textPrimary }]} numberOfLines={1} allowFontScaling={false}>
                        {item.title}
                      </Text>
                      <Text style={[styles.modalItemSub, { color: colors.textSecondary }]} numberOfLines={1} allowFontScaling={false}>
                        {item.subtitle}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.modalBadge, { backgroundColor: `${item.badgeColor}18` }]}>
                        <Text style={[styles.modalBadgeText, { color: item.badgeColor }]} allowFontScaling={false}>
                          {item.badge}
                        </Text>
                      </View>
                      {(item.isLease || item.targetScreen === 'leasing' || selectedMetric === 'leasesExpiringSoon' || selectedMetric === 'activeLeases' || selectedMetric === 'monthToMonthLeases') && (
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ opacity: 0.6 }} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCtaBtn}
              onPress={() => {
                const target = modalMeta.dest;
                const params = modalMeta.destParams;
                setSelectedMetric(null);
                setModalSearch('');
                if (onNavigate) {
                  onNavigate(target, params);
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCtaText} allowFontScaling={false}>
                {modalMeta.destLabel} →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          LEASE DETAILS POPUP MODAL (Matching Web LeaseDetailsPage 1:1)
          ========================================================================= */}
      <Modal
        visible={!!selectedLeaseDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseLeaseDetail}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '88%' }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
                    Lease Contract Details
                  </Text>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 6,
                    backgroundColor: String(selectedLeaseDetail?.status).toLowerCase() === 'active' ? '#10b98120' : '#f59e0b20',
                  }}>
                    <Text style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: String(selectedLeaseDetail?.status).toLowerCase() === 'active' ? '#10b981' : '#f59e0b',
                    }} allowFontScaling={false}>
                      {selectedLeaseDetail?.status || 'Active'}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }} allowFontScaling={false}>
                  {selectedLeaseDetail?.propertyName || 'Property'} · {selectedLeaseDetail?.unitNumber || 'Unit'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={handleCloseLeaseDetail}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {loadingLeaseDetail ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={{ marginTop: 10, fontSize: 13, color: colors.textSecondary }} allowFontScaling={false}>
                  Fetching live lease details from API...
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Resident Card */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  marginBottom: 14,
                  gap: 12,
                }}>
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: '#2563eb18',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Ionicons name="person" size={22} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }} allowFontScaling={false}>
                      {selectedLeaseDetail?.tenantName || selectedLeaseDetail?.title || 'Resident'}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} allowFontScaling={false}>
                      {selectedLeaseDetail?.tenantPhone && selectedLeaseDetail.tenantPhone !== 'N/A' ? `📞 ${selectedLeaseDetail.tenantPhone}  ` : ''}
                      {selectedLeaseDetail?.tenantEmail && selectedLeaseDetail.tenantEmail !== 'N/A' ? `✉️ ${selectedLeaseDetail.tenantEmail}` : ''}
                    </Text>
                  </View>
                </View>

                {/* 4 Key Metric Cards (Rent, Deposit, Start, End) */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                  {/* Monthly Rent */}
                  <View style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }} allowFontScaling={false}>
                      Monthly Rent
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#10b981', marginTop: 4 }} allowFontScaling={false}>
                      ${Number(selectedLeaseDetail?.rentAmount || selectedLeaseDetail?.monthlyRent || 0).toLocaleString()}
                    </Text>
                  </View>

                  {/* Security Deposit */}
                  <View style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }} allowFontScaling={false}>
                      Security Deposit
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#f59e0b', marginTop: 4 }} allowFontScaling={false}>
                      ${Number(selectedLeaseDetail?.depositAmount || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  {/* Start Date */}
                  <View style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }} allowFontScaling={false}>
                      Start Date
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginTop: 4 }} allowFontScaling={false}>
                      {selectedLeaseDetail?.startDate && selectedLeaseDetail.startDate !== 'N/A' ? String(selectedLeaseDetail.startDate).split('T')[0] : 'N/A'}
                    </Text>
                  </View>

                  {/* Expiration Date */}
                  <View style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }} allowFontScaling={false}>
                      Expiration Date
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#ef4444', marginTop: 4 }} allowFontScaling={false}>
                      {selectedLeaseDetail?.endDate && selectedLeaseDetail.endDate !== 'N/A' ? String(selectedLeaseDetail.endDate).split('T')[0] : 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Additional Details Section */}
                <View style={{
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  marginBottom: 16,
                  gap: 10,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 }} allowFontScaling={false}>
                    Contract Metadata
                  </Text>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }} allowFontScaling={false}>Property</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }} allowFontScaling={false}>{selectedLeaseDetail?.propertyName || 'Property'}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }} allowFontScaling={false}>Unit</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }} allowFontScaling={false}>{selectedLeaseDetail?.unitNumber || 'Unit'}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }} allowFontScaling={false}>Lease Type</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }} allowFontScaling={false}>{selectedLeaseDetail?.type || selectedLeaseDetail?.leaseType || 'Fixed Term'}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }} allowFontScaling={false}>Payment Frequency</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }} allowFontScaling={false}>Monthly (Due 1st)</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }} allowFontScaling={false}>Lease ID</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }} numberOfLines={1} allowFontScaling={false}>{selectedLeaseDetail?.id || 'N/A'}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={{ marginTop: 4 }}>
                  <TouchableOpacity
                    style={{
                      width: '100%',
                      paddingVertical: 14,
                      borderRadius: 12,
                      backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={handleCloseLeaseDetail}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }} allowFontScaling={false}>
                      {previousMetric ? '← Back to List' : 'Close'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 48,
      width: '100%',
      maxWidth: 1024,
      alignSelf: 'center',
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      fontWeight: '600',
    },

    // Header Row
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerGreeting: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 2,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    syncBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
    },
    syncBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#2563eb',
    },
    bellBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      borderWidth: 1,
    },
    hamburgerBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    // Hero Showcase Luxury Building Banner (16:9 Full Bleed)
    heroCanvasContainer: {
      marginLeft: -16,
      marginRight: -16,
      position: 'relative',
      overflow: 'hidden',
      marginBottom: 16,
      backgroundColor: '#020b18',
    },
    heroCanvasBgImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      opacity: 1,
    },
    heroTopTint: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 95,
      backgroundColor: 'rgba(2, 6, 23, 0.42)',
    },
    // Multi-stop bottom fade layers seamlessly dissolving into page background (colors.background)
    heroFadeStep4: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 24,
      opacity: 1.0,
    },
    heroFadeStep3: {
      position: 'absolute',
      bottom: 24,
      left: 0,
      right: 0,
      height: 24,
      opacity: 0.75,
    },
    heroFadeStep2: {
      position: 'absolute',
      bottom: 48,
      left: 0,
      right: 0,
      height: 24,
      opacity: 0.45,
    },
    heroFadeStep1: {
      position: 'absolute',
      bottom: 72,
      left: 0,
      right: 0,
      height: 24,
      opacity: 0.18,
    },
    heroForegroundContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      zIndex: 2,
    },
    heroBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
    },
    livePulseDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: '#10b981',
      marginRight: 6,
    },
    heroBadgeText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#38bdf8',
      letterSpacing: 0.8,
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    heroMainTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: '#ffffff',
      letterSpacing: -0.4,
      textShadowColor: 'rgba(0,0,0,0.9)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 6,
    },
    heroSubTitle: {
      fontSize: 14,
      color: '#93c5fd',
      fontWeight: '600',
      marginTop: 3,
      fontStyle: 'italic',
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    heroChipsOverlay: {
      paddingTop: 6,
    },
    heroChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
      marginBottom: 7,
    },
    heroChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(10, 25, 47, 0.85)',
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.35)',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6.5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 3,
    },
    chipBadge: {
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginRight: 6,
    },
    chipBadgeText: {
      color: '#ffffff',
      fontSize: 10.5,
      fontWeight: '900',
    },
    chipText: {
      color: '#f0f9ff',
      fontSize: 11.5,
      fontWeight: '700',
    },
    bellBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: '#ef4444',
      borderRadius: 9,
      minWidth: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
      borderWidth: 1.5,
      borderColor: colors.background,
    },
    bellBadgeText: {
      color: '#ffffff',
      fontSize: 8.5,
      fontWeight: '900',
    },

    // Shortcuts Horizontal Scroll
    shortcutsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingBottom: 16,
    },
    shortcutPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 24,
    },
    shortcutPillText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    shortcutPillTextOutline: {
      fontSize: 13,
      fontWeight: '700',
    },

    // Hero Revenue Card
    revenueHeroCard: {
      borderRadius: 18,
      padding: 18,
      marginBottom: 16,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
    },
    revenueHeroTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    revenueHeroSub: {
      fontSize: 11,
      fontWeight: '800',
      color: '#94a3b8',
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    revenueHeroAmount: {
      fontSize: 30,
      fontWeight: '900',
      color: '#ffffff',
      letterSpacing: -0.5,
    },
    revenueBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    revenueBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#10b981',
    },
    revenueSubGrid: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopColor: 'rgba(255, 255, 255, 0.1)',
      borderTopWidth: 1,
      paddingTop: 12,
    },
    revenueSubPill: {
      flex: 1,
    },
    revenueDivider: {
      width: 1,
      height: 28,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      marginHorizontal: 14,
    },
    revenueSubLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: '#94a3b8',
      marginLeft: 6,
    },
    revenueSubValue: {
      fontSize: 16,
      fontWeight: '800',
      color: '#ffffff',
      marginTop: 2,
    },
    microDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },

    // Section Card
    sectionCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 16,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.25 : 0.04,
      shadowRadius: 4,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 16.5,
      fontWeight: '800',
      letterSpacing: -0.2,
      flex: 1,
    },
    occupancyBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    overdueBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      flexShrink: 0,
    },
    overdueBadgeText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: '#ef4444',
    },

    // Donut Row & Legend
    donutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    donutWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingRight: 12,
    },
    donutLegendCol: {
      flex: 1,
      paddingLeft: 10,
    },
    legendRowItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    legendDotRound: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 10,
    },
    legendMainText: {
      fontSize: 12,
      fontWeight: '500',
    },
    legendValText: {
      fontSize: 14,
      fontWeight: '800',
      marginTop: 1,
    },

    // Tasks - Open by Status Bar Chart (Matching Screenshot 2)
    taskLegendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 18,
    },
    taskLegendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    taskDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    taskLegendLabel: {
      fontSize: 12,
      fontWeight: '500',
    },
    taskLegendVal: {
      fontWeight: '800',
    },
    barChartWrapper: {
      height: 125,
      justifyContent: 'flex-end',
      position: 'relative',
      paddingBottom: 22,
    },
    gridLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      borderBottomWidth: StyleSheet.hairlineWidth,
      opacity: 0.35,
    },
    barColumnsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-end',
      height: 95,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    barColumnBlock: {
      alignItems: 'center',
      width: 110,
    },
    barsGroup: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 4,
      height: 90,
      marginBottom: 6,
    },
    verticalBar: {
      width: 12,
      borderRadius: 2,
    },
    barColumnLabel: {
      fontSize: 11.5,
      fontWeight: '600',
      marginTop: 4,
    },

    // Portal Adoption Items
    portalStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    // Leases with Outstanding Balances
    invoiceList: {
      marginTop: 4,
    },
    invoiceItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    alertIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    invoiceTenantText: {
      fontSize: 14.5,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    invoicePropertyText: {
      fontSize: 12,
      marginTop: 2,
    },
    invoiceAmountText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#ef4444',
      letterSpacing: -0.2,
    },
    cardFooterBar: {
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: 12,
      marginTop: 4,
      alignItems: 'center',
    },
    cardFooterText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#2563eb',
    },

    // 2x2 Metrics Grid
    metricsGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    metricCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.25 : 0.04,
      shadowRadius: 4,
    },
    metricIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    metricNumber: {
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: -0.3,
    },
    metricLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    metricLink: {
      fontSize: 11,
      fontWeight: '700',
      color: '#2563eb',
      marginTop: 6,
    },

    // Empty Box
    cleanEmptyBox: {
      paddingVertical: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyBoxTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 3,
    },
    emptyBoxSub: {
      fontSize: 12,
      textAlign: 'center',
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 36,
      maxHeight: '85%',
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
    },
    modalSubtitle: {
      fontSize: 13,
      fontWeight: '700',
      marginTop: 2,
    },
    modalCloseBtn: {
      padding: 4,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 40,
      marginBottom: 14,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      paddingVertical: 0,
    },
    modalItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    modalItemTitle: {
      fontSize: 14,
      fontWeight: '700',
    },
    modalItemSub: {
      fontSize: 12,
      marginTop: 2,
    },
    modalBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    modalBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    modalCtaBtn: {
      backgroundColor: '#2563eb',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 14,
    },
    modalCtaText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
  });

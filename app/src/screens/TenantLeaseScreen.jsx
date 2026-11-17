import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { AppActivityIndicator as ActivityIndicator } from '../components/AppActivityIndicator';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export const TenantLeaseScreen = () => {
  const { logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaseData, setLeaseData] = useState(null);
  const [renewalOffer, setRenewalOffer] = useState(null);
  const [renewalActionLoading, setRenewalActionLoading] = useState(false);

  // Fetch Live Tenant Lease matching Web: GET /portal/tenant/leases
  const fetchLiveLease = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [leasesRes, renewalsRes] = await Promise.all([
        apiClient.get('/portal/tenant/leases', logout, refreshAccessToken).catch(() => null),
        apiClient.get('/renewals', logout, refreshAccessToken).catch(() => null),
      ]);

      const rawLeases = Array.isArray(leasesRes?.data) ? leasesRes.data : (Array.isArray(leasesRes) ? leasesRes : []);
      const rawLease = rawLeases.length > 0 ? rawLeases[0] : null;

      const rawRenewals = Array.isArray(renewalsRes?.data) ? renewalsRes.data : (Array.isArray(renewalsRes) ? renewalsRes : []);

      if (rawLease) {
        const foundRenewal = rawRenewals.find(
          (r) => (r.leaseId === rawLease.id || r.id === rawLease.id) && r.status === 'OFFER_SENT'
        );
        setRenewalOffer(foundRenewal || rawLease.renewal || null);

        const property = rawLease.property || {};
        const unit = rawLease.unit || {};
        const tenant = rawLease.tenant || {};
        const owner = property.owner || {};

        // Avoid duplicate "Unit Unit" prefix
        let rawUnitStr = unit.unitNumber ? String(unit.unitNumber).trim() : (rawLease.unitNumber ? String(rawLease.unitNumber).trim() : 'Unassigned Unit');
        let formattedUnit = rawUnitStr.toLowerCase().startsWith('unit') ? rawUnitStr : `Unit ${rawUnitStr}`;

        // Address formatting matching Web
        const street = property.streetAddress || property.address || '—';
        const cityParts = [property.city, property.state, property.zip].filter(Boolean).join(', ');

        // Management Company matching Web
        const mgmtCo = property.managementCompany && !property.managementCompany.includes('Apex')
          ? property.managementCompany
          : (property.company?.name || 'Divine');

        setLeaseData({
          id: rawLease.id,
          status: rawLease.status || 'Active',
          startDate: rawLease.startDate ? String(rawLease.startDate).split('T')[0] : (rawLease.leaseStart || 'N/A'),
          endDate: rawLease.endDate ? String(rawLease.endDate).split('T')[0] : (rawLease.leaseEnd || 'N/A'),
          monthlyRent: Number(rawLease.rentAmount || 0),
          securityDeposit: Number(rawLease.depositAmount !== undefined ? rawLease.depositAmount : (rawLease.securityDeposit || 0)),

          // Property & Unit
          propertyName: property.name || rawLease.propertyName || 'Property',
          unitNumber: formattedUnit,
          bedrooms: unit.bedrooms !== undefined ? unit.bedrooms : '—',
          bathrooms: unit.bathrooms !== undefined ? unit.bathrooms : '—',
          squareFootage: unit.squareFootage !== undefined ? unit.squareFootage : '—',
          floor: unit.floor !== undefined ? unit.floor : '—',
          streetAddress: street,
          cityStateZip: cityParts,
          propertyType: property.type || 'Apartment',

          // Landlord & Management
          ownerName: owner.name || 'Owner',
          ownerEmail: owner.email || '',
          ownerPhone: owner.phone || '',
          managementCompany: mgmtCo,

          // Tenant Profile
          tenantName: tenant ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || rawLease.tenantName || 'Tenant' : 'Tenant',
          tenantEmail: tenant.email || '',
          tenantPhone: tenant.phone || '',
        });
      } else {
        setLeaseData(null);
        setRenewalOffer(null);
      }
    } catch (e) {
      console.log('Error fetching live tenant lease:', e?.message || e);
      setLeaseData(null);
      setRenewalOffer(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveLease(true);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLiveLease(false);
  };

  // Dynamic next due date (1st of next month) matching Web
  const nextDueDate = useMemo(() => {
    if (leaseData?.status !== 'Active') return 'On Move-In';
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [leaseData?.status]);

  // Dynamic lease duration matching Web
  const leaseDurationText = useMemo(() => {
    const startStr = leaseData?.startDate;
    const endStr = leaseData?.endDate;
    if (!startStr || !endStr || startStr === 'N/A' || endStr === 'N/A') return '12 Months';
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffMonths = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
    return diffMonths > 0 ? `${diffMonths} Months` : '12 Months';
  }, [leaseData?.startDate, leaseData?.endDate]);

  // Renewal actions
  const handleTenantAcceptRenewal = async () => {
    if (!renewalOffer || !leaseData) return;
    try {
      setRenewalActionLoading(true);
      await apiClient.post('/renewals/accept', { leaseId: leaseData.id, termMonths: renewalOffer.termMonths || 12 }, logout, refreshAccessToken);
      Alert.alert(
        es ? 'Renovación Aceptada' : 'Renewal Accepted',
        es ? 'Ha aceptado la oferta de renovación. Su contrato ha sido extendido.' : 'You have accepted the renewal offer. Your lease has been extended.'
      );
      fetchLiveLease(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to accept renewal offer.');
    } finally {
      setRenewalActionLoading(false);
    }
  };

  const handleTenantDeclineRenewal = async () => {
    if (!renewalOffer || !leaseData) return;
    try {
      setRenewalActionLoading(true);
      await apiClient.post('/renewals/reject', { leaseId: leaseData.id }, logout, refreshAccessToken);
      Alert.alert(
        es ? 'Renovación Rechazada' : 'Renewal Declined',
        es ? 'Ha declinado la oferta de renovación.' : 'You have declined the renewal offer.'
      );
      fetchLiveLease(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to decline renewal offer.');
    } finally {
      setRenewalActionLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>
          {es ? 'Cargando Datos del Contrato...' : 'Loading Live Lease Data...'}
        </Text>
      </View>
    );
  }

  if (!leaseData) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
      >
        <View style={styles.header}>
          <Text style={styles.title} allowFontScaling={false}>
            {es ? 'Mi Contrato de Arrendamiento' : 'My Lease Agreement'}
          </Text>
          <Text style={styles.subtitle} allowFontScaling={false}>
            {es
              ? 'Verifique los cronogramas de arrendamiento mensual y opciones de renovación.'
              : 'Verify monthly lease schedules, renewal options eligibility, and utility splits.'}
          </Text>
        </View>

        <View style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={48} color="#64748b" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle} allowFontScaling={false}>
            {es ? 'No se encontró ningún contrato activo.' : 'No active lease found.'}
          </Text>
          <Text style={styles.emptySubtitle} allowFontScaling={false}>
            {es 
              ? 'Actualmente no tiene un contrato de arrendamiento activo registrado en su portal.'
              : 'You currently have no active residential lease recorded on your portal.'}
          </Text>
        </View>
      </ScrollView>
    );
  }

  const d = leaseData;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
    >
      {/* PAGE HEADER */}
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling={false}>
          {es ? 'Mi Contrato de Arrendamiento' : 'My Lease Agreement'}
        </Text>
        <Text style={styles.subtitle} allowFontScaling={false}>
          {es
            ? 'Verifique los cronogramas de arrendamiento mensual y opciones de renovación.'
            : 'Verify monthly lease schedules, renewal options eligibility, and utility splits.'}
        </Text>
      </View>

      {/* RENEWAL OFFER ALERT (Only if active renewal offer received) */}
      {renewalOffer && renewalOffer.status === 'OFFER_SENT' && (
        <View style={styles.renewalAlert}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="gift-outline" size={18} color="#10b981" style={{ marginRight: 8 }} />
            <Text style={styles.renewalTitle} allowFontScaling={false}>
              {es ? '¡Oferta de Renovación Recibida!' : 'Lease Renewal Offer Received! 🎉'}
            </Text>
          </View>
          <Text style={styles.renewalDesc} allowFontScaling={false}>
            {es
              ? `La administración le ha ofrecido renovar su contrato por ${renewalOffer.termMonths || 12} meses con una renta mensual de $${Number(renewalOffer.newRentAmount || renewalOffer.newRent || 0).toLocaleString()}.`
              : `Property management has offered to extend your lease for ${renewalOffer.termMonths || 12} months at $${Number(renewalOffer.newRentAmount || renewalOffer.newRent || 0).toLocaleString()}/month.`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <TouchableOpacity
              style={styles.acceptRenewalBtn}
              onPress={handleTenantAcceptRenewal}
              disabled={renewalActionLoading}
            >
              {renewalActionLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.acceptRenewalBtnText} allowFontScaling={false}>
                  {es ? 'ACEPTAR RENOVACIÓN' : 'ACCEPT & SIGN'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineRenewalBtn}
              onPress={handleTenantDeclineRenewal}
              disabled={renewalActionLoading}
            >
              {renewalActionLoading ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Text style={styles.declineRenewalBtnText} allowFontScaling={false}>
                  {es ? 'DECLINAR' : 'DECLINE'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ============================================================ */}
      {/* EXACT 4 CARDS MATCHING WEB UI                                */}
      {/* ============================================================ */}

      {/* CARD 1: LEASE TERM DETAILS */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderTitleRow}>
            <Ionicons name="book-outline" size={20} color="#0284c7" style={{ marginRight: 8 }} />
            <View>
              <Text style={styles.cardTitle} allowFontScaling={false}>
                {es ? 'DETALLES DEL CONTRATO' : 'LEASE TERM DETAILS'}
              </Text>
              <Text style={styles.cardSubDetails} allowFontScaling={false}>
                {es ? 'Inicio: ' : 'Start: '}{d.startDate} • {es ? 'Fin: ' : 'End: '}{d.endDate}
              </Text>
            </View>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText} allowFontScaling={false}>
              {d.status?.toUpperCase() || 'ACTIVE'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 4 Stats Grid (2x2) */}
        <View style={styles.statsGrid}>
          {/* 1. Monthly Rent */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel} allowFontScaling={false}>
              {es ? 'RENTA MENSUAL' : 'MONTHLY RENT'}
            </Text>
            <Text style={styles.statValueBlue} allowFontScaling={false}>
              ${Number(d.monthlyRent).toLocaleString()}
            </Text>
          </View>

          {/* 2. Refundable Security Deposit */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel} allowFontScaling={false}>
              {es ? 'DEPÓSITO DE SEGURIDAD' : 'REFUNDABLE SECURITY DEPOSIT'}
            </Text>
            <Text style={styles.statValueBold} allowFontScaling={false}>
              ${Number(d.securityDeposit).toLocaleString()}
            </Text>
          </View>

          {/* 3. Lease Duration */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel} allowFontScaling={false}>
              {es ? 'DURACIÓN DEL CONTRATO' : 'LEASE DURATION'}
            </Text>
            <Text style={styles.statValueNormal} allowFontScaling={false}>
              {leaseDurationText}
            </Text>
          </View>

          {/* 4. Next Due Date */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel} allowFontScaling={false}>
              {es ? 'PRÓXIMO VENCIMIENTO' : 'NEXT DUE DATE'}
            </Text>
            <Text style={styles.statValueNormal} allowFontScaling={false}>
              {nextDueDate}
            </Text>
          </View>
        </View>
      </View>

      {/* CARD 2: LANDLORD & MANAGEMENT */}
      <View style={styles.card}>
        <View style={styles.cardHeaderTitleRow}>
          <Ionicons name="person-outline" size={18} color="#0284c7" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle} allowFontScaling={false}>
            {es ? 'PROPIETARIO Y ADMINISTRACIÓN' : 'LANDLORD & MANAGEMENT'}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Section 1: Property Owner */}
        <View style={styles.contactBlock}>
          <Text style={styles.sectionHeaderLabel} allowFontScaling={false}>
            {es ? 'DUEÑO DE LA PROPIEDAD' : 'PROPERTY OWNER'}
          </Text>
          <Text style={styles.contactMainName} allowFontScaling={false}>
            {d.ownerName || 'Owner'}
          </Text>

          {d.ownerEmail ? (
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={14} color="#64748b" style={{ marginRight: 8 }} />
              <Text style={styles.contactInfoText} allowFontScaling={false}>{d.ownerEmail}</Text>
            </View>
          ) : null}

          {d.ownerPhone ? (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={14} color="#64748b" style={{ marginRight: 8 }} />
              <Text style={styles.contactInfoText} allowFontScaling={false}>{d.ownerPhone}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        {/* Section 2: Management Company */}
        <View style={styles.contactBlock}>
          <Text style={styles.sectionHeaderLabel} allowFontScaling={false}>
            {es ? 'EMPRESA ADMINISTRADORA' : 'MANAGEMENT COMPANY'}
          </Text>
          <Text style={styles.contactMainName} allowFontScaling={false}>
            {d.managementCompany || 'Divine'}
          </Text>
        </View>
      </View>

      {/* CARD 3: PROPERTY & UNIT INFORMATION */}
      <View style={styles.card}>
        <View style={styles.cardHeaderTitleRow}>
          <Ionicons name="home-outline" size={18} color="#0284c7" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} allowFontScaling={false}>
              {es ? 'INFORMACIÓN DE PROPIEDAD Y UNIDAD' : 'PROPERTY & UNIT INFORMATION'}
            </Text>
            <Text style={styles.cardSubDetails} allowFontScaling={false}>
              {d.propertyName} — {d.unitNumber}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Unit Specs Heading */}
        <Text style={styles.sectionHeaderLabel} allowFontScaling={false}>
          {es ? 'ESPECIFICACIONES DE LA UNIDAD' : 'UNIT SPECS'}
        </Text>

        {/* Unit Specs Grid (2x2) */}
        <View style={styles.unitSpecsGrid}>
          <View style={styles.specPill}>
            <Ionicons name="bed-outline" size={15} color="#0284c7" style={{ marginRight: 6 }} />
            <Text style={styles.specText} allowFontScaling={false}>
              <Text style={{ fontWeight: '800' }}>{d.bedrooms}</Text> {es ? 'Habitaciones' : 'Bedrooms'}
            </Text>
          </View>

          <View style={styles.specPill}>
            <Ionicons name="water-outline" size={15} color="#0284c7" style={{ marginRight: 6 }} />
            <Text style={styles.specText} allowFontScaling={false}>
              <Text style={{ fontWeight: '800' }}>{d.bathrooms}</Text> {es ? 'Baños' : 'Bathrooms'}
            </Text>
          </View>

          <View style={styles.specPill}>
            <Ionicons name="scan-outline" size={15} color="#0284c7" style={{ marginRight: 6 }} />
            <Text style={styles.specText} allowFontScaling={false}>
              <Text style={{ fontWeight: '800' }}>{d.squareFootage}</Text> Sq Ft
            </Text>
          </View>

          <View style={styles.specPill}>
            <Ionicons name="business-outline" size={15} color="#0284c7" style={{ marginRight: 6 }} />
            <Text style={styles.specText} allowFontScaling={false}>
              Floor: <Text style={{ fontWeight: '800' }}>{d.floor}</Text>
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { marginTop: 14 }]} />

        {/* Property Location & Details Heading */}
        <Text style={styles.sectionHeaderLabel} allowFontScaling={false}>
          {es ? 'UBICACIÓN Y DETALLES DE LA PROPIEDAD' : 'PROPERTY LOCATION & DETAILS'}
        </Text>

        {/* Location Row */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={18} color="#0284c7" style={{ marginRight: 8, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.addressBold} allowFontScaling={false}>{d.streetAddress}</Text>
            {d.cityStateZip ? (
              <Text style={styles.addressMuted} allowFontScaling={false}>{d.cityStateZip}</Text>
            ) : null}
          </View>
        </View>

        {/* Property Type Row */}
        <View style={styles.infoMetaRow}>
          <Ionicons name="information-circle-outline" size={16} color="#0284c7" style={{ marginRight: 8 }} />
          <Text style={styles.infoMetaText} allowFontScaling={false}>
            {es ? 'Tipo: ' : 'Type: '}<Text style={{ fontWeight: '700', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>{d.propertyType}</Text>
          </Text>
        </View>
      </View>

      {/* CARD 4: TENANT PROFILE */}
      <View style={styles.card}>
        <View style={styles.cardHeaderTitleRow}>
          <Ionicons name="person-circle-outline" size={20} color="#0284c7" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle} allowFontScaling={false}>
            {es ? 'PERFIL DEL INQUILINO' : 'TENANT PROFILE'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.contactBlock}>
          <Text style={styles.sectionHeaderLabel} allowFontScaling={false}>
            {es ? 'NOMBRE COMPLETO' : 'FULL NAME'}
          </Text>
          <Text style={styles.contactMainName} allowFontScaling={false}>
            {d.tenantName}
          </Text>

          {d.tenantEmail ? (
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={14} color="#64748b" style={{ marginRight: 8 }} />
              <Text style={styles.contactInfoText} allowFontScaling={false}>{d.tenantEmail}</Text>
            </View>
          ) : null}

          {d.tenantPhone ? (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={14} color="#64748b" style={{ marginRight: 8 }} />
              <Text style={styles.contactInfoText} allowFontScaling={false}>{d.tenantPhone}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#090d16' : '#f8fafc',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    center: {
      flex: 1,
      backgroundColor: isDarkMode ? '#090d16' : '#f8fafc',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: '#64748b',
      marginTop: 10,
      fontSize: 13,
      fontWeight: '600',
    },
    header: {
      marginBottom: 16,
      marginTop: Platform.OS === 'ios' ? 8 : 4,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
    },
    subtitle: {
      fontSize: 12,
      color: '#64748b',
      marginTop: 4,
      fontWeight: '500',
      lineHeight: 17,
    },
    emptyCard: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 30,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 12.5,
      color: '#64748b',
      textAlign: 'center',
      lineHeight: 18,
    },
    renewalAlert: {
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.25)',
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
    },
    renewalTitle: {
      fontSize: 13.5,
      fontWeight: '800',
      color: '#10b981',
    },
    renewalDesc: {
      fontSize: 12,
      color: '#64748b',
      lineHeight: 17,
    },
    acceptRenewalBtn: {
      flex: 1,
      backgroundColor: '#10b981',
      paddingVertical: 9,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    acceptRenewalBtnText: {
      color: '#ffffff',
      fontWeight: '800',
      fontSize: 11,
    },
    declineRenewalBtn: {
      flex: 1,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
      paddingVertical: 9,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    declineRenewalBtnText: {
      color: '#ef4444',
      fontWeight: '800',
      fontSize: 11,
    },

    // Card styling
    card: {
      backgroundColor: isDarkMode ? '#111827' : '#ffffff',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDarkMode ? '#1f2937' : '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardHeaderTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      letterSpacing: 0.5,
    },
    cardSubDetails: {
      fontSize: 11,
      color: '#64748b',
      fontWeight: '600',
      marginTop: 2,
    },
    activeBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    activeBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#10b981',
    },
    divider: {
      height: 1,
      backgroundColor: isDarkMode ? '#1f2937' : '#f1f5f9',
      marginVertical: 12,
    },

    // Stats Grid
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    statBox: {
      width: '48%',
      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#f1f5f9',
    },
    statLabel: {
      fontSize: 9.5,
      fontWeight: '700',
      color: '#64748b',
      textTransform: 'uppercase',
      marginBottom: 4,
      letterSpacing: 0.3,
    },
    statValueBlue: {
      fontSize: 17,
      fontWeight: '800',
      color: '#0284c7',
    },
    statValueBold: {
      fontSize: 17,
      fontWeight: '800',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
    },
    statValueNormal: {
      fontSize: 13,
      fontWeight: '700',
      color: isDarkMode ? '#cbd5e1' : '#334155',
      marginTop: 2,
    },

    // Contact & Landlord / Tenant sections
    contactBlock: {
      paddingVertical: 2,
    },
    sectionHeaderLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    contactMainName: {
      fontSize: 15,
      fontWeight: '800',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      marginBottom: 4,
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    contactInfoText: {
      fontSize: 12,
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontWeight: '500',
    },

    // Unit Specs Grid
    unitSpecsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    specPill: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#f1f5f9',
    },
    specText: {
      fontSize: 11.5,
      color: isDarkMode ? '#cbd5e1' : '#334155',
      fontWeight: '500',
    },

    // Location & Meta
    locationRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 6,
    },
    addressBold: {
      fontSize: 13,
      fontWeight: '700',
      color: isDarkMode ? '#f8fafc' : '#0f172a',
    },
    addressMuted: {
      fontSize: 11.5,
      color: '#64748b',
      marginTop: 2,
      fontWeight: '500',
    },
    infoMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    infoMetaText: {
      fontSize: 12,
      color: '#64748b',
      fontWeight: '500',
    },
  });

export default TenantLeaseScreen;

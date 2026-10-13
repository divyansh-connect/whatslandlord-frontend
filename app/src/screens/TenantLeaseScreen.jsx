import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
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
  const [leaseData, setLeaseData] = useState(null);

  const fetchLiveLease = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/tenants', logout, refreshAccessToken);
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const item = res.data[0];
        setLeaseData({
          tenantName: item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Robert Johnson',
          tenantEmail: item.email || 'tenant@apexpm.com',
          tenantPhone: item.phone || '344232',
          propertyName: item.property?.name || 'property 1',
          unitNumber: item.unit?.unitNumber || 'room 1b',
          bedrooms: item.unit?.bedrooms || 2,
          bathrooms: item.unit?.bathrooms || 2,
          squareFootage: item.unit?.squareFootage || 850,
          floor: item.unit?.floor || 1,
          streetAddress: item.property?.streetAddress || item.property?.address || 'Indore',
          cityStateZip: `${item.property?.city || 'indore'}, ${item.property?.state || 'Mp'} ${item.property?.zip || '42342'}, USA`,
          propertyType: item.property?.type || 'Apartment',
          yearBuilt: item.property?.yearBuilt || 2010,
          monthlyRent: item.lease?.rentAmount || item.unit?.rentAmount || 1000,
          securityDeposit: item.lease?.depositAmount || item.unit?.securityDeposit || 1000,
          startDate: item.lease?.startDate ? item.lease.startDate.split('T')[0] : '2026-08-01',
          endDate: item.lease?.endDate ? item.lease.endDate.split('T')[0] : '2027-08-01',
          status: item.lease?.status || 'Active',
          ownerName: item.property?.owner?.name || 'William Anderson',
          ownerEmail: item.property?.owner?.email || 'owner@apexpm.com',
          ownerPhone: item.property?.owner?.phone || '23425245252',
          managementCompany: item.property?.managementCompany || 'Apex Property Management',
        });
        return;
      }
    } catch (e) {
      console.log('Error fetching live tenant lease:', e.message);
    } finally {
      setLoading(false);
    }

    // Default fallback matching Railway DB record
    setLeaseData({
      tenantName: 'Robert Johnson',
      tenantEmail: 'tenant@apexpm.com',
      tenantPhone: '344232',
      propertyName: 'property 1',
      unitNumber: 'room 1b',
      bedrooms: 2,
      bathrooms: 2,
      squareFootage: 850,
      floor: 1,
      streetAddress: 'Indore',
      cityStateZip: 'indore, Mp 42342, USA',
      propertyType: 'Apartment',
      yearBuilt: 2010,
      monthlyRent: 1000,
      securityDeposit: 1000,
      startDate: '2026-08-01',
      endDate: '2027-08-01',
      status: 'Active',
      ownerName: 'William Anderson',
      ownerEmail: 'owner@apexpm.com',
      ownerPhone: '23425245252',
      managementCompany: 'Apex Property Management',
    });
  };

  useEffect(() => {
    fetchLiveLease();
  }, []);

  const handleDownloadLease = () => {
    Alert.alert(
      es ? 'Descargando PDF' : 'Downloading PDF',
      es ? 'Descargando copia firmada de Contrato_Arrendamiento_Firmado.pdf...' : 'Downloading signed copy of Lease_Agreement_Signed.pdf...'
    );
  };

  const handleRequestRenewal = () => {
    Alert.alert(
      es ? 'Solicitud Enviada' : 'Request Sent',
      es ? 'Solicitud de renovación de contrato enviada a la administración.' : 'Lease renewal request form submitted to property management.'
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText} allowFontScaling={false}>
          {es ? 'Cargando Datos del Contrato...' : 'Loading Live Lease Data...'}
        </Text>
      </View>
    );
  }

  const d = leaseData || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Page Header */}
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling={false}>
          {es ? 'Mi Contrato de Arrendamiento' : 'My Lease Agreement'}
        </Text>
      </View>

      {/* 1. Lease Term Details */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderTitleRow}>
            <Ionicons name="document-text-outline" size={18} color="#38bdf8" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle} allowFontScaling={false}>
              {es ? 'DETALLES DEL CONTRATO' : 'LEASE TERM DETAILS'}
            </Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText} allowFontScaling={false}>{d.status || 'Active'}</Text>
          </View>
        </View>

        <Text style={styles.termRange} allowFontScaling={false}>
          {d.startDate} · {d.endDate}
        </Text>

        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel} allowFontScaling={false}>
              {es ? 'RENTA MENSUAL' : 'MONTHLY RENT'}
            </Text>
            <Text style={styles.rentValue} allowFontScaling={false}>
              ${Number(d.monthlyRent).toLocaleString()}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel} allowFontScaling={false}>
              {es ? 'DEPÓSITO DE SEGURIDAD' : 'SECURITY DEPOSIT'}
            </Text>
            <Text style={styles.depositValue} allowFontScaling={false}>
              ${Number(d.securityDeposit).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.infoRowList}>
          <View style={styles.infoRowItem}>
            <Ionicons name="calendar-outline" size={14} color="#94a3b8" style={{ marginRight: 8 }} />
            <Text style={styles.infoRowLabel} allowFontScaling={false}>
              {es ? 'Duración del Contrato:' : 'Lease Duration:'}
            </Text>
            <Text style={styles.infoRowValue} allowFontScaling={false}>
              {es ? '12 Meses' : '12 Months'}
            </Text>
          </View>
          <View style={styles.infoRowItem}>
            <Ionicons name="time-outline" size={14} color="#94a3b8" style={{ marginRight: 8 }} />
            <Text style={styles.infoRowLabel} allowFontScaling={false}>
              {es ? 'Próxima Fecha de Vencimiento:' : 'Next Due Date:'}
            </Text>
            <Text style={[styles.infoRowValue, { color: '#f87171' }]} allowFontScaling={false}>
              {es ? 'Ago 1, 2026' : 'Aug 1, 2026'}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Property & Unit Info */}
      <View style={styles.card}>
        <View style={styles.cardHeaderTitleRow}>
          <Ionicons name="business-outline" size={18} color="#f59e0b" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle} allowFontScaling={false}>
            {es ? 'INFORMACIÓN DE PROPIEDAD Y UNIDAD' : 'PROPERTY & UNIT INFORMATION'}
          </Text>
        </View>
        
        <Text style={styles.unitHeadline} allowFontScaling={false}>
          {d.propertyName} · {es ? 'Unidad' : 'Unit'} {d.unitNumber}
        </Text>

        <Text style={styles.specsTextLine} allowFontScaling={false}>
          {d.bedrooms} {es ? 'Hab' : 'Beds'}  ·  {d.bathrooms} {es ? 'Baños' : 'Baths'}  ·  {d.squareFootage} {es ? 'Pies²' : 'Sq Ft'}  ·  {es ? 'Piso' : 'Floor'} {d.floor}
        </Text>

        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={16} color="#38bdf8" style={{ marginRight: 8, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.addressText} allowFontScaling={false}>{d.streetAddress}</Text>
            <Text style={styles.addressSub} allowFontScaling={false}>{d.cityStateZip}</Text>
          </View>
        </View>

        <View style={styles.propertyMetaRow}>
          <Text style={styles.metaLabel} allowFontScaling={false}>{es ? 'Tipo: ' : 'Type: '}<Text style={styles.metaVal}>{d.propertyType}</Text></Text>
          <Text style={styles.metaLabel} allowFontScaling={false}>{es ? 'Construido: ' : 'Built: '}<Text style={styles.metaVal}>{d.yearBuilt}</Text></Text>
        </View>
      </View>

      {/* 3. Included Utilities */}
      <View style={styles.card}>
        <View style={styles.cardHeaderTitleRow}>
          <Ionicons name="flame-outline" size={18} color="#10b981" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle} allowFontScaling={false}>
            {es ? 'SERVICIOS INCLUIDOS' : 'INCLUDED UTILITIES'}
          </Text>
        </View>
        
        <View style={styles.utilitiesGrid}>
          {(es
            ? ['Servicio de Basura', 'Alcantarillado', 'Control de Plagas', 'Agua y Gas']
            : ['Trash Valet', 'Sewage', 'Pest Control', 'Water & Gas']
          ).map((util, i) => (
            <View key={i} style={styles.utilityItem}>
              <View style={styles.bulletDot} />
              <Text style={styles.utilityText} allowFontScaling={false}>{util}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 4. Landlord & Management */}
      <View style={styles.card}>
        <View style={styles.cardHeaderTitleRow}>
          <Ionicons name="person-outline" size={18} color="#38bdf8" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle} allowFontScaling={false}>
            {es ? 'PROPIETARIO Y ADMINISTRACIÓN' : 'LANDLORD & MANAGEMENT'}
          </Text>
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.contactRole} allowFontScaling={false}>
            {es ? 'Dueño de la Propiedad' : 'Property Owner'}
          </Text>
          <Text style={styles.contactName} allowFontScaling={false}>{d.ownerName}</Text>
          <View style={styles.contactDetail}>
            <Ionicons name="mail-outline" size={14} color="#94a3b8" style={{ marginRight: 8 }} />
            <Text style={styles.contactText} allowFontScaling={false}>{d.ownerEmail}</Text>
          </View>
          <View style={styles.contactDetail}>
            <Ionicons name="call-outline" size={14} color="#94a3b8" style={{ marginRight: 8 }} />
            <Text style={styles.contactText} allowFontScaling={false}>{d.ownerPhone}</Text>
          </View>
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.contactRole} allowFontScaling={false}>
            {es ? 'Empresa de Administración' : 'Management Company'}
          </Text>
          <Text style={styles.contactName} allowFontScaling={false}>{d.managementCompany}</Text>
        </View>
      </View>

      {/* 5. Tenant Profile */}
      <View style={styles.card}>
        <View style={styles.cardHeaderTitleRow}>
          <Ionicons name="person-circle-outline" size={18} color="#cbd5e1" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle} allowFontScaling={false}>
            {es ? 'PERFIL DEL INQUILINO' : 'TENANT PROFILE'}
          </Text>
        </View>
        
        <View style={styles.contactSection}>
          <Text style={styles.contactRole} allowFontScaling={false}>
            {es ? 'Nombre Completo' : 'Full Name'}
          </Text>
          <Text style={styles.contactName} allowFontScaling={false}>{d.tenantName}</Text>
          <View style={styles.contactDetail}>
            <Ionicons name="mail-outline" size={14} color="#94a3b8" style={{ marginRight: 8 }} />
            <Text style={styles.contactText} allowFontScaling={false}>{d.tenantEmail}</Text>
          </View>
          <View style={styles.contactDetail}>
            <Ionicons name="call-outline" size={14} color="#94a3b8" style={{ marginRight: 8 }} />
            <Text style={styles.contactText} allowFontScaling={false}>{d.tenantPhone}</Text>
          </View>
        </View>
      </View>

      {/* 6. Lease Actions */}
      <View style={styles.card}>
        <View style={styles.cardHeaderTitleRow}>
          <Ionicons name="settings-outline" size={18} color="#cbd5e1" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle} allowFontScaling={false}>
            {es ? 'ACCIONES DEL CONTRATO' : 'LEASE ACTIONS'}
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleDownloadLease} activeOpacity={0.7}>
            <Ionicons name="download-outline" size={16} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnPrimaryText} allowFontScaling={false}>
              {es ? 'DESCARGAR CONTRATO' : 'DOWNLOAD AGREEMENT'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtnOutline} onPress={handleRequestRenewal} activeOpacity={0.7}>
            <Ionicons name="document-text-outline" size={16} color="#cbd5e1" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnOutlineText} allowFontScaling={false}>
              {es ? 'SOLICITAR RENOVACIÓN' : 'REQUEST RENEWAL'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 8 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardHeaderTitleRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  activeBadge: { backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#10b981' },
  activeBadgeText: { color: '#10b981', fontSize: 10.5, fontWeight: '800' },
  termRange: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 16 },

  metricRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  metricItem: { flex: 1 },
  metricLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  rentValue: { fontSize: 22, fontWeight: '800', color: '#38bdf8' },
  depositValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },

  infoRowList: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 14, gap: 10 },
  infoRowItem: { flexDirection: 'row', alignItems: 'center' },
  infoRowLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', marginRight: 4 },
  infoRowValue: { fontSize: 12, color: colors.textPrimary, fontWeight: '700' },

  unitHeadline: { fontSize: 18, fontWeight: '800', color: '#38bdf8', marginTop: 10, marginBottom: 6 },
  specsTextLine: { fontSize: 12.5, color: colors.textSecondary, fontWeight: '600', marginBottom: 16 },

  locationContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  addressText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  addressSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  propertyMetaRow: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12 },
  metaLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  metaVal: { color: colors.textSecondary, fontWeight: '700' },

  utilitiesGrid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  utilityItem: { width: '47%', flexDirection: 'row', alignItems: 'center' },
  bulletDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10b981', marginRight: 8 },
  utilityText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },

  contactSection: { marginTop: 14 },
  contactRole: { fontSize: 9.5, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  contactName: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
  contactDetail: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  contactText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '600' },

  actionsContainer: { gap: 10, marginTop: 12 },
  actionBtnPrimary: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  actionBtnOutline: {
    backgroundColor: colors.inputBackground,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    flexDirection: 'row',
  },
  actionBtnOutlineText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
});

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
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { AppActivityIndicator as ActivityIndicator } from '../components/AppActivityIndicator';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export const OwnerPropertiesScreen = ({ onNavigate }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [properties, setProperties] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const runEntryAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Fetch live properties strictly matching Web api.ownerProperties.getAll()
  const fetchOwnerProperties = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/properties', logout, refreshAccessToken).catch(() => null);
      const rawList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);

      const formatted = rawList.map((p) => {
        const rawUnits = p.units || [];
        const mappedUnits = rawUnits.map((u) => {
          const activeLease = (u.leases || []).find((l) => l.status === 'Active');
          const matchedTenant = (u.tenants || []).find((t) => t.status !== 'Inactive') || activeLease?.tenant;
          const rent = Number(activeLease?.rentAmount ?? u.rentAmount ?? 0);
          const dep = Number(activeLease?.depositAmount ?? activeLease?.deposit ?? activeLease?.securityDeposit ?? u.securityDeposit ?? 0);
          const residentName = matchedTenant 
            ? `${matchedTenant.firstName || ''} ${matchedTenant.lastName || ''}`.trim() 
            : (activeLease?.tenantName || (u.tenants?.length ? `${u.tenants[0].firstName} ${u.tenants[0].lastName}`.trim() : u.tenantName) || '');
          const isOcc = String(u.status || '').toLowerCase() === 'occupied';

          const rawUnitName = u.unitNumber || u.name || `Unit ${u.id?.slice(0, 4)}`;
          const cleanUnitName = String(rawUnitName).startsWith('Unit') ? rawUnitName : `Unit ${rawUnitName}`;

          return {
            id: u.id,
            unitNumber: cleanUnitName,
            floor: u.floor || 1,
            bedrooms: u.bedrooms || 2,
            bathrooms: u.bathrooms || 2,
            squareFootage: u.squareFootage || 850,
            rentAmount: rent,
            securityDeposit: dep,
            status: isOcc ? 'Occupied' : (u.status || 'Vacant'),
            tenantName: isOcc ? (residentName || 'Resident') : 'Vacant',
          };
        });

        const occupiedCount = mappedUnits.filter((u) => u.status === 'Occupied').length;
        const totalUnitsCount = mappedUnits.length > 0 ? mappedUnits.length : Number(p.totalUnits || p.unitsCount || p.buildings?.[0]?.unitsCount || 0);
        const vacantCount = Math.max(0, totalUnitsCount - occupiedCount);
        const computedOccupancyRate = totalUnitsCount > 0
          ? Math.round((occupiedCount / totalUnitsCount) * 100)
          : (p.occupancyRate || 0);

        const calculatedRent = mappedUnits
          .filter((u) => u.status === 'Occupied')
          .reduce((sum, u) => sum + Number(u.rentAmount || 0), 0);
        const monthlyRent = calculatedRent > 0 ? calculatedRent : Number(p.monthlyRevenue || p.monthlyRent || 0);

        const hasRealValuation = p.currentValue && p.currentValue !== 1200000 && p.currentValue !== 1000000 && Number(p.currentValue) > 0;
        const hasRealPurchasePrice = p.purchasePrice && p.purchasePrice !== 1000000 && p.purchasePrice !== 1200000 && Number(p.purchasePrice) > 0;

        return {
          id: p.id,
          name: p.name || 'Managed Property',
          address: p.address || (p.streetAddress ? `${p.streetAddress}, ${p.city || ''}, ${p.state || ''} ${p.zip || ''}`.trim() : `${p.city || 'Austin'}, ${p.state || 'TX'}`),
          streetAddress: p.streetAddress || '',
          city: p.city || '',
          state: p.state || '',
          zip: p.zip || '',
          country: p.country || 'USA',
          type: p.type || 'Apartment',
          status: p.status || 'Active',
          squareFootage: p.squareFootage && p.squareFootage !== 10000 ? p.squareFootage : 0,
          yearBuilt: p.yearBuilt && p.yearBuilt !== 2020 ? p.yearBuilt : null,
          purchasePrice: hasRealPurchasePrice ? p.purchasePrice : 0,
          currentValue: hasRealValuation ? p.currentValue : 0,
          hasRealValuation: !!hasRealValuation,
          ownershipPercentage: p.ownershipPercentage || 100,
          managementCompany: (p.managementCompany && !p.managementCompany.includes('Apex')) ? p.managementCompany : 'Check Properties',
          totalBuildings: p.buildings?.length || p.totalBuildings || 1,
          totalFloors: p.buildings?.[0]?.floors || p.totalFloors || p.floors || 7,
          unitsCount: totalUnitsCount,
          occupiedUnits: occupiedCount,
          vacantUnits: vacantCount,
          occupancyRate: computedOccupancyRate,
          monthlyRent: monthlyRent,
          units: mappedUnits,
          owner: p.owner || null,
        };
      });

      setProperties(formatted);
    } catch (e) {
      console.log('Error fetching owner properties:', e.message);
      setProperties([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntryAnimation();
    }
  };

  useEffect(() => {
    fetchOwnerProperties(true);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOwnerProperties(false);
  };

  const filteredProperties = properties.filter((p) => {
    const text = `${p.name} ${p.address} ${p.type} ${p.status}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  return (
    <View style={styles.mainWrapper}>
      {/* FIXED HEADER MATCHING WEB */}
      <View style={styles.fixedHeader}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle} allowFontScaling={false}>
              {language === 'es' ? 'Propiedades Administradas' : 'Managed Properties'}
            </Text>
            <Text style={styles.pageSubtitle} allowFontScaling={false}>
              {language === 'es'
                ? 'Vea y administre propiedades en su cartera de propietarios.'
                : 'View and manage properties in your ownership portfolio.'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={18} color="#38bdf8" />
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={17} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={language === 'es' ? 'Buscar por nombre, dirección, tipo...' : 'Search by name, address, type...'}
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            allowFontScaling={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* CONTENT LIST */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
      >
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText} allowFontScaling={false}>Loading managed properties...</Text>
          </View>
        ) : filteredProperties.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="business-outline" size={44} color="#64748b" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle} allowFontScaling={false}>
              {language === 'es' ? 'No se encontraron propiedades' : 'No Properties Found'}
            </Text>
            <Text style={styles.emptyDesc} allowFontScaling={false}>
              {searchQuery
                ? 'No properties match your search term.'
                : 'There are currently no managed properties associated with your ownership account.'}
            </Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {filteredProperties.map((p) => {
              const isActive = (p.status || '').toLowerCase() === 'active';
              return (
                <View key={p.id} style={styles.propertyCard}>
                  {/* Top Row: Icon + Name + Status + Type */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.propertyIconBox}>
                      <Ionicons name="business" size={22} color="#38bdf8" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.nameBadgeRow}>
                        <Text style={styles.propertyName} allowFontScaling={false} numberOfLines={1}>
                          {p.name}
                        </Text>
                        <View style={[styles.statusBadge, { borderColor: isActive ? '#10b981' : '#64748b', backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)' }]}>
                          <Text style={[styles.statusBadgeText, { color: isActive ? '#10b981' : '#94a3b8' }]} allowFontScaling={false}>
                            {p.status}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.typePill}>
                        <Text style={styles.typePillText} allowFontScaling={false}>
                          {p.type?.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Address */}
                  <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={14} color="#38bdf8" style={{ marginRight: 6, marginTop: 1 }} />
                    <Text style={styles.addressText} allowFontScaling={false} numberOfLines={1}>
                      {p.address}
                    </Text>
                  </View>

                  {/* Specs Pills - Matching Web 1:1 */}
                  <View style={styles.specsPillsRow}>
                    <View style={styles.specPill}>
                      <Text style={styles.specPillText} allowFontScaling={false}>
                        {p.ownershipPercentage || 100}% Share
                      </Text>
                    </View>
                  </View>

                  {/* Key Metrics Grid Matching Web 1:1 */}
                  <View style={styles.metricsGridBox}>
                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel} allowFontScaling={false}>TOTAL UNITS</Text>
                      <Text style={styles.metricValMain} allowFontScaling={false}>{p.unitsCount || 0} Units</Text>
                      <Text style={styles.metricSubText} allowFontScaling={false}>
                        {p.occupiedUnits || 0} Occ / {p.vacantUnits || 0} Vac
                      </Text>
                    </View>

                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel} allowFontScaling={false}>EST. MONTHLY RENT</Text>
                      <Text style={[styles.metricValMain, { color: '#10b981' }]} allowFontScaling={false}>
                        ${Number(p.monthlyRent || 0).toLocaleString('en-US')}
                      </Text>
                      <Text style={styles.metricSubText} allowFontScaling={false}>
                        Occ. Rate: {p.occupancyRate || 0}%
                      </Text>
                    </View>

                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel} allowFontScaling={false}>ASSET VALUATION</Text>
                      <Text style={[styles.metricValMain, { color: p.hasRealValuation ? '#38bdf8' : colors.textPrimary }]} allowFontScaling={false}>
                        {p.hasRealValuation ? `$${Number(p.currentValue).toLocaleString('en-US')}` : 'N/A'}
                      </Text>
                      <Text style={styles.metricSubText} allowFontScaling={false}>Market Value</Text>
                    </View>
                  </View>

                  {/* Action Button: View Details */}
                  <TouchableOpacity
                    style={styles.viewDetailsBtn}
                    onPress={() => setSelectedProperty(p)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="eye-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
                    <Text style={styles.viewDetailsBtnText} allowFontScaling={false}>
                      {language === 'es' ? 'VER DETALLES' : 'VIEW DETAILS'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </Animated.View>
        )}
      </ScrollView>

      {/* COMPREHENSIVE DETAIL MODAL MATCHING WEB FormDialog */}
      <Modal visible={!!selectedProperty} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle} allowFontScaling={false}>
                  Asset Profile & Units Breakdown
                </Text>
                <Text style={styles.modalHeaderSub} allowFontScaling={false}>
                  {selectedProperty?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedProperty(null)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedProperty && (
              <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                {/* Property Identity Card */}
                <View style={styles.modalIdentityCard}>
                  <View style={styles.modalIdentityRow}>
                    <View style={styles.modalIconBox}>
                      <Ionicons name="business" size={24} color="#38bdf8" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.modalPropName} allowFontScaling={false}>
                        {selectedProperty.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                        <Ionicons name="location-outline" size={13} color="#38bdf8" style={{ marginRight: 4 }} />
                        <Text style={styles.modalPropAddress} allowFontScaling={false}>
                          {selectedProperty.address}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Top 4 Metric Cards Matching Web 1:1 */}
                <View style={styles.modalFourGrid}>
                  <View style={styles.modalGridCard}>
                    <Text style={styles.modalGridLabel} allowFontScaling={false}>TOTAL UNITS</Text>
                    <Text style={styles.modalGridVal} allowFontScaling={false}>{selectedProperty.unitsCount || 0} Units</Text>
                    <Text style={styles.modalGridSub} allowFontScaling={false}>
                      {selectedProperty.occupiedUnits || 0} Occ / {selectedProperty.vacantUnits || 0} Vac
                    </Text>
                  </View>

                  <View style={styles.modalGridCard}>
                    <Text style={styles.modalGridLabel} allowFontScaling={false}>OCCUPANCY RATE</Text>
                    <Text style={[styles.modalGridVal, { color: '#10b981' }]} allowFontScaling={false}>
                      {selectedProperty.occupancyRate || 0}%
                    </Text>
                    <Text style={styles.modalGridSub} allowFontScaling={false}>Active Leased</Text>
                  </View>

                  <View style={styles.modalGridCard}>
                    <Text style={styles.modalGridLabel} allowFontScaling={false}>MONTHLY RENT REVENUE</Text>
                    <Text style={[styles.modalGridVal, { color: '#10b981' }]} allowFontScaling={false}>
                      ${Number(selectedProperty.monthlyRent || 0).toLocaleString('en-US')}
                    </Text>
                    <Text style={styles.modalGridSub} allowFontScaling={false}>Contractual Rent</Text>
                  </View>

                  <View style={styles.modalGridCard}>
                    <Text style={styles.modalGridLabel} allowFontScaling={false}>OWNERSHIP SHARE</Text>
                    <Text style={styles.modalGridVal} allowFontScaling={false}>
                      {selectedProperty.ownershipPercentage || 100}%
                    </Text>
                    <Text style={styles.modalGridSub} allowFontScaling={false}>Title Equity</Text>
                  </View>
                </View>

                {/* Two Parameter Cards Matching Web: Asset Parameters & Ownership & Financials */}
                <View style={styles.twoBoxesContainer}>
                  {/* Card 1: Asset Parameters */}
                  <View style={styles.boxCard}>
                    <View style={styles.boxHeaderRow}>
                      <Ionicons name="business-outline" size={15} color="#38bdf8" style={{ marginRight: 6 }} />
                      <Text style={styles.boxTitle} allowFontScaling={false}>ASSET PARAMETERS</Text>
                    </View>
                    <View style={styles.boxDivider} />

                    <View style={styles.paramGrid}>
                      <View style={styles.paramCol}>
                        <Text style={styles.paramLabel} allowFontScaling={false}>PROPERTY TYPE</Text>
                        <Text style={styles.paramVal} allowFontScaling={false}>{selectedProperty.type || 'Apartment'}</Text>
                      </View>
                      <View style={styles.paramCol}>
                        <Text style={styles.paramLabel} allowFontScaling={false}>TOTAL FLOORS</Text>
                        <Text style={styles.paramVal} allowFontScaling={false}>{selectedProperty.totalFloors ? `${selectedProperty.totalFloors} Floor` : '7 Floor'}</Text>
                      </View>
                      <View style={styles.paramCol}>
                        <Text style={styles.paramLabel} allowFontScaling={false}>TOTAL UNITS</Text>
                        <Text style={styles.paramVal} allowFontScaling={false}>{selectedProperty.unitsCount ? `${selectedProperty.unitsCount} Unit` : '0 Unit'}</Text>
                      </View>
                      <View style={styles.paramCol}>
                        <Text style={styles.paramLabel} allowFontScaling={false}>MANAGEMENT CO.</Text>
                        <Text style={styles.paramVal} allowFontScaling={false}>{selectedProperty.managementCompany || 'Check Properties'}</Text>
                      </View>
                      <View style={styles.paramCol}>
                        <Text style={styles.paramLabel} allowFontScaling={false}>NYC BIN #</Text>
                        <Text style={[styles.paramVal, { color: '#f59e0b' }]} allowFontScaling={false}>N/A</Text>
                      </View>
                      <View style={styles.paramCol}>
                        <Text style={styles.paramLabel} allowFontScaling={false}>CITY, STATE & ZIP</Text>
                        <Text style={styles.paramVal} allowFontScaling={false} numberOfLines={1}>
                          {[selectedProperty.city, selectedProperty.state, selectedProperty.zip].filter(Boolean).join(', ') || selectedProperty.address || 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Card 2: Ownership & Financials */}
                  <View style={styles.boxCard}>
                    <View style={styles.boxHeaderRow}>
                      <Ionicons name="wallet-outline" size={15} color="#38bdf8" style={{ marginRight: 6 }} />
                      <Text style={styles.boxTitle} allowFontScaling={false}>OWNERSHIP & FINANCIALS</Text>
                    </View>
                    <View style={styles.boxDivider} />

                    <View style={styles.paramGrid}>
                      <View style={styles.paramCol}>
                        <Text style={styles.paramLabel} allowFontScaling={false}>OWNER ACCOUNT</Text>
                        <Text style={styles.paramVal} allowFontScaling={false}>Owner</Text>
                      </View>
                      <View style={styles.paramCol}>
                        <Text style={styles.paramLabel} allowFontScaling={false}>SHARE PERCENTAGE</Text>
                        <Text style={styles.paramVal} allowFontScaling={false}>{selectedProperty.ownershipPercentage || 100}%</Text>
                      </View>
                      <View style={styles.paramCol}>
                        <Text style={styles.paramLabel} allowFontScaling={false}>PURCHASE PRICE</Text>
                        <Text style={styles.paramVal} allowFontScaling={false}>
                          {selectedProperty.purchasePrice > 0 ? `$${selectedProperty.purchasePrice.toLocaleString('en-US')}` : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.paramCol}>
                        <Text style={styles.paramLabel} allowFontScaling={false}>CURRENT VALUATION</Text>
                        <Text style={[styles.paramVal, { color: selectedProperty.hasRealValuation ? '#38bdf8' : colors.textPrimary }]} allowFontScaling={false}>
                          {selectedProperty.hasRealValuation ? `$${selectedProperty.currentValue.toLocaleString('en-US')}` : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.paramCol}>
                        <Text style={styles.paramLabel} allowFontScaling={false}>MONTHLY EXPENSES</Text>
                        <Text style={[styles.paramVal, { color: '#f43f5e' }]} allowFontScaling={false}>$0</Text>
                      </View>
                      <View style={styles.paramCol}>
                        <Text style={styles.paramLabel} allowFontScaling={false}>NET OPERATING INCOME</Text>
                        <Text style={[styles.paramVal, { color: '#10b981' }]} allowFontScaling={false}>
                          ${Number(selectedProperty.monthlyRent || 0).toLocaleString('en-US')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Units Breakdown Header */}
                <View style={styles.unitsSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                    <Ionicons name="layers-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
                    <Text style={styles.unitsSectionTitle} numberOfLines={1} allowFontScaling={false}>
                      UNITS BREAKDOWN ({selectedProperty.units?.length || 0})
                    </Text>
                  </View>
                  <View style={styles.unitsCountPill}>
                    <Text style={styles.unitsCountBadge} allowFontScaling={false}>
                      {selectedProperty.occupiedUnits || 0} Occ / {selectedProperty.vacantUnits || 0} Vac
                    </Text>
                  </View>
                </View>

                {/* Units List */}
                {selectedProperty.units && selectedProperty.units.length > 0 ? (
                  selectedProperty.units.map((unit) => {
                    const isUnitOccupied = (unit.status || '').toLowerCase() === 'occupied';
                    return (
                      <View key={unit.id} style={styles.unitRowCard}>
                        <View style={styles.unitTopRow}>
                          <View>
                            <Text style={styles.unitNumberText} allowFontScaling={false}>
                              {unit.unitNumber}
                            </Text>
                            <Text style={styles.unitBedsText} allowFontScaling={false}>
                              {unit.bedrooms || 2}B / {unit.bathrooms || 2}Ba
                            </Text>
                          </View>
                          <View style={[styles.unitBadge, { borderColor: isUnitOccupied ? '#10b981' : '#64748b', backgroundColor: isUnitOccupied ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)' }]}>
                            <Text style={[styles.unitBadgeText, { color: isUnitOccupied ? '#10b981' : '#94a3b8' }]} allowFontScaling={false}>
                              {unit.status}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.unitDivider} />

                        <View style={styles.unitBottomRow}>
                          <View>
                            <Text style={styles.unitRentLabel} allowFontScaling={false}>Monthly Rent</Text>
                            <Text style={[styles.unitRentVal, { color: '#10b981' }]} allowFontScaling={false}>
                              ${Number(unit.rentAmount || 0).toLocaleString('en-US')}/mo
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.unitRentLabel} allowFontScaling={false}>Resident</Text>
                            <Text style={styles.unitTenantName} allowFontScaling={false} numberOfLines={1}>
                              {unit.tenantName}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyUnitsBox}>
                    <Text style={styles.emptyUnitsText} allowFontScaling={false}>
                      No individual unit entries recorded for this property.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setSelectedProperty(null)}
              >
                <Text style={styles.doneBtnText} allowFontScaling={false}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fixedHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 14 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  pageSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    padding: 0,
  },

  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 100,
  },

  centerLoading: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },

  // Property Card Styles
  propertyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.25 : 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  propertyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  typePill: {
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
    alignSelf: 'flex-start',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  typePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.textSecondary,
  },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  addressText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },

  specsPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  specPill: {
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  specPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  metricsGridBox: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  metricValMain: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 3,
  },
  metricSubText: {
    fontSize: 9.5,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },

  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 14,
  },
  viewDetailsBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  modalHeaderSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  closeModalBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modalIdentityCard: {
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPropName: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  modalPropAddress: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  modalFourGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  modalGridCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalGridLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  modalGridVal: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 3,
  },
  modalGridSub: {
    fontSize: 9.5,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },

  twoBoxesContainer: {
    marginTop: 12,
    gap: 10,
  },
  boxCard: {
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  boxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  boxTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  boxDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginBottom: 10,
  },
  paramGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
  },
  paramCol: {
    width: '50%',
    paddingRight: 6,
  },
  paramLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  paramVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },

  unitsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 10,
  },
  unitsSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  unitsCountPill: {
    backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.1)' : '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.25)' : '#e2e8f0',
  },
  unitsCountBadge: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.textSecondary,
  },

  unitRowCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  unitTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  unitNumberText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  unitBedsText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  unitBadge: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unitBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  unitDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 8,
  },
  unitBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitRentLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  unitRentVal: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#10b981',
    marginTop: 2,
  },
  unitTenantName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
    maxWidth: 140,
  },

  emptyUnitsBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyUnitsText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  doneBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});

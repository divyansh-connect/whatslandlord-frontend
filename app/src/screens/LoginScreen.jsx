import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  Image,
  Modal,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useStore';
import { useThemeColors } from '../theme';

export const LoginScreen = () => {
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [signupModalVisible, setSignupModalVisible] = useState(false);
  const [signupStep, setSignupStep] = useState(1);
  const [signupForm, setSignupForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    selectedProperty: null,
    dob: '',
    nationality: 'American',
    idType: 'Driver License',
    idNumber: '',
    currentAddress: '',
    employer: '',
    position: '',
    monthlyIncome: '',
    employmentStatus: 'Full-Time',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    budget: '',
    moveInDate: '',
    priority: 'Medium',
    notes: '',
  });
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [publicProperties, setPublicProperties] = useState([]);
  const [isLoadingPublicProps, setIsLoadingPublicProps] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);

  const availableUnits = React.useMemo(() => {
    const list = [];
    publicProperties.forEach((prop) => {
      if (prop.units && Array.isArray(prop.units) && prop.units.length > 0) {
        prop.units.forEach((u) => {
          // Only show Vacant units for rental applications!
          const isVacant = !u.status || u.status === 'Vacant' || u.status === 'Vacant_Needs_Preparation';
          if (!isVacant) return;

          list.push({
            unitId: u.id,
            unitNumber: u.unitNumber,
            rentAmount: u.rentAmount || prop.rentAmount,
            bedrooms: u.bedrooms,
            bathrooms: u.bathrooms,
            propertyId: prop.id,
            propertyName: prop.name,
            address: prop.address,
            companyId: prop.companyId,
            ownerName: prop.owner?.name || prop.ownerName || 'Apex PM',
          });
        });
      } else {
        list.push({
          unitId: '',
          unitNumber: '101',
          rentAmount: prop.rentAmount || 1200,
          bedrooms: prop.bedrooms || 1,
          bathrooms: prop.bathrooms || 1,
          propertyId: prop.id,
          propertyName: prop.name,
          address: prop.address,
          companyId: prop.companyId,
          ownerName: prop.owner?.name || prop.ownerName || 'Apex PM',
        });
      }
    });
    return list;
  }, [publicProperties]);

  useEffect(() => {
    if (signupModalVisible) {
      fetchPublicProperties();
    }
  }, [signupModalVisible]);

  const fetchPublicProperties = async () => {
    setIsLoadingPublicProps(true);
    try {
      let res = await apiClient.get('/auth/public-properties');
      if (res && res.data) {
        setPublicProperties(res.data);
      } else if (Array.isArray(res)) {
        setPublicProperties(res);
      } else {
        const fallbackRes = await apiClient.get('/properties');
        setPublicProperties(fallbackRes.data || fallbackRes || []);
      }
    } catch (e) {
      try {
        const fallbackRes = await apiClient.get('/properties');
        setPublicProperties(fallbackRes.data || fallbackRes || []);
      } catch (err) {
        setPublicProperties([]);
      }
    } finally {
      setIsLoadingPublicProps(false);
    }
  };

  const login = useAuthStore((state) => state.login);

  const handleLogin = async (selectedEmail, selectedPassword) => {
    const targetEmail = (selectedEmail || email || '').trim();
    const targetPassword = selectedPassword || password;
    if (!targetEmail || !targetPassword) {
      setError('Please enter your email and password');
      return;
    }
    setError('');
    setLoading(true);
    const success = await login(targetEmail, targetPassword);
    setLoading(false);
    if (!success) {
      setError('Login failed. Please check your credentials.');
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/luxury_apartment_login_bg.png')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      {/* Translucent Dark Overlay */}
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.centerContainer}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

            {/* Centered App Header */}
            <View style={styles.header}>
              <View style={styles.logoBadge}>
                <Image
                  source={require('../../assets/luxury_apartment_login_bg.png')}
                  style={styles.logoBadgeImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.brandTitle} allowFontScaling={false}>WhatsLandlord</Text>
              <Text style={styles.subtitle} allowFontScaling={false}>Management & Leasing Portal</Text>
            </View>

            {/* Centered Glassmorphism Login Card */}
            <View style={styles.card}>
              {error ? <Text style={styles.errorText} allowFontScaling={false}>{error}</Text> : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label} allowFontScaling={false}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="off"
                  textContentType="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label} allowFontScaling={false}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="off"
                  textContentType="none"
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={() => handleLogin()}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText} allowFontScaling={false}>Log In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signupLinkBtn}
                onPress={() => setSignupModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.signupLinkText} allowFontScaling={false}>
                  New Resident? <Text style={styles.signupLinkBold}>Apply for Unit / Register</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* 3-Step Public Tenant Registration Full-Screen Native Modal */}
            <Modal visible={signupModalVisible} animationType="slide" presentationStyle="fullScreen">
              <View style={styles.modalFullScreenBgDark}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  style={{ flex: 1 }}
                >
                  {/* Top Header Bar with Safe Area Spacing */}
                  <View style={styles.modalHeaderNativeDark}>
                    <TouchableOpacity onPress={() => setSignupModalVisible(false)} style={styles.closeHeaderBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close" size={22} color="#0f172a" />
                    </TouchableOpacity>

                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.modalHeaderTitleBright} allowFontScaling={false}>
                        Resident Application
                      </Text>
                      <Text style={styles.stepSubtitleCyan} allowFontScaling={false}>
                        Step {signupStep} of 3
                      </Text>
                    </View>

                    <View style={{ width: 36 }} />
                  </View>

                  {/* Visual Progress Bar Track */}
                  <View style={styles.progressBarTrackDark}>
                    <View style={[styles.progressBarFillCyan, { width: `${(signupStep / 3) * 100}%` }]} />
                  </View>

                  <ScrollView
                    contentContainerStyle={styles.modalScrollContentFlex}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {signupStep === 1 && (
                      <View style={styles.stepContainerFlex}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stepTitleWhite}>Tenant Signup</Text>
                          <Text style={styles.stepSubtitleTextMuted}>
                            Step 1: Enter your account login details
                          </Text>

                          {signupError ? (
                            <View style={styles.errorAlertBox}>
                              <Text style={styles.errorAlertText}>{signupError}</Text>
                            </View>
                          ) : null}

                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>First Name</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="John"
                                placeholderTextColor="#94a3b8"
                                value={signupForm.firstName}
                                onChangeText={(t) => setSignupForm({ ...signupForm, firstName: t })}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Last Name</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="Doe"
                                placeholderTextColor="#94a3b8"
                                value={signupForm.lastName}
                                onChangeText={(t) => setSignupForm({ ...signupForm, lastName: t })}
                              />
                            </View>
                          </View>

                          <Text style={styles.inputLabelBright}>Email Address</Text>
                          <TextInput
                            style={styles.modalInputDarkBox}
                            placeholder="john.doe@gmail.com"
                            placeholderTextColor="#94a3b8"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={signupForm.email}
                            onChangeText={(t) => setSignupForm({ ...signupForm, email: t })}
                          />

                          <Text style={styles.inputLabelBright}>Phone Number</Text>
                          <TextInput
                            style={styles.modalInputDarkBox}
                            placeholder="(512) 555-0199"
                            placeholderTextColor="#94a3b8"
                            keyboardType="phone-pad"
                            value={signupForm.phone}
                            onChangeText={(t) => setSignupForm({ ...signupForm, phone: t })}
                          />

                          <Text style={styles.inputLabelBright}>Choose Password</Text>
                          <TextInput
                            style={styles.modalInputDarkBox}
                            placeholder="••••••••"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry
                            value={signupForm.password}
                            onChangeText={(t) => setSignupForm({ ...signupForm, password: t })}
                          />
                        </View>

                        {/* Bottom Pinned Action Bar */}
                        <View style={styles.bottomPinnedBar}>
                          <TouchableOpacity
                            style={styles.primaryNextBtnFull}
                            onPress={async () => {
                              setSignupError('');
                              if (!signupForm.firstName || !signupForm.lastName || !signupForm.email || !signupForm.password) {
                                setSignupError('Please fill in all required fields.');
                                return;
                              }
                              try {
                                const checkRes = await apiClient.post('/auth/check-email', { email: signupForm.email });
                                if (checkRes && checkRes.exists) {
                                  setSignupError('This email is already registered. Please sign in.');
                                  return;
                                }
                              } catch (e) {}
                              setSignupStep(2);
                            }}
                          >
                            <Text style={styles.nextBtnTextBold}>Next: Select Property ➔</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {signupStep === 2 && (
                      <View style={styles.stepContainerFlex}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stepTitleWhite}>Choose Your Home</Text>
                          <Text style={styles.stepSubtitleTextMuted}>
                            Select the unit and apartment property you want to apply for
                          </Text>

                          {signupError ? (
                            <View style={styles.errorAlertBox}>
                              <Text style={styles.errorAlertText}>{signupError}</Text>
                            </View>
                          ) : null}

                          <Text style={styles.inputLabelBright}>🏢 AVAILABLE VACANT HOMES & UNITS ({availableUnits.length})</Text>

                          {isLoadingPublicProps ? (
                            <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 20 }} />
                          ) : availableUnits.length === 0 ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                              <Text style={{ color: '#94a3b8' }}>No units currently available.</Text>
                            </View>
                          ) : (
                            availableUnits.map((u, idx) => {
                              const isSelected = selectedUnit?.propertyId === u.propertyId && selectedUnit?.unitNumber === u.unitNumber;
                              return (
                                <TouchableOpacity
                                  key={`${u.propertyId}-${u.unitNumber}-${idx}`}
                                  style={[
                                    styles.propertyOptionCardDark,
                                    isSelected && styles.propertyOptionCardSelectedCyan,
                                  ]}
                                  onPress={() => {
                                    setSignupError('');
                                    setSelectedUnit(u);
                                    setSignupForm((prev) => ({
                                      ...prev,
                                      selectedProperty: { id: u.propertyId, name: u.propertyName, companyId: u.companyId, address: u.address },
                                      budget: u.rentAmount ? String(u.rentAmount) : prev.budget,
                                    }));
                                  }}
                                >
                                  <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: isSelected ? '#e0f2fe' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons
                                      name="home"
                                      size={22}
                                      color={isSelected ? '#0284c7' : '#64748b'}
                                    />
                                  </View>
                                  <View style={{ flex: 1, marginLeft: 10 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <Text
                                        style={[
                                          styles.propertyOptionTitleWhite,
                                          { fontSize: 16, fontWeight: '800' },
                                          isSelected && styles.propertyOptionTitleSelectedCyan,
                                        ]}
                                      >
                                        Unit {u.unitNumber}
                                      </Text>
                                      {u.rentAmount ? (
                                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#059669' }}>
                                          ${Number(u.rentAmount).toLocaleString()}<Text style={{ fontSize: 10, color: '#64748b', fontWeight: 'normal' }}>/mo</Text>
                                        </Text>
                                      ) : null}
                                    </View>
                                    <Text style={{ fontSize: 13, color: '#334155', fontWeight: '600', marginTop: 2 }}>
                                      🏢 {u.propertyName}
                                    </Text>
                                    <Text style={styles.propertyOptionSubMuted} numberOfLines={1}>
                                      📍 {u.address || 'Address not listed'}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#0284c7', fontWeight: '600', marginTop: 2 }}>
                                      Manager: {u.ownerName}
                                    </Text>
                                  </View>
                                  {isSelected && (
                                    <Ionicons name="checkmark-circle" size={24} color="#0284c7" />
                                  )}
                                </TouchableOpacity>
                              );
                            })
                          )}
                        </View>

                        {/* Bottom Pinned Action Bar */}
                        <View style={styles.bottomPinnedBar}>
                          <View style={styles.bottomNavRowFlex}>
                            <TouchableOpacity style={styles.secondaryBackBtnDark} onPress={() => setSignupStep(1)}>
                              <Text style={styles.backBtnTextWhite}>⬅ Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.primaryNextBtnFlexCyan}
                              onPress={() => {
                                if (!selectedUnit && !signupForm.selectedProperty) {
                                  setSignupError('Please select a home/unit from the list.');
                                  return;
                                }
                                setSignupError('');
                                setSignupStep(3);
                              }}
                            >
                              <Text style={styles.nextBtnTextBold}>Next: Application Details ➔</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}

                    {signupStep === 3 && (
                      <View style={styles.stepContainerFlex}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stepTitleWhite}>Application Details</Text>
                          <Text style={styles.stepSubtitleTextMuted}>
                            Complete application details for screening review
                          </Text>

                          {signupError ? (
                            <View style={styles.errorAlertBox}>
                              <Text style={styles.errorAlertText}>{signupError}</Text>
                            </View>
                          ) : null}

                          {/* 1. VISUALLY STUNNING SELECTED DETAILS CARD */}
                          <View style={styles.selectedPropSummaryCardDark}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <View style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="home" size={20} color="#0284c7" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#0284c7', textTransform: 'uppercase' }}>
                                  SELECTED HOME & UNIT
                                </Text>
                                <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#0f172a' }}>
                                  Unit {selectedUnit?.unitNumber || '101'} · {signupForm.selectedProperty?.name || selectedUnit?.propertyName || 'Selected Property'}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#64748b' }}>
                                  {signupForm.selectedProperty?.address || selectedUnit?.address || ''}
                                </Text>
                              </View>
                              {selectedUnit?.rentAmount ? (
                                <View style={{ alignItems: 'flex-end' }}>
                                  <Text style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>MONTHLY RENT</Text>
                                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#059669' }}>
                                    ${Number(selectedUnit.rentAmount).toLocaleString()}<Text style={{ fontSize: 10, color: '#64748b' }}>/mo</Text>
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 }} />

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>APPLICANT</Text>
                                <Text style={{ fontSize: 12, color: '#0f172a', fontWeight: '700' }}>
                                  {signupForm.firstName} {signupForm.lastName}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>EMAIL & PHONE</Text>
                                <Text style={{ fontSize: 12, color: '#0f172a', fontWeight: '700' }}>
                                  {signupForm.email}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* SECTION: PERSONAL & IDENTIFICATION */}
                          <Text style={styles.sectionHeaderCyan}>PERSONAL & IDENTIFICATION</Text>

                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Date of Birth</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#94a3b8"
                                value={signupForm.dob}
                                onChangeText={(t) => setSignupForm({ ...signupForm, dob: t })}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Nationality</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="American"
                                placeholderTextColor="#94a3b8"
                                value={signupForm.nationality}
                                onChangeText={(t) => setSignupForm({ ...signupForm, nationality: t })}
                              />
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>ID Type</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="Driver License"
                                placeholderTextColor="#94a3b8"
                                value={signupForm.idType}
                                onChangeText={(t) => setSignupForm({ ...signupForm, idType: t })}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>ID Number</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="A1234567"
                                placeholderTextColor="#94a3b8"
                                value={signupForm.idNumber}
                                onChangeText={(t) => setSignupForm({ ...signupForm, idNumber: t })}
                              />
                            </View>
                          </View>

                          {/* SECTION: ADDRESS HISTORY */}
                          <Text style={styles.sectionHeaderCyan}>ADDRESS HISTORY</Text>
                          <Text style={styles.inputLabelBright}>Current Address</Text>
                          <TextInput
                            style={styles.modalInputDarkBox}
                            placeholder="789 Pine Rd, Austin, TX"
                            placeholderTextColor="#94a3b8"
                            value={signupForm.currentAddress}
                            onChangeText={(t) => setSignupForm({ ...signupForm, currentAddress: t })}
                          />

                          {/* SECTION: EMPLOYMENT DETAILS */}
                          <Text style={styles.sectionHeaderCyan}>EMPLOYMENT DETAILS</Text>
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Employer Name</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="Google Inc."
                                placeholderTextColor="#94a3b8"
                                value={signupForm.employer}
                                onChangeText={(t) => setSignupForm({ ...signupForm, employer: t })}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Position/Title</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="Software Engineer"
                                placeholderTextColor="#94a3b8"
                                value={signupForm.position}
                                onChangeText={(t) => setSignupForm({ ...signupForm, position: t })}
                              />
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Monthly Income ($)</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="3000"
                                placeholderTextColor="#94a3b8"
                                keyboardType="numeric"
                                value={signupForm.monthlyIncome}
                                onChangeText={(t) => setSignupForm({ ...signupForm, monthlyIncome: t })}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Job Status</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="Full-Time"
                                placeholderTextColor="#94a3b8"
                                value={signupForm.employmentStatus}
                                onChangeText={(t) => setSignupForm({ ...signupForm, employmentStatus: t })}
                              />
                            </View>
                          </View>

                          {/* SECTION: EMERGENCY CONTACT */}
                          <Text style={styles.sectionHeaderCyan}>EMERGENCY CONTACT</Text>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Name</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="Mary Doe"
                                placeholderTextColor="#94a3b8"
                                value={signupForm.emergencyName}
                                onChangeText={(t) => setSignupForm({ ...signupForm, emergencyName: t })}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Relationship</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="Spouse"
                                placeholderTextColor="#94a3b8"
                                value={signupForm.emergencyRelationship}
                                onChangeText={(t) => setSignupForm({ ...signupForm, emergencyRelationship: t })}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Phone</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="(512) 555-9876"
                                placeholderTextColor="#94a3b8"
                                keyboardType="phone-pad"
                                value={signupForm.emergencyPhone}
                                onChangeText={(t) => setSignupForm({ ...signupForm, emergencyPhone: t })}
                              />
                            </View>
                          </View>

                          {/* SECTION: LEASE REQUEST DETAILS */}
                          <Text style={styles.sectionHeaderCyan}>LEASE REQUEST DETAILS</Text>
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Monthly Budget ($)</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="1500"
                                placeholderTextColor="#94a3b8"
                                keyboardType="numeric"
                                value={signupForm.budget}
                                onChangeText={(t) => setSignupForm({ ...signupForm, budget: t })}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Desired Move-In</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#94a3b8"
                                value={signupForm.moveInDate}
                                onChangeText={(t) => setSignupForm({ ...signupForm, moveInDate: t })}
                              />
                            </View>
                          </View>

                          <Text style={styles.inputLabelBright}>Application Notes / Preferences</Text>
                          <TextInput
                            style={[styles.modalInputDarkBox, { height: 70, textAlignVertical: 'top' }]}
                            placeholder="Include pet counts, move-in preferences or details..."
                            placeholderTextColor="#94a3b8"
                            multiline
                            numberOfLines={3}
                            value={signupForm.notes}
                            onChangeText={(t) => setSignupForm({ ...signupForm, notes: t })}
                          />
                        </View>

                        {/* Bottom Pinned Action Bar */}
                        <View style={styles.bottomPinnedBar}>
                          <View style={styles.bottomNavRowFlex}>
                            <TouchableOpacity
                              style={styles.secondaryBackBtnDark}
                              onPress={() => setSignupStep(2)}
                              disabled={isSubmittingSignup}
                            >
                              <Text style={styles.backBtnTextWhite}>⬅ Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.submitSuccessBtnGreen}
                              disabled={isSubmittingSignup}
                              onPress={async () => {
                                setSignupError('');
                                setIsSubmittingSignup(true);
                                try {
                                  const payload = {
                                    ...signupForm,
                                    companyId: signupForm.selectedProperty?.companyId || selectedUnit?.companyId,
                                    property: signupForm.selectedProperty?.name || selectedUnit?.propertyName,
                                    propertyId: signupForm.selectedProperty?.id || selectedUnit?.propertyId,
                                    unitId: selectedUnit?.unitId || undefined,
                                    unitNumber: selectedUnit?.unitNumber || undefined,
                                  };
                                  try {
                                    await apiClient.post('/auth/tenant-signup', payload);
                                  } catch (e1) {
                                    await apiClient.post('/applications', payload);
                                  }
                                  setIsSubmittingSignup(false);
                                  setSignupModalVisible(false);
                                  setSignupStep(1);
                                  Alert.alert(
                                    'Application Submitted!',
                                    'Your tenant registration and screening application has been submitted successfully.'
                                  );
                                } catch (err) {
                                  setIsSubmittingSignup(false);
                                  setSignupError(err?.message || 'Submission failed. Please try again.');
                                }
                              }}
                            >
                              {isSubmittingSignup ? (
                                <ActivityIndicator color="#ffffff" />
                              ) : (
                                <Text style={styles.nextBtnTextBold}>Submit Application 🎉</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}
                  </ScrollView>
                </KeyboardAvoidingView>
              </View>
            </Modal>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255, 255, 255, 0.45)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 40 : 20,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#38bdf8',
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  logoBadgeImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#38bdf8',
    marginTop: 2,
    fontWeight: '600',
  },
  card: {
    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.82)' : 'rgba(255, 255, 255, 0.92)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.35 : 0.1,
    shadowRadius: 8,
    elevation: 8,
    width: '100%',
  },
  errorText: {
    color: '#f43f5e',
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    color: isDarkMode ? '#cbd5e1' : '#475569',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    fontSize: 13.5,
  },
  button: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  mockSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  mockSectionTitle: {
    color: isDarkMode ? '#94a3b8' : '#64748b',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sideBySideGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  compactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.85)' : '#ffffff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  chipIcon: {
    fontSize: 13,
  },
  chipLabel: {
    color: '#38bdf8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  signupLinkBtn: {
    marginTop: 16,
    paddingVertical: 4,
    alignItems: 'center',
  },
  signupLinkText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  signupLinkBold: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  modalFullScreenBgDark: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeaderNativeDark: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight || 24) + 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  closeHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitleBright: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  stepSubtitleCyan: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '700',
    marginTop: 2,
  },
  progressBarTrackDark: {
    height: 4,
    backgroundColor: '#e2e8f0',
    width: '100%',
  },
  progressBarFillCyan: {
    height: '100%',
    backgroundColor: '#0284c7',
  },
  modalScrollContentFlex: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    backgroundColor: '#f8fafc',
  },
  stepContainerFlex: {
    flex: 1,
    justifyContent: 'space-between',
  },
  stepTitleWhite: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  stepSubtitleTextMuted: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 18,
  },
  inputLabelBright: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInputDarkBox: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0f172a',
    fontSize: 15,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  bottomPinnedBar: {
    marginTop: 28,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  primaryNextBtnFull: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  nextBtnTextBold: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  propertyOptionCardDark: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  propertyOptionCardSelectedCyan: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  propertyOptionTitleWhite: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  propertyOptionTitleSelectedCyan: {
    color: '#0284c7',
    fontWeight: 'bold',
  },
  propertyOptionSubMuted: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  bottomNavRowFlex: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBackBtnDark: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  backBtnTextWhite: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 14,
  },
  primaryNextBtnFlexCyan: {
    flex: 1,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitSuccessBtnGreen: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  selectedPropSummaryCardDark: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeaderCyan: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 6,
  },
  errorAlertBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorAlertText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

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
  SafeAreaView,
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
  const [publicProperties, setPublicProperties] = useState([]);
  const [isLoadingPublicProps, setIsLoadingPublicProps] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);

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

  const handleLogin = async (selectedEmail) => {
    const targetEmail = selectedEmail || email;
    if (!targetEmail) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setLoading(true);
    const success = await login(targetEmail, password);
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
                  placeholder="admin@apexpm.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label} allowFontScaling={false}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123456"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor="#94a3b8"
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
              <SafeAreaView style={styles.modalFullScreenBgDark}>
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  style={{ flex: 1 }}
                >
                  {/* Top Header Bar */}
                  <View style={styles.modalHeaderNativeDark}>
                    <TouchableOpacity onPress={() => setSignupModalVisible(false)} style={styles.closeHeaderBtn}>
                      <Ionicons name="close" size={26} color="#ffffff" />
                    </TouchableOpacity>

                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.modalHeaderTitleBright} allowFontScaling={false}>
                        Resident Application
                      </Text>
                      <Text style={styles.stepSubtitleCyan} allowFontScaling={false}>
                        Step {signupStep} of 3
                      </Text>
                    </View>

                    <View style={{ width: 30 }} />
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
                                placeholderTextColor="#64748b"
                                value={signupForm.firstName}
                                onChangeText={(t) => setSignupForm({ ...signupForm, firstName: t })}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Last Name</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="Doe"
                                placeholderTextColor="#64748b"
                                value={signupForm.lastName}
                                onChangeText={(t) => setSignupForm({ ...signupForm, lastName: t })}
                              />
                            </View>
                          </View>

                          <Text style={styles.inputLabelBright}>Email Address</Text>
                          <TextInput
                            style={styles.modalInputDarkBox}
                            placeholder="john.doe@gmail.com"
                            placeholderTextColor="#64748b"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={signupForm.email}
                            onChangeText={(t) => setSignupForm({ ...signupForm, email: t })}
                          />

                          <Text style={styles.inputLabelBright}>Phone Number</Text>
                          <TextInput
                            style={styles.modalInputDarkBox}
                            placeholder="(512) 555-0199"
                            placeholderTextColor="#64748b"
                            keyboardType="phone-pad"
                            value={signupForm.phone}
                            onChangeText={(t) => setSignupForm({ ...signupForm, phone: t })}
                          />

                          <Text style={styles.inputLabelBright}>Choose Password</Text>
                          <TextInput
                            style={styles.modalInputDarkBox}
                            placeholder="••••••••"
                            placeholderTextColor="#64748b"
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
                            Select the property you want to assign yourself to
                          </Text>

                          {signupError ? (
                            <View style={styles.errorAlertBox}>
                              <Text style={styles.errorAlertText}>{signupError}</Text>
                            </View>
                          ) : null}

                          <Text style={styles.inputLabelBright}>🏢 AVAILABLE PROPERTIES ({publicProperties.length})</Text>

                          {isLoadingPublicProps ? (
                            <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 20 }} />
                          ) : publicProperties.length === 0 ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                              <Text style={{ color: '#94a3b8' }}>No properties currently available.</Text>
                            </View>
                          ) : (
                            publicProperties.map((prop) => {
                              const isSelected = signupForm.selectedProperty?.id === prop.id;
                              const ownerName = prop.owner?.name || prop.ownerName || 'Apex PM';
                              return (
                                <TouchableOpacity
                                  key={prop.id || prop.name}
                                  style={[
                                    styles.propertyOptionCardDark,
                                    isSelected && styles.propertyOptionCardSelectedCyan,
                                  ]}
                                  onPress={() => {
                                    setSignupError('');
                                    setSignupForm({ ...signupForm, selectedProperty: prop });
                                  }}
                                >
                                  <Ionicons
                                    name="business"
                                    size={24}
                                    color={isSelected ? '#38bdf8' : '#94a3b8'}
                                  />
                                  <View style={{ flex: 1 }}>
                                    <Text
                                      style={[
                                        styles.propertyOptionTitleWhite,
                                        isSelected && styles.propertyOptionTitleSelectedCyan,
                                      ]}
                                    >
                                      {prop.name}
                                    </Text>
                                    <Text style={styles.propertyOptionSubMuted}>
                                      {prop.address || 'Address not listed'}
                                    </Text>
                                    <Text style={{ fontSize: 10, color: '#38bdf8', fontWeight: 'bold', marginTop: 2 }}>
                                      Owner/Manager: {ownerName}
                                    </Text>
                                  </View>
                                  {isSelected && (
                                    <Ionicons name="checkmark-circle" size={22} color="#38bdf8" />
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
                                if (!signupForm.selectedProperty) {
                                  setSignupError('Please select a property from the list.');
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
                              <Ionicons name="business" size={20} color="#38bdf8" />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase' }}>
                                  SELECTED PROPERTY
                                </Text>
                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#ffffff' }}>
                                  {signupForm.selectedProperty?.name || 'Selected Property'}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                                  {signupForm.selectedProperty?.address || ''}
                                </Text>
                              </View>
                            </View>

                            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 6 }} />

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>APPLICANT</Text>
                                <Text style={{ fontSize: 11, color: '#e2e8f0', fontWeight: '600' }}>
                                  {signupForm.firstName} {signupForm.lastName}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>EMAIL & PHONE</Text>
                                <Text style={{ fontSize: 11, color: '#e2e8f0', fontWeight: '600' }}>
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
                                placeholderTextColor="#64748b"
                                value={signupForm.dob}
                                onChangeText={(t) => setSignupForm({ ...signupForm, dob: t })}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Nationality</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="American"
                                placeholderTextColor="#64748b"
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
                                placeholderTextColor="#64748b"
                                value={signupForm.idType}
                                onChangeText={(t) => setSignupForm({ ...signupForm, idType: t })}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>ID Number</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="A1234567"
                                placeholderTextColor="#64748b"
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
                            placeholderTextColor="#64748b"
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
                                placeholderTextColor="#64748b"
                                value={signupForm.employer}
                                onChangeText={(t) => setSignupForm({ ...signupForm, employer: t })}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Position/Title</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="Software Engineer"
                                placeholderTextColor="#64748b"
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
                                placeholderTextColor="#64748b"
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
                                placeholderTextColor="#64748b"
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
                                placeholderTextColor="#64748b"
                                value={signupForm.emergencyName}
                                onChangeText={(t) => setSignupForm({ ...signupForm, emergencyName: t })}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Relationship</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="Spouse"
                                placeholderTextColor="#64748b"
                                value={signupForm.emergencyRelationship}
                                onChangeText={(t) => setSignupForm({ ...signupForm, emergencyRelationship: t })}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inputLabelBright}>Phone</Text>
                              <TextInput
                                style={styles.modalInputDarkBox}
                                placeholder="(512) 555-9876"
                                placeholderTextColor="#64748b"
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
                                placeholderTextColor="#64748b"
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
                                placeholderTextColor="#64748b"
                                value={signupForm.moveInDate}
                                onChangeText={(t) => setSignupForm({ ...signupForm, moveInDate: t })}
                              />
                            </View>
                          </View>

                          <Text style={styles.inputLabelBright}>Application Notes / Preferences</Text>
                          <TextInput
                            style={[styles.modalInputDarkBox, { height: 70, textAlignVertical: 'top' }]}
                            placeholder="Include pet counts, move-in preferences or details..."
                            placeholderTextColor="#64748b"
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
                                    companyId: signupForm.selectedProperty?.companyId,
                                    property: signupForm.selectedProperty?.name,
                                    propertyId: signupForm.selectedProperty?.id,
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
              </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 40 : 20,
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
    marginTop: 10,
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
    backgroundColor: '#0f172a',
  },
  modalHeaderNativeDark: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  closeHeaderBtn: {
    padding: 4,
  },
  modalHeaderTitleBright: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepSubtitleCyan: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '700',
  },
  progressBarTrackDark: {
    height: 4,
    backgroundColor: '#1e293b',
    width: '100%',
  },
  progressBarFillCyan: {
    height: '100%',
    backgroundColor: '#38bdf8',
  },
  modalScrollContentFlex: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  stepContainerFlex: {
    flex: 1,
    justifyContent: 'space-between',
  },
  stepTitleWhite: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  stepSubtitleTextMuted: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 18,
  },
  inputLabelBright: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#cbd5e1',
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  modalInputDarkBox: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bottomPinnedBar: {
    marginTop: 30,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  primaryNextBtnFull: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnTextBold: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  propertyOptionCardDark: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    gap: 12,
  },
  propertyOptionCardSelectedCyan: {
    borderColor: '#38bdf8',
    backgroundColor: '#38bdf818',
  },
  propertyOptionTitleWhite: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  propertyOptionTitleSelectedCyan: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  propertyOptionSubMuted: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  bottomNavRowFlex: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBackBtnDark: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  backBtnTextWhite: {
    color: '#ffffff',
    fontWeight: '600',
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
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#38bdf840',
    marginBottom: 16,
  },
  sectionHeaderCyan: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 6,
  },
  errorAlertBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorAlertText: {
    color: '#fb7185',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

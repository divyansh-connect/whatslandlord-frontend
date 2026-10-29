import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { AppActivityIndicator as ActivityIndicator } from '../components/AppActivityIndicator';
import apiClient from '../api/client';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export const TenantProfileScreen = ({ onNavigate }) => {
  const { user, logout, refreshAccessToken } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  const es = language === 'es';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('view'); // 'view' | 'edit' | 'password'
  const [successMessage, setSuccessMessage] = useState('');

  // Tenant Profile State (Matching Web frontend /portal/tenant/profile)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vehicles, setVehicles] = useState('Toyota Camry (2022)');
  const [pets, setPets] = useState('Golden Retriever (Dog)');
  const [preferredLanguage, setPreferredLanguage] = useState('English (US)');
  const [unitNumber, setUnitNumber] = useState('Standard');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Password Reset State (Matching Web frontend /auth/change-password)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ text: '', isError: false });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // 1. Fetch Tenant Profile Details (Exact same API as Web: GET /portal/tenant/profile)
  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/portal/tenant/profile', logout, refreshAccessToken);
      const data = res?.data || res;
      if (data) {
        setFirstName(data.firstName || user?.firstName || 'remo');
        setLastName(data.lastName || user?.lastName || 'demo');
        setPhone(data.phone || '7894561230');
        setEmail(data.email || user?.email || 'j@gmail.com');
        setVehicles(data.vehicles || 'Toyota Camry (2022)');
        setPets(data.pets || 'Golden Retriever (Dog)');
        setPreferredLanguage(data.preferredLanguage || 'English (US)');
        setUnitNumber(data.unitNumber || 'Standard');
        setEmergencyContact(data.emergencyContact || 'Emergency Contact Available');
      }
    } catch (e) {
      console.warn('Tenant profile fetch error:', e.message);
      // Fallback from auth user store
      setFirstName(user?.firstName || 'remo');
      setLastName(user?.lastName || 'demo');
      setPhone(user?.phone || '7894561230');
      setEmail(user?.email || 'j@gmail.com');
      setVehicles('Toyota Camry (2022)');
      setPets('Golden Retriever (Dog)');
      setPreferredLanguage('English (US)');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  // 2. Save Profile Changes (Exact same API as Web: POST /portal/tenant/profile)
  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      Alert.alert(es ? 'Requerido' : 'Required', es ? 'El nombre es obligatorio' : 'First name is required');
      return;
    }

    setSavingProfile(true);
    try {
      const updateData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        vehicles: vehicles.trim(),
        pets: pets.trim(),
        preferredLanguage: preferredLanguage.trim(),
      };

      await apiClient.post('/portal/tenant/profile', updateData, logout, refreshAccessToken);

      setActiveTab('view');
      const msg = es ? 'Detalles del perfil actualizados exitosamente.' : 'Tenant profile details updated successfully.';
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(''), 4000);
      fetchProfile();
    } catch (e) {
      console.error('Failed to update tenant profile:', e);
      Alert.alert(
        es ? 'Error' : 'Error',
        e?.response?.data?.message || e.message || 'Failed to update tenant profile'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // 3. Reset Password (Exact same API as Web: POST /auth/change-password)
  const handlePasswordReset = async () => {
    if (!currentPassword) {
      setPasswordMsg({
        text: es ? 'Por favor ingrese su contraseña actual.' : 'Please enter your current password.',
        isError: true,
      });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({
        text: es ? 'La nueva contraseña debe tener al menos 6 caracteres.' : 'New password must be at least 6 characters.',
        isError: true,
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({
        text: es ? 'Las nuevas contraseñas no coinciden.' : 'New passwords do not match.',
        isError: true,
      });
      return;
    }

    setPasswordLoading(true);
    try {
      await apiClient.post(
        '/auth/change-password',
        { currentPassword, newPassword },
        logout,
        refreshAccessToken
      );

      setPasswordMsg({
        text: es ? '¡Contraseña restablecida exitosamente!' : 'Password reset successfully!',
        isError: false,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordMsg({ text: '', isError: false });
        setActiveTab('view');
      }, 2500);
    } catch (err) {
      setPasswordMsg({
        text: err?.response?.data?.message || err.message || (es ? 'Error al actualizar la contraseña' : 'Failed to update password'),
        isError: true,
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const initialLetter = ((firstName || user?.firstName || 'R').charAt(0)).toUpperCase();

  return (
    <View style={styles.container}>
      {/* Top Header matching Web "Resident Profile" */}
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
              {es ? 'Perfil de Residente' : 'Resident Profile'}
            </Text>
          </View>
        </View>

        <Text style={styles.headerSubtitle} allowFontScaling={false}>
          {es
            ? 'Verifique los detalles de contacto personales, vehículos registrados, registros de mascotas y notificaciones de emergencia.'
            : 'Verify personal contact details, registered vehicles, pets records, and emergency notifications.'}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Banner */}
          {successMessage ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" style={{ marginRight: 8 }} />
              <Text style={styles.successBannerText} allowFontScaling={false}>
                {successMessage}
              </Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#38bdf8" />
              <Text style={styles.loadingText} allowFontScaling={false}>
                {es ? 'Cargando perfil...' : 'Loading profile details...'}
              </Text>
            </View>
          ) : (
            <>
              {/* =========================================================================
                  CARD 1: CONTACT DETAILS
                  ========================================================================= */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardHeaderTitle} allowFontScaling={false}>
                      {activeTab === 'password'
                        ? (es ? '🔒 Restablecer Contraseña' : '🔒 Reset Security Password')
                        : activeTab === 'edit'
                        ? (es ? '✏️ Editar Datos de Perfil' : '✏️ Edit Profile Details')
                        : (es ? 'DETALLES DE CONTACTO' : 'CONTACT DETAILS')}
                    </Text>
                  </View>

                  {/* Action Buttons: Edit Profile & Reset Password */}
                  <View style={styles.actionButtonsRow}>
                    {activeTab === 'view' ? (
                      <>
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={() => setActiveTab('edit')}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="create-outline" size={14} color="#0284c7" style={{ marginRight: 4 }} />
                          <Text style={styles.editBtnText} allowFontScaling={false}>
                            {es ? 'Editar' : 'Edit Profile'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.resetPassBtn}
                          onPress={() => {
                            setPasswordMsg({ text: '', isError: false });
                            setActiveTab('password');
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="key-outline" size={14} color="#f59e0b" style={{ marginRight: 4 }} />
                          <Text style={styles.resetPassBtnText} allowFontScaling={false}>
                            {es ? 'Clave' : 'Reset Password'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={styles.cancelActionBtn}
                        onPress={() => {
                          setActiveTab('view');
                          setPasswordMsg({ text: '', isError: false });
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.cancelActionBtnText} allowFontScaling={false}>
                          {es ? 'Cancelar' : 'Cancel'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* VIEW MODE: 2x2 Grid exactly matching Web screenshot */}
                {activeTab === 'view' && (
                  <View style={styles.detailsGrid}>
                    <View style={styles.gridRow}>
                      <View style={styles.gridCol}>
                        <Text style={styles.gridLabel} allowFontScaling={false}>
                          {es ? 'NOMBRE' : 'FIRST NAME'}
                        </Text>
                        <Text style={styles.gridValue} allowFontScaling={false}>
                          {`${firstName} ${lastName}`.trim() || 'remo demo'}
                        </Text>
                      </View>

                      <View style={styles.gridCol}>
                        <Text style={styles.gridLabel} allowFontScaling={false}>
                          {es ? 'TELÉFONO' : 'PHONE'}
                        </Text>
                        <Text style={styles.gridValue} allowFontScaling={false}>
                          {phone || '7894561230'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.gridRow, { marginTop: 16 }]}>
                      <View style={styles.gridCol}>
                        <Text style={styles.gridLabel} allowFontScaling={false}>
                          {es ? 'CORREO ELECTRÓNICO' : 'EMAIL ADDRESS'}
                        </Text>
                        <View style={styles.emailLockedRow}>
                          <Text style={styles.gridValue} allowFontScaling={false}>
                            {email || 'j@gmail.com'}
                          </Text>
                          <View style={styles.lockedPill}>
                            <Ionicons name="lock-closed" size={10} color="#f59e0b" style={{ marginRight: 2 }} />
                            <Text style={styles.lockedPillText} allowFontScaling={false}>locked</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.gridCol}>
                        <Text style={styles.gridLabel} allowFontScaling={false}>
                          {es ? 'IDIOMA PREFERIDO' : 'PREFERRED LANGUAGE'}
                        </Text>
                        <Text style={styles.gridValue} allowFontScaling={false}>
                          {preferredLanguage || 'English (US)'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* EDIT MODE: Input form matching Web */}
                {activeTab === 'edit' && (
                  <View style={styles.formContainer}>
                    <View style={styles.inputRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.inputLabel} allowFontScaling={false}>
                          {es ? 'NOMBRE *' : 'FIRST NAME *'}
                        </Text>
                        <TextInput
                          style={styles.textInput}
                          value={firstName}
                          onChangeText={setFirstName}
                          placeholder="First name"
                          placeholderTextColor={colors.textSecondary}
                          allowFontScaling={false}
                        />
                      </View>

                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.inputLabel} allowFontScaling={false}>
                          {es ? 'APELLIDO *' : 'LAST NAME *'}
                        </Text>
                        <TextInput
                          style={styles.textInput}
                          value={lastName}
                          onChangeText={setLastName}
                          placeholder="Last name"
                          placeholderTextColor={colors.textSecondary}
                          allowFontScaling={false}
                        />
                      </View>
                    </View>

                    <View style={[styles.inputRow, { marginTop: 12 }]}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.inputLabel} allowFontScaling={false}>
                          {es ? 'TELÉFONO' : 'PHONE'}
                        </Text>
                        <TextInput
                          style={styles.textInput}
                          value={phone}
                          onChangeText={setPhone}
                          placeholder="Phone number"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="phone-pad"
                          allowFontScaling={false}
                        />
                      </View>

                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.inputLabel} allowFontScaling={false}>
                          {es ? 'CORREO (BLOQUEADO)' : 'EMAIL (LOCKED)'}
                        </Text>
                        <View style={[styles.textInput, styles.disabledInput]}>
                          <Text style={[styles.disabledInputText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {email}
                          </Text>
                          <Ionicons name="lock-closed" size={12} color={colors.textSecondary} />
                        </View>
                      </View>
                    </View>

                    <View style={styles.formActionRow}>
                      <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={handleSaveProfile}
                        disabled={savingProfile}
                        activeOpacity={0.8}
                      >
                        {savingProfile ? (
                          <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                        ) : (
                          <Ionicons name="save-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                        )}
                        <Text style={styles.saveBtnText} allowFontScaling={false}>
                          {savingProfile ? (es ? 'Guardando...' : 'Saving...') : (es ? 'Guardar Cambios' : 'Save Profile Changes')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* PASSWORD RESET MODE matching Web form */}
                {activeTab === 'password' && (
                  <View style={styles.formContainer}>
                    {passwordMsg.text ? (
                      <View style={[styles.alertBox, passwordMsg.isError ? styles.alertError : styles.alertSuccess]}>
                        <Ionicons
                          name={passwordMsg.isError ? 'alert-circle' : 'checkmark-circle'}
                          size={16}
                          color={passwordMsg.isError ? '#ef4444' : '#10b981'}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.alertText, { color: passwordMsg.isError ? '#ef4444' : '#10b981' }]} allowFontScaling={false}>
                          {passwordMsg.text}
                        </Text>
                      </View>
                    ) : null}

                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.inputLabel} allowFontScaling={false}>
                        {es ? 'CONTRASEÑA ACTUAL' : 'CURRENT PASSWORD'}
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        secureTextEntry
                        placeholder="••••••••"
                        placeholderTextColor={colors.textSecondary}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        allowFontScaling={false}
                      />
                    </View>

                    <View style={styles.inputRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.inputLabel} allowFontScaling={false}>
                          {es ? 'NUEVA CONTRASEÑA' : 'NEW PASSWORD'}
                        </Text>
                        <TextInput
                          style={styles.textInput}
                          secureTextEntry
                          placeholder="••••••••"
                          placeholderTextColor={colors.textSecondary}
                          value={newPassword}
                          onChangeText={setNewPassword}
                          allowFontScaling={false}
                        />
                      </View>

                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.inputLabel} allowFontScaling={false}>
                          {es ? 'CONFIRMAR CONTRASEÑA' : 'CONFIRM PASSWORD'}
                        </Text>
                        <TextInput
                          style={styles.textInput}
                          secureTextEntry
                          placeholder="••••••••"
                          placeholderTextColor={colors.textSecondary}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          allowFontScaling={false}
                        />
                      </View>
                    </View>

                    <View style={styles.formActionRow}>
                      <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: '#f59e0b' }]}
                        onPress={handlePasswordReset}
                        disabled={passwordLoading}
                        activeOpacity={0.8}
                      >
                        {passwordLoading ? (
                          <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                        ) : (
                          <Ionicons name="key" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                        )}
                        <Text style={styles.saveBtnText} allowFontScaling={false}>
                          {passwordLoading ? (es ? 'Actualizando...' : 'Updating...') : (es ? 'Actualizar Contraseña' : 'Update Password')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* =========================================================================
                  CARD 2: PERMITS (MATCHING WEB SCREENSHOT)
                  ========================================================================= */}
              <View style={[styles.card, { marginTop: 14 }]}>
                <Text style={styles.cardHeaderTitle} allowFontScaling={false}>
                  {es ? 'PERMISOS' : 'PERMITS'}
                </Text>

                {/* REGISTERED VEHICLES */}
                <View style={styles.permitFieldGroup}>
                  <Text style={styles.permitLabel} allowFontScaling={false}>
                    {es ? 'VEHÍCULOS REGISTRADOS' : 'REGISTERED VEHICLES'}
                  </Text>
                  {activeTab === 'edit' ? (
                    <TextInput
                      style={styles.permitInput}
                      value={vehicles}
                      onChangeText={setVehicles}
                      placeholder="e.g. Toyota Camry (2022)"
                      placeholderTextColor={colors.textSecondary}
                      allowFontScaling={false}
                    />
                  ) : (
                    <View style={styles.permitDisplayBox}>
                      <Ionicons name="car-outline" size={16} color="#38bdf8" style={{ marginRight: 8 }} />
                      <Text style={styles.permitDisplayText} allowFontScaling={false}>
                        {vehicles || 'Toyota Camry (2022)'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* REGISTERED PETS */}
                <View style={[styles.permitFieldGroup, { marginTop: 12 }]}>
                  <Text style={styles.permitLabel} allowFontScaling={false}>
                    {es ? 'MASCOTAS REGISTRADAS' : 'REGISTERED PETS'}
                  </Text>
                  {activeTab === 'edit' ? (
                    <TextInput
                      style={styles.permitInput}
                      value={pets}
                      onChangeText={setPets}
                      placeholder="e.g. Golden Retriever (Dog)"
                      placeholderTextColor={colors.textSecondary}
                      allowFontScaling={false}
                    />
                  ) : (
                    <View style={styles.permitDisplayBox}>
                      <Ionicons name="paw-outline" size={16} color="#10b981" style={{ marginRight: 8 }} />
                      <Text style={styles.permitDisplayText} allowFontScaling={false}>
                        {pets || 'Golden Retriever (Dog)'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* PREFERRED LANGUAGE */}
                <View style={[styles.permitFieldGroup, { marginTop: 12 }]}>
                  <Text style={styles.permitLabel} allowFontScaling={false}>
                    {es ? 'IDIOMA PREFERIDO' : 'PREFERRED LANGUAGE'}
                  </Text>
                  {activeTab === 'edit' ? (
                    <TextInput
                      style={styles.permitInput}
                      value={preferredLanguage}
                      onChangeText={setPreferredLanguage}
                      placeholder="e.g. English (US)"
                      placeholderTextColor={colors.textSecondary}
                      allowFontScaling={false}
                    />
                  ) : (
                    <View style={styles.permitDisplayBox}>
                      <Ionicons name="globe-outline" size={16} color="#a855f7" style={{ marginRight: 8 }} />
                      <Text style={styles.permitDisplayText} allowFontScaling={false}>
                        {preferredLanguage || 'English (US)'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Extra Security & Residence Details Card */}
              <View style={[styles.card, { marginTop: 14 }]}>
                <Text style={styles.cardHeaderTitle} allowFontScaling={false}>
                  {es ? 'RESIDENCIA Y EMERGENCIAS' : 'RESIDENCE & EMERGENCY NOTICES'}
                </Text>

                <View style={styles.residenceRow}>
                  <View style={styles.residenceItem}>
                    <Text style={styles.residenceItemLabel} allowFontScaling={false}>
                      {es ? 'UNIDAD ASIGNADA' : 'ASSIGNED UNIT'}
                    </Text>
                    <Text style={styles.residenceItemValue} allowFontScaling={false}>
                      {unitNumber}
                    </Text>
                  </View>

                  <View style={styles.residenceItem}>
                    <Text style={styles.residenceItemLabel} allowFontScaling={false}>
                      {es ? 'CONTACTO DE EMERGENCIA' : 'EMERGENCY CONTACT'}
                    </Text>
                    <Text style={[styles.residenceItemValue, { color: '#10b981' }]} allowFontScaling={false}>
                      {emergencyContact}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 36,
    },
    successBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.35)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
    },
    successBannerText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#10b981',
      flex: 1,
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
    card: {
      backgroundColor: colors.surface || colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.18)',
      padding: 16,
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
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder || 'rgba(148, 163, 184, 0.12)',
      paddingBottom: 10,
      marginBottom: 14,
    },
    cardHeaderTitle: {
      fontSize: 12.5,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    actionButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(2, 132, 199, 0.35)',
      backgroundColor: 'rgba(2, 132, 199, 0.08)',
    },
    editBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#0284c7',
    },
    resetPassBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.35)',
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
    },
    resetPassBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#f59e0b',
    },
    cancelActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.3)',
    },
    cancelActionBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    detailsGrid: {
      paddingVertical: 4,
    },
    gridRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    gridCol: {
      flex: 1,
    },
    gridLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 3,
    },
    gridValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    emailLockedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    lockedPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    lockedPillText: {
      fontSize: 9.5,
      fontWeight: '700',
      color: '#f59e0b',
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    // Form Inputs
    formContainer: {
      paddingTop: 4,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    inputLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    textInput: {
      height: 40,
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : '#f8fafc',
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.25)',
      borderRadius: 8,
      paddingHorizontal: 10,
      fontSize: 13,
      color: colors.textPrimary,
    },
    disabledInput: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      opacity: 0.7,
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#e2e8f0',
    },
    disabledInputText: {
      fontSize: 12.5,
      fontWeight: '600',
      flex: 1,
      marginRight: 6,
    },
    formActionRow: {
      marginTop: 14,
      alignItems: 'flex-start',
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#0284c7',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    saveBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    alertBox: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 12,
    },
    alertError: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    alertSuccess: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    alertText: {
      fontSize: 12,
      fontWeight: '700',
      flex: 1,
    },
    // Permits Card
    permitFieldGroup: {
      marginTop: 10,
    },
    permitLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    permitDisplayBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.18)',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    permitDisplayText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    permitInput: {
      height: 42,
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : '#f8fafc',
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.25)',
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 13,
      color: colors.textPrimary,
    },
    // Residence & Emergency Card
    residenceRow: {
      flexDirection: 'row',
      marginTop: 8,
      gap: 12,
    },
    residenceItem: {
      flex: 1,
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(148, 163, 184, 0.15)',
      borderRadius: 10,
      padding: 10,
    },
    residenceItemLabel: {
      fontSize: 9.5,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    residenceItemValue: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.textPrimary,
    },
  });

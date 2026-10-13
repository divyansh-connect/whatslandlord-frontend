import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors, theme } from '../theme';

export const TenantHeader = ({ user, onDrawerOpen, onNotifications, onProfile }) => {
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);
  
  const handlePress = (callback) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (callback) callback();
  };

  const initial = user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'T';

  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftSection}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => handlePress(onDrawerOpen)}
          activeOpacity={0.7}
        >
          <Ionicons name="menu-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.brandTitle} allowFontScaling={false}>
            Tenant Portal
          </Text>
          <Text style={styles.subTitle} allowFontScaling={false}>
            Resident Home
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {/* Notifications Icon with Badge */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => handlePress(onNotifications)}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          <View style={styles.notificationDot}>
            <Text style={styles.dotText} allowFontScaling={false}>3</Text>
          </View>
        </TouchableOpacity>

        {/* Profile Avatar Badge */}
        <TouchableOpacity
          style={styles.profileAvatar}
          onPress={() => handlePress(onProfile)}
          activeOpacity={0.7}
        >
          <Text style={styles.avatarText} allowFontScaling={false}>
            {initial.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  headerContainer: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    ...theme.shadows.sm,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconBtn: {
    padding: theme.spacing.xs,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'column',
  },
  brandTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  notificationDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dotText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  profileAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
  },
  avatarText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '800',
  },
});

export default TenantHeader;

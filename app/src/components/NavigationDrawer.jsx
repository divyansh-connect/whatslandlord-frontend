import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  LayoutAnimation,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { useThemeColors } from '../theme';

export const NavigationDrawer = ({ visible, onClose, activeScreen, activeTab, onSelectScreen }) => {
  const { user, logout } = useAuthStore();
  const { language } = useThemeStore();
  const { colors, isDarkMode } = useThemeColors();
  const styles = getStyles(colors, isDarkMode);

  // Submenu accordion state
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleSubmenu = (menuId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const roleLower = String(user?.role || '').toLowerCase();
  const isSuperAdmin = roleLower.includes('super');
  const isCollectionManager = roleLower.includes('collection');
  const isOwner = roleLower.includes('owner');
  const isTenant = roleLower.includes('tenant') || roleLower.includes('resident');
  const isStaff = roleLower.includes('staff') || roleLower.includes('vendor');

  // DOORLOOP-STYLE SPECIFICATION (Exact Photo 3 Structure)
  const managerMenus = [
    {
      id: 'dashboard',
      title: 'Overview',
      icon: 'home-outline',
      screen: 'dashboard',
    },
    {
      id: 'ai',
      title: 'AI Assistant',
      icon: 'sparkles-outline',
      screen: 'ai',
      badge: 'PRO',
    },
    {
      id: 'properties',
      title: 'Properties',
      icon: 'business-outline',
      screen: 'properties',
      submenus: [
        { id: 'prop-list', title: 'Properties', screen: 'properties', tab: 'properties' },
        { id: 'prop-units', title: 'Units', screen: 'properties', tab: 'units' },
        { id: 'prop-drafts', title: 'Drafts', screen: 'properties', tab: 'drafts' },
      ],
    },
    {
      id: 'tenants',
      title: 'Tenants',
      icon: 'people-outline',
      screen: 'tenants',
    },
    {
      id: 'owners',
      title: 'Owners',
      icon: 'person-circle-outline',
      screen: 'owners',
    },
    {
      id: 'leasing',
      title: 'Leasing',
      icon: 'document-text-outline',
      screen: 'leads',
      submenus: [
        { id: 'lease-leads', title: 'Leads & Inquiries', screen: 'leads', tab: 'leads' },
        { id: 'lease-apps', title: 'Applications', screen: 'leads', tab: 'applications' },
        { id: 'lease-screen', title: 'Tenant Screening', screen: 'leads', tab: 'screening' },
        { id: 'lease-list', title: 'Active Leases', screen: 'leads', tab: 'leases' },
        { id: 'lease-renew', title: 'Renewals', screen: 'leads', tab: 'renewals' },
        { id: 'lease-movein', title: 'Move-In Checklist', screen: 'leads', tab: 'movein' },
        { id: 'lease-moveout', title: 'Move-Out', screen: 'leads', tab: 'moveout' },
        { id: 'lease-temp', title: 'Inspection Templates', screen: 'inspection-templates' },
      ],
    },
    {
      id: 'maintenance',
      title: 'Maintenance',
      icon: 'hammer-outline',
      screen: 'maintenance',
      submenus: [
        { id: 'maint-dash', title: 'Overview', screen: 'maintenance', tab: 'dashboard' },
        { id: 'maint-req', title: 'Service Requests', screen: 'maintenance', tab: 'requests' },
        { id: 'maint-wo', title: 'Work Orders', screen: 'maintenance', tab: 'work_orders' },
        { id: 'maint-viol', title: 'Violations', screen: 'maintenance', tab: 'violations' },
        { id: 'maint-vend', title: 'Maintenance Staff', screen: 'maintenance', tab: 'staff' },
      ],
    },
    {
      id: 'accounting',
      title: 'Accounting',
      icon: 'calculator-outline',
      screen: 'accounting',
      submenus: [
        { id: 'acc-dash', title: 'Cash Flow Dashboard', screen: 'accounting', tab: 'dashboard' },
        { id: 'acc-coa', title: 'Chart of Accounts', screen: 'accounting', tab: 'coa' },
        { id: 'acc-inc', title: 'Transactions (Income)', screen: 'accounting', tab: 'income' },
        { id: 'acc-exp', title: 'Expenses', screen: 'accounting', tab: 'expenses' },
      ],
    },
    {
      id: 'rent',
      title: 'Rent & Payments',
      icon: 'card-outline',
      screen: 'rent',
      submenus: [
        { id: 'rent-pay', title: 'Received Payments', screen: 'rent', tab: 'payments' },
        { id: 'rent-inv', title: 'Invoices', screen: 'rent', tab: 'invoices' },
        { id: 'rent-ledg', title: 'Rent Ledger', screen: 'rent', tab: 'ledger' },
      ],
    },
    {
      id: 'communication',
      title: 'Communications',
      icon: 'chatbubble-ellipses-outline',
      screen: 'communication',
    },
    {
      id: 'documents',
      title: 'Documents',
      icon: 'folder-outline',
      screen: 'documents',
    },
    {
      id: 'restore-bin',
      title: 'Restore Bin',
      icon: 'refresh-circle-outline',
      screen: 'restore-bin',
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: 'bar-chart-outline',
      screen: 'reports',
    },
  ];

  // Specific roles fallback
  let currentRoleMenus = managerMenus;
  if (isSuperAdmin) {
    currentRoleMenus = [
      { id: 'dashboard', title: 'Overview', icon: 'home-outline', screen: 'dashboard' },
      { id: 'companies', title: 'Companies', icon: 'business-outline', screen: 'companies' },
      { id: 'subscriptions', title: 'Subscriptions', icon: 'card-outline', screen: 'subscriptions' },
      { id: 'platform-users', title: 'Platform Users', icon: 'people-outline', screen: 'platform-users' },
      { id: 'properties', title: 'Properties', icon: 'home-outline', screen: 'properties' },
      { id: 'maintenance', title: 'Maintenance', icon: 'checkbox-outline', screen: 'maintenance' },
      { id: 'restore-bin', title: 'Restore Bin', icon: 'refresh-circle-outline', screen: 'restore-bin' },
      { id: 'admin', title: 'Platform Settings', icon: 'settings-outline', screen: 'platform-settings' },
    ];
  } else if (isOwner) {
    currentRoleMenus = [
      { id: 'dashboard', title: 'Overview', icon: 'home-outline', screen: 'dashboard' },
      { id: 'properties', title: 'Properties', icon: 'business-outline', screen: 'properties' },
      { id: 'financials', title: 'Financials', icon: 'card-outline', screen: 'financials' },
      { id: 'statements', title: 'Statements', icon: 'document-text-outline', screen: 'statements' },
      { id: 'distributions', title: 'Distributions', icon: 'cash-outline', screen: 'distributions' },
      { id: 'maintenance', title: 'Maintenance', icon: 'checkbox-outline', screen: 'maintenance' },
      { id: 'documents', title: 'Documents', icon: 'folder-outline', screen: 'documents' },
      { id: 'reports', title: 'Reports', icon: 'bar-chart-outline', screen: 'reports' },
      { id: 'communication', title: 'Communications', icon: 'chatbubble-ellipses-outline', screen: 'communication' },
    ];
  } else if (isTenant) {
    currentRoleMenus = [
      { id: 'dashboard', title: 'Overview', icon: 'home-outline', screen: 'dashboard' },
      { id: 'lease', title: 'My Lease', icon: 'document-text-outline', screen: 'lease' },
      { id: 'rent', title: 'Rent & Payments', icon: 'card-outline', screen: 'rent' },
      { id: 'maintenance', title: 'Maintenance Requests', icon: 'checkbox-outline', screen: 'maintenance' },
      { id: 'documents', title: 'Documents', icon: 'folder-outline', screen: 'documents' },
      { id: 'communication', title: 'Messages', icon: 'chatbubble-ellipses-outline', screen: 'communication' },
      { id: 'ai', title: 'AI Assistant', icon: 'sparkles-outline', screen: 'ai', badge: 'AI' },
    ];
  } else if (isStaff) {
    currentRoleMenus = [
      { id: 'dashboard', title: 'Overview', icon: 'home-outline', screen: 'dashboard' },
      { id: 'mytasks', title: 'My Assigned Tasks', icon: 'checkbox-outline', screen: 'mytasks' },
      { id: 'communication', title: 'Messages', icon: 'chatbubble-ellipses-outline', screen: 'communication' },
      { id: 'history', title: 'Task History', icon: 'time-outline', screen: 'history' },
      { id: 'profile', title: 'Profile', icon: 'person-outline', screen: 'profile' },
    ];
  }

  const handleSelect = (screenId, tabId) => {
    onSelectScreen(screenId, tabId);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.drawerContainer}>
          <View style={styles.safeArea}>
            {/* Header User Card (Tap to view Profile) */}
            <View style={styles.userHeader}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                onPress={() => handleSelect('profile')}
                activeOpacity={0.8}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText} allowFontScaling={false}>
                    {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'W'}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1} allowFontScaling={false}>
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Property Manager'}
                  </Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText} allowFontScaling={false}>
                      {user?.role || 'Property Manager'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Scrollable Navigation Menu (Exact Photo 3 Clean Text Lines) */}
            <ScrollView
              style={styles.menuList}
              contentContainerStyle={styles.menuContentContainer}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {currentRoleMenus.map((item, index) => {
                const hasSub = Array.isArray(item.submenus) && item.submenus.length > 0;
                const isExpanded = expandedMenus[item.id] || false;
                const isCurrentScreen = activeScreen === item.screen;

                return (
                  <View key={`${item.id}-${index}`} style={styles.menuItemWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.menuItem,
                        isCurrentScreen && !hasSub && styles.menuItemActive,
                      ]}
                      onPress={() => {
                        handleSelect(item.screen, item.tab || null);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.menuItemLeft}>
                        <Ionicons
                          name={item.icon}
                          size={19}
                          color={isCurrentScreen ? '#38bdf8' : colors.textPrimary}
                          style={{ marginRight: 12 }}
                        />
                        <Text
                          style={[
                            styles.menuItemText,
                            isCurrentScreen && styles.menuItemTextActive,
                          ]}
                          numberOfLines={1}
                          allowFontScaling={false}
                        >
                          {item.title}
                        </Text>
                      </View>

                      {item.badge ? (
                        <View style={styles.proBadge}>
                          <Ionicons name="sparkles" size={10} color="#f59e0b" style={{ marginRight: 3 }} />
                          <Text style={styles.proBadgeText} allowFontScaling={false}>{item.badge}</Text>
                        </View>
                      ) : null}

                      {hasSub && (
                        <TouchableOpacity
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          onPress={() => toggleSubmenu(item.id)}
                          style={{ padding: 4 }}
                        >
                          <Ionicons
                            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={16}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>

                    {/* Submenus if expanded */}
                    {hasSub && isExpanded && (
                      <View style={styles.submenuContainer}>
                        {item.submenus.map((sub) => {
                          const isSubActive =
                            activeScreen === sub.screen && (!sub.tab || activeTab === sub.tab);
                          return (
                            <TouchableOpacity
                              key={sub.id}
                              style={[
                                styles.submenuItem,
                                isSubActive && styles.submenuItemActive,
                              ]}
                              onPress={() => handleSelect(sub.screen, sub.tab)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.subBullet, isSubActive && styles.subBulletActive]} />
                              <Text
                                style={[
                                  styles.submenuText,
                                  isSubActive && styles.submenuTextActive,
                                ]}
                                numberOfLines={1}
                                allowFontScaling={false}
                              >
                                {sub.title}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}

              <View style={[styles.divider, { marginVertical: 10 }]} />

              {/* Bottom Standard Menu Links */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleSelect('profile')}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name="person-outline" size={19} color={colors.textPrimary} style={{ marginRight: 12 }} />
                  <Text style={styles.menuItemText} allowFontScaling={false}>Profile</Text>
                </View>
              </TouchableOpacity>

              {!isTenant && !isOwner && !isStaff && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleSelect('company-settings')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="settings-outline" size={19} color={colors.textPrimary} style={{ marginRight: 12 }} />
                    <Text style={styles.menuItemText} allowFontScaling={false}>Settings</Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleSelect('notifications')}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name="notifications-outline" size={19} color={colors.textPrimary} style={{ marginRight: 12 }} />
                  <Text style={styles.menuItemText} allowFontScaling={false}>Notifications</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                  onClose();
                  logout();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={18} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={styles.logoutText} allowFontScaling={false}>Log Out</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    drawerContainer: {
      width: '82%',
      maxWidth: 320,
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      height: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 4, height: 0 },
      shadowOpacity: isDarkMode ? 0.5 : 0.15,
      shadowRadius: 12,
      elevation: 16,
    },
    safeArea: {
      flex: 1,
      paddingTop: Platform.OS === 'android' ? 40 : 54,
    },
    userHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 14,
    },
    avatarCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#2563eb',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: {
      color: '#ffffff',
      fontSize: 17,
      fontWeight: '800',
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      color: colors.textPrimary,
      fontSize: 14.5,
      fontWeight: '800',
    },
    roleBadge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 5,
      marginTop: 3,
    },
    roleBadgeText: {
      color: '#38bdf8',
      fontSize: 10,
      fontWeight: '700',
    },
    closeBtn: {
      padding: 6,
      borderRadius: 20,
    },
    divider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginHorizontal: 16,
    },
    menuList: {
      flex: 1,
    },
    menuContentContainer: {
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 40,
    },
    menuItemWrapper: {
      marginBottom: 2,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: 'transparent',
    },
    menuItemActive: {
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuItemText: {
      color: colors.textPrimary,
      fontSize: 13.5,
      fontWeight: '600',
    },
    menuItemTextActive: {
      color: '#38bdf8',
      fontWeight: '800',
    },
    proBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.3)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      marginRight: 6,
    },
    proBadgeText: {
      color: '#f59e0b',
      fontSize: 9.5,
      fontWeight: '800',
    },
    submenuContainer: {
      paddingLeft: 22,
      paddingRight: 6,
      paddingVertical: 2,
      borderLeftWidth: 1.5,
      borderLeftColor: isDarkMode ? '#334155' : '#cbd5e1',
      marginLeft: 22,
      marginVertical: 2,
    },
    submenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 6,
      marginBottom: 1,
    },
    submenuItemActive: {
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
    },
    subBullet: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.textMuted,
      marginRight: 8,
    },
    subBulletActive: {
      backgroundColor: '#38bdf8',
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    submenuText: {
      color: colors.textSecondary,
      fontSize: 12.5,
      fontWeight: '550',
    },
    submenuTextActive: {
      color: '#38bdf8',
      fontWeight: '750',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.25)',
      marginTop: 14,
      marginHorizontal: 4,
    },
    logoutText: {
      color: '#ef4444',
      fontSize: 13,
      fontWeight: '800',
    },
  });

export default NavigationDrawer;

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';

// Safe storage wrapper to prevent native module crashes in Expo Go
let localCache = {};
const safeStorage = {
  getItem: async (key) => {
    try {
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        const val = await AsyncStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      console.log('AsyncStorage.getItem fallback:', e.message);
    }
    return localCache[key] || null;
  },
  setItem: async (key, value) => {
    localCache[key] = value;
    try {
      if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
        await AsyncStorage.setItem(key, value);
      }
    } catch (e) {
      console.log('AsyncStorage.setItem fallback:', e.message);
    }
  },
  removeItem: async (key) => {
    delete localCache[key];
    try {
      if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
        await AsyncStorage.removeItem(key);
      }
    } catch (e) {
      console.log('AsyncStorage.removeItem fallback:', e.message);
    }
  }
};

// --- Theme & Language Store ---
export const useThemeStore = create((set) => ({
  theme: 'dark',
  language: 'en', // 'en' | 'es'
  toggleTheme: async () => {
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      safeStorage.setItem('theme', newTheme);
      return { theme: newTheme };
    });
  },
  setTheme: async (theme) => {
    await safeStorage.setItem('theme', theme);
    set({ theme });
  },
  setLanguage: async (language) => {
    await safeStorage.setItem('language', language);
    set({ language });
  },
  loadTheme: async () => {
    const savedTheme = await safeStorage.getItem('theme');
    const savedLang = await safeStorage.getItem('language');
    set({
      theme: (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark',
      language: (savedLang === 'es' || savedLang === 'en') ? savedLang : 'en',
    });
  },
}));

// Role Mapper based on Email / RoleName matching project DB user credentials
const getRoleFromEmail = (email = '') => {
  const lower = email.toLowerCase();
  if (lower.includes('companyb') || lower.includes('manager')) return 'Property Manager';
  if (lower.includes('person1b') || lower.includes('tenant')) return 'Tenant';
  if (lower.includes('owner1b') || lower.includes('owner')) return 'Owner';
  if (lower.includes('vendor1b') || lower.includes('vendor') || lower.includes('maintenance')) return 'Maintenance Staff';
  if (lower.includes('admin')) return 'Super Admin';
  if (lower.includes('collection')) return 'Collection Manager';
  return 'Property Manager';
};

// --- Auth Store ---
export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoaded: false,
  initializeAuth: async () => {
    const userStr = await safeStorage.getItem('user');
    if (userStr) {
      try {
        set({ user: JSON.parse(userStr), isAuthenticated: true, isLoaded: true });
      } catch {
        set({ user: null, isAuthenticated: false, isLoaded: true });
      }
    } else {
      set({ user: null, isAuthenticated: false, isLoaded: true });
    }
  },
  login: async (email, password) => {
    try {
      const resData = await apiClient.post(
        '/auth/login',
        { email, password: password || 'admin123' },
        () => get().logout(),
        () => get().refreshAccessToken()
      );

      if (resData && resData.data && resData.data.user) {
        const apiUser = resData.data.user;
        const token = resData.data.accessToken;
        const refreshToken = resData.data.refreshToken;

        const loggedInUser = {
          id: apiUser.id,
          firstName: apiUser.firstName || 'User',
          lastName: apiUser.lastName || '',
          name: `${apiUser.firstName || ''} ${apiUser.lastName || ''}`.trim() || 'User',
          email: apiUser.email,
          role: apiUser.roleName,
          companyName: apiUser.companyName || apiUser.company?.name || 'Divine Properties',
          token: token,
          refreshToken: refreshToken,
        };

        await safeStorage.setItem('user', JSON.stringify(loggedInUser));
        set({ user: loggedInUser, isAuthenticated: true });
        return true;
      }
      return false;
    } catch (e) {
      console.log('Backend login failed:', e.message);
      return false;
    }
  },
  logout: async () => {
    await safeStorage.removeItem('user');
    set({ user: null, isAuthenticated: false });
  },
  refreshAccessToken: async () => {
    try {
      const userStr = await safeStorage.getItem('user');
      if (!userStr) return false;
      const userData = JSON.parse(userStr);
      if (!userData.refreshToken) return false;

      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://doorloop-backend-production-5d5d.up.railway.app/api/v1';

      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: userData.refreshToken }),
      });

      if (!response.ok) return false;

      const resData = await response.json();
      const newToken = resData.data.accessToken;

      const updatedUser = { ...userData, token: newToken };
      await safeStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
      return true;
    } catch {
      return false;
    }
  },
}));

// --- Notifications Store ---
export const useNotificationStore = create((set) => ({
  notifications: [
    { id: 'notif-1', title: 'New Maintenance Request', message: 'AC Not Cooling in Unit 301 (Sunset Villas)', time: '10m ago', read: false, type: 'warning', role: 'Property Manager', targetId: 'sr-1' },
    { id: 'notif-2', title: 'Payment Received', message: 'John Doe paid $1,850 rent for Unit 101', time: '1h ago', read: false, type: 'success', role: 'Property Manager', targetId: 'pay-8001' },
    { id: 'notif-3', title: 'Lease Expiring Soon', message: 'Jane Smith (Unit 102) lease expires in 12 days', time: '1d ago', read: true, type: 'info', role: 'Property Manager', targetId: 'lease-1' },
    { id: 'notif-13', title: 'New Company Registered', message: 'Acme Corp registered on the platform', time: '10m ago', read: false, type: 'success', role: 'Super Admin' },
    { id: 'notif-14', title: 'Subscription Renewed', message: 'Elite Properties renewed their Enterprise Plan', time: '1h ago', read: false, type: 'success', role: 'Super Admin' },
    { id: 'notif-4', title: 'Rent Payment Due', message: 'Your rent of $1,850 for Unit 301 is due in 3 days', time: '2h ago', read: false, type: 'warning', role: 'Tenant', targetId: 'tenant-pay-1' },
    { id: 'notif-5', title: 'Maintenance Update', message: 'AC Maintenance scheduled for tomorrow at 10:00 AM', time: '5h ago', read: false, type: 'info', role: 'Tenant', targetId: 'tenant-sr-1' },
    { id: 'notif-7', title: 'Monthly Distribution Ready', message: 'Owner payout of $4,500 has been sent to your account', time: '3h ago', read: false, type: 'success', role: 'Owner' }
  ],
  addNotification: (n) => set((state) => ({
    notifications: [
      {
        ...n,
        id: `notif-${Date.now()}`,
        time: 'Just now',
        read: false,
        role: n.role || 'Property Manager',
        targetId: n.targetId,
      },
      ...state.notifications
    ]
  })),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n)
  })),
  markAllAsRead: (role) => set((state) => ({
    notifications: state.notifications.map((n) => (role ? n.role === role : true) ? { ...n, read: true } : n)
  })),
  clearAll: (role) => set((state) => ({
    notifications: state.notifications.filter((n) => role ? n.role !== role : false)
  })),
}));

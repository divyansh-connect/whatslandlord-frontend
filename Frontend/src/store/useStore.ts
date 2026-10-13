import { create } from 'zustand';
import { apiClient } from '../api/client';

// --- Theme Store ---
interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const saved = localStorage.getItem('theme') as 'light' | 'dark';
  let initialTheme: 'light' | 'dark' = 'light';
  if (saved) {
    initialTheme = saved;
  } else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    initialTheme = 'dark';
  }
  return {
    theme: initialTheme,
    toggleTheme: () => set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: newTheme };
    }),
    setTheme: (theme) => set(() => {
      localStorage.setItem('theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme };
    }),
  };
});

// Initialize theme on load
if (
  localStorage.getItem('theme') === 'dark' ||
  (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}


// --- Auth Store ---
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId?: string;
  companyName?: string;
  planName?: string;
  planType?: string;
  isTrialExpired?: boolean;
  isInGracePeriod?: boolean;
  isAccessBlocked?: boolean;
  graceEndsAt?: string;
  planEndsAt?: string;
  avatarUrl?: string;
  token?: string;
  refreshToken?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  updateUser: (updatedData: Partial<User>) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(sessionStorage.getItem('user') || 'null'),
  isAuthenticated: !!sessionStorage.getItem('user'),
  login: async (email: string, password?: string) => {
    const resData = await apiClient.post<any>('/auth/login', { email, password: password || 'admin123' });

    const apiUser = resData.data.user;
    const token = resData.data.accessToken;
    const refreshToken = resData.data.refreshToken;

    const loggedInUser: User = {
      id: apiUser.id,
      name: `${apiUser.firstName} ${apiUser.lastName}`,
      email: apiUser.email,
      role: apiUser.roleName,
      companyId: apiUser.companyId,
      companyName: apiUser.companyName,
      planName: apiUser.planName,
      planType: apiUser.planType,
      isTrialExpired: apiUser.isTrialExpired,
      isInGracePeriod: apiUser.isInGracePeriod,
      isAccessBlocked: apiUser.isAccessBlocked,
      graceEndsAt: apiUser.graceEndsAt,
      planEndsAt: apiUser.planEndsAt,
      token: token,
      refreshToken: refreshToken,
    };

    sessionStorage.setItem('user', JSON.stringify(loggedInUser));
    set({ user: loggedInUser, isAuthenticated: true });
    return true;
  },
  updateUser: (updatedData: Partial<User>) => set((state) => {
    if (!state.user) return state;
    const newUser = { ...state.user, ...updatedData };
    sessionStorage.setItem('user', JSON.stringify(newUser));
    return { user: newUser };
  }),
  logout: () => {
    sessionStorage.removeItem('user');
    set({ user: null, isAuthenticated: false });
  },
  refreshAccessToken: async () => {
    try {
      const userStr = sessionStorage.getItem('user');
      if (!userStr) return false;
      const userData = JSON.parse(userStr);
      if (!userData.refreshToken) return false;

      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const baseUrl = import.meta.env.VITE_API_URL || `http://${host}:5000/api/v1`;
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: userData.refreshToken }),
      });

      if (!response.ok) return false;

      const resData = await response.json();
      const newToken = resData.data.accessToken;

      const updatedUser = { ...userData, token: newToken };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
      return true;
    } catch {
      return false;
    }
  },
}));


// --- Notifications Store ---
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'warning' | 'success';
  role: string;
  targetId?: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  setNotifications: (notifications: NotificationItem[]) => void;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'time' | 'read' | 'role'> & { role?: string; targetId?: string }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (role?: string) => void;
  clearAll: (role?: string) => void;
  deleteNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
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
  markAsRead: (id) => {
    try {
      const raw = localStorage.getItem('whatslandlord_ai_rent_notices');
      if (raw) {
        const list = JSON.parse(raw);
        const item = list.find((n: any) => n.id === id);
        if (item) {
          item.read = true;
          localStorage.setItem('whatslandlord_ai_rent_notices', JSON.stringify(list));
          window.dispatchEvent(new Event('storage'));
        }
      }
    } catch {}
    apiClient.put(`/notifications/${id}/read`).catch(() => {});
    set((state) => ({
      notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n)
    }));
  },
  markAllAsRead: (role) => {
    try {
      const raw = localStorage.getItem('whatslandlord_ai_rent_notices');
      if (raw) {
        const list = JSON.parse(raw);
        list.forEach((n: any) => { n.read = true; });
        localStorage.setItem('whatslandlord_ai_rent_notices', JSON.stringify(list));
        window.dispatchEvent(new Event('storage'));
      }
    } catch {}
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    apiClient.put(`/notifications/read-all${query}`).catch(() => {});
    set((state) => ({
      notifications: state.notifications.map((n) => {
        if (!role) return { ...n, read: true };
        return n.role === role ? { ...n, read: true } : n;
      })
    }));
  },
  clearAll: (role) => {
    try {
      localStorage.removeItem('whatslandlord_ai_rent_notices');
      window.dispatchEvent(new Event('storage'));
    } catch {}
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    apiClient.delete(`/notifications${query}`).catch(() => {});
    set((state) => ({
      notifications: role 
        ? state.notifications.filter((n) => !(n.role === role))
        : []
    }));
  },
  deleteNotification: (id) => {
    apiClient.delete(`/notifications/${id}`).catch(() => {});
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  },
}));

// --- Error Modal Store ---
interface ErrorState {
  isOpen: boolean;
  title: string;
  message: string;
  showError: (title: string, message: string) => void;
  closeError: () => void;
}

export const useErrorStore = create<ErrorState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  showError: (title, message) => set({ isOpen: true, title, message }),
  closeError: () => set({ isOpen: false, title: '', message: '' }),
}));

// --- Company Profile Store ---
interface CompanyState {
  companyName: string;
  companyAddress: string;
  timezone: string;
  currency: string;
  setCompanyProfile: (profile: Partial<{ companyName: string; companyAddress: string; timezone: string; currency: string }>) => void;
}

export const useCompanyStore = create<CompanyState>((set) => ({
  companyName: localStorage.getItem('company_name') || 'Divine Properties',
  companyAddress: localStorage.getItem('company_address') || '100 Pine Street, San Francisco, CA',
  timezone: localStorage.getItem('company_timezone') || 'EST',
  currency: localStorage.getItem('company_currency') || 'USD',
  setCompanyProfile: (profile) => set((state) => {
    if (profile.companyName !== undefined) localStorage.setItem('company_name', profile.companyName);
    if (profile.companyAddress !== undefined) localStorage.setItem('company_address', profile.companyAddress);
    if (profile.timezone !== undefined) localStorage.setItem('company_timezone', profile.timezone);
    if (profile.currency !== undefined) localStorage.setItem('company_currency', profile.currency);
    return { ...state, ...profile };
  }),
}));

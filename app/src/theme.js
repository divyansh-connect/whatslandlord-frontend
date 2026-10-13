import { useThemeStore } from './store/useStore';

export const useThemeColors = () => {
  const { theme } = useThemeStore();
  const isDarkMode = theme === 'dark';

  const colors = {
    // Brand
    primary: '#38bdf8', // Vibrant Cyan/Sky blue
    primaryDark: '#0284c7',
    primaryLight: '#7dd3fc',
    secondary: '#818cf8', // Indigo/Purple accent
    accent: '#f59e0b', // Amber/Orange accent

    // Base layout
    background: isDarkMode ? '#0f172a' : '#f8fafc',
    surface: isDarkMode ? '#1e293b' : '#ffffff',
    card: isDarkMode ? '#1e293b' : '#ffffff',
    cardBorder: isDarkMode ? '#334155' : '#e2e8f0',
    divider: isDarkMode ? '#334155' : '#cbd5e1',

    // Feedback
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#38bdf8',

    // Typography
    textPrimary: isDarkMode ? '#f8fafc' : '#0f172a',
    textSecondary: isDarkMode ? '#94a3b8' : '#475569',
    textMuted: isDarkMode ? '#64748b' : '#94a3b8',

    // UI elements
    icon: isDarkMode ? '#cbd5e1' : '#475569',
    placeholder: isDarkMode ? '#64748b' : '#94a3b8',
    inputBackground: isDarkMode ? '#0f172a' : '#f1f5f9',
    inputBorder: isDarkMode ? '#334155' : '#cbd5e1',
    buttonPrimary: '#38bdf8',
    buttonSecondary: isDarkMode ? '#1e293b' : '#e2e8f0',

    // Navigation/Shell
    tabBar: isDarkMode ? '#1e293b' : '#ffffff',
    drawer: isDarkMode ? '#1e293b' : '#ffffff',
    header: isDarkMode ? '#1e293b' : '#ffffff',

    // Shared overlays / badges
    shadow: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.05)',
    overlay: isDarkMode ? 'rgba(15, 23, 42, 0.75)' : 'rgba(15, 23, 42, 0.45)',
    badge: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.1)',
    modalBackground: isDarkMode ? '#1e293b' : '#ffffff',
    statusBar: isDarkMode ? 'light' : 'dark',

    // Charts
    chartPrimary: '#10b981',
    chartSecondary: '#ef4444',
    chartGrid: isDarkMode ? '#334155' : '#cbd5e1',

    // Other UI utils
    loader: '#38bdf8',
    skeleton: isDarkMode ? '#334155' : '#cbd5e1',
    focusBorder: '#38bdf8',
    disabled: isDarkMode ? '#334155' : '#cbd5e1',
    white: '#ffffff',
    black: '#000000',
  };

  return {
    isDarkMode,
    colors,
  };
};

export const theme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999,
  },
  typography: {
    header: { fontSize: 22, fontWeight: '700', letterSpacing: 0.3 },
    title: { fontSize: 18, fontWeight: '700' },
    subtitle: { fontSize: 14, fontWeight: '600' },
    body: { fontSize: 14, fontWeight: '400' },
    caption: { fontSize: 12, fontWeight: '500' },
    small: { fontSize: 10, fontWeight: '600' },
  },
};

export default theme;

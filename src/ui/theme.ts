/**
 * Tema (claro/escuro) + tokens de espaçamento e tipografia.
 */
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/state/useSettingsStore';

export interface Palette {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  border: string;
  track: string;
  green: string;
  yellow: string;
  red: string;
  neutral: string;
  overlay: string;
}

const light: Palette = {
  bg: '#F4F7F5',
  card: '#FFFFFF',
  cardAlt: '#EEF3F0',
  text: '#12211B',
  textMuted: '#5C6B63',
  primary: '#0B7A4B',
  primaryText: '#FFFFFF',
  border: '#E1E8E4',
  track: '#E6ECE9',
  green: '#16A34A',
  yellow: '#D97706',
  red: '#DC2626',
  neutral: '#64748B',
  overlay: 'rgba(0,0,0,0.35)',
};

const dark: Palette = {
  bg: '#0C110F',
  card: '#151D19',
  cardAlt: '#1C2621',
  text: '#E7EFEA',
  textMuted: '#9AA8A0',
  primary: '#22C55E',
  primaryText: '#06130C',
  border: '#26332C',
  track: '#22302A',
  green: '#22C55E',
  yellow: '#F59E0B',
  red: '#F87171',
  neutral: '#94A3B8',
  overlay: 'rgba(0,0,0,0.55)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 34,
  display: 44,
} as const;

export interface Theme {
  colors: Palette;
  isDark: boolean;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
}

export function statusColor(colors: Palette, tone: 'green' | 'yellow' | 'red' | 'neutral'): string {
  return colors[tone];
}

/** Hook de tema, respeitando a preferência do usuário e o sistema. */
export function useTheme(): Theme {
  const pref = useSettingsStore((s) => s.theme);
  const system = useColorScheme();
  const isDark = pref === 'system' ? system === 'dark' : pref === 'dark';
  return {
    colors: isDark ? dark : light,
    isDark,
    spacing,
    radius,
    fontSize,
  };
}

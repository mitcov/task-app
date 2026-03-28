export type ThemeId = 'classic' | 'midnight' | 'sunset' | 'forest';

export interface Theme {
  id: ThemeId;
  name: string;
  emoji: string;
  dark: boolean;
  /** Hex colour used for the preview swatch */
  accentHex: string;
  bgHex: string;
  textHex: string;
}

export const THEMES: Theme[] = [
  {
    id: 'classic',
    name: 'Classic',
    emoji: '☁️',
    dark: false,
    accentHex: '#3b82f6',
    bgHex: '#f9fafb',
    textHex: '#111827',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    dark: true,
    accentHex: '#8b5cf6',
    bgHex: '#030712',
    textHex: '#f9fafb',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    dark: false,
    accentHex: '#f59e0b',
    bgHex: '#fffbeb',
    textHex: '#111827',
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌿',
    dark: false,
    accentHex: '#10b981',
    bgHex: '#f0fdf4',
    textHex: '#111827',
  },
];

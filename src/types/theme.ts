export type ThemeId = 'classic' | 'midnight' | 'sunset' | 'forest';

export interface Theme {
  id: ThemeId;
  name: string;
  emoji: string;
  dark: boolean;
  /** CSS font-family value matching what index.css sets via --font-body */
  fontFamily: string;
  /** Short font label shown in the swatch */
  fontLabel: string;
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontLabel: 'System',
    accentHex: '#3b82f6',
    bgHex: '#f9fafb',
    textHex: '#111827',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    dark: true,
    fontFamily: "'Space Grotesk', sans-serif",
    fontLabel: 'Space Grotesk',
    accentHex: '#8b5cf6',
    bgHex: '#030712',
    textHex: '#f9fafb',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    dark: false,
    fontFamily: "'Nunito', sans-serif",
    fontLabel: 'Nunito',
    accentHex: '#f59e0b',
    bgHex: '#fffbeb',
    textHex: '#111827',
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌿',
    dark: false,
    fontFamily: "'Lora', serif",
    fontLabel: 'Lora',
    accentHex: '#10b981',
    bgHex: '#f0fdf4',
    textHex: '#111827',
  },
];

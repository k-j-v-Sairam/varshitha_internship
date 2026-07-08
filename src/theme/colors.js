// src/theme/colors.js
// Single source of truth for the entire app's color system.

export const Colors = {
  // Brand
  primary: '#0D9488',       // Teal - premium, trustworthy
  primaryLight: '#CCFBF1',  // Light teal for backgrounds/highlights
  primaryDark: '#0F766E',   // Darker teal for active states or strong contrast
  primaryGradient: ['#0D9488', '#14B8A6'], // For linear gradients if needed

  // Semantic
  success: '#10B981',       // Emerald
  successLight: '#D1FAE5',
  
  warning: '#F59E0B',       // Amber
  warningLight: '#FEF3C7',
  
  danger: '#EF4444',        // Red
  dangerLight: '#FEE2E2',

  info: '#3B82F6',          // Blue
  infoLight: '#DBEAFE',

  // Surfaces & Backgrounds
  background: '#F8FAFC',    // Slate-50 - softer than pure white
  cardBg: '#FFFFFF',        // Pure white for cards to stand out against background
  surface: '#FFFFFF',       
  
  // Borders & Dividers
  border: '#E2E8F0',        // Slate-200
  inputBg: '#F1F5F9',       // Slate-100 - subtle input background

  // Text hierarchy
  textDark: '#0F172A',      // Slate-900 - almost black, better contrast
  textMedium: '#475569',    // Slate-600 - secondary text
  textLight: '#64748B',     // Slate-500 - tertiary/muted text
  textMuted: '#94A3B8',     // Slate-400 - placeholders

  white: '#FFFFFF',
  textWhite: '#FFFFFF',   // Alias for text on dark backgrounds
  black: '#000000',
  transparent: 'transparent',

  // Legacy aliases for backwards-compatibility across migrated screens
  error: '#EF4444',       // Alias for danger
  cardBackground: '#FFFFFF',  // Alias for cardBg

  // Staff management accent
  staffAccent: '#E11D48',   // Rose
};

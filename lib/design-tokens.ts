/**
 * Design tokens for Wheel of Founders
 * Centralized color palette and design system values
 */

export const colors = {
  navy: {
    DEFAULT: '#152B50',
    hover: '#1A3565',
  },
  coral: {
    DEFAULT: '#EF725C',
    hover: '#F28771',
    soft: '#FFF0EC',
  },
  amber: {
    DEFAULT: '#FBBF24',
    soft: '#FFFBEB',
  },
  emerald: {
    DEFAULT: '#22C55E',
    soft: '#ECFDF3',
  },
  neutral: {
    background: '#F9FAFB',
    card: '#FFFFFF',
    border: '#E5E7EB',
    text: {
      primary: '#111827',
      secondary: '#6B7280',
    },
  },
} as const

export const typography = {
  pageTitle: {
    fontSize: '32px',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  sectionHeading: {
    fontSize: '24px',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  subheading: {
    fontSize: '18px',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  body: {
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: 1.6,
  },
  bodySmall: {
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  caption: {
    fontSize: '13px',
    fontWeight: 400,
    lineHeight: 1.4,
  },
} as const

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
} as const

/** Bauhaus: no rounded corners - everything rectangular */
export const borderRadius = {
  sm: '0',
  md: '0',
  lg: '0',
  full: '9999px',
} as const

/** Navy border for Bauhaus cards/inputs */
export const borderColors = {
  navy: '#152B50',
  navyDark: '#0d1f3c',
} as const

import { createGlobalTheme } from '@vanilla-extract/css';

/**
 * Design tokens as CSS custom properties on :root.
 *
 * This is the "TMF tokens -> CSS variables" model from the RnD doc: authored in
 * typed TS (so the AI/devs get autocomplete + a golden-path catalog), compiled to
 * static CSS vars (zero runtime), and themeable/scopeable by overriding the vars.
 * Touch/size tokens carry the 48px tablet target.
 */
export const vars = createGlobalTheme(':root', {
  color: {
    bg: '#f2f4f7',
    surface: '#ffffff',
    surfaceAlt: '#fafbfc',
    border: '#e0e4ea',
    borderStrong: '#c4cbd5',
    text: '#1c2433',
    textMuted: '#6b7686',
    textLink: '#2f6fed',
    primary: '#e95c2b',
    primaryHover: '#d24e20',
    primaryText: '#ffffff',
    danger: '#d13438',
    dangerText: '#ffffff',
    focusRing: '#2f6fed',
    rowHover: '#f4f7fb',
    rowSelected: '#e8f0fe',
    headerBg: '#ffffff',
    diffPositive: '#1b7f3b',
    diffNegative: '#c0392b',
    editableBg: '#f0f6ff',
  },
  space: {
    none: '0',
    xxs: '2px',
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    pill: '999px',
  },
  font: {
    family:
      "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    sizeXs: '11px',
    sizeSm: '13px',
    sizeMd: '14px',
    sizeLg: '16px',
    sizeXl: '20px',
    weightNormal: '400',
    weightMedium: '500',
    weightBold: '600',
  },
  size: {
    touch: '48px', // tablet touch target
    rowHeight: '44px',
    headerHeight: '48px',
    control: '36px',
  },
  shadow: {
    sm: '0 1px 2px rgba(16, 24, 40, 0.06)',
    md: '0 4px 12px rgba(16, 24, 40, 0.12)',
    lg: '0 12px 32px rgba(16, 24, 40, 0.18)',
  },
  z: {
    sticky: '10',
    modal: '100',
  },
});

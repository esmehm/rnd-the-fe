import { style } from '@vanilla-extract/css';
import { vars } from '../styles/theme.css';

export const shell = style({
  display: 'grid',
  gridTemplateColumns: '56px 1fr',
  height: '100vh',
  overflow: 'hidden',
});

export const sidebar = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.space.xs,
  padding: `${vars.space.sm} 0`,
  background: vars.color.surface,
  borderRight: `1px solid ${vars.color.border}`,
});

export const logo = style({
  width: 36,
  height: 36,
  borderRadius: vars.radius.md,
  background: vars.color.primary,
  color: vars.color.primaryText,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: vars.font.weightBold,
  marginBottom: vars.space.sm,
});

export const navItem = style({
  width: 40,
  height: 40,
  borderRadius: vars.radius.md,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: vars.color.textMuted,
  fontSize: '18px',
  textDecoration: 'none',
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
  selectors: {
    '&:hover': { background: vars.color.surfaceAlt, color: vars.color.text },
    '&[data-active="true"]': { background: vars.color.editableBg, color: vars.color.primary },
    '&:focus-visible': { outline: `2px solid ${vars.color.focusRing}` },
  },
});

export const navSpacer = style({ flex: 1 });

export const main = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  minHeight: 0,
});

export const content = style({ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' });

export const footer = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.lg,
  padding: `0 ${vars.space.lg}`,
  height: 36,
  borderTop: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  fontSize: vars.font.sizeSm,
  color: vars.color.textMuted,
});

export const footerItem = style({ display: 'flex', alignItems: 'center', gap: vars.space.xs });

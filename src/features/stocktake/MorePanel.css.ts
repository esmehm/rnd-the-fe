import { style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

export const overlay = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(16, 24, 40, 0.35)',
  display: 'flex',
  justifyContent: 'flex-end',
  zIndex: Number(vars.z.modal),
});

export const drawer = style({
  width: 'min(420px, 96vw)',
  height: '100%',
  background: vars.color.surface,
  boxShadow: vars.shadow.lg,
  display: 'flex',
  flexDirection: 'column',
  outline: 'none',
});

export const body = style({
  padding: vars.space.xl,
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.md,
  flex: 1,
});

export const field = style({ display: 'flex', flexDirection: 'column', gap: vars.space.xxs });
export const label = style({ fontSize: vars.font.sizeSm, color: vars.color.textMuted, fontWeight: vars.font.weightMedium });
export const value = style({ fontSize: vars.font.sizeMd, color: vars.color.text });

export const actions = style({
  padding: `${vars.space.md} ${vars.space.xl}`,
  borderTop: `1px solid ${vars.color.border}`,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.sm,
});

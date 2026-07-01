import { style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

export const page = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  padding: vars.space.lg,
  gap: vars.space.md,
});

export const breadcrumb = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  fontSize: vars.font.sizeSm,
  color: vars.color.textMuted,
});
export const crumbLink = style({
  color: vars.color.textLink,
  textDecoration: 'none',
  selectors: { '&:hover': { textDecoration: 'underline' } },
});
export const crumbSep = style({ color: vars.color.borderStrong });

export const headerBar = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.md,
  flexWrap: 'wrap',
});

export const onHold = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.xs,
  fontSize: vars.font.sizeSm,
  color: vars.color.textMuted,
  cursor: 'pointer',
  userSelect: 'none',
});

export const descriptionRow = style({ display: 'flex', alignItems: 'center', gap: vars.space.md });
export const descLabel = style({ fontSize: vars.font.sizeSm, color: vars.color.textMuted, fontWeight: vars.font.weightMedium });
export const descInput = style({
  flex: 1,
  maxWidth: '520px',
  height: vars.size.control,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  padding: `0 ${vars.space.md}`,
  fontSize: vars.font.sizeMd,
  background: vars.color.surface,
  selectors: {
    '&:focus': { outline: 'none', borderColor: vars.color.focusRing },
    '&:disabled': { background: vars.color.surfaceAlt, color: vars.color.textMuted },
  },
});

export const title = style({
  fontSize: vars.font.sizeXl,
  fontWeight: vars.font.weightBold,
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
});

export const statusBadge = style({
  fontSize: vars.font.sizeSm,
  fontWeight: vars.font.weightMedium,
  padding: `${vars.space.xxs} ${vars.space.sm}`,
  borderRadius: vars.radius.pill,
  background: vars.color.surfaceAlt,
  border: `1px solid ${vars.color.border}`,
  color: vars.color.textMuted,
});

export const spacer = style({ flex: 1 });

export const toolbar = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.md,
  flexWrap: 'wrap',
});

export const filterInput = style({
  height: vars.size.control,
  minWidth: '260px',
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.pill,
  padding: `0 ${vars.space.lg}`,
  fontSize: vars.font.sizeMd,
  background: vars.color.surface,
  selectors: { '&:focus': { outline: 'none', borderColor: vars.color.focusRing } },
});

export const meta = style({
  fontSize: vars.font.sizeSm,
  color: vars.color.textMuted,
  whiteSpace: 'nowrap',
});

export const banner = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderRadius: vars.radius.md,
  background: '#eef4ff',
  border: `1px solid #d3e2ff`,
  color: vars.color.text,
  fontSize: vars.font.sizeSm,
});

export const tableWrap = style({ flex: 1, minHeight: 0 });

export const toast = style({
  position: 'fixed',
  bottom: vars.space.xl,
  left: '50%',
  transform: 'translateX(-50%)',
  background: vars.color.danger,
  color: vars.color.dangerText,
  padding: `${vars.space.md} ${vars.space.xl}`,
  borderRadius: vars.radius.md,
  boxShadow: vars.shadow.lg,
  fontSize: vars.font.sizeMd,
  zIndex: Number(vars.z.modal),
  maxWidth: '80vw',
});

export const centeredState = style({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: vars.color.textMuted,
  fontSize: vars.font.sizeLg,
});

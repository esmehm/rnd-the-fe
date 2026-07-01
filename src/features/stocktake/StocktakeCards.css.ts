import { style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

export const scroll = style({
  position: 'relative',
  overflow: 'auto',
  height: '100%',
  minHeight: 0,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  // paint/layout containment only (NOT `size` — size containment zeroes the measured
  // height and the virtualizer then renders an empty range)
  contain: 'layout paint',
});

export const viewport = style({ position: 'relative', width: '100%' });

export const card = style({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: vars.color.surface,
  padding: vars.space.md,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.sm,
  selectors: { '&[data-selected="true"]': { background: vars.color.rowSelected, borderColor: vars.color.primary } },
});

export const cardTop = style({ display: 'flex', alignItems: 'flex-start', gap: vars.space.sm });
export const cardName = style({ flex: 1, minWidth: 0, fontWeight: vars.font.weightMedium, color: vars.color.textLink, cursor: 'pointer' });
export const cardCode = style({ fontSize: vars.font.sizeSm, color: vars.color.textMuted });
export const cardMeta = style({ display: 'flex', flexWrap: 'wrap', gap: `${vars.space.xs} ${vars.space.lg}`, fontSize: vars.font.sizeSm, color: vars.color.textMuted });

export const countRow = style({ display: 'flex', alignItems: 'center', gap: vars.space.md, flexWrap: 'wrap' });
export const field = style({ display: 'flex', flexDirection: 'column', gap: vars.space.xxs });
export const fieldLabel = style({ fontSize: vars.font.sizeXs, color: vars.color.textMuted, textTransform: 'uppercase', letterSpacing: '0.03em' });

// 48px touch targets on tablet (M10)
export const touchInput = style({
  height: vars.size.touch,
  minWidth: '96px',
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: `0 ${vars.space.md}`,
  fontSize: vars.font.sizeLg,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  background: vars.color.editableBg,
  selectors: { '&:focus': { outline: 'none', borderColor: vars.color.focusRing }, '&:disabled': { background: vars.color.surfaceAlt } },
});

export const diffPill = style({
  minHeight: vars.size.touch,
  display: 'inline-flex',
  alignItems: 'center',
  padding: `0 ${vars.space.md}`,
  borderRadius: vars.radius.pill,
  fontWeight: vars.font.weightMedium,
  fontVariantNumeric: 'tabular-nums',
});

import { style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

export const itemHeading = style({
  fontSize: vars.font.sizeMd,
  color: vars.color.textMuted,
  marginBottom: vars.space.md,
});
export const itemStrong = style({ color: vars.color.text, fontWeight: vars.font.weightBold });

export const tabs = style({
  display: 'flex',
  gap: vars.space.lg,
  borderBottom: `1px solid ${vars.color.border}`,
  marginBottom: vars.space.md,
});
export const tab = style({
  padding: `${vars.space.sm} ${vars.space.xs}`,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: vars.font.sizeMd,
  color: vars.color.textMuted,
  borderBottom: '2px solid transparent',
  marginBottom: '-1px',
  selectors: {
    '&[data-active="true"]': { color: vars.color.primary, borderBottomColor: vars.color.primary, fontWeight: vars.font.weightMedium },
  },
});

export const gridScroll = style({ overflowX: 'auto' });
// column template shared by header + rows; set via --batch-cols
export const gridRow = style({
  display: 'grid',
  gridTemplateColumns: 'var(--batch-cols)',
  gap: vars.space.sm,
  alignItems: 'center',
  minWidth: 'max-content',
  padding: `${vars.space.xs} 0`,
});
export const gridHead = style([
  gridRow,
  { fontSize: vars.font.sizeSm, color: vars.color.textMuted, fontWeight: vars.font.weightMedium, borderBottom: `1px solid ${vars.color.border}` },
]);

export const cellInput = style({
  height: '32px',
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  padding: `0 ${vars.space.sm}`,
  fontSize: vars.font.sizeSm,
  background: vars.color.surface,
  width: '100%',
  selectors: {
    '&:focus': { outline: 'none', borderColor: vars.color.focusRing },
    '&:disabled': { background: vars.color.surfaceAlt, color: vars.color.textMuted },
  },
});
export const cellNumeric = style([cellInput, { textAlign: 'right', fontVariantNumeric: 'tabular-nums' }]);
export const snapshotCell = style({ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: vars.color.textMuted, fontSize: vars.font.sizeSm });
export const diffCell = style({ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: vars.font.weightMedium, fontSize: vars.font.sizeSm });

export const addBatch = style({
  marginTop: vars.space.md,
  border: `1px dashed ${vars.color.borderStrong}`,
  background: 'transparent',
  color: vars.color.primary,
  borderRadius: vars.radius.md,
  padding: `${vars.space.sm} ${vars.space.md}`,
  cursor: 'pointer',
  fontSize: vars.font.sizeSm,
  selectors: { '&:disabled': { opacity: 0.5, cursor: 'default' } },
});

export const otherNote = style({ color: vars.color.textMuted, fontSize: vars.font.sizeSm, padding: vars.space.lg });
export const reasonTrigger = style({
  height: '32px',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space.xs,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  background: vars.color.surface,
  padding: `0 ${vars.space.sm}`,
  fontSize: vars.font.sizeSm,
  cursor: 'pointer',
  selectors: { '&[data-disabled]': { background: vars.color.surfaceAlt, color: vars.color.textMuted, cursor: 'default' } },
});

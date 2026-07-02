import { style } from '@vanilla-extract/css';
import { vars } from '../styles/theme.css';

export const button = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.space.sm,
  minHeight: vars.size.control,
  padding: `0 ${vars.space.lg}`,
  borderRadius: vars.radius.pill,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.text,
  fontSize: vars.font.sizeMd,
  fontWeight: vars.font.weightMedium,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  selectors: {
    '&[data-hovered]': { background: vars.color.surfaceAlt },
    '&[data-focus-visible]': { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: '1px' },
    '&[data-disabled]': { opacity: 0.5, cursor: 'default' },
  },
});

export const buttonPrimary = style([
  button,
  {
    background: vars.color.primary,
    borderColor: vars.color.primary,
    color: vars.color.primaryText,
    selectors: { '&[data-hovered]': { background: vars.color.primaryHover } },
  },
]);

export const buttonDanger = style([
  button,
  {
    background: vars.color.danger,
    borderColor: vars.color.danger,
    color: vars.color.dangerText,
    selectors: { '&[data-hovered]': { background: vars.color.danger, filter: 'brightness(0.94)' } },
  },
]);

export const popover = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  boxShadow: vars.shadow.md,
  overflow: 'auto',
  maxHeight: '40vh',
  minWidth: 'var(--trigger-width)',
});

export const listbox = style({
  padding: vars.space.xs,
  outline: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: '1px',
});

export const listItem = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderRadius: vars.radius.sm,
  fontSize: vars.font.sizeSm,
  cursor: 'pointer',
  outline: 'none',
  selectors: {
    '&[data-hovered], &[data-focused]': { background: vars.color.rowHover },
    '&[data-selected]': { background: vars.color.rowSelected, fontWeight: vars.font.weightMedium },
  },
});

// Dialog / modal
export const modalOverlay = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(16, 24, 40, 0.45)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: vars.space.xl,
  zIndex: Number(vars.z.modal),
});

export const modal = style({
  background: vars.color.surface,
  borderRadius: vars.radius.lg,
  boxShadow: vars.shadow.lg,
  width: 'min(920px, 96vw)',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  outline: 'none',
});

export const modalHeader = style({
  padding: `${vars.space.lg} ${vars.space.xl}`,
  borderBottom: `1px solid ${vars.color.border}`,
  fontSize: vars.font.sizeXl,
  fontWeight: vars.font.weightBold,
});

export const modalBody = style({ padding: vars.space.xl, overflow: 'auto' });

export const modalFooter = style({
  padding: `${vars.space.md} ${vars.space.xl}`,
  borderTop: `1px solid ${vars.color.border}`,
  display: 'flex',
  gap: vars.space.md,
  justifyContent: 'flex-end',
});

// --- React Aria DatePicker ---
export const dateGroup = style({
  display: 'flex',
  alignItems: 'center',
  height: vars.size.control,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  padding: `0 ${vars.space.sm}`,
  background: vars.color.surface,
  selectors: { '&[data-focus-within]': { borderColor: vars.color.focusRing } },
});
export const dateInput = style({ display: 'flex', flex: 1, padding: `0 ${vars.space.xs}` });
export const dateSegment = style({
  padding: '0 1px',
  fontVariantNumeric: 'tabular-nums',
  borderRadius: vars.radius.sm,
  selectors: {
    '&[data-type="literal"]': { color: vars.color.textMuted },
    '&[data-placeholder]': { color: vars.color.textMuted },
    '&[data-focused]': { background: vars.color.primary, color: vars.color.primaryText, outline: 'none' },
  },
});
export const calendarToggle = style({
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: vars.color.textMuted,
  padding: `0 ${vars.space.xs}`,
  selectors: { '&[data-focus-visible]': { outline: `2px solid ${vars.color.focusRing}` } },
});
export const calendar = style({ padding: vars.space.md });
export const calendarHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.space.sm,
  marginBottom: vars.space.sm,
  fontWeight: vars.font.weightMedium,
});
export const calendarGridCell = style({
  width: '34px',
  height: '34px',
  textAlign: 'center',
  borderRadius: vars.radius.sm,
  cursor: 'pointer',
  fontSize: vars.font.sizeSm,
  selectors: {
    '&[data-outside-month]': { display: 'none' },
    '&[data-hovered]': { background: vars.color.rowHover },
    '&[data-selected]': { background: vars.color.primary, color: vars.color.primaryText },
    '&[data-focus-visible]': { outline: `2px solid ${vars.color.focusRing}` },
    '&[data-disabled]': { color: vars.color.textMuted, cursor: 'default' },
  },
});

export const field = style({ display: 'flex', flexDirection: 'column', gap: vars.space.xs });
export const fieldLabel = style({ fontSize: vars.font.sizeSm, color: vars.color.textMuted, fontWeight: vars.font.weightMedium });
export const input = style({
  height: vars.size.control,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  padding: `0 ${vars.space.md}`,
  fontSize: vars.font.sizeMd,
  background: vars.color.surface,
  selectors: { '&[data-focused], &:focus': { outline: 'none', borderColor: vars.color.focusRing } },
});

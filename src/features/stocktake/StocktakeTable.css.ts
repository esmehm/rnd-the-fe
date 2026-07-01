import { style, globalStyle } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

export const wrapper = style({ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: vars.space.sm });
export const fullscreen = style({
  position: 'fixed',
  inset: 0,
  zIndex: Number(vars.z.modal),
  background: vars.color.bg,
  padding: vars.space.lg,
});

export const toolbar = style({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: vars.space.sm });
export const toolbarBtn = style({
  height: vars.size.control,
  padding: `0 ${vars.space.md}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  background: vars.color.surface,
  cursor: 'pointer',
  fontSize: vars.font.sizeSm,
  color: vars.color.text,
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space.xs,
  selectors: {
    '&[data-hovered]': { background: vars.color.surfaceAlt },
    '&[data-focus-visible]': { outline: `2px solid ${vars.color.focusRing}` },
  },
});
export const menuCheckItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  padding: `${vars.space.xs} ${vars.space.md}`,
  fontSize: vars.font.sizeSm,
  borderRadius: vars.radius.sm,
  cursor: 'pointer',
  outline: 'none',
  selectors: { '&[data-focused]': { background: vars.color.rowHover } },
});

export const scrollContainer = style({
  position: 'relative',
  overflow: 'auto',
  height: '100%',
  flex: 1,
  minHeight: 0,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  // contain layout/paint so scrolling only repaints the viewport window
  contain: 'strict',
});

export const resizeHandle = style({
  position: 'absolute',
  right: 0,
  top: 0,
  height: '100%',
  width: '5px',
  cursor: 'col-resize',
  userSelect: 'none',
  touchAction: 'none',
  selectors: { '&:hover, &[data-resizing="true"]': { background: vars.color.primary } },
});

// Header + rows share this grid template so columns line up. Set as a CSS var by
// the component from the column widths.
export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'var(--cols)',
  alignItems: 'stretch',
  minWidth: 'max-content',
});

export const headerRow = style([
  grid,
  {
    position: 'sticky',
    top: 0,
    zIndex: Number(vars.z.sticky),
    background: vars.color.headerBg,
    borderBottom: `1px solid ${vars.color.borderStrong}`,
    height: vars.size.headerHeight,
    boxShadow: vars.shadow.sm,
  },
]);

export const headerCell = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.xs,
  padding: `0 ${vars.space.md}`,
  fontSize: vars.font.sizeSm,
  fontWeight: vars.font.weightBold,
  color: vars.color.textMuted,
  userSelect: 'none',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  background: vars.color.headerBg,
});

export const headerSortable = style({
  cursor: 'pointer',
  selectors: { '&:hover': { color: vars.color.text } },
});

export const sortIndicator = style({
  fontSize: '10px',
  color: vars.color.primary,
});

export const bodyViewport = style({
  position: 'relative',
  width: '100%',
});

export const row = style([
  grid,
  {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: vars.size.rowHeight,
    borderBottom: `1px solid ${vars.color.border}`,
    background: vars.color.surface,
    selectors: {
      '&[data-selected="true"]': { background: vars.color.rowSelected },
      '&:hover': { background: vars.color.rowHover },
    },
  },
]);

export const cell = style({
  display: 'flex',
  alignItems: 'center',
  padding: `0 ${vars.space.md}`,
  fontSize: vars.font.sizeMd,
  color: vars.color.text,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0,
});

export const cellNumeric = style([cell, { justifyContent: 'flex-end', fontVariantNumeric: 'tabular-nums' }]);

export const cellTruncate = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
});

export const editableCell = style([
  cellNumeric,
  { background: vars.color.editableBg, padding: `0 ${vars.space.xs}` },
]);

export const diffPositive = style({ color: vars.color.diffPositive, fontWeight: vars.font.weightMedium });
export const diffNegative = style({ color: vars.color.diffNegative, fontWeight: vars.font.weightMedium });

// Inline number input inside a cell
export const inlineInput = style({
  width: '100%',
  height: '32px',
  border: `1px solid transparent`,
  borderRadius: vars.radius.sm,
  background: 'transparent',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  padding: `0 ${vars.space.sm}`,
  selectors: {
    '&:hover': { borderColor: vars.color.border, background: vars.color.surface },
    '&:focus': { borderColor: vars.color.focusRing, background: vars.color.surface, outline: 'none' },
  },
});

export const linkCell = style([
  cellTruncate,
  {
    color: vars.color.textLink,
    cursor: 'pointer',
    padding: `0 ${vars.space.md}`,
    display: 'flex',
    alignItems: 'center',
    selectors: { '&:hover': { textDecoration: 'underline' } },
  },
]);

// react-aria Select trigger inside a cell
export const reasonTrigger = style({
  width: '100%',
  height: '32px',
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
  color: vars.color.text,
  selectors: {
    '&[data-focus-visible]': { outline: `2px solid ${vars.color.focusRing}` },
    '&[data-disabled]': { background: vars.color.surfaceAlt, color: vars.color.textMuted, cursor: 'default' },
  },
});

globalStyle(`${reasonTrigger} > span`, {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const checkboxCell = style([cell, { justifyContent: 'center', padding: 0 }]);

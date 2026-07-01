import { style, globalStyle } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

export const scrollContainer = style({
  position: 'relative',
  overflow: 'auto',
  height: '100%',
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  // contain layout/paint so scrolling only repaints the viewport window
  contain: 'strict',
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

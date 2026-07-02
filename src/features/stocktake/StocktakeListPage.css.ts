import { style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

export const page = style({ display: 'flex', flexDirection: 'column', height: '100%', padding: vars.space.lg, gap: vars.space.md });

export const bar = style({ display: 'flex', alignItems: 'center', gap: vars.space.md, flexWrap: 'wrap' });
export const title = style({ fontSize: vars.font.sizeXl, fontWeight: vars.font.weightBold, margin: 0 });
export const spacer = style({ flex: 1 });
export const meta = style({ fontSize: vars.font.sizeSm, color: vars.color.textMuted, whiteSpace: 'nowrap' });

export const filterInput = style({
  height: vars.size.control,
  minWidth: '240px',
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.pill,
  padding: `0 ${vars.space.lg}`,
  fontSize: vars.font.sizeMd,
  background: vars.color.surface,
  selectors: { '&:focus': { outline: 'none', borderColor: vars.color.focusRing } },
});

export const tableWrap = style({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: vars.color.surface,
});

export const table = style({ width: '100%', borderCollapse: 'collapse', fontSize: vars.font.sizeMd });

export const th = style({
  position: 'sticky',
  top: 0,
  background: vars.color.headerBg,
  textAlign: 'left',
  padding: `0 ${vars.space.md}`,
  height: vars.size.headerHeight,
  fontSize: vars.font.sizeSm,
  fontWeight: vars.font.weightBold,
  color: vars.color.textMuted,
  borderBottom: `1px solid ${vars.color.borderStrong}`,
  whiteSpace: 'nowrap',
  userSelect: 'none',
});

export const thSortable = style({ cursor: 'pointer', selectors: { '&:hover': { color: vars.color.text } } });

export const tr = style({
  cursor: 'pointer',
  borderBottom: `1px solid ${vars.color.border}`,
  selectors: {
    '&[data-selected="true"]': { background: vars.color.rowSelected },
    '&:hover': { background: vars.color.rowHover },
  },
});

export const td = style({ padding: `0 ${vars.space.md}`, height: vars.size.rowHeight, whiteSpace: 'nowrap' });
export const tdCheckbox = style([td, { width: 44, textAlign: 'center', padding: 0 }]);

export const pagination = style({ display: 'flex', alignItems: 'center', gap: vars.space.sm, justifyContent: 'flex-end' });
export const pageBtn = style({
  minWidth: 32,
  height: 32,
  padding: `0 ${vars.space.sm}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  background: vars.color.surface,
  cursor: 'pointer',
  selectors: {
    '&:disabled': { opacity: 0.4, cursor: 'default' },
    '&[data-current="true"]': { background: vars.color.primary, color: vars.color.primaryText, borderColor: vars.color.primary },
  },
});

export const statusBadge = style({
  fontSize: vars.font.sizeXs,
  fontWeight: vars.font.weightMedium,
  padding: `2px ${vars.space.sm}`,
  borderRadius: vars.radius.pill,
  background: vars.color.surfaceAlt,
  border: `1px solid ${vars.color.border}`,
  color: vars.color.textMuted,
});

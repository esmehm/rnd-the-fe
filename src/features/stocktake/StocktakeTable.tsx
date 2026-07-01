import { useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowSelectionState,
  type VisibilityState,
  type ColumnSizingState,
  type ColumnPinningState,
  type Column,
  type OnChangeFn,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MenuTrigger, Button as AriaButton, Popover, Menu, MenuItem } from 'react-aria-components';
import { columns } from './columns';
import type { ReasonOption, SortKey, StocktakeLine } from './api';
import { vars } from '../../styles/theme.css';
import * as s from './StocktakeTable.css';
import * as ui from '../../ui/uikit.css';

const PINNED_LEFT = ['select', 'code', 'name'];

// Give TanStack the per-column base width + resize/pin capability.
const sizedColumns = columns.map((c) => ({
  ...c,
  size: c.meta?.width,
  enableResizing: c.id !== 'select',
  enablePinning: true,
}));

interface Props {
  lines: StocktakeLine[];
  sortKey: SortKey;
  sortDesc: boolean;
  onToggleSort: (key: SortKey) => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  reasonOptions: ReasonOption[];
  disabled: boolean;
  openEdit: (line: StocktakeLine) => void;
  saveCounted: (line: StocktakeLine, value: number | null) => void;
  saveReason: (line: StocktakeLine, reasonId: string) => void;
}

// Sticky style for left-pinned columns.
function pinStyle(column: Column<StocktakeLine>, isHeader: boolean, bg: string): React.CSSProperties | undefined {
  if (column.getIsPinned() !== 'left') return undefined;
  return {
    position: 'sticky',
    left: column.getStart('left'),
    zIndex: isHeader ? 12 : 11,
    background: bg,
    boxShadow: column.getIsLastColumn('left') ? '2px 0 4px rgba(16,24,40,0.08)' : undefined,
  };
}

export function StocktakeTable({
  lines,
  sortKey,
  sortDesc,
  onToggleSort,
  rowSelection,
  onRowSelectionChange,
  reasonOptions,
  disabled,
  openEdit,
  saveCounted,
  saveReason,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ left: PINNED_LEFT });
  const [fullscreen, setFullscreen] = useState(false);

  const table = useReactTable({
    data: lines,
    columns: sizedColumns,
    state: { rowSelection, columnVisibility, columnSizing, columnPinning },
    onRowSelectionChange,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onColumnPinningChange: setColumnPinning,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    manualSorting: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    enableColumnPinning: true,
    defaultColumn: { minSize: 56 },
    getCoreRowModel: getCoreRowModel(),
    meta: { reasonOptions, disabled, openEdit, saveCounted, saveReason },
  });

  const rows = table.getRowModel().rows;
  const visibleCols = table.getVisibleLeafColumns();
  const gridTemplate = visibleCols.map((c) => `${c.getSize()}px`).join(' ');

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  const headers = table.getHeaderGroups()[0]?.headers ?? [];

  // hideable columns for the show/hide menu (everything except the select checkbox)
  const hideable = table.getAllLeafColumns().filter((c) => c.id !== 'select');
  const visibleKeys = new Set(hideable.filter((c) => c.getIsVisible()).map((c) => c.id));

  return (
    <div className={`${s.wrapper} ${fullscreen ? s.fullscreen : ''}`}>
      <div className={s.toolbar}>
        <MenuTrigger>
          <AriaButton className={s.toolbarBtn} aria-label="Show or hide columns">
            ▦ Columns
          </AriaButton>
          <Popover className={ui.popover}>
            <Menu
              className={ui.listbox}
              selectionMode="multiple"
              selectedKeys={visibleKeys}
              onSelectionChange={(keys) => {
                if (keys === 'all') {
                  setColumnVisibility({});
                  return;
                }
                const next: VisibilityState = {};
                for (const c of hideable) next[c.id] = keys.has(c.id);
                setColumnVisibility(next);
              }}
            >
              {hideable.map((c) => (
                <MenuItem key={c.id} id={c.id} className={s.menuCheckItem} textValue={String(c.columnDef.header)}>
                  {({ isSelected }) => (
                    <>
                      <span aria-hidden style={{ width: 16 }}>{isSelected ? '✓' : ''}</span>
                      {String(c.columnDef.header)}
                    </>
                  )}
                </MenuItem>
              ))}
            </Menu>
          </Popover>
        </MenuTrigger>
        <button className={s.toolbarBtn} onClick={() => setFullscreen((f) => !f)} aria-pressed={fullscreen}>
          {fullscreen ? '✕ Exit full screen' : '⛶ Full screen'}
        </button>
      </div>

      <div
        ref={parentRef}
        className={s.scrollContainer}
        role="grid"
        aria-rowcount={rows.length}
        aria-colcount={visibleCols.length}
        style={{ '--cols': gridTemplate } as React.CSSProperties}
      >
        <div className={s.headerRow} role="row">
          {headers.map((header) => {
            const meta = header.column.columnDef.meta;
            const canSort = !!meta?.sortKey;
            const isActive = meta?.sortKey === sortKey;
            return (
              <div
                key={header.id}
                role="columnheader"
                className={`${s.headerCell} ${canSort ? s.headerSortable : ''} ${meta?.numeric ? s.cellNumeric : ''}`}
                onClick={canSort ? () => onToggleSort(meta!.sortKey!) : undefined}
                aria-sort={isActive ? (sortDesc ? 'descending' : 'ascending') : undefined}
                style={pinStyle(header.column, true, vars.color.headerBg)}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
                {isActive && <span className={s.sortIndicator}>{sortDesc ? '▼' : '▲'}</span>}
                {header.column.getCanResize() && (
                  <div
                    className={s.resizeHandle}
                    data-resizing={header.column.getIsResizing()}
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    onClick={(e) => e.stopPropagation()}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${String(header.column.columnDef.header)}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className={s.bodyViewport} data-testid="stocktake-lines" data-line-count={rows.length} style={{ height: rowVirtualizer.getTotalSize() }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rrow = rows[virtualRow.index];
            const selected = rrow.getIsSelected();
            const rowBg = selected ? vars.color.rowSelected : vars.color.surface;
            return (
              <div
                key={rrow.id}
                className={s.row}
                role="row"
                aria-rowindex={virtualRow.index + 1}
                data-testid="stocktake-row"
                data-selected={selected}
                style={{ transform: `translateY(${virtualRow.start}px)`, '--row-bg': rowBg } as React.CSSProperties}
              >
                {rrow.getVisibleCells().map((cell) => {
                  const pin = pinStyle(cell.column, false, rowBg);
                  return (
                    <div key={cell.id} role="gridcell" style={{ minWidth: 0, overflow: 'hidden', ...pin }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

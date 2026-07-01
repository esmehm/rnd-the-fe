import { useRef, Fragment } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowSelectionState,
  type OnChangeFn,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { columns, gridTemplate } from './columns';
import type { ReasonOption, SortKey, StocktakeLine } from './api';
import * as s from './StocktakeTable.css';

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

  const table = useReactTable({
    data: lines,
    columns,
    state: { rowSelection },
    onRowSelectionChange,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    meta: { reasonOptions, disabled, openEdit, saveCounted, saveReason },
  });

  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  const headers = table.getHeaderGroups()[0]?.headers ?? [];

  return (
    <div
      ref={parentRef}
      className={s.scrollContainer}
      style={{ '--cols': gridTemplate } as React.CSSProperties}
    >
      <div className={s.headerRow}>
        {headers.map((header) => {
          const meta = header.column.columnDef.meta;
          const canSort = !!meta?.sortKey;
          const isActive = meta?.sortKey === sortKey;
          return (
            <div
              key={header.id}
              className={`${s.headerCell} ${canSort ? s.headerSortable : ''} ${
                meta?.numeric ? s.cellNumeric : ''
              }`}
              onClick={canSort ? () => onToggleSort(meta!.sortKey!) : undefined}
              role={canSort ? 'button' : undefined}
              aria-sort={isActive ? (sortDesc ? 'descending' : 'ascending') : undefined}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
              {isActive && <span className={s.sortIndicator}>{sortDesc ? '▼' : '▲'}</span>}
            </div>
          );
        })}
      </div>

      <div
        className={s.bodyViewport}
        data-testid="stocktake-lines"
        data-line-count={rows.length}
        style={{ height: rowVirtualizer.getTotalSize() }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rrow = rows[virtualRow.index];
          return (
            <div
              key={rrow.id}
              className={s.row}
              data-testid="stocktake-row"
              data-selected={rrow.getIsSelected()}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {rrow.getVisibleCells().map((cell) => (
                <Fragment key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Fragment>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

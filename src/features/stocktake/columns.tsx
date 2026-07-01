import type { ColumnDef, RowData } from '@tanstack/react-table';
import type { ReasonOption, SortKey, StocktakeLine } from './api';
import { formatDate, expiryStatus } from './format';
import { CountedCell, DifferenceCell, ReasonCell } from './cells';
import * as s from './StocktakeTable.css';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    width: number;
    numeric?: boolean;
    sortKey?: SortKey;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    reasonOptions: ReasonOption[];
    disabled: boolean;
    openEdit: (line: StocktakeLine) => void;
    saveCounted: (line: StocktakeLine, value: number | null) => void;
    saveReason: (line: StocktakeLine, reasonId: string) => void;
  }
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate && !checked;
      }}
      onChange={onChange}
      style={{ width: 18, height: 18, cursor: 'pointer' }}
    />
  );
}

export const columns: ColumnDef<StocktakeLine>[] = [
  {
    id: 'select',
    meta: { width: 44 },
    enableSorting: false,
    header: ({ table }) => (
      <div className={s.checkboxCell} style={{ width: '100%' }}>
        <Checkbox
          label="Select all rows"
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className={s.checkboxCell} style={{ width: '100%' }}>
        <Checkbox
          label={`Select ${row.original.itemName}`}
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      </div>
    ),
  },
  {
    id: 'code',
    header: 'Code',
    accessorFn: (l) => l.item.code,
    meta: { width: 110, sortKey: 'itemCode' },
    cell: ({ getValue }) => <div className={s.cellTruncate}>{getValue<string>()}</div>,
  },
  {
    id: 'name',
    header: 'Name',
    accessorFn: (l) => l.itemName,
    meta: { width: 300, sortKey: 'itemName' },
    cell: ({ row, table }) => (
      <div
        className={s.linkCell}
        role="button"
        tabIndex={0}
        onClick={() => table.options.meta!.openEdit(row.original)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') table.options.meta!.openEdit(row.original);
        }}
      >
        {row.original.itemName}
      </div>
    ),
  },
  {
    id: 'batch',
    header: 'Batch',
    accessorFn: (l) => l.batch ?? '',
    meta: { width: 130, sortKey: 'batch' },
    cell: ({ getValue }) => <div className={s.cellTruncate}>{getValue<string>()}</div>,
  },
  {
    id: 'expiryDate',
    header: 'Expiry date',
    accessorFn: (l) => l.expiryDate,
    meta: { width: 115, sortKey: 'expiryDate' },
    cell: ({ getValue }) => {
      const value = getValue<string>();
      const status = expiryStatus(value);
      const className = status === 'expired' ? s.expiryExpired : status === 'soon' ? s.expirySoon : s.cell;
      return (
        <div
          className={className}
          title={status === 'expired' ? 'Expired' : status === 'soon' ? 'Expires soon' : undefined}
        >
          {formatDate(value)}
          {status && <span aria-hidden> ⚠</span>}
        </div>
      );
    },
  },
  {
    id: 'manufactureDate',
    header: 'Manufacture date',
    accessorFn: (l) => l.manufactureDate,
    meta: { width: 135 },
    enableSorting: false,
    cell: ({ getValue }) => <div className={s.cell}>{formatDate(getValue<string>())}</div>,
  },
  {
    id: 'location',
    header: 'Location',
    accessorFn: (l) => l.location?.name ?? '',
    meta: { width: 120, sortKey: 'locationCode' },
    cell: ({ getValue }) => <div className={s.cellTruncate}>{getValue<string>()}</div>,
  },
  {
    id: 'unitName',
    header: 'Unit name',
    accessorFn: (l) => l.item.unitName ?? '',
    meta: { width: 95 },
    enableSorting: false,
    cell: ({ getValue }) => <div className={s.cellTruncate}>{getValue<string>()}</div>,
  },
  {
    id: 'packSize',
    header: 'Pack size',
    accessorFn: (l) => l.packSize,
    meta: { width: 90, numeric: true, sortKey: 'packSize' },
    cell: ({ getValue }) => <div className={s.cellNumeric}>{getValue<number>()}</div>,
  },
  {
    id: 'snapshot',
    header: 'Packs snapshot',
    accessorFn: (l) => l.snapshotNumberOfPacks,
    meta: { width: 120, numeric: true, sortKey: 'snapshotNumberOfPacks' },
    cell: ({ getValue }) => <div className={s.cellNumeric}>{getValue<number>()}</div>,
  },
  {
    id: 'counted',
    header: 'Packs counted',
    accessorFn: (l) => l.countedNumberOfPacks,
    meta: { width: 130, numeric: true, sortKey: 'countedNumberOfPacks' },
    cell: ({ row, table }) => (
      <CountedCell
        line={row.original}
        disabled={table.options.meta!.disabled}
        onCommit={table.options.meta!.saveCounted}
      />
    ),
  },
  {
    id: 'difference',
    header: 'Difference',
    meta: { width: 100, numeric: true },
    enableSorting: false,
    cell: ({ row }) => <DifferenceCell line={row.original} />,
  },
  {
    id: 'reason',
    header: 'Reason',
    meta: { width: 200, sortKey: 'reasonOption' },
    cell: ({ row, table }) => (
      <ReasonCell
        line={row.original}
        reasonOptions={table.options.meta!.reasonOptions}
        disabled={table.options.meta!.disabled}
        onCommit={table.options.meta!.saveReason}
      />
    ),
  },
  {
    id: 'manufacturer',
    header: 'Manufacturer',
    accessorFn: (l) => l.manufacturer?.name ?? '',
    meta: { width: 150 },
    enableSorting: false,
    cell: ({ getValue }) => <div className={s.cellTruncate}>{getValue<string>()}</div>,
  },
  {
    id: 'comment',
    header: 'Comment',
    accessorFn: (l) => l.comment ?? '',
    meta: { width: 200 },
    enableSorting: false,
    cell: ({ getValue }) => <div className={s.cellTruncate}>{getValue<string>()}</div>,
  },
];

export const gridTemplate = columns.map((c) => `${c.meta!.width}px`).join(' ');

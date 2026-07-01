import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { RowSelectionState } from '@tanstack/react-table';
import { DEFAULT_STOCKTAKE_ID } from '../../gql/client';
import {
  useStocktake,
  useStocktakeLines,
  useReasonOptions,
  useUpdateStocktakeLine,
  useDeleteStocktakeLines,
  type SortKey,
  type StocktakeLine,
} from './api';
import { StocktakeTable } from './StocktakeTable';
import { EditLineModal } from './EditLineModal';
import * as p from './StocktakePage.css';
import * as ui from '../../ui/uikit.css';

export function StocktakePage() {
  const params = useParams();
  const stocktakeId = params.stocktakeId ?? DEFAULT_STOCKTAKE_ID;

  const [searchParams, setSearchParams] = useSearchParams();
  const committedFilter = searchParams.get('filter') ?? '';
  const [filterText, setFilterText] = useState(committedFilter);

  const [sortKey, setSortKey] = useState<SortKey>('itemName');
  const [sortDesc, setSortDesc] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [editLine, setEditLine] = useState<StocktakeLine | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // A counted value that created a variance but hasn't been saved yet because the
  // backend needs a reason. Held here so choosing a reason commits both together.
  const [pendingCounted, setPendingCounted] = useState<Record<string, number | null>>({});

  // Debounce the filter box -> URL param (?filter=), which drives the server query.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (filterText.trim()) next.set('filter', filterText.trim());
          else next.delete('filter');
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(t);
  }, [filterText, setSearchParams]);

  const stocktakeQuery = useStocktake(stocktakeId);
  const linesQuery = useStocktakeLines({ stocktakeId, sortKey, sortDesc, filter: committedFilter });
  const reasonsQuery = useReasonOptions();
  const updateLine = useUpdateStocktakeLine(stocktakeId);
  const deleteLines = useDeleteStocktakeLines(stocktakeId);

  const stocktake = stocktakeQuery.data;
  const disabled = !!stocktake && (stocktake.status === 'FINALISED' || stocktake.isLocked);

  const onToggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(false);
    }
  };

  const flashError = (e: unknown) => setToast((e as Error)?.message ?? 'Update failed');

  const saveCounted = (line: StocktakeLine, value: number | null) => {
    updateLine.mutate(
      { id: line.id, countedNumberOfPacks: value ?? 0, reasonOptionId: line.reasonOption?.id ?? undefined },
      {
        onError: (e) => {
          // Variance with no reason yet: remember the value so the reason pick commits it.
          setPendingCounted((m) => ({ ...m, [line.id]: value }));
          flashError(e);
        },
        onSuccess: () => setPendingCounted((m) => ({ ...m, [line.id]: undefined as never })),
      },
    );
  };
  const saveReason = (line: StocktakeLine, reasonId: string) => {
    const counted = line.id in pendingCounted ? pendingCounted[line.id] : line.countedNumberOfPacks;
    updateLine.mutate(
      { id: line.id, countedNumberOfPacks: counted ?? 0, reasonOptionId: reasonId },
      {
        onError: flashError,
        onSuccess: () => setPendingCounted((m) => ({ ...m, [line.id]: undefined as never })),
      },
    );
  };

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);
  const onDeleteSelected = () => {
    if (!selectedIds.length) return;
    deleteLines.mutate(selectedIds, { onSuccess: () => setRowSelection({}), onError: flashError });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (stocktakeQuery.isError) {
    return (
      <div className={p.centeredState}>
        Stocktake error: {(stocktakeQuery.error as Error)?.message ?? 'unknown'}
      </div>
    );
  }

  const lines = linesQuery.data?.nodes ?? [];
  const total = linesQuery.data?.totalCount ?? stocktake?.lines.totalCount ?? 0;

  return (
    <div className={p.page}>
      <div className={p.headerBar}>
        <h1 className={p.title}>
          Stocktake #{stocktake?.stocktakeNumber ?? '…'}
          {stocktake && <span className={p.statusBadge}>{stocktake.status}</span>}
        </h1>
        <span className={p.meta}>{stocktake?.description}</span>
        <div className={p.spacer} />
        <button
          className={ui.buttonDanger}
          disabled={!selectedIds.length || disabled || deleteLines.isPending}
          onClick={onDeleteSelected}
        >
          Delete{selectedIds.length ? ` (${selectedIds.length})` : ''}
        </button>
      </div>

      {disabled && (
        <div className={p.banner}>This stocktake is finalised or locked and cannot be edited.</div>
      )}

      <div className={p.toolbar}>
        <input
          className={p.filterInput}
          type="search"
          placeholder="Filter items by code or name…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          aria-label="Filter items"
        />
        <span className={p.meta} data-testid="lines-count" data-count={lines.length}>
          {linesQuery.isFetching ? 'Loading… ' : ''}
          {lines.length.toLocaleString()} of {total.toLocaleString()} lines
          {committedFilter ? ' (filtered)' : ''}
        </span>
      </div>

      <div className={p.tableWrap}>
        {linesQuery.isLoading ? (
          <div className={p.centeredState}>Loading lines…</div>
        ) : (
          <StocktakeTable
            lines={lines}
            sortKey={sortKey}
            sortDesc={sortDesc}
            onToggleSort={onToggleSort}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            reasonOptions={reasonsQuery.data ?? []}
            disabled={disabled}
            openEdit={setEditLine}
            saveCounted={saveCounted}
            saveReason={saveReason}
          />
        )}
      </div>

      {toast && (
        <div className={p.toast} role="alert">
          {toast}
        </div>
      )}

      {editLine && (
        <EditLineModal
          line={editLine}
          reasonOptions={reasonsQuery.data ?? []}
          disabled={disabled}
          onClose={() => setEditLine(null)}
          onSave={(input) => {
            updateLine.mutate(
              { id: editLine.id, ...input },
              { onSuccess: () => setEditLine(null) },
            );
          }}
        />
      )}
    </div>
  );
}

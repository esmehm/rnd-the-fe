import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import {
  useUpdateStocktake,
  useSaveStocktakeLines,
  useDeleteStocktakes,
  useActivityLogs,
  useManufacturers,
  type SaveLineDraft,
} from './listApi';
import { StocktakeTable } from './StocktakeTable';
import { StocktakeCards } from './StocktakeCards';
import { useMediaQuery } from '../../ui/useMediaQuery';
import { EditItemModal } from './EditItemModal';
import { AddItemModal } from './AddItemModal';
import { MorePanel } from './MorePanel';
import { formatDate, difference } from './format';
import { toCsv, downloadCsv } from './csv';
import * as p from './StocktakePage.css';
import * as ui from '../../ui/uikit.css';

export function StocktakePage() {
  const params = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const stocktakeId = params.stocktakeId ?? DEFAULT_STOCKTAKE_ID;
  // Phones (<600px) get the card layout; tablets/desktop use the table with
  // horizontal scroll + pinned key columns (matches old FE and UI standards).
  const isNarrow = useMediaQuery('(max-width: 599px)');

  const [searchParams, setSearchParams] = useSearchParams();
  const committedFilter = searchParams.get('filter') ?? '';
  const [filterText, setFilterText] = useState(committedFilter);

  const [sortKey, setSortKey] = useState<SortKey>('itemName');
  const [sortDesc, setSortDesc] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [tab, setTab] = useState<'details' | 'log'>('details');
  const [descDraft, setDescDraft] = useState('');
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
  const updateStocktake = useUpdateStocktake(stocktakeId);
  const saveLines = useSaveStocktakeLines(stocktakeId);
  const deleteStocktake = useDeleteStocktakes();
  const activityLogs = useActivityLogs(stocktakeId, tab === 'log');
  const manufacturers = useManufacturers(editItemId != null);

  const stocktake = stocktakeQuery.data;
  const isFinalised = stocktake?.status === 'FINALISED';
  const disabled = !!stocktake && (isFinalised || stocktake.isLocked);

  // Keep the editable description in sync with the server value when not focused.
  useEffect(() => {
    setDescDraft(stocktake?.description ?? '');
  }, [stocktake?.description]);

  const commitDescription = () => {
    if (!stocktake || descDraft === (stocktake.description ?? '')) return;
    updateStocktake.mutate({ description: descDraft }, { onError: flashError });
  };
  const setOnHold = (isLocked: boolean) => updateStocktake.mutate({ isLocked }, { onError: flashError });
  const confirmFinalised = () => {
    if (!confirm('Finalise this stocktake? It will become read-only.')) return;
    updateStocktake.mutate({ status: 'FINALISED' }, { onError: flashError });
  };

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

  const onExportCsv = () => {
    const headers = ['Code', 'Name', 'Batch', 'Expiry', 'Manufacture', 'Location', 'Unit', 'Pack size', 'Packs snapshot', 'Packs counted', 'Difference', 'Reason', 'Manufacturer', 'Comment'];
    const rows = lines.map((l) => [
      l.item.code, l.itemName, l.batch, formatDate(l.expiryDate), formatDate(l.manufactureDate),
      l.location?.name, l.item.unitName, l.packSize, l.snapshotNumberOfPacks, l.countedNumberOfPacks,
      difference(l), l.reasonOption?.reason, l.manufacturer?.name, l.comment,
    ]);
    downloadCsv(`stocktake-${stocktake?.stocktakeNumber ?? stocktakeId}.csv`, toCsv(headers, rows));
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

  // Multi-batch edit modal: group the clicked item's batches; "OK & next" walks items.
  const distinctItemIds = [...new Set(lines.map((l) => l.itemId))];
  const editLines = editItemId ? lines.filter((l) => l.itemId === editItemId) : [];
  const editItem = editLines[0]?.item;
  const editIdx = editItemId ? distinctItemIds.indexOf(editItemId) : -1;
  const nextItemId = editIdx >= 0 && editIdx < distinctItemIds.length - 1 ? distinctItemIds[editIdx + 1] : null;

  return (
    <div className={p.page}>
      <nav className={p.breadcrumb} aria-label="Breadcrumb">
        <Link to="/inventory/stocktakes" className={p.crumbLink}>
          {t('stocktakes.title')}
        </Link>
        <span className={p.crumbSep}>/</span>
        <span>#{stocktake?.stocktakeNumber ?? '…'}</span>
      </nav>

      <div className={p.headerBar}>
        <h1 className={p.title}>
          Stocktake #{stocktake?.stocktakeNumber ?? '…'}
          {stocktake && <span className={p.statusBadge}>{stocktake.status}</span>}
        </h1>
        <div className={p.spacer} />
        <label className={p.onHold} title="Lock this stocktake from edits">
          <input
            type="checkbox"
            checked={!!stocktake?.isLocked}
            disabled={isFinalised || updateStocktake.isPending}
            onChange={(e) => setOnHold(e.target.checked)}
          />
          {t('stocktake.onHold')}
        </label>
        <button className={ui.button} disabled={disabled} onClick={() => setAddItemOpen(true)}>
          {t('stocktake.addItem')}
        </button>
        <button
          className={ui.buttonDanger}
          disabled={!selectedIds.length || disabled || deleteLines.isPending}
          onClick={onDeleteSelected}
        >
          {selectedIds.length ? t('common.deleteN', { count: selectedIds.length }) : t('common.delete')}
        </button>
        <button className={ui.buttonPrimary} disabled={isFinalised || updateStocktake.isPending} onClick={confirmFinalised}>
          {t('stocktake.confirmFinalised')}
        </button>
        <button className={ui.button} onClick={onExportCsv} disabled={!lines.length}>
          {t('stocktake.exportCsv')}
        </button>
        <button className={ui.button} onClick={() => setMoreOpen(true)} disabled={!stocktake}>
          {t('stocktake.more')}
        </button>
      </div>

      <div className={p.descriptionRow}>
        <label className={p.descLabel} htmlFor="stocktake-description">
          {t('stocktake.description')}
        </label>
        <input
          id="stocktake-description"
          className={p.descInput}
          value={descDraft}
          disabled={disabled}
          placeholder={t('stocktake.descriptionPlaceholder')}
          onChange={(e) => setDescDraft(e.target.value)}
          onBlur={commitDescription}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </div>

      {disabled && (
        <div className={p.banner}>{isFinalised ? t('stocktake.finalisedBanner') : t('stocktake.onHoldBanner')}</div>
      )}

      <div className={p.tabs} role="tablist">
        <button className={p.tab} data-active={tab === 'details'} role="tab" aria-selected={tab === 'details'} onClick={() => setTab('details')}>
          {t('tab.details')}
        </button>
        <button className={p.tab} data-active={tab === 'log'} role="tab" aria-selected={tab === 'log'} onClick={() => setTab('log')}>
          {t('tab.log')}
        </button>
      </div>

      {tab === 'details' && (
        <>
          <div className={p.toolbar}>
            <input
              className={p.filterInput}
              type="search"
              placeholder={t('stocktake.filterItems')}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              aria-label={t('stocktake.filterItems')}
            />
            <span className={p.meta} data-testid="lines-count" data-count={lines.length}>
              {linesQuery.isFetching ? 'Loading… ' : ''}
              {t('stocktake.linesCount', { shown: lines.length.toLocaleString(), total: total.toLocaleString() })}
              {committedFilter ? ' (filtered)' : ''}
            </span>
          </div>

          <div className={p.tableWrap}>
            {linesQuery.isLoading ? (
              <div className={p.centeredState}>Loading lines…</div>
            ) : isNarrow ? (
              <StocktakeCards
                lines={lines}
                reasonOptions={reasonsQuery.data ?? []}
                disabled={disabled}
                openEdit={(line) => setEditItemId(line.itemId)}
                saveCounted={saveCounted}
                saveReason={saveReason}
              />
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
                openEdit={(line) => setEditItemId(line.itemId)}
                saveCounted={saveCounted}
                saveReason={saveReason}
              />
            )}
          </div>
        </>
      )}

      {tab === 'log' && (
        <div className={p.tableWrap} style={{ overflow: 'auto' }}>
          {activityLogs.isLoading ? (
            <div className={p.centeredState}>Loading log…</div>
          ) : !(activityLogs.data ?? []).length ? (
            <div className={p.centeredState}>No activity yet.</div>
          ) : (
            <ul className={p.logList}>
              {(activityLogs.data ?? []).map((log) => (
                <li key={log.id} className={p.logItem}>
                  <span className={p.logDate}>{formatDate(log.datetime)}</span>
                  <span className={p.logType}>{log.type.replace(/_/g, ' ').toLowerCase()}</span>
                  {(log.from || log.to) && (
                    <span className={p.meta}>
                      {log.from ? `${log.from} → ` : ''}
                      {log.to ?? ''}
                    </span>
                  )}
                  <span className={p.meta}>{log.user?.username ?? ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {toast && (
        <div className={p.toast} role="alert">
          {toast}
        </div>
      )}

      {addItemOpen && <AddItemModal stocktakeId={stocktakeId} onClose={() => setAddItemOpen(false)} />}

      {moreOpen && stocktake && (
        <MorePanel
          stocktake={stocktake}
          disabled={disabled}
          onClose={() => setMoreOpen(false)}
          onSaveComment={(comment) => updateStocktake.mutate({ comment }, { onError: flashError })}
          onDelete={() =>
            deleteStocktake.mutate([stocktakeId], {
              onSuccess: () => navigate('/inventory/stocktakes'),
              onError: flashError,
            })
          }
        />
      )}

      {editItemId && editItem && (
        <EditItemModal
          key={editItemId}
          item={{ id: editItem.id, code: editItem.code, name: editItem.name, unitName: editItem.unitName }}
          lines={editLines}
          reasonOptions={reasonsQuery.data ?? []}
          manufacturers={manufacturers.data ?? []}
          disabled={disabled}
          saving={saveLines.isPending}
          hasNext={!!nextItemId}
          onClose={() => setEditItemId(null)}
          onSave={(drafts: SaveLineDraft[]) =>
            saveLines.mutate(drafts, { onSuccess: () => setEditItemId(null), onError: flashError })
          }
          onSaveAndNext={(drafts: SaveLineDraft[]) =>
            saveLines.mutate(drafts, { onSuccess: () => setEditItemId(nextItemId), onError: flashError })
          }
        />
      )}
    </div>
  );
}
